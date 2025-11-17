"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateUserPasswordSchema = exports.getUsersQuerySchema = exports.getUsersQueryBaseSchema = exports.assignDepartmentsSchema = exports.assignRolesSchema = exports.updateUserStatusSchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../models/enums");
const objectIdSchema = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');
exports.createUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(2, 'Name must be at least 2 characters')
            .max(100, 'Name cannot exceed 100 characters')
            .trim(),
        email: zod_1.z.string()
            .email('Invalid email format')
            .toLowerCase()
            .trim(),
        phone: zod_1.z.string()
            .regex(/^[+]?[\s\d-()]+$/, 'Invalid phone number format')
            .optional(),
        password: zod_1.z.string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
        departments: zod_1.z.array(objectIdSchema)
            .optional()
            .default([]),
        roles: zod_1.z.array(objectIdSchema)
            .optional()
            .default([])
    })
});
exports.updateUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string()
            .min(2, 'Name must be at least 2 characters')
            .max(100, 'Name cannot exceed 100 characters')
            .trim()
            .optional(),
        phone: zod_1.z.string()
            .regex(/^[+]?[\s\d-()]+$/, 'Invalid phone number format')
            .optional(),
        departments: zod_1.z.array(objectIdSchema)
            .optional(),
        roles: zod_1.z.array(objectIdSchema)
            .optional()
    })
});
exports.updateUserStatusSchema = zod_1.z.object({
    body: zod_1.z.object({
        status: zod_1.z.nativeEnum(enums_1.UserStatus, {
            errorMap: () => ({ message: 'Status must be active, inactive, or suspended' })
        })
    })
});
exports.assignRolesSchema = zod_1.z.object({
    body: zod_1.z.object({
        roleIds: zod_1.z.array(objectIdSchema)
            .min(1, 'At least one role ID is required')
    })
});
exports.assignDepartmentsSchema = zod_1.z.object({
    body: zod_1.z.object({
        departmentIds: zod_1.z.array(objectIdSchema)
            .min(1, 'At least one department ID is required')
    })
});
exports.getUsersQueryBaseSchema = zod_1.z.object({
    page: zod_1.z.string()
        .optional()
        .default('1')
        .transform((val) => parseInt(val, 10))
        .refine((val) => val > 0, 'Page must be greater than 0'),
    limit: zod_1.z.string()
        .optional()
        .default('10')
        .transform((val) => parseInt(val, 10))
        .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
    search: zod_1.z.string()
        .trim()
        .optional(),
    role: objectIdSchema.optional(),
    department: objectIdSchema.optional(),
    status: zod_1.z.nativeEnum(enums_1.UserStatus).optional(),
    sortBy: zod_1.z.enum(['name', 'email', 'createdAt', 'lastLogin'])
        .optional()
        .default('createdAt'),
    sortOrder: zod_1.z.enum(['asc', 'desc'])
        .optional()
        .default('desc')
});
exports.getUsersQuerySchema = zod_1.z.object({
    query: exports.getUsersQueryBaseSchema
});
exports.updateUserPasswordSchema = zod_1.z.object({
    body: zod_1.z.object({
        newPassword: zod_1.z.string()
            .min(8, 'Password must be at least 8 characters')
            .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
    })
});
