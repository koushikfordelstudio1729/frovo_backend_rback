import { Request, Response, NextFunction } from "express";
import { z, ZodError } from "zod";
import { sendValidationError } from "../utils/response.util";
import { asyncHandler } from "../utils/asyncHandler.util";

interface ValidationTargets {
  body?: z.ZodSchema;
  query?: z.ZodSchema;
  params?: z.ZodSchema;
}

export const validate = (schemas: ValidationTargets) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request body
      if (schemas.body) {
        req.body = schemas.body.parse(req.body);
      }

      // Validate query parameters
      if (schemas.query) {
        req.query = schemas.query.parse(req.query);
      }

      // Validate URL parameters
      if (schemas.params) {
        req.params = schemas.params.parse(req.params);
      }

      return next();
    } catch (error) {
      if (error instanceof ZodError) {
        const formattedErrors = error.errors.map(err => ({
          field: err.path.join("."),
          message: err.message,
          code: err.code,
        }));

        return sendValidationError(res, formattedErrors);
      }

      return next(error);
    }
  });
};

// Common validation schemas
export const commonSchemas = {
  objectId: z.string().regex(/^[0-9a-fA-F]{24}$/, "Invalid ObjectId format"),

  pagination: z.object({
    page: z
      .string()
      .optional()
      .transform(val => (val ? parseInt(val, 10) : 1)),
    limit: z
      .string()
      .optional()
      .transform(val => (val ? parseInt(val, 10) : 10)),
  }),

  search: z.object({
    search: z.string().optional(),
    sortBy: z.string().optional(),
    sortOrder: z.enum(["asc", "desc"]).optional(),
  }),

  dateRange: z.object({
    startDate: z.string().datetime().optional(),
    endDate: z.string().datetime().optional(),
  }),
};

// Helper function to validate ObjectId
export const validateObjectId = (field = "id") => {
  return validate({
    params: z.object({
      [field]: commonSchemas.objectId,
    }),
  });
};

// Helper function to validate pagination
export const validatePagination = () => {
  return validate({
    query: commonSchemas.pagination,
  });
};

// Helper function to validate search parameters
export const validateSearch = () => {
  return validate({
    query: commonSchemas.search,
  });
};

// Helper function to validate date range
export const validateDateRange = () => {
  return validate({
    query: commonSchemas.dateRange,
  });
};
