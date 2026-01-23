import { Request, Response } from "express";
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
  catalogueService,
} from "../services/catalogue.service";
import { Types } from "mongoose";
import { ImageUploadService } from "../services/catalogueFileUpload.service";

import { logger } from "../utils/logger.util";
const imageUploadService = new ImageUploadService();

export class BaseController {
  public static getLoggedInUser(req: Request): {
    _id: Types.ObjectId;
    roles: any[];
    email: string;
  } {
    const user = (req as any).user;

    if (!user || !user._id) {
      throw new Error("User authentication required");
    }

    return {
      _id: user._id,
      roles: user.roles || [],
      email: user.email || "",
    };
  }
}

export class CatalogueController extends BaseController {
  async createCatalogue(req: Request, res: Response): Promise<void> {
    const catalogueService = createCatalogueService(req);

    try {
      const { _id: userId, email: userEmail, roles } = CatalogueController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      let productImages: any[] = [];
      const files = req.files as Express.Multer.File[];

      if (files && files.length > 0) {
        const maxImages = parseInt(process.env.MAX_PRODUCT_IMAGES || "10");
        if (files.length > maxImages) {
          res.status(400).json({
            success: false,
            message: `Maximum ${maxImages} images allowed`,
          });
          return;
        }

        const folder = process.env.CATALOGUE_IMAGE_FOLDER || "frovo/catalogue_images";
        const uploadPromises = files.map(file =>
          imageUploadService
            .uploadToCloudinary(file.buffer, file.originalname, folder)
            .then(({ url, publicId }) =>
              imageUploadService.createProductDocumentMetadata(file, url, publicId)
            )
        );

        productImages = await Promise.all(uploadPromises);
      } else if (req.body.images) {
        productImages = Array.isArray(req.body.images)
          ? req.body.images
          : typeof req.body.images === "string"
            ? JSON.parse(req.body.images)
            : [req.body.images].filter(Boolean);
      }

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
        product_images: productImages,
        status: req.body.status || "active",
      };

      const validation = catalogueService.validateCatalogueData(productData);
      if (!validation.isValid) {
        res.status(400).json({
          success: false,
          message: "Validation failed",
          errors: validation.errors,
        });
        return;
      }

      const product = await catalogueService.createCatalogue(productData);

      const catalogueResponse = {
        id: product._id,
        sku_id: product.sku_id,
        product_name: product.product_name,
        brand_name: product.brand_name,
        description: product.description,
        category: {
          _id: (product.category as any)?._id || product.category,
          category_name: (product.category as any)?.category_name || "",
        },
        sub_category: {
          _id: (product.sub_category as any)?._id || product.sub_category,
          sub_category_name: (product.sub_category as any)?.sub_category_name || "",
        },
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
        updatedAt: product.updatedAt,
      };

      res.status(201).json({
        success: true,
        message: "Product created successfully",
        data: catalogueResponse,
        meta: {
          createdBy: userEmail,
          userRole,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error creating product:", error);

      const errorMessages: Record<string, number> = {
        "Product with this SKU already exists": 409,
        "Product with this barcode already exists": 409,
        "Category not found": 404,
        "Sub-category not found": 404,
        "Invalid category ID": 400,
        "Invalid sub-category ID": 400,
        "Invalid.*ID.*format": 400,
        "Prices cannot be negative": 400,
        "Final price cannot be less than base price": 400,
        "Expiry alert threshold must be between 1 and 365 days": 400,
        "At least one image is required": 400,
        "Maximum 10 images allowed": 400,
        "User authentication required": 401,
      };

      let statusCode = 500;
      let errorMessage = "Internal server error";

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
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
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
          message: "Product not found",
        });
        return;
      }

      const catalogueResponse = {
        id: product._id,
        sku_id: product.sku_id,
        product_name: product.product_name,
        brand_name: product.brand_name,
        description: product.description,
        category: {
          _id: (product.category as any)?._id || product.category,
          category_name: (product.category as any)?.category_name || "",
        },
        sub_category: {
          _id: (product.sub_category as any)?._id || product.sub_category,
          sub_category_name: (product.sub_category as any)?.sub_category_name || "",
        },
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
        updatedAt: product.updatedAt,
      };

      res.status(200).json({
        success: true,
        message: "Product retrieved successfully",
        data: catalogueResponse,
      });
    } catch (error: any) {
      logger.error("Error fetching product:", error);

      const statusCode = error.message.includes("Invalid product ID") ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to fetch product",
      });
    }
  }

  async updateCatalogue(req: Request, res: Response): Promise<void> {
    const catalogueService = createCatalogueService(req);

    try {
      const { id } = req.params;
      const user = CatalogueController.getLoggedInUser(req);

      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        const maxImages = parseInt(process.env.MAX_PRODUCT_IMAGES || "10");
        if (files.length > maxImages) {
          res.status(400).json({
            success: false,
            message: `Maximum ${maxImages} images allowed`,
          });
          return;
        }

        const folder = process.env.CATALOGUE_IMAGE_FOLDER || "frovo/catalogue_images";
        const uploadPromises = files.map(file =>
          imageUploadService
            .uploadToCloudinary(file.buffer, file.originalname, folder)
            .then(({ url, publicId }) =>
              imageUploadService.createProductDocumentMetadata(file, url, publicId)
            )
        );

        const productImages = await Promise.all(uploadPromises);
        req.body.product_images = productImages;
      }

      const updateData: UpdateCatalogueDTO = { ...req.body };

      if (req.body.expiry_alert_threshold !== undefined) {
        updateData.expiry_alert_threshold = Number(req.body.expiry_alert_threshold);
      }
      if (req.body.base_price !== undefined) {
        updateData.base_price = Number(req.body.base_price);
      }
      if (req.body.final_price !== undefined) {
        updateData.final_price = Number(req.body.final_price);
      }

      const updatedProduct = await catalogueService.updateCatalogue(id, updateData);

      const catalogueResponse = {
        id: updatedProduct._id,
        sku_id: updatedProduct.sku_id,
        product_name: updatedProduct.product_name,
        brand_name: updatedProduct.brand_name,
        description: updatedProduct.description,
        category: {
          _id: (updatedProduct.category as any)?._id || updatedProduct.category,
          category_name: (updatedProduct.category as any)?.category_name || "",
        },
        sub_category: {
          _id: (updatedProduct.sub_category as any)?._id || updatedProduct.sub_category,
          sub_category_name: (updatedProduct.sub_category as any)?.sub_category_name || "",
        },
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
        createdAt: updatedProduct.createdAt,
        updatedAt: updatedProduct.updatedAt,
      };

      res.status(200).json({
        success: true,
        message: "Product updated successfully",
        data: catalogueResponse,
        meta: {
          updatedBy: user.email,
          userRole: user.roles[0]?.key || "unknown",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error updating product:", error);

      let statusCode = 500;
      if (error.message.includes("Invalid product ID")) {
        statusCode = 400;
      } else if (error.message.includes("not found")) {
        statusCode = 404;
      } else if (error.message.includes("already exists")) {
        statusCode = 409;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to update product",
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
          userRole: user.roles[0]?.key || "unknown",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error deleting product:", error);

      let statusCode = 500;
      if (error.message.includes("Invalid product ID")) {
        statusCode = 400;
      } else if (error.message.includes("not found")) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to delete product",
      });
    }
  }

  async getDashboard(req: Request, res: Response): Promise<void> {
    try {
      const filters: DashboardFilterDTO = this.buildCatalogueFilters(req);
      const dashboardData = await catalogueService.getDashboardData(filters);

      res.status(200).json({
        success: true,
        message: "Dashboard data retrieved successfully",
        data: dashboardData,
      });
    } catch (error: any) {
      logger.error("Error fetching dashboard data:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch dashboard data",
      });
    }
  }

  async getFilterOptions(req: Request, res: Response): Promise<void> {
    try {
      const [brands, categories] = await Promise.all([
        catalogueService.getUniqueBrands(),
        catalogueService.getUniqueCategories(),
      ]);

      res.status(200).json({
        success: true,
        message: "Filter options retrieved successfully",
        data: {
          brands,
          categories,
        },
      });
    } catch (error: any) {
      logger.error("Error fetching filter options:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch filter options",
      });
    }
  }

  async getAllCatalogues(req: Request, res: Response): Promise<void> {
    try {
      const filters: DashboardFilterDTO = this.buildCatalogueFilters(req);
      const cataloguesData = await catalogueService.getDashboardData(filters);

      res.status(200).json({
        success: true,
        message: "Catalogues retrieved successfully",
        data: cataloguesData,
      });
    } catch (error: any) {
      logger.error("Error fetching all catalogues:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch catalogues",
      });
    }
  }

  private buildCatalogueFilters(req: Request): DashboardFilterDTO {
    const filters: DashboardFilterDTO = {
      category: req.query.category as string,
      brand_name: req.query.brand_name as string,
      status: req.query.status as "active" | "inactive",
      search: req.query.search as string,
      page: req.query.page ? parseInt(req.query.page as string) : 1,
      limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      sort_by: (req.query.sort_by as "product_name" | "base_price" | "createdAt") || "createdAt",
      sort_order: (req.query.sort_order as "asc" | "desc") || "desc",
    };

    if (req.query.min_price) {
      filters.min_price = parseFloat(req.query.min_price as string);
    }
    if (req.query.max_price) {
      filters.max_price = parseFloat(req.query.max_price as string);
    }

    if (filters.page! < 1) filters.page = 1;
    if (filters.limit! < 1 || filters.limit! > 100) filters.limit = 10;

    return filters;
  }

  async uploadProductImage(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: "No images provided",
        });
        return;
      }

      const folder = process.env.PRODUCT_IMAGE_FOLDER || "frovo/product_images";
      const uploadedImages = [];

      for (const file of files) {
        const { url, publicId } = await imageUploadService.uploadToCloudinary(
          file.buffer,
          file.originalname,
          folder
        );

        const imageData = imageUploadService.createProductDocumentMetadata(file, url, publicId);

        uploadedImages.push(imageData);
      }

      res.status(200).json({
        success: true,
        message: "Images uploaded successfully",
        data: uploadedImages,
      });
    } catch (error: any) {
      logger.error("Error uploading product images:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload images",
      });
    }
  }

  async deleteProductImage(req: Request, res: Response): Promise<void> {
    try {
      const { publicId } = req.params;

      if (!publicId) {
        res.status(400).json({
          success: false,
          message: "Public ID is required",
        });
        return;
      }

      await imageUploadService.deleteFromCloudinary(publicId);

      res.status(200).json({
        success: true,
        message: "Image deleted successfully",
      });
    } catch (error: any) {
      logger.error("Error deleting image:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to delete image",
      });
    }
  }

  async updateCatalogueStatus(req: Request, res: Response): Promise<void> {
    const catalogueService = createCatalogueService(req);

    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = CatalogueController.getLoggedInUser(req);

      if (!status || !["active", "inactive"].includes(status)) {
        res.status(400).json({
          success: false,
          message: "Valid status (active/inactive) is required",
        });
        return;
      }

      const updateData: UpdateCatalogueDTO = { status };
      const updatedCatalogue = await catalogueService.updateCatalogue(id, updateData);

      const catalogueResponse = {
        id: updatedCatalogue._id,
        sku_id: updatedCatalogue.sku_id,
        product_name: updatedCatalogue.product_name,
        brand_name: updatedCatalogue.brand_name,
        description: updatedCatalogue.description,
        category: {
          _id: (updatedCatalogue.category as any)?._id || updatedCatalogue.category,
          category_name: (updatedCatalogue.category as any)?.category_name || "",
        },
        sub_category: {
          _id: (updatedCatalogue.sub_category as any)?._id || updatedCatalogue.sub_category,
          sub_category_name: (updatedCatalogue.sub_category as any)?.sub_category_name || "",
        },
        manufacturer_name: updatedCatalogue.manufacturer_name,
        manufacturer_address: updatedCatalogue.manufacturer_address,
        shell_life: updatedCatalogue.shell_life,
        expiry_alert_threshold: updatedCatalogue.expiry_alert_threshold,
        tages_label: updatedCatalogue.tages_label,
        unit_size: updatedCatalogue.unit_size,
        base_price: updatedCatalogue.base_price,
        final_price: updatedCatalogue.final_price,
        barcode: updatedCatalogue.barcode,
        nutrition_information: updatedCatalogue.nutrition_information,
        ingredients: updatedCatalogue.ingredients,
        product_images: updatedCatalogue.product_images,
        status: updatedCatalogue.status,
        createdAt: updatedCatalogue.createdAt,
        updatedAt: updatedCatalogue.updatedAt,
      };

      res.status(200).json({
        success: true,
        message: "Product status updated successfully",
        data: catalogueResponse,
        meta: {
          updatedBy: user.email,
          userRole: user.roles[0]?.key || "unknown",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error updating product status:", error);

      let statusCode = 500;
      if (error.message.includes("Invalid product ID")) {
        statusCode = 400;
      } else if (error.message.includes("not found")) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to update product status",
      });
    }
  }

  async exportDashboardCSV(req: Request, res: Response): Promise<void> {
    try {
      const filters: DashboardFilterDTO = {
        category: req.query.category as string,
        brand_name: req.query.brand_name as string,
        status: req.query.status as "active" | "inactive",
        search: req.query.search as string,
        page: 1,
        limit: parseInt(process.env.EXPORT_MAX_RECORDS || "10000"),
        sort_by: (req.query.sort_by as "product_name" | "base_price" | "createdAt") || "createdAt",
        sort_order: (req.query.sort_order as "asc" | "desc") || "desc",
      };

      if (req.query.min_price) {
        filters.min_price = parseFloat(req.query.min_price as string);
      }
      if (req.query.max_price) {
        filters.max_price = parseFloat(req.query.max_price as string);
      }

      const dashboardData = await catalogueService.getDashboardData(filters);
      const csv = this.convertToCSV(dashboardData.products);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=dashboard-export.csv");
      res.status(200).send(csv);
    } catch (error: any) {
      logger.error("Error exporting dashboard CSV:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export dashboard data",
      });
    }
  }

  async exportAllCataloguesCSV(req: Request, res: Response): Promise<void> {
  try {
    const filters: DashboardFilterDTO = {
      page: 1,
      limit: parseInt(process.env.EXPORT_MAX_RECORDS || "100000"),
    };
    const dashboardData = await catalogueService.getDashboardData(filters);
    const csv = this.convertAllCataloguesToCSV(dashboardData.products);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=all-catalogues.csv");
    res.status(200).send(csv);
  } catch (error: any) {
    logger.error("Error exporting all catalogues CSV:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export catalogues",
    });
  }
}

