import { z } from 'zod';
import { UserStatus } from '../models/enums';

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, 'Invalid ObjectId format');

export const createUserSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters')
      .trim(),
    email: z.string()
      .email('Invalid email format')
      .toLowerCase()
      .trim(),
    phone: z.string()
      .regex(/^[+]?[\s\d-()]+$/, 'Invalid phone number format')
      .optional(),
    password: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number'),
    departments: z.array(objectIdSchema)
      .optional()
      .default([]),
    roles: z.array(objectIdSchema)
      .optional()
      .default([])
  })
});

export const updateUserSchema = z.object({
  body: z.object({
    name: z.string()
      .min(2, 'Name must be at least 2 characters')
      .max(100, 'Name cannot exceed 100 characters')
      .trim()
      .optional(),
    phone: z.string()
      .regex(/^[+]?[\s\d-()]+$/, 'Invalid phone number format')
      .optional(),
    departments: z.array(objectIdSchema)
      .optional(),
    roles: z.array(objectIdSchema)
      .optional()
  })
});

export const updateUserStatusSchema = z.object({
  body: z.object({
    status: z.nativeEnum(UserStatus, {
      errorMap: () => ({ message: 'Status must be active, inactive, or suspended' })
    })
  })
});

export const assignRolesSchema = z.object({
  body: z.object({
    roleIds: z.array(objectIdSchema)
      .min(1, 'At least one role ID is required')
  })
});

export const assignDepartmentsSchema = z.object({
  body: z.object({
    departmentIds: z.array(objectIdSchema)
      .min(1, 'At least one department ID is required')
  })
});

export const getUsersQuerySchema = z.object({
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
    role: objectIdSchema.optional(),
    department: objectIdSchema.optional(),
    status: z.nativeEnum(UserStatus).optional(),
    sortBy: z.enum(['name', 'email', 'createdAt', 'lastLogin'])
      .optional()
      .default('createdAt'),
    sortOrder: z.enum(['asc', 'desc'])
      .optional()
      .default('desc')
  })
});

export const updateUserPasswordSchema = z.object({
  body: z.object({
    newPassword: z.string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/, 'Password must contain at least one uppercase letter, one lowercase letter, and one number')
  })
});