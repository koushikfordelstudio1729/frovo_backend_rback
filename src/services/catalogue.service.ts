import mongoose from "mongoose";
import {
  CatalogueModel,
  ICatalogue,
  CategoryModel,
  ICategory,
  SubCategoryModel,
  ISubCategory,
} from "../models/Catalogue.model";
import { historyCatalogueService } from "./historyCatalogue.service";
import { Request } from "express";
import { ImageUploadService } from "./catalogueFileUpload.service";

// Image upload service instance for deleting images from storage
const imageUploadService = new ImageUploadService();

// ==================== DTOs ====================

// CATEGORY DTOs
export interface CreateCategoryDTO {
  category_name: string;
  description: string;
  category_image: any[];
  category_status?: "active" | "inactive";
}

export type UpdateCategoryDTO = Partial<CreateCategoryDTO>;

// SUB-CATEGORY DTOs
export interface CreateSubCategoryDTO {
  sub_category_name: string;
  description: string;
  category_id: string;
  sub_category_image?: any[]; // Array of images (matches model field name)
  sub_category_status?: "active" | "inactive";
}

export type UpdateSubCategoryDTO = Partial<CreateSubCategoryDTO>;

// CATALOGUE DTOs
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
  product_images: any[];
  status?: "active" | "inactive";
}

export type UpdateCatalogueDTO = Partial<CreateCatalogueDTO>;

// FILTER DTOs
export interface CategoryFilterDTO {
  status?: "active" | "inactive";
  category_name?: string;
  page?: number;
  limit?: number;
}

export interface SubCategoryFilterDTO {
  status?: "active" | "inactive";
  category_id?: string;
  sub_category_name?: string;
  page?: number;
  limit?: number;
}

export interface DashboardFilterDTO {
  category?: string;
  brand_name?: string;
  status?: "active" | "inactive";
  min_price?: number;
  max_price?: number;
  search?: string;
  page?: number;
  limit?: number;
  sort_by?: "product_name" | "base_price" | "createdAt";
  sort_order?: "asc" | "desc";
}

// RESPONSE DTOs
export interface CategoryListResponseDTO {
  categories: Array<{
    id: string;
    category_name: string;
    description: string;
    category_status: "active" | "inactive";
    category_image: any;
    sub_categories_count: number;
    product_count: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface SubCategoryListResponseDTO {
  sub_categories: Array<{
    id: string;
    sub_category_name: string;
    description: string;
    category_id: string;
    category_name: string;
    sub_category_status: "active" | "inactive";
    sub_category_image: any;
    product_count: number;
    createdAt: Date;
    updatedAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
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
    status: "active" | "inactive";
    product_images: any[];
    createdAt: Date;
  }>;
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  filters: DashboardFilterDTO;
}

export interface CategoryStatsDTO {
  total_categories: number;
  active_categories: number;
  inactive_categories: number;
  total_sub_categories: number;
  active_sub_categories: number;
  inactive_sub_categories: number;
  total_products: number;
  categories_with_subcategories: Array<{
    category_name: string;
    sub_categories_count: number;
    product_count: number;
  }>;
}

// ==================== CATEGORY SERVICE ====================

export class CategoryService {
  private req: Request | null = null;

  setRequestContext(req: Request): void {
    this.req = req;
  }

  // Create Category
  async createCategory(categoryData: CreateCategoryDTO): Promise<ICategory> {
    try {
      console.log("Creating category:", categoryData.category_name);

      // Check if category already exists
      const existingCategory = await CategoryModel.findOne({
        category_name: { $regex: new RegExp(`^${categoryData.category_name}$`, "i") },
      });

      if (existingCategory) {
        throw new Error(`Category "${categoryData.category_name}" already exists`);
      }

      // Validate that at least one image is provided
      if (!categoryData.category_image || categoryData.category_image.length === 0) {
        throw new Error("At least one category image is required");
      }

      // Validate maximum number of images
      const maxImages = parseInt(process.env.MAX_CATEGORY_IMAGES || "10");
      if (categoryData.category_image.length > maxImages) {
        throw new Error(`Maximum ${maxImages} category images allowed`);
      }

      // Create and save category
      const category = new CategoryModel(categoryData);
      const savedCategory = await category.save();

      // Log create operation
      if (this.req) {
        await historyCatalogueService
          .logCreate(
            this.req,
            "category",
            savedCategory._id,
            savedCategory.category_name,
            savedCategory.toObject()
          )
          .catch(err => console.error("Failed to log create:", err));
      }

      console.log("Category created successfully:", {
        id: savedCategory._id,
        name: savedCategory.category_name,
        imagesCount: savedCategory.category_image.length,
      });
      return savedCategory;
    } catch (error: any) {
      console.error("Error creating category:", error);

      // Log failed operation
      if (this.req) {
        await historyCatalogueService
          .logCreate(
            this.req,
            "category",
            new mongoose.Types.ObjectId(),
            categoryData.category_name,
            categoryData,
            "failed",
            error.message
          )
          .catch(err => console.error("Failed to log failed create:", err));
      }

      throw error;
    }
  }
  // Add this method to your CategoryService class
  async getCategoryWithSubCategories(categoryId: string): Promise<any> {
    try {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new Error("Invalid category ID format");
      }

      // Get category
      const category = await CategoryModel.findById(categoryId);
      if (!category) {
        throw new Error("Category not found");
      }

      // Get all sub-categories for this category
      const subCategories = await SubCategoryModel.find({
        category_id: categoryId,
      }).lean();

      // Get product count for category
      const productCount = await CatalogueModel.countDocuments({
        category: categoryId,
      });

      // Get product counts for each sub-category
      const subCategoryIds = subCategories.map(sc => sc._id);
      const subCategoryProductCounts = new Map<string, number>();

      if (subCategoryIds.length > 0) {
        const counts = await CatalogueModel.aggregate([
          {
            $match: {
              sub_category: { $in: subCategoryIds },
            },
          },
          {
            $group: {
              _id: "$sub_category",
              count: { $sum: 1 },
            },
          },
        ]);

        counts.forEach(item => {
          subCategoryProductCounts.set(item._id.toString(), item.count);
        });
      }

      return {
        category: {
          _id: category._id,
          category_name: category.category_name,
          description: category.description,
          category_status: category.category_status,
          category_image: category.category_image,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        },
        sub_categories: subCategories.map(subCat => ({
          _id: subCat._id,
          sub_category_name: subCat.sub_category_name,
          description: subCat.description,
          sub_category_status: subCat.sub_category_status,
          sub_category_image: subCat.sub_category_image,
          product_count: subCategoryProductCounts.get(subCat._id.toString()) || 0,
          createdAt: subCat.createdAt,
          updatedAt: subCat.updatedAt,
        })),
        product_count: productCount,
        sub_categories_count: subCategories.length,
      };
    } catch (error: any) {
      console.error("Error getting category with sub-categories:", error);
      throw error;
    }
  }
  // Get Category by ID
  async getCategoryById(categoryId: string): Promise<ICategory | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new Error("Invalid category ID format");
      }

