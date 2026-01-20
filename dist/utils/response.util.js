"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendInternalError = exports.sendConflict = exports.sendValidationError = exports.sendForbidden = exports.sendUnauthorized = exports.sendNotFound = exports.sendPaginatedResponse = exports.sendError = exports.sendCreated = exports.sendSuccess = void 0;
const constants_1 = require("../config/constants");
const sendSuccess = (res, data, message = "Success", statusCode = constants_1.HTTP_STATUS.OK) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};
exports.sendSuccess = sendSuccess;
const sendCreated = (res, data, message = "Created successfully") => {
    return res.status(constants_1.HTTP_STATUS.CREATED).json({
        success: true,
        message,
        data,
    });
};
exports.sendCreated = sendCreated;
const sendError = (res, message, statusCode = constants_1.HTTP_STATUS.BAD_REQUEST, errors) => {
    return res.status(statusCode).json({
        success: false,
        message,
        errors: errors || null,
    });
};
exports.sendError = sendError;
const sendPaginatedResponse = (res, data, page, limit, total, message = "Success") => {
    const pages = Math.ceil(total / limit);
    return res.status(constants_1.HTTP_STATUS.OK).json({
        success: true,
        message,
        data,
        pagination: {
            page,
            limit,
            total,
            pages,
        },
    });
};
exports.sendPaginatedResponse = sendPaginatedResponse;
const sendNotFound = (res, message = "Resource not found") => {
    return res.status(constants_1.HTTP_STATUS.NOT_FOUND).json({
        success: false,
        message,
    });
};
exports.sendNotFound = sendNotFound;
const sendUnauthorized = (res, message = "Unauthorized access") => {
    return res.status(constants_1.HTTP_STATUS.UNAUTHORIZED).json({
        success: false,
        message,
    });
};
exports.sendUnauthorized = sendUnauthorized;
const sendForbidden = (res, message = "Access forbidden") => {
    return res.status(constants_1.HTTP_STATUS.FORBIDDEN).json({
        success: false,
        message,
    });
};
exports.sendForbidden = sendForbidden;
const sendValidationError = (res, errors, message = "Validation failed") => {
    return res.status(constants_1.HTTP_STATUS.UNPROCESSABLE_ENTITY).json({
        success: false,
        message,
        errors,
    });
};
exports.sendValidationError = sendValidationError;
const sendConflict = (res, message = "Resource already exists") => {
    return res.status(constants_1.HTTP_STATUS.CONFLICT).json({
        success: false,
        message,
    });
};
exports.sendConflict = sendConflict;
const sendInternalError = (res, message = "Internal server error") => {
    return res.status(constants_1.HTTP_STATUS.INTERNAL_SERVER_ERROR).json({
        success: false,
        message,
    });
};
exports.sendInternalError = sendInternalError;
