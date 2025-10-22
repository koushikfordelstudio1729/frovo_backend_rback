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
const securityController = __importStar(require("../controllers/security.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auditLog_middleware_1 = require("../middleware/auditLog.middleware");
const security_validator_1 = require("../validators/security.validator");
const constants_1 = require("../config/constants");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use((0, permission_middleware_1.requireSuperAdmin)());
router.get('/config', securityController.getSecurityConfig);
router.put('/config', (0, validation_middleware_1.validate)({ body: security_validator_1.updateSecurityConfigSchema.shape.body }), (0, auditLog_middleware_1.auditUpdate)(constants_1.MODULES.SECURITY), securityController.updateSecurityConfig);
exports.default = router;
//# sourceMappingURL=security.routes.js.map