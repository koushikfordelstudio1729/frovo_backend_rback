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
  applyQCTemplateSchema
} from '../validators/warehouse.validator';

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== SCREEN 1: DASHBOARD ====================
router.get('/dashboard',
  requirePermission('warehouse:view'),
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

router.patch('/outbound/dispatch/:id/status',
  requirePermission('dispatch:assign'),
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

export default router;