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
Object.defineProperty(exports, "__esModule", { value: true });
exports.seedSuperAdmin = void 0;
const models_1 = require("../models");
const logger_util_1 = require("../utils/logger.util");
const email_service_1 = require("../services/email.service");
const mongoose_1 = require("mongoose");
const seedSuperAdmin = async (departmentMap, roleMap) => {
    try {
        const existingUserCount = await models_1.User.countDocuments();
        if (existingUserCount > 0) {
            const existingSuperAdmin = await models_1.User.findOne({
                roles: { $in: [roleMap[models_1.SystemRole.SUPER_ADMIN]] },
            });
            const existingVendorAdmin = await models_1.User.findOne({
                email: process.env["VENDOR_ADMIN_EMAIL"] || "vendor.admin@frovo.com",
            });
            if (existingSuperAdmin && existingVendorAdmin) {
                return {
                    superAdminId: existingSuperAdmin._id,
                    vendorAdminId: existingVendorAdmin._id,
                };
            }
            const result = {};
            if (!existingSuperAdmin) {
                result.superAdminId = await createSuperAdmin(departmentMap, roleMap);
            }
            else {
                result.superAdminId = existingSuperAdmin._id;
            }
            if (!existingVendorAdmin) {
                result.vendorAdminId = await createVendorAdmin(result.superAdminId, departmentMap, roleMap);
            }
            else {
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
    }
    catch (error) {
        logger_util_1.logger.error("Error seeding admin users:", error);
        throw error;
    }
};
exports.seedSuperAdmin = seedSuperAdmin;
const createSuperAdmin = async (departmentMap, roleMap) => {
    const email = process.env["SUPER_ADMIN_EMAIL"] || "superadmin@frovo.com";
    const password = process.env["SUPER_ADMIN_PASSWORD"] || "SuperAdmin@123";
    const name = process.env["SUPER_ADMIN_NAME"] || "System Administrator";
    const superAdminRoleId = roleMap[models_1.SystemRole.SUPER_ADMIN];
    const systemAdminDeptId = departmentMap["System Admin"];
    if (!superAdminRoleId || !systemAdminDeptId) {
        throw new Error("Super Admin role or System Admin department not found");
    }
    const existingSuperAdmin = await models_1.User.findOne({ email });
    if (existingSuperAdmin) {
        return existingSuperAdmin._id;
    }
    const superAdmin = await models_1.User.create({
        name,
        email,
        password,
        departments: [systemAdminDeptId],
        roles: [superAdminRoleId],
        status: models_1.UserStatus.ACTIVE,
        createdBy: new mongoose_1.Types.ObjectId(),
    });
    await models_1.User.findByIdAndUpdate(superAdmin._id, { createdBy: superAdmin._id });
    const emailConfigured = process.env["EMAIL_USER"] && process.env["EMAIL_PASS"];
    if (emailConfigured) {
        try {
            await email_service_1.emailService.sendWelcomeEmail(email, name, password);
        }
        catch {
        }
    }
    return superAdmin._id;
};
const ensureVendorAdminRole = async (departmentMap, createdBy) => {
    const { Role, RoleType, RoleStatus, ScopeLevel, SystemRole, UIAccess } = await Promise.resolve().then(() => __importStar(require("../models")));
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
const createVendorAdmin = async (createdBy, departmentMap, roleMap) => {
    const email = process.env["VENDOR_ADMIN_EMAIL"] || "vendor.admin@frovo.com";
    const password = process.env["VENDOR_ADMIN_PASSWORD"] || "VendorAdmin@123";
    const name = process.env["VENDOR_ADMIN_NAME"] || "Vendor Administrator";
    const vendorAdminRoleId = await ensureVendorAdminRole(departmentMap, createdBy);
    const operationsDeptId = departmentMap["Operations"];
    if (!operationsDeptId) {
        throw new Error("Operations department not found");
    }
    const existingVendorAdmin = await models_1.User.findOne({ email });
    if (existingVendorAdmin) {
        return existingVendorAdmin._id;
    }
    const vendorAdmin = await models_1.User.create({
        name,
        email,
        password,
        departments: [operationsDeptId],
        roles: [vendorAdminRoleId],
        status: models_1.UserStatus.ACTIVE,
        createdBy: createdBy,
    });
    const emailConfigured = process.env["EMAIL_USER"] && process.env["EMAIL_PASS"];
    if (emailConfigured) {
        try {
            await email_service_1.emailService.sendWelcomeEmail(email, name, password);
        }
        catch {
        }
    }
    return vendorAdmin._id;
};
if (require.main === module) {
    Promise.resolve().then(() => __importStar(require("../config/database"))).then(({ connectDB }) => {
        Promise.resolve().then(() => __importStar(require("./departments.seeder"))).then(({ seedDepartments }) => {
            Promise.resolve().then(() => __importStar(require("./roles.seeder"))).then(({ seedRoles }) => {
                connectDB().then(() => {
                    const dummyCreatedBy = new mongoose_1.Types.ObjectId();
                    seedDepartments(dummyCreatedBy).then(departmentMap => {
                        seedRoles(dummyCreatedBy, departmentMap).then(roleMap => {
                            (0, exports.seedSuperAdmin)(departmentMap, roleMap)
                                .then(() => process.exit(0))
                                .catch(error => {
                                logger_util_1.logger.error("Failed to seed admin users:", error);
                                process.exit(1);
                            });
                        });
                    });
                });
            });
        });
    });
}