      const category = await CategoryModel.findById(categoryId);

      // Log view operation
      if (this.req && category) {
        await historyCatalogueService
          .logView(this.req, "category", category._id, category.category_name)
          .catch(err => console.error("Failed to log view:", err));
      }

      return category;
    } catch (error: any) {
      console.error("Error fetching category by ID:", error);
      throw error;
    }
  }

  // Get All Categories with Filters
  async getAllCategoriesWithFilters(filters: CategoryFilterDTO): Promise<CategoryListResponseDTO> {
    try {
      const { status, category_name, page = 1, limit = 10 } = filters;

      // Build query
      const query: any = {};

      if (status) {
        query.category_status = status;
      }

      if (category_name) {
        query.category_name = { $regex: category_name, $options: "i" };
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

      // Get sub-categories and counts for each category
      const categoriesWithSubCategories = await Promise.all(
        categories.map(async category => {
          // Get sub-categories for this category
          const subCategories = await SubCategoryModel.find({
            category_id: category._id,
          }).lean();

          const productCount = await CatalogueModel.countDocuments({
            category: category._id,
          });

          return {
            id: category._id.toString(),
            category_name: category.category_name,
            description: category.description,
            category_status: category.category_status,
            category_image: category.category_image,
            createdAt: category.createdAt,
            updatedAt: category.updatedAt,
            sub_categories: subCategories.map(subCat => ({
              id: subCat._id.toString(),
              sub_category_name: subCat.sub_category_name,
              description: subCat.description,
              sub_category_status: subCat.sub_category_status,
              sub_category_image: subCat.sub_category_image,
              createdAt: subCat.createdAt,
              updatedAt: subCat.updatedAt,
            })),
            sub_categories_count: subCategories.length,
            product_count: productCount,
          };
        })
      );

      return {
        categories: categoriesWithSubCategories,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      console.error("Error fetching categories with filters:", error);
      throw error;
    }
  }

  // Update Category
  async updateCategory(categoryId: string, updateData: UpdateCategoryDTO): Promise<ICategory> {
    try {
      console.log(`Updating category ${categoryId} with data:`, updateData);

      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new Error("Invalid category ID format");
      }

      // Check if category exists
      const existingCategory = await CategoryModel.findById(categoryId);
      if (!existingCategory) {
        throw new Error("Category not found");
      }

      // If updating category_name, check for duplicates
      if (updateData.category_name && updateData.category_name !== existingCategory.category_name) {
        const duplicateCategory = await CategoryModel.findOne({
          _id: { $ne: categoryId },
          category_name: { $regex: new RegExp(`^${updateData.category_name}$`, "i") },
        });

        if (duplicateCategory) {
          throw new Error(`Category "${updateData.category_name}" already exists`);
        }
      }

      // Validate images if being updated
      if (updateData.category_image) {
        if (!Array.isArray(updateData.category_image)) {
          throw new Error("Category images must be an array");
        }

        const maxImages = parseInt(process.env.MAX_CATEGORY_IMAGES || "10");
        if (updateData.category_image.length > maxImages) {
          throw new Error(`Maximum ${maxImages} category images allowed`);
        }

        if (updateData.category_image.length === 0) {
          throw new Error("At least one category image is required");
        }
      }

      // Store before state for audit
      const beforeState = existingCategory.toObject();

      // Update category
      const updatedCategory = await CategoryModel.findByIdAndUpdate(
        categoryId,
        { $set: updateData },
        { new: true, runValidators: true }
      );

      if (!updatedCategory) {
        throw new Error("Failed to update category");
      }

      // Log update operation
      if (this.req) {
        await historyCatalogueService
          .logUpdate(
            this.req,
            "category",
            updatedCategory._id,
            updatedCategory.category_name,
            beforeState,
            updatedCategory.toObject()
          )
          .catch(err => console.error("Failed to log update:", err));
      }

      console.log("Category updated successfully:", {
        id: updatedCategory._id,
        name: updatedCategory.category_name,
        imagesCount: updatedCategory.category_image.length,
      });

      return updatedCategory;
    } catch (error: any) {
      console.error("Error updating category:", error);

      // Log failed operation
      if (this.req) {
        const category = await CategoryModel.findById(categoryId);
        if (category) {
          await historyCatalogueService
            .logUpdate(
              this.req,
              "category",
              category._id,
              category.category_name,
              {},
              {},
              "failed",
              error.message
            )
            .catch(err => console.error("Failed to log failed update:", err));
        }
      }

      throw error;
    }
  }

  // Delete Category
  async deleteCategory(categoryId: string): Promise<{
    success: boolean;
    message: string;
    deletedSubCategories: number;
    affectedCatalogues: number;
  }> {
    const session = await mongoose.startSession();
    session.startTransaction();

    try {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new Error("Invalid category ID format");
      }

      // Check if category exists
      const category = await CategoryModel.findById(categoryId).session(session);
      if (!category) {
        throw new Error("Category not found");
      }

      // Check if category has sub-categories
      const subCategoriesCount = await SubCategoryModel.countDocuments({
        category_id: categoryId,
      }).session(session);

      // Check if category is used in catalogue
      const catalogueCount = await CatalogueModel.countDocuments({
        category: categoryId,
      }).session(session);

      if (catalogueCount > 0) {
        throw new Error(
          `Cannot delete category. ${catalogueCount} catalogue item(s) are using this category.`
        );
      }

      // Collect image public IDs to delete from storage
      const imagePublicIds: string[] = [];

      // Debug: Log category data
      console.log("Category to delete:", {
        id: category._id,
        name: category.category_name,
        hasImages: !!category.category_image,
        imageCount: category.category_image?.length || 0,
        images: category.category_image,
      });

      // Collect category images
      if (category.category_image && category.category_image.length > 0) {
        category.category_image.forEach((img: any) => {
          console.log("Found image:", img);
          if (img.cloudinary_public_id) {
            imagePublicIds.push(img.cloudinary_public_id);
          }
        });
      }

      // Collect sub-category images before deleting
      let deletedSubCategories = 0;
      if (subCategoriesCount > 0) {
        const subCategories = await SubCategoryModel.find({
          category_id: categoryId,
        }).session(session);

        // Collect all sub-category images
        subCategories.forEach((subCat: any) => {
          if (subCat.sub_category_image && subCat.sub_category_image.length > 0) {
            subCat.sub_category_image.forEach((img: any) => {
              if (img.cloudinary_public_id) {
                imagePublicIds.push(img.cloudinary_public_id);
              }
            });
          }
        });

        // Delete all sub-categories
        const deleteResult = await SubCategoryModel.deleteMany({
          category_id: categoryId,
        }).session(session);
        deletedSubCategories = deleteResult.deletedCount || 0;
      }

      // Delete the category
      await CategoryModel.findByIdAndDelete(categoryId).session(session);

      // Log delete operation
      if (this.req) {
        await historyCatalogueService
          .logDelete(
            this.req,
            "category",
            category._id,
            category.category_name,
            category.toObject()
          )
          .catch(err => console.error("Failed to log delete:", err));
      }

      await session.commitTransaction();

      // Delete images from storage after successful transaction
      if (imagePublicIds.length > 0) {
        console.log(`Deleting ${imagePublicIds.length} images from storage:`, imagePublicIds);
        await imageUploadService
          .deleteMultipleFiles(imagePublicIds)
          .catch(err => console.error("Failed to delete images from storage:", err));
      }

      return {
        success: true,
        message: "Category deleted successfully",
        deletedSubCategories,
        affectedCatalogues: 0,
      };
    } catch (error: any) {
      await session.abortTransaction();
      console.error("Error deleting category:", error);

      // Log failed operation
      if (this.req) {
        const category = await CategoryModel.findById(categoryId);
        if (category) {
          await historyCatalogueService
            .logDelete(
              this.req,
              "category",
              category._id,
              category.category_name,
              {},
              "failed",
              error.message
            )
            .catch(err => console.error("Failed to log failed delete:", err));
        }
      }

      throw error;
    } finally {
      session.endSession();
    }
  }

  // Get Category Statistics
  async getCategoryStats(): Promise<CategoryStatsDTO> {
    try {
      const [
        totalCategories,
        activeCategories,
        inactiveCategories,
        totalSubCategories,
        activeSubCategories,
        inactiveSubCategories,
        totalProducts,
      ] = await Promise.all([
        CategoryModel.countDocuments(),
        CategoryModel.countDocuments({ category_status: "active" }),
        CategoryModel.countDocuments({ category_status: "inactive" }),
        SubCategoryModel.countDocuments(),
        SubCategoryModel.countDocuments({ sub_category_status: "active" }),
        SubCategoryModel.countDocuments({ sub_category_status: "inactive" }),
        CatalogueModel.countDocuments(),
      ]);

      // Get categories with their sub-category counts
      const categories = await CategoryModel.find({}).lean();
      const categoriesWithSubcategories = await Promise.all(
        categories.map(async category => {
          const subCategoriesCount = await SubCategoryModel.countDocuments({
            category_id: category._id,
          });

          const productCount = await CatalogueModel.countDocuments({
            category: category._id,
          });

          return {
            category_name: category.category_name,
            sub_categories_count: subCategoriesCount,
            product_count: productCount,
          };
        })
      );

      return {
        total_categories: totalCategories,
        active_categories: activeCategories,
        inactive_categories: inactiveCategories,
        total_sub_categories: totalSubCategories,
        active_sub_categories: activeSubCategories,
        inactive_sub_categories: inactiveSubCategories,
        total_products: totalProducts,
        categories_with_subcategories: categoriesWithSubcategories,
      };
    } catch (error: any) {
      console.error("Error fetching category stats:", error);
      throw error;
    }
  }

  // Get Product Count by Category
  async getProductCountByCategory(categoryId: string): Promise<number> {
    try {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new Error("Invalid category ID format");
      }

      const productCount = await CatalogueModel.countDocuments({
        category: categoryId,
      });

      return productCount;
    } catch (error: any) {
      console.error("Error fetching product count by category:", error);
      throw error;
    }
  }
}

