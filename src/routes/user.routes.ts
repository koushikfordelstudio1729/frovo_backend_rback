import { Router } from "express";
import * as userController from "../controllers/user.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { validate, validateObjectId } from "../middleware/validation.middleware";
import {
  auditCreate,
  auditUpdate,
  auditDelete,
  auditAssign,
  auditRemove,
} from "../middleware/auditLog.middleware";
import {
  createUserSchema,
  updateUserSchema,
  updateUserStatusSchema,
  assignRolesSchema,
  updateUserPasswordSchema,
} from "../validators/user.validator";
import { MODULES } from "../config/constants";

const router = Router();

router.use(authenticate);

router.get("/", requirePermission("users:view"), userController.getUsers);

router.get("/search", requirePermission("users:view"), userController.searchUsers);

router.get("/:id", requirePermission("users:view"), validateObjectId(), userController.getUserById);

router.get(
  "/:id/permissions",
  requirePermission("users:view"),
  validateObjectId(),
  userController.getUserPermissions
);

router.post(
  "/",
  requirePermission("users:create"),
  validate({ body: createUserSchema.shape.body }),
  auditCreate(MODULES.USERS),
  userController.createUser
);

router.put(
  "/:id",
  requirePermission("users:edit"),
  validateObjectId(),
  validate({ body: updateUserSchema.shape.body }),
  auditUpdate(MODULES.USERS),
  userController.updateUser
);

router.patch(
  "/:id/status",
  requirePermission("users:edit"),
  validateObjectId(),
  validate({ body: updateUserStatusSchema.shape.body }),
  auditUpdate(MODULES.USERS),
  userController.updateUserStatus
);

router.patch(
  "/:id/password",
  requirePermission("users:edit"),
  validateObjectId(),
  validate({ body: updateUserPasswordSchema.shape.body }),
  auditUpdate(MODULES.USERS),
  userController.updateUserPassword
);

router.post(
  "/:id/roles",
  requirePermission("users:edit"),
  validateObjectId(),
  validate({ body: assignRolesSchema.shape.body }),
  auditAssign(MODULES.USERS),
  userController.assignRoles
);

router.delete(
  "/:id/roles/:roleId",
  requirePermission("users:edit"),
  validateObjectId(),
  validateObjectId("roleId"),
  auditRemove(MODULES.USERS),
  userController.removeRole
);

router.delete(
  "/:id",
  requirePermission("users:delete"),
  validateObjectId(),
  auditDelete(MODULES.USERS),
  userController.deleteUser
);

export default router;
