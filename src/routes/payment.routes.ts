import { Router } from "express";
import * as paymentController from "../controllers/payment.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

router.post("/webhook", paymentController.processPaymentWebhook);

router.post("/mock/:paymentId/success", paymentController.mockPaymentSuccess);
router.post("/mock/:paymentId/failure", paymentController.mockPaymentFailure);

router.use(authenticate);

router.post("/initiate", paymentController.initiatePayment);
router.post("/confirm", paymentController.confirmPayment);
router.get("/my-payments", paymentController.getUserPayments);
router.get("/my-stats", paymentController.getUserPaymentStats);
router.get("/:paymentId", paymentController.getPayment);

router.post("/:paymentId/refund", paymentController.processRefund);
router.get("/machine/:machineId/stats", paymentController.getMachinePaymentStats);

export default router;
