import { IUser, UserStatus } from '../models';
import { Types } from 'mongoose';
export interface CreateUserData {
    name: string;
    email: string;
    phone?: string;
    password: string;
    departments?: string[];
    roles?: string[];
}
export interface UpdateUserData {
    name?: string;
    phone?: string;
    departments?: string[];
    roles?: string[];
}
export interface UserQuery {
    page: number;
    limit: number;
    search?: string;
    role?: string;
    department?: string;
    status?: UserStatus;
    sortBy: string;
    sortOrder: 'asc' | 'desc';
}
export interface PaginatedUsers {
    users: IUser[];
    total: number;
    page: number;
    limit: number;
    pages: number;
}
declare class UserService {
    createUser(userData: CreateUserData, createdBy: Types.ObjectId): Promise<IUser>;
    getUserById(id: string): Promise<IUser>;
    updateUser(id: string, updateData: UpdateUserData): Promise<IUser>;
    updateUserStatus(id: string, status: UserStatus): Promise<IUser>;
    deleteUser(id: string): Promise<void>;
    getUsers(query: UserQuery): Promise<PaginatedUsers>;
    assignRoles(userId: string, roleIds: string[]): Promise<IUser>;
    removeRole(userId: string, roleId: string): Promise<IUser>;
    getUserPermissions(userId: string): Promise<string[]>;
    updatePassword(userId: string, newPassword: string): Promise<void>;
    searchUsers(searchTerm: string, limit?: number): Promise<IUser[]>;
}
export declare const userService: UserService;
export {};
//# sourceMappingURL=user.service.d.ts.map