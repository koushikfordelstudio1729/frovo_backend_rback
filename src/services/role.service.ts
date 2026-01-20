import { Role, IRole, RoleType, RoleStatus, User, Permission } from "../models";
import { Types } from "mongoose";

export interface CreateRoleData {
  name: string;
  description?: string;
  type?: RoleType;
  department?: string;
  permissions: string[];
  scope: {
    level: string;
    entities?: string[];
  };
  uiAccess: string;
}

export interface UpdateRoleData {
  name?: string;
  description?: string;
  permissions?: string[];
  scope?: {
    level: string;
    entities?: string[];
  };
  uiAccess?: string;
}

export interface RoleQuery {
  page: number;
  limit: number;
  search?: string;
  scope?: string;
  type?: RoleType;
  status?: RoleStatus;
  department?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface PaginatedRoles {
  roles: IRole[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

class RoleService {
  async createRole(roleData: CreateRoleData, createdBy: Types.ObjectId): Promise<IRole> {
    // Validate permissions exist
    if (roleData.permissions && roleData.permissions.length > 0) {
      const permissionCount = await Permission.countDocuments({
        key: { $in: roleData.permissions },
      });
      if (permissionCount !== roleData.permissions.length) {
        throw new Error("One or more permissions not found");
      }
    }

    // Force type to CUSTOM for API-created roles (SYSTEM roles should only be created via seeders)
    const role = await Role.create({
      ...roleData,
      type: RoleType.CUSTOM,
      createdBy,
      status: RoleStatus.DRAFT,
    });

    return await this.getRoleById(role._id.toString());
  }

  async getRoleById(id: string): Promise<IRole> {
    const role = await Role.findById(id)
      .populate("department", "name systemName")
      .populate("createdBy", "name email");

    if (!role) {
      throw new Error("Role not found");
    }

    return role;
  }

  async updateRole(id: string, updateData: UpdateRoleData): Promise<IRole> {
    const role = await Role.findById(id);
    if (!role) {
      throw new Error("Role not found");
    }

    // Validate permissions if provided
    if (updateData.permissions && updateData.permissions.length > 0) {
      const permissionCount = await Permission.countDocuments({
        key: { $in: updateData.permissions },
      });
      if (permissionCount !== updateData.permissions.length) {
        throw new Error("One or more permissions not found");
      }
    }

    const updatedRole = await Role.findByIdAndUpdate(id, updateData, {
      new: true,
      runValidators: true,
    })
      .populate("department", "name systemName")
      .populate("createdBy", "name email");

    return updatedRole!;
  }

  async publishRole(id: string): Promise<IRole> {
    const role = await Role.findById(id);
    if (!role) {
      throw new Error("Role not found");
    }

    if (role.status !== RoleStatus.DRAFT) {
      throw new Error("Only draft roles can be published");
    }

    const updatedRole = await Role.findByIdAndUpdate(
      id,
      { status: RoleStatus.PUBLISHED },
      { new: true }
    )
      .populate("department", "name systemName")
      .populate("createdBy", "name email");

    return updatedRole!;
  }

  async deleteRole(id: string): Promise<void> {
    const role = await Role.findById(id);
    if (!role) {
      throw new Error("Role not found");
    }

    // Check if role is assigned to any users
    const userCount = await User.countDocuments({ roles: { $in: [id] } });
    if (userCount > 0) {
      throw new Error("Role is currently assigned to users and cannot be deleted");
    }

    await Role.findByIdAndDelete(id);
  }

  async getRoles(query: RoleQuery): Promise<PaginatedRoles> {
    const { page, limit, search, scope, type, status, department, sortBy, sortOrder } = query;

    // Build filter
    const filter: any = {};

    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: "i" } },
        { description: { $regex: search, $options: "i" } },
        { key: { $regex: search, $options: "i" } },
      ];
    }

    if (type) {
      filter.type = type;
    }

    if (status) {
      filter.status = status;
    }

    if (scope) {
      filter["scope.level"] = scope;
    }

    if (department) {
      filter.department = department;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute queries
    const [roles, total] = await Promise.all([
      Role.find(filter)
        .populate("department", "name systemName")
        .populate("createdBy", "name email")
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Role.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      roles,
      total,
      page,
      limit,
      pages,
    };
  }

  async assignRoleToUsers(roleId: string, userIds: string[]): Promise<{ assignedCount: number }> {
    const role = await Role.findById(roleId);
    if (!role) {
      throw new Error("Role not found");
    }

    if (role.status !== RoleStatus.PUBLISHED) {
      throw new Error("Only published roles can be assigned");
    }

    // Validate users exist
    const userCount = await User.countDocuments({
      _id: { $in: userIds },
    });
    if (userCount !== userIds.length) {
      throw new Error("One or more users not found");
    }

    // Assign role to users
    const result = await User.updateMany(
      { _id: { $in: userIds } },
      { $addToSet: { roles: roleId } }
    );

    return { assignedCount: result.modifiedCount };
  }

  async cloneRole(
    id: string,
    newName: string,
    description?: string,
    createdBy?: Types.ObjectId
  ): Promise<IRole> {
    const originalRole = await Role.findById(id);
    if (!originalRole) {
      throw new Error("Role not found");
    }

    // Check if role with new name exists
    const existingRole = await Role.findOne({ name: newName });
    if (existingRole) {
      throw new Error("Role with this name already exists");
    }

    const clonedRole = await Role.create({
      name: newName,
      description: description || `Copy of ${originalRole.name}`,
      type: RoleType.CUSTOM,
      department: originalRole.department,
      permissions: [...originalRole.permissions],
      scope: originalRole.scope,
      uiAccess: originalRole.uiAccess,
      status: RoleStatus.DRAFT,
      createdBy: createdBy || originalRole.createdBy,
    });

    return await this.getRoleById(clonedRole._id.toString());
  }

  async getRolePermissions(id: string): Promise<string[]> {
    const role = await Role.findById(id);
    if (!role) {
      throw new Error("Role not found");
    }

    return role.permissions;
  }

  async updateRolePermissions(id: string, permissions: string[]): Promise<IRole> {
    const role = await Role.findById(id);
    if (!role) {
      throw new Error("Role not found");
    }

    // Validate permissions exist
    const permissionCount = await Permission.countDocuments({
      key: { $in: permissions },
    });
    if (permissionCount !== permissions.length) {
      throw new Error("One or more permissions not found");
    }

    const updatedRole = await Role.findByIdAndUpdate(id, { permissions }, { new: true })
      .populate("department", "name systemName")
      .populate("createdBy", "name email");

    return updatedRole!;
  }

  async getRoleUsers(id: string): Promise<any[]> {
    const users = await User.find({ roles: { $in: [id] } })
      .select("name email status lastLogin")
      .populate("departments", "name");

    return users;
  }
}

export const roleService = new RoleService();
