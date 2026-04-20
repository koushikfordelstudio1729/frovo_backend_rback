import mongoose, { Types } from "mongoose";
import { Request } from "express";
import {
  PriceOverrideModel,
  IPriceOverride,
  PriceOverrideHistoryModel,
  IPriceOverrideHistory,
} from "../models/PriceOverride.model";
import { CatalogueModel } from "../models/Catalogue.model";
import { LocationModel, MachineDetailsModel, SubLocationModel } from "../models/AreaRoute.model";
import { logger } from "../utils/logger.util";
import { Machine } from "../models/VM.model";

export interface CreatePriceOverrideDTO {
  sku_id: string;
  state?: string;
  district?: string;
  area_id?: string;
  location?: {
    campus?: string;
    tower?: string;
    floor?: string;
  };
  machine_id?: string;
  override_price: number;
  start_date: Date;
  end_date: Date;
  reason: string;
}

export interface UpdatePriceOverrideDTO {
  state?: string;
  district?: string;
  area_id?: string;
  location?: {
    campus?: string;
    tower?: string;
    floor?: string;
  };
  machine_id?: string;
  override_price?: number;
  start_date?: Date;
  end_date?: Date;
  reason?: string;
  status?: "active" | "inactive";
}

export interface PriceOverrideFilterDTO {
  sku_id?: string;
  sku_code?: string;
  state?: string;
  district?: string;
  area_id?: string;
  machine_id?: string;
  status?: "active" | "inactive" | "expired";
  start_date_from?: Date;
  start_date_to?: Date;
  page?: number;
  limit?: number;
}

export interface EffectivePriceResult {
  sku_id: string;
  sku_code: string;
  product_name: string;
  base_price: number;
  effective_price: number;
  is_overridden: boolean;
  override_details?: {
    override_id: string;
    override_price: number;
    level: string;
    reason: string;
    start_date: Date;
    end_date: Date;
  };
}

export class PriceOverrideService {
  private req: Request | null = null;

  setRequestContext(req: Request): void {
    this.req = req;
  }
  // Calculate priority based on specificity
  private calculatePriority(data: CreatePriceOverrideDTO): number {
    if (data.machine_id) return 5; // Most specific - single machine
    if (data.location?.campus || data.location?.tower || data.location?.floor) return 4; // Specific location
    if (data.area_id) return 3; // Area level
    if (data.district) return 2; // District level
    if (data.state) return 1; // State level (least specific)
    return 1;
  }
  private async logHistory(
    action: IPriceOverrideHistory["action"],
    priceOverride: IPriceOverride,
    oldData?: Partial<IPriceOverride>,
    changes?: { field: string; old_value: any; new_value: any }[]
  ): Promise<void> {
    try {
      if (!this.req) {
        logger.warn("logHistory: No request context available");
        return;
      }

      const user = (this.req as any).user;
      if (!user) {
        logger.warn("logHistory: No user in request context");
        return;
      }

      logger.info("logHistory: Logging action", { action, user_id: user._id || user.id });

      // Handle both Mongoose document and plain object
      const newData =
        typeof priceOverride.toObject === "function" ? priceOverride.toObject() : priceOverride;

      // Extract role name from roles array (populated from auth middleware)
      let roleName = "unknown";
      if (user.roles && Array.isArray(user.roles) && user.roles.length > 0) {
        // roles is populated, so it's an array of role objects
        const firstRole = user.roles[0];
        roleName = firstRole.name || firstRole.roleName || String(firstRole);
      } else if (user.role) {
        roleName = user.role;
      }

      const historyEntry = new PriceOverrideHistoryModel({
        price_override_id: priceOverride._id,
        sku_id: priceOverride.sku_id,
        sku_code: priceOverride.sku_code,
        product_name: priceOverride.product_name,
        action,
        old_data: oldData || null,
        new_data: newData,
        changes: changes || [],
        performed_by: {
          user_id: user._id || user.id,
          email: user.email,
          name: user.name || "",
          role: roleName,
        },
        ip_address: this.req.ip || this.req.headers["x-forwarded-for"] || "unknown",
        user_agent: this.req.headers["user-agent"] || "unknown",
        request_path: this.req.originalUrl,
        timestamp: new Date(),
      });

      await historyEntry.save();
      logger.info("logHistory: History entry saved successfully", { id: historyEntry._id });
    } catch (error) {
      logger.error("Failed to log price override history:", error);
    }
  }
  // Get priority level name
  private getPriorityLevelName(priority: number): string {
    const levels: Record<number, string> = {
      1: "State",
      2: "District",
      3: "Area",
      4: "Location",
      5: "Machine",
    };
    return levels[priority] || "Unknown";
  }

  // Validate at least one level is provided
  private validateAtLeastOneLevel(data: CreatePriceOverrideDTO): void {
    if (!data.state && !data.district && !data.area_id && !data.machine_id) {
      throw new Error("At least one level (state, district, area, or machine) must be specified");
    }
  }

  // Validate hierarchical consistency
  private validateHierarchy(data: CreatePriceOverrideDTO): void {
    // If district is provided without state
    if (data.district && !data.state) {
      throw new Error("State is required when district is specified");
    }

    // If area_id is provided without state and district
    if (data.area_id && (!data.state || !data.district)) {
      throw new Error("State and district are required when area is specified");
    }

    // If machine_id is provided without area_id
    if (data.machine_id && !data.area_id) {
      throw new Error("Area ID is required when machine ID is specified");
    }
  }

  // Validate area location if provided
  private async validateAreaLocation(
    areaId?: string,
    state?: string,
    district?: string,
    machineId?: string
  ): Promise<{ area: any | null; isValid: boolean; message?: string }> {
    if (!areaId) {
      return { isValid: true, area: null };
    }

    if (!mongoose.Types.ObjectId.isValid(areaId)) {
      return { isValid: false, area: null, message: "Invalid area ID format" };
    }

    const area = await LocationModel.findById(areaId);
    if (!area) {
      return { isValid: false, area: null, message: "Area not found" };
    }

    // Validate state matches if provided
    if (state && area.state.toLowerCase() !== state.toLowerCase()) {
      return {
        isValid: false,
        area: null,
        message: `State "${state}" does not match area's state "${area.state}"`,
      };
    }

    // Validate district matches if provided
    if (district && area.district.toLowerCase() !== district.toLowerCase()) {
      return {
        isValid: false,
        area: null,
        message: `District "${district}" does not match area's district "${area.district}"`,
      };
    }

    return { isValid: true, area };
  }

