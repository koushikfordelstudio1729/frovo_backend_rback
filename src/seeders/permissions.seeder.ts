import { Permission, PermissionModule, PermissionAction } from '../models';
import { logger } from '../utils/logger.util';

const permissions = [
  // Vendor Management Permissions
  { key: 'vendors:view', module: PermissionModule.VENDORS, action: PermissionAction.VIEW, description: 'View all vendors', group: 'Vendors' },
  { key: 'vendors:create', module: PermissionModule.VENDORS, action: PermissionAction.CREATE, description: 'Create new vendors', group: 'Vendors' },
  { key: 'vendors:edit', module: PermissionModule.VENDORS, action: PermissionAction.EDIT, description: 'Edit vendor details', group: 'Vendors' },
  { key: 'vendors:delete', module: PermissionModule.VENDORS, action: PermissionAction.DELETE, description: 'Delete vendors', group: 'Vendors' },
  { key: 'vendors:approve', module: PermissionModule.VENDORS, action: PermissionAction.APPROVE, description: 'Approve vendor registrations', group: 'Vendors' },
  { key: 'vendors:financials_view', module: PermissionModule.VENDORS, action: PermissionAction.VIEW, description: 'View vendor financial information', group: 'Vendors' },
  { key: 'vendors:compliance_view', module: PermissionModule.VENDORS, action: PermissionAction.VIEW, description: 'View vendor compliance data', group: 'Vendors' },
  
  // Machines
  { key: 'machines:view', module: PermissionModule.MACHINES, action: PermissionAction.VIEW, description: 'View all machines', group: 'Machines' },
  { key: 'machines:edit', module: PermissionModule.MACHINES, action: PermissionAction.EDIT, description: 'Edit machine details', group: 'Machines' },
  { key: 'machines:delete', module: PermissionModule.MACHINES, action: PermissionAction.DELETE, description: 'Delete machines', group: 'Machines' },
  { key: 'machines:assign', module: PermissionModule.MACHINES, action: PermissionAction.ASSIGN, description: 'Assign machines', group: 'Machines' },
  
  // Planogram
  { key: 'planogram:view', module: PermissionModule.PLANOGRAM, action: PermissionAction.VIEW, description: 'View planograms', group: 'Planogram' },
  { key: 'planogram:edit', module: PermissionModule.PLANOGRAM, action: PermissionAction.EDIT, description: 'Edit planograms', group: 'Planogram' },
  { key: 'planogram:publish', module: PermissionModule.PLANOGRAM, action: PermissionAction.PUBLISH, description: 'Publish planograms', group: 'Planogram' },
  
  // Orders
  { key: 'orders:view', module: PermissionModule.ORDERS, action: PermissionAction.VIEW, description: 'View orders', group: 'Orders' },
  { key: 'orders:refund', module: PermissionModule.ORDERS, action: PermissionAction.REFUND, description: 'Process refunds', group: 'Orders' },
  
  // Finance
  { key: 'finance:view', module: PermissionModule.FINANCE, action: PermissionAction.VIEW, description: 'View financial data', group: 'Finance' },
  
  // Settlement
  { key: 'settlement:view', module: PermissionModule.SETTLEMENT, action: PermissionAction.VIEW, description: 'View settlements', group: 'Finance' },
  { key: 'settlement:compute', module: PermissionModule.SETTLEMENT, action: PermissionAction.COMPUTE, description: 'Compute settlements', group: 'Finance' },
  
  // Payout
  { key: 'payout:compute', module: PermissionModule.PAYOUT, action: PermissionAction.COMPUTE, description: 'Compute payouts', group: 'Finance' },
  
  // Refills
  { key: 'refills:view', module: PermissionModule.REFILLS, action: PermissionAction.VIEW, description: 'View refills', group: 'Refills' },
  { key: 'refills:assign', module: PermissionModule.REFILLS, action: PermissionAction.ASSIGN, description: 'Assign refills', group: 'Refills' },
  { key: 'refills:execute', module: PermissionModule.REFILLS, action: PermissionAction.EXECUTE, description: 'Execute refills', group: 'Refills' },
  
  // Job
  { key: 'job:update', module: PermissionModule.JOB, action: PermissionAction.UPDATE, description: 'Update jobs', group: 'Field Operations' },
  
  // Maintenance
  { key: 'maintenance:view', module: PermissionModule.MAINTENANCE, action: PermissionAction.VIEW, description: 'View maintenance', group: 'Maintenance' },
  
  // Ticket
  { key: 'ticket:resolve', module: PermissionModule.TICKET, action: PermissionAction.RESOLVE, description: 'Resolve tickets', group: 'Maintenance' },
  
  // Inventory
  { key: 'inventory:receive', module: PermissionModule.INVENTORY, action: PermissionAction.RECEIVE, description: 'Receive inventory', group: 'Inventory' },
  
  // Batch
  { key: 'batch:log', module: PermissionModule.BATCH, action: PermissionAction.LOG, description: 'Log batches', group: 'Inventory' },
  
  // Dispatch
  { key: 'dispatch:assign', module: PermissionModule.DISPATCH, action: PermissionAction.ASSIGN, description: 'Assign dispatch', group: 'Inventory' },
  
  // Audit
  { key: 'audit:view', module: PermissionModule.AUDIT, action: PermissionAction.VIEW, description: 'View audit logs', group: 'Audit' },
  { key: 'audit:export', module: PermissionModule.AUDIT, action: PermissionAction.EXPORT, description: 'Export audit logs', group: 'Audit' },
  
  // Users
  { key: 'users:view', module: PermissionModule.USERS, action: PermissionAction.VIEW, description: 'View users', group: 'Users' },
  { key: 'users:create', module: PermissionModule.USERS, action: PermissionAction.CREATE, description: 'Create users', group: 'Users' },
  { key: 'users:edit', module: PermissionModule.USERS, action: PermissionAction.EDIT, description: 'Edit users', group: 'Users' },
  { key: 'users:delete', module: PermissionModule.USERS, action: PermissionAction.DELETE, description: 'Delete users', group: 'Users' },
  
  // Roles
  { key: 'roles:view', module: PermissionModule.ROLES, action: PermissionAction.VIEW, description: 'View roles', group: 'Roles' },
  { key: 'roles:create', module: PermissionModule.ROLES, action: PermissionAction.CREATE, description: 'Create roles', group: 'Roles' },
  { key: 'roles:edit', module: PermissionModule.ROLES, action: PermissionAction.EDIT, description: 'Edit roles', group: 'Roles' },
  { key: 'roles:delete', module: PermissionModule.ROLES, action: PermissionAction.DELETE, description: 'Delete roles', group: 'Roles' },
  
  // Departments
  { key: 'departments:view', module: PermissionModule.DEPARTMENTS, action: PermissionAction.VIEW, description: 'View departments', group: 'Departments' },
  { key: 'departments:create', module: PermissionModule.DEPARTMENTS, action: PermissionAction.CREATE, description: 'Create departments', group: 'Departments' },
  { key: 'departments:edit', module: PermissionModule.DEPARTMENTS, action: PermissionAction.EDIT, description: 'Edit departments', group: 'Departments' },
  { key: 'departments:delete', module: PermissionModule.DEPARTMENTS, action: PermissionAction.DELETE, description: 'Delete departments', group: 'Departments' },
  
  // Warehouse Management Permissions
  { key: 'warehouse:view', module: PermissionModule.WAREHOUSE, action: PermissionAction.VIEW, description: 'View warehouse operations', group: 'Warehouse' },
  { key: 'warehouse:manage', module: PermissionModule.WAREHOUSE, action: PermissionAction.MANAGE, description: 'Manage warehouse operations', group: 'Warehouse' },
  { key: 'warehouse:admin', module: PermissionModule.WAREHOUSE, action: PermissionAction.ADMIN, description: 'Full warehouse administration', group: 'Warehouse' },
  
  // Purchase Orders Permissions
  { key: 'purchase_orders:view', module: PermissionModule.PURCHASE_ORDERS, action: PermissionAction.VIEW, description: 'View purchase orders', group: 'Purchase Orders' },
  { key: 'purchase_orders:create', module: PermissionModule.PURCHASE_ORDERS, action: PermissionAction.CREATE, description: 'Create purchase orders', group: 'Purchase Orders' },
  { key: 'purchase_orders:edit', module: PermissionModule.PURCHASE_ORDERS, action: PermissionAction.EDIT, description: 'Edit purchase orders', group: 'Purchase Orders' },
  { key: 'purchase_orders:delete', module: PermissionModule.PURCHASE_ORDERS, action: PermissionAction.DELETE, description: 'Delete purchase orders', group: 'Purchase Orders' },
  { key: 'purchase_orders:status_update', module: PermissionModule.PURCHASE_ORDERS, action: PermissionAction.STATUS_UPDATE, description: 'Update purchase order status', group: 'Purchase Orders' },
  
  // GRN (Goods Received Note) Permissions
  { key: 'grn:view', module: PermissionModule.GRN, action: PermissionAction.VIEW, description: 'View GRN records', group: 'GRN' },
  { key: 'grn:create', module: PermissionModule.GRN, action: PermissionAction.CREATE, description: 'Create GRN records', group: 'GRN' },
  { key: 'grn:edit', module: PermissionModule.GRN, action: PermissionAction.EDIT, description: 'Edit GRN records', group: 'GRN' },
  { key: 'grn:delete', module: PermissionModule.GRN, action: PermissionAction.DELETE, description: 'Delete GRN records', group: 'GRN' }
];

export const seedPermissions = async (): Promise<void> => {
  try {
    logger.info('🌱 Seeding permissions...');
    
    // Check if permissions already exist
    const existingCount = await Permission.countDocuments();
    if (existingCount > 0) {
      logger.info(`✅ Permissions already seeded (${existingCount} permissions found)`);
      return;
    }
    
    // Create permissions
    const createdPermissions = await Permission.insertMany(permissions);
    
    logger.info(`✅ Successfully seeded ${createdPermissions.length} permissions`);
    
    // Log permission groups
    const groups = [...new Set(permissions.map(p => p.group))];
    logger.info(`📋 Permission groups: ${groups.join(', ')}`);
    
  } catch (error) {
    logger.error('❌ Error seeding permissions:', error);
    throw error;
  }
};

// For standalone execution
if (require.main === module) {
  import('../config/database').then(({ connectDB }) => {
    connectDB().then(() => {
      seedPermissions().then(() => {
        process.exit(0);
      }).catch((error) => {
        logger.error('Failed to seed permissions:', error);
        process.exit(1);
      });
    });
  });
}