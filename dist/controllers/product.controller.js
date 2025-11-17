"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductCategories = exports.getProductsByCategory = exports.getAllProducts = exports.getProductById = void 0;
const product_service_1 = require("../services/product.service");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const response_util_1 = require("../utils/response.util");
exports.getProductById = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { id } = req.params;
        const product = await product_service_1.productService.getProductById(id);
        return (0, response_util_1.sendSuccess)(res, product, 'Product retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, error.message.includes('not found') ? 404 : 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve product', 500);
        }
    }
});
exports.getAllProducts = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { category, brand, isActive, search } = req.query;
        const filters = {
            category: category,
            brand: brand,
            isActive: isActive === 'true' ? true : isActive === 'false' ? false : undefined,
            search: search
        };
        const products = await product_service_1.productService.getAllProducts(filters);
        return (0, response_util_1.sendSuccess)(res, {
            products,
            total: products.length
        }, 'Products retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve products', 500);
        }
    }
});
exports.getProductsByCategory = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const { category } = req.params;
        const products = await product_service_1.productService.getProductsByCategory(category);
        return (0, response_util_1.sendSuccess)(res, {
            category,
            products,
            total: products.length
        }, 'Products by category retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve products by category', 500);
        }
    }
});
exports.getProductCategories = (0, asyncHandler_util_1.asyncHandler)(async (_req, res) => {
    try {
        const categories = await product_service_1.productService.getProductCategories();
        return (0, response_util_1.sendSuccess)(res, categories, 'Product categories retrieved successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to retrieve product categories', 500);
        }
    }
});
//# sourceMappingURL=product.controller.js.map