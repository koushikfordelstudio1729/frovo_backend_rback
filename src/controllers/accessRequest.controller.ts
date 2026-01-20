import { Request, Response } from "express";
import { AccessRequest, AccessRequestStatus, User } from "../models";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendPaginatedResponse,
} from "../utils/response.util";
import { MESSAGES } from "../config/constants";

export const createAccessRequest = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }

  try {
    const accessRequest = await AccessRequest.create({
      ...req.body,
      requester: req.user._id,
    });

    return sendCreated(res, accessRequest, MESSAGES.ACCESS_REQUEST_CREATED);
  } catch (error) {
    return sendError(res, "Failed to create access request", 500);
  }
});

export const getAccessRequests = asyncHandler(async (req: Request, res: Response) => {
  const {
    page = 1,
    limit = 10,
    status,
    requester,
    startDate,
    endDate,
    sortBy = "createdAt",
    sortOrder = "desc",
  } = req.query;

  const filter: any = {};

  if (status) filter.status = status;
  if (requester) filter.requester = requester;

  if (startDate || endDate) {
    filter.createdAt = {};
    if (startDate) filter.createdAt.$gte = new Date(startDate as string);
    if (endDate) filter.createdAt.$lte = new Date(endDate as string);
  }

  const sort: any = {};
  sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

  const skip = (Number(page) - 1) * Number(limit);

  try {
    const [requests, total] = await Promise.all([
      AccessRequest.find(filter)
        .populate("requester", "name email")
        .populate("requestedRole", "name key")
        .populate("approver", "name email")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      AccessRequest.countDocuments(filter),
    ]);

    sendPaginatedResponse(res, requests, Number(page), Number(limit), total);
  } catch (error) {
    sendError(res, "Failed to get access requests", 500);
  }
});

export const getAccessRequestById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const request = await AccessRequest.findById(id)
      .populate("requester", "name email")
      .populate("requestedRole", "name key permissions")
      .populate("approver", "name email");

    if (!request) {
      return sendNotFound(res, "Access request not found");
    }

    return sendSuccess(res, request);
  } catch (error) {
    return sendError(res, "Failed to get access request", 500);
  }
});

export const approveAccessRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }

  try {
    const request = await AccessRequest.findById(id)
      .populate("requester")
      .populate("requestedRole");

    if (!request) {
      return sendNotFound(res, "Access request not found");
    }

    if (request.status !== AccessRequestStatus.PENDING) {
      return sendError(res, "Only pending requests can be approved", 400);
    }

    // Update request status
    request.status = AccessRequestStatus.APPROVED;
    request.approver = req.user._id;
    request.approvedAt = new Date();

    // Assign role or permissions to user
    if (request.requestedRole) {
      await User.findByIdAndUpdate(request.requester._id, {
        $addToSet: { roles: request.requestedRole._id },
      });
    }

    await request.save();

    return sendSuccess(res, request, MESSAGES.ACCESS_REQUEST_APPROVED);
  } catch (error) {
    return sendError(res, "Failed to approve access request", 500);
  }
});

export const rejectAccessRequest = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }

  try {
    const request = await AccessRequest.findById(id);

    if (!request) {
      return sendNotFound(res, "Access request not found");
    }

    if (request.status !== AccessRequestStatus.PENDING) {
      return sendError(res, "Only pending requests can be rejected", 400);
    }

    request.status = AccessRequestStatus.REJECTED;
    request.approver = req.user._id;
    request.rejectedAt = new Date();

    await request.save();

    return sendSuccess(res, request, MESSAGES.ACCESS_REQUEST_REJECTED);
  } catch (error) {
    return sendError(res, "Failed to reject access request", 500);
  }
});
