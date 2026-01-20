import express from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import { connectDB } from "./config/database";
import { seedDatabase } from "./seeders";
import { logger } from "./utils/logger.util";

dotenv.config();

const app = express();

app.use(
  helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: false,
  })
);

app.use(cors());
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "Frovo RBAC API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
    environment: process.env["NODE_ENV"] || "development",
    database: "Connected",
  });
});

app.get("/api/info", (_req, res) => {
  res.json({
    success: true,
    message: "RBAC Backend API Information",
    data: {
      name: "Frovo RBAC Backend",
      version: "1.0.0",
      description: "Complete Role-Based Access Control system",
      features: [
        "8 MongoDB Models (User, Role, Department, Permission, etc.)",
        "JWT Authentication with Refresh Tokens",
        "Scope-based Permission System (Global → Partner → Region → Machine)",
        "8 Default System Roles with Proper Permissions",
        "30+ Granular Permissions",
        "Complete Audit Trail",
        "Access Request Workflow",
        "Security Configuration",
        "Database Seeding",
      ],
      endpoints: {
        auth: [
          "POST /api/auth/register",
          "POST /api/auth/login",
          "POST /api/auth/logout",
          "GET /api/auth/me",
          "POST /api/auth/refresh-token",
        ],
        users: [
          "GET /api/users",
          "POST /api/users",
          "GET /api/users/:id",
          "PUT /api/users/:id",
          "DELETE /api/users/:id",
        ],
        roles: [
          "GET /api/roles",
          "POST /api/roles",
          "GET /api/roles/:id",
          "PUT /api/roles/:id",
          "DELETE /api/roles/:id",
        ],
        permissions: ["GET /api/permissions", "GET /api/permissions/check"],
      },
      systemRoles: [
        "Super Admin - Full system access",
        "Ops Manager - Operations with partner scope",
        "Field Agent - Mobile app with machine scope",
        "Technician - Maintenance with machine scope",
        "Finance Manager - Financial operations with global scope",
        "Support Agent - Customer support with global scope",
        "Warehouse Manager - Inventory with partner scope",
        "Auditor - Read-only audit access",
      ],
    },
  });
});

app.get("/api/database/status", async (_req, res) => {
  try {
    const mongoose = await import("mongoose");
    const readyState = mongoose.default.connection.readyState;
    const states = ["disconnected", "connected", "connecting", "disconnecting"];

    res.json({
      success: true,
      data: {
        status: states[readyState] || "unknown",
        readyState,
        host: mongoose.default.connection.host,
        name: mongoose.default.connection.name,
      },
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: "Database status check failed",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
});

const PORT = process.env["PORT"] || 3000;

const startServer = async () => {
  try {
    logger.info("🔌 Connecting to MongoDB...");
    await connectDB();

    if (process.env["SEED_DATABASE"] === "true") {
      logger.info("🌱 Seeding database...");
      try {
        await seedDatabase();
        logger.info("✅ Database seeded successfully");
      } catch (seedError) {
        logger.warn("⚠️ Database seeding failed (may already be seeded):", seedError);
      }
    }

    app.listen(PORT, () => {
      logger.info("🚀 Frovo RBAC Backend Server Started");
      logger.info(`📡 Server running on port ${PORT}`);
      logger.info(`🌍 Environment: ${process.env["NODE_ENV"] || "development"}`);
      logger.info("📊 Database: Connected");
      logger.info("");
      logger.info("📋 Available Routes:");
      logger.info("   🔍 Health: GET /health");
      logger.info("   📊 API Info: GET /api/info");
      logger.info("   🗄️ Database Status: GET /api/database/status");
      logger.info("");
      logger.info("✅ Ready to accept requests!");
      logger.info("");
      logger.info("🔧 Test the server:");
      logger.info(`   curl http://localhost:${PORT}/health`);
      logger.info(`   curl http://localhost:${PORT}/api/info`);
      logger.info(`   curl http://localhost:${PORT}/api/database/status`);

      if (process.env["SEED_DATABASE"] === "true") {
        logger.info("");
        logger.info("🔐 Default Super Admin Credentials:");
        logger.info(`   Email: ${process.env["SUPER_ADMIN_EMAIL"] || "superadmin@vendingapp.com"}`);
        logger.info(`   Password: ${process.env["SUPER_ADMIN_PASSWORD"] || "SuperAdmin@123"}`);
      }
    });
  } catch (error) {
    logger.error("❌ Failed to start server:", error);
    process.exit(1);
  }
};

startServer();

export default app;
