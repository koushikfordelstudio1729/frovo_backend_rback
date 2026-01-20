import { Router } from "express";
import * as accessRequestController from "../controllers/accessRequest.controller";
import { authenticate } from "../middleware/auth.middleware";
import { requirePermission } from "../middleware/permission.middleware";
import { validate, validateObjectId } from "../middleware/validation.middleware";
import { auditCreate, auditApprove, auditReject } from "../middleware/auditLog.middleware";
import {
  createAccessRequestSchema,
  updateAccessRequestStatusSchema,
  getAccessRequestsQuerySchema,
} from "../validators/accessRequest.validator";
import { MODULES } from "../config/constants";

const router = Router();

router.use(authenticate);

router.get(
  "/",
  requirePermission("roles:view"),
  validate({ query: getAccessRequestsQuerySchema.shape.query }),
  accessRequestController.getAccessRequests
);

router.get("/:id", authenticate, validateObjectId(), accessRequestController.getAccessRequestById);

router.post(
  "/",
  authenticate,
  validate({ body: createAccessRequestSchema.shape.body }),
  auditCreate(MODULES.ACCESS_REQUESTS),
  accessRequestController.createAccessRequest
);

router.put(
  "/:id/approve",
  requirePermission("roles:edit"),
  validateObjectId(),
  validate({ body: updateAccessRequestStatusSchema.shape.body }),
  auditApprove(MODULES.ACCESS_REQUESTS),
  accessRequestController.approveAccessRequest
);

router.put(
  "/:id/reject",
  requirePermission("roles:edit"),
  validateObjectId(),
  validate({ body: updateAccessRequestStatusSchema.shape.body }),
  auditReject(MODULES.ACCESS_REQUESTS),
  accessRequestController.rejectAccessRequest
);

export default router;