// ==================== SUB-CATEGORY SERVICE ====================

export class SubCategoryService {
  private req: Request | null = null;

  setRequestContext(req: Request): void {
    this.req = req;
  }

  // Create Sub-Category
  async createSubCategory(subCategoryData: CreateSubCategoryDTO): Promise<ISubCategory> {
    try {
      // Validate category_id
      if (!mongoose.Types.ObjectId.isValid(subCategoryData.category_id)) {
        throw new Error("Invalid category ID format");
      }

      // Check if category exists
      const category = await CategoryModel.findById(subCategoryData.category_id);
      if (!category) {
        throw new Error("Category not found");
      }

      // Check if sub-category already exists in this category
      const existingSubCategory = await SubCategoryModel.findOne({
        category_id: subCategoryData.category_id,
        sub_category_name: { $regex: new RegExp(`^${subCategoryData.sub_category_name}$`, "i") },
      });

      if (existingSubCategory) {
        throw new Error(
          `Sub-category "${subCategoryData.sub_category_name}" already exists in this category`
        );
      }

      // Validate that at least one image is provided
      if (!subCategoryData.sub_category_image || subCategoryData.sub_category_image.length === 0) {
        throw new Error("At least one sub-category image is required");
      }

      // Validate maximum number of images
      const maxImages = parseInt(process.env.MAX_SUBCATEGORY_IMAGES || "10");
      if (subCategoryData.sub_category_image.length > maxImages) {
        throw new Error(`Maximum ${maxImages} sub-category images allowed`);
      }

      // Create and save sub-category
      const subCategory = new SubCategoryModel({
        sub_category_name: subCategoryData.sub_category_name,
        description: subCategoryData.description,
        category_id: subCategoryData.category_id,
        sub_category_status: subCategoryData.sub_category_status || "active",
        sub_category_image: subCategoryData.sub_category_image,
      });

      const savedSubCategory = await subCategory.save();

      // Log create operation
      if (this.req) {
        await historyCatalogueService
          .logCreate(
            this.req,
            "sub_category",
            savedSubCategory._id,
            savedSubCategory.sub_category_name,
            savedSubCategory.toObject()
          )
          .catch(err => console.error("Failed to log create:", err));
      }

      console.log("Sub-category created successfully:", {
        id: savedSubCategory._id,
        name: savedSubCategory.sub_category_name,
        imagesCount: savedSubCategory.sub_category_image.length,
      });
      return savedSubCategory;
    } catch (error: any) {
      console.error("Error creating sub-category:", error);

      // Log failed operation
      if (this.req) {
        await historyCatalogueService
          .logCreate(
            this.req,
            "sub_category",
            new mongoose.Types.ObjectId(),
            subCategoryData.sub_category_name,
            subCategoryData,
            "failed",
            error.message
          )
          .catch(err => console.error("Failed to log failed create:", err));
      }

      throw error;
    }
  }
  // Get Sub-Category by ID
  async getSubCategoryById(subCategoryId: string): Promise<ISubCategory | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
        throw new Error("Invalid sub-category ID format");
      }

      const subCategory = await SubCategoryModel.findById(subCategoryId).populate(
        "category_id",
        "category_name category_status"
      );

      // Log view operation
      if (this.req && subCategory) {
        await historyCatalogueService
          .logView(this.req, "sub_category", subCategory._id, subCategory.sub_category_name)
          .catch(err => console.error("Failed to log view:", err));
      }

      return subCategory;
    } catch (error: any) {
      console.error("Error fetching sub-category by ID:", error);
      throw error;
    }
  }

  // Get Sub-Categories by Category ID
  async getSubCategoriesByCategory(categoryId: string): Promise<ISubCategory[]> {
    try {
      if (!mongoose.Types.ObjectId.isValid(categoryId)) {
        throw new Error("Invalid category ID format");
      }

      const subCategories = await SubCategoryModel.find({
        category_id: categoryId,
        sub_category_status: "active",
      }).sort({ sub_category_name: 1 });

      return subCategories;
    } catch (error: any) {
      console.error("Error fetching sub-categories by category:", error);
      throw error;
    }
  }

  // Get All Sub-Categories with Filters
  async getAllSubCategoriesWithFilters(
    filters: SubCategoryFilterDTO
  ): Promise<SubCategoryListResponseDTO> {
    try {
      const { status, category_id, sub_category_name, page = 1, limit = 10 } = filters;

      // Build query
      const query: any = {};

      if (status) {
        query.sub_category_status = status;
      }

      if (category_id) {
        if (!mongoose.Types.ObjectId.isValid(category_id)) {
          throw new Error("Invalid category ID format");
        }
        query.category_id = category_id;
      }

      if (sub_category_name) {
        query.sub_category_name = { $regex: sub_category_name, $options: "i" };
      }

      // Get total count
      const total = await SubCategoryModel.countDocuments(query);

      // Get sub-categories with pagination and populate category name
      const skip = (page - 1) * limit;
      const subCategories = await SubCategoryModel.find(query)
        .populate("category_id", "category_name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      // Transform response with product counts
      const subCategoriesWithCounts = await Promise.all(
        subCategories.map(async (subCategory: any) => {
          const productCount = await CatalogueModel.countDocuments({
            sub_category: subCategory._id,
          });

          return {
            id: subCategory._id.toString(),
            sub_category_name: subCategory.sub_category_name,
            description: subCategory.description,
            category_id: subCategory.category_id._id.toString(),
            category_name: subCategory.category_id.category_name,
            sub_category_status: subCategory.sub_category_status,
            sub_category_image: subCategory.sub_category_image,
            product_count: productCount,
            createdAt: subCategory.createdAt,
            updatedAt: subCategory.updatedAt,
          };
        })
      );

      return {
        sub_categories: subCategoriesWithCounts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      console.error("Error fetching sub-categories with filters:", error);
      throw error;
    }
  }

  // Update Sub-Category
  async updateSubCategory(
    subCategoryId: string,
    updateData: UpdateSubCategoryDTO
  ): Promise<ISubCategory> {
    try {
      console.log(`Updating sub-category ${subCategoryId} with data:`, updateData);

      if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
        throw new Error("Invalid sub-category ID format");
      }

      // Check if sub-category exists
      const existingSubCategory = await SubCategoryModel.findById(subCategoryId);
      if (!existingSubCategory) {
        throw new Error("Sub-category not found");
      }

      // If updating sub_category_name, check for duplicates
      if (
        updateData.sub_category_name &&
        updateData.sub_category_name !== existingSubCategory.sub_category_name
      ) {
        const duplicateSubCategory = await SubCategoryModel.findOne({
          _id: { $ne: subCategoryId },
          category_id: existingSubCategory.category_id,
          sub_category_name: { $regex: new RegExp(`^${updateData.sub_category_name}$`, "i") },
        });

        if (duplicateSubCategory) {
          throw new Error(
            `Sub-category "${updateData.sub_category_name}" already exists in this category`
          );
        }
      }

      // If updating category_id, validate the new category exists
      if (
        updateData.category_id &&
        updateData.category_id !== existingSubCategory.category_id.toString()
      ) {
        if (!mongoose.Types.ObjectId.isValid(updateData.category_id)) {
          throw new Error("Invalid category ID format");
        }

        const newCategory = await CategoryModel.findById(updateData.category_id);
        if (!newCategory) {
          throw new Error("New category not found");
        }

        // Check if sub-category name already exists in the new category
        const duplicateInNewCategory = await SubCategoryModel.findOne({
          category_id: updateData.category_id,
          sub_category_name: existingSubCategory.sub_category_name,
        });

        if (duplicateInNewCategory) {
          throw new Error(
            `Sub-category "${existingSubCategory.sub_category_name}" already exists in the new category`
          );
        }
      }

      // Validate images if being updated
      if (updateData.sub_category_image) {
        if (!Array.isArray(updateData.sub_category_image)) {
          throw new Error("Sub-category images must be an array");
        }

        const maxImages = parseInt(process.env.MAX_SUBCATEGORY_IMAGES || "10");
        if (updateData.sub_category_image.length > maxImages) {
          throw new Error(`Maximum ${maxImages} sub-category images allowed`);
        }

        if (updateData.sub_category_image.length === 0) {
          throw new Error("At least one sub-category image is required");
        }
      }

      // Store before state for audit
      const beforeState = existingSubCategory.toObject();

      // Prepare update object
      const updateObject: any = { ...updateData };

      // Update sub-category
      const updatedSubCategory = await SubCategoryModel.findByIdAndUpdate(
        subCategoryId,
        { $set: updateObject },
        { new: true, runValidators: true }
      ).populate("category_id", "category_name");

      if (!updatedSubCategory) {
        throw new Error("Failed to update sub-category");
      }

      // Log update operation
      if (this.req) {
        await historyCatalogueService
          .logUpdate(
            this.req,
            "sub_category",
            updatedSubCategory._id,
            updatedSubCategory.sub_category_name,
            beforeState,
            updatedSubCategory.toObject()
          )
          .catch(err => console.error("Failed to log update:", err));
      }

      console.log("Sub-category updated successfully:", {
        id: updatedSubCategory._id,
        name: updatedSubCategory.sub_category_name,
        imagesCount: updatedSubCategory.sub_category_image.length,
      });

      return updatedSubCategory;
    } catch (error: any) {
      console.error("Error updating sub-category:", error);

      // Log failed operation
      if (this.req) {
        const subCategory = await SubCategoryModel.findById(subCategoryId);
        if (subCategory) {
          await historyCatalogueService
            .logUpdate(
              this.req,
              "sub_category",
              subCategory._id,
              subCategory.sub_category_name,
              {},
              {},
              "failed",
              error.message
            )
            .catch(err => console.error("Failed to log failed update:", err));
        }
      }

      throw error;
    }
  }
  // In SubCategoryService class
  async getProductCountBySubCategory(subCategoryId: string): Promise<number> {
    try {
      if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
        throw new Error("Invalid sub-category ID format");
      }

      const count = await CatalogueModel.countDocuments({
        sub_category: subCategoryId,
      });

      console.log(`Sub-category ${subCategoryId} has ${count} products`);
      return count;
    } catch (error: any) {
      console.error("Error getting product count for sub-category:", error);
      throw error;
    }
  }

  async getProductCountsForSubCategories(subCategoryIds: string[]): Promise<Map<string, number>> {
    try {
      // Use aggregation to get counts efficiently
      const counts = await CatalogueModel.aggregate([
        {
          $match: {
            sub_category: { $in: subCategoryIds.map(id => new mongoose.Types.ObjectId(id)) },
          },
        },
        {
          $group: {
            _id: "$sub_category",
            count: { $sum: 1 },
          },
        },
      ]);

      // Convert to Map for easy lookup
      const countMap = new Map<string, number>();
      counts.forEach(item => {
        if (item._id) {
          countMap.set(item._id.toString(), item.count);
        }
      });

      // Ensure all sub-category IDs are in the map (with 0 count if no products)
      subCategoryIds.forEach(id => {
        if (!countMap.has(id)) {
          countMap.set(id, 0);
        }
      });

      return countMap;
    } catch (error: any) {
      console.error("Error getting product counts for sub-categories:", error);
      throw error;
    }
  }

  // Delete Sub-Category
  async deleteSubCategory(subCategoryId: string): Promise<{
    success: boolean;
    message: string;
    affectedCatalogues: number;
  }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(subCategoryId)) {
        throw new Error("Invalid sub-category ID format");
      }

      // Check if sub-category exists
      const subCategory = await SubCategoryModel.findById(subCategoryId);
      if (!subCategory) {
        throw new Error("Sub-category not found");
      }

      // Check if sub-category is used in catalogue
      const catalogueCount = await CatalogueModel.countDocuments({
        sub_category: subCategoryId,
      });

      if (catalogueCount > 0) {
        throw new Error(
          `Cannot delete sub-category. ${catalogueCount} catalogue item(s) are using this sub-category.`
        );
      }

      // Store before state for audit
      const beforeState = subCategory.toObject();

      // Collect image public IDs to delete from storage
      const imagePublicIds: string[] = [];
      if (subCategory.sub_category_image && subCategory.sub_category_image.length > 0) {
        subCategory.sub_category_image.forEach((img: any) => {
          if (img.cloudinary_public_id) {
            imagePublicIds.push(img.cloudinary_public_id);
          }
        });
      }

      // Delete the sub-category
      await SubCategoryModel.findByIdAndDelete(subCategoryId);

      // Log delete operation
      if (this.req) {
        await historyCatalogueService
          .logDelete(
            this.req,
            "sub_category",
            subCategory._id,
            subCategory.sub_category_name,
            beforeState
          )
          .catch(err => console.error("Failed to log delete:", err));
      }

      // Delete images from storage after successful deletion
      if (imagePublicIds.length > 0) {
        console.log(
          `Deleting ${imagePublicIds.length} sub-category images from storage:`,
          imagePublicIds
        );
        await imageUploadService
          .deleteMultipleFiles(imagePublicIds)
          .catch(err => console.error("Failed to delete images from storage:", err));
      }

      return {
        success: true,
        message: "Sub-category deleted successfully",
        affectedCatalogues: 0,
      };
    } catch (error: any) {
      console.error("Error deleting sub-category:", error);

      // Log failed operation
      if (this.req) {
        const subCategory = await SubCategoryModel.findById(subCategoryId);
        if (subCategory) {
          await historyCatalogueService
            .logDelete(
              this.req,
              "sub_category",
              subCategory._id,
              subCategory.sub_category_name,
              {},
              "failed",
              error.message
            )
            .catch(err => console.error("Failed to log failed delete:", err));
        }
      }

      throw error;
    }
  }
}

