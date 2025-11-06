import { Department, DepartmentName } from '../models';
import { logger } from '../utils/logger.util';
import { Types } from 'mongoose';

const departments = [
  {
    name: 'System Admin',
    systemName: DepartmentName.SYSTEM_ADMIN,
    description: 'System administration and overall platform management'
  },
  {
    name: 'Operations',
    systemName: DepartmentName.OPERATIONS,
    description: 'Daily operations management and oversight'
  },
  {
    name: 'Field Operations',
    systemName: DepartmentName.FIELD_OPERATIONS,
    description: 'Field operations team and on-site activities'
  },
  {
    name: 'Maintenance',
    systemName: DepartmentName.MAINTENANCE,
    description: 'Maintenance team and equipment servicing'
  },
  {
    name: 'Finance',
    systemName: DepartmentName.FINANCE,
    description: 'Finance department and financial operations'
  },
  {
    name: 'Support',
    systemName: DepartmentName.SUPPORT,
    description: 'Customer support and assistance'
  },
  {
    name: 'Warehouse',
    systemName: DepartmentName.WAREHOUSE,
    description: 'Warehouse management and inventory control'
  },
  {
    name: 'Compliance',
    systemName: DepartmentName.COMPLIANCE,
    description: 'Compliance and audit management'
  },
  {
    name: 'Customer',
    systemName: DepartmentName.CUSTOMER,
    description: 'Customer accounts and customer-facing services'
  }
];

export const seedDepartments = async (createdBy: Types.ObjectId): Promise<{ [key: string]: Types.ObjectId }> => {
  try {
    logger.info('🌱 Seeding departments...');
    
    // Check if departments already exist
    const existingCount = await Department.countDocuments();
    if (existingCount > 0) {
      logger.info(`✅ Departments already seeded (${existingCount} departments found)`);
      
      // Return existing department IDs
      const existingDepartments = await Department.find();
      const departmentMap: { [key: string]: Types.ObjectId } = {};
      existingDepartments.forEach(dept => {
        if (dept.systemName) {
          departmentMap[dept.systemName] = dept._id;
        }
      });
      return departmentMap;
    }
    
    // Create departments
    const departmentsWithCreatedBy = departments.map(dept => ({
      ...dept,
      createdBy
    }));
    
    const createdDepartments = await Department.insertMany(departmentsWithCreatedBy);
    
    logger.info(`✅ Successfully seeded ${createdDepartments.length} departments`);
    
    // Create department mapping
    const departmentMap: { [key: string]: Types.ObjectId } = {};
    createdDepartments.forEach(dept => {
      if (dept.systemName) {
        departmentMap[dept.systemName] = dept._id;
      }
    });
    
    // Log created departments
    const departmentNames = createdDepartments.map(d => d.name);
    logger.info(`📋 Created departments: ${departmentNames.join(', ')}`);
    
    return departmentMap;
    
  } catch (error) {
    logger.error('❌ Error seeding departments:', error);
    throw error;
  }
};

// For standalone execution
if (require.main === module) {
  import('../config/database').then(({ connectDB }) => {
    connectDB().then(() => {
      // Use a dummy ObjectId for standalone execution
      const dummyCreatedBy = new Types.ObjectId();
      seedDepartments(dummyCreatedBy).then(() => {
        process.exit(0);
      }).catch((error) => {
        logger.error('Failed to seed departments:', error);
        process.exit(1);
      });
    });
  });
}