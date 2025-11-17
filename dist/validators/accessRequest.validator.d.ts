import { z } from 'zod';
import { AccessRequestStatus } from '../models/enums';
export declare const createAccessRequestSchema: z.ZodObject<{
    body: z.ZodEffects<z.ZodObject<{
        requestedRole: z.ZodOptional<z.ZodString>;
        requestedPermissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        reason: z.ZodString;
        duration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        requestedRole?: string;
        requestedPermissions?: string[];
        reason?: string;
        duration?: number;
    }, {
        requestedRole?: string;
        requestedPermissions?: string[];
        reason?: string;
        duration?: number;
    }>, {
        requestedRole?: string;
        requestedPermissions?: string[];
        reason?: string;
        duration?: number;
    }, {
        requestedRole?: string;
        requestedPermissions?: string[];
        reason?: string;
        duration?: number;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        requestedRole?: string;
        requestedPermissions?: string[];
        reason?: string;
        duration?: number;
    };
}, {
    body?: {
        requestedRole?: string;
        requestedPermissions?: string[];
        reason?: string;
        duration?: number;
    };
}>;
export declare const updateAccessRequestStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        status: z.ZodEffects<z.ZodNativeEnum<typeof AccessRequestStatus>, AccessRequestStatus.APPROVED | AccessRequestStatus.REJECTED, AccessRequestStatus>;
        comments: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: AccessRequestStatus.APPROVED | AccessRequestStatus.REJECTED;
        comments?: string;
    }, {
        status?: AccessRequestStatus;
        comments?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        status?: AccessRequestStatus.APPROVED | AccessRequestStatus.REJECTED;
        comments?: string;
    };
}, {
    body?: {
        status?: AccessRequestStatus;
        comments?: string;
    };
}>;
export declare const getAccessRequestsQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>>;
        status: z.ZodOptional<z.ZodNativeEnum<typeof AccessRequestStatus>>;
        requester: z.ZodOptional<z.ZodString>;
        startDate: z.ZodOptional<z.ZodString>;
        endDate: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["createdAt", "status", "approvedAt", "rejectedAt"]>>>;
        sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    }, "strip", z.ZodTypeAny, {
        status?: AccessRequestStatus;
        limit?: number;
        requester?: string;
        page?: number;
        sortBy?: "status" | "createdAt" | "approvedAt" | "rejectedAt";
        sortOrder?: "asc" | "desc";
        startDate?: string;
        endDate?: string;
    }, {
        status?: AccessRequestStatus;
        limit?: string;
        requester?: string;
        page?: string;
        sortBy?: "status" | "createdAt" | "approvedAt" | "rejectedAt";
        sortOrder?: "asc" | "desc";
        startDate?: string;
        endDate?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    query?: {
        status?: AccessRequestStatus;
        limit?: number;
        requester?: string;
        page?: number;
        sortBy?: "status" | "createdAt" | "approvedAt" | "rejectedAt";
        sortOrder?: "asc" | "desc";
        startDate?: string;
        endDate?: string;
    };
}, {
    query?: {
        status?: AccessRequestStatus;
        limit?: string;
        requester?: string;
        page?: string;
        sortBy?: "status" | "createdAt" | "approvedAt" | "rejectedAt";
        sortOrder?: "asc" | "desc";
        startDate?: string;
        endDate?: string;
    };
}>;
export declare const bulkUpdateAccessRequestsSchema: z.ZodObject<{
    body: z.ZodObject<{
        requestIds: z.ZodArray<z.ZodString, "many">;
        status: z.ZodEffects<z.ZodNativeEnum<typeof AccessRequestStatus>, AccessRequestStatus.APPROVED | AccessRequestStatus.REJECTED, AccessRequestStatus>;
        comments: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status?: AccessRequestStatus.APPROVED | AccessRequestStatus.REJECTED;
        comments?: string;
        requestIds?: string[];
    }, {
        status?: AccessRequestStatus;
        comments?: string;
        requestIds?: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        status?: AccessRequestStatus.APPROVED | AccessRequestStatus.REJECTED;
        comments?: string;
        requestIds?: string[];
    };
}, {
    body?: {
        status?: AccessRequestStatus;
        comments?: string;
        requestIds?: string[];
    };
}>;
//# sourceMappingURL=accessRequest.validator.d.ts.map