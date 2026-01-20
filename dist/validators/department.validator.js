"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDepartmentsQuerySchema = exports.addRolesSchema = exports.addMembersSchema = exports.updateDepartmentSchema = exports.createDepartmentSchema = void 0;
const zod_1 = require("zod");
const enums_1 = require("../models/enums");
const objectIdSchema = zod_1.z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");
exports.createDepartmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string()
            .min(2, "Department name must be at least 2 characters")
            .max(100, "Department name cannot exceed 100 characters")
            .trim(),
        systemName: zod_1.z.nativeEnum(enums_1.DepartmentName).optional(),
        description: zod_1.z.string().max(500, "Description cannot exceed 500 characters").trim().optional(),
        roles: zod_1.z.array(objectIdSchema).optional().default([]),
        members: zod_1.z.array(objectIdSchema).optional().default([]),
    }),
});
exports.updateDepartmentSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z
            .string()
            .min(2, "Department name must be at least 2 characters")
            .max(100, "Department name cannot exceed 100 characters")
            .trim()
            .optional(),
        description: zod_1.z.string().max(500, "Description cannot exceed 500 characters").trim().optional(),
        roles: zod_1.z.array(objectIdSchema).optional(),
    }),
});
exports.addMembersSchema = zod_1.z.object({
    body: zod_1.z.object({
        userIds: zod_1.z.array(objectIdSchema).min(1, "At least one user ID is required"),
    }),
});
exports.addRolesSchema = zod_1.z.object({
    body: zod_1.z.object({
        roleIds: zod_1.z.array(objectIdSchema).min(1, "At least one role ID is required"),
    }),
});
exports.getDepartmentsQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z
            .string()
            .transform(val => parseInt(val, 10))
            .refine(val => val > 0, "Page must be greater than 0")
            .optional()
            .default("1"),
        limit: zod_1.z
            .string()
            .transform(val => parseInt(val, 10))
            .refine(val => val > 0 && val <= 100, "Limit must be between 1 and 100")
            .optional()
            .default("10"),
        search: zod_1.z.string().trim().optional(),
        sortBy: zod_1.z.enum(["name", "createdAt", "memberCount"]).optional().default("createdAt"),
        sortOrder: zod_1.z.enum(["asc", "desc"]).optional().default("desc"),
    }),
});
