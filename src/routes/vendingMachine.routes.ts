import { Router } from "express";
import * as vendingMachineController from "../controllers/vendingMachine.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

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

router.use(authenticate);

router.get("/machines/:machineId/stats", vendingMachineController.getMachineStats);
router.get("/internal/:id", vendingMachineController.getVendingMachineById);

export default router;
