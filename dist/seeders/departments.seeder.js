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
exports.seedDepartments = void 0;
const models_1 = require("../models");
const logger_util_1 = require("../utils/logger.util");
const mongoose_1 = require("mongoose");
const departments = [
    {
        name: 'System Admin',
        systemName: models_1.DepartmentName.SYSTEM_ADMIN,
        description: 'System administration and overall platform management'
    },
    {
        name: 'Operations',
        systemName: models_1.DepartmentName.OPERATIONS,
        description: 'Daily operations management and oversight'
    },
    {
        name: 'Field Operations',
        systemName: models_1.DepartmentName.FIELD_OPERATIONS,
        description: 'Field operations team and on-site activities'
    },
    {
        name: 'Maintenance',
        systemName: models_1.DepartmentName.MAINTENANCE,
        description: 'Maintenance team and equipment servicing'
    },
    {
        name: 'Finance',
        systemName: models_1.DepartmentName.FINANCE,
        description: 'Finance department and financial operations'
    },
    {
        name: 'Support',
        systemName: models_1.DepartmentName.SUPPORT,
        description: 'Customer support and assistance'
    },
    {
        name: 'Warehouse',
        systemName: models_1.DepartmentName.WAREHOUSE,
        description: 'Warehouse management and inventory control'
    },
    {
        name: 'Compliance',
        systemName: models_1.DepartmentName.COMPLIANCE,
        description: 'Compliance and audit management'
    }
];
const seedDepartments = async (createdBy) => {
    try {
        logger_util_1.logger.info('🌱 Seeding departments...');
        const existingCount = await models_1.Department.countDocuments();
        if (existingCount > 0) {
            logger_util_1.logger.info(`✅ Departments already seeded (${existingCount} departments found)`);
            const existingDepartments = await models_1.Department.find();
            const departmentMap = {};
            existingDepartments.forEach(dept => {
                if (dept.systemName) {
                    departmentMap[dept.systemName] = dept._id;
                }
            });
            return departmentMap;
        }
        const departmentsWithCreatedBy = departments.map(dept => ({
            ...dept,
            createdBy
        }));
        const createdDepartments = await models_1.Department.insertMany(departmentsWithCreatedBy);
        logger_util_1.logger.info(`✅ Successfully seeded ${createdDepartments.length} departments`);
        const departmentMap = {};
        createdDepartments.forEach(dept => {
            if (dept.systemName) {
                departmentMap[dept.systemName] = dept._id;
            }
        });
        const departmentNames = createdDepartments.map(d => d.name);
        logger_util_1.logger.info(`📋 Created departments: ${departmentNames.join(', ')}`);
        return departmentMap;
    }
    catch (error) {
        logger_util_1.logger.error('❌ Error seeding departments:', error);
        throw error;
    }
};
exports.seedDepartments = seedDepartments;
if (require.main === module) {
    Promise.resolve().then(() => __importStar(require('../config/database'))).then(({ connectDB }) => {
        connectDB().then(() => {
            const dummyCreatedBy = new mongoose_1.Types.ObjectId();
            (0, exports.seedDepartments)(dummyCreatedBy).then(() => {
                process.exit(0);
            }).catch((error) => {
                logger_util_1.logger.error('Failed to seed departments:', error);
                process.exit(1);
            });
        });
    });
}
//# sourceMappingURL=departments.seeder.js.map