"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rejectAccessRequest = exports.approveAccessRequest = exports.getAccessRequestById = exports.getAccessRequests = exports.createAccessRequest = void 0;
const models_1 = require("../models");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const response_util_1 = require("../utils/response.util");
const constants_1 = require("../config/constants");
exports.createAccessRequest = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    try {
        const accessRequest = await models_1.AccessRequest.create({
            ...req.body,
            requester: req.user._id
        });
        return (0, response_util_1.sendCreated)(res, accessRequest, constants_1.MESSAGES.ACCESS_REQUEST_CREATED);
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to create access request', 500);
    }
});
exports.getAccessRequests = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { page = 1, limit = 10, status, requester, startDate, endDate, sortBy = 'createdAt', sortOrder = 'desc' } = req.query;
    const filter = {};
    if (status)
        filter.status = status;
    if (requester)
        filter.requester = requester;
    if (startDate || endDate) {
        filter.createdAt = {};
        if (startDate)
            filter.createdAt.$gte = new Date(startDate);
        if (endDate)
            filter.createdAt.$lte = new Date(endDate);
    }
    const sort = {};
    sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
    const skip = (Number(page) - 1) * Number(limit);
    try {
        const [requests, total] = await Promise.all([
            models_1.AccessRequest.find(filter)
                .populate('requester', 'name email')
                .populate('requestedRole', 'name key')
                .populate('approver', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(Number(limit)),
            models_1.AccessRequest.countDocuments(filter)
        ]);
        (0, response_util_1.sendPaginatedResponse)(res, requests, Number(page), Number(limit), total);
    }
    catch (error) {
        (0, response_util_1.sendError)(res, 'Failed to get access requests', 500);
    }
});
exports.getAccessRequestById = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    try {
        const request = await models_1.AccessRequest.findById(id)
            .populate('requester', 'name email')
            .populate('requestedRole', 'name key permissions')
            .populate('approver', 'name email');
        if (!request) {
            return (0, response_util_1.sendNotFound)(res, 'Access request not found');
        }
        return (0, response_util_1.sendSuccess)(res, request);
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to get access request', 500);
    }
});
exports.approveAccessRequest = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    try {
        const request = await models_1.AccessRequest.findById(id)
            .populate('requester')
            .populate('requestedRole');
        if (!request) {
            return (0, response_util_1.sendNotFound)(res, 'Access request not found');
        }
        if (request.status !== models_1.AccessRequestStatus.PENDING) {
            return (0, response_util_1.sendError)(res, 'Only pending requests can be approved', 400);
        }
        request.status = models_1.AccessRequestStatus.APPROVED;
        request.approver = req.user._id;
        request.approvedAt = new Date();
        if (request.requestedRole) {
            await models_1.User.findByIdAndUpdate(request.requester._id, { $addToSet: { roles: request.requestedRole._id } });
        }
        await request.save();
        return (0, response_util_1.sendSuccess)(res, request, constants_1.MESSAGES.ACCESS_REQUEST_APPROVED);
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to approve access request', 500);
    }
});
exports.rejectAccessRequest = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { id } = req.params;
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    try {
        const request = await models_1.AccessRequest.findById(id);
        if (!request) {
            return (0, response_util_1.sendNotFound)(res, 'Access request not found');
        }
        if (request.status !== models_1.AccessRequestStatus.PENDING) {
            return (0, response_util_1.sendError)(res, 'Only pending requests can be rejected', 400);
        }
        request.status = models_1.AccessRequestStatus.REJECTED;
        request.approver = req.user._id;
        request.rejectedAt = new Date();
        await request.save();
        return (0, response_util_1.sendSuccess)(res, request, constants_1.MESSAGES.ACCESS_REQUEST_REJECTED);
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to reject access request', 500);
    }
});
//# sourceMappingURL=accessRequest.controller.js.map