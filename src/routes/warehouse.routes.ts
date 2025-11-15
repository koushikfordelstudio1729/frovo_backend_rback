
// routes/warehouse.routes.ts
import { Router } from 'express';
import * as warehouseController from '../controllers/warehouse.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { validate } from '../middleware/validation.middleware';
import { 
  receiveGoodsSchema,
  createDispatchSchema,
  createQCTemplateSchema,
  createReturnOrderSchema,
  createExpenseSchema,
  warehouseReportSchema,
  applyQCTemplateSchema,
  updateQCSchema,
  updateDispatchStatusSchema,
  createFieldAgentSchema,
  dashboardQuerySchema
} from '../validators/warehouse.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== SCREEN 1: DASHBOARD ====================
// Update dashboard route to include validation
router.get('/dashboard',
  requirePermission('warehouse:view'),
  validate({ query: dashboardQuerySchema.shape.query }),
  warehouseController.getDashboard
);

// ==================== SCREEN 2: INBOUND LOGISTICS ====================
router.post('/inbound/receive',
  requirePermission('inventory:receive'),
  validate({ body: receiveGoodsSchema.shape.body }),
  warehouseController.receiveGoods
);

router.get('/inbound/receivings',
  requirePermission('inventory:view'),
  warehouseController.getReceivings
);

router.get('/inbound/receivings/:id',
  requirePermission('inventory:view'),
  warehouseController.getReceivingById
);

router.patch('/inbound/receivings/:id/qc',
  requirePermission('inventory:receive'),
  validate({ body: updateQCSchema.shape.body }), // Add validation
  warehouseController.updateQCVerification
);

// ==================== SCREEN 3: OUTBOUND LOGISTICS ====================

// Dispatch Orders
router.post('/outbound/dispatch',
  requirePermission('dispatch:assign'),
  validate({ body: createDispatchSchema.shape.body }),
  warehouseController.createDispatch
);

router.get('/outbound/dispatches',
  requirePermission('dispatch:view'),
  warehouseController.getDispatches
);

router.get('/outbound/dispatches/:id',
  requirePermission('dispatch:view'),
  warehouseController.getDispatchById
);

router.patch('/outbound/dispatches/:id/status',
  requirePermission('dispatch:assign'),
  validate({ body: updateDispatchStatusSchema.shape.body }),
  warehouseController.updateDispatchStatus
);

// QC Templates
router.post('/qc/templates',
  requirePermission('qc:manage'),
  validate({ body: createQCTemplateSchema.shape.body }),
  warehouseController.createQCTemplate
);

router.get('/qc/templates',
  requirePermission('qc:view'),
  warehouseController.getQCTemplates
);

router.put('/qc/templates/:id',
  requirePermission('qc:manage'),
  validate({ body: createQCTemplateSchema.shape.body }),
  warehouseController.updateQCTemplate
);

router.delete('/qc/templates/:id',
  requirePermission('qc:manage'),
  warehouseController.deleteQCTemplate
);

router.post('/qc/apply-template',
  requirePermission('qc:verify'),
  validate({ body: applyQCTemplateSchema.shape.body }),
  warehouseController.applyQCTemplate
);

// Return Management
router.post('/returns',
  requirePermission('returns:manage'),
  validate({ body: createReturnOrderSchema.shape.body }),
  warehouseController.createReturnOrder
);

router.get('/returns/queue',
  requirePermission('returns:view'),
  warehouseController.getReturnQueue
);

router.patch('/returns/:id/approve',
  requirePermission('returns:manage'),
  warehouseController.approveReturn
);

router.patch('/returns/:id/reject',
  requirePermission('returns:manage'),
  warehouseController.rejectReturn
);

// Field Agent Management
router.get('/field-agents',
  requirePermission('agents:view'),
  warehouseController.getFieldAgents
);

router.post('/field-agents',
  requirePermission('agents:manage'),
  validate({ body: createFieldAgentSchema.shape.body }),
  warehouseController.createFieldAgent
);
// ==================== SCREEN 4: INVENTORY MANAGEMENT ====================
router.get('/inventory',
  requirePermission('inventory:view'),
  warehouseController.getInventory
);

router.get('/inventory/ageing-report',
  requirePermission('inventory:view'),
  warehouseController.getStockAgeingReport
);

router.patch('/inventory/:id',
  requirePermission('inventory:edit'),
  warehouseController.updateInventory
);

router.get('/inventory/low-stock',
  requirePermission('inventory:view'),
  warehouseController.getLowStockAlerts
);
// Enhanced inventory routes
router.get('/inventory/expiry-alerts', warehouseController.getExpiryAlerts);
router.get('/inventory/quarantine', warehouseController.getQuarantineItems);
router.get('/inventory/with-expiry', warehouseController.getInventoryWithExpiry);
router.put('/inventory/:id/update', warehouseController.updateInventoryItem);
router.patch('/inventory/:id/archive', warehouseController.archiveInventoryItem);
router.patch('/inventory/:id/unarchive', warehouseController.unarchiveInventoryItem);
// ==================== SCREEN 5: EXPENSE MANAGEMENT ====================
router.post('/expenses',
  requirePermission('expenses:create'),
  validate({ body: createExpenseSchema.shape.body }),
  warehouseController.createExpense
);

router.get('/expenses',
  requirePermission('expenses:view'),
  warehouseController.getExpenses
);

router.get('/expenses/summary',
  requirePermission('expenses:view'),
  warehouseController.getExpenseSummary
);

router.patch('/expenses/:id/status',
  requirePermission('expenses:approve'),
  warehouseController.updateExpenseStatus
);
// Enhanced expense routes
router.get('/expenses/:id', warehouseController.getExpenseById);
router.put('/expenses/:id', warehouseController.updateExpense);
router.patch('/expenses/:id/status', warehouseController.updateExpenseStatus);
router.patch('/expenses/:id/payment-status', warehouseController.updateExpensePaymentStatus);
router.delete('/expenses/:id', warehouseController.deleteExpense);
router.get('/expenses/trend/monthly', warehouseController.getMonthlyExpenseTrend);
// ==================== SCREEN 6: REPORTS & ANALYTICS ====================
router.get('/reports',
  requirePermission('reports:view'),
  validate({ query: warehouseReportSchema.shape.query }),
  warehouseController.generateReport
);

router.get('/reports/export',
  requirePermission('reports:export'),
  warehouseController.exportReport
);
// Enhanced report routes
router.get('/reports/types', warehouseController.getReportTypes);
router.get('/reports/inventory-summary', warehouseController.generateInventorySummary);
router.get('/reports/purchase-orders', warehouseController.generatePurchaseOrderReport);

export default router;