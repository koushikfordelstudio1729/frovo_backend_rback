import mongoose from 'mongoose';
import { CatalogueModel, ICatalogue, CategoryModel, ICategory, ISubCategory } from '../models/Catalogue.model';
import { historyCatalogueService } from './historyCatalogue.service';
import { Request } from 'express';

// CATEGORY DTOs and Service
export interface CreateCategoryDTO {
    category_name: string;
    description: string;
    sub_categories: Array<{
        _id?: Types.ObjectId;
        sub_category_name: string;
        description: string;
    }>;
    category_image: any;
    category_status?: 'active' | 'inactive';
}

export interface CategoryStatsDTO {
    total_categories: number;
    active_categories: number;
    inactive_categories: number;
    total_sub_categories: number;
    active_sub_categories: number;
    inactive_sub_categories: number;
    total_products: number;
    categories_by_status: Array<{
        category_name: string;
        category_status: 'active' | 'inactive';
        sub_categories_count: number;
        product_count: number;
        sub_categories: Array<{
            id: string;
            name: string;
            description: string;
        }>;
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
        category_image: any;
        sub_categories_count: number;
        sub_categories: Array<{
            id: string;
            sub_category_name: string;
            description: string;
            product_count?: number;
        }>;
        product_count: number;
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

// CATALOGUE DTOs
export interface CreateCatalogueDTO {
    sku_id: string;
    product_name: string;
    brand_name: string;
    description: string;
    category: Types.ObjectId; // Category ObjectId
    sub_category: Types.ObjectId; // Sub-category ObjectId
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
    product_images: any[];
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
        id: string;
        sku_id: string;
        product_name: string;
        category: {
            id: string;
            name: string;
        };
        sub_category: {
            id: string;
            name: string;
        };
        brand_name: string;
        description?: string;
        manufacturer_name?: string;
        manufacturer_address?: string;
        shell_life?: string;
        expiry_alert_threshold?: number;
        tages_label?: string;
        unit_size: string;
        base_price: number;
        final_price: number;
        barcode: string;
        nutrition_information?: string;
        ingredients?: string;
        status: 'active' | 'inactive';
        product_images: any[];
        createdAt: Date;
        updatedAt?: Date;
    }>;
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    filters: DashboardFilterDTO;
}

// Import Types from mongoose
import { Types } from 'mongoose';

export class CategoryService {
    private req: Request | null = null;

    /**
     * Set request context for audit logging
     */
    setRequestContext(req: Request): void {
        this.req = req;
    }

    /**
     * Get category by ID with full details including all sub-categories
     */
    async getCategoryById(categoryId: string): Promise<ICategory | null> {
        try {
            console.log(`Fetching category with ID: ${categoryId}`);

            if (!mongoose.Types.ObjectId.isValid(categoryId)) {
                throw new Error('Invalid category ID format');
            }

            const category = await CategoryModel.findById(categoryId).lean() as unknown as ICategory | null;

            if (!category) {
                console.log(`Category with ID ${categoryId} not found`);
                return null;
            }

            // Log view operation
            if (this.req && category) {
                await historyCatalogueService.logView(
                    this.req,
                    'category',
                    category._id,
                    category.category_name
                ).catch(err => console.error('Failed to log view:', err));
            }

            console.log('Category found:', {
                id: category._id,
                name: category.category_name,
                status: category.category_status,
                sub_categories_count: category.sub_categories?.length || 0
            });

            return category;
        } catch (error: any) {
            console.error('Error fetching category by ID:', error);
            throw error;
        }
    }

