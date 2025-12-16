import mongoose from 'mongoose';
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
export interface CategoryStatsDTO {
    total_categories: number;
    active_categories: number;
    inactive_categories: number;
    total_sub_categories: number;
    active_sub_categories: number;
    inactive_sub_categories: number;
    categories_by_status: Array<{
        category_name: string;
        category_status: 'active' | 'inactive';
        sub_categories_count: number;
        sub_categories: Array<{
            name: string;
            status: string;
            description: string;
        }>;
    }>;
    sub_categories_by_category: Array<{
        category_name: string;
        sub_categories: string[];
        count: number;
    }>;
    status_distribution: {
        active_percentage: number;
        inactive_percentage: number;
    };
}

export interface CategoryFilterDTO {
    status?: 'active' | 'inactive';
    category_name?: string;
    page?: number;
    limit?: number;
}

export interface CategoryListResponseDTO {
    categories: Array<{
        id: string;
        category_name: string;
        description: string;
        category_status: 'active' | 'inactive';
        category_image: string;
        sub_categories_count: number;
        sub_categories_list: string[];
        createdAt: Date;
        updatedAt: Date;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    stats: {
        total_categories: number;
        active_categories: number;
        inactive_categories: number;
    };
}
export class CategoryService {
    /**
     * Get comprehensive category dashboard statistics
     */
    async getCategoryDashboardStats(): Promise<CategoryStatsDTO> {
        try {
            console.log('Fetching category dashboard statistics');

            // Get all categories
            const allCategories = await CategoryModel.find({})
                .select('category_name category_status sub_details description category_image')
                .lean();

            // Calculate statistics
            let totalSubCategories = 0;
            let activeSubCategories = 0;
            let inactiveSubCategories = 0;
            
            const categoriesByStatus = allCategories.map(category => {
                const subCategories = category.sub_details?.sub_categories || '';
                const subCategoriesList = subCategories.split(',').map(s => s.trim()).filter(s => s);
                
                totalSubCategories += subCategoriesList.length;
                
                // Assuming all sub-categories inherit category status
                if (category.category_status === 'active') {
                    activeSubCategories += subCategoriesList.length;
                } else {
                    inactiveSubCategories += subCategoriesList.length;
                }

                return {
                    category_name: category.category_name,
                    category_status: category.category_status,
                    sub_categories_count: subCategoriesList.length,
                    sub_categories: subCategoriesList.map(name => ({
                        name,
                        status: category.category_status,
                        description: category.sub_details?.description_sub_category || ''
                    }))
                };
            });

            // Group sub-categories by category
            const subCategoriesByCategory = allCategories.map(category => {
                const subCategories = category.sub_details?.sub_categories || '';
                const subCategoriesList = subCategories.split(',').map(s => s.trim()).filter(s => s);
                
                return {
                    category_name: category.category_name,
                    sub_categories: subCategoriesList,
                    count: subCategoriesList.length
                };
            });

            // Filter by status
            const activeCategories = allCategories.filter(cat => cat.category_status === 'active');
            const inactiveCategories = allCategories.filter(cat => cat.category_status === 'inactive');

            // Calculate percentages
            const totalCategories = allCategories.length;
            const activePercentage = totalCategories > 0 ? (activeCategories.length / totalCategories) * 100 : 0;
            const inactivePercentage = totalCategories > 0 ? (inactiveCategories.length / totalCategories) * 100 : 0;

            return {
                total_categories: totalCategories,
                active_categories: activeCategories.length,
                inactive_categories: inactiveCategories.length,
                total_sub_categories: totalSubCategories,
                active_sub_categories: activeSubCategories,
                inactive_sub_categories: inactiveSubCategories,
                categories_by_status: categoriesByStatus,
                sub_categories_by_category: subCategoriesByCategory,
                status_distribution: {
                    active_percentage: Math.round(activePercentage * 100) / 100,
                    inactive_percentage: Math.round(inactivePercentage * 100) / 100
                }
            };

        } catch (error: any) {
            console.error('Error fetching category dashboard stats:', error);
            throw error;
        }
    }
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
export interface DashboardFilterDTO {
    category?: string;
    brand_name?: string;
    status?: 'active' | 'inactive';
    min_price?: number;
    max_price?: number;
    search?: string;
    page?: number;
    limit?: number;
    sort_by?: 'product_name' | 'base_price' | 'createdAt';
    sort_order?: 'asc' | 'desc';
}

export interface DashboardResponseDTO {
    products: Array<{
        sku_id: string;
        product_name: string;
        category: string;
        sub_category: string;
        brand_name: string;
        unit_size: string;
        base_price: number;
        final_price: number;
        status: 'active' | 'inactive';
        images: string[];
        createdAt: Date;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    filters: DashboardFilterDTO;
}
export class CatalogueService {
    /**
     * Get dashboard data with filtering, pagination, and sorting
     */
    async getDashboardData(filters: DashboardFilterDTO = {}): Promise<DashboardResponseDTO> {
        try {
            const {
                category,
                brand_name,
                status,
                min_price,
                max_price,
                search,
                page = 1,
                limit = 10,
                sort_by = 'createdAt',
                sort_order = 'desc'
            } = filters;

            console.log('Building dashboard query with filters:', filters);

            // Step 1: First get ALL catalogue items without category filtering
            const query: any = {};

            // Apply all filters except category
            if (brand_name) {
                query.brand_name = { $regex: brand_name, $options: 'i' };
            }

            if (status) {
                query.status = status;
            }

            if (min_price !== undefined || max_price !== undefined) {
                query.final_price = {};
                if (min_price !== undefined) query.final_price.$gte = min_price;
                if (max_price !== undefined) query.final_price.$lte = max_price;
            }

            if (search) {
                query.$or = [
                    { sku_id: { $regex: search, $options: 'i' } },
                    { product_name: { $regex: search, $options: 'i' } },
                    { brand_name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }

            // Step 2: Get all categories for mapping
            const allCategories = await CategoryModel.find({}).select('_id category_name').lean();
            const categoryMap = new Map();
            
            // Create two maps: one for ObjectId, one for string name
            const categoryIdMap = new Map(); // _id -> category_name
            const categoryNameMap = new Map(); // category_name -> category_name
            
            allCategories.forEach(cat => {
                categoryIdMap.set(cat._id.toString(), cat.category_name);
                categoryNameMap.set(cat.category_name, cat.category_name);
            });

            // Step 3: Get all catalogue items matching other filters
            const [allProducts, total] = await Promise.all([
                CatalogueModel.find(query)
                    .select('sku_id product_name category sub_category brand_name unit_size base_price final_price status images createdAt')
                    .sort({ [sort_by]: sort_order === 'asc' ? 1 : -1 })
                    .lean()
                    .exec(),
                CatalogueModel.countDocuments(query)
            ]);

            console.log(`Found ${allProducts.length} products before category filtering`);

            // Step 4: Transform products and resolve category names
            const transformedProducts: any[] = [];
            
            for (const product of allProducts) {
                let categoryName = 'Unknown';
                
                // Try to resolve category name
                if (product.category) {
                    if (mongoose.Types.ObjectId.isValid(product.category.toString())) {
                        // It's an ObjectId
                        categoryName = categoryIdMap.get(product.category.toString()) || 'Unknown';
                    } else {
                        // It's a string (category name)
                        categoryName = categoryNameMap.get(product.category.toString()) || product.category.toString();
                    }
                }

                // Apply category filter if specified
                if (category) {
                    if (!categoryName.toLowerCase().includes(category.toLowerCase())) {
                        continue; // Skip this product if it doesn't match category filter
                    }
                }

                transformedProducts.push({
                    _id: product._id,
                    sku_id: product.sku_id,
                    product_name: product.product_name,
                    category: categoryName,
                    sub_category: product.sub_category,
                    brand_name: product.brand_name,
                    unit_size: product.unit_size,
                    base_price: product.base_price,
                    final_price: product.final_price,
                    status: product.status,
                    images: product.images,
                    createdAt: product.createdAt
                });
            }

            console.log(`After category filtering: ${transformedProducts.length} products`);

            // Step 5: Apply pagination
            const startIndex = (page - 1) * limit;
            const endIndex = startIndex + limit;
            const paginatedProducts = transformedProducts.slice(startIndex, endIndex);

            return {
                products: paginatedProducts,
                total: transformedProducts.length,
                page,
                limit,
                totalPages: Math.ceil(transformedProducts.length / limit),
                filters
            };

        } catch (error: any) {
            console.error('Error fetching dashboard data:', error);
            throw error;
        }
    }
    /**
     * Get dashboard data using aggregation pipeline (for complex filters)
     */
    private async getDashboardDataWithAggregation(filters: DashboardFilterDTO): Promise<DashboardResponseDTO> {
        try {
            const {
                category,
                brand_name,
                status,
                min_price,
                max_price,
                search,
                page = 1,
                limit = 10,
                sort_by = 'createdAt',
                sort_order = 'desc'
            } = filters;

            // Build aggregation pipeline
            const pipeline: any[] = [];

            // 1. Match stage for catalogue filters
            const matchStage: any = {};
            
            if (brand_name) {
                matchStage.brand_name = { $regex: brand_name, $options: 'i' };
            }
            
            if (status) {
                matchStage.status = status;
            }
            
            if (min_price !== undefined || max_price !== undefined) {
                matchStage.final_price = {};
                if (min_price !== undefined) matchStage.final_price.$gte = min_price;
                if (max_price !== undefined) matchStage.final_price.$lte = max_price;
            }
            
            if (search) {
                matchStage.$or = [
                    { sku_id: { $regex: search, $options: 'i' } },
                    { product_name: { $regex: search, $options: 'i' } },
                    { brand_name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } }
                ];
            }
            
            if (Object.keys(matchStage).length > 0) {
                pipeline.push({ $match: matchStage });
            }

            // 2. Lookup to join with categories
            pipeline.push({
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            });

            // 3. Unwind category array
            pipeline.push({
                $unwind: {
                    path: '$categoryInfo',
                    preserveNullAndEmptyArrays: true
                }
            });

            // 4. Filter by category name (after lookup)
            if (category) {
                pipeline.push({
                    $match: {
                        'categoryInfo.category_name': { 
                            $regex: category, 
                            $options: 'i' 
                        }
                    }
                });
            }

            // 5. Project required fields
            pipeline.push({
                $project: {
                    sku_id: 1,
                    product_name: 1,
                    category: '$categoryInfo.category_name',
                    sub_category: 1,
                    brand_name: 1,
                    unit_size: 1,
                    base_price: 1,
                    final_price: 1,
                    status: 1,
                    images: 1,
                    createdAt: 1
                }
            });

            // 6. Count total documents
            const countPipeline = [...pipeline];
            countPipeline.push({ $count: 'total' });
            
            const [countResult] = await CatalogueModel.aggregate(countPipeline);
            const total = countResult ? countResult.total : 0;

            // 7. Sort
            const sortStage: any = {};
            // Map sort_by to actual field names
            const sortFieldMap: Record<string, string> = {
                'product_name': 'product_name',
                'base_price': 'final_price',
                'createdAt': 'createdAt'
            };
            
            const sortField = sortFieldMap[sort_by] || 'createdAt';
            sortStage[sortField] = sort_order === 'asc' ? 1 : -1;
            pipeline.push({ $sort: sortStage });

            // 8. Skip and limit for pagination
            const skip = (page - 1) * limit;
            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: limit });

            // 9. Execute aggregation
            const products = await CatalogueModel.aggregate(pipeline);

            // Set default category name for null values
            const transformedProducts = products.map(product => ({
                ...product,
                category: product.category || 'Unknown'
            }));

            return {
                products: transformedProducts,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                filters
            };

        } catch (error: any) {
            console.error('Error in aggregation pipeline:', error);
            throw error;
        }
    }

    
    /**
     * Get unique brands for filter dropdown
     */
    async getUniqueBrands(): Promise<string[]> {
        try {
            const brands = await CatalogueModel.distinct('brand_name');
            return brands.filter(brand => brand).sort();
        } catch (error: any) {
            console.error('Error fetching brands:', error);
            throw error;
        }
    }

    /**
     * Get unique categories for filter dropdown
     */
    async getUniqueCategories(): Promise<string[]> {
        try {
            const categories = await CategoryModel.distinct('category_name');
            return categories.sort();
        } catch (error: any) {
            console.error('Error fetching categories:', error);
            throw error;
        }
    }
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