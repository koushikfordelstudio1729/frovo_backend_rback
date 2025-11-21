// services/auditTrail.service.ts
import { AuditTrail } from '../models/AuditTrail.model';
import { Types } from 'mongoose'; // Add this missing import

export class AuditTrailService {
  
  async createAuditRecord(auditData: {
    user: any;
    user_email: string;
    user_role: string;
    action: string;
    action_description: string;
    target_vendor?: any;
    target_vendor_name?: string;
    target_vendor_id?: string;
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
        target_vendor: auditData.target_vendor,
        target_vendor_name: auditData.target_vendor_name,
        target_vendor_id: auditData.target_vendor_id,
        before_state: auditData.before_state,
        after_state: auditData.after_state,
        changed_fields: auditData.changed_fields || [],
        ip_address: auditData.ip_address,
        user_agent: auditData.user_agent,
        timestamp: new Date()
      });

      return await auditRecord.save();
    } catch (error) {
      console.error('Error creating audit record:', error);
      throw error;
    }
  }

  async getAuditTrails(filters: any) {
    try {
      const {
        user,
        target_vendor,
        action,
        user_role,
        date_from,
        date_to,
        search,
        page = 1,
        limit = 20
      } = filters;

      // Build query
      const query: any = {};

      if (user) query.user = new Types.ObjectId(user);
      if (target_vendor) query.target_vendor = new Types.ObjectId(target_vendor);
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
          { user_email: { $regex: search, $options: 'i' } },
          { action_description: { $regex: search, $options: 'i' } },
          { target_vendor_name: { $regex: search, $options: 'i' } },
          { target_vendor_id: { $regex: search, $options: 'i' } }
        ];
      }

      const skip = (page - 1) * limit;

      const [audits, total] = await Promise.all([
        AuditTrail.find(query)
          .populate('user', 'name email')
          .populate('target_vendor', 'vendor_name vendor_id')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditTrail.countDocuments(query)
      ]);

      return {
        audits,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error: any) {
      throw new Error(`Error fetching audit trails: ${error.message}`);
    }
  }

  async getVendorAuditTrails(vendorId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [audits, total] = await Promise.all([
        AuditTrail.find({ target_vendor: new Types.ObjectId(vendorId) })
          .populate('user', 'name email')
          .populate('target_vendor', 'vendor_name vendor_id')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditTrail.countDocuments({ target_vendor: new Types.ObjectId(vendorId) })
      ]);

      return {
        audits,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error: any) {
      throw new Error(`Error fetching vendor audit trails: ${error.message}`);
    }
  }

  async getUserActivity(userId: string, page: number = 1, limit: number = 20) {
    try {
      const skip = (page - 1) * limit;

      const [audits, total] = await Promise.all([
        AuditTrail.find({ user: new Types.ObjectId(userId) })
          .populate('target_vendor', 'vendor_name vendor_id')
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        AuditTrail.countDocuments({ user: new Types.ObjectId(userId) })
      ]);

      return {
        audits,
        total,
        page,
        pages: Math.ceil(total / limit)
      };
    } catch (error: any) {
      throw new Error(`Error fetching user activity: ${error.message}`);
    }
  }

  async getAuditStatistics() {
    try {
      const [totalAudits, actionsBreakdown, usersBreakdown, vendorsBreakdown] = await Promise.all([
        AuditTrail.countDocuments(),
        AuditTrail.aggregate([
          {
            $group: {
              _id: '$action',
              count: { $sum: 1 }
            }
          }
        ]),
        AuditTrail.aggregate([
          {
            $group: {
              _id: '$user_role',
              count: { $sum: 1 }
            }
          }
        ]),
        AuditTrail.aggregate([
          {
            $match: {
              target_vendor: { $exists: true, $ne: null }
            }
          },
          {
            $group: {
              _id: '$target_vendor_name',
              count: { $sum: 1 }
            }
          },
          { $sort: { count: -1 } },
          { $limit: 10 }
        ])
      ]);

      return {
        total_audits: totalAudits,
        actions_breakdown: actionsBreakdown,
        users_breakdown: usersBreakdown,
        top_vendors: vendorsBreakdown
      };
    } catch (error: any) {
      throw new Error(`Error fetching audit statistics: ${error.message}`);
    }
  }
}