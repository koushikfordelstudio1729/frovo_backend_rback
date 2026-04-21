import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { CompanyService, BrandService } from "../services/vendor.service";
import { AuditTrailService } from "../services/auditTrail.service";
import { CompanyCreate, BrandCreate } from "../models/Vendor.model";
import { logger } from "../utils/logger.util";
import { ImageUploadService, DocumentType } from "../services/vendorFileUpload.service";
import {
  validateMongoId,
  validateEmail,
  validateMissingFields,
  validateEnumValue,
  validateLegalEntityRelationship,
  parseDateNotFuture,
  parseDate,
  handleControllerError,
  setExportHeaders,
  requireRole,
  getRequiredDocumentsForLegalEntity,
  getRequiredDocumentForCancelledCheque,
  getRequiredCompanyDocumentsForLegalEntity,
  normalizeBody,
  ValidationError,
  VALID_LEGAL_STRUCTURES,
  VALID_REGISTRATION_TYPES,
  VALID_PAYMENT_METHODS,
  VALID_VERIFICATION_STATUSES,
  VALID_COMPANY_STATUSES,
  VALID_BRAND_STATUSES,
  CIN_REQUIRED_STRUCTURES,
  DOCUMENT_TYPE_MAPPING,
  UPDATABLE_DOCUMENT_FIELDS,
} from "../utils/vendor.helpers";

const auditTrailService = new AuditTrailService();
const companyService = new CompanyService();
const brandService = new BrandService();

export class VendorController {
  private static getLoggedInUser(req: Request): {
    _id: Types.ObjectId;
    roles: any[];
    email: string;
  } {
    const user = (req as any).user;
    if (!user || !user._id) {
      throw new Error("User authentication required");
    }
    return {
      _id: user._id,
      roles: user.roles || [],
      email: user.email || "",
    };
  }
  public static async createCompany(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      // Trim all string values
      const trimmedBody = normalizeBody(req.body);

      const {
        registered_company_name,
        registered_office_address,
        official_email,
        legal_entity_structure,
        registration_type,
        cin_or_msme_number,
        date_of_incorporation,
        corporate_website,
        directory_signature_name,
        din,
        gst_details,
        PAN_number,
        FSSAI_number,
        TDS_rate,
        billing_cycle,
      } = trimmedBody;

      // Validate that we have the required text fields
      if (!legal_entity_structure) {
        throw new ValidationError(
          "legal_entity_structure is required. Make sure you're sending it as a form field (not JSON)"
        );
      }

      validateEnumValue(legal_entity_structure, VALID_LEGAL_STRUCTURES, "legal_entity_structure");
      validateEnumValue(registration_type, VALID_REGISTRATION_TYPES, "registration_type");
      validateLegalEntityRelationship(legal_entity_structure, registration_type);

      if (CIN_REQUIRED_STRUCTURES.includes(legal_entity_structure) && (!din || din === "")) {
        throw new ValidationError(
          `DIN is required for legal entity structure '${legal_entity_structure}'`
        );
      }

      validateEmail(official_email);

      // Validate PAN format
      if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(PAN_number?.toUpperCase() || "")) {
        throw new ValidationError("Invalid PAN number format. Expected format: ABCDE1234F");
      }

      // Validate GST format
      if (
        !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(
          gst_details?.toUpperCase() || ""
        )
      ) {
        throw new ValidationError("Invalid GST number format. Expected format: 22AAAAA0000A1Z5");
      }

      // Validate TDS rate
      const tdsRateNum = Number(TDS_rate);
      if (isNaN(tdsRateNum) || tdsRateNum < 0 || tdsRateNum > 100) {
        throw new ValidationError("TDS rate must be between 0 and 100");
      }

      const parsedDate = parseDateNotFuture(date_of_incorporation, "Date of incorporation");

      // Check for files
      if (!req.files || Object.keys(req.files).length === 0) {
        throw new ValidationError("No files uploaded. Required documents are missing.");
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };

      // Get allowed documents for this legal entity structure
      const allowedDocuments = getRequiredCompanyDocumentsForLegalEntity(legal_entity_structure);
      const uploadedFileNames = Object.keys(files);

      // Check for unauthorized document uploads
      const unauthorizedDocuments = uploadedFileNames.filter(
        fieldName => !allowedDocuments.includes(fieldName)
      );

      if (unauthorizedDocuments.length > 0) {
        throw new ValidationError(
          `Cannot upload documents that are not required for '${legal_entity_structure}' legal entity. ` +
            `Unauthorized documents: ${unauthorizedDocuments.join(", ")}. ` +
            `Allowed documents: ${allowedDocuments.join(", ")}`
        );
      }

