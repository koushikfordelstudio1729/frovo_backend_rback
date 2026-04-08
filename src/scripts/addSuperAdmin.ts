import "dotenv/config";
import mongoose from "mongoose";
import { connectDB } from "../config/database";
import { User, Role, Department, UserStatus, SystemRole } from "../models";
import { logger } from "../utils/logger.util";

const EMAIL = process.env["SUPER_ADMIN_EMAIL"] || "Karthick@frovo.in";
const PASSWORD = process.env["SUPER_ADMIN_PASSWORD"] || "SuperAdmin@123";
const NAME = process.env["SUPER_ADMIN_NAME"] || "Karthick";

const run = async () => {
  await connectDB();

  const superAdminRole = await Role.findOne({ systemRole: SystemRole.SUPER_ADMIN });
  if (!superAdminRole) {
    logger.error("Super Admin role not found. Run seed first.");
    process.exit(1);
  }

  const systemAdminDept = await Department.findOne({ name: "System Admin" });
  if (!systemAdminDept) {
    logger.error("System Admin department not found. Run seed first.");
    process.exit(1);
  }

  const existing = await User.findOne({ email: EMAIL });

  if (existing) {
    const hasRole = existing.roles.some((r: any) => r.toString() === superAdminRole._id.toString());
    if (!hasRole) {
      existing.roles.push(superAdminRole._id as any);
      await existing.save();
      logger.info(`Added Super Admin role to existing user: ${EMAIL}`);
    } else {
      logger.info(`User ${EMAIL} already has Super Admin role.`);
    }
  } else {
    const newUser = await User.create({
      name: NAME,
      email: EMAIL,
      password: PASSWORD,
      departments: [systemAdminDept._id],
      roles: [superAdminRole._id],
      status: UserStatus.ACTIVE,
      createdBy: new mongoose.Types.ObjectId(),
    });
    await User.findByIdAndUpdate(newUser._id, { createdBy: newUser._id });
    logger.info(`Created new Super Admin: ${EMAIL}`);
  }

  logger.info("Done.");
  process.exit(0);
};

run().catch(err => {
  logger.error("Script failed:", err);
  process.exit(1);
});
