import { CatalogueModel, ICatalogue, CategoryModel, ICategory } from '../models/Catalogue.model';

// CATEGORY DTOs and Service
export interface CreateCategoryDTO {
    category_name: string;
    description: string;
    sub_details: {
        sub_categories: string;
    description_sub_category: string;
    }
    category_image: string;
    category_status?: 'active' | 'inactive';
}

export class CategoryService {
    /**
     * Create a new category with detailed debugging
     */
    async createCategory(categoryData: CreateCategoryDTO): Promise<ICategory> {
        try {
            console.log('Attempting to create category with data:', {
                category_name: categoryData.category_name,
                sub_categories: categoryData.sub_details.sub_categories,
                full_data: categoryData
            });

            // Check if the exact combination exists with detailed logging
            const query = { 
                category_name: categoryData.category_name,
                'sub_details.sub_categories': categoryData.sub_details.sub_categories
            };
            
            console.log('Query for existing category:', query);
            
            const existingCategory = await CategoryModel.findOne(query);
            
            if (existingCategory) {
                console.log('Found existing category:', {
                    _id: existingCategory._id,
                    category_name: existingCategory.category_name,
                    sub_categories: existingCategory.sub_details.sub_categories,
                    exists: true
                });
                throw new Error(`Category "${categoryData.category_name}" with sub-categories "${categoryData.sub_details.sub_categories}" already exists`);
            } else {
                console.log('No existing category found with this combination');
            }

            // Create and save the category
            const category = new CategoryModel(categoryData);
            const savedCategory = await category.save();
            
            console.log('Category created successfully:', {
                _id: savedCategory._id,
                category_name: savedCategory.category_name,
                sub_categories: savedCategory.sub_details.sub_categories
            });
            
            return savedCategory;
        } catch (error: any) {
            console.error('Error in createCategory service:', {
                error: error.message,
                code: error.code,
                keyPattern: error.keyPattern,
                keyValue: error.keyValue,
                stack: error.stack
            });
            
            // If it's a MongoDB duplicate key error, check what's duplicate
            if (error.code === 11000) {
                console.error('Duplicate key error details:', {
                    duplicateFields: error.keyPattern,
                    duplicateValues: error.keyValue
                });
                
                // Try to find what's actually conflicting
                if (error.keyValue) {
                    const conflictingCategory = await CategoryModel.findOne({
                        category_name: error.keyValue.category_name,
                        'sub_details.sub_categories': error.keyValue['sub_details.sub_categories']
                    });
                    
                    if (conflictingCategory) {
                        console.log('Conflicting category found:', {
                            _id: conflictingCategory._id,
                            category_name: conflictingCategory.category_name,
                            sub_categories: conflictingCategory.sub_details.sub_categories
                        });
                    }
                }
                
                throw new Error(`Category "${categoryData.category_name}" with sub-categories "${categoryData.sub_details.sub_categories}" already exists`);
            }
            throw error;
        }
    }

    /**
     * Get all categories for debugging
     */
    async getAllCategories(): Promise<ICategory[]> {
        try {
            const categories = await CategoryModel.find({});
            console.log('All categories in database:', 
                categories.map(cat => ({
                    id: cat._id,
                    name: cat.category_name,
                    sub_categories: cat.sub_details.sub_categories
                }))
            );
            return categories;
        } catch (error: any) {
            console.error('Error getting all categories:', error);
            throw error;
        }
    }

    /**
     * Find categories by name for debugging
     */
    async findCategoriesByName(categoryName: string): Promise<ICategory[]> {
        try {
            const categories = await CategoryModel.find({ 
                category_name: categoryName 
            });
            
            console.log(`Categories with name "${categoryName}":`, 
                categories.map(cat => ({
                    id: cat._id,
                    name: cat.category_name,
                    sub_categories: cat.sub_details.sub_categories
                }))
            );
            
            return categories;
        } catch (error: any) {
            console.error('Error finding categories by name:', error);
            throw error;
        }
    }
}
// CATALOGUE DTOs and Service
export interface CreateCatalogueDTO {
    sku_id: string;
    product_name: string;
    brand_name: string;
    description: string;
    category: string;
    sub_category: string;
    manufacturer_name: string;
    manufacturer_address: string;
    shell_life: string;
    expiry_alert_threshold: number;
    tages_label: string;
    unit_size: string;
    base_price: number;
    final_price: number;
    barcode: string;
    nutrition_information: string;
    ingredients: string;
    images: string[];
    status?: 'active' | 'inactive';
}

