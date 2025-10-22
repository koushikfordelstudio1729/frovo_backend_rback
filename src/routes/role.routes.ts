import { Router } from 'express';
import * as roleController from '../controllers/role.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { validate, validateObjectId } from '../middleware/validation.middleware';
import { auditCreate, auditUpdate, auditDelete, auditAssign } from '../middleware/auditLog.middleware';
import {
  createRoleSchema,
  updateRoleSchema,
  assignRoleSchema,
  getRolesQuerySchema,
  publishRoleSchema,
  cloneRoleSchema
} from '../validators/role.validator';
import { MODULES } from '../config/constants';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get roles with pagination and filtering
router.get('/',
  requirePermission('roles:view'),
  validate({ query: getRolesQuerySchema.shape.query }),
  roleController.getRoles
);

// Get role by ID
router.get('/:id',
  requirePermission('roles:view'),
  validateObjectId(),
  roleController.getRoleById
);

// Get role permissions
router.get('/:id/permissions',
  requirePermission('roles:view'),
  validateObjectId(),
  roleController.getRolePermissions
);

// Get role users
router.get('/:id/users',
  requirePermission('roles:view'),
  validateObjectId(),
  roleController.getRoleUsers
);

// Create new role
router.post('/',
  requirePermission('roles:create'),
  validate({ body: createRoleSchema.shape.body }),
  auditCreate(MODULES.ROLES),
  roleController.createRole
);

// Clone role
router.post('/:id/clone',
  requirePermission('roles:create'),
  validateObjectId(),
  validate({ body: cloneRoleSchema.shape.body }),
  auditCreate(MODULES.ROLES),
  roleController.cloneRole
);

// Update role
router.put('/:id',
  requirePermission('roles:edit'),
  validateObjectId(),
  validate({ body: updateRoleSchema.shape.body }),
  auditUpdate(MODULES.ROLES),
  roleController.updateRole
);

// Update role permissions
router.put('/:id/permissions',
  requirePermission('roles:edit'),
  validateObjectId(),
  auditUpdate(MODULES.ROLES),
  roleController.updateRolePermissions
);

// Publish role
router.patch('/:id/publish',
  requirePermission('roles:edit'),
  validateObjectId(),
  validate({ body: publishRoleSchema.shape.body }),
  auditUpdate(MODULES.ROLES),
  roleController.publishRole
);

// Assign role to users
router.post('/:id/assign',
  requirePermission('roles:edit'),
  validateObjectId(),
  validate({ body: assignRoleSchema.shape.body }),
  auditAssign(MODULES.ROLES),
  roleController.assignRole
);

// Delete role
router.delete('/:id',
  requirePermission('roles:delete'),
  validateObjectId(),
  auditDelete(MODULES.ROLES),
  roleController.deleteRole
);

export default router;