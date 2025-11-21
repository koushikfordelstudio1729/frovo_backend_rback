import { Request, Response } from 'express';
import { AuditTrailService } from '../services/auditTrail.service';

const auditTrailService = new AuditTrailService();

export class AuditTrailController {
  
  // Utility function to safely extract user
  private getLoggedInUser(req: Request): { _id: any; roles: any[] } {
    const user = (req as any).user;
    
    if (!user || !user._id) {
      throw new Error('User authentication required');
    }
    
    return {
      _id: user._id,
      roles: user.roles || []
    };
  }

  // Get all audit trails (Super Admin only)
  async getAuditTrails(req: Request, res: Response) {
    try {
      const { roles } = this.getLoggedInUser(req);
      
      // Validate user is Super Admin
      if (!roles.some(role => ['super_admin','vendor_admin'].includes(role.key))) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admin can access audit trails'
        });
      }

      const filters = {
        user: req.query.user as string,
        target_vendor: req.query.target_vendor as string,
        action: req.query.action as string,
        user_role: req.query.user_role as string,
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20
      };

      const result = await auditTrailService.getAuditTrails(filters);

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

  // Get audit trails for specific vendor
  async getVendorAuditTrails(req: Request, res: Response) {
    try {
      const { vendorId } = req.params;
      const { roles } = this.getLoggedInUser(req);
      
      // Only Super Admin and Vendor Admin can access vendor audit trails
      if (!roles.some(role => ['super_admin', 'vendor_admin'].includes(role.key))) {
        return res.status(403).json({
          success: false,
          message: 'Insufficient permissions to access audit trails'
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await auditTrailService.getVendorAuditTrails(vendorId, page, limit);

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

  // Get user activity
  async getUserActivity(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { _id: currentUserId, roles } = this.getLoggedInUser(req);
      
      // Users can only see their own activity unless they are Super Admin or Vendor Admin
      if (userId !== currentUserId.toString() && !roles.some(role => ['super_admin','vendor_admin'].includes(role.key))) {
        return res.status(403).json({
          success: false,
          message: 'You can only view your own activity'
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await auditTrailService.getUserActivity(userId, page, limit);

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

  // Get audit statistics (Super Admin only)
  async getAuditStatistics(req: Request, res: Response) {
    try {
      const { roles } = this.getLoggedInUser(req);
      
      // Validate user is Super Admin
      if (!roles.some(role => ['super_admin','vendor_admin'].includes(role.key))) {
        return res.status(403).json({
          success: false,
          message: 'Only Super Admin can access audit statistics'
        });
      }

      const statistics = await auditTrailService.getAuditStatistics();

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
}