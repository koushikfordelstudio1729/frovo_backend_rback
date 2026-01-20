import { Router } from "express";
import { VendorController } from "../controllers/vendor.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { uploadSingle } from "../middleware/upload.middleware";

import { logger } from "../utils/logger.util";
const router = Router();
const vendorController = new VendorController();

logger.info("🔀 === VENDOR ROUTES REGISTRATION ===");

// ========== APPLY AUTHENTICATION TO ALL OTHER ROUTES ==========
router.use(authenticate);

// Route groups for better organization
const SUPER_ADMIN_ONLY = ["super_admin"];
const VENDOR_MANAGEMENT = ["super_admin", "vendor_admin"];

const READ_ACCESS = [
  "super_admin",
  "vendor_admin",
  "ops_manager",
  "finance_manager",
  "warehouse_manager",
  "warehouse_manager_full",
];

// ========== COMPANY ROUTES ==========
logger.info("📋 Registering company routes...");
router.post("/companies", authorize(VENDOR_MANAGEMENT), VendorController.createCompany);
router.get("/companies", authorize(READ_ACCESS), VendorController.getAllCompanies);
router.get("/companies/search", authorize(READ_ACCESS), VendorController.searchCompanies);
router.get("/companies/:cin", authorize(READ_ACCESS), VendorController.getCompanyById);
router.put("/companies/:cin", authorize(VENDOR_MANAGEMENT), VendorController.updateCompany);
router.delete("/companies/:cin", authorize(VENDOR_MANAGEMENT), VendorController.deleteCompany);
router.get("/companies/:cin/exists", authorize(READ_ACCESS), VendorController.checkCompanyExists);
router.get(
  "/companies/:cin/vendors",
  authorize(READ_ACCESS),
  VendorController.getCompanyWithVendorStats
);

// ========== DASHBOARD ROUTES ==========
logger.info("📊 Registering dashboard routes...");

// COMMON DASHBOARD - Accessible by both Super Admin and Vendor Admin
// Shows all companies and all vendors (created by all admins)
router.get(
  "/common-dashboard",
  authorize(VENDOR_MANAGEMENT),
  vendorController.getCommonDashboard.bind(vendorController)
);

// SUPER ADMIN VENDOR MANAGEMENT DASHBOARD - Only Super Admin
// Shows only vendors with full approval/verification management
router.get(
  "/super-admin/vendor-management",
  authorize(SUPER_ADMIN_ONLY),
  vendorController.getSuperAdminVendorManagement.bind(vendorController)
);

// ========== SUPER ADMIN SPECIFIC ROUTES ==========
logger.info("👑 Registering super admin routes...");
router.get(
  "/super-admin/vendors",
  authorize(SUPER_ADMIN_ONLY),
  vendorController.getAllVendorsForSuperAdmin.bind(vendorController)
);
router.get(
  "/super-admin/statistics",
  authorize(SUPER_ADMIN_ONLY),
  vendorController.getVendorStatistics.bind(vendorController)
);
router.get(
  "/super-admin/pending-approvals",
  authorize(SUPER_ADMIN_ONLY),
  vendorController.getPendingApprovals.bind(vendorController)
);

// ========== VENDOR VERIFICATION ROUTES ==========
logger.info("✅ Registering verification routes...");
router.patch(
  "/:id/verify",
  authorize(VENDOR_MANAGEMENT),
  vendorController.updateVendorVerification.bind(vendorController)
);
router.post(
  "/bulk-verify",
  authorize(VENDOR_MANAGEMENT),
  vendorController.bulkUpdateVendorVerification.bind(vendorController)
);
router.put(
  "/:id/quick-verify",
  authorize(VENDOR_MANAGEMENT),
  vendorController.quickVerifyOrRejectVendor.bind(vendorController)
);
router.put(
  "/:id/quick-reject",
  authorize(VENDOR_MANAGEMENT),
  vendorController.quickVerifyOrRejectVendor.bind(vendorController)
);

// ========== VENDOR CREATION ROUTES ==========
logger.info("➕ Registering vendor creation routes...");
router.post(
  "/create",
  authorize(VENDOR_MANAGEMENT),
  vendorController.createCompleteVendor.bind(vendorController)
);
router.post(
  "/bulk-create",
  authorize(VENDOR_MANAGEMENT),
  vendorController.createBulkVendors.bind(vendorController)
);

// ========== GENERAL VENDOR MANAGEMENT ROUTES ==========
logger.info("📝 Registering general vendor routes...");
router.get(
  "/profile/me",
  authorize(VENDOR_MANAGEMENT),
  vendorController.getMyVendorProfile.bind(vendorController)
);
router.get("/", authorize(READ_ACCESS), vendorController.getAllVendors.bind(vendorController));
router.get("/:id", authorize(READ_ACCESS), vendorController.getVendorById.bind(vendorController));
router.get(
  "/vendor-id/:vendorId",
  authorize(READ_ACCESS),
  vendorController.getVendorByVendorId.bind(vendorController)
);
router.put(
  "/:id",
  authorize(VENDOR_MANAGEMENT),
  vendorController.updateVendor.bind(vendorController)
);
router.delete(
  "/:id",
  authorize(VENDOR_MANAGEMENT),
  vendorController.deleteVendor.bind(vendorController)
);

// ========== DOCUMENT MANAGEMENT ROUTES ==========
logger.info("📄 Registering document routes...");
router.post(
  "/:id/documents",
  authorize(VENDOR_MANAGEMENT),
  uploadSingle,
  vendorController.uploadVendorDocument.bind(vendorController)
);
router.get(
  "/:id/documents",
  authorize(READ_ACCESS),
  vendorController.getVendorDocuments.bind(vendorController)
);
router.get(
  "/:id/documents/:documentId",
  authorize(READ_ACCESS),
  vendorController.getVendorDocument.bind(vendorController)
);
router.delete(
  "/:id/documents/:documentId",
  authorize(VENDOR_MANAGEMENT),
  vendorController.deleteVendorDocument.bind(vendorController)
);

// ========== AUDIT TRAIL ROUTES ==========
logger.info("📜 Registering audit trail routes...");
router.get(
  "/:id/audit-trail",
  authorize(READ_ACCESS),
  vendorController.getVendorAuditTrail.bind(vendorController)
);
router.get(
  "/companies/:cin/audit-trail",
  authorize(READ_ACCESS),
  vendorController.getCompanyAuditTrail.bind(vendorController)
);

logger.info("✅ === ALL VENDOR ROUTES REGISTERED ===");

export default router;
