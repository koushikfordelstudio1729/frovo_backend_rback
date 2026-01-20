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

router.use(authenticate);

router.get(
  "/",
  requirePermission("departments:view"),
  validate({ query: getDepartmentsQuerySchema.shape.query }),
  departmentController.getDepartments
);

router.get(
  "/:id",
  requirePermission("departments:view"),
  validateObjectId(),
  departmentController.getDepartmentById
);

router.post(
  "/",
  requireSuperAdmin(),
  validate({ body: createDepartmentSchema.shape.body }),
  auditCreate(MODULES.DEPARTMENTS),
  departmentController.createDepartment
);

router.put(
  "/:id",
  requireSuperAdmin(),
  validateObjectId(),
  validate({ body: updateDepartmentSchema.shape.body }),
  auditUpdate(MODULES.DEPARTMENTS),
  departmentController.updateDepartment
);

router.post(
  "/:id/members",
  requirePermission("departments:edit"),
  validateObjectId(),
  validate({ body: addMembersSchema.shape.body }),
  auditAssign(MODULES.DEPARTMENTS),
  departmentController.addMembers
);

router.delete(
  "/:id/members/:userId",
  requirePermission("departments:edit"),
  validateObjectId(),
  validateObjectId("userId"),
  auditRemove(MODULES.DEPARTMENTS),
  departmentController.removeMember
);

router.delete(
  "/:id",
  requireSuperAdmin(),
  validateObjectId(),
  auditDelete(MODULES.DEPARTMENTS),
  departmentController.deleteDepartment
);

export default router;
