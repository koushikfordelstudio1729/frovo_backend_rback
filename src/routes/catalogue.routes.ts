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

router.get('/categories/:id',  authenticate, authorize(SUPER_ADMIN_ONLY),categoryController.getCategoryById.bind(categoryController));
router.put('/categories/:id', authenticate, authorize(SUPER_ADMIN_ONLY), categoryController.updateCategory.bind(categoryController));
router.delete('/categories/:id', authorize(SUPER_ADMIN_ONLY), categoryController.deleteCategory.bind(categoryController));
// Catalogue Dashboard Routes
router.get('/catalogues/:id', catalogueController.getCatalogueById.bind(catalogueController));
router.put('/catalogues/:id', authenticate,authorize(VENDOR_MANAGEMENT), catalogueController.updateCatalogue.bind(catalogueController));
router.delete('/catalogues/:id', authorize(VENDOR_MANAGEMENT), catalogueController.deleteCatalogue.bind(catalogueController));


export default router;