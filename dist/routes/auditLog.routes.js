"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auditLogController = __importStar(require("../controllers/auditLog.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auditLog_validator_1 = require("../validators/auditLog.validator");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use((0, permission_middleware_1.requirePermission)('audit:view'));
router.get('/', (0, validation_middleware_1.validate)({ query: auditLog_validator_1.getAuditLogsQuerySchema.shape.query }), auditLogController.getAuditLogs);
router.get('/stats', auditLogController.getAuditStats);
router.get('/export', (0, permission_middleware_1.requirePermission)('audit:export'), (0, validation_middleware_1.validate)({ query: auditLog_validator_1.exportAuditLogsQuerySchema.shape.query }), auditLogController.exportAuditLogs);
exports.default = router;
//# sourceMappingURL=auditLog.routes.js.map