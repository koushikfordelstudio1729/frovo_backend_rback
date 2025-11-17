import { Router } from 'express';
import * as paymentController from '../controllers/payment.controller';
import { authenticate } from '../middleware/auth.middleware';

const router = Router();

// Public webhook endpoint (no auth required for payment gateway webhooks)
router.post('/webhook', paymentController.processPaymentWebhook);

// Mock payment endpoints for testing (no auth required for easier testing)
router.post('/mock/:paymentId/success', paymentController.mockPaymentSuccess);
router.post('/mock/:paymentId/failure', paymentController.mockPaymentFailure);

// All other payment routes require authentication
router.use(authenticate);

// Customer payment routes
router.post('/initiate', paymentController.initiatePayment);
router.post('/confirm', paymentController.confirmPayment);
router.get('/my-payments', paymentController.getUserPayments);
router.get('/my-stats', paymentController.getUserPaymentStats);
router.get('/:paymentId', paymentController.getPayment);

// Admin/Refund routes (can be protected with role-based middleware later)
router.post('/:paymentId/refund', paymentController.processRefund);
router.get('/machine/:machineId/stats', paymentController.getMachinePaymentStats);

export default router;