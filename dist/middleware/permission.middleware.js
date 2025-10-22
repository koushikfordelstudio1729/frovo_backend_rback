"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireAllPermissions = exports.requireAnyPermission = exports.requireSuperAdmin = exports.requireSystemRole = exports.requireRole = exports.requirePermission = void 0;
const models_1 = require("../models");
const response_util_1 = require("../utils/response.util");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const constants_1 = require("../config/constants");
const hasPermission = (userPermissions, required) => {
    if (userPermissions.includes('*:*'))
        return true;
    if (userPermissions.includes(required))
        return true;
    const [module] = required.split(':');
    if (userPermissions.includes(`${module}:*`))
        return true;
    return false;
};
const getUserEffectivePermissions = async (user) => {
    if (!user.roles || user.roles.length === 0) {
        return [];
    }
    const permissions = new Set();
    for (const role of user.roles) {
        if (role.permissions.includes('*:*')) {
            return ['*:*'];
        }
        role.permissions.forEach((p) => permissions.add(p));
    }
    return Array.from(permissions);
};
const checkScopedAccess = async (user, entityId) => {
    if (!user.roles || user.roles.length === 0) {
        return false;
    }
    for (const role of user.roles) {
        if (role.scope.level === models_1.ScopeLevel.GLOBAL)
            return true;
        if (!entityId)
            return true;
        if (role.scope.entities && role.scope.entities.some((id) => id.toString() === entityId)) {
            return true;
        }
    }
    return false;
};
const requirePermission = (permission, checkScope = false) => {
    return (0, asyncHandler_util_1.asyncHandler)(async (req, res, next) => {
        if (!req.user) {
            return (0, response_util_1.sendForbidden)(res, constants_1.MESSAGES.UNAUTHORIZED);
        }
        const userPermissions = await getUserEffectivePermissions(req.user);
        if (!hasPermission(userPermissions, permission)) {
            return (0, response_util_1.sendForbidden)(res, constants_1.MESSAGES.PERMISSION_DENIED);
        }
        if (checkScope) {
            const entityId = req.params['id'] || req.params['entityId'] || req.body['entityId'];
            const hasScope = await checkScopedAccess(req.user, entityId);
            if (!hasScope) {
                return (0, response_util_1.sendForbidden)(res, 'Access denied for this scope');
            }
        }
        return next();
    });
};
exports.requirePermission = requirePermission;
const requireRole = (roleKey) => {
    return (0, asyncHandler_util_1.asyncHandler)(async (req, res, next) => {
        if (!req.user) {
            return (0, response_util_1.sendForbidden)(res, constants_1.MESSAGES.UNAUTHORIZED);
        }
        const hasRole = req.user.roles.some((role) => role.key === roleKey || role.systemRole === roleKey);
        if (!hasRole) {
            return (0, response_util_1.sendForbidden)(res, constants_1.MESSAGES.PERMISSION_DENIED);
        }
        return next();
    });
};
exports.requireRole = requireRole;
const requireSystemRole = (systemRole) => {
    return (0, asyncHandler_util_1.asyncHandler)(async (req, res, next) => {
        if (!req.user) {
            return (0, response_util_1.sendForbidden)(res, constants_1.MESSAGES.UNAUTHORIZED);
        }
        const hasSystemRole = req.user.roles.some((role) => role.systemRole === systemRole);
        if (!hasSystemRole) {
            return (0, response_util_1.sendForbidden)(res, constants_1.MESSAGES.PERMISSION_DENIED);
        }
        return next();
    });
};
exports.requireSystemRole = requireSystemRole;
const requireSuperAdmin = () => {
    return (0, exports.requireSystemRole)(models_1.SystemRole.SUPER_ADMIN);
};
exports.requireSuperAdmin = requireSuperAdmin;
const requireAnyPermission = (permissions) => {
    return (0, asyncHandler_util_1.asyncHandler)(async (req, res, next) => {
        if (!req.user) {
            return (0, response_util_1.sendForbidden)(res, constants_1.MESSAGES.UNAUTHORIZED);
        }
        const userPermissions = await getUserEffectivePermissions(req.user);
        const hasAnyPermission = permissions.some(permission => hasPermission(userPermissions, permission));
        if (!hasAnyPermission) {
            return (0, response_util_1.sendForbidden)(res, constants_1.MESSAGES.PERMISSION_DENIED);
        }
        return next();
    });
};
exports.requireAnyPermission = requireAnyPermission;
const requireAllPermissions = (permissions) => {
    return (0, asyncHandler_util_1.asyncHandler)(async (req, res, next) => {
        if (!req.user) {
            return (0, response_util_1.sendForbidden)(res, constants_1.MESSAGES.UNAUTHORIZED);
        }
        const userPermissions = await getUserEffectivePermissions(req.user);
        const hasAllPermissions = permissions.every(permission => hasPermission(userPermissions, permission));
        if (!hasAllPermissions) {
            return (0, response_util_1.sendForbidden)(res, constants_1.MESSAGES.PERMISSION_DENIED);
        }
        return next();
    });
};
exports.requireAllPermissions = requireAllPermissions;
//# sourceMappingURL=permission.middleware.js.map