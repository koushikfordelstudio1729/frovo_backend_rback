import { Request, Response, NextFunction } from "express";
import { SystemRole, ScopeLevel } from "../models";
import { sendForbidden } from "../utils/response.util";
import { asyncHandler } from "../utils/asyncHandler.util";
import { MESSAGES } from "../config/constants";
import { Types } from "mongoose";

// Helper function to check if user has permission
const hasPermission = (userPermissions: string[], required: string): boolean => {
  // Check for wildcard (Super Admin)
  if (userPermissions.includes("*:*")) return true;

  // Check exact match
  if (userPermissions.includes(required)) return true;

  // Check module wildcard (e.g., 'machines:*')
  const [module] = required.split(":");
  if (userPermissions.includes(`${module}:*`)) return true;

  return false;
};

// Helper function to get user's effective permissions
const getUserEffectivePermissions = async (user: any): Promise<string[]> => {
  if (!user.roles || user.roles.length === 0) {
    return [];
  }

  const permissions = new Set<string>();

  for (const role of user.roles) {
    // Check if role has wildcard permission
    if (role.permissions.includes("*:*")) {
      return ["*:*"]; // Super Admin has all permissions
    }

    // Add all permissions from role
    role.permissions.forEach((p: string) => permissions.add(p));
  }

  return Array.from(permissions);
};

// Helper function to check scoped access
const checkScopedAccess = async (user: any, entityId?: string): Promise<boolean> => {
  if (!user.roles || user.roles.length === 0) {
    return false;
  }

  for (const role of user.roles) {
    // Global scope has access to everything
    if (role.scope.level === ScopeLevel.GLOBAL) return true;

    // If no entityId is provided for scoped access, allow it
    if (!entityId) return true;

    // Check if entity is in role's scope entities
    if (
      role.scope.entities &&
      role.scope.entities.some((id: Types.ObjectId) => id.toString() === entityId)
    ) {
      return true;
    }
  }

  return false;
};

export const requirePermission = (permission: string, checkScope = false) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendForbidden(res, MESSAGES.UNAUTHORIZED);
    }

    // Get all effective permissions for the user
    const userPermissions = await getUserEffectivePermissions(req.user);

    // Check if user has the required permission
    if (!hasPermission(userPermissions, permission)) {
      return sendForbidden(res, MESSAGES.PERMISSION_DENIED);
    }

    // Check scope if required
    if (checkScope) {
      const entityId = req.params["id"] || req.params["entityId"] || req.body["entityId"];
      const hasScope = await checkScopedAccess(req.user, entityId);

      if (!hasScope) {
        return sendForbidden(res, "Access denied for this scope");
      }
    }

    return next();
  });
};

export const requireRole = (roleKey: string) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendForbidden(res, MESSAGES.UNAUTHORIZED);
    }

    // Check if user has role with matching key or systemRole
    const hasRole = req.user.roles.some(
      (role: any) => role.key === roleKey || role.systemRole === roleKey
    );

    if (!hasRole) {
      return sendForbidden(res, MESSAGES.PERMISSION_DENIED);
    }

    return next();
  });
};

export const requireSystemRole = (systemRole: SystemRole) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendForbidden(res, MESSAGES.UNAUTHORIZED);
    }

    // Check if user has the specific system role
    const hasSystemRole = req.user.roles.some((role: any) => role.systemRole === systemRole);

    if (!hasSystemRole) {
      return sendForbidden(res, MESSAGES.PERMISSION_DENIED);
    }

    return next();
  });
};

export const requireSuperAdmin = () => {
  return requireSystemRole(SystemRole.SUPER_ADMIN);
};

// Multiple permissions checker (user must have at least one)
export const requireAnyPermission = (permissions: string[]) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendForbidden(res, MESSAGES.UNAUTHORIZED);
    }

    const userPermissions = await getUserEffectivePermissions(req.user);

    // Check if user has any of the required permissions
    const hasAnyPermission = permissions.some(permission =>
      hasPermission(userPermissions, permission)
    );

    if (!hasAnyPermission) {
      return sendForbidden(res, MESSAGES.PERMISSION_DENIED);
    }

    return next();
  });
};

// All permissions checker (user must have all permissions)
export const requireAllPermissions = (permissions: string[]) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendForbidden(res, MESSAGES.UNAUTHORIZED);
    }

    const userPermissions = await getUserEffectivePermissions(req.user);

    // Check if user has all required permissions
    const hasAllPermissions = permissions.every(permission =>
      hasPermission(userPermissions, permission)
    );

    if (!hasAllPermissions) {
      return sendForbidden(res, MESSAGES.PERMISSION_DENIED);
    }

    return next();
  });
};
