import { Request } from "express";
import { HistoryCatalogue, IHistoryCatalogue } from "../models/HistoryCatalogue.model";

import mongoose from "mongoose";

import { logger } from "../utils/logger.util";
export class HistoryCatalogueService {
  private extractUserDetails(req: Request): {
    user_id: mongoose.Types.ObjectId;
    user_email: string;
    user_role: string;
  } {
    const user = (req as any).user;

    return {
      user_id: user?._id || new mongoose.Types.ObjectId("000000000000000000000000"),
      user_email: user?.email || "unknown",
      user_role: user?.roles?.[0]?.key || "unknown",
    };
  }

  private extractRequestDetails(req: Request): {
    ip_address: string;
    user_agent: string;
    request_method: string;
    request_path: string;
  } {
    return {
      ip_address: req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown",
      user_agent: req.headers["user-agent"] || "unknown",
      request_method: req.method,
      request_path: req.originalUrl || req.path,
    };
  }

  private calculateChanges(
    oldData: any,
    newData: any
  ): Array<{
    field: string;
    old_value: any;
    new_value: any;
  }> {
    const changes: Array<{ field: string; old_value: any; new_value: any }> = [];

    const allKeys = new Set([...Object.keys(oldData || {}), ...Object.keys(newData || {})]);

    const excludeFields = ["_id", "__v", "createdAt", "updatedAt"];

    for (const key of allKeys) {
      if (excludeFields.includes(key)) continue;

      const oldValue = oldData?.[key];
      const newValue = newData?.[key];

      if (
        typeof oldValue === "object" &&
        typeof newValue === "object" &&
        !Array.isArray(oldValue) &&
        !Array.isArray(newValue)
      ) {
        const nestedChanges = this.calculateChanges(oldValue, newValue);
        nestedChanges.forEach(change => {
          changes.push({
            field: `${key}.${change.field}`,
            old_value: change.old_value,
            new_value: change.new_value,
          });
        });
        continue;
      }

      if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
        changes.push({
          field: key,
          old_value: oldValue,
          new_value: newValue,
        });
      }
    }

