import { z } from 'zod';
export declare const getAuditLogsQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        actor: z.ZodOptional<z.ZodString>;
        module: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        targetType: z.ZodOptional<z.ZodString>;
        targetId: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["timestamp", "actor", "module", "action"]>>>;
        sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    }, "strip", z.ZodTypeAny, {
        limit?: number;
        module?: string;
        action?: string;
        actor?: string;
        page?: number;
        sortBy?: "module" | "action" | "timestamp" | "actor";
        sortOrder?: "asc" | "desc";
        startDate?: string;
        endDate?: string;
        targetType?: string;
        targetId?: string;
    }, {
        limit?: string;
        module?: string;
        action?: string;
        actor?: string;
        page?: string;
        sortBy?: "module" | "action" | "timestamp" | "actor";
        sortOrder?: "asc" | "desc";
        startDate?: string;
        endDate?: string;
        targetType?: string;
        targetId?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    query?: {
        limit?: number;
        module?: string;
        action?: string;
        actor?: string;
        page?: number;
        sortBy?: "module" | "action" | "timestamp" | "actor";
        sortOrder?: "asc" | "desc";
        startDate?: string;
        endDate?: string;
        targetType?: string;
        targetId?: string;
    };
}, {
    query?: {
        limit?: string;
        module?: string;
        action?: string;
        actor?: string;
        page?: string;
        sortBy?: "module" | "action" | "timestamp" | "actor";
        sortOrder?: "asc" | "desc";
        startDate?: string;
        endDate?: string;
        targetType?: string;
        targetId?: string;
    };
}>;
export declare const exportAuditLogsQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        format: z.ZodDefault<z.ZodOptional<z.ZodEnum<["csv", "json"]>>>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        actor: z.ZodOptional<z.ZodString>;
        module: z.ZodOptional<z.ZodString>;
        action: z.ZodOptional<z.ZodString>;
        targetType: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        module?: string;
        action?: string;
        actor?: string;
        startDate?: string;
        endDate?: string;
        targetType?: string;
        format?: "csv" | "json";
    }, {
        module?: string;
        action?: string;
        actor?: string;
        startDate?: string;
        endDate?: string;
        targetType?: string;
        format?: "csv" | "json";
    }>;
}, "strip", z.ZodTypeAny, {
    query?: {
        module?: string;
        action?: string;
        actor?: string;
        startDate?: string;
        endDate?: string;
        targetType?: string;
        format?: "csv" | "json";
    };
}, {
    query?: {
        module?: string;
        action?: string;
        actor?: string;
        startDate?: string;
        endDate?: string;
        targetType?: string;
        format?: "csv" | "json";
    };
}>;
//# sourceMappingURL=auditLog.validator.d.ts.map