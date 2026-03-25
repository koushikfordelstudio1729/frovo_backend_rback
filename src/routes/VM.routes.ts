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
  occupySlot,
  freeSlot,
  updateSlotStatus,
  getAvailableSlots,
  getOccupiedSlots,
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
} from "../controllers/VM.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
const router = express.Router();

// ========== MACHINE ROUTES ==========

router.post(
  "/machines",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  createMachine
);
router.get(
  "/machines",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  getAllMachines
);
router.get(
  "/machines/active",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  getActiveMachines
);
router.get(
  "/machines/type/:machineType",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  getMachinesByType
);
router.get(
  "/machines/:machineId",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  getMachineById
);
router.put(
  "/machines/:machineId",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  updateMachine
);
router.delete(
  "/machines/:machineId",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  deleteMachine
);
//Status routes
router.patch(
  "/machines/:machineId/door/toggle",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  toggleDoorStatus
);
router.patch(
  "/machines/:machineId/door",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  updateDoorStatus
);
router.patch(
  "/machines/:machineId/connectivity/toggle",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  toggleConnectivityStatus
);
router.patch(
  "/machines/:machineId/connectivity",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  updateConnectivityStatus
);
router.patch(
  "/machines/:machineId/status/toggle",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  toggleMachineStatus
);
router.patch(
  "/machines/:machineId/status",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  updateMachineStatusWithBody
);
router.patch(
  "/machines/:machineId/maintenance/toggle",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  toggleUnderMaintenance
);
router.patch(
  "/machines/:machineId/maintenance",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  updateUnderMaintenance
);
router.patch(
  "/machines/:machineId/decommissioned/toggle",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  toggleDecommissioned
);
router.patch(
  "/machines/:machineId/decommissioned",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  updateDecommissioned
);

// Audit trail routes
router.get(
  "/:machineId/audit-trails",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  getAuditTrailsByMachineId
);
router.get(
  "/:machineId/audit-trails/summary",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  getAuditTrailsSummary
);
router.get(
  "/:machineId/audit-trails/export",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  exportAuditTrails
);
router.get(
  "/audit-trails/all",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  getAllMachinesAuditTrails
);
router.get(
  "/audit-trails/all/export",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  exportAllMachinesAuditTrails
);
// Machine export routes
router.get(
  "/export/all",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  exportAllMachines
);
router.get(
  "/:machineId/export",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  exportMachineById
);
// ========== RACK ROUTES ==========

router.post(
  "/machines/:machineId/racks",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  addRacks
);
router.get(
  "/machines/:machineId/racks",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  getMachineRacks
);
router.put(
  "/machines/:machineId/racks/batch",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  updateRacksBatch
);
router.get(
  "/racks/:rackId",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  getRackById
);
router.put(
  "/machines/:machineId/racks/:rackId",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  updateRack
);
router.delete(
  "/machines/:machineId/racks/:rackId",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  deleteRack
);

// ========== SLOT ROUTES ==========

router.get(
  "/machines/:machineId/slots",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  getMachineSlots
);
router.get(
  "/machines/:machineId/slots/available",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  getAvailableSlots
);
router.get(
  "/machines/:machineId/slots/occupied",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  getOccupiedSlots
);
router.get(
  "/slots/:slotId",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  getSlotById
);
router.post(
  "/slots/:slotId/occupy",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  occupySlot
);
router.post(
  "/slots/:slotId/free",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  freeSlot
);
router.patch(
  "/slots/:slotId/status",
  authenticate,
  authorize(["super_admin", "area_manager", "area_staff"]),
  updateSlotStatus
);

export default router;
