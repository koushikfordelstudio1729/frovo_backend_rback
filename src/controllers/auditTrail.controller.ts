import { Request, Response } from "express";
import { AuditTrailService } from "../services/auditTrail.service";

import { logger } from "../utils/logger.util";
const auditTrailService = new AuditTrailService();

export class AuditTrailController {
  // Utility function to safely extract user
  private getLoggedInUser(req: Request): { _id: any; roles: any[]; email: string } {
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

  /**
   * Get all audit trails - SUPER ADMIN ONLY
   * Supports filtering by company, vendor, user, action, date range
   */
  async getAuditTrails(req: Request, res: Response) {
    try {
      const { roles } = this.getLoggedInUser(req);

      // ✅ SUPER ADMIN ONLY - Strict access control
      if (!roles.some(role => role.key === "super_admin")) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only Super Admin can access audit trails.",
        });
      }

      const filters = {
        user: req.query.user as string,
        target_type: req.query.target_type as string, // 'vendor' or 'company'
        target_vendor: req.query.target_vendor as string,
        target_company: req.query.target_company as string,
        action: req.query.action as string,
        user_role: req.query.user_role as string,
        date_from: req.query.date_from as string,
        date_to: req.query.date_to as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 20,
      };

      const result = await auditTrailService.getAuditTrails(filters);

      res.status(200).json({
        success: true,
        message: "Audit trails retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      logger.error("Error fetching audit trails:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get audit trails for specific vendor - SUPER ADMIN ONLY
   */
  async getVendorAuditTrails(req: Request, res: Response) {
    try {
      const { vendorId } = req.params;
      const { roles } = this.getLoggedInUser(req);

      // ✅ SUPER ADMIN ONLY
      if (!roles.some(role => role.key === "super_admin")) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only Super Admin can access vendor audit trails.",
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await auditTrailService.getVendorAuditTrails(vendorId, page, limit);

      res.status(200).json({
        success: true,
        message: `Audit trails for vendor retrieved successfully`,
        data: result,
      });
    } catch (error: any) {
      logger.error("Error fetching vendor audit trails:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get audit trails for specific company - SUPER ADMIN ONLY
   */
  async getCompanyAuditTrails(req: Request, res: Response) {
    try {
      const { companyId } = req.params;
      const { roles } = this.getLoggedInUser(req);

      // ✅ SUPER ADMIN ONLY
      if (!roles.some(role => role.key === "super_admin")) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only Super Admin can access company audit trails.",
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await auditTrailService.getCompanyAuditTrails(companyId, page, limit);

      res.status(200).json({
        success: true,
        message: `Audit trails for company retrieved successfully`,
        data: result,
      });
    } catch (error: any) {
      logger.error("Error fetching company audit trails:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get user activity - Users can see their own, Super Admin can see anyone's
   */
  async getUserActivity(req: Request, res: Response) {
    try {
      const { userId } = req.params;
      const { _id: currentUserId, roles } = this.getLoggedInUser(req);

      // Users can only see their own activity unless they are Super Admin
      if (userId !== currentUserId.toString() && !roles.some(role => role.key === "super_admin")) {
        return res.status(403).json({
          success: false,
          message: "You can only view your own activity. Super Admin can view all activities.",
        });
      }

      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 20;

      const result = await auditTrailService.getUserActivity(userId, page, limit);

      res.status(200).json({
        success: true,
        message: "User activity retrieved successfully",
        data: result,
      });
    } catch (error: any) {
      logger.error("Error fetching user activity:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get audit statistics - SUPER ADMIN ONLY
   */
  async getAuditStatistics(req: Request, res: Response) {
    try {
      const { roles } = this.getLoggedInUser(req);

      // ✅ SUPER ADMIN ONLY
      if (!roles.some(role => role.key === "super_admin")) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only Super Admin can access audit statistics.",
        });
      }

      const statistics = await auditTrailService.getAuditStatistics();

      res.status(200).json({
        success: true,
        message: "Audit statistics retrieved successfully",
        data: statistics,
      });
    } catch (error: any) {
      logger.error("Error fetching audit statistics:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }

  /**
   * Get audit summary - SUPER ADMIN ONLY
   */
  async getAuditSummary(req: Request, res: Response) {
    try {
      const { roles } = this.getLoggedInUser(req);

      // ✅ SUPER ADMIN ONLY
      if (!roles.some(role => role.key === "super_admin")) {
        return res.status(403).json({
          success: false,
          message: "Access denied. Only Super Admin can access audit summary.",
        });
      }

      const summary = await auditTrailService.getAuditSummary();

      res.status(200).json({
        success: true,
        message: "Audit summary retrieved successfully",
        data: summary,
      });
    } catch (error: any) {
      logger.error("Error fetching audit summary:", error);
      res.status(400).json({
        success: false,
        message: error.message,
      });
    }
  }
}
