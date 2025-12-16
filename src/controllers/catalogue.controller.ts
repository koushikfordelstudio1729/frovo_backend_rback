import { Request, Response } from 'express';
import { 
    catalogueService, 
    categoryService, 
    CreateCatalogueDTO, 
    CreateCategoryDTO 
} from '../services/catalogue.service';
import { Types } from 'mongoose';

export class CatalogueController {
    // Utility function to safely extract user - STATIC
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
     * Create a new catalogue product
     */
    async createCatalogue(req: Request, res: Response): Promise<void> {
        try {
            // Extract logged in user information
            const { _id: userId, email: userEmail, roles } = CatalogueController.getLoggedInUser(req);
            const userRole = roles[0]?.key || 'unknown';

            // Log user information (optional - for debugging/auditing)
            console.log(`Creating product by user: ${userEmail}, role: ${userRole}, userId: ${userId}`);

            // Extract data from request body
            const productData: CreateCatalogueDTO = {
                sku_id: req.body.sku_id,
                product_name: req.body.product_name,
                brand_name: req.body.brand_name,
                description: req.body.description,
                category: req.body.category,
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
                images: Array.isArray(req.body.images) ? req.body.images : [req.body.images].filter(Boolean),
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
                images: product.images,
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
}

export class CategoryController {
    /**
     * Create a new category
     */
    async createCategory(req: Request, res: Response): Promise<void> {
    try {
        console.log('Received create category request:', {
            body: req.body,
            headers: req.headers,
            user: (req as any).user
        });

        // Extract logged in user information
        const { _id: userId, email: userEmail, roles } = CatalogueController.getLoggedInUser(req);
        const userRole = roles[0]?.key || 'unknown';

        console.log('Creating category by user:', { userId, userEmail, userRole });

        // Handle both flat and nested formats
        let subCategories: string;
        let descriptionSubCategory: string;
        
        if (req.body.sub_details) {
            // Nested format
            subCategories = req.body.sub_details.sub_categories;
            descriptionSubCategory = req.body.sub_details.description_sub_category;
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
            category_image: req.body.category_image,
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

        // Validate input data
      

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
}

// Export instances for both controllers
export const catalogueController = new CatalogueController();
export const categoryController = new CategoryController();