// ==================== CATALOGUE SERVICE ====================

export class CatalogueService {
  private req: Request | null = null;

  setRequestContext(req: Request): void {
    this.req = req;
  }

  // Create Catalogue Product
  async createCatalogue(productData: CreateCatalogueDTO): Promise<ICatalogue> {
    try {
      // Validate IDs
      if (!mongoose.Types.ObjectId.isValid(productData.category)) {
        throw new Error("Invalid category ID format");
      }

      if (!mongoose.Types.ObjectId.isValid(productData.sub_category)) {
        throw new Error("Invalid sub-category ID format");
      }

      // Check if category exists
      const category = await CategoryModel.findById(productData.category);
      if (!category) {
        throw new Error("Category not found");
      }

      // Check if sub-category exists and belongs to the category
      const subCategory = await SubCategoryModel.findOne({
        _id: productData.sub_category,
        category_id: productData.category,
      });

      if (!subCategory) {
        throw new Error("Sub-category not found or does not belong to the specified category");
      }

      // Check if SKU already exists
      const existingSku = await CatalogueModel.findOne({
        sku_id: productData.sku_id,
      });

      if (existingSku) {
        throw new Error("Product with this SKU already exists");
      }

      // Check if barcode already exists
      const existingBarcode = await CatalogueModel.findOne({
        barcode: productData.barcode,
      });

      if (existingBarcode) {
        throw new Error("Product with this barcode already exists");
      }

      // Validate prices
      if (productData.base_price < 0 || productData.final_price < 0) {
        throw new Error("Prices cannot be negative");
      }

      if (productData.final_price < productData.base_price) {
        throw new Error("Final price cannot be less than base price");
      }

      // Validate expiry threshold
      if (productData.expiry_alert_threshold < 1 || productData.expiry_alert_threshold > 365) {
        throw new Error("Expiry alert threshold must be between 1 and 365 days");
      }

      // Validate images
      if (!Array.isArray(productData.product_images) || productData.product_images.length === 0) {
        throw new Error("At least one image is required");
      }

      if (productData.product_images.length > 10) {
        throw new Error("Maximum 10 images allowed");
      }

      // Create and save product
      const product = new CatalogueModel(productData);
      const savedProduct = await product.save();

      // Log create operation
      if (this.req) {
        await historyCatalogueService
          .logCreate(
            this.req,
            "catalogue",
            savedProduct._id,
            savedProduct.product_name,
            savedProduct.toObject()
          )
          .catch(err => console.error("Failed to log create:", err));
      }

      return savedProduct;
    } catch (error: any) {
      console.error("Error creating catalogue:", error);

      // Log failed operation
      if (this.req) {
        await historyCatalogueService
          .logCreate(
            this.req,
            "catalogue",
            new mongoose.Types.ObjectId(),
            productData.product_name,
            productData,
            "failed",
            error.message
          )
          .catch(err => console.error("Failed to log failed create:", err));
      }

      throw error;
    }
  }

