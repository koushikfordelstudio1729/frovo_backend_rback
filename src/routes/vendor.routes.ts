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

// Vendor Financials Routes
router.route('/financials/:vendorId')
  .post(authorize(VENDOR_MANAGEMENT), vendorController.createVendorFinancials.bind(vendorController));

router.route('/financials/:id')
  .get(authorize([...READ_ACCESS, 'finance_manager']), vendorController.getVendorFinancials.bind(vendorController))
  .put(authorize(VENDOR_MANAGEMENT), vendorController.updateVendorFinancials.bind(vendorController));

// Vendor Compliance Routes
router.route('/compliance')
  .post(authorize(VENDOR_MANAGEMENT), vendorController.createVendorCompliance.bind(vendorController));

router.route('/compliance/:id')
  .get(authorize(READ_ACCESS), vendorController.getVendorCompliance.bind(vendorController))
  .put(authorize(VENDOR_MANAGEMENT), vendorController.updateVendorCompliance.bind(vendorController));

// Vendor Status Routes
router.route('/status')
  .post(authorize(VENDOR_MANAGEMENT), vendorController.createVendorStatus.bind(vendorController));

router.route('/status/:id')
  .get(authorize(READ_ACCESS), vendorController.getVendorStatus.bind(vendorController))
  .put(authorize(VENDOR_MANAGEMENT), vendorController.updateVendorStatus.bind(vendorController));

// Vendor Verification (Super Admin only)
router.patch('/status/:id/verify', authorize(SUPER_ADMIN_ONLY), vendorController.updateVendorVerification.bind(vendorController));

// Vendor Document Routes
router.route('/documents')
  .post(authorize(VENDOR_MANAGEMENT), vendorController.createVendorDocument.bind(vendorController));

router.route('/documents/:id')
  .delete(authorize(VENDOR_MANAGEMENT), vendorController.deleteVendorDocument.bind(vendorController));

router.get('/documents/vendor/:vendorId', authorize(READ_ACCESS), vendorController.getVendorDocuments.bind(vendorController));

// Vendor Contract Routes
router.route('/contracts')
  .post(authorize(VENDOR_MANAGEMENT), vendorController.createVendorContract.bind(vendorController));

router.route('/contracts/:id')
  .get(authorize(READ_ACCESS), vendorController.getVendorContract.bind(vendorController))
  .put(authorize(VENDOR_MANAGEMENT), vendorController.updateVendorContract.bind(vendorController));

// Vendor System Info Routes
router.route('/system-info')
  .post(authorize(VENDOR_MANAGEMENT), vendorController.createVendorSystemInfo.bind(vendorController));

router.route('/system-info/:id')
  .get(authorize(VENDOR_MANAGEMENT), vendorController.getVendorSystemInfo.bind(vendorController))
  .put(authorize(VENDOR_MANAGEMENT), vendorController.updateVendorSystemInfo.bind(vendorController));

// Vendor Management Routes
router.route('/')
  .get(authorize(VENDOR_MANAGEMENT), vendorController.getAllVendors.bind(vendorController));

router.route('/:id')
  .delete(authorize(VENDOR_MANAGEMENT), vendorController.deleteVendor.bind(vendorController));

// Vendor Status Management
router.patch('/:id/approve', authorize(VENDOR_MANAGEMENT), vendorController.approveVendor.bind(vendorController));
router.patch('/:id/activate', authorize(VENDOR_MANAGEMENT), vendorController.activateVendor.bind(vendorController));
router.patch('/:id/deactivate', authorize(VENDOR_MANAGEMENT), vendorController.deactivateVendor.bind(vendorController));

export default router;