export class CatalogueService {
    /**
     * Create a new catalogue product
     */
    async createCatalogue(productData: CreateCatalogueDTO): Promise<ICatalogue> {
        try {
            // Check if SKU already exists
            const existingSku = await CatalogueModel.findOne({ 
                sku_id: productData.sku_id 
            });
            
            if (existingSku) {
                throw new Error('Product with this SKU already exists');
            }

            // Check if barcode already exists
            const existingBarcode = await CatalogueModel.findOne({ 
                barcode: productData.barcode 
            });
            
            if (existingBarcode) {
                throw new Error('Product with this barcode already exists');
            }

            // Validate category and sub_category exist
            const category = await CategoryModel.findOne({ 
                category_name: productData.category 
            });
            
            if (!category) {
                throw new Error(`Category "${productData.category}" not found`);
            }

            // Validate sub_category belongs to the category
            if (!category.sub_details.sub_categories.includes(productData.sub_category)) {
                throw new Error(`Sub-category "${productData.sub_category}" not found in category "${productData.category}"`);
            }

            // Validate prices
            if (productData.base_price < 0 || productData.final_price < 0) {
                throw new Error('Prices cannot be negative');
            }

            if (productData.final_price < productData.base_price) {
                throw new Error('Final price cannot be less than base price');
            }

            // Validate expiry threshold
            if (productData.expiry_alert_threshold < 1 || productData.expiry_alert_threshold > 365) {
                throw new Error('Expiry alert threshold must be between 1 and 365 days');
            }

            // Validate images array
            if (!Array.isArray(productData.images) || productData.images.length === 0) {
                throw new Error('At least one image is required');
            }

            if (productData.images.length > 10) {
                throw new Error('Maximum 10 images allowed');
            }

            // Create and save the product
            const product = new CatalogueModel({
                ...productData,
                status: productData.status || 'active'
            });
            
            const savedProduct = await product.save();
            return savedProduct;

        } catch (error: any) {
            throw error;
        }
    }

    
    /**
     * Validate catalogue data
     */
    validateCatalogueData(data: Partial<CreateCatalogueDTO>): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];
        
        // Required fields
        const requiredFields = [
            'sku_id', 'product_name', 'brand_name', 'description',
            'category', 'sub_category', 'manufacturer_name',
            'manufacturer_address', 'shell_life', 'expiry_alert_threshold',
            'tages_label', 'unit_size', 'base_price', 'final_price',
            'barcode', 'nutrition_information', 'ingredients', 'images'
        ];

        requiredFields.forEach(field => {
            if (!data[field as keyof CreateCatalogueDTO]) {
                errors.push(`${field.replace(/_/g, ' ')} is required`);
            }
        });

        // Specific validations
        if (data.sku_id && data.sku_id.length < 3) {
            errors.push('SKU ID must be at least 3 characters long');
        }

        if (data.product_name && data.product_name.length < 2) {
            errors.push('Product name must be at least 2 characters long');
        }

        if (data.base_price !== undefined && data.base_price < 0) {
            errors.push('Base price cannot be negative');
        }

        if (data.final_price !== undefined && data.final_price < 0) {
            errors.push('Final price cannot be negative');
        }

        if (data.base_price !== undefined && data.final_price !== undefined) {
            if (data.final_price < data.base_price) {
                errors.push('Final price cannot be less than base price');
            }
        }

        if (data.expiry_alert_threshold !== undefined) {
            if (data.expiry_alert_threshold < 1 || data.expiry_alert_threshold > 365) {
                errors.push('Expiry alert threshold must be between 1 and 365 days');
            }
        }

        if (data.images) {
            if (!Array.isArray(data.images)) {
                errors.push('Images must be an array');
            } else if (data.images.length === 0) {
                errors.push('At least one image URL is required');
            } else if (data.images.length > 10) {
                errors.push('Maximum 10 images allowed');
            }
        }

        if (data.status && !['active', 'inactive'].includes(data.status)) {
            errors.push('Status must be either "active" or "inactive"');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Export instances (no default exports)
export const categoryService = new CategoryService();
export const catalogueService = new CatalogueService();