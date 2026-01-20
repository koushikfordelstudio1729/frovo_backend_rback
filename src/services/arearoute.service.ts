import mongoose, { Types } from "mongoose";
import {
  AreaRouteModel,
  ICreateArea,
  HistoryAreaModel,
  IHistoryArea,
} from "../models/AreaRoute.model";

import { logger } from "../utils/logger.util";
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
    select_machine: string[];
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
    select_machine?: string[];
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
  /**
   * Create audit trail entry
   */
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
      // Don't throw error here to avoid breaking main operation
    }
  }

  /**
   * Compare two objects and find differences
   */
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

  /**
   * Get audit logs for an area
   */
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

  /**
   * Get audit trail summary for dashboard
   */
  static async getAuditSummary(limit: number = 10): Promise<IHistoryArea[]> {
    return await HistoryAreaModel.find()
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate("area_id", "area_name state district");
  }

  /**
   * Create a new area with audit trail
   */
  static async createArea(
    areaData: CreateAreaDto,
    auditParams?: AuditLogParams
  ): Promise<ICreateArea> {
    try {
      // Check for duplicate area name WITH SAME SUB-LOCATIONS
      const existingAreas = await AreaRouteModel.find({
        area_name: areaData.area_name,
      });

      // Check if any existing area has overlapping sub-locations
      if (Array.isArray(areaData.sub_locations)) {
        for (const newSubLoc of areaData.sub_locations) {
          for (const existingArea of existingAreas) {
            const existingSubLocs = existingArea.sub_locations || [];
            const duplicateExists = existingSubLocs.some(
              (existingLoc: any) =>
                existingLoc.campus === newSubLoc.campus &&
                existingLoc.tower === newSubLoc.tower &&
                existingLoc.floor === newSubLoc.floor
            );

            if (duplicateExists) {
              throw new Error(
                `Sub-location with campus "${newSubLoc.campus}", tower "${newSubLoc.tower}", floor "${newSubLoc.floor}" already exists for area "${areaData.area_name}"`
              );
            }
          }
        }
      }

      // Validate sub-location(s)
      this.validateSubLocation(areaData.sub_locations);

      // Validate coordinates if provided
      if (areaData.latitude !== undefined || areaData.longitude !== undefined) {
        this.validateCoordinates(areaData.latitude, areaData.longitude);
      }

      const newArea = new AreaRouteModel(areaData);
      const savedArea = await newArea.save();

      // Create audit log
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

  /**
   * Get area by ID
   */
  static async getAreaById(id: string): Promise<ICreateArea | null> {
    this.validateObjectId(id);
    return await AreaRouteModel.findById(id);
  }

  /**
   * Get all areas with filtering and pagination
   */
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

  /**
   * Update area by ID with audit trail
   */
  static async updateArea(
    id: string,
    updateData: UpdateAreaDto,
    auditParams?: AuditLogParams
  ): Promise<ICreateArea | null> {
    this.validateObjectId(id);

    // Get the existing area before update
    const existingArea = await AreaRouteModel.findById(id);
    if (!existingArea) {
      throw new Error("Area not found");
    }

    // Check for duplicate area name if updating
    if (updateData.area_name) {
      const duplicateArea = await AreaRouteModel.findOne({
        area_name: updateData.area_name,
        _id: { $ne: id },
      });

      if (duplicateArea) {
        throw new Error("Area with this name already exists");
      }
    }

    // Validate sub-location if updating
    if (updateData.sub_locations) {
      this.validateSubLocation(updateData.sub_locations as any);
    }

    // Validate coordinates if updating
    if (updateData.latitude !== undefined || updateData.longitude !== undefined) {
      this.validateCoordinates(updateData.latitude, updateData.longitude);
    }

    // Find changes
    const oldData = existingArea.toObject();
    const updatedArea = await AreaRouteModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (updatedArea) {
      const newData = updatedArea.toObject();
      const changes = this.findChanges(oldData, newData);

      // Create audit log only if there are actual changes
      if (Object.keys(changes).length > 0) {
        await this.createAuditLog(id, "UPDATE", oldData, newData, changes, auditParams);
      }
    }

    return updatedArea;
  }

  /**
   * Delete area by ID with audit trail
   */
  static async deleteArea(id: string, auditParams?: AuditLogParams): Promise<ICreateArea | null> {
    this.validateObjectId(id);

    // Get the area before deletion
    const existingArea = await AreaRouteModel.findById(id);
    if (!existingArea) {
      return null;
    }

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

  /**
   * Get areas by status
   */
  static async getAreasByStatus(status: "active" | "inactive"): Promise<ICreateArea[]> {
    if (!["active", "inactive"].includes(status)) {
      throw new Error("Invalid status value");
    }

    return await AreaRouteModel.find({ status });
  }

  /**
   * Update area status with audit trail
   */
  static async updateAreaStatus(
    id: string,
    status: "active" | "inactive",
    auditParams?: AuditLogParams
  ): Promise<ICreateArea | null> {
    this.validateObjectId(id);

    if (!["active", "inactive"].includes(status)) {
      throw new Error("Invalid status value");
    }

    // Get the existing area before update
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

  /**
   * Check if area exists by name
   */
  static async checkAreaExists(areaName: string, excludeId?: string): Promise<boolean> {
    const filter: any = { area_name: areaName };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const count = await AreaRouteModel.countDocuments(filter);
    return count > 0;
  }

  /**
   * Toggle area status with audit trail
   */
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

  /**
   * Validate MongoDB ObjectId
   */
  private static validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid MongoDB ObjectId");
    }
  }

  /**
   * Validate sub-location structure
   */
  private static validateSubLocation(subLocation: any): void {
    if (Array.isArray(subLocation)) {
      if (subLocation.length === 0) {
        throw new Error("At least one sub-location must be provided");
      }

      for (const loc of subLocation) {
        if (!loc.campus || !loc.tower || !loc.floor) {
          throw new Error("Campus, tower, and floor are required in each sub-location");
        }

        if (!Array.isArray(loc.select_machine) || loc.select_machine.length === 0) {
          throw new Error("At least one machine must be selected in each sub-location");
        }
      }
    } else if (typeof subLocation === "object" && subLocation !== null) {
      if (!subLocation.campus || !subLocation.tower || !subLocation.floor) {
        throw new Error("Campus, tower, and floor are required in sub-location");
      }

      if (!Array.isArray(subLocation.select_machine) || subLocation.select_machine.length === 0) {
        throw new Error("At least one machine must be selected in sub-location");
      }
    } else {
      throw new Error("Invalid sub-location format");
    }
  }

  /**
   * Validate coordinates
   */
  private static validateCoordinates(latitude?: number, longitude?: number): void {
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      throw new Error("Latitude must be between -90 and 90");
    }

    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      throw new Error("Longitude must be between -180 and 180");
    }
  }

  /**
   * Build filter for querying
   */
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
      ];
    }

    return filter;
  }

  /**
   * Build sort object
   */
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

  /**
   * Get unique values for filtering
   */
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
      AreaRouteModel.distinct("sub_location.tower") as Promise<string[]>,
      AreaRouteModel.distinct("sub_location.floor") as Promise<string[]>,
    ]);

    return {
      states: states.filter(Boolean).sort(),
      districts: districts.filter(Boolean).sort(),
      campuses: campuses.filter(Boolean).sort(),
      towers: towers.filter(Boolean).sort(),
      floors: floors.filter(Boolean).sort(),
    };
  }

  /**
   * Add sub-location with audit trail
   */
  static async addSubLocation(
    areaId: string,
    newSubLocation: {
      campus: string;
      tower: string;
      floor: string;
      select_machine: string[];
    },
    auditParams?: AuditLogParams
  ): Promise<ICreateArea | null> {
    this.validateObjectId(areaId);

    // Validate the new sub-location
    this.validateSubLocation(newSubLocation);

    // Get existing area data
    const existingArea = await AreaRouteModel.findById(areaId);
    if (!existingArea) {
      return null;
    }

    const oldSubLocations = [...(existingArea.sub_locations || [])];

    // Check if this exact sub-location already exists for this area
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

    // Add the new sub-location
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

  /**
   * Get dashboard data with filters
   */
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

  /**
   * Build dashboard filter
   */
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
      ];
    }

    return filter;
  }

  /**
   * Get dashboard statistics
   */
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

  /**
   * Get dashboard table data
   */
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
      total_machines:
        area.sub_locations?.reduce((sum, sub) => sum + (sub.select_machine?.length || 0), 0) || 0,
      campuses: [...new Set(area.sub_locations?.map(s => s.campus) || [])].join(", "),
    }));

    return {
      data: tableData,
      total,
    };
  }

  /**
   * Get areas by IDs
   */
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

  /**
   * Get summarized areas data for export
   */
  static async getSummarizedAreasByIds(areaIds: string[]): Promise<any[]> {
    const areas = await this.getAreasByIds(areaIds);

    return areas.map(area => {
      const areaDoc = area.toObject ? area.toObject() : area;

      const subLocationsCount = areaDoc.sub_locations?.length || 0;
      const totalMachines =
        areaDoc.sub_locations?.reduce(
          (sum: number, subLoc: any) => sum + (subLoc.select_machine?.length || 0),
          0
        ) || 0;

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

  // Add this method to the AreaService class:

  /**
   * Get recent audit activities with optional filters
   */
  static async getRecentActivities(limit: number = 10, filter?: any): Promise<any[]> {
    try {
      let query = HistoryAreaModel.find();

      // Apply filter if provided
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
}
