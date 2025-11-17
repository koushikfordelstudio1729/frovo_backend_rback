"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPermissionStats = exports.searchPermissions = exports.getPermissionsByModule = exports.checkPermission = exports.getPermissions = void 0;
const permission_service_1 = require("../services/permission.service");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const response_util_1 = require("../utils/response.util");
exports.getPermissions = (0, asyncHandler_util_1.asyncHandler)(async (_req, res) => {
    try {
        const permissions = await permission_service_1.permissionService.getPermissionsGrouped();
        return (0, response_util_1.sendSuccess)(res, { permissions });
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to get permissions', 500);
    }
});
exports.checkPermission = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { permission, userId } = req.query;
    if (!permission) {
        return (0, response_util_1.sendError)(res, 'Permission parameter is required', 400);
    }
    const targetUserId = userId || req.user?._id.toString();
    if (!targetUserId) {
        return (0, response_util_1.sendError)(res, 'User ID is required', 400);
    }
    try {
        const result = await permission_service_1.permissionService.checkUserPermission(targetUserId, permission);
        return (0, response_util_1.sendSuccess)(res, result);
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to check permission', 500);
    }
});
exports.getPermissionsByModule = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { module } = req.params;
    if (!module) {
        return (0, response_util_1.sendError)(res, 'Module parameter is required', 400);
    }
    try {
        const permissions = await permission_service_1.permissionService.getPermissionsByModule(module);
        return (0, response_util_1.sendSuccess)(res, permissions);
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to get permissions by module', 500);
    }
});
exports.searchPermissions = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { q } = req.query;
    if (!q) {
        return (0, response_util_1.sendError)(res, 'Search query is required', 400);
    }
    try {
        const permissions = await permission_service_1.permissionService.searchPermissions(q);
        return (0, response_util_1.sendSuccess)(res, permissions);
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to search permissions', 500);
    }
});
exports.getPermissionStats = (0, asyncHandler_util_1.asyncHandler)(async (_req, res) => {
    try {
        const stats = await permission_service_1.permissionService.getPermissionStats();
        return (0, response_util_1.sendSuccess)(res, stats);
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to get permission stats', 500);
    }
});
