// routes/auditTrail.routes.ts
import { Router } from 'express';
import { AuditTrailController } from '../controllers/auditTrail.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';

const router = Router();
const auditTrailController = new AuditTrailController();

// Apply authentication to all audit trail routes
router.use(authenticate);

// Fixed routes - remove '/audit-trails' prefix
router.get('/', authorize(['super_admin','vendor_admin']), auditTrailController.getAuditTrails.bind(auditTrailController));
router.get('/vendor/:vendorId', authorize(['super_admin', 'vendor_admin']), auditTrailController.getVendorAuditTrails.bind(auditTrailController));
router.get('/user/:userId', authenticate, auditTrailController.getUserActivity.bind(auditTrailController));
router.get('/statistics', authorize(['super_admin']), auditTrailController.getAuditStatistics.bind(auditTrailController));

export default router;