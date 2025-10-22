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
        roles: string[];
        departments: string[];
        name: string;
        email: string;
        password: string;
        phone?: string | undefined;
    }, {
        name: string;
        email: string;
        password: string;
        roles?: string[] | undefined;
        departments?: string[] | undefined;
        phone?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        roles: string[];
        departments: string[];
        name: string;
        email: string;
        password: string;
        phone?: string | undefined;
    };
}, {
    body: {
        name: string;
        email: string;
        password: string;
        roles?: string[] | undefined;
        departments?: string[] | undefined;
        phone?: string | undefined;
    };
}>;
export declare const updateUserSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        phone: z.ZodOptional<z.ZodString>;
        departments: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        roles: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
    }, "strip", z.ZodTypeAny, {
        roles?: string[] | undefined;
        departments?: string[] | undefined;
        name?: string | undefined;
        phone?: string | undefined;
    }, {
        roles?: string[] | undefined;
        departments?: string[] | undefined;
        name?: string | undefined;
        phone?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        roles?: string[] | undefined;
        departments?: string[] | undefined;
        name?: string | undefined;
        phone?: string | undefined;
    };
}, {
    body: {
        roles?: string[] | undefined;
        departments?: string[] | undefined;
        name?: string | undefined;
        phone?: string | undefined;
    };
}>;
export declare const updateUserStatusSchema: z.ZodObject<{
    body: z.ZodObject<{
        status: z.ZodNativeEnum<typeof UserStatus>;
    }, "strip", z.ZodTypeAny, {
        status: UserStatus;
    }, {
        status: UserStatus;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        status: UserStatus;
    };
}, {
    body: {
        status: UserStatus;
    };
}>;
export declare const assignRolesSchema: z.ZodObject<{
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
export declare const assignDepartmentsSchema: z.ZodObject<{
    body: z.ZodObject<{
        departmentIds: z.ZodArray<z.ZodString, "many">;
    }, "strip", z.ZodTypeAny, {
        departmentIds: string[];
    }, {
        departmentIds: string[];
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        departmentIds: string[];
    };
}, {
    body: {
        departmentIds: string[];
    };
}>;
export declare const getUsersQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>>;
        search: z.ZodOptional<z.ZodString>;
        role: z.ZodOptional<z.ZodString>;
        department: z.ZodOptional<z.ZodString>;
        status: z.ZodOptional<z.ZodNativeEnum<typeof UserStatus>>;
        sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["name", "email", "createdAt", "lastLogin"]>>>;
        sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        page: number;
        sortBy: "name" | "email" | "lastLogin" | "createdAt";
        sortOrder: "asc" | "desc";
        status?: UserStatus | undefined;
        search?: string | undefined;
        department?: string | undefined;
        role?: string | undefined;
    }, {
        status?: UserStatus | undefined;
        search?: string | undefined;
        limit?: string | undefined;
        department?: string | undefined;
        page?: string | undefined;
        role?: string | undefined;
        sortBy?: "name" | "email" | "lastLogin" | "createdAt" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        limit: number;
        page: number;
        sortBy: "name" | "email" | "lastLogin" | "createdAt";
        sortOrder: "asc" | "desc";
        status?: UserStatus | undefined;
        search?: string | undefined;
        department?: string | undefined;
        role?: string | undefined;
    };
}, {
    query: {
        status?: UserStatus | undefined;
        search?: string | undefined;
        limit?: string | undefined;
        department?: string | undefined;
        page?: string | undefined;
        role?: string | undefined;
        sortBy?: "name" | "email" | "lastLogin" | "createdAt" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    };
}>;
export declare const updateUserPasswordSchema: z.ZodObject<{
    body: z.ZodObject<{
        newPassword: z.ZodString;
    }, "strip", z.ZodTypeAny, {
        newPassword: string;
    }, {
        newPassword: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        newPassword: string;
    };
}, {
    body: {
        newPassword: string;
    };
}>;
//# sourceMappingURL=user.validator.d.ts.map