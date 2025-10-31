"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.disableMFA = exports.verifyMFA = exports.enableMFA = exports.changePassword = exports.refreshToken = exports.getCurrentUser = exports.logoutFromAllDevices = exports.logout = exports.login = exports.register = void 0;
const auth_service_1 = require("../services/auth.service");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const response_util_1 = require("../utils/response.util");
const constants_1 = require("../config/constants");
const COOKIE_OPTIONS = {
    httpOnly: true,
    secure: process.env['NODE_ENV'] === 'production',
    sameSite: 'strict',
    path: '/'
};
const ACCESS_TOKEN_COOKIE_NAME = 'accessToken';
const REFRESH_TOKEN_COOKIE_NAME = 'refreshToken';
const setCookieTokens = (res, accessToken, refreshToken) => {
    res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
        ...COOKIE_OPTIONS,
        maxAge: 24 * 60 * 60 * 1000
    });
    res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
        ...COOKIE_OPTIONS,
        maxAge: 7 * 24 * 60 * 60 * 1000
    });
};
const clearCookieTokens = (res) => {
    res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, COOKIE_OPTIONS);
    res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, COOKIE_OPTIONS);
};
exports.register = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { name, email, password } = req.body;
    try {
        const deviceInfo = {
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.get('User-Agent') || undefined,
            deviceInfo: req.get('X-Device-Info') || undefined
        };
        const result = await auth_service_1.authService.register({ name, email, password }, req.body.createdBy, deviceInfo);
        setCookieTokens(res, result.accessToken, result.refreshToken);
        return (0, response_util_1.sendCreated)(res, result, constants_1.MESSAGES.REGISTER_SUCCESS);
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Registration failed', 500);
        }
    }
});
exports.login = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { email, password } = req.body;
    try {
        const deviceInfo = {
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.get('User-Agent') || undefined,
            deviceInfo: req.get('X-Device-Info') || undefined
        };
        const result = await auth_service_1.authService.login({ email, password }, deviceInfo);
        setCookieTokens(res, result.accessToken, result.refreshToken);
        return (0, response_util_1.sendSuccess)(res, result, constants_1.MESSAGES.LOGIN_SUCCESS);
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 401);
        }
        else {
            return (0, response_util_1.sendError)(res, constants_1.MESSAGES.INVALID_CREDENTIALS, 401);
        }
    }
});
exports.logout = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    try {
        const refreshToken = req.body.refreshToken || req.get('X-Refresh-Token');
        await auth_service_1.authService.logout(req.user._id.toString(), refreshToken);
        clearCookieTokens(res);
        return (0, response_util_1.sendSuccess)(res, null, constants_1.MESSAGES.LOGOUT_SUCCESS);
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Logout failed', 500);
        }
    }
});
exports.logoutFromAllDevices = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    try {
        await auth_service_1.authService.logoutFromAllDevices(req.user._id.toString());
        clearCookieTokens(res);
        return (0, response_util_1.sendSuccess)(res, null, 'Logged out from all devices successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Logout failed', 500);
        }
    }
});
exports.getCurrentUser = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    try {
        const user = await auth_service_1.authService.getCurrentUser(req.user._id.toString());
        const permissions = await req.user.getPermissions();
        return (0, response_util_1.sendSuccess)(res, {
            user,
            permissions
        });
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to get user data', 500);
    }
});
exports.refreshToken = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { refreshToken } = req.body;
    try {
        const deviceInfo = {
            ipAddress: req.ip || req.socket.remoteAddress,
            userAgent: req.get('User-Agent') || undefined,
            deviceInfo: req.get('X-Device-Info') || undefined
        };
        const tokens = await auth_service_1.authService.refreshToken(refreshToken, deviceInfo);
        setCookieTokens(res, tokens.accessToken, tokens.refreshToken);
        return (0, response_util_1.sendSuccess)(res, tokens, 'Token refreshed successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 401);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Invalid refresh token', 401);
        }
    }
});
exports.changePassword = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    const { currentPassword, newPassword } = req.body;
    try {
        await auth_service_1.authService.changePassword(req.user._id.toString(), currentPassword, newPassword);
        return (0, response_util_1.sendSuccess)(res, null, 'Password changed successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to change password', 500);
        }
    }
});
exports.enableMFA = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    try {
        const result = await auth_service_1.authService.enableMFA(req.user._id.toString());
        return (0, response_util_1.sendSuccess)(res, result, 'MFA enabled successfully');
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'Failed to enable MFA', 500);
        }
    }
});
exports.verifyMFA = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    const { token } = req.body;
    try {
        const isValid = await auth_service_1.authService.verifyMFA(req.user._id.toString(), token);
        if (isValid) {
            return (0, response_util_1.sendSuccess)(res, { valid: true }, 'MFA token verified');
        }
        else {
            return (0, response_util_1.sendError)(res, 'Invalid MFA token', 400);
        }
    }
    catch (error) {
        if (error instanceof Error) {
            return (0, response_util_1.sendError)(res, error.message, 400);
        }
        else {
            return (0, response_util_1.sendError)(res, 'MFA verification failed', 500);
        }
    }
});
exports.disableMFA = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    if (!req.user) {
        return (0, response_util_1.sendError)(res, constants_1.MESSAGES.UNAUTHORIZED, 401);
    }
    try {
        await auth_service_1.authService.disableMFA(req.user._id.toString());
        return (0, response_util_1.sendSuccess)(res, null, 'MFA disabled successfully');
    }
    catch (error) {
        return (0, response_util_1.sendError)(res, 'Failed to disable MFA', 500);
    }
});
//# sourceMappingURL=auth.controller.js.map