    /**
     * Update category by ID
     */
    async updateCategory(
        categoryId: string,
        updateData: Partial<CreateCategoryDTO>
    ): Promise<ICategory> {
        try {
            console.log(`Updating category ${categoryId} with data:`, updateData);

            if (!mongoose.Types.ObjectId.isValid(categoryId)) {
                throw new Error('Invalid category ID format');
            }

            // Check if category exists
            const existingCategory = await CategoryModel.findById(categoryId);
            if (!existingCategory) {
                throw new Error('Category not found');
            }

            // If updating category_name or sub_categories, check for duplicates
            if (updateData.category_name || updateData.sub_categories) {
                const nameToCheck = updateData.category_name || existingCategory.category_name;

                // Check for category name uniqueness
                const duplicateCategory = await CategoryModel.findOne({
                    _id: { $ne: categoryId },
                    category_name: nameToCheck
                });

                if (duplicateCategory) {
                    throw new Error(
                        `Category "${nameToCheck}" already exists`
                    );
                }

                // Check for sub-category name uniqueness within this category
                if (updateData.sub_categories) {
                    const subCategoryNames = updateData.sub_categories.map(sc => sc.sub_category_name);
                    const existingSubCategories = existingCategory.sub_categories || [];

                    // Check for duplicates within the update data
                    const uniqueNames = new Set(subCategoryNames);
                    if (uniqueNames.size !== subCategoryNames.length) {
                        throw new Error('Duplicate sub-category names are not allowed within the same category');
                    }

                    // Check for conflicts with existing sub-categories in other categories
                    for (const subCat of updateData.sub_categories) {
                        const existingSubCat = await CategoryModel.findOne({
                            _id: { $ne: categoryId },
                            'sub_categories.sub_category_name': subCat.sub_category_name
                        });

                        if (existingSubCat) {
                            throw new Error(
                                `Sub-category "${subCat.sub_category_name}" already exists in category "${existingSubCat.category_name}"`
                            );
                        }
                    }
                }
            }

            // Prepare update object
            const updateObject: any = {};

            if (updateData.category_name) updateObject.category_name = updateData.category_name;
            if (updateData.description) updateObject.description = updateData.description;
            if (updateData.category_image) updateObject.category_image = updateData.category_image;
            if (updateData.category_status) updateObject.category_status = updateData.category_status;

            if (updateData.sub_categories) {
                // Generate IDs for new sub-categories if not provided
                const subCategoriesWithIds = updateData.sub_categories.map(subCat => ({
                    _id: subCat._id || new mongoose.Types.ObjectId(),
                    sub_category_name: subCat.sub_category_name,
                    description: subCat.description
                }));
                updateObject.sub_categories = subCategoriesWithIds;
            }

            // Store before state for audit
            const beforeState = existingCategory.toObject();

            // Update category
            const updatedCategory = await CategoryModel.findByIdAndUpdate(
                categoryId,
                { $set: updateObject },
                { new: true, runValidators: true }
            );

            if (!updatedCategory) {
                throw new Error('Failed to update category');
            }

            // Log update operation
            if (this.req) {
                await historyCatalogueService.logUpdate(
                    this.req,
                    'category',
                    updatedCategory._id,
                    updatedCategory.category_name,
                    beforeState,
                    updatedCategory.toObject()
                ).catch(err => console.error('Failed to log update:', err));
            }

            console.log('Category updated successfully:', {
                id: updatedCategory._id,
                name: updatedCategory.category_name,
                sub_categories_count: updatedCategory.sub_categories?.length || 0
            });

            return updatedCategory;
        } catch (error: any) {
            console.error('Error updating category:', error);

            // Log failed operation
            if (this.req) {
                const category = await CategoryModel.findById(categoryId);
                if (category) {
                    await historyCatalogueService.logUpdate(
                        this.req,
                        'category',
                        category._id,
                        category.category_name,
                        {},
                        {},
                        'failed',
                        error.message
                    ).catch(err => console.error('Failed to log failed update:', err));
                }
            }

            throw error;
        }
    }

    /**
     * Delete category by ID
     */
    async deleteCategory(categoryId: string): Promise<{
        success: boolean;
        message: string;
        affectedCatalogues?: number;
    }> {
        try {
            console.log(`Attempting to delete category ${categoryId}`);

            if (!mongoose.Types.ObjectId.isValid(categoryId)) {
                throw new Error('Invalid category ID format');
            }

            // Check if category exists
            const category = await CategoryModel.findById(categoryId);
            if (!category) {
                throw new Error('Category not found');
            }

            // Check if any catalogue items are using this category or its sub-categories
            const subCategoryIds = category.sub_categories.map(sc => sc._id);
            const catalogueCount = await CatalogueModel.countDocuments({
                $or: [
                    { category: categoryId },
                    { sub_category: { $in: subCategoryIds } }
                ]
            });

            if (catalogueCount > 0) {
                throw new Error(
                    `Cannot delete category. ${catalogueCount} catalogue item(s) are using this category or its sub-categories. ` +
                    `Please reassign or delete those items first.`
                );
            }

            // Store before state for audit
            const beforeState = category.toObject();

            // Delete the category
            await CategoryModel.findByIdAndDelete(categoryId);

            // Log delete operation
            if (this.req) {
                await historyCatalogueService.logDelete(
                    this.req,
                    'category',
                    category._id,
                    category.category_name,
                    beforeState
                ).catch(err => console.error('Failed to log delete:', err));
            }

            console.log('Category deleted successfully:', {
                id: categoryId,
                name: category.category_name
            });

            return {
                success: true,
                message: 'Category deleted successfully',
                affectedCatalogues: catalogueCount
            };
        } catch (error: any) {
            console.error('Error deleting category:', error);

            // Log failed operation
            if (this.req) {
                const category = await CategoryModel.findById(categoryId);
                if (category) {
                    await historyCatalogueService.logDelete(
                        this.req,
                        'category',
                        category._id,
                        category.category_name,
                        {},
                        'failed',
                        error.message
                    ).catch(err => console.error('Failed to log failed delete:', err));
                }
            }

            throw error;
        }
    }