  // Validate machine exists and is in the specified area (if area provided)
  private async validateMachineInArea(
    machineId?: string,
    areaId?: string
  ): Promise<{ isValid: boolean; message?: string; machineDetails?: any }> {
    if (!machineId) {
      return { isValid: true };
    }

    // Check if machine exists
    const machine = await Machine.findOne({ machineId });
    if (!machine) {
      return {
        isValid: false,
        message: `Machine with ID "${machineId}" not found in the system`,
      };
    }

    // If area is specified, validate machine belongs to that area
    if (areaId) {
      const machineDetails = await MachineDetailsModel.findOne({ machineId }).populate({
        path: "sub_location_id",
        populate: { path: "location_id" },
      });

      if (!machineDetails || !machineDetails.sub_location_id) {
        return {
          isValid: false,
          message: `Machine "${machineId}" is not assigned to any sub-location`,
        };
      }

      const subLocation = machineDetails.sub_location_id as any;
      const location = subLocation?.location_id as any;

      if (!location || location._id.toString() !== areaId) {
        return {
          isValid: false,
          message: `Machine "${machineId}" is not assigned to the specified area`,
        };
      }

      return {
        isValid: true,
        machineDetails: { machine, subLocation, location },
      };
    }

    return { isValid: true, machineDetails: { machine } };
  }

  // Get all machines in an area (for area-level overrides)
  private async getMachinesInArea(areaId: string): Promise<string[]> {
    const subLocations = await SubLocationModel.find({ location_id: areaId });
    const machineDetails = await MachineDetailsModel.find({
      sub_location_id: { $in: subLocations.map(sl => sl._id) },
    });
    return machineDetails.map(md => md.machineId);
  }

  // Get all areas in a district (for district-level overrides)
  private async getAreasInDistrict(district: string, state: string): Promise<any[]> {
    return await LocationModel.find({
      district: { $regex: new RegExp(`^${district}$`, "i") },
      state: { $regex: new RegExp(`^${state}$`, "i") },
    });
  }

