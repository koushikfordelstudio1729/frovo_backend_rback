import { IUser } from '../models';
import { Types } from 'mongoose';
export interface AuthResponse {
    user: Partial<IUser>;
    accessToken: string;
    refreshToken: string;
}
export interface DeviceInfo {
    deviceInfo?: string | undefined;
    ipAddress?: string | undefined;
    userAgent?: string | undefined;
}
export interface LoginCredentials {
    email: string;
    password: string;
}
export interface RegisterData {
    name: string;
    email: string;
    password: string;
}
declare class AuthService {
    register(userData: RegisterData, createdBy: Types.ObjectId, deviceInfo?: DeviceInfo): Promise<AuthResponse>;
    registerCustomer(userData: RegisterData, deviceInfo?: DeviceInfo): Promise<AuthResponse>;
    login(credentials: LoginCredentials, deviceInfo?: DeviceInfo): Promise<AuthResponse>;
    refreshToken(refreshToken: string, deviceInfo?: DeviceInfo): Promise<{
        accessToken: string;
        refreshToken: string;
    }>;
    logout(userId: string, refreshToken?: string): Promise<void>;
    logoutFromAllDevices(userId: string): Promise<void>;
    getCurrentUser(userId: string): Promise<Partial<IUser> | null>;
    updateLastLogin(userId: string): Promise<void>;
    changePassword(userId: string, currentPassword: string, newPassword: string): Promise<void>;
    resetPassword(userId: string, newPassword: string): Promise<void>;
    enableMFA(_userId: string): Promise<{
        secret: string;
        qrCode: string;
    }>;
    verifyMFA(_userId: string, _token: string): Promise<boolean>;
    disableMFA(userId: string): Promise<void>;
}
export declare const authService: AuthService;
export {};
//# sourceMappingURL=auth.service.d.ts.map