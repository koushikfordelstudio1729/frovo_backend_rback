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
const departmentController = __importStar(require("../controllers/department.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auditLog_middleware_1 = require("../middleware/auditLog.middleware");
const department_validator_1 = require("../validators/department.validator");
const constants_1 = require("../config/constants");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', (0, permission_middleware_1.requirePermission)('departments:view'), (0, validation_middleware_1.validate)({ query: department_validator_1.getDepartmentsQuerySchema.shape.query }), departmentController.getDepartments);
router.get('/:id', (0, permission_middleware_1.requirePermission)('departments:view'), (0, validation_middleware_1.validateObjectId)(), departmentController.getDepartmentById);
router.post('/', (0, permission_middleware_1.requireSuperAdmin)(), (0, validation_middleware_1.validate)({ body: department_validator_1.createDepartmentSchema.shape.body }), (0, auditLog_middleware_1.auditCreate)(constants_1.MODULES.DEPARTMENTS), departmentController.createDepartment);
router.put('/:id', (0, permission_middleware_1.requireSuperAdmin)(), (0, validation_middleware_1.validateObjectId)(), (0, validation_middleware_1.validate)({ body: department_validator_1.updateDepartmentSchema.shape.body }), (0, auditLog_middleware_1.auditUpdate)(constants_1.MODULES.DEPARTMENTS), departmentController.updateDepartment);
router.post('/:id/members', (0, permission_middleware_1.requirePermission)('departments:edit'), (0, validation_middleware_1.validateObjectId)(), (0, validation_middleware_1.validate)({ body: department_validator_1.addMembersSchema.shape.body }), (0, auditLog_middleware_1.auditAssign)(constants_1.MODULES.DEPARTMENTS), departmentController.addMembers);
router.delete('/:id/members/:userId', (0, permission_middleware_1.requirePermission)('departments:edit'), (0, validation_middleware_1.validateObjectId)(), (0, validation_middleware_1.validateObjectId)('userId'), (0, auditLog_middleware_1.auditRemove)(constants_1.MODULES.DEPARTMENTS), departmentController.removeMember);
router.delete('/:id', (0, permission_middleware_1.requireSuperAdmin)(), (0, validation_middleware_1.validateObjectId)(), (0, auditLog_middleware_1.auditDelete)(constants_1.MODULES.DEPARTMENTS), departmentController.deleteDepartment);
exports.default = router;
//# sourceMappingURL=department.routes.js.map