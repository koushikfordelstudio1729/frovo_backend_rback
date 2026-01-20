import { Router } from "express";
import * as warehouseController from "../controllers/warehouse.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requirePermission, requireRole } from "../middleware/permission.middleware";
import { validate } from "../middleware/validation.middleware";
import { warehouseScopeMiddleware } from "../middleware/warehouseScope.middleware";
import { uploadPOImages, uploadSingle, uploadGRN } from "../middleware/upload.middleware";
import {
  createDispatchSchema,
  createQCTemplateSchema,
  createReturnOrderSchema,
  createExpenseSchema,
  updateDispatchStatusSchema,
  createFieldAgentSchema,
  dashboardQuerySchema,
  createPurchaseOrderSchema,
  updatePurchaseOrderStatusSchema,
  createGRNSchema,
  updateGRNStatusSchema,
  createWarehouseSchema,
  updateWarehouseSchema,
  getWarehousesQuerySchema,
} from "../validators/warehouse.validator";

const router = Router();

router.use(authenticate);

router.use(warehouseScopeMiddleware);

router.get(
  "/dashboard",
  requirePermission("warehouse:view"),
  validate({ query: dashboardQuerySchema.shape.query }),
  warehouseController.getDashboard
);

router.post(
  "/inbound/purchase-orders",
  requirePermission("purchase_orders:create"),
  uploadPOImages,
  warehouseController.createPurchaseOrder
);

router.get(
  "/inbound/purchase-orders",
  requirePermission("purchase_orders:view"),
  warehouseController.getPurchaseOrders
);

router.get(
  "/inbound/purchase-orders/:id",
  requirePermission("purchase_orders:view"),
  warehouseController.getPurchaseOrderById
);

router.patch(
  "/inbound/purchase-orders/:id/status",
  requirePermission("purchase_orders:status_update"),
  validate({ body: updatePurchaseOrderStatusSchema.shape.body }),
  warehouseController.updatePurchaseOrderStatus
);

router.delete(
  "/inbound/purchase-orders/:id",
  requirePermission("purchase_orders:delete"),
  warehouseController.deletePurchaseOrder
);

router.post(
  "/purchase-orders/:purchaseOrderId/grn",
  requirePermission("grn:create"),
  uploadGRN,
  validate({ body: createGRNSchema.shape.body }),
  warehouseController.createGRN
);

router.get("/grn", requirePermission("grn:view"), warehouseController.getGRNs);

router.get("/grn/:id", requirePermission("grn:view"), warehouseController.getGRNById);

router.patch(
  "/grn/:id/status",
  requirePermission("grn:edit"),
  validate({ body: updateGRNStatusSchema.shape.body }),
  warehouseController.updateGRNStatus
);

router.post(
  "/outbound/dispatch",
  requirePermission("dispatch:assign"),
  validate({ body: createDispatchSchema.shape.body }),
  warehouseController.createDispatch
);

router.get(
  "/outbound/dispatches",
  requirePermission("dispatch:view"),
  warehouseController.getDispatches
);

router.get(
  "/outbound/dispatches/:id",
  requirePermission("dispatch:view"),
  warehouseController.getDispatchById
);

router.patch(
  "/outbound/dispatches/:id/status",
  requirePermission("dispatch:assign"),
  validate({ body: updateDispatchStatusSchema.shape.body }),
  warehouseController.updateDispatchStatus
);

router.post(
  "/qc/templates",
  requirePermission("qc:manage"),
  validate({ body: createQCTemplateSchema.shape.body }),
  warehouseController.createQCTemplate
);

router.get("/qc/templates", requirePermission("qc:view"), warehouseController.getQCTemplates);

router.put(
  "/qc/templates/:id",
  requirePermission("qc:manage"),
  validate({ body: createQCTemplateSchema.shape.body }),
  warehouseController.updateQCTemplate
);

router.delete(
  "/qc/templates/:id",
  requirePermission("qc:manage"),
  warehouseController.deleteQCTemplate
);

router.post(
  "/returns",
  requirePermission("returns:manage"),
  validate({ body: createReturnOrderSchema.shape.body }),
  warehouseController.createReturnOrder
);

router.get("/returns/queue", requirePermission("returns:view"), warehouseController.getReturnQueue);

router.patch(
  "/returns/:id/approve",
  requirePermission("returns:manage"),
  warehouseController.approveReturn
);

router.patch(
  "/returns/:id/reject",
  requirePermission("returns:manage"),
  warehouseController.rejectReturn
);

router.get("/field-agents", requirePermission("agents:view"), warehouseController.getFieldAgents);

