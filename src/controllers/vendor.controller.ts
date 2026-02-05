import { Request, Response } from "express";
import mongoose, { Types } from "mongoose";
import { CompanyService, BrandService } from "../services/vendor.service";
import { AuditTrailService } from "../services/auditTrail.service";
import { CompanyCreate, BrandCreate } from "../models/Vendor.model";
import { logger } from "../utils/logger.util";

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

  // ============================================
  // COMPANY CONTROLLER METHODS
  // ============================================

  /**
 * Create a new company
 */
public static async createCompany(req: Request, res: Response): Promise<void> {
  try {
    const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
    const userRole = roles[0]?.key || "unknown";

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
      company_status,
    } = req.body;

    // Validate required fields
    const requiredFields = [
      "registered_company_name",
      "registered_office_address",
      "official_email",
      "legal_entity_structure",
      "registration_type",
      "cin_or_msme_number",
      "date_of_incorporation",
      "directory_signature_name",
      "din"
    ];

    const missingFields = requiredFields.filter(field => !req.body[field]);
    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    // Validate legal_entity_structure
    const validStructures = ["pvt", "public", "opc", "llp", "proprietorship", "partnership"];
    if (!validStructures.includes(legal_entity_structure)) {
      res.status(400).json({
        success: false,
        message: `Invalid legal_entity_structure. Must be one of: ${validStructures.join(", ")}`,
      });
      return;
    }

    // Validate registration_type
    if (!["cin", "msme"].includes(registration_type)) {
      res.status(400).json({
        success: false,
        message: "Invalid registration_type. Must be 'cin' or 'msme'",
      });
      return;
    }

    // Validate the relationship between legal_entity_structure and registration_type
    const cinRequiredStructures = ["pvt", "public", "opc"];
    const msmeAllowedStructures = ["llp", "proprietorship", "partnership"];
    
    if (cinRequiredStructures.includes(legal_entity_structure) && registration_type !== "cin") {
      res.status(400).json({
        success: false,
        message: `For legal entity structure '${legal_entity_structure}', registration type must be 'cin'`,
      });
      return;
    }
    
    if (msmeAllowedStructures.includes(legal_entity_structure) && registration_type !== "msme") {
      res.status(400).json({
        success: false,
        message: `For legal entity structure '${legal_entity_structure}', registration type must be 'msme'`,
      });
      return;
    }

    // Additional validation for DIN based on structure
    if (cinRequiredStructures.includes(legal_entity_structure) && (!din || din.trim() === "")) {
      res.status(400).json({
        success: false,
        message: `DIN is required for legal entity structure '${legal_entity_structure}'`,
      });
      return;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(official_email)) {
      res.status(400).json({
        success: false,
        message: "Invalid email format",
      });
      return;
    }

    // Parse and validate date
    let parsedDate: Date;
    try {
      parsedDate = new Date(date_of_incorporation);
      if (isNaN(parsedDate.getTime())) {
        throw new Error("Invalid date");
      }
      
      // Validate date is not in the future
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (parsedDate > today) {
        res.status(400).json({
          success: false,
          message: "Date of incorporation cannot be in the future",
        });
        return;
      }
    } catch (error) {
      res.status(400).json({
        success: false,
        message: "Invalid date format for date_of_incorporation. Use ISO format (YYYY-MM-DD)",
      });
      return;
    }

    const companyData = {
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
      company_status: company_status || "active",
    };

    const newCompany = await companyService.createCompany(
      companyData,
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
    logger.error("Error creating company:", error);

    if (error instanceof Error) {
      if (error.message.includes("already exists") || error.message.includes("duplicate key")) {
        res.status(409).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes("Invalid") || error.message.includes("Missing")) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

  /**
   * Get all companies with pagination and search
   */
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
        legal_entity_structure
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
      logger.error("Error fetching companies:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get company by company_id (7-digit ID)
   */
  public static async getCompanyById(req: Request, res: Response): Promise<void> {
    try {
      const { company_id } = req.params;

      if (!company_id || company_id.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
        return;
      }

      const company = await companyService.getCompanyByCompanyId(company_id);

      res.status(200).json({
        success: true,
        message: "Company retrieved successfully",
        data: company,
      });
    } catch (error) {
      logger.error("Error fetching company:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          res.status(404).json({
            success: false,
            message: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
 * Update company by company_id
 */
public static async updateCompany(req: Request, res: Response): Promise<void> {
  try {
    const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
    const userRole = roles[0]?.key || "unknown";

    const { company_id } = req.params;
    const updateData = req.body;

    if (!company_id || company_id.trim() === "") {
      res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
      return;
    }

    // Validate legal_entity_structure if provided
    if (updateData.legal_entity_structure) {
      const validStructures = ["pvt", "public", "opc", "llp", "proprietorship", "partnership"];
      if (!validStructures.includes(updateData.legal_entity_structure)) {
        res.status(400).json({
          success: false,
          message: `Invalid legal_entity_structure. Must be one of: ${validStructures.join(", ")}`,
        });
        return;
      }
    }

    // Validate registration_type if provided
    if (updateData.registration_type && !["cin", "msme"].includes(updateData.registration_type)) {
      res.status(400).json({
        success: false,
        message: "Invalid registration_type. Must be 'cin' or 'msme'",
      });
      return;
    }

    // If both legal_entity_structure and registration_type are being updated, validate their relationship
    if (updateData.legal_entity_structure && updateData.registration_type) {
      const cinRequiredStructures = ["pvt", "public", "opc"];
      const msmeAllowedStructures = ["llp", "proprietorship", "partnership"];
      
      if (cinRequiredStructures.includes(updateData.legal_entity_structure) && updateData.registration_type !== "cin") {
        res.status(400).json({
          success: false,
          message: `For legal entity structure '${updateData.legal_entity_structure}', registration type must be 'cin'`,
        });
        return;
      }
      
      if (msmeAllowedStructures.includes(updateData.legal_entity_structure) && updateData.registration_type !== "msme") {
        res.status(400).json({
          success: false,
          message: `For legal entity structure '${updateData.legal_entity_structure}', registration type must be 'msme'`,
        });
        return;
      }
    }
    // If only legal_entity_structure is being updated, we need to check existing registration_type
    else if (updateData.legal_entity_structure) {
      // Get current company to check existing registration_type
      const currentCompany = await companyService.getCompanyByCompanyId(company_id);
      if (currentCompany) {
        const cinRequiredStructures = ["pvt", "public", "opc"];
        const msmeAllowedStructures = ["llp", "proprietorship", "partnership"];
        
        if (cinRequiredStructures.includes(updateData.legal_entity_structure) && currentCompany.registration_type !== "cin") {
          res.status(400).json({
            success: false,
            message: `Cannot change legal entity structure to '${updateData.legal_entity_structure}' because registration type is '${currentCompany.registration_type}'. First update registration type to 'cin'`,
          });
          return;
        }
        
        if (msmeAllowedStructures.includes(updateData.legal_entity_structure) && currentCompany.registration_type !== "msme") {
          res.status(400).json({
            success: false,
            message: `Cannot change legal entity structure to '${updateData.legal_entity_structure}' because registration type is '${currentCompany.registration_type}'. First update registration type to 'msme'`,
          });
          return;
        }
      }
    }
    // If only registration_type is being updated, we need to check existing legal_entity_structure
    else if (updateData.registration_type) {
      // Get current company to check existing legal_entity_structure
      const currentCompany = await companyService.getCompanyByCompanyId(company_id);
      if (currentCompany) {
        const cinRequiredStructures = ["pvt", "public", "opc"];
        const msmeAllowedStructures = ["llp", "proprietorship", "partnership"];
        
        if (cinRequiredStructures.includes(currentCompany.legal_entity_structure) && updateData.registration_type !== "cin") {
          res.status(400).json({
            success: false,
            message: `Cannot change registration type to '${updateData.registration_type}' because legal entity structure is '${currentCompany.legal_entity_structure}'. First update legal entity structure`,
          });
          return;
        }
        
        if (msmeAllowedStructures.includes(currentCompany.legal_entity_structure) && updateData.registration_type !== "msme") {
          res.status(400).json({
            success: false,
            message: `Cannot change registration type to '${updateData.registration_type}' because legal entity structure is '${currentCompany.legal_entity_structure}'. First update legal entity structure`,
          });
          return;
        }
      }
    }

    // Validate email format if provided
    if (updateData.official_email) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(updateData.official_email)) {
        res.status(400).json({
          success: false,
          message: "Invalid email format",
        });
        return;
      }
      updateData.official_email = updateData.official_email.toLowerCase();
    }

    if (updateData.date_of_incorporation) {
      try {
        const parsedDate = new Date(updateData.date_of_incorporation);
        if (isNaN(parsedDate.getTime())) {
          throw new Error("Invalid date");
        }
        
        // Validate date is not in the future
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsedDate > today) {
          res.status(400).json({
            success: false,
            message: "Date of incorporation cannot be in the future",
          });
          return;
        }
        
        updateData.date_of_incorporation = parsedDate;
      } catch (error) {
        res.status(400).json({
          success: false,
          message: "Invalid date format for date_of_incorporation. Use ISO format (YYYY-MM-DD)",
        });
        return;
      }
    }

    const updatedCompany = await companyService.updateCompanyByCompanyId(
      company_id,
      updateData,
      userId,
      userEmail,
      userRole,
      req
    );

    if (!updatedCompany) {
      res.status(404).json({
        success: false,
        message: "Company not found",
      });
      return;
    }

    res.status(200).json({
      success: true,
      message: "Company updated successfully",
      data: updatedCompany,
    });
  } catch (error) {
    logger.error("Error updating company:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes("already exists")) {
        res.status(409).json({
          success: false,
          message: error.message,
        });
        return;
      }

      if (error.message.includes("Invalid")) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}

  /**
   * Delete company by company_id
   */
  public static async deleteCompany(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      const { company_id } = req.params;

      if (!company_id || company_id.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
        return;
      }

      const deletedCompany = await companyService.deleteCompanyByCompanyId(
        company_id,
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
      logger.error("Error deleting company:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          res.status(404).json({
            success: false,
            message: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get company statistics
   */
  public static async getCompanyStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await companyService.getCompanyStatistics();

      res.status(200).json({
        success: true,
        message: "Company statistics retrieved successfully",
        data: statistics,
      });
    } catch (error) {
      logger.error("Error fetching company statistics:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get audit trail for a specific company by company_id
   */
  public static async getCompanyAuditTrail(req: Request, res: Response): Promise<void> {
    try {
      const { company_id } = req.params;
      const { page = 1, limit = 50 } = req.query;

      if (!company_id || company_id.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
        return;
      }

      // Get company by company_id
      const company = await companyService.getCompanyByCompanyId(company_id);
      if (!company) {
        res.status(404).json({
          success: false,
          message: "Company not found",
        });
        return;
      }

      const auditData = await auditTrailService.getCompanyAuditTrails(
        company._id.toString(),
        Number(page),
        Number(limit)
      );

      res.status(200).json({
        success: true,
        message: "Company audit trail retrieved successfully",
        data: auditData,
      });
    } catch (error) {
      logger.error("Error fetching company audit trail:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get all company audit trails (for super admin)
   */
  public static async getAllCompanyAuditTrails(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      // Only super admin can access all audit trails
      if (userRole !== "super_admin") {
        res.status(403).json({
          success: false,
          message: "Access denied. Only super admin can view all company audit trails",
        });
        return;
      }

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
      logger.error("Error fetching all company audit trails:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Validate company data before creation
   */
  public static async validateCompanyData(req: Request, res: Response): Promise<void> {
    try {
      const { cin_or_msme_number, official_email, din } = req.body;

      const validationResult = await companyService.validateCompanyData({
        cin_or_msme_number,
        official_email,
        din,
      });

      res.status(200).json({
        success: true,
        message: "Company data validation completed",
        data: validationResult,
      });
    } catch (error) {
      logger.error("Error validating company data:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Export companies data
   */
  public static async exportCompanies(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      // Only super admin and vendor admin can export
      if (!["super_admin", "vendor_admin"].includes(userRole)) {
        res.status(403).json({
          success: false,
          message: "Access denied. Only super admin and vendor admin can export companies",
        });
        return;
      }

      const { format = "csv", filters } = req.query;
      const filterData = filters ? JSON.parse(filters as string) : {};

      const exportData = await companyService.exportCompanies(
        format as string,
        filterData,
        userId
      );

      // Set headers based on format
      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=companies_${Date.now()}.csv`);
      } else if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename=companies_${Date.now()}.json`);
      } else if (format === "excel") {
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=companies_${Date.now()}.xlsx`);
      }

      res.status(200).send(exportData);
    } catch (error) {
      logger.error("Error exporting companies:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
 * Export single company data by company_id
 */
public static async exportCompanyById(req: Request, res: Response): Promise<void> {
  try {
    const { _id: userId, roles } = VendorController.getLoggedInUser(req);
    const userRole = roles[0]?.key || "unknown";

    // Only super admin and vendor admin can export
    if (!["super_admin", "vendor_admin"].includes(userRole)) {
      res.status(403).json({
        success: false,
        message: "Access denied. Only super admin and vendor admin can export company data",
      });
      return;
    }

    const { company_id } = req.params;
    const { format = "csv" } = req.query; // Changed default to CSV

    if (!company_id || company_id.trim() === "") {
      res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
      return;
    }

    // Validate format
    if (!["csv", "json"].includes(format as string)) {
      res.status(400).json({
        success: false,
        message: "Invalid format. Only 'csv' and 'json' are supported",
      });
      return;
    }

    const exportData = await companyService.exportCompanyById(
      company_id,
      format as string,
      userId
    );

    // Set headers based on format
    const timestamp = Date.now();
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=company_${company_id}_${timestamp}.csv`);
    } else if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=company_${company_id}_${timestamp}.json`);
    }

    res.status(200).send(exportData);
  } catch (error) {
    logger.error("Error exporting company by ID:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
/**
 * Toggle company status (active/inactive)
 */
public static async toggleCompanyStatus(req: Request, res: Response): Promise<void> {
  try {
    const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
    const userRole = roles[0]?.key || "unknown";

    // Only vendor management roles can toggle company status
    if (!["super_admin", "vendor_admin"].includes(userRole)) {
      res.status(403).json({
        success: false,
        message: "Access denied. Only super admin and vendor admin can toggle company status",
      });
      return;
    }

    const { company_id } = req.params;

    if (!company_id || company_id.trim() === "") {
      res.status(400).json({
        success: false,
        message: "Company ID is required",
      });
      return;
    }

    const updatedCompany = await companyService.toggleCompanyStatus(
      company_id,
      userId,
      userEmail,
      userRole,
      req
    );

    res.status(200).json({
      success: true,
      message: `Company status toggled successfully`,
      data: {
        company_id: updatedCompany.company_id,
        company_name: updatedCompany.registered_company_name,
        previous_status: updatedCompany.company_status === "active" ? "inactive" : "active",
        current_status: updatedCompany.company_status,
      },
    });
  } catch (error) {
    logger.error("Error toggling company status:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }
      if (error.message.includes("Invalid")) {
        res.status(400).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}


  // ============================================
  // BRAND CONTROLLER METHODS
  // ============================================

  /**
   * Create a new brand
   */
  public static async createBrand(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

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
        gst_details,
        PAN_number,
        FSSAI_number,
        TDS_rate,
        billing_cycle,
        brand_status_cycle,
        contract_start_date,
        contract_end_date,
        contract_renewal_date,
        payment_methods,
        warehouse_id,
      } = req.body;

      // Validate required fields
      const requiredFields = [
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
        "gst_details",
        "PAN_number",
        "FSSAI_number",
        "TDS_rate",
        "billing_cycle",
        "brand_status_cycle",
        "contract_start_date",
        "contract_end_date",
        "contract_renewal_date",
        "payment_methods",
      ];

      const missingFields = requiredFields.filter(field => !req.body[field]);
      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
        return;
      }

      // Validate registration_type
      if (!["cin", "msme"].includes(registration_type)) {
        res.status(400).json({
          success: false,
          message: "Invalid registration_type. Must be 'cin' or 'msme'",
        });
        return;
      }

      // Validate payment_methods
      const validPaymentMethods = ["upi", "bank_transfer", "cheque", "credit_card", "debit_card", "other"];
      if (!validPaymentMethods.includes(payment_methods)) {
        res.status(400).json({
          success: false,
          message: `Invalid payment_methods. Must be one of: ${validPaymentMethods.join(", ")}`,
        });
        return;
      }

      // Validate email format
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(brand_email)) {
        res.status(400).json({
          success: false,
          message: "Invalid brand email format",
        });
        return;
      }

      // Validate dates
      let parsedContractStartDate: Date;
      let parsedContractEndDate: Date;
      let parsedContractRenewalDate: Date;

      try {
        parsedContractStartDate = new Date(contract_start_date);
        parsedContractEndDate = new Date(contract_end_date);
        parsedContractRenewalDate = new Date(contract_renewal_date);

        if (isNaN(parsedContractStartDate.getTime()) ||
          isNaN(parsedContractEndDate.getTime()) ||
          isNaN(parsedContractRenewalDate.getTime())) {
          throw new Error("Invalid date");
        }
      } catch (error) {
        res.status(400).json({
          success: false,
          message: "Invalid date format. Use ISO format (YYYY-MM-DD)",
        });
        return;
      }

      // Validate TDS rate
      if (TDS_rate < 0 || TDS_rate > 100) {
        res.status(400).json({
          success: false,
          message: "TDS rate must be between 0 and 100",
        });
        return;
      }

      const brandData: any = {
        registration_type,
        cin_or_msme_number,
        company_id: new mongoose.Types.ObjectId(company_id),
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
        gst_details: gst_details.toUpperCase(),
        PAN_number: PAN_number.toUpperCase(),
        FSSAI_number,
        TDS_rate: Number(TDS_rate),
        billing_cycle,
        brand_status_cycle,
        contract_start_date: parsedContractStartDate,
        contract_end_date: parsedContractEndDate,
        contract_renewal_date: parsedContractRenewalDate,
        payment_methods,
        createdBy: userId,
        ...(warehouse_id && { warehouse_id: new mongoose.Types.ObjectId(warehouse_id) }),
      };

      // Handle file uploads if present
      if (req.files) {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        // Handle cancelled cheque image
        if (files['upload_cancelled_cheque_image']) {
          const file = files['upload_cancelled_cheque_image'][0];
          brandData.upload_cancelled_cheque_image = {
            image_name: file.originalname,
            file_url: file.path,
            cloudinary_public_id: file.filename,
            file_size: file.size,
            mime_type: file.mimetype,
            uploaded_at: new Date(),
          };
        }

        // Handle GST certificate image
        if (files['gst_certificate_image']) {
          const file = files['gst_certificate_image'][0];
          brandData.gst_certificate_image = {
            image_name: file.originalname,
            file_url: file.path,
            cloudinary_public_id: file.filename,
            file_size: file.size,
            mime_type: file.mimetype,
            uploaded_at: new Date(),
          };
        }

        // Handle PAN image
        if (files['PAN_image']) {
          const file = files['PAN_image'][0];
          brandData.PAN_image = {
            image_name: file.originalname,
            file_url: file.path,
            cloudinary_public_id: file.filename,
            file_size: file.size,
            mime_type: file.mimetype,
            uploaded_at: new Date(),
          };
        }

        // Handle FSSAI image
        if (files['FSSAI_image']) {
          const file = files['FSSAI_image'][0];
          brandData.FSSAI_image = {
            image_name: file.originalname,
            file_url: file.path,
            cloudinary_public_id: file.filename,
            file_size: file.size,
            mime_type: file.mimetype,
            uploaded_at: new Date(),
          };
        }
      }

      const newBrand = await brandService.createBrand(
        brandData,
        userId,
        userEmail,
        userRole,
        req
      );

      res.status(201).json({
        success: true,
        message: "Brand created successfully",
        data: newBrand,
      });
    } catch (error) {
      logger.error("Error creating brand:", error);

      if (error instanceof Error) {
        if (error.message.includes("already exists") || error.message.includes("duplicate key")) {
          res.status(409).json({
            success: false,
            message: error.message,
          });
          return;
        }

        if (error.message.includes("Company with this registration number does not exist")) {
          res.status(404).json({
            success: false,
            message: "Company not found with the provided registration number",
          });
          return;
        }

        if (error.message.includes("Invalid") || error.message.includes("Missing")) {
          res.status(400).json({
            success: false,
            message: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get all brands with pagination and search
   */
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
        company_id
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
      logger.error("Error fetching brands:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get brand by brand_id
   */
  public static async getBrandById(req: Request, res: Response): Promise<void> {
    try {
      const { brand_id } = req.params;

      if (!brand_id || brand_id.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Brand ID is required",
        });
        return;
      }

      const brand = await brandService.getBrandByBrandId(brand_id);

      res.status(200).json({
        success: true,
        message: "Brand retrieved successfully",
        data: brand,
      });
    } catch (error) {
      logger.error("Error fetching brand:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          res.status(404).json({
            success: false,
            message: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Update brand by brand_id
   */
  public static async updateBrand(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      const { brand_id } = req.params;
      const updateData = req.body;

      if (!brand_id || brand_id.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Brand ID is required",
        });
        return;
      }

      // Validate payment_methods if provided
      if (updateData.payment_methods) {
        const validPaymentMethods = ["upi", "bank_transfer", "cheque", "credit_card", "debit_card", "other"];
        if (!validPaymentMethods.includes(updateData.payment_methods)) {
          res.status(400).json({
            success: false,
            message: `Invalid payment_methods. Must be one of: ${validPaymentMethods.join(", ")}`,
          });
          return;
        }
      }

      // Validate registration_type if provided
      if (updateData.registration_type && !["cin", "msme"].includes(updateData.registration_type)) {
        res.status(400).json({
          success: false,
          message: "Invalid registration_type. Must be 'cin' or 'msme'",
        });
        return;
      }

      // Validate email format if provided
      if (updateData.brand_email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(updateData.brand_email)) {
          res.status(400).json({
            success: false,
            message: "Invalid email format",
          });
          return;
        }
        updateData.brand_email = updateData.brand_email.toLowerCase();
      }

      // Validate TDS rate if provided
      if (updateData.TDS_rate !== undefined) {
        if (updateData.TDS_rate < 0 || updateData.TDS_rate > 100) {
          res.status(400).json({
            success: false,
            message: "TDS rate must be between 0 and 100",
          });
          return;
        }
      }

      // Handle date parsing
      const dateFields = ["contract_start_date", "contract_end_date", "contract_renewal_date"];
      for (const field of dateFields) {
        if (updateData[field]) {
          try {
            const parsedDate = new Date(updateData[field]);
            if (isNaN(parsedDate.getTime())) {
              throw new Error("Invalid date");
            }
            updateData[field] = parsedDate;
          } catch (error) {
            res.status(400).json({
              success: false,
              message: `Invalid date format for ${field}. Use ISO format (YYYY-MM-DD)`,
            });
            return;
          }
        }
      }

      // Handle file uploads if present
      if (req.files) {
        const files = req.files as { [fieldname: string]: Express.Multer.File[] };

        // Handle cancelled cheque image update
        if (files['upload_cancelled_cheque_image']) {
          const file = files['upload_cancelled_cheque_image'][0];
          updateData.upload_cancelled_cheque_image = {
            image_name: file.originalname,
            file_url: file.path,
            cloudinary_public_id: file.filename,
            file_size: file.size,
            mime_type: file.mimetype,
            uploaded_at: new Date(),
          };
        }

        // Handle GST certificate image update
        if (files['gst_certificate_image']) {
          const file = files['gst_certificate_image'][0];
          updateData.gst_certificate_image = {
            image_name: file.originalname,
            file_url: file.path,
            cloudinary_public_id: file.filename,
            file_size: file.size,
            mime_type: file.mimetype,
            uploaded_at: new Date(),
          };
        }

        // Handle PAN image update
        if (files['PAN_image']) {
          const file = files['PAN_image'][0];
          updateData.PAN_image = {
            image_name: file.originalname,
            file_url: file.path,
            cloudinary_public_id: file.filename,
            file_size: file.size,
            mime_type: file.mimetype,
            uploaded_at: new Date(),
          };
        }

        // Handle FSSAI image update
        if (files['FSSAI_image']) {
          const file = files['FSSAI_image'][0];
          updateData.FSSAI_image = {
            image_name: file.originalname,
            file_url: file.path,
            cloudinary_public_id: file.filename,
            file_size: file.size,
            mime_type: file.mimetype,
            uploaded_at: new Date(),
          };
        }
      }

      const updatedBrand = await brandService.updateBrandByBrandId(
        brand_id,
        updateData,
        userId,
        userEmail,
        userRole,
        req
      );

      if (!updatedBrand) {
        res.status(404).json({
          success: false,
          message: "Brand not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Brand updated successfully",
        data: updatedBrand,
      });
    } catch (error) {
      logger.error("Error updating brand:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          res.status(404).json({
            success: false,
            message: error.message,
          });
          return;
        }

        if (error.message.includes("already exists")) {
          res.status(409).json({
            success: false,
            message: error.message,
          });
          return;
        }

        if (error.message.includes("Invalid")) {
          res.status(400).json({
            success: false,
            message: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Delete brand by brand_id
   */
  public static async deleteBrand(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      const { brand_id } = req.params;

      if (!brand_id || brand_id.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Brand ID is required",
        });
        return;
      }

      const deletedBrand = await brandService.deleteBrandByBrandId(
        brand_id,
        userId,
        userEmail,
        userRole,
        req
      );

      res.status(200).json({
        success: true,
        message: "Brand deleted successfully",
        data: deletedBrand,
      });
    } catch (error) {
      logger.error("Error deleting brand:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          res.status(404).json({
            success: false,
            message: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get brand statistics
   */
  public static async getBrandStatistics(req: Request, res: Response): Promise<void> {
    try {
      const statistics = await brandService.getBrandStatistics();

      res.status(200).json({
        success: true,
        message: "Brand statistics retrieved successfully",
        data: statistics,
      });
    } catch (error) {
      logger.error("Error fetching brand statistics:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Update brand verification status
   */
  public static async updateBrandVerificationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, email: userEmail, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      const { brand_id } = req.params;
      const { verification_status, risk_notes } = req.body;

      if (!brand_id || brand_id.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Brand ID is required",
        });
        return;
      }

      if (!["pending", "verified", "rejected"].includes(verification_status)) {
        res.status(400).json({
          success: false,
          message: "Invalid verification_status. Must be 'pending', 'verified', or 'rejected'",
        });
        return;
      }

      const updateData = {
        verification_status,
        ...(risk_notes !== undefined && { risk_notes }),
        ...(verification_status === "verified" && { verified_by: userId }),
      };

      const updatedBrand = await brandService.updateBrandByBrandId(
        brand_id,
        updateData,
        userId,
        userEmail,
        userRole,
        req
      );

      if (!updatedBrand) {
        res.status(404).json({
          success: false,
          message: "Brand not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Brand verification status updated successfully",
        data: updatedBrand,
      });
    } catch (error) {
      logger.error("Error updating brand verification status:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          res.status(404).json({
            success: false,
            message: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get brands by company_id
   */
  public static async getBrandsByCompanyId(req: Request, res: Response): Promise<void> {
    try {
      const { company_id } = req.params;
      const {
        page = 1,
        limit = 10,
        verification_status
      } = req.query;

      if (!company_id || company_id.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Company ID is required",
        });
        return;
      }

      const result = await brandService.getBrandsByCompanyId(
        company_id,
        {
          page: Number(page),
          limit: Number(limit),
          verification_status: verification_status as string,
        }
      );

      res.status(200).json({
        success: true,
        message: "Brands retrieved successfully",
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error("Error fetching brands by company:", error);

      if (error instanceof Error) {
        if (error.message.includes("not found")) {
          res.status(404).json({
            success: false,
            message: error.message,
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Get audit trail for a specific brand by brand_id
   */
  public static async getBrandAuditTrail(req: Request, res: Response): Promise<void> {
    try {
      const { brand_id } = req.params;
      const { page = 1, limit = 50 } = req.query;

      if (!brand_id || brand_id.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Brand ID is required",
        });
        return;
      }

      // Get brand by brand_id
      const brand = await brandService.getBrandByBrandId(brand_id);
      if (!brand) {
        res.status(404).json({
          success: false,
          message: "Brand not found",
        });
        return;
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
      logger.error("Error fetching brand audit trail:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
   * Export brands data
   */
  public static async exportBrands(req: Request, res: Response): Promise<void> {
    try {
      const { _id: userId, roles } = VendorController.getLoggedInUser(req);
      const userRole = roles[0]?.key || "unknown";

      // Only super admin and vendor admin can export
      if (!["super_admin", "vendor_admin", "brand_manager"].includes(userRole)) {
        res.status(403).json({
          success: false,
          message: "Access denied. Only authorized roles can export brands",
        });
        return;
      }

      const { format = "csv", filters } = req.query;
      const filterData = filters ? JSON.parse(filters as string) : {};

      const exportData = await brandService.exportBrands(
        format as string,
        filterData,
        userId
      );

      // Set headers based on format
      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=brands_${Date.now()}.csv`);
      } else if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename=brands_${Date.now()}.json`);
      } else if (format === "excel") {
        res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
        res.setHeader("Content-Disposition", `attachment; filename=brands_${Date.now()}.xlsx`);
      }

      res.status(200).send(exportData);
    } catch (error) {
      logger.error("Error exporting brands:", error);
      res.status(500).json({
        success: false,
        message: "Internal server error",
        error: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  /**
 * Export single brand data by brand_id
 */
public static async exportBrandById(req: Request, res: Response): Promise<void> {
  try {
    const { _id: userId, roles } = VendorController.getLoggedInUser(req);
    const userRole = roles[0]?.key || "unknown";

    // Only authorized roles can export
    if (!["super_admin", "vendor_admin", "brand_manager"].includes(userRole)) {
      res.status(403).json({
        success: false,
        message: "Access denied. Only authorized roles can export brand data",
      });
      return;
    }

    const { brand_id } = req.params;
    const { format = "csv" } = req.query; // Changed default to CSV

    if (!brand_id || brand_id.trim() === "") {
      res.status(400).json({
        success: false,
        message: "Brand ID is required",
      });
      return;
    }

    // Validate format
    if (!["csv", "json"].includes(format as string)) {
      res.status(400).json({
        success: false,
        message: "Invalid format. Only 'csv' and 'json' are supported",
      });
      return;
    }

    const exportData = await brandService.exportBrandById(
      brand_id,
      format as string,
      userId
    );

    // Set headers based on format
    const timestamp = Date.now();
    if (format === "csv") {
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename=brand_${brand_id}_${timestamp}.csv`);
    } else if (format === "json") {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", `attachment; filename=brand_${brand_id}_${timestamp}.json`);
    }

    res.status(200).send(exportData);
  } catch (error) {
    logger.error("Error exporting brand by ID:", error);

    if (error instanceof Error) {
      if (error.message.includes("not found")) {
        res.status(404).json({
          success: false,
          message: error.message,
        });
        return;
      }
    }

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error",
    });
  }
}
}