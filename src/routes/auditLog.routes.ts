import { Router } from "express";
import * as auditLogController from "../controllers/auditLog.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  getAuditLogsQuerySchema,
  exportAuditLogsQuerySchema,
} from "../validators/auditLog.validator";

const router = Router();

router.use(authenticate);
router.use(requirePermission("audit:view"));

router.get(
  "/",
  validate({ query: getAuditLogsQuerySchema.shape.query }),
  auditLogController.getAuditLogs
);

router.get("/stats", auditLogController.getAuditStats);

router.get(
  "/export",
  requirePermission("audit:export"),
  validate({ query: exportAuditLogsQuerySchema.shape.query }),
  auditLogController.exportAuditLogs
);

export default router;
