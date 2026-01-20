import express from "express";
import {
  catalogueController,
  categoryController,
  subCategoryController,
} from "../controllers/catalogue.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";
import { uploadMultiple, uploadSingle } from "../middleware/upload.middleware";

const router = express.Router();
const SUPER_ADMIN_ONLY = ["super_admin"];
const MANAGEMENT = ["super_admin", "admin", "ops_manager"];

// ==================== CATEGORY ROUTES ====================
router.post(
  "/categories",
  authenticate,
  authorize(MANAGEMENT),
  uploadMultiple,
  categoryController.createCategory.bind(categoryController)
);

router.get(
  "/categories",
  authenticate,
  authorize(MANAGEMENT),
  categoryController.getAllCategories.bind(categoryController)
);

router.post(
  "/categories/upload-image",
  authenticate,
  authorize(MANAGEMENT),
  uploadMultiple,
  categoryController.uploadCategoryImage.bind(categoryController)
);

router.get(
  "/categories/dashboard/stats",
  authenticate,
  authorize(MANAGEMENT),
  categoryController.getCategoryDashboardStats.bind(categoryController)
);

router.get(
  "/categories/:id",
  authenticate,
  authorize(MANAGEMENT),
  categoryController.getCategoryById.bind(categoryController)
);

router.put(
  "/categories/:id",
  authenticate,
  authorize(MANAGEMENT),
  uploadMultiple,
  categoryController.updateCategory.bind(categoryController)
);

router.patch(
  "/categories/:id/status",
  authenticate,
  authorize(MANAGEMENT),
  categoryController.updateCategoryStatus.bind(categoryController)
);

router.delete(
  "/categories/:id",
  authenticate,
  authorize(MANAGEMENT),
  categoryController.deleteCategory.bind(categoryController)
);

router.get(
  "/export/category/csv",
  authenticate,
  authorize(MANAGEMENT),
  categoryController.exportAllCategoriesCSV.bind(categoryController)
);
// Add this route in your routes file
router.get(
  "/export/category/csv/:id",
  authenticate,
  authorize(MANAGEMENT),
  categoryController.exportCategoryWithSubCategoriesCSV.bind(categoryController)
);
// ==================== SUB-CATEGORY ROUTES ====================
// Create a new sub-category under a category
router.post(
  "/sub-categories",
  authenticate,
  authorize(MANAGEMENT),
  uploadMultiple,
  subCategoryController.createSubCategory.bind(subCategoryController)
);

// Get all sub-categories (with optional filters)
router.get(
  "/sub-categories",
  authenticate,
  authorize(MANAGEMENT),
  subCategoryController.getAllSubCategories.bind(subCategoryController)
);

// Get sub-categories by category ID
router.get(
  "/categories/:categoryId/sub-categories",
  authenticate,
  authorize(MANAGEMENT),
  subCategoryController.getSubCategoriesByCategory.bind(subCategoryController)
);

// Get a specific sub-category by ID
router.get(
  "/sub-categories/:id",
  authenticate,
  authorize(MANAGEMENT),
  subCategoryController.getSubCategoryById.bind(subCategoryController)
);

// Update a sub-category
router.put(
  "/sub-categories/:id",
  authenticate,
  authorize(MANAGEMENT),
  uploadMultiple,
  subCategoryController.updateSubCategory.bind(subCategoryController)
);

// Update sub-category status only
router.patch(
  "/sub-categories/:id/status",
  authenticate,
  authorize(MANAGEMENT),
  subCategoryController.updateSubCategoryStatus.bind(subCategoryController)
);

// Delete a sub-category
router.delete(
  "/sub-categories/:id",
  authenticate,
  authorize(MANAGEMENT),
  subCategoryController.deleteSubCategory.bind(subCategoryController)
);

// Upload sub-category image
router.post(
  "/sub-categories/upload-image",
  authenticate,
  authorize(MANAGEMENT),
  uploadMultiple,
  subCategoryController.uploadSubCategoryImage.bind(subCategoryController)
);

// Export sub-categories to CSV
router.get(
  "/export/sub-category/csv",
  authenticate,
  authorize(MANAGEMENT),
  subCategoryController.exportAllSubCategoriesCSV.bind(subCategoryController)
);

// ==================== CATALOGUE ROUTES ====================
router.post(
  "/sku-catalogues",
  authenticate,
  authorize(MANAGEMENT),
  uploadMultiple,
  catalogueController.createCatalogue.bind(catalogueController)
);

router.get(
  "/sku-catalogues",
  authenticate,
  authorize(MANAGEMENT),
  catalogueController.getAllCatalogues.bind(catalogueController)
);

router.post(
  "/sku-catalogues/upload-images",
  authenticate,
  authorize(MANAGEMENT),
  uploadMultiple,
  catalogueController.uploadProductImage.bind(catalogueController)
);

router.delete(
  "/images/:publicId",
  authenticate,
  authorize(MANAGEMENT),
  catalogueController.deleteProductImage.bind(catalogueController)
);

// ==================== DASHBOARD ROUTES ====================
router.get(
  "/dashboard",
  authenticate,
  authorize(MANAGEMENT),
  catalogueController.getDashboard.bind(catalogueController)
);

router.get(
  "/dashboard/filter-options",
  authenticate,
  authorize(MANAGEMENT),
  catalogueController.getFilterOptions.bind(catalogueController)
);

router.get(
  "/dashboard/export",
  authenticate,
  authorize(MANAGEMENT),
  catalogueController.exportDashboardCSV.bind(catalogueController)
);

// ==================== CATALOGUE DETAIL ROUTES ====================
router.get(
  "/sku-catalogues/:id",
  authenticate,
  authorize(MANAGEMENT),
  catalogueController.getCatalogueById.bind(catalogueController)
);

router.put(
  "/sku-catalogues/:id",
  authenticate,
  authorize(MANAGEMENT),
  uploadMultiple,
  catalogueController.updateCatalogue.bind(catalogueController)
);

// Payload-based status update
router.patch(
  "/sku-catalogues/:id/status",
  authenticate,
  authorize(MANAGEMENT),
  catalogueController.updateCatalogueStatus.bind(catalogueController)
);

router.delete(
  "/sku-catalogues/:id",
  authenticate,
  authorize(MANAGEMENT),
  catalogueController.deleteCatalogue.bind(catalogueController)
);

// ==================== EXPORT ROUTES ====================
router.get(
  "/export/sku/csv",
  authenticate,
  authorize(MANAGEMENT),
  catalogueController.exportAllCataloguesCSV.bind(catalogueController)
);

export default router;
