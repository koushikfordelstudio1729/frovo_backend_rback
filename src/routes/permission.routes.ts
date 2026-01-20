import { Router } from "express";
import * as permissionController from "../controllers/permission.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get all permissions grouped by module
router.get(
  "/",
  authenticate, // All authenticated users can view permissions
  permissionController.getPermissions
);

// Check if user has specific permission
router.get("/check", authenticate, permissionController.checkPermission);

// Get permissions by module
router.get("/module/:module", authenticate, permissionController.getPermissionsByModule);

// Search permissions
router.get("/search", authenticate, permissionController.searchPermissions);

// Get permission statistics
router.get("/stats", requirePermission("audit:view"), permissionController.getPermissionStats);

export default router;
