import mongoose, { Types } from "mongoose";
import {
  VendorCreate,
  IVendorCreate,
  VendorDashboard,
  IVendorDashboard,
  IVendorDocument,
  ICompanyCreate,
  CompanyCreate,
} from "../models/Vendor.model";
import { AuditTrailService } from "./auditTrail.service";
import { DocumentUploadService } from "./documentUpload.service";

import { logger } from "../utils/logger.util";
export class VendorService {
  private auditTrailService = new AuditTrailService();
  private documentUploadService = new DocumentUploadService();

  public static async createCompanyService(
    data: {
      registered_company_name: string;
      company_address: string;
      office_email: string;
      legal_entity_structure: string;
      cin: string;
      gst_number: string;
      date_of_incorporation: Date;
      corporate_website?: string;
      directory_signature_name: string;
      din: string;
      company_status?: "active" | "inactive" | "blacklisted" | "under_review";
      risk_rating?: "low" | "medium" | "high";
    },
    userId: any,
    userEmail: string,
    userRole: string,
    req?: any
  ) {
    const {
      registered_company_name,
      company_address,
      office_email,
      legal_entity_structure,
      cin,
      gst_number,
      date_of_incorporation,
      corporate_website,
      directory_signature_name,
      din,
      company_status,
      risk_rating,
    } = data;

    const requiredFields = [
      "registered_company_name",
      "company_address",
      "office_email",
      "legal_entity_structure",
      "cin",
      "gst_number",
      "date_of_incorporation",
      "directory_signature_name",
      "din",
    ];

    const missingFields = requiredFields.filter(field => !data[field as keyof typeof data]);
    if (missingFields.length > 0) {
      throw new Error(`Missing required fields: ${missingFields.join(", ")}`);
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(office_email)) {
      throw new Error("Invalid email format");
    }

    const incorporationDate = new Date(date_of_incorporation);
    if (isNaN(incorporationDate.getTime())) {
      throw new Error("Invalid date format for date_of_incorporation");
    }

    const today = new Date();
    if (incorporationDate > today) {
      throw new Error("Date of incorporation cannot be in the future");
    }

    const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
    if (!gstRegex.test(gst_number)) {
      throw new Error("Invalid GST number format");
    }

    const existingCompanies = await Promise.all([
      CompanyCreate.findOne({ office_email }),
      CompanyCreate.findOne({ cin }),
      CompanyCreate.findOne({ din }),
      CompanyCreate.findOne({ gst_number }),
    ]);

    const errors = [];
    if (existingCompanies[0]) errors.push("Company with this email already exists");
    if (existingCompanies[1]) errors.push("Company with this registration number already exists");
    if (existingCompanies[2]) errors.push("Company with this DIN already exists");
    if (existingCompanies[3]) errors.push("Company with this GST number already exists");

    if (errors.length > 0) {
      throw new Error(errors.join(", "));
    }

    if (corporate_website) {
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      if (!urlRegex.test(corporate_website)) {
        throw new Error("Invalid website URL format");
      }
    }

    const newCompany = new CompanyCreate({
      registered_company_name,
      company_address,
      office_email: office_email.toLowerCase(),
      legal_entity_structure,
      cin,
      gst_number: gst_number.toUpperCase(),
      date_of_incorporation: incorporationDate,
      corporate_website,
      directory_signature_name,
      din,
      company_status: company_status || "active",
      risk_rating: risk_rating || "medium",
    });

    const savedCompany = await newCompany.save();

    const auditTrailService = new AuditTrailService();
    try {
      await auditTrailService.createAuditRecord({
        user: userId,
        user_email: userEmail,
        user_role: userRole,
        action: "create",
        action_description: `Created new company: ${registered_company_name}`,
        target_type: "company",
        target_company: savedCompany._id as Types.ObjectId,
        target_company_name: registered_company_name,
        target_company_cin: cin,
        after_state: savedCompany.toObject(),
        changed_fields: [],
        ip_address: req?.ip || req?.headers?.["x-forwarded-for"] || req?.connection?.remoteAddress,
        user_agent: req?.get?.("User-Agent") || req?.headers?.["user-agent"],
      });
    } catch (auditError) {
      logger.error("Failed to create company audit trail:", auditError);
    }

    const companyObj = savedCompany.toObject();
    delete companyObj.__v;

    return companyObj;
  }

