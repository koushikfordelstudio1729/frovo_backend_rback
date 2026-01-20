"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requirePermission = exports.checkPermission = exports.optionalAuth = exports.authenticate = void 0;
const models_1 = require("../models");
const jwt_util_1 = require("../utils/jwt.util");
const response_util_1 = require("../utils/response.util");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const constants_1 = require("../config/constants");
exports.authenticate = (0, asyncHandler_util_1.asyncHandler)(async (req, res, next) => {
    const authHeader = req.headers.authorization;
    let token;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    }
    else {
        token = req.cookies?.["accessToken"];
    }
    if (!token) {
        return (0, response_util_1.sendUnauthorized)(res, constants_1.MESSAGES.UNAUTHORIZED);
    }
    try {
        const decoded = (0, jwt_util_1.verifyAccessToken)(token);
        const user = await models_1.User.findById(decoded.id).populate("roles").populate("departments");
        if (!user) {
            return (0, response_util_1.sendUnauthorized)(res, constants_1.MESSAGES.USER_NOT_FOUND);
        }
        if (user.status !== models_1.UserStatus.ACTIVE) {
            return (0, response_util_1.sendForbidden)(res, "Account is inactive or suspended");
        }
        req.user = user;
        req.clientIp =
            req.ip || req.socket.remoteAddress || req.headers["x-forwarded-for"];
        req.userAgent = req.headers["user-agent"];
        return next();
    }
    catch (error) {
        if (error instanceof Error) {
            if (error.message === "Token has expired") {
                return (0, response_util_1.sendUnauthorized)(res, constants_1.MESSAGES.TOKEN_EXPIRED);
            }
            else if (error.message === "Invalid token") {
                return (0, response_util_1.sendUnauthorized)(res, constants_1.MESSAGES.TOKEN_INVALID);
            }
        }
        return (0, response_util_1.sendUnauthorized)(res, constants_1.MESSAGES.UNAUTHORIZED);
    }
});
exports.optionalAuth = (0, asyncHandler_util_1.asyncHandler)(async (req, _res, next) => {
    const authHeader = req.headers.authorization;
    let token;
    if (authHeader && authHeader.startsWith("Bearer ")) {
        token = authHeader.substring(7);
    }
    else {
        token = req.cookies?.["accessToken"];
    }
    if (!token) {
        return next();
    }
    try {
        const decoded = (0, jwt_util_1.verifyAccessToken)(token);
        const user = await models_1.User.findById(decoded.id).populate("roles").populate("departments");
        if (user && user.status === models_1.UserStatus.ACTIVE) {
            req.user = user;
            req.clientIp =
                req.ip || req.socket.remoteAddress || req.headers["x-forwarded-for"];
            req.userAgent = req.headers["user-agent"];
        }
    }
    catch (error) {
    }
    return next();
});
const checkPermission = (user, requiredPermission) => {
    if (!user || !user.roles) {
        return false;
    }
    const userRoles = user.roles || [];
    return userRoles.some((role) => {
        if (role.permissions?.includes("*:*")) {
            return true;
        }
        if (role.permissions?.includes(requiredPermission)) {
            return true;
        }
        const [module] = requiredPermission.split(":");
        if (role.permissions?.includes(`${module}:*`)) {
            return true;
        }
        return false;
    });
};
exports.checkPermission = checkPermission;
const requirePermission = (requiredPermission) => {
    return (0, asyncHandler_util_1.asyncHandler)(async (req, res, next) => {
        if (!req.user) {
            return (0, response_util_1.sendForbidden)(res, constants_1.MESSAGES.UNAUTHORIZED);
        }
        if (!(0, exports.checkPermission)(req.user, requiredPermission)) {
            return (0, response_util_1.sendForbidden)(res, constants_1.MESSAGES.PERMISSION_DENIED);
        }
        return next();
    });
};
exports.requirePermission = requirePermission;
