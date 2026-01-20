import { z } from "zod";
import { RoleType, RoleStatus, ScopeLevel, UIAccess } from "../models/enums";
export declare const createRoleSchema: z.ZodObject<{
    body: z.ZodEffects<z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
        type: z.ZodEffects<z.ZodDefault<z.ZodOptional<z.ZodNativeEnum<typeof RoleType>>>, RoleType.CUSTOM, RoleType>;
        department: z.ZodOptional<z.ZodString>;
        permissions: z.ZodArray<z.ZodString, "many">;
        scope: z.ZodObject<{
            level: z.ZodNativeEnum<typeof ScopeLevel>;
            entities: z.ZodOptional<z.ZodArray<z.ZodString, "many">>;
        }, "strip", z.ZodTypeAny, {
            level?: ScopeLevel;
            entities?: string[];
        }, {
            level?: ScopeLevel;
            entities?: string[];
        }>;
        uiAccess: z.ZodNativeEnum<typeof UIAccess>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        type?: RoleType.CUSTOM;
        description?: string;
        department?: string;
        permissions?: string[];
        scope?: {
            level?: ScopeLevel;
            entities?: string[];
        };
        uiAccess?: UIAccess;
    }, {
        name?: string;
        type?: RoleType;
        description?: string;
        department?: string;
        permissions?: string[];
        scope?: {
            level?: ScopeLevel;
            entities?: string[];
        };
        uiAccess?: UIAccess;
    }>, {
        name?: string;
        type?: RoleType.CUSTOM;
        description?: string;
        department?: string;
        permissions?: string[];
        scope?: {
            level?: ScopeLevel;
            entities?: string[];
        };
        uiAccess?: UIAccess;
    }, {
        name?: string;
        type?: RoleType;
        description?: string;
        department?: string;
        permissions?: string[];
        scope?: {
            level?: ScopeLevel;
            entities?: string[];
        };
        uiAccess?: UIAccess;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        name?: string;
        type?: RoleType.CUSTOM;
        description?: string;
        department?: string;
        permissions?: string[];
        scope?: {
            level?: ScopeLevel;
            entities?: string[];
        };
        uiAccess?: UIAccess;
    };
}, {
    body?: {
        name?: string;
        type?: RoleType;
        description?: string;
        department?: string;
        permissions?: string[];
        scope?: {
            level?: ScopeLevel;
            entities?: string[];
        };
        uiAccess?: UIAccess;
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
            level?: ScopeLevel;
            entities?: string[];
        }, {
            level?: ScopeLevel;
            entities?: string[];
        }>>;
        uiAccess: z.ZodOptional<z.ZodNativeEnum<typeof UIAccess>>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        description?: string;
        permissions?: string[];
        scope?: {
            level?: ScopeLevel;
            entities?: string[];
        };
        uiAccess?: UIAccess;
    }, {
        name?: string;
        description?: string;
        permissions?: string[];
        scope?: {
            level?: ScopeLevel;
            entities?: string[];
        };
        uiAccess?: UIAccess;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        name?: string;
        description?: string;
        permissions?: string[];
        scope?: {
            level?: ScopeLevel;
            entities?: string[];
        };
        uiAccess?: UIAccess;
    };
}, {
    body?: {
        name?: string;
        description?: string;
        permissions?: string[];
        scope?: {
            level?: ScopeLevel;
            entities?: string[];
        };
        uiAccess?: UIAccess;
    };
}>;
export declare const assignRoleSchema: z.ZodObject<{
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
        status?: RoleStatus;
        search?: string;
        limit?: number;
        type?: RoleType;
        department?: string;
        scope?: ScopeLevel;
        page?: number;
        sortBy?: "name" | "status" | "createdAt";
        sortOrder?: "asc" | "desc";
    }, {
        status?: RoleStatus;
        search?: string;
        limit?: string;
        type?: RoleType;
        department?: string;
        scope?: ScopeLevel;
        page?: string;
        sortBy?: "name" | "status" | "createdAt";
        sortOrder?: "asc" | "desc";
    }>;
}, "strip", z.ZodTypeAny, {
    query?: {
        status?: RoleStatus;
        search?: string;
        limit?: number;
        type?: RoleType;
        department?: string;
        scope?: ScopeLevel;
        page?: number;
        sortBy?: "name" | "status" | "createdAt";
        sortOrder?: "asc" | "desc";
    };
}, {
    query?: {
        status?: RoleStatus;
        search?: string;
        limit?: string;
        type?: RoleType;
        department?: string;
        scope?: ScopeLevel;
        page?: string;
        sortBy?: "name" | "status" | "createdAt";
        sortOrder?: "asc" | "desc";
    };
}>;
export declare const publishRoleSchema: z.ZodObject<{
    body: z.ZodObject<{
        confirm: z.ZodDefault<z.ZodOptional<z.ZodEffects<z.ZodBoolean, boolean, boolean>>>;
    }, "strip", z.ZodTypeAny, {
        confirm?: boolean;
    }, {
        confirm?: boolean;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        confirm?: boolean;
    };
}, {
    body?: {
        confirm?: boolean;
    };
}>;
export declare const cloneRoleSchema: z.ZodObject<{
    body: z.ZodObject<{
        name: z.ZodString;
        description: z.ZodOptional<z.ZodString>;
    }, "strip", z.ZodTypeAny, {
        name?: string;
        description?: string;
    }, {
        name?: string;
        description?: string;
    }>;
}, "strip", z.ZodTypeAny, {
    body?: {
        name?: string;
        description?: string;
    };
}, {
    body?: {
        name?: string;
        description?: string;
    };
}>;
//# sourceMappingURL=role.validator.d.ts.map