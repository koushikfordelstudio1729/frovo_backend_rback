"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.bulkUpdateAccessRequestsSchema = exports.getAccessRequestsQuerySchema = exports.updateAccessRequestStatusSchema = exports.createAccessRequestSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../models/enums");
const objectIdSchema = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');
exports.createAccessRequestSchema = zod_1.z.object({
    body: zod_1.z.object({
        requestedRole: objectIdSchema.optional(),
        requestedPermissions: zod_1.z.array(zod_1.z.string().trim()).optional(),
        reason: zod_1.z.string()
            .min(10, 'Reason must be at least 10 characters')
            .max(1000, 'Reason cannot exceed 1000 characters')
            .trim(),
        duration: zod_1.z.number()
            .min(1, 'Duration must be at least 1 day')
            .max(365, 'Duration cannot exceed 365 days')
            .optional()
    }).refine((data) => {
        return data.requestedRole || (data.requestedPermissions && data.requestedPermissions.length > 0);
    }, {
        message: 'Either requestedRole or requestedPermissions must be provided',
        path: ['requestedRole']
    })
});
exports.updateAccessRequestStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.nativeEnum(enums_1.AccessRequestStatus)
            .refine((val) => val === enums_1.AccessRequestStatus.APPROVED || val === enums_1.AccessRequestStatus.REJECTED, {
            message: 'Status must be approved or rejected'
        }),
        comments: zod_1.z.string()
            .max(500, 'Comments cannot exceed 500 characters')
            .trim()
            .optional()
    })
});
exports.getAccessRequestsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string()
            .transform((val) => parseInt(val, 10))
            .refine((val) => val > 0, 'Page must be greater than 0')
            .optional()
            .default('1'),
        limit: zod_1.z.string()
            .transform((val) => parseInt(val, 10))
            .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100')
            .optional()
            .default('10'),
        status: zod_1.z.nativeEnum(enums_1.AccessRequestStatus).optional(),
        requester: objectIdSchema.optional(),
        startDate: zod_1.z.string()
            .datetime()
            .optional(),
        endDate: zod_1.z.string()
            .datetime()
            .optional(),
        sortBy: zod_1.z.enum(['createdAt', 'status', 'approvedAt', 'rejectedAt'])
            .optional()
            .default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc'])
            .optional()
            .default('desc')
    })
});
exports.bulkUpdateAccessRequestsSchema = zod_1.z.object({
    body: zod_1.z.object({
        requestIds: zod_1.z.array(objectIdSchema)
            .min(1, 'At least one request ID is required'),
        status: zod_1.z.nativeEnum(enums_1.AccessRequestStatus)
            .refine((val) => val === enums_1.AccessRequestStatus.APPROVED || val === enums_1.AccessRequestStatus.REJECTED, {
            message: 'Status must be approved or rejected'
        }),
        comments: zod_1.z.string()
            .max(500, 'Comments cannot exceed 500 characters')
            .trim()
            .optional()
    })
});
//# sourceMappingURL=accessRequest.validator.js.map