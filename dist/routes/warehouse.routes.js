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
const warehouseScope_middleware_1 = require("../middleware/warehouseScope.middleware");
const upload_middleware_1 = require("../middleware/upload.middleware");
const warehouse_validator_1 = require("../validators/warehouse.validator");
const router = (0, express_1.Router)();
router.use(auth_middleware_1.authenticate);
router.use(warehouseScope_middleware_1.warehouseScopeMiddleware);
router.get("/dashboard", (0, permission_middleware_1.requirePermission)("warehouse:view"), (0, validation_middleware_1.validate)({ query: warehouse_validator_1.dashboardQuerySchema.shape.query }), warehouseController.getDashboard);
router.post("/inbound/purchase-orders", (0, permission_middleware_1.requirePermission)("purchase_orders:create"), upload_middleware_1.uploadPOImages, warehouseController.createPurchaseOrder);
router.get("/inbound/purchase-orders", (0, permission_middleware_1.requirePermission)("purchase_orders:view"), warehouseController.getPurchaseOrders);
router.get("/inbound/purchase-orders/:id", (0, permission_middleware_1.requirePermission)("purchase_orders:view"), warehouseController.getPurchaseOrderById);
router.patch("/inbound/purchase-orders/:id/status", (0, permission_middleware_1.requirePermission)("purchase_orders:status_update"), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.updatePurchaseOrderStatusSchema.shape.body }), warehouseController.updatePurchaseOrderStatus);
router.delete("/inbound/purchase-orders/:id", (0, permission_middleware_1.requirePermission)("purchase_orders:delete"), warehouseController.deletePurchaseOrder);
router.post("/purchase-orders/:purchaseOrderId/grn", (0, permission_middleware_1.requirePermission)("grn:create"), upload_middleware_1.uploadGRN, (0, validation_middleware_1.validate)({ body: warehouse_validator_1.createGRNSchema.shape.body }), warehouseController.createGRN);
router.get("/grn", (0, permission_middleware_1.requirePermission)("grn:view"), warehouseController.getGRNs);
router.get("/grn/:id", (0, permission_middleware_1.requirePermission)("grn:view"), warehouseController.getGRNById);
router.patch("/grn/:id/status", (0, permission_middleware_1.requirePermission)("grn:edit"), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.updateGRNStatusSchema.shape.body }), warehouseController.updateGRNStatus);
router.post("/outbound/dispatch", (0, permission_middleware_1.requirePermission)("dispatch:assign"), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.createDispatchSchema.shape.body }), warehouseController.createDispatch);
router.get("/outbound/dispatches", (0, permission_middleware_1.requirePermission)("dispatch:view"), warehouseController.getDispatches);
router.get("/outbound/dispatches/:id", (0, permission_middleware_1.requirePermission)("dispatch:view"), warehouseController.getDispatchById);
router.patch("/outbound/dispatches/:id/status", (0, permission_middleware_1.requirePermission)("dispatch:assign"), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.updateDispatchStatusSchema.shape.body }), warehouseController.updateDispatchStatus);
router.post("/qc/templates", (0, permission_middleware_1.requirePermission)("qc:manage"), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.createQCTemplateSchema.shape.body }), warehouseController.createQCTemplate);
router.get("/qc/templates", (0, permission_middleware_1.requirePermission)("qc:view"), warehouseController.getQCTemplates);
router.put("/qc/templates/:id", (0, permission_middleware_1.requirePermission)("qc:manage"), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.createQCTemplateSchema.shape.body }), warehouseController.updateQCTemplate);
router.delete("/qc/templates/:id", (0, permission_middleware_1.requirePermission)("qc:manage"), warehouseController.deleteQCTemplate);
router.post("/returns", (0, permission_middleware_1.requirePermission)("returns:manage"), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.createReturnOrderSchema.shape.body }), warehouseController.createReturnOrder);
router.get("/returns/queue", (0, permission_middleware_1.requirePermission)("returns:view"), warehouseController.getReturnQueue);
router.patch("/returns/:id/approve", (0, permission_middleware_1.requirePermission)("returns:manage"), warehouseController.approveReturn);
router.patch("/returns/:id/reject", (0, permission_middleware_1.requirePermission)("returns:manage"), warehouseController.rejectReturn);
router.get("/field-agents", (0, permission_middleware_1.requirePermission)("agents:view"), warehouseController.getFieldAgents);
router.post("/field-agents", (0, permission_middleware_1.requirePermission)("agents:manage"), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.createFieldAgentSchema.shape.body }), warehouseController.createFieldAgent);
router.put("/field-agents/:id", (0, permission_middleware_1.requirePermission)("agents:manage"), warehouseController.updateFieldAgent);
router.get("/inventory/dashboard/:warehouseId", (0, permission_middleware_1.requirePermission)("inventory:view"), warehouseController.getInventoryDashboard);
router.get("/inventory/stats/:warehouseId", (0, permission_middleware_1.requirePermission)("inventory:view"), warehouseController.getInventoryStats);
router.get("/inventory/:id", (0, permission_middleware_1.requirePermission)("inventory:view"), warehouseController.getInventoryItem);
router.put("/inventory/:id", (0, permission_middleware_1.requirePermission)("inventory:manage"), warehouseController.updateInventoryItem);
router.patch("/inventory/:id/archive", (0, permission_middleware_1.requirePermission)("inventory:manage"), warehouseController.archiveInventory);
router.patch("/inventory/:id/unarchive", (0, permission_middleware_1.requirePermission)("inventory:manage"), warehouseController.unarchiveInventory);
router.get("/inventory/archived/:warehouseId", (0, permission_middleware_1.requirePermission)("inventory:view"), warehouseController.getArchivedInventory);
router.post("/inventory/bulk-archive", (0, permission_middleware_1.requirePermission)("inventory:manage"), warehouseController.bulkArchiveInventory);
router.post("/inventory/bulk-unarchive", (0, permission_middleware_1.requirePermission)("inventory:manage"), warehouseController.bulkUnarchiveInventory);
router.post("/expenses", (0, permission_middleware_1.requirePermission)("expenses:create"), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.createExpenseSchema.shape.body }), warehouseController.createExpense);
router.get("/expenses", (0, permission_middleware_1.requirePermission)("expenses:view"), warehouseController.getExpenses);
router.get("/expenses/summary", (0, permission_middleware_1.requirePermission)("expenses:view"), warehouseController.getExpenseSummary);
router.get("/expenses/:id", (0, permission_middleware_1.requirePermission)("expenses:view"), warehouseController.getExpenseById);
router.put("/expenses/:id", (0, permission_middleware_1.requirePermission)("expenses:manage"), warehouseController.updateExpense);
router.patch("/expenses/:id/status", (0, permission_middleware_1.requirePermission)("expenses:approve"), warehouseController.updateExpenseStatus);
router.patch("/expenses/:id/payment-status", (0, permission_middleware_1.requirePermission)("expenses:manage"), warehouseController.updateExpensePaymentStatus);
router.delete("/expenses/:id", (0, permission_middleware_1.requirePermission)("expenses:manage"), warehouseController.deleteExpense);
router.post("/expenses/:id/upload-bill", (0, permission_middleware_1.requirePermission)("expenses:manage"), upload_middleware_1.uploadSingle, warehouseController.uploadExpenseBill);
router.get("/expenses/trend/monthly", (0, permission_middleware_1.requirePermission)("expenses:view"), warehouseController.getMonthlyExpenseTrend);
router.get("/reports", (0, permission_middleware_1.requirePermission)("reports:view"), warehouseController.generateReport);
router.get("/reports/export", (0, permission_middleware_1.requirePermission)("reports:export"), warehouseController.exportReport);
router.get("/reports/types", (0, permission_middleware_1.requirePermission)("reports:view"), warehouseController.getReportTypes);
router.get("/reports/inventory-summary", (0, permission_middleware_1.requirePermission)("reports:view"), warehouseController.generateInventorySummary);
router.get("/reports/purchase-orders", (0, permission_middleware_1.requirePermission)("reports:view"), warehouseController.generatePurchaseOrderReport);
router.get("/reports/inventory-turnover", (0, permission_middleware_1.requirePermission)("reports:view"), warehouseController.generateInventoryTurnoverReport);
router.get("/reports/qc-summary", (0, permission_middleware_1.requirePermission)("reports:view"), warehouseController.generateQCSummaryReport);
router.get("/reports/efficiency", (0, permission_middleware_1.requirePermission)("reports:view"), warehouseController.generateEfficiencyReport);
router.get("/reports/stock-ageing", (0, permission_middleware_1.requirePermission)("reports:view"), warehouseController.getStockAgeingReport);
router.get("/warehouses/my-warehouse", warehouseController.getMyWarehouse);
router.post("/warehouses", (0, validation_middleware_1.validate)({ body: warehouse_validator_1.createWarehouseSchema.shape.body }), warehouseController.createWarehouse);
router.get("/warehouses", (0, permission_middleware_1.requirePermission)("warehouse:view"), (0, validation_middleware_1.validate)({ query: warehouse_validator_1.getWarehousesQuerySchema.shape.query }), warehouseController.getWarehouses);
router.get("/warehouses/:id", (0, permission_middleware_1.requirePermission)("warehouse:view"), warehouseController.getWarehouseById);
router.put("/warehouses/:id", (0, permission_middleware_1.requirePermission)("warehouse:manage"), (0, validation_middleware_1.validate)({ body: warehouse_validator_1.updateWarehouseSchema.shape.body }), warehouseController.updateWarehouse);
router.delete("/warehouses/:id", warehouseController.deleteWarehouse);
exports.default = router;
