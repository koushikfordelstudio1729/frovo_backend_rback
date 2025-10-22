import { Request, Response, NextFunction } from 'express';
import { JsonWebTokenError, TokenExpiredError } from 'jsonwebtoken';
import { ZodError } from 'zod';
import { sendError, sendInternalError, sendValidationError } from '../utils/response.util';
import { logger } from '../utils/logger.util';
import { HTTP_STATUS, MESSAGES } from '../config/constants';

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
  let error = { ...err };
  error.message = err.message;

  // Log error
  logger.error('API Error:', {
    message: err.message,
    stack: err.stack,
    url: req.originalUrl,
    method: req.method,
    ip: req.ip,
    user: (req as any).user?.email || 'Anonymous'
  });

  // Mongoose bad ObjectId
  if (err.name === 'CastError') {
    const message = 'Invalid resource ID format';
    return sendError(res, message, HTTP_STATUS.BAD_REQUEST);
  }

  // Mongoose duplicate key error
  if (err.code === 11000) {
    const field = Object.keys(err.keyValue || {})[0];
    const message = field 
      ? `Duplicate value for field: ${field}` 
      : 'Duplicate resource exists';
    return sendError(res, message, HTTP_STATUS.CONFLICT);
  }

  // Mongoose validation error
  if (err.name === 'ValidationError') {
    const errors = Object.values(err.errors || {}).map((error: any) => ({
      field: error.path,
      message: error.message
    }));
    return sendValidationError(res, errors, 'Validation failed');
  }

  // JWT errors
  if (err instanceof TokenExpiredError) {
    return sendError(res, MESSAGES.TOKEN_EXPIRED, HTTP_STATUS.UNAUTHORIZED);
  }

  if (err instanceof JsonWebTokenError) {
    return sendError(res, MESSAGES.TOKEN_INVALID, HTTP_STATUS.UNAUTHORIZED);
  }

  // Zod validation errors
  if (err instanceof ZodError) {
    const errors = err.errors.map(error => ({
      field: error.path.join('.'),
      message: error.message,
      code: error.code
    }));
    return sendValidationError(res, errors);
  }

  // Custom application errors
  if (err.statusCode) {
    return sendError(res, err.message, err.statusCode);
  }

  // Default to internal server error
  const message = process.env['NODE_ENV'] === 'production' 
    ? 'Internal server error' 
    : err.message;
    
  return sendInternalError(res, message);
};

// 404 handler
export const notFound = (req: Request, res: Response, _next: NextFunction): any => {
  const message = `Route not found: ${req.originalUrl}`;
  return sendError(res, message, HTTP_STATUS.NOT_FOUND);
};

// Async error wrapper (alternative to asyncHandler utility)
export const catchAsync = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};