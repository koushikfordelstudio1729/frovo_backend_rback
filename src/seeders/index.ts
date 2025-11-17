// seeders/index.ts
//import { seedVendors } from './vendor.seeder';
import { connectDB } from '../config/database';
import { logger } from '../utils/logger.util';
import { seedPermissions } from './permissions.seeder';
import { seedDepartments } from './departments.seeder';
import { seedRoles } from './roles.seeder';
import { seedSuperAdmin } from './superAdmin.seeder';
//import { seedProducts } from './products.seeder';
//import { seedVendingMachines } from './vendingMachines.seeder';
import { Types } from 'mongoose';

export const seedDatabase = async (): Promise<void> => {
  try {
    logger.info('🚀 Starting database seeding process...');
    
    // Step 1: Seed Permissions
    await seedPermissions();
    
    // Step 2: Create a temporary user ID for seeding (will be replaced by actual Super Admin ID)
    const tempCreatedBy = new Types.ObjectId();
    
    // Step 3: Seed Departments
    const departmentMap = await seedDepartments(tempCreatedBy);
    
    // Step 4: Seed Roles
    const roleMap = await seedRoles(tempCreatedBy, departmentMap);
    
    // Step 5: Seed Super Admin
    const superAdminId = await seedSuperAdmin(departmentMap, roleMap);
    
    // Step 6: Update createdBy references to point to the actual Super Admin
    const { Department, Role } = await import('../models');

    await Promise.all([
      Department.updateMany(
        { createdBy: tempCreatedBy },
        { createdBy: superAdminId }
      ),
      Role.updateMany(
        { createdBy: tempCreatedBy },
        { createdBy: superAdminId }
      )
    ]);

    logger.info('✅ Database seeding completed successfully!');
    logger.info('📊 Summary:');
    logger.info(`   • Permissions: ✅`);
    logger.info(`   • Departments: ✅ (${Object.keys(departmentMap).length} created)`);
    logger.info(`   • Roles: ✅ (${Object.keys(roleMap).length} created)`);
    logger.info(`   • Super Admin: ✅`);
    logger.info('');
    logger.info('🎉 Your RBAC system is ready to use!');
    
  } catch (error) {
    logger.error('❌ Database seeding failed:', error);
    throw error;
  }
};

// For standalone execution
if (require.main === module) {
  connectDB().then(() => {
    seedDatabase().then(() => {
      logger.info('🏁 Seeding process completed. Exiting...');
      process.exit(0);
    }).catch((error) => {
      logger.error('💥 Seeding process failed:', error);
      process.exit(1);
    });
  }).catch((error) => {
    logger.error('💥 Database connection failed:', error);
    process.exit(1);
  });
}