    /**
     * Get comprehensive category dashboard statistics
     */
    async getCategoryDashboardStats(): Promise<CategoryStatsDTO> {
        try {
            console.log('Fetching category dashboard statistics');

            // Get all categories with sub-categories
            const allCategories = await CategoryModel.find({})
                .select('category_name category_status sub_categories description category_image')
                .lean();

            // Get product counts for all categories and sub-categories
            const [categoryProductCounts, subCategoryProductCounts] = await Promise.all([
                this.getProductCountsForAllCategories(),
                this.getProductCountsForAllSubCategories()
            ]);

            // Calculate total products
            let totalProducts = 0;
            categoryProductCounts.forEach(count => {
                totalProducts += count;
            });

            // Calculate statistics
            let totalSubCategories = 0;
            let activeSubCategories = 0;
            let inactiveSubCategories = 0;

            const categoriesByStatus = allCategories.map(category => {
                const subCategories = category.sub_categories || [];
                totalSubCategories += subCategories.length;

                // Count active/inactive sub-categories based on parent category status
                if (category.category_status === 'active') {
                    activeSubCategories += subCategories.length;
                } else {
                    inactiveSubCategories += subCategories.length;
                }

                const productCount = categoryProductCounts.get(category._id.toString()) || 0;

                return {
                    category_name: category.category_name,
                    category_status: category.category_status,
                    sub_categories_count: subCategories.length,
                    product_count: productCount,
                    sub_categories: subCategories.map(subCat => ({
                        id: subCat._id.toString(),
                        name: subCat.sub_category_name,
                        description: subCat.description
                    }))
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
                total_products: totalProducts,
                categories_by_status: categoriesByStatus,
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
     * Create a new category with multiple sub-categories
     */
    async createCategory(categoryData: CreateCategoryDTO): Promise<ICategory> {
        try {
            console.log('Attempting to create category with data:', {
                category_name: categoryData.category_name,
                sub_categories_count: categoryData.sub_categories?.length || 0,
                full_data: categoryData
            });

            // Check if category name already exists
            const existingCategory = await CategoryModel.findOne({
                category_name: categoryData.category_name
            });

            if (existingCategory) {
                console.log('Found existing category with same name:', {
                    _id: existingCategory._id,
                    category_name: existingCategory.category_name
                });
                throw new Error(`Category "${categoryData.category_name}" already exists`);
            }

            // Check for duplicate sub-category names within the new category
            if (categoryData.sub_categories && categoryData.sub_categories.length > 0) {
                const subCategoryNames = categoryData.sub_categories.map(sc => sc.sub_category_name);
                const uniqueNames = new Set(subCategoryNames);
                if (uniqueNames.size !== subCategoryNames.length) {
                    throw new Error('Duplicate sub-category names are not allowed within the same category');
                }

                // Check if any sub-category name exists in other categories
                for (const subCat of categoryData.sub_categories) {
                    const existingSubCat = await CategoryModel.findOne({
                        'sub_categories.sub_category_name': subCat.sub_category_name
                    });

                    if (existingSubCat) {
                        throw new Error(
                            `Sub-category "${subCat.sub_category_name}" already exists in category "${existingSubCat.category_name}"`
                        );
                    }
                }
            }

            // Generate IDs for sub-categories
            const subCategoriesWithIds = categoryData.sub_categories?.map(subCat => ({
                _id: new mongoose.Types.ObjectId(),
                sub_category_name: subCat.sub_category_name,
                description: subCat.description
            })) || [];

            // Create category data with generated IDs
            const categoryToCreate = {
                ...categoryData,
                sub_categories: subCategoriesWithIds
            };

            // Create and save the category
            const category = new CategoryModel(categoryToCreate);
            const savedCategory = await category.save();

            // Log create operation
            if (this.req) {
                await historyCatalogueService.logCreate(
                    this.req,
                    'category',
                    savedCategory._id,
                    savedCategory.category_name,
                    savedCategory.toObject()
                ).catch(err => console.error('Failed to log create:', err));
            }

            console.log('Category created successfully:', {
                _id: savedCategory._id,
                category_name: savedCategory.category_name,
                sub_categories_count: savedCategory.sub_categories?.length || 0
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

            // Log failed create operation
            if (this.req) {
                await historyCatalogueService.logCreate(
                    this.req,
                    'category',
                    new mongoose.Types.ObjectId(),
                    categoryData.category_name,
                    categoryData,
                    'failed',
                    error.message
                ).catch(err => console.error('Failed to log failed create:', err));
            }

            // If it's a MongoDB duplicate key error
            if (error.code === 11000) {
                const field = Object.keys(error.keyPattern)[0];
                if (field === 'category_name') {
                    throw new Error(`Category "${categoryData.category_name}" already exists`);
                } else if (field.includes('sub_categories.sub_category_name')) {
                    throw new Error('A sub-category with this name already exists in another category');
                }
            }
            throw error;
        }
    }

    /**
     * Get product count for a specific category
     */
    async getProductCountByCategory(categoryId: string): Promise<number> {
        try {
            if (!mongoose.Types.ObjectId.isValid(categoryId)) {
                throw new Error('Invalid category ID format');
            }

            const count = await CatalogueModel.countDocuments({
                category: categoryId
            });

            console.log(`Category ${categoryId} has ${count} products`);
            return count;
        } catch (error: any) {
            console.error('Error getting product count for category:', error);
            throw error;
        }
    }

    /**
     * Get product count for a specific sub-category
     */
    async getProductCountBySubCategory(subCategoryId: Types.ObjectId): Promise<number> {
        try {
            if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
                throw new Error('Invalid sub-category ID format');
            }

            const count = await CatalogueModel.countDocuments({
                sub_category: subCategoryId
            });

            console.log(`Sub-category ${subCategoryId} has ${count} products`);
            return count;
        } catch (error: any) {
            console.error('Error getting product count for sub-category:', error);
            throw error;
        }
    }

    /**
     * Get product counts for all categories
     */
    async getProductCountsForAllCategories(): Promise<Map<string, number>> {
        try {
            const counts = await CatalogueModel.aggregate([
                {
                    $group: {
                        _id: '$category',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const countMap = new Map<string, number>();
            counts.forEach(item => {
                if (item._id) {
                    countMap.set(item._id.toString(), item.count);
                }
            });

            console.log('Product counts by category:', Object.fromEntries(countMap));
            return countMap;
        } catch (error: any) {
            console.error('Error getting product counts for all categories:', error);
            throw error;
        }
    }
    /**
 * Export all categories data to CSV
 */
    async exportAllCategoriesCSV(): Promise<string> {
        try {
            console.log('Exporting all categories to CSV');

            // Get all categories without pagination
            const filters: CategoryFilterDTO = {
                page: 1,
                limit: 10000 // Get all categories
            };

            const result = await this.getAllCategoriesWithFilters(filters);
            const categories = result.categories;

            // Convert to CSV
            const headers = [
                'Category ID',
                'Category Name',
                'Description',
                'Status',
                'Category Image URL',
                'Sub Categories Count',
                'Product Count',
                'Created Date',
                'Updated Date',
                'Sub Categories (ID:Name:Description:Product Count)'
            ];

            const rows = categories.map(category => {
                // Format sub-categories as a semicolon-separated string
                const subCategoriesStr = category.sub_categories.map(sub =>
                    `${sub.id}:${sub.sub_category_name}:${sub.description}:${sub.product_count || 0}`
                ).join('; ');

                return [
                    category.id,
                    `"${category.category_name.replace(/"/g, '""')}"`,
                    `"${category.description.replace(/"/g, '""')}"`,
                    category.category_status,
                    category.category_image?.file_url || '',
                    category.sub_categories_count,
                    category.product_count,
                    new Date(category.createdAt).toISOString().split('T')[0],
                    new Date(category.updatedAt).toISOString().split('T')[0],
                    `"${subCategoriesStr}"`
                ];
            });

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            console.log(`Exported ${categories.length} categories to CSV`);
            return csvContent;

        } catch (error: any) {
            console.error('Error exporting categories:', error);
            throw error;
        }
    }

    /**
     * Get product counts for all sub-categories
     */
    async getProductCountsForAllSubCategories(): Promise<Map<string, number>> {
        try {
            const counts = await CatalogueModel.aggregate([
                {
                    $group: {
                        _id: '$sub_category',
                        count: { $sum: 1 }
                    }
                }
            ]);

            const countMap = new Map<string, number>();
            counts.forEach(item => {
                if (item._id) {
                    countMap.set(item._id.toString(), item.count);
                }
            });

            console.log('Product counts by sub-category:', Object.fromEntries(countMap));
            return countMap;
        } catch (error: any) {
            console.error('Error getting product counts for all sub-categories:', error);
            throw error;
        }
    }

    /**
     * Get all categories with filters and pagination
     */
    async getAllCategoriesWithFilters(filters: CategoryFilterDTO): Promise<CategoryListResponseDTO> {
        try {
            console.log('Fetching categories with filters:', filters);

            const {
                status,
                category_name,
                page = 1,
                limit = 10
            } = filters;

            // Build query
            const query: any = {};

            if (status) {
                query.category_status = status;
            }

            if (category_name) {
                query.category_name = { $regex: category_name, $options: 'i' };
            }

            // Get total count
            const total = await CategoryModel.countDocuments(query);

            // Get categories with pagination
            const skip = (page - 1) * limit;
            const categories = await CategoryModel.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit)
                .lean();

            // Get product counts for all categories and sub-categories efficiently
            const [categoryProductCountMap, subCategoryProductCountMap] = await Promise.all([
                this.getProductCountsForAllCategories(),
                this.getProductCountsForAllSubCategories()
            ]);

            // Transform response
            const categoriesData = categories.map(category => {
                const subCategories = category.sub_categories || [];

                const productCount = categoryProductCountMap.get(category._id.toString()) || 0;

                return {
                    id: category._id.toString(),
                    category_name: category.category_name,
                    description: category.description,
                    category_status: category.category_status,
                    category_image: category.category_image,
                    sub_categories_count: subCategories.length,
                    sub_categories: subCategories.map(subCat => ({
                        id: subCat._id.toString(),
                        sub_category_name: subCat.sub_category_name,
                        description: subCat.description,
                        product_count: subCategoryProductCountMap.get(subCat._id.toString()) || 0
                    })),
                    product_count: productCount,
                    createdAt: category.createdAt,
                    updatedAt: category.updatedAt
                };
            });

            // Get stats
            const activeCount = await CategoryModel.countDocuments({ category_status: 'active' });
            const inactiveCount = await CategoryModel.countDocuments({ category_status: 'inactive' });

            return {
                categories: categoriesData,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                stats: {
                    total_categories: total,
                    active_categories: activeCount,
                    inactive_categories: inactiveCount
                }
            };

        } catch (error: any) {
            console.error('Error fetching categories with filters:', error);
            throw error;
        }
    }

    /**
     * Validate sub-category ID exists in category
     */
    async validateSubCategoryBelongsToCategory(
        categoryId: Types.ObjectId,
        subCategoryId: Types.ObjectId
    ): Promise<boolean> {
        try {
            const category = await CategoryModel.findOne({
                _id: categoryId,
                'sub_categories._id': subCategoryId
            });

            return !!category;
        } catch (error) {
            console.error('Error validating sub-category:', error);
            return false;
        }
    }

    /**
     * Get sub-category by ID
     */
    async getSubCategoryById(subCategoryId: Types.ObjectId): Promise<ISubCategory | null> {
        try {
            const category = await CategoryModel.findOne({
                'sub_categories._id': subCategoryId
            });

            if (!category) return null;

            const subCategory = category.sub_categories.find(
                sc => sc._id.toString() === subCategoryId.toString()
            );

            return subCategory || null;
        } catch (error) {
            console.error('Error getting sub-category:', error);
            return null;
        }
    }

    /**
     * Find categories by name
     */
    async findCategoriesByName(categoryName: string): Promise<ICategory[]> {
        try {
            const categories = await CategoryModel.find({
                category_name: { $regex: categoryName, $options: 'i' }
            });

            return categories;
        } catch (error) {
            console.error('Error finding categories by name:', error);
            throw error;
        }
    }
}

export class CatalogueService {
    private req: Request | null = null;

    /**
     * Set request context for audit logging
     */
    setRequestContext(req: Request): void {
        this.req = req;
    }

    /**
     * Get catalogue product by ID with populated category and sub-category details
     */
    async getCatalogueById(productId: string): Promise<ICatalogue | null> {
        try {
            console.log(`Fetching catalogue product with ID: ${productId}`);

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                throw new Error('Invalid product ID format');
            }

            const product = await CatalogueModel.findById(productId);

            if (!product) {
                console.log(`Product with ID ${productId} not found`);
                return null;
            }

            // Log view operation
            if (this.req && product) {
                await historyCatalogueService.logView(
                    this.req,
                    'catalogue',
                    product._id,
                    product.product_name
                ).catch(err => console.error('Failed to log view:', err));
            }

            console.log('Product found:', {
                id: product._id,
                sku: product.sku_id,
                name: product.product_name
            });

            return product;
        } catch (error: any) {
            console.error('Error fetching catalogue by ID:', error);
            throw error;
        }
    }

    /**
     * Update catalogue product by ID
     */
    async updateCatalogue(
        productId: string,
        updateData: Partial<CreateCatalogueDTO>
    ): Promise<ICatalogue> {
        try {
            console.log(`Updating catalogue product ${productId} with data:`, updateData);

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                throw new Error('Invalid product ID format');
            }

            // Check if product exists
            const existingProduct = await CatalogueModel.findById(productId);
            if (!existingProduct) {
                throw new Error('Product not found');
            }

            // If updating SKU, check for duplicates
            if (updateData.sku_id && updateData.sku_id !== existingProduct.sku_id) {
                const duplicateSku = await CatalogueModel.findOne({
                    _id: { $ne: productId },
                    sku_id: updateData.sku_id
                });

                if (duplicateSku) {
                    throw new Error('Product with this SKU already exists');
                }
            }

            // If updating barcode, check for duplicates
            if (updateData.barcode && updateData.barcode !== existingProduct.barcode) {
                const duplicateBarcode = await CatalogueModel.findOne({
                    _id: { $ne: productId },
                    barcode: updateData.barcode
                });

                if (duplicateBarcode) {
                    throw new Error('Product with this barcode already exists');
                }
            }

            // If updating category or sub-category, validate the relationship
            if (updateData.category || updateData.sub_category) {
                const categoryId = updateData.category || existingProduct.category;
                const subCategoryId = updateData.sub_category || existingProduct.sub_category;

                // Validate category_id format
                if (!mongoose.Types.ObjectId.isValid(categoryId.toString())) {
                    throw new Error('Invalid category ID format');
                }

                // Validate sub_category_id format
                if (!mongoose.Types.ObjectId.isValid(subCategoryId.toString())) {
                    throw new Error('Invalid sub-category ID format');
                }

                // Find the category
                const category = await CategoryModel.findById(categoryId);
                if (!category) {
                    throw new Error(`Category with ID "${categoryId}" not found`);
                }

                // Validate that sub_category_id belongs to the category
                const categoryService = new CategoryService();
                const subCategoryBelongsToCategory = await categoryService.validateSubCategoryBelongsToCategory(
                    categoryId as Types.ObjectId,
                    subCategoryId as Types.ObjectId
                );

                if (!subCategoryBelongsToCategory) {
                    throw new Error(
                        `Sub-category with ID "${subCategoryId}" does not belong to category "${category.category_name}"`
                    );
                }
            }

            // Validate prices if being updated
            if (updateData.base_price !== undefined && updateData.base_price < 0) {
                throw new Error('Base price cannot be negative');
            }

            if (updateData.final_price !== undefined && updateData.final_price < 0) {
                throw new Error('Final price cannot be negative');
            }

            if (updateData.base_price !== undefined || updateData.final_price !== undefined) {
                const basePrice = updateData.base_price ?? existingProduct.base_price;
                const finalPrice = updateData.final_price ?? existingProduct.final_price;

                if (finalPrice < basePrice) {
                    throw new Error('Final price cannot be less than base price');
                }
            }

            // Validate expiry threshold if being updated
            if (updateData.expiry_alert_threshold !== undefined) {
                if (updateData.expiry_alert_threshold < 1 || updateData.expiry_alert_threshold > 365) {
                    throw new Error('Expiry alert threshold must be between 1 and 365 days');
                }
            }

            // Validate images if being updated
            if (updateData.product_images) {
                if (!Array.isArray(updateData.product_images) || updateData.product_images.length === 0) {
                    throw new Error('At least one image is required');
                }

                if (updateData.product_images.length > 10) {
                    throw new Error('Maximum 10 images allowed');
                }
            }

            // Store before state for audit
            const beforeState = existingProduct.toObject();

            // Update product
            const updatedProduct = await CatalogueModel.findByIdAndUpdate(
                productId,
                { $set: updateData },
                { new: true, runValidators: true }
            );

            if (!updatedProduct) {
                throw new Error('Failed to update product');
            }

            // Log update operation
            if (this.req) {
                await historyCatalogueService.logUpdate(
                    this.req,
                    'catalogue',
                    updatedProduct._id,
                    updatedProduct.product_name,
                    beforeState,
                    updatedProduct.toObject()
                ).catch(err => console.error('Failed to log update:', err));
            }

            console.log('Product updated successfully:', {
                id: updatedProduct._id,
                sku: updatedProduct.sku_id,
                name: updatedProduct.product_name
            });

            return updatedProduct;
        } catch (error: any) {
            console.error('Error updating catalogue:', error);

            // Log failed operation
            if (this.req) {
                const product = await CatalogueModel.findById(productId);
                if (product) {
                    await historyCatalogueService.logUpdate(
                        this.req,
                        'catalogue',
                        product._id,
                        product.product_name,
                        {},
                        {},
                        'failed',
                        error.message
                    ).catch(err => console.error('Failed to log failed update:', err));
                }
            }

            throw error;
        }
    }

    /**
     * Delete catalogue product by ID
     */
    async deleteCatalogue(productId: string): Promise<{
        success: boolean;
        message: string;
        deletedProduct?: {
            sku_id: string;
            product_name: string;
        };
    }> {
        try {
            console.log(`Attempting to delete catalogue product ${productId}`);

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                throw new Error('Invalid product ID format');
            }

            // Check if product exists
            const product = await CatalogueModel.findById(productId);
            if (!product) {
                throw new Error('Product not found');
            }

            // Store product info before deletion
            const productInfo = {
                sku_id: product.sku_id,
                product_name: product.product_name
            };

            // Store before state for audit
            const beforeState = product.toObject();

            // Delete the product
            await CatalogueModel.findByIdAndDelete(productId);

            // Log delete operation
            if (this.req) {
                await historyCatalogueService.logDelete(
                    this.req,
                    'catalogue',
                    product._id,
                    product.product_name,
                    beforeState
                ).catch(err => console.error('Failed to log delete:', err));
            }

            console.log('Product deleted successfully:', {
                id: productId,
                sku: productInfo.sku_id,
                name: productInfo.product_name
            });

            return {
                success: true,
                message: 'Product deleted successfully',
                deletedProduct: productInfo
            };
        } catch (error: any) {
            console.error('Error deleting catalogue:', error);

            // Log failed operation
            if (this.req) {
                const product = await CatalogueModel.findById(productId);
                if (product) {
                    await historyCatalogueService.logDelete(
                        this.req,
                        'catalogue',
                        product._id,
                        product.product_name,
                        {},
                        'failed',
                        error.message
                    ).catch(err => console.error('Failed to log failed delete:', err));
                }
            }

            throw error;
        }
    }
    // Add these export functions to your CatalogueService class:

    /**
     * Export all catalogue data to CSV
     */
    async exportAllCataloguesCSV(): Promise<string> {
        try {
            console.log('Exporting all catalogues to CSV');

            // Get all catalogues without pagination
            const filters: DashboardFilterDTO = {
                page: 1,
                limit: 10000 // Get all catalogues
            };

            const catalogueData = await this.getDashboardData(filters);
            const products = catalogueData.products;

            // Convert to CSV with detailed information
            const headers = [
                'SKU ID',
                'Product Name',
                'Brand Name',
                'Category ID',
                'Category Name',
                'Sub Category ID',
                'Sub Category Name',
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

            const rows = products.map(product => [
                product.sku_id,
                `"${product.product_name.replace(/"/g, '""')}"`,
                `"${product.brand_name.replace(/"/g, '""')}"`,
                product.category.id,
                `"${product.category.name.replace(/"/g, '""')}"`,
                product.sub_category.id,
                `"${product.sub_category.name.replace(/"/g, '""')}"`,
                `"${(product.description || '').replace(/"/g, '""')}"`,
                `"${(product.manufacturer_name || '').replace(/"/g, '""')}"`,
                `"${(product.manufacturer_address || '').replace(/"/g, '""')}"`,
                product.shell_life || '',
                product.expiry_alert_threshold || '',
                product.tages_label || '',
                product.unit_size || '',
                product.base_price,
                product.final_price,
                product.barcode,
                `"${(product.nutrition_information || '').replace(/"/g, '""')}"`,
                `"${(product.ingredients || '').replace(/"/g, '""')}"`,
                product.status,
                new Date(product.createdAt).toISOString().split('T')[0],
                product.updatedAt ? new Date(product.updatedAt).toISOString().split('T')[0] : ''
            ]);

            const csvContent = [
                headers.join(','),
                ...rows.map(row => row.join(','))
            ].join('\n');

            console.log(`Exported ${products.length} catalogue products to CSV`);
            return csvContent;

        } catch (error: any) {
            console.error('Error exporting catalogues:', error);
            throw error;
        }
    }

    /**
     * Export combined categories and catalogues data
     */
    async exportCombinedData(): Promise<{
        summary: {
            total_categories: number;
            total_products: number;
            export_date: string;
        };
        categories: any[];
        products: any[];
    }> {
        try {
            console.log('Exporting combined categories and catalogues data');

            // Get category service instance
            const categoryService = new CategoryService();

            // Get all categories
            const categoryFilters: CategoryFilterDTO = {
                page: 1,
                limit: 10000
            };
            const categoriesResult = await categoryService.getAllCategoriesWithFilters(categoryFilters);
            const categories = categoriesResult.categories;

            // Get all catalogues
            const catalogueFilters: DashboardFilterDTO = {
                page: 1,
                limit: 10000
            };
            const catalogueData = await this.getDashboardData(catalogueFilters);
            const products = catalogueData.products;

            // Format categories for export
            const formattedCategories = categories.map(cat => ({
                id: cat.id,
                name: cat.category_name,
                description: cat.description,
                status: cat.category_status,
                image_url: cat.category_image?.file_url || '',
                sub_categories_count: cat.sub_categories_count,
                product_count: cat.product_count,
                sub_categories: cat.sub_categories.map(sub => ({
                    id: sub.id,
                    name: sub.sub_category_name,
                    description: sub.description,
                    product_count: sub.product_count || 0
                })),
                created_at: cat.createdAt,
                updated_at: cat.updatedAt
            }));

            // Format products for export
            const formattedProducts = products.map(prod => ({
                sku_id: prod.sku_id,
                product_name: prod.product_name,
                brand_name: prod.brand_name,
                category_id: prod.category.id,
                category_name: prod.category.name || '',
                sub_category_id: prod.sub_category.id,
                sub_category_name: prod.sub_category.name || '',
                description: prod.description || '',
                manufacturer_name: prod.manufacturer_name || '',
                manufacturer_address: prod.manufacturer_address || '',
                shell_life: prod.shell_life || '',
                expiry_alert_threshold: prod.expiry_alert_threshold || '',
                tags_label: prod.tages_label || '',
                unit_size: prod.unit_size || '',
                base_price: prod.base_price,
                final_price: prod.final_price,
                barcode: prod.barcode,
                nutrition_information: prod.nutrition_information || '',
                ingredients: prod.ingredients || '',
                status: prod.status,
                image_count: prod.product_images?.length || 0,
                created_at: prod.createdAt,
                updated_at: prod.updatedAt || ''
            }));

            return {
                summary: {
                    total_categories: categories.length,
                    total_products: products.length,
                    export_date: new Date().toISOString()
                },
                categories: formattedCategories,
                products: formattedProducts
            };

        } catch (error: any) {
            console.error('Error exporting combined data:', error);
            throw error;
        }
    }

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

            // Build aggregation pipeline
            const pipeline: any[] = [];

            // Step 1: Match stage for catalogue filters
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

            // Step 2: Lookup to join with categories
            pipeline.push({
                $lookup: {
                    from: 'categories',
                    localField: 'category',
                    foreignField: '_id',
                    as: 'categoryInfo'
                }
            });

            // Step 3: Unwind category array
            pipeline.push({
                $unwind: {
                    path: '$categoryInfo',
                    preserveNullAndEmptyArrays: true
                }
            });

            // Step 4: Lookup sub-category information
            pipeline.push({
                $addFields: {
                    sub_category_obj: {
                        $filter: {
                            input: '$categoryInfo.sub_categories',
                            as: 'subCat',
                            cond: { $eq: ['$$subCat._id', '$sub_category'] }
                        }
                    }
                }
            });

            // Step 5: Unwind sub-category array
            pipeline.push({
                $unwind: {
                    path: '$sub_category_obj',
                    preserveNullAndEmptyArrays: true
                }
            });

            // Step 6: Filter by category name (after lookup)
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

            // Step 7: Project required fields
            pipeline.push({
                $project: {
                    sku_id: 1,
                    product_name: 1,
                    category: {
                        id: '$categoryInfo._id',
                        name: '$categoryInfo.category_name'
                    },
                    sub_category: {
                        id: '$sub_category',
                        name: '$sub_category_obj.sub_category_name'
                    },
                    brand_name: 1,
                    description: 1,
                    manufacturer_name: 1,
                    manufacturer_address: 1,
                    shell_life: 1,
                    expiry_alert_threshold: 1,
                    tages_label: 1,
                    unit_size: 1,
                    base_price: 1,
                    final_price: 1,
                    barcode: 1,
                    nutrition_information: 1,
                    ingredients: 1,
                    status: 1,
                    product_images: 1,
                    createdAt: 1,
                    updatedAt: 1
                }
            });

            // Step 8: Count total documents
            const countPipeline = [...pipeline];
            countPipeline.push({ $count: 'total' });

            const [countResult] = await CatalogueModel.aggregate(countPipeline);
            const total = countResult ? countResult.total : 0;

            // Step 9: Sort
            const sortStage: any = {};
            const sortFieldMap: Record<string, string> = {
                'product_name': 'product_name',
                'base_price': 'final_price',
                'createdAt': 'createdAt'
            };

            const sortField = sortFieldMap[sort_by] || 'createdAt';
            sortStage[sortField] = sort_order === 'asc' ? 1 : -1;
            pipeline.push({ $sort: sortStage });

            // Step 10: Skip and limit for pagination
            const skip = (page - 1) * limit;
            pipeline.push({ $skip: skip });
            pipeline.push({ $limit: limit });

            // Step 11: Execute aggregation
            const products = await CatalogueModel.aggregate(pipeline);

            return {
                products,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
                filters
            };

        } catch (error: any) {
            console.error('Error fetching dashboard data:', error);
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
     * Create a new catalogue product with category ID and sub-category ID
     */
    async createCatalogue(productData: CreateCatalogueDTO): Promise<ICatalogue> {
        try {
            console.log('Creating catalogue with category and sub-category IDs:', {
                category: productData.category,
                sub_category: productData.sub_category
            });

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

            // Validate category format
            if (!mongoose.Types.ObjectId.isValid(productData.category.toString())) {
                throw new Error('Invalid category ID format');
            }

            // Validate sub_category format
            if (!mongoose.Types.ObjectId.isValid(productData.sub_category.toString())) {
                throw new Error('Invalid sub-category ID format');
            }

            // Find category by ID
            const category = await CategoryModel.findById(productData.category);

            if (!category) {
                throw new Error(`Category with ID "${productData.category}" not found. Please provide a valid category ID.`);
            }

            console.log('Found category:', {
                id: category._id,
                name: category.category_name,
                sub_categories_count: category.sub_categories?.length || 0
            });

            // Validate that sub_category belongs to this category
            const categoryService = new CategoryService();
            const subCategoryBelongsToCategory = await categoryService.validateSubCategoryBelongsToCategory(
                productData.category,
                productData.sub_category
            );

            if (!subCategoryBelongsToCategory) {
                throw new Error(
                    `Sub-category with ID "${productData.sub_category}" does not belong to category "${category.category_name}".`
                );
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
            if (!Array.isArray(productData.product_images) || productData.product_images.length === 0) {
                throw new Error('At least one image is required');
            }

            if (productData.product_images.length > 10) {
                throw new Error('Maximum 10 images allowed');
            }

            // Create and save the product
            const product = new CatalogueModel(productData);
            const savedProduct = await product.save();

            // Log create operation
            if (this.req) {
                await historyCatalogueService.logCreate(
                    this.req,
                    'catalogue',
                    savedProduct._id,
                    savedProduct.product_name,
                    savedProduct.toObject()
                ).catch(err => console.error('Failed to log create:', err));
            }

            console.log('Catalogue created successfully with ID:', savedProduct._id);
            return savedProduct;

        } catch (error: any) {
            console.error('Error creating catalogue:', {
                message: error.message,
                stack: error.stack
            });

            // Log failed create operation
            if (this.req) {
                await historyCatalogueService.logCreate(
                    this.req,
                    'catalogue',
                    new mongoose.Types.ObjectId(),
                    productData.product_name,
                    productData,
                    'failed',
                    error.message
                ).catch(err => console.error('Failed to log failed create:', err));
            }

            throw error;
        }
    }

    /**
     * Validate catalogue data
     */
    validateCatalogueData(data: Partial<CreateCatalogueDTO>): { isValid: boolean; errors: string[] } {
        const errors: string[] = [];

        // Required fields (now using category and sub_category directly)
        const requiredFields = [
            'sku_id', 'product_name', 'brand_name', 'description',
            'category', 'sub_category', 'manufacturer_name',
            'manufacturer_address', 'shell_life', 'expiry_alert_threshold',
            'tages_label', 'unit_size', 'base_price', 'final_price',
            'barcode', 'nutrition_information', 'ingredients', 'product_images'
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

        if (data.product_images) {
            if (!Array.isArray(data.product_images)) {
                errors.push('Product images must be an array');
            } else if (data.product_images.length === 0) {
                errors.push('At least one product image is required');
            } else if (data.product_images.length > 10) {
                errors.push('Maximum 10 product images allowed');
            }
        }

        if (data.status && !['active', 'inactive'].includes(data.status)) {
            errors.push('Status must be either "active" or "inactive"');
        }

        // Validate ObjectId formats
        if (data.category && !mongoose.Types.ObjectId.isValid(data.category.toString())) {
            errors.push('Invalid category ID format');
        }

        if (data.sub_category && !mongoose.Types.ObjectId.isValid(data.sub_category.toString())) {
            errors.push('Invalid sub-category ID format');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    }
}

// Export instances with context-aware factories
export const createCategoryService = (req?: Request): CategoryService => {
    const service = new CategoryService();
    if (req) service.setRequestContext(req);
    return service;
};

export const createCatalogueService = (req?: Request): CatalogueService => {
    const service = new CatalogueService();
    if (req) service.setRequestContext(req);
    return service;
};

// Legacy exports for backward compatibility
export const categoryService = new CategoryService();
export const catalogueService = new CatalogueService();