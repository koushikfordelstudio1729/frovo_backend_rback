import mongoose, { Types } from "mongoose";
import { Request } from "express";
import { CompanyCreate, ICompanyCreate, BrandCreate, IBrandCreate } from "../models/Vendor.model";
import { AuditTrailService } from "./auditTrail.service";
import { logger } from "../utils/logger.util";

const auditTrailService = new AuditTrailService();

// ============================================
// COMPANY SERVICE INTERFACES
// ============================================

export interface ICompanyCreateData {
  registered_company_name: string;
  registered_office_address: string;
  official_email: string;
  legal_entity_structure: "pvt" | "public" | "opc" | "llp" | "proprietorship" | "partnership";
  registration_type: "cin" | "msme";
  cin_or_msme_number: string;
  date_of_incorporation: Date;
  corporate_website?: string;
  directory_signature_name: string;
  din: string;
  company_status?: "active" | "inactive";
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
  upload_cancelled_cheque_image?: any;
  gst_details: string;
  gst_certificate_image?: any;
  PAN_number: string;
  PAN_image?: any;
  FSSAI_number: string;
  FSSAI_image?: any;
  TDS_rate: number;
  billing_cycle: string;
  brand_status_cycle: string;
  verification_status?: "pending" | "verified" | "rejected";
  risk_notes?: string;
  contract_terms?: string;
  contract_start_date: Date;
  contract_end_date: Date;
  contract_renewal_date: Date;
  payment_methods: "upi" | "bank_transfer" | "cheque" | "credit_card" | "debit_card" | "other";
  internal_notes?: string;
  certificate_of_incorporation_image?: any;
  MSME_or_Udyam_certificate_image?: any;
  MOA_image?: any;
  AOA_image?: any;
  Trademark_certificate_image?: any;
  Authorized_Signatory_image?: any;
  LLP_agreement_image?: any;
  Shop_and_Establishment_certificate_image?: any;
  Registered_Partnership_deed_image?: any;
  Board_resolution_image?: any;
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
  upload_cancelled_cheque_image?: any;
  gst_details?: string;
  gst_certificate_image?: any;
  PAN_number?: string;
  PAN_image?: any;
  FSSAI_number?: string;
  FSSAI_image?: any;
  TDS_rate?: number;
  billing_cycle?: string;
  brand_status_cycle?: string;
  verification_status?: "pending" | "verified" | "rejected";
  risk_notes?: string;
  contract_terms?: string;
  contract_start_date?: Date;
  contract_end_date?: Date;
  contract_renewal_date?: Date;
  payment_methods?: "upi" | "bank_transfer" | "cheque" | "credit_card" | "debit_card" | "other";
  internal_notes?: string;
  certificate_of_incorporation_image?: any;
  MSME_or_Udyam_certificate_image?: any;
  MOA_image?: any;
  AOA_image?: any;
  Trademark_certificate_image?: any;
  Authorized_Signatory_image?: any;
  LLP_agreement_image?: any;
  Shop_and_Establishment_certificate_image?: any;
  Registered_Partnership_deed_image?: any;
  Board_resolution_image?: any;
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
// COMPANY SERVICE
// ============================================

export class CompanyService {

  // Get company by company_id (7-digit ID)
  async getCompanyByCompanyId(companyId: string): Promise<ICompanyCreate | null> {
    try {
      const company = await CompanyCreate.findOne({ company_id: companyId }).lean() as unknown as ICompanyCreate | null;

      if (!company) {
        throw new Error(`Company with ID ${companyId} not found`);
      }

      return company;
    } catch (error) {
      logger.error(`Error fetching company by company_id ${companyId}:`, error);
      throw error;
    }
  }