      // Check for missing required documents
      const missingDocuments = allowedDocuments.filter(
        doc => !uploadedFileNames.includes(doc) || !files[doc]?.[0]
      );

      if (missingDocuments.length > 0) {
        throw new ValidationError(
          `Missing required documents for '${legal_entity_structure}': ${missingDocuments.join(", ")}`
        );
      }

      const imageUploadService = new ImageUploadService();
      const processedFiles: Record<string, any> = {};
      const folderPath = registered_company_name.replace(/[^a-zA-Z0-9]/g, "_");

      // Only process allowed documents
      for (const fieldName of allowedDocuments) {
        const fileArray = files[fieldName];
        if (fileArray && fileArray.length > 0) {
          const documentType = DOCUMENT_TYPE_MAPPING[fieldName];
          if (documentType) {
            try {
              processedFiles[fieldName] = await imageUploadService.uploadDocument(
                fileArray[0],
                documentType as DocumentType,
                folderPath
              );
            } catch (uploadError: any) {
              logger.error(`Failed to upload ${fieldName}:`, uploadError);
              await VendorController.cleanupUploadedFiles(processedFiles, imageUploadService);
              throw new Error(`Failed to upload ${fieldName}: ${uploadError.message}`);
            }
          }
        }
      }

      const newCompany = await companyService.createCompany(
        {
          registered_company_name,
          registered_office_address,
          official_email: official_email.toLowerCase(),
          legal_entity_structure,
          registration_type,
          cin_or_msme_number,
          date_of_incorporation: parsedDate,
          corporate_website,
          directory_signature_name,
          din,
          company_status: "active",
          gst_details: gst_details.toUpperCase(),
          PAN_number: PAN_number.toUpperCase(),
          FSSAI_number,
          TDS_rate: tdsRateNum,
          billing_cycle,
          ...processedFiles,
        },
        userId,
        userEmail,
        userRole,
        req
      );

