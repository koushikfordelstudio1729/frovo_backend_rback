import {
  Role,
  RoleType,
  RoleStatus,
  ScopeLevel,
  SystemRole,
  UIAccess,
  DepartmentName,
} from "../models";
import { logger } from "../utils/logger.util";
import { Types } from "mongoose";
export const seedRoles = async (
  createdBy: Types.ObjectId,
  departmentMap: { [key: string]: Types.ObjectId }
): Promise<{ [key: string]: Types.ObjectId }> => {
  try {
    const existingCount = await Role.countDocuments();
    const existingRoles = await Role.find();

    // Define all system roles that should exist
    const allSystemRoles = [
      SystemRole.SUPER_ADMIN,
      SystemRole.VENDOR_ADMIN,
      SystemRole.VENDOR_STAFF,
      SystemRole.OPS_MANAGER,
      SystemRole.FIELD_AGENT,
      SystemRole.TECHNICIAN,
      SystemRole.FINANCE_MANAGER,
      SystemRole.SUPPORT_AGENT,
      SystemRole.WAREHOUSE_MANAGER,
      SystemRole.WAREHOUSE_STAFF,
      SystemRole.AUDITOR,
      SystemRole.CUSTOMER,
    ];

    // Find which system roles are missing
    const existingSystemRoles = existingRoles
      .filter(role => role.systemRole)
      .map(role => role.systemRole);

    const missingSystemRoles = allSystemRoles.filter(
      systemRole => !existingSystemRoles.includes(systemRole)
    );

    // Define role configurations for all system roles with FALLBACK departments
    const roleConfigs: { [key in SystemRole]?: any } = {
      [SystemRole.SUPER_ADMIN]: {
        name: "Super Admin",
        key: "super_admin",
        systemRole: SystemRole.SUPER_ADMIN,
        type: RoleType.SYSTEM,
        department:
          departmentMap[DepartmentName.SYSTEM_ADMIN] || departmentMap[DepartmentName.OPERATIONS],
        permissions: ["*:*"],
        scope: { level: ScopeLevel.GLOBAL },
        uiAccess: UIAccess.ADMIN_PANEL,
        status: RoleStatus.PUBLISHED,
        description: "Full system access with all permissions",
      },
      [SystemRole.VENDOR_ADMIN]: {
        name: "Vendor Admin",
        key: "vendor_admin",
        systemRole: SystemRole.VENDOR_ADMIN,
        type: RoleType.SYSTEM,
        department: departmentMap[DepartmentName.OPERATIONS],
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
      },
      [SystemRole.VENDOR_STAFF]: {
        name: "Vendor Staff",
        key: "vendor_staff",
        systemRole: SystemRole.VENDOR_STAFF,
        type: RoleType.SYSTEM,
        department: departmentMap[DepartmentName.OPERATIONS],
        permissions: [
          "vendors:view",
          "vendors:create",
          "vendors:financials_view",
          "vendors:compliance_view",
          "users:view",
          "roles:view",
        ],
        scope: { level: ScopeLevel.GLOBAL },
        uiAccess: UIAccess.SUPPORT_PORTAL,
        status: RoleStatus.PUBLISHED,
        description: "Vendor management with PARTIAL control over vendor lifecycle",
      },
      [SystemRole.OPS_MANAGER]: {
        name: "Ops Manager",
        key: "ops_manager",
        systemRole: SystemRole.OPS_MANAGER,
        type: RoleType.SYSTEM,
        department: departmentMap[DepartmentName.OPERATIONS],
        permissions: [
          "machines:view",
          "machines:edit",
          "machines:assign",
          "planogram:view",
          "planogram:edit",
          "refills:view",
          "refills:assign",
          "users:view",
          "roles:view",
          "vendors:view",
          "vendors:financials_view",
          "warehouse:view",
          "warehouse:manage",
        ],
        scope: { level: ScopeLevel.PARTNER },
        uiAccess: UIAccess.ADMIN_PANEL,
        status: RoleStatus.PUBLISHED,
        description: "Operations management with partner-level access",
      },
      [SystemRole.FIELD_AGENT]: {
        name: "Field Agent",
        key: "field_agent",
        systemRole: SystemRole.FIELD_AGENT,
        type: RoleType.SYSTEM,
        // Use OPERATIONS as fallback if FIELD_OPERATIONS doesn't exist
        department:
          departmentMap[DepartmentName.FIELD_OPERATIONS] ||
          departmentMap[DepartmentName.OPERATIONS],
        permissions: ["refills:execute", "job:update", "machines:view"],
        scope: { level: ScopeLevel.MACHINE },
        uiAccess: UIAccess.MOBILE_APP,
        status: RoleStatus.PUBLISHED,
        description: "Field operations with machine-level access",
      },
      [SystemRole.TECHNICIAN]: {
        name: "Technician",
        key: "technician",
        systemRole: SystemRole.TECHNICIAN,
        type: RoleType.SYSTEM,
        department:
          departmentMap[DepartmentName.MAINTENANCE] || departmentMap[DepartmentName.OPERATIONS],
        permissions: ["maintenance:view", "ticket:resolve", "machines:view"],
        scope: { level: ScopeLevel.MACHINE },
        uiAccess: UIAccess.MOBILE_AND_WEB,
        status: RoleStatus.PUBLISHED,
        description: "Maintenance and repair with machine-level access",
      },
      [SystemRole.FINANCE_MANAGER]: {
        name: "Finance Manager",
        key: "finance_manager",
        systemRole: SystemRole.FINANCE_MANAGER,
        type: RoleType.SYSTEM,
        department:
          departmentMap[DepartmentName.FINANCE] || departmentMap[DepartmentName.OPERATIONS],
        permissions: [
          "finance:view",
          "settlement:view",
          "settlement:compute",
          "payout:compute",
          "orders:view",
          "vendors:view",
          "vendors:financials_view",
        ],
        scope: { level: ScopeLevel.GLOBAL },
        uiAccess: UIAccess.FINANCE_DASHBOARD,
        status: RoleStatus.PUBLISHED,
        description: "Financial operations with global access",
      },
      [SystemRole.SUPPORT_AGENT]: {
        name: "Support Agent",
        key: "support_agent",
        systemRole: SystemRole.SUPPORT_AGENT,
        type: RoleType.SYSTEM,
        department:
          departmentMap[DepartmentName.SUPPORT] || departmentMap[DepartmentName.OPERATIONS],
        permissions: ["orders:view", "orders:refund", "ticket:resolve", "machines:view"],
        scope: { level: ScopeLevel.GLOBAL },
        uiAccess: UIAccess.SUPPORT_PORTAL,
        status: RoleStatus.PUBLISHED,
        description: "Customer support with global access",
      },
      [SystemRole.WAREHOUSE_MANAGER]: {
        name: "Warehouse Manager",
        key: "warehouse_manager",
        systemRole: SystemRole.WAREHOUSE_MANAGER,
        type: RoleType.SYSTEM,
        department:
          departmentMap[DepartmentName.WAREHOUSE] || departmentMap[DepartmentName.OPERATIONS],
        permissions: [
          "inventory:receive",
          "batch:log",
          "dispatch:assign",
          "refills:view",
          "warehouse:view",
          "warehouse:manage",
          "warehouse:admin",
          "purchase_orders:view",
          "purchase_orders:create",
          "purchase_orders:edit",
          "purchase_orders:delete",
          "purchase_orders:status_update",
          "grn:view",
          "grn:create",
          "grn:edit",
          "grn:delete",
        ],
        scope: { level: ScopeLevel.PARTNER },
        uiAccess: UIAccess.WAREHOUSE_PORTAL,
        status: RoleStatus.PUBLISHED,
        description: "Warehouse operations with partner-level access",
      },
      [SystemRole.WAREHOUSE_STAFF]: {
        name: "Warehouse Staff",
        key: "warehouse_staff",
        systemRole: SystemRole.WAREHOUSE_STAFF,
        type: RoleType.SYSTEM,
        department:
          departmentMap[DepartmentName.WAREHOUSE] || departmentMap[DepartmentName.OPERATIONS],
        permissions: [
          "warehouse:view",
          "inventory:receive",
          "batch:log",
          "dispatch:assign",
          "refills:view",
          "purchase_orders:view",
          "purchase_orders:create",
        ],
        scope: { level: ScopeLevel.PARTNER },
        uiAccess: UIAccess.WAREHOUSE_PORTAL,
        status: RoleStatus.PUBLISHED,
        description: "Warehouse staff with limited permissions",
      },
      [SystemRole.AUDITOR]: {
        name: "Auditor",
        key: "auditor",
        systemRole: SystemRole.AUDITOR,
        type: RoleType.SYSTEM,
        department:
          departmentMap[DepartmentName.COMPLIANCE] || departmentMap[DepartmentName.OPERATIONS],
        permissions: ["audit:view", "users:view", "roles:view", "departments:view"],
        scope: { level: ScopeLevel.GLOBAL },
        uiAccess: UIAccess.ADMIN_PANEL,
        status: RoleStatus.PUBLISHED,
        description: "Audit and compliance with global read access",
      },
      [SystemRole.CUSTOMER]: {
        name: "Customer",
        key: "customer",
        systemRole: SystemRole.CUSTOMER,
        type: RoleType.SYSTEM,
        department:
          departmentMap[DepartmentName.CUSTOMER] || departmentMap[DepartmentName.OPERATIONS],
        permissions: ["orders:view"],
        scope: { level: ScopeLevel.MACHINE },
        uiAccess: UIAccess.MOBILE_APP,
        status: RoleStatus.PUBLISHED,
        description: "Customer with basic order viewing access",
      },
    };

    // Create missing roles
    const rolesToCreate = missingSystemRoles
      .filter(systemRole => roleConfigs[systemRole])
      .map(systemRole => {
        const roleConfig = roleConfigs[systemRole];
        return {
          ...roleConfig,
          createdBy,
        };
      });

    let newlyCreatedRoles: any[] = [];
    if (rolesToCreate.length > 0) {
      logger.info(
        `Creating ${rolesToCreate.length} missing roles: ${missingSystemRoles.join(", ")}`
      );

      // Log each role's department info
      rolesToCreate.forEach(role => {
        logger.info(
          `Role: ${role.name}, Department ID: ${role.department?.toString() || "MISSING"}`
        );
      });

      try {
        newlyCreatedRoles = await Role.insertMany(rolesToCreate);
        logger.info(`✅ Successfully created ${newlyCreatedRoles.length} roles`);
      } catch (insertError: any) {
        logger.error("❌ Error inserting roles:", insertError.message);
        logger.error("Error name:", insertError.name);
        logger.error("Error code:", insertError.code);

        if (insertError.name === "ValidationError") {
          logger.error("Validation errors:");
          Object.keys(insertError.errors).forEach(key => {
            const err = insertError.errors[key];
            logger.error(`  - ${key}: ${err.message}`);
          });
        }

        // Try to create roles one by one to see which fails
        logger.info("Trying to create roles one by one...");
        for (const roleData of rolesToCreate) {
          try {
            const createdRole = await Role.create(roleData);
            newlyCreatedRoles.push(createdRole);
            logger.info(`✅ Created: ${roleData.name}`);
          } catch (singleError: any) {
            logger.error(`❌ Failed: ${roleData.name} - ${singleError.message}`);
          }
        }
      }
    }

    // Combine existing and new roles
    const allRoles = [...existingRoles, ...newlyCreatedRoles];

    // Create role map
    const roleMap: { [key: string]: Types.ObjectId } = {};
    allRoles.forEach(role => {
      if (role.systemRole) {
        roleMap[role.systemRole] = role._id;
      }
    });

    return roleMap;
  } catch (error) {
    logger.error("Error seeding roles:", error);
    throw error;
  }
};