  // Update company by company_id (7-digit ID)
  async updateCompanyByCompanyId(
    companyId: string,
    updateData: ICompanyUpdateData,
    updatedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<ICompanyCreate | null> {
    try {
      // Get current company data for audit
      const currentCompany = await CompanyCreate.findOne({ company_id: companyId });
      if (!currentCompany) {
        throw new Error(`Company with ID ${companyId} not found`);
      }

      // Check for duplicate data if provided
      if (updateData.cin_or_msme_number && updateData.cin_or_msme_number !== currentCompany.cin_or_msme_number) {
        const existingCompany = await CompanyCreate.findOne({
          cin_or_msme_number: updateData.cin_or_msme_number,
          company_id: { $ne: companyId },
        });

        if (existingCompany) {
          throw new Error(`Company with CIN/MSME number ${updateData.cin_or_msme_number} already exists`);
        }
      }

      if (updateData.official_email && updateData.official_email !== currentCompany.official_email) {
        const existingEmail = await CompanyCreate.findOne({
          official_email: updateData.official_email.toLowerCase(),
          company_id: { $ne: companyId },
        });

        if (existingEmail) {
          throw new Error(`Company with email ${updateData.official_email} already exists`);
        }
      }

      if (updateData.din && updateData.din !== currentCompany.din) {
        const existingDIN = await CompanyCreate.findOne({
          din: updateData.din,
          company_id: { $ne: companyId },
        });

        if (existingDIN) {
          throw new Error(`Company with DIN ${updateData.din} already exists`);
        }
      }

      // Prepare update data
      const updateObj: any = { ...updateData };
      if (updateObj.official_email) {
        updateObj.official_email = updateObj.official_email.toLowerCase();
      }

      // Update company
      const updatedCompany = await CompanyCreate.findOneAndUpdate(
        { company_id: companyId },
        { $set: updateObj },
        { new: true, runValidators: true }
      ).lean() as unknown as ICompanyCreate | null;

      if (!updatedCompany) {
        throw new Error(`Company with ID ${companyId} not found`);
      }

      // Create audit trail
      if (req) {
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
          before_state: currentCompany.toObject(),
          after_state: updateData,
          changed_fields: Object.keys(updateData),
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
      }

      logger.info(`Company updated: ${updatedCompany.registered_company_name} (Company ID: ${companyId})`);
      return updatedCompany;
    } catch (error) {
      logger.error(`Error updating company ${companyId}:`, error);
      throw error;
    }
  }

  // Delete company by company_id (7-digit ID)
  async deleteCompanyByCompanyId(
    companyId: string,
    deletedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<ICompanyCreate | null> {
    try {
      const company = await CompanyCreate.findOneAndDelete({ company_id: companyId }).lean() as unknown as ICompanyCreate | null;

      if (!company) {
        throw new Error(`Company with ID ${companyId} not found`);
      }

      // Create audit trail
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

      logger.info(`Company deleted: ${company.registered_company_name} (Company ID: ${companyId})`);
      return company;
    } catch (error) {
      logger.error(`Error deleting company ${companyId}:`, error);
      throw error;
    }
  }

  // Toggle company status (active/inactive) by company_id
  async toggleCompanyStatus(
    companyId: string,
    updatedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<ICompanyCreate> {
    try {
      // Get current company
      const currentCompany = await CompanyCreate.findOne({ company_id: companyId });

      if (!currentCompany) {
        throw new Error(`Company with ID ${companyId} not found`);
      }

      // Toggle the status
      const newStatus = currentCompany.company_status === "active" ? "inactive" : "active";

      // Update company status
      const updatedCompany = await CompanyCreate.findOneAndUpdate(
        { company_id: companyId },
        { $set: { company_status: newStatus } },
        { new: true, runValidators: true }
      ).lean() as unknown as ICompanyCreate;

      if (!updatedCompany) {
        throw new Error(`Company with ID ${companyId} not found`);
      }

      // Create audit trail
      if (req) {
        await auditTrailService.createAuditRecord({
          user: updatedBy,
          user_email: userEmail,
          user_role: userRole,
          action: "update",
          action_description: `Toggled company status from ${currentCompany.company_status} to ${newStatus}: ${currentCompany.registered_company_name}`,
          target_type: "company",
          target_company: currentCompany._id,
          target_company_name: currentCompany.registered_company_name,
          target_company_cin: currentCompany.cin_or_msme_number,
          before_state: { company_status: currentCompany.company_status },
          after_state: { company_status: newStatus },
          changed_fields: ["company_status"],
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
      }

      logger.info(`Company status toggled: ${updatedCompany.registered_company_name} (Company ID: ${companyId}) - ${currentCompany.company_status} -> ${newStatus}`);
      return updatedCompany;
    } catch (error) {
      logger.error(`Error toggling company status ${companyId}:`, error);
      throw error;
    }
  }

  // Export companies data
  async exportCompanies(
    format: string,
    filters: any,
    userId: Types.ObjectId
  ): Promise<any> {
    try {
      const query: any = {};

      // Apply filters if provided
      if (filters.company_status) {
        query.company_status = filters.company_status;
      }
      if (filters.registration_type) {
        query.registration_type = filters.registration_type;
      }
      if (filters.legal_entity_structure) {
        query.legal_entity_structure = filters.legal_entity_structure;
      }
      if (filters.search) {
        query.$or = [
          { registered_company_name: { $regex: filters.search, $options: "i" } },
          { cin_or_msme_number: { $regex: filters.search, $options: "i" } },
          { official_email: { $regex: filters.search, $options: "i" } },
        ];
      }

      const companies = await CompanyCreate.find(query)
        .sort({ createdAt: -1 })
        .lean();

      // For CSV/Excel export, you would convert companies to CSV/Excel format
      // For JSON export, return as is
      if (format === "json") {
        return JSON.stringify(companies, null, 2);
      } else if (format === "csv") {
        // Convert to CSV format
        const headers = [
          "Company ID",
          "Registered Company Name",
          "Official Email",
          "Legal Entity Structure",
          "Registration Type",
          "CIN/MSME Number",
          "Date of Incorporation",
          "Company Status",
          "Created At"
        ];

        const csvRows = companies.map(company => [
          company.company_id,
          company.registered_company_name,
          company.official_email,
          company.legal_entity_structure,
          company.registration_type,
          company.cin_or_msme_number,
          new Date(company.date_of_incorporation).toISOString().split('T')[0],
          company.company_status,
          new Date(company.createdAt).toISOString()
        ].join(','));

        return [headers.join(','), ...csvRows].join('\n');
      }

      return companies;
    } catch (error) {
      logger.error("Error exporting companies:", error);
      throw error;
    }
  }

  // Export single company data by company_id
  async exportCompanyById(
    companyId: string,
    format: string,
    userId: Types.ObjectId
  ): Promise<any> {
    try {
      const company = await CompanyCreate.findOne({ company_id: companyId }).lean();

      if (!company) {
        throw new Error(`Company with ID ${companyId} not found`);
      }

      if (format === "json") {
        return JSON.stringify(company, null, 2);
      }

      return company;
    } catch (error) {
      logger.error(`Error exporting company ${companyId}:`, error);
      throw error;
    }
  }

  // ============================================
  // All the existing methods from your original service
  // ============================================

  async createCompany(
    companyData: ICompanyCreateData,
    createdBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<ICompanyCreate> {
    try {
      // Check if company with same CIN/MSME number already exists
      const existingCompany = await CompanyCreate.findOne({
        cin_or_msme_number: companyData.cin_or_msme_number,
      });

      if (existingCompany) {
        throw new Error(`Company with CIN/MSME number ${companyData.cin_or_msme_number} already exists`);
      }

      // Check if official_email already exists
      const existingEmail = await CompanyCreate.findOne({
        official_email: companyData.official_email.toLowerCase(),
      });

      if (existingEmail) {
        throw new Error(`Company with email ${companyData.official_email} already exists`);
      }

      // Check if DIN already exists
      const existingDIN = await CompanyCreate.findOne({
        din: companyData.din,
      });

      if (existingDIN) {
        throw new Error(`Company with DIN ${companyData.din} already exists`);
      }

      // Create new company
      const newCompany = new CompanyCreate({
        ...companyData,
        company_status: companyData.company_status || "active",
      });

      await newCompany.save();

      // Create audit trail
      if (req) {
        await auditTrailService.createAuditRecord({
          user: createdBy,
          user_email: userEmail,
          user_role: userRole,
          action: "create",
          action_description: `Created company: ${companyData.registered_company_name}`,
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
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
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
        legal_entity_structure
      } = options;
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {};

      if (search) {
        query.$or = [
          { registered_company_name: { $regex: search, $options: "i" } },
          { cin_or_msme_number: { $regex: search, $options: "i" } },
          { official_email: { $regex: search, $options: "i" } },
          { directory_signature_name: { $regex: search, $options: "i" } },
          { din: { $regex: search, $options: "i" } },
        ];
      }

      // Apply additional filters
      if (company_status) {
        query.company_status = company_status;
      }

      if (registration_type) {
        query.registration_type = registration_type;
      }

      if (legal_entity_structure) {
        query.legal_entity_structure = legal_entity_structure;
      }

      // Get total count
      const total = await CompanyCreate.countDocuments(query);

      // Get companies with pagination
      const companies = await CompanyCreate.find(query)
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean() as unknown as ICompanyCreate[];

      return {
        data: companies,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Error fetching companies:", error);
      throw error;
    }
  }

  async getCompanyById(id: string): Promise<ICompanyCreate | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid company ID format");
      }

      const company = await CompanyCreate.findById(id).lean() as unknown as ICompanyCreate | null;

      if (!company) {
        throw new Error("Company not found");
      }

      return company;
    } catch (error) {
      logger.error(`Error fetching company by ID ${id}:`, error);
      throw error;
    }
  }

  async getCompanyByRegistrationNumber(registrationNumber: string): Promise<ICompanyCreate | null> {
    try {
      const company = await CompanyCreate.findOne({
        cin_or_msme_number: registrationNumber,
      }).lean() as unknown as ICompanyCreate | null;

      if (!company) {
        throw new Error(`Company with registration number ${registrationNumber} not found`);
      }

      return company;
    } catch (error) {
      logger.error(`Error fetching company by registration number ${registrationNumber}:`, error);
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
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid company ID format");
      }

      // Get current company data for audit
      const currentCompany = await CompanyCreate.findById(id);
      if (!currentCompany) {
        throw new Error("Company not found");
      }

      // Check for duplicate data if provided
      if (updateData.cin_or_msme_number && updateData.cin_or_msme_number !== currentCompany.cin_or_msme_number) {
        const existingCompany = await CompanyCreate.findOne({
          cin_or_msme_number: updateData.cin_or_msme_number,
          _id: { $ne: id },
        });

        if (existingCompany) {
          throw new Error(`Company with CIN/MSME number ${updateData.cin_or_msme_number} already exists`);
        }
      }

      if (updateData.official_email && updateData.official_email !== currentCompany.official_email) {
        const existingEmail = await CompanyCreate.findOne({
          official_email: updateData.official_email.toLowerCase(),
          _id: { $ne: id },
        });

        if (existingEmail) {
          throw new Error(`Company with email ${updateData.official_email} already exists`);
        }
      }

      if (updateData.din && updateData.din !== currentCompany.din) {
        const existingDIN = await CompanyCreate.findOne({
          din: updateData.din,
          _id: { $ne: id },
        });

        if (existingDIN) {
          throw new Error(`Company with DIN ${updateData.din} already exists`);
        }
      }

      // Prepare update data
      const updateObj: any = { ...updateData };
      if (updateObj.official_email) {
        updateObj.official_email = updateObj.official_email.toLowerCase();
      }

      // Update company
      const updatedCompany = await CompanyCreate.findByIdAndUpdate(
        id,
        { $set: updateObj },
        { new: true, runValidators: true }
      ).lean() as unknown as ICompanyCreate | null;

      if (!updatedCompany) {
        throw new Error("Company not found");
      }

      // Create audit trail
      if (req) {
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
          before_state: currentCompany.toObject(),
          after_state: updateData,
          changed_fields: Object.keys(updateData),
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
      }

      logger.info(`Company updated: ${updatedCompany.registered_company_name} (ID: ${id})`);
      return updatedCompany;
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
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid company ID format");
      }

      const company = await CompanyCreate.findByIdAndDelete(id).lean() as unknown as ICompanyCreate | null;

      if (!company) {
        throw new Error("Company not found");
      }

      // Create audit trail
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

  async searchCompanies(query: string, limit: number = 10): Promise<ICompanyCreate[]> {
    try {
      const companies = await CompanyCreate.find({
        $or: [
          { registered_company_name: { $regex: query, $options: "i" } },
          { cin_or_msme_number: { $regex: query, $options: "i" } },
          { official_email: { $regex: query, $options: "i" } },
          { directory_signature_name: { $regex: query, $options: "i" } },
          { din: { $regex: query, $options: "i" } },
        ],
      })
        .limit(limit)
        .lean() as unknown as ICompanyCreate[];

      return companies;
    } catch (error) {
      logger.error(`Error searching companies with query '${query}':`, error);
      throw error;
    }
  }

  async checkCompanyExists(registrationNumber: string): Promise<boolean> {
    try {
      const company = await CompanyCreate.findOne({
        cin_or_msme_number: registrationNumber,
      });

      return !!company;
    } catch (error) {
      logger.error(`Error checking company existence ${registrationNumber}:`, error);
      throw error;
    }
  }

  async getCompanyStatistics(): Promise<any> {
    try {
      const totalCompanies = await CompanyCreate.countDocuments();
      const activeCompanies = await CompanyCreate.countDocuments({ company_status: "active" });
      const inactiveCompanies = await CompanyCreate.countDocuments({ company_status: "inactive" });

      // Count by legal entity structure
      const structureStats = await CompanyCreate.aggregate([
        {
          $group: {
            _id: "$legal_entity_structure",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      // Count by registration type
      const registrationTypeStats = await CompanyCreate.aggregate([
        {
          $group: {
            _id: "$registration_type",
            count: { $sum: 1 },
          },
        },
      ]);

      // Recent companies (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentCompanies = await CompanyCreate.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      });

      return {
        total: totalCompanies,
        active: activeCompanies,
        inactive: inactiveCompanies,
        recent: recentCompanies,
        byLegalEntityStructure: structureStats,
        byRegistrationType: registrationTypeStats,
      };
    } catch (error) {
      logger.error("Error fetching company statistics:", error);
      throw error;
    }
  }

  async getCompaniesByStatus(
    status: "active" | "inactive",
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: ICompanyCreate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const skip = (page - 1) * limit;

      const query = { company_status: status };
      const total = await CompanyCreate.countDocuments(query);

      const companies = await CompanyCreate.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean() as unknown as ICompanyCreate[];

      return {
        data: companies,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Error fetching companies by status ${status}:`, error);
      throw error;
    }
  }

  async getCompaniesByLegalStructure(
    structure: "pvt" | "public" | "opc" | "llp" | "proprietorship" | "partnership",
    page: number = 1,
    limit: number = 10
  ): Promise<{
    data: ICompanyCreate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const skip = (page - 1) * limit;

      const query = { legal_entity_structure: structure };
      const total = await CompanyCreate.countDocuments(query);

      const companies = await CompanyCreate.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean() as unknown as ICompanyCreate[];

      return {
        data: companies,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Error fetching companies by legal structure ${structure}:`, error);
      throw error;
    }
  }

  async validateCompanyData(data: {
    cin_or_msme_number?: string;
    official_email?: string;
    din?: string;
  }): Promise<{
    isValid: boolean;
    errors: string[];
    details: {
      cin_or_msme_number?: { exists: boolean; message: string };
      official_email?: { exists: boolean; message: string };
      din?: { exists: boolean; message: string };
    };
  }> {
    try {
      const errors: string[] = [];
      const details: any = {};

      // Check CIN/MSME number
      if (data.cin_or_msme_number) {
        const existingCIN = await CompanyCreate.findOne({
          cin_or_msme_number: data.cin_or_msme_number,
        });
        details.cin_or_msme_number = {
          exists: !!existingCIN,
          message: existingCIN ? "CIN/MSME number already exists" : "CIN/MSME number is available",
        };
        if (existingCIN) {
          errors.push("CIN/MSME number already exists");
        }
      }

      // Check official email
      if (data.official_email) {
        const existingEmail = await CompanyCreate.findOne({
          official_email: data.official_email.toLowerCase(),
        });
        details.official_email = {
          exists: !!existingEmail,
          message: existingEmail ? "Email already exists" : "Email is available",
        };
        if (existingEmail) {
          errors.push("Email already exists");
        }
      }

      // Check DIN
      if (data.din) {
        const existingDIN = await CompanyCreate.findOne({
          din: data.din,
        });
        details.din = {
          exists: !!existingDIN,
          message: existingDIN ? "DIN already exists" : "DIN is available",
        };
        if (existingDIN) {
          errors.push("DIN already exists");
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        details,
      };
    } catch (error) {
      logger.error("Error validating company data:", error);
      throw error;
    }
  }

  async bulkCreateCompanies(
    companies: ICompanyCreateData[],
    createdBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<{
    successful: ICompanyCreate[];
    failed: Array<{ data: ICompanyCreateData; error: string }>;
  }> {
    try {
      const successful: ICompanyCreate[] = [];
      const failed: Array<{ data: ICompanyCreateData; error: string }> = [];

      for (const companyData of companies) {
        try {
          // Check for duplicates in this batch
          const duplicateInBatch = companies.filter(
            (c, idx) =>
              c.cin_or_msme_number === companyData.cin_or_msme_number ||
              c.official_email.toLowerCase() === companyData.official_email.toLowerCase() ||
              c.din === companyData.din
          ).length > 1;

          if (duplicateInBatch) {
            throw new Error("Duplicate data found within the batch");
          }

          const newCompany = await this.createCompany(
            companyData,
            createdBy,
            userEmail,
            userRole,
            req
          );
          successful.push(newCompany);
        } catch (error: any) {
          failed.push({
            data: companyData,
            error: error.message,
          });
        }
      }

      return { successful, failed };
    } catch (error) {
      logger.error("Error in bulk company creation:", error);
      throw error;
    }
  }
}

// ============================================
// BRAND SERVICE
// ============================================

export class BrandService {

  // Create a new brand
  async createBrand(
  brandData: IBrandCreateData,
  createdBy: Types.ObjectId,
  userEmail: string,
  userRole: string,
  req?: Request
): Promise<IBrandCreate> {
  try {
    // Validate company exists
    const company = await CompanyCreate.findOne({
      cin_or_msme_number: brandData.cin_or_msme_number,
    });

    if (!company) {
      throw new Error(`Company with registration number ${brandData.cin_or_msme_number} does not exist`);
    }

    // Check if brand with same email already exists
    const existingBrand = await BrandCreate.findOne({
      brand_email: brandData.brand_email.toLowerCase(),
    });

    if (existingBrand) {
      throw new Error(`Brand with email ${brandData.brand_email} already exists`);
    }

    // Check if company_id matches the found company
    if (!company._id.equals(brandData.company_id)) {
      throw new Error("Company ID does not match the registration number");
    }

    // Validate required files based on legal entity structure
    await this.validateBrandFiles(brandData, company.legal_entity_structure);

    // Create new brand
    const newBrand = new BrandCreate({
      ...brandData,
      verification_status: brandData.verification_status || "pending",
      createdBy: createdBy,
    });

    await newBrand.save();

    // Create audit trail
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

/**
 * Validate required files based on legal entity structure
 */
private async validateBrandFiles(brandData: any, legalEntity: string): Promise<void> {
  const requiredFields = this.getRequiredFileFieldsForLegalEntity(legalEntity);
  
  for (const field of requiredFields) {
    if (!brandData[field] || !brandData[field].file_url || !brandData[field].cloudinary_public_id) {
      throw new Error(`Missing or invalid ${field} file upload`);
    }
  }
}

/**
 * Get required file fields based on legal entity
 */
private getRequiredFileFieldsForLegalEntity(legalEntity: string): string[] {
  const commonFields = [
    'upload_cancelled_cheque_image',
    'gst_certificate_image',
    'PAN_image',
    'FSSAI_image'
  ];

  const entitySpecificFields: Record<string, string[]> = {
    'pvt': [
      'certificate_of_incorporation_image',
      'MSME_or_Udyam_certificate_image',
      'MOA_image',
      'AOA_image',
      'Trademark_certificate_image',
      'Authorized_Signatory_image'
    ],
    'opc': [
      'certificate_of_incorporation_image',
      'MSME_or_Udyam_certificate_image',
      'MOA_image',
      'AOA_image'
    ],
    'llp': [
      'certificate_of_incorporation_image',
      'MSME_or_Udyam_certificate_image',
      'LLP_agreement_image'
    ],
    'proprietorship': [
      'MSME_or_Udyam_certificate_image',
      'Shop_and_Establishment_certificate_image'
    ],
    'partnership': [
      'Registered_Partnership_deed_image',
      'MSME_or_Udyam_certificate_image'
    ],
    'public': [
      'certificate_of_incorporation_image',
      'Board_resolution_image',
      'MOA_image',
      'AOA_image'
    ]
  };

  return [...commonFields, ...(entitySpecificFields[legalEntity] || [])];
}

  // Get all brands with pagination and search
  async getAllBrands(options: IBrandPaginationOptions): Promise<{
    data: IBrandCreate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
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
        company_id
      } = options;
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {};

      if (search) {
        query.$or = [
          { brand_name: { $regex: search, $options: "i" } },
          { brand_billing_name: { $regex: search, $options: "i" } },
          { brand_email: { $regex: search, $options: "i" } },
          { contact_name: { $regex: search, $options: "i" } },
          { contact_phone: { $regex: search, $options: "i" } },
          { PAN_number: { $regex: search, $options: "i" } },
          { gst_details: { $regex: search, $options: "i" } },
        ];
      }

      // Apply additional filters
      if (verification_status) {
        query.verification_status = verification_status;
      }

      if (brand_category) {
        query.brand_category = brand_category;
      }

      if (brand_type) {
        query.brand_type = brand_type;
      }

      if (company_id) {
        if (mongoose.Types.ObjectId.isValid(company_id)) {
          query.company_id = new mongoose.Types.ObjectId(company_id);
        }
      }

      // Get total count
      const total = await BrandCreate.countDocuments(query);

      // Get brands with pagination
      const brands = await BrandCreate.find(query)
        .populate("company_id", "company_id registered_company_name official_email")
        .populate("warehouse_id", "warehouse_name warehouse_code")
        .populate("verified_by", "email name")
        .populate("createdBy", "email name")
        .sort({ [sortBy]: sortOrder === "asc" ? 1 : -1 })
        .skip(skip)
        .limit(limit)
        .lean() as unknown as IBrandCreate[];

      return {
        data: brands,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error("Error fetching brands:", error);
      throw error;
    }
  }

  // Get brand by brand_id
  async getBrandByBrandId(brandId: string): Promise<IBrandCreate | null> {
    try {
      const brand = await BrandCreate.findOne({ brand_id: brandId })
        .populate("company_id", "company_id registered_company_name official_email cin_or_msme_number")
        .populate("warehouse_id", "warehouse_name warehouse_code")
        .populate("verified_by", "email name")
        .populate("createdBy", "email name")
        .lean() as unknown as IBrandCreate | null;

      if (!brand) {
        throw new Error(`Brand with ID ${brandId} not found`);
      }

      return brand;
    } catch (error) {
      logger.error(`Error fetching brand by brand_id ${brandId}:`, error);
      throw error;
    }
  }

  // Get brand by MongoDB ID
  async getBrandById(id: string): Promise<IBrandCreate | null> {
    try {
      if (!mongoose.Types.ObjectId.isValid(id)) {
        throw new Error("Invalid brand ID format");
      }

      const brand = await BrandCreate.findById(id)
        .populate("company_id", "company_id registered_company_name official_email cin_or_msme_number")
        .populate("warehouse_id", "warehouse_name warehouse_code")
        .populate("verified_by", "email name")
        .populate("createdBy", "email name")
        .lean() as unknown as IBrandCreate | null;

      if (!brand) {
        throw new Error("Brand not found");
      }

      return brand;
    } catch (error) {
      logger.error(`Error fetching brand by ID ${id}:`, error);
      throw error;
    }
  }

  // Update brand by brand_id
  async updateBrandByBrandId(
    brandId: string,
    updateData: IBrandUpdateData,
    updatedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<IBrandCreate | null> {
    try {
      // Get current brand data for audit
      const currentBrand = await BrandCreate.findOne({ brand_id: brandId });
      if (!currentBrand) {
        throw new Error(`Brand with ID ${brandId} not found`);
      }

      // Check for duplicate email if provided
      if (updateData.brand_email && updateData.brand_email !== currentBrand.brand_email) {
        const existingEmail = await BrandCreate.findOne({
          brand_email: updateData.brand_email.toLowerCase(),
          brand_id: { $ne: brandId },
        });

        if (existingEmail) {
          throw new Error(`Brand with email ${updateData.brand_email} already exists`);
        }
      }

      // If updating company registration number, validate the company exists
      if (updateData.cin_or_msme_number) {
        const company = await CompanyCreate.findOne({
          cin_or_msme_number: updateData.cin_or_msme_number,
        });

        if (!company) {
          throw new Error(`Company with registration number ${updateData.cin_or_msme_number} does not exist`);
        }

        // Update company_id to match the found company
        updateData.company_id = company._id;
      }

      // Prepare update data
      const updateObj: any = { ...updateData };
      if (updateObj.brand_email) {
        updateObj.brand_email = updateObj.brand_email.toLowerCase();
      }
      if (updateObj.ifsc_code) {
        updateObj.ifsc_code = updateObj.ifsc_code.toUpperCase();
      }
      if (updateObj.gst_details) {
        updateObj.gst_details = updateObj.gst_details.toUpperCase();
      }
      if (updateObj.PAN_number) {
        updateObj.PAN_number = updateObj.PAN_number.toUpperCase();
      }

      // Update brand
      const updatedBrand = await BrandCreate.findOneAndUpdate(
        { brand_id: brandId },
        { $set: updateObj },
        { new: true, runValidators: true }
      )
        .populate("company_id", "company_id registered_company_name official_email cin_or_msme_number")
        .populate("warehouse_id", "warehouse_name warehouse_code")
        .populate("verified_by", "email name")
        .populate("createdBy", "email name")
        .lean() as unknown as IBrandCreate | null;

      if (!updatedBrand) {
        throw new Error(`Brand with ID ${brandId} not found`);
      }

      // Create audit trail
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

      logger.info(`Brand updated: ${updatedBrand.brand_name} (Brand ID: ${brandId})`);
      return updatedBrand;
    } catch (error) {
      logger.error(`Error updating brand ${brandId}:`, error);
      throw error;
    }
  }

  // Delete brand by brand_id
  async deleteBrandByBrandId(
    brandId: string,
    deletedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<IBrandCreate | null> {
    try {
      const brand = await BrandCreate.findOneAndDelete({ brand_id: brandId })
        .populate("company_id", "company_id registered_company_name official_email")
        .lean() as unknown as IBrandCreate | null;

      if (!brand) {
        throw new Error(`Brand with ID ${brandId} not found`);
      }

      // Create audit trail
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

      logger.info(`Brand deleted: ${brand.brand_name} (Brand ID: ${brandId})`);
      return brand;
    } catch (error) {
      logger.error(`Error deleting brand ${brandId}:`, error);
      throw error;
    }
  }

  // Get brands by company ID
  async getBrandsByCompanyId(
    companyId: string,
    options: IBrandByCompanyOptions
  ): Promise<{
    data: IBrandCreate[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  }> {
    try {
      const { page, limit, verification_status } = options;
      const skip = (page - 1) * limit;

      // Build query
      const query: any = {};

      // Check if companyId is MongoDB ObjectId or company_id (7-digit)
      if (mongoose.Types.ObjectId.isValid(companyId)) {
        query.company_id = new mongoose.Types.ObjectId(companyId);
      } else {
        // Find company by company_id to get its MongoDB ObjectId
        const company = await CompanyCreate.findOne({ company_id: companyId });
        if (!company) {
          throw new Error(`Company with ID ${companyId} not found`);
        }
        query.company_id = company._id;
      }

      // Apply verification status filter
      if (verification_status) {
        query.verification_status = verification_status;
      }

      // Get total count
      const total = await BrandCreate.countDocuments(query);

      // Get brands with pagination
      const brands = await BrandCreate.find(query)
        .populate("company_id", "company_id registered_company_name official_email")
        .populate("warehouse_id", "warehouse_name warehouse_code")
        .populate("verified_by", "email name")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean() as unknown as IBrandCreate[];

      return {
        data: brands,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      logger.error(`Error fetching brands by company ${companyId}:`, error);
      throw error;
    }
  }

  // Search brands
  async searchBrands(query: string, limit: number = 10): Promise<IBrandCreate[]> {
    try {
      const brands = await BrandCreate.find({
        $or: [
          { brand_name: { $regex: query, $options: "i" } },
          { brand_billing_name: { $regex: query, $options: "i" } },
          { brand_email: { $regex: query, $options: "i" } },
          { contact_name: { $regex: query, $options: "i" } },
          { contact_phone: { $regex: query, $options: "i" } },
          { PAN_number: { $regex: query, $options: "i" } },
          { gst_details: { $regex: query, $options: "i" } },
          { brand_id: { $regex: query, $options: "i" } },
        ],
      })
        .populate("company_id", "company_id registered_company_name")
        .limit(limit)
        .lean() as unknown as IBrandCreate[];

      return brands;
    } catch (error) {
      logger.error(`Error searching brands with query '${query}':`, error);
      throw error;
    }
  }

  // Get brand statistics
  async getBrandStatistics(): Promise<any> {
    try {
      const totalBrands = await BrandCreate.countDocuments();
      const pendingBrands = await BrandCreate.countDocuments({ verification_status: "pending" });
      const verifiedBrands = await BrandCreate.countDocuments({ verification_status: "verified" });
      const rejectedBrands = await BrandCreate.countDocuments({ verification_status: "rejected" });

      // Count by brand category
      const categoryStats = await BrandCreate.aggregate([
        {
          $group: {
            _id: "$brand_category",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      // Count by brand type
      const typeStats = await BrandCreate.aggregate([
        {
          $group: {
            _id: "$brand_type",
            count: { $sum: 1 },
          },
        },
        {
          $sort: { count: -1 },
        },
      ]);

      // Recent brands (last 30 days)
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const recentBrands = await BrandCreate.countDocuments({
        createdAt: { $gte: thirtyDaysAgo },
      });

      return {
        total: totalBrands,
        pending: pendingBrands,
        verified: verifiedBrands,
        rejected: rejectedBrands,
        recent: recentBrands,
        byCategory: categoryStats,
        byType: typeStats,
      };
    } catch (error) {
      logger.error("Error fetching brand statistics:", error);
      throw error;
    }
  }

  // Export brands data
  async exportBrands(
    format: string,
    filters: any,
    userId: Types.ObjectId
  ): Promise<any> {
    try {
      const query: any = {};

      // Apply filters if provided
      if (filters.verification_status) {
        query.verification_status = filters.verification_status;
      }
      if (filters.brand_category) {
        query.brand_category = filters.brand_category;
      }
      if (filters.brand_type) {
        query.brand_type = filters.brand_type;
      }
      if (filters.company_id) {
        if (mongoose.Types.ObjectId.isValid(filters.company_id)) {
          query.company_id = new mongoose.Types.ObjectId(filters.company_id);
        }
      }
      if (filters.search) {
        query.$or = [
          { brand_name: { $regex: filters.search, $options: "i" } },
          { brand_billing_name: { $regex: filters.search, $options: "i" } },
          { brand_email: { $regex: filters.search, $options: "i" } },
          { brand_id: { $regex: filters.search, $options: "i" } },
        ];
      }

      const brands = await BrandCreate.find(query)
        .populate("company_id", "company_id registered_company_name")
        .sort({ createdAt: -1 })
        .lean();

      // For CSV/Excel export, you would convert brands to CSV/Excel format
      // For JSON export, return as is
      if (format === "json") {
        return JSON.stringify(brands, null, 2);
      } else if (format === "csv") {
        // Convert to CSV format
        const headers = [
          "Brand ID",
          "Brand Name",
          "Brand Email",
          "Company Name",
          "Verification Status",
          "Brand Category",
          "Brand Type",
          "Contact Name",
          "Contact Phone",
          "Created At"
        ];

        const csvRows = brands.map(brand => [
          brand.brand_id,
          brand.brand_name,
          brand.brand_email,
          (brand.company_id as any)?.registered_company_name || 'N/A',
          brand.verification_status,
          brand.brand_category,
          brand.brand_type,
          brand.contact_name,
          brand.contact_phone,
          new Date(brand.createdAt).toISOString()
        ].join(','));

        return [headers.join(','), ...csvRows].join('\n');
      }

      return brands;
    } catch (error) {
      logger.error("Error exporting brands:", error);
      throw error;
    }
  }

  // In CompanyService class
  async exportCompanyById(
    companyId: string,
    format: string,
    userId: Types.ObjectId
  ): Promise<any> {
    try {
      const company = await CompanyCreate.findOne({ company_id: companyId }).lean();

      if (!company) {
        throw new Error(`Company with ID ${companyId} not found`);
      }

      if (format === "json") {
        return JSON.stringify(company, null, 2);
      } else if (format === "csv") {
        // Convert single company to CSV format
        const companyData = company as any;

        // Define CSV headers
        const headers = [
          "Field",
          "Value"
        ];

        // Flatten company data into key-value pairs
        const csvRows = [];

        // Add basic company info
        csvRows.push(["Company ID", companyData.company_id || ""]);
        csvRows.push(["Registered Company Name", companyData.registered_company_name || ""]);
        csvRows.push(["Official Email", companyData.official_email || ""]);
        csvRows.push(["Legal Entity Structure", companyData.legal_entity_structure || ""]);
        csvRows.push(["Registration Type", companyData.registration_type || ""]);
        csvRows.push(["CIN/MSME Number", companyData.cin_or_msme_number || ""]);
        csvRows.push(["Date of Incorporation", companyData.date_of_incorporation ?
          new Date(companyData.date_of_incorporation).toISOString().split('T')[0] : ""]);
        csvRows.push(["Registered Office Address", companyData.registered_office_address || ""]);
        csvRows.push(["Corporate Website", companyData.corporate_website || ""]);
        csvRows.push(["Directory Signature Name", companyData.directory_signature_name || ""]);
        csvRows.push(["DIN", companyData.din || ""]);
        csvRows.push(["Company Status", companyData.company_status || ""]);
        csvRows.push(["Created At", companyData.createdAt ?
          new Date(companyData.createdAt).toISOString() : ""]);
        csvRows.push(["Updated At", companyData.updatedAt ?
          new Date(companyData.updatedAt).toISOString() : ""]);

        // Convert to CSV string
        const csvContent = [
          headers.join(','),
          ...csvRows.map(row =>
            row.map(cell => {
              // Escape commas and quotes in cell values
              const cellStr = String(cell);
              if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            }).join(',')
          )
        ].join('\n');

        return csvContent;
      }

      return company;
    } catch (error) {
      logger.error(`Error exporting company ${companyId}:`, error);
      throw error;
    }
  }

  // In BrandService class
  async exportBrandById(
    brandId: string,
    format: string,
    userId: Types.ObjectId
  ): Promise<any> {
    try {
      const brand = await BrandCreate.findOne({ brand_id: brandId })
        .populate("company_id", "company_id registered_company_name official_email cin_or_msme_number")
        .populate("warehouse_id", "warehouse_name warehouse_code")
        .populate("verified_by", "email name")
        .populate("createdBy", "email name")
        .lean();

      if (!brand) {
        throw new Error(`Brand with ID ${brandId} not found`);
      }

      if (format === "json") {
        return JSON.stringify(brand, null, 2);
      } else if (format === "csv") {
        // Convert single brand to CSV format
        const brandData = brand as any;

        // Define CSV headers
        const headers = [
          "Field",
          "Value"
        ];

        // Flatten brand data into key-value pairs
        const csvRows = [];

        // Add basic brand info
        csvRows.push(["Brand ID", brandData.brand_id || ""]);
        csvRows.push(["Brand Name", brandData.brand_name || ""]);
        csvRows.push(["Brand Billing Name", brandData.brand_billing_name || ""]);
        csvRows.push(["Brand Email", brandData.brand_email || ""]);
        csvRows.push(["Brand Category", brandData.brand_category || ""]);
        csvRows.push(["Brand Type", brandData.brand_type || ""]);
        csvRows.push(["Registration Type", brandData.registration_type || ""]);
        csvRows.push(["CIN/MSME Number", brandData.cin_or_msme_number || ""]);
        csvRows.push(["Company", brandData.company_id?.registered_company_name || ""]);
        csvRows.push(["Company ID", brandData.company_id?.company_id || ""]);

        // Contact information
        csvRows.push(["Contact Name", brandData.contact_name || ""]);
        csvRows.push(["Contact Phone", brandData.contact_phone || ""]);
        csvRows.push(["Address", brandData.address || ""]);

        // Financial information
        csvRows.push(["Bank Account", brandData.bank_account_of_brand || ""]);
        csvRows.push(["IFSC Code", brandData.ifsc_code || ""]);
        csvRows.push(["Payment Terms", brandData.payment_terms || ""]);
        csvRows.push(["GST Details", brandData.gst_details || ""]);
        csvRows.push(["PAN Number", brandData.PAN_number || ""]);
        csvRows.push(["FSSAI Number", brandData.FSSAI_number || ""]);
        csvRows.push(["TDS Rate", brandData.TDS_rate || ""]);
        csvRows.push(["Billing Cycle", brandData.billing_cycle || ""]);
        csvRows.push(["Payment Methods", brandData.payment_methods || ""]);

        // Contract information
        csvRows.push(["Contract Start Date", brandData.contract_start_date ?
          new Date(brandData.contract_start_date).toISOString().split('T')[0] : ""]);
        csvRows.push(["Contract End Date", brandData.contract_end_date ?
          new Date(brandData.contract_end_date).toISOString().split('T')[0] : ""]);
        csvRows.push(["Contract Renewal Date", brandData.contract_renewal_date ?
          new Date(brandData.contract_renewal_date).toISOString().split('T')[0] : ""]);

        // Status information
        csvRows.push(["Verification Status", brandData.verification_status || ""]);
        csvRows.push(["Brand Status Cycle", brandData.brand_status_cycle || ""]);
        csvRows.push(["Verified By", brandData.verified_by?.email || ""]);
        csvRows.push(["Warehouse", brandData.warehouse_id?.warehouse_name || ""]);

        // Additional notes
        csvRows.push(["Risk Notes", brandData.risk_notes || ""]);
        csvRows.push(["Contract Terms", brandData.contract_terms || ""]);
        csvRows.push(["Internal Notes", brandData.internal_notes || ""]);

        // Timestamps
        csvRows.push(["Created At", brandData.createdAt ?
          new Date(brandData.createdAt).toISOString() : ""]);
        csvRows.push(["Updated At", brandData.updatedAt ?
          new Date(brandData.updatedAt).toISOString() : ""]);

        // Convert to CSV string
        const csvContent = [
          headers.join(','),
          ...csvRows.map(row =>
            row.map(cell => {
              // Escape commas and quotes in cell values
              const cellStr = String(cell);
              if (cellStr.includes(',') || cellStr.includes('"') || cellStr.includes('\n')) {
                return `"${cellStr.replace(/"/g, '""')}"`;
              }
              return cellStr;
            }).join(',')
          )
        ].join('\n');

        return csvContent;
      }

      return brand;
    } catch (error) {
      logger.error(`Error exporting brand ${brandId}:`, error);
      throw error;
    }
  }
  async toggleCompanyStatus(
    companyId: string,
    updatedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<ICompanyCreate | null> {
    try {
      // Find the company by company_id
      const company = await CompanyCreate.findOne({ company_id: companyId });

      if (!company) {
        throw new Error(`Company with ID ${companyId} not found`);
      }

      // Get current status
      const currentStatus = company.company_status;

      // Toggle the status
      const newStatus = currentStatus === "active" ? "inactive" : "active";

      // Save the old state for audit trail
      const oldState = company.toObject();

      // Update the status
      company.company_status = newStatus;
      await company.save();

      // Create audit trail
      if (req) {
        await auditTrailService.createAuditRecord({
          user: updatedBy,
          user_email: userEmail,
          user_role: userRole,
          action: "toggle_status",
          action_description: `Toggled company status from ${currentStatus} to ${newStatus}`,
          target_type: "company",
          target_company: company._id,
          target_company_name: company.registered_company_name,
          target_company_cin: company.cin_or_msme_number,
          before_state: { company_status: currentStatus },
          after_state: { company_status: newStatus },
          changed_fields: ["company_status"],
          ip_address: req.ip,
          user_agent: req.get("User-Agent"),
        });
      }

      logger.info(`Company status toggled: ${company.registered_company_name} from ${currentStatus} to ${newStatus}`);

      // Return the updated company
      const updatedCompany = await CompanyCreate.findOne({ company_id: companyId })
        .lean() as unknown as ICompanyCreate;

      return updatedCompany;
    } catch (error) {
      logger.error(`Error toggling company status ${companyId}:`, error);
      throw error;
    }
  }

  // Validate brand data
  async validateBrandData(data: {
    brand_email?: string;
    cin_or_msme_number?: string;
  }): Promise<{
    isValid: boolean;
    errors: string[];
    details: {
      brand_email?: { exists: boolean; message: string };
      company_exists?: { exists: boolean; message: string };
    };
  }> {
    try {
      const errors: string[] = [];
      const details: any = {};

      // Check brand email
      if (data.brand_email) {
        const existingEmail = await BrandCreate.findOne({
          brand_email: data.brand_email.toLowerCase(),
        });
        details.brand_email = {
          exists: !!existingEmail,
          message: existingEmail ? "Brand email already exists" : "Brand email is available",
        };
        if (existingEmail) {
          errors.push("Brand email already exists");
        }
      }

      // Check company exists
      if (data.cin_or_msme_number) {
        const companyExists = await CompanyCreate.findOne({
          cin_or_msme_number: data.cin_or_msme_number,
        });
        details.company_exists = {
          exists: !!companyExists,
          message: companyExists ? "Company exists" : "Company not found",
        };
        if (!companyExists) {
          errors.push("Company with this registration number does not exist");
        }
      }

      return {
        isValid: errors.length === 0,
        errors,
        details,
      };
    } catch (error) {
      logger.error("Error validating brand data:", error);
      throw error;
    }
  }

  // Bulk create brands
  async bulkCreateBrands(
    brands: IBrandCreateData[],
    createdBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: Request
  ): Promise<{
    successful: IBrandCreate[];
    failed: Array<{ data: IBrandCreateData; error: string }>;
  }> {
    try {
      const successful: IBrandCreate[] = [];
      const failed: Array<{ data: IBrandCreateData; error: string }> = [];

      for (const brandData of brands) {
        try {
          // Check for duplicates in this batch
          const duplicateInBatch = brands.filter(
            (b, idx) =>
              b.brand_email.toLowerCase() === brandData.brand_email.toLowerCase()
          ).length > 1;

          if (duplicateInBatch) {
            throw new Error("Duplicate brand email found within the batch");
          }

          const newBrand = await this.createBrand(
            brandData,
            createdBy,
            userEmail,
            userRole,
            req
          );
          successful.push(newBrand);
        } catch (error: any) {
          failed.push({
            data: brandData,
            error: error.message,
          });
        }
      }

      return { successful, failed };
    } catch (error) {
      logger.error("Error in bulk brand creation:", error);
      throw error;
    }
  }
}