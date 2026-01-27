import mongoose, { Types } from "mongoose";
import { Request } from "express";
import {
  PriceOverrideModel,
  IPriceOverride,
  PriceOverrideHistoryModel,
  IPriceOverrideHistory,
} from "../models/PriceOverride.model";
import { CatalogueModel } from "../models/Catalogue.model";
import { AreaRouteModel } from "../models/AreaRoute.model";
import { logger } from "../utils/logger.util";

// DTOs
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

  // Calculate priority based on location specificity
  private calculatePriority(data: CreatePriceOverrideDTO | UpdatePriceOverrideDTO): number {
    if (data.machine_id) return 5; // Most specific
    if (data.location?.campus || data.location?.tower || data.location?.floor) return 4;
    if (data.area_id) return 3;
    if (data.district) return 2;
    if (data.state) return 1;
    return 1;
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

  // Log history
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
      const newData = typeof priceOverride.toObject === "function"
        ? priceOverride.toObject()
        : priceOverride;

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

  // Create price override
  async createPriceOverride(data: CreatePriceOverrideDTO): Promise<IPriceOverride> {
    try {
      // Validate SKU exists
      if (!mongoose.Types.ObjectId.isValid(data.sku_id)) {
        throw new Error("Invalid SKU ID format");
      }

      const catalogue = await CatalogueModel.findById(data.sku_id);
      if (!catalogue) {
        throw new Error("SKU not found in catalogue");
      }

      // Validate area if provided
      let areaName: string | undefined;
      if (data.area_id) {
        if (!mongoose.Types.ObjectId.isValid(data.area_id)) {
          throw new Error("Invalid Area ID format");
        }
        const area = await AreaRouteModel.findById(data.area_id);
        if (!area) {
          throw new Error("Area not found");
        }
        areaName = area.area_name;
      }

      // Validate dates
      const startDate = new Date(data.start_date);
      const endDate = new Date(data.end_date);

      if (startDate >= endDate) {
        throw new Error("End date must be after start date");
      }

      // Validate override price
      if (data.override_price < 0) {
        throw new Error("Override price cannot be negative");
      }

      // Check for conflicting overrides
      const conflictQuery: any = {
        sku_id: data.sku_id,
        status: "active",
        $or: [
          {
            start_date: { $lte: endDate },
            end_date: { $gte: startDate },
          },
        ],
      };

      // Add location filters for conflict check
      if (data.machine_id) conflictQuery.machine_id = data.machine_id;
      if (data.area_id) conflictQuery.area_id = data.area_id;
      if (data.district) conflictQuery.district = data.district;
      if (data.state) conflictQuery.state = data.state;

      const conflictingOverride = await PriceOverrideModel.findOne(conflictQuery);
      if (conflictingOverride) {
        throw new Error(
          `A conflicting price override already exists for this SKU and location (ID: ${conflictingOverride._id})`
        );
      }

      const priority = this.calculatePriority(data);

      const priceOverride = new PriceOverrideModel({
        sku_id: data.sku_id,
        sku_code: catalogue.sku_id,
        product_name: catalogue.product_name,
        original_base_price: catalogue.base_price,
        state: data.state,
        district: data.district,
        area_id: data.area_id,
        area_name: areaName,
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

      logger.info("Price override created:", {
        id: savedOverride._id,
        sku: savedOverride.sku_code,
        override_price: savedOverride.override_price,
        priority: savedOverride.priority,
      });

      return savedOverride;
    } catch (error: any) {
      logger.error("Error creating price override:", error);
      throw error;
    }
  }

  // Get price override by ID
  async getPriceOverrideById(id: string): Promise<IPriceOverride | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid price override ID format");
      }

      const priceOverride = await PriceOverrideModel.findById(id)
        .populate("sku_id", "sku_id product_name base_price final_price")
        .populate("area_id", "area_name state district")
        .populate("created_by", "email firstName lastName")
        .populate("updated_by", "email firstName lastName");

      return priceOverride;
    } catch (error: any) {
      logger.error("Error fetching price override:", error);
      throw error;
    }
  }

  // Get all price overrides with filters
  async getAllPriceOverrides(filters: PriceOverrideFilterDTO): Promise<{
    overrides: IPriceOverride[];
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

      return {
        overrides: overrides as unknown as IPriceOverride[],
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

  // Update price override
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

      // Validate dates if provided
      if (data.start_date || data.end_date) {
        const startDate = data.start_date
          ? new Date(data.start_date)
          : existingOverride.start_date;
        const endDate = data.end_date ? new Date(data.end_date) : existingOverride.end_date;

        if (startDate >= endDate) {
          throw new Error("End date must be after start date");
        }
      }

      // Validate override price
      if (data.override_price !== undefined && data.override_price < 0) {
        throw new Error("Override price cannot be negative");
      }

      // Calculate changes
      const changes: { field: string; old_value: any; new_value: any }[] = [];
      const updateFields: any = {};

      if (data.override_price !== undefined && data.override_price !== existingOverride.override_price) {
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
      const newPriority = this.calculatePriority({
        ...existingOverride.toObject(),
        ...data,
      } as unknown as CreatePriceOverrideDTO);
      updateFields.priority = newPriority;

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
      const action = data.status === "active" ? "ACTIVATE" : data.status === "inactive" ? "DEACTIVATE" : "UPDATE";
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

  // Get effective price for a SKU at a specific location/machine
  async getEffectivePrice(
    skuId: string,
    machineId?: string,
    areaId?: string,
    district?: string,
    state?: string
  ): Promise<EffectivePriceResult> {
    try {
      if (!mongoose.Types.ObjectId.isValid(skuId)) {
        throw new Error("Invalid SKU ID format");
      }

      const catalogue = await CatalogueModel.findById(skuId);
      if (!catalogue) {
        throw new Error("SKU not found");
      }

      const now = new Date();

      // Base query for active overrides within date range
      const baseQuery: any = {
        sku_id: skuId,
        status: "active",
        start_date: { $lte: now },
        end_date: { $gte: now },
      };

      let override: any = null;

      // Priority 5: Check for machine-level override (most specific)
      if (machineId && !override) {
        override = await PriceOverrideModel.findOne({
          ...baseQuery,
          machine_id: machineId,
        }).lean();
      }

      // Priority 4: Check for location-level override (campus/tower/floor)
      // Skipped for now as location is an object

      // Priority 3: Check for area-level override
      if (areaId && !override) {
        override = await PriceOverrideModel.findOne({
          ...baseQuery,
          area_id: areaId,
          machine_id: { $in: [null, undefined, ""] },
        }).lean();

        // Also try without machine_id filter
        if (!override) {
          override = await PriceOverrideModel.findOne({
            ...baseQuery,
            area_id: areaId,
            $or: [
              { machine_id: { $exists: false } },
              { machine_id: null },
              { machine_id: "" },
            ],
          }).lean();
        }
      }

      // Priority 2: Check for district-level override
      if (district && !override) {
        override = await PriceOverrideModel.findOne({
          ...baseQuery,
          district: { $regex: new RegExp(`^${district}$`, "i") },
          $and: [
            { $or: [{ area_id: { $exists: false } }, { area_id: null }] },
            { $or: [{ machine_id: { $exists: false } }, { machine_id: null }, { machine_id: "" }] },
          ],
        }).lean();
      }

      // Priority 1: Check for state-level override (least specific)
      if (state && !override) {
        override = await PriceOverrideModel.findOne({
          ...baseQuery,
          state: { $regex: new RegExp(`^${state}$`, "i") },
          $or: [
            { district: { $exists: false } },
            { district: null },
            { district: "" },
          ],
        }).lean();
      }

      // Fallback: Find any matching override with highest priority
      if (!override) {
        override = await PriceOverrideModel.findOne(baseQuery)
          .sort({ priority: -1, createdAt: -1 })
          .lean();
      }

      const result: EffectivePriceResult = {
        sku_id: skuId,
        sku_code: catalogue.sku_id,
        product_name: catalogue.product_name,
        base_price: catalogue.base_price,
        effective_price: catalogue.base_price,
        is_overridden: false,
      };

      if (override) {
        result.effective_price = override.override_price;
        result.is_overridden = true;
        result.override_details = {
          override_id: override._id.toString(),
          override_price: override.override_price,
          level: this.getPriorityLevelName(override.priority),
          reason: override.reason,
          start_date: override.start_date,
          end_date: override.end_date,
        };
      }

      return result;
    } catch (error: any) {
      logger.error("Error getting effective price:", error);
      throw error;
    }
  }

  // Get price override history
  async getPriceOverrideHistory(
    filters: {
      price_override_id?: string;
      sku_id?: string;
      action?: string;
      user_id?: string;
      from_date?: Date;
      to_date?: Date;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    history: IPriceOverrideHistory[];
    total: number;
    page: number;
    limit: number;
    totalPages: number;
  }> {
    try {
      const { page = 1, limit = 20, ...filterParams } = filters;

      const query: any = {};

      if (filterParams.price_override_id) {
        query.price_override_id = filterParams.price_override_id;
      }

      if (filterParams.sku_id) {
        query.sku_id = filterParams.sku_id;
      }

      if (filterParams.action) {
        query.action = filterParams.action;
      }

      if (filterParams.user_id) {
        query["performed_by.user_id"] = filterParams.user_id;
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

      const total = await PriceOverrideHistoryModel.countDocuments(query);
      const skip = (page - 1) * limit;

      const history = await PriceOverrideHistoryModel.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return {
        history: history as unknown as IPriceOverrideHistory[],
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      logger.error("Error fetching price override history:", error);
      throw error;
    }
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

  // Get overrides for a specific SKU
  async getOverridesBySku(skuId: string): Promise<IPriceOverride[]> {
    try {
      if (!mongoose.Types.ObjectId.isValid(skuId)) {
        throw new Error("Invalid SKU ID format");
      }

      const overrides = await PriceOverrideModel.find({
        sku_id: skuId,
        status: { $in: ["active", "inactive"] },
      })
        .populate("area_id", "area_name state district")
        .sort({ priority: -1, createdAt: -1 })
        .lean();

      return overrides as unknown as IPriceOverride[];
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
