import { z } from 'zod';
import { AccessRequestStatus } from '../models/enums';
export declare const createAccessRequestSchema: z.ZodObject<{
    body: z.ZodEffects<z.ZodObject<{
        requestedRole: z.ZodOptional<z.ZodString>;
        requestedPermissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        reason: z.ZodString;
        duration: z.ZodOptional<z.ZodNumber>;
    }, "strip", z.ZodTypeAny, {
        reason: string;
        requestedRole?: string | undefined;
        requestedPermissions?: string[] | undefined;
        duration?: number | undefined;
    }, {
        reason: string;
        requestedRole?: string | undefined;
        requestedPermissions?: string[] | undefined;
        duration?: number | undefined;
    }>, {
        reason: string;
        requestedRole?: string | undefined;
        requestedPermissions?: string[] | undefined;
        duration?: number | undefined;
    }, {
        reason: string;
        requestedRole?: string | undefined;
        requestedPermissions?: string[] | undefined;
        duration?: number | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        reason: string;
        requestedRole?: string | undefined;
        requestedPermissions?: string[] | undefined;
        duration?: number | undefined;
    };
}, {
    body: {
        reason: string;
        requestedRole?: string | undefined;
        requestedPermissions?: string[] | undefined;
        duration?: number | undefined;
    };
}>;
export declare const updateAccessRequestStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        status: z.ZodEffects<z.ZodNativeEnum<typeof AccessRequestStatus>, AccessRequestStatus.APPROVED | AccessRequestStatus.REJECTED, AccessRequestStatus>;
        comments: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: AccessRequestStatus.APPROVED | AccessRequestStatus.REJECTED;
        comments?: string | undefined;
    }, {
        status: AccessRequestStatus;
        comments?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status: AccessRequestStatus.APPROVED | AccessRequestStatus.REJECTED;
        comments?: string | undefined;
    };
}, {
    body: {
        status: AccessRequestStatus;
        comments?: string | undefined;
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
        limit: number;
        page: number;
        sortBy: "status" | "createdAt" | "approvedAt" | "rejectedAt";
        sortOrder: "asc" | "desc";
        status?: AccessRequestStatus | undefined;
        requester?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
    }, {
        status?: AccessRequestStatus | undefined;
        limit?: string | undefined;
        requester?: string | undefined;
        page?: string | undefined;
        sortBy?: "status" | "createdAt" | "approvedAt" | "rejectedAt" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        limit: number;
        page: number;
        sortBy: "status" | "createdAt" | "approvedAt" | "rejectedAt";
        sortOrder: "asc" | "desc";
        status?: AccessRequestStatus | undefined;
        requester?: string | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
    };
}, {
    query: {
        status?: AccessRequestStatus | undefined;
        limit?: string | undefined;
        requester?: string | undefined;
        page?: string | undefined;
        sortBy?: "status" | "createdAt" | "approvedAt" | "rejectedAt" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
        startDate?: string | undefined;
        endDate?: string | undefined;
    };
}>;
export declare const bulkUpdateAccessRequestsSchema: z.ZodObject<{
    body: z.ZodObject<{
        requestIds: z.ZodArray<z.ZodString, "many">;
        status: z.ZodEffects<z.ZodNativeEnum<typeof AccessRequestStatus>, AccessRequestStatus.APPROVED | AccessRequestStatus.REJECTED, AccessRequestStatus>;
        comments: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        status: AccessRequestStatus.APPROVED | AccessRequestStatus.REJECTED;
        requestIds: string[];
        comments?: string | undefined;
    }, {
        status: AccessRequestStatus;
        requestIds: string[];
        comments?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status: AccessRequestStatus.APPROVED | AccessRequestStatus.REJECTED;
        requestIds: string[];
        comments?: string | undefined;
    };
}, {
    body: {
        status: AccessRequestStatus;
        requestIds: string[];
        comments?: string | undefined;
    };
}>;
//# sourceMappingURL=accessRequest.validator.d.ts.map