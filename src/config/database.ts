import mongoose from "mongoose";

import { logger } from "../utils/logger.util";
export const connectDB = async (): Promise<void> => {
  try {
    const options = {
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      bufferCommands: false,
    };

    const conn = await mongoose.connect(process.env["MONGODB_URI"]!, options);

    logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
    logger.info(`📊 Database: ${conn.connection.name}`);

    // Handle connection events
    mongoose.connection.on("error", err => {
      logger.error("❌ MongoDB connection error:", err);
    });

    mongoose.connection.on("disconnected", () => {
      logger.info("⚠️  MongoDB disconnected");
    });

    mongoose.connection.on("reconnected", () => {
      logger.info("🔄 MongoDB reconnected");
    });

    // Handle app termination
    process.on("SIGINT", async () => {
      await mongoose.connection.close();
      logger.info("MongoDB connection closed through app termination");
      process.exit(0);
    });
  } catch (error) {
    logger.error("❌ MongoDB connection failed:", error);
    process.exit(1);
  }
};
