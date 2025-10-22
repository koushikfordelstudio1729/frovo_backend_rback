import { Router } from 'express';
import * as accessRequestController from '../controllers/accessRequest.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { validate, validateObjectId } from '../middleware/validation.middleware';
import { auditCreate, auditApprove, auditReject } from '../middleware/auditLog.middleware';
import {
  createAccessRequestSchema,
  updateAccessRequestStatusSchema,
  getAccessRequestsQuerySchema
} from '../validators/accessRequest.validator';
import { MODULES } from '../config/constants';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get access requests
router.get('/',
  requirePermission('roles:view'),
  validate({ query: getAccessRequestsQuerySchema.shape.query }),
  accessRequestController.getAccessRequests
);

// Get access request by ID
router.get('/:id',
  authenticate, // Users can view their own requests
  validateObjectId(),
  accessRequestController.getAccessRequestById
);

// Create access request
router.post('/',
  authenticate, // Any authenticated user can request access
  validate({ body: createAccessRequestSchema.shape.body }),
  auditCreate(MODULES.ACCESS_REQUESTS),
  accessRequestController.createAccessRequest
);

// Approve access request
router.put('/:id/approve',
  requirePermission('roles:edit'),
  validateObjectId(),
  validate({ body: updateAccessRequestStatusSchema.shape.body }),
  auditApprove(MODULES.ACCESS_REQUESTS),
  accessRequestController.approveAccessRequest
);

// Reject access request
router.put('/:id/reject',
  requirePermission('roles:edit'),
  validateObjectId(),
  validate({ body: updateAccessRequestStatusSchema.shape.body }),
  auditReject(MODULES.ACCESS_REQUESTS),
  accessRequestController.rejectAccessRequest
);

export default router;