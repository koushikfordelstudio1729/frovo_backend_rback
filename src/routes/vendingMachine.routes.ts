import { Router } from "express";
import * as vendingMachineController from "../controllers/vendingMachine.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// Public routes (accessible to customers)
router.get("/machines", vendingMachineController.getAllVendingMachines);
router.get("/machines/locations", vendingMachineController.getVendingMachinesByLocation);
router.get("/machines/filters/locations", vendingMachineController.getLocationFilters);
router.get("/machines/:machineId", vendingMachineController.getVendingMachineByMachineId);
router.get("/machines/:machineId/products", vendingMachineController.getVendingMachineProducts);
router.get(
  "/machines/:machineId/slots/:slotNumber/availability",
  vendingMachineController.checkProductAvailability
);
router.get("/search-products", vendingMachineController.searchProductAcrossMachines);

// Protected routes (require authentication)
router.use(authenticate);

router.get("/machines/:machineId/stats", vendingMachineController.getMachineStats);
router.get("/internal/:id", vendingMachineController.getVendingMachineById);

export default router;
