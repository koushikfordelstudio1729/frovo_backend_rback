// seeders/superAdmin.seeder.ts - FIXED VERSION
import { User, UserStatus, SystemRole } from '../models';
import { logger } from '../utils/logger.util';
import { emailService } from '../services/email.service';
import { Types } from 'mongoose';

export const seedSuperAdmin = async (
  departmentMap: { [key: string]: Types.ObjectId },
  roleMap: { [key: string]: Types.ObjectId }
): Promise<{ superAdminId: Types.ObjectId; vendorAdminId: Types.ObjectId }> => {
  try {
    logger.info('🌱 Seeding Super Admin and Vendor Admin...');
    
    // DEBUG: Check what's in the maps
    console.log('🔍 Department Map Keys:', Object.keys(departmentMap));
    console.log('🔍 Role Map Keys:', Object.keys(roleMap));
    console.log('🔍 Looking for Vendor Admin role:', SystemRole.VENDOR_ADMIN in roleMap);
    console.log('🔍 Looking for Operations department:', 'Operations' in departmentMap);
    
    // Check if any user already exists
    const existingUserCount = await User.countDocuments();
    if (existingUserCount > 0) {
      logger.info(`✅ Users already exist (${existingUserCount} users found)`);
      
      // Find existing super admin
      const existingSuperAdmin = await User.findOne({ roles: { $in: [roleMap[SystemRole.SUPER_ADMIN]] } });
      const existingVendorAdmin = await User.findOne({ email: process.env['VENDOR_ADMIN_EMAIL'] || 'vendor.admin@frovo.com' });
      
      if (existingSuperAdmin && existingVendorAdmin) {
        logger.info('✅ Both Super Admin and Vendor Admin already exist');
        return {
          superAdminId: existingSuperAdmin._id,
          vendorAdminId: existingVendorAdmin._id
        };
      }
      
      // If users exist but not both roles, create the missing ones
      const result: any = {};
      
      if (!existingSuperAdmin) {
        logger.info('⚠️ Creating missing Super Admin...');
        result.superAdminId = await createSuperAdmin(departmentMap, roleMap);
      } else {
        result.superAdminId = existingSuperAdmin._id;
      }
      
      if (!existingVendorAdmin) {
        logger.info('⚠️ Creating missing Vendor Admin...');
        result.vendorAdminId = await createVendorAdmin(result.superAdminId, departmentMap, roleMap);
      } else {
        result.vendorAdminId = existingVendorAdmin._id;
      }
      
      return result;
    }
    
    // Create Super Admin first
    const superAdminId = await createSuperAdmin(departmentMap, roleMap);
    
    // Create Vendor Admin using Super Admin as creator
    const vendorAdminId = await createVendorAdmin(superAdminId, departmentMap, roleMap);
    
    logger.info('✅ Successfully created both Super Admin and Vendor Admin users');
    
    return {
      superAdminId,
      vendorAdminId
    };
    
  } catch (error) {
    logger.error('❌ Error seeding admin users:', error);
    throw error;
  }
};

// Helper function to create Super Admin
const createSuperAdmin = async (
  departmentMap: { [key: string]: Types.ObjectId },
  roleMap: { [key: string]: Types.ObjectId }
): Promise<Types.ObjectId> => {
  const email = process.env['SUPER_ADMIN_EMAIL'] || 'superadmin@frovo.com';
  const password = process.env['SUPER_ADMIN_PASSWORD'] || 'SuperAdmin@123';
  const name = process.env['SUPER_ADMIN_NAME'] || 'System Administrator';
  
  const superAdminRoleId = roleMap[SystemRole.SUPER_ADMIN];
  const systemAdminDeptId = departmentMap['System Admin'];
  
  if (!superAdminRoleId || !systemAdminDeptId) {
    throw new Error('Super Admin role or System Admin department not found');
  }
  
  // Check if Super Admin already exists
  const existingSuperAdmin = await User.findOne({ email });
  if (existingSuperAdmin) {
    logger.info('✅ Super Admin user already exists');
    return existingSuperAdmin._id;
  }
  
  // Create Super Admin user
  const superAdmin = await User.create({
    name,
    email,
    password,
    departments: [systemAdminDeptId],
    roles: [superAdminRoleId],
    status: UserStatus.ACTIVE,
    createdBy: new Types.ObjectId() // Temporary, will update
  });
  
  // Update createdBy to point to the super admin itself
  await User.findByIdAndUpdate(superAdmin._id, { createdBy: superAdmin._id });
  
  logger.info('✅ Successfully created Super Admin user');
  logger.info(`📧 Email: ${email}`);
  logger.info(`🔑 Password: ${password}`);
  
  // Send welcome email if configured
  const emailConfigured = process.env['EMAIL_USER'] && process.env['EMAIL_PASS'];
  if (emailConfigured) {
    try {
      await emailService.sendWelcomeEmail(email, name, password);
      logger.info('📧 Welcome email sent successfully to Super Admin');
    } catch (emailError) {
      logger.warn('⚠️ Failed to send welcome email to Super Admin:', emailError);
    }
  }
  
  return superAdmin._id;
};

