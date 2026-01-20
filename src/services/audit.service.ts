import { AuditLog, IAuditLog } from "../models";

export interface AuditQuery {
  page: number;
  limit: number;
  startDate?: string;
  endDate?: string;
  actor?: string;
  module?: string;
  action?: string;
  targetType?: string;
  targetId?: string;
  sortBy: string;
  sortOrder: "asc" | "desc";
}

export interface PaginatedAuditLogs {
  logs: IAuditLog[];
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface CreateAuditLogData {
  actor: string;
  action: string;
  module: string;
  target: {
    type: string;
    id: string;
    name?: string;
  };
  changes?: {
    before?: any;
    after?: any;
  };
  ipAddress?: string;
  userAgent?: string;
  metadata?: Record<string, any>;
}

class AuditService {
  async createAuditLog(data: CreateAuditLogData): Promise<IAuditLog> {
    return await AuditLog.create({
      timestamp: new Date(),
      ...data,
    });
  }

  async getAuditLogs(query: AuditQuery): Promise<PaginatedAuditLogs> {
    const {
      page,
      limit,
      startDate,
      endDate,
      actor,
      module,
      action,
      targetType,
      targetId,
      sortBy,
      sortOrder,
    } = query;

    // Build filter
    const filter: any = {};

    // Date range filter
    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    if (actor) {
      filter.actor = actor;
    }

    if (module) {
      filter.module = { $regex: module, $options: "i" };
    }

    if (action) {
      filter.action = { $regex: action, $options: "i" };
    }

    if (targetType) {
      filter["target.type"] = { $regex: targetType, $options: "i" };
    }

    if (targetId) {
      filter["target.id"] = targetId;
    }

    // Build sort
    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    // Calculate skip
    const skip = (page - 1) * limit;

    // Execute queries
    const [logs, total] = await Promise.all([
      AuditLog.find(filter).populate("actor", "name email").sort(sort).skip(skip).limit(limit),
      AuditLog.countDocuments(filter),
    ]);

    const pages = Math.ceil(total / limit);

    return {
      logs,
      total,
      page,
      limit,
      pages,
    };
  }

  async getAuditLogById(id: string): Promise<IAuditLog | null> {
    return await AuditLog.findById(id).populate("actor", "name email");
  }

  async getAuditLogsByActor(actorId: string, limit = 50): Promise<IAuditLog[]> {
    return await AuditLog.find({ actor: actorId }).sort({ timestamp: -1 }).limit(limit);
  }

  async getAuditLogsByTarget(targetType: string, targetId: string): Promise<IAuditLog[]> {
    return await AuditLog.find({
      "target.type": targetType,
      "target.id": targetId,
    })
      .populate("actor", "name email")
      .sort({ timestamp: -1 });
  }

  async getAuditLogsByModule(module: string, limit = 100): Promise<IAuditLog[]> {
    return await AuditLog.find({ module })
      .populate("actor", "name email")
      .sort({ timestamp: -1 })
      .limit(limit);
  }

  async getAuditStats(
    startDate?: string,
    endDate?: string
  ): Promise<{
    totalLogs: number;
    logsByModule: { [module: string]: number };
    logsByAction: { [action: string]: number };
    logsByActor: { [actor: string]: number };
    recentActivity: IAuditLog[];
  }> {
    const filter: any = {};

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    const [totalLogs, logsByModule, logsByAction, logsByActor, recentActivity] = await Promise.all([
      // Total count
      AuditLog.countDocuments(filter),

      // Group by module
      AuditLog.aggregate([
        { $match: filter },
        { $group: { _id: "$module", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Group by action
      AuditLog.aggregate([
        { $match: filter },
        { $group: { _id: "$action", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
      ]),

      // Group by actor
      AuditLog.aggregate([
        { $match: filter },
        { $group: { _id: "$actor", count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
      ]),

      // Recent activity
      AuditLog.find(filter).populate("actor", "name email").sort({ timestamp: -1 }).limit(10),
    ]);

    return {
      totalLogs,
      logsByModule: logsByModule.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      logsByAction: logsByAction.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      logsByActor: logsByActor.reduce((acc, item) => {
        acc[item._id] = item.count;
        return acc;
      }, {}),
      recentActivity,
    };
  }

  async exportAuditLogs(query: Omit<AuditQuery, "page" | "limit">): Promise<IAuditLog[]> {
    const { startDate, endDate, actor, module, action, targetType, targetId, sortBy, sortOrder } =
      query;

    // Build filter (same as getAuditLogs)
    const filter: any = {};

    if (startDate || endDate) {
      filter.timestamp = {};
      if (startDate) {
        filter.timestamp.$gte = new Date(startDate);
      }
      if (endDate) {
        filter.timestamp.$lte = new Date(endDate);
      }
    }

    if (actor) filter.actor = actor;
    if (module) filter.module = { $regex: module, $options: "i" };
    if (action) filter.action = { $regex: action, $options: "i" };
    if (targetType) filter["target.type"] = { $regex: targetType, $options: "i" };
    if (targetId) filter["target.id"] = targetId;

    const sort: any = {};
    sort[sortBy] = sortOrder === "asc" ? 1 : -1;

    return await AuditLog.find(filter).populate("actor", "name email").sort(sort).limit(10000); // Limit for performance
  }

  async deleteOldAuditLogs(daysToKeep = 365): Promise<{ deletedCount: number }> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

    const result = await AuditLog.deleteMany({
      timestamp: { $lt: cutoffDate },
    });

    return { deletedCount: result.deletedCount || 0 };
  }

  async getAuditLogsByDateRange(startDate: Date, endDate: Date): Promise<IAuditLog[]> {
    return await AuditLog.find({
      timestamp: {
        $gte: startDate,
        $lte: endDate,
      },
    })
      .populate("actor", "name email")
      .sort({ timestamp: -1 });
  }

  async searchAuditLogs(searchTerm: string, limit = 50): Promise<IAuditLog[]> {
    return await AuditLog.find({
      $or: [
        { action: { $regex: searchTerm, $options: "i" } },
        { module: { $regex: searchTerm, $options: "i" } },
        { "target.type": { $regex: searchTerm, $options: "i" } },
        { "target.name": { $regex: searchTerm, $options: "i" } },
      ],
    })
      .populate("actor", "name email")
      .sort({ timestamp: -1 })
      .limit(limit);
  }
}

export const auditService = new AuditService();
