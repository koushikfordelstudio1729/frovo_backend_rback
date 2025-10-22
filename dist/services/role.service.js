"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleService = void 0;
const models_1 = require("../models");
class RoleService {
    async createRole(roleData, createdBy) {
        if (roleData.permissions && roleData.permissions.length > 0) {
            const permissionCount = await models_1.Permission.countDocuments({
                key: { $in: roleData.permissions }
            });
            if (permissionCount !== roleData.permissions.length) {
                throw new Error('One or more permissions not found');
            }
        }
        const role = await models_1.Role.create({
            ...roleData,
            createdBy,
            status: models_1.RoleStatus.DRAFT
        });
        return await this.getRoleById(role._id.toString());
    }
    async getRoleById(id) {
        const role = await models_1.Role.findById(id)
            .populate('department', 'name systemName')
            .populate('createdBy', 'name email');
        if (!role) {
            throw new Error('Role not found');
        }
        return role;
    }
    async updateRole(id, updateData) {
        const role = await models_1.Role.findById(id);
        if (!role) {
            throw new Error('Role not found');
        }
        if (role.type === models_1.RoleType.SYSTEM) {
            throw new Error('System roles cannot be modified');
        }
        if (updateData.permissions && updateData.permissions.length > 0) {
            const permissionCount = await models_1.Permission.countDocuments({
                key: { $in: updateData.permissions }
            });
            if (permissionCount !== updateData.permissions.length) {
                throw new Error('One or more permissions not found');
            }
        }
        const updatedRole = await models_1.Role.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
            .populate('department', 'name systemName')
            .populate('createdBy', 'name email');
        return updatedRole;
    }
    async publishRole(id) {
        const role = await models_1.Role.findById(id);
        if (!role) {
            throw new Error('Role not found');
        }
        if (role.status !== models_1.RoleStatus.DRAFT) {
            throw new Error('Only draft roles can be published');
        }
        const updatedRole = await models_1.Role.findByIdAndUpdate(id, { status: models_1.RoleStatus.PUBLISHED }, { new: true })
            .populate('department', 'name systemName')
            .populate('createdBy', 'name email');
        return updatedRole;
    }
    async deleteRole(id) {
        const role = await models_1.Role.findById(id);
        if (!role) {
            throw new Error('Role not found');
        }
        if (role.type === models_1.RoleType.SYSTEM) {
            throw new Error('System roles cannot be deleted');
        }
        const userCount = await models_1.User.countDocuments({ roles: { $in: [id] } });
        if (userCount > 0) {
            throw new Error('Role is currently assigned to users and cannot be deleted');
        }
        await models_1.Role.findByIdAndDelete(id);
    }
    async getRoles(query) {
        const { page, limit, search, scope, type, status, department, sortBy, sortOrder } = query;
        const filter = {};
        if (search) {
            filter.$or = [
                { name: { $regex: search, $options: 'i' } },
                { description: { $regex: search, $options: 'i' } },
                { key: { $regex: search, $options: 'i' } }
            ];
        }
        if (type) {
            filter.type = type;
        }
        if (status) {
            filter.status = status;
        }
        if (scope) {
            filter['scope.level'] = scope;
        }
        if (department) {
            filter.department = department;
        }
        const sort = {};
        sort[sortBy] = sortOrder === 'asc' ? 1 : -1;
        const skip = (page - 1) * limit;
        const [roles, total] = await Promise.all([
            models_1.Role.find(filter)
                .populate('department', 'name systemName')
                .populate('createdBy', 'name email')
                .sort(sort)
                .skip(skip)
                .limit(limit),
            models_1.Role.countDocuments(filter)
        ]);
        const pages = Math.ceil(total / limit);
        return {
            roles,
            total,
            page,
            limit,
            pages
        };
    }
    async assignRoleToUsers(roleId, userIds) {
        const role = await models_1.Role.findById(roleId);
        if (!role) {
            throw new Error('Role not found');
        }
        if (role.status !== models_1.RoleStatus.PUBLISHED) {
            throw new Error('Only published roles can be assigned');
        }
        const userCount = await models_1.User.countDocuments({
            _id: { $in: userIds }
        });
        if (userCount !== userIds.length) {
            throw new Error('One or more users not found');
        }
        const result = await models_1.User.updateMany({ _id: { $in: userIds } }, { $addToSet: { roles: roleId } });
        return { assignedCount: result.modifiedCount };
    }
    async cloneRole(id, newName, description, createdBy) {
        const originalRole = await models_1.Role.findById(id);
        if (!originalRole) {
            throw new Error('Role not found');
        }
        const existingRole = await models_1.Role.findOne({ name: newName });
        if (existingRole) {
            throw new Error('Role with this name already exists');
        }
        const clonedRole = await models_1.Role.create({
            name: newName,
            description: description || `Copy of ${originalRole.name}`,
            type: models_1.RoleType.CUSTOM,
            department: originalRole.department,
            permissions: [...originalRole.permissions],
            scope: originalRole.scope,
            uiAccess: originalRole.uiAccess,
            status: models_1.RoleStatus.DRAFT,
            createdBy: createdBy || originalRole.createdBy
        });
        return await this.getRoleById(clonedRole._id.toString());
    }
    async getRolePermissions(id) {
        const role = await models_1.Role.findById(id);
        if (!role) {
            throw new Error('Role not found');
        }
        return role.permissions;
    }
    async updateRolePermissions(id, permissions) {
        const role = await models_1.Role.findById(id);
        if (!role) {
            throw new Error('Role not found');
        }
        if (role.type === models_1.RoleType.SYSTEM) {
            throw new Error('System role permissions cannot be modified');
        }
        const permissionCount = await models_1.Permission.countDocuments({
            key: { $in: permissions }
        });
        if (permissionCount !== permissions.length) {
            throw new Error('One or more permissions not found');
        }
        const updatedRole = await models_1.Role.findByIdAndUpdate(id, { permissions }, { new: true })
            .populate('department', 'name systemName')
            .populate('createdBy', 'name email');
        return updatedRole;
    }
    async getRoleUsers(id) {
        const users = await models_1.User.find({ roles: { $in: [id] } })
            .select('name email status lastLogin')
            .populate('departments', 'name');
        return users;
    }
}
exports.roleService = new RoleService();
//# sourceMappingURL=role.service.js.map