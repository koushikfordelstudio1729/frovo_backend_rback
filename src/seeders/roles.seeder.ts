import { Role, RoleType, RoleStatus, ScopeLevel, SystemRole, UIAccess, DepartmentName } from '../models';
import { logger } from '../utils/logger.util';
import { Types } from 'mongoose';

export const seedRoles = async (
  createdBy: Types.ObjectId, 
  departmentMap: { [key: string]: Types.ObjectId }
): Promise<{ [key: string]: Types.ObjectId }> => {
  try {
    logger.info('🌱 Seeding roles...');
    
    // Check if roles already exist
    const existingCount = await Role.countDocuments();
    if (existingCount > 0) {
      logger.info(`✅ Roles already seeded (${existingCount} roles found)`);
      
      // DEBUG: Check what roles actually exist
      const existingRoles = await Role.find();
      console.log('🔍 Existing roles in database:');
      existingRoles.forEach(role => {
        console.log(`   - ${role.name} (systemRole: ${role.systemRole})`);
      });
      
      // Return existing role IDs
      const roleMap: { [key: string]: Types.ObjectId } = {};
      existingRoles.forEach(role => {
        if (role.systemRole) {
          roleMap[role.systemRole] = role._id;
        }
      });
      
      console.log('🔍 Role map created:', Object.keys(roleMap));
      return roleMap;
    }
    
    const roles = [
      {
        name: 'Super Admin',
        key: 'super_admin',
        systemRole: SystemRole.SUPER_ADMIN,
        type: RoleType.SYSTEM,
        department: departmentMap[DepartmentName.SYSTEM_ADMIN],
        permissions: ['*:*'], // All permissions
        scope: { level: ScopeLevel.GLOBAL },
        uiAccess: UIAccess.ADMIN_PANEL,
        status: RoleStatus.PUBLISHED,
        description: 'Full system access with all permissions'
      },
      {
    name: 'Vendor Admin',
    key: 'vendor_admin',
    systemRole: SystemRole.VENDOR_ADMIN,
    type: RoleType.SYSTEM,
    department: departmentMap[DepartmentName.OPERATIONS], // Or create a Vendor Management department
    permissions: [
      'vendors:view', 'vendors:create', 'vendors:edit', 'vendors:delete', 'vendors:approve',
      'vendors:financials_view', 'vendors:compliance_view',
      'users:view', // To view vendor users
      'roles:view'  // To view roles for vendor assignments
    ],
    scope: { level: ScopeLevel.GLOBAL },
    uiAccess: UIAccess.ADMIN_PANEL,
    status: RoleStatus.PUBLISHED,
    description: 'Vendor management with full control over vendor lifecycle'
  },
      {
        name: 'Ops Manager',
        key: 'ops_manager',
        systemRole: SystemRole.OPS_MANAGER,
        type: RoleType.SYSTEM,
        department: departmentMap[DepartmentName.OPERATIONS],
        permissions: [
          'machines:view', 'machines:edit', 'machines:assign',
          'planogram:view', 'planogram:edit',
          'refills:view', 'refills:assign',
          'users:view', 'roles:view',
          'vendors:view', // Can view vendors for operational purposes
      'vendors:financials_view' // Can view financials for payment processing
        ],
        scope: { level: ScopeLevel.PARTNER },
        uiAccess: UIAccess.ADMIN_PANEL,
        status: RoleStatus.PUBLISHED,
        description: 'Operations management with partner-level access'
      },
      {
        name: 'Field Agent',
        key: 'field_agent',
        systemRole: SystemRole.FIELD_AGENT,
        type: RoleType.SYSTEM,
        department: departmentMap[DepartmentName.FIELD_OPERATIONS],
        permissions: [
          'refills:execute',
          'job:update',
          'machines:view'
        ],
        scope: { level: ScopeLevel.MACHINE },
        uiAccess: UIAccess.MOBILE_APP,
        status: RoleStatus.PUBLISHED,
        description: 'Field operations with machine-level access'
      },
      {
        name: 'Technician',
        key: 'technician',
        systemRole: SystemRole.TECHNICIAN,
        type: RoleType.SYSTEM,
        department: departmentMap[DepartmentName.MAINTENANCE],
        permissions: [
          'maintenance:view',
          'ticket:resolve',
          'machines:view'
        ],
        scope: { level: ScopeLevel.MACHINE },
        uiAccess: UIAccess.MOBILE_AND_WEB,
        status: RoleStatus.PUBLISHED,
        description: 'Maintenance and repair with machine-level access'
      },
      {
        name: 'Finance Manager',
        key: 'finance_manager',
        systemRole: SystemRole.FINANCE_MANAGER,
        type: RoleType.SYSTEM,
        department: departmentMap[DepartmentName.FINANCE],
        permissions: [
          'finance:view',
          'settlement:view', 'settlement:compute',
          'payout:compute',
          'orders:view',
          'vendors:view',
      'vendors:financials_view'
        ],
        scope: { level: ScopeLevel.GLOBAL },
        uiAccess: UIAccess.FINANCE_DASHBOARD,
        status: RoleStatus.PUBLISHED,
        description: 'Financial operations with global access'
      },
      {
        name: 'Support Agent',
        key: 'support_agent',
        systemRole: SystemRole.SUPPORT_AGENT,
        type: RoleType.SYSTEM,
        department: departmentMap[DepartmentName.SUPPORT],
        permissions: [
          'orders:view', 'orders:refund',
          'ticket:resolve',
          'machines:view'
        ],
        scope: { level: ScopeLevel.GLOBAL },
        uiAccess: UIAccess.SUPPORT_PORTAL,
        status: RoleStatus.PUBLISHED,
        description: 'Customer support with global access'
      },
      {
        name: 'Warehouse Manager',
        key: 'warehouse_manager',
        systemRole: SystemRole.WAREHOUSE_MANAGER,
        type: RoleType.SYSTEM,
        department: departmentMap[DepartmentName.WAREHOUSE],
        permissions: [
          'inventory:receive',
          'batch:log',
          'dispatch:assign',
          'refills:view'
        ],
        scope: { level: ScopeLevel.PARTNER },
        uiAccess: UIAccess.WAREHOUSE_PORTAL,
        status: RoleStatus.PUBLISHED,
        description: 'Warehouse operations with partner-level access'
      },
      {
        name: 'Auditor',
        key: 'auditor',
        systemRole: SystemRole.AUDITOR,
        type: RoleType.SYSTEM,
        department: departmentMap[DepartmentName.COMPLIANCE],
        permissions: [
          'audit:view',
          'users:view',
          'roles:view',
          'departments:view'
        ],
        scope: { level: ScopeLevel.GLOBAL },
        uiAccess: UIAccess.ADMIN_PANEL,
        status: RoleStatus.PUBLISHED,
        description: 'Audit and compliance with global read access'
      },
      {
        name: 'Customer',
        key: 'customer',
        systemRole: SystemRole.CUSTOMER,
        type: RoleType.SYSTEM,
        department: departmentMap[DepartmentName.CUSTOMER],
        permissions: [
          'orders:view'
        ],
        scope: { level: ScopeLevel.MACHINE },
        uiAccess: UIAccess.MOBILE_APP,
        status: RoleStatus.PUBLISHED,
        description: 'Customer with basic order viewing access'
      }
    ];
    
    // Add createdBy to each role
    const rolesWithCreatedBy = roles.map(role => ({
      ...role,
      createdBy
    }));
    
    const createdRoles = await Role.insertMany(rolesWithCreatedBy);
    
    logger.info(`✅ Successfully seeded ${createdRoles.length} roles`);
    
    // Create role mapping
    const roleMap: { [key: string]: Types.ObjectId } = {};
    createdRoles.forEach(role => {
      if (role.systemRole) {
        roleMap[role.systemRole] = role._id;
      }
    });
    
    // Log created roles
    const roleNames = createdRoles.map(r => `${r.name} (${r.systemRole})`);
    logger.info(`📋 Created roles: ${roleNames.join(', ')}`);
    
    return roleMap;
    
  } catch (error) {
    logger.error('❌ Error seeding roles:', error);
    throw error;
  }
};

// For standalone execution
if (require.main === module) {
  import('../config/database').then(({ connectDB }) => {
    import('./departments.seeder').then(({ seedDepartments }) => {
      connectDB().then(() => {
        const dummyCreatedBy = new Types.ObjectId();
        seedDepartments(dummyCreatedBy).then((departmentMap) => {
          seedRoles(dummyCreatedBy, departmentMap).then(() => {
            process.exit(0);
          }).catch((error) => {
            logger.error('Failed to seed roles:', error);
            process.exit(1);
          });
        });
      });
    });
  });
}