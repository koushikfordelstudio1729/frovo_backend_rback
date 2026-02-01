import { Request, Response } from "express";
import mongoose from "mongoose";
import { AreaService } from "../services/arearoute.service";
import {
  CreateAreaDto,
  UpdateAreaDto,
  AreaQueryParams,
  DashboardFilterParams,
  AuditLogParams,
} from "../services/arearoute.service";
import { ImageUploadService } from "../services/areaFileUpload.service";
import { IMachineImageData } from "../models/AreaRoute.model";

import { logger } from "../utils/logger.util";

export class AreaController {
  private static getAuditParams(req: Request): AuditLogParams {
    const user = (req as any).user || {};
    return {
      userId: user.id || user._id || "unknown",
      userEmail: user.email || "unknown@example.com",
      userName: user.name || user.username,
      ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    };
  }

  // AUDIT LOG METHODS
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid area ID",
        });
        return;
      }

      const result = await AreaService.getAuditLogs(id, page, limit);

      res.status(200).json({
        success: true,
        data: {
          logs: result.logs,
          pagination: result.pagination,
        },
      });
    } catch (error) {
      logger.error("Error fetching audit logs:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async getRecentActivities(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await AreaService.getRecentActivities(limit, {});

      res.status(200).json({
        success: true,
        data: activities,
      });
    } catch (error) {
      logger.error("Error fetching recent activities:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async exportAreaAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const format = (req.query.format as string) || "csv";

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid area ID",
        });
        return;
      }

      const area = await AreaService.getAreaById(id);
      if (!area) {
        res.status(404).json({
          success: false,
          message: "Area not found",
        });
        return;
      }

      const result = await AreaService.getAuditLogs(id, 1, 10000);
      const logs = result.logs;

      if (logs.length === 0) {
        res.status(404).json({
          success: false,
          message: "No audit logs found for this area",
        });
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const areaName = area.area_name.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `audit-logs-${areaName}-${timestamp}`;

      if (format === "csv") {
        const csv = AreaController.convertAuditLogsToCSV(logs, area);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
        res.status(200).send(csv);
      } else if (format === "json") {
        const exportData = {
          area: {
            id: area._id,
            name: area.area_name,
            state: area.state,
            district: area.district,
          },
          audit_logs: logs.map(log => (log.toObject ? log.toObject() : log)),
          export_date: new Date().toISOString(),
          total_logs: logs.length,
        };

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
        res.status(200).json({
          success: true,
          ...exportData,
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Unsupported format. Use "csv" or "json"',
        });
      }
    } catch (error) {
      logger.error("Error exporting area audit logs:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async exportRecentAuditActivities(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const format = (req.query.format as string) || "csv";
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const filter: any = {};
      if (startDate) {
        filter.timestamp = { $gte: new Date(startDate) };
      }
      if (endDate) {
        filter.timestamp = { ...filter.timestamp, $lte: new Date(endDate) };
      }

      const activities = await AreaService.getRecentActivities(limit, filter);

      if (activities.length === 0) {
        res.status(404).json({
          success: false,
          message: "No audit activities found for the specified criteria",
        });
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `audit-activities-${timestamp}`;

      if (format === "csv") {
        const csv = AreaController.convertActivitiesToCSV(activities);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
        res.status(200).send(csv);
      } else if (format === "json") {
        const exportData = {
          activities: activities,
          export_date: new Date().toISOString(),
          total_activities: activities.length,
          date_range: {
            start: startDate || "all",
            end: endDate || "all",
          },
        };

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
        res.status(200).json({
          success: true,
          ...exportData,
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Unsupported format. Use "csv" or "json"',
        });
      }
    } catch (error) {
      logger.error("Error exporting recent audit activities:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  private static convertAuditLogsToCSV(logs: any[], area: any): string {
    if (!logs || logs.length === 0) {
      return "No audit logs available for export";
    }

    try {
      const headers = [
        "Log ID",
        "Action",
        "Area ID",
        "Area Name",
        "Performed By",
        "User Email",
        "Timestamp",
        "IP Address",
        "Changes Summary",
        "Field Changes",
      ];

      let csv = "\ufeff";
      csv += headers.join(",") + "\n";

      logs.forEach(log => {
        const logDoc = log.toObject ? log.toObject() : log;

        let changesSummary = "";
        let fieldChanges = "";

        if (logDoc.changes) {
          const changedFields = Object.keys(logDoc.changes);
          changesSummary = `${changedFields.length} field(s) changed`;
          fieldChanges = changedFields
            .map(
              field => `${field}: "${logDoc.changes[field].old}" → "${logDoc.changes[field].new}"`
            )
            .join("; ");
        } else if (logDoc.action === "CREATE") {
          changesSummary = "New area created";
        } else if (logDoc.action === "DELETE") {
          changesSummary = "Area deleted";
        } else if (logDoc.action === "ADD_SUB_LOCATION") {
          changesSummary = "Sub-location added";
        }

        const row = [
          logDoc._id?.toString() || "",
          logDoc.action || "",
          area._id?.toString() || "",
          `"${area.area_name?.replace(/"/g, '""') || ""}"`,
          `"${logDoc.performed_by?.name?.replace(/"/g, '""') || logDoc.performed_by?.user_id || "Unknown"}"`,
          `"${logDoc.performed_by?.email?.replace(/"/g, '""') || "Unknown"}"`,
          logDoc.timestamp ? new Date(logDoc.timestamp).toISOString() : "",
          logDoc.ip_address || "Unknown",
          `"${changesSummary.replace(/"/g, '""')}"`,
          `"${fieldChanges.replace(/"/g, '""')}"`,
        ];

        csv += row.join(",") + "\n";
      });

      csv += "\n\n";
      csv += "Summary\n";
      csv += "Area Name," + `"${area.area_name}"` + "\n";
      csv += "State," + `"${area.state}"` + "\n";
      csv += "District," + `"${area.district}"` + "\n";
      csv += "Total Audit Logs," + logs.length + "\n";
      csv +=
        "First Log," +
        (logs[logs.length - 1]?.timestamp
          ? new Date(logs[logs.length - 1].timestamp).toISOString()
          : "") +
        "\n";
      csv +=
        "Last Log," + (logs[0]?.timestamp ? new Date(logs[0].timestamp).toISOString() : "") + "\n";
      csv += "Export Date," + new Date().toISOString() + "\n";

      return csv;
    } catch (error) {
      logger.error("Error converting audit logs to CSV:", error);
      return "Error generating audit log CSV";
    }
  }

  private static convertActivitiesToCSV(activities: any[]): string {
    if (!activities || activities.length === 0) {
      return "No audit activities available for export";
    }

    try {
      const headers = [
        "Activity ID",
        "Action",
        "Area ID",
        "Area Name",
        "State",
        "District",
        "Performed By",
        "User Email",
        "Timestamp",
        "IP Address",
        "Changes Summary",
      ];

      let csv = "\ufeff";
      csv += headers.join(",") + "\n";

      activities.forEach(activity => {
        const activityDoc = activity.toObject ? activity.toObject() : activity;

        let changesSummary = "";

        if (activityDoc.changes) {
          const changedFields = Object.keys(activityDoc.changes);
          changesSummary = `${changedFields.length} field(s) changed`;
          if (activityDoc.changes.status) {
            changesSummary = `Status changed: ${activityDoc.changes.status.old} → ${activityDoc.changes.status.new}`;
          }
        } else if (activityDoc.action === "CREATE") {
          changesSummary = "New area created";
        } else if (activityDoc.action === "DELETE") {
          changesSummary = "Area deleted";
        } else if (activityDoc.action === "ADD_SUB_LOCATION") {
          changesSummary = "Sub-location added";
        }

        const row = [
          activityDoc._id?.toString() || "",
          activityDoc.action || "",
          activityDoc.area_id?._id?.toString() || activityDoc.area_id || "",
          `"${activityDoc.area_name?.replace(/"/g, '""') || "Deleted Area"}"`,
          `"${activityDoc.area_id?.state?.replace(/"/g, '""') || ""}"`,
          `"${activityDoc.area_id?.district?.replace(/"/g, '""') || ""}"`,
          `"${activityDoc.performed_by?.name?.replace(/"/g, '""') || activityDoc.performed_by?.user_id || "Unknown"}"`,
          `"${activityDoc.performed_by?.email?.replace(/"/g, '""') || "Unknown"}"`,
          activityDoc.timestamp ? new Date(activityDoc.timestamp).toISOString() : "",
          activityDoc.ip_address || "Unknown",
          `"${changesSummary.replace(/"/g, '""')}"`,
        ];

        csv += row.join(",") + "\n";
      });

      csv += "\n\n";
      csv += "Summary\n";
      csv += "Total Activities," + activities.length + "\n";
      csv +=
        "Date Range," +
        new Date(activities[activities.length - 1]?.timestamp).toISOString() +
        " to " +
        new Date(activities[0]?.timestamp).toISOString() +
        "\n";
      csv += "Export Date," + new Date().toISOString() + "\n";
      csv += "Actions Breakdown\n";

      const actionCounts: Record<string, number> = {};
      activities.forEach(activity => {
        const action = activity.action || "UNKNOWN";
        actionCounts[action] = (actionCounts[action] || 0) + 1;
      });

      Object.entries(actionCounts).forEach(([action, count]) => {
        csv += `${action},${count}\n`;
      });

      return csv;
    } catch (error) {
      logger.error("Error converting activities to CSV:", error);
      return "Error generating activities CSV";
    }
  }

static async createAreaRoute(req: Request, res: Response): Promise<void> {
  try {
    let areaData: CreateAreaDto;
    const files = req.files as Express.Multer.File[] | undefined;

    // Log raw body for debugging
    logger.info("Raw request body:", JSON.stringify(req.body, null, 2));

    // Parse request data
    try {
      // OPTION 1: Form-data with JSON in 'data' field
      if (req.body.data) {
        areaData = JSON.parse(req.body.data);
      }
      // OPTION 2: sub_locations as JSON string
      else if (req.body.sub_locations && typeof req.body.sub_locations === 'string') {
        // Try to parse sub_locations
        let parsedSubLocations;
        try {
          parsedSubLocations = JSON.parse(req.body.sub_locations);
        } catch (parseError) {
          logger.error("Failed to parse sub_locations JSON:", parseError);
          res.status(400).json({
            success: false,
            message: "Invalid JSON format for sub_locations",
            details: parseError.message,
            received: req.body.sub_locations
          });
          return;
        }

        areaData = {
          area_name: req.body.area_name,
          state: req.body.state,
          district: req.body.district,
          pincode: req.body.pincode,
          area_description: req.body.area_description,
          status: req.body.status || 'active',
          sub_locations: parsedSubLocations,
          latitude: req.body.latitude ? parseFloat(req.body.latitude) : undefined,
          longitude: req.body.longitude ? parseFloat(req.body.longitude) : undefined,
          address: req.body.address,
        };
      }
      // OPTION 3: Flat form-data keys
      else if (req.body.area_name) {
        areaData = AreaController.parseFlatFormData(req.body);
      }
      // OPTION 4: JSON request body
      else {
        areaData = req.body;
      }
    } catch (parseError) {
      logger.error("Error parsing request data:", parseError);
      res.status(400).json({
        success: false,
        message: "Failed to parse request data",
        details: parseError.message,
      });
      return;
    }

    // Log parsed data
    logger.info("Parsed area data:", JSON.stringify(areaData, null, 2));

    // Validate required fields
    const requiredFields = [
      "area_name",
      "state",
      "district",
      "pincode",
      "area_description",
      "status",
      "sub_locations",
    ];

    const missingFields = requiredFields.filter(field => {
      const value = areaData[field as keyof CreateAreaDto];
      if (field === 'sub_locations') {
        return !value || !Array.isArray(value) || value.length === 0;
      }
      return !value;
    });

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
        details: {
          received: Object.keys(areaData),
          missing: missingFields,
        },
      });
      return;
    }

    // Validate sub_locations structure
    if (!Array.isArray(areaData.sub_locations) || areaData.sub_locations.length === 0) {
      res.status(400).json({
        success: false,
        message: "sub_locations must be a non-empty array",
        received: areaData.sub_locations,
      });
      return;
    }

    // Process file uploads if any
    if (files && files.length > 0) {
      const uploadService = new ImageUploadService();
      const processedFiles = await uploadService.uploadMultipleFiles(
        files,
        "areaMachine_images",
        "areaMachine"
      );

      // Attach files to the first sub-location's machine
      if (areaData.sub_locations[0]) {
        if (!areaData.sub_locations[0].select_machine) {
          areaData.sub_locations[0].select_machine = {
            machine_id: '',
            status: 'not_installed',
            machine_image: []
          };
        }

        if (!areaData.sub_locations[0].select_machine.machine_image) {
          areaData.sub_locations[0].select_machine.machine_image = [];
        }

        areaData.sub_locations[0].select_machine.machine_image.push(...processedFiles);
      }
    }

    const auditParams = AreaController.getAuditParams(req);
    const newArea = await AreaService.createArea(areaData, auditParams);

    res.status(201).json({
      success: true,
      message: "Area route created successfully",
      data: newArea,
    });
  } catch (error) {
    logger.error("Error creating area route:", error);

    const statusCode = error.message.includes("already exists")
      ? 409
      : error.message.includes("Validation")
        ? 400
        : 500;

    res.status(statusCode).json({
      success: false,
      message: error.message || "Internal server error",
      error: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    });
  }
}
private static parseFlatFormData(body: any): CreateAreaDto {
  try {
    // Check if sub_locations is already provided as JSON string
    let sub_locations = [];
    
    if (body.sub_locations) {
      // Case 1: sub_locations provided as JSON string or array
      if (typeof body.sub_locations === 'string') {
        sub_locations = JSON.parse(body.sub_locations);
      } else if (Array.isArray(body.sub_locations)) {
        sub_locations = body.sub_locations;
      }
    } else if (body['sub_locations.campus']) {
      // Case 2: Flat form-data keys (build from individual fields)
      const subLocation: any = {
        campus: body['sub_locations.campus'],
        tower: body['sub_locations.tower'],
        floor: body['sub_locations.floor'],
        select_machine: {
          machine_id: body['sub_locations.select_machines.machine_id'],
          status: body['sub_locations.select_machines.status'] || 'not_installed',
        }
      };

      // Only add if all required fields are present
      if (subLocation.campus && subLocation.tower && subLocation.floor && subLocation.select_machine.machine_id) {
        sub_locations = [subLocation];
      }
    }

    // Build the CreateAreaDto object
    const areaData: CreateAreaDto = {
      area_name: body.area_name,
      state: body.state,
      district: body.district,
      pincode: body.pincode,
      area_description: body.area_description,
      status: body.status || 'active',
      sub_locations: sub_locations,
    };

    // Add optional fields if they exist
    if (body.latitude) {
      areaData.latitude = parseFloat(body.latitude);
    }
    if (body.longitude) {
      areaData.longitude = parseFloat(body.longitude);
    }
    if (body.address) {
      areaData.address = body.address;
    }

    return areaData;
  } catch (error) {
    logger.error("Error parsing flat form data:", error);
    throw new Error("Failed to parse form data. Ensure sub_locations is valid JSON or individual fields are correctly named.");
  }
}
  static async getAllAreaRoutes(req: Request, res: Response): Promise<void> {
    try {
      const queryParams: AreaQueryParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        status: req.query.status as "active" | "inactive",
        state: req.query.state as string,
        district: req.query.district as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as "asc" | "desc",
      };

      const result = await AreaService.getAllAreas(queryParams);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination,
      });
    } catch (error) {
      logger.error("Error fetching area routes:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async getAreaRouteById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const areaRoute = await AreaService.getAreaById(id);

      if (!areaRoute) {
        res.status(404).json({
          success: false,
          message: "Area route not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: areaRoute,
      });
    } catch (error) {
      logger.error("Error fetching area route:", error);

      const statusCode = error.message.includes("Invalid MongoDB ObjectId") ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // UPDATE AREA WITH FILE UPLOAD SUPPORT
  static async updateAreaRoute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      let updateData: UpdateAreaDto;
      const files = req.files as Express.Multer.File[] | undefined;

      if (req.body.data) {
        // Form-data with files
        updateData = JSON.parse(req.body.data);
      } else {
        // JSON request without files
        updateData = req.body;
      }

      // Process file uploads if any
      if (files && files.length > 0) {
        const uploadService = new ImageUploadService();
        const processedFiles = await uploadService.uploadMultipleFiles(
          files,
          "areaMachine_images",
          "areaMachine"
        );

        // Attach file data to appropriate sub-locations
        await AreaController.attachFilesToSubLocations(
          updateData,
          processedFiles,
          req.body.fileMap
        );
      }

      // Handle image deletions
      if (req.body.deletedImages) {
        const deletedImages = JSON.parse(req.body.deletedImages);
        if (Array.isArray(deletedImages) && deletedImages.length > 0) {
          await AreaController.deleteMachineImages(deletedImages);
        }
      }

      const auditParams = AreaController.getAuditParams(req);
      const updatedAreaRoute = await AreaService.updateArea(id, updateData, auditParams);

      if (!updatedAreaRoute) {
        res.status(404).json({
          success: false,
          message: "Area route not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Area route updated successfully",
        data: updatedAreaRoute,
      });
    } catch (error) {
      logger.error("Error updating area route:", error);

      const statusCode = error.message.includes("already exists")
        ? 409
        : error.message.includes("Invalid")
          ? 400
          : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // ADD SUB-LOCATION WITH FILE UPLOAD SUPPORT
  static async addSubLocation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      let sub_location: any;
      const files = req.files as Express.Multer.File[] | undefined;

      if (req.body.sub_location) {
        if (typeof req.body.sub_location === 'string') {
          sub_location = JSON.parse(req.body.sub_location);
        } else {
          sub_location = req.body.sub_location;
        }
      }

      if (!sub_location || !sub_location.campus || !sub_location.tower || !sub_location.floor) {
        res.status(400).json({
          success: false,
          message: "Sub-location with campus, tower, and floor is required",
        });
        return;
      }

      if (!sub_location.select_machine || !sub_location.select_machine.machine_id) {
        res.status(400).json({
          success: false,
          message: "Machine details are required",
        });
        return;
      }

      // Process file uploads if any
      if (files && files.length > 0) {
        const uploadService = new ImageUploadService();
        const processedFiles = await uploadService.uploadMultipleFiles(
          files,
          "areaMachine_images",
          "areaMachine"
        );

        // Initialize machine_image array if not exists
        if (!sub_location.select_machine.machine_image) {
          sub_location.select_machine.machine_image = [];
        }

        // Add uploaded files to machine images
        sub_location.select_machine.machine_image.push(...processedFiles);
      }

      const auditParams = AreaController.getAuditParams(req);
      const updatedArea = await AreaService.addSubLocation(id, sub_location, auditParams);

      if (!updatedArea) {
        res.status(404).json({
          success: false,
          message: "Area not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Sub-location added successfully",
        data: updatedArea,
      });
    } catch (error) {
      logger.error("Error adding sub-location:", error);

      const statusCode = error.message.includes("already exists")
        ? 409
        : error.message.includes("Invalid MongoDB ObjectId")
          ? 400
          : error.message.includes("Validation")
            ? 400
            : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // UPLOAD MACHINE IMAGES TO EXISTING SUB-LOCATION
  static async uploadMachineImages(req: Request, res: Response): Promise<void> {
    try {
      const { areaId, subLocationIndex, machineIndex } = req.params;
      const files = req.files as Express.Multer.File[];

      if (!files || files.length === 0) {
        res.status(400).json({
          success: false,
          message: "No files uploaded",
        });
        return;
      }

      const uploadService = new ImageUploadService();
      const processedFiles = await uploadService.uploadMultipleFiles(
        files,
        "areaMachine_images",
        "areaMachine"
      );

      const auditParams = AreaController.getAuditParams(req);
      const updatedArea = await AreaService.addMachineImages(
        areaId,
        parseInt(subLocationIndex),
        parseInt(machineIndex),
        processedFiles,
        auditParams
      );

      if (!updatedArea) {
        res.status(404).json({
          success: false,
          message: "Area or sub-location not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Machine images uploaded successfully",
        data: {
          images: processedFiles,
          updatedArea,
        },
      });
    } catch (error) {
      logger.error("Error uploading machine images:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // REMOVE MACHINE IMAGE
  static async removeMachineImage(req: Request, res: Response): Promise<void> {
    try {
      const { areaId, subLocationIndex, machineIndex, imageIndex } = req.params;

      if (!mongoose.Types.ObjectId.isValid(areaId)) {
        res.status(400).json({
          success: false,
          message: "Invalid area ID",
        });
        return;
      }

      const auditParams = AreaController.getAuditParams(req);
      const updatedArea = await AreaService.removeMachineImage(
        areaId,
        parseInt(subLocationIndex),
        parseInt(machineIndex),
        parseInt(imageIndex),
        auditParams
      );

      if (!updatedArea) {
        res.status(404).json({
          success: false,
          message: "Area, machine, or image not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Machine image removed successfully",
        data: updatedArea,
      });
    } catch (error) {
      logger.error("Error removing machine image:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async deleteAreaRoute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const auditParams = AreaController.getAuditParams(req);
      const deletedAreaRoute = await AreaService.deleteArea(id, auditParams);

      if (!deletedAreaRoute) {
        res.status(404).json({
          success: false,
          message: "Area route not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Area route deleted successfully",
        data: deletedAreaRoute,
      });
    } catch (error) {
      logger.error("Error deleting area route:", error);

      const statusCode = error.message.includes("Invalid MongoDB ObjectId") ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async toggleAreaStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const auditParams = AreaController.getAuditParams(req);
      const updatedAreaRoute = await AreaService.toggleAreaStatus(id, auditParams);

      if (!updatedAreaRoute) {
        res.status(404).json({
          success: false,
          message: "Area route not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Area route status toggled to ${updatedAreaRoute.status}`,
        data: updatedAreaRoute,
      });
    } catch (error) {
      logger.error("Error toggling area status:", error);
      res.status(400).json({
        success: false,
        message: error.message || "Invalid area ID",
      });
    }
  }

  static async getFilterOptions(req: Request, res: Response): Promise<void> {
    try {
      const filterOptions = await AreaService.getFilterOptions();

      res.status(200).json({
        success: true,
        data: filterOptions,
      });
    } catch (error) {
      logger.error("Error fetching filter options:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async checkAreaExists(req: Request, res: Response): Promise<void> {
    try {
      const { areaName, excludeId } = req.query;

      if (!areaName) {
        res.status(400).json({
          success: false,
          message: "Area name is required",
        });
        return;
      }

      const exists = await AreaService.checkAreaExists(areaName as string, excludeId as string);

      res.status(200).json({
        success: true,
        data: { exists },
      });
    } catch (error) {
      logger.error("Error checking area existence:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async exportAreas(req: Request, res: Response): Promise<void> {
    try {
      const queryParams: AreaQueryParams = {
        page: 1,
        limit: 10000,
        status: req.query.status as "active" | "inactive",
        state: req.query.state as string,
        district: req.query.district as string,
        search: req.query.search as string,
      };

      const result = await AreaService.getAllAreas(queryParams);
      const format = req.query.format || "json";

      if (format === "csv") {
        const csv = AreaController.convertToCSV(result.data);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=areas.csv");
        res.status(200).send(csv);
      } else {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", "attachment; filename=areas.json");
        res.status(200).json({
          success: true,
          data: result.data,
        });
      }
    } catch (error) {
      logger.error("Error exporting areas:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const params: DashboardFilterParams = {
        status: (req.query.status as "active" | "inactive" | "all") || "all",
        state: req.query.state as string,
        district: req.query.district as string,
        campus: req.query.campus as string,
        tower: req.query.tower as string,
        floor: req.query.floor as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: (req.query.sortBy as string) || "area_name",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "asc",
      };

      const dashboardData = await AreaService.getDashboardData(params);

      res.status(200).json({
        success: true,
        data: dashboardData,
      });
    } catch (error) {
      logger.error("Error fetching dashboard data:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async getDashboardTable(req: Request, res: Response): Promise<void> {
    try {
      const params: DashboardFilterParams = {
        status: (req.query.status as "active" | "inactive" | "all") || "all",
        state: req.query.state as string,
        district: req.query.district as string,
        campus: req.query.campus as string,
        tower: req.query.tower as string,
        floor: req.query.floor as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: (req.query.sortBy as string) || "area_name",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "asc",
      };

      const tableData = await AreaService.getDashboardTableData(params);

      res.status(200).json({
        success: true,
        data: tableData.data,
        pagination: {
          currentPage: params.page || 1,
          totalItems: tableData.total,
          totalPages: Math.ceil(tableData.total / (params.limit || 10)),
          itemsPerPage: params.limit || 10,
        },
      });
    } catch (error) {
      logger.error("Error fetching dashboard table:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async exportDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const params: DashboardFilterParams = {
        status: (req.query.status as "active" | "inactive" | "all") || "all",
        state: req.query.state as string,
        district: req.query.district as string,
        campus: req.query.campus as string,
        tower: req.query.tower as string,
        floor: req.query.floor as string,
        search: req.query.search as string,
        limit: 10000,
      };

      const tableData = await AreaService.getDashboardTableData(params);
      const format = req.query.format || "csv";

      if (format === "csv") {
        const csv = AreaController.convertTableToCSV(tableData.data);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=dashboard-export.csv");
        res.status(200).send(csv);
      } else if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", "attachment; filename=dashboard-export.json");
        res.status(200).json({
          success: true,
          data: tableData.data,
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Unsupported format. Use "csv" or "json"',
        });
      }
    } catch (error) {
      logger.error("Error exporting dashboard data:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async exportAreasByIds(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const format = (req.query.format as string) || "csv";

      const areaIds = id
        .split(",")
        .map(id => id.trim())
        .filter(id => id);

      if (!areaIds || areaIds.length === 0) {
        res.status(400).json({
          success: false,
          message: "Please provide area IDs in the URL parameter",
        });
        return;
      }

      const invalidIds = areaIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        res.status(400).json({
          success: false,
          message: `Invalid area IDs: ${invalidIds.join(", ")}`,
          invalidIds,
        });
        return;
      }

      const areas = await AreaService.getAreasByIds(areaIds);

      if (areas.length === 0) {
        res.status(404).json({
          success: false,
          message: "No areas found with the provided IDs",
        });
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const filename = `areas-export-${timestamp}.csv`;

      const csv = AreaController.generateCSV(areas);

      res.setHeader("Content-Type", "text/csv");
      res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
      res.status(200).send(csv);
    } catch (error) {
      logger.error("Error exporting areas by IDs:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  static async removeMachineFromArea(req: Request, res: Response): Promise<void> {
    try {
      const { id, machineId } = req.params;

      if (!machineId || machineId.trim() === "") {
        res.status(400).json({
          success: false,
          message: "Machine ID is required in route parameter",
        });
        return;
      }

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: "Invalid area ID",
        });
        return;
      }

      const auditParams = AreaController.getAuditParams(req);
      const updatedArea = await AreaService.removeMachineFromArea(id, machineId, auditParams);

      if (!updatedArea) {
        res.status(404).json({
          success: false,
          message: "Area not found",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Machine "${machineId}" removed successfully from area`,
        data: updatedArea,
      });
    } catch (error) {
      logger.error("Error removing machine from area:", error);

      const statusCode = error.message.includes("not found")
        ? 404
        : error.message.includes("Cannot remove all machines")
          ? 400
          : error.message.includes("Invalid MongoDB ObjectId")
            ? 400
            : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // HELPER METHODS
  private static async attachFilesToSubLocations(
    areaData: any,
    processedFiles: IMachineImageData[],
    fileMap?: string
  ): Promise<void> {
    if (!processedFiles.length || !fileMap) return;

    try {
      const fileMapping = JSON.parse(fileMap);

      processedFiles.forEach((file, index) => {
        const mapping = fileMapping[index];
        if (mapping && areaData.sub_locations && areaData.sub_locations[mapping.subLocationIndex]) {
          const subLocation = areaData.sub_locations[mapping.subLocationIndex];

          // Ensure select_machine exists
          if (!subLocation.select_machine) {
            subLocation.select_machine = {};
          }

          // Ensure machine_image array exists
          if (!subLocation.select_machine.machine_image) {
            subLocation.select_machine.machine_image = [];
          }

          // Add the file to machine images
          subLocation.select_machine.machine_image.push(file);
        }
      });
    } catch (error) {
      logger.error("Error attaching files to sub-locations:", error);
      throw new Error("Failed to process file attachments");
    }
  }

  private static async deleteMachineImages(publicIds: string[]): Promise<void> {
    try {
      const uploadService = new ImageUploadService();
      await uploadService.deleteMultipleFiles(publicIds);
    } catch (error) {
      logger.error("Error deleting machine images:", error);
      throw new Error("Failed to delete machine images");
    }
  }

  
  private static convertToCSV(data: any[]): string {
    if (data.length === 0) return "";

    const headers = Object.keys(data[0].toObject ? data[0].toObject() : data[0]);
    const csvRows = [];

    csvRows.push(headers.join(","));

    for (const item of data) {
      const row = headers.map(header => {
        const value = item[header];
        if (typeof value === "object") {
          return JSON.stringify(value).replace(/"/g, '""');
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(","));
    }

    return csvRows.join("\n");
  }

  private static convertTableToCSV(data: any[]): string {
    if (data.length === 0) return "";

    const headers = [
      "ID",
      "Area Name",
      "State",
      "District",
      "Pincode",
      "Status",
      "Sub-locations Count",
      "Total Machines",
      "Campuses",
      "Last Updated",
      "Created At",
    ];

    const csvRows = [];

    csvRows.push(headers.join(","));

    for (const item of data) {
      const row = [
        item.id,
        `"${item.area_name?.replace(/"/g, '""') || ""}"`,
        `"${item.state?.replace(/"/g, '""') || ""}"`,
        `"${item.district?.replace(/"/g, '""') || ""}"`,
        item.pincode || "",
        item.status || "",
        item.sub_locations_count || 0,
        item.total_machines || 0,
        `"${item.campuses?.replace(/"/g, '""') || ""}"`,
        item.last_updated ? new Date(item.last_updated).toISOString() : "",
        item.created_at ? new Date(item.created_at).toISOString() : "",
      ];
      csvRows.push(row.join(","));
    }

    return csvRows.join("\n");
  }

  private static generateCSV(areas: any[]): string {
    if (!areas || areas.length === 0) {
      return "No data available for export";
    }

    try {
      const headers = [
        "ID",
        "Area Name",
        "State",
        "District",
        "Pincode",
        "Status",
        "Sub-locations Count",
        "Total Machines",
        "Campuses",
        "Last Updated",
        "Created At",
      ];

      let csv = "\ufeff";
      csv += headers.join(",") + "\n";

      areas.forEach(area => {
        const areaDoc = area.toObject ? area.toObject() : area;

        const subLocationsCount = areaDoc.sub_locations?.length || 0;

        // Calculate total machines based on new structure
        const totalMachines = areaDoc.sub_locations?.filter(
          (subLoc: any) => subLoc.select_machine && subLoc.select_machine.machine_id
        ).length || 0;

        const uniqueCampuses = [
          ...new Set(areaDoc.sub_locations?.map((sl: any) => sl.campus).filter(Boolean) || []),
        ];
        const campuses = uniqueCampuses.join(", ");

        const lastUpdated = areaDoc.updatedAt ? new Date(areaDoc.updatedAt).toISOString() : "";
        const createdAt = areaDoc.createdAt ? new Date(areaDoc.createdAt).toISOString() : "";

        const row = [
          areaDoc._id?.toString() || "",
          `"${(areaDoc.area_name || "").replace(/"/g, '""')}"`,
          `"${(areaDoc.state || "").replace(/"/g, '""')}"`,
          `"${(areaDoc.district || "").replace(/"/g, '""')}"`,
          areaDoc.pincode || "",
          areaDoc.status || "",
          subLocationsCount,
          totalMachines,
          `"${campuses.replace(/"/g, '""')}"`,
          lastUpdated,
          createdAt,
        ];

        csv += row.join(",") + "\n";
      });

      return csv;
    } catch (error) {
      logger.error("Error generating CSV:", error);
      return "Error generating CSV data";
    }
  }
}