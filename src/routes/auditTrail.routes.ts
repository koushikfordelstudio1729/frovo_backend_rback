import { Router } from "express";
import { AuditTrailController } from "../controllers/auditTrail.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();
const auditTrailController = new AuditTrailController();

router.use(authenticate);

const SUPER_ADMIN_ONLY = ["super_admin"];

router.get(
  "/",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getAuditTrails.bind(auditTrailController)
);

router.get(
  "/statistics",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getAuditStatistics.bind(auditTrailController)
);

router.get(
  "/summary",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getAuditSummary.bind(auditTrailController)
);

router.get(
  "/vendor/:vendorId",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getVendorAuditTrails.bind(auditTrailController)
);

router.get(
  "/company/:companyId",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getCompanyAuditTrails.bind(auditTrailController)
);

router.get(
  "/user/:userId",
  authenticate,
  auditTrailController.getUserActivity.bind(auditTrailController)
);

export default router;
