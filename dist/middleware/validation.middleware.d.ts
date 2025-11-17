import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
interface ValidationTargets {
    body?: z.ZodSchema;
    query?: z.ZodSchema;
    params?: z.ZodSchema;
}
export declare const validate: (schemas: ValidationTargets) => (req: Request, res: Response, next: NextFunction) => void;
export declare const commonSchemas: {
    objectId: z.ZodString;
    pagination: z.ZodObject<{
        page: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string>;
        limit: z.ZodEffects<z.ZodOptional<z.ZodString>, number, string>;
    }, "strip", z.ZodTypeAny, {
        limit?: number;
        page?: number;
    }, {
        limit?: string;
        page?: string;
    }>;
    search: z.ZodObject<{
        search: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodOptional<z.ZodString>;
        sortOrder: z.ZodOptional<z.ZodEnum<["asc", "desc"]>>;
    }, "strip", z.ZodTypeAny, {
        search?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }, {
        search?: string;
        sortBy?: string;
        sortOrder?: "asc" | "desc";
    }>;
    dateRange: z.ZodObject<{
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        startDate?: string;
        endDate?: string;
    }, {
        startDate?: string;
        endDate?: string;
    }>;
};
export declare const validateObjectId: (field?: string) => (req: Request, res: Response, next: NextFunction) => void;
export declare const validatePagination: () => (req: Request, res: Response, next: NextFunction) => void;
export declare const validateSearch: () => (req: Request, res: Response, next: NextFunction) => void;
export declare const validateDateRange: () => (req: Request, res: Response, next: NextFunction) => void;
export {};
//# sourceMappingURL=validation.middleware.d.ts.map