private convertAllCataloguesToCSV(products: any[]): string {
  const csvLines: string[] = [];
  
  // Header
  csvLines.push(`"COMPLETE CATALOGUE EXPORT"`);
  csvLines.push(`"Export Date: ${new Date().toISOString().split('T')[0]}"`);
  csvLines.push(`"Export Time: ${new Date().toISOString().split('T')[1].split('.')[0]}"`);
  csvLines.push(`"Total Products: ${products.length}"`);
  csvLines.push("");
  
  // Process each product
  products.forEach((product, index) => {
    // Product Header
    csvLines.push(`"PRODUCT ${index + 1}: ${product.product_name || 'Unnamed Product'}"`);
    csvLines.push("");
    
    // Basic Information
    csvLines.push("FIELD,VALUE");
    csvLines.push(`SKU ID - ${product.sku_id || ""}`);
    csvLines.push(`Product Name - "${(product.product_name || "").replace(/"/g, '""')}"`);
    csvLines.push(`Brand Name - "${(product.brand_name || "").replace(/"/g, '""')}"`);
    
    // Category and Sub-category
    const categoryName = typeof product.category === 'object' 
      ? product.category.category_name 
      : product.category;
    const subCategoryName = typeof product.sub_category === 'object'
      ? product.sub_category.sub_category_name
      : product.sub_category;
    
    csvLines.push(`Category - "${(categoryName || "").replace(/"/g, '""')}"`);
    csvLines.push(`Sub Category -"${(subCategoryName || "").replace(/"/g, '""')}"`);
    csvLines.push(`Description - "${(product.description || "").replace(/"/g, '""')}"`);
    csvLines.push(`Manufacturer Name - "${(product.manufacturer_name || "").replace(/"/g, '""')}"`);
    csvLines.push(`Manufacturer Address - "${(product.manufacturer_address || "").replace(/"/g, '""')}"`);
    csvLines.push(`Shell Life - ${product.shell_life || ""}`);
    csvLines.push(`Expiry Alert Threshold - ${product.expiry_alert_threshold || 0} days`);
    csvLines.push(`Tags Label - ${product.tages_label || ""}`);
    csvLines.push(`Unit Size - ${product.unit_size || ""}`);
    csvLines.push(`Base Price - ${product.base_price || 0}`);
    csvLines.push(`Final Price - ${product.final_price || 0}`);
    csvLines.push(`Barcode - ${product.barcode || ""}`);
    csvLines.push(`Nutrition Information - "${(product.nutrition_information || "").replace(/"/g, '""')}"`);
    csvLines.push(`Ingredients - "${(product.ingredients || "").replace(/"/g, '""')}"`);
    csvLines.push(`Status - ${product.status || "active"}`);
    csvLines.push(`Created Date - ${product.createdAt ? new Date(product.createdAt).toISOString().split("T")[0] : ""}`);
    csvLines.push(`Updated Date - ${product.updatedAt ? new Date(product.updatedAt).toISOString().split("T")[0] : ""}`);
    
    // Images Section
    csvLines.push("");
    csvLines.push("IMAGES");
    
    if (Array.isArray(product.product_images) && product.product_images.length > 0) {
      csvLines.push(`Total Images - ${product.product_images.length}`);
      product.product_images.forEach((img: any, imgIndex: number) => {
        const url = img.file_url || img.url || img.image_url || img || "";
        if (url) {
          csvLines.push(`Image ${imgIndex + 1} - ${url}`);
        }
      });
    } else if (product.product_images && typeof product.product_images === "object") {
      const url = product.product_images.file_url || product.product_images.url || "";
      if (url) {
        csvLines.push(`Total Images,1 - `);
        csvLines.push(`Image 1 - ${url}`);
      }
    } else if (typeof product.product_images === "string" && product.product_images) {
      csvLines.push(`Total Images,1 - `);
      csvLines.push(`Image 1 - ${product.product_images}`);
    } else {
      csvLines.push(`Total Images,0`);
      csvLines.push(`No images available`);
    }
    
    // Separator between products
    csvLines.push("");
    csvLines.push("---"); // Separator line
    csvLines.push("");
  });
  
  // Global Summary
  csvLines.push(`"GLOBAL SUMMARY"`);
  csvLines.push("");
  
  const totalImages = products.reduce((sum, product) => {
    if (Array.isArray(product.product_images)) return sum + product.product_images.length;
    return sum + (product.product_images ? 1 : 0);
  }, 0);
  
  const activeProducts = products.filter(p => p.status === "active").length;
  const inactiveProducts = products.filter(p => p.status === "inactive").length;
  
  csvLines.push(`Total Products - ${products.length}`);
  csvLines.push(`Active Products - ${activeProducts}`);
  csvLines.push(`Inactive Products - ${inactiveProducts}`);
  csvLines.push(`Total Images - {totalImages}`);
  csvLines.push(`Average Images per Product - ${products.length > 0 ? (totalImages / products.length).toFixed(2) : 0}`);
  csvLines.push(`Products with Images - ${products.filter(p => {
    if (Array.isArray(p.product_images)) return p.product_images.length > 0;
    return !!p.product_images;
  }).length}`);
  csvLines.push(`Products without Images - ${products.filter(p => {
    if (Array.isArray(p.product_images)) return p.product_images.length === 0;
    return !p.product_images;
  }).length}`);
  
  return csvLines.join("\n");
}

  private convertToCSV(products: any[]): string {
    const headers = [
      "SKU ID",
      "Product Name",
      "Category",
      "Sub Category",
      "Brand",
      "Unit Size",
      "Base Price",
      "Final Price",
      "Status",
      "Created Date",
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
      new Date(product.createdAt).toISOString().split("T")[0],
    ]);

    return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
  }

}

