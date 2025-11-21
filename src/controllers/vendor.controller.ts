import { Request, Response } from 'express';
import { Types } from 'mongoose';
import { VendorService } from '../services/vendor.service';

const vendorService = new VendorService();

export class VendorController {
  
  // Utility function to safely extract user
  private getLoggedInUser(req: Request): { _id: Types.ObjectId; roles: any[] } {
    const user = (req as any).user;
    
    if (!user || !user._id) {
      throw new Error('User authentication required');
    }
    
    return {
      _id: user._id,
      roles: user.roles || []
    };
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

  // Enhanced Vendor Verification with status flexibility
  async updateVendorVerification(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const { verification_status, notes } = req.body;
      const verifiedBy = (req as any).user._id;
      const userRole = (req as any).user.roles[0]?.key;

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
        notes
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
      const verifiedBy = (req as any).user._id;
      const userRole = (req as any).user.roles[0]?.key;

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
      const verifiedBy = (req as any).user._id;
      const userRole = (req as any).user.roles[0]?.key;

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

  // Create Complete Vendor
  async createCompleteVendor(req: Request, res: Response) {
    try {
      const { _id: createdBy, roles } = this.getLoggedInUser(req);
      
      // Validate user has permission to create vendors
      if (!roles.some(role => ['super_admin', 'vendor_admin'].includes(role.key))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to create vendors'
        });
      }

      const vendor = await vendorService.createCompleteVendor(req.body, createdBy);

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

  // Update Vendor
  async updateVendor(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const userRole = (req as any).user.roles[0]?.key;
      
      const updatedVendor = await vendorService.updateVendor(id, req.body, userRole);
      
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
   // Get Vendor Admin Dashboard
async getVendorAdminDashboard(req: Request, res: Response) {
  try {
    const { _id: userId, roles } = this.getLoggedInUser(req);
    
    // Validate user is Vendor Admin
    if (!roles.some(role => role.key === 'vendor_admin')) {
      return res.status(403).json({
        success: false,
        message: 'Only Vendor Admin can access this dashboard'
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
  // Delete Vendor
  async deleteVendor(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const result = await vendorService.deleteVendor(id);
      
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
}