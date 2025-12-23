import express from 'express';
import { categoryController, catalogueController } from '../controllers/catalogue.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { uploadMultiple } from '../middleware/upload.middleware';


const router = express.Router();
const SUPER_ADMIN_ONLY = ['super_admin'];
const MANAGEMENT = ['super_admin', 'admin', 'ops_manager', ''];
// Category routes
router.post('/category', authenticate, authorize(MANAGEMENT), uploadMultiple, categoryController.createCategory.bind(categoryController));
router.get('/categories', authenticate, authorize(MANAGEMENT), categoryController.getAllCategories.bind(categoryController));
router.post('/categories/upload-image', authenticate, authorize(MANAGEMENT), uploadMultiple, categoryController.uploadCategoryImage.bind(categoryController));

// Catalogue routes
router.post('/sku-catalogue', authenticate, authorize(MANAGEMENT), uploadMultiple, catalogueController.createCatalogue.bind(catalogueController));
router.get('/catalogues', authenticate, authorize(MANAGEMENT), catalogueController.getAllCatalogues.bind(catalogueController));
router.post('/catalogues/upload-images', authenticate, authorize(MANAGEMENT), uploadMultiple, catalogueController.uploadProductImage.bind(catalogueController));
router.delete('/images/:publicId', authenticate, authorize(MANAGEMENT), catalogueController.deleteProductImage.bind(catalogueController));

// Dashboard routes
router.get('/dashboard', authenticate, authorize(MANAGEMENT), catalogueController.getDashboard.bind(catalogueController));

router.get('/dashboard/filter-options', authenticate, authorize(MANAGEMENT), catalogueController.getFilterOptions.bind(catalogueController));
router.get('/dashboard/export', authenticate, authorize(MANAGEMENT), catalogueController.exportDashboardCSV.bind(catalogueController));

// Category Dashboard Routes
router.get('/categories/dashboard/stats', categoryController.getCategoryDashboardStats.bind(categoryController));

router.get('/categories/:id', authenticate, authorize(MANAGEMENT), categoryController.getCategoryById.bind(categoryController));
router.put('/categories/:id', authenticate, authorize(MANAGEMENT), uploadMultiple, categoryController.updateCategory.bind(categoryController));
router.patch('/categories/:id/status', authenticate, authorize(MANAGEMENT), categoryController.updateCategoryStatus.bind(categoryController));
router.delete('/categories/:id', authenticate, authorize(MANAGEMENT), categoryController.deleteCategory.bind(categoryController));
// Catalogue Dashboard Routes
router.get('/catalogues/:id', catalogueController.getCatalogueById.bind(catalogueController));
router.put('/catalogues/:id', authenticate, authorize(MANAGEMENT), uploadMultiple, catalogueController.updateCatalogue.bind(catalogueController));
router.patch('/catalogues/:id/status', authenticate, authorize(MANAGEMENT), catalogueController.updateCatalogueStatus.bind(catalogueController));
router.delete('/catalogues/:id', authorize(MANAGEMENT), catalogueController.deleteCatalogue.bind(catalogueController));


export default router;