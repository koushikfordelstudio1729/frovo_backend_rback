import mongoose, { Types } from "mongoose";
import { Request } from "express";
import {
  CompanyCreate,
  ICompanyCreate,
  BrandCreate,
  IBrandCreate,
  ITrademarkCertificateImage,
  ICertificateOfIncorporationImage,
  IMsmeOrUdyamCertificate,
  IGstCertificateImage,
  IAoAImage,
  IAuthorizedSignatoryImage,
  IBoardResolutionImage,
  IFSSAIImage,
  ILLPAgreementImage,
  IMoAImage,
  IPANImage,
  IRegisteredPartnershipDeedImage,
  IShopAndEstablishmentCertificateImage,
} from "../models/Vendor.model";
import { AuditTrailService } from "./auditTrail.service";
import { logger } from "../utils/logger.util";
import { ImageUploadService } from "./vendorFileUpload.service";
import { AuditTrail } from "../models/AuditTrail.model";
import PDFDocument from "pdfkit";
import {
  validateMongoId,
  getRequiredDocumentForCancelledChequeAndFssaiBrand,
  getRequiredCompanyDocumentsForLegalEntity,
  escapeCSVCell,
  buildCSV,
  UPDATABLE_DOCUMENT_FIELDS,
} from "../utils/vendor.helpers";

const auditTrailService = new AuditTrailService();

export interface ICompanyDashboardOptions {
  page: number;
  limit: number;
  company_status?: string;
  legal_entity_structure?: string;
  registration_type?: string;
  search?: string;
}

