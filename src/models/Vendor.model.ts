import mongoose, { Document, Schema, Types } from 'mongoose';

// Document Interface
export interface IVendorDocument {
  document_name: string;
  document_type: 'signed_contract' | 'gst_certificate' | 'msme_certificate' | 'tds_exemption' | 'pan_card' | 'bank_proof' | 'other';
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  expiry_date?: Date;
  uploaded_at: Date;
}

export interface ICompanyCreate extends Document {
  registered_company_name: string;
  company_address: string;
  office_email: string;
  legal_entity_structure: string;
  company_registration_number: string;
  date_of_incorporation: Date;
  corporate_website: string;
  directory_signature_name: string;
  din: string;
}
const companyCreateSchema = new Schema<ICompanyCreate>({
  registered_company_name: {
    type: String,
    required: true,
    trim: true
  },
  company_address: {
    type: String,
    required: true,
    trim: true
  },
  office_email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true
  },
  legal_entity_structure: {
    type: String,
    required: true,
    trim: true
  },
  company_registration_number: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  date_of_incorporation: {
    type: Date,
    required: true
  },
  corporate_website: {
    type: String,
    required: false,
    trim: true
  },
  directory_signature_name: {
    type: String,
    required: true,
    trim: true
  },
  din: {
    type: String,
    required: true,
    trim: true,
    unique: true
  }
}, {
  timestamps: true,
  collection: 'companies'
});
export const CompanyCreate = mongoose.model<ICompanyCreate>('CompanyCreate', companyCreateSchema);
export interface IVendorCreate extends Document {
  // Basic Information
  vendor_name: string;
  vendor_billing_name: string;
  vendor_type: string[];  // Multi-select: snacks, beverages, packaging, services
  vendor_category: string;
  primary_contact_name: string;
  contact_phone: string;
  vendor_email: string;
  vendor_address: string;
  vendor_id: string;
  company_registration_number: string;

  // Financial Information
  bank_account_number: string;
  ifsc_code: string;
  payment_terms: string;
  payment_methods: string;

  // Compliance Information
  gst_number: string;
  pan_number: string;
  tds_rate: number;
  billing_cycle: string;

  // Status & Risk Information
  vendor_status_cycle: string;
  verification_status: 'pending' | 'verified' | 'failed' | 'rejected';
  risk_rating: 'low' | 'medium' | 'high';
  risk_notes: string;
  verified_by?: Types.ObjectId;

  // Contract Information
  contract_terms: string;
  contract_expiry_date: Date;
  contract_renewal_date: Date;

  // Documents
  documents: IVendorDocument[];

  // System Information
  internal_notes: string;

