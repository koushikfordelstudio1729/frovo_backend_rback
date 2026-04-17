import express from "express";
import { AreaController } from "../controllers/arearoute.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { uploadAreaFiles } from "../middleware/upload.middleware";

const MANAGEMENT = ["super_admin", "area_manager"];
const STAFF = ["super_admin", "area_manager", "area_staff"];

const router = express.Router();

router.use(authenticate);

router.post("/location", authorize(STAFF), AreaController.createLocation);

// Get all locations
router.get("/location", authorize(STAFF), AreaController.getAllLocations);

// Export routes MUST come before parameterized routes
router.get("/location/export", authorize(STAFF), AreaController.exportLocations);

router.get("/location/export/:ids", authorize(STAFF), AreaController.exportLocationById);

// Check location exists
router.get("/location/check-exists", authorize(STAFF), AreaController.checkLocationExists);

// PARAMETERIZED ROUTES (come after specific routes)
router.get("/location/:locationId", authorize(STAFF), AreaController.getLocationById);
router.put("/location/:locationId", authorize(STAFF), AreaController.updateLocation);
router.delete("/location/:locationId", authorize(STAFF), AreaController.deleteLocation);
router.patch(
  "/location/:locationId/toggle-status",
  authorize(MANAGEMENT),
  AreaController.toggleLocationStatus
);

router.post("/location/:locationId/sublocation", authorize(STAFF), AreaController.addSubLocation);
router.get(
  "/location/:locationId/sublocation",
  authorize(STAFF),
  AreaController.getSubLocationsByLocationId
);
router.delete("/sublocation/:subLocationId", authorize(STAFF), AreaController.deleteSubLocation);
// Update sub-location
router.put("/sublocation/:subLocationId", authorize(STAFF), AreaController.updateSubLocation);

router.get(
  "/location/:locationId/sublocation/export",
  authorize(STAFF),
  AreaController.exportSubLocationsByLocationId
);

router.get(
  "/sublocation/:subLocationId/audit-logs",
  authorize(STAFF),
  AreaController.getAuditLogsBySubLocationId
);

router.get(
  "/sublocation/:subLocationId/machine",
  authorize(STAFF),
  AreaController.getMachineDetailsBySubLocationId
);

// ── Machine routes: STATIC paths first, then PARAMETERIZED ────────────────────

// Static GET routes (must be declared before /machine/:id to avoid param capture)
router.get("/machine/search", authorize(STAFF), AreaController.searchMachines);
router.get("/machine/unassigned", authorize(STAFF), AreaController.getUnassignedMachines);

// Parameterized machine CRUD
router.put(
  "/machine/:machineDetailsId",
  uploadAreaFiles,
  authorize(STAFF),
  AreaController.updateMachineDetails
);
router.delete("/machine/:machineDetailsId", authorize(STAFF), AreaController.removeMachine);
router.delete(
  "/machine/:machineDetailsId/images/:imageIndex",
  authorize(STAFF),
  AreaController.removeMachineImage
);
router.patch(
  "/machine/:machineDetailsId/toggle-status",
  authorize(MANAGEMENT),
  AreaController.toggleMachineStatus
);
router.patch(
  "/machine/:machineDetailsId/toggle-installed",
  authorize(MANAGEMENT),
  AreaController.toggleMachineInstalledStatus
);
router.get(
  "/machine/:machineId/allotment-status",
  authorize(STAFF),
  AreaController.checkMachineAllotmentStatus
);
router.put(
  "/machine/:machineDetailsId/images",
  uploadAreaFiles,
  authorize(STAFF),
  AreaController.updateMachineImages
);

router.get("/location/:locationId/audit-logs", authorize(STAFF), AreaController.getAuditLogs);
router.get(
  "/location/:locationId/audit-logs/export",
  authorize(STAFF),
  AreaController.exportLocationAuditLogs
);
router.get("/audit/recent-activities", authorize(STAFF), AreaController.getRecentActivities);
router.get(
  "/audit/recent-activities/export",
  authorize(STAFF),
  AreaController.exportRecentAuditActivities
);

router.get("/dashboard/data", authorize(STAFF), AreaController.getDashboardData);
router.get("/dashboard/table", authorize(STAFF), AreaController.getDashboardTableData);
router.get("/dashboard/export", authorize(STAFF), AreaController.exportDashboardData);
router.get("/filter/options", authorize(STAFF), AreaController.getFilterOptions);

export default router;
