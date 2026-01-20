import { Request, Response } from "express";
import { productService } from "../services/product.service";
import { asyncHandler } from "../utils/asyncHandler.util";
import { sendSuccess, sendError } from "../utils/response.util";

export const getProductById = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const product = await productService.getProductById(id!);

    return sendSuccess(res, product, "Product retrieved successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, error.message.includes("not found") ? 404 : 400);
    } else {
      return sendError(res, "Failed to retrieve product", 500);
    }
  }
});

export const getAllProducts = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { category, brand, isActive, search } = req.query;

    const filters = {
      category: category as string,
      brand: brand as string,
      isActive: isActive === "true" ? true : isActive === "false" ? false : undefined,
      search: search as string,
    };

    const products = await productService.getAllProducts(filters);

    return sendSuccess(
      res,
      {
        products,
        total: products.length,
      },
      "Products retrieved successfully"
    );
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Failed to retrieve products", 500);
    }
  }
});

export const getProductsByCategory = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { category } = req.params;
    const products = await productService.getProductsByCategory(category!);

    return sendSuccess(
      res,
      {
        category,
        products,
        total: products.length,
      },
      "Products by category retrieved successfully"
    );
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Failed to retrieve products by category", 500);
    }
  }
});

export const getProductCategories = asyncHandler(async (_req: Request, res: Response) => {
  try {
    const categories = await productService.getProductCategories();

    return sendSuccess(res, categories, "Product categories retrieved successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Failed to retrieve product categories", 500);
    }
  }
});
