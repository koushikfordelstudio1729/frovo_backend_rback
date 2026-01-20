import { Product } from "../models/Product.model";
import { logger } from "../utils/logger.util";
import { Types } from "mongoose";

export const seedProducts = async (
  createdBy: Types.ObjectId | null = null
): Promise<{ [key: string]: Types.ObjectId }> => {
  try {
    logger.info("🌱 Seeding products...");

    const existingCount = await Product.countDocuments();
    if (existingCount > 0) {
      logger.info(`✅ Products already seeded (${existingCount} products found)`);

      const existingProducts = await Product.find();
      const productMap: { [key: string]: Types.ObjectId } = {};
      existingProducts.forEach(product => {
        productMap[product.name.toLowerCase().replace(/\s+/g, "_")] = product._id;
      });
      return productMap;
    }

    const products = [
      {
        name: "Coca-Cola",
        description: "Classic cola soft drink",
        price: 25,
        category: "Beverages",
        brand: "Coca-Cola",
        nutritionInfo: {
          calories: 139,
          carbs: 37,
          sugar: 37,
          sodium: 9,
        },
        isActive: true,
      },
      {
        name: "Pepsi",
        description: "Cola soft drink",
        price: 25,
        category: "Beverages",
        brand: "PepsiCo",
        nutritionInfo: {
          calories: 150,
          carbs: 41,
          sugar: 41,
          sodium: 20,
        },
        isActive: true,
      },
      {
        name: "Sprite",
        description: "Lemon-lime flavored soft drink",
        price: 25,
        category: "Beverages",
        brand: "Coca-Cola",
        nutritionInfo: {
          calories: 140,
          carbs: 38,
          sugar: 38,
          sodium: 40,
        },
        isActive: true,
      },
      {
        name: "Mountain Dew",
        description: "Citrus flavored soft drink",
        price: 30,
        category: "Energy Drinks",
        brand: "PepsiCo",
        nutritionInfo: {
          calories: 170,
          carbs: 46,
          sugar: 46,
          sodium: 60,
        },
        isActive: true,
      },
      {
        name: "Red Bull",
        description: "Energy drink with caffeine",
        price: 120,
        category: "Energy Drinks",
        brand: "Red Bull",
        nutritionInfo: {
          calories: 110,
          carbs: 27,
          sugar: 27,
          sodium: 105,
        },
        isActive: true,
      },

      {
        name: "Bisleri Water",
        description: "Packaged drinking water",
        price: 20,
        category: "Water",
        brand: "Bisleri",
        nutritionInfo: {
          calories: 0,
          carbs: 0,
          sugar: 0,
          sodium: 0,
        },
        isActive: true,
      },
      {
        name: "Aquafina",
        description: "Purified drinking water",
        price: 20,
        category: "Water",
        brand: "PepsiCo",
        nutritionInfo: {
          calories: 0,
          carbs: 0,
          sugar: 0,
          sodium: 0,
        },
        isActive: true,
      },

      {
        name: "Nescafe Cold Coffee",
        description: "Ready to drink cold coffee",
        price: 35,
        category: "Coffee",
        brand: "Nestle",
        nutritionInfo: {
          calories: 120,
          protein: 3,
          carbs: 20,
          sugar: 18,
          fat: 3,
        },
        isActive: true,
      },

      {
        name: "Lays Classic",
        description: "Classic potato chips",
        price: 20,
        category: "Chips",
        brand: "Lays",
        nutritionInfo: {
          calories: 160,
          protein: 2,
          carbs: 15,
          fat: 10,
          sodium: 170,
        },
        allergens: ["Gluten"],
        isActive: true,
      },
      {
        name: "Kurkure",
        description: "Spicy corn puff snacks",
        price: 20,
        category: "Snacks",
        brand: "PepsiCo",
        nutritionInfo: {
          calories: 150,
          protein: 2,
          carbs: 16,
          fat: 9,
          sodium: 180,
        },
        isActive: true,
      },
      {
        name: "Bingo Mad Angles",
        description: "Triangular corn chips",
        price: 20,
        category: "Chips",
        brand: "Bingo",
        nutritionInfo: {
          calories: 140,
          protein: 2,
          carbs: 18,
          fat: 7,
          sodium: 150,
        },
        isActive: true,
      },
      {
        name: "Parle-G Biscuits",
        description: "Glucose biscuits",
        price: 10,
        category: "Snacks",
        brand: "Parle",
        nutritionInfo: {
          calories: 130,
          protein: 3,
          carbs: 22,
          fat: 4,
          sugar: 8,
        },
        allergens: ["Gluten"],
        isActive: true,
      },
      {
        name: "Oreo Cookies",
        description: "Chocolate sandwich cookies",
        price: 30,
        category: "Candy",
        brand: "Mondelez",
        nutritionInfo: {
          calories: 160,
          protein: 2,
          carbs: 25,
          fat: 7,
          sugar: 14,
        },
        allergens: ["Gluten", "Dairy"],
        isActive: true,
      },

      {
        name: "Mixed Nuts",
        description: "Roasted mixed nuts pack",
        price: 50,
        category: "Healthy",
        nutritionInfo: {
          calories: 180,
          protein: 6,
          carbs: 6,
          fat: 16,
          sodium: 90,
        },
        allergens: ["Nuts"],
        isActive: true,
      },
      {
        name: "Granola Bar",
        description: "Oats and nuts energy bar",
        price: 40,
        category: "Healthy",
        nutritionInfo: {
          calories: 150,
          protein: 4,
          carbs: 22,
          fat: 6,
          sugar: 12,
        },
        allergens: ["Nuts", "Gluten"],
        isActive: true,
      },

      {
        name: "Dairy Milk Chocolate",
        description: "Milk chocolate bar",
        price: 40,
        category: "Candy",
        brand: "Cadbury",
        nutritionInfo: {
          calories: 200,
          protein: 3,
          carbs: 24,
          fat: 11,
          sugar: 23,
        },
        allergens: ["Dairy", "Nuts"],
        isActive: true,
      },
    ];

    const productsWithCreatedBy = products.map(product => ({
      ...product,
      createdBy,
    }));

    const createdProducts = await Product.insertMany(productsWithCreatedBy);

    logger.info(`✅ Successfully seeded ${createdProducts.length} products`);

    const productMap: { [key: string]: Types.ObjectId } = {};
    createdProducts.forEach(product => {
      productMap[product.name.toLowerCase().replace(/\s+/g, "_")] = product._id;
    });

    const productNames = createdProducts.map(p => p.name);
    logger.info(`📦 Created products: ${productNames.join(", ")}`);

    return productMap;
  } catch (error) {
    logger.error("❌ Error seeding products:", error);
    throw error;
  }
};

if (require.main === module) {
  import("../config/database").then(({ connectDB }) => {
    connectDB().then(() => {
      seedProducts()
        .then(() => {
          process.exit(0);
        })
        .catch(error => {
          logger.error("Failed to seed products:", error);
          process.exit(1);
        });
    });
  });
}
