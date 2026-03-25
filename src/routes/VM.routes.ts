// routes/machine.routes.ts
import express from "express";
import {
  createMachine,
  getAllMachines,
  getMachineById,
  updateMachine,
  deleteMachine,
  updateMachineStatus,
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
} from "../controllers/VM.controller";

const router = express.Router();

// ========== MACHINE ROUTES ==========

router.post("/machines", createMachine);
router.get("/machines", getAllMachines);
router.get("/machines/active", getActiveMachines);
router.get("/machines/type/:machineType", getMachinesByType);
router.get("/machines/:machineId", getMachineById);
router.put("/machines/:machineId", updateMachine);
router.patch("/machines/:machineId/status", updateMachineStatus);
router.delete("/machines/:machineId", deleteMachine);
//Status routes
router.patch("/machines/:machineId/door/toggle", toggleDoorStatus);
router.patch("/machines/:machineId/door", updateDoorStatus);

// ========== RACK ROUTES ==========

router.post("/machines/:machineId/racks", addRacks);
router.get("/machines/:machineId/racks", getMachineRacks);
router.put("/machines/:machineId/racks/batch", updateRacksBatch);
router.get("/racks/:rackId", getRackById);
router.put("/machines/:machineId/racks/:rackId", updateRack);
router.delete("/machines/:machineId/racks/:rackId", deleteRack);

// ========== SLOT ROUTES ==========

router.get("/machines/:machineId/slots", getMachineSlots);
router.get("/machines/:machineId/slots/available", getAvailableSlots);
router.get("/machines/:machineId/slots/occupied", getOccupiedSlots);
router.get("/slots/:slotId", getSlotById);
router.post("/slots/:slotId/occupy", occupySlot);
router.post("/slots/:slotId/free", freeSlot);
router.patch("/slots/:slotId/status", updateSlotStatus);

export default router;
