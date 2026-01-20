"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateSecurityConfig = exports.getSecurityConfig = void 0;
const models_1 = require("../models");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const response_util_1 = require("../utils/response.util");
const constants_1 = require("../config/constants");
exports.getSecurityConfig = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    try {
        const config = await models_1.SecurityConfig.findOne({ organizationId: req.user._id });
        if (!config) {
            const defaultConfig = await models_1.SecurityConfig.create({
                organizationId: req.user._id,
                updatedBy: req.user._id,
            });
            return (0, response_util_1.sendSuccess)(res, defaultConfig);
        }
        return (0, response_util_1.sendSuccess)(res, config);
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, "Failed to get security configuration", 500);
    }
});
exports.updateSecurityConfig = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    try {
        const config = await models_1.SecurityConfig.findOneAndUpdate({ organizationId: req.user._id }, {
            ...req.body,
            updatedBy: req.user._id,
        }, {
            new: true,
            upsert: true,
            runValidators: true,
        });
        return (0, response_util_1.sendSuccess)(res, config, constants_1.MESSAGES.UPDATED);
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, "Failed to update security configuration", 500);
    }
});
