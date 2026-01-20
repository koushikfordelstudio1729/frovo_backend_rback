import { Request, Response, NextFunction } from "express";
import { JsonWebTokenError, TokenExpiredError } from "jsonwebtoken";
import { ZodError } from "zod";
import { sendError, sendInternalError, sendValidationError } from "../utils/response.util";
import { logger } from "../utils/logger.util";
import { HTTP_STATUS, MESSAGES } from "../config/constants";

interface CustomError extends Error {
  statusCode?: number;
  code?: number;
  keyValue?: Record<string, any>;
  errors?: Record<string, any>;
}

export const errorHandler = (
  err: CustomError,
  req: Request,
  res: Response,
  _next: NextFunction
): any => {
  const error = { ...err };
  error.message = err.message;

  logger.error("API Error:", {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: (req as any).user?.email || "Anonymous",
  });

  if (err.name === "CastError") {
    const message = "Invalid resource ID format";
    return sendError(res, message, HTTP_STATUS.BAD_REQUEST);
  }

  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const message = field ? `Duplicate value for field: ${field}` : "Duplicate resource exists";
    return sendError(res, message, HTTP_STATUS.CONFLICT);
  }

  if (err.name === "ValidationError") {
    const errors = Object.values(err.errors || {}).map((error: any) => ({
      field: error.path,
      message: error.message,
    }));
    return sendValidationError(res, errors, "Validation failed");
  }

  if (err instanceof TokenExpiredError) {
    return sendError(res, MESSAGES.TOKEN_EXPIRED, HTTP_STATUS.UNAUTHORIZED);
  }

  if (err instanceof JsonWebTokenError) {
    return sendError(res, MESSAGES.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
  }

  if (err instanceof ZodError) {
    const errors = err.errors.map(error => ({
      field: error.path.join("."),
      message: error.message,
      code: error.code,
    }));
    return sendValidationError(res, errors);
  }

  if (err.statusCode) {
    return sendError(res, err.message, err.statusCode);
  }

  const message = process.env["NODE_ENV"] === "production" ? "Internal server error" : err.message;

  return sendInternalError(res, message);
};

export const notFound = (req: Request, res: Response, _next: NextFunction): any => {
  const message = `Route not found: ${req.originalUrl}`;
  return sendError(res, message, HTTP_STATUS.NOT_FOUND);
};

export const catchAsync = (
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void> | void
) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
