import { Router } from "express";
import * as roleController from "../controllers/role.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { validate, validateObjectId } from "../middleware/validation.middleware";
import {
  auditCreate,
  auditUpdate,
  auditDelete,
  auditAssign,
} from "../middleware/auditLog.middleware";
import {
  createRoleSchema,
  updateRoleSchema,
  assignRoleSchema,
  getRolesQuerySchema,
  publishRoleSchema,
  cloneRoleSchema,
} from "../validators/role.validator";
import { MODULES } from "../config/constants";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("roles:view"),
  validate({ query: getRolesQuerySchema.shape.query }),
  roleController.getRoles
);

router.get("/:id", requirePermission("roles:view"), validateObjectId(), roleController.getRoleById);

router.get(
  "/:id/permissions",
  requirePermission("roles:view"),
  validateObjectId(),
  roleController.getRolePermissions
);

router.get(
  "/:id/users",
  requirePermission("roles:view"),
  validateObjectId(),
  roleController.getRoleUsers
);

router.post(
  "/",
  requirePermission("roles:create"),
  validate({ body: createRoleSchema.shape.body }),
  auditCreate(MODULES.ROLES),
  roleController.createRole
);

router.post(
  "/:id/clone",
  requirePermission("roles:create"),
  validateObjectId(),
  validate({ body: cloneRoleSchema.shape.body }),
  auditCreate(MODULES.ROLES),
  roleController.cloneRole
);

router.put(
  "/:id",
  requirePermission("roles:edit"),
  validateObjectId(),
  validate({ body: updateRoleSchema.shape.body }),
  auditUpdate(MODULES.ROLES),
  roleController.updateRole
);

router.put(
  "/:id/permissions",
  requirePermission("roles:edit"),
  validateObjectId(),
  auditUpdate(MODULES.ROLES),
  roleController.updateRolePermissions
);

router.patch(
  "/:id/publish",
  requirePermission("roles:edit"),
  validateObjectId(),
  validate({ body: publishRoleSchema.shape.body }),
  auditUpdate(MODULES.ROLES),
  roleController.publishRole
);

router.post(
  "/:id/assign",
  requirePermission("roles:edit"),
  validateObjectId(),
  validate({ body: assignRoleSchema.shape.body }),
  auditAssign(MODULES.ROLES),
  roleController.assignRole
);

router.delete(
  "/:id",
  requirePermission("roles:delete"),
  validateObjectId(),
  auditDelete(MODULES.ROLES),
  roleController.deleteRole
);

export default router;
