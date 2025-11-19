// models/Vendor.model.ts
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVendorDetails extends Document {
  vendor_name: string;
  vendor_billing_name: string;
  vendor_type: 'supplier' | 'distributor' | 'manufacturer';
  vendor_category: string;
  vendor_contact_name: string;
  vendor_email: string;
  vendor_phone: string;
  vendor_address: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vendorDetailsSchema = new Schema<IVendorDetails>({
  vendor_name: { 
    type: String, 
    required: true,
    trim: true 
  },
  vendor_billing_name: { 
    type: String, 
    required: true,
    trim: true 
  },
  vendor_type: {
    type: String,
    enum: ['supplier', 'distributor', 'manufacturer'],
    required: true
  },
  vendor_category: { 
    type: String, 
    required: true,
    trim: true 
  },
  vendor_contact_name: { 
    type: String, 
    required: true,
    trim: true 
  },
  vendor_email: { 
    type: String, 
    required: true,
    lowercase: true,
    trim: true 
  },
  vendor_phone: { 
    type: String, 
    required: true,
    trim: true 
  },
  vendor_address: { 
    type: String, 
    required: true,
    trim: true 
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { 
  timestamps: true,
  collection: 'vendordetails' // Add explicit collection name
});

// Indexes for better performance
vendorDetailsSchema.index({ vendor_email: 1 });
vendorDetailsSchema.index({ vendor_type: 1 });
vendorDetailsSchema.index({ createdBy: 1 });

export const VendorDetails = mongoose.model<IVendorDetails>('VendorDetails', vendorDetailsSchema);

export interface IVendorFinancials extends Document {
  vendor: Types.ObjectId;
  bank_account_number: string;
  ifsc_code: string;
  payment_terms: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vendorFinancialsSchema = new Schema<IVendorFinancials>({
  vendor: {
    type: Schema.Types.ObjectId,
    ref: 'VendorDetails',
    required: true
  },
  bank_account_number: { 
    type: String, 
    required: true,
    trim: true 
  },
  ifsc_code: { 
    type: String, 
    required: true,
    uppercase: true,
    trim: true 
  },
  payment_terms: { 
    type: String, 
    required: true,
    default: 'Net 30',
    trim: true 
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { 
  timestamps: true,
  collection: 'vendorfinancials' // Add explicit collection name
});

vendorFinancialsSchema.index({ vendor: 1 });

export const VendorFinancials = mongoose.model<IVendorFinancials>('VendorFinancials', vendorFinancialsSchema);

export interface IVendorCompliance extends Document {
  vendor: Types.ObjectId;
  gst_details: string;
  pan_details: string;
  tds_rate: number;
  billing_cycle: 'monthly' | 'weekly' | 'per_order';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vendorComplianceSchema = new Schema<IVendorCompliance>({
  vendor: {
    type: Schema.Types.ObjectId,
    ref: 'VendorDetails',
    required: true
  },
  gst_details: { 
    type: String, 
    required: true,
    uppercase: true,
    trim: true 
  },
  pan_details: { 
    type: String, 
    required: true,
    uppercase: true,
    trim: true 
  },
  tds_rate: { 
    type: Number, 
    required: true,
    min: 0,
    max: 100,
    default: 10 
  },
  billing_cycle: { 
    type: String, 
    enum: ['monthly', 'weekly', 'per_order'], 
    required: true,
    default: 'monthly'
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { 
  timestamps: true,
  collection: 'vendorcompliances' // Add explicit collection name
});

vendorComplianceSchema.index({ vendor: 1 });
vendorComplianceSchema.index({ billing_cycle: 1 });

export const VendorCompliance = mongoose.model<IVendorCompliance>('VendorCompliance', vendorComplianceSchema);

export interface IVendorStatus extends Document {
  vendor: Types.ObjectId;
  risk_level: 'low' | 'medium' | 'high';
  risk_notes: string;
  verified_by?: Types.ObjectId;
  verification_status: 'pending' | 'verified' | 'rejected';
  vendor_status_cycle: 'Procurement' | 'Restocking' | 'Finance Reconciliation' | 'Audit';
  verification_date?: Date;
  rejection_reason?: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vendorStatusSchema = new Schema<IVendorStatus>({
  vendor: { 
    type: Schema.Types.ObjectId, 
    ref: 'VendorDetails', 
    required: true 
  },
  risk_level: { 
    type: String, 
    enum: ['low', 'medium', 'high'], 
    required: true,
    default: 'medium'
  },
  risk_notes: { 
    type: String, 
    required: true,
    trim: true 
  },
  verified_by: { 
    type: Schema.Types.ObjectId, 
    ref: 'User'
  },
  verification_status: { 
    type: String, 
    enum: ['pending', 'verified', 'rejected'], 
    required: true,
    default: 'pending'
  },
  vendor_status_cycle: { 
    type: String, 
    enum: ['Procurement', 'Restocking', 'Finance Reconciliation', 'Audit'], 
    required: true,
    default: 'Procurement'
  },
  verification_date: { 
    type: Date 
  },
  rejection_reason: { 
    type: String,
    trim: true 
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { 
  timestamps: true,
  collection: 'vendorstatuses' // Add explicit collection name
});

// Pre-save middleware to enforce verification rules
vendorStatusSchema.pre('save', function(next) {
  // If verification_status is being modified to 'verified' or 'rejected'
  if (this.isModified('verification_status') && 
      (this.verification_status === 'verified' || this.verification_status === 'rejected')) {
    
    // Check if verified_by is set (should be set by Super Admin)
    if (!this.verified_by) {
      const error = new Error('Only Super Admin can verify or reject vendors');
      return next(error);
    }
    
    // Set verification date when status changes to verified or rejected
    this.verification_date = new Date();
  }
  
  // If trying to set verification_status to pending but verified_by is set
  if (this.isModified('verification_status') && this.verification_status === 'pending' && this.verified_by) {
    const error = new Error('Cannot set status to pending once verified/rejected');
    return next(error);
  }
  
  next();
});

// Indexes for better query performance
vendorStatusSchema.index({ vendor: 1 });
vendorStatusSchema.index({ verification_status: 1 });
vendorStatusSchema.index({ risk_level: 1 });
vendorStatusSchema.index({ vendor_status_cycle: 1 });

export const VendorStatus = mongoose.model<IVendorStatus>('VendorStatus', vendorStatusSchema);

export interface IVendorDocument extends Document {
  vendor: Types.ObjectId;
  document_type: 'Signed Contract' | 'GST' | 'MSME' | 'TDS Exemption';
  expiry_date: Date;
  document_upload: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vendorDocumentSchema = new Schema<IVendorDocument>({
  vendor: {
    type: Schema.Types.ObjectId,
    ref: 'VendorDetails',
    required: true
  },
  document_type: { 
    type: String, 
    enum: ['Signed Contract', 'GST', 'MSME', 'TDS Exemption'], 
    required: true 
  },
  expiry_date: { 
    type: Date, 
    required: true 
  },
  document_upload: { 
    type: String, 
    required: true,
    trim: true 
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { 
  timestamps: true,
  collection: 'vendordocuments' // Add explicit collection name
});

vendorDocumentSchema.index({ vendor: 1 });
vendorDocumentSchema.index({ document_type: 1 });
vendorDocumentSchema.index({ expiry_date: 1 });

export const VendorDocument = mongoose.model<IVendorDocument>('VendorDocument', vendorDocumentSchema);

export interface IVendorContract extends Document {
  vendor: Types.ObjectId;
  contract_terms: string;
  renewal_date: Date;
  expiry_date: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vendorContractSchema = new Schema<IVendorContract>({
  vendor: {
    type: Schema.Types.ObjectId,
    ref: 'VendorDetails',
    required: true
  },
  contract_terms: { 
    type: String, 
    required: true,
    trim: true 
  },
  renewal_date: { 
    type: Date, 
    required: true 
  },
  expiry_date: { 
    type: Date, 
    required: true 
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { 
  timestamps: true,
  collection: 'vendorcontracts' // Add explicit collection name
});

vendorContractSchema.index({ vendor: 1 });
vendorContractSchema.index({ expiry_date: 1 });
vendorContractSchema.index({ renewal_date: 1 });

export const VendorContract = mongoose.model<IVendorContract>('VendorContract', vendorContractSchema);

export interface IVendorSystemInfo extends Document {
  vendor: Types.ObjectId;
  payment_method: 'Bank Transfer' | 'Credit Card' | 'Cheque';
  internal_notes: string;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vendorSystemInfoSchema = new Schema<IVendorSystemInfo>({
  vendor: {
    type: Schema.Types.ObjectId,
    ref: 'VendorDetails',
    required: true
  },
  payment_method: { 
    type: String, 
    enum: ['Bank Transfer', 'Credit Card', 'Cheque'], 
    required: true,
    default: 'Bank Transfer'
  },
  internal_notes: { 
    type: String, 
    required: true,
    trim: true 
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { 
  timestamps: true,
  collection: 'vendorsysteminfo' // Add explicit collection name
});

vendorSystemInfoSchema.index({ vendor: 1 });
vendorSystemInfoSchema.index({ payment_method: 1 });

export const VendorSystemInfo = mongoose.model<IVendorSystemInfo>('VendorSystemInfo', vendorSystemInfoSchema);

export interface IVendorDashboard extends Document {
  total_vendors: number;
  pending_approvals: number;
  active_vendors: number;
  rejected_vendors: number;
  vendors: {
    vendor_name: string;
    vendor_category: string;
    status: 'active' | 'inactive' | 'pending';
    risk_level: 'low' | 'medium' | 'high';
    contract_expiry_date: Date;
    action: 'edit' | 'delete';
  }[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vendorDashboardSchema = new Schema<IVendorDashboard>({
  total_vendors: { 
    type: Number, 
    required: true, 
    default: 0,
    min: 0 
  },
  pending_approvals: { 
    type: Number, 
    required: true, 
    default: 0,
    min: 0 
  },
  active_vendors: { 
    type: Number, 
    required: true, 
    default: 0,
    min: 0 
  },
  rejected_vendors: { 
    type: Number, 
    required: true, 
    default: 0,
    min: 0 
  },
  vendors: [{
    vendor_name: { 
      type: String, 
      required: true,
      trim: true 
    },
    vendor_category: { 
      type: String, 
      required: true,
      trim: true 
    },
    status: { 
      type: String, 
      enum: ['active', 'inactive', 'pending'], 
      required: true,
      default: 'pending'
    },
    risk_level: { 
      type: String, 
      enum: ['low', 'medium', 'high'], 
      required: true,
      default: 'medium'
    },
    contract_expiry_date: { 
      type: Date, 
      required: true 
    },
    action: { 
      type: String, 
      enum: ['edit', 'delete'], 
      required: true,
      default: 'edit'
    }
  }],
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { 
  timestamps: true,
  collection: 'vendordashboards' // Add explicit collection name
});

vendorDashboardSchema.index({ createdBy: 1 });

export const VendorDashboard = mongoose.model<IVendorDashboard>('VendorDashboard', vendorDashboardSchema);

// Export all models and interfaces