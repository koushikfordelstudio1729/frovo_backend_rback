"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMachineOrderStats = exports.getOrdersByMachine = exports.markItemDispensed = exports.updateOrderStatus = exports.getUserOrderStats = exports.cancelOrder = exports.getOrderSummary = exports.getUserOrders = exports.getOrder = exports.createOrder = void 0;
const order_service_1 = require("../services/order.service");
const Order_model_1 = require("../models/Order.model");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const response_util_1 = require("../utils/response.util");
exports.createOrder = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_util_1.sendError)(res, 'User not authenticated', 401);
        }
        const { paymentMethod, paymentGateway, notes } = req.body;
        if (!paymentMethod || !paymentGateway) {
            return (0, response_util_1.sendError)(res, 'Payment method and payment gateway are required', 400);
        }
        const orderData = {
            paymentMethod,
            paymentGateway,
            notes
        };
        const order = await order_service_1.orderService.createOrder(userId, orderData);
        return (0, response_util_1.sendSuccess)(res, order, 'Order created successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to create order', 500);
        }
    }
});
exports.getOrder = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user?.id;
        if (!orderId) {
            return (0, response_util_1.sendError)(res, 'Order ID is required', 400);
        }
        const order = await order_service_1.orderService.getOrderById(orderId, userId);
        return (0, response_util_1.sendSuccess)(res, order, 'Order retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, error.message.includes('not found') ? 404 : 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve order', 500);
        }
    }
});
exports.getUserOrders = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_util_1.sendError)(res, 'User not authenticated', 401);
        }
        const { status, page = 1, limit = 10 } = req.query;
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const result = await order_service_1.orderService.getUserOrders(userId, status, limitNum, skip);
        return (0, response_util_1.sendSuccess)(res, result, 'User orders retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve user orders', 500);
        }
    }
});
exports.getOrderSummary = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { orderId } = req.params;
        const userId = req.user?.id;
        if (!orderId) {
            return (0, response_util_1.sendError)(res, 'Order ID is required', 400);
        }
        const summary = await order_service_1.orderService.getOrderSummary(orderId, userId);
        return (0, response_util_1.sendSuccess)(res, summary, 'Order summary retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, error.message.includes('not found') ? 404 : 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve order summary', 500);
        }
    }
});
exports.cancelOrder = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason } = req.body;
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_util_1.sendError)(res, 'User not authenticated', 401);
        }
        if (!orderId) {
            return (0, response_util_1.sendError)(res, 'Order ID is required', 400);
        }
        if (!reason) {
            return (0, response_util_1.sendError)(res, 'Cancellation reason is required', 400);
        }
        const order = await order_service_1.orderService.cancelOrder(orderId, userId, reason);
        return (0, response_util_1.sendSuccess)(res, order, 'Order cancelled successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, error.message.includes('not found') ? 404 : 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to cancel order', 500);
        }
    }
});
exports.getUserOrderStats = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_util_1.sendError)(res, 'User not authenticated', 401);
        }
        const stats = await order_service_1.orderService.getOrderStats(userId);
        return (0, response_util_1.sendSuccess)(res, stats, 'User order statistics retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve order statistics', 500);
        }
    }
});
exports.updateOrderStatus = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { orderId } = req.params;
        const { status, reason } = req.body;
        if (!orderId) {
            return (0, response_util_1.sendError)(res, 'Order ID is required', 400);
        }
        if (!status) {
            return (0, response_util_1.sendError)(res, 'Order status is required', 400);
        }
        if (!Object.values(Order_model_1.OrderStatus).includes(status)) {
            return (0, response_util_1.sendError)(res, 'Invalid order status', 400);
        }
        const order = await order_service_1.orderService.updateOrderStatus(orderId, status, reason);
        return (0, response_util_1.sendSuccess)(res, order, 'Order status updated successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, error.message.includes('not found') ? 404 : 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to update order status', 500);
        }
    }
});
exports.markItemDispensed = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { orderId } = req.params;
        const { productId, slotNumber } = req.body;
        if (!orderId || !productId || !slotNumber) {
            return (0, response_util_1.sendError)(res, 'Order ID, product ID, and slot number are required', 400);
        }
        const order = await order_service_1.orderService.markItemDispensed(orderId, productId, slotNumber);
        return (0, response_util_1.sendSuccess)(res, order, 'Item marked as dispensed successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, error.message.includes('not found') ? 404 : 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to mark item as dispensed', 500);
        }
    }
});
exports.getOrdersByMachine = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { machineId } = req.params;
        const { status, page = 1, limit = 20 } = req.query;
        if (!machineId) {
            return (0, response_util_1.sendError)(res, 'Machine ID is required', 400);
        }
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const skip = (pageNum - 1) * limitNum;
        const result = await order_service_1.orderService.getOrdersByMachine(machineId, status, limitNum, skip);
        return (0, response_util_1.sendSuccess)(res, result, 'Machine orders retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve machine orders', 500);
        }
    }
});
exports.getMachineOrderStats = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { machineId } = req.params;
        if (!machineId) {
            return (0, response_util_1.sendError)(res, 'Machine ID is required', 400);
        }
        const stats = await order_service_1.orderService.getOrderStats(undefined, machineId);
        return (0, response_util_1.sendSuccess)(res, stats, 'Machine order statistics retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve machine order statistics', 500);
        }
    }
});
//# sourceMappingURL=order.controller.js.map