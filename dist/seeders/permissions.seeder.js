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
exports.seedPermissions = void 0;
const models_1 = require("../models");
const logger_util_1 = require("../utils/logger.util");
const permissions = [
    { key: 'machines:view', module: models_1.PermissionModule.MACHINES, action: models_1.PermissionAction.VIEW, description: 'View all machines', group: 'Machines' },
    { key: 'machines:edit', module: models_1.PermissionModule.MACHINES, action: models_1.PermissionAction.EDIT, description: 'Edit machine details', group: 'Machines' },
    { key: 'machines:delete', module: models_1.PermissionModule.MACHINES, action: models_1.PermissionAction.DELETE, description: 'Delete machines', group: 'Machines' },
    { key: 'machines:assign', module: models_1.PermissionModule.MACHINES, action: models_1.PermissionAction.ASSIGN, description: 'Assign machines', group: 'Machines' },
    { key: 'planogram:view', module: models_1.PermissionModule.PLANOGRAM, action: models_1.PermissionAction.VIEW, description: 'View planograms', group: 'Planogram' },
    { key: 'planogram:edit', module: models_1.PermissionModule.PLANOGRAM, action: models_1.PermissionAction.EDIT, description: 'Edit planograms', group: 'Planogram' },
    { key: 'planogram:publish', module: models_1.PermissionModule.PLANOGRAM, action: models_1.PermissionAction.PUBLISH, description: 'Publish planograms', group: 'Planogram' },
    { key: 'orders:view', module: models_1.PermissionModule.ORDERS, action: models_1.PermissionAction.VIEW, description: 'View orders', group: 'Orders' },
    { key: 'orders:refund', module: models_1.PermissionModule.ORDERS, action: models_1.PermissionAction.REFUND, description: 'Process refunds', group: 'Orders' },
    { key: 'finance:view', module: models_1.PermissionModule.FINANCE, action: models_1.PermissionAction.VIEW, description: 'View financial data', group: 'Finance' },
    { key: 'settlement:view', module: models_1.PermissionModule.SETTLEMENT, action: models_1.PermissionAction.VIEW, description: 'View settlements', group: 'Finance' },
    { key: 'settlement:compute', module: models_1.PermissionModule.SETTLEMENT, action: models_1.PermissionAction.COMPUTE, description: 'Compute settlements', group: 'Finance' },
    { key: 'payout:compute', module: models_1.PermissionModule.PAYOUT, action: models_1.PermissionAction.COMPUTE, description: 'Compute payouts', group: 'Finance' },
    { key: 'refills:view', module: models_1.PermissionModule.REFILLS, action: models_1.PermissionAction.VIEW, description: 'View refills', group: 'Refills' },
    { key: 'refills:assign', module: models_1.PermissionModule.REFILLS, action: models_1.PermissionAction.ASSIGN, description: 'Assign refills', group: 'Refills' },
    { key: 'refills:execute', module: models_1.PermissionModule.REFILLS, action: models_1.PermissionAction.EXECUTE, description: 'Execute refills', group: 'Refills' },
    { key: 'job:update', module: models_1.PermissionModule.JOB, action: models_1.PermissionAction.UPDATE, description: 'Update jobs', group: 'Field Operations' },
    { key: 'maintenance:view', module: models_1.PermissionModule.MAINTENANCE, action: models_1.PermissionAction.VIEW, description: 'View maintenance', group: 'Maintenance' },
    { key: 'ticket:resolve', module: models_1.PermissionModule.TICKET, action: models_1.PermissionAction.RESOLVE, description: 'Resolve tickets', group: 'Maintenance' },
    { key: 'inventory:receive', module: models_1.PermissionModule.INVENTORY, action: models_1.PermissionAction.RECEIVE, description: 'Receive inventory', group: 'Inventory' },
    { key: 'batch:log', module: models_1.PermissionModule.BATCH, action: models_1.PermissionAction.LOG, description: 'Log batches', group: 'Inventory' },
    { key: 'dispatch:assign', module: models_1.PermissionModule.DISPATCH, action: models_1.PermissionAction.ASSIGN, description: 'Assign dispatch', group: 'Inventory' },
    { key: 'audit:view', module: models_1.PermissionModule.AUDIT, action: models_1.PermissionAction.VIEW, description: 'View audit logs', group: 'Audit' },
    { key: 'audit:export', module: models_1.PermissionModule.AUDIT, action: models_1.PermissionAction.EXPORT, description: 'Export audit logs', group: 'Audit' },
    { key: 'users:view', module: models_1.PermissionModule.USERS, action: models_1.PermissionAction.VIEW, description: 'View users', group: 'Users' },
    { key: 'users:create', module: models_1.PermissionModule.USERS, action: models_1.PermissionAction.CREATE, description: 'Create users', group: 'Users' },
    { key: 'users:edit', module: models_1.PermissionModule.USERS, action: models_1.PermissionAction.EDIT, description: 'Edit users', group: 'Users' },
    { key: 'users:delete', module: models_1.PermissionModule.USERS, action: models_1.PermissionAction.DELETE, description: 'Delete users', group: 'Users' },
    { key: 'roles:view', module: models_1.PermissionModule.ROLES, action: models_1.PermissionAction.VIEW, description: 'View roles', group: 'Roles' },
    { key: 'roles:create', module: models_1.PermissionModule.ROLES, action: models_1.PermissionAction.CREATE, description: 'Create roles', group: 'Roles' },
    { key: 'roles:edit', module: models_1.PermissionModule.ROLES, action: models_1.PermissionAction.EDIT, description: 'Edit roles', group: 'Roles' },
    { key: 'roles:delete', module: models_1.PermissionModule.ROLES, action: models_1.PermissionAction.DELETE, description: 'Delete roles', group: 'Roles' },
    { key: 'departments:view', module: models_1.PermissionModule.DEPARTMENTS, action: models_1.PermissionAction.VIEW, description: 'View departments', group: 'Departments' },
    { key: 'departments:create', module: models_1.PermissionModule.DEPARTMENTS, action: models_1.PermissionAction.CREATE, description: 'Create departments', group: 'Departments' },
    { key: 'departments:edit', module: models_1.PermissionModule.DEPARTMENTS, action: models_1.PermissionAction.EDIT, description: 'Edit departments', group: 'Departments' },
    { key: 'departments:delete', module: models_1.PermissionModule.DEPARTMENTS, action: models_1.PermissionAction.DELETE, description: 'Delete departments', group: 'Departments' }
];
const seedPermissions = async () => {
    try {
        logger_util_1.logger.info('🌱 Seeding permissions...');
        const existingCount = await models_1.Permission.countDocuments();
        if (existingCount > 0) {
            logger_util_1.logger.info(`✅ Permissions already seeded (${existingCount} permissions found)`);
            return;
        }
        const createdPermissions = await models_1.Permission.insertMany(permissions);
        logger_util_1.logger.info(`✅ Successfully seeded ${createdPermissions.length} permissions`);
        const groups = [...new Set(permissions.map(p => p.group))];
        logger_util_1.logger.info(`📋 Permission groups: ${groups.join(', ')}`);
    }
    catch (error) {
        logger_util_1.logger.error('❌ Error seeding permissions:', error);
        throw error;
    }
};
exports.seedPermissions = seedPermissions;
if (require.main === module) {
    Promise.resolve().then(() => __importStar(require('../config/database'))).then(({ connectDB }) => {
        connectDB().then(() => {
            (0, exports.seedPermissions)().then(() => {
                process.exit(0);
            }).catch((error) => {
                logger_util_1.logger.error('Failed to seed permissions:', error);
                process.exit(1);
            });
        });
    });
}
//# sourceMappingURL=permissions.seeder.js.map