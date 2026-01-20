import mongoose, { Document, Types } from "mongoose";
import { DepartmentName } from "./enums";
export interface IDepartment extends Document {
    _id: Types.ObjectId;
    name: string;
    systemName?: DepartmentName;
    description?: string;
    roles: Types.ObjectId[];
    members: Types.ObjectId[];
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Department: mongoose.Model<IDepartment, {}, {}, {}, mongoose.Document<unknown, {}, IDepartment, {}, {}> & IDepartment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Department.model.d.ts.map