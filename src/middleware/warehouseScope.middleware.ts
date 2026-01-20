import { Request, Response, NextFunction } from "express";
import { Warehouse } from "../models/Warehouse.model";
import { Types } from "mongoose";

import { logger } from "../utils/logger.util";
export const warehouseScopeMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next();
    }

    const isWarehouseManager = req.user.roles?.some(
      (role: any) =>
        role.systemRole === "warehouse_manager" || role.systemRole === "warehouse_staff"
    );

    if (!isWarehouseManager) {
      return next();
    }

    const warehouse = await Warehouse.findOne({
      manager: req.user._id,
      isActive: true,
    }).lean();

    if (!warehouse) {
      return res.status(403).json({
        success: false,
        message: "No warehouse assigned to your account. Please contact the administrator.",
        timestamp: new Date().toISOString(),
      });
    }

    if (req.method === "GET") {
      req.query.warehouseId = warehouse._id.toString();
    }

    if (["POST", "PUT", "PATCH"].includes(req.method)) {
      req.body.warehouse = warehouse._id.toString();
    }

    (req as any).assignedWarehouse = {
      _id: warehouse._id,
      name: warehouse.name,
      code: warehouse.code,
      location: warehouse.location,
    };

    logger.info(`🏢 Warehouse scope applied: ${warehouse.code} (${warehouse.name})`);
    next();
  } catch (error) {
    logger.error("❌ Warehouse scope middleware error:", error);
    return res.status(500).json({
      success: false,
      message: "Error applying warehouse scope",
      timestamp: new Date().toISOString(),
    });
  }
};

export const validateWarehouseAccess = async (req: Request, res: Response, next: NextFunction) => {
  try {
    if (!req.user) {
      return next();
    }

    const isWarehouseManager = req.user.roles?.some(
      (role: any) =>
        role.systemRole === "warehouse_manager" || role.systemRole === "warehouse_staff"
    );

    if (!isWarehouseManager) {
      return next();
    }

    const requestedWarehouseId =
      req.params.warehouseId || req.query.warehouseId || req.body.warehouse || req.body.warehouseId;

    if (!requestedWarehouseId) {
      return next();
    }

    const assignedWarehouse = await Warehouse.findOne({
      manager: req.user._id,
      isActive: true,
    }).lean();

    if (!assignedWarehouse) {
      return res.status(403).json({
        success: false,
        message: "No warehouse assigned to your account.",
        timestamp: new Date().toISOString(),
      });
    }

    if (requestedWarehouseId !== assignedWarehouse._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Access denied: You can only access your assigned warehouse.",
        data: {
          yourWarehouse: {
            id: assignedWarehouse._id,
            name: assignedWarehouse.name,
            code: assignedWarehouse.code,
          },
        },
        timestamp: new Date().toISOString(),
      });
    }

    next();
  } catch (error) {
    logger.error("❌ Warehouse access validation error:", error);
    return res.status(500).json({
      success: false,
      message: "Error validating warehouse access",
      timestamp: new Date().toISOString(),
    });
  }
};