// Helper function to ensure Vendor Admin role exists
const ensureVendorAdminRole = async (
  departmentMap: { [key: string]: Types.ObjectId }, 
  createdBy: Types.ObjectId
): Promise<Types.ObjectId> => {
  const { Role, RoleType, RoleStatus, ScopeLevel, SystemRole, UIAccess } = await import('../models');
  
  // Check if Vendor Admin role exists
  let vendorAdminRole = await Role.findOne({ systemRole: SystemRole.VENDOR_ADMIN });
  
  if (!vendorAdminRole) {
    logger.info('⚠️ Vendor Admin role not found, creating it now...');
    
    const operationsDeptId = departmentMap['Operations'];
    if (!operationsDeptId) {
      throw new Error('Operations department not found for Vendor Admin role');
    }
    
    vendorAdminRole = await Role.create({
      name: 'Vendor Admin',
      key: 'vendor_admin',
      systemRole: SystemRole.VENDOR_ADMIN,
      type: RoleType.SYSTEM,
      department: operationsDeptId,
      permissions: [
        'vendors:view', 'vendors:create', 'vendors:edit', 'vendors:delete', 'vendors:approve',
        'vendors:financials_view', 'vendors:compliance_view',
        'users:view',
        'roles:view'
      ],
      scope: { level: ScopeLevel.GLOBAL },
      uiAccess: UIAccess.ADMIN_PANEL,
      status: RoleStatus.PUBLISHED,
      description: 'Vendor management with full control over vendor lifecycle',
      createdBy: createdBy
    });
    
    logger.info('✅ Vendor Admin role created successfully');
  }
  
  return vendorAdminRole._id;
};

// Helper function to create Vendor Admin
const createVendorAdmin = async (
  createdBy: Types.ObjectId,
  departmentMap: { [key: string]: Types.ObjectId },
  roleMap: { [key: string]: Types.ObjectId }
): Promise<Types.ObjectId> => {
  const email = process.env['VENDOR_ADMIN_EMAIL'] || 'vendor.admin@frovo.com';
  const password = process.env['VENDOR_ADMIN_PASSWORD'] || 'VendorAdmin@123';
  const name = process.env['VENDOR_ADMIN_NAME'] || 'Vendor Administrator';
  
  // Use the fallback function to ensure Vendor Admin role exists
  const vendorAdminRoleId = await ensureVendorAdminRole(departmentMap, createdBy);
  const operationsDeptId = departmentMap['Operations'];
  
  if (!operationsDeptId) {
    throw new Error('Operations department not found');
  }
  
  // Check if Vendor Admin user already exists with this email
  const existingVendorAdmin = await User.findOne({ email });
  if (existingVendorAdmin) {
    logger.info('✅ Vendor Admin user already exists');
    return existingVendorAdmin._id;
  }
  
  // Create Vendor Admin user
  const vendorAdmin = await User.create({
    name,
    email,
    password,
    departments: [operationsDeptId],
    roles: [vendorAdminRoleId],
    status: UserStatus.ACTIVE,
    createdBy: createdBy
  });
  
  logger.info('✅ Successfully created Vendor Admin user');
  logger.info(`📧 Email: ${email}`);
  logger.info(`🔑 Password: ${password}`);
  
  // Send welcome email if configured
  const emailConfigured = process.env['EMAIL_USER'] && process.env['EMAIL_PASS'];
  if (emailConfigured) {
    try {
      await emailService.sendWelcomeEmail(email, name, password);
      logger.info('📧 Welcome email sent successfully to Vendor Admin');
    } catch (emailError) {
      logger.warn('⚠️ Failed to send welcome email to Vendor Admin:', emailError);
    }
  }
  
  return vendorAdmin._id;
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
                logger.error('Failed to seed admin users:', error);
                process.exit(1);
              });
            });
          });
        });
      });
    });
  });
}