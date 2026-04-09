import mongoose, { Types } from "mongoose";
import { logger } from "../utils/logger.util";
import { ImageUploadService } from "./areaFileUpload.service";
import { IMachineImageData } from "../models/AreaRoute.model";
import { Machine } from "../models/VM.model"; // ← Machine model for machineId validation

import {
  LocationModel,
  SubLocationModel,
  MachineDetailsModel,
  HistoryAreaModel,
  ILocation,
  ISubLocation,
  IMachineDetails,
  IHistoryArea,
} from "../models/AreaRoute.model";

// ─────────────────────────────────────────────────────────────────────────────
// DTOs / Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface UpdateMachineImagesDto {
  files: Express.Multer.File[];
}

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
  locations: ILocation[];
  statistics: {
    totalLocations: number;
    activeLocations: number;
    inactiveLocations: number;
    totalMachines: number;
    installedMachines: number;
    notInstalledMachines: number;
    activeMachines: number;
    inactiveMachines: number;
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

export interface CreateLocationDto {
  area_name: string;
  state: string;
  district: string;
  pincode: string;
  area_description: string;
  status: "active" | "inactive";
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface CreateSubLocationDto {
  campus: string;
  tower: string;
  floor: string;
  select_machine: string[]; // Array of machineId strings e.g. ["VM2024001"]
}

export interface UpdateLocationDto {
  area_name?: string;
  state?: string;
  district?: string;
  pincode?: string;
  area_description?: string;
  status?: "active" | "inactive";
  latitude?: number;
  longitude?: number;
  address?: string;
}

export interface UpdateMachineDetailsDto {
  installed_status?: "installed" | "not_installed";
  status?: "active" | "inactive";
  machine_image?: IMachineImageData[];
}

export interface LocationQueryParams {
  page?: number;
  limit?: number;
  status?: "active" | "inactive";
  state?: string;
  district?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
}

export interface LocationPaginationResult {
  data: ILocation[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface BulkUpdateStatusDto {
  locationIds: string[];
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

// ─────────────────────────────────────────────────────────────────────────────
// Service
// ─────────────────────────────────────────────────────────────────────────────

export class AreaService {
  // ── Private helpers ────────────────────────────────────────────────────────

  private static async createAuditLog(
    location_id: Types.ObjectId,
    action: IHistoryArea["action"],
    oldData: Partial<ILocation> | null,
    newData: Partial<ILocation> | null,
    changes?: Record<string, { old: any; new: any }>,
    auditParams?: AuditLogParams
  ): Promise<void> {
    try {
      const auditLog = new HistoryAreaModel({
        location_id,
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

  /**
   * Validates that every machineId in the array exists in the Machine collection.
   * Throws with a list of any missing IDs.
   */
  private static async validateMachineIds(machineIds: string[]): Promise<void> {
    if (!machineIds || machineIds.length === 0) {
      throw new Error("At least one machineId must be provided");
    }

    const found = await Machine.find({ machineId: { $in: machineIds } }, { machineId: 1 }).lean();

    const foundIds = found.map((m: any) => m.machineId as string);
    const missing = machineIds.filter(id => !foundIds.includes(id));

    if (missing.length > 0) {
      throw new Error(
        `The following machineIds do not exist in the Machine collection: ${missing.join(", ")}`
      );
    }
  }

  private static validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid MongoDB ObjectId");
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
      ];
    }
    return filter;
  }

  private static buildSort(sortBy: string, sortOrder: "asc" | "desc"): any {
    const allowed = [
      "area_name",
      "state",
      "district",
      "pincode",
      "status",
      "createdAt",
      "updatedAt",
    ];
    const field = allowed.includes(sortBy) ? sortBy : "createdAt";
    return { [field]: sortOrder === "asc" ? 1 : -1 };
  }

  private static buildDashboardFilter(params: {
    status?: string;
    address?: string;
    state?: string;
    district?: string;
    search?: string;
  }): any {
    const filter: any = {};
    if (params.status && params.status !== "all") filter.status = params.status;
    if (params.address) filter.address = { $regex: params.address, $options: "i" };
    if (params.state) filter.state = { $regex: params.state, $options: "i" };
    if (params.district) filter.district = { $regex: params.district, $options: "i" };
    if (params.search) {
      filter.$or = [
        { area_name: { $regex: params.search, $options: "i" } },
        { state: { $regex: params.search, $options: "i" } },
        { district: { $regex: params.search, $options: "i" } },
        { pincode: { $regex: params.search, $options: "i" } },
        { area_description: { $regex: params.search, $options: "i" } },
        { address: { $regex: params.search, $options: "i" } },
      ];
    }
    return filter;
  }

  private static async validateAndProcessMachineImages(images: IMachineImageData[]): Promise<void> {
    if (!Array.isArray(images)) {
      throw new Error("Machine images must be an array");
    }
    for (const image of images) {
      if (!image.image_name || !image.file_url || !image.cloudinary_public_id) {
        throw new Error(
          "Each machine image must have image_name, file_url, and cloudinary_public_id"
        );
      }
      if (!image.file_size || image.file_size <= 0) {
        throw new Error("Valid file size is required for machine images");
      }
      if (
        !image.mime_type ||
        !["image/jpeg", "image/png", "image/jpg", "image/gif"].includes(image.mime_type)
      ) {
        throw new Error("Only JPEG, PNG, JPG, and GIF images are allowed");
      }
    }
  }

  private static async deleteMachineImagesFromMachines(
    machineDetailsIds: Types.ObjectId[]
  ): Promise<void> {
    const uploadService = new ImageUploadService();
    const machines = await MachineDetailsModel.find({ _id: { $in: machineDetailsIds } });
    for (const machine of machines) {
      if (machine.machine_image?.length > 0) {
        for (const image of machine.machine_image) {
          try {
            await uploadService.deleteFromCloudinary(image.cloudinary_public_id);
          } catch (error) {
            logger.error(`Failed to delete image ${image.cloudinary_public_id}:`, error);
          }
        }
      }
    }
  }

  // ── Audit Logs ──────────────────────────────────────────────────────────────

  static async getAuditLogs(
    locationId: string,
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
    this.validateObjectId(locationId);
    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, Math.min(limit, 50));
    const skip = (pageNum - 1) * limitNum;

    const [logs, totalItems] = await Promise.all([
      HistoryAreaModel.find({ location_id: new Types.ObjectId(locationId) })
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limitNum),
      HistoryAreaModel.countDocuments({
        location_id: new Types.ObjectId(locationId),
      }),
    ]);

    return {
      logs,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalItems / limitNum),
        totalItems,
        itemsPerPage: limitNum,
      },
    };
  }

  static async getAuditLogsBySubLocationId(
    subLocationId: string,
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
    this.validateObjectId(subLocationId);

    const subLocation = await SubLocationModel.findById(subLocationId);
    if (!subLocation) throw new Error("Sub-location not found");

    const allLogs = await HistoryAreaModel.find({
      location_id: subLocation.location_id,
    }).sort({ timestamp: -1 });

    const filteredLogs = allLogs.filter(log => {
      if (log.changes) {
        const changesStr = JSON.stringify(log.changes).toLowerCase();
        const subLocStr = JSON.stringify({
          campus: subLocation.campus,
          tower: subLocation.tower,
          floor: subLocation.floor,
        }).toLowerCase();
        if (changesStr.includes(subLocStr)) return true;
      }
      const dataStr = JSON.stringify({
        old: log.old_data,
        new: log.new_data,
      }).toLowerCase();
      return (
        dataStr.includes(subLocation.campus.toLowerCase()) ||
        dataStr.includes(subLocation.tower.toLowerCase()) ||
        dataStr.includes(subLocation.floor.toLowerCase())
      );
    });

    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, Math.min(limit, 50));
    const skip = (pageNum - 1) * limitNum;
    const paginatedLogs = filteredLogs.slice(skip, skip + limitNum);

    return {
      logs: paginatedLogs,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(filteredLogs.length / limitNum),
        totalItems: filteredLogs.length,
        itemsPerPage: limitNum,
      },
    };
  }

  static async getRecentActivities(limit: number = 10, filter?: any): Promise<any[]> {
    try {
      let query = HistoryAreaModel.find();
      if (filter) query = query.where(filter);

      const activities = await query
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate("location_id", "area_name state district")
        .lean();

      return activities.map(activity => ({
        id: activity._id,
        action: activity.action,
        location_id: (activity.location_id as any)?._id,
        area_name: (activity.location_id as any)?.area_name || "Deleted Area",
        area_state: (activity.location_id as any)?.state,
        area_district: (activity.location_id as any)?.district,
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

  // ── Location CRUD ───────────────────────────────────────────────────────────

  static async createLocation(
    locationData: CreateLocationDto,
    auditParams?: AuditLogParams
  ): Promise<ILocation> {
    try {
      const existing = await LocationModel.findOne({
        area_name: locationData.area_name,
      });
      if (existing) {
        throw new Error(`Location with name "${locationData.area_name}" already exists`);
      }

      if (locationData.latitude !== undefined || locationData.longitude !== undefined) {
        this.validateCoordinates(locationData.latitude, locationData.longitude);
      }

      const newLocation = new LocationModel(locationData);
      const saved = await newLocation.save();

      await this.createAuditLog(
        saved._id,
        "CREATE",
        null,
        saved.toObject(),
        undefined,
        auditParams
      );

      return saved;
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        const msgs = Object.values(error.errors).map(e => e.message);
        throw new Error(`Validation failed: ${msgs.join(", ")}`);
      }
      throw error;
    }
  }

  static async getLocationById(id: string): Promise<ILocation | null> {
    this.validateObjectId(id);
    return await LocationModel.findById(id);
  }

  static async getLocationDetails(id: string): Promise<any | null> {
    this.validateObjectId(id);

    const location = await LocationModel.findById(id);
    if (!location) return null;

    const subLocations = await SubLocationModel.find({ location_id: id });

    const subLocationsWithMachines = await Promise.all(
      subLocations.map(async subLoc => {
        const machines = await MachineDetailsModel.find({
          sub_location_id: subLoc._id,
        });
        return { ...subLoc.toObject(), machines };
      })
    );

    const totalMachines = subLocationsWithMachines.reduce((sum, s) => sum + s.machines.length, 0);
    const installedMachines = subLocationsWithMachines.reduce(
      (sum, s) => sum + s.machines.filter((m: any) => m.installed_status === "installed").length,
      0
    );
    const activeMachines = subLocationsWithMachines.reduce(
      (sum, s) => sum + s.machines.filter((m: any) => m.status === "active").length,
      0
    );

    return {
      ...location.toObject(),
      sub_locations: subLocationsWithMachines,
      summary: {
        total_sub_locations: subLocationsWithMachines.length,
        total_machines: totalMachines,
        installed_machines: installedMachines,
        not_installed_machines: totalMachines - installedMachines,
        active_machines: activeMachines,
        inactive_machines: totalMachines - activeMachines,
      },
    };
  }

  static async getAllLocations(
    queryParams: LocationQueryParams
  ): Promise<LocationPaginationResult> {
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
      LocationModel.find(filter).sort(sort).skip(skip).limit(limitNum),
      LocationModel.countDocuments(filter),
    ]);

    return {
      data,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalItems / limitNum),
        totalItems,
        itemsPerPage: limitNum,
      },
    };
  }

  static async updateLocation(
    id: string,
    updateData: UpdateLocationDto,
    auditParams?: AuditLogParams
  ): Promise<ILocation | null> {
    this.validateObjectId(id);

    const existing = await LocationModel.findById(id);
    if (!existing) throw new Error("Location not found");

    if (updateData.area_name && updateData.area_name !== existing.area_name) {
      const dup = await LocationModel.findOne({
        area_name: updateData.area_name,
        _id: { $ne: id },
      });
      if (dup) throw new Error("Location with this name already exists");
    }

    if (updateData.latitude !== undefined || updateData.longitude !== undefined) {
      this.validateCoordinates(updateData.latitude, updateData.longitude);
    }

    const oldData = existing.toObject();
    const updated = await LocationModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (updated) {
      const changes = this.findChanges(oldData, updated.toObject());
      if (Object.keys(changes).length > 0) {
        await this.createAuditLog(
          updated._id,
          "UPDATE",
          oldData,
          updated.toObject(),
          changes,
          auditParams
        );
      }
    }

    return updated;
  }

  static async deleteLocation(id: string, auditParams?: AuditLogParams): Promise<ILocation | null> {
    this.validateObjectId(id);

    const existing = await LocationModel.findById(id);
    if (!existing) return null;

    const subLocations = await SubLocationModel.find({ location_id: id });
    const machineDetailsIds: Types.ObjectId[] = [];

    for (const subLoc of subLocations) {
      const machines = await MachineDetailsModel.find({
        sub_location_id: subLoc._id,
      });
      machineDetailsIds.push(...machines.map(m => m._id));
    }

    await this.deleteMachineImagesFromMachines(machineDetailsIds);
    await MachineDetailsModel.deleteMany({ _id: { $in: machineDetailsIds } });
    await SubLocationModel.deleteMany({ location_id: id });
    const deleted = await LocationModel.findByIdAndDelete(id);

    if (deleted) {
      await this.createAuditLog(
        new Types.ObjectId(id),
        "DELETE",
        existing.toObject(),
        null,
        undefined,
        auditParams
      );
    }

    return deleted;
  }

  static async getLocationsByStatus(status: "active" | "inactive"): Promise<ILocation[]> {
    if (!["active", "inactive"].includes(status)) {
      throw new Error("Invalid status value");
    }
    return await LocationModel.find({ status });
  }

  static async updateLocationStatus(
    id: string,
    status: "active" | "inactive",
    auditParams?: AuditLogParams
  ): Promise<ILocation | null> {
    this.validateObjectId(id);
    if (!["active", "inactive"].includes(status)) {
      throw new Error("Invalid status value");
    }

    const existing = await LocationModel.findById(id);
    if (!existing) return null;

    const updated = await LocationModel.findByIdAndUpdate(id, { $set: { status } }, { new: true });

    if (updated && existing.status !== status) {
      await this.createAuditLog(
        updated._id,
        "STATUS_CHANGE",
        { status: existing.status },
        { status },
        { status: { old: existing.status, new: status } },
        auditParams
      );
    }

    return updated;
  }

  static async toggleLocationStatus(
    id: string,
    auditParams?: AuditLogParams
  ): Promise<ILocation | null> {
    this.validateObjectId(id);
    const location = await this.getLocationById(id);
    if (!location) throw new Error("Location not found");
    const newStatus = location.status === "active" ? "inactive" : "active";
    return await this.updateLocationStatus(id, newStatus, auditParams);
  }

  static async checkLocationExists(locationName: string, excludeId?: string): Promise<boolean> {
    const filter: any = { area_name: locationName };
    if (excludeId) filter._id = { $ne: excludeId };
    const count = await LocationModel.countDocuments(filter);
    return count > 0;
  }

  static async getLocationsByIds(locationIds: string[]): Promise<ILocation[]> {
    const invalidIds = locationIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid location IDs: ${invalidIds.join(", ")}`);
    }
    return await LocationModel.find({ _id: { $in: locationIds } })
      .sort({ area_name: 1 })
      .select(
        "area_name state district pincode status latitude longitude address area_description createdAt updatedAt"
      );
  }

  static async getSummarizedLocationsByIds(locationIds: string[]): Promise<any[]> {
    const locations = await this.getLocationsByIds(locationIds);

    return await Promise.all(
      locations.map(async location => {
        const subLocations = await SubLocationModel.find({
          location_id: location._id,
        });
        let totalMachines = 0;
        let installedMachines = 0;
        let notInstalledMachines = 0;

        for (const subLoc of subLocations) {
          const machines = await MachineDetailsModel.find({
            sub_location_id: subLoc._id,
          });
          totalMachines += machines.length;
          installedMachines += machines.filter(m => m.installed_status === "installed").length;
          notInstalledMachines += machines.filter(
            m => m.installed_status === "not_installed"
          ).length;
        }

        const uniqueCampuses = [...new Set(subLocations.map(sl => sl.campus).filter(Boolean))];

        return {
          id: location._id,
          area_name: location.area_name,
          state: location.state,
          district: location.district,
          pincode: location.pincode,
          status: location.status,
          address: location.address,
          sub_locations_count: subLocations.length,
          total_machines: totalMachines,
          installed_machines: installedMachines,
          not_installed_machines: notInstalledMachines,
          campuses: uniqueCampuses,
          created_at: location.createdAt,
          updated_at: location.updatedAt,
        };
      })
    );
  }

  // ── SubLocation CRUD ────────────────────────────────────────────────────────

  /**
   * Creates a sub-location and corresponding MachineDetails records.
   * Validates that all provided machineIds exist in the Machine collection first.
   */
  static async createSubLocation(
    locationId: string,
    subLocationData: CreateSubLocationDto,
    auditParams?: AuditLogParams
  ): Promise<{ subLocation: ISubLocation; machines: IMachineDetails[] }> {
    this.validateObjectId(locationId);

    const location = await LocationModel.findById(locationId);
    if (!location) throw new Error("Location not found");

    if (!subLocationData.campus || !subLocationData.tower || !subLocationData.floor) {
      throw new Error("Campus, tower, and floor are required");
    }

    if (
      !Array.isArray(subLocationData.select_machine) ||
      subLocationData.select_machine.length === 0
    ) {
      throw new Error("At least one machineId must be selected");
    }

    // ✅ Validate machineIds exist in Machine collection
    await this.validateMachineIds(subLocationData.select_machine);

    // ✅ Check if any machineId is already allocated to another sub-location
    const alreadyAllocated = await MachineDetailsModel.find({
      machineId: { $in: subLocationData.select_machine },
    }).select("machineId sub_location_id");

    if (alreadyAllocated.length > 0) {
      const allocatedIds = alreadyAllocated.map(m => m.machineId).join(", ");
      throw new Error(
        `The following machines are already allocated to another sub-location: ${allocatedIds}`
      );
    }

    const newSubLocation = new SubLocationModel({
      ...subLocationData,
      location_id: locationId,
    });
    await newSubLocation.save();

    // Create a MachineDetails record for each machineId
    const machinePromises = subLocationData.select_machine.map(async (machineId: string) => {
      const machineDetail = new MachineDetailsModel({
        machineId, // ← machineId field (not machine_name)
        sub_location_id: newSubLocation._id,
        installed_status: "not_installed",
        status: "active",
        machine_image: [],
      });
      return await machineDetail.save();
    });

    const machines = await Promise.all(machinePromises);

    await this.createAuditLog(
      new Types.ObjectId(locationId),
      "ADD_SUB_LOCATION",
      null,
      null,
      {
        sub_location_added: {
          old: null,
          new: {
            campus: newSubLocation.campus,
            tower: newSubLocation.tower,
            floor: newSubLocation.floor,
            machines_count: subLocationData.select_machine.length,
            machineIds: subLocationData.select_machine,
          },
        },
      },
      auditParams
    );

    return { subLocation: newSubLocation, machines };
  }

  static async getSubLocationsByLocationId(locationId: string): Promise<ISubLocation[]> {
    this.validateObjectId(locationId);
    return await SubLocationModel.find({ location_id: locationId });
  }

  /**
   * Updates a sub-location.
   * If select_machine changes, validates new machineIds, creates MachineDetails
   * for additions and removes MachineDetails for removals.
   */
  static async updateSubLocation(
    subLocationId: string,
    updateData: {
      campus?: string;
      tower?: string;
      floor?: string;
      select_machine?: string[];
    },
    auditParams?: AuditLogParams
  ): Promise<{
    subLocation: ISubLocation;
    addedMachines: string[];
    removedMachines: string[];
  } | null> {
    this.validateObjectId(subLocationId);

    const existing = await SubLocationModel.findById(subLocationId);
    if (!existing) throw new Error("Sub-location not found");

    const oldData = existing.toObject();
    const oldMachines = [...(existing.select_machine || [])];

    if (updateData.select_machine !== undefined) {
      if (!Array.isArray(updateData.select_machine)) {
        throw new Error("select_machine must be an array");
      }
      if (updateData.select_machine.length === 0) {
        throw new Error("select_machine cannot be empty");
      }
      // ✅ Validate new machineIds exist in Machine collection
      await this.validateMachineIds(updateData.select_machine);
    }

    const updated = await SubLocationModel.findByIdAndUpdate(subLocationId, updateData, {
      new: true,
      runValidators: true,
    });
    if (!updated) throw new Error("Failed to update sub-location");

    const newMachines = [...(updated.select_machine || [])];
    const addedMachines = newMachines.filter(id => !oldMachines.includes(id));
    const removedMachines = oldMachines.filter(id => !newMachines.includes(id));

    // Create MachineDetails for newly added machineIds
    if (addedMachines.length > 0) {
      await Promise.all(
        addedMachines.map(machineId =>
          new MachineDetailsModel({
            machineId, // ← machineId field
            sub_location_id: subLocationId,
            installed_status: "not_installed",
            status: "active",
            machine_image: [],
          }).save()
        )
      );
    }

    // Delete MachineDetails for removed machineIds
    if (removedMachines.length > 0) {
      await MachineDetailsModel.deleteMany({
        sub_location_id: subLocationId,
        machineId: { $in: removedMachines }, // ← machineId field
      });
    }

    // Build audit changes
    const changes: Record<string, { old: any; new: any }> = {};
    if (updateData.campus && updateData.campus !== oldData.campus)
      changes["campus"] = { old: oldData.campus, new: updateData.campus };
    if (updateData.tower && updateData.tower !== oldData.tower)
      changes["tower"] = { old: oldData.tower, new: updateData.tower };
    if (updateData.floor && updateData.floor !== oldData.floor)
      changes["floor"] = { old: oldData.floor, new: updateData.floor };
    if (updateData.select_machine)
      changes["select_machine"] = { old: oldMachines, new: newMachines };

    if (Object.keys(changes).length > 0) {
      await this.createAuditLog(updated.location_id, "UPDATE", null, null, changes, auditParams);
    }

    return { subLocation: updated, addedMachines, removedMachines };
  }

  static async deleteSubLocation(
    subLocationId: string,
    auditParams?: AuditLogParams
  ): Promise<void> {
    this.validateObjectId(subLocationId);

    const subLocation = await SubLocationModel.findById(subLocationId);
    if (!subLocation) throw new Error("Sub-location not found");

    const locationId = subLocation.location_id;
    const machines = await MachineDetailsModel.find({
      sub_location_id: subLocationId,
    });
    const machineIds = machines.map(m => m._id);

    await this.deleteMachineImagesFromMachines(machineIds);
    await MachineDetailsModel.deleteMany({ _id: { $in: machineIds } });
    await SubLocationModel.findByIdAndDelete(subLocationId);

    await this.createAuditLog(
      locationId,
      "REMOVE_MACHINE",
      null,
      null,
      {
        removed_sub_location: {
          old: {
            campus: subLocation.campus,
            tower: subLocation.tower,
            floor: subLocation.floor,
            machines_count: machines.length,
          },
          new: null,
        },
      },
      auditParams
    );
  }

  // ── MachineDetails CRUD ─────────────────────────────────────────────────────

  static async getMachineDetailsBySubLocationId(subLocationId: string): Promise<IMachineDetails[]> {
    this.validateObjectId(subLocationId);
    return await MachineDetailsModel.find({ sub_location_id: subLocationId });
  }

  static async updateMachineDetails(
    machineDetailsId: string,
    updateData: UpdateMachineDetailsDto,
    auditParams?: AuditLogParams
  ): Promise<IMachineDetails | null> {
    this.validateObjectId(machineDetailsId);

    if (
      updateData.installed_status &&
      !["installed", "not_installed"].includes(updateData.installed_status)
    ) {
      throw new Error("installed_status must be either 'installed' or 'not_installed'");
    }
    if (updateData.status && !["active", "inactive"].includes(updateData.status)) {
      throw new Error("status must be either 'active' or 'inactive'");
    }

    const current = await MachineDetailsModel.findById(machineDetailsId);
    if (!current) return null;

    const oldData = current.toObject();
    const updated = await MachineDetailsModel.findByIdAndUpdate(machineDetailsId, updateData, {
      new: true,
    });
    if (!updated) throw new Error("Failed to update machine details");

    const subLocation = await SubLocationModel.findById(updated.sub_location_id);
    const locationId = subLocation?.location_id;

    const changes: Record<string, { old: any; new: any }> = {};
    if (updateData.installed_status && updateData.installed_status !== oldData.installed_status) {
      changes["machine.installed_status"] = {
        old: oldData.installed_status,
        new: updateData.installed_status,
      };
    }
    if (updateData.status && updateData.status !== oldData.status) {
      changes["machine.status"] = {
        old: oldData.status,
        new: updateData.status,
      };
    }

    if (Object.keys(changes).length > 0 && locationId) {
      await this.createAuditLog(locationId, "UPDATE", null, null, changes, auditParams);
    }

    return updated;
  }

  static async deleteMachine(
    machineDetailsId: string,
    auditParams?: AuditLogParams
  ): Promise<void> {
    this.validateObjectId(machineDetailsId);

    const machineDetails = await MachineDetailsModel.findById(machineDetailsId).populate({
      path: "sub_location_id",
      populate: { path: "location_id" },
    });
    if (!machineDetails) throw new Error("Machine not found");

    const locationId = (machineDetails.sub_location_id as any)?.location_id?._id;
    const machineId = machineDetails.machineId; // ← machineId field

    if (machineDetails.machine_image?.length > 0) {
      const uploadService = new ImageUploadService();
      for (const image of machineDetails.machine_image) {
        try {
          await uploadService.deleteFromCloudinary(image.cloudinary_public_id);
        } catch (error) {
          logger.error(`Failed to delete image ${image.cloudinary_public_id}:`, error);
        }
      }
    }

    await MachineDetailsModel.findByIdAndDelete(machineDetailsId);

    if (locationId) {
      await this.createAuditLog(
        locationId,
        "REMOVE_MACHINE",
        null,
        null,
        {
          removed_machine: {
            old: { machineId, machine_details_id: machineDetailsId }, // ← machineId field
            new: null,
          },
        },
        auditParams
      );
    }
  }

  static async toggleMachineStatus(
    machineDetailsId: string,
    auditParams?: AuditLogParams
  ): Promise<IMachineDetails | null> {
    this.validateObjectId(machineDetailsId);

    const machineDetails = await MachineDetailsModel.findById(machineDetailsId);
    if (!machineDetails) throw new Error("Machine not found");

    const oldStatus = machineDetails.status;
    const newStatus = oldStatus === "active" ? "inactive" : "active";

    const updated = await MachineDetailsModel.findByIdAndUpdate(
      machineDetailsId,
      { status: newStatus },
      { new: true }
    );

    const subLocation = await SubLocationModel.findById(machineDetails.sub_location_id);
    const locationId = subLocation?.location_id;

    if (locationId) {
      await this.createAuditLog(
        locationId,
        "UPDATE",
        null,
        null,
        { "machine.status": { old: oldStatus, new: newStatus } },
        auditParams
      );
    }

    return updated;
  }

  static async toggleMachineInstalledStatus(
    machineDetailsId: string,
    auditParams?: AuditLogParams
  ): Promise<IMachineDetails | null> {
    this.validateObjectId(machineDetailsId);

    const machineDetails = await MachineDetailsModel.findById(machineDetailsId);
    if (!machineDetails) throw new Error("Machine not found");

    const oldStatus = machineDetails.installed_status;
    const newStatus = oldStatus === "installed" ? "not_installed" : "installed";

    const updated = await MachineDetailsModel.findByIdAndUpdate(
      machineDetailsId,
      { installed_status: newStatus },
      { new: true }
    );

    const subLocation = await SubLocationModel.findById(machineDetails.sub_location_id);
    const locationId = subLocation?.location_id;

    if (locationId) {
      await this.createAuditLog(
        locationId,
        "UPDATE",
        null,
        null,
        { "machine.installed_status": { old: oldStatus, new: newStatus } },
        auditParams
      );
    }

    return updated;
  }

  // ── Machine Images ──────────────────────────────────────────────────────────

  static async addMachineImages(
    machineDetailsId: string,
    images: IMachineImageData[],
    auditParams?: AuditLogParams
  ): Promise<IMachineDetails | null> {
    this.validateObjectId(machineDetailsId);

    const machineDetails = await MachineDetailsModel.findById(machineDetailsId);
    if (!machineDetails) return null;

    await this.validateAndProcessMachineImages(images);

    const oldCount = machineDetails.machine_image.length;
    machineDetails.machine_image.push(...images);
    const updated = await machineDetails.save();

    const subLocation = await SubLocationModel.findById(machineDetails.sub_location_id);
    const locationId = subLocation?.location_id;

    if (locationId) {
      await this.createAuditLog(
        locationId,
        "UPDATE",
        null,
        null,
        {
          machine_images: {
            old: oldCount,
            new: {
              count: updated.machine_image.length,
              added: images.map(img => img.image_name),
            },
          },
        },
        auditParams
      );
    }

    return updated;
  }

  static async removeMachineImage(
    machineDetailsId: string,
    imageIndex: number,
    auditParams?: AuditLogParams
  ): Promise<IMachineDetails | null> {
    this.validateObjectId(machineDetailsId);

    const machineDetails = await MachineDetailsModel.findById(machineDetailsId);
    if (!machineDetails) return null;
    if (machineDetails.machine_image.length <= imageIndex) {
      throw new Error("Image not found");
    }

    const imageToRemove = machineDetails.machine_image[imageIndex];
    const oldCount = machineDetails.machine_image.length;

    machineDetails.machine_image.splice(imageIndex, 1);
    const updated = await machineDetails.save();

    const uploadService = new ImageUploadService();
    try {
      await uploadService.deleteFromCloudinary(imageToRemove.cloudinary_public_id);
    } catch (error) {
      logger.error("Failed to delete image from cloud storage:", error);
    }

    const subLocation = await SubLocationModel.findById(machineDetails.sub_location_id);
    const locationId = subLocation?.location_id;

    if (locationId) {
      await this.createAuditLog(
        locationId,
        "UPDATE",
        null,
        null,
        {
          removed_image: { old: imageToRemove.image_name, new: null },
          remaining_images: { old: oldCount, new: updated.machine_image.length },
        },
        auditParams
      );
    }

    return updated;
  }

  static async updateMachineImages(
    machineDetailsId: string,
    files: Express.Multer.File[],
    auditParams?: AuditLogParams
  ): Promise<IMachineDetails> {
    this.validateObjectId(machineDetailsId);

    if (!files || files.length === 0) {
      throw new Error("No images provided for update");
    }

    const current = await MachineDetailsModel.findById(machineDetailsId);
    if (!current) throw new Error("Machine details not found");

    const oldImages = [...current.machine_image];
    const oldPublicIds = oldImages.map(img => img.cloudinary_public_id);

    const uploadService = new ImageUploadService();
    const processedFiles = await uploadService.uploadMultipleFiles(
      files,
      "machine_images",
      "areaMachine"
    );

    if (oldPublicIds.length > 0) {
      try {
        await uploadService.deleteMultipleFiles(oldPublicIds);
        logger.info(`Deleted ${oldPublicIds.length} old images for machine ${machineDetailsId}`);
      } catch (err) {
        logger.error(`Failed to delete old images for machine ${machineDetailsId}:`, err);
      }
    }

    const updated = await MachineDetailsModel.findByIdAndUpdate(
      machineDetailsId,
      { $set: { machine_image: processedFiles } },
      { new: true, runValidators: true }
    );
    if (!updated) throw new Error("Failed to update machine images");

    const subLocation = await SubLocationModel.findById(updated.sub_location_id);
    const locationId = subLocation?.location_id;

    if (locationId && auditParams) {
      await this.createAuditLog(
        locationId,
        "UPDATE",
        null,
        null,
        {
          machine_images: {
            old: { count: oldImages.length, names: oldImages.map(i => i.image_name) },
            new: {
              count: processedFiles.length,
              names: processedFiles.map((f: any) => f.image_name),
            },
          },
        },
        auditParams
      );
    }

    return updated;
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  /**
   * Searches MachineDetails by machineId (supports partial match).
   */
  static async searchMachines(searchTerm: string): Promise<IMachineDetails[]> {
    return await MachineDetailsModel.find({
      machineId: { $regex: searchTerm, $options: "i" }, // ← machineId field
    }).populate({
      path: "sub_location_id",
      populate: { path: "location_id" },
    });
  }

  // ── Filter options ──────────────────────────────────────────────────────────

  static async getFilterOptions(): Promise<{
    states: string[];
    districts: string[];
    campuses: string[];
    towers: string[];
    floors: string[];
  }> {
    const [states, districts, campuses, towers, floors] = await Promise.all([
      LocationModel.distinct("state") as Promise<string[]>,
      LocationModel.distinct("district") as Promise<string[]>,
      SubLocationModel.distinct("campus") as Promise<string[]>,
      SubLocationModel.distinct("tower") as Promise<string[]>,
      SubLocationModel.distinct("floor") as Promise<string[]>,
    ]);
    return {
      states: states.filter(Boolean).sort(),
      districts: districts.filter(Boolean).sort(),
      campuses: campuses.filter(Boolean).sort(),
      towers: towers.filter(Boolean).sort(),
      floors: floors.filter(Boolean).sort(),
    };
  }

  // ── Dashboard ───────────────────────────────────────────────────────────────

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

    const filter = this.buildDashboardFilter({ status, state, district, address, search });
    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, Math.min(limit, 100));
    const skip = (pageNum - 1) * limitNum;
    const sort = this.buildSort(sortBy, sortOrder);

    const [locations, totalItems, statistics, filterOptions] = await Promise.all([
      LocationModel.find(filter).sort(sort).skip(skip).limit(limitNum),
      LocationModel.countDocuments(filter),
      this.getDashboardStatistics(),
      this.getFilterOptions(),
    ]);

    let filteredLocations: any[] = locations;
    if (campus || tower || floor) {
      const results = await Promise.all(
        locations.map(async location => {
          const subFilter: any = { location_id: location._id };
          if (campus) subFilter.campus = { $regex: campus, $options: "i" };
          if (tower) subFilter.tower = { $regex: tower, $options: "i" };
          if (floor) subFilter.floor = { $regex: floor, $options: "i" };
          const subs = await SubLocationModel.find(subFilter);
          return subs.length > 0 ? location : null;
        })
      );
      filteredLocations = results.filter(Boolean);
    }

    return {
      locations: filteredLocations,
      statistics,
      filterOptions,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalItems / limitNum),
        totalItems,
        itemsPerPage: limitNum,
      },
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
      search: params.search,
    });

    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;
    const sort = this.buildSort(params.sortBy || "area_name", params.sortOrder || "asc");

    const [locations, total] = await Promise.all([
      LocationModel.find(filter).sort(sort).skip(skip).limit(limit),
      LocationModel.countDocuments(filter),
    ]);

    const tableData = await Promise.all(
      locations.map(async location => {
        const subLocations = await SubLocationModel.find({
          location_id: location._id,
        });
        let totalMachines = 0;
        let installedMachines = 0;
        let notInstalledMachines = 0;

        for (const subLoc of subLocations) {
          const machines = await MachineDetailsModel.find({
            sub_location_id: subLoc._id,
          });
          totalMachines += machines.length;
          installedMachines += machines.filter(m => m.installed_status === "installed").length;
          notInstalledMachines += machines.filter(
            m => m.installed_status === "not_installed"
          ).length;
        }

        const uniqueCampuses = [...new Set(subLocations.map(sl => sl.campus).filter(Boolean))];

        return {
          id: location._id,
          area_name: location.area_name,
          state: location.state,
          district: location.district,
          pincode: location.pincode,
          address: location.address,
          status: location.status,
          sub_locations_count: subLocations.length,
          total_machines: totalMachines,
          installed_machines: installedMachines,
          not_installed_machines: notInstalledMachines,
          campuses: uniqueCampuses.join(", "),
        };
      })
    );

    return { data: tableData, total };
  }

  private static async getDashboardStatistics(): Promise<DashboardData["statistics"]> {
    const [
      totalLocations,
      activeLocations,
      inactiveLocations,
      stateAgg,
      districtAgg,
      campusAgg,
      machineStats,
    ] = await Promise.all([
      LocationModel.countDocuments(),
      LocationModel.countDocuments({ status: "active" }),
      LocationModel.countDocuments({ status: "inactive" }),
      LocationModel.aggregate([{ $group: { _id: "$state", count: { $sum: 1 } } }]),
      LocationModel.aggregate([{ $group: { _id: "$district", count: { $sum: 1 } } }]),
      SubLocationModel.aggregate([{ $group: { _id: "$campus", count: { $sum: 1 } } }]),
      this.getMachineStatistics(),
    ]);

    const areasByState: Record<string, number> = {};
    const areasByDistrict: Record<string, number> = {};
    const areasByCampus: Record<string, number> = {};

    stateAgg.forEach(i => (areasByState[i._id || "Unknown"] = i.count));
    districtAgg.forEach(i => (areasByDistrict[i._id || "Unknown"] = i.count));
    campusAgg.forEach(i => (areasByCampus[i._id || "Unknown"] = i.count));

    return {
      totalLocations,
      activeLocations,
      inactiveLocations,
      totalMachines: machineStats.totalMachines,
      installedMachines: machineStats.installedMachines,
      notInstalledMachines: machineStats.notInstalledMachines,
      activeMachines: machineStats.activeMachines,
      inactiveMachines: machineStats.inactiveMachines,
      areasByState,
      areasByDistrict,
      areasByStatus: { active: activeLocations, inactive: inactiveLocations },
      areasByCampus,
    };
  }

  private static async getMachineStatistics(): Promise<{
    totalMachines: number;
    installedMachines: number;
    notInstalledMachines: number;
    activeMachines: number;
    inactiveMachines: number;
  }> {
    const result = await MachineDetailsModel.aggregate([
      {
        $group: {
          _id: null,
          total: { $sum: 1 },
          installed: {
            $sum: { $cond: [{ $eq: ["$installed_status", "installed"] }, 1, 0] },
          },
          active: {
            $sum: { $cond: [{ $eq: ["$status", "active"] }, 1, 0] },
          },
        },
      },
    ]);

    const stats = result[0] || { total: 0, installed: 0, active: 0 };
    return {
      totalMachines: stats.total,
      installedMachines: stats.installed,
      notInstalledMachines: stats.total - stats.installed,
      activeMachines: stats.active,
      inactiveMachines: stats.total - stats.active,
    };
  }

  // ── Export ──────────────────────────────────────────────────────────────────

  static async exportSubLocationsByLocationId(
    locationId: string,
    format: string = "csv"
  ): Promise<{ data: any; filename: string; contentType: string }> {
    this.validateObjectId(locationId);

    const location = await LocationModel.findById(locationId);
    if (!location) throw new Error("Location not found");

    const subLocations = await SubLocationModel.find({ location_id: locationId });
    if (subLocations.length === 0) {
      throw new Error("No sub-locations found for this location");
    }

    const enriched = await Promise.all(
      subLocations.map(async subLoc => {
        const machines = await MachineDetailsModel.find({
          sub_location_id: subLoc._id,
        });
        return {
          ...subLoc.toObject(),
          machines: machines.map(m => ({
            id: m._id,
            machineId: m.machineId, // ← machineId field
            installed_status: m.installed_status,
            status: m.status,
            images_count: m.machine_image.length,
            images: m.machine_image.map(img => ({
              name: img.image_name,
              url: img.file_url,
              uploaded_at: img.uploaded_at,
            })),
          })),
        };
      })
    );

    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    const locationName = location.area_name.replace(/[^a-zA-Z0-9]/g, "_");
    const filename = `sublocations-${locationName}-${timestamp}`;

    if (format === "csv") {
      return {
        data: this.convertSubLocationsToCSV(enriched, location),
        filename: `${filename}.csv`,
        contentType: "text/csv",
      };
    } else if (format === "json") {
      return {
        data: {
          location: {
            id: location._id,
            name: location.area_name,
            state: location.state,
            district: location.district,
          },
          sub_locations: enriched,
          total: enriched.length,
          export_date: new Date().toISOString(),
        },
        filename: `${filename}.json`,
        contentType: "application/json",
      };
    } else {
      throw new Error('Unsupported format. Use "csv" or "json"');
    }
  }

  private static convertSubLocationsToCSV(subLocations: any[], location: ILocation): string {
    if (!subLocations || subLocations.length === 0) {
      return "No sub-locations available for export";
    }
    try {
      const headers = [
        "Sub-location ID",
        "Campus",
        "Tower",
        "Floor",
        "Total Machines",
        "Installed Machines",
        "Not Installed Machines",
        "Active Machines",
        "Inactive Machines",
        "Machine IDs", // ← renamed header
        "Created At",
        "Updated At",
      ];

      let csv = "\ufeff" + headers.join(",") + "\n";

      subLocations.forEach(subLoc => {
        const obj = subLoc.toObject ? subLoc.toObject() : subLoc;
        const installed =
          obj.machines?.filter((m: any) => m.installed_status === "installed").length || 0;
        const notInstalled =
          obj.machines?.filter((m: any) => m.installed_status === "not_installed").length || 0;
        const active = obj.machines?.filter((m: any) => m.status === "active").length || 0;
        const inactive = obj.machines?.filter((m: any) => m.status === "inactive").length || 0;
        const machineIds = obj.machines?.map((m: any) => m.machineId).join("; ") || ""; // ← machineId

        csv +=
          [
            obj._id?.toString() || "",
            `"${(obj.campus || "").replace(/"/g, '""')}"`,
            `"${(obj.tower || "").replace(/"/g, '""')}"`,
            `"${(obj.floor || "").replace(/"/g, '""')}"`,
            obj.machines?.length || 0,
            installed,
            notInstalled,
            active,
            inactive,
            `"${machineIds.replace(/"/g, '""')}"`,
            obj.createdAt ? new Date(obj.createdAt).toISOString() : "",
            obj.updatedAt ? new Date(obj.updatedAt).toISOString() : "",
          ].join(",") + "\n";
      });

      csv += "\n\nExport Summary\n";
      csv += `Location,"${location.area_name}"\n`;
      csv += `State,"${location.state}"\n`;
      csv += `District,"${location.district}"\n`;
      csv += `Total Sub-locations,${subLocations.length}\n`;
      csv += `Total Machines,${subLocations.reduce((s, sl) => s + (sl.machines?.length || 0), 0)}\n`;
      csv += `Export Date,${new Date().toISOString()}\n`;

      return csv;
    } catch (error) {
      logger.error("Error converting sub-locations to CSV:", error);
      return "Error generating sub-locations CSV";
    }
  }
}
