import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.use(authenticate);

router.post("/", orderController.createOrder);
router.get("/my-orders", orderController.getUserOrders);
router.get("/my-stats", orderController.getUserOrderStats);
router.get("/:orderId", orderController.getOrder);
router.get("/:orderId/summary", orderController.getOrderSummary);
router.put("/:orderId/cancel", orderController.cancelOrder);

router.put("/:orderId/status", orderController.updateOrderStatus);
router.put("/:orderId/dispense", orderController.markItemDispensed);
router.get("/machine/:machineId", orderController.getOrdersByMachine);
router.get("/machine/:machineId/stats", orderController.getMachineOrderStats);

export default router;
