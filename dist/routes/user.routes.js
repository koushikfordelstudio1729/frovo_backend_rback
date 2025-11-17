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
const userController = __importStar(require("../controllers/user.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auditLog_middleware_1 = require("../middleware/auditLog.middleware");
const user_validator_1 = require("../validators/user.validator");
const constants_1 = require("../config/constants");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', (0, permission_middleware_1.requirePermission)('users:view'), userController.getUsers);
router.get('/search', (0, permission_middleware_1.requirePermission)('users:view'), userController.searchUsers);
router.get('/:id', (0, permission_middleware_1.requirePermission)('users:view'), (0, validation_middleware_1.validateObjectId)(), userController.getUserById);
router.get('/:id/permissions', (0, permission_middleware_1.requirePermission)('users:view'), (0, validation_middleware_1.validateObjectId)(), userController.getUserPermissions);
router.post('/', (0, permission_middleware_1.requirePermission)('users:create'), (0, validation_middleware_1.validate)({ body: user_validator_1.createUserSchema.shape.body }), (0, auditLog_middleware_1.auditCreate)(constants_1.MODULES.USERS), userController.createUser);
router.put('/:id', (0, permission_middleware_1.requirePermission)('users:edit'), (0, validation_middleware_1.validateObjectId)(), (0, validation_middleware_1.validate)({ body: user_validator_1.updateUserSchema.shape.body }), (0, auditLog_middleware_1.auditUpdate)(constants_1.MODULES.USERS), userController.updateUser);
router.patch('/:id/status', (0, permission_middleware_1.requirePermission)('users:edit'), (0, validation_middleware_1.validateObjectId)(), (0, validation_middleware_1.validate)({ body: user_validator_1.updateUserStatusSchema.shape.body }), (0, auditLog_middleware_1.auditUpdate)(constants_1.MODULES.USERS), userController.updateUserStatus);
router.patch('/:id/password', (0, permission_middleware_1.requirePermission)('users:edit'), (0, validation_middleware_1.validateObjectId)(), (0, validation_middleware_1.validate)({ body: user_validator_1.updateUserPasswordSchema.shape.body }), (0, auditLog_middleware_1.auditUpdate)(constants_1.MODULES.USERS), userController.updateUserPassword);
router.post('/:id/roles', (0, permission_middleware_1.requirePermission)('users:edit'), (0, validation_middleware_1.validateObjectId)(), (0, validation_middleware_1.validate)({ body: user_validator_1.assignRolesSchema.shape.body }), (0, auditLog_middleware_1.auditAssign)(constants_1.MODULES.USERS), userController.assignRoles);
router.delete('/:id/roles/:roleId', (0, permission_middleware_1.requirePermission)('users:edit'), (0, validation_middleware_1.validateObjectId)(), (0, validation_middleware_1.validateObjectId)('roleId'), (0, auditLog_middleware_1.auditRemove)(constants_1.MODULES.USERS), userController.removeRole);
router.delete('/:id', (0, permission_middleware_1.requirePermission)('users:delete'), (0, validation_middleware_1.validateObjectId)(), (0, auditLog_middleware_1.auditDelete)(constants_1.MODULES.USERS), userController.deleteUser);
exports.default = router;
