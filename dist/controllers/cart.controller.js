"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getCartSummary = exports.validateCart = exports.clearCart = exports.removeFromCart = exports.updateCartItem = exports.addToCart = exports.getCart = void 0;
const cart_service_1 = require("../services/cart.service");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const response_util_1 = require("../utils/response.util");
exports.getCart = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_util_1.sendError)(res, 'User not authenticated', 401);
        }
        const cart = await cart_service_1.cartService.getCart(userId);
        return (0, response_util_1.sendSuccess)(res, cart, 'Cart retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve cart', 500);
        }
    }
});
exports.addToCart = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_util_1.sendError)(res, 'User not authenticated', 401);
        }
        const { productId, machineId, slotNumber, quantity } = req.body;
        if (!productId || !machineId || !slotNumber || !quantity) {
            return (0, response_util_1.sendError)(res, 'Product ID, machine ID, slot number, and quantity are required', 400);
        }
        if (quantity <= 0 || !Number.isInteger(quantity)) {
            return (0, response_util_1.sendError)(res, 'Quantity must be a positive integer', 400);
        }
        const cartData = {
            productId,
            machineId,
            slotNumber,
            quantity
        };
        const cart = await cart_service_1.cartService.addToCart(userId, cartData);
        return (0, response_util_1.sendSuccess)(res, cart, 'Item added to cart successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to add item to cart', 500);
        }
    }
});
exports.updateCartItem = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_util_1.sendError)(res, 'User not authenticated', 401);
        }
        const { productId, machineId, slotNumber } = req.params;
        const { quantity } = req.body;
        if (!productId || !machineId || !slotNumber) {
            return (0, response_util_1.sendError)(res, 'Product ID, machine ID, and slot number are required', 400);
        }
        if (quantity === undefined || quantity < 0 || !Number.isInteger(quantity)) {
            return (0, response_util_1.sendError)(res, 'Quantity must be a non-negative integer', 400);
        }
        const cart = await cart_service_1.cartService.updateCartItem(userId, productId, machineId, slotNumber, quantity);
        return (0, response_util_1.sendSuccess)(res, cart, 'Cart item updated successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to update cart item', 500);
        }
    }
});
exports.removeFromCart = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_util_1.sendError)(res, 'User not authenticated', 401);
        }
        const { productId, machineId, slotNumber } = req.params;
        if (!productId || !machineId || !slotNumber) {
            return (0, response_util_1.sendError)(res, 'Product ID, machine ID, and slot number are required', 400);
        }
        const cart = await cart_service_1.cartService.removeFromCart(userId, productId, machineId, slotNumber);
        return (0, response_util_1.sendSuccess)(res, cart, 'Item removed from cart successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to remove item from cart', 500);
        }
    }
});
exports.clearCart = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_util_1.sendError)(res, 'User not authenticated', 401);
        }
        const cart = await cart_service_1.cartService.clearCart(userId);
        return (0, response_util_1.sendSuccess)(res, cart, 'Cart cleared successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to clear cart', 500);
        }
    }
});
exports.validateCart = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_util_1.sendError)(res, 'User not authenticated', 401);
        }
        const validation = await cart_service_1.cartService.validateCartItems(userId);
        return (0, response_util_1.sendSuccess)(res, validation, 'Cart validation completed');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to validate cart', 500);
        }
    }
});
exports.getCartSummary = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const userId = req.user?.id;
        if (!userId) {
            return (0, response_util_1.sendError)(res, 'User not authenticated', 401);
        }
        const summary = await cart_service_1.cartService.getCartSummary(userId);
        return (0, response_util_1.sendSuccess)(res, summary, 'Cart summary retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to get cart summary', 500);
        }
    }
});
//# sourceMappingURL=cart.controller.js.map