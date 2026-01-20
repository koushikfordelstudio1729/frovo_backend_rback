// routes/auditTrail.routes.ts
import { Router } from "express";
import { AuditTrailController } from "../controllers/auditTrail.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = Router();
const auditTrailController = new AuditTrailController();

console.log("🔍 === AUDIT TRAIL ROUTES REGISTRATION ===");

// Apply authentication to all audit trail routes
router.use(authenticate);

// Authorization groups
const SUPER_ADMIN_ONLY = ["super_admin"];

// ========== AUDIT TRAIL ROUTES (SUPER ADMIN ONLY) ==========
console.log("📋 Registering audit trail routes...");

/**
 * Get all audit trails
 * GET /api/audit-trails
 * Access: Super Admin only
 * Query params: user, target_type, target_vendor, target_company, action, user_role, date_from, date_to, search, page, limit
 */
router.get(
  "/",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getAuditTrails.bind(auditTrailController)
);

/**
 * Get audit statistics
 * GET /api/audit-trails/statistics
 * Access: Super Admin only
 */
router.get(
  "/statistics",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getAuditStatistics.bind(auditTrailController)
);

/**
 * Get audit summary (today, this week, this month)
 * GET /api/audit-trails/summary
 * Access: Super Admin only
 */
router.get(
  "/summary",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getAuditSummary.bind(auditTrailController)
);

/**
 * Get vendor-specific audit trails
 * GET /api/audit-trails/vendor/:vendorId
 * Access: Super Admin only
 */
router.get(
  "/vendor/:vendorId",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getVendorAuditTrails.bind(auditTrailController)
);

/**
 * Get company-specific audit trails
 * GET /api/audit-trails/company/:companyId
 * Access: Super Admin only
 */
router.get(
  "/company/:companyId",
  authorize(SUPER_ADMIN_ONLY),
  auditTrailController.getCompanyAuditTrails.bind(auditTrailController)
);

/**
 * Get user activity
 * GET /api/audit-trails/user/:userId
 * Access: Users can see their own, Super Admin can see anyone's
 */
router.get(
  "/user/:userId",
  authenticate,
  auditTrailController.getUserActivity.bind(auditTrailController)
);

console.log("✅ === ALL AUDIT TRAIL ROUTES REGISTERED ===");

export default router;
