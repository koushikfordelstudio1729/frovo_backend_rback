import { Response } from "express";
export interface ApiResponse<T = any> {
    success: boolean;
    message: string;
    data?: T;
    errors?: any;
    pagination?: {
        page: number;
        limit: number;
        total: number;
        pages: number;
    };
}
export declare const sendSuccess: <T>(res: Response, data?: T, message?: string, statusCode?: 200) => Response<ApiResponse<T>>;
export declare const sendCreated: <T>(res: Response, data?: T, message?: string) => Response<ApiResponse<T>>;
export declare const sendError: (res: Response, message: string, statusCode?: number, errors?: any) => Response<ApiResponse>;
export declare const sendPaginatedResponse: <T>(res: Response, data: T[], page: number, limit: number, total: number, message?: string) => Response<ApiResponse<T[]>>;
export declare const sendNotFound: (res: Response, message?: string) => Response<ApiResponse>;
export declare const sendUnauthorized: (res: Response, message?: string) => Response<ApiResponse>;
export declare const sendForbidden: (res: Response, message?: string) => Response<ApiResponse>;
export declare const sendValidationError: (res: Response, errors: any, message?: string) => Response<ApiResponse>;
export declare const sendConflict: (res: Response, message?: string) => Response<ApiResponse>;
export declare const sendInternalError: (res: Response, message?: string) => Response<ApiResponse>;
//# sourceMappingURL=response.util.d.ts.map