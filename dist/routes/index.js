"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_routes_1 = __importDefault(require("./auth.routes"));
const user_routes_1 = __importDefault(require("./user.routes"));
const role_routes_1 = __importDefault(require("./role.routes"));
const department_routes_1 = __importDefault(require("./department.routes"));
const permission_routes_1 = __importDefault(require("./permission.routes"));
const accessRequest_routes_1 = __importDefault(require("./accessRequest.routes"));
const auditLog_routes_1 = __importDefault(require("./auditLog.routes"));
const security_routes_1 = __importDefault(require("./security.routes"));
const router = (0, express_1.Router)();
router.get('/health', (_req, res) => {
    res.json({
        success: true,
        message: 'RBAC API is running',
        timestamp: new Date().toISOString(),
        version: '1.0.0'
    });
});
router.use('/auth', auth_routes_1.default);
router.use('/users', user_routes_1.default);
router.use('/roles', role_routes_1.default);
router.use('/departments', department_routes_1.default);
router.use('/permissions', permission_routes_1.default);
router.use('/access-requests', accessRequest_routes_1.default);
router.use('/audit-logs', auditLog_routes_1.default);
router.use('/security', security_routes_1.default);
exports.default = router;
//# sourceMappingURL=index.js.map