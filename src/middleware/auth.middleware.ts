import { Request, Response, NextFunction } from "express";
import { User, UserStatus } from "../models";
import { verifyAccessToken } from "../utils/jwt.util";
import { sendUnauthorized, sendForbidden } from "../utils/response.util";
import { asyncHandler } from "../utils/asyncHandler.util";
import { MESSAGES } from "../config/constants";

export const authenticate = asyncHandler(
  async (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      token = req.cookies?.["accessToken"];
    }

    if (!token) {
      return sendUnauthorized(res, MESSAGES.UNAUTHORIZED);
    }

    try {
      const decoded = verifyAccessToken(token);

      const user = await User.findById(decoded.id).populate("roles").populate("departments");
      if (!user) {
        return sendUnauthorized(res, MESSAGES.USER_NOT_FOUND);
      }

      if (user.status !== UserStatus.ACTIVE) {
        return sendForbidden(res, "Account is inactive or suspended");
      }

      (req as any).user = user;

      (req as any).clientIp =
        req.ip || req.socket.remoteAddress || (req.headers["x-forwarded-for"] as string);
      (req as any).userAgent = req.headers["user-agent"];

      return next();
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === "Token has expired") {
          return sendUnauthorized(res, MESSAGES.TOKEN_EXPIRED);
        } else if (error.message === "Invalid token") {
          return sendUnauthorized(res, MESSAGES.TOKEN_INVALID);
        }
      }

      return sendUnauthorized(res, MESSAGES.UNAUTHORIZED);
    }
  }
);

export const optionalAuth = asyncHandler(
  async (req: Request, _res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    let token: string | undefined;

    if (authHeader && authHeader.startsWith("Bearer ")) {
      token = authHeader.substring(7);
    } else {
      token = req.cookies?.["accessToken"];
    }

    if (!token) {
      return next();
    }

    try {
      const decoded = verifyAccessToken(token);
      const user = await User.findById(decoded.id).populate("roles").populate("departments");

      if (user && user.status === UserStatus.ACTIVE) {
        (req as any).user = user;
        (req as any).clientIp =
          req.ip || req.socket.remoteAddress || (req.headers["x-forwarded-for"] as string);
        (req as any).userAgent = req.headers["user-agent"];
      }
    } catch (_) {
      void 0;
    }

    return next();
  }
);
export const checkPermission = (user: any, requiredPermission: string): boolean => {
  if (!user || !user.roles) {
    return false;
  }

  const userRoles = user.roles || [];

  return userRoles.some((role: any) => {
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
};

export const requirePermission = (requiredPermission: string) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendForbidden(res, MESSAGES.UNAUTHORIZED);
    }

    if (!checkPermission(req.user, requiredPermission)) {
      return sendForbidden(res, MESSAGES.PERMISSION_DENIED);
    }

    return next();
  });
};
