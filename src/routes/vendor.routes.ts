import { Router } from 'express';
import { VendorController } from '../controllers/vendor.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { uploadSingle } from '../middleware/upload.middleware';

const router = Router();
const vendorController = new VendorController();

console.log('🔀 === VENDOR ROUTES REGISTRATION ===');

// ========== APPLY AUTHENTICATION TO ALL OTHER ROUTES ==========
router.use(authenticate);

// Route groups for better organization
const SUPER_ADMIN_ONLY = ['super_admin'];
const VENDOR_MANAGEMENT = ['super_admin', 'vendor_admin'];
const VENDOR_ADMIN_ONLY = ['vendor_admin'];

const READ_ACCESS = ['super_admin', 'vendor_admin', 'ops_manager', 'finance_manager', 'warehouse_manager', 'warehouse_manager_full'];

// ========== COMPANY ROUTES ==========
console.log('📋 Registering company routes...');
router.post('/companies', authorize(VENDOR_MANAGEMENT), VendorController.createCompany);
router.get('/companies', authorize(READ_ACCESS), VendorController.getAllCompanies);
router.get('/companies/search', authorize(READ_ACCESS), VendorController.searchCompanies);
router.get('/companies/:id', authorize(READ_ACCESS), VendorController.getCompanyById);
router.put('/companies/:id', authorize(VENDOR_MANAGEMENT), VendorController.updateCompany);
router.delete('/companies/:id', authorize(SUPER_ADMIN_ONLY), VendorController.deleteCompany);
router.get('/companies/:id/exists', authorize(READ_ACCESS), VendorController.checkCompanyExists);
router.get('/companies/:company_registration_number/vendors', 
  authorize(READ_ACCESS), 
  VendorController.getCompanyWithVendorStats
);
router.get('/vendors/company/:company_registration_number', authorize(READ_ACCESS), VendorController.getVendorsByCompany);

// ========== DASHBOARD ROUTES ==========
console.log('📊 Registering dashboard routes...');
// KEEP ONLY ONE VENDOR ADMIN DASHBOARD ROUTE
router.get('/vendor-admin/dashboard', authorize(VENDOR_MANAGEMENT), vendorController.getVendorAdminDashboard.bind(vendorController));
router.get('/super-admin/dashboard', authorize(SUPER_ADMIN_ONLY), vendorController.getSuperAdminDashboard.bind(vendorController));

// REMOVE THIS DUPLICATE ROUTE (it conflicts)
// router.get('/vendors/dashboard/admin', vendorController.getVendorAdminDashboard.bind(vendorController));

// ========== SUPER ADMIN SPECIFIC ROUTES ==========
console.log('👑 Registering super admin routes...');
router.get('/super-admin/vendors', authorize(SUPER_ADMIN_ONLY), vendorController.getAllVendorsForSuperAdmin.bind(vendorController));
router.get('/super-admin/statistics', authorize(SUPER_ADMIN_ONLY), vendorController.getVendorStatistics.bind(vendorController));
router.get('/super-admin/pending-approvals', authorize(SUPER_ADMIN_ONLY), vendorController.getPendingApprovals.bind(vendorController));

// ========== VENDOR VERIFICATION ROUTES ==========
console.log('✅ Registering verification routes...');
router.patch('/:id/verify', authorize(SUPER_ADMIN_ONLY), vendorController.updateVendorVerification.bind(vendorController));
router.patch('/:id/toggle-verification', authorize(SUPER_ADMIN_ONLY), vendorController.toggleVendorVerification.bind(vendorController));
router.post('/bulk-verify', authorize(SUPER_ADMIN_ONLY), vendorController.bulkUpdateVendorVerification.bind(vendorController));
router.put('/:id/quick-verify', authorize(SUPER_ADMIN_ONLY), vendorController.quickVerifyOrRejectVendor.bind(vendorController));
router.put('/:id/quick-reject', authorize(SUPER_ADMIN_ONLY), vendorController.quickVerifyOrRejectVendor.bind(vendorController));

// ========== VENDOR CREATION ROUTES ==========
console.log('➕ Registering vendor creation routes...');
router.post('/create', authorize(VENDOR_ADMIN_ONLY), vendorController.createCompleteVendor.bind(vendorController));
router.post('/bulk-create', authorize(VENDOR_MANAGEMENT), vendorController.createBulkVendors.bind(vendorController));

// REMOVE THIS DUPLICATE ROUTE (already have /create)
// router.post('/vendors', vendorController.createCompleteVendor.bind(vendorController));

// ========== GENERAL VENDOR MANAGEMENT ROUTES ==========
console.log('📝 Registering general vendor routes...');
router.get('/', authorize(READ_ACCESS), vendorController.getAllVendors.bind(vendorController));
router.get('/:id', authorize(READ_ACCESS), vendorController.getVendorById.bind(vendorController));
router.get('/vendor-id/:vendorId', authorize(READ_ACCESS), vendorController.getVendorByVendorId.bind(vendorController));
router.put('/:id', authorize(VENDOR_MANAGEMENT), vendorController.updateVendor.bind(vendorController));
router.delete('/:id', authorize(VENDOR_MANAGEMENT), vendorController.deleteVendor.bind(vendorController));

// REMOVE THESE DUPLICATE ROUTES (they conflict with general routes)
// router.get('/vendor-admin/vendors/:id/edit', authorize(VENDOR_MANAGEMENT), vendorController.getVendorForEdit.bind(vendorController));
// router.put('/vendor-admin/vendors/:id', authorize(VENDOR_MANAGEMENT), vendorController.updateVendorForAdmin.bind(vendorController));
// router.delete('/vendor-admin/vendors/:id', authorize(VENDOR_MANAGEMENT), vendorController.deleteVendorForAdmin.bind(vendorController));

// ========== DOCUMENT MANAGEMENT ROUTES ==========
console.log('📄 Registering document routes...');
router.post('/:id/documents', authorize(VENDOR_MANAGEMENT), uploadSingle, vendorController.uploadVendorDocument.bind(vendorController));
router.get('/:id/documents', authorize(READ_ACCESS), vendorController.getVendorDocuments.bind(vendorController));
router.get('/:id/documents/:documentId', authorize(READ_ACCESS), vendorController.getVendorDocument.bind(vendorController));
router.delete('/:id/documents/:documentId', authorize(VENDOR_MANAGEMENT), vendorController.deleteVendorDocument.bind(vendorController));

console.log('✅ === ALL VENDOR ROUTES REGISTERED ===');

export default router;