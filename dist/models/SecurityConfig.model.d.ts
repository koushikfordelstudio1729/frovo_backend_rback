import mongoose, { Document, Types } from "mongoose";
export interface ISSOConfig {
    clientId: string;
    clientSecret: string;
    metadataUrl: string;
}
export interface IPasswordPolicy {
    minLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    expiryDays?: number;
}
export interface ISecurityConfig extends Document {
    _id: Types.ObjectId;
    organizationId: Types.ObjectId;
    mfaEnforced: boolean;
    ipAllowlist: string[];
    ssoEnabled: boolean;
    ssoConfig?: ISSOConfig | undefined;
    passwordPolicy: IPasswordPolicy;
    sessionTimeout: number;
    maxLoginAttempts: number;
    lockoutDuration: number;
    updatedBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const SecurityConfig: mongoose.Model<ISecurityConfig, {}, {}, {}, mongoose.Document<unknown, {}, ISecurityConfig, {}, {}> & ISecurityConfig & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=SecurityConfig.model.d.ts.map