// models/AuditTrail.model.ts
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAuditTrail extends Document {
  user: Types.ObjectId;
  user_email: string;
  user_role: string;
  action: string;
  action_description: string;
  target_vendor?: Types.ObjectId;
  target_vendor_name?: string;
  target_vendor_id?: string;
  before_state?: any;
  after_state?: any;
  changed_fields: string[];
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
}

const auditTrailSchema = new Schema<IAuditTrail>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  user_email: { 
    type: String, 
    required: true 
  },
  user_role: { 
    type: String, 
    required: true 
  },
  action: { 
    type: String, 
    required: true 
  },
  action_description: { 
    type: String, 
    required: true 
  },
  target_vendor: { 
    type: Schema.Types.ObjectId, 
    ref: 'VendorCreate' 
  },
  target_vendor_name: String,
  target_vendor_id: String,
  before_state: Schema.Types.Mixed,
  after_state: Schema.Types.Mixed,
  changed_fields: [{ type: String }],
  ip_address: String,
  user_agent: String,
  timestamp: { 
    type: Date, 
    default: Date.now 
  }
}, {
  timestamps: true,
  collection: 'audittrails'
});

// Indexes for better performance
auditTrailSchema.index({ user: 1 });
auditTrailSchema.index({ target_vendor: 1 });
auditTrailSchema.index({ action: 1 });
auditTrailSchema.index({ timestamp: -1 });
auditTrailSchema.index({ user_role: 1 });

export const AuditTrail = mongoose.model<IAuditTrail>('AuditTrail', auditTrailSchema);