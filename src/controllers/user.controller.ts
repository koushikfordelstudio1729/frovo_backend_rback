import { Request, Response } from "express";
import { userService } from "../services/user.service";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendPaginatedResponse,
} from "../utils/response.util";
import { MESSAGES } from "../config/constants";

export const createUser = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  if (!(req as any).user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }

  try {
    const user = await userService.createUser(req.body, (req as any).user._id);

    return sendCreated(res, user, "User created successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Failed to create user", 500);
    }
  }
});

export const getUsers = asyncHandler(async (req: Request, res: Response) => {
  try {
    // Provide default query parameters
    const query = {
      page: parseInt((req.query["page"] as string) || "1", 10),
      limit: parseInt((req.query["limit"] as string) || "10", 10),
      search: req.query["search"] as string,
      role: req.query["role"] as string,
      department: req.query["department"] as string,
      status: req.query["status"] as any,
      sortBy: (req.query["sortBy"] as string) || "createdAt",
      sortOrder: (req.query["sortOrder"] as "asc" | "desc") || "desc",
    };

    const result = await userService.getUsers(query);

    sendPaginatedResponse(
      res,
      result.users,
      result.page,
      result.limit,
      result.total,
      "Users retrieved successfully"
    );
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : "Failed to get users", 500);
  }
});

export const getUserById = asyncHandler(async (req: Request, res: Response) => {
  try {
    const user = await userService.getUserById(req.params["id"]!);

    sendSuccess(res, user);
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      sendNotFound(res, MESSAGES.USER_NOT_FOUND);
    } else {
      sendError(res, "Failed to get user", 500);
    }
  }
});

export const updateUser = asyncHandler(async (req: Request, res: Response) => {
  try {
    const user = await userService.updateUser(req.params["id"]!, req.body);

    sendSuccess(res, user, MESSAGES.UPDATED);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        sendNotFound(res, MESSAGES.USER_NOT_FOUND);
      } else {
        sendError(res, error.message, 400);
      }
    } else {
      sendError(res, "Failed to update user", 500);
    }
  }
});

export const updateUserStatus = asyncHandler(async (req: Request, res: Response) => {
  const { status } = req.body;

  try {
    const user = await userService.updateUserStatus(req.params["id"]!, status);

    sendSuccess(res, user, "User status updated successfully");
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      sendNotFound(res, MESSAGES.USER_NOT_FOUND);
    } else {
      sendError(res, "Failed to update user status", 500);
    }
  }
});

export const deleteUser = asyncHandler(async (req: Request, res: Response) => {
  try {
    await userService.deleteUser(req.params["id"]!);

    sendSuccess(res, null, MESSAGES.DELETED);
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      sendNotFound(res, MESSAGES.USER_NOT_FOUND);
    } else {
      sendError(res, "Failed to delete user", 500);
    }
  }
});

export const getUserPermissions = asyncHandler(async (req: Request, res: Response) => {
  try {
    const permissions = await userService.getUserPermissions(req.params["id"]!);

    sendSuccess(res, { permissions });
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      sendNotFound(res, MESSAGES.USER_NOT_FOUND);
    } else {
      sendError(res, "Failed to get user permissions", 500);
    }
  }
});

export const assignRoles = asyncHandler(async (req: Request, res: Response) => {
  const { roleIds } = req.body;

  try {
    const user = await userService.assignRoles(req.params["id"]!, roleIds);

    sendSuccess(res, user, "Roles assigned successfully");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "User not found") {
        sendNotFound(res, MESSAGES.USER_NOT_FOUND);
      } else {
        sendError(res, error.message, 400);
      }
    } else {
      sendError(res, "Failed to assign roles", 500);
    }
  }
});

export const removeRole = asyncHandler(async (req: Request, res: Response) => {
  try {
    const user = await userService.removeRole(req.params["id"]!, req.params["roleId"]!);

    sendSuccess(res, user, "Role removed successfully");
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      sendNotFound(res, MESSAGES.USER_NOT_FOUND);
    } else {
      sendError(res, "Failed to remove role", 500);
    }
  }
});

export const updateUserPassword = asyncHandler(async (req: Request, res: Response) => {
  const { newPassword } = req.body;

  try {
    await userService.updatePassword(req.params["id"]!, newPassword);

    sendSuccess(res, null, "Password updated successfully");
  } catch (error) {
    if (error instanceof Error && error.message === "User not found") {
      sendNotFound(res, MESSAGES.USER_NOT_FOUND);
    } else {
      sendError(res, "Failed to update password", 500);
    }
  }
});

export const searchUsers = asyncHandler(async (req: Request, res: Response): Promise<any> => {
  const { q, limit } = req.query;

  if (!q) {
    return sendError(res, "Search query is required", 400);
  }

  try {
    const users = await userService.searchUsers(
      q as string,
      limit ? parseInt(limit as string) : 10
    );

    sendSuccess(res, users);
  } catch (error) {
    sendError(res, "Failed to search users", 500);
  }
});
