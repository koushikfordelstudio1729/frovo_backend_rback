import express from "express";
import { AreaController } from "../controllers/arearoute.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { uploadAreaFiles } from "../middleware/upload.middleware";

const SUPER_ADMIN_ONLY = ["super_admin"];
const MANAGEMENT = ["super_admin", "ops_manager", ""];

const router = express.Router();

router.use(authenticate);

// Toggle machine status (active ↔ inactive)
router.patch(
  "/area/:id/machine/:machineId/toggle",
  authorize(MANAGEMENT),
  AreaController.toggleMachineStatus
);
// Toggle machine installed_status (installed ↔ not_installed)
router.patch(
  "/area/:areaId/machine/:machineId/toggle-installed",
  authorize(MANAGEMENT),
  AreaController.toggleMachineInstalledStatus
);
router.get("/area/:id/audit-logs", authorize(SUPER_ADMIN_ONLY), AreaController.getAuditLogs);
router.get(
  "/area/:id/audit-logs/export",
  authorize(SUPER_ADMIN_ONLY),
  AreaController.exportAreaAuditLogs
);
router.delete(
  "/area/:id/machine/:machineId",
  authorize(MANAGEMENT),
  AreaController.removeMachineFromArea
);
router.get(
  "/area/audit/recent-activities",
  authorize(SUPER_ADMIN_ONLY),
  AreaController.getRecentActivities
);
router.get(
  "/area/audit/recent-activities/export",
  authorize(SUPER_ADMIN_ONLY),
  AreaController.exportRecentAuditActivities
);

router.post("/area", uploadAreaFiles, authorize(MANAGEMENT), AreaController.createAreaRoute);

router.get("/area", authorize(MANAGEMENT), AreaController.getAllAreaRoutes);

router.get("/area/:id", authorize(MANAGEMENT), AreaController.getAreaRouteById);

router.put("/area/:id", authorize(MANAGEMENT), AreaController.updateAreaRoute);

router.delete("/area/:id", authorize(MANAGEMENT), AreaController.deleteAreaRoute);

router.post("/area/:id/add-sublocation", authorize(MANAGEMENT), AreaController.addSubLocation);

router.patch("/area/:id/toggle-status", authorize(MANAGEMENT), AreaController.toggleAreaStatus);

router.get("/area/filter/options", authorize(MANAGEMENT), AreaController.getFilterOptions);

router.get("/area/check-exists", authorize(MANAGEMENT), AreaController.checkAreaExists);

router.get("/area/bulk/export", authorize(MANAGEMENT), AreaController.exportAreas);

router.get("/dashboard/data", authorize(MANAGEMENT), AreaController.getDashboardData);

router.get("/dashboard/table", authorize(MANAGEMENT), AreaController.getDashboardTable);

router.get("/dashboard/export", authorize(MANAGEMENT), AreaController.exportDashboardData);

router.get("/export/:id", authorize(MANAGEMENT), AreaController.exportAreasByIds);

export default router;