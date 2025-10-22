import { z } from 'zod';
import { DepartmentName } from '../models/enums';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

export const createDepartmentSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, 'Department name must be at least 2 characters')
      .max(100, 'Department name cannot exceed 100 characters')
      .trim(),
    systemName: z.nativeEnum(DepartmentName).optional(),
    description: z.string()
      .max(500, 'Description cannot exceed 500 characters')
      .trim()
      .optional(),
    roles: z.array(objectIdSchema)
      .optional()
      .default([]),
    members: z.array(objectIdSchema)
      .optional()
      .default([])
  })
});

export const updateDepartmentSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, 'Department name must be at least 2 characters')
      .max(100, 'Department name cannot exceed 100 characters')
      .trim()
      .optional(),
    description: z.string()
      .max(500, 'Description cannot exceed 500 characters')
      .trim()
      .optional(),
    roles: z.array(objectIdSchema).optional()
  })
});

export const addMembersSchema = z.object({
  body: z.object({
    userIds: z.array(objectIdSchema)
      .min(1, 'At least one user ID is required')
  })
});

export const addRolesSchema = z.object({
  body: z.object({
    roleIds: z.array(objectIdSchema)
      .min(1, 'At least one role ID is required')
  })
});

export const getDepartmentsQuerySchema = z.object({
  query: z.object({
    page: z.string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0, 'Page must be greater than 0')
      .optional()
      .default('1'),
    limit: z.string()
      .transform((val) => parseInt(val, 10))
      .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100')
      .optional()
      .default('10'),
    search: z.string()
      .trim()
      .optional(),
    sortBy: z.enum(['name', 'createdAt', 'memberCount'])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc'])
      .optional()
      .default('desc')
  })
});