// routes/vendor.routes.ts
import { Router } from 'express';
import { getVendors, createVendor } from '../controllers/vendor.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';

const router = Router();

router.use(authenticate);

router.get('/',
  requirePermission('vendors:view'),
  getVendors
);

router.post('/',
  requirePermission('vendors:create'),
  createVendor
);

export default router;