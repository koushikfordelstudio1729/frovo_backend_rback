import { Router } from 'express';
import { VendorController } from '../controllers/vendor.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { uploadSingle } from '../middleware/upload.middleware';

const router = Router();
const vendorController = new VendorController();

// Apply authentication to all vendor routes
router.use(authenticate);

// Route groups for better organization
const SUPER_ADMIN_ONLY = ['super_admin'];
const VENDOR_MANAGEMENT = ['super_admin', 'vendor_admin'];
const READ_ACCESS = ['super_admin', 'vendor_admin', 'ops_manager', 'finance_manager'];

// Company routes (static methods)
router.post('/companies', VendorController.createCompany);
router.get('/companies', VendorController.getAllCompanies);
router.get('/companies/search', VendorController.searchCompanies);
router.get('/companies/:id', VendorController.getCompanyById);
router.put('/companies/:id', VendorController.updateCompany);
router.delete('/companies/:id', VendorController.deleteCompany);
router.get('/companies/:id/exists', VendorController.checkCompanyExists);

// Vendor routes (instance methods)
router.get('/vendors/dashboard/super-admin', vendorController.getSuperAdminDashboard.bind(vendorController));
router.get('/vendors/dashboard/admin', vendorController.getVendorAdminDashboard.bind(vendorController));
router.post('/vendors', vendorController.createCompleteVendor.bind(vendorController));
// In your routes file, add:
router.get('/companies/:id/vendors', VendorController.getCompanyWithVendorStats);
router.get('/vendors/company/:company_registration_number', VendorController.getVendorsByCompany);
// Super Admin Dashboard Routes
router.get('/super-admin/dashboard', authorize(SUPER_ADMIN_ONLY), vendorController.getSuperAdminDashboard.bind(vendorController));
router.get('/super-admin/vendors', authorize(SUPER_ADMIN_ONLY), vendorController.getAllVendorsForSuperAdmin.bind(vendorController));
router.get('/super-admin/statistics', authorize(SUPER_ADMIN_ONLY), vendorController.getVendorStatistics.bind(vendorController));
router.get('/super-admin/pending-approvals', authorize(SUPER_ADMIN_ONLY), vendorController.getPendingApprovals.bind(vendorController));

// Vendor Verification (Super Admin only) - Enhanced
router.patch('/:id/verify', authorize(SUPER_ADMIN_ONLY), vendorController.updateVendorVerification.bind(vendorController));
router.patch('/:id/toggle-verification', authorize(SUPER_ADMIN_ONLY), vendorController.toggleVendorVerification.bind(vendorController));
router.post('/bulk-verify', authorize(SUPER_ADMIN_ONLY), vendorController.bulkUpdateVendorVerification.bind(vendorController));

// NEW: Quick verify/reject routes (no body required)
router.put('/:id/quick-verify', authorize(SUPER_ADMIN_ONLY), vendorController.quickVerifyOrRejectVendor.bind(vendorController));
router.put('/:id/quick-reject', authorize(SUPER_ADMIN_ONLY), vendorController.quickVerifyOrRejectVendor.bind(vendorController));

// Vendor Creation
router.post('/create', authorize(VENDOR_MANAGEMENT), vendorController.createCompleteVendor.bind(vendorController));
router.post('/bulk-create', authorize(VENDOR_MANAGEMENT), vendorController.createBulkVendors.bind(vendorController));

// Vendor Management Routes
router.get('/', authorize(READ_ACCESS), vendorController.getAllVendors.bind(vendorController));
router.get('/:id', authorize(READ_ACCESS), vendorController.getVendorById.bind(vendorController));
router.get('/vendor-id/:vendorId', authorize(READ_ACCESS), vendorController.getVendorByVendorId.bind(vendorController));
router.put('/:id', authorize(VENDOR_MANAGEMENT), vendorController.updateVendor.bind(vendorController));
router.delete('/:id', authorize(VENDOR_MANAGEMENT), vendorController.deleteVendor.bind(vendorController));
// Vendor Admin Dashboard Routes (Super Admin can also access)
router.get('/vendor-admin/dashboard', authorize(VENDOR_MANAGEMENT), vendorController.getVendorAdminDashboard.bind(vendorController));
router.get('/vendor-admin/vendors/:id/edit', authorize(VENDOR_MANAGEMENT), vendorController.getVendorForEdit.bind(vendorController));
router.put('/vendor-admin/vendors/:id', authorize(VENDOR_MANAGEMENT), vendorController.updateVendorForAdmin.bind(vendorController));
router.delete('/vendor-admin/vendors/:id', authorize(VENDOR_MANAGEMENT), vendorController.deleteVendorForAdmin.bind(vendorController));

// Document Management Routes
router.post('/:id/documents', authorize(VENDOR_MANAGEMENT), uploadSingle, vendorController.uploadVendorDocument.bind(vendorController));
router.get('/:id/documents', authorize(READ_ACCESS), vendorController.getVendorDocuments.bind(vendorController));
router.get('/:id/documents/:documentId', authorize(READ_ACCESS), vendorController.getVendorDocument.bind(vendorController));
router.delete('/:id/documents/:documentId', authorize(VENDOR_MANAGEMENT), vendorController.deleteVendorDocument.bind(vendorController));

export default router;