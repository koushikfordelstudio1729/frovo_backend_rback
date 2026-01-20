import { Request, Response, NextFunction } from "express";
interface AuditLogOptions {
    action: string;
    module: string;
    getTarget?: ((req: Request, res: Response) => {
        type: string;
        id: string;
        name?: string;
    }) | undefined;
    captureRequest?: boolean;
    captureResponse?: boolean;
}
export declare const auditLog: (options: AuditLogOptions) => (req: Request, res: Response, next: NextFunction) => void;
export declare const auditCreate: (module: string, getTarget?: AuditLogOptions["getTarget"]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const auditUpdate: (module: string, getTarget?: AuditLogOptions["getTarget"]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const auditDelete: (module: string, getTarget?: AuditLogOptions["getTarget"]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const auditLogin: () => (req: Request, res: Response, next: NextFunction) => void;
export declare const auditLogout: () => (req: Request, res: Response, next: NextFunction) => void;
export declare const auditAssign: (module: string, getTarget?: AuditLogOptions["getTarget"]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const auditRemove: (module: string, getTarget?: AuditLogOptions["getTarget"]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const auditApprove: (module: string, getTarget?: AuditLogOptions["getTarget"]) => (req: Request, res: Response, next: NextFunction) => void;
export declare const auditReject: (module: string, getTarget?: AuditLogOptions["getTarget"]) => (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=auditLog.middleware.d.ts.map