      res.status(201).json({
        success: true,
        message: "Company created successfully",
        data: newCompany,
      });
    } catch (error) {
      // Clean up any uploaded files if there's an error
      if (req.files) {
        try {
          const imageUploadService = new ImageUploadService();
          const files = req.files as { [fieldname: string]: Express.Multer.File[] };
          const processedFiles: Record<string, any> = {};

          for (const fieldName of Object.keys(files)) {
            if (processedFiles[fieldName]) {
              await VendorController.cleanupUploadedFiles(processedFiles, imageUploadService);
              break;
            }
          }
        } catch (cleanupError) {
          logger.error("Error during cleanup:", cleanupError);
        }
      }
      handleControllerError(res, error, "creating company");
    }
  }

  public static async getAllCompanies(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
        company_status,
        registration_type,
        legal_entity_structure,
      } = req.query;

      const result = await companyService.getAllCompanies({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
        company_status: company_status as string,
        registration_type: registration_type as string,
        legal_entity_structure: legal_entity_structure as string,
      });

      res.status(200).json({
        success: true,
        message: "Companies retrieved successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      handleControllerError(res, error, "fetching companies");
    }
  }

  public static async getCompanyById(req: Request, res: Response): Promise<void> {
    try {
      validateMongoId(req.params.id, "Company ID");
      const company = await companyService.getCompanyById(req.params.id);

      res.status(200).json({
        success: true,
        message: "Company retrieved successfully",
        data: company,
      });
    } catch (error) {
      handleControllerError(res, error, "fetching company");
    }
  }

  public static async updateCompany(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";
      const { id } = req.params;
      const updateData = req.body;

      validateMongoId(id, "Company ID");

      if (updateData.legal_entity_structure) {
        validateEnumValue(
          updateData.legal_entity_structure,
          VALID_LEGAL_STRUCTURES,
          "legal_entity_structure"
        );
      }

      if (updateData.registration_type) {
        validateEnumValue(
          updateData.registration_type,
          VALID_REGISTRATION_TYPES,
          "registration_type"
        );
      }

      let currentCompany: any = null;
      try {
        currentCompany = await companyService.getCompanyById(id);
      } catch (_) {
        // will be caught during update
      }

      validateLegalEntityRelationship(
        updateData.legal_entity_structure,
        updateData.registration_type,
        currentCompany
      );

      if (updateData.official_email) {
        validateEmail(updateData.official_email);
        updateData.official_email = updateData.official_email.toLowerCase();
      }

      if (updateData.date_of_incorporation) {
        updateData.date_of_incorporation = parseDateNotFuture(
          updateData.date_of_incorporation,
          "Date of incorporation"
        );
      }

      if (updateData.PAN_number) {
        if (!/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(updateData.PAN_number.toUpperCase())) {
          throw new ValidationError("Invalid PAN number format. Expected format: ABCDE1234F");
        }
        updateData.PAN_number = updateData.PAN_number.toUpperCase();
      }

      if (updateData.gst_details) {
        if (
          !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}[Z]{1}[0-9A-Z]{1}$/.test(
            updateData.gst_details.toUpperCase()
          )
        ) {
          throw new ValidationError("Invalid GST number format");
        }
        updateData.gst_details = updateData.gst_details.toUpperCase();
      }

      if (updateData.TDS_rate !== undefined) {
        const tdsRateNum = Number(updateData.TDS_rate);
        if (isNaN(tdsRateNum) || tdsRateNum < 0 || tdsRateNum > 100) {
          throw new ValidationError("TDS rate must be between 0 and 100");
        }
        updateData.TDS_rate = tdsRateNum;
      }

      // Handle file uploads for update
      if (req.files) {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const imageUploadService = new ImageUploadService();

        for (const fieldName of UPDATABLE_DOCUMENT_FIELDS) {
          if (files[fieldName]?.[0]) {
            const documentType = DOCUMENT_TYPE_MAPPING[fieldName];
            if (documentType) {
              updateData[fieldName] = await imageUploadService.uploadDocument(
                files[fieldName][0],
                documentType as DocumentType,
                currentCompany?.registered_company_name || `companies/${id}`
              );
            }
          }
        }
      }

      const updatedCompany = await companyService.updateCompany(
        id,
        updateData,
        userId,
        userEmail,
        userRole,
        req
      );

      if (!updatedCompany) {
        throw new Error("Company not found");
      }

      res.status(200).json({
        success: true,
        message: "Company updated successfully",
        data: updatedCompany,
      });
    } catch (error) {
      handleControllerError(res, error, "updating company");
    }
  }

  public static async deleteCompany(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      validateMongoId(req.params.id, "Company ID");

      const deletedCompany = await companyService.deleteCompany(
        req.params.id,
        userId,
        userEmail,
        userRole,
        req
      );

      res.status(200).json({
        success: true,
        message: "Company deleted successfully",
        data: deletedCompany,
      });
    } catch (error) {
      handleControllerError(res, error, "deleting company");
    }
  }

  public static async getCompanyStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await companyService.getCompanyStatistics();
      res.status(200).json({
        success: true,
        message: "Company statistics retrieved successfully",
        data: statistics,
      });
    } catch (error) {
      handleControllerError(res, error, "fetching company statistics");
    }
  }

  public static async getAllCompanyAuditTrails(req: Request, res: Response): Promise<void> {
    try {
      const { roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      requireRole(
        userRole,
        ["super_admin", "vendor_admin", "vendor_staff"],
        "view all company audit trails"
      );

      const { page = 1, limit = 50, company_id, action, date_from, date_to } = req.query;

      const auditData = await auditTrailService.getAuditTrails({
        page: Number(page),
        limit: Number(limit),
        target_type: "company",
        target_company: company_id as string,
        action: action as string,
        date_from: date_from as string,
        date_to: date_to as string,
      });

      res.status(200).json({
        success: true,
        message: "All company audit trails retrieved successfully",
        data: auditData,
      });
    } catch (error) {
      handleControllerError(res, error, "fetching all company audit trails");
    }
  }

  public static async exportCompanies(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      requireRole(userRole, ["super_admin", "vendor_admin"], "export companies");

      const { format = "csv", filters } = req.query;
      const filterData = filters ? JSON.parse(filters as string) : {};
      const exportData = await companyService.exportCompanies(format as string, filterData, userId);

      setExportHeaders(res, format as string, "companies");
      res.status(200).send(exportData);
    } catch (error) {
      handleControllerError(res, error, "exporting companies");
    }
  }

  public static async getCompanyAuditTrail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50, format = "json" } = req.query;

      validateMongoId(id, "Company ID");

      if (format && !["json", "csv"].includes(format as string)) {
        throw new ValidationError("Invalid format. Must be 'json' or 'csv'");
      }

      const company = await companyService.getCompanyById(id);
      if (!company) {
        throw new Error("Company not found");
      }

      const auditData = await auditTrailService.getCompanyAuditTrails(
        id,
        Number(page),
        Number(limit)
      );

      if (format === "csv") {
        const csvContent = VendorController.convertAuditTrailToCSV(auditData);
        setExportHeaders(res, "csv", `company_audit_${company.company_id}`);
        res.status(200).send(csvContent);
        return;
      }

      res.status(200).json({
        success: true,
        message: "Company audit trail retrieved successfully",
        data: auditData,
      });
    } catch (error) {
      handleControllerError(res, error, "fetching company audit trail");
    }
  }

  public static async exportCompanyById(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      requireRole(userRole, ["super_admin", "vendor_admin"], "export company data");

      const { id } = req.params;
      const { format = "csv" } = req.query;

      validateMongoId(id, "Company ID");
      validateEnumValue(format as string, ["csv", "json"], "format");

      const exportData = await companyService.exportCompanyById(id, format as string, userId);
      const company = await companyService.getCompanyById(id);

      setExportHeaders(res, format as string, `company_${company?.company_id || id}`);
      res.status(200).send(exportData);
    } catch (error) {
      handleControllerError(res, error, "exporting company by ID");
    }
  }

  public static async updateCompanyVerificationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      requireRole(userRole, ["super_admin", "vendor_admin"], "update company verification status");

      const { id } = req.params;
      const { verification_status, risk_notes } = req.body;

      validateMongoId(id, "Company ID");
      validateEnumValue(verification_status, VALID_VERIFICATION_STATUSES, "verification_status");

      const updatedCompany = await companyService.updateCompanyVerificationStatus(
        id,
        verification_status,
        risk_notes || "",
        userId,
        userEmail,
        userRole,
        req
      );

      if (!updatedCompany) {
        throw new Error("Company not found");
      }

      res.status(200).json({
        success: true,
        message: `Company verification status updated to ${verification_status} successfully`,
        data: updatedCompany,
      });
    } catch (error) {
      handleControllerError(res, error, "updating company verification status");
    }
  }

  public static async updateCompanyStatus(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      requireRole(userRole, ["super_admin", "vendor_admin"], "update company status");

      const { id } = req.params;
      const { company_status, risk_notes } = req.body;

      validateMongoId(id, "Company ID");
      validateEnumValue(company_status, VALID_COMPANY_STATUSES, "company_status");

      const updatedCompany = await companyService.updateCompanyStatus(
        id,
        company_status,
        risk_notes || "",
        userId,
        userEmail,
        userRole,
        req
      );

      if (!updatedCompany) {
        throw new Error("Company not found");
      }

      res.status(200).json({
        success: true,
        message: `Company status updated to ${company_status} successfully`,
        data: updatedCompany,
      });
    } catch (error) {
      handleControllerError(res, error, "updating company status");
    }
  }

  public static async bulkUpdateCompanyVerification(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      requireRole(userRole, ["super_admin", "vendor_admin"], "bulk update company verification");

      const { company_ids, verification_status, risk_notes } = req.body;

      if (!company_ids || !Array.isArray(company_ids) || company_ids.length === 0) {
        throw new ValidationError("company_ids must be a non-empty array");
      }

      validateEnumValue(verification_status, VALID_VERIFICATION_STATUSES, "verification_status");

      const result = await companyService.bulkUpdateCompanyVerificationStatus(
        company_ids,
        verification_status,
        risk_notes || "",
        userId,
        userEmail,
        userRole,
        req
      );

      res.status(200).json({
        success: true,
        message: `Bulk company verification update completed. ${result.updated} updated, ${result.failed.length} failed.`,
        data: result,
      });
    } catch (error) {
      handleControllerError(res, error, "bulk company verification update");
    }
  }

  public static async createBrand(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      validateMissingFields(req.body, [
        "registration_type",
        "cin_or_msme_number",
        "company_id",
        "brand_billing_name",
        "brand_name",
        "brand_email",
        "brand_category",
        "brand_type",
        "contact_name",
        "contact_phone",
        "address",
        "bank_account_of_brand",
        "ifsc_code",
        "payment_terms",
        "brand_status_cycle",
        "contract_start_date",
        "contract_end_date",
        "contract_renewal_date",
        "payment_methods",
      ]);

      const {
        registration_type,
        cin_or_msme_number,
        company_id,
        brand_billing_name,
        brand_name,
        brand_email,
        brand_category,
        brand_type,
        contact_name,
        contact_phone,
        address,
        bank_account_of_brand,
        ifsc_code,
        payment_terms,
        brand_status_cycle,
        contract_start_date,
        contract_end_date,
        contract_renewal_date,
        payment_methods,
        warehouse_id,
        risk_notes,
        contract_terms,
        internal_notes,
      } = req.body;

      validateEnumValue(registration_type, VALID_REGISTRATION_TYPES, "registration_type");
      validateEnumValue(payment_methods, VALID_PAYMENT_METHODS, "payment_methods");
      validateEmail(brand_email);

      // ── Validate dates ────────────────────────────────────────────────────
      const parsedContractStartDate = parseDate(contract_start_date, "contract_start_date");
      const parsedContractEndDate = parseDate(contract_end_date, "contract_end_date");
      const parsedContractRenewalDate = parseDate(contract_renewal_date, "contract_renewal_date");

      if (parsedContractStartDate >= parsedContractEndDate) {
        throw new ValidationError("Contract start date must be before contract end date");
      }
      if (parsedContractRenewalDate < parsedContractEndDate) {
        throw new ValidationError("Contract renewal date must be on or after contract end date");
      }

      // ── Resolve and validate company ──────────────────────────────────────
      let company;
      if (mongoose.Types.ObjectId.isValid(company_id) && company_id.length === 24) {
        company = await CompanyCreate.findById(company_id);
      }
      if (!company) {
        company = await CompanyCreate.findOne({ company_id });
      }
      if (!company) {
        throw new Error(`Company with ID ${company_id} not found`);
      }

      if (company.registration_type !== registration_type) {
        throw new ValidationError(
          `Registration type mismatch. Company is registered as '${company.registration_type}' but brand is being created as '${registration_type}'`
        );
      }

      if (company.cin_or_msme_number !== cin_or_msme_number) {
        throw new ValidationError(
          "CIN/MSME number does not match the company's registration number"
        );
      }

      const files = req.files as { [fieldname: string]: Express.Multer.File[] };
      const uploadedFiles = Object.keys(files);
      const requiredDocuments = getRequiredDocumentForCancelledCheque();
      const missingDocuments = requiredDocuments.filter(
        doc => !uploadedFiles.includes(doc) || !files[doc]?.[0]
      );

      // ── Upload files to Cloudinary ────────────────────────────────────────
      const imageUploadService = new ImageUploadService();
      const processedFiles: Record<string, any> = {};

      for (const fieldName of uploadedFiles) {
        const fileArray = files[fieldName];
        if (fileArray && fileArray.length > 0) {
          const documentType = DOCUMENT_TYPE_MAPPING[fieldName];
          if (documentType) {
            try {
              processedFiles[fieldName] = await imageUploadService.uploadDocument(
                fileArray[0],
                documentType as DocumentType,
                `${company.registered_company_name}/${brand_name}`
              );
            } catch (uploadError: any) {
              logger.error(`Failed to upload ${fieldName}:`, uploadError);
              await VendorController.cleanupUploadedFiles(processedFiles, imageUploadService);
              throw new Error(`Failed to upload ${fieldName}: ${uploadError.message}`);
            }
          }
        }
      }

      // ── Build brand data (NO compliance fields) ───────────────────────────
      const brandData: any = {
        registration_type,
        cin_or_msme_number,
        company_id: company._id,
        brand_billing_name,
        brand_name,
        brand_email: brand_email.toLowerCase(),
        brand_category,
        brand_type,
        contact_name,
        contact_phone,
        address,
        bank_account_of_brand,
        ifsc_code: ifsc_code.toUpperCase(),
        payment_terms,
        brand_status_cycle,
        brand_status: "active",
        verification_status: "pending",
        risk_notes: risk_notes || "",
        contract_terms: contract_terms || "",
        contract_start_date: parsedContractStartDate,
        contract_end_date: parsedContractEndDate,
        contract_renewal_date: parsedContractRenewalDate,
        payment_methods,
        internal_notes: internal_notes || "",
        createdBy: userId,
        ...(warehouse_id && { warehouse_id: new mongoose.Types.ObjectId(warehouse_id) }),
        ...processedFiles,
      };

      const newBrand = await brandService.createBrand(brandData, userId, userEmail, userRole, req);

      res.status(201).json({
        success: true,
        message: "Brand created successfully",
        data: newBrand,
      });
    } catch (error) {
      handleControllerError(res, error, "creating brand");
    }
  }

  private static async cleanupUploadedFiles(
    files: Record<string, any>,
    imageUploadService: ImageUploadService
  ): Promise<void> {
    try {
      const publicIds = Object.values(files)
        .filter(file => file && file.cloudinary_public_id)
        .map(file => file.cloudinary_public_id);
      if (publicIds.length > 0) {
        await imageUploadService.deleteMultipleFiles(publicIds);
        logger.info(`Cleaned up ${publicIds.length} uploaded files`);
      }
    } catch (cleanupError) {
      logger.error("Error during file cleanup:", cleanupError);
    }
  }

  public static async getAllBrands(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sortBy = "createdAt",
        sortOrder = "desc",
        verification_status,
        brand_category,
        brand_type,
        company_id,
      } = req.query;

      const result = await brandService.getAllBrands({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as "asc" | "desc",
        verification_status: verification_status as string,
        brand_category: brand_category as string,
        brand_type: brand_type as string,
        company_id: company_id as string,
      });

      res.status(200).json({
        success: true,
        message: "Brands retrieved successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      handleControllerError(res, error, "fetching brands");
    }
  }

  public static async getBrandById(req: Request, res: Response): Promise<void> {
    try {
      validateMongoId(req.params.id, "Brand ID");
      const brand = await brandService.getBrandById(req.params.id);

      res.status(200).json({
        success: true,
        message: "Brand retrieved successfully",
        data: brand,
      });
    } catch (error) {
      handleControllerError(res, error, "fetching brand");
    }
  }

  public static async updateBrand(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";
      const { id } = req.params;
      const updateData = req.body;

      if (!id || id.trim() === "") {
        throw new ValidationError("Brand ID is required");
      }

      if (updateData.payment_methods) {
        validateEnumValue(updateData.payment_methods, VALID_PAYMENT_METHODS, "payment_methods");
      }

      if (updateData.registration_type) {
        validateEnumValue(
          updateData.registration_type,
          VALID_REGISTRATION_TYPES,
          "registration_type"
        );
      }

      if (updateData.brand_email) {
        validateEmail(updateData.brand_email);
        updateData.brand_email = updateData.brand_email.toLowerCase();
      }

      if (updateData.TDS_rate !== undefined) {
        const tdsRateNum = Number(updateData.TDS_rate);
        if (isNaN(tdsRateNum) || tdsRateNum < 0 || tdsRateNum > 100) {
          throw new ValidationError("TDS rate must be a number between 0 and 100");
        }
        updateData.TDS_rate = tdsRateNum;
      }

      // Handle date parsing
      const dateFields = ["contract_start_date", "contract_end_date", "contract_renewal_date"];
      for (const field of dateFields) {
        if (updateData[field]) {
          updateData[field] = parseDate(updateData[field], field);
        }
      }

      if (updateData.contract_start_date && updateData.contract_end_date) {
        if (updateData.contract_start_date >= updateData.contract_end_date) {
          throw new ValidationError("Contract start date must be before contract end date");
        }
      }

      if (updateData.contract_renewal_date && updateData.contract_end_date) {
        if (updateData.contract_renewal_date < updateData.contract_end_date) {
          throw new ValidationError("Contract renewal date must be on or after contract end date");
        }
      }

      if (updateData.ifsc_code) updateData.ifsc_code = updateData.ifsc_code.toUpperCase();

      // Handle file uploads — brand does NOT accept compliance image updates here
      if (req.files) {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };
        const imageUploadService = new ImageUploadService();

        // Exclude compliance-only fields (gst_certificate_image, PAN_image, FSSAI_image)
        // from brand updates
        const brandUpdatableFields = UPDATABLE_DOCUMENT_FIELDS.filter(
          f => f !== "gst_certificate_image" && f !== "PAN_image" && f !== "FSSAI_image"
        );

        for (const fieldName of brandUpdatableFields) {
          if (files[fieldName]?.[0]) {
            const documentType = DOCUMENT_TYPE_MAPPING[fieldName];
            if (documentType) {
              let currentBrand;
              if (mongoose.Types.ObjectId.isValid(id) && id.length === 24) {
                currentBrand = await BrandCreate.findById(id);
              } else {
                currentBrand = await BrandCreate.findOne({ brand_id: id });
              }

              let folderPath: string | undefined;
              if (currentBrand) {
                const company = await CompanyCreate.findById(currentBrand.company_id);
                folderPath = company
                  ? `${company.registered_company_name}/${currentBrand.brand_name}`
                  : `brands/${currentBrand.brand_id}`;
              }

              updateData[fieldName] = await imageUploadService.uploadDocument(
                files[fieldName][0],
                documentType as DocumentType,
                folderPath
              );
            }
          }
        }
      }

      const updatedBrand = await brandService.updateBrandById(
        id,
        updateData,
        userId,
        userEmail,
        userRole,
        req
      );

      if (!updatedBrand) {
        throw new Error("Brand not found");
      }

      res.status(200).json({
        success: true,
        message: "Brand updated successfully",
        data: updatedBrand,
      });
    } catch (error) {
      handleControllerError(res, error, "updating brand");
    }
  }

  public static async deleteBrand(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";
      const { id } = req.params;

      if (!id || id.trim() === "") {
        throw new ValidationError("Brand ID is required");
      }

      const deletedBrand = await brandService.deleteBrandById(id, userId, userEmail, userRole, req);

      res.status(200).json({
        success: true,
        message: "Brand deleted successfully",
        data: deletedBrand,
      });
    } catch (error) {
      handleControllerError(res, error, "deleting brand");
    }
  }

  public static async getBrandStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await brandService.getBrandStatistics();
      res.status(200).json({
        success: true,
        message: "Brand statistics retrieved successfully",
        data: statistics,
      });
    } catch (error) {
      handleControllerError(res, error, "fetching brand statistics");
    }
  }

  public static async updateBrandVerificationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      requireRole(userRole, ["super_admin", "vendor_admin"], "update brand verification status");

      const { id } = req.params;
      const { verification_status, risk_notes } = req.body;

      if (!id || id.trim() === "") {
        throw new ValidationError("Brand ID is required");
      }

      validateEnumValue(verification_status, VALID_VERIFICATION_STATUSES, "verification_status");

      const updateData: Record<string, any> = {
        verification_status,
        ...(risk_notes !== undefined && { risk_notes }),
        ...(verification_status === "verified" && { verified_by: userId }),
      };

      const updatedBrand = await brandService.updateBrandById(
        id,
        updateData,
        userId,
        userEmail,
        userRole,
        req
      );

      if (!updatedBrand) {
        throw new Error("Brand not found");
      }

      res.status(200).json({
        success: true,
        message: "Brand verification status updated successfully",
        data: updatedBrand,
      });
    } catch (error) {
      handleControllerError(res, error, "updating brand verification status");
    }
  }

  public static async bulkUpdateBrandVerification(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      requireRole(userRole, ["super_admin", "vendor_admin"], "bulk update brand verification");

      const { brand_ids, verification_status, risk_notes } = req.body;

      if (!brand_ids || !Array.isArray(brand_ids) || brand_ids.length === 0) {
        throw new ValidationError("brand_ids must be a non-empty array");
      }

      validateEnumValue(verification_status, VALID_VERIFICATION_STATUSES, "verification_status");

      const result = await brandService.bulkUpdateBrandVerificationStatus(
        brand_ids,
        verification_status,
        risk_notes || "",
        userId,
        userEmail,
        userRole,
        req
      );

      res.status(200).json({
        success: true,
        message: `Bulk brand verification update completed. ${result.updated} updated, ${result.failed.length} failed.`,
        data: result,
      });
    } catch (error) {
      handleControllerError(res, error, "bulk brand verification update");
    }
  }

  public static async updateBrandStatus(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      requireRole(userRole, ["super_admin", "vendor_admin"], "update brand status");

      const { id } = req.params;
      const { brand_status } = req.body;

      if (!id || id.trim() === "") {
        throw new ValidationError("Brand ID is required");
      }

      validateEnumValue(brand_status, VALID_BRAND_STATUSES, "brand_status");

      const updatedBrand = await brandService.updateBrandStatus(
        id,
        brand_status,
        userId,
        userEmail,
        userRole,
        req
      );

      if (!updatedBrand) {
        throw new Error("Brand not found");
      }

      res.status(200).json({
        success: true,
        message: `Brand status updated to ${brand_status} successfully`,
        data: updatedBrand,
      });
    } catch (error) {
      handleControllerError(res, error, "updating brand status");
    }
  }

  public static async getBrandsByCompanyId(req: Request, res: Response): Promise<void> {
    try {
      const { company_id } = req.params;
      const { page = 1, limit = 10, verification_status } = req.query;

      if (!company_id || company_id.trim() === "") {
        throw new ValidationError("Company ID is required");
      }

      const result = await brandService.getBrandsByCompanyId(company_id, {
        page: Number(page),
        limit: Number(limit),
        verification_status: verification_status as string,
      });

      res.status(200).json({
        success: true,
        message: "Brands retrieved successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      handleControllerError(res, error, "fetching brands by company");
    }
  }

  public static async getBrandAuditTrail(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { page = 1, limit = 50 } = req.query;

      if (!id || id.trim() === "") {
        throw new ValidationError("Brand ID is required");
      }

      const brand = await brandService.getBrandById(id);
      if (!brand) {
        throw new Error("Brand not found");
      }

      const auditData = await auditTrailService.getBrandAuditTrails(
        brand._id.toString(),
        Number(page),
        Number(limit)
      );

      res.status(200).json({
        success: true,
        message: "Brand audit trail retrieved successfully",
        data: auditData,
      });
    } catch (error) {
      handleControllerError(res, error, "fetching brand audit trail");
    }
  }

  public static async getAllBrandAuditTrails(req: Request, res: Response): Promise<void> {
    try {
      const { roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      requireRole(
        userRole,
        ["super_admin", "vendor_admin", "vendor_staff"],
        "view all brand audit trails"
      );

      const { page = 1, limit = 50, brand_id, action, date_from, date_to } = req.query;

      const auditData = await auditTrailService.getAuditTrails({
        page: Number(page),
        limit: Number(limit),
        target_type: "brand",
        target_brand: brand_id as string,
        action: action as string,
        date_from: date_from as string,
        date_to: date_to as string,
      });

      res.status(200).json({
        success: true,
        message: "All brand audit trails retrieved successfully",
        data: auditData,
      });
    } catch (error) {
      handleControllerError(res, error, "fetching all brand audit trails");
    }
  }

  public static async exportBrands(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      requireRole(userRole, ["super_admin", "vendor_admin", "brand_manager"], "export brands");

      const { format = "csv", filters } = req.query;
      validateEnumValue(format as string, ["csv", "json", "excel"], "format");

      const filterData = filters ? JSON.parse(filters as string) : {};
      const exportData = await brandService.exportBrands(format as string, filterData, userId);

      setExportHeaders(res, format as string, "brands_export");
      res.status(200).send(exportData);
    } catch (error) {
      handleControllerError(res, error, "exporting brands");
    }
  }

  public static async exportBrandById(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      requireRole(userRole, ["super_admin", "vendor_admin", "brand_manager"], "export brand data");

      const { id } = req.params;
      const { format = "csv" } = req.query;

      if (!id || id.trim() === "") {
        throw new ValidationError("Brand ID is required");
      }

      validateEnumValue(format as string, ["csv", "json", "pdf"], "format");

      const exportData = await brandService.exportBrandById(id, format as string, userId);

      setExportHeaders(res, format as string, `brand_${id}_export`);
      res.status(200).send(exportData);
    } catch (error) {
      handleControllerError(res, error, "exporting brand by ID");
    }
  }

  private static convertAuditTrailToCSV(auditData: any): string {
    if (!auditData.audits || auditData.audits.length === 0) {
      return "No audit trail data available for export";
    }

    try {
      const headers = [
        "Timestamp",
        "Action",
        "User Name",
        "User Email",
        "User Role",
        "Action Description",
        "IP Address",
        "User Agent",
        "Target Type",
        "Target Company",
      ];

      let csv = "\ufeff";
      csv += headers.join(",") + "\n";

      auditData.audits.forEach((audit: any) => {
        const auditDoc = audit.toObject ? audit.toObject() : audit;
        const userName = auditDoc.user?.name || "Unknown";
        const userEmail = auditDoc.user_email || auditDoc.user?.email || "Unknown";
        const companyName = auditDoc.target_company?.registered_company_name || "N/A";

        const row = [
          auditDoc.timestamp ? new Date(auditDoc.timestamp).toISOString() : "",
          auditDoc.action || "",
          `"${userName.replace(/"/g, '""')}"`,
          `"${userEmail.replace(/"/g, '""')}"`,
          auditDoc.user_role || "",
          `"${(auditDoc.action_description || "").replace(/"/g, '""')}"`,
          auditDoc.ip_address || "Unknown",
          `"${(auditDoc.user_agent || "").replace(/"/g, '""')}"`,
          auditDoc.target_type || "",
          `"${companyName.replace(/"/g, '""')}"`,
        ];

        csv += row.join(",") + "\n";
      });

      csv += "\n\n";
      csv += "Export Summary\n";
      csv += "Total Audit Records," + auditData.audits.length + "\n";
      csv += "Export Date," + new Date().toISOString() + "\n";
      csv += "Page," + (auditData.page || 1) + "\n";
      csv += "Total Pages," + (auditData.pages || 1) + "\n";
      csv += "Total Records," + (auditData.total || 0) + "\n";

      return csv;
    } catch (error) {
      logger.error("Error converting audit trail to CSV:", error);
      return "Error generating audit trail CSV";
    }
  }

  public static async getCompanyDashboard(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        company_status,
        legal_entity_structure,
        registration_type,
        search,
      } = req.query;

      const result = await companyService.getCompanyDashboard({
        page: Number(page),
        limit: Number(limit),
        company_status: company_status as string,
        legal_entity_structure: legal_entity_structure as string,
        registration_type: registration_type as string,
        search: search as string,
      });

      res.status(200).json({
        success: true,
        message: "Company dashboard data retrieved successfully",
        data: result.data,
        statistics: result.statistics,
        pagination: result.pagination,
      });
    } catch (error) {
      handleControllerError(res, error, "fetching company dashboard");
    }
  }
}
