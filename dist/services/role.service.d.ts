import { IRole, RoleType, RoleStatus } from "../models";
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
declare class RoleService {
    createRole(roleData: CreateRoleData, createdBy: Types.ObjectId): Promise<IRole>;
    getRoleById(id: string): Promise<IRole>;
    updateRole(id: string, updateData: UpdateRoleData): Promise<IRole>;
    publishRole(id: string): Promise<IRole>;
    deleteRole(id: string): Promise<void>;
    getRoles(query: RoleQuery): Promise<PaginatedRoles>;
    assignRoleToUsers(roleId: string, userIds: string[]): Promise<{
        assignedCount: number;
    }>;
    cloneRole(id: string, newName: string, description?: string, createdBy?: Types.ObjectId): Promise<IRole>;
    getRolePermissions(id: string): Promise<string[]>;
    updateRolePermissions(id: string, permissions: string[]): Promise<IRole>;
    getRoleUsers(id: string): Promise<any[]>;
}
export declare const roleService: RoleService;
export {};
//# sourceMappingURL=role.service.d.ts.map