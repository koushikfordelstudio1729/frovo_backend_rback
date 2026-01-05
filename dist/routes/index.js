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
const warehouse_routes_1 = __importDefault(require("./warehouse.routes"));
const vendor_routes_1 = __importDefault(require("./vendor.routes"));
const auditTrail_routes_1 = __importDefault(require("./auditTrail.routes"));
const vendingMachine_routes_1 = __importDefault(require("./vendingMachine.routes"));
const cart_routes_1 = __importDefault(require("./cart.routes"));
const product_routes_1 = __importDefault(require("./product.routes"));
const arearoute_route_1 = __importDefault(require("./arearoute.route"));
const catalogue_routes_1 = __importDefault(require("./catalogue.routes"));
const historyCatalogue_routes_1 = __importDefault(require("./historyCatalogue.routes"));
const fieldops_routes_1 = __importDefault(require("./fieldops.routes"));
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
router.use('/warehouse', warehouse_routes_1.default);
router.use('/vendors', vendor_routes_1.default);
router.use('/audit-trails', auditTrail_routes_1.default);
router.use('/vending', vendingMachine_routes_1.default);
router.use('/cart', cart_routes_1.default);
router.use('/area-route', arearoute_route_1.default);
router.use('/catalogue', catalogue_routes_1.default);
router.use('/history-catalogue', historyCatalogue_routes_1.default);
router.use('/field-ops', fieldops_routes_1.default);
router.use('/', product_routes_1.default);
exports.default = router;
