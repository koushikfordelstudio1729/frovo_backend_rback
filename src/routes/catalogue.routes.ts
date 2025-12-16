import express, { Request, Response } from 'express';
import { categoryController, catalogueController } from '../controllers/catalogue.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
import { CategoryModel } from '../models/Catalogue.model';

const router = express.Router();
const SUPER_ADMIN_ONLY = ['super_admin'];
const VENDOR_MANAGEMENT = ['super_admin', 'vendor_admin'];
// Category routes
router.post('/category', authenticate, authorize(SUPER_ADMIN_ONLY), categoryController.createCategory.bind(categoryController));

// Catalogue routes
router.post('/sku-catalogue', authenticate, authorize(VENDOR_MANAGEMENT), catalogueController.createCatalogue.bind(catalogueController));
// In your routes
router.get('/categories/debug', async (_req: Request, res: Response) => {
    try {
        const categories = await CategoryModel.find({});
        res.json({
            success: true,
            count: categories.length,
            categories: categories.map(cat => ({
                id: cat._id,
                category_name: cat.category_name,
                sub_details: cat.sub_details,
                createdAt: cat.createdAt,
                updatedAt: cat.updatedAt
            }))
        });
    } catch (error: any) {
        res.status(500).json({
            success: false,
            message: error.message
        });
    }
});

export default router;