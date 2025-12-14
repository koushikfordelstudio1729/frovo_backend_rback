// middleware/warehouseScope.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { Warehouse } from '../models/Warehouse.model';
import { Types } from 'mongoose';

/**
 * Middleware to automatically scope warehouse operations for warehouse managers
 * This ensures warehouse managers can only access data for their assigned warehouse
 */
export const warehouseScopeMiddleware = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip if user is not authenticated
    if (!req.user) {
      return next();
    }

    // Check if user is a warehouse manager
    const isWarehouseManager = req.user.roles?.some(
      (role: any) => role.systemRole === 'warehouse_manager' || role.systemRole === 'warehouse_staff'
    );

    // If not a warehouse manager, proceed without modification
    if (!isWarehouseManager) {
      return next();
    }

    // Find the warehouse assigned to this manager
    const warehouse = await Warehouse.findOne({
      manager: req.user._id,
      isActive: true
    }).lean();

    if (!warehouse) {
      return res.status(403).json({
        success: false,
        message: 'No warehouse assigned to your account. Please contact the administrator.',
        timestamp: new Date().toISOString()
      });
    }

    // Inject warehouse ID into the request
    // For GET requests, add to query params
    if (req.method === 'GET') {
      req.query.warehouseId = warehouse._id.toString();
    }

    // For POST/PUT/PATCH requests, add to body
    if (['POST', 'PUT', 'PATCH'].includes(req.method)) {
      req.body.warehouse = warehouse._id.toString();
    }

    // Attach warehouse info to request for easy access
    (req as any).assignedWarehouse = {
      _id: warehouse._id,
      name: warehouse.name,
      code: warehouse.code,
      location: warehouse.location
    };

    console.log(`🏢 Warehouse scope applied: ${warehouse.code} (${warehouse.name})`);
    next();
  } catch (error) {
    console.error('❌ Warehouse scope middleware error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error applying warehouse scope',
      timestamp: new Date().toISOString()
    });
  }
};

/**
 * Middleware to validate warehouse access
 * Ensures warehouse managers can only access their assigned warehouse
 */
export const validateWarehouseAccess = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    // Skip if user is not authenticated
    if (!req.user) {
      return next();
    }

    // Check if user is a warehouse manager
    const isWarehouseManager = req.user.roles?.some(
      (role: any) => role.systemRole === 'warehouse_manager' || role.systemRole === 'warehouse_staff'
    );

    // Super admin and other roles can access any warehouse
    if (!isWarehouseManager) {
      return next();
    }

    // Get requested warehouse ID from params, query, or body
    const requestedWarehouseId =
      req.params.warehouseId ||
      req.query.warehouseId ||
      req.body.warehouse ||
      req.body.warehouseId;

    if (!requestedWarehouseId) {
      // No specific warehouse requested, let warehouseScopeMiddleware handle it
      return next();
    }

    // Find the warehouse assigned to this manager
    const assignedWarehouse = await Warehouse.findOne({
      manager: req.user._id,
      isActive: true
    }).lean();

    if (!assignedWarehouse) {
      return res.status(403).json({
        success: false,
        message: 'No warehouse assigned to your account.',
        timestamp: new Date().toISOString()
      });
    }

    // Validate that the requested warehouse matches the assigned warehouse
    if (requestedWarehouseId !== assignedWarehouse._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: You can only access your assigned warehouse.',
        data: {
          yourWarehouse: {
            id: assignedWarehouse._id,
            name: assignedWarehouse.name,
            code: assignedWarehouse.code
          }
        },
        timestamp: new Date().toISOString()
      });
    }

    next();
  } catch (error) {
    console.error('❌ Warehouse access validation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Error validating warehouse access',
      timestamp: new Date().toISOString()
    });
  }
};
