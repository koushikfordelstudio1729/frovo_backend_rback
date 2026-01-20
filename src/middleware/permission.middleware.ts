import { Request, Response, NextFunction } from "express";
import { SystemRole, ScopeLevel } from "../models";
import { sendForbidden } from "../utils/response.util";
import { asyncHandler } from "../utils/asyncHandler.util";
import { MESSAGES } from "../config/constants";
import { Types } from "mongoose";

const hasPermission = (userPermissions: string[], required: string): boolean => {
  if (userPermissions.includes("*:*")) return true;

  if (userPermissions.includes(required)) return true;

  const [module] = required.split(":");
  if (userPermissions.includes(`${module}:*`)) return true;

  return false;
};

const getUserEffectivePermissions = async (user: any): Promise<string[]> => {
  if (!user.roles || user.roles.length === 0) {
    return [];
  }

  const permissions = new Set<string>();

  for (const role of user.roles) {
    if (role.permissions.includes("*:*")) {
      return ["*:*"];
    }

    role.permissions.forEach((p: string) => permissions.add(p));
  }

  return Array.from(permissions);
};

const checkScopedAccess = async (user: any, entityId?: string): Promise<boolean> => {
  if (!user.roles || user.roles.length === 0) {
    return false;
  }

  for (const role of user.roles) {
    if (role.scope.level === ScopeLevel.GLOBAL) return true;

    if (!entityId) return true;

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

    const userPermissions = await getUserEffectivePermissions(req.user);

    if (!hasPermission(userPermissions, permission)) {
      return sendForbidden(res, MESSAGES.PERMISSION_DENIED);
    }

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

export const requireAnyPermission = (permissions: string[]) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendForbidden(res, MESSAGES.UNAUTHORIZED);
    }

    const userPermissions = await getUserEffectivePermissions(req.user);

    const hasAnyPermission = permissions.some(permission =>
      hasPermission(userPermissions, permission)
    );

    if (!hasAnyPermission) {
      return sendForbidden(res, MESSAGES.PERMISSION_DENIED);
    }

    return next();
  });
};

export const requireAllPermissions = (permissions: string[]) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendForbidden(res, MESSAGES.UNAUTHORIZED);
    }

    const userPermissions = await getUserEffectivePermissions(req.user);

    const hasAllPermissions = permissions.every(permission =>
      hasPermission(userPermissions, permission)
    );

    if (!hasAllPermissions) {
      return sendForbidden(res, MESSAGES.PERMISSION_DENIED);
    }

    return next();
  });
};