    return changes;
  }

  async logCreate(
    req: Request,
    entityType: "category" | "sub_category" | "catalogue",
    entityId: mongoose.Types.ObjectId,
    entityName: string,
    entityData: any,
    status: "success" | "failed" = "success",
    errorMessage?: string
  ): Promise<void> {
    try {
      const userDetails = this.extractUserDetails(req);
      const requestDetails = this.extractRequestDetails(req);

      const auditLog = new HistoryCatalogue({
        operation: "create",
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        ...userDetails,
        ...requestDetails,
        after_state: entityData,
        description: `Created ${entityType} "${entityName}"`,
        status,
        error_message: errorMessage,
        timestamp: new Date(),
      });

      await auditLog.save();
      logger.info(`✅ Audit log created: CREATE ${entityType} by ${userDetails.user_email}`);
    } catch (error) {
      logger.error("❌ Failed to create audit log:", error);
    }
  }

  async logUpdate(
    req: Request,
    entityType: "category" | "sub_category" | "catalogue",
    entityId: mongoose.Types.ObjectId,
    entityName: string,
    beforeState: any,
    afterState: any,
    status: "success" | "failed" = "success",
    errorMessage?: string
  ): Promise<void> {
    try {
      const userDetails = this.extractUserDetails(req);
      const requestDetails = this.extractRequestDetails(req);
      const changes = this.calculateChanges(beforeState, afterState);

      const auditLog = new HistoryCatalogue({
        operation: "update",
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        ...userDetails,
        ...requestDetails,
        changes,
        before_state: beforeState,
        after_state: afterState,
        description: `Updated ${entityType} "${entityName}" (${changes.length} field${changes.length !== 1 ? "s" : ""} changed)`,
        status,
        error_message: errorMessage,
        timestamp: new Date(),
      });

      await auditLog.save();
      logger.info(`✅ Audit log created: UPDATE ${entityType} by ${userDetails.user_email}`);
    } catch (error) {
      logger.error("❌ Failed to create audit log:", error);
    }
  }

  async logDelete(
    req: Request,
    entityType: "category" | "sub_category" | "catalogue",
    entityId: mongoose.Types.ObjectId,
    entityName: string,
    entityData: any,
    status: "success" | "failed" = "success",
    errorMessage?: string
  ): Promise<void> {
    try {
      const userDetails = this.extractUserDetails(req);
      const requestDetails = this.extractRequestDetails(req);

      const auditLog = new HistoryCatalogue({
        operation: "delete",
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        ...userDetails,
        ...requestDetails,
        before_state: entityData,
        description: `Deleted ${entityType} "${entityName}"`,
        status,
        error_message: errorMessage,
        timestamp: new Date(),
      });

      await auditLog.save();
      logger.info(`✅ Audit log created: DELETE ${entityType} by ${userDetails.user_email}`);
    } catch (error) {
      logger.error("❌ Failed to create audit log:", error);
    }
  }

  async logView(
    req: Request,
    entityType: "category" | "sub_category" | "catalogue",
    entityId: mongoose.Types.ObjectId,
    entityName: string
  ): Promise<void> {
    try {
      const userDetails = this.extractUserDetails(req);
      const requestDetails = this.extractRequestDetails(req);

      const auditLog = new HistoryCatalogue({
        operation: "view",
        entity_type: entityType,
        entity_id: entityId,
        entity_name: entityName,
        ...userDetails,
        ...requestDetails,
        description: `Viewed ${entityType} "${entityName}"`,
        status: "success",
        timestamp: new Date(),
      });

      await auditLog.save();
      logger.info(`✅ Audit log created: VIEW ${entityType} by ${userDetails.user_email}`);
    } catch (error) {
      logger.error("❌ Failed to create audit log:", error);
    }
  }

  async getEntityHistoryLogs(
    entityType: "category" | "sub_category" | "catalogue",
    entityId: string,
    options?: {
      limit?: number;
      skip?: number;
      operation?: "create" | "update" | "delete" | "view";
    }
  ): Promise<IHistoryCatalogue[]> {
    try {
      const query: any = {
        entity_type: entityType,
        entity_id: new mongoose.Types.ObjectId(entityId),
      };

      if (options?.operation) {
        query.operation = options.operation;
      }

      const logs = await HistoryCatalogue.find(query)
        .sort({ timestamp: -1 })
        .limit(options?.limit || 50)
        .skip(options?.skip || 0)
        .lean();

      return logs as unknown as IHistoryCatalogue[];
    } catch (error) {
      logger.error("Error fetching audit logs:", error);
      throw error;
    }
  }

  async getUserHistoryLogs(
    userId: string,
    options?: {
      limit?: number;
      skip?: number;
      entityType?: "category" | "sub_category" | "catalogue";
      operation?: "create" | "update" | "delete" | "view";
      startDate?: Date;
      endDate?: Date;
    }
  ): Promise<IHistoryCatalogue[]> {
    try {
      const query: any = {
        user_id: new mongoose.Types.ObjectId(userId),
      };

      if (options?.entityType) {
        query.entity_type = options.entityType;
      }

      if (options?.operation) {
        query.operation = options.operation;
      }

      if (options?.startDate || options?.endDate) {
        query.timestamp = {};
        if (options.startDate) query.timestamp.$gte = options.startDate;
        if (options.endDate) query.timestamp.$lte = options.endDate;
      }

      const logs = await HistoryCatalogue.find(query)
        .sort({ timestamp: -1 })
        .limit(options?.limit || 50)
        .skip(options?.skip || 0)
        .lean();

      return logs as unknown as IHistoryCatalogue[];
    } catch (error) {
      logger.error("Error fetching user history logs:", error);
      throw error;
    }
  }

  async getAuditLogs(filters: {
    entityType?: "category" | "sub_category" | "catalogue";
    operation?: "create" | "update" | "delete" | "view";
    userId?: string;
    userEmail?: string;
    startDate?: Date;
    endDate?: Date;
    status?: "success" | "failed";
    limit?: number;
    skip?: number;
  }): Promise<{ logs: IHistoryCatalogue[]; total: number }> {
    try {
      const query: any = {};

      if (filters.entityType) query.entity_type = filters.entityType;
      if (filters.operation) query.operation = filters.operation;
      if (filters.userId) query.user_id = new mongoose.Types.ObjectId(filters.userId);
      if (filters.userEmail) query.user_email = { $regex: filters.userEmail, $options: "i" };
      if (filters.status) query.status = filters.status;

      if (filters.startDate || filters.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      const [logs, total] = await Promise.all([
        HistoryCatalogue.find(query)
          .sort({ timestamp: -1 })
          .limit(filters.limit || 50)
          .skip(filters.skip || 0)
          .lean(),
        HistoryCatalogue.countDocuments(query),
      ]);

      return { logs: logs as unknown as IHistoryCatalogue[], total };
    } catch (error) {
      logger.error("Error fetching audit logs:", error);
      throw error;
    }
  }

  async getAuditStatistics(filters?: {
    startDate?: Date;
    endDate?: Date;
    entityType?: "category" | "sub_category" | "catalogue";
  }): Promise<{
    total_operations: number;
    operations_by_type: Array<{ operation: string; count: number }>;
    operations_by_entity: Array<{ entity_type: string; count: number }>;
    operations_by_user: Array<{ user_email: string; count: number }>;
    success_rate: number;
  }> {
    try {
      const query: any = {};

      if (filters?.entityType) query.entity_type = filters.entityType;

      if (filters?.startDate || filters?.endDate) {
        query.timestamp = {};
        if (filters.startDate) query.timestamp.$gte = filters.startDate;
        if (filters.endDate) query.timestamp.$lte = filters.endDate;
      }

      const [totalOps, opsByType, opsByEntity, opsByUser, successCount] = await Promise.all([
        HistoryCatalogue.countDocuments(query),
        HistoryCatalogue.aggregate([
          { $match: query },
          { $group: { _id: "$operation", count: { $sum: 1 } } },
          { $project: { operation: "$_id", count: 1, _id: 0 } },
        ]),
        HistoryCatalogue.aggregate([
          { $match: query },
          { $group: { _id: "$entity_type", count: { $sum: 1 } } },
          { $project: { entity_type: "$_id", count: 1, _id: 0 } },
        ]),
        HistoryCatalogue.aggregate([
          { $match: query },
          { $group: { _id: "$user_email", count: { $sum: 1 } } },
          { $project: { user_email: "$_id", count: 1, _id: 0 } },
          { $sort: { count: -1 } },
          { $limit: 10 },
        ]),
        HistoryCatalogue.countDocuments({ ...query, status: "success" }),
      ]);

      return {
        total_operations: totalOps,
        operations_by_type: opsByType,
        operations_by_entity: opsByEntity,
        operations_by_user: opsByUser,
        success_rate: totalOps > 0 ? (successCount / totalOps) * 100 : 0,
      };
    } catch (error) {
      logger.error("Error calculating audit statistics:", error);
      throw error;
    }
  }
}

export const historyCatalogueService = new HistoryCatalogueService();
