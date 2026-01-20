// services/auditTrail.service.ts
import { AuditTrail } from "../models/AuditTrail.model";
import { Types } from "mongoose";

export class AuditTrailService {
  /**
   * Create audit record for vendor or company operations
   */
  async createAuditRecord(auditData: {
    user: any;
    user_email: string;
    user_role: string;
    action: string;
    action_description: string;
    target_type?: "vendor" | "company";
    // Vendor fields
    target_vendor?: any;
    target_vendor_name?: string;
    target_vendor_id?: string;
    // Company fields
    target_company?: any;
    target_company_name?: string;
    target_company_cin?: string;
    // State tracking
    before_state?: any;
    after_state?: any;
    changed_fields?: string[];
    ip_address?: string;
    user_agent?: string;
  }): Promise<any> {
    try {
      const auditRecord = new AuditTrail({
        user: auditData.user,
        user_email: auditData.user_email,
        user_role: auditData.user_role,
        action: auditData.action,
        action_description: auditData.action_description,
        target_type: auditData.target_type,
        // Vendor fields
        target_vendor: auditData.target_vendor,
        target_vendor_name: auditData.target_vendor_name,
        target_vendor_id: auditData.target_vendor_id,
        // Company fields
        target_company: auditData.target_company,
        target_company_name: auditData.target_company_name,
        target_company_cin: auditData.target_company_cin,
        // State tracking
        before_state: auditData.before_state,
        after_state: auditData.after_state,
        changed_fields: auditData.changed_fields || [],
        ip_address: auditData.ip_address,
        user_agent: auditData.user_agent,
        timestamp: new Date(),
      });

      return await auditRecord.save();
    } catch (error) {
      console.error("Error creating audit record:", error);
      throw error;
    }
  }

  /**
   * Get all audit trails with filtering (Super Admin only)
   */
  async getAuditTrails(filters: any) {
    try {
      const {
        user,
        target_type,
        target_vendor,
        target_company,
        action,
        user_role,
        date_from,
        date_to,
        search,
        page = 1,
        limit = 20,
      } = filters;

      // Build query
      const query: any = {};

      if (user) query.user = new Types.ObjectId(user);
      if (target_type) query.target_type = target_type;
      if (target_vendor) query.target_vendor = new Types.ObjectId(target_vendor);
      if (target_company) query.target_company = new Types.ObjectId(target_company);
      if (action) query.action = action;
      if (user_role) query.user_role = user_role;

      // Date range filter
      if (date_from || date_to) {
        query.timestamp = {};
        if (date_from) query.timestamp.$gte = new Date(date_from);
        if (date_to) query.timestamp.$lte = new Date(date_to);
      }

      // Search across multiple fields
      if (search) {
        query.$or = [
          { user_email: { $regex: search, $options: "i" } },
          { action_description: { $regex: search, $options: "i" } },
          { target_vendor_name: { $regex: search, $options: "i" } },
          { target_vendor_id: { $regex: search, $options: "i" } },
          { target_company_name: { $regex: search, $options: "i" } },
          { target_company_cin: { $regex: search, $options: "i" } },
        ];
      }

      const skip = (page - 1) * limit;

      const [audits, total] = await Promise.all([
        AuditTrail.find(query)
          .populate("user", "name email")
          .populate("target_vendor", "vendor_name vendor_id")
          .populate("target_company", "registered_company_name cin")
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditTrail.countDocuments(query),
      ]);

      return {
        audits,
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      };
    } catch (error: any) {
      throw new Error(`Error fetching audit trails: ${error.message}`);
    }
  }

