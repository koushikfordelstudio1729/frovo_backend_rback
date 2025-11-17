"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.UIAccess = exports.PermissionAction = exports.PermissionModule = exports.DepartmentName = exports.SystemRole = exports.AccessRequestStatus = exports.ScopeLevel = exports.RoleStatus = exports.RoleType = exports.UserStatus = void 0;
var UserStatus;
(function (UserStatus) {
    UserStatus["ACTIVE"] = "active";
    UserStatus["INACTIVE"] = "inactive";
    UserStatus["SUSPENDED"] = "suspended";
})(UserStatus || (exports.UserStatus = UserStatus = {}));
var RoleType;
(function (RoleType) {
    RoleType["SYSTEM"] = "system";
    RoleType["CUSTOM"] = "custom";
})(RoleType || (exports.RoleType = RoleType = {}));
var RoleStatus;
(function (RoleStatus) {
    RoleStatus["DRAFT"] = "draft";
    RoleStatus["PUBLISHED"] = "published";
})(RoleStatus || (exports.RoleStatus = RoleStatus = {}));
var ScopeLevel;
(function (ScopeLevel) {
    ScopeLevel["GLOBAL"] = "global";
    ScopeLevel["PARTNER"] = "partner";
    ScopeLevel["REGION"] = "region";
    ScopeLevel["MACHINE"] = "machine";
})(ScopeLevel || (exports.ScopeLevel = ScopeLevel = {}));
var AccessRequestStatus;
(function (AccessRequestStatus) {
    AccessRequestStatus["PENDING"] = "pending";
    AccessRequestStatus["APPROVED"] = "approved";
    AccessRequestStatus["REJECTED"] = "rejected";
    AccessRequestStatus["EXPIRED"] = "expired";
})(AccessRequestStatus || (exports.AccessRequestStatus = AccessRequestStatus = {}));
var SystemRole;
(function (SystemRole) {
    SystemRole["SUPER_ADMIN"] = "super_admin";
    SystemRole["OPS_MANAGER"] = "ops_manager";
    SystemRole["FIELD_AGENT"] = "field_agent";
    SystemRole["TECHNICIAN"] = "technician";
    SystemRole["FINANCE_MANAGER"] = "finance_manager";
    SystemRole["SUPPORT_AGENT"] = "support_agent";
    SystemRole["WAREHOUSE_MANAGER"] = "warehouse_manager";
    SystemRole["AUDITOR"] = "auditor";
    SystemRole["CUSTOMER"] = "customer";
})(SystemRole || (exports.SystemRole = SystemRole = {}));
var DepartmentName;
(function (DepartmentName) {
    DepartmentName["SYSTEM_ADMIN"] = "System Admin";
    DepartmentName["OPERATIONS"] = "Operations";
    DepartmentName["FIELD_OPERATIONS"] = "Field Operations";
    DepartmentName["MAINTENANCE"] = "Maintenance";
    DepartmentName["FINANCE"] = "Finance";
    DepartmentName["SUPPORT"] = "Support";
    DepartmentName["WAREHOUSE"] = "Warehouse";
    DepartmentName["COMPLIANCE"] = "Compliance";
    DepartmentName["CUSTOMER"] = "Customer";
})(DepartmentName || (exports.DepartmentName = DepartmentName = {}));
var PermissionModule;
(function (PermissionModule) {
    PermissionModule["MACHINES"] = "machines";
    PermissionModule["PLANOGRAM"] = "planogram";
    PermissionModule["ORDERS"] = "orders";
    PermissionModule["FINANCE"] = "finance";
    PermissionModule["REFILLS"] = "refills";
    PermissionModule["MAINTENANCE"] = "maintenance";
    PermissionModule["INVENTORY"] = "inventory";
    PermissionModule["AUDIT"] = "audit";
    PermissionModule["USERS"] = "users";
    PermissionModule["ROLES"] = "roles";
    PermissionModule["DEPARTMENTS"] = "departments";
    PermissionModule["SETTLEMENT"] = "settlement";
    PermissionModule["PAYOUT"] = "payout";
    PermissionModule["JOB"] = "job";
    PermissionModule["TICKET"] = "ticket";
    PermissionModule["BATCH"] = "batch";
    PermissionModule["DISPATCH"] = "dispatch";
})(PermissionModule || (exports.PermissionModule = PermissionModule = {}));
var PermissionAction;
(function (PermissionAction) {
    PermissionAction["VIEW"] = "view";
    PermissionAction["CREATE"] = "create";
    PermissionAction["EDIT"] = "edit";
    PermissionAction["DELETE"] = "delete";
    PermissionAction["ASSIGN"] = "assign";
    PermissionAction["EXECUTE"] = "execute";
    PermissionAction["APPROVE"] = "approve";
    PermissionAction["REFUND"] = "refund";
    PermissionAction["PUBLISH"] = "publish";
    PermissionAction["EXPORT"] = "export";
    PermissionAction["COMPUTE"] = "compute";
    PermissionAction["RESOLVE"] = "resolve";
    PermissionAction["RECEIVE"] = "receive";
    PermissionAction["DISPATCH"] = "dispatch";
    PermissionAction["UPDATE"] = "update";
    PermissionAction["LOG"] = "log";
})(PermissionAction || (exports.PermissionAction = PermissionAction = {}));
var UIAccess;
(function (UIAccess) {
    UIAccess["ADMIN_PANEL"] = "Admin Panel";
    UIAccess["MOBILE_APP"] = "Mobile App";
    UIAccess["FINANCE_DASHBOARD"] = "Finance Dashboard";
    UIAccess["SUPPORT_PORTAL"] = "Support Portal";
    UIAccess["WAREHOUSE_PORTAL"] = "Warehouse Portal";
    UIAccess["MOBILE_AND_WEB"] = "Mobile & Web";
})(UIAccess || (exports.UIAccess = UIAccess = {}));
//# sourceMappingURL=enums.js.map