"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.permissionService = void 0;
const models_1 = require("../models");
class PermissionService {
    async getAllPermissions() {
        return await models_1.Permission.find().sort({ group: 1, module: 1, action: 1 });
    }
    async getPermissionsGrouped() {
        const permissions = await this.getAllPermissions();
        return permissions.reduce((groups, permission) => {
            const group = permission.group;
            if (!groups[group]) {
                groups[group] = [];
            }
            groups[group].push(permission);
            return groups;
        }, {});
    }
    async getPermissionsByModule(module) {
        return await models_1.Permission.find({ module }).sort({ action: 1 });
    }
    async checkUserPermission(userId, permissionKey) {
        const user = await models_1.User.findById(userId).populate('roles');
        if (!user) {
            return { hasPermission: false };
        }
        const userPermissions = await user.getPermissions();
        const populatedRoles = user.roles;
        if (userPermissions.includes('*:*')) {
            return {
                hasPermission: true,
                scope: { level: 'global' },
                roles: populatedRoles.map(role => role.name)
            };
        }
        if (userPermissions.includes(permissionKey)) {
            const rolesWithPermission = populatedRoles.filter(role => role.permissions.includes(permissionKey) || role.permissions.includes('*:*'));
            let scope = null;
            for (const role of rolesWithPermission) {
                if (role.scope && role.scope.level === 'global') {
                    scope = { level: 'global' };
                    break;
                }
                else if (!scope && role.scope) {
                    scope = role.scope;
                }
                else if (scope && role.scope && this.compareScopeLevel(role.scope.level, scope.level) > 0) {
                    scope = role.scope;
                }
            }
            return {
                hasPermission: true,
                scope,
                roles: rolesWithPermission.map(role => role.name)
            };
        }
        const [module] = permissionKey.split(':');
        if (userPermissions.includes(`${module}:*`)) {
            const rolesWithModuleAccess = populatedRoles.filter(role => role.permissions.includes(`${module}:*`) || role.permissions.includes('*:*'));
            return {
                hasPermission: true,
                scope: rolesWithModuleAccess.length > 0 && rolesWithModuleAccess[0] ? rolesWithModuleAccess[0].scope : undefined,
                roles: rolesWithModuleAccess.map(role => role.name)
            };
        }
        return { hasPermission: false };
    }
    compareScopeLevel(level1, level2) {
        const levels = ['machine', 'region', 'partner', 'global'];
        return levels.indexOf(level1) - levels.indexOf(level2);
    }
    async getRolePermissions(roleId) {
        const role = await models_1.Role.findById(roleId);
        if (!role) {
            throw new Error('Role not found');
        }
        if (role.permissions.includes('*:*')) {
            return await this.getAllPermissions();
        }
        return await models_1.Permission.find({
            key: { $in: role.permissions }
        }).sort({ group: 1, module: 1, action: 1 });
    }
    async getUserEffectivePermissions(userId) {
        const user = await models_1.User.findById(userId).populate('roles');
        if (!user) {
            throw new Error('User not found');
        }
        const permissionKeys = await user.getPermissions();
        if (permissionKeys.includes('*:*')) {
            return await this.getAllPermissions();
        }
        return await models_1.Permission.find({
            key: { $in: permissionKeys }
        }).sort({ group: 1, module: 1, action: 1 });
    }
    async searchPermissions(searchTerm) {
        return await models_1.Permission.find({
            $or: [
                { key: { $regex: searchTerm, $options: 'i' } },
                { description: { $regex: searchTerm, $options: 'i' } },
                { module: { $regex: searchTerm, $options: 'i' } },
                { action: { $regex: searchTerm, $options: 'i' } },
                { group: { $regex: searchTerm, $options: 'i' } }
            ]
        }).sort({ group: 1, module: 1, action: 1 });
    }
    async getPermissionsByGroup(group) {
        return await models_1.Permission.find({ group }).sort({ module: 1, action: 1 });
    }
    async getPermissionStats() {
        const permissions = await this.getAllPermissions();
        const stats = {
            totalPermissions: permissions.length,
            permissionsByModule: {},
            permissionsByGroup: {}
        };
        permissions.forEach(permission => {
            if (permission.module) {
                if (!stats.permissionsByModule[permission.module]) {
                    stats.permissionsByModule[permission.module] = 0;
                }
                stats.permissionsByModule[permission.module] = (stats.permissionsByModule[permission.module] || 0) + 1;
            }
            if (permission.group) {
                if (!stats.permissionsByGroup[permission.group]) {
                    stats.permissionsByGroup[permission.group] = 0;
                }
                stats.permissionsByGroup[permission.group] = (stats.permissionsByGroup[permission.group] || 0) + 1;
            }
        });
        return stats;
    }
    async validatePermissions(permissionKeys) {
        const existingPermissions = await models_1.Permission.find({
            key: { $in: permissionKeys }
        }).select('key');
        const validKeys = existingPermissions.map(p => p.key);
        const invalidKeys = permissionKeys.filter(key => !validKeys.includes(key));
        return {
            valid: validKeys,
            invalid: invalidKeys
        };
    }
    async getPermissionDetails(permissionKey) {
        return await models_1.Permission.findOne({ key: permissionKey });
    }
    async createPermission(permissionData) {
        const existingPermission = await models_1.Permission.findOne({ key: permissionData.key });
        if (existingPermission) {
            throw new Error('Permission already exists');
        }
        return await models_1.Permission.create(permissionData);
    }
    async updatePermission(id, updateData) {
        const permission = await models_1.Permission.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
        if (!permission) {
            throw new Error('Permission not found');
        }
        return permission;
    }
    async deletePermission(id) {
        const permission = await models_1.Permission.findById(id);
        if (!permission) {
            throw new Error('Permission not found');
        }
        const roleCount = await models_1.Role.countDocuments({
            permissions: { $in: [permission.key] }
        });
        if (roleCount > 0) {
            throw new Error('Permission is currently used in roles and cannot be deleted');
        }
        await models_1.Permission.findByIdAndDelete(id);
    }
}
exports.permissionService = new PermissionService();
//# sourceMappingURL=permission.service.js.map