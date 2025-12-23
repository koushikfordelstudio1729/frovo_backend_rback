import { Request, Response } from 'express';
import {
    catalogueService,
    CategoryFilterDTO,
    categoryService,
    CreateCatalogueDTO,
    createCatalogueService,
    CreateCategoryDTO,
    createCategoryService,
    DashboardFilterDTO
} from '../services/catalogue.service';
import { Types } from 'mongoose';
import { ImageUploadService } from '../services/catalogueFileUpload.service';

const imageUploadService = new ImageUploadService();

export class CatalogueController {
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

    /**
     * Get catalogue product by ID
     */
    async getCatalogueById(req: Request, res: Response): Promise<void> {
        // Create service with request context
        const catalogueService = createCatalogueService(req);
        
        try {
            const { id } = req.params;
            console.log(`Fetching catalogue product with ID: ${id}`);

            // Extract user info for audit
            let userId = 'unknown';
            let userEmail = 'unknown';
            let userRole = 'unknown';
            
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (authError) {
                // User not authenticated - continue anyway for GET requests
                console.log('Request without authentication');
            }

            const product = await catalogueService.getCatalogueById(id);

            if (!product) {
                res.status(404).json({
                    success: false,
                    message: 'Product not found',
                    requestedId: id,
                    requestedBy: {
                        userId,
                        userEmail,
                        userRole
                    }
                });
                return;
            }

            res.status(200).json({
                success: true,
                message: 'Product retrieved successfully',
                data: {
                    id: product._id,
                    sku_id: product.sku_id,
                    product_name: product.product_name,
                    brand_name: product.brand_name,
                    description: product.description,
                    category: product.category,
                    sub_category: product.sub_category,
                    manufacturer_name: product.manufacturer_name,
                    manufacturer_address: product.manufacturer_address,
                    shell_life: product.shell_life,
                    expiry_alert_threshold: product.expiry_alert_threshold,
                    tages_label: product.tages_label,
                    unit_size: product.unit_size,
                    base_price: product.base_price,
                    final_price: product.final_price,
                    barcode: product.barcode,
                    nutrition_information: product.nutrition_information,
                    ingredients: product.ingredients,
                    product_images: product.product_images,
                    status: product.status,
                    createdAt: product.createdAt,
                    updatedAt: product.updatedAt
                }
            });

        } catch (error: any) {
            console.error('Error fetching product:', error);

            // Extract user info for error logging
            let userId = 'unknown';
            let userEmail = 'unknown';
            let userRole = 'unknown';
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (userError) {
                // User not authenticated
            }

            const statusCode = error.message.includes('Invalid product ID') ? 400 : 500;

            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to fetch product',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                requestedBy: { userId, userEmail, userRole }
            });
        }
    }

    /**
     * Update catalogue product by ID
     */
    async updateCatalogue(req: Request, res: Response): Promise<void> {
        // Create service with request context
        const catalogueService = createCatalogueService(req);
        
        try {
            const { id } = req.params;
            console.log(`Updating catalogue product ${id} with data:`, req.body);

            // Extract user info for audit - REQUIRED for update operations
            let userId: string;
            let userEmail: string;
            let userRole: string;
            
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (authError) {
                // Authentication is required for update operations
                res.status(401).json({
                    success: false,
                    message: 'Authentication required for update operations',
                    error: 'User authentication required'
                });
                return;
            }

            // Handle file upload if present (for updating images)
            const files = req.files as Express.Multer.File[];
            if (files && files.length > 0) {
                console.log(`Uploading ${files.length} new product image(s) to Cloudinary`);

                // Validate max images
                const maxImages = parseInt(process.env.MAX_PRODUCT_IMAGES || '10');
                if (files.length > maxImages) {
                    res.status(400).json({
                        success: false,
                        message: `Maximum ${maxImages} images allowed`,
                        uploadedBy: { userId, userEmail, userRole }
                    });
                    return;
                }

                // Upload all images to Cloudinary with metadata
                const folder = process.env.CATALOGUE_IMAGE_FOLDER || 'frovo/catalogue_images';
                const uploadPromises = files.map(file =>
                    imageUploadService.uploadToCloudinary(file.buffer, file.originalname, folder)
                        .then(({ url, publicId }) =>
                            imageUploadService.createProductDocumentMetadata(file, url, publicId)
                        )
                );

                const productImages = await Promise.all(uploadPromises);

                // Set new images (replaces existing)
                req.body.product_images = productImages;
                console.log('New product images uploaded with metadata:', productImages);
            }

            // Prepare update data from request body
            const updateData: Partial<CreateCatalogueDTO> = {};

            // Only include fields that are actually provided in the request
            if (req.body.sku_id !== undefined) updateData.sku_id = req.body.sku_id;
            if (req.body.product_name !== undefined) updateData.product_name = req.body.product_name;
            if (req.body.brand_name !== undefined) updateData.brand_name = req.body.brand_name;
            if (req.body.description !== undefined) updateData.description = req.body.description;
            if (req.body.category_id !== undefined) updateData.category_id = req.body.category_id; // Changed from category to category_id
            if (req.body.sub_category !== undefined) updateData.sub_category = req.body.sub_category;
            if (req.body.manufacturer_name !== undefined) updateData.manufacturer_name = req.body.manufacturer_name;
            if (req.body.manufacturer_address !== undefined) updateData.manufacturer_address = req.body.manufacturer_address;
            if (req.body.shell_life !== undefined) updateData.shell_life = req.body.shell_life;
            if (req.body.expiry_alert_threshold !== undefined) {
                updateData.expiry_alert_threshold = Number(req.body.expiry_alert_threshold);
            }
            if (req.body.tages_label !== undefined) updateData.tages_label = req.body.tages_label;
            if (req.body.unit_size !== undefined) updateData.unit_size = req.body.unit_size;
            if (req.body.base_price !== undefined) updateData.base_price = Number(req.body.base_price);
            if (req.body.final_price !== undefined) updateData.final_price = Number(req.body.final_price);
            if (req.body.barcode !== undefined) updateData.barcode = req.body.barcode;
            if (req.body.nutrition_information !== undefined) updateData.nutrition_information = req.body.nutrition_information;
            if (req.body.ingredients !== undefined) updateData.ingredients = req.body.ingredients;
            if (req.body.status !== undefined) updateData.status = req.body.status;

            if (req.body.product_images !== undefined) {
                updateData.product_images = Array.isArray(req.body.product_images)
                    ? req.body.product_images
                    : [req.body.product_images].filter(Boolean);
            }

            // Validate if there's anything to update
            if (Object.keys(updateData).length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'No update data provided',
                    updatedBy: {
                        userId,
                        userEmail,
                        userRole
                    }
                });
                return;
            }

            // Update product
            const updatedProduct = await catalogueService.updateCatalogue(id, updateData);

            res.status(200).json({
                success: true,
                message: 'Product updated successfully',
                data: {
                    id: updatedProduct._id,
                    sku_id: updatedProduct.sku_id,
                    product_name: updatedProduct.product_name,
                    brand_name: updatedProduct.brand_name,
                    description: updatedProduct.description,
                    category: updatedProduct.category,
                    sub_category: updatedProduct.sub_category,
                    manufacturer_name: updatedProduct.manufacturer_name,
                    manufacturer_address: updatedProduct.manufacturer_address,
                    shell_life: updatedProduct.shell_life,
                    expiry_alert_threshold: updatedProduct.expiry_alert_threshold,
                    tages_label: updatedProduct.tages_label,
                    unit_size: updatedProduct.unit_size,
                    base_price: updatedProduct.base_price,
                    final_price: updatedProduct.final_price,
                    barcode: updatedProduct.barcode,
                    nutrition_information: updatedProduct.nutrition_information,
                    ingredients: updatedProduct.ingredients,
                    product_images: updatedProduct.product_images,
                    status: updatedProduct.status,
                    updatedAt: updatedProduct.updatedAt
                },
                meta: {
                    updatedBy: userEmail,
                    userRole,
                    timestamp: new Date().toISOString(),
                    fieldsUpdated: Object.keys(updateData)
                }
            });

        } catch (error: any) {
            console.error('Error updating product:', error);

            // Extract user info for error logging
            let userId = 'unknown';
            let userEmail = 'unknown';
            let userRole = 'unknown';
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (userError) {
                // User not authenticated
            }

            // Handle specific error cases
            let statusCode = 500;
            let errorMessage = error.message || 'Failed to update product';

            if (error.message.includes('Invalid product ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            } else if (error.message.includes('cannot be negative') || 
                       error.message.includes('cannot be less than') ||
                       error.message.includes('must be between') ||
                       error.message.includes('At least one image') ||
                       error.message.includes('Maximum 10 images')) {
                statusCode = 400;
            } else if (error.name === 'ValidationError') {
                statusCode = 400;
            }

            res.status(statusCode).json({
                success: false,
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                updatedBy: { userId, userEmail, userRole }
            });
        }
    }

    /**
     * Update catalogue product status only
     */
    async updateCatalogueStatus(req: Request, res: Response): Promise<void> {
        // Create service with request context
        const catalogueService = createCatalogueService(req);

        try {
            const { id } = req.params;
            const { status } = req.body;

            console.log(`Updating catalogue product ${id} status to: ${status}`);

            // Extract user info for audit - REQUIRED for update operations
            let userId: string;
            let userEmail: string;
            let userRole: string;

            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (authError) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required for update operations',
                    error: 'User authentication required'
                });
                return;
            }

            // Validate status value
            if (!status || !['active', 'inactive'].includes(status)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid status value. Must be "active" or "inactive"',
                    updatedBy: { userId, userEmail, userRole }
                });
                return;
            }

            // Update only the status
            const updateData = { status };
            const updatedProduct = await catalogueService.updateCatalogue(id, updateData);

            res.status(200).json({
                success: true,
                message: 'Product status updated successfully',
                data: {
                    id: updatedProduct._id,
                    sku_id: updatedProduct.sku_id,
                    product_name: updatedProduct.product_name,
                    status: updatedProduct.status,
                    updatedAt: updatedProduct.updatedAt
                },
                meta: {
                    updatedBy: userEmail,
                    userRole,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error updating product status:', error);

            // Extract user info for error logging
            let userId = 'unknown';
            let userEmail = 'unknown';
            let userRole = 'unknown';
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (userError) {
                // User not authenticated
            }

            let statusCode = 500;
            let errorMessage = error.message || 'Failed to update product status';

            if (error.message.includes('Invalid product ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            }

            res.status(statusCode).json({
                success: false,
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                updatedBy: { userId, userEmail, userRole }
            });
        }
    }

    /**
     * Delete catalogue product by ID
     */
    async deleteCatalogue(req: Request, res: Response): Promise<void> {
        // Create service with request context
        const catalogueService = createCatalogueService(req);
        
        try {
            const { id } = req.params;
            console.log(`Deleting catalogue product ${id}`);

            // Extract user info for audit - REQUIRED for delete operations
            let userId: string;
            let userEmail: string;
            let userRole: string;
            
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (authError) {
                // Authentication is required for delete operations
                res.status(401).json({
                    success: false,
                    message: 'Authentication required for delete operations',
                    error: 'User authentication required'
                });
                return;
            }

            const result = await catalogueService.deleteCatalogue(id);

            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    deletedProductId: id,
                    deletedProduct: result.deletedProduct
                },
                meta: {
                    deletedBy: userEmail,
                    userRole,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error deleting product:', error);

            // Extract user info for error logging
            let userId = 'unknown';
            let userEmail = 'unknown';
            let userRole = 'unknown';
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (userError) {
                // User not authenticated
            }

            // Handle specific error cases
            let statusCode = 500;
            let errorMessage = error.message || 'Failed to delete product';

            if (error.message.includes('Invalid product ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            }

            res.status(statusCode).json({
                success: false,
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                requestedBy: { userId, userEmail, userRole }
            });
        }
    }

    /**
     * Get dashboard data with filtering
     */
    async getDashboard(req: Request, res: Response): Promise<void> {
        try {
            console.log('Fetching dashboard data with filters:', req.query);

            // Parse query parameters
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

            // Parse price filters
            if (req.query.min_price) {
                filters.min_price = parseFloat(req.query.min_price as string);
            }
            if (req.query.max_price) {
                filters.max_price = parseFloat(req.query.max_price as string);
            }

            // Validate pagination
            if (filters.page! < 1) filters.page = 1;
            if (filters.limit! < 1 || filters.limit! > 100) filters.limit = 10;

            // Get dashboard data
            const dashboardData = await catalogueService.getDashboardData(filters);

            // Send response
            res.status(200).json({
                success: true,
                message: 'Dashboard data retrieved successfully',
                data: dashboardData
            });

        } catch (error: any) {
            console.error('Error fetching dashboard data:', error);
            
            res.status(500).json({
                success: false,
                message: 'Failed to fetch dashboard data',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    
    /**
     * Get filter options (brands and categories)
     */
    async getFilterOptions(req: Request, res: Response): Promise<void> {
        try {
            console.log('Fetching filter options');

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
                message: 'Failed to fetch filter options',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Export dashboard data to CSV
     */
    async exportDashboardCSV(req: Request, res: Response): Promise<void> {
        try {
            console.log('Exporting dashboard data to CSV');

            // Get all data without pagination for export
            const filters: DashboardFilterDTO = {
                category: req.query.category as string,
                brand_name: req.query.brand_name as string,
                status: req.query.status as 'active' | 'inactive',
                search: req.query.search as string,
                sort_by: req.query.sort_by as 'product_name' | 'base_price' | 'createdAt' || 'createdAt',
                sort_order: req.query.sort_order as 'asc' | 'desc' || 'desc'
            };

            // Parse price filters
            if (req.query.min_price) {
                filters.min_price = parseFloat(req.query.min_price as string);
            }
            if (req.query.max_price) {
                filters.max_price = parseFloat(req.query.max_price as string);
            }

            // Get all data
            const dashboardData = await catalogueService.getDashboardData({
                ...filters,
                page: 1,
                limit: 10000 // Large limit to get all data
            });

            // Convert to CSV
            const csvData = this.convertToCSV(dashboardData.products);

            // Set headers for CSV download
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', 'attachment; filename=catalogue-dashboard.csv');
            res.status(200).send(csvData);

        } catch (error: any) {
            console.error('Error exporting dashboard data:', error);
            
            res.status(500).json({
                success: false,
                message: 'Failed to export dashboard data',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Convert dashboard data to CSV format
     */
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

        const csvContent = [
            headers.join(','),
            ...rows.map(row => row.join(','))
        ].join('\n');

        return csvContent;
    }

    /**
     * Create a new catalogue product
     */
    async createCatalogue(req: Request, res: Response): Promise<void> {
        // Create service with request context
        const catalogueService = createCatalogueService(req);

        try {
            // Extract logged in user information
            const { _id: userId, email: userEmail, roles } = CatalogueController.getLoggedInUser(req);
            const userRole = roles[0]?.key || 'unknown';

            // Log user information (optional - for debugging/auditing)
            console.log(`Creating product by user: ${userEmail}, role: ${userRole}, userId: ${userId}`);
            console.log('Request files:', req.files);
            console.log('Request body:', req.body);

            // Handle file upload if present
            let productImages: any[] = [];
            const files = req.files as Express.Multer.File[];

            if (files && files.length > 0) {
                console.log(`Uploading ${files.length} product image(s) to Cloudinary`);

                // Validate max images
                const maxImages = parseInt(process.env.MAX_PRODUCT_IMAGES || '10');
                if (files.length > maxImages) {
                    res.status(400).json({
                        success: false,
                        message: `Maximum ${maxImages} images allowed`,
                        uploadedBy: { userId, userEmail, userRole }
                    });
                    return;
                }

                // Upload all images to Cloudinary with metadata
                const folder = process.env.CATALOGUE_IMAGE_FOLDER || 'frovo/catalogue_images';
                const uploadPromises = files.map(file =>
                    imageUploadService.uploadToCloudinary(file.buffer, file.originalname, folder)
                        .then(({ url, publicId }) =>
                            imageUploadService.createProductDocumentMetadata(file, url, publicId)
                        )
                );

                productImages = await Promise.all(uploadPromises);

                console.log('Product images uploaded with metadata:', productImages);
            } else if (req.body.images) {
                // If no files uploaded, use image objects from body (backward compatibility)
                productImages = Array.isArray(req.body.images)
                    ? req.body.images
                    : typeof req.body.images === 'string'
                        ? JSON.parse(req.body.images)
                        : [req.body.images].filter(Boolean);
            }

            // Extract data from request body
            const productData: CreateCatalogueDTO = {
                sku_id: req.body.sku_id,
                product_name: req.body.product_name,
                brand_name: req.body.brand_name,
                description: req.body.description,
                category_id: req.body.category_id, // Changed from category to category_id
                sub_category: req.body.sub_category,
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

            // OPTIONAL: Add user info to product data (if you want to track who created it)
            // Uncomment if you want to add createdBy field to your model
            // const productDataWithUser = {
            //     ...productData,
            //     createdBy: userId,
            //     createdByEmail: userEmail,
            //     createdByRole: userRole
            // };

            // Validate input data
            const validation = catalogueService.validateCatalogueData(productData);
            if (!validation.isValid) {
                res.status(400).json({
                    success: false,
                    message: 'Validation failed',
                    errors: validation.errors,
                    createdBy: { userId, userEmail, userRole } // Include user info in error response
                });
                return;
            }

            // Create product using service
            const product = await catalogueService.createCatalogue(productData);

            // Format response
            const responseData = {
                id: product._id,
                sku_id: product.sku_id,
                product_name: product.product_name,
                brand_name: product.brand_name,
                description: product.description,
                category: product.category,
                sub_category: product.sub_category,
                manufacturer_name: product.manufacturer_name,
                manufacturer_address: product.manufacturer_address,
                shell_life: product.shell_life,
                expiry_alert_threshold: product.expiry_alert_threshold,
                tages_label: product.tages_label,
                unit_size: product.unit_size,
                base_price: product.base_price,
                final_price: product.final_price,
                barcode: product.barcode,
                nutrition_information: product.nutrition_information,
                ingredients: product.ingredients,
                product_images: product.product_images,
                status: product.status,
                // Include user info who created this (optional)
                createdBy: {
                    userId: userId.toString(),
                    userEmail,
                    userRole
                }
            };

            // Send success response
            res.status(201).json({
                success: true,
                message: 'Product created successfully',
                data: responseData,
                meta: {
                    createdBy: userEmail,
                    userRole,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error creating product:', error);

            // Extract user info for error logging
            let userId = 'unknown';
            let userEmail = 'unknown';
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
            } catch (userError) {
                // User not authenticated - use default values
            }

            // Handle specific error cases
            const errorMessages: Record<string, number> = {
                'Product with this SKU already exists': 409,
                'Product with this barcode already exists': 409,
                'Category.*not found': 404,
                'Sub-category.*not found': 404,
                'Prices cannot be negative': 400,
                'Final price cannot be less than base price': 400,
                'Expiry alert threshold must be between 1 and 365 days': 400,
                'At least one image is required': 400,
                'Maximum 10 images allowed': 400,
                'Shell life should be in format': 400,
                'User authentication required': 401
            };

            // Check for known error patterns
            let statusCode = 500;
            let errorMessage = 'Internal server error';
            
            for (const [pattern, code] of Object.entries(errorMessages)) {
                if (error.message.match(new RegExp(pattern))) {
                    statusCode = code;
                    errorMessage = error.message;
                    break;
                }
            }

            // Handle Mongoose validation errors
            if (error.name === 'ValidationError') {
                statusCode = 400;
                errorMessage = 'Validation error';
                
                const validationErrors = Object.values(error.errors).map((err: any) => 
                    `${err.path}: ${err.message}`
                );
                
                res.status(statusCode).json({
                    success: false,
                    message: errorMessage,
                    errors: validationErrors,
                    createdBy: { userId, userEmail }
                });
                return;
            }

            // Handle duplicate key errors (MongoDB)
            if (error.code === 11000) {
                statusCode = 409;
                const field = Object.keys(error.keyPattern)[0];
                errorMessage = `${field} already exists`;
            }

            // Send error response with user info
            res.status(statusCode).json({
                success: false,
                message: errorMessage,

                userInfo: {
                    userId,
                    userEmail,
                    attemptedAt: new Date().toISOString()
                }
            });
        }
    }

    /**
     * Get all catalogue products with pagination and filtering
     */
    async getAllCatalogues(req: Request, res: Response): Promise<void> {
        try {
            console.log('Fetching all catalogues with filters:', req.query);

            // Parse query parameters
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

            // Parse price filters
            if (req.query.min_price) {
                filters.min_price = parseFloat(req.query.min_price as string);
            }
            if (req.query.max_price) {
                filters.max_price = parseFloat(req.query.max_price as string);
            }

            // Validate pagination
            if (filters.page! < 1) filters.page = 1;
            if (filters.limit! < 1 || filters.limit! > 100) filters.limit = 10;

            // Get all catalogues
            const cataloguesData = await catalogueService.getDashboardData(filters);

            // Send response
            res.status(200).json({
                success: true,
                message: 'Catalogues retrieved successfully',
                data: cataloguesData
            });

        } catch (error: any) {
            console.error('Error fetching all catalogues:', error);

            res.status(500).json({
                success: false,
                message: 'Failed to fetch catalogues',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Upload multiple product images to Cloudinary
     */
    async uploadProductImage(req: Request, res: Response): Promise<void> {
        try {
            // Check if files exist
            const files = req.files as Express.Multer.File[];

            if (!files || files.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'No image files uploaded'
                });
                return;
            }

            // Validate max images (from env or default to 10)
            const maxImages = parseInt(process.env.MAX_PRODUCT_IMAGES || '10');
            if (files.length > maxImages) {
                res.status(400).json({
                    success: false,
                    message: `Maximum ${maxImages} images allowed per upload`
                });
                return;
            }

            // Get user info for audit
            const { email: userEmail, roles } = CatalogueController.getLoggedInUser(req);
            const userRole = roles[0]?.key || 'unknown';

            console.log(`Uploading ${files.length} product images by user: ${userEmail}`);

            // Upload all images to Cloudinary
            const folder = process.env.CATALOGUE_IMAGE_FOLDER || 'frovo/catalogue_images';
            const uploadPromises = files.map(file =>
                imageUploadService.uploadToCloudinary(
                    file.buffer,
                    file.originalname,
                    folder
                ).then(({ url, publicId }) => ({
                    file,
                    url,
                    publicId,
                    metadata: imageUploadService.createProductDocumentMetadata(file, url, publicId)
                }))
            );

            const uploadedImages = await Promise.all(uploadPromises);

            res.status(200).json({
                success: true,
                message: `${uploadedImages.length} product image(s) uploaded successfully`,
                data: {
                    images: uploadedImages.map(img => ({
                        image_url: img.url,
                        public_id: img.publicId,
                        metadata: img.metadata
                    })),
                    count: uploadedImages.length
                },
                meta: {
                    uploadedBy: userEmail,
                    userRole,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error uploading product images:', error);

            res.status(500).json({
                success: false,
                message: 'Failed to upload product images',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Delete image from Cloudinary
     */
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

            // Get user info for audit
            const { email: userEmail, roles } = CatalogueController.getLoggedInUser(req);
            const userRole = roles[0]?.key || 'unknown';

            console.log(`Deleting product image ${publicId} by user: ${userEmail}`);

            // Delete from Cloudinary
            await imageUploadService.deleteFromCloudinary(publicId);

            res.status(200).json({
                success: true,
                message: 'Product image deleted successfully',
                data: { publicId },
                meta: {
                    deletedBy: userEmail,
                    userRole,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error deleting product image:', error);

            res.status(500).json({
                success: false,
                message: 'Failed to delete product image',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

export class CategoryController {
    /**
     * Create a new category
     */
    async createCategory(req: Request, res: Response): Promise<void> {
        // Create service with request context
        const categoryService = createCategoryService(req);

        try {
            console.log('Received create category request:', {
                body: req.body,
                files: req.files,
                headers: req.headers,
                user: (req as any).user
            });

            // Extract logged in user information
            const { _id: userId, email: userEmail, roles } = CatalogueController.getLoggedInUser(req);
            const userRole = roles[0]?.key || 'unknown';

            console.log('Creating category by user:', { userId, userEmail, userRole });

            // Handle file upload if present
            let categoryImageData: any = req.body.category_image || '';
            const files = req.files as Express.Multer.File[];

            if (files && files.length > 0) {
                console.log(`Uploading ${files.length} category image(s) to Cloudinary`);

                // Upload first image to Cloudinary (category typically has one image)
                const folder = process.env.CATEGORY_IMAGE_FOLDER || 'frovo/category_images';
                const { url, publicId } = await imageUploadService.uploadToCloudinary(
                    files[0].buffer,
                    files[0].originalname,
                    folder
                );

                // Create metadata object for the uploaded image
                categoryImageData = imageUploadService.createCategoryDocumentMetadata(
                    files[0],
                    url,
                    publicId
                );

                console.log('Category image uploaded:', url);
            }

            // Handle both flat and nested formats for sub_details
            let subCategories: string;
            let descriptionSubCategory: string;

            // Parse sub_details if it's a JSON string (from form-data)
            let subDetails = req.body.sub_details;
            if (typeof subDetails === 'string') {
                try {
                    subDetails = JSON.parse(subDetails);
                } catch (e) {
                    // If parsing fails, treat as error
                    throw new Error('sub_details must be valid JSON');
                }
            }

            if (subDetails) {
                // Nested format
                subCategories = subDetails.sub_categories;
                descriptionSubCategory = subDetails.description_sub_category;
            } else {
                // Flat format (for backward compatibility)
                subCategories = req.body.sub_categories;
                descriptionSubCategory = req.body.description_sub_category;
            }

            // Extract data from request body
            const categoryData: CreateCategoryDTO = {
                category_name: req.body.category_name,
                description: req.body.description,
                sub_details: {
                    sub_categories: subCategories,
                    description_sub_category: descriptionSubCategory
                },
                category_image: categoryImageData,
                category_status: req.body.category_status || 'active'
            };

            console.log('Processed category data:', categoryData);

            // First, let's debug by checking what's already in the database
            try {
                console.log('--- DEBUG: Checking existing categories ---');
                await categoryService.getAllCategories();
                
                console.log(`--- DEBUG: Checking categories with name "${categoryData.category_name}" ---`);
                await categoryService.findCategoriesByName(categoryData.category_name);
            } catch (debugError) {
                console.error('Debug check failed:', debugError);
            }

            // Create category using service
            const category = await categoryService.createCategory(categoryData);

            // Format response
            const responseData = {
                id: category._id,
                category_name: category.category_name,
                description: category.description,
                sub_details: {
                    sub_categories: category.sub_details.sub_categories,
                    description_sub_category: category.sub_details.description_sub_category
                },
                category_image: category.category_image,
                category_status: category.category_status,
                createdAt: category.createdAt,
                updatedAt: category.updatedAt
            };

            // Send success response
            res.status(201).json({
                success: true,
                message: 'Category created successfully',
                data: responseData,
                meta: {
                    createdBy: userEmail,
                    userRole,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error creating category:', {
                message: error.message,
                code: error.code,
                name: error.name,
                keyPattern: error.keyPattern,
                keyValue: error.keyValue,
                fullError: error
            });

            // Extract user info for error logging
            let userId = 'unknown';
            let userEmail = 'unknown';
            let userRole = 'unknown';
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (userError) {
                console.log('User not authenticated in error handler');
            }

            // Handle duplicate error
            if (error.message.includes('already exists') || error.code === 11000) {
                const categoryName = req.body.category_name || 'unknown';
                const subCategories = req.body.sub_categories || req.body.sub_details?.sub_categories || 'unknown';
                
                res.status(409).json({
                    success: false,
                    message: `Category "${categoryName}" with sub-categories "${subCategories}" already exists`,
                    suggestion: 'Try using different sub-categories or modify the existing category',
                    details: {
                        category_name: categoryName,
                        sub_categories: subCategories,
                        database_error_code: error.code,
                        key_pattern: error.keyPattern,
                        key_value: error.keyValue
                    },
                    userInfo: { userId, userEmail, userRole }
                });
                return;
            }

            // Handle Mongoose validation errors
            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map((err: any) => 
                    `${err.path}: ${err.message}`
                );
                
                res.status(400).json({
                    success: false,
                    message: 'Validation error',
                    errors: validationErrors,
                    userInfo: { userId, userEmail, userRole }
                });
                return;
            }

            // Generic error response
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                
            });
        }
    }

    /**
     * Get category by ID
     */
    async getCategoryById(req: Request, res: Response): Promise<void> {
        // Create service with request context
        const categoryService = createCategoryService(req);
        
        try {
            const { id } = req.params;
            console.log(`Fetching category with ID: ${id}`);

            // Extract user info for audit (if available)
            let userId = 'unknown';
            let userEmail = 'unknown';
            let userRole = 'unknown';
            
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (authError) {
                // User not authenticated - continue anyway for GET requests
                console.log('Request without authentication');
            }

            const category = await categoryService.getCategoryById(id);

            if (!category) {
                res.status(404).json({
                    success: false,
                    message: 'Category not found',
                    requestedId: id,
                    requestedBy: {
                        userId,
                        userEmail,
                        userRole
                    }
                });
                return;
            }

            // Parse sub-categories for response
            const subCategoriesList = category.sub_details.sub_categories
                .split(',')
                .map(s => s.trim())
                .filter(s => s);

            // Get product count for this category
            const productCount = await categoryService.getProductCountByCategory(id);

            res.status(200).json({
                success: true,
                message: 'Category retrieved successfully',
                data: {
                    id: category._id,
                    category_name: category.category_name,
                    description: category.description,
                    sub_details: {
                        sub_categories: category.sub_details.sub_categories,
                        sub_categories_list: subCategoriesList,
                        description_sub_category: category.sub_details.description_sub_category
                    },
                    category_image: category.category_image,
                    category_status: category.category_status,
                    product_count: productCount, // Add product count
                    createdAt: category.createdAt,
                    updatedAt: category.updatedAt
                }
            });

        } catch (error: any) {
            console.error('Error fetching category:', error);

            // Extract user info for error logging
            let userId = 'unknown';
            let userEmail = 'unknown';
            let userRole = 'unknown';
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (userError) {
                // User not authenticated
            }

            const statusCode = error.message.includes('Invalid category ID') ? 400 : 500;

            res.status(statusCode).json({
                success: false,
                message: error.message || 'Failed to fetch category',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                requestedBy: { userId, userEmail, userRole }
            });
        }
    }

    /**
     * Update category by ID
     */
    async updateCategory(req: Request, res: Response): Promise<void> {
        // Create service with request context
        const categoryService = createCategoryService(req);
        
        try {
            const { id } = req.params;
            console.log(`Updating category ${id} with data:`, req.body);

            // Extract user info for audit - REQUIRED for update operations
            let userId: string;
            let userEmail: string;
            let userRole: string;
            
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (authError) {
                // Authentication is required for update operations
                res.status(401).json({
                    success: false,
                    message: 'Authentication required for update operations',
                    error: 'User authentication required'
                });
                return;
            }

            // Handle file upload if present (for updating image)
            const files = req.files as Express.Multer.File[];
            if (files && files.length > 0) {
                console.log(`Uploading new category image to Cloudinary`);

                const folder = process.env.CATEGORY_IMAGE_FOLDER || 'frovo/category_images';
                const { url, publicId } = await imageUploadService.uploadToCloudinary(
                    files[0].buffer,
                    files[0].originalname,
                    folder
                );

                // Create metadata object for the uploaded image
                const categoryImageData = imageUploadService.createCategoryDocumentMetadata(
                    files[0],
                    url,
                    publicId
                );

                // Set the new image data
                req.body.category_image = categoryImageData;
                console.log('New category image uploaded:', url);
            }

            // Handle both flat and nested formats for sub_details
            let subCategories: string | undefined;
            let descriptionSubCategory: string | undefined;

            // Parse sub_details if it's a JSON string (from form-data)
            let subDetails = req.body.sub_details;
            if (typeof subDetails === 'string') {
                try {
                    subDetails = JSON.parse(subDetails);
                } catch (e) {
                    // If parsing fails, ignore
                }
            }

            if (subDetails) {
                subCategories = subDetails.sub_categories;
                descriptionSubCategory = subDetails.description_sub_category;
            } else {
                subCategories = req.body.sub_categories;
                descriptionSubCategory = req.body.description_sub_category;
            }

            // Prepare update data
            const updateData: Partial<CreateCategoryDTO> = {};

            if (req.body.category_name) updateData.category_name = req.body.category_name;
            if (req.body.description) updateData.description = req.body.description;
            if (req.body.category_image) updateData.category_image = req.body.category_image;
            if (req.body.category_status) updateData.category_status = req.body.category_status;
            
            if (subCategories || descriptionSubCategory) {
                updateData.sub_details = {
                    sub_categories: subCategories || '',
                    description_sub_category: descriptionSubCategory || ''
                };
            }

            // Update category
            const updatedCategory = await categoryService.updateCategory(id, updateData);

            // Parse sub-categories for response
            const subCategoriesList = updatedCategory.sub_details.sub_categories
                .split(',')
                .map(s => s.trim())
                .filter(s => s);

            res.status(200).json({
                success: true,
                message: 'Category updated successfully',
                data: {
                    id: updatedCategory._id,
                    category_name: updatedCategory.category_name,
                    description: updatedCategory.description,
                    sub_details: {
                        sub_categories: updatedCategory.sub_details.sub_categories,
                        sub_categories_list: subCategoriesList,
                        description_sub_category: updatedCategory.sub_details.description_sub_category
                    },
                    category_image: updatedCategory.category_image,
                    category_status: updatedCategory.category_status,
                    updatedAt: updatedCategory.updatedAt
                },
                meta: {
                    updatedBy: userEmail,
                    userRole,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error updating category:', error);

            // Extract user info for error logging
            let userId = 'unknown';
            let userEmail = 'unknown';
            let userRole = 'unknown';
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (userError) {
                // User not authenticated
            }

            // Handle specific error cases
            let statusCode = 500;
            let errorMessage = error.message || 'Failed to update category';

            if (error.message.includes('Invalid category ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('already exists')) {
                statusCode = 409;
            } else if (error.name === 'ValidationError') {
                statusCode = 400;
            }

            res.status(statusCode).json({
                success: false,
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                updatedBy: { userId, userEmail, userRole }
            });
        }
    }

    /**
     * Update category status only
     */
    async updateCategoryStatus(req: Request, res: Response): Promise<void> {
        // Create service with request context
        const categoryService = createCategoryService(req);

        try {
            const { id } = req.params;
            const { status } = req.body;

            console.log(`Updating category ${id} status to: ${status}`);

            // Extract user info for audit - REQUIRED for update operations
            let userId: string;
            let userEmail: string;
            let userRole: string;

            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (authError) {
                res.status(401).json({
                    success: false,
                    message: 'Authentication required for update operations',
                    error: 'User authentication required'
                });
                return;
            }

            // Validate status value
            if (!status || !['active', 'inactive'].includes(status)) {
                res.status(400).json({
                    success: false,
                    message: 'Invalid status value. Must be "active" or "inactive"',
                    updatedBy: { userId, userEmail, userRole }
                });
                return;
            }

            // Update only the status
            const updateData = { category_status: status };
            const updatedCategory = await categoryService.updateCategory(id, updateData);

            res.status(200).json({
                success: true,
                message: 'Category status updated successfully',
                data: {
                    id: updatedCategory._id,
                    category_name: updatedCategory.category_name,
                    category_status: updatedCategory.category_status,
                    updatedAt: updatedCategory.updatedAt
                },
                meta: {
                    updatedBy: userEmail,
                    userRole,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error updating category status:', error);

            // Extract user info for error logging
            let userId = 'unknown';
            let userEmail = 'unknown';
            let userRole = 'unknown';
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (userError) {
                // User not authenticated
            }

            let statusCode = 500;
            let errorMessage = error.message || 'Failed to update category status';

            if (error.message.includes('Invalid category ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            }

            res.status(statusCode).json({
                success: false,
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                updatedBy: { userId, userEmail, userRole }
            });
        }
    }

    /**
     * Delete category by ID
     */
    async deleteCategory(req: Request, res: Response): Promise<void> {
        // Create service with request context
        const categoryService = createCategoryService(req);
        
        try {
            const { id } = req.params;
            console.log(`Deleting category ${id}`);

            // Extract user info for audit - REQUIRED for delete operations
            let userId: string;
            let userEmail: string;
            let userRole: string;
            
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (authError) {
                // Authentication is required for delete operations
                res.status(401).json({
                    success: false,
                    message: 'Authentication required for delete operations',
                    error: 'User authentication required'
                });
                return;
            }

            const result = await categoryService.deleteCategory(id);

            res.status(200).json({
                success: true,
                message: result.message,
                data: {
                    deletedCategoryId: id,
                    affectedCatalogues: result.affectedCatalogues
                },
                meta: {
                    deletedBy: userEmail,
                    userRole,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error deleting category:', error);

            // Extract user info for error logging
            let userId = 'unknown';
            let userEmail = 'unknown';
            let userRole = 'unknown';
            try {
                const user = CatalogueController.getLoggedInUser(req);
                userId = user._id.toString();
                userEmail = user.email;
                userRole = user.roles[0]?.key || 'unknown';
            } catch (userError) {
                // User not authenticated
            }

            // Handle specific error cases
            let statusCode = 500;
            let errorMessage = error.message || 'Failed to delete category';

            if (error.message.includes('Invalid category ID')) {
                statusCode = 400;
            } else if (error.message.includes('not found')) {
                statusCode = 404;
            } else if (error.message.includes('Cannot delete category')) {
                statusCode = 409; // Conflict - category is in use
            }

            res.status(statusCode).json({
                success: false,
                message: errorMessage,
                error: process.env.NODE_ENV === 'development' ? error.message : undefined,
                requestedBy: { userId, userEmail, userRole }
            });
        }
    }

    /**
     * Get category dashboard statistics
     */
    async getCategoryDashboardStats(req: Request, res: Response): Promise<void> {
        // Create service (no request context needed for stats)
        const categoryService = createCategoryService();

        try {
            console.log('Fetching category dashboard statistics');

            const stats = await categoryService.getCategoryDashboardStats();

            res.status(200).json({
                success: true,
                message: 'Category dashboard statistics retrieved successfully',
                data: stats
            });

        } catch (error: any) {
            console.error('Error fetching category dashboard stats:', error);

            res.status(500).json({
                success: false,
                message: 'Failed to fetch category dashboard statistics',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Get all categories with pagination and filtering
     */
    async getAllCategories(req: Request, res: Response): Promise<void> {
        // Create service with request context
        const categoryService = createCategoryService(req);

        try {
            console.log('Fetching all categories with filters:', req.query);

            // Parse query parameters
            const filters: CategoryFilterDTO = {
                status: req.query.status as 'active' | 'inactive',
                category_name: req.query.category_name as string,
                page: req.query.page ? parseInt(req.query.page as string) : 1,
                limit: req.query.limit ? parseInt(req.query.limit as string) : 10
            };

            // Validate pagination
            if (filters.page! < 1) filters.page = 1;
            if (filters.limit! < 1 || filters.limit! > 100) filters.limit = 10;

            // Get categories with filters
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
                message: 'Failed to fetch categories',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }

    /**
     * Upload category image to Cloudinary (typically just one image)
     */
    async uploadCategoryImage(req: Request, res: Response): Promise<void> {
        try {
            // Check if files exist
            const files = req.files as Express.Multer.File[];

            if (!files || files.length === 0) {
                res.status(400).json({
                    success: false,
                    message: 'No image file uploaded'
                });
                return;
            }

            // Get user info for audit
            const { email: userEmail, roles } = CatalogueController.getLoggedInUser(req);
            const userRole = roles[0]?.key || 'unknown';

            console.log(`Uploading ${files.length} category image(s) by user: ${userEmail}`);

            // Upload all images to Cloudinary
            const folder = process.env.CATEGORY_IMAGE_FOLDER || 'frovo/category_images';
            const uploadPromises = files.map(file =>
                imageUploadService.uploadToCloudinary(
                    file.buffer,
                    file.originalname,
                    folder
                ).then(({ url, publicId }) => ({
                    file,
                    url,
                    publicId,
                    metadata: imageUploadService.createCategoryDocumentMetadata(file, url, publicId)
                }))
            );

            const uploadedImages = await Promise.all(uploadPromises);

            // For category, typically we use just the first image
            const primaryImage = uploadedImages[0];

            res.status(200).json({
                success: true,
                message: `${uploadedImages.length} category image(s) uploaded successfully`,
                data: {
                    primary_image: {
                        image_url: primaryImage.url,
                        public_id: primaryImage.publicId,
                        metadata: primaryImage.metadata
                    },
                    all_images: uploadedImages.map(img => ({
                        image_url: img.url,
                        public_id: img.publicId,
                        metadata: img.metadata
                    })),
                    count: uploadedImages.length
                },
                meta: {
                    uploadedBy: userEmail,
                    userRole,
                    timestamp: new Date().toISOString()
                }
            });

        } catch (error: any) {
            console.error('Error uploading category image:', error);

            res.status(500).json({
                success: false,
                message: 'Failed to upload category image',
                error: process.env.NODE_ENV === 'development' ? error.message : undefined
            });
        }
    }
}

// Export instances for both controllers
export const catalogueController = new CatalogueController();
export const categoryController = new CategoryController();