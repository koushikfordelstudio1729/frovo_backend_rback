"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVendor = exports.getVendors = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const Vendor_model_1 = require("../models/Vendor.model");
const responseHandlers_1 = require("../utils/responseHandlers");
exports.getVendors = (0, express_async_handler_1.default)(async (_req, res) => {
    try {
        const vendors = await Vendor_model_1.Vendor.find({})
            .populate('createdBy', 'name email')
            .sort({ name: 1 });
        (0, responseHandlers_1.sendSuccess)(res, vendors, 'Vendors retrieved successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get vendors', 500);
    }
});
exports.createVendor = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user) {
        return (0, responseHandlers_1.sendError)(res, 'Unauthorized', 401);
    }
    try {
        const vendor = await Vendor_model_1.Vendor.create({
            ...req.body,
            createdBy: req.user._id
        });
        (0, responseHandlers_1.sendSuccess)(res, vendor, 'Vendor created successfully', 201);
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to create vendor', 500);
    }
});
