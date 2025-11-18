// middleware/authorize.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { sendForbidden } from '../utils/response.util';
import { asyncHandler } from '../utils/asyncHandler.util';
import { MESSAGES } from '../config/constants';

export const authorize = (allowedRoles: string[]) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendForbidden(res, MESSAGES.UNAUTHORIZED);
    }

    // Get user's roles from the populated user object
    const userRoles = req.user.roles || [];
    
    // Check if user has any of the allowed roles
    const hasAllowedRole = userRoles.some((role: any) => {
      // Check role key
      if (allowedRoles.includes(role.key)) {
        return true;
      }
      
      // Check system role
      if (role.systemRole && allowedRoles.includes(role.systemRole)) {
        return true;
      }
      
      // Check role name (case insensitive)
      if (role.name && allowedRoles.some(allowedRole => 
        role.name.toLowerCase() === allowedRole.toLowerCase()
      )) {
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

// Alternative: authorize by permission (if you want to use permissions instead of roles)
export const authorizeByPermission = (requiredPermission: string) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return sendForbidden(res, MESSAGES.UNAUTHORIZED);
    }

    const userRoles = req.user.roles || [];
    
    // Check if user has the required permission in any of their roles
    const hasPermission = userRoles.some((role: any) => {
      // Super admin has all permissions
      if (role.permissions?.includes('*:*')) {
        return true;
      }
      
      // Check for exact permission match
      if (role.permissions?.includes(requiredPermission)) {
        return true;
      }
      
      // Check for module wildcard (e.g., 'vendors:*')
      const [module] = requiredPermission.split(':');
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