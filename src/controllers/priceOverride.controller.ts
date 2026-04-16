import { Request, Response } from "express";
import {
  createPriceOverrideService,
  CreatePriceOverrideDTO,
  UpdatePriceOverrideDTO,
  PriceOverrideFilterDTO,
} from "../services/priceOverride.service";
import { logger } from "../utils/logger.util";
import { LocationModel, SubLocationModel, MachineDetailsModel } from "../models/AreaRoute.model";

class PriceOverrideController {
  async createPriceOverride(req: Request, res: Response): Promise<void> {
    try {
      const service = createPriceOverrideService(req);

      const data: CreatePriceOverrideDTO = {
        sku_id: req.body.sku_id,
        state: req.body.state,
        district: req.body.district,
        area_id: req.body.area_id,
        location: req.body.location,
        machine_id: req.body.machine_id,
        override_price: parseFloat(req.body.override_price),
        start_date: new Date(req.body.start_date),
        end_date: new Date(req.body.end_date),
        reason: req.body.reason,
      };

      // Basic validations
      if (!data.sku_id) {
        res.status(400).json({ success: false, message: "SKU ID is required" });
        return;
      }

      if (data.override_price === undefined || isNaN(data.override_price)) {
        res.status(400).json({ success: false, message: "Valid override price is required" });
        return;
      }

      if (!data.start_date || !data.end_date) {
        res.status(400).json({ success: false, message: "Start date and end date are required" });
        return;
      }

      if (!data.reason) {
        res.status(400).json({ success: false, message: "Reason for override is required" });
        return;
      }

      const priceOverride = await service.createPriceOverride(data);

      res.status(201).json({
        success: true,
        message: "Price override created successfully",
        data: priceOverride,
      });
    } catch (error: any) {
      logger.error("Create price override error:", error);

      // Handle specific validation errors
      if (
        error.message.includes("State is required") ||
        error.message.includes("Area ID is required") ||
        error.message.includes("does not match") ||
        error.message.includes("not assigned") ||
        error.message.includes("not found")
      ) {
        res.status(422).json({
          success: false,
          message: error.message,
        });
        return;
      }

      res.status(400).json({
        success: false,
        message: error.message || "Failed to create price override",
      });
    }
  }
  // Get effective price for a machine
  async getEffectivePrice(req: Request, res: Response): Promise<void> {
    try {
      const { skuId } = req.params;
      const { machineId } = req.query;
      const service = createPriceOverrideService(req);

      if (!machineId) {
        res.status(400).json({
          success: false,
          message:
            "Machine ID is required. Please provide a valid machine ID to check the effective price.",
        });
        return;
      }

      const result = await service.getEffectivePrice(skuId, machineId as string);

      res.status(200).json({
        success: true,
        message: result.is_overridden
          ? `Price overridden from ₹${result.base_price} to ₹${result.effective_price}`
          : `Using base price ₹${result.base_price} (no active override found)`,
        data: result,
      });
    } catch (error: any) {
      logger.error("Get effective price error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to get effective price",
      });
    }
  }
  // Get all overrides for a machine
  async getMachineOverrides(req: Request, res: Response): Promise<void> {
    try {
      const { machineId } = req.params;
      const service = createPriceOverrideService(req);

      const overrides = await service.getMachineOverrides(machineId);

      res.status(200).json({
        success: true,
        data: overrides,
        total: overrides.length,
      });
    } catch (error: any) {
      logger.error("Get machine overrides error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to get machine overrides",
      });
    }
  }
  // Get price override by ID
  async getPriceOverrideById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const service = createPriceOverrideService(req);

      const priceOverride = await service.getPriceOverrideById(id);

      if (!priceOverride) {
        res.status(404).json({
          success: false,
          message: "Price override not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: priceOverride,
      });
    } catch (error: any) {
      logger.error("Get price override error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch price override",
      });
    }
  }
  // Get all price overrides with filters
  async getAllPriceOverrides(req: Request, res: Response): Promise<void> {
    try {
      const service = createPriceOverrideService(req);

      const filters: PriceOverrideFilterDTO = {
        sku_id: req.query.sku_id as string,
        sku_code: req.query.sku_code as string,
        state: req.query.state as string,
        district: req.query.district as string,
        area_id: req.query.area_id as string,
        machine_id: req.query.machine_id as string,
        status: req.query.status as "active" | "inactive" | "expired",
        start_date_from: req.query.start_date_from
          ? new Date(req.query.start_date_from as string)
          : undefined,
        start_date_to: req.query.start_date_to
          ? new Date(req.query.start_date_to as string)
          : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
      };

      const result = await service.getAllPriceOverrides(filters);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      logger.error("Get all price overrides error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch price overrides",
      });
    }
  }

  // Update price override
  async updatePriceOverride(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const service = createPriceOverrideService(req);

      const data: UpdatePriceOverrideDTO = {};

      if (req.body.state !== undefined) data.state = req.body.state;
      if (req.body.district !== undefined) data.district = req.body.district;
      if (req.body.area_id !== undefined) data.area_id = req.body.area_id;
      if (req.body.location !== undefined) data.location = req.body.location;
      if (req.body.machine_id !== undefined) data.machine_id = req.body.machine_id;
      if (req.body.override_price !== undefined)
        data.override_price = parseFloat(req.body.override_price);
      if (req.body.start_date) data.start_date = new Date(req.body.start_date);
      if (req.body.end_date) data.end_date = new Date(req.body.end_date);
      if (req.body.reason !== undefined) data.reason = req.body.reason;
      if (req.body.status !== undefined) data.status = req.body.status;

      const updatedOverride = await service.updatePriceOverride(id, data);

      res.status(200).json({
        success: true,
        message: "Price override updated successfully",
        data: updatedOverride,
      });
    } catch (error: any) {
      logger.error("Update price override error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update price override",
      });
    }
  }

  // Update price override status
  async updatePriceOverrideStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const service = createPriceOverrideService(req);

      if (!status || !["active", "inactive"].includes(status)) {
        res.status(400).json({
          success: false,
          message: "Valid status (active/inactive) is required",
        });
        return;
      }

      const updatedOverride = await service.updatePriceOverride(id, { status });

      res.status(200).json({
        success: true,
        message: `Price override ${status === "active" ? "activated" : "deactivated"} successfully`,
        data: updatedOverride,
      });
    } catch (error: any) {
      logger.error("Update price override status error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to update price override status",
      });
    }
  }

  // Delete price override
  async deletePriceOverride(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const service = createPriceOverrideService(req);

      const result = await service.deletePriceOverride(id);

      res.status(200).json({
        success: true,
        message: result.message,
      });
    } catch (error: any) {
      logger.error("Delete price override error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to delete price override",
      });
    }
  }

  // Get price override history
  async getPriceOverrideHistory(req: Request, res: Response): Promise<void> {
    try {
      const service = createPriceOverrideService(req);

      const filters = {
        price_override_id: req.query.price_override_id as string,
        sku_id: req.query.sku_id as string,
        action: req.query.action as string,
        user_id: req.query.user_id as string,
        from_date: req.query.from_date ? new Date(req.query.from_date as string) : undefined,
        to_date: req.query.to_date ? new Date(req.query.to_date as string) : undefined,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await service.getPriceOverrideHistory(filters);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      logger.error("Get price override history error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch price override history",
      });
    }
  }
  // Get history for a specific price override
  async getHistoryByOverrideId(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const service = createPriceOverrideService(req);

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const action = req.query.action as string;
      const fromDate = req.query.from_date as string;
      const toDate = req.query.to_date as string;
      const sortBy = (req.query.sortBy as string) || "timestamp";
      const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";

      const result = await service.getPriceOverrideHistory({
        price_override_id: id,
        action: action !== "all" ? action : undefined,
        from_date: fromDate ? new Date(fromDate) : undefined,
        to_date: toDate ? new Date(toDate) : undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      res.status(200).json({
        success: true,
        data: {
          history: result.history,
          summary: result.summary,
          pagination: {
            currentPage: result.page,
            totalPages: result.totalPages,
            totalItems: result.total,
            itemsPerPage: result.limit,
            hasNextPage: result.page < result.totalPages,
            hasPrevPage: result.page > 1,
          },
        },
      });
    } catch (error: any) {
      logger.error("Get history by override ID error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch history",
      });
    }
  }

  // Get all price override history with filters
  async getAllPriceOverrideHistory(req: Request, res: Response): Promise<void> {
    try {
      const service = createPriceOverrideService(req);

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;
      const skuId = req.query.sku_id as string;
      const skuCode = req.query.sku_code as string;
      const action = req.query.action as string;
      const userId = req.query.user_id as string;
      const userEmail = req.query.user_email as string;
      const fromDate = req.query.from_date as string;
      const toDate = req.query.to_date as string;
      const sortBy = (req.query.sortBy as string) || "timestamp";
      const sortOrder = (req.query.sortOrder as "asc" | "desc") || "desc";

      const result = await service.getPriceOverrideHistory({
        sku_id: skuId,
        sku_code: skuCode,
        action: action !== "all" ? action : undefined,
        user_id: userId,
        user_email: userEmail,
        from_date: fromDate ? new Date(fromDate) : undefined,
        to_date: toDate ? new Date(toDate) : undefined,
        page,
        limit,
        sortBy,
        sortOrder,
      });

      res.status(200).json({
        success: true,
        data: {
          history: result.history,
          summary: result.summary,
          pagination: {
            currentPage: result.page,
            totalPages: result.totalPages,
            totalItems: result.total,
            itemsPerPage: result.limit,
            hasNextPage: result.page < result.totalPages,
            hasPrevPage: result.page > 1,
          },
          filters: {
            sku_id: skuId || null,
            sku_code: skuCode || null,
            action: action || "all",
            user_id: userId || null,
            user_email: userEmail || null,
            from_date: fromDate || null,
            to_date: toDate || null,
          },
        },
      });
    } catch (error: any) {
      logger.error("Get all price override history error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch history",
      });
    }
  }
  // Get all overrides for a specific SKU
  async getOverridesBySku(req: Request, res: Response): Promise<void> {
    try {
      const { skuId } = req.params;
      const service = createPriceOverrideService(req);

      const overrides = await service.getOverridesBySku(skuId);

      res.status(200).json({
        success: true,
        data: overrides,
        total: overrides.length,
      });
    } catch (error: any) {
      logger.error("Get overrides by SKU error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to fetch overrides",
      });
    }
  }
  // Manually trigger expiry check (for admin/cron)
  async expireOverrides(req: Request, res: Response): Promise<void> {
    try {
      const service = createPriceOverrideService(req);
      const result = await service.expireOverrides();

      let message = "";
      if (result.expired_count === 0) {
        message =
          "No overrides needed to be expired. All active overrides are still within their valid date range.";
      } else {
        message = `Successfully expired ${result.expired_count} price override(s) that passed their end date.`;
      }

      res.status(200).json({
        success: true,
        message,
        data: {
          expired_count: result.expired_count,
          expired_overrides: result.expired_overrides,
          summary: result.summary,
        },
      });
    } catch (error: any) {
      logger.error("Expire overrides error:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Failed to expire overrides",
      });
    }
  }

  async getLocationFilterOptions(req: Request, res: Response): Promise<void> {
    try {
      const { state, district, area_id } = req.query as {
        state?: string;
        district?: string;
        area_id?: string;
      };

      const states: string[] = await LocationModel.distinct("state");
      states.sort();

      const districtFilter: Record<string, any> = {};
      if (state) districtFilter.state = new RegExp(`^${state}$`, "i");
      const districts: string[] = await LocationModel.distinct("district", districtFilter);
      districts.sort();

      const areaFilter: Record<string, any> = {};
      if (state) areaFilter.state = new RegExp(`^${state}$`, "i");
      if (district) areaFilter.district = new RegExp(`^${district}$`, "i");

      const areasDocs = await LocationModel.find(areaFilter).select("_id area_name state district");
      const areas = areasDocs.map(loc => ({
        id: loc._id,
        area_name: loc.area_name,
        state: loc.state,
        district: loc.district,
      }));

      let machines: { machineId: string; machine_details_id: string; sub_location_id: string }[] =
        [];

      if (area_id) {
        const parentLocation = await LocationModel.findById(area_id).select(
          "area_name state district"
        );

        // Get all sub-locations that belong to this location
        const subLocations = await SubLocationModel.find({ location_id: area_id }).select("_id");
        const subLocationIds = subLocations.map(sl => sl._id);

        if (subLocationIds.length > 0) {
          const machineDetails = await MachineDetailsModel.find({
            sub_location_id: { $in: subLocationIds },
          }).select("machineId sub_location_id");

          machines = machineDetails
            .filter(m => m.machineId)
            .map(m => ({
              machineId: m.machineId,
              machine_details_id: (m._id as any).toString(),
              sub_location_id: m.sub_location_id.toString(),
              // Always include area context so response shape is consistent
              area_name: parentLocation?.area_name ?? null,
              state: parentLocation?.state ?? null,
              district: parentLocation?.district ?? null,
            }));

          machines.sort((a, b) => (a.machineId ?? "").localeCompare(b.machineId ?? ""));
        }
      } else {
        const allMachineDetails = await MachineDetailsModel.find().select(
          "machineId sub_location_id"
        );

        const subLocMap = new Map<string, any>();
        const allSubLocs = await SubLocationModel.find().select("_id location_id");
        allSubLocs.forEach(sl => subLocMap.set((sl._id as any).toString(), sl.location_id));

        const locMap = new Map<string, any>();
        const allLocs = await LocationModel.find().select("_id area_name state district");
        allLocs.forEach(loc => locMap.set((loc._id as any).toString(), loc));

        machines = allMachineDetails
          .filter(m => m.machineId)
          .map(m => {
            const locId = subLocMap.get(m.sub_location_id.toString())?.toString();
            const loc = locId ? locMap.get(locId) : null;
            return {
              machineId: m.machineId,
              machine_details_id: (m._id as any).toString(),
              sub_location_id: m.sub_location_id.toString(),
              area_name: loc?.area_name ?? null,
              state: loc?.state ?? null,
              district: loc?.district ?? null,
            };
          });

        machines.sort((a, b) => (a.machineId ?? "").localeCompare(b.machineId ?? ""));
      }

      res.status(200).json({
        success: true,
        data: {
          states,
          districts,
          areas,
          machines,
        },
        meta: {
          total_states: states.length,
          total_districts: districts.length,
          total_areas: areas.length,
          total_machines: machines.length,
          filters_applied: {
            state: state ?? null,
            district: district ?? null,
            area_id: area_id ?? null,
          },
        },
      });
    } catch (error: any) {
      logger.error("Get location filter options error:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to fetch location filter options",
      });
    }
  }
}

export const priceOverrideController = new PriceOverrideController();