export class CategoryController extends BaseController {
  async createCategory(req: Request, res: Response): Promise<void> {
    const categoryService = createCategoryService(req);

    try {
      const user = CategoryController.getLoggedInUser(req);

      let categoryImagesData: any[] = [];
      const files = req.files as Express.Multer.File[];

      if (files && files.length > 0) {
        const folder = process.env.CATEGORY_IMAGE_FOLDER || "frovo/category_images";

        const uploadPromises = files.map(file =>
          imageUploadService
            .uploadToCloudinary(file.buffer, file.originalname, folder)
            .then(({ url, publicId }) =>
              imageUploadService.createCategoryDocumentMetadata(file, url, publicId)
            )
        );

        categoryImagesData = await Promise.all(uploadPromises);

        logger.info(`Uploaded ${categoryImagesData.length} category images`);
      }

      const categoryData: CreateCategoryDTO = {
        category_name: req.body.category_name,
        description: req.body.description,
        category_image: categoryImagesData,
        category_status: req.body.category_status || "active",
      };

      const category = await categoryService.createCategory(categoryData);

      const categoryResponse = {
        id: category._id,
        category_name: category.category_name,
        description: category.description,
        category_status: category.category_status,
        category_image: category.category_image,
        createdAt: category.createdAt,
        updatedAt: category.updatedAt,
        sub_categories: [],
        sub_categories_count: 0,
        product_count: 0,
      };

      res.status(201).json({
        success: true,
        message: "Category created successfully",
        data: categoryResponse,
        meta: {
          createdBy: user.email,
          userRole: user.roles[0]?.key || "unknown",
          timestamp: new Date().toISOString(),
          imagesCount: categoryImagesData.length,
        },
      });
    } catch (error: any) {
      logger.error("Error creating category:", error);

      let statusCode = 500;
      if (error.message.includes("already exists")) {
        statusCode = 409;
      } else if (
        error.name === "ValidationError" ||
        error.message.includes("is required") ||
        error.message.includes("must be") ||
        error.message.includes("Maximum") ||
        error.message.includes("Invalid")
      ) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to create category",
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
          message: "Category not found",
        });
        return;
      }

      const subCategories = await subCategoryService.getSubCategoriesByCategory(id);

      const productCount = await categoryService.getProductCountByCategory(id);

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
          product_count: 0,
          createdAt: subCat.createdAt,
          updatedAt: subCat.updatedAt,
        })),
        sub_categories_count: subCategories.length,
        product_count: productCount,
      };

      res.status(200).json({
        success: true,
        message: "Category retrieved successfully with sub-categories",
        data: categoryResponse,
      });
    } catch (error: any) {
      logger.error("Error fetching category:", error);

      const statusCode = error.message.includes("Invalid category ID") ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to fetch category",
      });
    }
  }
  async getAllCategories(req: Request, res: Response): Promise<void> {
    const categoryService = createCategoryService(req);

    try {
      const filters: CategoryFilterDTO = {
        status: req.query.status as "active" | "inactive",
        category_name: req.query.category_name as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      };

      if (filters.page! < 1) filters.page = 1;
      if (filters.limit! < 1 || filters.limit! > 100) filters.limit = 10;

      const result = await categoryService.getAllCategoriesWithFilters(filters);

      res.status(200).json({
        success: true,
        message: "Categories retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      logger.error("Error fetching all categories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch categories",
      });
    }
  }

  async updateCategory(req: Request, res: Response): Promise<void> {
    const categoryService = createCategoryService(req);

    try {
      const { id } = req.params;
      const user = CategoryController.getLoggedInUser(req);

      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        const folder = process.env.CATEGORY_IMAGE_FOLDER || "frovo/category_images";

        const uploadPromises = files.map(file =>
          imageUploadService
            .uploadToCloudinary(file.buffer, file.originalname, folder)
            .then(({ url, publicId }) =>
              imageUploadService.createCategoryDocumentMetadata(file, url, publicId)
            )
        );

        const newCategoryImages = await Promise.all(uploadPromises);

        if (req.body.replace_images === "true") {
          req.body.category_images = newCategoryImages;
        } else {
          const currentCategory = await categoryService.getCategoryById(id);
          if (currentCategory) {
            const currentImages = (currentCategory as any).category_images || [];
            req.body.category_images = [...currentImages, ...newCategoryImages];
          }
        }

        logger.info(`Uploaded ${newCategoryImages.length} new category images`);
      }

      const updateData: UpdateCategoryDTO = { ...req.body };
      const updatedCategory = await categoryService.updateCategory(id, updateData);

      const subCategoryService = createSubCategoryService(req);
      const subCategories = await subCategoryService.getSubCategoriesByCategory(id);
      const productCount = await categoryService.getProductCountByCategory(id);

      const categoryResponse = {
        id: updatedCategory._id,
        category_name: updatedCategory.category_name,
        description: updatedCategory.description,
        category_status: updatedCategory.category_status,
        category_image: updatedCategory.category_image,
        createdAt: updatedCategory.createdAt,
        updatedAt: updatedCategory.updatedAt,
        sub_categories: subCategories.map(subCat => ({
          id: subCat._id,
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

      res.status(200).json({
        success: true,
        message: "Category updated successfully",
        data: categoryResponse,
        meta: {
          updatedBy: user.email,
          userRole: user.roles[0]?.key || "unknown",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error updating category:", error);

      let statusCode = 500;
      if (error.message.includes("Invalid category ID")) {
        statusCode = 400;
      } else if (error.message.includes("not found")) {
        statusCode = 404;
      } else if (error.message.includes("already exists")) {
        statusCode = 409;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to update category",
      });
    }
  }
  async updateCategoryStatus(req: Request, res: Response): Promise<void> {
    const categoryService = createCategoryService(req);

    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = CategoryController.getLoggedInUser(req);

      if (!status || !["active", "inactive"].includes(status)) {
        res.status(400).json({
          success: false,
          message: "Valid status (active/inactive) is required",
        });
        return;
      }

      const updateData: UpdateCategoryDTO = { category_status: status };
      const updatedCategory = await categoryService.updateCategory(id, updateData);

      const subCategoryService = createSubCategoryService(req);
      const subCategories = await subCategoryService.getSubCategoriesByCategory(id);
      const productCount = await categoryService.getProductCountByCategory(id);

      const categoryResponse = {
        id: updatedCategory._id,
        category_name: updatedCategory.category_name,
        description: updatedCategory.description,
        category_status: updatedCategory.category_status,
        category_image: updatedCategory.category_image,
        createdAt: updatedCategory.createdAt,
        updatedAt: updatedCategory.updatedAt,
        sub_categories: subCategories.map(subCat => ({
          id: subCat._id,
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

      res.status(200).json({
        success: true,
        message: "Category status updated successfully",
        data: categoryResponse,
        meta: {
          updatedBy: user.email,
          userRole: user.roles[0]?.key || "unknown",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error updating category status:", error);

      let statusCode = 500;
      if (error.message.includes("Invalid category ID")) {
        statusCode = 400;
      } else if (error.message.includes("not found")) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to update category status",
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
          affectedCatalogues: result.affectedCatalogues,
        },
        meta: {
          deletedBy: user.email,
          userRole: user.roles[0]?.key || "unknown",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error deleting category:", error);

      let statusCode = 500;
      if (error.message.includes("Invalid category ID")) {
        statusCode = 400;
      } else if (error.message.includes("not found")) {
        statusCode = 404;
      } else if (error.message.includes("Cannot delete category")) {
        statusCode = 409;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to delete category",
      });
    }
  }

  async getCategoryDashboardStats(req: Request, res: Response): Promise<void> {
    const categoryService = createCategoryService(req);

    try {
      const stats = await categoryService.getCategoryStats();

      res.status(200).json({
        success: true,
        message: "Category dashboard statistics retrieved successfully",
        data: stats,
      });
    } catch (error: any) {
      logger.error("Error fetching category dashboard stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch category dashboard statistics",
      });
    }
  }

  async uploadCategoryImage(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: "No image provided",
        });
        return;
      }

      const folder = process.env.CATEGORY_IMAGE_FOLDER || "frovo/category_images";
      const { url, publicId } = await imageUploadService.uploadToCloudinary(
        files[0].buffer,
        files[0].originalname,
        folder
      );

      const imageData = imageUploadService.createCategoryDocumentMetadata(files[0], url, publicId);

      res.status(200).json({
        success: true,
        message: "Category image uploaded successfully",
        data: imageData,
      });
    } catch (error: any) {
      logger.error("Error uploading category image:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload category image",
      });
    }
  }
  async exportCategoryWithSubCategoriesCSV(req: Request, res: Response): Promise<void> {
    const categoryService = createCategoryService(req);
    const subCategoryService = createSubCategoryService(req);

    try {
      const { id } = req.params;

      const category = await categoryService.getCategoryById(id);

      if (!category) {
        res.status(404).json({
          success: false,
          message: "Category not found",
        });
        return;
      }

      const subCategories = await subCategoryService.getSubCategoriesByCategory(id);

      const categoryProductCount = await categoryService.getProductCountByCategory(id);

      const subCategoryIds = subCategories.map(subCat => subCat._id.toString());
      const subCategoryProductCounts =
        subCategoryIds.length > 0
          ? await subCategoryService.getProductCountsForSubCategories(subCategoryIds)
          : new Map<string, number>();

      const categoryData = {
        category: {
          id: category._id.toString(),
          category_name: category.category_name,
          description: category.description,
          category_status: category.category_status,
          category_image: category.category_image,
          product_count: categoryProductCount,
          createdAt: category.createdAt,
          updatedAt: category.updatedAt,
        },
        sub_categories: subCategories.map(subCat => ({
          id: subCat._id.toString(),
          sub_category_name: subCat.sub_category_name,
          description: subCat.description,
          sub_category_status: subCat.sub_category_status,
          sub_category_image: subCat.sub_category_image,
          product_count: subCategoryProductCounts.get(subCat._id.toString()) || 0,
          createdAt: subCat.createdAt,
          updatedAt: subCat.updatedAt,
        })),
      };

      const csv = this.convertCategoryWithSubCategoriesToCSV(categoryData);

      const fileName = `category-${category.category_name.toLowerCase().replace(/\s+/g, "-")}-${new Date().toISOString().split("T")[0]}.csv`;

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
      res.status(200).send(csv);
    } catch (error: any) {
      logger.error("Error exporting category with sub-categories CSV:", error);

      let statusCode = 500;
      if (error.message.includes("Invalid category ID")) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to export category with sub-categories",
      });
    }
  }
  private convertCategoryWithSubCategoriesToCSV(data: any): string {
  const { category, sub_categories } = data;

  // Category Details Section
  const categoryHeaders = ["CATEGORY DETAILS"];
  const categoryDataHeaders = [
    "Category ID",
    "Category Name", 
    "Description",
    "Status",
    "Total Images",
    "Image URLs",
    "Total Products",
    "Total Sub-Categories",
    "Created Date",
    "Updated Date"
  ];

  let categoryImageUrls = "";
  let categoryImageCount = 0;
  
  // Process category images
  if (Array.isArray(category.category_image) && category.category_image.length > 0) {
    categoryImageCount = category.category_image.length;
    const urls = category.category_image
      .map((img: any, index: number) => {
        const url = img.file_url || img.url || "";
        return url ? `${index + 1}. ${url}` : "";
      })
      .filter((url: string) => url.trim() !== "");
    categoryImageUrls = urls.join("\n");
  } else if (
    typeof category.category_image === "object" &&
    category.category_image !== null
  ) {
    categoryImageCount = 1;
    categoryImageUrls = category.category_image.file_url || "";
  } else if (typeof category.category_image === "string") {
    categoryImageCount = 1;
    categoryImageUrls = category.category_image;
  }

  const categoryDataRows = [
    category.id || "",
    `"${(category.category_name || "").replace(/"/g, '""')}"`,
    `"${(category.description || "").replace(/"/g, '""')}"`,
    category.category_status || "active",
    categoryImageCount,
    `"${categoryImageUrls.replace(/"/g, '""')}"`,
    category.product_count || 0,
    sub_categories.length,
    category.createdAt ? new Date(category.createdAt).toISOString().split("T")[0] : "",
    category.updatedAt ? new Date(category.updatedAt).toISOString().split("T")[0] : "",
  ];

  // Sub-Categories Details Section
  const subCategoryHeaders = ["SUB-CATEGORIES DETAILS"];
  const subCategoryDataHeaders = [
    "Sub-Category ID",
    "Sub-Category Name", 
    "Description",
    "Status",
    "Total Images",
    "Image URLs",
    "Product Count",
    "Category ID",
    "Category Name",
    "Created Date",
    "Updated Date"
  ];

  const subCategoryDataRows = sub_categories.map((subCat: any, index: number) => {
    let subCategoryImageUrls = "";
    let subCategoryImageCount = 0;
    
    // Process sub-category images
    if (Array.isArray(subCat.sub_category_image) && subCat.sub_category_image.length > 0) {
      subCategoryImageCount = subCat.sub_category_image.length;
      const urls = subCat.sub_category_image
        .map((img: any, imgIndex: number) => {
          const url = img.file_url || img.url || "";
          return url ? `${imgIndex + 1}. ${url}` : "";
        })
        .filter((url: string) => url.trim() !== "");
      subCategoryImageUrls = urls.join("\n");
    } else if (
      typeof subCat.sub_category_image === "object" &&
      subCat.sub_category_image !== null
    ) {
      subCategoryImageCount = 1;
      subCategoryImageUrls = subCat.sub_category_image.file_url || "";
    } else if (typeof subCat.sub_category_image === "string") {
      subCategoryImageCount = 1;
      subCategoryImageUrls = subCat.sub_category_image;
    }

    return [
      subCat.id || "",
      `"${(subCat.sub_category_name || "").replace(/"/g, '""')}"`,
      `"${(subCat.description || "").replace(/"/g, '""')}"`,
      subCat.sub_category_status || "active",
      subCategoryImageCount,
      `"${subCategoryImageUrls.replace(/"/g, '""')}"`,
      subCat.product_count || 0,
      category.id || "",
      `"${(category.category_name || "").replace(/"/g, '""')}"`,
      subCat.createdAt ? new Date(subCat.createdAt).toISOString().split("T")[0] : "",
      subCat.updatedAt ? new Date(subCat.updatedAt).toISOString().split("T")[0] : "",
    ];
  });

  // Summary Section
  const summaryHeaders = ["EXPORT SUMMARY"];
  const summaryData = [
    ["Total Sub-Categories:", sub_categories.length],
    ["Total Products in Category:", category.product_count || 0],
    ["Active Sub-Categories:", sub_categories.filter((sc: any) => sc.sub_category_status === "active").length],
    ["Inactive Sub-Categories:", sub_categories.filter((sc: any) => sc.sub_category_status === "inactive").length],
    ["Category Status:", category.category_status || "active"],
    ["Total Category Images:", categoryImageCount],
    ["Total Sub-Category Images:", sub_categories.reduce((total: number, sc: any) => {
      if (Array.isArray(sc.sub_category_image)) return total + sc.sub_category_image.length;
      return total + (sc.sub_category_image ? 1 : 0);
    }, 0)],
    ["Export Date:", new Date().toISOString().split("T")[0]],
    ["Export Time:", new Date().toISOString().split("T")[1].split(".")[0]],
  ];

  // Combine all sections
  const csvLines: string[] = [];

  // Section 1: Category Details
  csvLines.push(categoryHeaders.join(","));
  csvLines.push(categoryDataHeaders.join(","));
  csvLines.push(categoryDataRows.join(","));
  csvLines.push(""); // Empty line for separation

  // Section 2: Sub-Categories Details
  csvLines.push(subCategoryHeaders.join(","));
  csvLines.push(subCategoryDataHeaders.join(","));
  subCategoryDataRows.forEach(row => {
    csvLines.push(row.join(","));
  });
  csvLines.push(""); // Empty line for separation

  // Section 3: Summary
  csvLines.push(summaryHeaders.join(","));
  summaryData.forEach(([label, value]) => {
    csvLines.push(`${label},${value}`);
  });

  return csvLines.join("\n");
}
  async exportAllCategoriesCSV(req: Request, res: Response): Promise<void> {
  const categoryService = createCategoryService(req);
  const subCategoryService = createSubCategoryService(req);

  try {
    const filters: CategoryFilterDTO = {
      page: 1,
      limit: parseInt(process.env.EXPORT_MAX_RECORDS || "100000"),
    };
    const result = await categoryService.getAllCategoriesWithFilters(filters);
    
    // Fetch all subcategories for each category with complete details
    const categoriesWithCompleteSubCategories = await Promise.all(
      result.categories.map(async (category: any) => {
        try {
          // Get subcategories for this category
          const subCategories = await subCategoryService.getSubCategoriesByCategory(category.id);
          
          // Get product counts for subcategories
          const subCategoryIds = subCategories.map((subCat: any) => subCat._id.toString());
          const subCategoryProductCounts = subCategoryIds.length > 0
            ? await subCategoryService.getProductCountsForSubCategories(subCategoryIds)
            : new Map<string, number>();
          
          // Format subcategories with complete details
          const formattedSubCategories = subCategories.map((subCat: any) => {
            const productCount = subCategoryProductCounts.get(subCat._id.toString()) || 0;
            
            // Process sub-category images
            let subCategoryImageUrls = "";
            let subCategoryImageCount = 0;
            
            if (Array.isArray(subCat.sub_category_image) && subCat.sub_category_image.length > 0) {
              subCategoryImageCount = subCat.sub_category_image.length;
              const urls = subCat.sub_category_image
                .map((img: any) => img.file_url || img.url || "")
                .filter((url: string) => url.trim() !== "");
              subCategoryImageUrls = urls.join(" | ");
            } else if (
              typeof subCat.sub_category_image === "object" &&
              subCat.sub_category_image !== null
            ) {
              subCategoryImageCount = 1;
              subCategoryImageUrls = subCat.sub_category_image.file_url || "";
            } else if (typeof subCat.sub_category_image === "string") {
              subCategoryImageCount = 1;
              subCategoryImageUrls = subCat.sub_category_image;
            }
            
            return {
              id: subCat._id.toString(),
              sub_category_name: subCat.sub_category_name,
              description: subCat.description,
              sub_category_status: subCat.sub_category_status,
              image_count: subCategoryImageCount,
              image_urls: subCategoryImageUrls,
              product_count: productCount,
              created_date: subCat.createdAt ? new Date(subCat.createdAt).toISOString().split("T")[0] : "",
              updated_date: subCat.updatedAt ? new Date(subCat.updatedAt).toISOString().split("T")[0] : "",
            };
          });
          
          return {
            ...category,
            sub_categories: formattedSubCategories,
          };
        } catch (error) {
          logger.error(`Error fetching subcategories for category ${category.id}:`, error);
          return {
            ...category,
            sub_categories: [],
          };
        }
      })
    );
    
    const csv = this.convertAllCategoriesToCSV(categoriesWithCompleteSubCategories);

    res.setHeader("Content-Type", "text/csv");
    res.setHeader("Content-Disposition", "attachment; filename=all-categories-with-subcategories.csv");
    res.status(200).send(csv);
  } catch (error: any) {
    logger.error("Error exporting all categories CSV:", error);
    res.status(500).json({
      success: false,
      message: "Failed to export categories",
    });
  }
}

private convertAllCategoriesToCSV(categories: any[]): string {
  const csvLines: string[] = [];
  
  // Add header with timestamp
  csvLines.push(`"COMPLETE CATEGORIES AND SUB-CATEGORIES EXPORT"`);
  csvLines.push(`"Export Date: ${new Date().toISOString().split('T')[0]}"`);
  csvLines.push(`"Export Time: ${new Date().toISOString().split('T')[1].split('.')[0]}"`);
  csvLines.push(`"Total Categories: ${categories.length}"`);
  csvLines.push("");

  // Process each category
  categories.forEach((category, catIndex) => {
    // SECTION: CATEGORY INFORMATION
    csvLines.push(`"CATEGORY ${catIndex + 1}: ${category.category_name}"`);
    csvLines.push("Field,Value");
    
    // Process category images
    let categoryImageUrls = "";
    let categoryImageCount = 0;
    
    if (Array.isArray(category.category_image) && category.category_image.length > 0) {
      categoryImageCount = category.category_image.length;
      const urls = category.category_image
        .map((img: any, index: number) => img.file_url || img.url || "")
        .filter((url: string) => url.trim() !== "");
      categoryImageUrls = urls.join(" | ");
    } else if (
      typeof category.category_image === "object" &&
      category.category_image !== null
    ) {
      categoryImageCount = 1;
      categoryImageUrls = category.category_image.file_url || "";
    } else if (typeof category.category_image === "string") {
      categoryImageCount = 1;
      categoryImageUrls = category.category_image;
    }
    
    // Category Details
    csvLines.push(`Category ID,${category.id || ""}`);
    csvLines.push(`Category Name,"${(category.category_name || "").replace(/"/g, '""')}"`);
    csvLines.push(`Description,"${(category.description || "").replace(/"/g, '""')}"`);
    csvLines.push(`Status,${category.category_status || "active"}`);
    csvLines.push(`Total Images,${categoryImageCount}`);
    csvLines.push(`Image URLs,"${categoryImageUrls.replace(/"/g, '""')}"`);
    csvLines.push(`Sub Categories Count,${category.sub_categories_count || 0}`);
    csvLines.push(`Product Count,${category.product_count || 0}`);
    csvLines.push(`Created Date,${category.createdAt ? new Date(category.createdAt).toISOString().split("T")[0] : ""}`);
    csvLines.push(`Updated Date,${category.updatedAt ? new Date(category.updatedAt).toISOString().split("T")[0] : ""}`);
    
    csvLines.push(""); // Empty line
    
    // SECTION: SUB-CATEGORIES FOR THIS CATEGORY
    if (category.sub_categories && category.sub_categories.length > 0) {
      csvLines.push(`"SUB-CATEGORIES IN ${category.category_name.toUpperCase()}"`);
      csvLines.push("No.,Sub-Category ID,Sub-Category Name,Description,Status,Image Count,Image URLs,Product Count,Created Date,Updated Date");
      
      category.sub_categories.forEach((subCat: any, subIndex: number) => {
        csvLines.push([
          subIndex + 1,
          subCat.id,
          `"${(subCat.sub_category_name || "").replace(/"/g, '""')}"`,
          `"${(subCat.description || "").replace(/"/g, '""')}"`,
          subCat.sub_category_status || "active",
          subCat.image_count,
          `"${subCat.image_urls.replace(/"/g, '""')}"`,
          subCat.product_count || 0,
          subCat.created_date,
          subCat.updated_date,
        ].join(","));
      });
      
      // Sub-categories summary
      const activeSubCats = category.sub_categories.filter((sc: any) => sc.sub_category_status === "active").length;
      const inactiveSubCats = category.sub_categories.filter((sc: any) => sc.sub_category_status === "inactive").length;
      const totalSubCatImages = category.sub_categories.reduce((sum: number, sc: any) => sum + (sc.image_count || 0), 0);
      const totalSubCatProducts = category.sub_categories.reduce((sum: number, sc: any) => sum + (sc.product_count || 0), 0);
      
      csvLines.push("");
      csvLines.push(`"SUMMARY FOR ${category.category_name.toUpperCase()}"`);
      csvLines.push(`Total Sub-Categories,${category.sub_categories.length}`);
      csvLines.push(`Active Sub-Categories,${activeSubCats}`);
      csvLines.push(`Inactive Sub-Categories,${inactiveSubCats}`);
      csvLines.push(`Total Sub-Category Images,${totalSubCatImages}`);
      csvLines.push(`Total Products in Sub-Categories,${totalSubCatProducts}`);
    } else {
      csvLines.push(`"NO SUB-CATEGORIES FOUND FOR ${category.category_name.toUpperCase()}"`);
    }
    
    csvLines.push(""); // Double empty line between categories
    csvLines.push("");
  });
  
  // GLOBAL SUMMARY
  csvLines.push(`"GLOBAL SUMMARY"`);
  
  const totalCategories = categories.length;
  const activeCategories = categories.filter(cat => cat.category_status === "active").length;
  const inactiveCategories = categories.filter(cat => cat.category_status === "inactive").length;
  
  const allSubCategories = categories.flatMap(cat => cat.sub_categories || []);
  const totalSubCategories = allSubCategories.length;
  const activeSubCategories = allSubCategories.filter(sc => sc.sub_category_status === "active").length;
  const inactiveSubCategories = allSubCategories.filter(sc => sc.sub_category_status === "inactive").length;
  
  const totalProductsInCategories = categories.reduce((sum, cat) => sum + (cat.product_count || 0), 0);
  const totalProductsInSubCategories = allSubCategories.reduce((sum, sc) => sum + (sc.product_count || 0), 0);
  
  const totalCategoryImages = categories.reduce((sum, cat) => {
    if (Array.isArray(cat.category_image)) return sum + cat.category_image.length;
    return sum + (cat.category_image ? 1 : 0);
  }, 0);
  
  const totalSubCategoryImages = allSubCategories.reduce((sum, sc) => sum + (sc.image_count || 0), 0);
  
  csvLines.push(`Total Categories,${totalCategories}`);
  csvLines.push(`Active Categories,${activeCategories}`);
  csvLines.push(`Inactive Categories,${inactiveCategories}`);
  csvLines.push(`Total Sub-Categories,${totalSubCategories}`);
  csvLines.push(`Active Sub-Categories,${activeSubCategories}`);
  csvLines.push(`Inactive Sub-Categories,${inactiveSubCategories}`);
  csvLines.push(`Total Category Images,${totalCategoryImages}`);
  csvLines.push(`Total Sub-Category Images,${totalSubCategoryImages}`);
  csvLines.push(`Total Products in Categories,${totalProductsInCategories}`);
  csvLines.push(`Total Products in Sub-Categories,${totalProductsInSubCategories}`);
  csvLines.push(`Total Products (All),${totalProductsInCategories + totalProductsInSubCategories}`);
  
  return csvLines.join("\n");
}
}
export class SubCategoryController extends BaseController {
  async createSubCategory(req: Request, res: Response): Promise<void> {
    const subCategoryService = createSubCategoryService(req);

    try {
      const user = SubCategoryController.getLoggedInUser(req);

      let subCategoryImagesData: any[] = [];
      const files = req.files as Express.Multer.File[];

      if (files && files.length > 0) {
        const folder = process.env.SUBCATEGORY_IMAGE_FOLDER || "frovo/subcategory_images";

        const uploadPromises = files.map(file =>
          imageUploadService
            .uploadToCloudinary(file.buffer, file.originalname, folder)
            .then(({ url, publicId }) =>
              imageUploadService.createSubCategoryDocumentMetadata(file, url, publicId)
            )
        );

        subCategoryImagesData = await Promise.all(uploadPromises);

        logger.info(`Uploaded ${subCategoryImagesData.length} sub-category images`);
      }

      const subCategoryData: CreateSubCategoryDTO = {
        sub_category_name: req.body.sub_category_name,
        description: req.body.description,
        category_id: req.body.category_id,
        sub_category_image: subCategoryImagesData,
        sub_category_status: req.body.sub_category_status || "active",
      };

      const subCategory = await subCategoryService.createSubCategory(subCategoryData);

      const categoryService = createCategoryService(req);
      const parentCategory = await categoryService.getCategoryById(req.body.category_id);

      const subCategoryResponse = {
        id: subCategory._id,
        sub_category_name: subCategory.sub_category_name,
        description: subCategory.description,
        category_id: subCategory.category_id,
        category_name: parentCategory?.category_name || "",
        sub_category_status: subCategory.sub_category_status,
        sub_category_image: subCategory.sub_category_image,
        createdAt: subCategory.createdAt,
        updatedAt: subCategory.updatedAt,
        product_count: 0,
      };

      res.status(201).json({
        success: true,
        message: "Sub-category created successfully",
        data: subCategoryResponse,
        meta: {
          createdBy: user.email,
          userRole: user.roles[0]?.key || "unknown",
          timestamp: new Date().toISOString(),
          imagesCount: subCategoryImagesData.length,
        },
      });
    } catch (error: any) {
      logger.error("Error creating sub-category:", error);

      let statusCode = 500;
      if (error.message.includes("already exists")) {
        statusCode = 409;
      } else if (error.message.includes("not found")) {
        statusCode = 404;
      } else if (
        error.name === "ValidationError" ||
        error.message.includes("is required") ||
        error.message.includes("must be") ||
        error.message.includes("Maximum") ||
        error.message.includes("Invalid")
      ) {
        statusCode = 400;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to create sub-category",
      });
    }
  }

  async getSubCategoryById(req: Request, res: Response): Promise<void> {
    const subCategoryService = createSubCategoryService(req);

    try {
      const { id } = req.params;
      const subCategory = (await subCategoryService.getSubCategoryById(id)) as any;

      if (!subCategory) {
        res.status(404).json({
          success: false,
          message: "Sub-category not found",
        });
        return;
      }

      const categoryData = subCategory.category_id;
      const categoryId = categoryData?._id?.toString() || categoryData?.toString() || "";
      const categoryName = categoryData?.category_name || "";

      const productCount = await subCategoryService.getProductCountBySubCategory(id);

      const subCategoryResponse = {
        id: subCategory._id,
        sub_category_name: subCategory.sub_category_name,
        description: subCategory.description,
        category_id: categoryId,
        category_name: categoryName,
        sub_category_status: subCategory.sub_category_status,
        sub_category_image: subCategory.sub_category_image,
        createdAt: subCategory.createdAt,
        updatedAt: subCategory.updatedAt,
        product_count: productCount,
      };

      res.status(200).json({
        success: true,
        message: "Sub-category retrieved successfully",
        data: subCategoryResponse,
      });
    } catch (error: any) {
      logger.error("Error fetching sub-category:", error);

      const statusCode = error.message.includes("Invalid sub-category ID") ? 400 : 500;
      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to fetch sub-category",
      });
    }
  }

  async getSubCategoriesByCategory(req: Request, res: Response): Promise<void> {
    const subCategoryService = createSubCategoryService(req);
    const categoryService = createCategoryService(req);

    try {
      const { categoryId } = req.params;

      const parentCategory = await categoryService.getCategoryById(categoryId);
      if (!parentCategory) {
        res.status(404).json({
          success: false,
          message: "Category not found",
        });
        return;
      }

      const subCategories = await subCategoryService.getSubCategoriesByCategory(categoryId);

      const formattedSubCategories = await Promise.all(
        subCategories.map(async (subCat: any) => {
          const productCount = await subCategoryService.getProductCountBySubCategory(
            subCat._id.toString()
          );
          return {
            id: subCat._id,
            sub_category_name: subCat.sub_category_name,
            description: subCat.description,
            category_id: subCat.category_id,
            category_name: parentCategory.category_name,
            sub_category_status: subCat.sub_category_status,
            sub_category_image: subCat.sub_category_image,
            createdAt: subCat.createdAt,
            updatedAt: subCat.updatedAt,
            product_count: productCount,
          };
        })
      );

      res.status(200).json({
        success: true,
        message: "Sub-categories retrieved successfully",
        data: {
          category_id: categoryId,
          category_name: parentCategory.category_name,
          sub_categories: formattedSubCategories,
          total: formattedSubCategories.length,
        },
      });
    } catch (error: any) {
      logger.error("Error fetching sub-categories by category:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch sub-categories",
      });
    }
  }

  async getAllSubCategories(req: Request, res: Response): Promise<void> {
    const subCategoryService = createSubCategoryService(req);

    try {
      const filters: SubCategoryFilterDTO = {
        status: req.query.status as "active" | "inactive",
        category_id: req.query.category_id as string,
        sub_category_name: req.query.sub_category_name as string,
        page: req.query.page ? parseInt(req.query.page as string) : 1,
        limit: req.query.limit ? parseInt(req.query.limit as string) : 10,
      };

      if (filters.page! < 1) filters.page = 1;
      if (filters.limit! < 1 || filters.limit! > 100) filters.limit = 10;

      const result = await subCategoryService.getAllSubCategoriesWithFilters(filters);

      res.status(200).json({
        success: true,
        message: "Sub-categories retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      logger.error("Error fetching all sub-categories:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch sub-categories",
      });
    }
  }

  async updateSubCategory(req: Request, res: Response): Promise<void> {
    const subCategoryService = createSubCategoryService(req);

    try {
      const { id } = req.params;
      const user = SubCategoryController.getLoggedInUser(req);

      const files = req.files as Express.Multer.File[];
      if (files && files.length > 0) {
        const folder = process.env.SUBCATEGORY_IMAGE_FOLDER || "frovo/subcategory_images";

        const uploadPromises = files.map(file =>
          imageUploadService
            .uploadToCloudinary(file.buffer, file.originalname, folder)
            .then(({ url, publicId }) =>
              imageUploadService.createSubCategoryDocumentMetadata(file, url, publicId)
            )
        );

        const newSubCategoryImages = await Promise.all(uploadPromises);

        if (req.body.replace_images === "true") {
          req.body.sub_category_image = newSubCategoryImages;
        } else {
          const currentSubCategory = await subCategoryService.getSubCategoryById(id);
          if (currentSubCategory) {
            const currentImages = (currentSubCategory as any).sub_category_image || [];
            req.body.sub_category_image = [...currentImages, ...newSubCategoryImages];
          }
        }

        logger.info(`Uploaded ${newSubCategoryImages.length} new sub-category images`);
      }

      const updateData: UpdateSubCategoryDTO = { ...req.body };
      const updatedSubCategory = (await subCategoryService.updateSubCategory(
        id,
        updateData
      )) as any;

      const categoryData = updatedSubCategory.category_id;
      const categoryId = categoryData?._id?.toString() || categoryData?.toString() || "";
      const categoryName = categoryData?.category_name || "";

      const productCount = await subCategoryService.getProductCountBySubCategory(id);

      const subCategoryResponse = {
        id: updatedSubCategory._id,
        sub_category_name: updatedSubCategory.sub_category_name,
        description: updatedSubCategory.description,
        category_id: categoryId,
        category_name: categoryName,
        sub_category_status: updatedSubCategory.sub_category_status,
        sub_category_image: updatedSubCategory.sub_category_image,
        createdAt: updatedSubCategory.createdAt,
        updatedAt: updatedSubCategory.updatedAt,
        product_count: productCount,
      };

      res.status(200).json({
        success: true,
        message: "Sub-category updated successfully",
        data: subCategoryResponse,
        meta: {
          updatedBy: user.email,
          userRole: user.roles[0]?.key || "unknown",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error updating sub-category:", error);

      let statusCode = 500;
      if (error.message.includes("Invalid sub-category ID")) {
        statusCode = 400;
      } else if (error.message.includes("not found")) {
        statusCode = 404;
      } else if (error.message.includes("already exists")) {
        statusCode = 409;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to update sub-category",
      });
    }
  }
  async updateSubCategoryStatus(req: Request, res: Response): Promise<void> {
    const subCategoryService = createSubCategoryService(req);

    try {
      const { id } = req.params;
      const { status } = req.body;
      const user = SubCategoryController.getLoggedInUser(req);

      if (!status || !["active", "inactive"].includes(status)) {
        res.status(400).json({
          success: false,
          message: "Valid status (active/inactive) is required",
        });
        return;
      }

      const updateData: UpdateSubCategoryDTO = { sub_category_status: status };
      const updatedSubCategory = (await subCategoryService.updateSubCategory(
        id,
        updateData
      )) as any;

      const categoryData = updatedSubCategory.category_id;
      const categoryId = categoryData?._id?.toString() || categoryData?.toString() || "";
      const categoryName = categoryData?.category_name || "";

      const productCount = await subCategoryService.getProductCountBySubCategory(id);

      const subCategoryResponse = {
        id: updatedSubCategory._id,
        sub_category_name: updatedSubCategory.sub_category_name,
        description: updatedSubCategory.description,
        category_id: categoryId,
        category_name: categoryName,
        sub_category_status: updatedSubCategory.sub_category_status,
        sub_category_image: updatedSubCategory.sub_category_image,
        createdAt: updatedSubCategory.createdAt,
        updatedAt: updatedSubCategory.updatedAt,
        product_count: productCount,
      };

      res.status(200).json({
        success: true,
        message: "Sub-category status updated successfully",
        data: subCategoryResponse,
        meta: {
          updatedBy: user.email,
          userRole: user.roles[0]?.key || "unknown",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error updating sub-category status:", error);

      let statusCode = 500;
      if (error.message.includes("Invalid sub-category ID")) {
        statusCode = 400;
      } else if (error.message.includes("not found")) {
        statusCode = 404;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to update sub-category status",
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
          affectedCatalogues: result.affectedCatalogues,
        },
        meta: {
          deletedBy: user.email,
          userRole: user.roles[0]?.key || "unknown",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error deleting sub-category:", error);

      let statusCode = 500;
      if (error.message.includes("Invalid sub-category ID")) {
        statusCode = 400;
      } else if (error.message.includes("not found")) {
        statusCode = 404;
      } else if (error.message.includes("Cannot delete sub-category")) {
        statusCode = 409;
      }

      res.status(statusCode).json({
        success: false,
        message: error.message || "Failed to delete sub-category",
      });
    }
  }

  async uploadSubCategoryImage(req: Request, res: Response): Promise<void> {
    try {
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: "No image provided",
        });
        return;
      }

      const folder = process.env.SUBCATEGORY_IMAGE_FOLDER || "frovo/subcategory_images";
      const { url, publicId } = await imageUploadService.uploadToCloudinary(
        files[0].buffer,
        files[0].originalname,
        folder
      );

      const imageData = imageUploadService.createCategoryDocumentMetadata(files[0], url, publicId);

      res.status(200).json({
        success: true,
        message: "Sub-category image uploaded successfully",
        data: imageData,
      });
    } catch (error: any) {
      logger.error("Error uploading sub-category image:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Failed to upload sub-category image",
      });
    }
  }

  async exportAllSubCategoriesCSV(req: Request, res: Response): Promise<void> {
    const subCategoryService = createSubCategoryService(req);

    try {
      const filters: SubCategoryFilterDTO = {
        status: req.query.status as "active" | "inactive",
        category_id: req.query.category_id as string,
        sub_category_name: req.query.sub_category_name as string,
        page: 1,
        limit: parseInt(process.env.EXPORT_MAX_RECORDS || "100000"),
      };

      const result = await subCategoryService.getAllSubCategoriesWithFilters(filters);
      const csv = this.convertAllSubCategoriesToCSV(result.sub_categories);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=all-subcategories.csv");
      res.status(200).send(csv);
    } catch (error: any) {
      logger.error("Error exporting all sub-categories CSV:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export sub-categories",
      });
    }
  }

  private convertAllSubCategoriesToCSV(subCategories: any[]): string {
    const headers = [
      "Sub-Category ID",
      "Sub-Category Name",
      "Description",
      "Category ID",
      "Category Name",
      "Status",
      "Image URLs",
      "Product Count",
      "Created Date",
      "Updated Date",
    ];

    const rows = subCategories.map(subCategory => {
      let subCategoryImageUrls = "";
      if (Array.isArray(subCategory.sub_category_image)) {
        subCategoryImageUrls = subCategory.sub_category_image
          .map((img: any) => img.file_url || "")
          .filter((url: string) => url)
          .join("; ");
      } else if (
        typeof subCategory.sub_category_image === "object" &&
        subCategory.sub_category_image !== null
      ) {
        subCategoryImageUrls = subCategory.sub_category_image.file_url || "";
      } else if (typeof subCategory.sub_category_image === "string") {
        subCategoryImageUrls = subCategory.sub_category_image;
      }

      return [
        subCategory.id || "",
        `"${(subCategory.sub_category_name || "").replace(/"/g, '""')}"`,
        `"${(subCategory.description || "").replace(/"/g, '""')}"`,
        subCategory.category_id || "",
        `"${(subCategory.category_name || "").replace(/"/g, '""')}"`,
        subCategory.sub_category_status || "active",
        `"${subCategoryImageUrls.replace(/"/g, '""')}"`,
        subCategory.product_count || 0,
        subCategory.createdAt ? new Date(subCategory.createdAt).toISOString().split("T")[0] : "",
        subCategory.updatedAt ? new Date(subCategory.updatedAt).toISOString().split("T")[0] : "",
      ];
    });

    return [headers.join(","), ...rows.map(row => row.join(","))].join("\n");
  }
}

export const catalogueController = new CatalogueController();
export const categoryController = new CategoryController();
export const subCategoryController = new SubCategoryController();
