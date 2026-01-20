"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuditStats = exports.exportAuditLogs = exports.getAuditLogs = void 0;
const audit_service_1 = require("../services/audit.service");
const asyncHandler_util_1 = require("../utils/asyncHandler.util");
const response_util_1 = require("../utils/response.util");
exports.getAuditLogs = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    try {
        const result = await audit_service_1.auditService.getAuditLogs(req.query);
        (0, response_util_1.sendPaginatedResponse)(res, result.logs, result.page, result.limit, result.total, "Audit logs retrieved successfully");
    }
    catch (error) {
        (0, response_util_1.sendError)(res, "Failed to get audit logs", 500);
    }
});
exports.exportAuditLogs = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { format = "csv", ...filters } = req.query;
    try {
        const logs = await audit_service_1.auditService.exportAuditLogs(filters);
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
                log.actor?.email || log.actor.toString(),
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
        }
        else {
            res.setHeader("Content-Type", "application/json");
            res.setHeader("Content-Disposition", "attachment; filename=audit-logs.json");
            res.json(logs);
        }
    }
    catch (error) {
        (0, response_util_1.sendError)(res, "Failed to export audit logs", 500);
    }
});
exports.getAuditStats = (0, asyncHandler_util_1.asyncHandler)(async (req, res) => {
    const { startDate, endDate } = req.query;
    try {
        const stats = await audit_service_1.auditService.getAuditStats(startDate, endDate);
        (0, response_util_1.sendSuccess)(res, stats);
    }
    catch (error) {
        (0, response_util_1.sendError)(res, "Failed to get audit stats", 500);
    }
});
