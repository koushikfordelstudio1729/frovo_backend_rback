// models/Vendor.model.ts
import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IVendor extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  contactPerson: string;
  email: string;
  phone: string;
  address: {
    street: string;
    city: string;
    state: string;
    zipCode: string;
    country: string;
  };
  taxId: string;
  paymentTerms: string;
  isActive: boolean;
  category: 'supplier' | 'distributor' | 'manufacturer';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const vendorSchema = new Schema<IVendor>({
  name: { 
    type: String, 
    required: true, 
    trim: true 
  },
  code: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true 
  },
  contactPerson: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true,
    lowercase: true 
  },
  phone: { 
    type: String, 
    required: true 
  },
  address: {
    street: { type: String, required: true },
    city: { type: String, required: true },
    state: { type: String, required: true },
    zipCode: { type: String, required: true },
    country: { type: String, required: true, default: 'USA' }
  },
  taxId: { 
    type: String, 
    required: true 
  },
  paymentTerms: { 
    type: String, 
    default: 'Net 30' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  category: {
    type: String,
    enum: ['supplier', 'distributor', 'manufacturer'],
    default: 'supplier'
  },
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, { 
  timestamps: true 
});

// Create indexes for better query performance
vendorSchema.index({ code: 1 });
vendorSchema.index({ name: 1 });
vendorSchema.index({ email: 1 });
vendorSchema.index({ isActive: 1 });

export const Vendor = mongoose.model<IVendor>('Vendor', vendorSchema);