"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.MODULES = exports.AUDIT_ACTIONS = exports.TOKEN_TYPES = exports.DEFAULT_PAGINATION = exports.MESSAGES = exports.HTTP_STATUS = void 0;
exports.HTTP_STATUS = {
    OK: 200,
    CREATED: 201,
    NO_CONTENT: 204,
    BAD_REQUEST: 400,
    UNAUTHORIZED: 401,
    FORBIDDEN: 403,
    NOT_FOUND: 404,
    CONFLICT: 409,
    UNPROCESSABLE_ENTITY: 422,
    TOO_MANY_REQUESTS: 429,
    INTERNAL_SERVER_ERROR: 500,
};
exports.MESSAGES = {
    SUCCESS: "Success",
    CREATED: "Created successfully",
    UPDATED: "Updated successfully",
    DELETED: "Deleted successfully",
    NOT_FOUND: "Resource not found",
    UNAUTHORIZED: "Unauthorized access",
    FORBIDDEN: "Access forbidden",
    INVALID_CREDENTIALS: "Invalid credentials",
    TOKEN_EXPIRED: "Token has expired",
    TOKEN_INVALID: "Invalid token",
    VALIDATION_ERROR: "Validation failed",
    PERMISSION_DENIED: "Permission denied",
    USER_EXISTS: "User already exists",
    USER_NOT_FOUND: "User not found",
    ROLE_NOT_FOUND: "Role not found",
    DEPARTMENT_NOT_FOUND: "Department not found",
    PERMISSION_NOT_FOUND: "Permission not found",
    INVALID_OPERATION: "Invalid operation",
    SYSTEM_ROLE_DELETE: "System roles cannot be deleted",
    ROLE_IN_USE: "Role is currently assigned to users",
    DEPARTMENT_IN_USE: "Department has members or roles assigned",
    SUPER_ADMIN_EXISTS: "Super Admin already exists",
    LOGIN_SUCCESS: "Login successful",
    LOGOUT_SUCCESS: "Logout successful",
    REGISTER_SUCCESS: "Registration successful",
    ACCESS_REQUEST_CREATED: "Access request created successfully",
    ACCESS_REQUEST_APPROVED: "Access request approved",
    ACCESS_REQUEST_REJECTED: "Access request rejected",
};
exports.DEFAULT_PAGINATION = {
    PAGE: 1,
    LIMIT: 10,
    MAX_LIMIT: 100,
};
exports.TOKEN_TYPES = {
    ACCESS: "access",
    REFRESH: "refresh",
};
exports.AUDIT_ACTIONS = {
    CREATE: "create",
    UPDATE: "update",
    DELETE: "delete",
    LOGIN: "login",
    LOGOUT: "logout",
    ASSIGN: "assign",
    REMOVE: "remove",
    APPROVE: "approve",
    REJECT: "reject",
    PUBLISH: "publish",
};
exports.MODULES = {
    USERS: "Users",
    ROLES: "Roles",
    DEPARTMENTS: "Departments",
    PERMISSIONS: "Permissions",
    ACCESS_REQUESTS: "AccessRequests",
    SECURITY: "Security",
    AUTH: "Auth",
};
