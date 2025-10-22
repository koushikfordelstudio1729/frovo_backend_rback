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
        logger_util_1.logger.info('🌱 Seeding Super Admin...');
        const existingUserCount = await models_1.User.countDocuments();
        if (existingUserCount > 0) {
            logger_util_1.logger.info(`✅ Super Admin already exists (${existingUserCount} users found)`);
            const existingSuperAdmin = await models_1.User.findOne({ roles: { $in: [roleMap[models_1.SystemRole.SUPER_ADMIN]] } });
            if (existingSuperAdmin) {
                return existingSuperAdmin._id;
            }
            throw new Error('Users exist but no Super Admin found. Manual intervention required.');
        }
        const superAdminRoleId = roleMap[models_1.SystemRole.SUPER_ADMIN];
        const systemAdminDeptId = departmentMap['System Admin'];
        if (!superAdminRoleId || !systemAdminDeptId) {
            throw new Error('Super Admin role or System Admin department not found');
        }
        const email = process.env['SUPER_ADMIN_EMAIL'] || 'superadmin@vendingapp.com';
        const password = process.env['SUPER_ADMIN_PASSWORD'] || 'SuperAdmin@123';
        const name = process.env['SUPER_ADMIN_NAME'] || 'System Administrator';
        const tempCreatedBy = new mongoose_1.Types.ObjectId();
        const superAdmin = await models_1.User.create({
            name,
            email,
            password,
            departments: [systemAdminDeptId],
            roles: [superAdminRoleId],
            status: models_1.UserStatus.ACTIVE,
            createdBy: tempCreatedBy
        });
        await models_1.User.findByIdAndUpdate(superAdmin._id, { createdBy: superAdmin._id });
        logger_util_1.logger.info('✅ Successfully created Super Admin user');
        logger_util_1.logger.info(`📧 Email: ${email}`);
        logger_util_1.logger.info(`🔑 Password: ${password}`);
        logger_util_1.logger.info('⚠️  Please change the default password after first login!');
        try {
            await email_service_1.emailService.sendWelcomeEmail(email, name, password);
            logger_util_1.logger.info('📧 Welcome email sent successfully to Super Admin');
        }
        catch (emailError) {
            logger_util_1.logger.warn('⚠️  Failed to send welcome email to Super Admin:', emailError);
            logger_util_1.logger.info('Super Admin created successfully but email notification failed');
        }
        return superAdmin._id;
    }
    catch (error) {
        logger_util_1.logger.error('❌ Error seeding Super Admin:', error);
        throw error;
    }
};
exports.seedSuperAdmin = seedSuperAdmin;
if (require.main === module) {
    Promise.resolve().then(() => __importStar(require('../config/database'))).then(({ connectDB }) => {
        Promise.resolve().then(() => __importStar(require('./departments.seeder'))).then(({ seedDepartments }) => {
            Promise.resolve().then(() => __importStar(require('./roles.seeder'))).then(({ seedRoles }) => {
                connectDB().then(() => {
                    const dummyCreatedBy = new mongoose_1.Types.ObjectId();
                    seedDepartments(dummyCreatedBy).then((departmentMap) => {
                        seedRoles(dummyCreatedBy, departmentMap).then((roleMap) => {
                            (0, exports.seedSuperAdmin)(departmentMap, roleMap).then(() => {
                                process.exit(0);
                            }).catch((error) => {
                                logger_util_1.logger.error('Failed to seed Super Admin:', error);
                                process.exit(1);
                            });
                        });
                    });
                });
            });
        });
    });
}
//# sourceMappingURL=superAdmin.seeder.js.map