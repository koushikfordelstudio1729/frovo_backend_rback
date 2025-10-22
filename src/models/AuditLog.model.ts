import mongoose, { Document, Schema, Types } from 'mongoose';

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

const auditTargetSchema = new Schema<IAuditTarget>({
  type: {
    type: String,
    required: [true, 'Target type is required'],
    trim: true
  },
  id: {
    type: Schema.Types.ObjectId,
    required: [true, 'Target ID is required']
  },
  name: {
    type: String,
    trim: true
  }
}, { _id: false });

const auditChangesSchema = new Schema<IAuditChanges>({
  before: {
    type: Schema.Types.Mixed
  },
  after: {
    type: Schema.Types.Mixed
  }
}, { _id: false });

const auditLogSchema = new Schema<IAuditLog>(
  {
    timestamp: {
      type: Date,
      default: Date.now,
      required: true
    },
    actor: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Actor is required']
    },
    action: {
      type: String,
      required: [true, 'Action is required'],
      trim: true,
      maxlength: [100, 'Action cannot exceed 100 characters']
    },
    module: {
      type: String,
      required: [true, 'Module is required'],
      trim: true,
      maxlength: [50, 'Module cannot exceed 50 characters']
    },
    target: {
      type: auditTargetSchema,
      required: [true, 'Target is required']
    },
    changes: {
      type: auditChangesSchema
    },
    ipAddress: {
      type: String,
      trim: true,
      match: [/^(?:[0-9]{1,3}\.){3}[0-9]{1,3}$|^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/, 'Invalid IP address format']
    },
    userAgent: {
      type: String,
      trim: true,
      maxlength: [500, 'User agent cannot exceed 500 characters']
    },
    metadata: {
      type: Map,
      of: Schema.Types.Mixed
    }
  },
  {
    timestamps: false, // We use timestamp field instead
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Indexes for performance
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ actor: 1, timestamp: -1 });
auditLogSchema.index({ module: 1, timestamp: -1 });
auditLogSchema.index({ 'target.type': 1, 'target.id': 1 });
auditLogSchema.index({ action: 1, timestamp: -1 });

// Compound indexes for common queries
auditLogSchema.index({ module: 1, action: 1, timestamp: -1 });
auditLogSchema.index({ actor: 1, module: 1, timestamp: -1 });

// Virtual for id
auditLogSchema.virtual('id').get(function() {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
auditLogSchema.set('toJSON', {
  virtuals: true,
  transform: function(_doc, ret) {
    const { _id, __v, ...cleanRet } = ret;
    return cleanRet;
  }
});

export const AuditLog = mongoose.model<IAuditLog>('AuditLog', auditLogSchema);