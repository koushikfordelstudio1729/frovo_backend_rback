import { connectDB } from "../config/database";
import { logger } from "../utils/logger.util";
import { seedPermissions } from "./permissions.seeder";
import { seedDepartments } from "./departments.seeder";
import { seedRoles } from "./roles.seeder";
import { seedSuperAdmin } from "./superAdmin.seeder";
import { Types } from "mongoose";

export const seedDatabase = async (): Promise<void> => {
  try {
    await seedPermissions();

    const tempCreatedBy = new Types.ObjectId();

    const departmentMap = await seedDepartments(tempCreatedBy);

    const roleMap = await seedRoles(tempCreatedBy, departmentMap);

    const { superAdminId } = await seedSuperAdmin(departmentMap, roleMap);

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
