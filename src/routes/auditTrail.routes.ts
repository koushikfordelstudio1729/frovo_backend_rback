// routes/auditTrail.routes.ts
import { Router } from "express";
import { AuditTrailController } from "../controllers/auditTrail.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();
const auditTrailController = new AuditTrailController();

// Apply authentication to all audit trail routes
router.use(authenticate);

// Authorization groups
const SUPER_ADMIN_ONLY = ["super_admin"];

// ========== AUDIT TRAIL ROUTES (SUPER ADMIN ONLY) ==========

/**
 * Get all audit trails
 * GET /api/audit-trails
 */
router.get(
  "/",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getAuditTrails.bind(auditTrailController)
);

/**
 * Get audit statistics
 * GET /api/audit-trails/statistics
 */
router.get(
  "/statistics",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getAuditStatistics.bind(auditTrailController)
);

/**
 * Get audit summary
 * GET /api/audit-trails/summary
 */
router.get(
  "/summary",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getAuditSummary.bind(auditTrailController)
);

/**
 * Get vendor-specific audit trails
 * GET /api/audit-trails/vendor/:vendorId
 */
router.get(
  "/vendor/:vendorId",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getVendorAuditTrails.bind(auditTrailController)
);

/**
 * Get company-specific audit trails
 * GET /api/audit-trails/company/:companyId
 */
router.get(
  "/company/:companyId",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getCompanyAuditTrails.bind(auditTrailController)
);

/**
 * Get user activity
 * GET /api/audit-trails/user/:userId
 */
router.get(
  "/user/:userId",
  authenticate,
  auditTrailController.getUserActivity.bind(auditTrailController)
);

export default router;
