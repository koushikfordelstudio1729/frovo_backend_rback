import express from "express";
import { AreaController } from "../controllers/arearoute.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { uploadAreaFiles } from "../middleware/upload.middleware";

const SUPER_ADMIN_ONLY = ["super_admin"];
const MANAGEMENT = ["super_admin", "ops_manager", ""];

const router = express.Router();

router.use(authenticate);

// ============================================
// LOCATION ROUTES (SPECIFIC ROUTES FIRST)
// ============================================

// Create location
router.post("/location", authorize(MANAGEMENT), AreaController.createLocation);

// Get all locations
router.get("/location", authorize(MANAGEMENT), AreaController.getAllLocations);

// Export routes MUST come before parameterized routes
router.get("/location/export", authorize(MANAGEMENT), AreaController.exportLocations);
router.get("/location/export/:ids", authorize(MANAGEMENT), AreaController.exportLocationsByIds);

// Bulk operations
router.get("/location/bulk/summarized", authorize(MANAGEMENT), AreaController.getSummarizedLocationsByIds);

// Check location exists
router.get("/location/check-exists", authorize(MANAGEMENT), AreaController.checkLocationExists);

// PARAMETERIZED ROUTES (come after specific routes)
router.get("/location/:locationId", authorize(MANAGEMENT), AreaController.getLocationById);
router.put("/location/:locationId", authorize(MANAGEMENT), AreaController.updateLocation);
router.delete("/location/:locationId", authorize(MANAGEMENT), AreaController.deleteLocation);
router.patch("/location/:locationId/toggle-status", authorize(MANAGEMENT), AreaController.toggleLocationStatus);

// ============================================
// SUB-LOCATION ROUTES
// ============================================

router.post("/location/:locationId/sublocation", authorize(MANAGEMENT), AreaController.addSubLocation);
router.get("/location/:locationId/sublocation", authorize(MANAGEMENT), AreaController.getSubLocationsByLocationId);
router.delete("/sublocation/:subLocationId", authorize(MANAGEMENT), AreaController.deleteSubLocation);
// Update sub-location
router.put(
  "/sublocation/:subLocationId",
  authorize(MANAGEMENT),
  AreaController.updateSubLocation
);

// Export sub-locations by location ID
router.get(
  "/location/:locationId/sublocation/export",
  authorize(MANAGEMENT),
  AreaController.exportSubLocationsByLocationId
);

// Get audit logs by sub-location ID
router.get(
  "/sublocation/:subLocationId/audit-logs",
  authorize(SUPER_ADMIN_ONLY),
  AreaController.getAuditLogsBySubLocationId
);
// ============================================
// MACHINE DETAILS ROUTES
// ============================================

router.get("/sublocation/:subLocationId/machine", authorize(MANAGEMENT), AreaController.getMachineDetailsBySubLocationId);
router.put("/machine/:machineDetailsId", uploadAreaFiles, authorize(MANAGEMENT), AreaController.updateMachineDetails);
router.delete("/machine/:machineDetailsId", authorize(MANAGEMENT), AreaController.removeMachine);
router.delete("/machine/:machineDetailsId/images/:imageIndex", authorize(MANAGEMENT), AreaController.removeMachineImage);
router.patch("/machine/:machineDetailsId/toggle-status", authorize(MANAGEMENT), AreaController.toggleMachineStatus);
router.patch("/machine/:machineDetailsId/toggle-installed", authorize(MANAGEMENT), AreaController.toggleMachineInstalledStatus);
router.get("/machine/search", authorize(MANAGEMENT), AreaController.searchMachines);
router.put("/machine/:machineDetailsId/images",uploadAreaFiles,authorize(MANAGEMENT),AreaController.updateMachineImages);


router.get("/location/:locationId/audit-logs", authorize(SUPER_ADMIN_ONLY), AreaController.getAuditLogs);
router.get("/location/:locationId/audit-logs/export", authorize(SUPER_ADMIN_ONLY), AreaController.exportLocationAuditLogs);
router.get("/audit/recent-activities", authorize(SUPER_ADMIN_ONLY), AreaController.getRecentActivities);
router.get("/audit/recent-activities/export", authorize(SUPER_ADMIN_ONLY), AreaController.exportRecentAuditActivities);

// ============================================
// DASHBOARD & ANALYTICS ROUTES
// ============================================

router.get("/dashboard/data", authorize(MANAGEMENT), AreaController.getDashboardData);
router.get("/dashboard/table", authorize(MANAGEMENT), AreaController.getDashboardTableData);
router.get("/dashboard/export", authorize(MANAGEMENT), AreaController.exportDashboardData);
router.get("/filter/options", authorize(MANAGEMENT), AreaController.getFilterOptions);

export default router;