export enum UserStatus {
  ACTIVE = 'active',
  INACTIVE = 'inactive',
  SUSPENDED = 'suspended'
}

export enum RoleType {
  SYSTEM = 'system',
  CUSTOM = 'custom'
}

export enum RoleStatus {
  DRAFT = 'draft',
  PUBLISHED = 'published'
}

export enum ScopeLevel {
  GLOBAL = 'global',
  PARTNER = 'partner',
  REGION = 'region',
  MACHINE = 'machine'
}

export enum AccessRequestStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  REJECTED = 'rejected',
  EXPIRED = 'expired'
}

export enum SystemRole {
  SUPER_ADMIN = 'super_admin',
  VENDOR_ADMIN = 'vendor_admin',
  OPS_MANAGER = 'ops_manager',
  FIELD_AGENT = 'field_agent',
  TECHNICIAN = 'technician',
  FINANCE_MANAGER = 'finance_manager',
  SUPPORT_AGENT = 'support_agent',
  WAREHOUSE_MANAGER = 'warehouse_manager',
  WAREHOUSE_STAFF = 'warehouse_staff',
  AUDITOR = 'auditor',
  CUSTOMER = 'customer'
}

export enum DepartmentName {
  SYSTEM_ADMIN = 'System Admin',
  OPERATIONS = 'Operations',
  FIELD_OPERATIONS = 'Field Operations',
  MAINTENANCE = 'Maintenance',
  FINANCE = 'Finance',
  SUPPORT = 'Support',
  WAREHOUSE = 'Warehouse',
  COMPLIANCE = 'Compliance',
  CUSTOMER = 'Customer'
}

export enum PermissionModule {
  MACHINES = 'machines',
  VENDORS = 'vendors',
  PLANOGRAM = 'planogram',
  ORDERS = 'orders',
  FINANCE = 'finance',
  REFILLS = 'refills',
  MAINTENANCE = 'maintenance',
  INVENTORY = 'inventory',
  AUDIT = 'audit',
  USERS = 'users',
  ROLES = 'roles',
  DEPARTMENTS = 'departments',
  SETTLEMENT = 'settlement',
  PAYOUT = 'payout',
  JOB = 'job',
  TICKET = 'ticket',
  BATCH = 'batch',
  DISPATCH = 'dispatch',
  // New warehouse management modules
  WAREHOUSE = 'warehouse',
  PURCHASE_ORDERS = 'purchase_orders',
  GRN = 'grn'
}

export enum PermissionAction {
  VIEW = 'view',
  CREATE = 'create',
  EDIT = 'edit',
  DELETE = 'delete',
  ASSIGN = 'assign',
  EXECUTE = 'execute',
  APPROVE = 'approve',
  REFUND = 'refund',
  PUBLISH = 'publish',
  EXPORT = 'export',
  COMPUTE = 'compute',
  RESOLVE = 'resolve',
  RECEIVE = 'receive',
  DISPATCH = 'dispatch',
  UPDATE = 'update',
  LOG = 'log',
  // New warehouse management actions
  STATUS_UPDATE = 'status_update',
  MANAGE = 'manage',
  ADMIN = 'admin'
}

export enum UIAccess {
  ADMIN_PANEL = 'Admin Panel',
  MOBILE_APP = 'Mobile App',
  FINANCE_DASHBOARD = 'Finance Dashboard',
  SUPPORT_PORTAL = 'Support Portal',
  WAREHOUSE_PORTAL = 'Warehouse Portal',
  MOBILE_AND_WEB = 'Mobile & Web'
}