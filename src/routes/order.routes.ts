import { Router } from "express";
import * as orderController from "../controllers/order.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// All order routes require authentication
router.use(authenticate);

// Customer order routes
router.post("/", orderController.createOrder);
router.get("/my-orders", orderController.getUserOrders);
router.get("/my-stats", orderController.getUserOrderStats);
router.get("/:orderId", orderController.getOrder);
router.get("/:orderId/summary", orderController.getOrderSummary);
router.put("/:orderId/cancel", orderController.cancelOrder);

// Admin/Machine management routes (protected routes can be added later with role-based middleware)
router.put("/:orderId/status", orderController.updateOrderStatus);
router.put("/:orderId/dispense", orderController.markItemDispensed);
router.get("/machine/:machineId", orderController.getOrdersByMachine);
router.get("/machine/:machineId/stats", orderController.getMachineOrderStats);

export default router;
