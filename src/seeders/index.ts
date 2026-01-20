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
    // Step 1: Seed Permissions
    await seedPermissions();

    // Step 2: Create a temporary user ID for seeding
    const tempCreatedBy = new Types.ObjectId();

    // Step 3: Seed Departments
    const departmentMap = await seedDepartments(tempCreatedBy);

    // Step 4: Seed Roles
    const roleMap = await seedRoles(tempCreatedBy, departmentMap);

    // Step 5: Seed Super Admin and Vendor Admin
    const { superAdminId } = await seedSuperAdmin(departmentMap, roleMap);

    // Step 6: Update createdBy references
    const { Department, Role } = await import("../models");
    await Promise.all([
      Department.updateMany({ createdBy: tempCreatedBy }, { createdBy: superAdminId }),
      Role.updateMany({ createdBy: tempCreatedBy }, { createdBy: superAdminId }),
    ]);

    logger.info("Database seeding completed");
  } catch (error) {
    logger.error("Database seeding failed:", error);
    throw error;
  }
};

// For standalone execution
if (require.main === module) {
  connectDB()
    .then(() => seedDatabase())
    .then(() => {
      logger.info("Seeding completed");
      process.exit(0);
    })
    .catch(error => {
      logger.error("Seeding failed:", error);
      process.exit(1);
    });
}
