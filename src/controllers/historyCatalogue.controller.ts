import { Request, Response } from "express";
import { historyCatalogueService } from "../services/historyCatalogue.service";
import { Types } from "mongoose";

export class HistoryController {
  public static getLoggedInUser(req: Request): {
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
  /**
   * Get audit logs for a specific entity (category or catalogue)
   */
  async getEntityAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, entityId } = req.params;
      const { operation, limit, skip } = req.query;

      console.log(`Fetching audit logs for ${entityType}/${entityId}`);

      // Validate entity type
      if (entityType !== "category" && entityType !== "catalogue") {
        res.status(400).json({
          success: false,
          message: 'Invalid entity type. Must be "category" or "catalogue"',
        });
        return;
      }

      const logs = await historyCatalogueService.getEntityHistoryLogs(
        entityType as "category" | "catalogue",
        entityId,
        {
          operation: operation as any,
          limit: limit ? parseInt(limit as string) : 50,
          skip: skip ? parseInt(skip as string) : 0,
        }
      );

      res.status(200).json({
        success: true,
        message: "Audit logs retrieved successfully",
        data: {
          entity_type: entityType,
          entity_id: entityId,
          logs,
          total: logs.length,
        },
      });
    } catch (error: any) {
      console.error("Error fetching entity audit logs:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch audit logs",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get audit logs by user
   */
  async getUserAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { userId } = req.params;
      const { entityType, operation, limit, skip, startDate, endDate } = req.query;

      console.log(`Fetching audit logs for user ${userId}`);

      const logs = await historyCatalogueService.getUserHistoryLogs(userId, {
        entityType: entityType as "category" | "catalogue",
        operation: operation as any,
        limit: limit ? parseInt(limit as string) : 50,
        skip: skip ? parseInt(skip as string) : 0,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.status(200).json({
        success: true,
        message: "User audit logs retrieved successfully",
        data: {
          user_id: userId,
          logs,
          total: logs.length,
          filters: { entityType, operation, startDate, endDate },
        },
      });
    } catch (error: any) {
      console.error("Error fetching user audit logs:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch user audit logs",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get current user's audit logs
   */
  async getMyAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      // Extract logged in user
      const { _id: userId } = HistoryController.getLoggedInUser(req);

      const { entityType, operation, limit, skip, startDate, endDate } = req.query;

      console.log(`Fetching audit logs for current user ${userId}`);

      const logs = await historyCatalogueService.getUserHistoryLogs(userId.toString(), {
        entityType: entityType as "category" | "catalogue",
        operation: operation as any,
        limit: limit ? parseInt(limit as string) : 50,
        skip: skip ? parseInt(skip as string) : 0,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.status(200).json({
        success: true,
        message: "Your audit logs retrieved successfully",
        data: {
          logs,
          total: logs.length,
          filters: { entityType, operation, startDate, endDate },
        },
      });
    } catch (error: any) {
      console.error("Error fetching current user audit logs:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch your audit logs",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Search audit logs with advanced filters
   */
  async searchAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, operation, userId, userEmail, status, startDate, endDate, limit, skip } =
        req.query;

      console.log("Searching audit logs with filters:", req.query);

      const { logs, total } = await historyCatalogueService.getAuditLogs({
        entityType: entityType as "category" | "catalogue",
        operation: operation as any,
        userId: userId as string,
        userEmail: userEmail as string,
        status: status as "success" | "failed",
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: limit ? parseInt(limit as string) : 50,
        skip: skip ? parseInt(skip as string) : 0,
      });

      res.status(200).json({
        success: true,
        message: "Audit logs retrieved successfully",
        data: {
          logs,
          total,
          page:
            Math.floor(
              (skip ? parseInt(skip as string) : 0) / (limit ? parseInt(limit as string) : 50)
            ) + 1,
          limit: limit ? parseInt(limit as string) : 50,
          totalPages: Math.ceil(total / (limit ? parseInt(limit as string) : 50)),
          filters: {
            entityType,
            operation,
            userId,
            userEmail,
            status,
            startDate,
            endDate,
          },
        },
      });
    } catch (error: any) {
      console.error("Error searching audit logs:", error);

      res.status(500).json({
        success: false,
        message: "Failed to search audit logs",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get audit statistics
   */
  async getAuditStatistics(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, startDate, endDate } = req.query;

      console.log("Fetching audit statistics with filters:", req.query);

      const statistics = await historyCatalogueService.getAuditStatistics({
        entityType: entityType as "category" | "catalogue",
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
      });

      res.status(200).json({
        success: true,
        message: "Audit statistics retrieved successfully",
        data: {
          ...statistics,
          filters: { entityType, startDate, endDate },
        },
      });
    } catch (error: any) {
      console.error("Error fetching audit statistics:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch audit statistics",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Get recent audit activity (last 24 hours)
   */
  async getRecentActivity(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, operation, limit } = req.query;

      console.log("Fetching recent audit activity");

      // Get logs from last 24 hours
      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const { logs, total } = await historyCatalogueService.getAuditLogs({
        entityType: entityType as "category" | "catalogue",
        operation: operation as any,
        startDate: twentyFourHoursAgo,
        limit: limit ? parseInt(limit as string) : 20,
      });

      res.status(200).json({
        success: true,
        message: "Recent audit activity retrieved successfully",
        data: {
          logs,
          total,
          timeframe: "24 hours",
          filters: { entityType, operation },
        },
      });
    } catch (error: any) {
      console.error("Error fetching recent activity:", error);

      res.status(500).json({
        success: false,
        message: "Failed to fetch recent activity",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Export audit logs to CSV
   */
  async exportAuditLogsCSV(req: Request, res: Response): Promise<void> {
    try {
      const { entityType, operation, userId, userEmail, startDate, endDate } = req.query;

      console.log("Exporting audit logs to CSV with filters:", req.query);

      const { logs } = await historyCatalogueService.getAuditLogs({
        entityType: entityType as "category" | "catalogue",
        operation: operation as any,
        userId: userId as string,
        userEmail: userEmail as string,
        startDate: startDate ? new Date(startDate as string) : undefined,
        endDate: endDate ? new Date(endDate as string) : undefined,
        limit: 10000, // Large limit for export
      });

      // Convert to CSV
      const csvData = this.convertAuditLogsToCSV(logs);

      // Set headers for CSV download
      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=audit-logs.csv");
      res.status(200).send(csvData);
    } catch (error: any) {
      console.error("Error exporting audit logs:", error);

      res.status(500).json({
        success: false,
        message: "Failed to export audit logs",
        error: process.env.NODE_ENV === "development" ? error.message : undefined,
      });
    }
  }

  /**
   * Convert audit logs to CSV format
   */
  private convertAuditLogsToCSV(logs: any[]): string {
    const headers = [
      "Timestamp",
      "Operation",
      "Entity Type",
      "Entity ID",
      "Entity Name",
      "User Email",
      "User Role",
      "IP Address",
      "Status",
      "Description",
      "Changes Count",
      "Error Message",
    ];

    const rows = logs.map(log => [
      new Date(log.timestamp).toISOString(),
      log.operation,
      log.entity_type,
      log.entity_id,
      `"${(log.entity_name || "").replace(/"/g, '""')}"`,
      log.user_email,
      log.user_role,
      log.ip_address,
      log.status,
      `"${(log.description || "").replace(/"/g, '""')}"`,
      log.changes?.length || 0,
      log.error_message ? `"${log.error_message.replace(/"/g, '""')}"` : "",
    ]);

    const csvContent = [headers.join(","), ...rows.map(row => row.join(","))].join("\n");

    return csvContent;
  }
}

// Export instance
export const historyController = new HistoryController();
