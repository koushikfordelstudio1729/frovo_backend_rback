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
const accessRequestController = __importStar(require("../controllers/accessRequest.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const auditLog_middleware_1 = require("../middleware/auditLog.middleware");
const accessRequest_validator_1 = require("../validators/accessRequest.validator");
const constants_1 = require("../config/constants");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get("/", (0, permission_middleware_1.requirePermission)("roles:view"), (0, validation_middleware_1.validate)({ query: accessRequest_validator_1.getAccessRequestsQuerySchema.shape.query }), accessRequestController.getAccessRequests);
router.get("/:id", auth_middleware_1.authenticate, (0, validation_middleware_1.validateObjectId)(), accessRequestController.getAccessRequestById);
router.post("/", auth_middleware_1.authenticate, (0, validation_middleware_1.validate)({ body: accessRequest_validator_1.createAccessRequestSchema.shape.body }), (0, auditLog_middleware_1.auditCreate)(constants_1.MODULES.ACCESS_REQUESTS), accessRequestController.createAccessRequest);
router.put("/:id/approve", (0, permission_middleware_1.requirePermission)("roles:edit"), (0, validation_middleware_1.validateObjectId)(), (0, validation_middleware_1.validate)({ body: accessRequest_validator_1.updateAccessRequestStatusSchema.shape.body }), (0, auditLog_middleware_1.auditApprove)(constants_1.MODULES.ACCESS_REQUESTS), accessRequestController.approveAccessRequest);
router.put("/:id/reject", (0, permission_middleware_1.requirePermission)("roles:edit"), (0, validation_middleware_1.validateObjectId)(), (0, validation_middleware_1.validate)({ body: accessRequest_validator_1.updateAccessRequestStatusSchema.shape.body }), (0, auditLog_middleware_1.auditReject)(constants_1.MODULES.ACCESS_REQUESTS), accessRequestController.rejectAccessRequest);
exports.default = router;
