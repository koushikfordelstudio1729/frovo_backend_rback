import { User, UserStatus, SystemRole } from '../models';
import { logger } from '../utils/logger.util';
import { emailService } from '../services/email.service';
import { Types } from 'mongoose';

export const seedSuperAdmin = async (
  departmentMap: { [key: string]: Types.ObjectId },
  roleMap: { [key: string]: Types.ObjectId }
): Promise<Types.ObjectId> => {
  try {
    logger.info('🌱 Seeding Super Admin...');
    
    // Check if any user already exists
    const existingUserCount = await User.countDocuments();
    if (existingUserCount > 0) {
      logger.info(`✅ Super Admin already exists (${existingUserCount} users found)`);
      
      // Find existing super admin
      const existingSuperAdmin = await User.findOne({ roles: { $in: [roleMap[SystemRole.SUPER_ADMIN]] } });
      if (existingSuperAdmin) {
        // Get Super Admin credentials for email
        const email = process.env['SUPER_ADMIN_EMAIL'] || 'superadmin@vendingapp.com';
        const password = process.env['SUPER_ADMIN_PASSWORD'] || 'SuperAdmin@123';
        const name = process.env['SUPER_ADMIN_NAME'] || 'System Administrator';
        
        // Send welcome email if configured and SEND_WELCOME_EMAIL is true
        const emailConfigured = process.env['EMAIL_USER'] && process.env['EMAIL_PASS'];
        const shouldSendEmail = process.env['SEND_WELCOME_EMAIL'] === 'true';
        
        if (emailConfigured && shouldSendEmail) {
          try {
            await emailService.sendWelcomeEmail(email, name, password);
            logger.info('📧 Welcome email sent to existing Super Admin');
          } catch (emailError) {
            logger.warn('⚠️  Failed to send welcome email to existing Super Admin:', emailError);
          }
        }
        
        return existingSuperAdmin._id;
      }
      
      // If no super admin found but users exist, throw error
      throw new Error('Users exist but no Super Admin found. Manual intervention required.');
    }
    
    // Get Super Admin role and department
    const superAdminRoleId = roleMap[SystemRole.SUPER_ADMIN];
    const systemAdminDeptId = departmentMap['System Admin'];
    
    if (!superAdminRoleId || !systemAdminDeptId) {
      throw new Error('Super Admin role or System Admin department not found');
    }
    
    // Get Super Admin credentials from environment
    const email = process.env['SUPER_ADMIN_EMAIL'] || 'superadmin@vendingapp.com';
    const password = process.env['SUPER_ADMIN_PASSWORD'] || 'SuperAdmin@123';
    const name = process.env['SUPER_ADMIN_NAME'] || 'System Administrator';
    
    // Create a temporary ObjectId for createdBy (will be updated after creation)
    const tempCreatedBy = new Types.ObjectId();
    
    // Create Super Admin user
    const superAdmin = await User.create({
      name,
      email,
      password,
      departments: [systemAdminDeptId],
      roles: [superAdminRoleId],
      status: UserStatus.ACTIVE,
      createdBy: tempCreatedBy
    });
    
    // Update createdBy to point to the super admin itself
    await User.findByIdAndUpdate(superAdmin._id, { createdBy: superAdmin._id });
    
    logger.info('✅ Successfully created Super Admin user');
    logger.info(`📧 Email: ${email}`);
    logger.info(`🔑 Password: ${password}`);
    logger.info('⚠️  Please change the default password after first login!');
    
    // Send welcome email (only if email is configured)
    const emailConfigured = process.env['EMAIL_USER'] && process.env['EMAIL_PASS'];
    if (emailConfigured) {
      try {
        await emailService.sendWelcomeEmail(email, name, password);
        logger.info('📧 Welcome email sent successfully to Super Admin');
      } catch (emailError) {
        logger.warn('⚠️  Failed to send welcome email to Super Admin:', emailError);
        logger.info('Super Admin created successfully but email notification failed');
      }
    } else {
      logger.info('📧 Email not configured, skipping welcome email');
    }
    
    return superAdmin._id;
    
  } catch (error) {
    logger.error('❌ Error seeding Super Admin:', error);
    throw error;
  }
};

// For standalone execution
if (require.main === module) {
  import('../config/database').then(({ connectDB }) => {
    import('./departments.seeder').then(({ seedDepartments }) => {
      import('./roles.seeder').then(({ seedRoles }) => {
        connectDB().then(() => {
          const dummyCreatedBy = new Types.ObjectId();
          
          seedDepartments(dummyCreatedBy).then((departmentMap) => {
            seedRoles(dummyCreatedBy, departmentMap).then((roleMap) => {
              seedSuperAdmin(departmentMap, roleMap).then(() => {
                process.exit(0);
              }).catch((error) => {
                logger.error('Failed to seed Super Admin:', error);
                process.exit(1);
              });
            });
          });
        });
      });
    });
  });
}