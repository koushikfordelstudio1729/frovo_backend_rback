"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cloneRoleSchema = exports.publishRoleSchema = exports.getRolesQuerySchema = exports.assignRoleSchema = exports.updateRoleSchema = exports.createRoleSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../models/enums");
const objectIdSchema = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');
exports.createRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(2, 'Role name must be at least 2 characters')
            .max(100, 'Role name cannot exceed 100 characters')
            .trim(),
        description: zod_1.z.string()
            .max(500, 'Description cannot exceed 500 characters')
            .trim()
            .optional(),
        type: zod_1.z.nativeEnum(enums_1.RoleType)
            .optional()
            .default(enums_1.RoleType.CUSTOM),
        department: objectIdSchema.optional(),
        permissions: zod_1.z.array(zod_1.z.string().trim())
            .min(1, 'At least one permission is required'),
        scope: zod_1.z.object({
            level: zod_1.z.nativeEnum(enums_1.ScopeLevel, {
                errorMap: () => ({ message: 'Scope level must be global, partner, region, or machine' })
            }),
            entities: zod_1.z.array(objectIdSchema).optional()
        }),
        uiAccess: zod_1.z.nativeEnum(enums_1.UIAccess, {
            errorMap: () => ({ message: 'Invalid UI access value' })
        })
    }).refine((data) => {
        if (data.scope.level !== enums_1.ScopeLevel.GLOBAL && (!data.scope.entities || data.scope.entities.length === 0)) {
            return false;
        }
        return true;
    }, {
        message: 'Entities are required for non-global scope levels',
        path: ['scope', 'entities']
    })
});
exports.updateRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(2, 'Role name must be at least 2 characters')
            .max(100, 'Role name cannot exceed 100 characters')
            .trim()
            .optional(),
        description: zod_1.z.string()
            .max(500, 'Description cannot exceed 500 characters')
            .trim()
            .optional(),
        permissions: zod_1.z.array(zod_1.z.string().trim())
            .min(1, 'At least one permission is required')
            .optional(),
        scope: zod_1.z.object({
            level: zod_1.z.nativeEnum(enums_1.ScopeLevel),
            entities: zod_1.z.array(objectIdSchema).optional()
        }).optional(),
        uiAccess: zod_1.z.nativeEnum(enums_1.UIAccess).optional()
    })
});
exports.assignRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        userIds: zod_1.z.array(objectIdSchema)
            .min(1, 'At least one user ID is required')
    })
});
exports.getRolesQuerySchema = zod_1.z.object({
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
        search: zod_1.z.string()
            .trim()
            .optional(),
        scope: zod_1.z.nativeEnum(enums_1.ScopeLevel).optional(),
        type: zod_1.z.nativeEnum(enums_1.RoleType).optional(),
        status: zod_1.z.nativeEnum(enums_1.RoleStatus).optional(),
        department: objectIdSchema.optional(),
        sortBy: zod_1.z.enum(['name', 'createdAt', 'status'])
            .optional()
            .default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc'])
            .optional()
            .default('desc')
    })
});
exports.publishRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        confirm: zod_1.z.boolean()
            .refine((val) => val === true, 'Confirmation is required to publish role')
            .optional()
            .default(true)
    })
});
exports.cloneRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(2, 'Role name must be at least 2 characters')
            .max(100, 'Role name cannot exceed 100 characters')
            .trim(),
        description: zod_1.z.string()
            .max(500, 'Description cannot exceed 500 characters')
            .trim()
            .optional()
    })
});
