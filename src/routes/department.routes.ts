import { Router } from "express";
import * as departmentController from "../controllers/department.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requirePermission, requireSuperAdmin } from "../middleware/permission.middleware";
import { validate, validateObjectId } from "../middleware/validation.middleware";
import {
  auditCreate,
  auditUpdate,
  auditDelete,
  auditAssign,
  auditRemove,
} from "../middleware/auditLog.middleware";
import {
  createDepartmentSchema,
  updateDepartmentSchema,
  addMembersSchema,
  getDepartmentsQuerySchema,
} from "../validators/department.validator";
import { MODULES } from "../config/constants";

const router = Router();

// All routes require authentication
router.use(authenticate);

// Get departments
router.get(
  "/",
  requirePermission("departments:view"),
  validate({ query: getDepartmentsQuerySchema.shape.query }),
  departmentController.getDepartments
);

// Get department by ID
router.get(
  "/:id",
  requirePermission("departments:view"),
  validateObjectId(),
  departmentController.getDepartmentById
);

// Create department (Super Admin only)
router.post(
  "/",
  requireSuperAdmin(),
  validate({ body: createDepartmentSchema.shape.body }),
  auditCreate(MODULES.DEPARTMENTS),
  departmentController.createDepartment
);

// Update department (Super Admin only)
router.put(
  "/:id",
  requireSuperAdmin(),
  validateObjectId(),
  validate({ body: updateDepartmentSchema.shape.body }),
  auditUpdate(MODULES.DEPARTMENTS),
  departmentController.updateDepartment
);

// Add members to department
router.post(
  "/:id/members",
  requirePermission("departments:edit"),
  validateObjectId(),
  validate({ body: addMembersSchema.shape.body }),
  auditAssign(MODULES.DEPARTMENTS),
  departmentController.addMembers
);

// Remove member from department
router.delete(
  "/:id/members/:userId",
  requirePermission("departments:edit"),
  validateObjectId(),
  validateObjectId("userId"),
  auditRemove(MODULES.DEPARTMENTS),
  departmentController.removeMember
);

// Delete department (Super Admin only)
router.delete(
  "/:id",
  requireSuperAdmin(),
  validateObjectId(),
  auditDelete(MODULES.DEPARTMENTS),
  departmentController.deleteDepartment
);

export default router;
