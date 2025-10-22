export declare const HTTP_STATUS: {
    readonly OK: 200;
    readonly CREATED: 201;
    readonly NO_CONTENT: 204;
    readonly BAD_REQUEST: 400;
    readonly UNAUTHORIZED: 401;
    readonly FORBIDDEN: 403;
    readonly NOT_FOUND: 404;
    readonly CONFLICT: 409;
    readonly UNPROCESSABLE_ENTITY: 422;
    readonly TOO_MANY_REQUESTS: 429;
    readonly INTERNAL_SERVER_ERROR: 500;
};
export declare const MESSAGES: {
    readonly SUCCESS: "Success";
    readonly CREATED: "Created successfully";
    readonly UPDATED: "Updated successfully";
    readonly DELETED: "Deleted successfully";
    readonly NOT_FOUND: "Resource not found";
    readonly UNAUTHORIZED: "Unauthorized access";
    readonly FORBIDDEN: "Access forbidden";
    readonly INVALID_CREDENTIALS: "Invalid credentials";
    readonly TOKEN_EXPIRED: "Token has expired";
    readonly TOKEN_INVALID: "Invalid token";
    readonly VALIDATION_ERROR: "Validation failed";
    readonly PERMISSION_DENIED: "Permission denied";
    readonly USER_EXISTS: "User already exists";
    readonly USER_NOT_FOUND: "User not found";
    readonly ROLE_NOT_FOUND: "Role not found";
    readonly DEPARTMENT_NOT_FOUND: "Department not found";
    readonly PERMISSION_NOT_FOUND: "Permission not found";
    readonly INVALID_OPERATION: "Invalid operation";
    readonly SYSTEM_ROLE_DELETE: "System roles cannot be deleted";
    readonly ROLE_IN_USE: "Role is currently assigned to users";
    readonly DEPARTMENT_IN_USE: "Department has members or roles assigned";
    readonly SUPER_ADMIN_EXISTS: "Super Admin already exists";
    readonly LOGIN_SUCCESS: "Login successful";
    readonly LOGOUT_SUCCESS: "Logout successful";
    readonly REGISTER_SUCCESS: "Registration successful";
    readonly ACCESS_REQUEST_CREATED: "Access request created successfully";
    readonly ACCESS_REQUEST_APPROVED: "Access request approved";
    readonly ACCESS_REQUEST_REJECTED: "Access request rejected";
};
export declare const DEFAULT_PAGINATION: {
    readonly PAGE: 1;
    readonly LIMIT: 10;
    readonly MAX_LIMIT: 100;
};
export declare const TOKEN_TYPES: {
    readonly ACCESS: "access";
    readonly REFRESH: "refresh";
};
export declare const AUDIT_ACTIONS: {
    readonly CREATE: "create";
    readonly UPDATE: "update";
    readonly DELETE: "delete";
    readonly LOGIN: "login";
    readonly LOGOUT: "logout";
    readonly ASSIGN: "assign";
    readonly REMOVE: "remove";
    readonly APPROVE: "approve";
    readonly REJECT: "reject";
    readonly PUBLISH: "publish";
};
export declare const MODULES: {
    readonly USERS: "Users";
    readonly ROLES: "Roles";
    readonly DEPARTMENTS: "Departments";
    readonly PERMISSIONS: "Permissions";
    readonly ACCESS_REQUESTS: "AccessRequests";
    readonly SECURITY: "Security";
    readonly AUTH: "Auth";
};
//# sourceMappingURL=constants.d.ts.map