  /**
   * Get audit trails for a specific vendor
   */
  async getVendorAuditTrails(vendorId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [audits, total] = await Promise.all([
        AuditTrail.find({
          target_vendor: new Types.ObjectId(vendorId),
          target_type: "vendor",
        })
          .populate("user", "name email")
          .populate("target_vendor", "vendor_name vendor_id")
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditTrail.countDocuments({
          target_vendor: new Types.ObjectId(vendorId),
          target_type: "vendor",
        }),
      ]);

      return {
        audits,
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      };
    } catch (error: any) {
      throw new Error(`Error fetching vendor audit trails: ${error.message}`);
    }
  }

  /**
   * Get audit trails for a specific company
   */
  async getCompanyAuditTrails(companyId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [audits, total] = await Promise.all([
        AuditTrail.find({
          target_company: new Types.ObjectId(companyId),
          target_type: "company",
        })
          .populate("user", "name email")
          .populate("target_company", "registered_company_name cin")
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditTrail.countDocuments({
          target_company: new Types.ObjectId(companyId),
          target_type: "company",
        }),
      ]);

      return {
        audits,
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      };
    } catch (error: any) {
      throw new Error(`Error fetching company audit trails: ${error.message}`);
    }
  }

  /**
   * Get user activity
   */
  async getUserActivity(userId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [audits, total] = await Promise.all([
        AuditTrail.find({ user: new Types.ObjectId(userId) })
          .populate("target_vendor", "vendor_name vendor_id")
          .populate("target_company", "registered_company_name cin")
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditTrail.countDocuments({ user: new Types.ObjectId(userId) }),
      ]);

      return {
        audits,
        total,
        page,
        pages: Math.ceil(total / limit),
        limit,
      };
    } catch (error: any) {
      throw new Error(`Error fetching user activity: ${error.message}`);
    }
  }

  /**
   * Get audit statistics (Super Admin only)
   */
  async getAuditStatistics() {
    try {
      const [
        totalAudits,
        actionsBreakdown,
        usersBreakdown,
        targetTypeBreakdown,
        topVendors,
        topCompanies,
        recentActivity,
      ] = await Promise.all([
        AuditTrail.countDocuments(),

        // Actions breakdown
        AuditTrail.aggregate([
          {
            $group: {
              _id: "$action",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ]),

        // Users breakdown
        AuditTrail.aggregate([
          {
            $group: {
              _id: "$user_role",
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
        ]),

        // Target type breakdown
        AuditTrail.aggregate([
          {
            $match: {
              target_type: { $exists: true, $ne: null },
            },
          },
          {
            $group: {
              _id: "$target_type",
              count: { $sum: 1 },
            },
          },
        ]),

        // Top vendors
        AuditTrail.aggregate([
          {
            $match: {
              target_vendor: { $exists: true, $ne: null },
              target_type: "vendor",
            },
          },
          {
            $group: {
              _id: {
                vendor_id: "$target_vendor",
                vendor_name: "$target_vendor_name",
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),

        // Top companies
        AuditTrail.aggregate([
          {
            $match: {
              target_company: { $exists: true, $ne: null },
              target_type: "company",
            },
          },
          {
            $group: {
              _id: {
                company_id: "$target_company",
                company_name: "$target_company_name",
              },
              count: { $sum: 1 },
            },
          },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),

        // Recent activity (last 10 actions)
        AuditTrail.find()
          .populate("user", "name email")
          .populate("target_vendor", "vendor_name vendor_id")
          .populate("target_company", "registered_company_name cin")
          .select("action action_description user user_email timestamp target_type")
          .sort({ timestamp: -1 })
          .limit(10)
          .lean(),
      ]);

      return {
        total_audits: totalAudits,
        actions_breakdown: actionsBreakdown,
        users_breakdown: usersBreakdown,
        target_type_breakdown: targetTypeBreakdown,
        top_vendors: topVendors,
        top_companies: topCompanies,
        recent_activity: recentActivity,
      };
    } catch (error: any) {
      throw new Error(`Error fetching audit statistics: ${error.message}`);
    }
  }

  /**
   * Get audit summary for dashboard
   */
  async getAuditSummary() {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const [todayCount, weekCount, monthCount] = await Promise.all([
        AuditTrail.countDocuments({ timestamp: { $gte: today } }),
        AuditTrail.countDocuments({
          timestamp: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
        }),
        AuditTrail.countDocuments({
          timestamp: { $gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000) },
        }),
      ]);

      return {
        today: todayCount,
        this_week: weekCount,
        this_month: monthCount,
      };
    } catch (error: any) {
      throw new Error(`Error fetching audit summary: ${error.message}`);
    }
  }
}
