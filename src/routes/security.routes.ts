import { Router } from "express";
import * as securityController from "../controllers/security.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requireSuperAdmin } from "../middleware/permission.middleware";
import { validate } from "../middleware/validation.middleware";
import { auditUpdate } from "../middleware/auditLog.middleware";
import { updateSecurityConfigSchema } from "../validators/security.validator";
import { MODULES } from "../config/constants";

const router = Router();

router.use(authenticate);
router.use(requireSuperAdmin());

router.get("/config", securityController.getSecurityConfig);

router.put(
  "/config",
  validate({ body: updateSecurityConfigSchema.shape.body }),
  auditUpdate(MODULES.SECURITY),
  securityController.updateSecurityConfig
);

export default router;
