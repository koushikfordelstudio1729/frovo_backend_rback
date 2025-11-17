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
const warehouseController = __importStar(require("../controllers/warehouse.controller"));
const auth_middleware_1 = require("../middleware/auth.middleware");
const permission_middleware_1 = require("../middleware/permission.middleware");
const validation_middleware_1 = require("../middleware/validation.middleware");
const warehouse_validator_1 = require("../validators/warehouse.validator");
const warehouse_controller_1 = require("../controllers/warehouse.controller");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.get('/dashboard', (0, permission_middleware_1.requirePermission)('warehouse:view'), (0, validation_middleware_1.validate)({ query: warehouse_validator_1.dashboardQuerySchema.shape.query }), warehouseController.getDashboard);
router.post('/inbound/receive', (0, permission_middleware_1.requirePermission)('inventory:receive'), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.receiveGoodsSchema.shape.body }), warehouseController.receiveGoods);
router.get('/inbound/receivings', (0, permission_middleware_1.requirePermission)('inventory:view'), warehouseController.getReceivings);
router.get('/inbound/receivings/:id', (0, permission_middleware_1.requirePermission)('inventory:view'), warehouseController.getReceivingById);
router.patch('/inbound/receivings/:id/qc', (0, permission_middleware_1.requirePermission)('inventory:receive'), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.updateQCSchema.shape.body }), warehouseController.updateQCVerification);
router.post('/outbound/dispatch', (0, permission_middleware_1.requirePermission)('dispatch:assign'), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.createDispatchSchema.shape.body }), warehouseController.createDispatch);
router.get('/outbound/dispatches', (0, permission_middleware_1.requirePermission)('dispatch:view'), warehouseController.getDispatches);
router.get('/outbound/dispatches/:id', (0, permission_middleware_1.requirePermission)('dispatch:view'), warehouseController.getDispatchById);
router.patch('/outbound/dispatches/:id/status', (0, permission_middleware_1.requirePermission)('dispatch:assign'), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.updateDispatchStatusSchema.shape.body }), warehouseController.updateDispatchStatus);
router.post('/qc/templates', (0, permission_middleware_1.requirePermission)('qc:manage'), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.createQCTemplateSchema.shape.body }), warehouseController.createQCTemplate);
router.get('/qc/templates', (0, permission_middleware_1.requirePermission)('qc:view'), warehouseController.getQCTemplates);
router.put('/qc/templates/:id', (0, permission_middleware_1.requirePermission)('qc:manage'), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.createQCTemplateSchema.shape.body }), warehouseController.updateQCTemplate);
router.delete('/qc/templates/:id', (0, permission_middleware_1.requirePermission)('qc:manage'), warehouseController.deleteQCTemplate);
router.post('/returns', (0, permission_middleware_1.requirePermission)('returns:manage'), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.createReturnOrderSchema.shape.body }), warehouseController.createReturnOrder);
router.get('/returns/queue', (0, permission_middleware_1.requirePermission)('returns:view'), warehouseController.getReturnQueue);
router.patch('/returns/:id/approve', (0, permission_middleware_1.requirePermission)('returns:manage'), warehouseController.approveReturn);
router.patch('/returns/:id/reject', (0, permission_middleware_1.requirePermission)('returns:manage'), warehouseController.rejectReturn);
router.get('/field-agents', (0, permission_middleware_1.requirePermission)('agents:view'), warehouseController.getFieldAgents);
router.post('/field-agents', (0, permission_middleware_1.requirePermission)('agents:manage'), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.createFieldAgentSchema.shape.body }), warehouseController.createFieldAgent);
router.get('/inventory/dashboard/:warehouseId', (0, permission_middleware_1.requirePermission)('inventory:view'), warehouseController.getInventoryDashboard);
router.get('/inventory/stats/:warehouseId', (0, permission_middleware_1.requirePermission)('inventory:view'), warehouseController.getInventoryStats);
router.get('/inventory/:id', (0, permission_middleware_1.requirePermission)('inventory:view'), warehouseController.getInventoryItem);
router.put('/inventory/:id', (0, permission_middleware_1.requirePermission)('inventory:manage'), warehouseController.updateInventoryItem);
router.patch('/inventory/:id/archive', (0, permission_middleware_1.requirePermission)('inventory:manage'), warehouseController.archiveInventory);
router.patch('/inventory/:id/unarchive', (0, permission_middleware_1.requirePermission)('inventory:manage'), warehouseController.unarchiveInventory);
router.get('/inventory/archived/:warehouseId', (0, permission_middleware_1.requirePermission)('inventory:view'), warehouse_controller_1.getArchivedInventory);
router.post('/inventory/bulk-archive', (0, permission_middleware_1.requirePermission)('inventory:manage'), warehouseController.bulkArchiveInventory);
router.post('/inventory/bulk-unarchive', (0, permission_middleware_1.requirePermission)('inventory:manage'), warehouseController.bulkUnarchiveInventory);
router.post('/expenses', (0, permission_middleware_1.requirePermission)('expenses:create'), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.createExpenseSchema.shape.body }), warehouseController.createExpense);
router.get('/expenses', (0, permission_middleware_1.requirePermission)('expenses:view'), warehouseController.getExpenses);
router.get('/expenses/summary', (0, permission_middleware_1.requirePermission)('expenses:view'), warehouseController.getExpenseSummary);
router.patch('/expenses/:id/status', (0, permission_middleware_1.requirePermission)('expenses:approve'), warehouseController.updateExpenseStatus);
router.get('/expenses/:id', warehouseController.getExpenseById);
router.put('/expenses/:id', warehouseController.updateExpense);
router.patch('/expenses/:id/status', warehouseController.updateExpenseStatus);
router.patch('/expenses/:id/payment-status', warehouseController.updateExpensePaymentStatus);
router.delete('/expenses/:id', warehouseController.deleteExpense);
router.get('/expenses/trend/monthly', warehouseController.getMonthlyExpenseTrend);
router.get('/reports', (0, permission_middleware_1.requirePermission)('reports:view'), warehouseController.generateReport);
router.get('/reports/export', (0, permission_middleware_1.requirePermission)('reports:export'), warehouseController.exportReport);
router.get('/reports/types', (0, permission_middleware_1.requirePermission)('reports:view'), warehouseController.getReportTypes);
router.get('/reports/inventory-summary', (0, permission_middleware_1.requirePermission)('reports:view'), warehouseController.generateInventorySummary);
router.get('/reports/purchase-orders', (0, permission_middleware_1.requirePermission)('reports:view'), warehouseController.generatePurchaseOrderReport);
exports.default = router;
//# sourceMappingURL=warehouse.routes.js.map