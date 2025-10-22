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
        limit: number;
        page: number;
        sortBy: "module" | "action" | "timestamp" | "actor";
        sortOrder: "asc" | "desc";
        module?: string | undefined;
        action?: string | undefined;
        actor?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        targetType?: string | undefined;
        targetId?: string | undefined;
    }, {
        limit?: string | undefined;
        module?: string | undefined;
        action?: string | undefined;
        actor?: string | undefined;
        page?: string | undefined;
        sortBy?: "module" | "action" | "timestamp" | "actor" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        targetType?: string | undefined;
        targetId?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        limit: number;
        page: number;
        sortBy: "module" | "action" | "timestamp" | "actor";
        sortOrder: "asc" | "desc";
        module?: string | undefined;
        action?: string | undefined;
        actor?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        targetType?: string | undefined;
        targetId?: string | undefined;
    };
}, {
    query: {
        limit?: string | undefined;
        module?: string | undefined;
        action?: string | undefined;
        actor?: string | undefined;
        page?: string | undefined;
        sortBy?: "module" | "action" | "timestamp" | "actor" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        targetType?: string | undefined;
        targetId?: string | undefined;
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
        format: "csv" | "json";
        module?: string | undefined;
        action?: string | undefined;
        actor?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        targetType?: string | undefined;
    }, {
        module?: string | undefined;
        action?: string | undefined;
        actor?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        targetType?: string | undefined;
        format?: "csv" | "json" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        format: "csv" | "json";
        module?: string | undefined;
        action?: string | undefined;
        actor?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        targetType?: string | undefined;
    };
}, {
    query: {
        module?: string | undefined;
        action?: string | undefined;
        actor?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
        targetType?: string | undefined;
        format?: "csv" | "json" | undefined;
    };
}>;
//# sourceMappingURL=auditLog.validator.d.ts.map