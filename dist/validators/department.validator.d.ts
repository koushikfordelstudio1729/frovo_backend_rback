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
        roles: string[];
        name: string;
        members: string[];
        description?: string | undefined;
        systemName?: DepartmentName | undefined;
    }, {
        name: string;
        roles?: string[] | undefined;
        description?: string | undefined;
        systemName?: DepartmentName | undefined;
        members?: string[] | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        roles: string[];
        name: string;
        members: string[];
        description?: string | undefined;
        systemName?: DepartmentName | undefined;
    };
}, {
    body: {
        name: string;
        roles?: string[] | undefined;
        description?: string | undefined;
        systemName?: DepartmentName | undefined;
        members?: string[] | undefined;
    };
}>;
export declare const updateDepartmentSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        roles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        roles?: string[] | undefined;
        name?: string | undefined;
        description?: string | undefined;
    }, {
        roles?: string[] | undefined;
        name?: string | undefined;
        description?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        roles?: string[] | undefined;
        name?: string | undefined;
        description?: string | undefined;
    };
}, {
    body: {
        roles?: string[] | undefined;
        name?: string | undefined;
        description?: string | undefined;
    };
}>;
export declare const addMembersSchema: z.ZodObject<{
    body: z.ZodObject<{
        userIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        userIds: string[];
    }, {
        userIds: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        userIds: string[];
    };
}, {
    body: {
        userIds: string[];
    };
}>;
export declare const addRolesSchema: z.ZodObject<{
    body: z.ZodObject<{
        roleIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        roleIds: string[];
    }, {
        roleIds: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        roleIds: string[];
    };
}, {
    body: {
        roleIds: string[];
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
        limit: number;
        page: number;
        sortBy: "name" | "createdAt" | "memberCount";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
    }, {
        search?: string | undefined;
        limit?: string | undefined;
        page?: string | undefined;
        sortBy?: "name" | "createdAt" | "memberCount" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        limit: number;
        page: number;
        sortBy: "name" | "createdAt" | "memberCount";
        sortOrder: "asc" | "desc";
        search?: string | undefined;
    };
}, {
    query: {
        search?: string | undefined;
        limit?: string | undefined;
        page?: string | undefined;
        sortBy?: "name" | "createdAt" | "memberCount" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    };
}>;
//# sourceMappingURL=department.validator.d.ts.map