"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mockPaymentFailure = exports.mockPaymentSuccess = exports.getMachinePaymentStats = exports.getUserPaymentStats = exports.processRefund = exports.confirmPayment = exports.processPaymentWebhook = exports.getUserPayments = exports.getPayment = exports.initiatePayment = void 0;
const payment_service_1 = require("../services/payment.service");
const order_service_1 = require("../services/order.service");
const Payment_model_1 = require("../models/Payment.model");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const response_util_1 = require("../utils/response.util");
exports.initiatePayment = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_util_1.sendError)(res, "User not authenticated", 401);
        }
        const { orderId, paymentMethod, paymentGateway } = req.body;
        if (!orderId || !paymentMethod || !paymentGateway) {
            return (0, response_util_1.sendError)(res, "Order ID, payment method, and payment gateway are required", 400);
        }
        if (!Object.values(Payment_model_1.PaymentMethod).includes(paymentMethod)) {
            return (0, response_util_1.sendError)(res, "Invalid payment method", 400);
        }
        if (!Object.values(Payment_model_1.PaymentGateway).includes(paymentGateway)) {
            return (0, response_util_1.sendError)(res, "Invalid payment gateway", 400);
        }
        const order = await order_service_1.orderService.getOrderById(orderId, userId);
        const paymentData = {
            orderId,
            userId,
            amount: order.totalAmount,
            paymentMethod,
            paymentGateway,
        };
        const result = await payment_service_1.paymentService.initiatePayment(paymentData);
        return (0, response_util_1.sendSuccess)(res, result, "Payment initiated successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to initiate payment", 500);
        }
    }
});
exports.getPayment = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { paymentId } = req.params;
        const userId = req.user?.id;
        if (!paymentId) {
            return (0, response_util_1.sendError)(res, "Payment ID is required", 400);
        }
        const payment = await payment_service_1.paymentService.getPaymentById(paymentId, userId);
        return (0, response_util_1.sendSuccess)(res, payment, "Payment retrieved successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, error.message.includes("not found") ? 404 : 400);
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to retrieve payment", 500);
        }
    }
});
exports.getUserPayments = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_util_1.sendError)(res, "User not authenticated", 401);
        }
        const { page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const result = await payment_service_1.paymentService.getPaymentsByUser(userId, limitNum, skip);
        return (0, response_util_1.sendSuccess)(res, result, "User payments retrieved successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to retrieve user payments", 500);
        }
    }
});
exports.processPaymentWebhook = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const webhookData = req.body;
        if (!webhookData.paymentId || !webhookData.gatewayTransactionId || !webhookData.status) {
            return (0, response_util_1.sendError)(res, "Invalid webhook data", 400);
        }
        const payment = await payment_service_1.paymentService.processPaymentWebhook(webhookData);
        return (0, response_util_1.sendSuccess)(res, payment, "Payment webhook processed successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to process payment webhook", 500);
        }
    }
});
exports.confirmPayment = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { paymentId, gatewayTransactionId, signature } = req.body;
        if (!paymentId) {
            return (0, response_util_1.sendError)(res, "Payment ID is required", 400);
        }
        const webhookData = {
            paymentId,
            gatewayTransactionId: gatewayTransactionId || `MANUAL_${Date.now()}`,
            signature,
            status: "success",
        };
        const payment = await payment_service_1.paymentService.processPaymentWebhook(webhookData);
        return (0, response_util_1.sendSuccess)(res, payment, "Payment confirmed successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to confirm payment", 500);
        }
    }
});
exports.processRefund = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { paymentId } = req.params;
        const { refundAmount, reason } = req.body;
        if (!paymentId) {
            return (0, response_util_1.sendError)(res, "Payment ID is required", 400);
        }
        if (!refundAmount || refundAmount <= 0) {
            return (0, response_util_1.sendError)(res, "Valid refund amount is required", 400);
        }
        if (!reason) {
            return (0, response_util_1.sendError)(res, "Refund reason is required", 400);
        }
        const refundData = {
            paymentId,
            refundAmount,
            reason,
        };
        const refund = await payment_service_1.paymentService.processRefund(refundData);
        return (0, response_util_1.sendSuccess)(res, refund, "Refund processed successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to process refund", 500);
        }
    }
});
exports.getUserPaymentStats = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_util_1.sendError)(res, "User not authenticated", 401);
        }
        const stats = await payment_service_1.paymentService.getPaymentStats(userId);
        return (0, response_util_1.sendSuccess)(res, stats, "User payment statistics retrieved successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to retrieve payment statistics", 500);
        }
    }
});
exports.getMachinePaymentStats = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { machineId } = req.params;
        if (!machineId) {
            return (0, response_util_1.sendError)(res, "Machine ID is required", 400);
        }
        const stats = await payment_service_1.paymentService.getPaymentStats(undefined, machineId);
        return (0, response_util_1.sendSuccess)(res, stats, "Machine payment statistics retrieved successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to retrieve machine payment statistics", 500);
        }
    }
});
exports.mockPaymentSuccess = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { paymentId } = req.params;
        if (!paymentId) {
            return (0, response_util_1.sendError)(res, "Payment ID is required", 400);
        }
        const webhookData = {
            paymentId,
            gatewayTransactionId: `MOCK_SUCCESS_${Date.now()}`,
            status: "success",
            rawResponse: { mockPayment: true },
        };
        const payment = await payment_service_1.paymentService.processPaymentWebhook(webhookData);
        return (0, response_util_1.sendSuccess)(res, payment, "Mock payment completed successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to complete mock payment", 500);
        }
    }
});
exports.mockPaymentFailure = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { paymentId } = req.params;
        if (!paymentId) {
            return (0, response_util_1.sendError)(res, "Payment ID is required", 400);
        }
        const webhookData = {
            paymentId,
            gatewayTransactionId: `MOCK_FAILED_${Date.now()}`,
            status: "failed",
            errorCode: "PAYMENT_FAILED",
            errorMessage: "Mock payment failure for testing",
            rawResponse: { mockPayment: true },
        };
        const payment = await payment_service_1.paymentService.processPaymentWebhook(webhookData);
        return (0, response_util_1.sendSuccess)(res, payment, "Mock payment failed successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to fail mock payment", 500);
        }
    }
});
