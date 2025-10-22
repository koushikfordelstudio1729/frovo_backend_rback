import { z } from 'zod';
import { RoleType, RoleStatus, ScopeLevel, UIAccess } from '../models/enums';
export declare const createRoleSchema: z.ZodObject<{
    body: z.ZodEffects<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        type: z.ZodDefault<z.ZodOptional<z.ZodNativeEnum<typeof RoleType>>>;
        department: z.ZodOptional<z.ZodString>;
        permissions: z.ZodArray<z.ZodString, "many">;
        scope: z.ZodObject<{
            level: z.ZodNativeEnum<typeof ScopeLevel>;
            entities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            level: ScopeLevel;
            entities?: string[] | undefined;
        }, {
            level: ScopeLevel;
            entities?: string[] | undefined;
        }>;
        uiAccess: z.ZodNativeEnum<typeof UIAccess>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        type: RoleType;
        permissions: string[];
        scope: {
            level: ScopeLevel;
            entities?: string[] | undefined;
        };
        uiAccess: UIAccess;
        description?: string | undefined;
        department?: string | undefined;
    }, {
        name: string;
        permissions: string[];
        scope: {
            level: ScopeLevel;
            entities?: string[] | undefined;
        };
        uiAccess: UIAccess;
        type?: RoleType | undefined;
        description?: string | undefined;
        department?: string | undefined;
    }>, {
        name: string;
        type: RoleType;
        permissions: string[];
        scope: {
            level: ScopeLevel;
            entities?: string[] | undefined;
        };
        uiAccess: UIAccess;
        description?: string | undefined;
        department?: string | undefined;
    }, {
        name: string;
        permissions: string[];
        scope: {
            level: ScopeLevel;
            entities?: string[] | undefined;
        };
        uiAccess: UIAccess;
        type?: RoleType | undefined;
        description?: string | undefined;
        department?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        type: RoleType;
        permissions: string[];
        scope: {
            level: ScopeLevel;
            entities?: string[] | undefined;
        };
        uiAccess: UIAccess;
        description?: string | undefined;
        department?: string | undefined;
    };
}, {
    body: {
        name: string;
        permissions: string[];
        scope: {
            level: ScopeLevel;
            entities?: string[] | undefined;
        };
        uiAccess: UIAccess;
        type?: RoleType | undefined;
        description?: string | undefined;
        department?: string | undefined;
    };
}>;
export declare const updateRoleSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodOptional<z.ZodString>;
        description: z.ZodOptional<z.ZodString>;
        permissions: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        scope: z.ZodOptional<z.ZodObject<{
            level: z.ZodNativeEnum<typeof ScopeLevel>;
            entities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            level: ScopeLevel;
            entities?: string[] | undefined;
        }, {
            level: ScopeLevel;
            entities?: string[] | undefined;
        }>>;
        uiAccess: z.ZodOptional<z.ZodNativeEnum<typeof UIAccess>>;
    }, "strip", z.ZodTypeAny, {
        name?: string | undefined;
        description?: string | undefined;
        permissions?: string[] | undefined;
        scope?: {
            level: ScopeLevel;
            entities?: string[] | undefined;
        } | undefined;
        uiAccess?: UIAccess | undefined;
    }, {
        name?: string | undefined;
        description?: string | undefined;
        permissions?: string[] | undefined;
        scope?: {
            level: ScopeLevel;
            entities?: string[] | undefined;
        } | undefined;
        uiAccess?: UIAccess | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name?: string | undefined;
        description?: string | undefined;
        permissions?: string[] | undefined;
        scope?: {
            level: ScopeLevel;
            entities?: string[] | undefined;
        } | undefined;
        uiAccess?: UIAccess | undefined;
    };
}, {
    body: {
        name?: string | undefined;
        description?: string | undefined;
        permissions?: string[] | undefined;
        scope?: {
            level: ScopeLevel;
            entities?: string[] | undefined;
        } | undefined;
        uiAccess?: UIAccess | undefined;
    };
}>;
export declare const assignRoleSchema: z.ZodObject<{
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
export declare const getRolesQuerySchema: z.ZodObject<{
    query: z.ZodObject<{
        page: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>>;
        limit: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodEffects<z.ZodString, number, string>, number, string>>>;
        search: z.ZodOptional<z.ZodString>;
        scope: z.ZodOptional<z.ZodNativeEnum<typeof ScopeLevel>>;
        type: z.ZodOptional<z.ZodNativeEnum<typeof RoleType>>;
        status: z.ZodOptional<z.ZodNativeEnum<typeof RoleStatus>>;
        department: z.ZodOptional<z.ZodString>;
        sortBy: z.ZodDefault<z.ZodOptional<z.ZodEnum<["name", "createdAt", "status"]>>>;
        sortOrder: z.ZodDefault<z.ZodOptional<z.ZodEnum<["asc", "desc"]>>>;
    }, "strip", z.ZodTypeAny, {
        limit: number;
        page: number;
        sortBy: "name" | "status" | "createdAt";
        sortOrder: "asc" | "desc";
        status?: RoleStatus | undefined;
        search?: string | undefined;
        type?: RoleType | undefined;
        department?: string | undefined;
        scope?: ScopeLevel | undefined;
    }, {
        status?: RoleStatus | undefined;
        search?: string | undefined;
        limit?: string | undefined;
        type?: RoleType | undefined;
        department?: string | undefined;
        scope?: ScopeLevel | undefined;
        page?: string | undefined;
        sortBy?: "name" | "status" | "createdAt" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    query: {
        limit: number;
        page: number;
        sortBy: "name" | "status" | "createdAt";
        sortOrder: "asc" | "desc";
        status?: RoleStatus | undefined;
        search?: string | undefined;
        type?: RoleType | undefined;
        department?: string | undefined;
        scope?: ScopeLevel | undefined;
    };
}, {
    query: {
        status?: RoleStatus | undefined;
        search?: string | undefined;
        limit?: string | undefined;
        type?: RoleType | undefined;
        department?: string | undefined;
        scope?: ScopeLevel | undefined;
        page?: string | undefined;
        sortBy?: "name" | "status" | "createdAt" | undefined;
        sortOrder?: "asc" | "desc" | undefined;
    };
}>;
export declare const publishRoleSchema: z.ZodObject<{
    body: z.ZodObject<{
        confirm: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodBoolean, boolean, boolean>>>;
    }, "strip", z.ZodTypeAny, {
        confirm: boolean;
    }, {
        confirm?: boolean | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        confirm: boolean;
    };
}, {
    body: {
        confirm?: boolean | undefined;
    };
}>;
export declare const cloneRoleSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name: string;
        description?: string | undefined;
    }, {
        name: string;
        description?: string | undefined;
    }>;
}, "strip", z.ZodTypeAny, {
    body: {
        name: string;
        description?: string | undefined;
    };
}, {
    body: {
        name: string;
        description?: string | undefined;
    };
}>;
//# sourceMappingURL=role.validator.d.ts.map