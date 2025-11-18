// routes/vendor.routes.ts
import { Router } from 'express';
import { VendorController } from '../controllers/vendor.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';

const router = Router();
const vendorController = new VendorController();

// Apply authentication to all vendor routes
router.use(authenticate);

// Vendor Dashboard and Overview (Accessible to both Super Admin and Vendor Admin)
router.get('/dashboard', authorize(['super_admin', 'vendor_admin']), vendorController.getVendorDashboard);
router.get('/overview', authorize(['super_admin', 'vendor_admin']), vendorController.getVendorOverview);

// Step 1: Vendor Details Routes
router.post('/details', authorize(['super_admin', 'vendor_admin']), vendorController.createVendorDetails);
router.get('/details/:id', authorize(['super_admin', 'vendor_admin', 'ops_manager']), vendorController.getVendorDetails);
router.put('/details/:id', authorize(['super_admin', 'vendor_admin']), vendorController.updateVendorDetails);

// Step 2: Vendor Financials Routes
router.post('/financials', authorize(['super_admin', 'vendor_admin']), vendorController.createVendorFinancials);
router.get('/financials/:id', authorize(['super_admin', 'vendor_admin', 'finance_manager']), vendorController.getVendorFinancials);
router.put('/financials/:id', authorize(['super_admin', 'vendor_admin']), vendorController.updateVendorFinancials);

// Step 3: Vendor Compliance Routes
router.post('/compliance', authorize(['super_admin', 'vendor_admin']), vendorController.createVendorCompliance);
router.get('/compliance/:id', authorize(['super_admin', 'vendor_admin', 'ops_manager']), vendorController.getVendorCompliance);
router.put('/compliance/:id', authorize(['super_admin', 'vendor_admin']), vendorController.updateVendorCompliance);

// Step 4: Vendor Status Routes
router.post('/status', authorize(['super_admin', 'vendor_admin']), vendorController.createVendorStatus);
router.get('/status/:id', authorize(['super_admin', 'vendor_admin', 'ops_manager']), vendorController.getVendorStatus);
router.put('/status/:id', authorize(['super_admin', 'vendor_admin']), vendorController.updateVendorStatus);

// Step 5: Vendor Document Routes
router.post('/documents', authorize(['super_admin', 'vendor_admin']), vendorController.createVendorDocument);
router.get('/documents/:vendorId', authorize(['super_admin', 'vendor_admin', 'ops_manager']), vendorController.getVendorDocuments);
router.delete('/documents/:id', authorize(['super_admin', 'vendor_admin']), vendorController.deleteVendorDocument);

// Step 6: Vendor Contract Routes
router.post('/contracts', authorize(['super_admin', 'vendor_admin']), vendorController.createVendorContract);
router.get('/contracts/:id', authorize(['super_admin', 'vendor_admin', 'ops_manager']), vendorController.getVendorContract);
router.put('/contracts/:id', authorize(['super_admin', 'vendor_admin']), vendorController.updateVendorContract);

// Step 7: Vendor System Info Routes
router.post('/system-info', authorize(['super_admin', 'vendor_admin']), vendorController.createVendorSystemInfo);
router.get('/system-info/:id', authorize(['super_admin', 'vendor_admin']), vendorController.getVendorSystemInfo);
router.put('/system-info/:id', authorize(['super_admin', 'vendor_admin']), vendorController.updateVendorSystemInfo);

// Vendor Management Routes (Only for Super Admin and Vendor Admin)
router.get('/', authorize(['super_admin', 'vendor_admin']), vendorController.getAllVendors);
router.delete('/:id', authorize(['super_admin', 'vendor_admin']), vendorController.deleteVendor);
router.patch('/:id/approve', authorize(['super_admin', 'vendor_admin']), vendorController.approveVendor);
router.patch('/:id/activate', authorize(['super_admin', 'vendor_admin']), vendorController.activateVendor);
router.patch('/:id/deactivate', authorize(['super_admin', 'vendor_admin']), vendorController.deactivateVendor);

export default router;