  // Get all districts in a state (for state-level overrides)
  private async getDistrictsInState(state: string): Promise<string[]> {
    const areas = await LocationModel.find({
      state: { $regex: new RegExp(`^${state}$`, "i") },
    });
    return [...new Set(areas.map(area => area.district))];
  }
  async createPriceOverride(data: CreatePriceOverrideDTO): Promise<IPriceOverride> {
    try {
      // Validate required fields
      if (!data.sku_id) throw new Error("SKU ID is required");
      if (!data.override_price) throw new Error("Override price is required");
      if (!data.start_date) throw new Error("Start date is required");
      if (!data.end_date) throw new Error("End date is required");
      if (!data.reason) throw new Error("Reason is required");

      // Validate at least one level is specified
      this.validateAtLeastOneLevel(data);

      // Validate hierarchical consistency
      this.validateHierarchy(data);

      // Validate SKU exists
      if (!mongoose.Types.ObjectId.isValid(data.sku_id)) {
        throw new Error("Invalid SKU ID format");
      }

      const catalogue = await CatalogueModel.findById(data.sku_id);
      if (!catalogue) {
        throw new Error("SKU not found in catalogue");
      }

      // Validate area if provided
      const areaValidation = await this.validateAreaLocation(
        data.area_id,
        data.state,
        data.district
      );
      if (!areaValidation.isValid) {
        throw new Error(areaValidation.message);
      }

      // Validate machine if provided
      const machineValidation = await this.validateMachineInArea(data.machine_id, data.area_id);
      if (!machineValidation.isValid) {
        throw new Error(machineValidation.message);
      }

      // Validate dates - FIXED VERSION
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);

      // Normalize to start of day for comparison
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const startDateNormalized = new Date(startDate);
      startDateNormalized.setHours(0, 0, 0, 0);

      const endDateNormalized = new Date(endDate);
      endDateNormalized.setHours(0, 0, 0, 0);

      // Validate end date is after start date
      if (endDateNormalized <= startDateNormalized) {
        throw new Error("End date must be after start date");
      }

      // Validate start date is not in the past (today is allowed)
      if (startDateNormalized < today) {
        throw new Error("Start date cannot be in the past");
      }

      // Additional validation: end date should be at least today
      if (endDateNormalized < today) {
        throw new Error("End date cannot be in the past");
      }

      // Validate override price
      if (data.override_price < 0) {
        throw new Error("Override price cannot be negative");
      }

      const priority = this.calculatePriority(data);

      // Create the price override record
      const priceOverride = new PriceOverrideModel({
        sku_id: data.sku_id,
        sku_code: catalogue.sku_id,
        product_name: catalogue.product_name,
        original_base_price: catalogue.base_price,
        state: data.state,
        district: data.district,
        area_id: data.area_id,
        area_name: areaValidation.area?.area_name,
        location: data.location,
        machine_id: data.machine_id,
        override_price: data.override_price,
        start_date: startDate,
        end_date: endDate,
        reason: data.reason,
        status: "active",
        priority,
        created_by: (this.req as any)?.user?._id || (this.req as any)?.user?.id,
      });

      const savedOverride = await priceOverride.save();

      // Log history
      await this.logHistory("CREATE", savedOverride);

      // Determine scope message
      let scopeMessage = "";
      if (data.machine_id) {
        scopeMessage = `machine: ${data.machine_id}`;
      } else if (data.area_id) {
        scopeMessage = `area: ${areaValidation.area?.area_name}`;
      } else if (data.district) {
        scopeMessage = `district: ${data.district}`;
      } else if (data.state) {
        scopeMessage = `state: ${data.state}`;
      }

      logger.info("Price override created:", {
        id: savedOverride._id,
        sku: savedOverride.sku_code,
        scope: scopeMessage,
        override_price: savedOverride.override_price,
        priority: savedOverride.priority,
      });

      return savedOverride;
    } catch (error: any) {
      logger.error("Error creating price override:", error);
      throw error;
    }
  }
  // Get effective price with hierarchical resolution and complete details
  async getEffectivePrice(
    skuId: string,
    machineId: string
  ): Promise<
    EffectivePriceResult & {
      machine_details?: {
        machineId: string;
        serialNumber: string;
        modelNumber: string;
        machineType: string;
        machineStatus: string;
        location_details: {
          state: string;
          district: string;
          area_id: string;
          area_name: string;
          campus: string;
          tower: string;
          floor: string;
        };
      };
      all_applicable_overrides?: Array<{
        override_id: string;
        level: string;
        priority: number;
        override_price: number;
        reason: string;
        start_date: Date;
        end_date: Date;
        scope_details: any;
      }>;
    }
  > {
    try {
      if (!mongoose.Types.ObjectId.isValid(skuId)) {
        throw new Error("Invalid SKU ID format");
      }

      if (!machineId) {
        throw new Error("Machine ID is required");
      }

      // Get machine details to determine its location hierarchy
      const machineDetails = await MachineDetailsModel.findOne({ machineId }).populate({
        path: "sub_location_id",
        populate: { path: "location_id" },
      });

      if (!machineDetails || !machineDetails.sub_location_id) {
        throw new Error("Machine is not assigned to any location");
      }

      const subLocation = machineDetails.sub_location_id as any;
      const location = subLocation?.location_id as any;

      const machineState = location?.state;
      const machineDistrict = location?.district;
      const machineAreaId = location?._id?.toString();
      const machineAreaName = location?.area_name;
      const machineCampus = subLocation?.campus;
      const machineTower = subLocation?.tower;
      const machineFloor = subLocation?.floor;

      // Get machine details
      const machine = await Machine.findOne({ machineId }).lean();

      const catalogue = await CatalogueModel.findById(skuId);
      if (!catalogue) {
        throw new Error("SKU not found");
      }

      const now = new Date();
      const allApplicableOverrides: any[] = [];

      // Priority 5: Machine-level override (most specific)
      let selectedOverride = null;
      const machineLevelOverride = await PriceOverrideModel.findOne({
        sku_id: skuId,
        machine_id: machineId,
        status: "active",
        start_date: { $lte: now },
        end_date: { $gte: now },
      }).lean();

      if (machineLevelOverride) {
        selectedOverride = machineLevelOverride;
        allApplicableOverrides.push({
          ...machineLevelOverride,
          level: "Machine",
          priority: 5,
          scope_details: {
            machine_id: machineId,
          },
        });
      }

      // Priority 4: Location-level override (campus/tower/floor)
      let locationLevelOverride = null;
      if (!selectedOverride && (machineCampus || machineTower || machineFloor)) {
        locationLevelOverride = await PriceOverrideModel.findOne({
          sku_id: skuId,
          area_id: machineAreaId,
          "location.campus": machineCampus,
          "location.tower": machineTower,
          "location.floor": machineFloor,
          status: "active",
          start_date: { $lte: now },
          end_date: { $gte: now },
        }).lean();

        if (locationLevelOverride) {
          selectedOverride = locationLevelOverride;
          allApplicableOverrides.push({
            ...locationLevelOverride,
            level: "Location",
            priority: 4,
            scope_details: {
              area_id: machineAreaId,
              area_name: machineAreaName,
              campus: machineCampus,
              tower: machineTower,
              floor: machineFloor,
            },
          });
        }
      }

      // Priority 3: Area-level override
      let areaLevelOverride = null;
      if (!selectedOverride && machineAreaId) {
        areaLevelOverride = await PriceOverrideModel.findOne({
          sku_id: skuId,
          area_id: machineAreaId,
          $or: [{ machine_id: { $exists: false } }, { machine_id: null }, { machine_id: "" }],
          status: "active",
          start_date: { $lte: now },
          end_date: { $gte: now },
        }).lean();

        if (areaLevelOverride) {
          selectedOverride = areaLevelOverride;
          allApplicableOverrides.push({
            ...areaLevelOverride,
            level: "Area",
            priority: 3,
            scope_details: {
              area_id: machineAreaId,
              area_name: machineAreaName,
              state: machineState,
              district: machineDistrict,
            },
          });
        }
      }

      // Priority 2: District-level override
      let districtLevelOverride = null;
      if (!selectedOverride && machineDistrict) {
        districtLevelOverride = await PriceOverrideModel.findOne({
          sku_id: skuId,
          district: { $regex: new RegExp(`^${machineDistrict}$`, "i") },
          $and: [
            { $or: [{ area_id: { $exists: false } }, { area_id: null }] },
            { $or: [{ machine_id: { $exists: false } }, { machine_id: null }, { machine_id: "" }] },
          ],
          status: "active",
          start_date: { $lte: now },
          end_date: { $gte: now },
        }).lean();

        if (districtLevelOverride) {
          selectedOverride = districtLevelOverride;
          allApplicableOverrides.push({
            ...districtLevelOverride,
            level: "District",
            priority: 2,
            scope_details: {
              state: machineState,
              district: machineDistrict,
            },
          });
        }
      }

      // Priority 1: State-level override (least specific)
      let stateLevelOverride = null;
      if (!selectedOverride && machineState) {
        stateLevelOverride = await PriceOverrideModel.findOne({
          sku_id: skuId,
          state: { $regex: new RegExp(`^${machineState}$`, "i") },
          $or: [{ district: { $exists: false } }, { district: null }, { district: "" }],
          status: "active",
          start_date: { $lte: now },
          end_date: { $gte: now },
        }).lean();

        if (stateLevelOverride) {
          selectedOverride = stateLevelOverride;
          allApplicableOverrides.push({
            ...stateLevelOverride,
            level: "State",
            priority: 1,
            scope_details: {
              state: machineState,
            },
          });
        }
      }

      const result: any = {
        sku_id: skuId,
        sku_code: catalogue.sku_id,
        product_name: catalogue.product_name,
        base_price: catalogue.base_price,
        effective_price: catalogue.base_price,
        is_overridden: false,
        machine_details: {
          machineId: machine?.machineId,
          serialNumber: machine?.serialNumber,
          modelNumber: machine?.modelNumber,
          machineType: machine?.machineType,
          machineStatus: machine?.machineStatus,
          location_details: {
            state: machineState,
            district: machineDistrict,
            area_id: machineAreaId,
            area_name: machineAreaName,
            campus: machineCampus,
            tower: machineTower,
            floor: machineFloor,
          },
        },
        all_applicable_overrides: allApplicableOverrides,
      };

      if (selectedOverride) {
        result.effective_price = selectedOverride.override_price;
        result.is_overridden = true;
        result.applied_override = {
          override_id: selectedOverride._id.toString(),
          override_price: selectedOverride.override_price,
          level: this.getPriorityLevelName(selectedOverride.priority),
          reason: selectedOverride.reason,
          start_date: selectedOverride.start_date,
          end_date: selectedOverride.end_date,
          priority: selectedOverride.priority,
        };
      }

      return result;
    } catch (error: any) {
      logger.error("Error getting effective price:", error);
      throw error;
    }
  }
  // Get all active overrides for a machine (including inherited ones)
  async getMachineOverrides(machineId: string): Promise<any[]> {
    try {
      // Get machine details
      const machineDetails = await MachineDetailsModel.findOne({ machineId }).populate({
        path: "sub_location_id",
        populate: { path: "location_id" },
      });

      if (!machineDetails || !machineDetails.sub_location_id) {
        throw new Error("Machine is not assigned to any location");
      }

      const subLocation = machineDetails.sub_location_id as any;
      const location = subLocation?.location_id as any;

      const now = new Date();

      // Get all applicable overrides in priority order
      const overrides = await PriceOverrideModel.find({
        sku_id: { $exists: true },
        status: "active",
        start_date: { $lte: now },
        end_date: { $gte: now },
        $or: [
          { machine_id: machineId },
          {
            area_id: location?._id,
            $or: [{ machine_id: { $exists: false } }, { machine_id: null }, { machine_id: "" }],
          },
          {
            district: location?.district,
            $and: [
              { $or: [{ area_id: { $exists: false } }, { area_id: null }] },
              {
                $or: [{ machine_id: { $exists: false } }, { machine_id: null }, { machine_id: "" }],
              },
            ],
          },
          {
            state: location?.state,
            $and: [
              { $or: [{ district: { $exists: false } }, { district: null }, { district: "" }] },
              { $or: [{ area_id: { $exists: false } }, { area_id: null }] },
              {
                $or: [{ machine_id: { $exists: false } }, { machine_id: null }, { machine_id: "" }],
              },
            ],
          },
        ],
      }).sort({ priority: -1, createdAt: -1 });

      return overrides;
    } catch (error: any) {
      logger.error("Error getting machine overrides:", error);
      throw error;
    }
  }

  // Update price override with validations
  async updatePriceOverride(id: string, data: UpdatePriceOverrideDTO): Promise<IPriceOverride> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid price override ID format");
      }

      const existingOverride = await PriceOverrideModel.findById(id);
      if (!existingOverride) {
        throw new Error("Price override not found");
      }

      const oldData = existingOverride.toObject();

      // Validate area, state, district if any of them are being updated
      if (data.area_id || data.state || data.district || data.machine_id) {
        const areaId = data.area_id || existingOverride.area_id.toString();
        const state = data.state || existingOverride.state;
        const district = data.district || existingOverride.district;
        const machineId = data.machine_id || existingOverride.machine_id;

        // Validate area location
        const areaValidation = await this.validateAreaLocation(areaId, state, district, machineId);
        if (!areaValidation.isValid) {
          throw new Error(areaValidation.message);
        }

        // Validate machine in area if machine_id is being updated
        if (data.machine_id && data.machine_id !== existingOverride.machine_id) {
          const machineValidation = await this.validateMachineInArea(data.machine_id, areaId);
          if (!machineValidation.isValid) {
            throw new Error(machineValidation.message);
          }
        }
      }

      // Validate dates if provided
      if (data.start_date || data.end_date) {
        const startDate = data.start_date ? new Date(data.start_date) : existingOverride.start_date;
        const endDate = data.end_date ? new Date(data.end_date) : existingOverride.end_date;

        if (startDate >= endDate) {
          throw new Error("End date must be after start date");
        }

        if (startDate < new Date() && existingOverride.status === "active") {
          throw new Error("Cannot update start date to a past date for active override");
        }
      }

      // Validate override price
      if (data.override_price !== undefined && data.override_price < 0) {
        throw new Error("Override price cannot be negative");
      }

      // Calculate changes
      const changes: { field: string; old_value: any; new_value: any }[] = [];
      const updateFields: any = {};

      if (
        data.override_price !== undefined &&
        data.override_price !== existingOverride.override_price
      ) {
        changes.push({
          field: "override_price",
          old_value: existingOverride.override_price,
          new_value: data.override_price,
        });
        updateFields.override_price = data.override_price;
      }

      if (data.start_date) {
        changes.push({
          field: "start_date",
          old_value: existingOverride.start_date,
          new_value: data.start_date,
        });
        updateFields.start_date = data.start_date;
      }

      if (data.end_date) {
        changes.push({
          field: "end_date",
          old_value: existingOverride.end_date,
          new_value: data.end_date,
        });
        updateFields.end_date = data.end_date;
      }

      if (data.reason && data.reason !== existingOverride.reason) {
        changes.push({
          field: "reason",
          old_value: existingOverride.reason,
          new_value: data.reason,
        });
        updateFields.reason = data.reason;
      }

      if (data.status && data.status !== existingOverride.status) {
        changes.push({
          field: "status",
          old_value: existingOverride.status,
          new_value: data.status,
        });
        updateFields.status = data.status;
      }

      // Update location fields
      if (data.state !== undefined) updateFields.state = data.state;
      if (data.district !== undefined) updateFields.district = data.district;
      if (data.area_id !== undefined) updateFields.area_id = data.area_id;
      if (data.location !== undefined) updateFields.location = data.location;
      if (data.machine_id !== undefined) updateFields.machine_id = data.machine_id;

      // Recalculate priority if location changed
      if (data.machine_id || data.area_id || data.district || data.state) {
        const newPriority = this.calculatePriority({
          ...existingOverride.toObject(),
          ...data,
        } as unknown as CreatePriceOverrideDTO);
        updateFields.priority = newPriority;
      }

      updateFields.updated_by = (this.req as any)?.user?._id || (this.req as any)?.user?.id;

      const updatedOverride = await PriceOverrideModel.findByIdAndUpdate(
        id,
        { $set: updateFields },
        { new: true, runValidators: true }
      );

      if (!updatedOverride) {
        throw new Error("Failed to update price override");
      }

      // Log history
      const action =
        data.status === "active"
          ? "ACTIVATE"
          : data.status === "inactive"
            ? "DEACTIVATE"
            : "UPDATE";
      await this.logHistory(action, updatedOverride, oldData, changes);

      logger.info("Price override updated:", {
        id: updatedOverride._id,
        changes: changes.length,
      });

      return updatedOverride;
    } catch (error: any) {
      logger.error("Error updating price override:", error);
      throw error;
    }
  }
  // Get price override by ID with affected machines and locations
  // Get price override by ID with affected machines and locations
  async getPriceOverrideById(id: string): Promise<any> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid price override ID format");
      }

      const priceOverride = await PriceOverrideModel.findById(id)
        .populate("sku_id", "sku_id product_name base_price final_price")
        .populate("area_id", "area_name state district")
        .populate("created_by", "email firstName lastName")
        .populate("updated_by", "email firstName lastName");

      if (!priceOverride) {
        return null;
      }

      // Get affected locations and machines based on the scope
      let affectedData: any = {
        areas: [],
        districts: [],
        machines: [],
        total_areas: 0,
        total_districts: 0,
        total_machines: 0,
      };

      const result = priceOverride.toObject();

      if (
        priceOverride.state &&
        !priceOverride.district &&
        !priceOverride.area_id &&
        !priceOverride.machine_id
      ) {
        // State level - get all areas, districts, and machines in this state
        const areas = await LocationModel.find({
          state: { $regex: new RegExp(`^${priceOverride.state}$`, "i") },
        }).lean();

        const districts = [...new Set(areas.map(area => area.district))];

        const subLocations = await SubLocationModel.find({
          location_id: { $in: areas.map(a => a._id) },
        });

        const machineDetails = await MachineDetailsModel.find({
          sub_location_id: { $in: subLocations.map(sl => sl._id) },
        });

        const machines = await Machine.find({
          machineId: { $in: machineDetails.map(md => md.machineId) },
        }).lean();

        affectedData = {
          areas: areas.map(area => ({
            _id: area._id,
            area_name: area.area_name,
            state: area.state,
            district: area.district,
            pincode: area.pincode,
            status: area.status,
          })),
          districts: districts.map(district => ({ name: district })),
          machines: machines.map(machine => ({
            machineId: machine.machineId,
            serialNumber: machine.serialNumber,
            modelNumber: machine.modelNumber,
            machineType: machine.machineType,
            machineStatus: machine.machineStatus,
          })),
          total_areas: areas.length,
          total_districts: districts.length,
          total_machines: machines.length,
        };
      } else if (priceOverride.district && !priceOverride.area_id && !priceOverride.machine_id) {
        // District level - get all areas and machines in this district
        const areas = await LocationModel.find({
          state: { $regex: new RegExp(`^${priceOverride.state}$`, "i") },
          district: { $regex: new RegExp(`^${priceOverride.district}$`, "i") },
        }).lean();

        const subLocations = await SubLocationModel.find({
          location_id: { $in: areas.map(a => a._id) },
        });

        const machineDetails = await MachineDetailsModel.find({
          sub_location_id: { $in: subLocations.map(sl => sl._id) },
        });

        const machines = await Machine.find({
          machineId: { $in: machineDetails.map(md => md.machineId) },
        }).lean();

        affectedData = {
          areas: areas.map(area => ({
            _id: area._id,
            area_name: area.area_name,
            state: area.state,
            district: area.district,
            pincode: area.pincode,
            status: area.status,
          })),
          districts: [{ name: priceOverride.district }],
          machines: machines.map(machine => ({
            machineId: machine.machineId,
            serialNumber: machine.serialNumber,
            modelNumber: machine.modelNumber,
            machineType: machine.machineType,
            machineStatus: machine.machineStatus,
          })),
          total_areas: areas.length,
          total_districts: 1,
          total_machines: machines.length,
        };
      } else if (priceOverride.area_id && !priceOverride.machine_id) {
        // Area level - get all machines in this area
        const area = await LocationModel.findById(priceOverride.area_id).lean();

        const subLocations = await SubLocationModel.find({
          location_id: priceOverride.area_id,
        });

        const machineDetails = await MachineDetailsModel.find({
          sub_location_id: { $in: subLocations.map(sl => sl._id) },
        });

        const machines = await Machine.find({
          machineId: { $in: machineDetails.map(md => md.machineId) },
        }).lean();

        affectedData = {
          areas: area
            ? [
                {
                  _id: area._id,
                  area_name: area.area_name,
                  state: area.state,
                  district: area.district,
                  pincode: area.pincode,
                  status: area.status,
                },
              ]
            : [],
          districts: area ? [{ name: area.district }] : [],
          machines: machines.map(machine => ({
            machineId: machine.machineId,
            serialNumber: machine.serialNumber,
            modelNumber: machine.modelNumber,
            machineType: machine.machineType,
            machineStatus: machine.machineStatus,
          })),
          total_areas: area ? 1 : 0,
          total_districts: area ? 1 : 0,
          total_machines: machines.length,
        };
      } else if (priceOverride.machine_id) {
        // Machine level - get single machine AND also show its area and district
        const machine = await Machine.findOne({ machineId: priceOverride.machine_id }).lean();

        // Get the machine's location details
        const machineDetails = await MachineDetailsModel.findOne({
          machineId: priceOverride.machine_id,
        }).populate({
          path: "sub_location_id",
          populate: { path: "location_id" },
        });

        let areaDetails = null;
        let districtDetails = null;
        let areaObj = null;

        if (machineDetails && machineDetails.sub_location_id) {
          const subLocation = machineDetails.sub_location_id as any;
          const location = subLocation?.location_id as any;

          if (location) {
            areaObj = location;
            areaDetails = {
              _id: location._id,
              area_name: location.area_name,
              state: location.state,
              district: location.district,
              pincode: location.pincode,
              status: location.status,
            };

            districtDetails = {
              name: location.district,
              state: location.state,
            };
          }
        }

        // Also get area from the override's area_id if available
        let overrideArea = null;
        if (priceOverride.area_id) {
          overrideArea = await LocationModel.findById(priceOverride.area_id).lean();
        }

        affectedData = {
          areas: areaDetails
            ? [areaDetails]
            : overrideArea
              ? [
                  {
                    _id: overrideArea._id,
                    area_name: overrideArea.area_name,
                    state: overrideArea.state,
                    district: overrideArea.district,
                    pincode: overrideArea.pincode,
                    status: overrideArea.status,
                  },
                ]
              : [],
          districts: districtDetails
            ? [districtDetails]
            : overrideArea
              ? [{ name: overrideArea.district }]
              : [],
          machines: machine
            ? [
                {
                  machineId: machine.machineId,
                  serialNumber: machine.serialNumber,
                  modelNumber: machine.modelNumber,
                  machineType: machine.machineType,
                  machineStatus: machine.machineStatus,
                },
              ]
            : [],
          total_areas: areaDetails || overrideArea ? 1 : 0,
          total_districts: districtDetails || overrideArea ? 1 : 0,
          total_machines: machine ? 1 : 0,
          location_hierarchy: {
            state: areaObj?.state || overrideArea?.state || priceOverride.state,
            district: areaObj?.district || overrideArea?.district || priceOverride.district,
            area: areaObj?.area_name || overrideArea?.area_name,
            campus: (machineDetails?.sub_location_id as any)?.campus,
            tower: (machineDetails?.sub_location_id as any)?.tower,
            floor: (machineDetails?.sub_location_id as any)?.floor,
          },
        };
      }

      return {
        ...result,
        affected_locations: affectedData,
      };
    } catch (error: any) {
      logger.error("Error fetching price override:", error);
      throw error;
    }
  }
  // Get all price overrides with filters and affected locations
  async getAllPriceOverrides(filters: PriceOverrideFilterDTO): Promise<{
    overrides: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 10, ...filterParams } = filters;

      const query: any = {};

      if (filterParams.sku_id) {
        if (mongoose.Types.ObjectId.isValid(filterParams.sku_id)) {
          query.sku_id = filterParams.sku_id;
        }
      }

      if (filterParams.sku_code) {
        query.sku_code = { $regex: filterParams.sku_code, $options: "i" };
      }

      if (filterParams.state) {
        query.state = { $regex: filterParams.state, $options: "i" };
      }

      if (filterParams.district) {
        query.district = { $regex: filterParams.district, $options: "i" };
      }

      if (filterParams.area_id) {
        query.area_id = filterParams.area_id;
      }

      if (filterParams.machine_id) {
        query.machine_id = filterParams.machine_id;
      }

      if (filterParams.status) {
        query.status = filterParams.status;
      }

      if (filterParams.start_date_from || filterParams.start_date_to) {
        query.start_date = {};
        if (filterParams.start_date_from) {
          query.start_date.$gte = new Date(filterParams.start_date_from);
        }
        if (filterParams.start_date_to) {
          query.start_date.$lte = new Date(filterParams.start_date_to);
        }
      }

      const total = await PriceOverrideModel.countDocuments(query);
      const skip = (page - 1) * limit;

      const overrides = await PriceOverrideModel.find(query)
        .populate("sku_id", "sku_id product_name base_price final_price product_images")
        .populate("area_id", "area_name state district")
        .populate("created_by", "email firstName lastName")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Enrich each override with affected locations
      const enrichedOverrides = await Promise.all(
        overrides.map(async override => {
          let affectedData: any = {
            areas: [],
            districts: [],
            machines: [],
            total_areas: 0,
            total_districts: 0,
            total_machines: 0,
          };

          if (override.state && !override.district && !override.area_id && !override.machine_id) {
            // State level - get all areas, districts, and machines in this state
            const areas = await LocationModel.find({
              state: { $regex: new RegExp(`^${override.state}$`, "i") },
            }).lean();

            const districts = [...new Set(areas.map(area => area.district))];

            const subLocations = await SubLocationModel.find({
              location_id: { $in: areas.map(a => a._id) },
            });

            const machineDetails = await MachineDetailsModel.find({
              sub_location_id: { $in: subLocations.map(sl => sl._id) },
            });

            const machines = await Machine.find({
              machineId: { $in: machineDetails.map(md => md.machineId) },
            })
              .select("machineId serialNumber modelNumber machineType machineStatus")
              .lean();

            affectedData = {
              areas: areas.map(area => ({
                _id: area._id,
                area_name: area.area_name,
                state: area.state,
                district: area.district,
                pincode: area.pincode,
                status: area.status,
              })),
              districts: districts.map(district => ({ name: district })),
              machines: machines.map(machine => ({
                machineId: machine.machineId,
                serialNumber: machine.serialNumber,
                modelNumber: machine.modelNumber,
                machineType: machine.machineType,
                machineStatus: machine.machineStatus,
              })),
              total_areas: areas.length,
              total_districts: districts.length,
              total_machines: machines.length,
            };
          } else if (override.district && !override.area_id && !override.machine_id) {
            // District level - get all areas and machines in this district
            const areas = await LocationModel.find({
              state: { $regex: new RegExp(`^${override.state}$`, "i") },
              district: { $regex: new RegExp(`^${override.district}$`, "i") },
            }).lean();

            const subLocations = await SubLocationModel.find({
              location_id: { $in: areas.map(a => a._id) },
            });

            const machineDetails = await MachineDetailsModel.find({
              sub_location_id: { $in: subLocations.map(sl => sl._id) },
            });

            const machines = await Machine.find({
              machineId: { $in: machineDetails.map(md => md.machineId) },
            })
              .select("machineId serialNumber modelNumber machineType machineStatus")
              .lean();

            affectedData = {
              areas: areas.map(area => ({
                _id: area._id,
                area_name: area.area_name,
                state: area.state,
                district: area.district,
                pincode: area.pincode,
                status: area.status,
              })),
              districts: [{ name: override.district }],
              machines: machines.map(machine => ({
                machineId: machine.machineId,
                serialNumber: machine.serialNumber,
                modelNumber: machine.modelNumber,
                machineType: machine.machineType,
                machineStatus: machine.machineStatus,
              })),
              total_areas: areas.length,
              total_districts: 1,
              total_machines: machines.length,
            };
          } else if (override.area_id && !override.machine_id) {
            // Area level - get all machines in this area
            const area = await LocationModel.findById(override.area_id).lean();

            const subLocations = await SubLocationModel.find({
              location_id: override.area_id,
            });

            const machineDetails = await MachineDetailsModel.find({
              sub_location_id: { $in: subLocations.map(sl => sl._id) },
            });

            const machines = await Machine.find({
              machineId: { $in: machineDetails.map(md => md.machineId) },
            })
              .select("machineId serialNumber modelNumber machineType machineStatus")
              .lean();

            affectedData = {
              areas: area
                ? [
                    {
                      _id: area._id,
                      area_name: area.area_name,
                      state: area.state,
                      district: area.district,
                      pincode: area.pincode,
                      status: area.status,
                    },
                  ]
                : [],
              districts: area ? [{ name: area.district }] : [],
              machines: machines.map(machine => ({
                machineId: machine.machineId,
                serialNumber: machine.serialNumber,
                modelNumber: machine.modelNumber,
                machineType: machine.machineType,
                machineStatus: machine.machineStatus,
              })),
              total_areas: area ? 1 : 0,
              total_districts: area ? 1 : 0,
              total_machines: machines.length,
            };
          } else if (override.machine_id) {
            // Machine level - get single machine
            const machine = await Machine.findOne({ machineId: override.machine_id })
              .select("machineId serialNumber modelNumber machineType machineStatus")
              .lean();

            affectedData = {
              areas: [],
              districts: [],
              machines: machine
                ? [
                    {
                      machineId: machine.machineId,
                      serialNumber: machine.serialNumber,
                      modelNumber: machine.modelNumber,
                      machineType: machine.machineType,
                      machineStatus: machine.machineStatus,
                    },
                  ]
                : [],
              total_areas: 0,
              total_districts: 0,
              total_machines: machine ? 1 : 0,
            };
          }

          return {
            ...override,
            affected_locations: affectedData,
          };
        })
      );

      return {
        overrides: enrichedOverrides,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.error("Error fetching price overrides:", error);
      throw error;
    }
  }
  // Delete price override
  async deletePriceOverride(id: string): Promise<{ success: boolean; message: string }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid price override ID format");
      }

      const priceOverride = await PriceOverrideModel.findById(id);
      if (!priceOverride) {
        throw new Error("Price override not found");
      }

      const oldData = priceOverride.toObject();

      await PriceOverrideModel.findByIdAndDelete(id);

      // Log history
      await this.logHistory("DELETE", priceOverride, oldData);

      logger.info("Price override deleted:", { id });

      return {
        success: true,
        message: "Price override deleted successfully",
      };
    } catch (error: any) {
      logger.error("Error deleting price override:", error);
      throw error;
    }
  }
  // In PriceOverrideService class

  // Get price override history with enhanced filtering and pagination
  async getPriceOverrideHistory(
    filters: {
      price_override_id?: string;
      sku_id?: string;
      sku_code?: string;
      action?: string;
      user_id?: string;
      user_email?: string;
      from_date?: Date;
      to_date?: Date;
      page?: number;
      limit?: number;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ): Promise<{
    history: any[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    summary: {
      by_action: Record<string, number>;
      date_range: { from: Date | null; to: Date | null };
      total_actions: number;
    };
  }> {
    try {
      const {
        page = 1,
        limit = 20,
        sortBy = "timestamp",
        sortOrder = "desc",
        ...filterParams
      } = filters;

      const query: any = {};

      if (filterParams.price_override_id) {
        query.price_override_id = filterParams.price_override_id;
      }

      if (filterParams.sku_id) {
        query.sku_id = filterParams.sku_id;
      }

      if (filterParams.sku_code) {
        query.sku_code = { $regex: filterParams.sku_code, $options: "i" };
      }

      if (filterParams.action) {
        query.action = filterParams.action;
      }

      if (filterParams.user_id) {
        query["performed_by.user_id"] = filterParams.user_id;
      }

      if (filterParams.user_email) {
        query["performed_by.email"] = { $regex: filterParams.user_email, $options: "i" };
      }

      if (filterParams.from_date || filterParams.to_date) {
        query.timestamp = {};
        if (filterParams.from_date) {
          query.timestamp.$gte = new Date(filterParams.from_date);
        }
        if (filterParams.to_date) {
          query.timestamp.$lte = new Date(filterParams.to_date);
        }
      }

      // Get summary statistics
      const [total, byActionAgg, dateRangeAgg] = await Promise.all([
        PriceOverrideHistoryModel.countDocuments(query),
        PriceOverrideHistoryModel.aggregate([
          { $match: query },
          { $group: { _id: "$action", count: { $sum: 1 } } },
        ]),
        PriceOverrideHistoryModel.aggregate([
          { $match: query },
          {
            $group: {
              _id: null,
              earliest: { $min: "$timestamp" },
              latest: { $max: "$timestamp" },
            },
          },
        ]),
      ]);

      const skip = (page - 1) * limit;
      const sortObject: any = {};
      sortObject[sortBy] = sortOrder === "asc" ? 1 : -1;

      const history = await PriceOverrideHistoryModel.find(query)
        .sort(sortObject)
        .skip(skip)
        .limit(limit)
        .lean();

      // Enrich history data
      const enrichedHistory = await Promise.all(
        history.map(async record => {
          // Get additional details if needed
          let skuDetails = null;
          if (record.sku_id) {
            const catalogue = await CatalogueModel.findById(record.sku_id)
              .select("sku_id product_name base_price final_price")
              .lean();
            if (catalogue) {
              skuDetails = {
                sku_code: catalogue.sku_id,
                product_name: catalogue.product_name,
                base_price: catalogue.base_price,
                final_price: catalogue.final_price,
              };
            }
          }

          return {
            id: record._id,
            price_override_id: record.price_override_id,
            sku_id: record.sku_id,
            sku_code: record.sku_code,
            product_name: record.product_name,
            sku_details: skuDetails,
            action: record.action,
            action_description: this.getHistoryActionDescription(record.action),
            old_data: record.old_data,
            new_data: record.new_data,
            changes: record.changes,
            performed_by: {
              user_id: record.performed_by?.user_id,
              email: record.performed_by?.email,
              name: record.performed_by?.name,
              role: record.performed_by?.role,
            },
            ip_address: record.ip_address,
            user_agent: record.user_agent,
            request_path: record.request_path,
            timestamp: record.timestamp,
            formatted_timestamp: record.timestamp
              ? new Date(record.timestamp).toLocaleString()
              : null,
            createdAt: record.createdAt,
            updatedAt: record.updatedAt,
          };
        })
      );

      const byActionSummary: Record<string, number> = {};
      byActionAgg.forEach(item => {
        byActionSummary[item._id] = item.count;
      });

      return {
        history: enrichedHistory,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        summary: {
          by_action: byActionSummary,
          date_range: {
            from: dateRangeAgg[0]?.earliest || null,
            to: dateRangeAgg[0]?.latest || null,
          },
          total_actions: total,
        },
      };
    } catch (error: any) {
      logger.error("Error fetching price override history:", error);
      throw error;
    }
  }

  // Helper function to get action description
  private getHistoryActionDescription(action: string): string {
    const descriptions: Record<string, string> = {
      CREATE: "Price override created",
      UPDATE: "Price override updated",
      DELETE: "Price override deleted",
      ACTIVATE: "Price override activated",
      DEACTIVATE: "Price override deactivated",
      EXPIRE: "Price override expired automatically",
    };
    return descriptions[action] || action;
  }

  // Expire overrides that have passed their end date
  async expireOverrides(): Promise<{
    expired_count: number;
    expired_overrides: Array<{
      id: string;
      sku_code: string;
      product_name: string;
      end_date: Date;
    }>;
    summary: {
      total_overrides: number;
      active_count: number;
      inactive_count: number;
      already_expired_count: number;
      newly_expired_count: number;
    };
  }> {
    try {
      const now = new Date();

      // Get counts for summary
      const [totalOverrides, activeCount, inactiveCount, alreadyExpiredCount] = await Promise.all([
        PriceOverrideModel.countDocuments(),
        PriceOverrideModel.countDocuments({ status: "active", end_date: { $gte: now } }),
        PriceOverrideModel.countDocuments({ status: "inactive" }),
        PriceOverrideModel.countDocuments({ status: "expired" }),
      ]);

      // Find overrides that need to be expired
      const overridesToExpire = await PriceOverrideModel.find({
        status: "active",
        end_date: { $lt: now },
      });

      const expiredOverridesList: Array<{
        id: string;
        sku_code: string;
        product_name: string;
        end_date: Date;
      }> = [];

      for (const override of overridesToExpire) {
        const oldData = override.toObject();
        override.status = "expired";
        await override.save();

        expiredOverridesList.push({
          id: override._id.toString(),
          sku_code: override.sku_code,
          product_name: override.product_name,
          end_date: override.end_date,
        });

        // Log history
        const historyEntry = new PriceOverrideHistoryModel({
          price_override_id: override._id,
          sku_id: override.sku_id,
          sku_code: override.sku_code,
          product_name: override.product_name,
          action: "EXPIRE",
          old_data: oldData,
          new_data: override.toObject(),
          changes: [{ field: "status", old_value: "active", new_value: "expired" }],
          performed_by: {
            user_id: new Types.ObjectId(),
            email: "system@frovo.com",
            name: "System",
            role: "system",
          },
          timestamp: new Date(),
        });
        await historyEntry.save();
      }

      logger.info(`Expired ${overridesToExpire.length} price overrides`);

      return {
        expired_count: overridesToExpire.length,
        expired_overrides: expiredOverridesList,
        summary: {
          total_overrides: totalOverrides,
          active_count: activeCount,
          inactive_count: inactiveCount,
          already_expired_count: alreadyExpiredCount,
          newly_expired_count: overridesToExpire.length,
        },
      };
    } catch (error: any) {
      logger.error("Error expiring price overrides:", error);
      throw error;
    }
  }

  // Get overrides for a specific SKU with affected locations
  async getOverridesBySku(skuId: string): Promise<any[]> {
    try {
      if (!mongoose.Types.ObjectId.isValid(skuId)) {
        throw new Error("Invalid SKU ID format");
      }

      const overrides = await PriceOverrideModel.find({
        sku_id: skuId,
        status: { $in: ["active", "inactive"] },
      })
        .populate("area_id", "area_name state district")
        .populate("created_by", "email firstName lastName")
        .sort({ priority: -1, createdAt: -1 })
        .lean();

      // Enrich each override with affected locations
      const enrichedOverrides = await Promise.all(
        overrides.map(async override => {
          let affectedData: any = {
            areas: [],
            districts: [],
            machines: [],
            total_areas: 0,
            total_districts: 0,
            total_machines: 0,
          };

          if (override.state && !override.district && !override.area_id && !override.machine_id) {
            // State level - get all areas, districts, and machines in this state
            const areas = await LocationModel.find({
              state: { $regex: new RegExp(`^${override.state}$`, "i") },
            }).lean();

            const districts = [...new Set(areas.map(area => area.district))];

            const subLocations = await SubLocationModel.find({
              location_id: { $in: areas.map(a => a._id) },
            });

            const machineDetails = await MachineDetailsModel.find({
              sub_location_id: { $in: subLocations.map(sl => sl._id) },
            });

            const machines = await Machine.find({
              machineId: { $in: machineDetails.map(md => md.machineId) },
            }).lean();

            affectedData = {
              areas: areas.map(area => ({
                _id: area._id,
                area_name: area.area_name,
                state: area.state,
                district: area.district,
              })),
              districts: districts.map(district => ({ name: district })),
              machines: machines.map(machine => ({
                machineId: machine.machineId,
                serialNumber: machine.serialNumber,
                modelNumber: machine.modelNumber,
                machineType: machine.machineType,
                machineStatus: machine.machineStatus,
              })),
              total_areas: areas.length,
              total_districts: districts.length,
              total_machines: machines.length,
            };
          } else if (override.district && !override.area_id && !override.machine_id) {
            // District level - get all areas and machines in this district
            const areas = await LocationModel.find({
              state: { $regex: new RegExp(`^${override.state}$`, "i") },
              district: { $regex: new RegExp(`^${override.district}$`, "i") },
            }).lean();

            const subLocations = await SubLocationModel.find({
              location_id: { $in: areas.map(a => a._id) },
            });

            const machineDetails = await MachineDetailsModel.find({
              sub_location_id: { $in: subLocations.map(sl => sl._id) },
            });

            const machines = await Machine.find({
              machineId: { $in: machineDetails.map(md => md.machineId) },
            }).lean();

            affectedData = {
              areas: areas.map(area => ({
                _id: area._id,
                area_name: area.area_name,
                state: area.state,
                district: area.district,
              })),
              districts: [{ name: override.district }],
              machines: machines.map(machine => ({
                machineId: machine.machineId,
                serialNumber: machine.serialNumber,
                modelNumber: machine.modelNumber,
                machineType: machine.machineType,
                machineStatus: machine.machineStatus,
              })),
              total_areas: areas.length,
              total_districts: 1,
              total_machines: machines.length,
            };
          } else if (override.area_id && !override.machine_id) {
            // Area level - get all machines in this area
            const area = await LocationModel.findById(override.area_id).lean();

            const subLocations = await SubLocationModel.find({
              location_id: override.area_id,
            });

            const machineDetails = await MachineDetailsModel.find({
              sub_location_id: { $in: subLocations.map(sl => sl._id) },
            });

            const machines = await Machine.find({
              machineId: { $in: machineDetails.map(md => md.machineId) },
            }).lean();

            affectedData = {
              areas: area
                ? [
                    {
                      _id: area._id,
                      area_name: area.area_name,
                      state: area.state,
                      district: area.district,
                    },
                  ]
                : [],
              districts: area ? [{ name: area.district }] : [],
              machines: machines.map(machine => ({
                machineId: machine.machineId,
                serialNumber: machine.serialNumber,
                modelNumber: machine.modelNumber,
                machineType: machine.machineType,
                machineStatus: machine.machineStatus,
              })),
              total_areas: area ? 1 : 0,
              total_districts: area ? 1 : 0,
              total_machines: machines.length,
            };
          } else if (override.machine_id) {
            // Machine level - get single machine
            const machine = await Machine.findOne({ machineId: override.machine_id }).lean();

            affectedData = {
              areas: [],
              districts: [],
              machines: machine
                ? [
                    {
                      machineId: machine.machineId,
                      serialNumber: machine.serialNumber,
                      modelNumber: machine.modelNumber,
                      machineType: machine.machineType,
                      machineStatus: machine.machineStatus,
                    },
                  ]
                : [],
              total_areas: 0,
              total_districts: 0,
              total_machines: machine ? 1 : 0,
            };
          }

          return {
            ...override,
            affected_locations: affectedData,
          };
        })
      );

      return enrichedOverrides;
    } catch (error: any) {
      logger.error("Error fetching overrides by SKU:", error);
      throw error;
    }
  }
}

// Factory function
export const createPriceOverrideService = (req?: Request): PriceOverrideService => {
  const service = new PriceOverrideService();
  if (req) service.setRequestContext(req);
  return service;
};

export const priceOverrideService = new PriceOverrideService();
