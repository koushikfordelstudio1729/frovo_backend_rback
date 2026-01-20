// seeders/index.ts
import { connectDB } from "../config/database";
import { logger } from "../utils/logger.util";
import { seedPermissions } from "./permissions.seeder";
import { seedDepartments } from "./departments.seeder";
import { seedRoles } from "./roles.seeder";
import { seedSuperAdmin } from "./superAdmin.seeder";
import { Types } from "mongoose";

export const seedDatabase = async (): Promise<void> => {
  try {
    logger.info("🚀 Starting database seeding process...");

    // Step 1: Seed Permissions
    await seedPermissions();

    // Step 2: Create a temporary user ID for seeding (will be replaced by actual Super Admin ID)
    const tempCreatedBy = new Types.ObjectId();

    // Step 3: Seed Departments
    const departmentMap = await seedDepartments(tempCreatedBy);

    // Step 4: Seed Roles
    const roleMap = await seedRoles(tempCreatedBy, departmentMap);

    // Step 5: Seed Super Admin and Vendor Admin
    const { superAdminId } = await seedSuperAdmin(departmentMap, roleMap);

    // Step 6: Update createdBy references to point to the actual Super Admin
    const { Department, Role } = await import("../models");

    await Promise.all([
      Department.updateMany({ createdBy: tempCreatedBy }, { createdBy: superAdminId }),
      Role.updateMany({ createdBy: tempCreatedBy }, { createdBy: superAdminId }),
    ]);

    logger.info("✅ Database seeding completed successfully!");
    logger.info("📊 Summary:");
    logger.info(`   • Permissions: ✅`);
    logger.info(`   • Departments: ✅ (${Object.keys(departmentMap).length} created)`);
    logger.info(`   • Roles: ✅ (${Object.keys(roleMap).length} created)`);
    logger.info(`   • Super Admin: ✅`);
    logger.info(`   • Vendor Admin: ✅`);
    logger.info("");
    logger.info("🎉 Your RBAC system is ready to use!");
    logger.info("");
    logger.info("👑 Available Admin Accounts:");
    logger.info(
      `   • Super Admin: ${process.env["SUPER_ADMIN_EMAIL"] || "superadmin@frovo.com"} / ${process.env["SUPER_ADMIN_PASSWORD"] || "SuperAdmin@123"}`
    );
    logger.info(
      `   • Vendor Admin: ${process.env["VENDOR_ADMIN_EMAIL"] || "vendor.admin@frovo.com"} / ${process.env["VENDOR_ADMIN_PASSWORD"] || "VendorAdmin@123"}`
    );
    logger.info("");
    logger.info("📝 Vendor Management:");
    logger.info("   • Vendors will be created through the vendor management system");
    logger.info("   • Use the above admin accounts to create vendors via API");
    logger.info("");
    logger.info("⚠️  Please change the default passwords after first login!");
  } catch (error) {
    logger.error("❌ Database seeding failed:", error);
    throw error;
  }
};

// For standalone execution
if (require.main === module) {
  connectDB()
    .then(() => {
      seedDatabase()
        .then(() => {
          logger.info("🏁 Seeding process completed. Exiting...");
          process.exit(0);
        })
        .catch(error => {
          logger.error("💥 Seeding process failed:", error);
          process.exit(1);
        });
    })
    .catch(error => {
      logger.error("💥 Database connection failed:", error);
      process.exit(1);
    });
}
