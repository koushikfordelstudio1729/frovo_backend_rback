import { Request, Response } from "express";
import { auditService } from "../services/audit.service";
import { asyncHandler } from "../utils/asyncHandler.util";
import { sendSuccess, sendError, sendPaginatedResponse } from "../utils/response.util";

export const getAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  try {
    const result = await auditService.getAuditLogs(req.query as any);

    sendPaginatedResponse(
      res,
      result.logs,
      result.page,
      result.limit,
      result.total,
      "Audit logs retrieved successfully"
    );
  } catch (error) {
    sendError(res, "Failed to get audit logs", 500);
  }
});

export const exportAuditLogs = asyncHandler(async (req: Request, res: Response) => {
  const { format = "csv", ...filters } = req.query;

  try {
    const logs = await auditService.exportAuditLogs(filters as any);

    if (format === "csv") {
      const csvHeaders = [
        "Timestamp",
        "Actor",
        "Action",
        "Module",
        "Target Type",
        "Target ID",
        "IP Address",
      ];
      const csvRows = logs.map(log => [
        log.timestamp.toISOString(),
        (log.actor as any)?.email || log.actor.toString(),
        log.action,
        log.module,
        log.target.type,
        log.target.id,
        log.ipAddress || "",
      ]);

      const csvContent = [csvHeaders, ...csvRows].map(row => row.join(",")).join("\n");

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", "attachment; filename=audit-logs.csv");
      res.send(csvContent);
    } else {
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Content-Disposition", "attachment; filename=audit-logs.json");
      res.json(logs);
    }
  } catch (error) {
    sendError(res, "Failed to export audit logs", 500);
  }
});

export const getAuditStats = asyncHandler(async (req: Request, res: Response) => {
  const { startDate, endDate } = req.query;

  try {
    const stats = await auditService.getAuditStats(startDate as string, endDate as string);

    sendSuccess(res, stats);
  } catch (error) {
    sendError(res, "Failed to get audit stats", 500);
  }
});
