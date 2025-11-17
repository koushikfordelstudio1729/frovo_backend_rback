"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchUsers = exports.updateUserPassword = exports.removeRole = exports.assignRoles = exports.getUserPermissions = exports.deleteUser = exports.updateUserStatus = exports.updateUser = exports.getUserById = exports.getUsers = exports.createUser = void 0;
const user_service_1 = require("../services/user.service");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const response_util_1 = require("../utils/response.util");
const constants_1 = require("../config/constants");
exports.createUser = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    try {
        const user = await user_service_1.userService.createUser(req.body, req.user._id);
        return (0, response_util_1.sendCreated)(res, user, 'User created successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to create user', 500);
        }
    }
});
exports.getUsers = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const query = {
            page: parseInt(req.query['page'] || '1', 10),
            limit: parseInt(req.query['limit'] || '10', 10),
            search: req.query['search'],
            role: req.query['role'],
            department: req.query['department'],
            status: req.query['status'],
            sortBy: req.query['sortBy'] || 'createdAt',
            sortOrder: req.query['sortOrder'] || 'desc'
        };
        const result = await user_service_1.userService.getUsers(query);
        (0, response_util_1.sendPaginatedResponse)(res, result.users, result.page, result.limit, result.total, 'Users retrieved successfully');
    }
    catch (error) {
        (0, response_util_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get users', 500);
    }
});
exports.getUserById = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const user = await user_service_1.userService.getUserById(req.params['id']);
        (0, response_util_1.sendSuccess)(res, user);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'User not found') {
            (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.USER_NOT_FOUND);
        }
        else {
            (0, response_util_1.sendError)(res, 'Failed to get user', 500);
        }
    }
});
exports.updateUser = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const user = await user_service_1.userService.updateUser(req.params['id'], req.body);
        (0, response_util_1.sendSuccess)(res, user, constants_1.MESSAGES.UPDATED);
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'User not found') {
                (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.USER_NOT_FOUND);
            }
            else {
                (0, response_util_1.sendError)(res, error.message, 400);
            }
        }
        else {
            (0, response_util_1.sendError)(res, 'Failed to update user', 500);
        }
    }
});
exports.updateUserStatus = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { status } = req.body;
    try {
        const user = await user_service_1.userService.updateUserStatus(req.params['id'], status);
        (0, response_util_1.sendSuccess)(res, user, 'User status updated successfully');
    }
    catch (error) {
        if (error instanceof Error && error.message === 'User not found') {
            (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.USER_NOT_FOUND);
        }
        else {
            (0, response_util_1.sendError)(res, 'Failed to update user status', 500);
        }
    }
});
exports.deleteUser = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        await user_service_1.userService.deleteUser(req.params['id']);
        (0, response_util_1.sendSuccess)(res, null, constants_1.MESSAGES.DELETED);
    }
    catch (error) {
        if (error instanceof Error && error.message === 'User not found') {
            (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.USER_NOT_FOUND);
        }
        else {
            (0, response_util_1.sendError)(res, 'Failed to delete user', 500);
        }
    }
});
exports.getUserPermissions = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const permissions = await user_service_1.userService.getUserPermissions(req.params['id']);
        (0, response_util_1.sendSuccess)(res, { permissions });
    }
    catch (error) {
        if (error instanceof Error && error.message === 'User not found') {
            (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.USER_NOT_FOUND);
        }
        else {
            (0, response_util_1.sendError)(res, 'Failed to get user permissions', 500);
        }
    }
});
exports.assignRoles = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { roleIds } = req.body;
    try {
        const user = await user_service_1.userService.assignRoles(req.params['id'], roleIds);
        (0, response_util_1.sendSuccess)(res, user, 'Roles assigned successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === 'User not found') {
                (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.USER_NOT_FOUND);
            }
            else {
                (0, response_util_1.sendError)(res, error.message, 400);
            }
        }
        else {
            (0, response_util_1.sendError)(res, 'Failed to assign roles', 500);
        }
    }
});
exports.removeRole = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const user = await user_service_1.userService.removeRole(req.params['id'], req.params['roleId']);
        (0, response_util_1.sendSuccess)(res, user, 'Role removed successfully');
    }
    catch (error) {
        if (error instanceof Error && error.message === 'User not found') {
            (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.USER_NOT_FOUND);
        }
        else {
            (0, response_util_1.sendError)(res, 'Failed to remove role', 500);
        }
    }
});
exports.updateUserPassword = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { newPassword } = req.body;
    try {
        await user_service_1.userService.updatePassword(req.params['id'], newPassword);
        (0, response_util_1.sendSuccess)(res, null, 'Password updated successfully');
    }
    catch (error) {
        if (error instanceof Error && error.message === 'User not found') {
            (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.USER_NOT_FOUND);
        }
        else {
            (0, response_util_1.sendError)(res, 'Failed to update password', 500);
        }
    }
});
exports.searchUsers = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { q, limit } = req.query;
    if (!q) {
        return (0, response_util_1.sendError)(res, 'Search query is required', 400);
    }
    try {
        const users = await user_service_1.userService.searchUsers(q, limit ? parseInt(limit) : 10);
        (0, response_util_1.sendSuccess)(res, users);
    }
    catch (error) {
        (0, response_util_1.sendError)(res, 'Failed to search users', 500);
    }
});
