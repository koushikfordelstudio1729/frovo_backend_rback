import { Response } from 'express';
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    error?: string;
    timestamp: Date;
}
export declare const sendSuccess: <T>(res: Response, data: T, message?: string, statusCode?: number) => void;
export declare const sendCreated: <T>(res: Response, data: T, message?: string) => void;
export declare const sendError: (res: Response, error: string, statusCode?: number) => void;
export declare const sendNotFound: (res: Response, message?: string) => void;
export declare const sendBadRequest: (res: Response, error?: string) => void;
export declare const sendUnauthorized: (res: Response, message?: string) => void;
export declare const sendForbidden: (res: Response, message?: string) => void;
//# sourceMappingURL=responseHandlers.d.ts.map