  public static async getAllCompaniesService(
    query: {
      page?: number;
      limit?: number;
      search?: string;
      sortBy?: string;
      sortOrder?: "asc" | "desc";
    } = {}
  ) {
    const { page = 1, limit = 10, search, sortBy = "createdAt", sortOrder = "desc" } = query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {};

    if (search) {
      filter.$or = [
        { registered_company_name: { $regex: search, $options: "i" } },
        { office_email: { $regex: search, $options: "i" } },
        { cin: { $regex: search, $options: "i" } },
        { din: { $regex: search, $options: "i" } },
        { directory_signature_name: { $regex: search, $options: "i" } },
      ];
    }

    const sort: any = {};
    sort[String(sortBy)] = sortOrder === "asc" ? 1 : -1;

    const [companies, totalCount] = await Promise.all([
      CompanyCreate.find(filter).select("-__v").sort(sort).skip(skip).limit(limitNum),

      CompanyCreate.countDocuments(filter),
    ]);

    const companiesWithVendorCounts = await Promise.all(
      companies.map(async company => {
        const vendorCount = await VendorCreate.countDocuments({
          cin: company.cin,
        });

        const companyObj = company.toObject();
        return {
          ...companyObj,
          vendorCount,
        };
      })
    );

    const totalPages = Math.ceil(totalCount / limitNum);

    return {
      data: companiesWithVendorCounts,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
        limit: limitNum,
      },
    };
  }

  public static async getCompanyByIdService(cin: string) {
    if (!cin || cin.trim() === "") {
      throw new Error("Company CIN is required");
    }

    const company = await CompanyCreate.findOne({ cin: cin }).select("-__v");

    if (!company) {
      throw new Error("Company not found");
    }

    return company;
  }

  public static async updateCompanyService(
    cin: string,
    data: Partial<{
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
      company_status: "active" | "inactive" | "blacklisted" | "under_review";
      risk_rating: "low" | "medium" | "high";
    }>,
    userId: any,
    userEmail: string,
    userRole: string,
    req?: any
  ) {
    if (!cin || cin.trim() === "") {
      throw new Error("Company CIN is required");
    }

    const existingCompany = await CompanyCreate.findOne({ cin: cin });
    if (!existingCompany) {
      throw new Error("Company not found");
    }

    const beforeState = existingCompany.toObject();

    if (data.office_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(data.office_email)) {
        throw new Error("Invalid email format");
      }

      const companyWithSameEmail = await CompanyCreate.findOne({
        office_email: data.office_email.toLowerCase(),
        cin: { $ne: cin },
      });

      if (companyWithSameEmail) {
        throw new Error("Company with this email already exists");
      }

      data.office_email = data.office_email.toLowerCase();
    }

    if (data.gst_number) {
      const gstRegex = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      if (!gstRegex.test(data.gst_number)) {
        throw new Error("Invalid GST number format");
      }

      const companyWithSameGST = await CompanyCreate.findOne({
        gst_number: data.gst_number.toUpperCase(),
        cin: { $ne: cin },
      });

      if (companyWithSameGST) {
        throw new Error("Company with this GST number already exists");
      }

      data.gst_number = data.gst_number.toUpperCase();
    }

    if (data.date_of_incorporation) {
      const incorporationDate = new Date(data.date_of_incorporation);
      if (isNaN(incorporationDate.getTime())) {
        throw new Error("Invalid date format for date_of_incorporation");
      }

      const today = new Date();
      if (incorporationDate > today) {
        throw new Error("Date of incorporation cannot be in the future");
      }

      data.date_of_incorporation = incorporationDate;
    }

    if (data.cin && data.cin !== cin) {
      const companyWithSameRegNo = await CompanyCreate.findOne({
        cin: data.cin,
      });

      if (companyWithSameRegNo) {
        throw new Error("Company with this registration number already exists");
      }
    }

    if (data.din) {
      const companyWithSameDIN = await CompanyCreate.findOne({
        din: data.din,
        cin: { $ne: cin },
      });

      if (companyWithSameDIN) {
        throw new Error("Company with this DIN already exists");
      }
    }

    if (data.corporate_website) {
      const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
      if (!urlRegex.test(data.corporate_website)) {
        throw new Error("Invalid website URL format");
      }
    }

    const updatedCompany = await CompanyCreate.findOneAndUpdate({ cin: cin }, data, {
      new: true,
      runValidators: true,
    }).select("-__v");

    if (updatedCompany) {
      const auditTrailService = new AuditTrailService();

      const changedFields = Object.keys(data).filter(key => {
        const oldValue = beforeState[key as keyof typeof beforeState];
        const newValue = data[key as keyof typeof data];
        return JSON.stringify(oldValue) !== JSON.stringify(newValue);
      });

      try {
        await auditTrailService.createAuditRecord({
          user: userId,
          user_email: userEmail,
          user_role: userRole,
          action: "update",
          action_description: `Updated company: ${updatedCompany.registered_company_name}`,
          target_type: "company",
          target_company: updatedCompany._id as Types.ObjectId,
          target_company_name: updatedCompany.registered_company_name,
          target_company_cin: updatedCompany.cin,
          before_state: beforeState,
          after_state: updatedCompany.toObject(),
          changed_fields: changedFields,
          ip_address:
            req?.ip || req?.headers?.["x-forwarded-for"] || req?.connection?.remoteAddress,
          user_agent: req?.get?.("User-Agent") || req?.headers?.["user-agent"],
        });
      } catch (auditError) {
        logger.error("Failed to create company update audit trail:", auditError);
      }
    }

    return updatedCompany;
  }

  public static async deleteCompanyService(
    cin: string,
    userId: any,
    userEmail: string,
    userRole: string,
    req?: any
  ) {
    if (!cin || cin.trim() === "") {
      throw new Error("Company CIN is required");
    }

    const companyToDelete = await CompanyCreate.findOne({ cin: cin });

    if (!companyToDelete) {
      throw new Error("Company not found");
    }

    const beforeState = companyToDelete.toObject();
    const deletedCompany = await CompanyCreate.findOneAndDelete({ cin: cin });

    if (deletedCompany) {
      const auditTrailService = new AuditTrailService();

      try {
        await auditTrailService.createAuditRecord({
          user: userId,
          user_email: userEmail,
          user_role: userRole,
          action: "delete",
          action_description: `Deleted company: ${deletedCompany.registered_company_name}`,
          target_type: "company",
          target_company: deletedCompany._id as Types.ObjectId,
          target_company_name: deletedCompany.registered_company_name,
          target_company_cin: deletedCompany.cin,
          before_state: beforeState,
          changed_fields: [],
          ip_address:
            req?.ip || req?.headers?.["x-forwarded-for"] || req?.connection?.remoteAddress,
          user_agent: req?.get?.("User-Agent") || req?.headers?.["user-agent"],
        });
      } catch (auditError) {
        logger.error("Failed to create company deletion audit trail:", auditError);
      }
    }

    return deletedCompany;
  }

  public static async checkCompanyExists(cin: string): Promise<boolean> {
    if (!cin || cin.trim() === "") {
      return false;
    }
    const company = await CompanyCreate.findOne({ cin: cin });
    return !!company;
  }

  public static async searchCompaniesService(searchTerm: string, limit: number = 10) {
    if (!searchTerm || searchTerm.trim() === "") {
      throw new Error("Search term is required");
    }

    const companies = await CompanyCreate.find({
      $or: [
        { registered_company_name: { $regex: searchTerm, $options: "i" } },
        { office_email: { $regex: searchTerm, $options: "i" } },
      ],
    })
      .select("registered_company_name office_email company_registration_number")
      .limit(limit)
      .sort({ registered_company_name: 1 });

    return companies;
  }
  async createCompleteVendor(
    vendorData: Partial<IVendorCreate>,
    createdBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: any
  ): Promise<IVendorCreate> {
    try {
      VendorValidationService.validateCompleteVendorData(vendorData);

      if (vendorData.cin) {
        const companyExists = await CompanyCreate.findOne({
          cin: vendorData.cin,
        });

        if (!companyExists) {
          throw new Error(
            `Company with registration number "${vendorData.cin}" does not exist. Please create the company first.`
          );
        }
      } else {
        throw new Error("Company registration number is required");
      }

      let verificationStatus = "pending";

      if (vendorData.verification_status) {
        if (userRole === "super_admin") {
          verificationStatus = vendorData.verification_status;
        } else {
          if (vendorData.verification_status !== "pending") {
            throw new Error(
              "Only Super Admin can set verification status to verified/failed/rejected"
            );
          }
          verificationStatus = vendorData.verification_status;
        }
      }

      const existingVendorByEmail = await VendorCreate.findOne({
        vendor_email: vendorData.vendor_email?.toLowerCase(),
      });

      if (existingVendorByEmail) {
        throw new Error("Vendor with this email already exists");
      }

      if (!vendorData.vendor_id) {
        vendorData.vendor_id = this.generateVendorId();
      } else {
        const existingVendorById = await VendorCreate.findOne({
          vendor_id: vendorData.vendor_id,
        });

        if (existingVendorById) {
          throw new Error("Vendor with this ID already exists");
        }
      }

      const completeVendorData = {
        ...vendorData,
        createdBy,
        verification_status: verificationStatus,
        verified_by: verificationStatus === "verified" ? createdBy : undefined,
      };

      const vendor = new VendorCreate(completeVendorData);
      const savedVendor = await vendor.save();

      await this.createVendorAuditRecord(
        createdBy,
        userEmail,
        userRole,
        "create",
        `Created new vendor: ${savedVendor.vendor_name}`,
        savedVendor._id as Types.ObjectId,
        savedVendor.vendor_name,
        savedVendor.vendor_id,
        undefined,
        savedVendor.toObject(),
        req
      );

      return savedVendor;
    } catch (error: any) {
      throw new Error(`Error creating vendor: ${error.message}`);
    }
  }
  async updateVendor(
    id: string,
    updateData: Partial<IVendorCreate>,
    userRole: string,
    userId: Types.ObjectId,
    userEmail: string,
    req?: any
  ): Promise<IVendorCreate | null> {
    try {
      const currentVendor = await VendorCreate.findById(id);
      if (!currentVendor) {
        throw new Error("Vendor not found");
      }

      if (
        !["super_admin", "vendor_admin"].includes(userRole) &&
        "verification_status" in updateData
      ) {
        if (updateData.verification_status !== currentVendor.verification_status) {
          throw new Error("Only Super Admin or Vendor Admin can modify verification status");
        }
        delete updateData.verification_status;
      }

      if (updateData.vendor_email) {
        const existingVendor = await VendorCreate.findOne({
          vendor_email: updateData.vendor_email.toLowerCase(),
          _id: { $ne: id },
        });

        if (existingVendor) {
          throw new Error("Vendor with this email already exists");
        }
      }

      if (updateData.vendor_id) {
        const existingVendor = await VendorCreate.findOne({
          vendor_id: updateData.vendor_id,
          _id: { $ne: id },
        });

        if (existingVendor) {
          throw new Error("Vendor with this ID already exists");
        }
      }

      const updatedVendor = await VendorCreate.findByIdAndUpdate(id, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("createdBy", "name email")
        .populate("verified_by", "name email");

      if (updatedVendor) {
        await this.createVendorAuditRecord(
          userId,
          userEmail,
          userRole,
          "update",
          `Updated vendor: ${updatedVendor.vendor_name}`,
          updatedVendor._id as Types.ObjectId,
          updatedVendor.vendor_name,
          updatedVendor.vendor_id,
          currentVendor.toObject(),
          updatedVendor.toObject(),
          req
        );
      }

      return updatedVendor;
    } catch (error: any) {
      throw new Error(`Error updating vendor: ${error.message}`);
    }
  }

  async updateVendorVerification(
    vendorId: string,
    verificationStatus: "verified" | "rejected" | "pending",
    verifiedBy: Types.ObjectId,
    userRole: string,
    userEmail: string,
    notes?: string,
    req?: any
  ): Promise<IVendorCreate> {
    try {
      if (userRole !== "super_admin" && userRole !== "vendor_admin") {
        throw new Error("Only Super Admin or Vendor Admin can modify vendor verification status");
      }

      const currentVendor = await VendorCreate.findById(vendorId);
      if (!currentVendor) {
        throw new Error("Vendor not found");
      }

      const updateData: any = {
        verification_status: verificationStatus,
        verified_by: verifiedBy,
        updatedAt: new Date(),
      };

      if (notes) {
        updateData.risk_notes = `${verificationStatus.toUpperCase()} - ${notes} (${new Date().toISOString()})`;
      } else {
        updateData.risk_notes = `Status changed to ${verificationStatus} by super admin on ${new Date().toISOString()}`;
      }

      const updatedVendor = await VendorCreate.findByIdAndUpdate(vendorId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("verified_by", "name email")
        .populate("createdBy", "name email");

      if (!updatedVendor) {
        throw new Error("Vendor not found");
      }

      await this.createVendorAuditRecord(
        verifiedBy,
        userEmail,
        userRole,
        "status_change",
        `Changed vendor status to ${verificationStatus}: ${notes || "No additional notes"}`,
        updatedVendor._id as Types.ObjectId,
        updatedVendor.vendor_name,
        updatedVendor.vendor_id,
        currentVendor.toObject(),
        updatedVendor.toObject(),
        req
      );

      return updatedVendor;
    } catch (error: any) {
      throw new Error(`Error updating vendor verification: ${error.message}`);
    }
  }

  async deleteVendor(
    id: string,
    userId: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: any
  ): Promise<boolean> {
    try {
      const vendorToDelete = await VendorCreate.findById(id);
      if (!vendorToDelete) {
        throw new Error("Vendor not found");
      }

      const result = await VendorCreate.findByIdAndDelete(id);

      if (result) {
        await this.createVendorAuditRecord(
          userId,
          userEmail,
          userRole,
          "delete",
          `Deleted vendor: ${vendorToDelete.vendor_name}`,
          vendorToDelete._id as Types.ObjectId,
          vendorToDelete.vendor_name,
          vendorToDelete.vendor_id,
          vendorToDelete.toObject(),
          undefined,
          req
        );
      }

      return !!result;
    } catch (error: any) {
      throw new Error(`Error deleting vendor: ${error.message}`);
    }
  }

  private generateVendorId(): string {
    const timestamp = new Date().getTime().toString().slice(-6);
    const random = Math.random().toString(36).substring(2, 5).toUpperCase();
    return `VEND-${timestamp}-${random}`;
  }

  async getCommonDashboard(
    filters: {
      verification_status?: string;
      risk_rating?: string;
      vendor_category?: string;
      search?: string;
      company_search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    total_companies: number;
    total_vendors: number;
    pending_vendors: number;
    verified_vendors: number;
    rejected_vendors: number;
    companies: any[];
    vendors: any[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      limit: number;
    };
  }> {
    try {
      logger.info("📊 COMMON DASHBOARD (Accessible by Super Admin & Vendor Admin)");
      logger.info("🔍 Filters:", filters);

      const totalCompanies = await CompanyCreate.countDocuments();

      const [totalVendors, pendingVendors, verifiedVendors, rejectedVendors] = await Promise.all([
        VendorCreate.countDocuments(),
        VendorCreate.countDocuments({ verification_status: "pending" }),
        VendorCreate.countDocuments({ verification_status: "verified" }),
        VendorCreate.countDocuments({ verification_status: "rejected" }),
      ]);

      logger.info("📈 Statistics:", {
        totalCompanies,
        totalVendors,
        pendingVendors,
        verifiedVendors,
        rejectedVendors,
      });

      const companyQuery: any = {};
      if (filters.company_search) {
        companyQuery.$or = [
          { registered_company_name: { $regex: filters.company_search, $options: "i" } },
          { office_email: { $regex: filters.company_search, $options: "i" } },
          { cin: { $regex: filters.company_search, $options: "i" } },
        ];
      }

      const companies = await CompanyCreate.find(companyQuery)
        .select("registered_company_name office_email cin date_of_incorporation createdAt")
        .sort({ createdAt: -1 })
        .limit(5)
        .lean();

      const companiesWithVendorCount = await Promise.all(
        companies.map(async company => {
          const vendorCount = await VendorCreate.countDocuments({ cin: company.cin });
          return {
            ...company,
            vendor_count: vendorCount,
          };
        })
      );

      const vendorQuery: any = {};

      if (filters.verification_status) {
        vendorQuery.verification_status = filters.verification_status;
      }

      if (filters.risk_rating) {
        vendorQuery.risk_rating = filters.risk_rating;
      }

      if (filters.vendor_category) {
        vendorQuery.vendor_category = filters.vendor_category;
      }

      if (filters.search) {
        vendorQuery.$or = [
          { vendor_name: { $regex: filters.search, $options: "i" } },
          { vendor_email: { $regex: filters.search, $options: "i" } },
          { vendor_id: { $regex: filters.search, $options: "i" } },
          { primary_contact_name: { $regex: filters.search, $options: "i" } },
          { vendor_category: { $regex: filters.search, $options: "i" } },
        ];
      }

      logger.info("🔍 Vendor Query:", JSON.stringify(vendorQuery, null, 2));

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const [vendors, totalCount] = await Promise.all([
        VendorCreate.find(vendorQuery)
          .populate("createdBy", "name email")
          .populate("verified_by", "name email")
          .select(
            "vendor_name vendor_category vendor_id cin risk_rating contract_expiry_date verification_status createdBy verified_by createdAt updatedAt"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        VendorCreate.countDocuments(vendorQuery),
      ]);

      logger.info("✅ Vendors found:", vendors.length);
      logger.info("📊 Total vendor count with filters:", totalCount);

      const dashboardVendors = vendors.map(vendor => ({
        _id: vendor._id,
        vendor_id: vendor.vendor_id,
        vendor_name: vendor.vendor_name,
        vendor_category: vendor.vendor_category,
        cin: vendor.cin,
        verification_status: vendor.verification_status,
        risk_rating: vendor.risk_rating,
        contract_expiry_date: vendor.contract_expiry_date,
        created_by: vendor.createdBy,
        verified_by: vendor.verified_by,
        created_at: vendor.createdAt,
        updated_at: vendor.updatedAt,
        actions: ["view"],
      }));

      const totalPages = Math.ceil(totalCount / limit);

      return {
        total_companies: totalCompanies,
        total_vendors: totalVendors,
        pending_vendors: pendingVendors,
        verified_vendors: verifiedVendors,
        rejected_vendors: rejectedVendors,
        companies: companiesWithVendorCount,
        vendors: dashboardVendors,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          limit,
        },
      };
    } catch (error: any) {
      logger.error("❌ Error getting common dashboard:", error);
      throw new Error(`Error getting common dashboard: ${error.message}`);
    }
  }

  async getSuperAdminVendorManagementDashboard(
    filters: {
      verification_status?: string;
      risk_rating?: string;
      vendor_category?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{
    total_vendors: number;
    pending_approvals: number;
    verified_vendors: number;
    rejected_vendors: number;
    failed_vendors: number;
    vendors: any[];
    pagination?: {
      currentPage: number;
      totalPages: number;
      totalCount: number;
      hasNextPage: boolean;
      hasPreviousPage: boolean;
      limit: number;
    };
  }> {
    try {
      logger.info("👑 SUPER ADMIN VENDOR MANAGEMENT DASHBOARD");
      logger.info("🔍 Filters:", filters);

      const [totalVendors, pendingApprovals, verifiedVendors, rejectedVendors, failedVendors] =
        await Promise.all([
          VendorCreate.countDocuments(),
          VendorCreate.countDocuments({ verification_status: "pending" }),
          VendorCreate.countDocuments({ verification_status: "verified" }),
          VendorCreate.countDocuments({ verification_status: "rejected" }),
          VendorCreate.countDocuments({ verification_status: "failed" }),
        ]);

      logger.info("📈 Vendor Statistics:", {
        totalVendors,
        pendingApprovals,
        verifiedVendors,
        rejectedVendors,
        failedVendors,
      });

      const query: any = {};

      if (filters.verification_status) {
        query.verification_status = filters.verification_status;
      }

      if (filters.risk_rating) {
        query.risk_rating = filters.risk_rating;
      }

      if (filters.vendor_category) {
        query.vendor_category = filters.vendor_category;
      }

      if (filters.search) {
        query.$or = [
          { vendor_name: { $regex: filters.search, $options: "i" } },
          { vendor_email: { $regex: filters.search, $options: "i" } },
          { vendor_id: { $regex: filters.search, $options: "i" } },
          { primary_contact_name: { $regex: filters.search, $options: "i" } },
          { vendor_category: { $regex: filters.search, $options: "i" } },
        ];
      }

      logger.info("🔍 Final Query:", JSON.stringify(query, null, 2));

      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const [vendors, totalCount] = await Promise.all([
        VendorCreate.find(query)
          .populate("createdBy", "name email")
          .populate("verified_by", "name email")
          .select(
            "vendor_name vendor_category vendor_id cin risk_rating contract_expiry_date verification_status createdBy verified_by risk_notes createdAt updatedAt"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        VendorCreate.countDocuments(query),
      ]);

      logger.info("✅ Vendors found:", vendors.length);
      logger.info("📊 Total count with filters:", totalCount);

      const managementVendors = vendors.map(vendor => ({
        _id: vendor._id,
        vendor_id: vendor.vendor_id,
        vendor_name: vendor.vendor_name,
        vendor_category: vendor.vendor_category,
        cin: vendor.cin,
        verification_status: vendor.verification_status,
        risk_rating: vendor.risk_rating,
        contract_expiry_date: vendor.contract_expiry_date,
        created_by: vendor.createdBy,
        verified_by: vendor.verified_by,
        risk_notes: vendor.risk_notes,
        created_at: vendor.createdAt,
        updated_at: vendor.updatedAt,
        actions: this.getSuperAdminActions(vendor.verification_status),
      }));

      const totalPages = Math.ceil(totalCount / limit);

      return {
        total_vendors: totalVendors,
        pending_approvals: pendingApprovals,
        verified_vendors: verifiedVendors,
        rejected_vendors: rejectedVendors,
        failed_vendors: failedVendors,
        vendors: managementVendors,
        pagination: {
          currentPage: page,
          totalPages,
          totalCount,
          hasNextPage: page < totalPages,
          hasPreviousPage: page > 1,
          limit,
        },
      };
    } catch (error: any) {
      logger.error("❌ Error getting super admin vendor management dashboard:", error);
      throw new Error(`Error getting super admin vendor management dashboard: ${error.message}`);
    }
  }

  private getSuperAdminActions(verificationStatus: string): string[] {
    switch (verificationStatus) {
      case "pending":
        return ["verify", "reject", "view", "edit", "delete"];
      case "verified":
        return ["reject", "view", "edit", "delete"];
      case "rejected":
        return ["verify", "view", "edit", "delete"];
      case "failed":
        return ["verify", "reject", "view", "edit", "delete"];
      default:
        return ["view", "edit", "delete"];
    }
  }

  async toggleVendorVerification(
    vendorId: string,
    verifiedBy: Types.ObjectId,
    userRole: string
  ): Promise<IVendorCreate> {
    try {
      if (userRole !== "super_admin") {
        throw new Error("Only Super Admin can verify or reject vendors");
      }

      const vendor = await VendorCreate.findById(vendorId);
      if (!vendor) {
        throw new Error("Vendor not found");
      }

      let newStatus: "verified" | "rejected";
      const updateData: any = {
        verified_by: verifiedBy,
        updatedAt: new Date(),
      };

      if (vendor.verification_status === "verified") {
        newStatus = "rejected";
        updateData.verification_status = newStatus;
        updateData.risk_notes = `Vendor rejected by super admin on ${new Date().toISOString()}`;
      } else if (vendor.verification_status === "rejected") {
        newStatus = "verified";
        updateData.verification_status = newStatus;
        updateData.risk_notes = `Vendor verified by super admin on ${new Date().toISOString()}`;
      } else {
        newStatus = "verified";
        updateData.verification_status = newStatus;
        updateData.risk_notes = `Vendor verified by super admin on ${new Date().toISOString()}`;
      }

      const updatedVendor = await VendorCreate.findByIdAndUpdate(vendorId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("verified_by", "name email")
        .populate("createdBy", "name email");

      if (!updatedVendor) {
        throw new Error("Vendor not found");
      }

      return updatedVendor;
    } catch (error: any) {
      throw new Error(`Error toggling vendor verification: ${error.message}`);
    }
  }

  async getAllVendorsForSuperAdmin(
    filters: {
      verification_status?: string;
      risk_rating?: string;
      vendor_category?: string;
      created_by?: string;
      search?: string;
      page?: number;
      limit?: number;
      date_from?: string;
      date_to?: string;
    } = {}
  ): Promise<{ vendors: any[]; total: number; page: number; pages: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const query: any = {};

      if (filters.verification_status) {
        query.verification_status = filters.verification_status;
      }

      if (filters.risk_rating) {
        query.risk_rating = filters.risk_rating;
      }

      if (filters.vendor_category) {
        query.vendor_category = filters.vendor_category;
      }

      if (filters.created_by) {
        query.createdBy = new Types.ObjectId(filters.created_by);
      }

      if (filters.date_from || filters.date_to) {
        query.createdAt = {};
        if (filters.date_from) {
          query.createdAt.$gte = new Date(filters.date_from);
        }
        if (filters.date_to) {
          query.createdAt.$lte = new Date(filters.date_to);
        }
      }

      if (filters.search) {
        query.$or = [
          { vendor_name: { $regex: filters.search, $options: "i" } },
          { vendor_email: { $regex: filters.search, $options: "i" } },
          { vendor_id: { $regex: filters.search, $options: "i" } },
          { primary_contact_name: { $regex: filters.search, $options: "i" } },
          { vendor_category: { $regex: filters.search, $options: "i" } },
        ];
      }

      const [vendors, total] = await Promise.all([
        VendorCreate.find(query)
          .populate("createdBy", "name email")
          .populate("verified_by", "name email")
          .select(
            "vendor_name vendor_category vendor_email vendor_id risk_rating verification_status contract_expiry_date createdBy verified_by createdAt updatedAt"
          )
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        VendorCreate.countDocuments(query),
      ]);

      const formattedVendors = vendors.map(vendor => ({
        _id: vendor._id,
        vendor_name: vendor.vendor_name,
        vendor_category: vendor.vendor_category,
        vendor_email: vendor.vendor_email,
        vendor_id: vendor.vendor_id,
        risk_rating: vendor.risk_rating,
        verification_status: vendor.verification_status,
        contract_expiry_date: vendor.contract_expiry_date,
        created_by: vendor.createdBy,
        verified_by: vendor.verified_by,
        created_at: vendor.createdAt,
        updated_at: vendor.updatedAt,
      }));

      return {
        vendors: formattedVendors,
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new Error(`Error fetching vendors for super admin: ${error.message}`);
    }
  }

  async bulkUpdateVendorVerification(
    vendorIds: string[],
    verificationStatus: "verified" | "rejected",
    verifiedBy: Types.ObjectId,
    userRole: string,
    rejectionReason?: string
  ): Promise<{ successful: string[]; failed: any[] }> {
    try {
      if (userRole !== "super_admin" && userRole !== "vendor_admin") {
        throw new Error("Only Super Admin or Vendor Admin can verify or reject vendors");
      }

      const successful: string[] = [];
      const failed: any[] = [];

      for (const vendorId of vendorIds) {
        try {
          const updateData: any = {
            verification_status: verificationStatus,
            verified_by: verifiedBy,
            updatedAt: new Date(),
          };

          if (verificationStatus === "rejected" && rejectionReason) {
            updateData.risk_notes = rejectionReason;
          }

          const updatedVendor = await VendorCreate.findByIdAndUpdate(vendorId, updateData, {
            new: true,
            runValidators: true,
          });

          if (updatedVendor) {
            successful.push(vendorId);
          } else {
            failed.push({ vendorId, error: "Vendor not found" });
          }
        } catch (error: any) {
          failed.push({ vendorId, error: error.message });
        }
      }

      return { successful, failed };
    } catch (error: any) {
      throw new Error(`Error bulk updating vendor verification: ${error.message}`);
    }
  }

  async quickVerifyOrRejectVendor(
    vendorId: string,
    verificationStatus: "verified" | "rejected",
    verifiedBy: Types.ObjectId,
    userEmail: string,
    userRole: string,
    actionDescription: string,
    req?: any
  ): Promise<IVendorCreate> {
    try {
      if (userRole !== "super_admin" && userRole !== "vendor_admin") {
        throw new Error("Only Super Admin or Vendor Admin can verify or reject vendors");
      }

      const currentVendor = await VendorCreate.findById(vendorId);
      if (!currentVendor) {
        throw new Error("Vendor not found");
      }

      const updateData: any = {
        verification_status: verificationStatus,
        verified_by: verifiedBy,
        updatedAt: new Date(),
      };

      const timestamp = new Date().toISOString();
      if (verificationStatus === "verified") {
        updateData.risk_notes = `QUICK VERIFIED via API route on ${timestamp}. ${actionDescription}`;
      } else {
        updateData.risk_notes = `QUICK REJECTED via API route on ${timestamp}. ${actionDescription}`;
      }

      const updatedVendor = await VendorCreate.findByIdAndUpdate(vendorId, updateData, {
        new: true,
        runValidators: true,
      })
        .populate("verified_by", "name email")
        .populate("createdBy", "name email");

      if (!updatedVendor) {
        throw new Error("Vendor not found");
      }

      await this.createVendorAuditRecord(
        verifiedBy,
        userEmail,
        userRole,
        "quick_status_change",
        `Quick ${verificationStatus} vendor via API route: ${actionDescription}`,
        updatedVendor._id as Types.ObjectId,
        updatedVendor.vendor_name,
        updatedVendor.vendor_id,
        currentVendor.toObject(),
        updatedVendor.toObject(),
        req
      );

      return updatedVendor;
    } catch (error: any) {
      throw new Error(`Error quick ${verificationStatus} vendor: ${error.message}`);
    }
  }
  async getVendorStatistics(): Promise<{
    total_vendors: number;
    pending_approvals: number;
    active_vendors: number;
    rejected_vendors: number;
    vendors_by_category: any[];
    vendors_by_risk: any[];
    recent_activity: any[];
  }> {
    try {
      const [totalVendors, pendingApprovals, activeVendors, rejectedVendors] = await Promise.all([
        VendorCreate.countDocuments(),
        VendorCreate.countDocuments({ verification_status: "pending" }),
        VendorCreate.countDocuments({ verification_status: "verified" }),
        VendorCreate.countDocuments({ verification_status: "rejected" }),
      ]);

      const vendorsByCategory = await VendorCreate.aggregate([
        {
          $group: {
            _id: "$vendor_category",
            count: { $sum: 1 },
            pending: {
              $sum: { $cond: [{ $eq: ["$verification_status", "pending"] }, 1, 0] },
            },
            verified: {
              $sum: { $cond: [{ $eq: ["$verification_status", "verified"] }, 1, 0] },
            },
            rejected: {
              $sum: { $cond: [{ $eq: ["$verification_status", "rejected"] }, 1, 0] },
            },
          },
        },
        { $sort: { count: -1 } },
      ]);

      const vendorsByRisk = await VendorCreate.aggregate([
        {
          $group: {
            _id: "$risk_rating",
            count: { $sum: 1 },
          },
        },
      ]);

      const recentActivity = await VendorCreate.find()
        .populate("createdBy", "name email")
        .populate("verified_by", "name email")
        .select("vendor_name verification_status createdBy verified_by createdAt")
        .sort({ createdAt: -1 })
        .limit(10)
        .lean();

      return {
        total_vendors: totalVendors,
        pending_approvals: pendingApprovals,
        active_vendors: activeVendors,
        rejected_vendors: rejectedVendors,
        vendors_by_category: vendorsByCategory,
        vendors_by_risk: vendorsByRisk,
        recent_activity: recentActivity,
      };
    } catch (error: any) {
      throw new Error(`Error getting vendor statistics: ${error.message}`);
    }
  }

  async getPendingApprovals(): Promise<any[]> {
    try {
      return await VendorCreate.find({ verification_status: "pending" })
        .populate("createdBy", "name email")
        .select(
          "vendor_name vendor_category vendor_email vendor_id risk_rating contract_expiry_date createdBy createdAt"
        )
        .sort({ createdAt: -1 })
        .lean();
    } catch (error: any) {
      throw new Error(`Error fetching pending approvals: ${error.message}`);
    }
  }

  async getVendorById(id: string): Promise<IVendorCreate | null> {
    try {
      return await VendorCreate.findById(id)
        .populate("createdBy", "name email")
        .populate("verified_by", "name email");
    } catch (error: any) {
      throw new Error(`Error fetching vendor: ${error.message}`);
    }
  }

  async getVendorByVendorId(vendorId: string): Promise<IVendorCreate | null> {
    try {
      return await VendorCreate.findOne({ vendor_id: vendorId })
        .populate("createdBy", "name email")
        .populate("verified_by", "name email");
    } catch (error: any) {
      throw new Error(`Error fetching vendor: ${error.message}`);
    }
  }

  async getMyVendorProfile(userId: Types.ObjectId): Promise<{
    user_info: {
      user_id: Types.ObjectId;
      total_vendors_created: number;
    };
    statistics: {
      total_vendors: number;
      pending_vendors: number;
      verified_vendors: number;
      rejected_vendors: number;
      failed_vendors: number;
    };
    vendors: IVendorCreate[];
  }> {
    try {
      const vendors = await VendorCreate.find({ createdBy: userId })
        .populate("createdBy", "name email")
        .populate("verified_by", "name email")
        .sort({ createdAt: -1 });

      const statistics = {
        total_vendors: vendors.length,
        pending_vendors: vendors.filter(v => v.verification_status === "pending").length,
        verified_vendors: vendors.filter(v => v.verification_status === "verified").length,
        rejected_vendors: vendors.filter(v => v.verification_status === "rejected").length,
        failed_vendors: vendors.filter(v => v.verification_status === "failed").length,
      };

      return {
        user_info: {
          user_id: userId,
          total_vendors_created: vendors.length,
        },
        statistics,
        vendors,
      };
    } catch (error: any) {
      throw new Error(`Error fetching vendor profile: ${error.message}`);
    }
  }

  async getAllVendors(
    filters: {
      verification_status?: string;
      risk_rating?: string;
      vendor_category?: string;
      search?: string;
      page?: number;
      limit?: number;
    } = {}
  ): Promise<{ vendors: IVendorCreate[]; total: number; page: number; pages: number }> {
    try {
      const page = filters.page || 1;
      const limit = filters.limit || 10;
      const skip = (page - 1) * limit;

      const query: any = {};

      if (filters.verification_status) {
        query.verification_status = filters.verification_status;
      }

      if (filters.risk_rating) {
        query.risk_rating = filters.risk_rating;
      }

      if (filters.vendor_category) {
        query.vendor_category = filters.vendor_category;
      }

      if (filters.search) {
        query.$or = [
          { vendor_name: { $regex: filters.search, $options: "i" } },
          { vendor_email: { $regex: filters.search, $options: "i" } },
          { vendor_id: { $regex: filters.search, $options: "i" } },
          { primary_contact_name: { $regex: filters.search, $options: "i" } },
        ];
      }

      const [vendors, total] = await Promise.all([
        VendorCreate.find(query)
          .populate("createdBy", "name email")
          .populate("verified_by", "name email")
          .sort({ createdAt: -1 })
          .skip(skip)
          .limit(limit),
        VendorCreate.countDocuments(query),
      ]);

      return {
        vendors,
        total,
        page,
        pages: Math.ceil(total / limit),
      };
    } catch (error: any) {
      throw new Error(`Error fetching vendors: ${error.message}`);
    }
  }

  async createBulkVendors(
    vendorsData: Partial<IVendorCreate>[],
    createdBy: Types.ObjectId
  ): Promise<{
    successful: any[];
    failed: any[];
  }> {
    const successful: any[] = [];
    const failed: any[] = [];

    for (let i = 0; i < vendorsData.length; i++) {
      try {
        if (vendorsData[i].cin) {
          const companyExists = await CompanyCreate.findOne({
            cin: vendorsData[i].cin,
          });

          if (!companyExists) {
            throw new Error(
              `Company with identification number "${vendorsData[i].cin}" does not exist`
            );
          }
        } else {
          throw new Error("Company registration number is required");
        }

        const result = await this.createCompleteVendor(
          vendorsData[i],
          createdBy,
          "",
          "vendor_admin"
        );
        successful.push({
          index: i,
          vendor_name: result.vendor_name,
          vendor_id: result.vendor_id,
          cin: result.cin,
          data: result,
        });
      } catch (error: any) {
        failed.push({
          index: i,
          vendor_name: vendorsData[i].vendor_name,
          cin: vendorsData[i].cin,
          error: error.message,
        });
      }
    }

    return { successful, failed };
  }

  public static async getVendorsByCompanyService(
    cin: string,
    query: {
      page?: number;
      limit?: number;
      search?: string;
      verification_status?: string;
      risk_rating?: string;
      vendor_category?: string;
    } = {}
  ) {
    const company = await CompanyCreate.findOne({
      cin: cin,
    });

    if (!company) {
      throw new Error("Company not found");
    }

    const {
      page = 1,
      limit = 10,
      search,
      verification_status,
      risk_rating,
      vendor_category,
    } = query;

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    const filter: any = {
      cin: cin,
    };

    if (verification_status) {
      filter.verification_status = verification_status;
    }

    if (risk_rating) {
      filter.risk_rating = risk_rating;
    }

    if (vendor_category) {
      filter.vendor_category = vendor_category;
    }

    if (search) {
      filter.$or = [
        { vendor_name: { $regex: search, $options: "i" } },
        { vendor_email: { $regex: search, $options: "i" } },
        { vendor_id: { $regex: search, $options: "i" } },
        { primary_contact_name: { $regex: search, $options: "i" } },
        { vendor_category: { $regex: search, $options: "i" } },
      ];
    }

    const [vendors, totalCount] = await Promise.all([
      VendorCreate.find(filter)
        .populate("createdBy", "name email")
        .populate("verified_by", "name email")
        .select("-__v")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),

      VendorCreate.countDocuments(filter),
    ]);

    const totalPages = Math.ceil(totalCount / limitNum);

    return {
      company: {
        _id: company._id,
        registered_company_name: company.registered_company_name,
        cin: company.cin,
        office_email: company.office_email,
      },
      vendors: vendors,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
        limit: limitNum,
      },
    };
  }

  public static async getCompanyWithVendorStatsService(cin: string) {
    const company = await CompanyCreate.findOne({
      cin: cin,
    }).select("-__v");

    if (!company) {
      throw new Error("Company not found");
    }

    const [vendorStats, vendorsByCategory, vendorsByRisk, recentVendors, totalVendors] =
      await Promise.all([
        VendorCreate.aggregate([
          {
            $match: {
              cin: company.cin,
            },
          },
          {
            $group: {
              _id: "$verification_status",
              count: { $sum: 1 },
            },
          },
        ]),

        VendorCreate.aggregate([
          {
            $match: {
              cin: company.cin,
            },
          },
          {
            $group: {
              _id: "$vendor_category",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ]),

        VendorCreate.aggregate([
          {
            $match: {
              cin: company.cin,
            },
          },
          {
            $group: {
              _id: "$risk_rating",
              count: { $sum: 1 },
            },
          },
        ]),

        VendorCreate.find({
          cin: company.cin,
        })
          .populate("createdBy", "name email")
          .select("vendor_name vendor_id vendor_category verification_status risk_rating createdAt")
          .sort({ createdAt: -1 })
          .limit(5),

        VendorCreate.countDocuments({
          cin: company.cin,
        }),
      ]);

    const statsObject = {
      pending: 0,
      verified: 0,
      failed: 0,
      rejected: 0,
      "in-review": 0,
      approved: 0,
    };

    vendorStats.forEach(stat => {
      const statusKey = stat._id?.toLowerCase()?.replace(/\s+/g, "-") || stat._id;
      if (statusKey in statsObject) {
        statsObject[statusKey] = stat.count;
      } else {
        statsObject[stat._id] = stat.count;
      }
    });

    const verifiedPercentage =
      totalVendors > 0 ? Math.round((statsObject.verified / totalVendors) * 100) : 0;

    const pendingPercentage =
      totalVendors > 0 ? Math.round((statsObject.pending / totalVendors) * 100) : 0;

    const riskDistribution = {};
    vendorsByRisk.forEach(risk => {
      const riskKey = risk._id || "Not Rated";
      const percentage = totalVendors > 0 ? Math.round((risk.count / totalVendors) * 100) : 0;

      riskDistribution[riskKey] = {
        count: risk.count,
        percentage: percentage,
      };
    });

    const topCategories = vendorsByCategory.slice(0, 3).map(cat => ({
      category: cat._id || "Uncategorized",
      count: cat.count,
      percentage: totalVendors > 0 ? Math.round((cat.count / totalVendors) * 100) : 0,
    }));

    return {
      company: company,
      statistics: {
        total_vendors: totalVendors,
        by_status: statsObject,
        by_category: vendorsByCategory,
        by_risk: riskDistribution,
        status_percentages: {
          verified: verifiedPercentage,
          pending: pendingPercentage,
        },
        top_categories: topCategories,
        category_count: vendorsByCategory.length,
        risk_levels_count: vendorsByRisk.length,
      },
      recent_vendors: recentVendors,
      overview: {
        company_name: company.registered_company_name,
        cin: company.cin,
        vendor_summary: `Total ${totalVendors} vendors registered`,
        verification_summary: `${statsObject.verified} verified (${verifiedPercentage}%)`,
      },
    };
  }
  async updateVendorForAdmin(
    id: string,
    updateData: Partial<IVendorCreate>,
    userId: Types.ObjectId,
    userRole: string
  ): Promise<IVendorCreate | null> {
    try {
      const existingVendor = await VendorCreate.findById(id);
      if (!existingVendor) {
        throw new Error("Vendor not found");
      }

      if (userRole === "vendor_admin" && !existingVendor.createdBy.equals(userId)) {
        throw new Error("You can only update vendors created by you");
      }

      if (
        !["super_admin", "vendor_admin"].includes(userRole) &&
        "verification_status" in updateData
      ) {
        if (updateData.verification_status !== existingVendor.verification_status) {
          throw new Error("Only Super Admin or Vendor Admin can modify verification status");
        }
        delete updateData.verification_status;
      }

      const allowedFields = [
        "vendor_name",
        "vendor_billing_name",
        "primary_contact_name",
        "vendor_category",
        "vendor_address",
        "vendor_contact",
        "vendor_email",
        "vendor_phone",
        "bank_account_number",
        "ifsc_code",
        "payment_terms",
        "gst_number",
        "pan_number",
        "tds_rate",
        "billing_cycle",
        "risk_rating",
        "risk_notes",
        "payment_methods",
        "internal_notes",
        "contract_expiry_date",
        "contract_renewal_date",
        "document_names",
        "documents_uploaded",
      ];

      const filteredUpdateData: Record<string, any> = {};
      Object.keys(updateData).forEach(key => {
        if (allowedFields.includes(key)) {
          filteredUpdateData[key] = updateData[key as keyof IVendorCreate];
        }
      });

      if (filteredUpdateData.vendor_email) {
        const existingVendorWithEmail = await VendorCreate.findOne({
          vendor_email: filteredUpdateData.vendor_email.toLowerCase(),
          _id: { $ne: id },
        });

        if (existingVendorWithEmail) {
          throw new Error("Vendor with this email already exists");
        }
      }

      return await VendorCreate.findByIdAndUpdate(id, filteredUpdateData, {
        new: true,
        runValidators: true,
      })
        .populate("createdBy", "name email")
        .populate("verified_by", "name email");
    } catch (error: any) {
      throw new Error(`Error updating vendor: ${error.message}`);
    }
  }

  async getVendorForEdit(
    id: string,
    userId: Types.ObjectId,
    userRole: string
  ): Promise<IVendorCreate | null> {
    try {
      const vendor = await VendorCreate.findById(id)
        .populate("createdBy", "name email")
        .populate("verified_by", "name email");

      if (!vendor) {
        throw new Error("Vendor not found");
      }

      if (userRole === "vendor_admin" && !vendor.createdBy.equals(userId)) {
        throw new Error("You can only access vendors created by you");
      }

      return vendor;
    } catch (error: any) {
      throw new Error(`Error fetching vendor: ${error.message}`);
    }
  }

  async deleteVendorForAdmin(
    id: string,
    userId: Types.ObjectId,
    userRole: string
  ): Promise<boolean> {
    try {
      const vendor = await VendorCreate.findById(id);

      if (!vendor) {
        throw new Error("Vendor not found");
      }

      if (userRole === "vendor_admin" && !vendor.createdBy.equals(userId)) {
        throw new Error("You can only delete vendors created by you");
      }

      const result = await VendorCreate.findByIdAndDelete(id);
      return !!result;
    } catch (error: any) {
      throw new Error(`Error deleting vendor: ${error.message}`);
    }
  }

  private getChangedFields(before: any, after: any): string[] {
    const changedFields: string[] = [];

    if (!before || !after) return changedFields;

    const allKeys = new Set([...Object.keys(before), ...Object.keys(after)]);

    allKeys.forEach(key => {
      if (JSON.stringify(before[key]) !== JSON.stringify(after[key])) {
        changedFields.push(key);
      }
    });

    return changedFields;
  }

  private async createVendorAuditRecord(
    user: Types.ObjectId,
    user_email: string,
    user_role: string,
    action: string,
    action_description: string,
    target_vendor: Types.ObjectId,
    target_vendor_name: string,
    target_vendor_id: string,
    before_state?: any,
    after_state?: any,
    req?: any
  ) {
    try {
      await this.auditTrailService.createAuditRecord({
        user,
        user_email,
        user_role,
        action,
        action_description,
        target_vendor,
        target_vendor_name,
        target_vendor_id,
        before_state,
        after_state,
        changed_fields:
          before_state && after_state ? this.getChangedFields(before_state, after_state) : [],
        ip_address: req?.ip || req?.connection?.remoteAddress,
        user_agent: req?.get("User-Agent"),
      });
    } catch (error) {
      logger.error("Failed to create audit record:", error);
    }
  }

  async uploadVendorDocument(
    vendorId: string,
    file: Express.Multer.File,
    documentType: IVendorDocument["document_type"],
    expiryDate: Date | undefined,
    userId: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: any
  ): Promise<IVendorCreate | null> {
    try {
      const vendor = await VendorCreate.findById(vendorId);
      if (!vendor) {
        throw new Error("Vendor not found");
      }

      if (!this.documentUploadService.validateDocumentType(documentType)) {
        throw new Error("Invalid document type");
      }

      const { url, publicId } = await this.documentUploadService.uploadToCloudinary(
        file.buffer,
        file.originalname,
        `frovo/vendors/${vendor.vendor_id}`
      );

      const documentMetadata = this.documentUploadService.createDocumentMetadata(
        file,
        documentType,
        url,
        publicId,
        expiryDate
      );

      const beforeState = vendor.toObject();
      vendor.documents.push(documentMetadata as any);
      await vendor.save();

      await this.createVendorAuditRecord(
        userId,
        userEmail,
        userRole,
        "document_upload",
        `Uploaded document: ${file.originalname} (${documentType})`,
        vendor._id as Types.ObjectId,
        vendor.vendor_name,
        vendor.vendor_id,
        beforeState,
        vendor.toObject(),
        req
      );

      return vendor;
    } catch (error: any) {
      throw new Error(`Error uploading vendor document: ${error.message}`);
    }
  }

  async deleteVendorDocument(
    vendorId: string,
    documentId: string,
    userId: Types.ObjectId,
    userEmail: string,
    userRole: string,
    req?: any
  ): Promise<IVendorCreate | null> {
    try {
      const vendor = await VendorCreate.findById(vendorId);
      if (!vendor) {
        throw new Error("Vendor not found");
      }

      const documentIndex = vendor.documents.findIndex(
        (doc: any) => doc._id.toString() === documentId
      );

      if (documentIndex === -1) {
        throw new Error("Document not found");
      }

      const document = vendor.documents[documentIndex];

      await this.documentUploadService.deleteFromCloudinary(document.cloudinary_public_id);

      const beforeState = vendor.toObject();
      const documentName = document.document_name;
      const documentType = document.document_type;

      vendor.documents.splice(documentIndex, 1);
      await vendor.save();

      await this.createVendorAuditRecord(
        userId,
        userEmail,
        userRole,
        "document_delete",
        `Deleted document: ${documentName} (${documentType})`,
        vendor._id as Types.ObjectId,
        vendor.vendor_name,
        vendor.vendor_id,
        beforeState,
        vendor.toObject(),
        req
      );

      return vendor;
    } catch (error: any) {
      throw new Error(`Error deleting vendor document: ${error.message}`);
    }
  }

  async getVendorDocuments(vendorId: string): Promise<IVendorDocument[]> {
    try {
      const vendor = await VendorCreate.findById(vendorId);
      if (!vendor) {
        throw new Error("Vendor not found");
      }
      return vendor.documents;
    } catch (error: any) {
      throw new Error(`Error fetching vendor documents: ${error.message}`);
    }
  }

  async getVendorDocument(vendorId: string, documentId: string): Promise<IVendorDocument | null> {
    try {
      const vendor = await VendorCreate.findById(vendorId);
      if (!vendor) {
        throw new Error("Vendor not found");
      }

      const document = vendor.documents.find((doc: any) => doc._id.toString() === documentId);

      if (!document) {
        return null;
      }

      return document;
    } catch (error: any) {
      throw new Error(`Error fetching vendor document: ${error.message}`);
    }
  }
}

class VendorValidationService {
  static validateCompleteVendorData(data: Partial<IVendorCreate>): void {
    if (!data.vendor_name) {
      throw new Error("Vendor name is required");
    }

    if (!data.vendor_billing_name) {
      throw new Error("Vendor billing name is required");
    }

    if (!data.primary_contact_name) {
      throw new Error("Primary contact name is required");
    }

    if (!data.vendor_category) {
      throw new Error("Vendor category is required");
    }

    if (!data.vendor_address) {
      throw new Error("Vendor address is required");
    }

    if (!data.contact_phone) {
      throw new Error("Contact phone is required");
    }

    if (!data.vendor_email) {
      throw new Error("Vendor email is required");
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(data.vendor_email)) {
      throw new Error("Invalid vendor email format");
    }

    if (!data.vendor_type || data.vendor_type.length === 0) {
      throw new Error("At least one vendor type is required");
    }

    if (!data.bank_account_number) {
      throw new Error("Bank account number is required");
    }

    if (!data.ifsc_code) {
      throw new Error("IFSC code is required");
    }

    const ifscRegex = /^[A-Z]{4}0[A-Z0-9]{6}$/;
    if (!ifscRegex.test(data.ifsc_code)) {
      throw new Error("Valid IFSC code is required (format: ABCD0123456)");
    }

    if (!data.gst_number) {
      throw new Error("GST number is required");
    }

    if (!data.pan_number) {
      throw new Error("PAN number is required");
    }

    if (data.tds_rate === undefined || data.tds_rate === null) {
      throw new Error("TDS rate is required");
    }

    if (data.tds_rate < 0 || data.tds_rate > 100) {
      throw new Error("TDS rate must be between 0 and 100");
    }

    if (!data.contract_expiry_date) {
      throw new Error("Contract expiry date is required");
    }

    if (!data.contract_renewal_date) {
      throw new Error("Contract renewal date is required");
    }

    if (data.contract_expiry_date && data.contract_renewal_date) {
      const expiryDate = new Date(data.contract_expiry_date);
      const renewalDate = new Date(data.contract_renewal_date);

      if (expiryDate <= renewalDate) {
        throw new Error("Contract expiry date must be after renewal date");
      }
    }

    if (!data.risk_notes) {
      throw new Error("Risk notes are required");
    }
  }
}
