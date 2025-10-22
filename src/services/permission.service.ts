import { Permission, IPermission, User, Role, IRole } from '../models';

export interface GroupedPermissions {
  [group: string]: IPermission[];
}

export interface UserPermissionCheck {
  hasPermission: boolean;
  scope?: any;
  roles?: string[];
}

class PermissionService {
  async getAllPermissions(): Promise<IPermission[]> {
    return await Permission.find().sort({ group: 1, module: 1, action: 1 });
  }
  
  async getPermissionsGrouped(): Promise<GroupedPermissions> {
    const permissions = await this.getAllPermissions();
    
    return permissions.reduce((groups, permission) => {
      const group = permission.group;
      if (!groups[group]) {
        groups[group] = [];
      }
      groups[group].push(permission);
      return groups;
    }, {} as GroupedPermissions);
  }
  
  async getPermissionsByModule(module: string): Promise<IPermission[]> {
    return await Permission.find({ module }).sort({ action: 1 });
  }
  
  async checkUserPermission(userId: string, permissionKey: string): Promise<UserPermissionCheck> {
    const user = await User.findById(userId).populate('roles');
    
    if (!user) {
      return { hasPermission: false };
    }
    
    // Get all user permissions
    const userPermissions = await user.getPermissions();
    
    // Type the populated roles
    const populatedRoles = user.roles as unknown as IRole[];
    
    // Check for wildcard (Super Admin)
    if (userPermissions.includes('*:*')) {
      return {
        hasPermission: true,
        scope: { level: 'global' },
        roles: populatedRoles.map(role => role.name)
      };
    }
    
    // Check exact match
    if (userPermissions.includes(permissionKey)) {
      // Get scope information from roles that have this permission
      const rolesWithPermission = populatedRoles.filter(role => 
        role.permissions.includes(permissionKey) || role.permissions.includes('*:*')
      );
      
      // Return the highest scope level
      let scope = null;
      for (const role of rolesWithPermission) {
        if (role.scope && role.scope.level === 'global') {
          scope = { level: 'global' };
          break;
        } else if (!scope && role.scope) {
          scope = role.scope;
        } else if (scope && role.scope && this.compareScopeLevel(role.scope.level, scope.level) > 0) {
          scope = role.scope;
        }
      }
      
      return {
        hasPermission: true,
        scope,
        roles: rolesWithPermission.map(role => role.name)
      };
    }
    
    // Check module wildcard (e.g., 'machines:*')
    const [module] = permissionKey.split(':');
    if (userPermissions.includes(`${module}:*`)) {
      const rolesWithModuleAccess = populatedRoles.filter(role => 
        role.permissions.includes(`${module}:*`) || role.permissions.includes('*:*')
      );
      
      return {
        hasPermission: true,
        scope: rolesWithModuleAccess.length > 0 && rolesWithModuleAccess[0] ? rolesWithModuleAccess[0].scope : undefined,
        roles: rolesWithModuleAccess.map(role => role.name)
      };
    }
    
    return { hasPermission: false };
  }
  
  private compareScopeLevel(level1: string, level2: string): number {
    const levels = ['machine', 'region', 'partner', 'global'];
    return levels.indexOf(level1) - levels.indexOf(level2);
  }
  
  async getRolePermissions(roleId: string): Promise<IPermission[]> {
    const role = await Role.findById(roleId);
    
    if (!role) {
      throw new Error('Role not found');
    }
    
    if (role.permissions.includes('*:*')) {
      return await this.getAllPermissions();
    }
    
    return await Permission.find({
      key: { $in: role.permissions }
    }).sort({ group: 1, module: 1, action: 1 });
  }
  
  async getUserEffectivePermissions(userId: string): Promise<IPermission[]> {
    const user = await User.findById(userId).populate('roles');
    
    if (!user) {
      throw new Error('User not found');
    }
    
    const permissionKeys = await user.getPermissions();
    
    if (permissionKeys.includes('*:*')) {
      return await this.getAllPermissions();
    }
    
    return await Permission.find({
      key: { $in: permissionKeys }
    }).sort({ group: 1, module: 1, action: 1 });
  }
  
  async searchPermissions(searchTerm: string): Promise<IPermission[]> {
    return await Permission.find({
      $or: [
        { key: { $regex: searchTerm, $options: 'i' } },
        { description: { $regex: searchTerm, $options: 'i' } },
        { module: { $regex: searchTerm, $options: 'i' } },
        { action: { $regex: searchTerm, $options: 'i' } },
        { group: { $regex: searchTerm, $options: 'i' } }
      ]
    }).sort({ group: 1, module: 1, action: 1 });
  }
  
  async getPermissionsByGroup(group: string): Promise<IPermission[]> {
    return await Permission.find({ group }).sort({ module: 1, action: 1 });
  }
  
  async getPermissionStats(): Promise<{
    totalPermissions: number;
    permissionsByModule: { [module: string]: number };
    permissionsByGroup: { [group: string]: number };
  }> {
    const permissions = await this.getAllPermissions();
    
    const stats = {
      totalPermissions: permissions.length,
      permissionsByModule: {} as { [module: string]: number },
      permissionsByGroup: {} as { [group: string]: number }
    };
    
    permissions.forEach(permission => {
      // Count by module
      if (permission.module) {
        if (!stats.permissionsByModule[permission.module]) {
          stats.permissionsByModule[permission.module] = 0;
        }
        stats.permissionsByModule[permission.module] = (stats.permissionsByModule[permission.module] || 0) + 1;
      }
      
      // Count by group
      if (permission.group) {
        if (!stats.permissionsByGroup[permission.group]) {
          stats.permissionsByGroup[permission.group] = 0;
        }
        stats.permissionsByGroup[permission.group] = (stats.permissionsByGroup[permission.group] || 0) + 1;
      }
    });
    
    return stats;
  }
  
  async validatePermissions(permissionKeys: string[]): Promise<{ valid: string[]; invalid: string[] }> {
    const existingPermissions = await Permission.find({
      key: { $in: permissionKeys }
    }).select('key');
    
    const validKeys = existingPermissions.map(p => p.key);
    const invalidKeys = permissionKeys.filter(key => !validKeys.includes(key));
    
    return {
      valid: validKeys,
      invalid: invalidKeys
    };
  }
  
  async getPermissionDetails(permissionKey: string): Promise<IPermission | null> {
    return await Permission.findOne({ key: permissionKey });
  }
  
  async createPermission(permissionData: Partial<IPermission>): Promise<IPermission> {
    // Check if permission already exists
    const existingPermission = await Permission.findOne({ key: permissionData.key });
    if (existingPermission) {
      throw new Error('Permission already exists');
    }
    
    return await Permission.create(permissionData);
  }
  
  async updatePermission(id: string, updateData: Partial<IPermission>): Promise<IPermission> {
    const permission = await Permission.findByIdAndUpdate(
      id,
      updateData,
      { new: true, runValidators: true }
    );
    
    if (!permission) {
      throw new Error('Permission not found');
    }
    
    return permission;
  }
  
  async deletePermission(id: string): Promise<void> {
    const permission = await Permission.findById(id);
    if (!permission) {
      throw new Error('Permission not found');
    }
    
    // Check if permission is used in any roles
    const roleCount = await Role.countDocuments({
      permissions: { $in: [permission.key] }
    });
    
    if (roleCount > 0) {
      throw new Error('Permission is currently used in roles and cannot be deleted');
    }
    
    await Permission.findByIdAndDelete(id);
  }
}

export const permissionService = new PermissionService();