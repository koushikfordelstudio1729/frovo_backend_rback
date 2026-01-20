"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRoleUsers = exports.updateRolePermissions = exports.getRolePermissions = exports.cloneRole = exports.assignRole = exports.deleteRole = exports.publishRole = exports.updateRole = exports.getRoleById = exports.getRoles = exports.createRole = void 0;
const role_service_1 = require("../services/role.service");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const response_util_1 = require("../utils/response.util");
const constants_1 = require("../config/constants");
exports.createRole = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    try {
        const role = await role_service_1.roleService.createRole(req.body, req.user._id);
        return (0, response_util_1.sendCreated)(res, role, "Role created successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to create role", 500);
        }
    }
});
exports.getRoles = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const result = await role_service_1.roleService.getRoles(req.query);
        return (0, response_util_1.sendPaginatedResponse)(res, result.roles, result.page, result.limit, result.total, "Roles retrieved successfully");
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, "Failed to get roles", 500);
    }
});
exports.getRoleById = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return (0, response_util_1.sendError)(res, "Role ID is required", 400);
    }
    try {
        const role = await role_service_1.roleService.getRoleById(id);
        return (0, response_util_1.sendSuccess)(res, role);
    }
    catch (error) {
        if (error instanceof Error && error.message === "Role not found") {
            return (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.ROLE_NOT_FOUND);
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to get role", 500);
        }
    }
});
exports.updateRole = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return (0, response_util_1.sendError)(res, "Role ID is required", 400);
    }
    try {
        const role = await role_service_1.roleService.updateRole(id, req.body);
        return (0, response_util_1.sendSuccess)(res, role, constants_1.MESSAGES.UPDATED);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === "Role not found") {
                return (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.ROLE_NOT_FOUND);
            }
            else {
                return (0, response_util_1.sendError)(res, error.message, 400);
            }
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to update role", 500);
        }
    }
});
exports.publishRole = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return (0, response_util_1.sendError)(res, "Role ID is required", 400);
    }
    try {
        const role = await role_service_1.roleService.publishRole(id);
        return (0, response_util_1.sendSuccess)(res, role, "Role published successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === "Role not found") {
                return (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.ROLE_NOT_FOUND);
            }
            else {
                return (0, response_util_1.sendError)(res, error.message, 400);
            }
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to publish role", 500);
        }
    }
});
exports.deleteRole = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return (0, response_util_1.sendError)(res, "Role ID is required", 400);
    }
    try {
        await role_service_1.roleService.deleteRole(id);
        return (0, response_util_1.sendSuccess)(res, null, constants_1.MESSAGES.DELETED);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === "Role not found") {
                return (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.ROLE_NOT_FOUND);
            }
            else {
                return (0, response_util_1.sendError)(res, error.message, 400);
            }
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to delete role", 500);
        }
    }
});
exports.assignRole = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { userIds } = req.body;
    if (!id) {
        return (0, response_util_1.sendError)(res, "Role ID is required", 400);
    }
    try {
        const result = await role_service_1.roleService.assignRoleToUsers(id, userIds);
        return (0, response_util_1.sendSuccess)(res, result, "Role assigned successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === "Role not found") {
                return (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.ROLE_NOT_FOUND);
            }
            else {
                return (0, response_util_1.sendError)(res, error.message, 400);
            }
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to assign role", 500);
        }
    }
});
exports.cloneRole = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    if (!id) {
        return (0, response_util_1.sendError)(res, "Role ID is required", 400);
    }
    try {
        const role = await role_service_1.roleService.cloneRole(id, name, description, req.user._id);
        return (0, response_util_1.sendCreated)(res, role, "Role cloned successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === "Role not found") {
                return (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.ROLE_NOT_FOUND);
            }
            else {
                return (0, response_util_1.sendError)(res, error.message, 400);
            }
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to clone role", 500);
        }
    }
});
exports.getRolePermissions = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return (0, response_util_1.sendError)(res, "Role ID is required", 400);
    }
    try {
        const permissions = await role_service_1.roleService.getRolePermissions(id);
        return (0, response_util_1.sendSuccess)(res, { permissions });
    }
    catch (error) {
        if (error instanceof Error && error.message === "Role not found") {
            return (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.ROLE_NOT_FOUND);
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to get role permissions", 500);
        }
    }
});
exports.updateRolePermissions = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { permissions } = req.body;
    if (!id) {
        return (0, response_util_1.sendError)(res, "Role ID is required", 400);
    }
    try {
        const role = await role_service_1.roleService.updateRolePermissions(id, permissions);
        return (0, response_util_1.sendSuccess)(res, role, "Role permissions updated successfully");
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === "Role not found") {
                return (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.ROLE_NOT_FOUND);
            }
            else {
                return (0, response_util_1.sendError)(res, error.message, 400);
            }
        }
        else {
            return (0, response_util_1.sendError)(res, "Failed to update role permissions", 500);
        }
    }
});
exports.getRoleUsers = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return (0, response_util_1.sendError)(res, "Role ID is required", 400);
    }
    try {
        const users = await role_service_1.roleService.getRoleUsers(id);
        return (0, response_util_1.sendSuccess)(res, users);
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, "Failed to get role users", 500);
    }
});
