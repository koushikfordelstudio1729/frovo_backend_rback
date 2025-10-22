import { IPermission } from '../models';
export interface GroupedPermissions {
    [group: string]: IPermission[];
}
export interface UserPermissionCheck {
    hasPermission: boolean;
    scope?: any;
    roles?: string[];
}
declare class PermissionService {
    getAllPermissions(): Promise<IPermission[]>;
    getPermissionsGrouped(): Promise<GroupedPermissions>;
    getPermissionsByModule(module: string): Promise<IPermission[]>;
    checkUserPermission(userId: string, permissionKey: string): Promise<UserPermissionCheck>;
    private compareScopeLevel;
    getRolePermissions(roleId: string): Promise<IPermission[]>;
    getUserEffectivePermissions(userId: string): Promise<IPermission[]>;
    searchPermissions(searchTerm: string): Promise<IPermission[]>;
    getPermissionsByGroup(group: string): Promise<IPermission[]>;
    getPermissionStats(): Promise<{
        totalPermissions: number;
        permissionsByModule: {
            [module: string]: number;
        };
        permissionsByGroup: {
            [group: string]: number;
        };
    }>;
    validatePermissions(permissionKeys: string[]): Promise<{
        valid: string[];
        invalid: string[];
    }>;
    getPermissionDetails(permissionKey: string): Promise<IPermission | null>;
    createPermission(permissionData: Partial<IPermission>): Promise<IPermission>;
    updatePermission(id: string, updateData: Partial<IPermission>): Promise<IPermission>;
    deletePermission(id: string): Promise<void>;
}
export declare const permissionService: PermissionService;
export {};
//# sourceMappingURL=permission.service.d.ts.map