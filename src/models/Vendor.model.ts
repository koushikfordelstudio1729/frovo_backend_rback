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

}
const vendorDetailsSchema = new Schema<IVendorDetails>({
  vendor_name: { type: String, required: true },
  vendor_billing_name: { type: String, required: true },
  vendor_type: {
    type: String,
    enum: ['supplier', 'distributor', 'manufacturer'],
    required: true
  }
  ,
  vendor_category: { type: String, required: true },
  vendor_contact_name: { type: String, required: true },
  vendor_email: { type: String, required: true },
  vendor_phone: { type: String, required: true },
  vendor_address: { type: String, required: true }
});
export const VendorDetails = mongoose.model<IVendorDetails>('VendorDetails', vendorDetailsSchema);

export interface IVendorFinancials extends Document {
  bank_account_number: string;
  ifsc_code: string;
  payment_terms: string;
}
const vendorFinancialsSchema = new Schema<IVendorFinancials>({
  bank_account_number: { type: String, required: true },
  ifsc_code: { type: String, required: true },
  payment_terms: { type: String, required: true }
});
export const VendorFinancials = mongoose.model<IVendorFinancials>('VendorFinancials', vendorFinancialsSchema);

export interface IVendorCompliance extends Document {
  gst_details: string;
  pan_details: string;
  tds_rate: number;
  billing_cycle: 'monthly' | 'weekly' | 'per_order';
}
const vendorComplianceSchema = new Schema<IVendorCompliance>({
  gst_details: { type: String, required: true },
  pan_details: { type: String, required: true },
  tds_rate: { type: Number, required: true },
  billing_cycle: { type: String, enum: ['monthly', 'weekly', 'per_order'], required: true }
});
export const VendorCompliance = mongoose.model<IVendorCompliance>('VendorCompliance', vendorComplianceSchema);

export interface IVendorStatus extends Document {
  risk_level: 'low' | 'medium' | 'high' ;
  risk_notes: string;
  verified_by: string;
  verifiction_status: 'pending' | 'verified' | 'rejected';
  vendor_status_cycle: 'Procurement' | 'Restocking' | 'Finance Reconciliation' | 'Audit';
}
const vendorStatusSchema = new Schema<IVendorStatus>({
  risk_level: { type: String, enum: ['low', 'medium', 'high'], required: true },
  risk_notes: { type: String, required: true },
  verified_by: { type: String, required: true },
  verifiction_status: { type: String, enum: ['pending', 'verified', 'rejected'], required: true },
  vendor_status_cycle: { type: String, enum: ['Procurement', 'Restocking', 'Finance Reconciliation', 'Audit'], required: true }
});
export const VendorStatus = mongoose.model<IVendorStatus>('VendorStatus', vendorStatusSchema);

export interface IVendorDocument extends Document {
  document_type: 'Signed Contract' | 'GST' | 'MSME' | 'TDS Exemption';
  expiry_date: Date;
  document_upload: string;
}
const vendorDocumentSchema = new Schema<IVendorDocument>({
  document_type: { type: String, enum: ['Signed Contract', 'GST', 'MSME', 'TDS Exemption'], required: true },
  expiry_date: { type: Date, required: true },
  document_upload: { type: String, required: true }
});
export const VendorDocument = mongoose.model<IVendorDocument>('VendorDocument', vendorDocumentSchema);

export interface IVendorContract extends Document {
  contract_terms: string;
  renewal_date: Date;
  expiry_date: Date;
}
const vendorContractSchema = new Schema<IVendorContract>({
  contract_terms: { type: String, required: true },
  renewal_date: { type: Date, required: true },
  expiry_date: { type: Date, required: true }
});
export const VendorContract = mongoose.model<IVendorContract>('VendorContract', vendorContractSchema);

export interface IVendorSystemInfo extends Document {
  payment_method: 'Bank Transfer' | 'Credit Card' | 'Cheque';
  operation_manger: string;
  internal_notes: string;
}
const vendorSystemInfoSchema = new Schema<IVendorSystemInfo>({
  payment_method: { type: String, enum: ['Bank Transfer', 'Credit Card', 'Cheque'], required: true },
  operation_manger: { type: String, required: true },
  internal_notes: { type: String, required: true }
});
export const VendorSystemInfo = mongoose.model<IVendorSystemInfo>('VendorSystemInfo', vendorSystemInfoSchema);

