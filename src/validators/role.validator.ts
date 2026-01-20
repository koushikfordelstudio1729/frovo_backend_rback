import { z } from "zod";
import { RoleType, RoleStatus, ScopeLevel, UIAccess } from "../models/enums";

const objectIdSchema = z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format");

export const createRoleSchema = z.object({
  body: z
    .object({
      name: z
        .string()
        .min(2, "Role name must be at least 2 characters")
        .max(100, "Role name cannot exceed 100 characters")
        .trim(),
      description: z
        .string()
        .max(500, "Description cannot exceed 500 characters")
        .trim()
        .optional(),
      type: z
        .nativeEnum(RoleType)
        .optional()
        .default(RoleType.CUSTOM)
        .refine(val => val !== RoleType.SYSTEM, {
          message: "Cannot create SYSTEM type roles through API",
        }),
      department: objectIdSchema.optional(),
      permissions: z.array(z.string().trim()).min(1, "At least one permission is required"),
      scope: z.object({
        level: z.nativeEnum(ScopeLevel, {
          errorMap: () => ({ message: "Scope level must be global, partner, region, or machine" }),
        }),
        entities: z.array(objectIdSchema).optional(),
      }),
      uiAccess: z.nativeEnum(UIAccess, {
        errorMap: () => ({ message: "Invalid UI access value" }),
      }),
    })
    .refine(
      data => {
        // If scope level is not global, entities should be provided
        if (
          data.scope.level !== ScopeLevel.GLOBAL &&
          (!data.scope.entities || data.scope.entities.length === 0)
        ) {
          return false;
        }
        return true;
      },
      {
        message: "Entities are required for non-global scope levels",
        path: ["scope", "entities"],
      }
    ),
});

export const updateRoleSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Role name must be at least 2 characters")
      .max(100, "Role name cannot exceed 100 characters")
      .trim()
      .optional(),
    description: z.string().max(500, "Description cannot exceed 500 characters").trim().optional(),
    permissions: z
      .array(z.string().trim())
      .min(1, "At least one permission is required")
      .optional(),
    scope: z
      .object({
        level: z.nativeEnum(ScopeLevel),
        entities: z.array(objectIdSchema).optional(),
      })
      .optional(),
    uiAccess: z.nativeEnum(UIAccess).optional(),
  }),
});

export const assignRoleSchema = z.object({
  body: z.object({
    userIds: z.array(objectIdSchema).min(1, "At least one user ID is required"),
  }),
});

export const getRolesQuerySchema = z.object({
  query: z.object({
    page: z
      .string()
      .transform(val => parseInt(val, 10))
      .refine(val => val > 0, "Page must be greater than 0")
      .optional()
      .default("1"),
    limit: z
      .string()
      .transform(val => parseInt(val, 10))
      .refine(val => val > 0 && val <= 100, "Limit must be between 1 and 100")
      .optional()
      .default("10"),
    search: z.string().trim().optional(),
    scope: z.nativeEnum(ScopeLevel).optional(),
    type: z.nativeEnum(RoleType).optional(),
    status: z.nativeEnum(RoleStatus).optional(),
    department: objectIdSchema.optional(),
    sortBy: z.enum(["name", "createdAt", "status"]).optional().default("createdAt"),
    sortOrder: z.enum(["asc", "desc"]).optional().default("desc"),
  }),
});

export const publishRoleSchema = z.object({
  body: z.object({
    confirm: z
      .boolean()
      .refine(val => val === true, "Confirmation is required to publish role")
      .optional()
      .default(true),
  }),
});

export const cloneRoleSchema = z.object({
  body: z.object({
    name: z
      .string()
      .min(2, "Role name must be at least 2 characters")
      .max(100, "Role name cannot exceed 100 characters")
      .trim(),
    description: z.string().max(500, "Description cannot exceed 500 characters").trim().optional(),
  }),
});
