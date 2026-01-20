import { Request, Response } from "express";
import { Department } from "../models";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendPaginatedResponse,
} from "../utils/response.util";
import { MESSAGES } from "../config/constants";

export const createDepartment = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }

  try {
    const department = await Department.create({
      ...req.body,
      createdBy: req.user._id,
    });

    return sendCreated(res, department, "Department created successfully");
  } catch (error: any) {
    if (error.code === 11000) {
      return sendError(res, "Department with this name already exists", 409);
    } else {
      return sendError(res, "Failed to create department", 500);
    }
  }
});

export const getDepartments = asyncHandler(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, search, sortBy = "createdAt", sortOrder = "desc" } = req.query;

  const filter: any = {};

  if (search) {
    filter.$or = [
      { name: { $regex: search, $options: "i" } },
      { description: { $regex: search, $options: "i" } },
    ];
  }

  const sort: any = {};
  sort[sortBy as string] = sortOrder === "asc" ? 1 : -1;

  const skip = (Number(page) - 1) * Number(limit);

  try {
    const [departments, total] = await Promise.all([
      Department.find(filter)
        .populate("roles", "name key")
        .populate("members", "name email")
        .populate("createdBy", "name email")
        .sort(sort)
        .skip(skip)
        .limit(Number(limit)),
      Department.countDocuments(filter),
    ]);

    sendPaginatedResponse(res, departments, Number(page), Number(limit), total);
  } catch (error) {
    sendError(res, "Failed to get departments", 500);
  }
});

export const getDepartmentById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const department = await Department.findById(id)
      .populate("roles", "name key systemRole")
      .populate("members", "name email status")
      .populate("createdBy", "name email");

    if (!department) {
      return sendNotFound(res, MESSAGES.DEPARTMENT_NOT_FOUND);
    }

    return sendSuccess(res, department);
  } catch (error) {
    return sendError(res, "Failed to get department", 500);
  }
});

export const updateDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const department = await Department.findByIdAndUpdate(id, req.body, {
      new: true,
      runValidators: true,
    })
      .populate("roles", "name key")
      .populate("members", "name email")
      .populate("createdBy", "name email");

    if (!department) {
      return sendNotFound(res, MESSAGES.DEPARTMENT_NOT_FOUND);
    }

    return sendSuccess(res, department, MESSAGES.UPDATED);
  } catch (error: any) {
    if (error.code === 11000) {
      return sendError(res, "Department with this name already exists", 409);
    } else {
      return sendError(res, "Failed to update department", 500);
    }
  }
});

export const deleteDepartment = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  try {
    const department = await Department.findById(id);

    if (!department) {
      return sendNotFound(res, MESSAGES.DEPARTMENT_NOT_FOUND);
    }

    // Check if department has members or roles
    if (department.members.length > 0 || department.roles.length > 0) {
      return sendError(res, MESSAGES.DEPARTMENT_IN_USE, 400);
    }

    await Department.findByIdAndDelete(id);

    return sendSuccess(res, null, MESSAGES.DELETED);
  } catch (error) {
    return sendError(res, "Failed to delete department", 500);
  }
});

export const addMembers = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userIds } = req.body;

  try {
    const department = await Department.findByIdAndUpdate(
      id,
      { $addToSet: { members: { $each: userIds } } },
      { new: true }
    ).populate("members", "name email");

    if (!department) {
      return sendNotFound(res, MESSAGES.DEPARTMENT_NOT_FOUND);
    }

    return sendSuccess(res, department, "Members added successfully");
  } catch (error) {
    return sendError(res, "Failed to add members", 500);
  }
});

export const removeMember = asyncHandler(async (req: Request, res: Response) => {
  const { id, userId } = req.params;

  try {
    const department = await Department.findByIdAndUpdate(
      id,
      { $pull: { members: userId } },
      { new: true }
    ).populate("members", "name email");

    if (!department) {
      return sendNotFound(res, MESSAGES.DEPARTMENT_NOT_FOUND);
    }

    return sendSuccess(res, department, "Member removed successfully");
  } catch (error) {
    return sendError(res, "Failed to remove member", 500);
  }
});
