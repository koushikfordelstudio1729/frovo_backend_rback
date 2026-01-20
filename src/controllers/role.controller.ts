import { Request, Response } from "express";
import { roleService } from "../services/role.service";
import { asyncHandler } from "../utils/asyncHandler.util";
import {
  sendSuccess,
  sendCreated,
  sendError,
  sendNotFound,
  sendPaginatedResponse,
} from "../utils/response.util";
import { MESSAGES } from "../config/constants";

export const createRole = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }

  try {
    const role = await roleService.createRole(req.body, req.user._id);

    return sendCreated(res, role, "Role created successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Failed to create role", 500);
    }
  }
});

export const getRoles = asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await roleService.getRoles(req.query as any);

    return sendPaginatedResponse(
      res,
      result.roles,
      result.page,
      result.limit,
      result.total,
      "Roles retrieved successfully"
    );
  } catch (error) {
    return sendError(res, "Failed to get roles", 500);
  }
});

export const getRoleById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return sendError(res, "Role ID is required", 400);
  }

  try {
    const role = await roleService.getRoleById(id);

    return sendSuccess(res, role);
  } catch (error) {
    if (error instanceof Error && error.message === "Role not found") {
      return sendNotFound(res, MESSAGES.ROLE_NOT_FOUND);
    } else {
      return sendError(res, "Failed to get role", 500);
    }
  }
});

export const updateRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return sendError(res, "Role ID is required", 400);
  }

  try {
    const role = await roleService.updateRole(id, req.body);

    return sendSuccess(res, role, MESSAGES.UPDATED);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Role not found") {
        return sendNotFound(res, MESSAGES.ROLE_NOT_FOUND);
      } else {
        return sendError(res, error.message, 400);
      }
    } else {
      return sendError(res, "Failed to update role", 500);
    }
  }
});

export const publishRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return sendError(res, "Role ID is required", 400);
  }

  try {
    const role = await roleService.publishRole(id);

    return sendSuccess(res, role, "Role published successfully");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Role not found") {
        return sendNotFound(res, MESSAGES.ROLE_NOT_FOUND);
      } else {
        return sendError(res, error.message, 400);
      }
    } else {
      return sendError(res, "Failed to publish role", 500);
    }
  }
});

export const deleteRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return sendError(res, "Role ID is required", 400);
  }

  try {
    await roleService.deleteRole(id);

    return sendSuccess(res, null, MESSAGES.DELETED);
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Role not found") {
        return sendNotFound(res, MESSAGES.ROLE_NOT_FOUND);
      } else {
        return sendError(res, error.message, 400);
      }
    } else {
      return sendError(res, "Failed to delete role", 500);
    }
  }
});

export const assignRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { userIds } = req.body;

  if (!id) {
    return sendError(res, "Role ID is required", 400);
  }

  try {
    const result = await roleService.assignRoleToUsers(id, userIds);

    return sendSuccess(res, result, "Role assigned successfully");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Role not found") {
        return sendNotFound(res, MESSAGES.ROLE_NOT_FOUND);
      } else {
        return sendError(res, error.message, 400);
      }
    } else {
      return sendError(res, "Failed to assign role", 500);
    }
  }
});

export const cloneRole = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { name, description } = req.body;

  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }

  if (!id) {
    return sendError(res, "Role ID is required", 400);
  }

  try {
    const role = await roleService.cloneRole(id, name, description, req.user._id);

    return sendCreated(res, role, "Role cloned successfully");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Role not found") {
        return sendNotFound(res, MESSAGES.ROLE_NOT_FOUND);
      } else {
        return sendError(res, error.message, 400);
      }
    } else {
      return sendError(res, "Failed to clone role", 500);
    }
  }
});

export const getRolePermissions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return sendError(res, "Role ID is required", 400);
  }

  try {
    const permissions = await roleService.getRolePermissions(id);

    return sendSuccess(res, { permissions });
  } catch (error) {
    if (error instanceof Error && error.message === "Role not found") {
      return sendNotFound(res, MESSAGES.ROLE_NOT_FOUND);
    } else {
      return sendError(res, "Failed to get role permissions", 500);
    }
  }
});

export const updateRolePermissions = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { permissions } = req.body;

  if (!id) {
    return sendError(res, "Role ID is required", 400);
  }

  try {
    const role = await roleService.updateRolePermissions(id, permissions);

    return sendSuccess(res, role, "Role permissions updated successfully");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Role not found") {
        return sendNotFound(res, MESSAGES.ROLE_NOT_FOUND);
      } else {
        return sendError(res, error.message, 400);
      }
    } else {
      return sendError(res, "Failed to update role permissions", 500);
    }
  }
});

export const getRoleUsers = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return sendError(res, "Role ID is required", 400);
  }

  try {
    const users = await roleService.getRoleUsers(id);

    return sendSuccess(res, users);
  } catch (error) {
    return sendError(res, "Failed to get role users", 500);
  }
});
