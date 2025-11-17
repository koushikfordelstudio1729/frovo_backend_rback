import { z } from 'zod';
import { DepartmentName } from '../models/enums';
export declare const createDepartmentSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        systemName: z.ZodOptional<z.ZodNativeEnum<typeof DepartmentName>>;
        description: z.ZodOptional<z.ZodString>;
        roles: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        members: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    }, "strip", z.ZodTypeAny, {
        roles?: string[];
        name?: string;
        description?: string;
        systemName?: DepartmentName;
        members?: string[];
    }, {
        roles?: string[];
        name?: string;
        description?: string;
        systemName?: DepartmentName;
        members?: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        roles?: string[];
        name?: string;
        description?: string;
        systemName?: DepartmentName;
        members?: string[];
    };
}, {
    body?: {
        roles?: string[];
        name?: string;
        description?: string;
        systemName?: DepartmentName;
        members?: string[];
    };
}>;
export declare const updateDepartmentSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        roles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        roles?: string[];
        name?: string;
        description?: string;
    }, {
        roles?: string[];
        name?: string;
        description?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        roles?: string[];
        name?: string;
        description?: string;
    };
}, {
    body?: {
        roles?: string[];
        name?: string;
        description?: string;
    };
}>;
export declare const addMembersSchema: z.ZodObject<{
    body: z.ZodObject<{
        userIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        userIds?: string[];
    }, {
        userIds?: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        userIds?: string[];
    };
}, {
    body?: {
        userIds?: string[];
    };
}>;
export declare const addRolesSchema: z.ZodObject<{
    body: z.ZodObject<{
        roleIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        roleIds?: string[];
    }, {
        roleIds?: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        roleIds?: string[];
    };
}, {
    body?: {
        roleIds?: string[];
    };
}>;
export declare const getDepartmentsQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>>;
        search: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["name", "createdAt", "memberCount"]>>>;
        sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    }, "strip", z.ZodTypeAny, {
        search?: string;
        limit?: number;
        page?: number;
        sortBy?: "name" | "createdAt" | "memberCount";
        sortOrder?: "asc" | "desc";
    }, {
        search?: string;
        limit?: string;
        page?: string;
        sortBy?: "name" | "createdAt" | "memberCount";
        sortOrder?: "asc" | "desc";
    }>;
}, "strip", z.ZodTypeAny, {
    query?: {
        search?: string;
        limit?: number;
        page?: number;
        sortBy?: "name" | "createdAt" | "memberCount";
        sortOrder?: "asc" | "desc";
    };
}, {
    query?: {
        search?: string;
        limit?: string;
        page?: string;
        sortBy?: "name" | "createdAt" | "memberCount";
        sortOrder?: "asc" | "desc";
    };
}>;
//# sourceMappingURL=department.validator.d.ts.map