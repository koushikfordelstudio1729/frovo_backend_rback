import { Request, Response } from 'express';
import {
    CatalogueService,
    CategoryService,
    SubCategoryService,
    CreateCatalogueDTO,
    CreateCategoryDTO,
    CreateSubCategoryDTO,
    UpdateCategoryDTO,
    UpdateSubCategoryDTO,
    UpdateCatalogueDTO,
    CategoryFilterDTO,
    SubCategoryFilterDTO,
    DashboardFilterDTO,
    createCategoryService,
    createSubCategoryService,
    createCatalogueService,
    categoryService,
    subCategoryService,
    catalogueService
} from '../services/catalogue.service';
import { Types } from 'mongoose';
import { ImageUploadService } from '../services/catalogueFileUpload.service';

const imageUploadService = new ImageUploadService();

// Base controller class with common functionality
export class BaseController {
    public static getLoggedInUser(req: Request): { _id: Types.ObjectId; roles: any[]; email: string } {
        const user = (req as any).user;

        if (!user || !user._id) {
            throw new Error('User authentication required');
        }

        return {
            _id: user._id,
            roles: user.roles || [],
            email: user.email || ''
        };
    }
}

// ==================== CATALOGUE CONTROLLER ====================
export class CatalogueController extends BaseController {

    async createCatalogue(req: Request, res: Response): Promise<void> {
        const catalogueService = createCatalogueService(req);

        try {
            const { _id: userId, email: userEmail, roles } = CatalogueController.getLoggedInUser(req);
            const userRole = roles[0]?.key || 'unknown';

            // Handle file upload if present
            let productImages: any[] = [];
            const files = req.files as Express.Multer.File[];

            if (files && files.length > 0) {
                const maxImages = parseInt(process.env.MAX_PRODUCT_IMAGES || '10');
                if (files.length > maxImages) {
                    res.status(400).json({
                        success: false,
                        message: `Maximum ${maxImages} images allowed`
                    });
                    return;
                }

                const folder = process.env.CATALOGUE_IMAGE_FOLDER || 'frovo/catalogue_images';
                const uploadPromises = files.map(file =>
                    imageUploadService.uploadToCloudinary(file.buffer, file.originalname, folder)
                        .then(({ url, publicId }) =>
                            imageUploadService.createProductDocumentMetadata(file, url, publicId)
                        )
                );

                productImages = await Promise.all(uploadPromises);
            } else if (req.body.images) {
                productImages = Array.isArray(req.body.images)
                    ? req.body.images
                    : typeof req.body.images === 'string'
                        ? JSON.parse(req.body.images)
                        : [req.body.images].filter(Boolean);
            }

            // Extract data from request
            const productData: CreateCatalogueDTO = {
                sku_id: req.body.sku_id,
                product_name: req.body.product_name,
                brand_name: req.body.brand_name,
                description: req.body.description,
                category: req.body.category, // Category ID
                sub_category: req.body.sub_category, // Sub-category ID
                manufacturer_name: req.body.manufacturer_name,
                manufacturer_address: req.body.manufacturer_address,
                shell_life: req.body.shell_life,
                expiry_alert_threshold: Number(req.body.expiry_alert_threshold),
                tages_label: req.body.tages_label,
                unit_size: req.body.unit_size,
                base_price: Number(req.body.base_price),
                final_price: Number(req.body.final_price),
                barcode: req.body.barcode,
                nutrition_information: req.body.nutrition_information,
                ingredients: req.body.ingredients,
                product_images: productImages,
                status: req.body.status || 'active',
            };

            // Validate input data
            const validation = catalogueService.validateCatalogueData(productData);
            if (!validation.isValid) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors
                });
                return;
            }

            // Create product
            const product = await catalogueService.createCatalogue(productData);

            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: product,
                meta: {
                    createdBy: userEmail,
                    userRole,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error creating product:', error);

            const errorMessages: Record<string, number> = {
                'Product with this SKU already exists': 409,
                'Product with this barcode already exists': 409,
                'Category not found': 404,
                'Sub-category not found': 404,
                'Prices cannot be negative': 400,
                'Final price cannot be less than base price': 400,
                'Expiry alert threshold must be between 1 and 365 days': 400,
                'At least one image is required': 400,
                'Maximum 10 images allowed': 400,
                'User authentication required': 401
            };

            let statusCode = 500;
            let errorMessage = 'Internal server error';

            for (const [pattern, code] of Object.entries(errorMessages)) {
                if (error.message.match(new RegExp(pattern))) {
                    statusCode = code;
                    errorMessage = error.message;
                    break;
                }
            }

            res.status(statusCode).json({
                success: false,
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    async getCatalogueById(req: Request, res: Response): Promise<void> {
        const catalogueService = createCatalogueService(req);

        try {
            const { id } = req.params;
            const product = await catalogueService.getCatalogueById(id);

            if (!product) {
                res.status(404).json({
                    success: false,
                    message: 'Product not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Product retrieved successfully',
                data: product
            });

        } catch (error: any) {
            console.error('Error fetching product:', error);

            const statusCode = error.message.includes('Invalid product ID') ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to fetch product'
            });
        }
    }

    async updateCatalogue(req: Request, res: Response): Promise<void> {
        const catalogueService = createCatalogueService(req);

        try {
            const { id } = req.params;
            const user = CatalogueController.getLoggedInUser(req);

            // Handle file upload if present
            const files = req.files as Express.Multer.File[];
            if (files && files.length > 0) {
                const maxImages = parseInt(process.env.MAX_PRODUCT_IMAGES || '10');
                if (files.length > maxImages) {
                    res.status(400).json({
                        success: false,
                        message: `Maximum ${maxImages} images allowed`
                    });
                    return;
                }

                const folder = process.env.CATALOGUE_IMAGE_FOLDER || 'frovo/catalogue_images';
                const uploadPromises = files.map(file =>
                    imageUploadService.uploadToCloudinary(file.buffer, file.originalname, folder)
                        .then(({ url, publicId }) =>
                            imageUploadService.createProductDocumentMetadata(file, url, publicId)
                        )
                );

                const productImages = await Promise.all(uploadPromises);
                req.body.product_images = productImages;
            }

            // Prepare update data
            const updateData: UpdateCatalogueDTO = { ...req.body };

            // Convert numeric fields
            if (req.body.expiry_alert_threshold !== undefined) {
                updateData.expiry_alert_threshold = Number(req.body.expiry_alert_threshold);
            }
            if (req.body.base_price !== undefined) {
                updateData.base_price = Number(req.body.base_price);
            }
            if (req.body.final_price !== undefined) {
                updateData.final_price = Number(req.body.final_price);
            }

            // Update product
            const updatedProduct = await catalogueService.updateCatalogue(id, updateData);

            res.status(200).json({
                success: true,
                message: 'Product updated successfully',
                data: updatedProduct,
                meta: {
                    updatedBy: user.email,
                    userRole: user.roles[0]?.key || 'unknown',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error updating product:', error);

            let statusCode = 500;
            if (error.message.includes('Invalid product ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to update product'
            });
        }
    }

    async deleteCatalogue(req: Request, res: Response): Promise<void> {
        const catalogueService = createCatalogueService(req);

        try {
            const { id } = req.params;
            const user = CatalogueController.getLoggedInUser(req);

            const result = await catalogueService.deleteCatalogue(id);

            res.status(200).json({
                success: true,
                message: result.message,
                data: result.deletedProduct,
                meta: {
                    deletedBy: user.email,
                    userRole: user.roles[0]?.key || 'unknown',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error deleting product:', error);

            let statusCode = 500;
            if (error.message.includes('Invalid product ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to delete product'
            });
        }
    }

    async getDashboard(req: Request, res: Response): Promise<void> {
        try {
            const filters: DashboardFilterDTO = {
                category: req.query.category as string,
                brand_name: req.query.brand_name as string,
                status: req.query.status as 'active' | 'inactive',
                search: req.query.search as string,
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sort_by: req.query.sort_by as 'product_name' | 'base_price' | 'createdAt' || 'createdAt',
                sort_order: req.query.sort_order as 'asc' | 'desc' || 'desc'
            };

            if (req.query.min_price) {
                filters.min_price = parseFloat(req.query.min_price as string);
            }
            if (req.query.max_price) {
                filters.max_price = parseFloat(req.query.max_price as string);
            }

            if (filters.page! < 1) filters.page = 1;
            if (filters.limit! < 1 || filters.limit! > 100) filters.limit = 10;

            const dashboardData = await catalogueService.getDashboardData(filters);

            res.status(200).json({
                success: true,
                message: 'Dashboard data retrieved successfully',
                data: dashboardData
            });

        } catch (error: any) {
            console.error('Error fetching dashboard data:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard data'
            });
        }
    }

    async getFilterOptions(req: Request, res: Response): Promise<void> {
        try {
            const [brands, categories] = await Promise.all([
                catalogueService.getUniqueBrands(),
                catalogueService.getUniqueCategories()
            ]);

            res.status(200).json({
                success: true,
                message: 'Filter options retrieved successfully',
                data: {
                    brands,
                    categories
                }
            });

        } catch (error: any) {
            console.error('Error fetching filter options:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch filter options'
            });
        }
    }

    async getAllCatalogues(req: Request, res: Response): Promise<void> {
        try {
            const filters: DashboardFilterDTO = {
                category: req.query.category as string,
                brand_name: req.query.brand_name as string,
                status: req.query.status as 'active' | 'inactive',
                search: req.query.search as string,
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
                sort_by: req.query.sort_by as 'product_name' | 'base_price' | 'createdAt' || 'createdAt',
                sort_order: req.query.sort_order as 'asc' | 'desc' || 'desc'
            };

            if (req.query.min_price) {
                filters.min_price = parseFloat(req.query.min_price as string);
            }
            if (req.query.max_price) {
                filters.max_price = parseFloat(req.query.max_price as string);
            }

            if (filters.page! < 1) filters.page = 1;
            if (filters.limit! < 1 || filters.limit! > 100) filters.limit = 10;

            const cataloguesData = await catalogueService.getDashboardData(filters);

            res.status(200).json({
                success: true,
                message: 'Catalogues retrieved successfully',
                data: cataloguesData
            });

        } catch (error: any) {
            console.error('Error fetching all catalogues:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch catalogues'
            });
        }
    }

    async uploadProductImage(req: Request, res: Response): Promise<void> {
        try {
            const files = req.files as Express.Multer.File[];

            if (!files || files.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'No images provided'
                });
                return;
            }

            const folder = process.env.PRODUCT_IMAGE_FOLDER || 'frovo/product_images';
            const uploadedImages = [];

            for (const file of files) {
                const { url, publicId } = await imageUploadService.uploadToCloudinary(
                    file.buffer,
                    file.originalname,
                    folder
                );

                const imageData = imageUploadService.createProductDocumentMetadata(
                    file,
                    url,
                    publicId
                );

                uploadedImages.push(imageData);
            }

            res.status(200).json({
                success: true,
                message: 'Images uploaded successfully',
                data: uploadedImages
            });

        } catch (error: any) {
            console.error('Error uploading product images:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to upload images'
            });
        }
    }

    async deleteProductImage(req: Request, res: Response): Promise<void> {
        try {
            const { publicId } = req.params;

            if (!publicId) {
                res.status(400).json({
                    success: false,
                    message: 'Public ID is required'
                });
                return;
            }

            await imageUploadService.deleteFromCloudinary(publicId);

            res.status(200).json({
                success: true,
                message: 'Image deleted successfully'
            });

        } catch (error: any) {
            console.error('Error deleting image:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to delete image'
            });
        }
    }

    async updateCatalogueStatus(req: Request, res: Response): Promise<void> {
        const catalogueService = createCatalogueService(req);

        try {
            const { id } = req.params;
            const { status } = req.body;
            const user = CatalogueController.getLoggedInUser(req);

            if (!status || !['active', 'inactive'].includes(status)) {
                res.status(400).json({
                    success: false,
                    message: 'Valid status (active/inactive) is required'
                });
                return;
            }

            const updateData: UpdateCatalogueDTO = { status };
            const updatedCatalogue = await catalogueService.updateCatalogue(id, updateData);

            res.status(200).json({
                success: true,
                message: 'Catalogue status updated successfully',
                data: updatedCatalogue,
                meta: {
                    updatedBy: user.email,
                    userRole: user.roles[0]?.key || 'unknown',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error updating catalogue status:', error);

            let statusCode = 500;
            if (error.message.includes('Invalid product ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to update catalogue status'
            });
        }
    }

    async exportDashboardCSV(req: Request, res: Response): Promise<void> {
        try {
            const filters: DashboardFilterDTO = {
                category: req.query.category as string,
                brand_name: req.query.brand_name as string,
                status: req.query.status as 'active' | 'inactive',
                search: req.query.search as string,
                page: 1,
                limit: 10000, // Get all records for export
                sort_by: req.query.sort_by as 'product_name' | 'base_price' | 'createdAt' || 'createdAt',
                sort_order: req.query.sort_order as 'asc' | 'desc' || 'desc'
            };

            if (req.query.min_price) {
                filters.min_price = parseFloat(req.query.min_price as string);
            }
            if (req.query.max_price) {
                filters.max_price = parseFloat(req.query.max_price as string);
            }

            const dashboardData = await catalogueService.getDashboardData(filters);
            const csv = this.convertToCSV(dashboardData.products);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=dashboard-export.csv');
            res.status(200).send(csv);

        } catch (error: any) {
            console.error('Error exporting dashboard CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export dashboard data'
            });
        }
    }

    async exportAllCataloguesCSV(req: Request, res: Response): Promise<void> {
        try {
            // Use getDashboardData with a large limit to get all catalogues
            const filters: DashboardFilterDTO = {
                page: 1,
                limit: 100000 // Large limit to get all records
            };
            const dashboardData = await catalogueService.getDashboardData(filters);
            const csv = this.convertAllCataloguesToCSV(dashboardData.products);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=all-catalogues.csv');
            res.status(200).send(csv);

        } catch (error: any) {
            console.error('Error exporting all catalogues CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export catalogues'
            });
        }
    }

    // ==================== HELPER METHODS ====================

    private convertToCSV(products: any[]): string {
        const headers = [
            'SKU ID',
            'Product Name',
            'Category',
            'Sub Category',
            'Brand',
            'Unit Size',
            'Base Price',
            'Final Price',
            'Status',
            'Created Date'
        ];

        const rows = products.map(product => [
            product.sku_id,
            `"${product.product_name.replace(/"/g, '""')}"`,
            product.category,
            product.sub_category,
            product.brand_name,
            product.unit_size,
            product.base_price,
            product.final_price,
            product.status,
            new Date(product.createdAt).toISOString().split('T')[0]
        ]);

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }

    private convertAllCataloguesToCSV(products: any[]): string {
        const headers = [
            'SKU ID',
            'Product Name',
            'Brand Name',
            'Category',
            'Sub Category',
            'Description',
            'Manufacturer Name',
            'Manufacturer Address',
            'Shell Life',
            'Expiry Alert Threshold (days)',
            'Tags Label',
            'Unit Size',
            'Base Price',
            'Final Price',
            'Barcode',
            'Nutrition Information',
            'Ingredients',
            'Status',
            'Created Date',
            'Updated Date'
        ];

        const rows = products.map(product => {
            return [
                product.sku_id || '',
                `"${(product.product_name || '').replace(/"/g, '""')}"`,
                `"${(product.brand_name || '').replace(/"/g, '""')}"`,
                product.category || '',
                product.sub_category || '',
                `"${(product.description || '').replace(/"/g, '""')}"`,
                `"${(product.manufacturer_name || '').replace(/"/g, '""')}"`,
                `"${(product.manufacturer_address || '').replace(/"/g, '""')}"`,
                product.shell_life || '',
                product.expiry_alert_threshold || 0,
                product.tages_label || '',
                product.unit_size || '',
                product.base_price || 0,
                product.final_price || 0,
                product.barcode || '',
                `"${(product.nutrition_information || '').replace(/"/g, '""')}"`,
                `"${(product.ingredients || '').replace(/"/g, '""')}"`,
                product.status || 'active',
                product.createdAt ? new Date(product.createdAt).toISOString().split('T')[0] : '',
                product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : ''
            ];
        });

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
}

// ==================== CATEGORY CONTROLLER ====================
export class CategoryController extends BaseController {

    async createCategory(req: Request, res: Response): Promise<void> {
        const categoryService = createCategoryService(req);

        try {
            const user = CategoryController.getLoggedInUser(req);

            // Handle file upload if present
            let categoryImageData: any = req.body.category_image || '';
            const files = req.files as Express.Multer.File[];

            if (files && files.length > 0) {
                const folder = process.env.CATEGORY_IMAGE_FOLDER || 'frovo/category_images';
                const { url, publicId } = await imageUploadService.uploadToCloudinary(
                    files[0].buffer,
                    files[0].originalname,
                    folder
                );

                categoryImageData = imageUploadService.createCategoryDocumentMetadata(
                    files[0],
                    url,
                    publicId
                );
            }

            // Extract data from request
            const categoryData: CreateCategoryDTO = {
                category_name: req.body.category_name,
                description: req.body.description,
                category_image: categoryImageData,
                category_status: req.body.category_status || 'active'
            };

            // Create category
            const category = await categoryService.createCategory(categoryData);

            res.status(201).json({
                success: true,
                message: 'Category created successfully',
                data: category,
                meta: {
                    createdBy: user.email,
                    userRole: user.roles[0]?.key || 'unknown',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error creating category:', error);

            let statusCode = 500;
            if (error.message.includes('already exists')) {
                statusCode = 409;
            } else if (error.name === 'ValidationError') {
                statusCode = 400;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to create category'
            });
        }
    }

    async getCategoryById(req: Request, res: Response): Promise<void> {
    const categoryService = createCategoryService(req);
    const subCategoryService = createSubCategoryService(req);

    try {
        const { id } = req.params;
        const category = await categoryService.getCategoryById(id);

        if (!category) {
            res.status(404).json({
                success: false,
                message: 'Category not found'
            });
            return;
        }

        // Get all sub-categories for this category
        const subCategories = await subCategoryService.getSubCategoriesByCategory(id);

        // Get product count for this category
        const productCount = await categoryService.getProductCountByCategory(id);

        // Format the response
        const categoryResponse = {
            id: category._id,
            category_name: category.category_name,
            description: category.description,
            category_status: category.category_status,
            category_image: category.category_image,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
            sub_categories: subCategories.map(subCat => ({
                id: subCat._id,
                sub_category_name: subCat.sub_category_name,
                description: subCat.description,
                sub_category_status: subCat.sub_category_status,
                sub_category_image: subCat.sub_category_image,
                product_count: 0, // You might want to add a method to get product count per sub-category
                createdAt: subCat.createdAt,
                updatedAt: subCat.updatedAt
            })),
            sub_categories_count: subCategories.length,
            product_count: productCount
        };

        res.status(200).json({
            success: true,
            message: 'Category retrieved successfully with sub-categories',
            data: categoryResponse
        });

    } catch (error: any) {
        console.error('Error fetching category:', error);

        const statusCode = error.message.includes('Invalid category ID') ? 400 : 500;
        res.status(statusCode).json({
            success: false,
            message: error.message || 'Failed to fetch category'
        });
    }
}
    async getAllCategories(req: Request, res: Response): Promise<void> {
        const categoryService = createCategoryService(req);

        try {
            const filters: CategoryFilterDTO = {
                status: req.query.status as 'active' | 'inactive',
                category_name: req.query.category_name as string,
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10
            };

            if (filters.page! < 1) filters.page = 1;
            if (filters.limit! < 1 || filters.limit! > 100) filters.limit = 10;

            const result = await categoryService.getAllCategoriesWithFilters(filters);

            res.status(200).json({
                success: true,
                message: 'Categories retrieved successfully',
                data: result
            });

        } catch (error: any) {
            console.error('Error fetching all categories:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch categories'
            });
        }
    }

    async updateCategory(req: Request, res: Response): Promise<void> {
        const categoryService = createCategoryService(req);

        try {
            const { id } = req.params;
            const user = CategoryController.getLoggedInUser(req);

            // Handle file upload if present
            const files = req.files as Express.Multer.File[];
            if (files && files.length > 0) {
                const folder = process.env.CATEGORY_IMAGE_FOLDER || 'frovo/category_images';
                const { url, publicId } = await imageUploadService.uploadToCloudinary(
                    files[0].buffer,
                    files[0].originalname,
                    folder
                );

                const categoryImageData = imageUploadService.createCategoryDocumentMetadata(
                    files[0],
                    url,
                    publicId
                );

                req.body.category_image = categoryImageData;
            }

            // Update category
            const updateData: UpdateCategoryDTO = { ...req.body };
            const updatedCategory = await categoryService.updateCategory(id, updateData);

            res.status(200).json({
                success: true,
                message: 'Category updated successfully',
                data: updatedCategory,
                meta: {
                    updatedBy: user.email,
                    userRole: user.roles[0]?.key || 'unknown',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error updating category:', error);

            let statusCode = 500;
            if (error.message.includes('Invalid category ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to update category'
            });
        }
    }

    async updateCategoryStatus(req: Request, res: Response): Promise<void> {
        const categoryService = createCategoryService(req);

        try {
            const { id } = req.params;
            const { status } = req.body;
            const user = CategoryController.getLoggedInUser(req);

            if (!status || !['active', 'inactive'].includes(status)) {
                res.status(400).json({
                    success: false,
                    message: 'Valid status (active/inactive) is required'
                });
                return;
            }

            const updateData: UpdateCategoryDTO = { category_status: status };
            const updatedCategory = await categoryService.updateCategory(id, updateData);

            res.status(200).json({
                success: true,
                message: 'Category status updated successfully',
                data: updatedCategory,
                meta: {
                    updatedBy: user.email,
                    userRole: user.roles[0]?.key || 'unknown',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error updating category status:', error);

            let statusCode = 500;
            if (error.message.includes('Invalid category ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to update category status'
            });
        }
    }
async activateCategory(req: Request, res: Response): Promise<void> {
    const categoryService = createCategoryService(req);

    try {
        const { id } = req.params;
        const user = CategoryController.getLoggedInUser(req);

        // Set status to active
        const updateData: UpdateCategoryDTO = { category_status: 'active' };
        const updatedCategory = await categoryService.updateCategory(id, updateData);

        res.status(200).json({
            success: true,
            message: 'Category activated successfully',
            data: {
                id: updatedCategory._id,
                category_name: updatedCategory.category_name,
                category_status: updatedCategory.category_status,
                updatedAt: updatedCategory.updatedAt
            },
            meta: {
                updatedBy: user.email,
                userRole: user.roles[0]?.key || 'unknown',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Error activating category:', error);

        let statusCode = 500;
        if (error.message.includes('Invalid category ID')) {
            statusCode = 400;
        } else if (error.message.includes('not found')) {
            statusCode = 404;
        }

        res.status(statusCode).json({
            success: false,
            message: error.message || 'Failed to activate category'
        });
    }
}

async deactivateCategory(req: Request, res: Response): Promise<void> {
    const categoryService = createCategoryService(req);

    try {
        const { id } = req.params;
        const user = CategoryController.getLoggedInUser(req);

        // Set status to inactive
        const updateData: UpdateCategoryDTO = { category_status: 'inactive' };
        const updatedCategory = await categoryService.updateCategory(id, updateData);

        res.status(200).json({
            success: true,
            message: 'Category deactivated successfully',
            data: {
                id: updatedCategory._id,
                category_name: updatedCategory.category_name,
                category_status: updatedCategory.category_status,
                updatedAt: updatedCategory.updatedAt
            },
            meta: {
                updatedBy: user.email,
                userRole: user.roles[0]?.key || 'unknown',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Error deactivating category:', error);

        let statusCode = 500;
        if (error.message.includes('Invalid category ID')) {
            statusCode = 400;
        } else if (error.message.includes('not found')) {
            statusCode = 404;
        }

        res.status(statusCode).json({
            success: false,
            message: error.message || 'Failed to deactivate category'
        });
    }
}
    async deleteCategory(req: Request, res: Response): Promise<void> {
        const categoryService = createCategoryService(req);

        try {
            const { id } = req.params;
            const user = CategoryController.getLoggedInUser(req);

            const result = await categoryService.deleteCategory(id);

            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    deletedCategoryId: id,
                    deletedSubCategories: result.deletedSubCategories,
                    affectedCatalogues: result.affectedCatalogues
                },
                meta: {
                    deletedBy: user.email,
                    userRole: user.roles[0]?.key || 'unknown',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error deleting category:', error);

            let statusCode = 500;
            if (error.message.includes('Invalid category ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('Cannot delete category')) {
                statusCode = 409;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to delete category'
            });
        }
    }

    async getCategoryDashboardStats(req: Request, res: Response): Promise<void> {
        const categoryService = createCategoryService(req);

        try {
            const stats = await categoryService.getCategoryStats();

            res.status(200).json({
                success: true,
                message: 'Category dashboard statistics retrieved successfully',
                data: stats
            });

        } catch (error: any) {
            console.error('Error fetching category dashboard stats:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch category dashboard statistics'
            });
        }
    }

    async uploadCategoryImage(req: Request, res: Response): Promise<void> {
        try {
            const files = req.files as Express.Multer.File[];

            if (!files || files.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'No image provided'
                });
                return;
            }

            const folder = process.env.CATEGORY_IMAGE_FOLDER || 'frovo/category_images';
            const { url, publicId } = await imageUploadService.uploadToCloudinary(
                files[0].buffer,
                files[0].originalname,
                folder
            );

            const imageData = imageUploadService.createCategoryDocumentMetadata(
                files[0],
                url,
                publicId
            );

            res.status(200).json({
                success: true,
                message: 'Category image uploaded successfully',
                data: imageData
            });

        } catch (error: any) {
            console.error('Error uploading category image:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to upload category image'
            });
        }
    }

    async exportAllCategoriesCSV(req: Request, res: Response): Promise<void> {
        const categoryService = createCategoryService(req);

        try {
            // Use getAllCategoriesWithFilters with a large limit to get all categories
            const filters: CategoryFilterDTO = {
                page: 1,
                limit: 100000 // Large limit to get all records
            };
            const result = await categoryService.getAllCategoriesWithFilters(filters);
            const csv = this.convertAllCategoriesToCSV(result.categories);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=all-categories.csv');
            res.status(200).send(csv);

        } catch (error: any) {
            console.error('Error exporting all categories CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export categories'
            });
        }
    }

    private convertAllCategoriesToCSV(categories: any[]): string {
        const headers = [
            'Category ID',
            'Category Name',
            'Description',
            'Status',
            'Image URL',
            'Sub Categories Count',
            'Product Count',
            'Created Date',
            'Updated Date'
        ];

        const rows = categories.map(category => {
            let categoryImage = '';
            if (typeof category.category_image === 'object' && category.category_image !== null) {
                categoryImage = category.category_image.file_url || '';
            } else if (typeof category.category_image === 'string') {
                categoryImage = category.category_image;
            }

            return [
                category.id || '',
                `"${(category.category_name || '').replace(/"/g, '""')}"`,
                `"${(category.description || '').replace(/"/g, '""')}"`,
                category.category_status || 'active',
                categoryImage,
                category.sub_categories_count || 0,
                category.product_count || 0,
                category.createdAt ? new Date(category.createdAt).toISOString().split('T')[0] : '',
                category.updatedAt ? new Date(category.updatedAt).toISOString().split('T')[0] : ''
            ];
        });

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
}

// ==================== SUB-CATEGORY CONTROLLER ====================
export class SubCategoryController extends BaseController {

    async createSubCategory(req: Request, res: Response): Promise<void> {
        const subCategoryService = createSubCategoryService(req);

        try {
            const user = SubCategoryController.getLoggedInUser(req);

            // Handle file upload if present
            let subCategoryImageData: any = req.body.sub_category_image || '';
            const files = req.files as Express.Multer.File[];

            if (files && files.length > 0) {
                const folder = process.env.SUBCATEGORY_IMAGE_FOLDER || 'frovo/subcategory_images';
                const { url, publicId } = await imageUploadService.uploadToCloudinary(
                    files[0].buffer,
                    files[0].originalname,
                    folder
                );

                subCategoryImageData = imageUploadService.createCategoryDocumentMetadata(
                    files[0],
                    url,
                    publicId
                );
            }

            // Extract data from request
            const subCategoryData: CreateSubCategoryDTO = {
                sub_category_name: req.body.sub_category_name,
                description: req.body.description,
                category_id: req.body.category_id,
                sub_category_image: subCategoryImageData,
                sub_category_status: req.body.sub_category_status || 'active'
            };

            // Create sub-category
            const subCategory = await subCategoryService.createSubCategory(subCategoryData);

            res.status(201).json({
                success: true,
                message: 'Sub-category created successfully',
                data: subCategory,
                meta: {
                    createdBy: user.email,
                    userRole: user.roles[0]?.key || 'unknown',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error creating sub-category:', error);

            let statusCode = 500;
            if (error.message.includes('already exists')) {
                statusCode = 409;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.name === 'ValidationError') {
                statusCode = 400;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to create sub-category'
            });
        }
    }

    async getSubCategoryById(req: Request, res: Response): Promise<void> {
        const subCategoryService = createSubCategoryService(req);

        try {
            const { id } = req.params;
            const subCategory = await subCategoryService.getSubCategoryById(id);

            if (!subCategory) {
                res.status(404).json({
                    success: false,
                    message: 'Sub-category not found'
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Sub-category retrieved successfully',
                data: subCategory
            });

        } catch (error: any) {
            console.error('Error fetching sub-category:', error);

            const statusCode = error.message.includes('Invalid sub-category ID') ? 400 : 500;
            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to fetch sub-category'
            });
        }
    }

    async getSubCategoriesByCategory(req: Request, res: Response): Promise<void> {
        const subCategoryService = createSubCategoryService(req);

        try {
            const { categoryId } = req.params;
            const subCategories = await subCategoryService.getSubCategoriesByCategory(categoryId);

            res.status(200).json({
                success: true,
                message: 'Sub-categories retrieved successfully',
                data: subCategories
            });

        } catch (error: any) {
            console.error('Error fetching sub-categories by category:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sub-categories'
            });
        }
    }

    async getAllSubCategories(req: Request, res: Response): Promise<void> {
        const subCategoryService = createSubCategoryService(req);

        try {
            const filters: SubCategoryFilterDTO = {
                status: req.query.status as 'active' | 'inactive',
                category_id: req.query.category_id as string,
                sub_category_name: req.query.sub_category_name as string,
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10
            };

            if (filters.page! < 1) filters.page = 1;
            if (filters.limit! < 1 || filters.limit! > 100) filters.limit = 10;

            const result = await subCategoryService.getAllSubCategoriesWithFilters(filters);

            res.status(200).json({
                success: true,
                message: 'Sub-categories retrieved successfully',
                data: result
            });

        } catch (error: any) {
            console.error('Error fetching all sub-categories:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to fetch sub-categories'
            });
        }
    }

    async updateSubCategory(req: Request, res: Response): Promise<void> {
        const subCategoryService = createSubCategoryService(req);

        try {
            const { id } = req.params;
            const user = SubCategoryController.getLoggedInUser(req);

            // Handle file upload if present
            const files = req.files as Express.Multer.File[];
            if (files && files.length > 0) {
                const folder = process.env.SUBCATEGORY_IMAGE_FOLDER || 'frovo/subcategory_images';
                const { url, publicId } = await imageUploadService.uploadToCloudinary(
                    files[0].buffer,
                    files[0].originalname,
                    folder
                );

                const subCategoryImageData = imageUploadService.createCategoryDocumentMetadata(
                    files[0],
                    url,
                    publicId
                );

                req.body.sub_category_image = subCategoryImageData;
            }

            // Update sub-category
            const updateData: UpdateSubCategoryDTO = { ...req.body };
            const updatedSubCategory = await subCategoryService.updateSubCategory(id, updateData);

            res.status(200).json({
                success: true,
                message: 'Sub-category updated successfully',
                data: updatedSubCategory,
                meta: {
                    updatedBy: user.email,
                    userRole: user.roles[0]?.key || 'unknown',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error updating sub-category:', error);

            let statusCode = 500;
            if (error.message.includes('Invalid sub-category ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to update sub-category'
            });
        }
    }

    async updateSubCategoryStatus(req: Request, res: Response): Promise<void> {
        const subCategoryService = createSubCategoryService(req);

        try {
            const { id } = req.params;
            const { status } = req.body;
            const user = SubCategoryController.getLoggedInUser(req);

            if (!status || !['active', 'inactive'].includes(status)) {
                res.status(400).json({
                    success: false,
                    message: 'Valid status (active/inactive) is required'
                });
                return;
            }

            const updateData: UpdateSubCategoryDTO = { sub_category_status: status };
            const updatedSubCategory = await subCategoryService.updateSubCategory(id, updateData);

            res.status(200).json({
                success: true,
                message: 'Sub-category status updated successfully',
                data: {
                    id: updatedSubCategory._id,
                    sub_category_name: updatedSubCategory.sub_category_name,
                    sub_category_status: updatedSubCategory.sub_category_status,
                    updatedAt: updatedSubCategory.updatedAt
                },
                meta: {
                    updatedBy: user.email,
                    userRole: user.roles[0]?.key || 'unknown',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error updating sub-category status:', error);

            let statusCode = 500;
            if (error.message.includes('Invalid sub-category ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to update sub-category status'
            });
        }
    }
    async activateSubCategory(req: Request, res: Response): Promise<void> {
    const subCategoryService = createSubCategoryService(req);

    try {
        const { id } = req.params;
        const user = SubCategoryController.getLoggedInUser(req);

        // Set status to active
        const updateData: UpdateSubCategoryDTO = { sub_category_status: 'active' };
        const updatedSubCategory = await subCategoryService.updateSubCategory(id, updateData);

        res.status(200).json({
            success: true,
            message: 'Sub-category activated successfully',
            data: {
                id: updatedSubCategory._id,
                sub_category_name: updatedSubCategory.sub_category_name,
                sub_category_status: updatedSubCategory.sub_category_status,
                updatedAt: updatedSubCategory.updatedAt
            },
            meta: {
                updatedBy: user.email,
                userRole: user.roles[0]?.key || 'unknown',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Error activating sub-category:', error);

        let statusCode = 500;
        if (error.message.includes('Invalid sub-category ID')) {
            statusCode = 400;
        } else if (error.message.includes('not found')) {
            statusCode = 404;
        }

        res.status(statusCode).json({
            success: false,
            message: error.message || 'Failed to activate sub-category'
        });
    }
}

async deactivateSubCategory(req: Request, res: Response): Promise<void> {
    const subCategoryService = createSubCategoryService(req);

    try {
        const { id } = req.params;
        const user = SubCategoryController.getLoggedInUser(req);

        // Set status to inactive
        const updateData: UpdateSubCategoryDTO = { sub_category_status: 'inactive' };
        const updatedSubCategory = await subCategoryService.updateSubCategory(id, updateData);

        res.status(200).json({
            success: true,
            message: 'Sub-category deactivated successfully',
            data: {
                id: updatedSubCategory._id,
                sub_category_name: updatedSubCategory.sub_category_name,
                sub_category_status: updatedSubCategory.sub_category_status,
                updatedAt: updatedSubCategory.updatedAt
            },
            meta: {
                updatedBy: user.email,
                userRole: user.roles[0]?.key || 'unknown',
                timestamp: new Date().toISOString()
            }
        });

    } catch (error: any) {
        console.error('Error deactivating sub-category:', error);

        let statusCode = 500;
        if (error.message.includes('Invalid sub-category ID')) {
            statusCode = 400;
        } else if (error.message.includes('not found')) {
            statusCode = 404;
        }

        res.status(statusCode).json({
            success: false,
            message: error.message || 'Failed to deactivate sub-category'
        });
    }
}

    async deleteSubCategory(req: Request, res: Response): Promise<void> {
        const subCategoryService = createSubCategoryService(req);

        try {
            const { id } = req.params;
            const user = SubCategoryController.getLoggedInUser(req);

            const result = await subCategoryService.deleteSubCategory(id);

            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    deletedSubCategoryId: id,
                    affectedCatalogues: result.affectedCatalogues
                },
                meta: {
                    deletedBy: user.email,
                    userRole: user.roles[0]?.key || 'unknown',
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error deleting sub-category:', error);

            let statusCode = 500;
            if (error.message.includes('Invalid sub-category ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('Cannot delete sub-category')) {
                statusCode = 409;
            }

            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to delete sub-category'
            });
        }
    }

    async uploadSubCategoryImage(req: Request, res: Response): Promise<void> {
        try {
            const files = req.files as Express.Multer.File[];

            if (!files || files.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'No image provided'
                });
                return;
            }

            const folder = process.env.SUBCATEGORY_IMAGE_FOLDER || 'frovo/subcategory_images';
            const { url, publicId } = await imageUploadService.uploadToCloudinary(
                files[0].buffer,
                files[0].originalname,
                folder
            );

            const imageData = imageUploadService.createCategoryDocumentMetadata(
                files[0],
                url,
                publicId
            );

            res.status(200).json({
                success: true,
                message: 'Sub-category image uploaded successfully',
                data: imageData
            });

        } catch (error: any) {
            console.error('Error uploading sub-category image:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Failed to upload sub-category image'
            });
        }
    }

    async exportAllSubCategoriesCSV(req: Request, res: Response): Promise<void> {
        const subCategoryService = createSubCategoryService(req);

        try {
            const filters: SubCategoryFilterDTO = {
                status: req.query.status as 'active' | 'inactive',
                category_id: req.query.category_id as string,
                sub_category_name: req.query.sub_category_name as string,
                page: 1,
                limit: 100000
            };

            const result = await subCategoryService.getAllSubCategoriesWithFilters(filters);
            const csv = this.convertAllSubCategoriesToCSV(result.sub_categories);

            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=all-subcategories.csv');
            res.status(200).send(csv);

        } catch (error: any) {
            console.error('Error exporting all sub-categories CSV:', error);
            res.status(500).json({
                success: false,
                message: 'Failed to export sub-categories'
            });
        }
    }

    private convertAllSubCategoriesToCSV(subCategories: any[]): string {
        const headers = [
            'Sub-Category ID',
            'Sub-Category Name',
            'Description',
            'Category ID',
            'Category Name',
            'Status',
            'Image URL',
            'Product Count',
            'Created Date',
            'Updated Date'
        ];

        const rows = subCategories.map(subCategory => {
            let subCategoryImage = '';
            if (typeof subCategory.sub_category_image === 'object' && subCategory.sub_category_image !== null) {
                subCategoryImage = subCategory.sub_category_image.file_url || '';
            } else if (typeof subCategory.sub_category_image === 'string') {
                subCategoryImage = subCategory.sub_category_image;
            }

            return [
                subCategory.id || '',
                `"${(subCategory.sub_category_name || '').replace(/"/g, '""')}"`,
                `"${(subCategory.description || '').replace(/"/g, '""')}"`,
                subCategory.category_id || '',
                `"${(subCategory.category_name || '').replace(/"/g, '""')}"`,
                subCategory.sub_category_status || 'active',
                subCategoryImage,
                subCategory.product_count || 0,
                subCategory.createdAt ? new Date(subCategory.createdAt).toISOString().split('T')[0] : '',
                subCategory.updatedAt ? new Date(subCategory.updatedAt).toISOString().split('T')[0] : ''
            ];
        });

        return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
}

// Export controller instances
export const catalogueController = new CatalogueController();
export const categoryController = new CategoryController();
export const subCategoryController = new SubCategoryController();