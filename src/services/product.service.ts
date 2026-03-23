import { Product } from "../models/Product.model";
import { Types } from "mongoose";

export interface ProductQuery {
  category?: string;
  brand?: string;
  isActive?: boolean | undefined;
  search?: string;
}

class ProductService {
  async getProductById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid product ID");
    }

    const product = await Product.findById(id);

    if (!product) {
      throw new Error("Product not found");
    }

    return product;
  }

  async getAllProducts(query: ProductQuery = {}) {
    const filter: any = {};

    if (query.category) {
      filter.category = new RegExp(query.category, "i");
    }

    if (query.brand) {
      filter.brand = new RegExp(query.brand, "i");
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.search) {
      filter.$or = [
        { name: new RegExp(query.search, "i") },
        { brand: new RegExp(query.search, "i") },
        { category: new RegExp(query.search, "i") },
        { description: new RegExp(query.search, "i") },
      ];
    }

    const products = await Product.find(filter).sort({ name: 1 });

    return products;
  }

  async getProductsByCategory(category: string) {
    const products = await Product.find({
      category: new RegExp(category, "i"),
      isActive: true,
    }).sort({ name: 1 });

    return products;
  }

  async getProductCategories() {
    const categories = await Product.aggregate([
      {
        $match: {
          isActive: true,
        },
      },
      {
        $group: {
          _id: "$category",
          count: { $sum: 1 },
        },
      },
      {
        $project: {
          category: "$_id",
          count: 1,
          _id: 0,
        },
      },
      {
        $sort: { category: 1 },
      },
    ]);

    return categories;
  }

  async getProductAvailabilityAcrossMachines(productId: string) {
    if (!Types.ObjectId.isValid(productId)) {
      throw new Error("Invalid product ID");
    }

    const { Machine } = await import("../models/VendingMachine.model");

    const machinesWithProduct = await Machine.find({
      "productSlots.product": productId,
      "productSlots.quantity": { $gt: 0 },
      machineStatus: "active",
      connectivityStatus: "online",
    })
      .populate("productSlots.product")
      .select("serialNumber modelNumber machineType productSlots");

    const availability = [];

    return {
      productId,
      totalMachines: availability.length,
      totalQuantity: availability.reduce((sum, machine) => sum + machine.totalAvailable, 0),
      availability: availability.sort((a, b) => {
        return a.serialNumber.localeCompare(b.serialNumber);
      }),
    };
  }
}

export const productService = new ProductService();
