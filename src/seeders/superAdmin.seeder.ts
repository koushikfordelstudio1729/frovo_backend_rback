import { User, UserStatus, SystemRole } from "../models";
import { logger } from "../utils/logger.util";
import { emailService } from "../services/email.service";
import { Types } from "mongoose";

export const seedSuperAdmin = async (
  departmentMap: { [key: string]: Types.ObjectId },
  roleMap: { [key: string]: Types.ObjectId }
): Promise<{ superAdminId: Types.ObjectId; vendorAdminId: Types.ObjectId }> => {
  try {
    const existingUserCount = await User.countDocuments();
    if (existingUserCount > 0) {
      const existingSuperAdmin = await User.findOne({
        roles: { $in: [roleMap[SystemRole.SUPER_ADMIN]] },
      });
      const existingVendorAdmin = await User.findOne({
        email: process.env["VENDOR_ADMIN_EMAIL"] || "vendor.admin@frovo.com",
      });

      if (existingSuperAdmin && existingVendorAdmin) {
        return {
          superAdminId: existingSuperAdmin._id,
          vendorAdminId: existingVendorAdmin._id,
        };
      }

      const result: any = {};

      if (!existingSuperAdmin) {
        result.superAdminId = await createSuperAdmin(departmentMap, roleMap);
      } else {
        result.superAdminId = existingSuperAdmin._id;
      }

      if (!existingVendorAdmin) {
        result.vendorAdminId = await createVendorAdmin(result.superAdminId, departmentMap, roleMap);
      } else {
        result.vendorAdminId = existingVendorAdmin._id;
      }

      return result;
    }

    const superAdminId = await createSuperAdmin(departmentMap, roleMap);

    const vendorAdminId = await createVendorAdmin(superAdminId, departmentMap, roleMap);

    return {
      superAdminId,
      vendorAdminId,
    };
  } catch (error) {
    logger.error("Error seeding admin users:", error);
    throw error;
  }
};

const createSuperAdmin = async (
  departmentMap: { [key: string]: Types.ObjectId },
  roleMap: { [key: string]: Types.ObjectId }
): Promise<Types.ObjectId> => {
  const email = process.env["SUPER_ADMIN_EMAIL"] || "superadmin@frovo.com";
  const password = process.env["SUPER_ADMIN_PASSWORD"] || "SuperAdmin@123";
  const name = process.env["SUPER_ADMIN_NAME"] || "System Administrator";

  const superAdminRoleId = roleMap[SystemRole.SUPER_ADMIN];
  const systemAdminDeptId = departmentMap["System Admin"];

  if (!superAdminRoleId || !systemAdminDeptId) {
    throw new Error("Super Admin role or System Admin department not found");
  }

  const existingSuperAdmin = await User.findOne({ email });
  if (existingSuperAdmin) {
    return existingSuperAdmin._id;
  }

  const superAdmin = await User.create({
    name,
    email,
    password,
    departments: [systemAdminDeptId],
    roles: [superAdminRoleId],
    status: UserStatus.ACTIVE,
    createdBy: new Types.ObjectId(),
  });

  await User.findByIdAndUpdate(superAdmin._id, { createdBy: superAdmin._id });

  const emailConfigured = process.env["EMAIL_USER"] && process.env["EMAIL_PASS"];
  if (emailConfigured) {
    try {
      await emailService.sendWelcomeEmail(email, name, password);
    } catch (_) {
      void 0;
    }
  }

  return superAdmin._id;
};

const ensureVendorAdminRole = async (
  departmentMap: { [key: string]: Types.ObjectId },
  createdBy: Types.ObjectId
): Promise<Types.ObjectId> => {
  const { Role, RoleType, RoleStatus, ScopeLevel, SystemRole, UIAccess } =
    await import("../models");

  let vendorAdminRole = await Role.findOne({ systemRole: SystemRole.VENDOR_ADMIN });

  if (!vendorAdminRole) {
    const operationsDeptId = departmentMap["Operations"];
    if (!operationsDeptId) {
      throw new Error("Operations department not found for Vendor Admin role");
    }

    vendorAdminRole = await Role.create({
      name: "Vendor Admin",
      key: "vendor_admin",
      systemRole: SystemRole.VENDOR_ADMIN,
      type: RoleType.SYSTEM,
      department: operationsDeptId,
      permissions: [
        "vendors:view",
        "vendors:create",
        "vendors:edit",
        "vendors:delete",
        "vendors:approve",
        "vendors:financials_view",
        "vendors:compliance_view",
        "users:view",
        "roles:view",
      ],
      scope: { level: ScopeLevel.GLOBAL },
      uiAccess: UIAccess.ADMIN_PANEL,
      status: RoleStatus.PUBLISHED,
      description: "Vendor management with full control over vendor lifecycle",
      createdBy: createdBy,
    });
  }

  return vendorAdminRole._id;
};

const createVendorAdmin = async (
  createdBy: Types.ObjectId,
  departmentMap: { [key: string]: Types.ObjectId },
  roleMap: { [key: string]: Types.ObjectId }
): Promise<Types.ObjectId> => {
  const email = process.env["VENDOR_ADMIN_EMAIL"] || "vendor.admin@frovo.com";
  const password = process.env["VENDOR_ADMIN_PASSWORD"] || "VendorAdmin@123";
  const name = process.env["VENDOR_ADMIN_NAME"] || "Vendor Administrator";

  const vendorAdminRoleId = await ensureVendorAdminRole(departmentMap, createdBy);
  const operationsDeptId = departmentMap["Operations"];

  if (!operationsDeptId) {
    throw new Error("Operations department not found");
  }

  const existingVendorAdmin = await User.findOne({ email });
  if (existingVendorAdmin) {
    return existingVendorAdmin._id;
  }

  const vendorAdmin = await User.create({
    name,
    email,
    password,
    departments: [operationsDeptId],
    roles: [vendorAdminRoleId],
    status: UserStatus.ACTIVE,
    createdBy: createdBy,
  });

  const emailConfigured = process.env["EMAIL_USER"] && process.env["EMAIL_PASS"];
  if (emailConfigured) {
    try {
      await emailService.sendWelcomeEmail(email, name, password);
    } catch (_) {
      void 0;
    }
  }

  return vendorAdmin._id;
};

if (require.main === module) {
  import("../config/database").then(({ connectDB }) => {
    import("./departments.seeder").then(({ seedDepartments }) => {
      import("./roles.seeder").then(({ seedRoles }) => {
        connectDB().then(() => {
          const dummyCreatedBy = new Types.ObjectId();
          seedDepartments(dummyCreatedBy).then(departmentMap => {
            seedRoles(dummyCreatedBy, departmentMap).then(roleMap => {
              seedSuperAdmin(departmentMap, roleMap)
                .then(() => process.exit(0))
                .catch(error => {
                  logger.error("Failed to seed admin users:", error);
                  process.exit(1);
                });
            });
          });
        });
      });
    });
  });
}
