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
exports.seedRoles = void 0;
const models_1 = require("../models");
const logger_util_1 = require("../utils/logger.util");
const mongoose_1 = require("mongoose");
const seedRoles = async (createdBy, departmentMap) => {
    try {
        logger_util_1.logger.info('🌱 Seeding roles...');
        const existingCount = await models_1.Role.countDocuments();
        if (existingCount > 0) {
            logger_util_1.logger.info(`✅ Roles already seeded (${existingCount} roles found)`);
            const existingRoles = await models_1.Role.find();
            const roleMap = {};
            existingRoles.forEach(role => {
                if (role.systemRole) {
                    roleMap[role.systemRole] = role._id;
                }
            });
            return roleMap;
        }
        const roles = [
            {
                name: 'Super Admin',
                key: 'super_admin',
                systemRole: models_1.SystemRole.SUPER_ADMIN,
                type: models_1.RoleType.SYSTEM,
                department: departmentMap[models_1.DepartmentName.SYSTEM_ADMIN],
                permissions: ['*:*'],
                scope: { level: models_1.ScopeLevel.GLOBAL },
                uiAccess: models_1.UIAccess.ADMIN_PANEL,
                status: models_1.RoleStatus.PUBLISHED,
                description: 'Full system access with all permissions'
            },
            {
                name: 'Ops Manager',
                key: 'ops_manager',
                systemRole: models_1.SystemRole.OPS_MANAGER,
                type: models_1.RoleType.SYSTEM,
                department: departmentMap[models_1.DepartmentName.OPERATIONS],
                permissions: [
                    'machines:view', 'machines:edit', 'machines:assign',
                    'planogram:view', 'planogram:edit',
                    'refills:view', 'refills:assign',
                    'users:view', 'roles:view'
                ],
                scope: { level: models_1.ScopeLevel.PARTNER },
                uiAccess: models_1.UIAccess.ADMIN_PANEL,
                status: models_1.RoleStatus.PUBLISHED,
                description: 'Operations management with partner-level access'
            },
            {
                name: 'Field Agent',
                key: 'field_agent',
                systemRole: models_1.SystemRole.FIELD_AGENT,
                type: models_1.RoleType.SYSTEM,
                department: departmentMap[models_1.DepartmentName.FIELD_OPERATIONS],
                permissions: [
                    'refills:execute',
                    'job:update',
                    'machines:view'
                ],
                scope: { level: models_1.ScopeLevel.MACHINE },
                uiAccess: models_1.UIAccess.MOBILE_APP,
                status: models_1.RoleStatus.PUBLISHED,
                description: 'Field operations with machine-level access'
            },
            {
                name: 'Technician',
                key: 'technician',
                systemRole: models_1.SystemRole.TECHNICIAN,
                type: models_1.RoleType.SYSTEM,
                department: departmentMap[models_1.DepartmentName.MAINTENANCE],
                permissions: [
                    'maintenance:view',
                    'ticket:resolve',
                    'machines:view'
                ],
                scope: { level: models_1.ScopeLevel.MACHINE },
                uiAccess: models_1.UIAccess.MOBILE_AND_WEB,
                status: models_1.RoleStatus.PUBLISHED,
                description: 'Maintenance and repair with machine-level access'
            },
            {
                name: 'Finance Manager',
                key: 'finance_manager',
                systemRole: models_1.SystemRole.FINANCE_MANAGER,
                type: models_1.RoleType.SYSTEM,
                department: departmentMap[models_1.DepartmentName.FINANCE],
                permissions: [
                    'finance:view',
                    'settlement:view', 'settlement:compute',
                    'payout:compute',
                    'orders:view'
                ],
                scope: { level: models_1.ScopeLevel.GLOBAL },
                uiAccess: models_1.UIAccess.FINANCE_DASHBOARD,
                status: models_1.RoleStatus.PUBLISHED,
                description: 'Financial operations with global access'
            },
            {
                name: 'Support Agent',
                key: 'support_agent',
                systemRole: models_1.SystemRole.SUPPORT_AGENT,
                type: models_1.RoleType.SYSTEM,
                department: departmentMap[models_1.DepartmentName.SUPPORT],
                permissions: [
                    'orders:view', 'orders:refund',
                    'ticket:resolve',
                    'machines:view'
                ],
                scope: { level: models_1.ScopeLevel.GLOBAL },
                uiAccess: models_1.UIAccess.SUPPORT_PORTAL,
                status: models_1.RoleStatus.PUBLISHED,
                description: 'Customer support with global access'
            },
            {
                name: 'Warehouse Manager',
                key: 'warehouse_manager',
                systemRole: models_1.SystemRole.WAREHOUSE_MANAGER,
                type: models_1.RoleType.SYSTEM,
                department: departmentMap[models_1.DepartmentName.WAREHOUSE],
                permissions: [
                    'inventory:receive',
                    'batch:log',
                    'dispatch:assign',
                    'refills:view'
                ],
                scope: { level: models_1.ScopeLevel.PARTNER },
                uiAccess: models_1.UIAccess.WAREHOUSE_PORTAL,
                status: models_1.RoleStatus.PUBLISHED,
                description: 'Warehouse operations with partner-level access'
            },
            {
                name: 'Auditor',
                key: 'auditor',
                systemRole: models_1.SystemRole.AUDITOR,
                type: models_1.RoleType.SYSTEM,
                department: departmentMap[models_1.DepartmentName.COMPLIANCE],
                permissions: [
                    'audit:view',
                    'users:view',
                    'roles:view',
                    'departments:view'
                ],
                scope: { level: models_1.ScopeLevel.GLOBAL },
                uiAccess: models_1.UIAccess.ADMIN_PANEL,
                status: models_1.RoleStatus.PUBLISHED,
                description: 'Audit and compliance with global read access'
            },
            {
                name: 'Customer',
                key: 'customer',
                systemRole: models_1.SystemRole.CUSTOMER,
                type: models_1.RoleType.SYSTEM,
                department: departmentMap[models_1.DepartmentName.CUSTOMER],
                permissions: [
                    'orders:view'
                ],
                scope: { level: models_1.ScopeLevel.MACHINE },
                uiAccess: models_1.UIAccess.MOBILE_APP,
                status: models_1.RoleStatus.PUBLISHED,
                description: 'Customer with basic order viewing access'
            }
        ];
        const rolesWithCreatedBy = roles.map(role => ({
            ...role,
            createdBy
        }));
        const createdRoles = await models_1.Role.insertMany(rolesWithCreatedBy);
        logger_util_1.logger.info(`✅ Successfully seeded ${createdRoles.length} roles`);
        const roleMap = {};
        createdRoles.forEach(role => {
            if (role.systemRole) {
                roleMap[role.systemRole] = role._id;
            }
        });
        const roleNames = createdRoles.map(r => `${r.name} (${r.systemRole})`);
        logger_util_1.logger.info(`📋 Created roles: ${roleNames.join(', ')}`);
        return roleMap;
    }
    catch (error) {
        logger_util_1.logger.error('❌ Error seeding roles:', error);
        throw error;
    }
};
exports.seedRoles = seedRoles;
if (require.main === module) {
    Promise.resolve().then(() => __importStar(require('../config/database'))).then(({ connectDB }) => {
        Promise.resolve().then(() => __importStar(require('./departments.seeder'))).then(({ seedDepartments }) => {
            connectDB().then(() => {
                const dummyCreatedBy = new mongoose_1.Types.ObjectId();
                seedDepartments(dummyCreatedBy).then((departmentMap) => {
                    (0, exports.seedRoles)(dummyCreatedBy, departmentMap).then(() => {
                        process.exit(0);
                    }).catch((error) => {
                        logger_util_1.logger.error('Failed to seed roles:', error);
                        process.exit(1);
                    });
                });
            });
        });
    });
}
//# sourceMappingURL=roles.seeder.js.map