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
exports.seedDatabase = void 0;
const database_1 = require("../config/database");
const logger_util_1 = require("../utils/logger.util");
const permissions_seeder_1 = require("./permissions.seeder");
const departments_seeder_1 = require("./departments.seeder");
const roles_seeder_1 = require("./roles.seeder");
const superAdmin_seeder_1 = require("./superAdmin.seeder");
const mongoose_1 = require("mongoose");
const seedDatabase = async () => {
    try {
        logger_util_1.logger.info('🚀 Starting database seeding process...');
        await (0, permissions_seeder_1.seedPermissions)();
        const tempCreatedBy = new mongoose_1.Types.ObjectId();
        const departmentMap = await (0, departments_seeder_1.seedDepartments)(tempCreatedBy);
        const roleMap = await (0, roles_seeder_1.seedRoles)(tempCreatedBy, departmentMap);
        const { superAdminId } = await (0, superAdmin_seeder_1.seedSuperAdmin)(departmentMap, roleMap);
        const { Department, Role } = await Promise.resolve().then(() => __importStar(require('../models')));
        await Promise.all([
            Department.updateMany({ createdBy: tempCreatedBy }, { createdBy: superAdminId }),
            Role.updateMany({ createdBy: tempCreatedBy }, { createdBy: superAdminId })
        ]);
        logger_util_1.logger.info('✅ Database seeding completed successfully!');
        logger_util_1.logger.info('📊 Summary:');
        logger_util_1.logger.info(`   • Permissions: ✅`);
        logger_util_1.logger.info(`   • Departments: ✅ (${Object.keys(departmentMap).length} created)`);
        logger_util_1.logger.info(`   • Roles: ✅ (${Object.keys(roleMap).length} created)`);
        logger_util_1.logger.info(`   • Super Admin: ✅`);
        logger_util_1.logger.info(`   • Vendor Admin: ✅`);
        logger_util_1.logger.info('');
        logger_util_1.logger.info('🎉 Your RBAC system is ready to use!');
        logger_util_1.logger.info('');
        logger_util_1.logger.info('👑 Available Admin Accounts:');
        logger_util_1.logger.info(`   • Super Admin: ${process.env['SUPER_ADMIN_EMAIL'] || 'superadmin@frovo.com'} / ${process.env['SUPER_ADMIN_PASSWORD'] || 'SuperAdmin@123'}`);
        logger_util_1.logger.info(`   • Vendor Admin: ${process.env['VENDOR_ADMIN_EMAIL'] || 'vendor.admin@frovo.com'} / ${process.env['VENDOR_ADMIN_PASSWORD'] || 'VendorAdmin@123'}`);
        logger_util_1.logger.info('');
        logger_util_1.logger.info('📝 Vendor Management:');
        logger_util_1.logger.info('   • Vendors will be created through the vendor management system');
        logger_util_1.logger.info('   • Use the above admin accounts to create vendors via API');
        logger_util_1.logger.info('');
        logger_util_1.logger.info('⚠️  Please change the default passwords after first login!');
    }
    catch (error) {
        logger_util_1.logger.error('❌ Database seeding failed:', error);
        throw error;
    }
};
exports.seedDatabase = seedDatabase;
if (require.main === module) {
    (0, database_1.connectDB)().then(() => {
        (0, exports.seedDatabase)().then(() => {
            logger_util_1.logger.info('🏁 Seeding process completed. Exiting...');
            process.exit(0);
        }).catch((error) => {
            logger_util_1.logger.error('💥 Seeding process failed:', error);
            process.exit(1);
        });
    }).catch((error) => {
        logger_util_1.logger.error('💥 Database connection failed:', error);
        process.exit(1);
    });
}
