"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
require("./types/express");
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const express_rate_limit_1 = __importDefault(require("express-rate-limit"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const database_1 = require("./config/database");
const routes_1 = __importDefault(require("./routes"));
const errorHandler_middleware_1 = require("./middleware/errorHandler.middleware");
const seeders_1 = require("./seeders");
const logger_util_1 = require("./utils/logger.util");
dotenv_1.default.config({ path: ".env" });
const app = (0, express_1.default)();
app.set("trust proxy", 1);
app.use((0, helmet_1.default)({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
}));
const corsOptions = {
    origin: process.env["CORS_ORIGIN"] === "*"
        ? true
        : process.env["CORS_ORIGIN"]?.split(",") || ["http://localhost:3000"],
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"],
};
app.use((0, cors_1.default)(corsOptions));
app.use(express_1.default.json({ limit: "10mb" }));
app.use(express_1.default.urlencoded({ extended: true, limit: "10mb" }));
app.use((0, cookie_parser_1.default)());
const limiter = (0, express_rate_limit_1.default)({
    windowMs: parseInt(process.env["RATE_LIMIT_WINDOW_MS"] || "60000"),
    max: parseInt(process.env["RATE_LIMIT_MAX_REQUESTS"] || "100"),
    message: {
        success: false,
        message: "Too many requests from this IP, please try again later.",
        retryAfter: Math.ceil(parseInt(process.env["RATE_LIMIT_WINDOW_MS"] || "60000") / 1000),
    },
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
        logger_util_1.logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
        res.status(429).json({
            success: false,
            message: "Too many requests from this IP, please try again later.",
        });
    },
});
app.use("/api/", limiter);
if (process.env["NODE_ENV"] === "development") {
    app.use((req, _res, next) => {
        logger_util_1.logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
        next();
    });
}
app.get("/health", (_req, res) => {
    res.json({
        success: true,
        message: "Frovo RBAC API is running",
        timestamp: new Date().toISOString(),
        version: "1.0.0",
        environment: process.env["NODE_ENV"] || "development",
        uptime: process.uptime(),
    });
});
app.use("/api", routes_1.default);
app.use(errorHandler_middleware_1.notFound);
app.use(errorHandler_middleware_1.errorHandler);
const PORT = process.env["PORT"] || 3000;
process.on("uncaughtException", error => {
    logger_util_1.logger.error("Uncaught Exception:", error);
    process.exit(1);
});
process.on("unhandledRejection", (reason, _promise) => {
    logger_util_1.logger.error("Unhandled Rejection:", reason);
    process.exit(1);
});
const startServer = async () => {
    try {
        await (0, database_1.connectDB)();
        if (process.env["SEED_DATABASE"] === "true") {
            await (0, seeders_1.seedDatabase)();
        }
        const server = app.listen(PORT, () => {
            logger_util_1.logger.info(`Server started | Port: ${PORT} | Environment: ${process.env["NODE_ENV"] || "development"}`);
        });
        const gracefulShutdown = (signal) => {
            logger_util_1.logger.info(`Received ${signal}, shutting down gracefully`);
            server.close(async () => {
                try {
                    const mongoose = await Promise.resolve().then(() => __importStar(require("mongoose")));
                    await mongoose.default.connection.close();
                    logger_util_1.logger.info("Shutdown complete");
                    process.exit(0);
                }
                catch (error) {
                    logger_util_1.logger.error("Error during shutdown:", error);
                    process.exit(1);
                }
            });
            setTimeout(() => {
                logger_util_1.logger.error("Forced shutdown - connections did not close in time");
                process.exit(1);
            }, 30000);
        };
        process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
        process.on("SIGINT", () => gracefulShutdown("SIGINT"));
    }
    catch (error) {
        logger_util_1.logger.error("Failed to start server:", error);
        process.exit(1);
    }
};
startServer();
exports.default = app;
