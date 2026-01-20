"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.exportAuditLogsQuerySchema = exports.getAuditLogsQuerySchema = void 0;
const zod_1 = require("zod");
const objectIdSchema = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");
exports.getAuditLogsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z
            .string()
            .transform(val => parseInt(val, 10))
            .refine(val => val > 0, "Page must be greater than 0")
            .optional()
            .default("1"),
        limit: zod_1.z
            .string()
            .transform(val => parseInt(val, 10))
            .refine(val => val > 0 && val <= 100, "Limit must be between 1 and 100")
            .optional()
            .default("10"),
        startDate: zod_1.z.string().datetime().optional(),
        endDate: zod_1.z.string().datetime().optional(),
        actor: objectIdSchema.optional(),
        module: zod_1.z.string().trim().optional(),
        action: zod_1.z.string().trim().optional(),
        targetType: zod_1.z.string().trim().optional(),
        targetId: objectIdSchema.optional(),
        sortBy: zod_1.z.enum(["timestamp", "actor", "module", "action"]).optional().default("timestamp"),
        sortOrder: zod_1.z.enum(["asc", "desc"]).optional().default("desc"),
    }),
});
exports.exportAuditLogsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        format: zod_1.z.enum(["csv", "json"]).optional().default("csv"),
        startDate: zod_1.z.string().datetime().optional(),
        endDate: zod_1.z.string().datetime().optional(),
        actor: objectIdSchema.optional(),
        module: zod_1.z.string().trim().optional(),
        action: zod_1.z.string().trim().optional(),
        targetType: zod_1.z.string().trim().optional(),
    }),
});
