import mongoose, { Document, Schema, Types } from "mongoose";

// CompanyCreate Schema (unchanged from your code)
export interface ICompanyCreate extends Document {
  company_id: string;
  legal_entity_structure: "pvt" | "public" | "opc" | "llp" | "proprietorship" | "partnership";
  registered_company_name: string;
  registration_type: "cin" | "msme";
  cin_or_msme_number: string;
  date_of_incorporation: Date;
  registered_office_address: string;
  corporate_website: string;
  official_email: string;
  directory_signature_name: string;
  din: string;
  company_status: "active" | "inactive";
  createdAt: Date;
  updatedAt: Date;
}

const companyCreateSchema = new Schema<ICompanyCreate>(
  {
    company_id: { type: String, unique: true, trim: true },
    registered_company_name: { type: String, required: true, trim: true },
    registered_office_address: { type: String, required: true, trim: true },
    official_email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    legal_entity_structure: { type: String, required: true, trim: true },
    cin_or_msme_number: { type: String, required: true, trim: true, unique: true },
    date_of_incorporation: { type: Date, required: true },
    corporate_website: { type: String, required: false, trim: true },
    directory_signature_name: { type: String, required: true, trim: true },
    din: { type: String, required: true, trim: true, unique: true },
    company_status: { type: String, enum: ["active", "inactive"], default: "active", required: true },
  },
  { timestamps: true, collection: "companies" }
);

// Pre-save hook to generate company_id
companyCreateSchema.pre('save', async function (next) {
  if (this.isNew && !this.company_id) {
    let isUnique = false;

    while (!isUnique) {
      const generatedId = Math.floor(1000000 + Math.random() * 9000000).toString();

      const existingCompany = await mongoose.models.CompanyCreate?.findOne({
        company_id: generatedId
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

// BrandCreate Interfaces and Schemas
const cancelledChequeImageSchema = new Schema(
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

const gstCertificateImageSchema = new Schema(
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

const PANImageSchema = new Schema(
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

const FSSAIImageSchema = new Schema(
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

// Document schemas for different legal entities
const certificateOfIncorporationSchema = new Schema(
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

const msmeOrUdyamCertificateSchema = new Schema(
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

const moaImageSchema = new Schema(
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

const aoaImageSchema = new Schema(
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

const trademarkCertificateSchema = new Schema(
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

const authorizedSignatorySchema = new Schema(
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

const llpAgreementSchema = new Schema(
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

const shopAndEstablishmentSchema = new Schema(
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

const registeredPartnershipDeedSchema = new Schema(
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

const boardResolutionSchema = new Schema(
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

export interface IBrandCreate extends Document {
  registration_type: "cin" | "msme";
  cin_or_msme_number: string;
  company_id: Types.ObjectId;
  brand_billing_name: string;
  brand_name: string;
  brand_id: string;
  brand_email: string;
  brand_category: string;
  brand_type: string;
  contact_name: string;
  contact_phone: string;
  address: string;
  bank_account_of_brand: string;
  ifsc_code: string;
  payment_terms: string;
  upload_cancelled_cheque_image: ICancelledChequeImage;
  gst_details: string;
  gst_certificate_image: IGstCertificateImage;
  PAN_number: string;
  PAN_image: IPANImage;
  FSSAI_number: string;
  FSSAI_image: IFSSAIImage;
  TDS_rate: number;
  billing_cycle: string;
  brand_status_cycle: string;
  verification_status: "pending" | "verified" | "rejected";
  risk_notes: string;
  contract_terms: string;
  contract_start_date: Date;
  contract_end_date: Date;
  contract_renewal_date: Date;
  payment_methods: "upi" | "bank_transfer" | "cheque" | "credit_card" | "debit_card" | "other";
  internal_notes: string;

  // Document Uploads
  certificate_of_incorporation_image: ICertificateOfIncorporationImage;
  MSME_or_Udyam_certificate_image: IMsmeOrUdyamCertificate;
  MOA_image: IMoAImage;
  AOA_image: IAoAImage;
  Trademark_certificate_image: ITrademarkCertificateImage;
  Authorized_Signatory_image: IAuthorizedSignatoryImage;
  LLP_agreement_image: ILLPAgreementImage;
  Shop_and_Establishment_certificate_image: IShopAndEstablishmentCertificateImage;
  Registered_Partnership_deed_image: IRegisteredPartnershipDeedImage;
  Board_resolution_image: IBoardResolutionImage;

  warehouse_id?: Types.ObjectId;
  verified_by?: Types.ObjectId;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
const brandCreateSchema = new Schema<IBrandCreate>(
  {
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
    brand_id: { type: String, unique: true, trim: true },
    brand_email: { type: String, required: true, lowercase: true, trim: true, unique: true },
    brand_category: { type: String, required: true, trim: true },
    brand_type: { type: String, required: true, trim: true },
    contact_name: { type: String, required: true, trim: true },
    contact_phone: { type: String, required: true, trim: true },
    address: { type: String, required: true, trim: true },
    bank_account_of_brand: { type: String, required: true, trim: true },
    ifsc_code: { type: String, required: true, uppercase: true, trim: true },
    payment_terms: { type: String, required: true, trim: true },
    upload_cancelled_cheque_image: cancelledChequeImageSchema,
    gst_details: { type: String, required: true, uppercase: true, trim: true },
    gst_certificate_image: gstCertificateImageSchema,
    PAN_number: { type: String, required: true, uppercase: true, trim: true },
    PAN_image: PANImageSchema,
    FSSAI_number: { type: String, required: true, trim: true },
    FSSAI_image: FSSAIImageSchema,
    TDS_rate: { type: Number, required: true, min: 0, max: 100, default: 1 },
    billing_cycle: { type: String, required: true, trim: true },
    brand_status_cycle: { type: String, required: true, trim: true },
    verification_status: { type: String, enum: ["pending", "verified", "rejected"], default: "pending", required: true },
    risk_notes: { type: String, trim: true, default: "" },
    contract_terms: { type: String, trim: true, default: "" },
    contract_start_date: { type: Date, required: true },
    contract_end_date: { type: Date, required: true },
    contract_renewal_date: { type: Date, required: true },
    payment_methods: { type: String, enum: ["upi", "bank_transfer", "cheque", "credit_card", "debit_card", "other"], required: true },
    internal_notes: { type: String, trim: true, default: "" },

    // Document Uploads
    certificate_of_incorporation_image: certificateOfIncorporationSchema,
    MSME_or_Udyam_certificate_image: msmeOrUdyamCertificateSchema,
    MOA_image: moaImageSchema,
    AOA_image: aoaImageSchema,
    Trademark_certificate_image: trademarkCertificateSchema,
    Authorized_Signatory_image: authorizedSignatorySchema,
    LLP_agreement_image: llpAgreementSchema,
    Shop_and_Establishment_certificate_image: shopAndEstablishmentSchema,
    Registered_Partnership_deed_image: registeredPartnershipDeedSchema,
    Board_resolution_image: boardResolutionSchema,

    warehouse_id: { type: Schema.Types.ObjectId, ref: "Warehouse" },
    verified_by: { type: Schema.Types.ObjectId, ref: "User" },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  {
    timestamps: true,
    collection: "brands",
  }
);

// Pre-save hook to generate brand_id
brandCreateSchema.pre('save', async function (next) {
  if (this.isNew && !this.brand_id) {
    let isUnique = false;

    while (!isUnique) {
      // Generate brand ID with BR prefix
      const generatedId = `BR${Math.floor(100000 + Math.random() * 900000)}`;

      const existingBrand = await mongoose.models.BrandCreate?.findOne({
        brand_id: generatedId
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
