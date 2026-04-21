import mongoose, { Document, Schema, Types } from "mongoose";

// ============================================
// IMAGE / DOCUMENT INTERFACES (no duplicates)
// ============================================

export interface ICancelledChequeImage {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
export interface IGstCertificateImage {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
export interface IPANImage {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
export interface IFSSAIImage {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
export interface IAuthorizedSignatoryImage {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
export interface ILLPAgreementImage {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
export interface IShopAndEstablishmentCertificateImage {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
export interface IRegisteredPartnershipDeedImage {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
export interface IBoardResolutionImage {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
export interface ICertificateOfIncorporationImage {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
export interface IMsmeOrUdyamCertificate {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
export interface IMoAImage {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
export interface IAoAImage {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}
export interface ITrademarkCertificateImage {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}

// ============================================
// REUSABLE DOCUMENT SUB-SCHEMA FACTORY
// ============================================

const documentImageSchema = () =>
  new Schema(
    {
      image_name: { type: String, required: true, trim: true },
      file_url: { type: String, required: true },
      cloudinary_public_id: { type: String, required: true },
      file_size: { type: Number, required: true },
      mime_type: { type: String, required: true },
      uploaded_at: { type: Date, default: Date.now },
    },
    { _id: true }
  );

// ============================================
// COMPANY CREATE INTERFACE & SCHEMA
// ============================================

export interface ICompanyCreate extends Document {
  company_id: string;
  legal_entity_structure: "pvt" | "public" | "opc" | "llp" | "proprietorship" | "partnership";
  registered_company_name: string;
  registration_type: "cin" | "msme";
  cin_or_msme_number: string;
  date_of_incorporation: Date;
  registered_office_address: string;
  corporate_website?: string;
  official_email: string;
  directory_signature_name: string;
  din: string;
  company_status: "active" | "inactive";
  verification_status: "pending" | "verified" | "rejected";
  // Compliance
  gst_details: string;
  gst_certificate_image?: IGstCertificateImage;
  PAN_number: string;
  PAN_image?: IPANImage;
  FSSAI_number: string;
  FSSAI_image?: IFSSAIImage;
  TDS_rate: number;
  billing_cycle: string;
  // Document uploads (legal-entity-specific)
  certificate_of_incorporation_image?: ICertificateOfIncorporationImage;
  MSME_or_Udyam_certificate_image?: IMsmeOrUdyamCertificate;
  MOA_image?: IMoAImage;
  AOA_image?: IAoAImage;
  Trademark_certificate_image?: ITrademarkCertificateImage;
  Authorized_Signatory_image?: IAuthorizedSignatoryImage;
  LLP_agreement_image?: ILLPAgreementImage;
  Shop_and_Establishment_certificate_image?: IShopAndEstablishmentCertificateImage;
  Registered_Partnership_deed_image?: IRegisteredPartnershipDeedImage;
  Board_resolution_image?: IBoardResolutionImage;
  createdAt: Date;
  updatedAt: Date;
}

const companyCreateSchema = new Schema<ICompanyCreate>(
  {
    company_id: { type: String, unique: true, trim: true },
    registered_company_name: { type: String, required: true, trim: true },
    registered_office_address: { type: String, required: true, trim: true },
    official_email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    legal_entity_structure: {
      type: String,
      enum: ["pvt", "public", "opc", "llp", "proprietorship", "partnership"],
      required: true,
    },
    registration_type: { type: String, enum: ["cin", "msme"], required: true },
    cin_or_msme_number: { type: String, required: true, trim: true, unique: true },
    date_of_incorporation: { type: Date, required: true },
    corporate_website: { type: String, required: false, trim: true },
    directory_signature_name: { type: String, required: true, trim: true },
    din: { type: String, required: true, trim: true, unique: true },
    company_status: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
      required: true,
    },
    verification_status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      required: true,
    },
    // Compliance fields
    gst_details: { type: String, required: true, uppercase: true, trim: true },
    gst_certificate_image: documentImageSchema(),
    PAN_number: { type: String, required: true, uppercase: true, trim: true },
    PAN_image: documentImageSchema(),
    FSSAI_number: { type: String, required: true, trim: true },
    FSSAI_image: documentImageSchema(),
    TDS_rate: { type: Number, required: true, min: 0, max: 100, default: 1 },
    billing_cycle: { type: String, required: true, trim: true },
    // Legal-entity-specific document uploads (all optional at schema level;
    // required fields are enforced in the service layer per legal_entity_structure)
    certificate_of_incorporation_image: documentImageSchema(),
    MSME_or_Udyam_certificate_image: documentImageSchema(),
    MOA_image: documentImageSchema(),
    AOA_image: documentImageSchema(),
    Trademark_certificate_image: documentImageSchema(),
    Authorized_Signatory_image: documentImageSchema(),
    LLP_agreement_image: documentImageSchema(),
    Shop_and_Establishment_certificate_image: documentImageSchema(),
    Registered_Partnership_deed_image: documentImageSchema(),
    Board_resolution_image: documentImageSchema(),
  },
  { timestamps: true, collection: "companies" }
);

// Pre-save hook to generate company_id
companyCreateSchema.pre("save", async function (next) {
  if (this.isNew && !this.company_id) {
    let isUnique = false;
    while (!isUnique) {
      const generatedId = Math.floor(1000000 + Math.random() * 9000000).toString();
      const existingCompany = await mongoose.models.CompanyCreate?.findOne({
        company_id: generatedId,
      });
      if (!existingCompany) {
        isUnique = true;
        this.company_id = generatedId;
      }
    }
  }
  next();
});

export const CompanyCreate = mongoose.model<ICompanyCreate>("CompanyCreate", companyCreateSchema);

// ============================================
// BRAND CREATE INTERFACE & SCHEMA
// Compliance fields (GST, PAN, FSSAI, TDS, billing_cycle) and their
// certificate images are intentionally EXCLUDED from Brand — they belong
// to the parent Company only. Brand carries only its own banking document
// (cancelled cheque) and legal-entity-specific docs inherited at creation.
// ============================================

export interface IBrandCreate extends Document {
  brand_id: string;
  registration_type: "cin" | "msme";
  cin_or_msme_number: string;
  company_id: Types.ObjectId;
  brand_billing_name: string;
  brand_name: string;
  brand_email: string;
  brand_category: string;
  brand_type: string;
  contact_name: string;
  contact_phone: string;
  address: string;
  bank_account_of_brand: string;
  ifsc_code: string;
  payment_terms: string;
  // Brand's own banking document
  upload_cancelled_cheque_image?: ICancelledChequeImage;
  // Status & contract
  brand_status_cycle: string;
  brand_status: "active" | "inactive";
  verification_status: "pending" | "verified" | "rejected";
  risk_notes: string;
  contract_terms: string;
  contract_start_date: Date;
  contract_end_date: Date;
  contract_renewal_date: Date;
  payment_methods: "upi" | "bank_transfer" | "cheque" | "credit_card" | "debit_card" | "other";
  internal_notes: string;
  // Relations
  warehouse_id?: Types.ObjectId;
  verified_by?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const brandCreateSchema = new Schema<IBrandCreate>(
  {
    brand_id: { type: String, unique: true, trim: true },
    registration_type: { type: String, enum: ["cin", "msme"], required: true },
    cin_or_msme_number: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: async function (value: string) {
          const company = await CompanyCreate.findOne({ cin_or_msme_number: value });
          return !!company;
        },
        message: "Company with this registration number does not exist",
      },
    },
    company_id: {
      type: Schema.Types.ObjectId,
      ref: "CompanyCreate",
      required: true,
      validate: {
        validator: async function (value: Types.ObjectId) {
          const company = await CompanyCreate.findById(value);
          return !!company;
        },
        message: "Company does not exist",
      },
    },
    brand_billing_name: { type: String, required: true, trim: true },
    brand_name: { type: String, required: true, trim: true },
    brand_email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    brand_category: { type: String, required: true, trim: true },
    brand_type: { type: String, required: true, trim: true },
    contact_name: { type: String, required: true, trim: true },
    contact_phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    bank_account_of_brand: { type: String, required: true, trim: true },
    ifsc_code: { type: String, required: true, uppercase: true, trim: true },
    payment_terms: { type: String, required: true, trim: true },
    // Brand's own banking document
    upload_cancelled_cheque_image: documentImageSchema(),
    // Status & contract
    brand_status_cycle: { type: String, required: true, trim: true },
    brand_status: { type: String, enum: ["active", "inactive"], default: "active", required: true },
    verification_status: {
      type: String,
      enum: ["pending", "verified", "rejected"],
      default: "pending",
      required: true,
    },
    risk_notes: { type: String, trim: true, default: "" },
    contract_terms: { type: String, trim: true, default: "" },
    contract_start_date: { type: Date, required: true },
    contract_end_date: { type: Date, required: true },
    contract_renewal_date: { type: Date, required: true },
    payment_methods: {
      type: String,
      enum: ["upi", "bank_transfer", "cheque", "credit_card", "debit_card", "other"],
      required: true,
    },
    internal_notes: { type: String, trim: true, default: "" },
    // Relations
    warehouse_id: { type: Schema.Types.ObjectId, ref: "Warehouse" },
    verified_by: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, collection: "brands" }
);

// Pre-save hook to generate brand_id
brandCreateSchema.pre("save", async function (next) {
  if (this.isNew && !this.brand_id) {
    let isUnique = false;
    while (!isUnique) {
      const generatedId = `BR${Math.floor(100000 + Math.random() * 900000)}`;
      const existingBrand = await mongoose.models.BrandCreate?.findOne({
        brand_id: generatedId,
      });
      if (!existingBrand) {
        isUnique = true;
        this.brand_id = generatedId;
      }
    }
  }
  next();
});

export const BrandCreate = mongoose.model<IBrandCreate>("BrandCreate", brandCreateSchema);
