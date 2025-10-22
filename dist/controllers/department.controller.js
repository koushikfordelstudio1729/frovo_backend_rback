"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.removeMember = exports.addMembers = exports.deleteDepartment = exports.updateDepartment = exports.getDepartmentById = exports.getDepartments = exports.createDepartment = void 0;
const models_1 = require("../models");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const response_util_1 = require("../utils/response.util");
const constants_1 = require("../config/constants");
exports.createDepartment = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    try {
        const department = await models_1.Department.create({
            ...req.body,
            createdBy: req.user._id
        });
        return (0, response_util_1.sendCreated)(res, department, 'Department created successfully');
    }
    catch (error) {
        if (error.code === 11000) {
            return (0, response_util_1.sendError)(res, 'Department with this name already exists', 409);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to create department', 500);
        }
    }
});
exports.getDepartments = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 10, search, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const filter = {};
    if (search) {
        filter.$or = [
            { name: { $regex: search, $options: 'i' } },
            { description: { $regex: search, $options: 'i' } }
        ];
    }
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    const skip = (Number(page) - 1) * Number(limit);
    try {
        const [departments, total] = await Promise.all([
            models_1.Department.find(filter)
                .populate('roles', 'name key')
                .populate('members', 'name email')
                .populate('createdBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(Number(limit)),
            models_1.Department.countDocuments(filter)
        ]);
        (0, response_util_1.sendPaginatedResponse)(res, departments, Number(page), Number(limit), total);
    }
    catch (error) {
        (0, response_util_1.sendError)(res, 'Failed to get departments', 500);
    }
});
exports.getDepartmentById = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    try {
        const department = await models_1.Department.findById(id)
            .populate('roles', 'name key systemRole')
            .populate('members', 'name email status')
            .populate('createdBy', 'name email');
        if (!department) {
            return (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.DEPARTMENT_NOT_FOUND);
        }
        return (0, response_util_1.sendSuccess)(res, department);
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to get department', 500);
    }
});
exports.updateDepartment = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    try {
        const department = await models_1.Department.findByIdAndUpdate(id, req.body, { new: true, runValidators: true })
            .populate('roles', 'name key')
            .populate('members', 'name email')
            .populate('createdBy', 'name email');
        if (!department) {
            return (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.DEPARTMENT_NOT_FOUND);
        }
        return (0, response_util_1.sendSuccess)(res, department, constants_1.MESSAGES.UPDATED);
    }
    catch (error) {
        if (error.code === 11000) {
            return (0, response_util_1.sendError)(res, 'Department with this name already exists', 409);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to update department', 500);
        }
    }
});
exports.deleteDepartment = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    try {
        const department = await models_1.Department.findById(id);
        if (!department) {
            return (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.DEPARTMENT_NOT_FOUND);
        }
        if (department.members.length > 0 || department.roles.length > 0) {
            return (0, response_util_1.sendError)(res, constants_1.MESSAGES.DEPARTMENT_IN_USE, 400);
        }
        await models_1.Department.findByIdAndDelete(id);
        return (0, response_util_1.sendSuccess)(res, null, constants_1.MESSAGES.DELETED);
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to delete department', 500);
    }
});
exports.addMembers = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    const { userIds } = req.body;
    try {
        const department = await models_1.Department.findByIdAndUpdate(id, { $addToSet: { members: { $each: userIds } } }, { new: true })
            .populate('members', 'name email');
        if (!department) {
            return (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.DEPARTMENT_NOT_FOUND);
        }
        return (0, response_util_1.sendSuccess)(res, department, 'Members added successfully');
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to add members', 500);
    }
});
exports.removeMember = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id, userId } = req.params;
    try {
        const department = await models_1.Department.findByIdAndUpdate(id, { $pull: { members: userId } }, { new: true })
            .populate('members', 'name email');
        if (!department) {
            return (0, response_util_1.sendNotFound)(res, constants_1.MESSAGES.DEPARTMENT_NOT_FOUND);
        }
        return (0, response_util_1.sendSuccess)(res, department, 'Member removed successfully');
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to remove member', 500);
    }
});
//# sourceMappingURL=department.controller.js.map