"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.connectDB = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const logger_util_1 = require("../utils/logger.util");
const connectDB = async () => {
    try {
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            bufferCommands: false,
        };
        const conn = await mongoose_1.default.connect(process.env["MONGODB_URI"], options);
        logger_util_1.logger.info(`✅ MongoDB Connected: ${conn.connection.host}`);
        logger_util_1.logger.info(`📊 Database: ${conn.connection.name}`);
        mongoose_1.default.connection.on("error", err => {
            logger_util_1.logger.error("❌ MongoDB connection error:", err);
        });
        mongoose_1.default.connection.on("disconnected", () => {
            logger_util_1.logger.info("⚠️  MongoDB disconnected");
        });
        mongoose_1.default.connection.on("reconnected", () => {
            logger_util_1.logger.info("🔄 MongoDB reconnected");
        });
        process.on("SIGINT", async () => {
            await mongoose_1.default.connection.close();
            logger_util_1.logger.info("MongoDB connection closed through app termination");
            process.exit(0);
        });
    }
    catch (error) {
        logger_util_1.logger.error("❌ MongoDB connection failed:", error);
        process.exit(1);
    }
};
exports.connectDB = connectDB;
