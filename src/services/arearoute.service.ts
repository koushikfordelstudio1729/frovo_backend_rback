import mongoose, { Types } from "mongoose";
import { logger } from "../utils/logger.util";
import { ImageUploadService } from "./areaFileUpload.service";
import { IMachineImageData } from "../models/AreaRoute.model";

// Import the new models
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
  select_machine: string[]; // Array of machine names
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

export class AreaService {
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
      HistoryAreaModel.countDocuments({ location_id: new Types.ObjectId(locationId) }),
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

  // CREATE LOCATION
  static async createLocation(
    locationData: CreateLocationDto,
    auditParams?: AuditLogParams
  ): Promise<ILocation> {
    try {
      // Check for duplicate area names
      const existingLocation = await LocationModel.findOne({
        area_name: locationData.area_name,
      });

      if (existingLocation) {
        throw new Error(`Location with name "${locationData.area_name}" already exists`);
      }

      // Validate coordinates if provided
      if (locationData.latitude !== undefined || locationData.longitude !== undefined) {
        this.validateCoordinates(locationData.latitude, locationData.longitude);
      }

      const newLocation = new LocationModel(locationData);
      const savedLocation = await newLocation.save();

      await this.createAuditLog(
        savedLocation._id,
        "CREATE",
        null,
        savedLocation.toObject(),
        undefined,
        auditParams
      );

      return savedLocation;
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        const errorMessages = Object.values(error.errors).map(err => err.message);
        throw new Error(`Validation failed: ${errorMessages.join(", ")}`);
      }
      throw error;
    }
  }

  // CREATE SUB-LOCATION
  static async createSubLocation(
    locationId: string,
    subLocationData: CreateSubLocationDto,
    auditParams?: AuditLogParams
  ): Promise<{ subLocation: ISubLocation; machines: IMachineDetails[] }> {
    this.validateObjectId(locationId);

    // Check if location exists
    const location = await LocationModel.findById(locationId);
    if (!location) {
      throw new Error("Location not found");
    }

    // Validate required fields
    if (!subLocationData.campus || !subLocationData.tower || !subLocationData.floor) {
      throw new Error("Campus, tower, and floor are required");
    }

    // Validate select_machine array
    if (
      !Array.isArray(subLocationData.select_machine) ||
      subLocationData.select_machine.length === 0
    ) {
      throw new Error("At least one machine must be selected");
    }

    // Create sub-location
    const newSubLocation = new SubLocationModel({
      ...subLocationData,
      location_id: locationId,
    });
    await newSubLocation.save();

    // Create MachineDetails for each selected machine
    const machinePromises = subLocationData.select_machine.map(async (machineName: string) => {
      const machineDetail = new MachineDetailsModel({
        machine_name: machineName,
        sub_location_id: newSubLocation._id,
        installed_status: "not_installed",
        status: "active",
        machine_image: [],
      });
      return await machineDetail.save();
    });

    const machines = await Promise.all(machinePromises);

    // Create audit log
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
            machines: subLocationData.select_machine,
          },
        },
      },
      auditParams
    );

    return { subLocation: newSubLocation, machines };
  }

  static async getLocationById(id: string): Promise<ILocation | null> {
    this.validateObjectId(id);
    return await LocationModel.findById(id);
  }

  // GET LOCATION WITH SUB-LOCATIONS AND MACHINES
  static async getLocationDetails(id: string): Promise<any | null> {
    this.validateObjectId(id);

    const location = await LocationModel.findById(id);
    if (!location) {
      return null;
    }

    // Get sub-locations
    const subLocations = await SubLocationModel.find({ location_id: id });

    // Get machine details for each sub-location
    const subLocationsWithMachines = await Promise.all(
      subLocations.map(async subLoc => {
        const machines = await MachineDetailsModel.find({
          sub_location_id: subLoc._id,
        });
        return {
          ...subLoc.toObject(),
          machines,
        };
      })
    );

    // Calculate summary
    const totalMachines = subLocationsWithMachines.reduce(
      (sum, subLoc) => sum + subLoc.machines.length,
      0
    );
    const installedMachines = subLocationsWithMachines.reduce(
      (sum, subLoc) =>
        sum + subLoc.machines.filter((m: any) => m.installed_status === "installed").length,
      0
    );
    const activeMachines = subLocationsWithMachines.reduce(
      (sum, subLoc) => sum + subLoc.machines.filter((m: any) => m.status === "active").length,
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

  // UPDATE LOCATION
  static async updateLocation(
    id: string,
    updateData: UpdateLocationDto,
    auditParams?: AuditLogParams
  ): Promise<ILocation | null> {
    this.validateObjectId(id);

    const existingLocation = await LocationModel.findById(id);
    if (!existingLocation) {
      throw new Error("Location not found");
    }

    // Check for duplicate area name if changing
    if (updateData.area_name && updateData.area_name !== existingLocation.area_name) {
      const duplicateLocation = await LocationModel.findOne({
        area_name: updateData.area_name,
        _id: { $ne: id },
      });

      if (duplicateLocation) {
        throw new Error("Location with this name already exists");
      }
    }

    // Validate coordinates if provided
    if (updateData.latitude !== undefined || updateData.longitude !== undefined) {
      this.validateCoordinates(updateData.latitude, updateData.longitude);
    }

    const oldData = existingLocation.toObject();
    const updatedLocation = await LocationModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    if (updatedLocation) {
      const newData = updatedLocation.toObject();
      const changes = this.findChanges(oldData, newData);

      if (Object.keys(changes).length > 0) {
        await this.createAuditLog(
          updatedLocation._id,
          "UPDATE",
          oldData,
          newData,
          changes,
          auditParams
        );
      }
    }

    return updatedLocation;
  }

  // DELETE LOCATION (cascading delete)
  static async deleteLocation(id: string, auditParams?: AuditLogParams): Promise<ILocation | null> {
    this.validateObjectId(id);

    const existingLocation = await LocationModel.findById(id);
    if (!existingLocation) {
      return null;
    }

    // Get all sub-locations for this location
    const subLocations = await SubLocationModel.find({ location_id: id });

    // Get all machine details for these sub-locations
    const machineDetailsIds: Types.ObjectId[] = [];
    for (const subLoc of subLocations) {
      const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });
      machineDetailsIds.push(...machines.map(m => m._id));
    }

    // Delete machine images from cloud storage
    await this.deleteMachineImagesFromMachines(machineDetailsIds);

    // Delete machine details
    await MachineDetailsModel.deleteMany({ _id: { $in: machineDetailsIds } });

    // Delete sub-locations
    await SubLocationModel.deleteMany({ location_id: id });

    // Delete location
    const deletedLocation = await LocationModel.findByIdAndDelete(id);

    if (deletedLocation) {
      await this.createAuditLog(
        new Types.ObjectId(id),
        "DELETE",
        existingLocation.toObject(),
        null,
        undefined,
        auditParams
      );
    }

    return deletedLocation;
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

    const existingLocation = await LocationModel.findById(id);
    if (!existingLocation) {
      return null;
    }

    const updatedLocation = await LocationModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );

    if (updatedLocation && existingLocation.status !== status) {
      const changes = {
        status: { old: existingLocation.status, new: status },
      };

      await this.createAuditLog(
        updatedLocation._id,
        "STATUS_CHANGE",
        { status: existingLocation.status },
        { status },
        changes,
        auditParams
      );
    }

    return updatedLocation;
  }

  static async checkLocationExists(locationName: string, excludeId?: string): Promise<boolean> {
    const filter: any = { area_name: locationName };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const count = await LocationModel.countDocuments(filter);
    return count > 0;
  }

  static async toggleLocationStatus(
    id: string,
    auditParams?: AuditLogParams
  ): Promise<ILocation | null> {
    this.validateObjectId(id);

    const location = await this.getLocationById(id);
    if (!location) {
      throw new Error("Location not found");
    }

    const newStatus = location.status === "active" ? "inactive" : "active";
    return await this.updateLocationStatus(id, newStatus, auditParams);
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

  // ADD MACHINE IMAGES TO MACHINE DETAILS
  static async addMachineImages(
    machineDetailsId: string,
    images: IMachineImageData[],
    auditParams?: AuditLogParams
  ): Promise<IMachineDetails | null> {
    this.validateObjectId(machineDetailsId);

    const machineDetails = await MachineDetailsModel.findById(machineDetailsId).populate({
      path: "sub_location_id",
      populate: {
        path: "location_id",
      },
    });

    if (!machineDetails) {
      return null;
    }

    // Validate images
    await this.validateAndProcessMachineImages(images);

    const oldImages = [...machineDetails.machine_image];

    // Add new images
    machineDetails.machine_image.push(...images);
    const updatedMachine = await machineDetails.save();

    // Get location ID for audit log
    const subLocation = await SubLocationModel.findById(machineDetails.sub_location_id);
    const locationId = subLocation?.location_id;

    if (locationId) {
      const changes = {
        machine_images: {
          old: oldImages.length,
          new: updatedMachine.machine_image.length,
          added: images.map(img => img.image_name),
        },
      };

      await this.createAuditLog(locationId, "UPDATE", null, null, changes, auditParams);
    }

    return updatedMachine;
  }

  // REMOVE MACHINE IMAGE
  static async removeMachineImage(
    machineDetailsId: string,
    imageIndex: number,
    auditParams?: AuditLogParams
  ): Promise<IMachineDetails | null> {
    this.validateObjectId(machineDetailsId);

    const machineDetails = await MachineDetailsModel.findById(machineDetailsId).populate({
      path: "sub_location_id",
      populate: {
        path: "location_id",
      },
    });

    if (!machineDetails) {
      return null;
    }

    if (machineDetails.machine_image.length <= imageIndex) {
      throw new Error("Image not found");
    }

    const imageToRemove = machineDetails.machine_image[imageIndex];
    const oldImages = [...machineDetails.machine_image];

    // Remove the image
    machineDetails.machine_image.splice(imageIndex, 1);
    const updatedMachine = await machineDetails.save();

    // Delete from cloud storage
    const uploadService = new ImageUploadService();
    try {
      await uploadService.deleteFromCloudinary(imageToRemove.cloudinary_public_id);
    } catch (error) {
      logger.error("Failed to delete image from cloud storage:", error);
    }

    // Get location ID for audit log
    const subLocation = await SubLocationModel.findById(machineDetails.sub_location_id);
    const locationId = subLocation?.location_id;

    if (locationId) {
      const changes = {
        removed_image: {
          old: imageToRemove.image_name,
          new: null,
        },
        remaining_images: {
          old: oldImages.length,
          new: updatedMachine.machine_image.length,
        },
      };

      await this.createAuditLog(locationId, "UPDATE", null, null, changes, auditParams);
    }

    return updatedMachine;
  }
  // UPDATE SUB-LOCATION
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

    const existingSubLocation = await SubLocationModel.findById(subLocationId);
    if (!existingSubLocation) {
      throw new Error("Sub-location not found");
    }

    const oldData = { ...existingSubLocation.toObject() };
    const oldMachines = [...(existingSubLocation.select_machine || [])];

    // Validate if select_machine is being updated
    if (updateData.select_machine && !Array.isArray(updateData.select_machine)) {
      throw new Error("select_machine must be an array");
    }

    // Update sub-location
    const updatedSubLocation = await SubLocationModel.findByIdAndUpdate(subLocationId, updateData, {
      new: true,
      runValidators: true,
    });

    if (!updatedSubLocation) {
      throw new Error("Failed to update sub-location");
    }

    const newMachines = [...(updatedSubLocation.select_machine || [])];

    // Calculate added and removed machines
    const addedMachines = newMachines.filter(machine => !oldMachines.includes(machine));
    const removedMachines = oldMachines.filter(machine => !newMachines.includes(machine));

    // If machines were added, create MachineDetails for them
    if (addedMachines.length > 0) {
      const machinePromises = addedMachines.map(async (machineName: string) => {
        const machineDetail = new MachineDetailsModel({
          machine_name: machineName,
          sub_location_id: subLocationId,
          installed_status: "not_installed",
          status: "active",
          machine_image: [],
        });
        return await machineDetail.save();
      });
      await Promise.all(machinePromises);
    }

    // If machines were removed, delete their MachineDetails
    if (removedMachines.length > 0) {
      await MachineDetailsModel.deleteMany({
        sub_location_id: subLocationId,
        machine_name: { $in: removedMachines },
      });
    }

    // Create audit log if there are changes
    const changes: Record<string, { old: any; new: any }> = {};

    if (updateData.campus && updateData.campus !== oldData.campus) {
      changes["campus"] = { old: oldData.campus, new: updateData.campus };
    }

    if (updateData.tower && updateData.tower !== oldData.tower) {
      changes["tower"] = { old: oldData.tower, new: updateData.tower };
    }

    if (updateData.floor && updateData.floor !== oldData.floor) {
      changes["floor"] = { old: oldData.floor, new: updateData.floor };
    }

    if (updateData.select_machine) {
      changes["select_machine"] = {
        old: oldMachines,
        new: newMachines,
      };
    }

    if (Object.keys(changes).length > 0) {
      const locationId = updatedSubLocation.location_id;
      await this.createAuditLog(locationId, "UPDATE", null, null, changes, auditParams);
    }

    return {
      subLocation: updatedSubLocation,
      addedMachines,
      removedMachines,
    };
  }

  // EXPORT SUB-LOCATIONS BY LOCATION ID
  static async exportSubLocationsByLocationId(
    locationId: string,
    format: string = "csv"
  ): Promise<{ data: any; filename: string; contentType: string }> {
    this.validateObjectId(locationId);

    const location = await LocationModel.findById(locationId);
    if (!location) {
      throw new Error("Location not found");
    }

    const subLocations = await SubLocationModel.find({ location_id: locationId });

    if (subLocations.length === 0) {
      throw new Error("No sub-locations found for this location");
    }

    // Get machine details for each sub-location
    const enrichedSubLocations = await Promise.all(
      subLocations.map(async subLoc => {
        const machines = await MachineDetailsModel.find({
          sub_location_id: subLoc._id,
        });

        return {
          ...subLoc.toObject(),
          machines: machines.map(m => ({
            id: m._id,
            name: m.machine_name,
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
      const csv = this.convertSubLocationsToCSV(enrichedSubLocations, location);
      return {
        data: csv,
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
          sub_locations: enrichedSubLocations,
          total: enrichedSubLocations.length,
          export_date: new Date().toISOString(),
        },
        filename: `${filename}.json`,
        contentType: "application/json",
      };
    } else {
      throw new Error('Unsupported format. Use "csv" or "json"');
    }
  }

  // GET AUDIT LOGS BY SUB-LOCATION ID
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

    // Get sub-location to find its location
    const subLocation = await SubLocationModel.findById(subLocationId);
    if (!subLocation) {
      throw new Error("Sub-location not found");
    }

    const locationId = subLocation.location_id;

    // Get all audit logs for the location
    const allLogs = await HistoryAreaModel.find({ location_id: locationId }).sort({
      timestamp: -1,
    });

    // Filter logs that mention this sub-location
    const filteredLogs = allLogs.filter(log => {
      // Check if sub-location is mentioned in changes
      if (log.changes) {
        const changesStr = JSON.stringify(log.changes).toLowerCase();
        const subLocStr = JSON.stringify({
          campus: subLocation.campus,
          tower: subLocation.tower,
          floor: subLocation.floor,
        }).toLowerCase();
        return changesStr.includes(subLocStr);
      }

      // Check if sub-location is mentioned in old_data or new_data
      if (log.old_data) {
        const oldDataStr = JSON.stringify(log.old_data).toLowerCase();
        if (
          oldDataStr.includes(subLocation.campus.toLowerCase()) ||
          oldDataStr.includes(subLocation.tower.toLowerCase()) ||
          oldDataStr.includes(subLocation.floor.toLowerCase())
        ) {
          return true;
        }
      }

      if (log.new_data) {
        const newDataStr = JSON.stringify(log.new_data).toLowerCase();
        if (
          newDataStr.includes(subLocation.campus.toLowerCase()) ||
          newDataStr.includes(subLocation.tower.toLowerCase()) ||
          newDataStr.includes(subLocation.floor.toLowerCase())
        ) {
          return true;
        }
      }

      return false;
    });

    // Apply pagination
    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, Math.min(limit, 50));
    const skip = (pageNum - 1) * limitNum;

    const paginatedLogs = filteredLogs.slice(skip, skip + limitNum);
    const totalItems = filteredLogs.length;
    const totalPages = Math.ceil(totalItems / limitNum);

    return {
      logs: paginatedLogs,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems,
        itemsPerPage: limitNum,
      },
    };
  }

  // HELPER: Convert sub-locations to CSV
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
        "Machine Names",
        "Created At",
        "Updated At",
      ];

      let csv = "\ufeff";
      csv += headers.join(",") + "\n";

      subLocations.forEach(subLoc => {
        const subLocObj = subLoc.toObject ? subLoc.toObject() : subLoc;

        const installedMachines =
          subLocObj.machines?.filter((m: any) => m.installed_status === "installed").length || 0;

        const notInstalledMachines =
          subLocObj.machines?.filter((m: any) => m.installed_status === "not_installed").length ||
          0;

        const activeMachines =
          subLocObj.machines?.filter((m: any) => m.status === "active").length || 0;

        const inactiveMachines =
          subLocObj.machines?.filter((m: any) => m.status === "inactive").length || 0;

        const machineNames = subLocObj.machines?.map((m: any) => m.name).join("; ") || "";

        const row = [
          subLocObj._id?.toString() || "",
          `"${(subLocObj.campus || "").replace(/"/g, '""')}"`,
          `"${(subLocObj.tower || "").replace(/"/g, '""')}"`,
          `"${(subLocObj.floor || "").replace(/"/g, '""')}"`,
          subLocObj.machines?.length || 0,
          installedMachines,
          notInstalledMachines,
          activeMachines,
          inactiveMachines,
          `"${machineNames.replace(/"/g, '""')}"`,
          subLocObj.createdAt ? new Date(subLocObj.createdAt).toISOString() : "",
          subLocObj.updatedAt ? new Date(subLocObj.updatedAt).toISOString() : "",
        ];

        csv += row.join(",") + "\n";
      });

      // Add summary
      csv += "\n\n";
      csv += "Export Summary\n";
      csv += "Location," + `"${location.area_name}"` + "\n";
      csv += "State," + `"${location.state}"` + "\n";
      csv += "District," + `"${location.district}"` + "\n";
      csv += "Total Sub-locations," + subLocations.length + "\n";
      csv +=
        "Total Machines," +
        subLocations.reduce((sum, subLoc) => sum + (subLoc.machines?.length || 0), 0) +
        "\n";
      csv += "Export Date," + new Date().toISOString() + "\n";

      return csv;
    } catch (error) {
      logger.error("Error converting sub-locations to CSV:", error);
      return "Error generating sub-locations CSV";
    }
  }
  // GET DASHBOARD DATA
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
      search,
    });

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

    // Filter by campus, tower, floor if provided
    let filteredLocations = locations;
    if (campus || tower || floor) {
      filteredLocations = await Promise.all(
        locations.map(async location => {
          const subLocationFilter: any = { location_id: location._id };
          if (campus) subLocationFilter.campus = { $regex: campus, $options: "i" };
          if (tower) subLocationFilter.tower = { $regex: tower, $options: "i" };
          if (floor) subLocationFilter.floor = { $regex: floor, $options: "i" };

          const subLocations = await SubLocationModel.find(subLocationFilter);
          if (subLocations.length === 0) return null;

          return location;
        })
      );
      filteredLocations = filteredLocations.filter(loc => loc !== null);
    }

    const totalPages = Math.ceil(totalItems / limitNum);

    return {
      locations: filteredLocations,
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

  private static async getDashboardStatistics(): Promise<{
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
  }> {
    const [
      totalLocations,
      activeLocations,
      inactiveLocations,
      stateAggregation,
      districtAggregation,
      campusAggregation,
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
      areasByStatus: {
        active: activeLocations,
        inactive: inactiveLocations,
      },
      areasByCampus,
    };
  }

  // GET MACHINE STATISTICS
  private static async getMachineStatistics(): Promise<{
    totalMachines: number;
    installedMachines: number;
    notInstalledMachines: number;
    activeMachines: number;
    inactiveMachines: number;
  }> {
    const allMachineDetails = await MachineDetailsModel.find();

    let totalMachines = 0;
    let installedMachines = 0;
    let notInstalledMachines = 0;
    let activeMachines = 0;
    let inactiveMachines = 0;

    allMachineDetails.forEach(machine => {
      totalMachines++;

      if (machine.installed_status === "installed") {
        installedMachines++;
      } else if (machine.installed_status === "not_installed") {
        notInstalledMachines++;
      }

      if (machine.status === "active") {
        activeMachines++;
      } else if (machine.status === "inactive") {
        inactiveMachines++;
      }
    });

    return {
      totalMachines,
      installedMachines,
      notInstalledMachines,
      activeMachines,
      inactiveMachines,
    };
  }

  // GET DASHBOARD TABLE DATA
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
        // Get sub-locations and machines for this location
        const subLocations = await SubLocationModel.find({ location_id: location._id });

        let totalMachines = 0;
        let installedMachines = 0;
        let notInstalledMachines = 0;

        for (const subLoc of subLocations) {
          const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });
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

    return {
      data: tableData,
      total,
    };
  }

  static async getLocationsByIds(locationIds: string[]): Promise<ILocation[]> {
    const invalidIds = locationIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      throw new Error(`Invalid location IDs: ${invalidIds.join(", ")}`);
    }

    return await LocationModel.find({
      _id: { $in: locationIds },
    })
      .sort({ area_name: 1 })
      .select(
        "area_name state district pincode status latitude longitude address area_description createdAt updatedAt"
      );
  }

  // GET SUMMARIZED LOCATIONS
  static async getSummarizedLocationsByIds(locationIds: string[]): Promise<any[]> {
    const locations = await this.getLocationsByIds(locationIds);

    return await Promise.all(
      locations.map(async location => {
        const subLocations = await SubLocationModel.find({ location_id: location._id });

        let totalMachines = 0;
        let installedMachines = 0;
        let notInstalledMachines = 0;

        for (const subLoc of subLocations) {
          const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });
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

  static async getRecentActivities(limit: number = 10, filter?: any): Promise<any[]> {
    try {
      let query = HistoryAreaModel.find();

      if (filter) {
        query = query.where(filter);
      }

      const activities = await query
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate("location_id", "area_name state district")
        .lean();

      return activities.map(activity => ({
        id: activity._id,
        action: activity.action,
        location_id: activity.location_id?._id,
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

  // UPDATE MACHINE DETAILS
  static async updateMachineDetails(
    machineDetailsId: string,
    updateData: UpdateMachineDetailsDto,
    auditParams?: AuditLogParams
  ): Promise<IMachineDetails | null> {
    this.validateObjectId(machineDetailsId);

    // Validate update data
    if (
      updateData.installed_status &&
      !["installed", "not_installed"].includes(updateData.installed_status)
    ) {
      throw new Error("installed_status must be either 'installed' or 'not_installed'");
    }

    if (updateData.status && !["active", "inactive"].includes(updateData.status)) {
      throw new Error("status must be either 'active' or 'inactive'");
    }

    const currentMachine = await MachineDetailsModel.findById(machineDetailsId).populate({
      path: "sub_location_id",
      populate: {
        path: "location_id",
      },
    });

    if (!currentMachine) {
      return null;
    }

    const oldData = { ...currentMachine.toObject() };

    // Update machine details
    const updatedMachine = await MachineDetailsModel.findByIdAndUpdate(
      machineDetailsId,
      updateData,
      { new: true }
    ).populate({
      path: "sub_location_id",
      populate: {
        path: "location_id",
      },
    });

    if (!updatedMachine) {
      throw new Error("Failed to update machine details");
    }

    // Get location ID for audit log
    const subLocation = await SubLocationModel.findById(updatedMachine.sub_location_id);
    const locationId = subLocation?.location_id;

    // Create changes object for audit log
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

    // Create audit log if there are changes
    if (Object.keys(changes).length > 0 && locationId) {
      await this.createAuditLog(locationId, "UPDATE", null, null, changes, auditParams);
    }

    return updatedMachine;
  }

  // DELETE MACHINE (remove from sub-location)
  static async deleteMachine(
    machineDetailsId: string,
    auditParams?: AuditLogParams
  ): Promise<void> {
    this.validateObjectId(machineDetailsId);

    const machineDetails = await MachineDetailsModel.findById(machineDetailsId).populate({
      path: "sub_location_id",
      populate: {
        path: "location_id",
      },
    });

    if (!machineDetails) {
      throw new Error("Machine not found");
    }

    const locationId = (machineDetails.sub_location_id as any)?.location_id?._id;
    const machineName = machineDetails.machine_name;

    // Delete machine images from cloud storage
    if (machineDetails.machine_image && machineDetails.machine_image.length > 0) {
      const uploadService = new ImageUploadService();
      for (const image of machineDetails.machine_image) {
        try {
          await uploadService.deleteFromCloudinary(image.cloudinary_public_id);
        } catch (error) {
          logger.error(`Failed to delete image ${image.cloudinary_public_id}:`, error);
        }
      }
    }

    // Delete machine details
    await MachineDetailsModel.findByIdAndDelete(machineDetailsId);

    // Create audit log
    if (locationId) {
      await this.createAuditLog(
        locationId,
        "REMOVE_MACHINE",
        null,
        null,
        {
          removed_machine: {
            old: {
              machine_name: machineName,
              machine_id: machineDetailsId,
            },
            new: null,
          },
        },
        auditParams
      );
    }
  }

  // NEW HELPER METHOD FOR VALIDATING MACHINE IMAGES
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

  // NEW HELPER METHOD FOR DELETING MACHINE IMAGES
  private static async deleteMachineImagesFromMachines(
    machineDetailsIds: Types.ObjectId[]
  ): Promise<void> {
    const uploadService = new ImageUploadService();
    const machines = await MachineDetailsModel.find({ _id: { $in: machineDetailsIds } });

    for (const machine of machines) {
      if (machine.machine_image && machine.machine_image.length > 0) {
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

  // TOGGLE MACHINE STATUS (active ↔ inactive)
  static async toggleMachineStatus(
    machineDetailsId: string,
    auditParams?: AuditLogParams
  ): Promise<IMachineDetails | null> {
    this.validateObjectId(machineDetailsId);

    const machineDetails = await MachineDetailsModel.findById(machineDetailsId).populate({
      path: "sub_location_id",
      populate: {
        path: "location_id",
      },
    });

    if (!machineDetails) {
      throw new Error("Machine not found");
    }

    const oldStatus = machineDetails.status;
    const newStatus = oldStatus === "active" ? "inactive" : "active";

    const updatedMachine = await MachineDetailsModel.findByIdAndUpdate(
      machineDetailsId,
      { status: newStatus },
      { new: true }
    ).populate({
      path: "sub_location_id",
      populate: {
        path: "location_id",
      },
    });

    // Get location ID for audit log
    const subLocation = await SubLocationModel.findById(updatedMachine?.sub_location_id);
    const locationId = subLocation?.location_id;

    if (locationId) {
      const changes = {
        "machine.status": {
          old: oldStatus,
          new: newStatus,
        },
      };

      await this.createAuditLog(locationId, "UPDATE", null, null, changes, auditParams);
    }

    return updatedMachine;
  }

  // TOGGLE MACHINE INSTALLED STATUS (installed ↔ not_installed)
  static async toggleMachineInstalledStatus(
    machineDetailsId: string,
    auditParams?: AuditLogParams
  ): Promise<IMachineDetails | null> {
    this.validateObjectId(machineDetailsId);

    const machineDetails = await MachineDetailsModel.findById(machineDetailsId).populate({
      path: "sub_location_id",
      populate: {
        path: "location_id",
      },
    });

    if (!machineDetails) {
      throw new Error("Machine not found");
    }

    const oldInstalledStatus = machineDetails.installed_status;
    const newInstalledStatus = oldInstalledStatus === "installed" ? "not_installed" : "installed";

    const updatedMachine = await MachineDetailsModel.findByIdAndUpdate(
      machineDetailsId,
      { installed_status: newInstalledStatus },
      { new: true }
    ).populate({
      path: "sub_location_id",
      populate: {
        path: "location_id",
      },
    });

    // Get location ID for audit log
    const subLocation = await SubLocationModel.findById(updatedMachine?.sub_location_id);
    const locationId = subLocation?.location_id;

    if (locationId) {
      const changes = {
        "machine.installed_status": {
          old: oldInstalledStatus,
          new: newInstalledStatus,
        },
      };

      await this.createAuditLog(locationId, "UPDATE", null, null, changes, auditParams);
    }

    return updatedMachine;
  }

  // DELETE SUB-LOCATION (cascading delete)
  static async deleteSubLocation(
    subLocationId: string,
    auditParams?: AuditLogParams
  ): Promise<void> {
    this.validateObjectId(subLocationId);

    const subLocation = await SubLocationModel.findById(subLocationId);
    if (!subLocation) {
      throw new Error("Sub-location not found");
    }

    const locationId = subLocation.location_id;

    // Get all machine details for this sub-location
    const machines = await MachineDetailsModel.find({ sub_location_id: subLocationId });
    const machineIds = machines.map(m => m._id);

    // Delete machine images from cloud storage
    await this.deleteMachineImagesFromMachines(machineIds);

    // Delete machine details
    await MachineDetailsModel.deleteMany({ _id: { $in: machineIds } });

    // Delete sub-location
    await SubLocationModel.findByIdAndDelete(subLocationId);

    // Create audit log
    if (locationId) {
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
  }

  // GET ALL SUB-LOCATIONS FOR A LOCATION
  static async getSubLocationsByLocationId(locationId: string): Promise<ISubLocation[]> {
    this.validateObjectId(locationId);
    return await SubLocationModel.find({ location_id: locationId });
  }

  // GET MACHINE DETAILS FOR A SUB-LOCATION
  static async getMachineDetailsBySubLocationId(subLocationId: string): Promise<IMachineDetails[]> {
    this.validateObjectId(subLocationId);
    return await MachineDetailsModel.find({ sub_location_id: subLocationId });
  }

  // SEARCH MACHINES
  static async searchMachines(searchTerm: string): Promise<IMachineDetails[]> {
    return await MachineDetailsModel.find({
      $or: [{ machine_name: { $regex: searchTerm, $options: "i" } }],
    }).populate({
      path: "sub_location_id",
      populate: {
        path: "location_id",
      },
    });
  }
  // UPDATE MACHINE IMAGES (REPLACE ALL)
  static async updateMachineImages(
    machineDetailsId: string,
    files: Express.Multer.File[],
    auditParams?: AuditLogParams
  ): Promise<IMachineDetails> {
    // Validate machine ID
    this.validateObjectId(machineDetailsId);

    // Validate files
    if (!files || files.length === 0) {
      throw new Error("No images provided for update");
    }

    // Get current machine details
    const currentMachine = await MachineDetailsModel.findById(machineDetailsId).populate({
      path: "sub_location_id",
      populate: {
        path: "location_id",
      },
    });

    if (!currentMachine) {
      throw new Error("Machine details not found");
    }

    // Store old images for cleanup
    const oldImages = [...currentMachine.machine_image];
    const oldImageCount = oldImages.length;
    const oldImageNames = oldImages.map(img => img.image_name);
    const oldPublicIds = oldImages.map(img => img.cloudinary_public_id);

    // Initialize upload service
    const uploadService = new ImageUploadService();

    // Process new file uploads
    const processedFiles = await uploadService.uploadMultipleFiles(
      files,
      "machine_images",
      "areaMachine"
    );

    // Delete old images from cloud storage
    if (oldPublicIds.length > 0) {
      try {
        await uploadService.deleteMultipleFiles(oldPublicIds);
        logger.info(
          `Deleted ${oldPublicIds.length} old images from cloud storage for machine ${machineDetailsId}`
        );
      } catch (deleteError) {
        logger.error(`Failed to delete old images for machine ${machineDetailsId}:`, deleteError);
        // Continue with update even if deletion fails
      }
    }

    // Update machine with new images (replace all)
    const updateData = {
      machine_image: processedFiles,
      updatedAt: new Date(),
    };

    const updatedMachine = await MachineDetailsModel.findByIdAndUpdate(
      machineDetailsId,
      { $set: updateData },
      { new: true, runValidators: true }
    ).populate({
      path: "sub_location_id",
      populate: {
        path: "location_id",
      },
    });

    if (!updatedMachine) {
      throw new Error("Failed to update machine images");
    }

    // Get location ID for audit log
    const subLocation = await SubLocationModel.findById(updatedMachine.sub_location_id);
    const locationId = subLocation?.location_id;

    // Create audit log
    if (locationId && auditParams) {
      const changes = {
        machine_images: {
          old: {
            count: oldImageCount,
            names: oldImageNames,
          },
          new: {
            count: processedFiles.length,
            names: processedFiles.map(f => f.image_name),
          },
        },
      };

      await this.createAuditLog(locationId, "UPDATE", null, null, changes, auditParams);
    }

    return updatedMachine;
  }
}
