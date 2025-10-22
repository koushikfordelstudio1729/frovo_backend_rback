import { Router } from 'express';
import * as userController from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requirePermission } from '../middleware/permission.middleware';
import { validate, validateObjectId } from '../middleware/validation.middleware';
import { auditCreate, auditUpdate, auditDelete, auditAssign, auditRemove } from '../middleware/auditLog.middleware';
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  assignRolesSchema,
  getUsersQuerySchema,
  updateUserPasswordSchema
} from '../validators/user.validator';
import { MODULES } from '../config/constants';

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get users with pagination and filtering
router.get('/',
  requirePermission('users:view'),
  validate({ query: getUsersQuerySchema.shape.query }),
  userController.getUsers
);

// Search users
router.get('/search',
  requirePermission('users:view'),
  userController.searchUsers
);

// Get user by ID
router.get('/:id',
  requirePermission('users:view'),
  validateObjectId(),
  userController.getUserById
);

// Get user permissions
router.get('/:id/permissions',
  requirePermission('users:view'),
  validateObjectId(),
  userController.getUserPermissions
);

// Create new user
router.post('/',
  requirePermission('users:create'),
  validate({ body: createUserSchema.shape.body }),
  auditCreate(MODULES.USERS),
  userController.createUser
);

// Update user
router.put('/:id',
  requirePermission('users:edit'),
  validateObjectId(),
  validate({ body: updateUserSchema.shape.body }),
  auditUpdate(MODULES.USERS),
  userController.updateUser
);

// Update user status
router.patch('/:id/status',
  requirePermission('users:edit'),
  validateObjectId(),
  validate({ body: updateUserStatusSchema.shape.body }),
  auditUpdate(MODULES.USERS),
  userController.updateUserStatus
);

// Update user password
router.patch('/:id/password',
  requirePermission('users:edit'),
  validateObjectId(),
  validate({ body: updateUserPasswordSchema.shape.body }),
  auditUpdate(MODULES.USERS),
  userController.updateUserPassword
);

// Assign roles to user
router.post('/:id/roles',
  requirePermission('users:edit'),
  validateObjectId(),
  validate({ body: assignRolesSchema.shape.body }),
  auditAssign(MODULES.USERS),
  userController.assignRoles
);

// Remove role from user
router.delete('/:id/roles/:roleId',
  requirePermission('users:edit'),
  validateObjectId(),
  validateObjectId('roleId'),
  auditRemove(MODULES.USERS),
  userController.removeRole
);

// Delete user
router.delete('/:id',
  requirePermission('users:delete'),
  validateObjectId(),
  auditDelete(MODULES.USERS),
  userController.deleteUser
);

export default router;