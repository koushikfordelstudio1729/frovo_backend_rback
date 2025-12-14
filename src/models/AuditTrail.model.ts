import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IAuditTrail extends Document {
  user: Types.ObjectId;
  user_email: string;
  user_role: string;
  action: string;
  action_description: string;
  target_type?: 'vendor' | 'company'; // Added to distinguish between vendor and company audits
  target_vendor?: Types.ObjectId;
  target_vendor_name?: string;
  target_vendor_id?: string;
  target_company?: Types.ObjectId;
  target_company_name?: string;
  target_company_cin?: string;
  before_state?: any;
  after_state?: any;
  changed_fields: string[];
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  createdAt: Date;
  updatedAt: Date;
}

const auditTrailSchema = new Schema<IAuditTrail>({
  user: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  user_email: { 
    type: String, 
    required: true,
    trim: true,
    lowercase: true
  },
  user_role: { 
    type: String, 
    required: true,
    enum: ['super_admin', 'vendor_admin', 'ops_manager', 'finance_manager', 'user']
  },
  action: { 
    type: String, 
    required: true,
    enum: ['create', 'update', 'delete', 'verify', 'reject', 'status_change', 'quick_status_change', 'document_upload', 'document_delete', 'view', 'login', 'logout']
  },
  action_description: { 
    type: String, 
    required: true,
    trim: true
  },
  target_type: {
    type: String,
    enum: ['vendor', 'company'],
    required: false
  },
  // Vendor-related fields
  target_vendor: { 
    type: Schema.Types.ObjectId, 
    ref: 'VendorCreate',
    required: false
  },
  target_vendor_name: {
    type: String,
    trim: true
  },
  target_vendor_id: {
    type: String,
    trim: true
  },
  // Company-related fields
  target_company: {
    type: Schema.Types.ObjectId,
    ref: 'CompanyCreate',
    required: false
  },
  target_company_name: {
    type: String,
    trim: true
  },
  target_company_cin: {
    type: String,
    trim: true
  },
  before_state: Schema.Types.Mixed,
  after_state: Schema.Types.Mixed,
  changed_fields: [{
    type: String,
    trim: true
  }],
  ip_address: {
    type: String,
    trim: true
  },
  user_agent: {
    type: String,
    trim: true
  },
  timestamp: { 
    type: Date, 
    default: Date.now,
    index: true
  }
}, {
  timestamps: true,
  collection: 'audittrails'
});

// Compound indexes for better performance
auditTrailSchema.index({ user: 1, timestamp: -1 });
auditTrailSchema.index({ target_vendor: 1, timestamp: -1 });
auditTrailSchema.index({ target_company: 1, timestamp: -1 });
auditTrailSchema.index({ action: 1, timestamp: -1 });
auditTrailSchema.index({ user_role: 1, timestamp: -1 });
auditTrailSchema.index({ target_type: 1, timestamp: -1 });
auditTrailSchema.index({ timestamp: -1 });

// Text index for search
auditTrailSchema.index({
  user_email: 'text',
  action_description: 'text',
  target_vendor_name: 'text',
  target_vendor_id: 'text',
  target_company_name: 'text',
  target_company_cin: 'text'
});

export const AuditTrail = mongoose.model<IAuditTrail>('AuditTrail', auditTrailSchema);