import { Request, Response } from 'express';
export declare const register: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const login: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const logout: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const getCurrentUser: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const refreshToken: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const changePassword: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const enableMFA: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const verifyMFA: (req: Request, res: Response, next: import("express").NextFunction) => void;
export declare const disableMFA: (req: Request, res: Response, next: import("express").NextFunction) => void;
//# sourceMappingURL=auth.controller.d.ts.map