  // Audit Fields
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// Document Sub-Schema
const vendorDocumentSchema = new Schema<IVendorDocument>({
  document_name: {
    type: String,
    required: true,
    trim: true
  },
  document_type: {
    type: String,
    enum: ['signed_contract', 'gst_certificate', 'msme_certificate', 'tds_exemption', 'pan_card', 'bank_proof', 'other'],
    required: true
  },
  file_url: {
    type: String,
    required: true
  },
  cloudinary_public_id: {
    type: String,
    required: true
  },
  file_size: {
    type: Number,
    required: true
  },
  mime_type: {
    type: String,
    required: true
  },
  expiry_date: {
    type: Date,
    required: false
  },
  uploaded_at: {
    type: Date,
    default: Date.now
  }
}, { _id: true });

const vendorCreateSchema = new Schema<IVendorCreate>({
  // Basic Information
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
  vendor_type: [{
    type: String,
    enum: ['snacks', 'beverages', 'packaging', 'services', 'raw_materials', 'equipment', 'maintenance'],
    required: true
  }],
  vendor_category: {
    type: String,
    required: true,
    enum: ['consumables', 'packaging', 'logistics', 'maintenance', 'services', 'equipment'],
    trim: true
  },
  primary_contact_name: {
    type: String,
    required: true,
    trim: true
  },
  contact_phone: {
    type: String,
    required: true,
    trim: true
  },
  vendor_email: {
    type: String,
    required: true,
    lowercase: true,
    trim: true,
    unique: true
  },
  vendor_address: {
    type: String,
    required: true,
    trim: true
  },
  vendor_id: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  company_registration_number: {
    type: String,
    required: true,
    trim: true,
    references: 'CompanyCreate',
    validate: {
    validator: async function(value: string) {
      // Check if company exists with this registration number
      const company = await mongoose.model('CompanyCreate').findOne({ 
        company_registration_number: value 
      });
      return !!company; // Return true if company exists
    },
    message: 'Company with this registration number does not exist'
  }
  },

  // Financial Information
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
    enum: ['net_7', 'net_15', 'net_30', 'net_45', 'net_60', 'immediate'],
    default: 'net_30',
    trim: true
  },
  payment_methods: {
    type: String,
    required: true,
    enum: ['neft', 'imps', 'upi', 'cheque', 'rtgs', 'multiple'],
    default: 'neft'
  },

  // Compliance Information
  gst_number: {
    type: String,
    required: true,
    uppercase: true,
    trim: true
  },
  pan_number: {
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
    default: 1
  },
  billing_cycle: {
    type: String,
    required: true,
    enum: ['weekly', 'monthly', 'per_po', 'quarterly'],
    default: 'monthly'
  },

  // Status & Risk Information
  vendor_status_cycle: {
    type: String,
    required: true,
    enum: ['procurement', 'restocking', 'finance_reconciliation', 'audit'],
    default: 'procurement'
  },
  verification_status: {
    type: String,
    enum: ['pending', 'verified', 'failed', 'rejected'],
    required: true,
    default: 'pending'
  },
  risk_rating: {
    type: String,
    enum: ['low', 'medium', 'high'],
    required: true,
    default: 'medium'
  },
  risk_notes: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  verified_by: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },

  // Contract Information
  contract_terms: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },
  contract_expiry_date: {
    type: Date,
    required: true
  },
  contract_renewal_date: {
    type: Date,
    required: true
  },

  // Documents
  documents: [vendorDocumentSchema],

  // System Information
  internal_notes: {
    type: String,
    required: false,
    trim: true,
    default: ''
  },

  // Audit Fields
  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true,
  collection: 'vendors'
});

// Pre-save middleware for vendor ID generation and validation
vendorCreateSchema.pre('save', function(next) {
  // Generate vendor ID if not provided
  if (!this.vendor_id) {
    const timestamp = new Date().getTime().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    this.vendor_id = `VEND-${timestamp}-${random}`;
  }

  // Validate contract dates
  if (this.contract_expiry_date <= this.contract_renewal_date) {
    return next(new Error('Contract expiry date must be after renewal date'));
  }

  // Auto-set verification date when status changes to verified/rejected/failed
  if (this.isModified('verification_status') &&
      (this.verification_status === 'verified' || this.verification_status === 'rejected' || this.verification_status === 'failed')) {

    if (!this.verified_by) {
      return next(new Error('Verified_by field is required when verification status is changed'));
    }
  }

  next();
});

// Indexes for better performance
vendorCreateSchema.index({ vendor_email: 1 }, { unique: true });
vendorCreateSchema.index({ vendor_id: 1 }, { unique: true });
vendorCreateSchema.index({ verification_status: 1 });
vendorCreateSchema.index({ risk_rating: 1 });
vendorCreateSchema.index({ vendor_category: 1 });
vendorCreateSchema.index({ createdBy: 1 });
vendorCreateSchema.index({ contract_expiry_date: 1 });

export const VendorCreate = mongoose.model<IVendorCreate>('VendorCreate', vendorCreateSchema);

export interface IVendorDashboard extends Document {
  total_vendors: number;
  pending_approvals: number;
  active_vendors: number;
  rejected_vendors: number;
  vendors: {
    vendor_name: string;
    vendor_category: string;
    verification_status: 'pending' | 'verified' | 'failed' | 'rejected';
    risk_level: 'low' | 'medium' | 'high';
    contract_expiry_date: Date;
    action: 'edit' | 'delete' | 'view';
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
    verification_status: {
      type: String,
      enum: ['pending', 'verified', 'failed', 'rejected'],
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
  collection: 'vendordashboards'
});

vendorDashboardSchema.index({ createdBy: 1 });

export const VendorDashboard = mongoose.model<IVendorDashboard>('VendorDashboard', vendorDashboardSchema);