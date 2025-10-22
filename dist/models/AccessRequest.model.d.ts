import mongoose, { Document, Types } from 'mongoose';
import { AccessRequestStatus } from './enums';
export interface IAccessRequest extends Document {
    _id: Types.ObjectId;
    requester: Types.ObjectId;
    requestedRole?: Types.ObjectId;
    requestedPermissions?: string[];
    reason: string;
    duration?: number;
    approver?: Types.ObjectId;
    status: AccessRequestStatus;
    approvedAt?: Date;
    rejectedAt?: Date;
    expiresAt?: Date;
    createdAt: Date;
    updatedAt: Date;
}
export declare const AccessRequest: mongoose.Model<IAccessRequest, {}, {}, {}, mongoose.Document<unknown, {}, IAccessRequest, {}, {}> & IAccessRequest & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=AccessRequest.model.d.ts.map