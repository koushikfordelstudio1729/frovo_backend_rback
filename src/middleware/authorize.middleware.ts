import { Request, Response, NextFunction } from "express";
import { sendForbidden } from "../utils/response.util";
import { asyncHandler } from "../utils/asyncHandler.util";
import { MESSAGES } from "../config/constants";

export const authorize = (allowedRoles: string[]) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendForbidden(res, MESSAGES.UNAUTHORIZED);
    }

    const userRoles = req.user.roles || [];

    const hasAllowedRole = userRoles.some((role: any) => {
      if (allowedRoles.includes(role.key)) {
        return true;
      }

      if (role.systemRole && allowedRoles.includes(role.systemRole)) {
        return true;
      }

      if (
        role.name &&
        allowedRoles.some(allowedRole => role.name.toLowerCase() === allowedRole.toLowerCase())
      ) {
        return true;
      }

      return false;
    });

    if (!hasAllowedRole) {
      return sendForbidden(res, MESSAGES.PERMISSION_DENIED);
    }

    return next();
  });
};

export const authorizeByPermission = (requiredPermission: string) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendForbidden(res, MESSAGES.UNAUTHORIZED);
    }

    const userRoles = req.user.roles || [];

    const hasPermission = userRoles.some((role: any) => {
      if (role.permissions?.includes("*:*")) {
        return true;
      }

      if (role.permissions?.includes(requiredPermission)) {
        return true;
      }

      const [module] = requiredPermission.split(":");
      if (role.permissions?.includes(`${module}:*`)) {
        return true;
      }

      return false;
    });

    if (!hasPermission) {
      return sendForbidden(res, MESSAGES.PERMISSION_DENIED);
    }

    return next();
  });
};
