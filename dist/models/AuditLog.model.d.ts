import mongoose, { Document, Types } from "mongoose";
export interface IAuditTarget {
    type: string;
    id: Types.ObjectId;
    name?: string;
}
export interface IAuditChanges {
    before?: any;
    after?: any;
}
export interface IAuditLog extends Document {
    _id: Types.ObjectId;
    timestamp: Date;
    actor: Types.ObjectId;
    action: string;
    module: string;
    target: IAuditTarget;
    changes?: IAuditChanges;
    ipAddress?: string;
    userAgent?: string;
    metadata?: Record<string, any>;
}
export declare const AuditLog: mongoose.Model<IAuditLog, {}, {}, {}, mongoose.Document<unknown, {}, IAuditLog, {}, {}> & IAuditLog & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=AuditLog.model.d.ts.map