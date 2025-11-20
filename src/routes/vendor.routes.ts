// routes/vendor.routes.ts
import { Router } from 'express';
import { VendorController } from '../controllers/vendor.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';

const router = Router();
const vendorController = new VendorController();

// Apply authentication to all vendor routes
router.use(authenticate);

// Route groups for better organization
const SUPER_ADMIN_ONLY = ['super_admin'];
const VENDOR_MANAGEMENT = ['super_admin', 'vendor_admin'];
const READ_ACCESS = ['super_admin', 'vendor_admin', 'ops_manager', 'finance_manager'];

// Complete Vendor Creation
router.post('/complete', authorize(VENDOR_MANAGEMENT), vendorController.createCompleteVendor.bind(vendorController));

// Vendor Dashboard and Analytics
router.get('/dashboard', authorize(VENDOR_MANAGEMENT), vendorController.getVendorDashboard.bind(vendorController));
router.get('/overview', authorize(VENDOR_MANAGEMENT), vendorController.getVendorOverview.bind(vendorController));
router.get('/pending-approvals', authorize(SUPER_ADMIN_ONLY), vendorController.getPendingApprovals.bind(vendorController));

// Vendor Details Routes
router.route('/details')
  .post(authorize(VENDOR_MANAGEMENT), vendorController.createVendorDetails.bind(vendorController));

router.route('/details/:id')
  .get(authorize(READ_ACCESS), vendorController.getVendorDetails.bind(vendorController))
  .put(authorize(VENDOR_MANAGEMENT), vendorController.updateVendorDetails.bind(vendorController));

// Vendor Financials Routes - UPDATED with vendor ID header support
router.route('/financials')
  .post(authorize(VENDOR_MANAGEMENT), vendorController.createVendorFinancials.bind(vendorController));

router.route('/financials/vendor/:vendorId')
  .get(authorize([...READ_ACCESS, 'finance_manager']), vendorController.getVendorFinancials.bind(vendorController))
  .put(authorize(VENDOR_MANAGEMENT), vendorController.updateVendorFinancials.bind(vendorController));

// Vendor Compliance Routes - UPDATED with vendor ID header support
router.route('/compliance')
  .post(authorize(VENDOR_MANAGEMENT), vendorController.createVendorCompliance.bind(vendorController));

router.route('/compliance/vendor/:vendorId')
  .get(authorize(READ_ACCESS), vendorController.getVendorCompliance.bind(vendorController))
  .put(authorize(VENDOR_MANAGEMENT), vendorController.updateVendorCompliance.bind(vendorController));

// Vendor Status Routes - UPDATED with vendor ID header support
router.route('/status')
  .post(authorize(VENDOR_MANAGEMENT), vendorController.createVendorStatus.bind(vendorController));

router.route('/status/vendor/:vendorId')
  .get(authorize(READ_ACCESS), vendorController.getVendorStatus.bind(vendorController))
  .put(authorize(VENDOR_MANAGEMENT), vendorController.updateVendorStatus.bind(vendorController));

// Vendor Verification (Super Admin only) - UPDATED with vendor ID header support
router.patch('/status/vendor/:vendorId/verify', authorize(SUPER_ADMIN_ONLY), vendorController.updateVendorVerification.bind(vendorController));

// Vendor Document Routes - UPDATED with vendor ID header support
router.route('/documents')
  .post(authorize(VENDOR_MANAGEMENT), vendorController.createVendorDocument.bind(vendorController));

router.route('/documents/:id')
  .delete(authorize(VENDOR_MANAGEMENT), vendorController.deleteVendorDocument.bind(vendorController));

router.get('/documents/vendor/:vendorId', authorize(READ_ACCESS), vendorController.getVendorDocuments.bind(vendorController));

// Vendor Contract Routes - UPDATED with vendor ID header support
router.route('/contracts')
  .post(authorize(VENDOR_MANAGEMENT), vendorController.createVendorContract.bind(vendorController));

router.route('/contracts/vendor/:vendorId')
  .get(authorize(READ_ACCESS), vendorController.getVendorContract.bind(vendorController))
  .put(authorize(VENDOR_MANAGEMENT), vendorController.updateVendorContract.bind(vendorController));

// Vendor System Info Routes - UPDATED with vendor ID header support
router.route('/system-info')
  .post(authorize(VENDOR_MANAGEMENT), vendorController.createVendorSystemInfo.bind(vendorController));

router.route('/system-info/vendor/:vendorId')
  .get(authorize(VENDOR_MANAGEMENT), vendorController.getVendorSystemInfo.bind(vendorController))
  .put(authorize(VENDOR_MANAGEMENT), vendorController.updateVendorSystemInfo.bind(vendorController));

// Vendor Management Routes
router.route('/')
  .get(authorize(VENDOR_MANAGEMENT), vendorController.getAllVendors.bind(vendorController));

router.route('/:id')
  .delete(authorize(VENDOR_MANAGEMENT), vendorController.deleteVendor.bind(vendorController));

// Vendor Status Management - UPDATED with vendor ID header support
router.patch('/vendor/:vendorId/approve', authorize(VENDOR_MANAGEMENT), vendorController.approveVendor.bind(vendorController));
router.patch('/vendor/:vendorId/activate', authorize(VENDOR_MANAGEMENT), vendorController.activateVendor.bind(vendorController));
router.patch('/vendor/:vendorId/deactivate', authorize(VENDOR_MANAGEMENT), vendorController.deactivateVendor.bind(vendorController));

// NEW: Bulk update endpoint for dashboard editing
router.put('/vendor/:vendorId/bulk-update', authorize(VENDOR_MANAGEMENT), vendorController.bulkUpdateVendor.bind(vendorController));

export default router;