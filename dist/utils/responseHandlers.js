"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendForbidden = exports.sendUnauthorized = exports.sendBadRequest = exports.sendNotFound = exports.sendError = exports.sendCreated = exports.sendSuccess = void 0;
const sendSuccess = (res, data, message = 'Success', statusCode = 200) => {
    const response = {
        success: true,
        message,
        data,
        timestamp: new Date()
    };
    res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
const sendCreated = (res, data, message = 'Resource created successfully') => {
    const response = {
        success: true,
        message,
        data,
        timestamp: new Date()
    };
    res.status(201).json(response);
};
exports.sendCreated = sendCreated;
const sendError = (res, error, statusCode = 500) => {
    const response = {
        success: false,
        message: 'Error occurred',
        error,
        timestamp: new Date()
    };
    res.status(statusCode).json(response);
};
exports.sendError = sendError;
const sendNotFound = (res, message = 'Resource not found') => {
    const response = {
        success: false,
        message,
        error: 'Not Found',
        timestamp: new Date()
    };
    res.status(404).json(response);
};
exports.sendNotFound = sendNotFound;
const sendBadRequest = (res, error = 'Bad request') => {
    const response = {
        success: false,
        message: 'Validation error',
        error,
        timestamp: new Date()
    };
    res.status(400).json(response);
};
exports.sendBadRequest = sendBadRequest;
const sendUnauthorized = (res, message = 'Unauthorized') => {
    const response = {
        success: false,
        message,
        error: 'Authentication required',
        timestamp: new Date()
    };
    res.status(401).json(response);
};
exports.sendUnauthorized = sendUnauthorized;
const sendForbidden = (res, message = 'Forbidden') => {
    const response = {
        success: false,
        message,
        error: 'Insufficient permissions',
        timestamp: new Date()
    };
    res.status(403).json(response);
};
exports.sendForbidden = sendForbidden;
//# sourceMappingURL=responseHandlers.js.map