// routes/machine.routes.ts
import express from "express";
import {
  createMachine,
  getAllMachines,
  getMachineById,
  updateMachine,
  deleteMachine,
  addRacks,
  getMachineRacks,
  getRackById,
  updateRack,
  deleteRack,
  getMachinesByType,
  getActiveMachines,
  updateRacksBatch,
  getMachineSlots,
  getSlotById,
  toggleDoorStatus,
  updateDoorStatus,
  toggleConnectivityStatus,
  updateConnectivityStatus,
  toggleMachineStatus,
  updateMachineStatusWithBody,
  toggleUnderMaintenance,
  updateUnderMaintenance,
  toggleDecommissioned,
  updateDecommissioned,
  getAuditTrailsByMachineId,
  getAuditTrailsSummary,
  exportAuditTrails,
  getAllMachinesAuditTrails,
  exportAllMachinesAuditTrails,
  exportAllMachines,
  exportMachineById,
  getMachineDashboard,
  getMachineDashboardStats,
  exportMachineDashboard,
  checkMachineExists,
} from "../controllers/VM.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
const router = express.Router();

// ========== MACHINE ROUTES ==========
router.post("/machines", authenticate, authorize(["super_admin", "ops_manager"]), createMachine);
router.get("/machines", authenticate, authorize(["super_admin", "ops_manager"]), getAllMachines);
router.get(
  "/machines/active",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  getActiveMachines
);
router.get(
  "/machines/type/:machineType",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  getMachinesByType
);
router.get(
  "/machines/:machineId",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  getMachineById
);
router.put(
  "/machines/:machineId",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  updateMachine
);
router.delete(
  "/machines/:machineId",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  deleteMachine
);
router.get(
  "/machines/:machineId/exists",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  checkMachineExists
);
//Status routes
router.patch(
  "/machines/:machineId/door/toggle",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  toggleDoorStatus
);
router.patch(
  "/machines/:machineId/door",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  updateDoorStatus
);
router.patch(
  "/machines/:machineId/connectivity/toggle",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  toggleConnectivityStatus
);
router.patch(
  "/machines/:machineId/connectivity",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  updateConnectivityStatus
);
router.patch(
  "/machines/:machineId/status/toggle",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  toggleMachineStatus
);
router.patch(
  "/machines/:machineId/status",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  updateMachineStatusWithBody
);
router.patch(
  "/machines/:machineId/maintenance/toggle",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  toggleUnderMaintenance
);
router.patch(
  "/machines/:machineId/maintenance",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  updateUnderMaintenance
);
router.patch(
  "/machines/:machineId/decommissioned/toggle",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  toggleDecommissioned
);
router.patch(
  "/machines/:machineId/decommissioned",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  updateDecommissioned
);

// Audit trail routes
router.get(
  "/:machineId/audit-trails",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  getAuditTrailsByMachineId
);
router.get(
  "/:machineId/audit-trails/summary",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  getAuditTrailsSummary
);
router.get(
  "/:machineId/audit-trails/export",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  exportAuditTrails
);
router.get(
  "/audit-trails/all",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  getAllMachinesAuditTrails
);
router.get(
  "/audit-trails/all/export",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  exportAllMachinesAuditTrails
);
router.get(
  "/:machineId/audit-trails/export",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  exportAuditTrails
);
router.get(
  "/audit-trails/all",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  getAllMachinesAuditTrails
);
router.get(
  "/audit-trails/all/export",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  exportAllMachinesAuditTrails
);

// Machine export routes
router.get(
  "/export/all",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  exportAllMachines
);
router.get(
  "/:machineId/export",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  exportMachineById
);

// ========== RACK ROUTES ==========
router.post(
  "/machines/:machineId/racks",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  addRacks
);
router.get(
  "/machines/:machineId/racks",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  getMachineRacks
);
router.put(
  "/machines/:machineId/racks/batch",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  updateRacksBatch
);
router.get("/racks/:rackId", authenticate, authorize(["super_admin", "ops_manager"]), getRackById);
router.put(
  "/machines/:machineId/racks/:rackId",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  updateRack
);
router.delete(
  "/machines/:machineId/racks/:rackId",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  deleteRack
);
router.put(
  "/machines/:machineId/racks/batch",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  updateRacksBatch
);
router.get("/racks/:rackId", authenticate, authorize(["super_admin", "ops_manager"]), getRackById);
router.put(
  "/machines/:machineId/racks/:rackId",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  updateRack
);
router.delete(
  "/machines/:machineId/racks/:rackId",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  deleteRack
);
router.get(
  "/dashboard",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  getMachineDashboard
);
router.get(
  "/dashboard/stats",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  getMachineDashboardStats
);
router.get(
  "/dashboard/export",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  exportMachineDashboard
);

//extra routes
router.get(
  "/machines/:machineId/slots",
  authenticate,
  authorize(["super_admin", "ops_manager"]),
  getMachineSlots
);
router.get("/slots/:slotId", authenticate, authorize(["super_admin", "ops_manager"]), getSlotById);
export default router;
