import { Router } from "express";
import { VendorController } from "../controllers/vendor.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { uploadMultiple, uploadSingle } from "../middleware/upload.middleware";

const router = Router();

router.use(authenticate);

// Role definitions
const SUPER_ADMIN_ONLY = ["super_admin"];
const VENDOR_MANAGEMENT = ["super_admin", "vendor_admin"];
const STAFF_MANAGEMENT = ["super_admin", "vendor_admin", "vendor_staff"];


// ============================================
// COMPANY ROUTES
// ============================================

// Create a new company
router.post(
  "/companies",
  authorize(VENDOR_MANAGEMENT),
  VendorController.createCompany
);

// Get all companies with pagination
router.get(
  "/companies",
  authorize(STAFF_MANAGEMENT),
  VendorController.getAllCompanies
);

// Get company by company_id
router.get(
  "/companies/:company_id",
  authorize(STAFF_MANAGEMENT),
  VendorController.getCompanyById
);

// Update company by company_id
router.put(
  "/companies/:company_id",
  authorize(STAFF_MANAGEMENT),
  VendorController.updateCompany
);

// Delete company by company_id
router.delete(
  "/companies/:company_id",
  authorize(STAFF_MANAGEMENT),
  VendorController.deleteCompany
);

// Toggle company status (active/inactive)
router.patch(
  "/companies/:company_id/toggle-status",
  authorize(VENDOR_MANAGEMENT),
  VendorController.toggleCompanyStatus
);

// Get company statistics
router.get(
  "/companies/statistics/overview",
  authorize(STAFF_MANAGEMENT),
  VendorController.getCompanyStatistics
);

// Get audit trail for a company
router.get(
  "/companies/:company_id/audit-trail",
  authorize(STAFF_MANAGEMENT),
  VendorController.getCompanyAuditTrail
);

// Get all company audit trails (super admin only)
router.get(
  "/audit-trails/companies",
  authorize(STAFF_MANAGEMENT),
  VendorController.getAllCompanyAuditTrails
);

// Export companies data
router.get(
  "/companies/export/all",
  authorize(STAFF_MANAGEMENT),
  VendorController.exportCompanies
);

// Export single company data
router.get(
  "/companies/:company_id/export",
  authorize(STAFF_MANAGEMENT),
  VendorController.exportCompanyById
);

// ============================================
// BRAND ROUTES
// ============================================



// Get all brands with pagination
router.get(
  "/brands",
  authorize(STAFF_MANAGEMENT),
  VendorController.getAllBrands
);

// Get brand by brand_id
router.get(
  "/brands/:brand_id",
  authorize(STAFF_MANAGEMENT),
  VendorController.getBrandById
);



// Delete brand by brand_id
router.delete(
  "/brands/:brand_id",
  authorize(STAFF_MANAGEMENT),
  VendorController.deleteBrand
);

// Update brand verification status
router.patch(
  "/brands/:brand_id/verification",
  authorize(STAFF_MANAGEMENT),
  VendorController.updateBrandVerificationStatus
);

// Get brands by company_id
router.get(
  "/companies/:company_id/brands",
  authorize(STAFF_MANAGEMENT),
  VendorController.getBrandsByCompanyId
);


// Get brand statistics
router.get(
  "/brands/statistics/overview",
  authorize(STAFF_MANAGEMENT),
  VendorController.getBrandStatistics
);

// Get audit trail for a brand
router.get(
  "/brands/:brand_id/audit-trail",
  authorize(STAFF_MANAGEMENT),
  VendorController.getBrandAuditTrail
);


// Export brands data
router.get(
  "/brands/export/all",
  authorize(STAFF_MANAGEMENT),
  VendorController.exportBrands
);

// Export single brand data
router.get(
  "/brands/:brand_id/export",
  authorize(STAFF_MANAGEMENT),
  VendorController.exportBrandById
);

// ============================================
// COMMON/VENDOR ROUTES (for backward compatibility)
// ============================================

// Get common dashboard (placeholder)
router.get(
  "/common-dashboard",
  authorize(VENDOR_MANAGEMENT),
  async (req, res) => {
    res.status(200).json({
      success: true,
      message: "Dashboard endpoint - to be implemented",
      data: {},
    });
  }
);

// Get super admin vendor management (placeholder)
router.get(
  "/super-admin/vendor-management",
  authorize(SUPER_ADMIN_ONLY),
  async (req, res) => {
    res.status(200).json({
      success: true,
      message: "Super admin vendor management - to be implemented",
      data: {},
    });
  }
);

// Get all vendors for super admin (placeholder - could map to companies or brands)
router.get(
  "/super-admin/vendors",
  authorize(SUPER_ADMIN_ONLY),
  async (req, res) => {
    try {
      const result = await VendorController.getAllCompanies(req, res);
      // This will return companies, you may want to modify this
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

// Get vendor statistics (placeholder - could combine company and brand stats)
router.get(
  "/super-admin/statistics",
  authorize(SUPER_ADMIN_ONLY),
  async (req, res) => {
    try {
      const companyStats = await VendorController.getCompanyStatistics(req, res);
      const brandStats = await VendorController.getBrandStatistics(req, res);
      // Combine both stats
    } catch (error) {
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }
);

export default router;