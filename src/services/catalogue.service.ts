import mongoose from 'mongoose';
import { CatalogueModel, ICatalogue, CategoryModel, ICategory } from '../models/Catalogue.model';
import { historyCatalogueService } from './historyCatalogue.service';
import { Request } from 'express';

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

// CATALOGUE DTOs
export interface CreateCatalogueDTO {
    [x: string]: any;
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

export class CategoryService {
    private req: Request | null = null;

    /**
     * Set request context for audit logging
     */
    setRequestContext(req: Request): void {
        this.req = req;
    }

    /**
     * Get category by ID with full details
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
                status: category.category_status
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
            if (updateData.category_name || updateData.sub_details?.sub_categories) {
                const nameToCheck = updateData.category_name || existingCategory.category_name;
                const subCategoriesToCheck = updateData.sub_details?.sub_categories || 
                    existingCategory.sub_details.sub_categories;

                const duplicateCategory = await CategoryModel.findOne({
                    _id: { $ne: categoryId }, // Exclude current category
                    category_name: nameToCheck,
                    'sub_details.sub_categories': subCategoriesToCheck
                });

                if (duplicateCategory) {
                    throw new Error(
                        `Category "${nameToCheck}" with sub-categories "${subCategoriesToCheck}" already exists`
                    );
                }
            }

            // Prepare update object
            const updateObject: any = {};
            
            if (updateData.category_name) updateObject.category_name = updateData.category_name;
            if (updateData.description) updateObject.description = updateData.description;
            if (updateData.category_image) updateObject.category_image = updateData.category_image;
            if (updateData.category_status) updateObject.category_status = updateData.category_status;
            
            if (updateData.sub_details) {
                updateObject['sub_details.sub_categories'] = updateData.sub_details.sub_categories;
                updateObject['sub_details.description_sub_category'] = updateData.sub_details.description_sub_category;
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
                name: updatedCategory.category_name
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

            // Check if any catalogue items are using this category
            const catalogueCount = await CatalogueModel.countDocuments({
                category: category.category_name
            });

            if (catalogueCount > 0) {
                throw new Error(
                    `Cannot delete category. ${catalogueCount} catalogue item(s) are using this category. ` +
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
                affectedCatalogues: 0
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

export class CatalogueService {
    private req: Request | null = null;

    /**
     * Set request context for audit logging
     */
    setRequestContext(req: Request): void {
        this.req = req;
    }

    /**
     * Get catalogue product by ID with full details
     */
    async getCatalogueById(productId: string): Promise<ICatalogue | null> {
        try {
            console.log(`Fetching catalogue product with ID: ${productId}`);

            if (!mongoose.Types.ObjectId.isValid(productId)) {
                throw new Error('Invalid product ID format');
            }

            const product = await CatalogueModel.findById(productId).lean();

            if (!product) {
                console.log(`Product with ID ${productId} not found`);
                return null;
            }

            // Resolve category name if it's stored as ObjectId
            let categoryName = 'Unknown';
            if (product.category) {
                if (mongoose.Types.ObjectId.isValid(product.category.toString())) {
                    const category = await CategoryModel.findById(product.category);
                    categoryName = category?.category_name || 'Unknown';
                } else {
                    categoryName = product.category.toString();
                }
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
                name: product.product_name,
                category: categoryName
            });

            return {
                ...product,
                category: categoryName
            } as any;
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

            // If updating category or sub_category, validate them
            if (updateData.category) {
                const category = await CategoryModel.findOne({
                    category_name: updateData.category
                });

                if (!category) {
                    throw new Error(`Category "${updateData.category}" not found`);
                }

                // If sub_category is also being updated or exists
                const subCategoryToCheck = updateData.sub_category || existingProduct.sub_category;
                if (subCategoryToCheck) {
                    const subCategories = category.sub_details.sub_categories
                        .split(',')
                        .map(s => s.trim());
                    
                    if (!subCategories.includes(subCategoryToCheck)) {
                        throw new Error(
                            `Sub-category "${subCategoryToCheck}" not found in category "${updateData.category}"`
                        );
                    }
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
            if (updateData.images) {
                if (!Array.isArray(updateData.images) || updateData.images.length === 0) {
                    throw new Error('At least one image is required');
                }

                if (updateData.images.length > 10) {
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
                    product_images: product.product_images,
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
     * Create a new catalogue product with category name
     */
    async createCatalogue(productData: CreateCatalogueDTO): Promise<ICatalogue> {
        try {
            console.log('Creating catalogue with category name:', productData.category);

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

            // Find category by name (assuming category field contains category name string)
            const category = await CategoryModel.findOne({ 
                category_name: productData.category 
            });
            
            if (!category) {
                throw new Error(`Category "${productData.category}" not found. Please create the category first.`);
            }

            console.log('Found category:', {
                id: category._id,
                name: category.category_name,
                sub_categories: category.sub_details.sub_categories
            });

            // Validate sub_category belongs to the category
            // Note: sub_details.sub_categories is a string like "burger,pizza,samosa"
            const subCategoriesArray = category.sub_details.sub_categories
                .split(',')
                .map(s => s.trim());
            
            if (!subCategoriesArray.includes(productData.sub_category)) {
                throw new Error(
                    `Sub-category "${productData.sub_category}" not found in category "${productData.category}". ` +
                    `Available sub-categories: ${subCategoriesArray.join(', ')}`
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
            if (!Array.isArray(productData.images) || productData.images.length === 0) {
                throw new Error('At least one image is required');
            }

            if (productData.images.length > 10) {
                throw new Error('Maximum 10 images allowed');
            }

            // Prepare catalogue data with category ObjectId
            const catalogueData = {
                sku_id: productData.sku_id,
                product_name: productData.product_name,
                brand_name: productData.brand_name,
                description: productData.description,
                category: category._id, // Use the category's ObjectId
                sub_category: productData.sub_category,
                manufacturer_name: productData.manufacturer_name,
                manufacturer_address: productData.manufacturer_address,
                shell_life: productData.shell_life,
                expiry_alert_threshold: productData.expiry_alert_threshold,
                tages_label: productData.tages_label,
                unit_size: productData.unit_size,
                base_price: productData.base_price,
                final_price: productData.final_price,
                barcode: productData.barcode,
                nutrition_information: productData.nutrition_information,
                ingredients: productData.ingredients,
                images: productData.images,
                status: productData.status || 'active',
                createdBy: productData.createdBy
            };

            console.log('Creating catalogue with data:', {
                sku_id: catalogueData.sku_id,
                category_id: catalogueData.category,
                sub_category: catalogueData.sub_category
            });

            // Create and save the product
            const product = new CatalogueModel(catalogueData);
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