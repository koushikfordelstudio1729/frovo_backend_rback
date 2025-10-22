import { Router } from 'express';
import * as auditLogController from '../controllers/auditLog.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { validate } from '../middleware/validation.middleware';
import {
  getAuditLogsQuerySchema,
  exportAuditLogsQuerySchema
} from '../validators/auditLog.validator';

const router = Router();

// All routes require authentication and audit permissions
router.use(authenticate);
router.use(requirePermission('audit:view'));

// Get audit logs with pagination and filtering
router.get('/',
  validate({ query: getAuditLogsQuerySchema.shape.query }),
  auditLogController.getAuditLogs
);

// Get audit statistics
router.get('/stats',
  auditLogController.getAuditStats
);

// Export audit logs
router.get('/export',
  requirePermission('audit:export'),
  validate({ query: exportAuditLogsQuerySchema.shape.query }),
  auditLogController.exportAuditLogs
);

export default router;