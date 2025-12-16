import express, { Request, Response } from 'express';
import { categoryController, catalogueController } from '../controllers/catalogue.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';


const router = express.Router();
const SUPER_ADMIN_ONLY = ['super_admin'];
const VENDOR_MANAGEMENT = ['super_admin', 'vendor_admin'];
// Category routes
router.post('/category', authenticate, authorize(SUPER_ADMIN_ONLY), categoryController.createCategory.bind(categoryController));

// Catalogue routes
router.post('/sku-catalogue', authenticate, authorize(VENDOR_MANAGEMENT), catalogueController.createCatalogue.bind(catalogueController));
// Dashboard routes
router.get('/dashboard', catalogueController.getDashboard.bind(catalogueController));

router.get('/dashboard/filter-options', catalogueController.getFilterOptions.bind(catalogueController));
router.get('/dashboard/export', catalogueController.exportDashboardCSV.bind(catalogueController));

// Category Dashboard Routes
router.get('/categories/dashboard/stats', categoryController.getCategoryDashboardStats.bind(categoryController));


export default router;