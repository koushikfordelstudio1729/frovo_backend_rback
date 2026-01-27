import { Request, Response } from "express";
import {
  createPriceOverrideService,
  CreatePriceOverrideDTO,
  UpdatePriceOverrideDTO,
  PriceOverrideFilterDTO,
} from "../services/priceOverride.service";
import { logger } from "../utils/logger.util";

class PriceOverrideController {
  // Create price override
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

      // Validation
      if (!data.sku_id) {
        res.status(400).json({
          success: false,
          message: "SKU ID is required",
        });
        return;
      }

      if (data.override_price === undefined || isNaN(data.override_price)) {
        res.status(400).json({
          success: false,
          message: "Valid override price is required",
        });
        return;
      }

      if (!data.start_date || !data.end_date) {
        res.status(400).json({
          success: false,
          message: "Start date and end date are required",
        });
        return;
      }

      if (!data.reason) {
        res.status(400).json({
          success: false,
          message: "Reason for override is required",
        });
        return;
      }

      // At least one location level must be specified
      if (!data.state && !data.district && !data.area_id && !data.machine_id) {
        res.status(400).json({
          success: false,
          message: "At least one location level (state, district, area, or machine) is required",
        });
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
      res.status(400).json({
        success: false,
        message: error.message || "Failed to create price override",
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

  // Get effective price for a SKU at a location/machine
  async getEffectivePrice(req: Request, res: Response): Promise<void> {
    try {
      const { skuId } = req.params;
      const service = createPriceOverrideService(req);

      const result = await service.getEffectivePrice(
        skuId,
        req.query.machine_id as string,
        req.query.area_id as string,
        req.query.district as string,
        req.query.state as string
      );

      res.status(200).json({
        success: true,
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

      const result = await service.getPriceOverrideHistory({
        price_override_id: id,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      });

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      logger.error("Get history by override ID error:", error);
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
        message = "No overrides needed to be expired. All active overrides are still within their valid date range.";
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
}

export const priceOverrideController = new PriceOverrideController();
