import { Router } from "express";
import { VendorController } from "../controllers/vendor.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { upload } from "../middleware/upload.middleware";
const router = Router();

router.use(authenticate);

// Role definitions
const VENDOR_MANAGEMENT = ["super_admin", "vendor_admin"];
const STAFF_MANAGEMENT = ["super_admin", "vendor_admin", "vendor_staff"];

// Get company dashboard data
router.get(
  "/companies/dashboard",
  authorize(STAFF_MANAGEMENT),
  VendorController.getCompanyDashboard
);

// Create a new company
router.post("/companies", authorize(STAFF_MANAGEMENT), VendorController.createCompany);

// Get all companies with pagination
router.get("/companies", authorize(STAFF_MANAGEMENT), VendorController.getAllCompanies);

// Get company by id
router.get("/companies/:id", authorize(STAFF_MANAGEMENT), VendorController.getCompanyById);

// Update company by id
router.put("/companies/:id", authorize(STAFF_MANAGEMENT), VendorController.updateCompany);

// Delete company by id
router.delete("/companies/:id", authorize(STAFF_MANAGEMENT), VendorController.deleteCompany);

// Update company verification status (approve/reject)
router.patch(
  "/companies/:id/verification",
  authorize(VENDOR_MANAGEMENT),
  VendorController.updateCompanyVerificationStatus
);

// Update company status (active/inactive)
router.patch(
  "/companies/:id/status",
  authorize(VENDOR_MANAGEMENT),
  VendorController.updateCompanyStatus
);

// Bulk update company verification status
router.patch(
  "/companies/bulk-verification",
  authorize(VENDOR_MANAGEMENT),
  VendorController.bulkUpdateCompanyVerification
);

// Get company statistics
router.get(
  "/companies/statistics/overview",
  authorize(STAFF_MANAGEMENT),
  VendorController.getCompanyStatistics
);

// Get audit trail for a company
router.get(
  "/companies/:id/audit-trail",
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
router.get("/companies/export/all", authorize(STAFF_MANAGEMENT), VendorController.exportCompanies);

// Export single company data
router.get(
  "/companies/:id/export",
  authorize(STAFF_MANAGEMENT),
  VendorController.exportCompanyById
);

// Create a new brand with multiple document uploads
router.post(
  "/brands",
  authorize(STAFF_MANAGEMENT),
  upload.fields([
    // Common mandatory documents
    { name: "upload_cancelled_cheque_image", maxCount: 1 },
    { name: "gst_certificate_image", maxCount: 1 },
    { name: "PAN_image", maxCount: 1 },
    { name: "FSSAI_image", maxCount: 1 },

    // Legal entity specific documents (all possible documents)
    { name: "certificate_of_incorporation_image", maxCount: 1 },
    { name: "MSME_or_Udyam_certificate_image", maxCount: 1 },
    { name: "MOA_image", maxCount: 1 },
    { name: "AOA_image", maxCount: 1 },
    { name: "Trademark_certificate_image", maxCount: 1 },
    { name: "Authorized_Signatory_image", maxCount: 1 },
    { name: "LLP_agreement_image", maxCount: 1 },
    { name: "Shop_and_Establishment_certificate_image", maxCount: 1 },
    { name: "Registered_Partnership_deed_image", maxCount: 1 },
    { name: "Board_resolution_image", maxCount: 1 },
  ]),
  VendorController.createBrand
);
// Get all brands with pagination
router.get("/brands", authorize(STAFF_MANAGEMENT), VendorController.getAllBrands);

// Get brand by id
router.get("/brands/:id", authorize(STAFF_MANAGEMENT), VendorController.getBrandById);
// Delete brand by id
router.delete("/brands/:id", authorize(STAFF_MANAGEMENT), VendorController.deleteBrand);

// Update brand verification status (only super_admin and vendor_admin)
router.patch(
  "/brands/:id/verification",
  authorize(VENDOR_MANAGEMENT),
  VendorController.updateBrandVerificationStatus
);

// Update brand status (active/inactive)
router.patch(
  "/brands/:id/status",
  authorize(VENDOR_MANAGEMENT),
  VendorController.updateBrandStatus
);

// Bulk update brand verification status
router.patch(
  "/brands/bulk-verification",
  authorize(VENDOR_MANAGEMENT),
  VendorController.bulkUpdateBrandVerification
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
  "/brands/:id/audit-trail",
  authorize(STAFF_MANAGEMENT),
  VendorController.getBrandAuditTrail
);

// Export brands data
router.get("/brands/export/all", authorize(STAFF_MANAGEMENT), VendorController.exportBrands);

// Export single brand data
router.get("/brands/:id/export", authorize(STAFF_MANAGEMENT), VendorController.exportBrandById);
// Update brand by id
router.put(
  "/brands/:id",
  authorize(STAFF_MANAGEMENT),
  upload.fields([
    { name: "upload_cancelled_cheque_image", maxCount: 1 },
    { name: "gst_certificate_image", maxCount: 1 },
    { name: "PAN_image", maxCount: 1 },
    { name: "FSSAI_image", maxCount: 1 },
    // Add other document fields as needed
    { name: "certificate_of_incorporation_image", maxCount: 1 },
    { name: "MSME_or_Udyam_certificate_image", maxCount: 1 },
    { name: "MOA_image", maxCount: 1 },
    { name: "AOA_image", maxCount: 1 },
    { name: "Trademark_certificate_image", maxCount: 1 },
    { name: "Authorized_Signatory_image", maxCount: 1 },
    { name: "LLP_agreement_image", maxCount: 1 },
    { name: "Shop_and_Establishment_certificate_image", maxCount: 1 },
    { name: "Registered_Partnership_deed_image", maxCount: 1 },
    { name: "Board_resolution_image", maxCount: 1 },
  ]),
  VendorController.updateBrand
);

export default router;
