import mongoose, { Document, Types } from 'mongoose';
import { UserStatus } from './enums';
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
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidatePassword: string): Promise<boolean>;
    getPermissions(): Promise<string[]>;
}
export declare const User: mongoose.Model<IUser, {}, {}, {}, mongoose.Document<unknown, {}, IUser, {}, {}> & IUser & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=User.model.d.ts.map