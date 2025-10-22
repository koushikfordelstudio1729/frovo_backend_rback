"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.catchAsync = exports.notFound = exports.errorHandler = void 0;
const jsonwebtoken_1 = require("jsonwebtoken");
const zod_1 = require("zod");
const response_util_1 = require("../utils/response.util");
const logger_util_1 = require("../utils/logger.util");
const constants_1 = require("../config/constants");
const errorHandler = (err, req, res, _next) => {
    let error = { ...err };
    error.message = err.message;
    logger_util_1.logger.error('API Error:', {
        message: err.message,
        stack: err.stack,
        url: req.originalUrl,
        method: req.method,
        ip: req.ip,
        user: req.user?.email || 'Anonymous'
    });
    if (err.name === 'CastError') {
        const message = 'Invalid resource ID format';
        return (0, response_util_1.sendError)(res, message, constants_1.HTTP_STATUS.BAD_REQUEST);
    }
    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0];
        const message = field
            ? `Duplicate value for field: ${field}`
            : 'Duplicate resource exists';
        return (0, response_util_1.sendError)(res, message, constants_1.HTTP_STATUS.CONFLICT);
    }
    if (err.name === 'ValidationError') {
        const errors = Object.values(err.errors || {}).map((error) => ({
            field: error.path,
            message: error.message
        }));
        return (0, response_util_1.sendValidationError)(res, errors, 'Validation failed');
    }
    if (err instanceof jsonwebtoken_1.TokenExpiredError) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.TOKEN_EXPIRED, constants_1.HTTP_STATUS.UNAUTHORIZED);
    }
    if (err instanceof jsonwebtoken_1.JsonWebTokenError) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.TOKEN_INVALID, constants_1.HTTP_STATUS.UNAUTHORIZED);
    }
    if (err instanceof zod_1.ZodError) {
        const errors = err.errors.map(error => ({
            field: error.path.join('.'),
            message: error.message,
            code: error.code
        }));
        return (0, response_util_1.sendValidationError)(res, errors);
    }
    if (err.statusCode) {
        return (0, response_util_1.sendError)(res, err.message, err.statusCode);
    }
    const message = process.env['NODE_ENV'] === 'production'
        ? 'Internal server error'
        : err.message;
    return (0, response_util_1.sendInternalError)(res, message);
};
exports.errorHandler = errorHandler;
const notFound = (req, res, _next) => {
    const message = `Route not found: ${req.originalUrl}`;
    return (0, response_util_1.sendError)(res, message, constants_1.HTTP_STATUS.NOT_FOUND);
};
exports.notFound = notFound;
const catchAsync = (fn) => {
    return (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    };
};
exports.catchAsync = catchAsync;
//# sourceMappingURL=errorHandler.middleware.js.map