// routes/machine.routes.ts
import express from "express";
import {
  createMachine,
  getAllMachines,
  getMachineById,
  updateMachine,
  deleteMachine,
  updateMachineStatus, // This was missing
  addRacks,
  getMachineRacks,
  getRackById,
  updateRack,
  deleteRack,
  getMachineWithRacks,
} from "../controllers/vendingMachine.controller";

const router = express.Router();

// Machine routes
router.post("/machines", createMachine);
router.get("/machines", getAllMachines);
router.get("/machines/:machineId", getMachineById);
router.put("/machines/:machineId", updateMachine);
router.delete("/machines/:machineId", deleteMachine);
router.patch("/machines/:machineId/status", updateMachineStatus); // Now it's defined

// Rack routes
router.post("/machines/:machineId/racks", addRacks);
router.get("/machines/:machineId/racks", getMachineRacks);
router.get("/machines/:machineId/with-racks", getMachineWithRacks);
router.get("/racks/:rackId", getRackById);
router.put("/racks/:rackId", updateRack);
router.delete("/racks/:rackId", deleteRack);

export default router;
