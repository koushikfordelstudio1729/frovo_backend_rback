import { z } from "zod";
import { AccessRequestStatus } from "../models/enums";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

export const createAccessRequestSchema = z.object({
  body: z
    .object({
      requestedRole: objectIdSchema.optional(),
      requestedPermissions: z.array(z.string().trim()).optional(),
      reason: z
        .string()
        .min(10, "Reason must be at least 10 characters")
        .max(1000, "Reason cannot exceed 1000 characters")
        .trim(),
      duration: z
        .number()
        .min(1, "Duration must be at least 1 day")
        .max(365, "Duration cannot exceed 365 days")
        .optional(),
    })
    .refine(
      data => {
        // Either requestedRole or requestedPermissions must be provided
        return (
          data.requestedRole || (data.requestedPermissions && data.requestedPermissions.length > 0)
        );
      },
      {
        message: "Either requestedRole or requestedPermissions must be provided",
        path: ["requestedRole"],
      }
    ),
});

export const updateAccessRequestStatusSchema = z.object({
  body: z.object({
    status: z
      .nativeEnum(AccessRequestStatus)
      .refine(val => val === AccessRequestStatus.APPROVED || val === AccessRequestStatus.REJECTED, {
        message: "Status must be approved or rejected",
      }),
    comments: z.string().max(500, "Comments cannot exceed 500 characters").trim().optional(),
  }),
});

export const getAccessRequestsQuerySchema = z.object({
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
    status: z.nativeEnum(AccessRequestStatus).optional(),
    requester: objectIdSchema.optional(),
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
    sortBy: z
      .enum(["createdAt", "status", "approvedAt", "rejectedAt"])
      .optional()
      .default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  }),
});

export const bulkUpdateAccessRequestsSchema = z.object({
  body: z.object({
    requestIds: z.array(objectIdSchema).min(1, "At least one request ID is required"),
    status: z
      .nativeEnum(AccessRequestStatus)
      .refine(val => val === AccessRequestStatus.APPROVED || val === AccessRequestStatus.REJECTED, {
        message: "Status must be approved or rejected",
      }),
    comments: z.string().max(500, "Comments cannot exceed 500 characters").trim().optional(),
  }),
});