export interface ICompanyDashboardResponse {
  data: Array<{
    _id: string;
    company_id: string;
    registered_company_name: string;
    cin_or_msme_number: string;
    legal_entity_structure: string;
    registration_type: string;
    company_status: string;
    brandCount: number;
    official_email?: string;
    date_of_incorporation?: Date;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
  statistics: {
    totalCompanies: number;
    activeCompanies: number;
    inactiveCompanies: number;
    byLegalEntityStructure: Array<{ _id: string; count: number }>;
    byRegistrationType: Array<{ _id: string; count: number }>;
  };
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export type LeanCompany = {
  _id: mongoose.Types.ObjectId;
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
  verification_status: "pending" | "verified" | "rejected";
  createdAt: Date;
  updatedAt: Date;
  __v: number;
};

export interface ICompanyCreateData {
  registered_company_name: string;
  registered_office_address: string;
  official_email: string;
  legal_entity_structure: string;
  registration_type: string;
  cin_or_msme_number: string;
  date_of_incorporation: Date;
  corporate_website?: string;
  directory_signature_name: string;
  din: string;
  company_status?: string;
  // Compliance fields
  gst_details: string;
  PAN_number: string;
  FSSAI_number: string;
  TDS_rate: number;
  billing_cycle: string;
  // Compliance certificate images (always uploaded at company level)
  gst_certificate_image?: IGstCertificateImage;
  PAN_image?: IPANImage;
  FSSAI_image?: IFSSAIImage;
  // Legal-entity-specific document images (optional at type level;
  // required set enforced per entity by getRequiredCompanyDocumentsForLegalEntity)
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
}

export interface ICompanyUpdateData {
  registered_company_name?: string;
  registered_office_address?: string;
  official_email?: string;
  legal_entity_structure?: "pvt" | "public" | "opc" | "llp" | "proprietorship" | "partnership";
  registration_type?: "cin" | "msme";
  cin_or_msme_number?: string;
  date_of_incorporation?: Date;
  corporate_website?: string;
  directory_signature_name?: string;
  din?: string;
  company_status?: "active" | "inactive";
  // Compliance (optional on update)
  gst_details?: string;
  PAN_number?: string;
  FSSAI_number?: string;
  TDS_rate?: number;
  billing_cycle?: string;
  gst_certificate_image?: IGstCertificateImage;
  PAN_image?: IPANImage;
  FSSAI_image?: IFSSAIImage;
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
}

export interface ICompanyPaginationOptions {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  company_status?: string;
  registration_type?: string;
  legal_entity_structure?: string;
}

// ============================================
// BRAND SERVICE INTERFACES
// Compliance fields (GST, PAN, FSSAI, TDS, billing_cycle) and their
// certificate images are intentionally EXCLUDED — they live on Company only.
// ============================================

export interface IBrandCreateData {
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
  fssai_brand_number: string;
  // Brand-specific banking document
  upload_cancelled_cheque_image?: any;
  fssai_brand_image?: any;
  // Status & contract
  brand_status_cycle: string;
  brand_status?: "active" | "inactive";
  verification_status?: "pending" | "verified" | "rejected";
  risk_notes?: string;
  contract_terms?: string;
  contract_start_date: Date;
  contract_end_date: Date;
  contract_renewal_date: Date;
  payment_methods: "upi" | "bank_transfer" | "cheque" | "credit_card" | "debit_card" | "other";
  internal_notes?: string;
  // Relations
  warehouse_id?: Types.ObjectId;
  createdBy: Types.ObjectId;
}

export interface IBrandUpdateData {
  registration_type?: "cin" | "msme";
  cin_or_msme_number?: string;
  company_id?: Types.ObjectId;
  brand_billing_name?: string;
  brand_name?: string;
  brand_email?: string;
  brand_category?: string;
  brand_type?: string;
  contact_name?: string;
  contact_phone?: string;
  address?: string;
  bank_account_of_brand?: string;
  ifsc_code?: string;
  payment_terms?: string;
  // Brand-specific banking document
  upload_cancelled_cheque_image?: any;
  // Status & contract
  brand_status_cycle?: string;
  brand_status?: "active" | "inactive";
  verification_status?: "pending" | "verified" | "rejected";
  risk_notes?: string;
  contract_terms?: string;
  contract_start_date?: Date;
  contract_end_date?: Date;
  contract_renewal_date?: Date;
  payment_methods?: "upi" | "bank_transfer" | "cheque" | "credit_card" | "debit_card" | "other";
  internal_notes?: string;
  // Relations
  warehouse_id?: Types.ObjectId;
  verified_by?: Types.ObjectId;
}

export interface IBrandPaginationOptions {
  page: number;
  limit: number;
  search?: string;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  verification_status?: string;
  brand_category?: string;
  brand_type?: string;
  company_id?: string;
}

export interface IBrandByCompanyOptions {
  page: number;
  limit: number;
  verification_status?: string;
}

// ============================================
// HELPER: Build brand ID query
// ============================================

function buildBrandQuery(brandIdentifier: string): any {
  return mongoose.Types.ObjectId.isValid(brandIdentifier) &&
    brandIdentifier.length === 24 &&
    /^[0-9a-fA-F]{24}$/.test(brandIdentifier)
    ? { _id: new mongoose.Types.ObjectId(brandIdentifier) }
    : { brand_id: brandIdentifier };
}

// ============================================
// HELPER: Paginate result
// ============================================

function paginationMeta(page: number, limit: number, total: number) {
  return { page, limit, total, totalPages: Math.ceil(total / limit) };
}

// ============================================
// COMPANY SERVICE
// ============================================

export class CompanyService {
  async exportCompanies(format: string, filters: any, userId: Types.ObjectId): Promise<any> {
    try {
      const query: any = {};
      if (filters.company_status) query.company_status = filters.company_status;
      if (filters.registration_type) query.registration_type = filters.registration_type;
      if (filters.legal_entity_structure)
        query.legal_entity_structure = filters.legal_entity_structure;
      if (filters.search) {
        query.$or = [
          { registered_company_name: { $regex: filters.search, $options: "i" } },
          { cin_or_msme_number: { $regex: filters.search, $options: "i" } },
          { official_email: { $regex: filters.search, $options: "i" } },
          { PAN_number: { $regex: filters.search, $options: "i" } },
          { gst_details: { $regex: filters.search, $options: "i" } },
        ];
      }

      const companies = await CompanyCreate.find(query).sort({ createdAt: -1 }).lean();

      if (format === "json") {
        return JSON.stringify(companies, null, 2);
      }

      if (format === "csv") {
        const headers = [
          // Basic Information
          "Company ID",
          "Registered Company Name",
          "Official Email",
          "Legal Entity Structure",
          "Registration Type",
          "CIN/MSME Number",
          "Date of Incorporation",
          "Registered Office Address",
          "Corporate Website",
          "Directory Signature Name",
          "DIN",

          // Compliance Information
          "GST Details",
          "PAN Number",
          "FSSAI Number",
          "TDS Rate (%)",
          "Billing Cycle",

          // Status Information
          "Company Status",
          "Verification Status",

          // Document URLs - Common
          "GST Certificate URL",
          "PAN Image URL",
          "FSSAI Image URL",

          // Document URLs - Entity Specific
          "Certificate of Incorporation URL",
          "MSME/Udyam Certificate URL",
          "MOA Document URL",
          "AOA Document URL",
          "Trademark Certificate URL",
          "Authorized Signatory URL",
          "LLP Agreement URL",
          "Shop & Establishment Certificate URL",
          "Registered Partnership Deed URL",
          "Board Resolution URL",

          // Timestamps
          "Created At",
          "Updated At",
        ];

        const rows = companies.map(c => {
          const company = c as any;
          const dateStr = (v: any) => (v ? new Date(v).toISOString().split("T")[0] : "");
          const dateTimeStr = (v: any) => (v ? new Date(v).toISOString() : "");

          return [
            // Basic Information
            company.company_id || "",
            `"${(company.registered_company_name || "").replace(/"/g, '""')}"`,
            company.official_email || "",
            company.legal_entity_structure || "",
            company.registration_type || "",
            company.cin_or_msme_number || "",
            dateStr(company.date_of_incorporation),
            `"${(company.registered_office_address || "").replace(/"/g, '""')}"`,
            company.corporate_website || "",
            `"${(company.directory_signature_name || "").replace(/"/g, '""')}"`,
            company.din || "",

            // Compliance Information
            company.gst_details || "",
            company.PAN_number || "",
            company.FSSAI_number || "",
            String(company.TDS_rate ?? ""),
            company.billing_cycle || "",

            // Status Information
            company.company_status || "",
            company.verification_status || "",

            // Document URLs - Common
            company.gst_certificate_image?.file_url || "",
            company.PAN_image?.file_url || "",
            company.FSSAI_image?.file_url || "",

            // Document URLs - Entity Specific
            company.certificate_of_incorporation_image?.file_url || "",
            company.MSME_or_Udyam_certificate_image?.file_url || "",
            company.MOA_image?.file_url || "",
            company.AOA_image?.file_url || "",
            company.Trademark_certificate_image?.file_url || "",
            company.Authorized_Signatory_image?.file_url || "",
            company.LLP_agreement_image?.file_url || "",
            company.Shop_and_Establishment_certificate_image?.file_url || "",
            company.Registered_Partnership_deed_image?.file_url || "",
            company.Board_resolution_image?.file_url || "",

            // Timestamps
            dateTimeStr(company.createdAt),
            dateTimeStr(company.updatedAt),
          ];
        });

        return buildCSV(headers, rows);
      }

      if (format === "excel" || format === "xlsx") {
        // For Excel format, return structured data that can be converted to Excel
        const excelData = companies.map(c => {
          const company = c as any;
          return {
            // Basic Information
            "Company ID": company.company_id || "",
            "Registered Company Name": company.registered_company_name || "",
            "Official Email": company.official_email || "",
            "Legal Entity Structure": company.legal_entity_structure || "",
            "Registration Type": company.registration_type || "",
            "CIN/MSME Number": company.cin_or_msme_number || "",
            "Date of Incorporation": company.date_of_incorporation
              ? new Date(company.date_of_incorporation).toISOString().split("T")[0]
              : "",
            "Registered Office Address": company.registered_office_address || "",
            "Corporate Website": company.corporate_website || "",
            "Directory Signature Name": company.directory_signature_name || "",
            DIN: company.din || "",

            // Compliance Information
            "GST Details": company.gst_details || "",
            "PAN Number": company.PAN_number || "",
            "FSSAI Number": company.FSSAI_number || "",
            "TDS Rate (%)": company.TDS_rate ?? "",
            "Billing Cycle": company.billing_cycle || "",

            // Status Information
            "Company Status": company.company_status || "",
            "Verification Status": company.verification_status || "",

            // Document Details - Common
            "GST Certificate Name": company.gst_certificate_image?.image_name || "",
            "GST Certificate URL": company.gst_certificate_image?.file_url || "",
            "GST Certificate Size (KB)": company.gst_certificate_image?.file_size
              ? (company.gst_certificate_image.file_size / 1024).toFixed(2)
              : "",
            "GST Certificate Type": company.gst_certificate_image?.mime_type || "",

            "PAN Image Name": company.PAN_image?.image_name || "",
            "PAN Image URL": company.PAN_image?.file_url || "",
            "PAN Image Size (KB)": company.PAN_image?.file_size
              ? (company.PAN_image.file_size / 1024).toFixed(2)
              : "",
            "PAN Image Type": company.PAN_image?.mime_type || "",

            "FSSAI Image Name": company.FSSAI_image?.image_name || "",
            "FSSAI Image URL": company.FSSAI_image?.file_url || "",
            "FSSAI Image Size (KB)": company.FSSAI_image?.file_size
              ? (company.FSSAI_image.file_size / 1024).toFixed(2)
              : "",
            "FSSAI Image Type": company.FSSAI_image?.mime_type || "",

            // Document Details - Entity Specific
            "Certificate of Incorporation Name":
              company.certificate_of_incorporation_image?.image_name || "",
            "Certificate of Incorporation URL":
              company.certificate_of_incorporation_image?.file_url || "",

            "MSME/Udyam Certificate Name":
              company.MSME_or_Udyam_certificate_image?.image_name || "",
            "MSME/Udyam Certificate URL": company.MSME_or_Udyam_certificate_image?.file_url || "",

            "MOA Document Name": company.MOA_image?.image_name || "",
            "MOA Document URL": company.MOA_image?.file_url || "",

            "AOA Document Name": company.AOA_image?.image_name || "",
            "AOA Document URL": company.AOA_image?.file_url || "",

            "Trademark Certificate Name": company.Trademark_certificate_image?.image_name || "",
            "Trademark Certificate URL": company.Trademark_certificate_image?.file_url || "",

            "Authorized Signatory Name": company.Authorized_Signatory_image?.image_name || "",
            "Authorized Signatory URL": company.Authorized_Signatory_image?.file_url || "",

            "LLP Agreement Name": company.LLP_agreement_image?.image_name || "",
            "LLP Agreement URL": company.LLP_agreement_image?.file_url || "",

            "Shop & Establishment Certificate Name":
              company.Shop_and_Establishment_certificate_image?.image_name || "",
            "Shop & Establishment Certificate URL":
              company.Shop_and_Establishment_certificate_image?.file_url || "",

            "Registered Partnership Deed Name":
              company.Registered_Partnership_deed_image?.image_name || "",
            "Registered Partnership Deed URL":
              company.Registered_Partnership_deed_image?.file_url || "",

            "Board Resolution Name": company.Board_resolution_image?.image_name || "",
            "Board Resolution URL": company.Board_resolution_image?.file_url || "",

            // Timestamps
            "Created At": company.createdAt ? new Date(company.createdAt).toISOString() : "",
            "Updated At": company.updatedAt ? new Date(company.updatedAt).toISOString() : "",
          };
        });

        return excelData;
      }

      return companies;
    } catch (error) {
      logger.error("Error exporting companies:", error);
      throw error;
    }
  }
  async getCompanyAuditTrails(
    companyId: string,
    page: number = 1,
    limit: number = 50
  ): Promise<any> {
    try {
      validateMongoId(companyId, "Company ID");
      const skip = (page - 1) * limit;
      const query = { target_company: new mongoose.Types.ObjectId(companyId) };
      const total = await AuditTrail.countDocuments(query);
      const auditTrails = await AuditTrail.find(query)
        .sort({ timestamp: -1 })
        .skip(skip)
        .limit(limit)
        .lean();

      return { data: auditTrails, pagination: paginationMeta(page, limit, total) };
    } catch (error) {
      logger.error(`Error fetching company audit trails for ${companyId}:`, error);
      throw error;
    }
  }

  async createCompany(
    companyData: ICompanyCreateData,
    createdBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<ICompanyCreate> {
    try {
      // ── Duplicate checks ─────────────────────────────────────────────────
      const existingCIN = await CompanyCreate.findOne({
        cin_or_msme_number: companyData.cin_or_msme_number,
      });
      if (existingCIN) {
        throw new Error(
          `Company with CIN/MSME number ${companyData.cin_or_msme_number} already exists`
        );
      }

      const existingEmail = await CompanyCreate.findOne({
        official_email: companyData.official_email.toLowerCase(),
      });
      if (existingEmail) {
        throw new Error(`Company with email ${companyData.official_email} already exists`);
      }

      const existingDIN = await CompanyCreate.findOne({ din: companyData.din });
      if (existingDIN) {
        throw new Error(`Company with DIN ${companyData.din} already exists`);
      }

      const existingPAN = await CompanyCreate.findOne({ PAN_number: companyData.PAN_number });
      if (existingPAN) {
        throw new Error(`Company with PAN number ${companyData.PAN_number} already exists`);
      }

      const existingGST = await CompanyCreate.findOne({ gst_details: companyData.gst_details });
      if (existingGST) {
        throw new Error(`Company with GST number ${companyData.gst_details} already exists`);
      }

      const existingFSSAI = await CompanyCreate.findOne({
        FSSAI_number: companyData.FSSAI_number,
      });
      if (existingFSSAI) {
        throw new Error(`Company with FSSAI number ${companyData.FSSAI_number} already exists`);
      }

      // ── Validate required documents per legal entity ──────────────────────
      const requiredDocs = getRequiredCompanyDocumentsForLegalEntity(
        companyData.legal_entity_structure
      );
      const missingDocs = requiredDocs.filter(
        docField => !(companyData as any)[docField]?.file_url
      );

      if (missingDocs.length > 0) {
        throw new Error(
          `Missing required documents for '${companyData.legal_entity_structure}': ${missingDocs.join(", ")}`
        );
      }

      const newCompany = new CompanyCreate({
        ...companyData,
        company_status: companyData.company_status || "active",
        verification_status: "pending",
      });

      await newCompany.save();

      if (req) {
        await auditTrailService.createAuditRecord({
          user: createdBy,
          user_email: userEmail,
          user_role: userRole,
          action: "create",
          action_description: `Created company: ${companyData.registered_company_name} with GST: ${companyData.gst_details}, PAN: ${companyData.PAN_number}`,
          target_type: "company",
          target_company: newCompany._id,
          target_company_name: companyData.registered_company_name,
          target_company_cin: companyData.cin_or_msme_number,
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
      }

      logger.info(`Company created: ${newCompany.registered_company_name} (ID: ${newCompany._id})`);
      return newCompany;
    } catch (error) {
      logger.error("Error creating company:", error);
      throw error;
    }
  }

  async getAllCompanies(options: ICompanyPaginationOptions): Promise<{
    data: ICompanyCreate[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    try {
      const {
        page,
        limit,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
        company_status,
        registration_type,
        legal_entity_structure,
      } = options;
      const skip = (page - 1) * limit;
      const query: any = {};

      if (search) {
        query.$or = [
          { registered_company_name: { $regex: search, $options: "i" } },
          { cin_or_msme_number: { $regex: search, $options: "i" } },
          { official_email: { $regex: search, $options: "i" } },
          { directory_signature_name: { $regex: search, $options: "i" } },
          { din: { $regex: search, $options: "i" } },
          { PAN_number: { $regex: search, $options: "i" } },
          { gst_details: { $regex: search, $options: "i" } },
        ];
      }

      if (company_status) query.company_status = company_status;
      if (registration_type) query.registration_type = registration_type;
      if (legal_entity_structure) query.legal_entity_structure = legal_entity_structure;

      const total = await CompanyCreate.countDocuments(query);
      const companies = (await CompanyCreate.find(query)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean()) as unknown as ICompanyCreate[];

      // Attach brand counts
      const companyIds = companies.map((c: any) => c._id);
      const brandCounts = await BrandCreate.aggregate([
        { $match: { company_id: { $in: companyIds } } },
        { $group: { _id: "$company_id", count: { $sum: 1 } } },
      ]);
      const brandCountMap = new Map(brandCounts.map((b: any) => [b._id.toString(), b.count]));
      const companiesWithBrandCount = companies.map((company: any) => ({
        ...company,
        brand_count: brandCountMap.get(company._id.toString()) || 0,
      }));

      return {
        data: companiesWithBrandCount,
        pagination: paginationMeta(page, limit, total),
      };
    } catch (error) {
      logger.error("Error fetching companies:", error);
      throw error;
    }
  }
  async updateCompanyVerificationStatus(
    companyId: string,
    verification_status: "pending" | "verified" | "rejected",
    risk_notes: string,
    updatedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<LeanCompany | null> {
    try {
      validateMongoId(companyId, "Company ID");

      const objectId = new mongoose.Types.ObjectId(companyId);
      const currentCompany = await CompanyCreate.findById(objectId);
      if (!currentCompany) {
        throw new Error(`Company with ID ${companyId} not found`);
      }

      const updatedCompany = (await CompanyCreate.findByIdAndUpdate(
        objectId,
        { $set: { verification_status } },
        { new: true, runValidators: true }
      ).lean()) as unknown as LeanCompany | null;

      if (!updatedCompany) {
        throw new Error(`Company with ID ${companyId} not found after update`);
      }

      if (req) {
        try {
          // Determine action based on verification status
          let action: string;
          let actionDescription: string;

          if (verification_status === "verified") {
            action = "verify";
            actionDescription = `Verified company: ${currentCompany.registered_company_name}`;
          } else if (verification_status === "rejected") {
            action = "reject";
            actionDescription = `Rejected company verification: ${currentCompany.registered_company_name}`;
          } else {
            action = "status_change";
            actionDescription = `Changed company verification status from ${currentCompany.verification_status} to ${verification_status}: ${currentCompany.registered_company_name}`;
          }

          await auditTrailService.createAuditRecord({
            user: updatedBy,
            user_email: userEmail,
            user_role: userRole,
            action,
            action_description: risk_notes
              ? `${actionDescription}. Notes: ${risk_notes}`
              : actionDescription,
            target_type: "company",
            target_company: currentCompany._id,
            target_company_name: currentCompany.registered_company_name,
            target_company_cin: currentCompany.cin_or_msme_number,
            before_state: { verification_status: currentCompany.verification_status },
            after_state: { verification_status, risk_notes: risk_notes || undefined },
            changed_fields: ["verification_status"],
            ip_address: req.ip,
            user_agent: req.get("User-Agent"),
          });
        } catch (auditError) {
          logger.error("Failed to create audit trail:", auditError);
          // Don't throw - the update was successful, just log the audit failure
        }
      }

      return updatedCompany;
    } catch (error) {
      logger.error("Error in updateCompanyVerificationStatus:", error);
      throw error;
    }
  }

  async updateCompanyStatus(
    companyId: string,
    company_status: "active" | "inactive",
    risk_notes: string,
    updatedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<LeanCompany | null> {
    try {
      validateMongoId(companyId, "Company ID");

      const objectId = new mongoose.Types.ObjectId(companyId);
      const currentCompany = await CompanyCreate.findById(objectId);
      if (!currentCompany) {
        throw new Error(`Company with ID ${companyId} not found`);
      }

      const updatedCompany = (await CompanyCreate.findByIdAndUpdate(
        objectId,
        { $set: { company_status } },
        { new: true, runValidators: true }
      ).lean()) as unknown as LeanCompany | null;

      if (!updatedCompany) {
        throw new Error(`Company with ID ${companyId} not found after update`);
      }

      if (req) {
        try {
          const action = "status_change";
          const actionDescription = `Changed company status from ${currentCompany.company_status} to ${company_status}: ${currentCompany.registered_company_name}`;

          await auditTrailService.createAuditRecord({
            user: updatedBy,
            user_email: userEmail,
            user_role: userRole,
            action,
            action_description: risk_notes
              ? `${actionDescription}. Notes: ${risk_notes}`
              : actionDescription,
            target_type: "company",
            target_company: currentCompany._id,
            target_company_name: currentCompany.registered_company_name,
            target_company_cin: currentCompany.cin_or_msme_number,
            before_state: { company_status: currentCompany.company_status },
            after_state: { company_status, risk_notes: risk_notes || undefined },
            changed_fields: ["company_status"],
            ip_address: req.ip,
            user_agent: req.get("User-Agent"),
          });
        } catch (auditError) {
          logger.error("Failed to create audit trail:", auditError);
          // Don't throw - the update was successful, just log the audit failure
        }
      }

      return updatedCompany;
    } catch (error) {
      logger.error("Error in updateCompanyStatus:", error);
      throw error;
    }
  }
  async bulkUpdateCompanyStatus(
    companyIds: string[],
    company_status: "active" | "inactive",
    risk_notes: string,
    updatedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<{ updated: number; failed: string[] }> {
    const failed: string[] = [];
    let updated = 0;

    for (const companyId of companyIds) {
      try {
        await this.updateCompanyStatus(
          companyId,
          company_status,
          risk_notes,
          updatedBy,
          userEmail,
          userRole,
          req
        );
        updated++;
      } catch (error) {
        failed.push(companyId);
        logger.error(`Failed to update company ${companyId}:`, error);
      }
    }

    return { updated, failed };
  }

  async bulkUpdateCompanyVerificationStatus(
    companyIds: string[],
    verification_status: "pending" | "verified" | "rejected",
    risk_notes: string,
    updatedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<{ updated: number; failed: string[] }> {
    const failed: string[] = [];
    let updated = 0;

    for (const companyId of companyIds) {
      try {
        await this.updateCompanyVerificationStatus(
          companyId,
          verification_status,
          risk_notes,
          updatedBy,
          userEmail,
          userRole,
          req
        );
        updated++;
      } catch (error) {
        failed.push(companyId);
        logger.error(`Failed to update company verification ${companyId}:`, error);
      }
    }

    return { updated, failed };
  }

  async getCompanyDashboard(options: ICompanyDashboardOptions): Promise<ICompanyDashboardResponse> {
    try {
      const { page, limit, company_status, legal_entity_structure, registration_type, search } =
        options;
      const skip = (page - 1) * limit;
      const query: any = {};

      if (search) {
        query.$or = [
          { registered_company_name: { $regex: search, $options: "i" } },
          { cin_or_msme_number: { $regex: search, $options: "i" } },
          { official_email: { $regex: search, $options: "i" } },
        ];
      }

      if (company_status) query.company_status = company_status;
      if (registration_type) query.registration_type = registration_type;
      if (legal_entity_structure) query.legal_entity_structure = legal_entity_structure;

      const total = await CompanyCreate.countDocuments(query);

      const companiesWithBrandCount = await CompanyCreate.aggregate([
        { $match: query },
        {
          $lookup: {
            from: "brands",
            localField: "_id",
            foreignField: "company_id",
            as: "brands",
          },
        },
        {
          $project: {
            _id: { $toString: "$_id" },
            company_id: 1,
            registered_company_name: 1,
            cin_or_msme_number: 1,
            legal_entity_structure: 1,
            registration_type: 1,
            company_status: 1,
            official_email: 1,
            date_of_incorporation: 1,
            createdAt: 1,
            updatedAt: 1,
            brandCount: { $size: "$brands" },
          },
        },
        { $sort: { createdAt: -1 } },
        { $skip: skip },
        { $limit: limit },
      ]);

      const [
        totalCompanies,
        activeCompanies,
        inactiveCompanies,
        byLegalEntityStructure,
        byRegistrationType,
      ] = await Promise.all([
        CompanyCreate.countDocuments({}),
        CompanyCreate.countDocuments({ company_status: "active" }),
        CompanyCreate.countDocuments({ company_status: "inactive" }),
        CompanyCreate.aggregate([
          { $group: { _id: "$legal_entity_structure", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
        CompanyCreate.aggregate([
          { $group: { _id: "$registration_type", count: { $sum: 1 } } },
          { $sort: { count: -1 } },
        ]),
      ]);

      return {
        data: companiesWithBrandCount,
        statistics: {
          totalCompanies,
          activeCompanies,
          inactiveCompanies,
          byLegalEntityStructure,
          byRegistrationType,
        },
        pagination: paginationMeta(page, limit, total),
      };
    } catch (error) {
      logger.error("Error fetching company dashboard:", error);
      throw error;
    }
  }

  async getCompanyById(id: string): Promise<ICompanyCreate | null> {
    try {
      validateMongoId(id, "Company ID");
      const company = (await CompanyCreate.findById(id).lean()) as unknown as ICompanyCreate | null;
      if (!company) throw new Error("Company not found");
      return company;
    } catch (error) {
      logger.error(`Error fetching company by ID ${id}:`, error);
      throw error;
    }
  }
  async updateCompany(
    id: string,
    updateData: ICompanyUpdateData,
    updatedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<ICompanyCreate | null> {
    try {
      validateMongoId(id, "Company ID");

      const currentCompany = await CompanyCreate.findById(id);
      if (!currentCompany) {
        throw new Error("Company not found");
      }

      // Track changed fields for audit
      const changedFields: string[] = [];
      const beforeState = currentCompany.toObject();

      // Build update object with only changed fields
      const updateObj: any = {};

      // Duplicate checks on mutable unique fields - ONLY if changed
      if (
        updateData.cin_or_msme_number &&
        updateData.cin_or_msme_number !== currentCompany.cin_or_msme_number
      ) {
        const existing = await CompanyCreate.findOne({
          cin_or_msme_number: updateData.cin_or_msme_number,
          _id: { $ne: id },
        });
        if (existing) {
          throw new Error(
            `Company with CIN/MSME number ${updateData.cin_or_msme_number} already exists`
          );
        }
        updateObj.cin_or_msme_number = updateData.cin_or_msme_number;
        changedFields.push("cin_or_msme_number");
      }

      // Email check - ONLY if changed
      if (updateData.official_email) {
        const newEmail = updateData.official_email.toLowerCase();
        if (newEmail !== currentCompany.official_email) {
          const existing = await CompanyCreate.findOne({
            official_email: newEmail,
            _id: { $ne: id },
          });
          if (existing) {
            throw new Error(`Company with email ${newEmail} already exists`);
          }
          updateObj.official_email = newEmail;
          changedFields.push("official_email");
        }
      }

      // DIN check - ONLY if changed
      if (updateData.din && updateData.din !== currentCompany.din) {
        const existing = await CompanyCreate.findOne({
          din: updateData.din,
          _id: { $ne: id },
        });
        if (existing) {
          throw new Error(`Company with DIN ${updateData.din} already exists`);
        }
        updateObj.din = updateData.din;
        changedFields.push("din");
      }

      // PAN check - ONLY if changed
      if (updateData.PAN_number && updateData.PAN_number !== currentCompany.PAN_number) {
        const existing = await CompanyCreate.findOne({
          PAN_number: updateData.PAN_number,
          _id: { $ne: id },
        });
        if (existing) {
          throw new Error(`Company with PAN number ${updateData.PAN_number} already exists`);
        }
        updateObj.PAN_number = updateData.PAN_number;
        changedFields.push("PAN_number");
      }

      // GST check - ONLY if changed
      if (updateData.gst_details && updateData.gst_details !== currentCompany.gst_details) {
        const existing = await CompanyCreate.findOne({
          gst_details: updateData.gst_details,
          _id: { $ne: id },
        });
        if (existing) {
          throw new Error(`Company with GST number ${updateData.gst_details} already exists`);
        }
        updateObj.gst_details = updateData.gst_details;
        changedFields.push("gst_details");
      }

      // FSSAI check - ONLY if changed
      if (updateData.FSSAI_number && updateData.FSSAI_number !== currentCompany.FSSAI_number) {
        const existing = await CompanyCreate.findOne({
          FSSAI_number: updateData.FSSAI_number,
          _id: { $ne: id },
        });
        if (existing) {
          throw new Error(`Company with FSSAI number ${updateData.FSSAI_number} already exists`);
        }
        updateObj.FSSAI_number = updateData.FSSAI_number;
        changedFields.push("FSSAI_number");
      }

      // Track other changed fields (non-unique fields)
      const nonUniqueFields = [
        "registered_company_name",
        "registered_office_address",
        "legal_entity_structure",
        "registration_type",
        "date_of_incorporation",
        "corporate_website",
        "directory_signature_name",
        "company_status",
        "verification_status",
        "TDS_rate",
        "billing_cycle",
      ];

      for (const field of nonUniqueFields) {
        const newValue = updateData[field as keyof ICompanyUpdateData];

        if (newValue !== undefined) {
          const oldValue = currentCompany[field as keyof ICompanyCreate];

          // Compare values (using JSON.stringify for dates and objects)
          if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
            updateObj[field] = newValue;
            changedFields.push(field);
          }
        }
      }

      // Track document field changes - always add if present
      const documentFields = UPDATABLE_DOCUMENT_FIELDS;
      for (const field of documentFields) {
        if (updateData[field as keyof ICompanyUpdateData] !== undefined) {
          updateObj[field] = updateData[field as keyof ICompanyUpdateData];
          changedFields.push(field);
        }
      }

      // If no fields are actually changing, return current company
      if (Object.keys(updateObj).length === 0) {
        logger.info(`No changes detected for company ${id}`);
        return currentCompany;
      }

      const updatedCompany = await CompanyCreate.findByIdAndUpdate(
        id,
        { $set: updateObj },
        { new: true, runValidators: true }
      ).lean();

      if (!updatedCompany) {
        throw new Error("Company not found");
      }

      // Create audit trail
      if (req && changedFields.length > 0) {
        await auditTrailService.createAuditRecord({
          user: updatedBy,
          user_email: userEmail,
          user_role: userRole,
          action: "update",
          action_description: `Updated company: ${currentCompany.registered_company_name}`,
          target_type: "company",
          target_company: currentCompany._id,
          target_company_name: currentCompany.registered_company_name,
          target_company_cin: currentCompany.cin_or_msme_number,
          before_state: beforeState,
          after_state: updateObj,
          changed_fields: changedFields,
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
      }

      logger.info(
        `Company updated: ${updatedCompany.registered_company_name} (ID: ${id}), changed fields: ${changedFields.join(", ")}`
      );
      return updatedCompany as unknown as ICompanyCreate;
    } catch (error) {
      logger.error(`Error updating company ${id}:`, error);
      throw error;
    }
  }
  async deleteCompany(
    id: string,
    deletedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<ICompanyCreate | null> {
    try {
      validateMongoId(id, "Company ID");

      const company = (await CompanyCreate.findByIdAndDelete(
        id
      ).lean()) as unknown as ICompanyCreate | null;
      if (!company) throw new Error("Company not found");

      if (req) {
        await auditTrailService.createAuditRecord({
          user: deletedBy,
          user_email: userEmail,
          user_role: userRole,
          action: "delete",
          action_description: `Deleted company: ${company.registered_company_name}`,
          target_type: "company",
          target_company: company._id,
          target_company_name: company.registered_company_name,
          target_company_cin: company.cin_or_msme_number,
          before_state: company,
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
      }

      logger.info(`Company deleted: ${company.registered_company_name} (ID: ${id})`);
      return company;
    } catch (error) {
      logger.error(`Error deleting company ${id}:`, error);
      throw error;
    }
  }
  async exportCompanyById(companyId: string, format: string, userId: Types.ObjectId): Promise<any> {
    try {
      validateMongoId(companyId, "Company ID");

      const company = await CompanyCreate.findById(companyId).lean();
      if (!company) throw new Error(`Company with ID ${companyId} not found`);

      // Get all brands associated with this company
      const brands = await BrandCreate.find({
        company_id: new mongoose.Types.ObjectId(companyId),
      })
        .populate("warehouse_id", "warehouse_name warehouse_code")
        .populate("verified_by", "email name")
        .populate("createdBy", "email name")
        .lean();

      const c = company as any;
      const dateStr = (v: any) => (v ? new Date(v).toISOString().split("T")[0] : "");
      const dateTimeStr = (v: any) => (v ? new Date(v).toISOString() : "");

      // Build documents list
      const documents: any[] = [];

      const docFields = [
        { key: "gst_certificate_image", label: "GST Certificate" },
        { key: "PAN_image", label: "PAN Card" },
        { key: "FSSAI_image", label: "FSSAI Certificate" },
        { key: "certificate_of_incorporation_image", label: "Certificate of Incorporation" },
        { key: "MSME_or_Udyam_certificate_image", label: "MSME/Udyam Certificate" },
        { key: "MOA_image", label: "Memorandum of Association (MOA)" },
        { key: "AOA_image", label: "Articles of Association (AOA)" },
        { key: "Trademark_certificate_image", label: "Trademark Certificate" },
        { key: "Authorized_Signatory_image", label: "Authorized Signatory" },
        { key: "LLP_agreement_image", label: "LLP Agreement" },
        {
          key: "Shop_and_Establishment_certificate_image",
          label: "Shop & Establishment Certificate",
        },
        { key: "Registered_Partnership_deed_image", label: "Registered Partnership Deed" },
        { key: "Board_resolution_image", label: "Board Resolution" },
      ];

      for (const doc of docFields) {
        const docData = c[doc.key];
        if (docData) {
          documents.push({
            "Document Type": doc.label,
            "Document Name": docData.image_name || "N/A",
            "File URL": docData.file_url || "N/A",
            "File Size (KB)": docData.file_size ? (docData.file_size / 1024).toFixed(2) : "N/A",
            "File Type": docData.mime_type || "N/A",
            "Uploaded At": docData.uploaded_at
              ? new Date(docData.uploaded_at).toISOString()
              : "N/A",
            "Cloudinary Public ID": docData.cloudinary_public_id || "N/A",
          });
        }
      }

      if (format === "json") {
        return {
          company: {
            // Basic Information
            "Company ID": c.company_id || "",
            "Registered Company Name": c.registered_company_name || "",
            "Official Email": c.official_email || "",
            "Legal Entity Structure": c.legal_entity_structure || "",
            "Registration Type": c.registration_type || "",
            "CIN/MSME Number": c.cin_or_msme_number || "",
            "Date of Incorporation": dateStr(c.date_of_incorporation),
            "Registered Office Address": c.registered_office_address || "",
            "Corporate Website": c.corporate_website || "",
            "Directory Signature Name": c.directory_signature_name || "",
            DIN: c.din || "",

            // Compliance
            "GST Details": c.gst_details || "",
            "PAN Number": c.PAN_number || "",
            "FSSAI Number": c.FSSAI_number || "",
            "TDS Rate (%)": c.TDS_rate ?? "",
            "Billing Cycle": c.billing_cycle || "",

            // Status
            "Company Status": c.company_status || "",
            "Verification Status": c.verification_status || "",

            // Timestamps
            "Created At": dateTimeStr(c.createdAt),
            "Updated At": dateTimeStr(c.updatedAt),
          },
          documents: documents,
          brands: brands.map(b => ({
            "Brand ID": (b as any).brand_id || "",
            "Brand Name": (b as any).brand_name || "",
            "Brand Billing Name": (b as any).brand_billing_name || "",
            "Brand Email": (b as any).brand_email || "",
            "Brand Category": (b as any).brand_category || "",
            "Brand Type": (b as any).brand_type || "",
            "Contact Name": (b as any).contact_name || "",
            "Contact Phone": (b as any).contact_phone || "",
            Address: (b as any).address || "",
            "Bank Account": (b as any).bank_account_of_brand || "",
            "IFSC Code": (b as any).ifsc_code || "",
            "Payment Terms": (b as any).payment_terms || "",
            "Payment Methods": (b as any).payment_methods || "",
            "Brand Status": (b as any).brand_status || "",
            "Verification Status": (b as any).verification_status || "",
            "Contract Start Date": dateStr((b as any).contract_start_date),
            "Contract End Date": dateStr((b as any).contract_end_date),
            "Contract Renewal Date": dateStr((b as any).contract_renewal_date),
            "Cancelled Cheque URL": (b as any).upload_cancelled_cheque_image?.file_url || "",
            Warehouse: (b as any).warehouse_id?.warehouse_name || "",
            "Created At": dateTimeStr((b as any).createdAt),
          })),
          summary: {
            "Total Brands": brands.length,
            "Active Brands": brands.filter(b => (b as any).brand_status === "active").length,
            "Inactive Brands": brands.filter(b => (b as any).brand_status === "inactive").length,
            "Verified Brands": brands.filter(b => (b as any).verification_status === "verified")
              .length,
            "Pending Brands": brands.filter(b => (b as any).verification_status === "pending")
              .length,
            "Rejected Brands": brands.filter(b => (b as any).verification_status === "rejected")
              .length,
            "Total Documents": documents.length,
          },
        };
      }

      if (format === "csv") {
        let csv = "";

        // Company Overview Section
        csv += "=== COMPANY OVERVIEW ===\n";
        csv += "Field,Value\n";
        csv += `Company ID,${c.company_id || ""}\n`;
        csv += `Registered Company Name,"${(c.registered_company_name || "").replace(/"/g, '""')}"\n`;
        csv += `Official Email,${c.official_email || ""}\n`;
        csv += `Legal Entity Structure,${c.legal_entity_structure || ""}\n`;
        csv += `Registration Type,${c.registration_type || ""}\n`;
        csv += `CIN/MSME Number,${c.cin_or_msme_number || ""}\n`;
        csv += `Date of Incorporation,${dateStr(c.date_of_incorporation)}\n`;
        csv += `Registered Office Address,"${(c.registered_office_address || "").replace(/"/g, '""')}"\n`;
        csv += `Corporate Website,${c.corporate_website || ""}\n`;
        csv += `Directory Signature Name,"${(c.directory_signature_name || "").replace(/"/g, '""')}"\n`;
        csv += `DIN,${c.din || ""}\n\n`;

        // Compliance Section
        csv += "=== COMPLIANCE INFORMATION ===\n";
        csv += "Field,Value\n";
        csv += `GST Details,${c.gst_details || ""}\n`;
        csv += `PAN Number,${c.PAN_number || ""}\n`;
        csv += `FSSAI Number,${c.FSSAI_number || ""}\n`;
        csv += `TDS Rate (%),${c.TDS_rate ?? ""}\n`;
        csv += `Billing Cycle,${c.billing_cycle || ""}\n\n`;

        // Status Section
        csv += "=== STATUS INFORMATION ===\n";
        csv += "Field,Value\n";
        csv += `Company Status,${c.company_status || ""}\n`;
        csv += `Verification Status,${c.verification_status || ""}\n`;
        csv += `Created At,${dateTimeStr(c.createdAt)}\n`;
        csv += `Updated At,${dateTimeStr(c.updatedAt)}\n\n`;

        // Documents Section
        csv += "=== DOCUMENTS ===\n";
        if (documents.length > 0) {
          csv += "Document Type,Document Name,File URL,File Size (KB),File Type,Uploaded At\n";
          for (const doc of documents) {
            csv += `"${doc["Document Type"]}",`;
            csv += `"${doc["Document Name"].replace(/"/g, '""')}",`;
            csv += `${doc["File URL"]},`;
            csv += `${doc["File Size (KB)"]},`;
            csv += `${doc["File Type"]},`;
            csv += `${doc["Uploaded At"]}\n`;
          }
        } else {
          csv += "No documents uploaded\n";
        }
        csv += "\n";

        // Brands Section
        csv += "=== BRANDS ===\n";
        csv += `Total Brands,${brands.length}\n`;
        csv += `Active Brands,${brands.filter(b => (b as any).brand_status === "active").length}\n`;
        csv += `Inactive Brands,${brands.filter(b => (b as any).brand_status === "inactive").length}\n`;
        csv += `Verified Brands,${brands.filter(b => (b as any).verification_status === "verified").length}\n`;
        csv += `Pending Brands,${brands.filter(b => (b as any).verification_status === "pending").length}\n`;
        csv += `Rejected Brands,${brands.filter(b => (b as any).verification_status === "rejected").length}\n\n`;

        if (brands.length > 0) {
          csv +=
            "Brand ID,Brand Name,Brand Email,Category,Type,Contact Name,Contact Phone,Status,Verification,Contract Start,Contract End,Cancelled Cheque URL\n";
          for (const b of brands) {
            const brand = b as any;
            csv += `${brand.brand_id || ""},`;
            csv += `"${(brand.brand_name || "").replace(/"/g, '""')}",`;
            csv += `${brand.brand_email || ""},`;
            csv += `${brand.brand_category || ""},`;
            csv += `${brand.brand_type || ""},`;
            csv += `"${(brand.contact_name || "").replace(/"/g, '""')}",`;
            csv += `${brand.contact_phone || ""},`;
            csv += `${brand.brand_status || ""},`;
            csv += `${brand.verification_status || ""},`;
            csv += `${dateStr(brand.contract_start_date)},`;
            csv += `${dateStr(brand.contract_end_date)},`;
            csv += `${brand.upload_cancelled_cheque_image?.file_url || ""}\n`;
          }
        }

        return csv;
      }

      if (format === "excel" || format === "xlsx") {
        // Return structured data for Excel export
        return {
          company: {
            "Company ID": c.company_id || "",
            "Registered Company Name": c.registered_company_name || "",
            "Official Email": c.official_email || "",
            "Legal Entity Structure": c.legal_entity_structure || "",
            "Registration Type": c.registration_type || "",
            "CIN/MSME Number": c.cin_or_msme_number || "",
            "Date of Incorporation": dateStr(c.date_of_incorporation),
            "Registered Office Address": c.registered_office_address || "",
            "Corporate Website": c.corporate_website || "",
            "Directory Signature Name": c.directory_signature_name || "",
            DIN: c.din || "",
            "GST Details": c.gst_details || "",
            "PAN Number": c.PAN_number || "",
            "FSSAI Number": c.FSSAI_number || "",
            "TDS Rate (%)": c.TDS_rate ?? "",
            "Billing Cycle": c.billing_cycle || "",
            "Company Status": c.company_status || "",
            "Verification Status": c.verification_status || "",
            "Created At": dateTimeStr(c.createdAt),
            "Updated At": dateTimeStr(c.updatedAt),
          },
          documents: documents,
          brands: brands.map(b => ({
            "Brand ID": (b as any).brand_id || "",
            "Brand Name": (b as any).brand_name || "",
            "Brand Billing Name": (b as any).brand_billing_name || "",
            "Brand Email": (b as any).brand_email || "",
            "Brand Category": (b as any).brand_category || "",
            "Brand Type": (b as any).brand_type || "",
            "Contact Name": (b as any).contact_name || "",
            "Contact Phone": (b as any).contact_phone || "",
            Address: (b as any).address || "",
            "Bank Account": (b as any).bank_account_of_brand || "",
            "IFSC Code": (b as any).ifsc_code || "",
            "Payment Terms": (b as any).payment_terms || "",
            "Payment Methods": (b as any).payment_methods || "",
            "Brand Status": (b as any).brand_status || "",
            "Verification Status": (b as any).verification_status || "",
            "Contract Start Date": dateStr((b as any).contract_start_date),
            "Contract End Date": dateStr((b as any).contract_end_date),
            "Contract Renewal Date": dateStr((b as any).contract_renewal_date),
            "Risk Notes": (b as any).risk_notes || "",
            "Contract Terms": (b as any).contract_terms || "",
            "Internal Notes": (b as any).internal_notes || "",
            "Cancelled Cheque URL": (b as any).upload_cancelled_cheque_image?.file_url || "",
            "Warehouse Name": (b as any).warehouse_id?.warehouse_name || "",
            "Warehouse Code": (b as any).warehouse_id?.warehouse_code || "",
            "Verified By": (b as any).verified_by?.name || "",
            "Created By": (b as any).createdBy?.name || "",
            "Created At": dateTimeStr((b as any).createdAt),
            "Updated At": dateTimeStr((b as any).updatedAt),
          })),
        };
      }

      return company;
    } catch (error) {
      logger.error(`Error exporting company ${companyId}:`, error);
      throw error;
    }
  }
  async getCompanyStatistics(): Promise<any> {
    try {
      const [total, active, inactive, structureStats, registrationTypeStats, recentCompanies] =
        await Promise.all([
          CompanyCreate.countDocuments(),
          CompanyCreate.countDocuments({ company_status: "active" }),
          CompanyCreate.countDocuments({ company_status: "inactive" }),
          CompanyCreate.aggregate([
            { $group: { _id: "$legal_entity_structure", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
          CompanyCreate.aggregate([{ $group: { _id: "$registration_type", count: { $sum: 1 } } }]),
          CompanyCreate.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          }),
        ]);

      return {
        total,
        active,
        inactive,
        recent: recentCompanies,
        byLegalEntityStructure: structureStats,
        byRegistrationType: registrationTypeStats,
      };
    } catch (error) {
      logger.error("Error fetching company statistics:", error);
      throw error;
    }
  }
}

export class BrandService {
  async createBrand(
    brandData: IBrandCreateData,
    createdBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<IBrandCreate> {
    try {
      const company = await CompanyCreate.findOne({
        cin_or_msme_number: brandData.cin_or_msme_number,
      });
      if (!company) {
        throw new Error(
          `Company with registration number ${brandData.cin_or_msme_number} does not exist`
        );
      }

      const existingBrand = await BrandCreate.findOne({
        brand_email: brandData.brand_email.toLowerCase(),
      });
      if (existingBrand) {
        throw new Error(`Brand with email ${brandData.brand_email} already exists`);
      }

      if (!company._id.equals(brandData.company_id)) {
        throw new Error("Company ID does not match the registration number");
      }

      // Validate required files (brand scope: cancelled cheque + entity-specific docs)
      const requiredFields = brandData.fssai_brand_number
        ? getRequiredDocumentForCancelledChequeAndFssaiBrand() // Both required
        : ["upload_cancelled_cheque_image"]; // Only cancelled cheque required

      for (const field of requiredFields) {
        const docData = (brandData as any)[field];
        if (!docData?.file_url || !docData?.cloudinary_public_id) {
          throw new Error(`Missing or invalid ${field} file upload`);
        }
      }

      const newBrand = new BrandCreate({
        ...brandData,
        verification_status: brandData.verification_status || "pending",
        createdBy,
      });
      await newBrand.save();

      if (req) {
        await auditTrailService.createAuditRecord({
          user: createdBy,
          user_email: userEmail,
          user_role: userRole,
          action: "create",
          action_description: `Created brand: ${brandData.brand_name}`,
          target_type: "brand",
          target_brand: newBrand._id,
          target_brand_name: brandData.brand_name,
          target_company: brandData.company_id,
          target_company_name: company.registered_company_name,
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
      }

      logger.info(`Brand created: ${newBrand.brand_name} (ID: ${newBrand._id})`);
      return newBrand;
    } catch (error) {
      logger.error("Error creating brand:", error);
      throw error;
    }
  }

  async getAllBrands(options: IBrandPaginationOptions): Promise<{
    data: IBrandCreate[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    try {
      const {
        page,
        limit,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
        verification_status,
        brand_category,
        brand_type,
        company_id,
      } = options;
      const skip = (page - 1) * limit;
      const query: any = {};

      if (search) {
        query.$or = [
          { brand_name: { $regex: search, $options: "i" } },
          { brand_billing_name: { $regex: search, $options: "i" } },
          { brand_email: { $regex: search, $options: "i" } },
          { contact_name: { $regex: search, $options: "i" } },
          { contact_phone: { $regex: search, $options: "i" } },
          { brand_id: { $regex: search, $options: "i" } },
        ];
      }

      if (verification_status) query.verification_status = verification_status;
      if (brand_category) query.brand_category = brand_category;
      if (brand_type) query.brand_type = brand_type;
      if (company_id && mongoose.Types.ObjectId.isValid(company_id)) {
        query.company_id = new mongoose.Types.ObjectId(company_id);
      }

      const total = await BrandCreate.countDocuments(query);
      const brands = (await BrandCreate.find(query)
        .populate(
          "company_id",
          "company_id registered_company_name official_email gst_details PAN_number FSSAI_number TDS_rate billing_cycle"
        )
        .populate("warehouse_id", "warehouse_name warehouse_code")
        .populate("verified_by", "email name")
        .populate("createdBy", "email name")
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean()) as unknown as IBrandCreate[];

      return { data: brands, pagination: paginationMeta(page, limit, total) };
    } catch (error) {
      logger.error("Error fetching brands:", error);
      throw error;
    }
  }

  async updateBrandById(
    brandIdentifier: string,
    updateData: IBrandUpdateData,
    updatedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<IBrandCreate | null> {
    try {
      const query = buildBrandQuery(brandIdentifier);
      const currentBrand = await BrandCreate.findOne(query);
      if (!currentBrand) {
        throw new Error(`Brand with identifier ${brandIdentifier} not found`);
      }

      if (updateData.brand_email && updateData.brand_email !== currentBrand.brand_email) {
        const existing = await BrandCreate.findOne({
          brand_email: updateData.brand_email.toLowerCase(),
          _id: { $ne: currentBrand._id },
        });
        if (existing) {
          throw new Error(`Brand with email ${updateData.brand_email} already exists`);
        }
      }

      if (updateData.cin_or_msme_number) {
        const company = await CompanyCreate.findOne({
          cin_or_msme_number: updateData.cin_or_msme_number,
        });
        if (!company) {
          throw new Error(
            `Company with registration number ${updateData.cin_or_msme_number} does not exist`
          );
        }
        updateData.company_id = company._id;
      }

      const updateObj: any = { ...updateData };
      if (updateObj.brand_email) updateObj.brand_email = updateObj.brand_email.toLowerCase();
      if (updateObj.ifsc_code) updateObj.ifsc_code = updateObj.ifsc_code.toUpperCase();

      const updatedBrand = (await BrandCreate.findOneAndUpdate(
        query,
        { $set: updateObj },
        { new: true, runValidators: true }
      )
        .populate(
          "company_id",
          "company_id registered_company_name official_email cin_or_msme_number gst_details PAN_number FSSAI_number TDS_rate billing_cycle"
        )
        .populate("warehouse_id", "warehouse_name warehouse_code")
        .populate("verified_by", "email name")
        .populate("createdBy", "email name")
        .lean()) as unknown as IBrandCreate | null;

      if (!updatedBrand) {
        throw new Error(`Brand with identifier ${brandIdentifier} not found`);
      }

      if (req) {
        await auditTrailService.createAuditRecord({
          user: updatedBy,
          user_email: userEmail,
          user_role: userRole,
          action: "update",
          action_description: `Updated brand: ${currentBrand.brand_name}`,
          target_type: "brand",
          target_brand: currentBrand._id,
          target_brand_name: currentBrand.brand_name,
          target_company: currentBrand.company_id,
          before_state: currentBrand.toObject(),
          after_state: updateData,
          changed_fields: Object.keys(updateData),
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
      }

      logger.info(`Brand updated: ${updatedBrand.brand_name} (Identifier: ${brandIdentifier})`);
      return updatedBrand;
    } catch (error) {
      logger.error(`Error updating brand ${brandIdentifier}:`, error);
      throw error;
    }
  }

  async deleteBrandById(
    brandIdentifier: string,
    deletedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<IBrandCreate | null> {
    try {
      const query = buildBrandQuery(brandIdentifier);
      const brand = (await BrandCreate.findOneAndDelete(query)
        .populate("company_id", "company_id registered_company_name official_email")
        .lean()) as unknown as IBrandCreate | null;

      if (!brand) {
        throw new Error(`Brand with identifier ${brandIdentifier} not found`);
      }

      // Clean up Cloudinary files
      const imageUploadService = new ImageUploadService();
      const publicIds = imageUploadService.extractPublicIdsFromBrand(brand);
      if (publicIds.length > 0) {
        try {
          await imageUploadService.deleteMultipleFiles(publicIds);
          logger.info(`Deleted ${publicIds.length} Cloudinary files for brand ${brandIdentifier}`);
        } catch (cloudinaryError) {
          logger.error(
            `Failed to delete Cloudinary files for brand ${brandIdentifier}:`,
            cloudinaryError
          );
        }
      }

      if (req) {
        await auditTrailService.createAuditRecord({
          user: deletedBy,
          user_email: userEmail,
          user_role: userRole,
          action: "delete",
          action_description: `Deleted brand: ${brand.brand_name}`,
          target_type: "brand",
          target_brand: brand._id,
          target_brand_name: brand.brand_name,
          target_company: brand.company_id,
          before_state: brand,
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
      }

      logger.info(`Brand deleted: ${brand.brand_name} (Identifier: ${brandIdentifier})`);
      return brand;
    } catch (error) {
      logger.error(`Error deleting brand ${brandIdentifier}:`, error);
      throw error;
    }
  }

  async getBrandById(id: string): Promise<IBrandCreate | null> {
    try {
      validateMongoId(id, "Brand ID");
      const brand = (await BrandCreate.findById(id)
        .populate(
          "company_id",
          "company_id registered_company_name official_email cin_or_msme_number gst_details PAN_number FSSAI_number TDS_rate billing_cycle legal_entity_structure"
        )
        .populate("warehouse_id", "warehouse_name warehouse_code")
        .populate("verified_by", "email name")
        .populate("createdBy", "email name")
        .lean()) as unknown as IBrandCreate | null;

      if (!brand) throw new Error("Brand not found");
      return brand;
    } catch (error) {
      logger.error(`Error fetching brand by ID ${id}:`, error);
      throw error;
    }
  }

  async getBrandsByCompanyId(
    companyId: string,
    options: IBrandByCompanyOptions
  ): Promise<{
    data: IBrandCreate[];
    pagination: { page: number; limit: number; total: number; totalPages: number };
  }> {
    try {
      const { page, limit, verification_status } = options;
      const skip = (page - 1) * limit;
      const query: any = {};

      if (mongoose.Types.ObjectId.isValid(companyId)) {
        query.company_id = new mongoose.Types.ObjectId(companyId);
      } else {
        const company = await CompanyCreate.findOne({ company_id: companyId });
        if (!company) throw new Error(`Company with ID ${companyId} not found`);
        query.company_id = company._id;
      }

      if (verification_status) query.verification_status = verification_status;

      const total = await BrandCreate.countDocuments(query);
      const brands = (await BrandCreate.find(query)
        .populate("company_id", "company_id registered_company_name official_email")
        .populate("warehouse_id", "warehouse_name warehouse_code")
        .populate("verified_by", "email name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean()) as unknown as IBrandCreate[];

      return { data: brands, pagination: paginationMeta(page, limit, total) };
    } catch (error) {
      logger.error(`Error fetching brands by company ${companyId}:`, error);
      throw error;
    }
  }

  async getBrandStatistics(): Promise<any> {
    try {
      const [total, pending, verified, rejected, categoryStats, typeStats, recent] =
        await Promise.all([
          BrandCreate.countDocuments(),
          BrandCreate.countDocuments({ verification_status: "pending" }),
          BrandCreate.countDocuments({ verification_status: "verified" }),
          BrandCreate.countDocuments({ verification_status: "rejected" }),
          BrandCreate.aggregate([
            { $group: { _id: "$brand_category", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
          BrandCreate.aggregate([
            { $group: { _id: "$brand_type", count: { $sum: 1 } } },
            { $sort: { count: -1 } },
          ]),
          BrandCreate.countDocuments({
            createdAt: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
          }),
        ]);

      return {
        total,
        pending,
        verified,
        rejected,
        recent,
        byCategory: categoryStats,
        byType: typeStats,
      };
    } catch (error) {
      logger.error("Error fetching brand statistics:", error);
      throw error;
    }
  }

  async exportBrands(format: string, filters: any, userId: Types.ObjectId): Promise<any> {
    try {
      const query: any = {};
      if (filters.verification_status) query.verification_status = filters.verification_status;
      if (filters.brand_category) query.brand_category = filters.brand_category;
      if (filters.brand_type) query.brand_type = filters.brand_type;
      if (filters.company_id && mongoose.Types.ObjectId.isValid(filters.company_id)) {
        query.company_id = new mongoose.Types.ObjectId(filters.company_id);
      }
      if (filters.search) {
        query.$or = [
          { brand_name: { $regex: filters.search, $options: "i" } },
          { brand_billing_name: { $regex: filters.search, $options: "i" } },
          { brand_email: { $regex: filters.search, $options: "i" } },
          { brand_id: { $regex: filters.search, $options: "i" } },
          { contact_name: { $regex: filters.search, $options: "i" } },
        ];
      }

      const brands = await BrandCreate.find(query)
        .populate(
          "company_id",
          "company_id registered_company_name official_email legal_entity_structure gst_details PAN_number FSSAI_number TDS_rate billing_cycle"
        )
        .populate("warehouse_id", "warehouse_name warehouse_code")
        .populate("verified_by", "email name")
        .populate("createdBy", "email name")
        .sort({ createdAt: -1 })
        .lean();

      if (format === "json") return JSON.stringify(brands, null, 2);

      if (format === "csv") {
        const headers = [
          "Brand ID",
          "Brand Name",
          "Brand Billing Name",
          "Brand Email",
          "Brand Category",
          "Brand Type",
          "Registration Type",
          "CIN/MSME Number",
          "Company Name",
          "Company ID",
          "Company Email",
          "Company Legal Entity",
          // Compliance fields surfaced from Company
          "Company GST Details",
          "Company PAN Number",
          "Company FSSAI Number",
          "Company TDS Rate (%)",
          "Company Billing Cycle",
          "Contact Name",
          "Contact Phone",
          "Address",
          "Bank Account",
          "IFSC Code",
          "FSSAI Brand Number",
          "Payment Terms",
          "Brand Status Cycle",
          "Verification Status",
          "Risk Notes",
          "Contract Terms",
          "Contract Start Date",
          "Contract End Date",
          "Contract Renewal Date",
          "Payment Methods",
          "Internal Notes",
          "Verified By",
          "Verified By Email",
          "Created By",
          "Created By Email",
          "Created At",
          "Updated At",
          "Cancelled Cheque URL",
        ];

        const rows = brands.map(b => {
          const d = b as any;
          const dateStr = (v: any) => (v ? new Date(v).toISOString().split("T")[0] : "");

          return [
            d.brand_id || "",
            d.brand_name || "",
            d.brand_billing_name || "",
            d.brand_email || "",
            d.brand_category || "",
            d.brand_type || "",
            d.registration_type || "",
            d.cin_or_msme_number || "",
            d.company_id?.registered_company_name || "",
            d.company_id?.company_id || "",
            d.company_id?.official_email || "",
            d.company_id?.legal_entity_structure || "",
            d.company_id?.gst_details || "",
            d.company_id?.PAN_number || "",
            d.company_id?.FSSAI_number || "",
            String(d.company_id?.TDS_rate ?? ""),
            d.company_id?.billing_cycle || "",
            d.contact_name || "",
            d.contact_phone || "",
            d.address || "",
            d.bank_account_of_brand || "",
            d.ifsc_code || "",
            d.payment_terms || "",
            d.fssai_brand_number || "",
            d.brand_status_cycle || "",
            d.verification_status || "",
            d.risk_notes || "",
            d.contract_terms || "",
            dateStr(d.contract_start_date),
            dateStr(d.contract_end_date),
            dateStr(d.contract_renewal_date),
            d.payment_methods || "",
            d.internal_notes || "",
            d.verified_by?.name || "",
            d.verified_by?.email || "",
            d.createdBy?.name || "",
            d.createdBy?.email || "",
            d.createdAt ? new Date(d.createdAt).toISOString() : "",
            d.updatedAt ? new Date(d.updatedAt).toISOString() : "",
            d.upload_cancelled_cheque_image?.file_url || "",
          ];
        });

        return buildCSV(headers, rows);
      }

      return brands;
    } catch (error) {
      logger.error("Error exporting brands:", error);
      throw error;
    }
  }

  async exportBrandById(
    brandIdentifier: string | Types.ObjectId,
    format: string,
    userId: Types.ObjectId
  ): Promise<any> {
    try {
      const brandIdStr =
        typeof brandIdentifier === "string" ? brandIdentifier : brandIdentifier.toString();

      const populateFields = [
        {
          path: "company_id",
          select:
            "company_id registered_company_name official_email cin_or_msme_number legal_entity_structure registration_type date_of_incorporation registered_office_address gst_details PAN_number FSSAI_number TDS_rate billing_cycle",
        },
        {
          path: "warehouse_id",
          select: "warehouse_name warehouse_code address contact_person contact_phone",
        },
        { path: "verified_by", select: "email name role department" },
        { path: "createdBy", select: "email name role department" },
      ];

      let brand;
      if (mongoose.Types.ObjectId.isValid(brandIdStr) && brandIdStr.length === 24) {
        brand = await BrandCreate.findById(
          typeof brandIdentifier === "string"
            ? new Types.ObjectId(brandIdentifier)
            : brandIdentifier
        )
          .populate(populateFields)
          .lean();
      } else {
        brand = await BrandCreate.findOne({ brand_id: brandIdStr }).populate(populateFields).lean();
      }

      if (!brand) throw new Error(`Brand with identifier ${brandIdStr} not found`);

      if (format === "json") return JSON.stringify(brand, null, 2);

      if (format === "csv") {
        const d = brand as any;
        const dateStr = (v: any) => (v ? new Date(v).toISOString().split("T")[0] : "");

        const rows: [string, string][] = [
          ["FIELD", "VALUE"],
          ["Brand Information", ""],
          ["Brand ID", d.brand_id || ""],
          ["Brand Name", d.brand_name || ""],
          ["Brand Billing Name", d.brand_billing_name || ""],
          ["Brand Email", d.brand_email || ""],
          ["Brand Category", d.brand_category || ""],
          ["Brand Type", d.brand_type || ""],
          ["Registration Type", d.registration_type || ""],
          ["CIN/MSME Number", d.cin_or_msme_number || ""],
          ["", ""],
          ["Company Information", ""],
          ["Company Name", d.company_id?.registered_company_name || ""],
          ["Company ID", d.company_id?.company_id || ""],
          ["Company Email", d.company_id?.official_email || ""],
          ["Company Legal Entity", d.company_id?.legal_entity_structure || ""],
          ["Company Registration Type", d.company_id?.registration_type || ""],
          ["Date of Incorporation", dateStr(d.company_id?.date_of_incorporation)],
          ["Company Address", d.company_id?.registered_office_address || ""],
          ["", ""],
          ["Compliance (from Company)", ""],
          ["GST Details", d.company_id?.gst_details || ""],
          ["PAN Number", d.company_id?.PAN_number || ""],
          ["FSSAI Number", d.company_id?.FSSAI_number || ""],
          ["TDS Rate (%)", String(d.company_id?.TDS_rate ?? "")],
          ["Billing Cycle", d.company_id?.billing_cycle || ""],
          ["", ""],
          ["Contact Information", ""],
          ["Contact Name", d.contact_name || ""],
          ["Contact Phone", d.contact_phone || ""],
          ["Brand Address", d.address || ""],
          ["", ""],
          ["Financial Information", ""],
          ["Bank Account", d.bank_account_of_brand || ""],
          ["IFSC Code", d.ifsc_code || ""],
          ["Payment Terms", d.payment_terms || ""],
          ["Brand Status Cycle", d.brand_status_cycle || ""],
          ["Payment Methods", d.payment_methods || ""],
          ["", ""],
          ["Contract Information", ""],
          ["Contract Start Date", dateStr(d.contract_start_date)],
          ["Contract End Date", dateStr(d.contract_end_date)],
          ["Contract Renewal Date", dateStr(d.contract_renewal_date)],
          ["Contract Terms", d.contract_terms || ""],
          ["", ""],
          ["Status & Verification", ""],
          ["Verification Status", d.verification_status || ""],
          ["Risk Notes", d.risk_notes || ""],
          ["Internal Notes", d.internal_notes || ""],
          ["Verified By", d.verified_by?.name || ""],
          ["Verified By Email", d.verified_by?.email || ""],
          ["", ""],
          ["Document URLs", ""],
          ["Cancelled Cheque", d.upload_cancelled_cheque_image?.file_url || ""],

          ["System Information", ""],
          ["Created By", d.createdBy?.name || ""],
          ["Created By Email", d.createdBy?.email || ""],
          ["Created At", d.createdAt ? new Date(d.createdAt).toISOString() : ""],
          ["Updated At", d.updatedAt ? new Date(d.updatedAt).toISOString() : ""],
        ];

        return rows.map(row => row.map(escapeCSVCell).join(",")).join("\n");
      }

      if (format === "pdf") {
        return this.generateBrandPDF(brand);
      }

      return brand;
    } catch (error) {
      logger.error(`Error exporting brand ${brandIdentifier}:`, error);
      throw error;
    }
  }
  async bulkUpdateBrandVerificationStatus(
    brandIds: string[],
    verification_status: "pending" | "verified" | "rejected",
    risk_notes: string,
    updatedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<{ updated: number; failed: string[] }> {
    const failed: string[] = [];
    let updated = 0;

    // Determine action based on verification status
    let action: string;
    if (verification_status === "verified") {
      action = "verify";
    } else if (verification_status === "rejected") {
      action = "reject";
    } else {
      action = "status_change";
    }

    for (const brandId of brandIds) {
      try {
        const updateData: any = {
          verification_status,
          risk_notes,
          ...(verification_status === "verified" ? { verified_by: updatedBy } : {}),
        };

        const query = buildBrandQuery(brandId);
        const currentBrand = await BrandCreate.findOne(query);
        if (!currentBrand) {
          failed.push(brandId);
          continue;
        }

        await BrandCreate.findOneAndUpdate(
          query,
          { $set: updateData },
          { new: true, runValidators: true }
        );

        if (req) {
          try {
            // Build action description based on verification status
            let actionDescription: string;
            if (verification_status === "verified") {
              actionDescription = `Verified brand: ${currentBrand.brand_name}`;
            } else if (verification_status === "rejected") {
              actionDescription = `Rejected brand verification: ${currentBrand.brand_name}`;
            } else {
              actionDescription = `Changed brand verification status from ${currentBrand.verification_status} to ${verification_status}: ${currentBrand.brand_name}`;
            }

            await auditTrailService.createAuditRecord({
              user: updatedBy,
              user_email: userEmail,
              user_role: userRole,
              action: action,
              action_description: risk_notes
                ? `${actionDescription}. Notes: ${risk_notes}`
                : actionDescription,
              target_type: "brand",
              target_brand: currentBrand._id,
              target_brand_name: currentBrand.brand_name,
              target_brand_id: currentBrand.brand_id,
              target_company: currentBrand.company_id,
              before_state: { verification_status: currentBrand.verification_status },
              after_state: { verification_status, risk_notes: risk_notes || undefined },
              changed_fields: ["verification_status", risk_notes ? "risk_notes" : null].filter(
                Boolean
              ),
              ip_address: req.ip,
              user_agent: req.get("User-Agent"),
            });
          } catch (auditError) {
            logger.error("Error creating audit record:", auditError);
            // Don't throw - the update was successful, just log the audit failure
          }
        }

        updated++;
      } catch (error) {
        failed.push(brandId);
        logger.error(`Failed to update brand ${brandId}:`, error);
      }
    }

    return { updated, failed };
  }
  async updateBrandStatus(
    brandIdentifier: string,
    brand_status: "active" | "inactive",
    updatedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<IBrandCreate | null> {
    try {
      const query = buildBrandQuery(brandIdentifier);
      const currentBrand = await BrandCreate.findOne(query);
      if (!currentBrand) {
        throw new Error(`Brand with identifier ${brandIdentifier} not found`);
      }

      const updatedBrand = (await BrandCreate.findOneAndUpdate(
        query,
        { $set: { brand_status } },
        { new: true, runValidators: true }
      )
        .populate("company_id", "company_id registered_company_name official_email")
        .populate("warehouse_id", "warehouse_name warehouse_code")
        .populate("verified_by", "email name")
        .populate("createdBy", "email name")
        .lean()) as unknown as IBrandCreate | null;

      if (!updatedBrand) {
        throw new Error(`Brand with identifier ${brandIdentifier} not found`);
      }

      if (req) {
        try {
          await auditTrailService.createAuditRecord({
            user: updatedBy,
            user_email: userEmail,
            user_role: userRole,
            action: "update",
            action_description: `Updated brand status from ${currentBrand.brand_status} to ${brand_status}: ${currentBrand.brand_name}`,
            target_type: "brand",
            target_brand: currentBrand._id,
            target_brand_name: currentBrand.brand_name,
            target_company: currentBrand.company_id,
            before_state: { brand_status: currentBrand.brand_status },
            after_state: { brand_status },
            changed_fields: ["brand_status"],
            ip_address: req.ip,
            user_agent: req.get("User-Agent"),
          });
        } catch (auditError) {
          logger.error("Failed to create audit trail:", auditError);
        }
      }

      return updatedBrand;
    } catch (error) {
      logger.error(`Error updating brand status ${brandIdentifier}:`, error);
      throw error;
    }
  }

  private async generateBrandPDF(brand: any): Promise<Buffer> {
    try {
      const doc = new PDFDocument();
      const buffers: Buffer[] = [];
      doc.on("data", buffers.push.bind(buffers));

      doc.fontSize(16).text("Brand Export Report", { align: "center" });
      doc.moveDown();

      doc.fontSize(14).text("Brand Information:");
      doc.fontSize(12).text(`Brand ID: ${brand.brand_id || "N/A"}`);
      doc.text(`Brand Name: ${brand.brand_name || "N/A"}`);
      doc.text(`Brand Email: ${brand.brand_email || "N/A"}`);
      doc.moveDown();

      if (brand.company_id) {
        doc.fontSize(14).text("Company Information:");
        doc.fontSize(12).text(`Company Name: ${brand.company_id.registered_company_name || "N/A"}`);
        doc.text(`Company ID: ${brand.company_id.company_id || "N/A"}`);
        doc.text(`Official Email: ${brand.company_id.official_email || "N/A"}`);
        doc.moveDown();
        doc.fontSize(14).text("Compliance (from Company):");
        doc.fontSize(12).text(`GST Details: ${brand.company_id.gst_details || "N/A"}`);
        doc.text(`PAN Number: ${brand.company_id.PAN_number || "N/A"}`);
        doc.text(`FSSAI Number: ${brand.company_id.FSSAI_number || "N/A"}`);
        doc.moveDown();
      }

      doc.fontSize(14).text("Contact Information:");
      doc.fontSize(12).text(`Contact Name: ${brand.contact_name || "N/A"}`);
      doc.text(`Contact Phone: ${brand.contact_phone || "N/A"}`);
      doc.text(`Address: ${brand.address || "N/A"}`);
      doc.moveDown();

      doc.fontSize(14).text("Financial Information:");
      doc.fontSize(12).text(`Bank Account: ${brand.bank_account_of_brand || "N/A"}`);
      doc.text(`IFSC Code: ${brand.ifsc_code || "N/A"}`);
      doc.moveDown();

      doc.fontSize(14).text("Status Information:");
      doc.fontSize(12).text(`Verification Status: ${brand.verification_status || "N/A"}`);
      doc.text(
        `Created At: ${brand.createdAt ? new Date(brand.createdAt).toLocaleString() : "N/A"}`
      );
      doc.text(
        `Updated At: ${brand.updatedAt ? new Date(brand.updatedAt).toLocaleString() : "N/A"}`
      );

      doc.end();

      return new Promise((resolve, reject) => {
        doc.on("end", () => resolve(Buffer.concat(buffers)));
        doc.on("error", reject);
      });
    } catch (error) {
      logger.error("Error generating PDF:", error);
      throw new Error("Failed to generate PDF");
    }
  }
}
