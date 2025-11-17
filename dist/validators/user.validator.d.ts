import { z } from 'zod';
import { UserStatus } from '../models/enums';
export declare const createUserSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        email: z.ZodString;
        phone: z.ZodOptional<z.ZodString>;
        password: z.ZodString;
        departments: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
        roles: z.ZodDefault<z.ZodOptional<z.ZodArray<z.ZodString, "many">>>;
    }, "strip", z.ZodTypeAny, {
        roles?: string[];
        departments?: string[];
        name?: string;
        email?: string;
        phone?: string;
        password?: string;
    }, {
        roles?: string[];
        departments?: string[];
        name?: string;
        email?: string;
        phone?: string;
        password?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        roles?: string[];
        departments?: string[];
        name?: string;
        email?: string;
        phone?: string;
        password?: string;
    };
}, {
    body?: {
        roles?: string[];
        departments?: string[];
        name?: string;
        email?: string;
        phone?: string;
        password?: string;
    };
}>;
export declare const updateUserSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        departments: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        roles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        roles?: string[];
        departments?: string[];
        name?: string;
        phone?: string;
    }, {
        roles?: string[];
        departments?: string[];
        name?: string;
        phone?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        roles?: string[];
        departments?: string[];
        name?: string;
        phone?: string;
    };
}, {
    body?: {
        roles?: string[];
        departments?: string[];
        name?: string;
        phone?: string;
    };
}>;
export declare const updateUserStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        status: z.ZodNativeEnum<typeof UserStatus>;
    }, "strip", z.ZodTypeAny, {
        status?: UserStatus;
    }, {
        status?: UserStatus;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        status?: UserStatus;
    };
}, {
    body?: {
        status?: UserStatus;
    };
}>;
export declare const assignRolesSchema: z.ZodObject<{
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
export declare const assignDepartmentsSchema: z.ZodObject<{
    body: z.ZodObject<{
        departmentIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        departmentIds?: string[];
    }, {
        departmentIds?: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        departmentIds?: string[];
    };
}, {
    body?: {
        departmentIds?: string[];
    };
}>;
export declare const getUsersQueryBaseSchema: z.ZodObject<{
    page: z.ZodEffects<z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string>, number, string>;
    limit: z.ZodEffects<z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string>, number, string>;
    search: z.ZodOptional<z.ZodString>;
    role: z.ZodOptional<z.ZodString>;
    department: z.ZodOptional<z.ZodString>;
    status: z.ZodOptional<z.ZodNativeEnum<typeof UserStatus>>;
    sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["name", "email", "createdAt", "lastLogin"]>>>;
    sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
}, "strip", z.ZodTypeAny, {
    status?: UserStatus;
    search?: string;
    limit?: number;
    department?: string;
    page?: number;
    role?: string;
    sortBy?: "name" | "email" | "lastLogin" | "createdAt";
    sortOrder?: "asc" | "desc";
}, {
    status?: UserStatus;
    search?: string;
    limit?: string;
    department?: string;
    page?: string;
    role?: string;
    sortBy?: "name" | "email" | "lastLogin" | "createdAt";
    sortOrder?: "asc" | "desc";
}>;
export declare const getUsersQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodEffects<z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string>, number, string>;
        limit: z.ZodEffects<z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodString>>, number, string>, number, string>;
        search: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        department: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodNativeEnum<typeof UserStatus>>;
        sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["name", "email", "createdAt", "lastLogin"]>>>;
        sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    }, "strip", z.ZodTypeAny, {
        status?: UserStatus;
        search?: string;
        limit?: number;
        department?: string;
        page?: number;
        role?: string;
        sortBy?: "name" | "email" | "lastLogin" | "createdAt";
        sortOrder?: "asc" | "desc";
    }, {
        status?: UserStatus;
        search?: string;
        limit?: string;
        department?: string;
        page?: string;
        role?: string;
        sortBy?: "name" | "email" | "lastLogin" | "createdAt";
        sortOrder?: "asc" | "desc";
    }>;
}, "strip", z.ZodTypeAny, {
    query?: {
        status?: UserStatus;
        search?: string;
        limit?: number;
        department?: string;
        page?: number;
        role?: string;
        sortBy?: "name" | "email" | "lastLogin" | "createdAt";
        sortOrder?: "asc" | "desc";
    };
}, {
    query?: {
        status?: UserStatus;
        search?: string;
        limit?: string;
        department?: string;
        page?: string;
        role?: string;
        sortBy?: "name" | "email" | "lastLogin" | "createdAt";
        sortOrder?: "asc" | "desc";
    };
}>;
export declare const updateUserPasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        newPassword: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        newPassword?: string;
    }, {
        newPassword?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        newPassword?: string;
    };
}, {
    body?: {
        newPassword?: string;
    };
}>;
//# sourceMappingURL=user.validator.d.ts.map