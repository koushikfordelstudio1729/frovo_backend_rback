import { z } from "zod";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

export const getAuditLogsQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .transform(val => parseInt(val, 10))
      .refine(val => val > 0, "Page must be greater than 0")
      .optional()
      .default("1"),
    limit: z
      .string()
      .transform(val => parseInt(val, 10))
      .refine(val => val > 0 && val <= 100, "Limit must be between 1 and 100")
      .optional()
      .default("10"),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    actor: objectIdSchema.optional(),
    module: z.string().trim().optional(),
    action: z.string().trim().optional(),
    targetType: z.string().trim().optional(),
    targetId: objectIdSchema.optional(),
    sortBy: z.enum(["timestamp", "actor", "module", "action"]).optional().default("timestamp"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  }),
});

export const exportAuditLogsQuerySchema = z.object({
  query: z.object({
    format: z.enum(["csv", "json"]).optional().default("csv"),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    actor: objectIdSchema.optional(),
    module: z.string().trim().optional(),
    action: z.string().trim().optional(),
    targetType: z.string().trim().optional(),
  }),
});