  // Get Catalogue by ID
  async getCatalogueById(productId: string): Promise<ICatalogue | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error("Invalid product ID format");
      }

      const product = await CatalogueModel.findById(productId)
        .populate("category", "category_name")
        .populate("sub_category", "sub_category_name");

      // Log view operation
      if (this.req && product) {
        await historyCatalogueService
          .logView(this.req, "catalogue", product._id, product.product_name)
          .catch(err => console.error("Failed to log view:", err));
      }

      return product;
    } catch (error: any) {
      console.error("Error fetching catalogue by ID:", error);
      throw error;
    }
  }

  // Update Catalogue Product
  async updateCatalogue(productId: string, updateData: UpdateCatalogueDTO): Promise<ICatalogue> {
    try {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error("Invalid product ID format");
      }

      // Check if product exists
      const existingProduct = await CatalogueModel.findById(productId);
      if (!existingProduct) {
        throw new Error("Product not found");
      }

      // If updating category or sub-category, validate them
      if (updateData.category || updateData.sub_category) {
        const categoryId = updateData.category || existingProduct.category.toString();
        const subCategoryId = updateData.sub_category || existingProduct.sub_category.toString();

        if (
          !mongoose.Types.ObjectId.isValid(categoryId) ||
          !mongoose.Types.ObjectId.isValid(subCategoryId)
        ) {
          throw new Error("Invalid category or sub-category ID format");
        }

        // Check if sub-category belongs to the category
        const subCategory = await SubCategoryModel.findOne({
          _id: subCategoryId,
          category_id: categoryId,
        });

        if (!subCategory) {
          throw new Error("Sub-category does not belong to the specified category");
        }
      }

      // If updating SKU, check for duplicates
      if (updateData.sku_id && updateData.sku_id !== existingProduct.sku_id) {
        const duplicateSku = await CatalogueModel.findOne({
          _id: { $ne: productId },
          sku_id: updateData.sku_id,
        });

        if (duplicateSku) {
          throw new Error("Product with this SKU already exists");
        }
      }

      // If updating barcode, check for duplicates
      if (updateData.barcode && updateData.barcode !== existingProduct.barcode) {
        const duplicateBarcode = await CatalogueModel.findOne({
          _id: { $ne: productId },
          barcode: updateData.barcode,
        });

        if (duplicateBarcode) {
          throw new Error("Product with this barcode already exists");
        }
      }

      // Validate prices if being updated
      if (updateData.base_price !== undefined || updateData.final_price !== undefined) {
        const basePrice = updateData.base_price ?? existingProduct.base_price;
        const finalPrice = updateData.final_price ?? existingProduct.final_price;

        if (basePrice < 0 || finalPrice < 0) {
          throw new Error("Prices cannot be negative");
        }

        if (finalPrice < basePrice) {
          throw new Error("Final price cannot be less than base price");
        }
      }

      // Validate expiry threshold if being updated
      if (updateData.expiry_alert_threshold !== undefined) {
        if (updateData.expiry_alert_threshold < 1 || updateData.expiry_alert_threshold > 365) {
          throw new Error("Expiry alert threshold must be between 1 and 365 days");
        }
      }

      // Validate images if being updated
      if (updateData.product_images) {
        if (!Array.isArray(updateData.product_images) || updateData.product_images.length === 0) {
          throw new Error("At least one image is required");
        }

        if (updateData.product_images.length > 10) {
          throw new Error("Maximum 10 images allowed");
        }
      }

      // Store before state for audit
      const beforeState = existingProduct.toObject();

      // Update product
      const updatedProduct = await CatalogueModel.findByIdAndUpdate(
        productId,
        { $set: updateData },
        { new: true, runValidators: true }
      )
        .populate("category", "category_name")
        .populate("sub_category", "sub_category_name");

      if (!updatedProduct) {
        throw new Error("Failed to update product");
      }

      // Log update operation
      if (this.req) {
        await historyCatalogueService
          .logUpdate(
            this.req,
            "catalogue",
            updatedProduct._id,
            updatedProduct.product_name,
            beforeState,
            updatedProduct.toObject()
          )
          .catch(err => console.error("Failed to log update:", err));
      }

      return updatedProduct;
    } catch (error: any) {
      console.error("Error updating catalogue:", error);

      // Log failed operation
      if (this.req) {
        const product = await CatalogueModel.findById(productId);
        if (product) {
          await historyCatalogueService
            .logUpdate(
              this.req,
              "catalogue",
              product._id,
              product.product_name,
              {},
              {},
              "failed",
              error.message
            )
            .catch(err => console.error("Failed to log failed update:", err));
        }
      }

      throw error;
    }
  }

  // Delete Catalogue Product
  async deleteCatalogue(productId: string): Promise<{
    success: boolean;
    message: string;
    deletedProduct?: {
      sku_id: string;
      product_name: string;
    };
  }> {
    try {
      if (!mongoose.Types.ObjectId.isValid(productId)) {
        throw new Error("Invalid product ID format");
      }

      // Check if product exists
      const product = await CatalogueModel.findById(productId);
      if (!product) {
        throw new Error("Product not found");
      }

      // Store product info before deletion
      const productInfo = {
        sku_id: product.sku_id,
        product_name: product.product_name,
      };

      // Store before state for audit
      const beforeState = product.toObject();

      // Collect image public IDs to delete from storage
      const imagePublicIds: string[] = [];
      if (product.product_images && product.product_images.length > 0) {
        product.product_images.forEach((img: any) => {
          if (img.cloudinary_public_id) {
            imagePublicIds.push(img.cloudinary_public_id);
          }
        });
      }

      // Delete the product
      await CatalogueModel.findByIdAndDelete(productId);

      // Log delete operation
      if (this.req) {
        await historyCatalogueService
          .logDelete(this.req, "catalogue", product._id, product.product_name, beforeState)
          .catch(err => console.error("Failed to log delete:", err));
      }

      // Delete images from storage after successful deletion
      if (imagePublicIds.length > 0) {
        console.log(
          `Deleting ${imagePublicIds.length} product images from storage:`,
          imagePublicIds
        );
        await imageUploadService
          .deleteMultipleFiles(imagePublicIds)
          .catch(err => console.error("Failed to delete images from storage:", err));
      }

      return {
        success: true,
        message: "Product deleted successfully",
        deletedProduct: productInfo,
      };
    } catch (error: any) {
      console.error("Error deleting catalogue:", error);

      // Log failed operation
      if (this.req) {
        const product = await CatalogueModel.findById(productId);
        if (product) {
          await historyCatalogueService
            .logDelete(
              this.req,
              "catalogue",
              product._id,
              product.product_name,
              {},
              "failed",
              error.message
            )
            .catch(err => console.error("Failed to log failed delete:", err));
        }
      }

      throw error;
    }
  }

  // Get Dashboard Data
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
        sort_by = "createdAt",
        sort_order = "desc",
      } = filters;

      // Build query
      const query: any = {};

      if (brand_name) {
        query.brand_name = { $regex: brand_name, $options: "i" };
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
          { sku_id: { $regex: search, $options: "i" } },
          { product_name: { $regex: search, $options: "i" } },
          { brand_name: { $regex: search, $options: "i" } },
          { description: { $regex: search, $options: "i" } },
        ];
      }

      // If category filter is provided, we need to find by category name
      if (category) {
        // First find the category by name
        const categoryDoc = await CategoryModel.findOne({
          category_name: { $regex: category, $options: "i" },
        });

        if (categoryDoc) {
          query.category = categoryDoc._id;
        } else {
          // If category not found, return empty results
          return {
            products: [],
            total: 0,
            page,
            limit,
            totalPages: 0,
            filters,
          };
        }
      }

      // Get total count
      const total = await CatalogueModel.countDocuments(query);

      // Get products with pagination and populate category/sub-category names
      const skip = (page - 1) * limit;

      // Sort mapping
      const sortFieldMap: Record<string, string> = {
        product_name: "product_name",
        base_price: "base_price",
        createdAt: "createdAt",
      };

      const sortField = sortFieldMap[sort_by] || "createdAt";
      const sortDirection = sort_order === "asc" ? 1 : -1;

      const products = await CatalogueModel.find(query)
        .populate("category", "category_name")
        .populate("sub_category", "sub_category_name")
        .sort({ [sortField]: sortDirection })
        .skip(skip)
        .limit(limit)
        .select(
          "sku_id product_name category sub_category brand_name unit_size base_price final_price status product_images createdAt"
        )
        .lean();

      // Transform products
      const transformedProducts = products.map(product => ({
        sku_id: product.sku_id,
        product_name: product.product_name,
        category: (product.category as any)?.category_name || "Unknown",
        sub_category: (product.sub_category as any)?.sub_category_name || "Unknown",
        brand_name: product.brand_name,
        unit_size: product.unit_size,
        base_price: product.base_price,
        final_price: product.final_price,
        status: product.status,
        product_images: product.product_images,
        createdAt: product.createdAt,
      }));

      return {
        products: transformedProducts,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        filters,
      };
    } catch (error: any) {
      console.error("Error fetching dashboard data:", error);
      throw error;
    }
  }

  // Get Unique Brands
  async getUniqueBrands(): Promise<string[]> {
    try {
      const brands = await CatalogueModel.distinct("brand_name");
      return brands.filter(brand => brand).sort();
    } catch (error: any) {
      console.error("Error fetching brands:", error);
      throw error;
    }
  }

  // Get Unique Categories
  async getUniqueCategories(): Promise<string[]> {
    try {
      const categories = await CategoryModel.distinct("category_name");
      return categories.sort();
    } catch (error: any) {
      console.error("Error fetching categories:", error);
      throw error;
    }
  }

  // Validate Catalogue Data
  validateCatalogueData(data: Partial<CreateCatalogueDTO>): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];

    // Required fields
    const requiredFields = [
      "sku_id",
      "product_name",
      "brand_name",
      "description",
      "category",
      "sub_category",
      "manufacturer_name",
      "manufacturer_address",
      "shell_life",
      "expiry_alert_threshold",
      "tages_label",
      "unit_size",
      "base_price",
      "final_price",
      "barcode",
      "nutrition_information",
      "ingredients",
      "product_images",
    ];

    requiredFields.forEach(field => {
      if (!data[field as keyof CreateCatalogueDTO]) {
        errors.push(`${field.replace(/_/g, " ")} is required`);
      }
    });

    // Specific validations
    if (data.sku_id && data.sku_id.length < 3) {
      errors.push("SKU ID must be at least 3 characters long");
    }

    if (data.product_name && data.product_name.length < 2) {
      errors.push("Product name must be at least 2 characters long");
    }

    if (data.base_price !== undefined && data.base_price < 0) {
      errors.push("Base price cannot be negative");
    }

    if (data.final_price !== undefined && data.final_price < 0) {
      errors.push("Final price cannot be negative");
    }

    if (data.base_price !== undefined && data.final_price !== undefined) {
      if (data.final_price < data.base_price) {
        errors.push("Final price cannot be less than base price");
      }
    }

    if (data.expiry_alert_threshold !== undefined) {
      if (data.expiry_alert_threshold < 1 || data.expiry_alert_threshold > 365) {
        errors.push("Expiry alert threshold must be between 1 and 365 days");
      }
    }

    if (data.product_images) {
      if (!Array.isArray(data.product_images)) {
        errors.push("Product images must be an array");
      } else if (data.product_images.length === 0) {
        errors.push("At least one product image URL is required");
      } else if (data.product_images.length > 10) {
        errors.push("Maximum 10 product images allowed");
      }
    }

    if (data.status && !["active", "inactive"].includes(data.status)) {
      errors.push('Status must be either "active" or "inactive"');
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  }
}

// ==================== SERVICE FACTORIES ====================

export const createCategoryService = (req?: Request): CategoryService => {
  const service = new CategoryService();
  if (req) service.setRequestContext(req);
  return service;
};

export const createSubCategoryService = (req?: Request): SubCategoryService => {
  const service = new SubCategoryService();
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
export const subCategoryService = new SubCategoryService();
export const catalogueService = new CatalogueService();
