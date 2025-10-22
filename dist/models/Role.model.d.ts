import mongoose, { Document, Types } from 'mongoose';
import { RoleType, RoleStatus, ScopeLevel, SystemRole, UIAccess } from './enums';
export interface IScope {
    level: ScopeLevel;
    entities?: Types.ObjectId[];
}
export interface IRole extends Document {
    _id: Types.ObjectId;
    name: string;
    key: string;
    systemRole?: SystemRole;
    description?: string;
    type: RoleType;
    department?: Types.ObjectId;
    permissions: string[];
    scope: IScope;
    uiAccess: UIAccess;
    status: RoleStatus;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Role: mongoose.Model<IRole, {}, {}, {}, mongoose.Document<unknown, {}, IRole, {}, {}> & IRole & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Role.model.d.ts.map