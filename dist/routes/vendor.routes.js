"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const vendor_controller_1 = require("../controllers/vendor.controller");
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/', (0, permission_middleware_1.requirePermission)('vendors:view'), vendor_controller_1.getVendors);
router.post('/', (0, permission_middleware_1.requirePermission)('vendors:create'), vendor_controller_1.createVendor);
exports.default = router;
//# sourceMappingURL=vendor.routes.js.map