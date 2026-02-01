import mongoose, { Types } from "mongoose";
import {
  AreaRouteModel,
  ICreateArea,
  HistoryAreaModel,
  IHistoryArea,
  IMachineImageData,
} from "../models/AreaRoute.model";

import { logger } from "../utils/logger.util";
import { ImageUploadService } from "./areaFileUpload.service";

export interface DashboardFilterParams {
  status?: "active" | "inactive" | "all";
  address?: string;
  state?: string;
  district?: string;
  campus?: string;
  tower?: string;
  floor?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface DashboardData {
  areas: ICreateArea[];
  statistics: {
    totalAreas: number;
    activeAreas: number;
    inactiveAreas: number;
    areasByState: Record<string, number>;
    areasByDistrict: Record<string, number>;
    areasByStatus: Record<string, number>;
    areasByCampus: Record<string, number>;
  };
  filterOptions: {
    states: string[];
    districts: string[];
    campuses: string[];
    towers: string[];
    floors: string[];
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface CreateAreaDto {
  area_name: string;
  state: string;
  district: string;
  pincode: string;
  area_description: string;
  status: "active" | "inactive";
  latitude?: number;
  longitude?: number;
  address?: string;
  sub_locations: {
    campus: string;
    tower: string;
    floor: string;
    select_machine: {
      machine_id: string;
      status: "installed" | "not_installed";
      machine_image?: IMachineImageData[];
    };
  }[];
}

export interface UpdateAreaDto {
  area_name?: string;
  state?: string;
  district?: string;
  pincode?: string;
  area_description?: string;
  status?: "active" | "inactive";
  latitude?: number;
  longitude?: number;
  address?: string;
  sub_locations?: {
    campus?: string;
    tower?: string;
    floor?: string;
    select_machine?: {
      machine_id?: string;
      status?: "installed" | "not_installed";
      machine_image?: IMachineImageData[];
    };
  }[];
}

export interface AreaQueryParams {
  page?: number;
  limit?: number;
  status?: "active" | "inactive";
  state?: string;
  district?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface AreaPaginationResult {
  data: ICreateArea[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface BulkUpdateStatusDto {
  areaIds: string[];
  status: "active" | "inactive";
}

export interface LocationSearchParams {
  state?: string;
  district?: string;
}

export interface AuditLogParams {
  userId: string;
  userEmail: string;
  userName?: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AreaService {
  private static async createAuditLog(
    areaId: string,
    action: IHistoryArea["action"],
    oldData: Partial<ICreateArea> | null,
    newData: Partial<ICreateArea> | null,
    changes?: Record<string, { old: any; new: any }>,
    auditParams?: AuditLogParams
  ): Promise<void> {
    try {
      const auditLog = new HistoryAreaModel({
        area_id: new Types.ObjectId(areaId),
        action,
        old_data: oldData,
        new_data: newData,
        changes: changes || null,
        performed_by: {
          user_id: auditParams?.userId || "system",
          email: auditParams?.userEmail || "system@example.com",
          name: auditParams?.userName,
        },
        ip_address: auditParams?.ipAddress,
        user_agent: auditParams?.userAgent,
        timestamp: new Date(),
      });

      await auditLog.save();
    } catch (error) {
      logger.error("Error creating audit log:", error);
    }
  }

  private static findChanges(oldObj: any, newObj: any): Record<string, { old: any; new: any }> {
    const changes: Record<string, { old: any; new: any }> = {};

    const allKeys = new Set([...Object.keys(oldObj || {}), ...Object.keys(newObj || {})]);

    for (const key of allKeys) {
      const oldValue = oldObj?.[key];
      const newValue = newObj?.[key];

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes[key] = { old: oldValue, new: newValue };
      }
    }

    return changes;
  }

  static async getAuditLogs(
    areaId: string,
    page: number = 1,
    limit: number = 10
  ): Promise<{
    logs: IHistoryArea[];
    pagination: {
      currentPage: number;
      totalPages: number;
      totalItems: number;
      itemsPerPage: number;
    };
  }> {
    this.validateObjectId(areaId);

    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, Math.min(limit, 50));
    const skip = (pageNum - 1) * limitNum;

    const [logs, totalItems] = await Promise.all([
      HistoryAreaModel.find({ area_id: new Types.ObjectId(areaId) })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum),
      HistoryAreaModel.countDocuments({ area_id: new Types.ObjectId(areaId) }),
    ]);

    const totalPages = Math.ceil(totalItems / limitNum);

    return {
      logs,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems,
        itemsPerPage: limitNum,
      },
    };
  }

  static async getAuditSummary(limit: number = 10): Promise<IHistoryArea[]> {
    return await HistoryAreaModel.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate("area_id", "area_name state district");
  }

  // CREATE AREA WITH NEW STRUCTURE
  static async createArea(
    areaData: CreateAreaDto,
    auditParams?: AuditLogParams
  ): Promise<ICreateArea> {
    try {
      // Check for duplicate area names
      const existingArea = await AreaRouteModel.findOne({
        area_name: areaData.area_name,
      });

      if (existingArea) {
        throw new Error(`Area with name "${areaData.area_name}" already exists`);
      }

      // Validate sub-locations with new structure
      this.validateSubLocation(areaData.sub_locations);

      // Check for duplicate sub-locations within the same area
      this.checkDuplicateSubLocations(areaData.sub_locations);

      // Validate coordinates if provided
      if (areaData.latitude !== undefined || areaData.longitude !== undefined) {
        this.validateCoordinates(areaData.latitude, areaData.longitude);
      }

      // Validate machine images if any
      if (areaData.sub_locations) {
        for (const subLoc of areaData.sub_locations) {
          if (subLoc.select_machine?.machine_image) {
            await this.validateAndProcessMachineImages(subLoc.select_machine.machine_image);
          }
        }
      }

      const newArea = new AreaRouteModel(areaData);
      const savedArea = await newArea.save();

      await this.createAuditLog(
        savedArea._id.toString(),
        "CREATE",
        null,
        savedArea.toObject(),
        undefined,
        auditParams
      );

      return savedArea;
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        const errorMessages = Object.values(error.errors).map(err => err.message);
        throw new Error(`Validation failed: ${errorMessages.join(", ")}`);
      }
      throw error;
    }
  }

  static async getAreaById(id: string): Promise<ICreateArea | null> {
    this.validateObjectId(id);
    return await AreaRouteModel.findById(id);
  }

  static async getAllAreas(queryParams: AreaQueryParams): Promise<AreaPaginationResult> {
    const {
      page = 1,
      limit = 10,
      status,
      state,
      district,
      search,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = queryParams;

    const filter = this.buildFilter({ status, state, district, search });

    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, Math.min(limit, 100));
    const skip = (pageNum - 1) * limitNum;

    const sort = this.buildSort(sortBy, sortOrder);

    const [data, totalItems] = await Promise.all([
      AreaRouteModel.find(filter).sort(sort).skip(skip).limit(limitNum),
      AreaRouteModel.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalItems / limitNum);

    return {
      data,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems,
        itemsPerPage: limitNum,
      },
    };
  }

  // UPDATE AREA WITH NEW STRUCTURE
  static async updateArea(
    id: string,
    updateData: UpdateAreaDto,
    auditParams?: AuditLogParams
  ): Promise<ICreateArea | null> {
    this.validateObjectId(id);

    const existingArea = await AreaRouteModel.findById(id);
    if (!existingArea) {
      throw new Error("Area not found");
    }

    // Check for duplicate area name if changing
    if (updateData.area_name && updateData.area_name !== existingArea.area_name) {
      const duplicateArea = await AreaRouteModel.findOne({
        area_name: updateData.area_name,
        _id: { $ne: id },
      });

      if (duplicateArea) {
        throw new Error("Area with this name already exists");
      }
    }

    // Validate sub-locations if provided
    if (updateData.sub_locations) {
      this.validateSubLocation(updateData.sub_locations as any);

      // Check for duplicates
      this.checkDuplicateSubLocations(updateData.sub_locations as any);

      // Validate machine images
      for (const subLoc of (updateData.sub_locations as any)) {
        if (subLoc.select_machine?.machine_image) {
          await this.validateAndProcessMachineImages(subLoc.select_machine.machine_image);
        }
      }
    }

    // Validate coordinates if provided
    if (updateData.latitude !== undefined || updateData.longitude !== undefined) {
      this.validateCoordinates(updateData.latitude, updateData.longitude);
    }

    const oldData = existingArea.toObject();
    const updatedArea = await AreaRouteModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (updatedArea) {
      const newData = updatedArea.toObject();
      const changes = this.findChanges(oldData, newData);

      if (Object.keys(changes).length > 0) {
        await this.createAuditLog(id, "UPDATE", oldData, newData, changes, auditParams);
      }
    }

    return updatedArea;
  }

  static async deleteArea(id: string, auditParams?: AuditLogParams): Promise<ICreateArea | null> {
    this.validateObjectId(id);

    const existingArea = await AreaRouteModel.findById(id);
    if (!existingArea) {
      return null;
    }

    // Delete machine images from cloud storage before deleting area
    await this.deleteAllMachineImagesFromArea(existingArea);

    const deletedArea = await AreaRouteModel.findByIdAndDelete(id);

    if (deletedArea) {
      await this.createAuditLog(
        id,
        "DELETE",
        existingArea.toObject(),
        null,
        undefined,
        auditParams
      );
    }

    return deletedArea;
  }

  static async getAreasByStatus(status: "active" | "inactive"): Promise<ICreateArea[]> {
    if (!["active", "inactive"].includes(status)) {
      throw new Error("Invalid status value");
    }

    return await AreaRouteModel.find({ status });
  }

  static async updateAreaStatus(
    id: string,
    status: "active" | "inactive",
    auditParams?: AuditLogParams
  ): Promise<ICreateArea | null> {
    this.validateObjectId(id);

    if (!["active", "inactive"].includes(status)) {
      throw new Error("Invalid status value");
    }

    const existingArea = await AreaRouteModel.findById(id);
    if (!existingArea) {
      return null;
    }

    const updatedArea = await AreaRouteModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );

    if (updatedArea && existingArea.status !== status) {
      const changes = {
        status: { old: existingArea.status, new: status },
      };

      await this.createAuditLog(
        id,
        "STATUS_CHANGE",
        { status: existingArea.status },
        { status },
        changes,
        auditParams
      );
    }

    return updatedArea;
  }

  static async checkAreaExists(areaName: string, excludeId?: string): Promise<boolean> {
    const filter: any = { area_name: areaName };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const count = await AreaRouteModel.countDocuments(filter);
    return count > 0;
  }

  static async toggleAreaStatus(
    id: string,
    auditParams?: AuditLogParams
  ): Promise<ICreateArea | null> {
    this.validateObjectId(id);

    const area = await this.getAreaById(id);
    if (!area) {
      throw new Error("Area not found");
    }

    const newStatus = area.status === "active" ? "inactive" : "active";
    return await this.updateAreaStatus(id, newStatus, auditParams);
  }

  private static validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid MongoDB ObjectId");
    }
  }

  // UPDATED VALIDATE SUB-LOCATION METHOD
  private static validateSubLocation(subLocations: any): void {
    if (!Array.isArray(subLocations) || subLocations.length === 0) {
      throw new Error("At least one sub-location must be provided");
    }

    for (const subLoc of subLocations) {
      // Validate required fields
      if (!subLoc.campus || !subLoc.tower || !subLoc.floor) {
        throw new Error("Campus, tower, and floor are required in each sub-location");
      }

      // Validate select_machine structure
      if (!subLoc.select_machine) {
        throw new Error("Machine details are required in each sub-location");
      }

      // Validate machine_id
      if (!subLoc.select_machine.machine_id || typeof subLoc.select_machine.machine_id !== 'string') {
        throw new Error("Valid machine_id is required");
      }

      // Validate machine status
      if (!subLoc.select_machine.status || !['installed', 'not_installed'].includes(subLoc.select_machine.status)) {
        throw new Error("Valid machine status (installed/not_installed) is required");
      }

      // Validate machine_image if present
      if (subLoc.select_machine.machine_image && !Array.isArray(subLoc.select_machine.machine_image)) {
        throw new Error("Machine images must be an array");
      }
    }
  }

  private static validateCoordinates(latitude?: number, longitude?: number): void {
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      throw new Error("Latitude must be between -90 and 90");
    }

    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      throw new Error("Longitude must be between -180 and 180");
    }
  }

  private static buildFilter(params: {
    status?: string;
    state?: string;
    district?: string;
    search?: string;
  }): any {
    const filter: any = {};

    if (params.status) filter.status = params.status;
    if (params.state) filter.state = { $regex: params.state, $options: "i" };
    if (params.district) filter.district = { $regex: params.district, $options: "i" };

    if (params.search) {
      filter.$or = [
        { area_name: { $regex: params.search, $options: "i" } },
        { state: { $regex: params.search, $options: "i" } },
        { district: { $regex: params.search, $options: "i" } },
        { pincode: { $regex: params.search, $options: "i" } },
        { area_description: { $regex: params.search, $options: "i" } },
        { "sub_locations.select_machine.machine_id": { $regex: params.search, $options: "i" } },
      ];
    }

    return filter;
  }

  private static buildSort(sortBy: string, sortOrder: "asc" | "desc"): any {
    const sort: any = {};

    const allowedSortFields = [
      "area_name",
      "state",
      "district",
      "pincode",
      "status",
      "createdAt",
      "updatedAt",
    ];

    const field = allowedSortFields.includes(sortBy) ? sortBy : "createdAt";
    sort[field] = sortOrder === "asc" ? 1 : -1;

    return sort;
  }

  static async getFilterOptions(): Promise<{
    states: string[];
    districts: string[];
    campuses: string[];
    towers: string[];
    floors: string[];
  }> {
    const [states, districts, campuses, towers, floors] = await Promise.all([
      AreaRouteModel.distinct("state") as Promise<string[]>,
      AreaRouteModel.distinct("district") as Promise<string[]>,
      AreaRouteModel.distinct("sub_locations.campus") as Promise<string[]>,
      AreaRouteModel.distinct("sub_locations.tower") as Promise<string[]>,
      AreaRouteModel.distinct("sub_locations.floor") as Promise<string[]>,
    ]);

    return {
      states: states.filter(Boolean).sort(),
      districts: districts.filter(Boolean).sort(),
      campuses: campuses.filter(Boolean).sort(),
      towers: towers.filter(Boolean).sort(),
      floors: floors.filter(Boolean).sort(),
    };
  }

  // UPDATED ADD SUB-LOCATION METHOD
  static async addSubLocation(
    areaId: string,
    newSubLocation: {
      campus: string;
      tower: string;
      floor: string;
      select_machine: {
        machine_id: string;
        status: "installed" | "not_installed";
        machine_image?: IMachineImageData[];
      };
    },
    auditParams?: AuditLogParams
  ): Promise<ICreateArea | null> {
    this.validateObjectId(areaId);

    // Validate the new sub-location
    if (!newSubLocation.campus || !newSubLocation.tower || !newSubLocation.floor) {
      throw new Error("Campus, tower, and floor are required");
    }

    if (!newSubLocation.select_machine || !newSubLocation.select_machine.machine_id) {
      throw new Error("Machine details are required");
    }

    const existingArea = await AreaRouteModel.findById(areaId);
    if (!existingArea) {
      return null;
    }

    // Check for duplicates
    const duplicateExists = existingArea.sub_locations?.some(
      subLoc =>
        subLoc.campus === newSubLocation.campus &&
        subLoc.tower === newSubLocation.tower &&
        subLoc.floor === newSubLocation.floor
    );

    if (duplicateExists) {
      throw new Error(
        "This sub-location (campus, tower, floor combination) already exists for this area"
      );
    }

    // Validate machine images if any
    if (newSubLocation.select_machine.machine_image) {
      await this.validateAndProcessMachineImages(newSubLocation.select_machine.machine_image);
    }

    const oldSubLocations = [...(existingArea.sub_locations || [])];

    const updatedArea = await AreaRouteModel.findByIdAndUpdate(
      areaId,
      {
        $push: {
          sub_locations: newSubLocation,
        },
      },
      { new: true, runValidators: true }
    );

    if (updatedArea) {
      const newSubLocations = [...(updatedArea.sub_locations || [])];
      const changes = {
        sub_locations: {
          old: oldSubLocations.length,
          new: newSubLocations.length,
          added: {
            campus: newSubLocation.campus,
            tower: newSubLocation.tower,
            floor: newSubLocation.floor,
            machine_id: newSubLocation.select_machine.machine_id
          }
        },
      };

      await this.createAuditLog(
        areaId,
        "ADD_SUB_LOCATION",
        { sub_locations: oldSubLocations },
        { sub_locations: newSubLocations },
        changes,
        auditParams
      );
    }

    return updatedArea;
  }

  static async getDashboardData(params: DashboardFilterParams): Promise<DashboardData> {
    const {
      status = "all",
      state,
      district,
      address,
      campus,
      tower,
      floor,
      search,
      page = 1,
      limit = 10,
      sortBy = "createdAt",
      sortOrder = "desc",
    } = params;

    const filter = this.buildDashboardFilter({
      status,
      state,
      district,
      address,
      campus,
      tower,
      floor,
      search,
    });

    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, Math.min(limit, 100));
    const skip = (pageNum - 1) * limitNum;

    const sort = this.buildSort(sortBy, sortOrder);

    const [areas, totalItems, statistics, filterOptions] = await Promise.all([
      AreaRouteModel.find(filter).sort(sort).skip(skip).limit(limitNum),
      AreaRouteModel.countDocuments(filter),
      this.getDashboardStatistics(),
      this.getFilterOptions(),
    ]);

    const totalPages = Math.ceil(totalItems / limitNum);

    return {
      areas,
      statistics,
      filterOptions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems,
        itemsPerPage: limitNum,
      },
    };
  }

  private static buildDashboardFilter(params: {
    status?: string;
    address?: string;
    state?: string;
    district?: string;
    campus?: string;
    tower?: string;
    floor?: string;
    search?: string;
  }): any {
    const filter: any = {};

    if (params.status && params.status !== "all") {
      filter.status = params.status;
    }

    if (params.address) {
      filter.address = { $regex: params.address, $options: "i" };
    }

    if (params.state) {
      filter.state = { $regex: params.state, $options: "i" };
    }

    if (params.district) {
      filter.district = { $regex: params.district, $options: "i" };
    }

    if (params.campus || params.tower || params.floor) {
      filter["sub_locations"] = {
        $elemMatch: {
          ...(params.campus && { campus: { $regex: params.campus, $options: "i" } }),
          ...(params.tower && { tower: { $regex: params.tower, $options: "i" } }),
          ...(params.floor && { floor: { $regex: params.floor, $options: "i" } }),
        },
      };
    }

    if (params.search) {
      filter.$or = [
        { area_name: { $regex: params.search, $options: "i" } },
        { state: { $regex: params.search, $options: "i" } },
        { district: { $regex: params.search, $options: "i" } },
        { pincode: { $regex: params.search, $options: "i" } },
        { area_description: { $regex: params.search, $options: "i" } },
        { address: { $regex: params.search, $options: "i" } },
        { "sub_locations.campus": { $regex: params.search, $options: "i" } },
        { "sub_locations.tower": { $regex: params.search, $options: "i" } },
        { "sub_locations.floor": { $regex: params.search, $options: "i" } },
        { "sub_locations.select_machine.machine_id": { $regex: params.search, $options: "i" } },
      ];
    }

    return filter;
  }

  private static async getDashboardStatistics(): Promise<{
    totalAreas: number;
    activeAreas: number;
    inactiveAreas: number;
    areasByState: Record<string, number>;
    areasByDistrict: Record<string, number>;
    areasByStatus: Record<string, number>;
    areasByCampus: Record<string, number>;
  }> {
    const [
      totalAreas,
      activeAreas,
      inactiveAreas,
      stateAggregation,
      districtAggregation,
      campusAggregation,
    ] = await Promise.all([
      AreaRouteModel.countDocuments(),
      AreaRouteModel.countDocuments({ status: "active" }),
      AreaRouteModel.countDocuments({ status: "inactive" }),
      AreaRouteModel.aggregate([{ $group: { _id: "$state", count: { $sum: 1 } } }]),
      AreaRouteModel.aggregate([{ $group: { _id: "$district", count: { $sum: 1 } } }]),
      AreaRouteModel.aggregate([
        { $unwind: "$sub_locations" },
        { $group: { _id: "$sub_locations.campus", count: { $sum: 1 } } },
      ]),
    ]);

    const areasByState: Record<string, number> = {};
    const areasByDistrict: Record<string, number> = {};
    const areasByCampus: Record<string, number> = {};

    stateAggregation.forEach(item => {
      areasByState[item._id || "Unknown"] = item.count;
    });

    districtAggregation.forEach(item => {
      areasByDistrict[item._id || "Unknown"] = item.count;
    });

    campusAggregation.forEach(item => {
      areasByCampus[item._id || "Unknown"] = item.count;
    });

    return {
      totalAreas,
      activeAreas,
      inactiveAreas,
      areasByState,
      areasByDistrict,
      areasByStatus: {
        active: activeAreas,
        inactive: inactiveAreas,
      },
      areasByCampus,
    };
  }

  static async getDashboardTableData(params: DashboardFilterParams): Promise<{
    data: any[];
    total: number;
  }> {
    const filter = this.buildDashboardFilter({
      status: params.status || "all",
      address: params.address,
      state: params.state,
      district: params.district,
      campus: params.campus,
      tower: params.tower,
      floor: params.floor,
      search: params.search,
    });

    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const sort = this.buildSort(params.sortBy || "area_name", params.sortOrder || "asc");

    const [areas, total] = await Promise.all([
      AreaRouteModel.find(filter).sort(sort).skip(skip).limit(limit),
      AreaRouteModel.countDocuments(filter),
    ]);

    const tableData = areas.map(area => ({
      id: area._id,
      area_name: area.area_name,
      state: area.state,
      district: area.district,
      pincode: area.pincode,
      address: area.address,
      status: area.status,
      sub_locations_count: area.sub_locations?.length || 0,
      total_machines: area.sub_locations?.filter(
        (subLoc: any) => subLoc.select_machine && subLoc.select_machine.machine_id
      ).length || 0,
      campuses: [...new Set(area.sub_locations?.map(s => s.campus) || [])].join(", "),
    }));

    return {
      data: tableData,
      total,
    };
  }

  static async getAreasByIds(areaIds: string[]): Promise<ICreateArea[]> {
    const invalidIds = areaIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid area IDs: ${invalidIds.join(", ")}`);
    }

    return await AreaRouteModel.find({
      _id: { $in: areaIds },
    })
      .sort({ area_name: 1 })
      .select(
        "area_name state district pincode status latitude longitude address area_description sub_locations createdAt updatedAt"
      );
  }

  static async getSummarizedAreasByIds(areaIds: string[]): Promise<any[]> {
    const areas = await this.getAreasByIds(areaIds);

    return areas.map(area => {
      const areaDoc = area.toObject ? area.toObject() : area;

      const subLocationsCount = areaDoc.sub_locations?.length || 0;
      const totalMachines = areaDoc.sub_locations?.filter(
        (subLoc: any) => subLoc.select_machine && subLoc.select_machine.machine_id
      ).length || 0;

      const uniqueCampuses = [
        ...new Set(areaDoc.sub_locations?.map((sl: any) => sl.campus).filter(Boolean) || []),
      ];

      return {
        id: areaDoc._id,
        area_name: areaDoc.area_name,
        state: areaDoc.state,
        district: areaDoc.district,
        pincode: areaDoc.pincode,
        status: areaDoc.status,
        address: areaDoc.address,
        sub_locations_count: subLocationsCount,
        total_machines: totalMachines,
        campuses: uniqueCampuses,
        created_at: areaDoc.createdAt,
        updated_at: areaDoc.updatedAt,
      };
    });
  }

  static async getRecentActivities(limit: number = 10, filter?: any): Promise<any[]> {
    try {
      let query = HistoryAreaModel.find();

      if (filter) {
        query = query.where(filter);
      }

      const activities = await query
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate("area_id", "area_name state district")
        .lean();

      return activities.map(activity => ({
        id: activity._id,
        action: activity.action,
        area_id: activity.area_id?._id,
        area_name: (activity.area_id as any)?.area_name || "Deleted Area",
        area_state: (activity.area_id as any)?.state,
        area_district: (activity.area_id as any)?.district,
        performed_by: activity.performed_by,
        ip_address: activity.ip_address,
        user_agent: activity.user_agent,
        timestamp: activity.timestamp,
        changes: activity.changes,
        old_data: activity.old_data,
        new_data: activity.new_data,
      }));
    } catch (error) {
      logger.error("Error fetching recent activities:", error);
      throw error;
    }
  }

  // NEW METHOD FOR ADDING MACHINE IMAGES
  static async addMachineImages(
    areaId: string,
    subLocationIndex: number,
    machineIndex: number,
    images: IMachineImageData[],
    auditParams?: AuditLogParams
  ): Promise<ICreateArea | null> {
    this.validateObjectId(areaId);

    const existingArea = await AreaRouteModel.findById(areaId);
    if (!existingArea) {
      return null;
    }

    if (!existingArea.sub_locations || existingArea.sub_locations.length <= subLocationIndex) {
      throw new Error("Sub-location not found");
    }

    const subLocation = existingArea.sub_locations[subLocationIndex];
    if (!subLocation.select_machine) {
      throw new Error("Machine not found in sub-location");
    }

    const oldImages = [...(subLocation.select_machine.machine_image || [])];

    // Validate new images
    await this.validateAndProcessMachineImages(images);

    // Add new images
    const updatePath = `sub_locations.${subLocationIndex}.select_machine.machine_image`;

    const updatedArea = await AreaRouteModel.findByIdAndUpdate(
      areaId,
      {
        $push: { [updatePath]: { $each: images } }
      },
      { new: true, runValidators: true }
    );

    if (updatedArea) {
      const newSubLocation = updatedArea.sub_locations[subLocationIndex];
      const changes = {
        machine_images: {
          old: oldImages.length,
          new: newSubLocation.select_machine.machine_image.length,
          added: images.map(img => img.image_name)
        }
      };

      await this.createAuditLog(
        areaId,
        "UPDATE",
        null,
        null,
        changes,
        auditParams
      );
    }

    return updatedArea;
  }

  // NEW METHOD FOR REMOVING MACHINE IMAGE
  static async removeMachineImage(
    areaId: string,
    subLocationIndex: number,
    machineIndex: number,
    imageIndex: number,
    auditParams?: AuditLogParams
  ): Promise<ICreateArea | null> {
    this.validateObjectId(areaId);

    const existingArea = await AreaRouteModel.findById(areaId);
    if (!existingArea) {
      return null;
    }

    if (!existingArea.sub_locations || existingArea.sub_locations.length <= subLocationIndex) {
      throw new Error("Sub-location not found");
    }

    const subLocation = existingArea.sub_locations[subLocationIndex];
    if (!subLocation.select_machine || !subLocation.select_machine.machine_image) {
      throw new Error("No machine images found");
    }

    if (subLocation.select_machine.machine_image.length <= imageIndex) {
      throw new Error("Image not found");
    }

    const imageToRemove = subLocation.select_machine.machine_image[imageIndex];
    const oldImages = [...subLocation.select_machine.machine_image];

    // Remove the image from the array
    const updatePath = `sub_locations.${subLocationIndex}.select_machine.machine_image`;

    const updatedArea = await AreaRouteModel.findByIdAndUpdate(
      areaId,
      {
        $pull: { [updatePath]: { cloudinary_public_id: imageToRemove.cloudinary_public_id } }
      },
      { new: true }
    );

    if (updatedArea) {
      // Delete from cloud storage
      const uploadService = new ImageUploadService();
      try {
        await uploadService.deleteFromCloudinary(imageToRemove.cloudinary_public_id);
      } catch (error) {
        logger.error("Failed to delete image from cloud storage:", error);
        // Continue even if cloud storage deletion fails
      }

      const newSubLocation = updatedArea.sub_locations[subLocationIndex];
      const changes = {
        removed_image: {
          old: imageToRemove.image_name,
          new: null
        },
        remaining_images: {
          old: oldImages.length,
          new: newSubLocation.select_machine.machine_image.length
        }
      };

      await this.createAuditLog(
        areaId,
        "UPDATE",
        null,
        null,
        changes,
        auditParams
      );
    }

    return updatedArea;
  }

  // UPDATED REMOVE MACHINE METHOD
  static async removeMachineFromArea(
    areaId: string,
    machineId: string,
    auditParams?: AuditLogParams
  ): Promise<ICreateArea | null> {
    this.validateObjectId(areaId);

    if (!machineId || machineId.trim() === "") {
      throw new Error("Machine ID is required");
    }

    const existingArea = await AreaRouteModel.findById(areaId);
    if (!existingArea) {
      return null;
    }

    // Check if the machine exists
    const machineExists = existingArea.sub_locations?.some(
      subloc => subloc.select_machine?.machine_id === machineId
    );

    if (!machineExists) {
      throw new Error(`Machine with ID "${machineId}" not found in any sub-location of this area`);
    }

    // Create a deep copy of old sub-locations
    const oldSubLocations = JSON.parse(JSON.stringify(existingArea.sub_locations || []));

    // Remove the machine from sub-locations where it exists
    const updatedSubLocations = existingArea.sub_locations?.map(subloc => {
      const sublocObj = (subloc as any).toObject ? (subloc as any).toObject() : { ...subloc };

      if (subloc.select_machine?.machine_id === machineId) {
        // Remove machine images from cloud storage
        if (subloc.select_machine.machine_image && subloc.select_machine.machine_image.length > 0) {
          const uploadService = new ImageUploadService();
          subloc.select_machine.machine_image.forEach(async (image: IMachineImageData) => {
            try {
              await uploadService.deleteFromCloudinary(image.cloudinary_public_id);
            } catch (error) {
              logger.error(`Failed to delete image ${image.cloudinary_public_id}:`, error);
            }
          });
        }

        // Return sub-location without the machine
        return {
          ...sublocObj,
          select_machine: undefined
        };
      }

      return sublocObj;
    });

    // Filter out sub-locations that still have machines
    const filteredSubLocations = updatedSubLocations?.filter(
      subloc => subloc.select_machine !== undefined
    );

    // Check if we removed all machines
    if (!filteredSubLocations || filteredSubLocations.length === 0) {
      throw new Error("Cannot remove all machines from area. At least one machine must remain.");
    }

    const updatedArea = await AreaRouteModel.findByIdAndUpdate(
      areaId,
      {
        $set: {
          sub_locations: filteredSubLocations
        }
      },
      { new: true, runValidators: true }
    );

    if (updatedArea) {
      const oldMachineCount = oldSubLocations.filter(
        subloc => subloc.select_machine !== undefined
      ).length;
      const newMachineCount = updatedArea.sub_locations?.length || 0;

      const changes = {
        removed_machine_id: { old: machineId, new: null },
        machine_count: { old: oldMachineCount, new: newMachineCount }
      };

      await this.createAuditLog(
        areaId,
        "REMOVE_MACHINE",
        { sub_locations: oldSubLocations },
        { sub_locations: updatedArea.sub_locations },
        changes,
        auditParams
      );
    }

    return updatedArea;
  }

  // NEW HELPER METHOD FOR VALIDATING MACHINE IMAGES
  private static async validateAndProcessMachineImages(images: IMachineImageData[]): Promise<void> {
    if (!Array.isArray(images)) {
      throw new Error("Machine images must be an array");
    }

    for (const image of images) {
      if (!image.image_name || !image.file_url || !image.cloudinary_public_id) {
        throw new Error("Each machine image must have image_name, file_url, and cloudinary_public_id");
      }

      if (!image.file_size || image.file_size <= 0) {
        throw new Error("Valid file size is required for machine images");
      }

      if (!image.mime_type || !['image/jpeg', 'image/png', 'image/jpg', 'image/gif'].includes(image.mime_type)) {
        throw new Error("Only JPEG, PNG, JPG, and GIF images are allowed");
      }
    }
  }

  // NEW HELPER METHOD FOR CHECKING DUPLICATE SUB-LOCATIONS
  private static checkDuplicateSubLocations(subLocations: any[]): void {
    const seen = new Set();

    for (const subLoc of subLocations) {
      const key = `${subLoc.campus}-${subLoc.tower}-${subLoc.floor}`;

      if (seen.has(key)) {
        throw new Error(`Duplicate sub-location found: ${key}`);
      }

      seen.add(key);
    }
  }

  // NEW HELPER METHOD FOR DELETING ALL MACHINE IMAGES FROM AREA
  private static async deleteAllMachineImagesFromArea(area: ICreateArea): Promise<void> {
    const uploadService = new ImageUploadService();

    for (const subLoc of area.sub_locations || []) {
      if (subLoc.select_machine?.machine_image) {
        for (const image of subLoc.select_machine.machine_image) {
          try {
            await uploadService.deleteFromCloudinary(image.cloudinary_public_id);
          } catch (error) {
            logger.error(`Failed to delete image ${image.cloudinary_public_id}:`, error);
          }
        }
      }
    }
  }
}