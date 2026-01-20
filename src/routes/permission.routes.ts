import { Router } from "express";
import * as permissionController from "../controllers/permission.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";

const router = Router();

router.use(authenticate);

router.get("/", authenticate, permissionController.getPermissions);

router.get("/check", authenticate, permissionController.checkPermission);

router.get("/module/:module", authenticate, permissionController.getPermissionsByModule);

router.get("/search", authenticate, permissionController.searchPermissions);

router.get("/stats", requirePermission("audit:view"), permissionController.getPermissionStats);

export default router;
