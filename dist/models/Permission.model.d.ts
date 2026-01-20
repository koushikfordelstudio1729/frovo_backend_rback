import mongoose, { Document, Types } from "mongoose";
import { PermissionModule, PermissionAction } from "./enums";
export interface IPermission extends Document {
    _id: Types.ObjectId;
    key: string;
    module: PermissionModule;
    action: PermissionAction;
    description: string;
    group: string;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Permission: mongoose.Model<IPermission, {}, {}, {}, mongoose.Document<unknown, {}, IPermission, {}, {}> & IPermission & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Permission.model.d.ts.map