router.post(
  "/field-agents",
  requirePermission("agents:manage"),
  validate({ body: createFieldAgentSchema.shape.body }),
  warehouseController.createFieldAgent
);

router.put(
  "/field-agents/:id",
  requirePermission("agents:manage"),
  warehouseController.updateFieldAgent
);

router.get(
  "/inventory/dashboard/:warehouseId",
  requirePermission("inventory:view"),
  warehouseController.getInventoryDashboard
);

router.get(
  "/inventory/stats/:warehouseId",
  requirePermission("inventory:view"),
  warehouseController.getInventoryStats
);

router.get(
  "/inventory/:id",
  requirePermission("inventory:view"),
  warehouseController.getInventoryItem
);

router.put(
  "/inventory/:id",
  requirePermission("inventory:manage"),
  warehouseController.updateInventoryItem
);

router.patch(
  "/inventory/:id/archive",
  requirePermission("inventory:manage"),
  warehouseController.archiveInventory
);

router.patch(
  "/inventory/:id/unarchive",
  requirePermission("inventory:manage"),
  warehouseController.unarchiveInventory
);

router.get(
  "/inventory/archived/:warehouseId",
  requirePermission("inventory:view"),
  warehouseController.getArchivedInventory
);

router.post(
  "/inventory/bulk-archive",
  requirePermission("inventory:manage"),
  warehouseController.bulkArchiveInventory
);

router.post(
  "/inventory/bulk-unarchive",
  requirePermission("inventory:manage"),
  warehouseController.bulkUnarchiveInventory
);

router.post(
  "/expenses",
  requirePermission("expenses:create"),
  validate({ body: createExpenseSchema.shape.body }),
  warehouseController.createExpense
);

router.get("/expenses", requirePermission("expenses:view"), warehouseController.getExpenses);

router.get(
  "/expenses/summary",
  requirePermission("expenses:view"),
  warehouseController.getExpenseSummary
);

router.get("/expenses/:id", requirePermission("expenses:view"), warehouseController.getExpenseById);

router.put(
  "/expenses/:id",
  requirePermission("expenses:manage"),
  warehouseController.updateExpense
);

router.patch(
  "/expenses/:id/status",
  requirePermission("expenses:approve"),
  warehouseController.updateExpenseStatus
);

router.patch(
  "/expenses/:id/payment-status",
  requirePermission("expenses:manage"),
  warehouseController.updateExpensePaymentStatus
);

router.delete(
  "/expenses/:id",
  requirePermission("expenses:manage"),
  warehouseController.deleteExpense
);

router.post(
  "/expenses/:id/upload-bill",
  requirePermission("expenses:manage"),
  uploadSingle,
  warehouseController.uploadExpenseBill
);

router.get(
  "/expenses/trend/monthly",
  requirePermission("expenses:view"),
  warehouseController.getMonthlyExpenseTrend
);

router.get("/reports", requirePermission("reports:view"), warehouseController.generateReport);

router.get(
  "/reports/export",
  requirePermission("reports:export"),
  warehouseController.exportReport
);

router.get("/reports/types", requirePermission("reports:view"), warehouseController.getReportTypes);

router.get(
  "/reports/inventory-summary",
  requirePermission("reports:view"),
  warehouseController.generateInventorySummary
);

router.get(
  "/reports/purchase-orders",
  requirePermission("reports:view"),
  warehouseController.generatePurchaseOrderReport
);

router.get(
  "/reports/inventory-turnover",
  requirePermission("reports:view"),
  warehouseController.generateInventoryTurnoverReport
);

router.get(
  "/reports/qc-summary",
  requirePermission("reports:view"),
  warehouseController.generateQCSummaryReport
);

router.get(
  "/reports/efficiency",
  requirePermission("reports:view"),
  warehouseController.generateEfficiencyReport
);

router.get(
  "/reports/stock-ageing",
  requirePermission("reports:view"),
  warehouseController.getStockAgeingReport
);

router.get("/warehouses/my-warehouse", warehouseController.getMyWarehouse);

router.post(
  "/warehouses",
  validate({ body: createWarehouseSchema.shape.body }),
  warehouseController.createWarehouse
);

router.get(
  "/warehouses",
  requirePermission("warehouse:view"),
  validate({ query: getWarehousesQuerySchema.shape.query }),
  warehouseController.getWarehouses
);

router.get(
  "/warehouses/:id",
  requirePermission("warehouse:view"),
  warehouseController.getWarehouseById
);

router.put(
  "/warehouses/:id",
  requirePermission("warehouse:manage"),
  validate({ body: updateWarehouseSchema.shape.body }),
  warehouseController.updateWarehouse
);

router.delete("/warehouses/:id", warehouseController.deleteWarehouse);

export default router;
