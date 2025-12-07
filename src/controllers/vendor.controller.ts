import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { VendorService } from '../services/vendor.service';
import { AuditTrailService } from '../services/auditTrail.service';

const vendorService = new VendorService();
const auditTrailService = new AuditTrailService();


export class VendorController {
  
  // Utility function to safely extract user
  private getLoggedInUser(req: Request): { _id: Types.ObjectId; roles: any[]; email: string } {
    const user = (req as any).user;
    
    if (!user || !user._id) {
      throw new Error('User authentication required');
    }
    
    return {
      _id: user._id,
      roles: user.roles || [],
      email: user.email || ''
    };
  }

  /**
   * Create a new company
   */
  public static async createCompany(req: Request, res: Response): Promise<void> {
    try {
      const {
        registered_company_name,
        company_address,
        office_email,
        legal_entity_structure,
        company_registration_number,
        date_of_incorporation,
        corporate_website,
        directory_signature_name,
        din
      } = req.body;

      // Validate date format
      let parsedDate: Date;
      if (date_of_incorporation) {
        parsedDate = new Date(date_of_incorporation);
        if (isNaN(parsedDate.getTime())) {
          res.status(400).json({
            success: false,
            message: 'Invalid date format for date_of_incorporation. Use ISO format (YYYY-MM-DD)'
          });
          return;
        }
      }

      const companyData = {
        registered_company_name,
        company_address,
        office_email,
        legal_entity_structure,
        company_registration_number,
        date_of_incorporation: parsedDate!,
        corporate_website,
        directory_signature_name,
        din
      };

      // Call the static method from VendorService
      const newCompany = await VendorService.createCompanyService(companyData);

      res.status(201).json({
        success: true,
        message: 'Company created successfully',
        data: newCompany
      });

    } catch (error) {
      console.error('Error creating company:', error);
      
      // Handle duplicate key errors
      if (error instanceof Error) {
        if (error.message.includes('already exists') || error.message.includes('duplicate key')) {
          res.status(409).json({
            success: false,
            message: error.message
          });
          return;
        }
        
        if (error.message.includes('Invalid') || error.message.includes('Missing')) {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all companies
   */
  public static async getAllCompanies(req: Request, res: Response): Promise<void> {
    try {
      const {
        page = 1,
        limit = 10,
        search,
        sortBy = 'createdAt',
        sortOrder = 'desc'
      } = req.query;

      const result = await VendorService.getAllCompaniesService({
        page: Number(page),
        limit: Number(limit),
        search: search as string,
        sortBy: sortBy as string,
        sortOrder: sortOrder as 'asc' | 'desc'
      });

      res.status(200).json({
        success: true,
        message: 'Companies retrieved successfully',
        data: result.data,
        pagination: result.pagination
      });

    } catch (error) {
      console.error('Error fetching companies:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get company by ID
   */
  public static async getCompanyById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const company = await VendorService.getCompanyByIdService(id);

      res.status(200).json({
        success: true,
        message: 'Company retrieved successfully',
        data: company
      });

    } catch (error) {
      console.error('Error fetching company:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid') || error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update company
   */
  public static async updateCompany(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData = req.body;

      // Validate date format if provided
      if (updateData.date_of_incorporation) {
        const parsedDate = new Date(updateData.date_of_incorporation);
        if (isNaN(parsedDate.getTime())) {
          res.status(400).json({
            success: false,
            message: 'Invalid date format for date_of_incorporation. Use ISO format (YYYY-MM-DD)'
          });
          return;
        }
        updateData.date_of_incorporation = parsedDate;
      }

      const updatedCompany = await VendorService.updateCompanyService(id, updateData);

      if (!updatedCompany) {
        res.status(404).json({
          success: false,
          message: 'Company not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Company updated successfully',
        data: updatedCompany
      });

    } catch (error) {
      console.error('Error updating company:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid') || error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            message: error.message
          });
          return;
        }
        
        if (error.message.includes('already exists')) {
          res.status(409).json({
            success: false,
            message: error.message
          });
          return;
        }
        
        if (error.message.includes('Invalid') || error.message.includes('cannot be')) {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete company
   */
  public static async deleteCompany(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deletedCompany = await VendorService.deleteCompanyService(id);

      res.status(200).json({
        success: true,
        message: 'Company deleted successfully',
        data: deletedCompany
      });

    } catch (error) {
      console.error('Error deleting company:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('Invalid') || error.message.includes('not found')) {
          res.status(404).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Search companies
   */
  public static async searchCompanies(req: Request, res: Response): Promise<void> {
    try {
      const { q, limit = 10 } = req.query;

      if (!q || typeof q !== 'string' || q.trim() === '') {
        res.status(400).json({
          success: false,
          message: 'Search query is required'
        });
        return;
      }

      const companies = await VendorService.searchCompaniesService(q, Number(limit));

      res.status(200).json({
        success: true,
        message: 'Companies search completed',
        data: companies
      });

    } catch (error) {
      console.error('Error searching companies:', error);
      
      if (error instanceof Error) {
        if (error.message.includes('required')) {
          res.status(400).json({
            success: false,
            message: error.message
          });
          return;
        }
      }

      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check if company exists
   */
  public static async checkCompanyExists(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const exists = await VendorService.checkCompanyExists(id);

      res.status(200).json({
        success: true,
        message: 'Company existence checked',
        data: { exists }
      });

    } catch (error) {
      console.error('Error checking company existence:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  // Get Super Admin Dashboard with filters
  async getSuperAdminDashboard(req: Request, res: Response) {
    try {
      const { roles } = this.getLoggedInUser(req);
      
      // Validate user is Super Admin
      if (!roles.some(role => role.key === 'super_admin')) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admin can access this dashboard'
        });
      }

      const filters = {
        verification_status: req.query.verification_status as string,
        risk_rating: req.query.risk_rating as string,
        vendor_category: req.query.vendor_category as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const dashboardData = await vendorService.getSuperAdminDashboard(filters);

      res.status(200).json({
        success: true,
        data: dashboardData
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Vendor Admin Dashboard
  async getVendorAdminDashboard(req: Request, res: Response) {
    try {
      const { _id: userId, roles } = this.getLoggedInUser(req);

      // Validate user is Vendor Admin or Super Admin
      if (!roles.some(role => ['super_admin', 'vendor_admin'].includes(role.key))) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admin or Vendor Admin can access this dashboard'
        });
      }

      const filters = {
        verification_status: req.query.verification_status as string,
        risk_rating: req.query.risk_rating as string,
        vendor_category: req.query.vendor_category as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const dashboardData = await vendorService.getVendorAdminDashboard(userId, filters);

      res.status(200).json({
        success: true,
        data: dashboardData
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get All Vendors for Super Admin
  async getAllVendorsForSuperAdmin(req: Request, res: Response) {
    try {
      const { roles } = this.getLoggedInUser(req);
      
      // Validate user is Super Admin
      if (!roles.some(role => role.key === 'super_admin')) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admin can access this endpoint'
        });
      }

      const filters = {
        verification_status: req.query.verification_status as string,
        risk_rating: req.query.risk_rating as string,
        vendor_category: req.query.vendor_category as string,
        created_by: req.query.created_by as string,
        search: req.query.search as string,
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const result = await vendorService.getAllVendorsForSuperAdmin(filters);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Vendor Statistics for Super Admin
  async getVendorStatistics(req: Request, res: Response) {
    try {
      const { roles } = this.getLoggedInUser(req);
      
      // Validate user is Super Admin
      if (!roles.some(role => role.key === 'super_admin')) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admin can access this endpoint'
        });
      }

      const statistics = await vendorService.getVendorStatistics();

      res.status(200).json({
        success: true,
        data: statistics
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Pending Approvals for Super Admin
  async getPendingApprovals(req: Request, res: Response) {
    try {
      const { roles } = this.getLoggedInUser(req);
      
      // Validate user is Super Admin
      if (!roles.some(role => role.key === 'super_admin')) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admin can access pending approvals'
        });
      }

      const pendingApprovals = await vendorService.getPendingApprovals();

      res.status(200).json({
        success: true,
        data: pendingApprovals
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Create Complete Vendor with Audit Trail
  async createCompleteVendor(req: Request, res: Response) {
    try {
      const { _id: createdBy, roles, email: userEmail } = this.getLoggedInUser(req);
      const userRole = roles[0]?.key;
      
      // Validate user has permission to create vendors
      if (!roles.some(role => ['super_admin', 'vendor_admin'].includes(role.key))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create vendors'
        });
      }

      const vendor = await vendorService.createCompleteVendor(
        req.body, 
        createdBy, 
        userEmail, 
        userRole, 
        req
      );

      res.status(201).json({
        success: true,
        message: 'Vendor created successfully',
        data: vendor
      });
    } catch (error: any) {
      console.error('Error creating vendor:', error);
      
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }
      
      if (error.message.includes('validation failed') || error.message.includes('is required')) {
        return res.status(422).json({
          success: false,
          message: error.message
        });
      }

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Bulk Create Vendors
  async createBulkVendors(req: Request, res: Response) {
    try {
      const { _id: createdBy, roles } = this.getLoggedInUser(req);
      const { vendors } = req.body;

      if (!Array.isArray(vendors) || vendors.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vendors array is required and cannot be empty'
        });
      }

      if (vendors.length > 50) {
        return res.status(400).json({
          success: false,
          message: 'Cannot process more than 50 vendors at once'
        });
      }

      const result = await vendorService.createBulkVendors(vendors, createdBy);

      res.status(207).json({
        success: true,
        message: `Processed ${vendors.length} vendors. ${result.successful.length} successful, ${result.failed.length} failed.`,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Vendor by ID
  async getVendorById(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const vendor = await vendorService.getVendorById(id);
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.status(200).json({
        success: true,
        data: vendor
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Vendor by Vendor ID
  async getVendorByVendorId(req: Request, res: Response) {
    try {
      const { vendorId } = req.params;
      const vendor = await vendorService.getVendorByVendorId(vendorId);
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.status(200).json({
        success: true,
        data: vendor
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get Vendor for Edit (with authorization)
  async getVendorForEdit(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { _id: userId, roles } = this.getLoggedInUser(req);
      const userRole = roles[0]?.key;

      const vendor = await vendorService.getVendorForEdit(id, userId, userRole);
      
      if (!vendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.status(200).json({
        success: true,
        data: vendor
      });
    } catch (error: any) {
      if (error.message.includes('You can only access')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get All Vendors
  async getAllVendors(req: Request, res: Response) {
    try {
      const filters = {
        verification_status: req.query.verification_status as string,
        risk_rating: req.query.risk_rating as string,
        vendor_category: req.query.vendor_category as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10
      };

      const result = await vendorService.getAllVendors(filters);
      
      res.status(200).json({
        success: true,
        data: result
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Enhanced Update Vendor with Audit Trail
  async updateVendor(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { _id: userId, roles, email: userEmail } = this.getLoggedInUser(req);
      const userRole = roles[0]?.key;

      const updatedVendor = await vendorService.updateVendor(
        id, 
        req.body, 
        userRole, 
        userId, 
        userEmail, 
        req
      );
      
      if (!updatedVendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vendor updated successfully',
        data: updatedVendor
      });
    } catch (error: any) {
      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('Only Super Admin')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Update Vendor for Vendor Admin
  async updateVendorForAdmin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { _id: userId, roles } = this.getLoggedInUser(req);
      const userRole = roles[0]?.key;

      const updatedVendor = await vendorService.updateVendorForAdmin(id, req.body, userId, userRole);
      
      if (!updatedVendor) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vendor updated successfully',
        data: updatedVendor
      });
    } catch (error: any) {
      if (error.message.includes('You can only update') || error.message.includes('Only Super Admin')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      if (error.message.includes('already exists')) {
        return res.status(409).json({
          success: false,
          message: error.message
        });
      }

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Enhanced Vendor Verification with Audit Trail
  async updateVendorVerification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { verification_status, notes } = req.body;
      const { _id: verifiedBy, roles, email: userEmail } = this.getLoggedInUser(req);
      const userRole = roles[0]?.key;

      if (!['verified', 'rejected', 'pending'].includes(verification_status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification status. Must be: verified, rejected, or pending'
        });
      }

      const updatedVendor = await vendorService.updateVendorVerification(
        id,
        verification_status as 'verified' | 'rejected' | 'pending',
        verifiedBy,
        userRole,
        userEmail,
        notes,
        req
      );

      res.status(200).json({
        success: true,
        message: `Vendor status updated to ${verification_status}`,
        data: updatedVendor
      });
    } catch (error: any) {
      if (error.message.includes('Only Super Admin')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Toggle Vendor Verification (Verify ↔ Reject)
  async toggleVendorVerification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { _id: verifiedBy, roles } = this.getLoggedInUser(req);
      const userRole = roles[0]?.key;

      const updatedVendor = await vendorService.toggleVendorVerification(
        id,
        verifiedBy,
        userRole
      );

      res.status(200).json({
        success: true,
        message: `Vendor status toggled to ${updatedVendor.verification_status}`,
        data: updatedVendor
      });
    } catch (error: any) {
      if (error.message.includes('Only Super Admin')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Bulk Verify/Reject Vendors
  async bulkUpdateVendorVerification(req: Request, res: Response) {
    try {
      const { vendor_ids, verification_status, rejection_reason } = req.body;
      const { _id: verifiedBy, roles } = this.getLoggedInUser(req);
      const userRole = roles[0]?.key;

      if (!['verified', 'rejected'].includes(verification_status)) {
        return res.status(400).json({
          success: false,
          message: 'Invalid verification status'
        });
      }

      if (!Array.isArray(vendor_ids) || vendor_ids.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Vendor IDs array is required'
        });
      }

      const result = await vendorService.bulkUpdateVendorVerification(
        vendor_ids,
        verification_status as 'verified' | 'rejected',
        verifiedBy,
        userRole,
        rejection_reason
      );

      res.status(200).json({
        success: true,
        message: `Bulk verification completed. ${result.successful.length} successful, ${result.failed.length} failed.`,
        data: result
      });
    } catch (error: any) {
      if (error.message.includes('Only Super Admin')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Enhanced Delete Vendor with Audit Trail
  async deleteVendor(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { _id: userId, roles, email: userEmail } = this.getLoggedInUser(req);
      const userRole = roles[0]?.key;

      const result = await vendorService.deleteVendor(id, userId, userEmail, userRole, req);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vendor deleted successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delete Vendor for Vendor Admin
  async deleteVendorForAdmin(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { _id: userId, roles } = this.getLoggedInUser(req);
      const userRole = roles[0]?.key;

      const result = await vendorService.deleteVendorForAdmin(id, userId, userRole);
      
      if (!result) {
        return res.status(404).json({
          success: false,
          message: 'Vendor not found'
        });
      }

      res.status(200).json({
        success: true,
        message: 'Vendor deleted successfully'
      });
    } catch (error: any) {
      if (error.message.includes('You can only delete')) {
        return res.status(403).json({
          success: false,
          message: error.message
        });
      }

      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Test endpoint to generate audit data
  async generateTestAuditData(req: Request, res: Response) {
    try {
      const { _id: userId, roles, email: userEmail } = this.getLoggedInUser(req);
      const userRole = roles[0]?.key;

      // Create test audit records
      await auditTrailService.createAuditRecord({
        user: userId,
        user_email: userEmail,
        user_role: userRole,
        action: 'login',
        action_description: 'User logged into the system',
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      await auditTrailService.createAuditRecord({
        user: userId,
        user_email: userEmail,
        user_role: userRole,
        action: 'view',
        action_description: 'Viewed vendor dashboard',
        ip_address: req.ip,
        user_agent: req.get('User-Agent')
      });

      res.status(200).json({
        success: true,
        message: 'Test audit data generated successfully'
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // ==================== DOCUMENT MANAGEMENT ENDPOINTS ====================

  // Upload vendor document
  async uploadVendorDocument(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { document_type, expiry_date } = req.body;
      const { _id: userId, roles, email: userEmail } = this.getLoggedInUser(req);
      const userRole = roles[0]?.key;

      // Check if file exists
      if (!req.file) {
        return res.status(400).json({
          success: false,
          message: 'No file uploaded'
        });
      }

      // Validate document type
      if (!document_type) {
        return res.status(400).json({
          success: false,
          message: 'Document type is required'
        });
      }

      const expiryDate = expiry_date ? new Date(expiry_date) : undefined;

      const vendor = await vendorService.uploadVendorDocument(
        id,
        req.file,
        document_type,
        expiryDate,
        userId,
        userEmail,
        userRole,
        req
      );

      res.status(200).json({
        success: true,
        message: 'Document uploaded successfully',
        data: vendor
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Delete vendor document
  async deleteVendorDocument(req: Request, res: Response) {
    try {
      const { id, documentId } = req.params;
      const { _id: userId, roles, email: userEmail } = this.getLoggedInUser(req);
      const userRole = roles[0]?.key;

      const vendor = await vendorService.deleteVendorDocument(
        id,
        documentId,
        userId,
        userEmail,
        userRole,
        req
      );

      res.status(200).json({
        success: true,
        message: 'Document deleted successfully',
        data: vendor
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get all vendor documents
  async getVendorDocuments(req: Request, res: Response) {
    try {
      const { id } = req.params;

      const documents = await vendorService.getVendorDocuments(id);

      res.status(200).json({
        success: true,
        data: documents
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }

  // Get single vendor document
  async getVendorDocument(req: Request, res: Response) {
    try {
      const { id, documentId } = req.params;

      const document = await vendorService.getVendorDocument(id, documentId);

      if (!document) {
        return res.status(404).json({
          success: false,
          message: 'Document not found'
        });
      }

      res.status(200).json({
        success: true,
        data: document
      });
    } catch (error: any) {
      res.status(400).json({
        success: false,
        message: error.message
      });
    }
  }
}