import { Request, Response, NextFunction } from 'express';
import { SystemRole } from '../models';
export declare const requirePermission: (permission: string, checkScope?: boolean) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireRole: (roleKey: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireSystemRole: (systemRole: SystemRole) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireSuperAdmin: () => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAnyPermission: (permissions: string[]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const requireAllPermissions: (permissions: string[]) => (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=permission.middleware.d.ts.map