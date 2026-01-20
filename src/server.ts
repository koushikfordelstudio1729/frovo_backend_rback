import "./types/express";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import cookieParser from "cookie-parser";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import routes from "./routes";
import { errorHandler, notFound } from "./middleware/errorHandler.middleware";
import { seedDatabase } from "./seeders";
import { logger } from "./utils/logger.util";

// Load environment variables
dotenv.config({ path: ".env" });

const app = express();

// Trust proxy for accurate IP addresses
app.set("trust proxy", 1);

// Security middleware
app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

// CORS configuration
const corsOptions = {
  origin:
    process.env["CORS_ORIGIN"] === "*"
      ? true
      : process.env["CORS_ORIGIN"]?.split(",") || ["http://localhost:3000"],
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "x-requested-with"],
};

app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Cookie parsing middleware
app.use(cookieParser());

// Rate limiting
const limiter = rateLimit({
  windowMs: parseInt(process.env["RATE_LIMIT_WINDOW_MS"] || "60000"), // 1 minute
  max: parseInt(process.env["RATE_LIMIT_MAX_REQUESTS"] || "100"), // 100 requests per minute
  message: {
    success: false,
    message: "Too many requests from this IP, please try again later.",
    retryAfter: Math.ceil(parseInt(process.env["RATE_LIMIT_WINDOW_MS"] || "60000") / 1000),
  },
  standardHeaders: true,
  legacyHeaders: false,
  handler: (req, res) => {
    logger.warn(`Rate limit exceeded for IP: ${req.ip}`);
    res.status(429).json({
      success: false,
      message: "Too many requests from this IP, please try again later.",
    });
  },
});

app.use("/api/", limiter);

// Request logging middleware (development only)
if (process.env["NODE_ENV"] === "development") {
  app.use((req, _res, next) => {
    logger.info(`${req.method} ${req.originalUrl} - ${req.ip}`);
    next();
  });
}

// Health check endpoint
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

// API routes
app.use("/api", routes);

// 404 handler for undefined routes
app.use(notFound);

// Error handling middleware (must be last)
app.use(errorHandler);

const PORT = process.env["PORT"] || 3000;

// Global error handlers
process.on("uncaughtException", error => {
  logger.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, _promise) => {
  logger.error("Unhandled Rejection:", reason);
  process.exit(1);
});

const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();

    // Run seeders if enabled
    if (process.env["SEED_DATABASE"] === "true") {
      await seedDatabase();
    }

    // Start the server
    const server = app.listen(PORT, () => {
      logger.info(
        `Server started | Port: ${PORT} | Environment: ${process.env["NODE_ENV"] || "development"}`
      );
    });

    // Graceful shutdown
    const gracefulShutdown = (signal: string) => {
      logger.info(`Received ${signal}, shutting down gracefully`);

      server.close(async () => {
        try {
          const mongoose = await import("mongoose");
          await mongoose.default.connection.close();
          logger.info("Shutdown complete");
          process.exit(0);
        } catch (error) {
          logger.error("Error during shutdown:", error);
          process.exit(1);
        }
      });

      // Force shutdown after 30 seconds
      setTimeout(() => {
        logger.error("Forced shutdown - connections did not close in time");
        process.exit(1);
      }, 30000);
    };

    // Handle process termination
    process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
    process.on("SIGINT", () => gracefulShutdown("SIGINT"));
  } catch (error) {
    logger.error("Failed to start server:", error);
    process.exit(1);
  }
};

// Start the server
startServer();

export default app;
