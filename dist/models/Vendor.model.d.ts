import mongoose, { Document, Types } from 'mongoose';
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
    cin: string;
    gst_number: string;
    date_of_incorporation: Date;
    corporate_website: string;
    directory_signature_name: string;
    din: string;
    company_status: 'active' | 'inactive' | 'blacklisted' | 'under_review';
    risk_rating: 'low' | 'medium' | 'high';
}
export declare const CompanyCreate: mongoose.Model<ICompanyCreate, {}, {}, {}, mongoose.Document<unknown, {}, ICompanyCreate, {}, {}> & ICompanyCreate & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
export interface IVendorCreate extends Document {
    vendor_name: string;
    vendor_billing_name: string;
    vendor_type: string[];
    vendor_category: string;
    material_categories_supplied: string[];
    primary_contact_name: string;
    contact_phone: string;
    vendor_email: string;
    vendor_address: string;
    vendor_id: string;
    cin: string;
    warehouse_id?: Types.ObjectId;
    bank_account_number: string;
    ifsc_code: string;
    payment_terms: string;
    payment_methods: string;
    gst_number: string;
    pan_number: string;
    tds_rate: number;
    billing_cycle: string;
    vendor_status_cycle: string;
    vendor_status: 'active' | 'inactive' | 'deactivated';
    verification_status: 'draft' | 'pending' | 'under_review' | 'verified' | 'rejected' | 'failed' | 'suspended' | 'contract_expired' | 'blacklisted';
    risk_rating: 'low' | 'medium' | 'high';
    risk_notes: string;
    verified_by?: Types.ObjectId;
    contract_terms: string;
    contract_expiry_date: Date;
    contract_renewal_date: Date;
    documents: IVendorDocument[];
    internal_notes: string;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const VendorCreate: mongoose.Model<IVendorCreate, {}, {}, {}, mongoose.Document<unknown, {}, IVendorCreate, {}, {}> & IVendorCreate & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
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
export declare const VendorDashboard: mongoose.Model<IVendorDashboard, {}, {}, {}, mongoose.Document<unknown, {}, IVendorDashboard, {}, {}> & IVendorDashboard & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Vendor.model.d.ts.map