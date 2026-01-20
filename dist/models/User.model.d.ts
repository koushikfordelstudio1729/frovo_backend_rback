import mongoose, { Document, Types } from "mongoose";
import { UserStatus } from "./enums";
export interface IRefreshToken {
    token: string;
    createdAt: Date;
    expiresAt: Date;
    deviceInfo?: string;
    ipAddress?: string;
    userAgent?: string;
}
export interface IUser extends Document {
    _id: Types.ObjectId;
    name: string;
    email: string;
    phone?: string;
    password: string;
    departments: Types.ObjectId[];
    roles: Types.ObjectId[];
    status: UserStatus;
    mfaEnabled: boolean;
    mfaSecret?: string;
    lastLogin?: Date;
    refreshTokens: IRefreshToken[];
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    getPermissions(): Promise<string[]>;
    addRefreshToken(token: string, deviceInfo?: string, ipAddress?: string, userAgent?: string): Promise<void>;
    removeRefreshToken(token: string): Promise<void>;
    clearAllRefreshTokens(): Promise<void>;
    isRefreshTokenValid(token: string): boolean;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.model.d.ts.map