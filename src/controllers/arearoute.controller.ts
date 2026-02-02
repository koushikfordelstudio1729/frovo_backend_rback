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

      // Enrich logs with image information
      const enrichedLogs = result.logs.map(log => {
        const logObj = log.toObject ? log.toObject() : log;

        // Extract image information from changes
        let imageChanges = [];
        if (logObj.changes) {
          Object.keys(logObj.changes).forEach(key => {
            if (key.includes('machine_image') || key.includes('image')) {
              const change = logObj.changes[key];
              if (change.old && Array.isArray(change.old)) {
                change.old.forEach((img: any) => {
                  if (img && img.file_url) {
                    imageChanges.push({
                      type: 'removed',
                      image_name: img.image_name,
                      file_url: img.file_url,
                      cloudinary_public_id: img.cloudinary_public_id,
                      action: logObj.action
                    });
                  }
                });
              }
              if (change.new && Array.isArray(change.new)) {
                change.new.forEach((img: any) => {
                  if (img && img.file_url) {
                    imageChanges.push({
                      type: 'added',
                      image_name: img.image_name,
                      file_url: img.file_url,
                      cloudinary_public_id: img.cloudinary_public_id,
                      action: logObj.action
                    });
                  }
                });
              }
            }
          });
        }

        // Extract machine information
        let machineChanges = [];
        if (logObj.changes) {
          // Check for installed_status changes
          if (logObj.changes['select_machine.installed_status']) {
            const change = logObj.changes['select_machine.installed_status'];
            machineChanges.push({
              type: 'installed_status_changed',
              old_status: change.old,
              new_status: change.new,
              action: logObj.action
            });
          }

          // Check for machine status changes
          if (logObj.changes['select_machine.status']) {
            const change = logObj.changes['select_machine.status'];
            machineChanges.push({
              type: 'status_changed',
              old_status: change.old,
              new_status: change.new,
              action: logObj.action
            });
          }

          // Check for removed machine
          if (logObj.changes.removed_machine_id) {
            machineChanges.push({
              type: 'removed',
              machine_id: logObj.changes.removed_machine_id.old,
              action: logObj.action
            });
          }
        }

        return {
          ...logObj,
          image_changes: imageChanges.length > 0 ? imageChanges : undefined,
          machine_changes: machineChanges.length > 0 ? machineChanges : undefined,
          total_image_changes: imageChanges.length,
          total_machine_changes: machineChanges.length
        };
      });

      res.status(200).json({
        success: true,
        data: {
          logs: enrichedLogs,
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

      // Enrich activities with image and machine information
      const enrichedActivities = activities.map(activity => {
        let imageChanges = [];
        let machineChanges = [];
        let imageSummary = "";
        let machineSummary = "";

        // Check for image-related changes
        if (activity.changes) {
          Object.keys(activity.changes).forEach(key => {
            if (key.includes('machine_image') || key.includes('image')) {
              const change = activity.changes[key];
              const oldImages = Array.isArray(change.old) ? change.old : [];
              const newImages = Array.isArray(change.new) ? change.new : [];

              oldImages.forEach((img: any) => {
                if (img && img.file_url) {
                  imageChanges.push({
                    type: 'removed',
                    image_name: img.image_name,
                    file_url: img.file_url
                  });
                }
              });

              newImages.forEach((img: any) => {
                if (img && img.file_url) {
                  imageChanges.push({
                    type: 'added',
                    image_name: img.image_name,
                    file_url: img.file_url
                  });
                }
              });

              imageSummary = `Images: ${oldImages.length} removed, ${newImages.length} added`;
            }

            // Check for machine changes - UPDATED FOR NEW SCHEMA
            if (key.includes('select_machine.installed_status')) {
              const change = activity.changes[key];
              machineChanges.push({
                type: 'installed_status_changed',
                field: 'installed_status',
                old_value: change.old,
                new_value: change.new
              });
            }
            if (key.includes('select_machine.status')) {
              const change = activity.changes[key];
              machineChanges.push({
                type: 'status_changed',
                field: 'status',
                old_value: change.old,
                new_value: change.new
              });
            }
          });
        }

        // Check for removed machine
        if (activity.changes?.removed_machine_id) {
          machineChanges.push({
            type: 'removed',
            machine_id: activity.changes.removed_machine_id.old
          });
          machineSummary = `Machine ${activity.changes.removed_machine_id.old} removed`;
        }

        return {
          ...activity,
          image_changes: imageChanges.length > 0 ? imageChanges : undefined,
          machine_changes: machineChanges.length > 0 ? machineChanges : undefined,
          image_summary: imageSummary || undefined,
          machine_summary: machineSummary || undefined
        };
      });

      res.status(200).json({
        success: true,
        data: enrichedActivities,
      });
    } catch (error) {
      logger.error("Error fetching recent activities:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
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

      // Match and distribute files to machines based on machine ID in filename
      const distributionResult = AreaController.matchAndDistributeFilesToMachines(
        areaData,
        processedFiles
      );

      // Log unmatched files
      if (distributionResult.unmatchedFiles.length > 0) {
        logger.warn(`Unmatched files: ${distributionResult.unmatchedFiles.map(f => f.image_name).join(', ')}`);
        
        res.status(400).json({
          success: false,
          message: "Some files could not be matched to machines",
          details: {
            unmatched_files: distributionResult.unmatchedFiles.map(f => f.image_name),
            expected_machine_ids: areaData.sub_locations
              .filter(sl => sl.select_machine?.machine_id)
              .map(sl => sl.select_machine.machine_id),
            file_mapping_suggestions: distributionResult.unmatchedFiles.map(file => ({
              file_name: file.image_name,
              suggestions: AreaController.extractPossibleMachineIdsFromFileName(file.image_name)
            }))
          }
        });
        return;
      }

      // Log distribution summary
      logger.info("File distribution summary:", {
        total_files: processedFiles.length,
        matched_files: distributionResult.matchedCount,
        machines_with_images: distributionResult.machinesWithImages
      });
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

// NEW HELPER METHOD: Match files to machines based on machine ID in filename
private static matchAndDistributeFilesToMachines(
  areaData: CreateAreaDto,
  processedFiles: IMachineImageData[]
): {
  matchedCount: number;
  unmatchedFiles: IMachineImageData[];
  machinesWithImages: Record<string, number>;
} {
  const unmatchedFiles: IMachineImageData[] = [];
  const machinesWithImages: Record<string, number> = {};
  let matchedCount = 0;

  // Extract all machine IDs from area data
  const machineIds = areaData.sub_locations
    .filter(sl => sl.select_machine?.machine_id)
    .map(sl => sl.select_machine.machine_id);

  logger.info("Available machine IDs:", machineIds);

  // Process each file
  processedFiles.forEach(file => {
    const fileName = file.image_name.toLowerCase();
    let matched = false;

    // Try to find matching machine ID in filename
    for (const machineId of machineIds) {
      const machineIdLower = machineId.toLowerCase();
      
      // Check if machine ID is in filename (with various separators)
      const patterns = [
        machineIdLower,                     // Exact match
        machineIdLower.replace(/-/g, '_'),  // Replace - with _
        machineIdLower.replace(/-/g, ''),   // Remove -
        machineIdLower.replace(/_/g, ''),   // Remove _
      ];

      for (const pattern of patterns) {
        if (fileName.includes(pattern)) {
          // Find the sub-location with this machine ID
          const subLocationIndex = areaData.sub_locations.findIndex(
            sl => sl.select_machine?.machine_id?.toLowerCase() === machineIdLower
          );

          if (subLocationIndex !== -1) {
            const subLocation = areaData.sub_locations[subLocationIndex];
            
            // Initialize machine image array if needed
            if (!subLocation.select_machine.machine_image) {
              subLocation.select_machine.machine_image = [];
            }

            // Add file to machine
            subLocation.select_machine.machine_image.push(file);
            
            // Update counters
            matchedCount++;
            machinesWithImages[machineId] = (machinesWithImages[machineId] || 0) + 1;
            matched = true;
            
            logger.info(`Matched file "${file.image_name}" to machine "${machineId}"`);
            break;
          }
        }
        if (matched) break;
      }
      if (matched) break;
    }

    // If no match found, add to unmatched files
    if (!matched) {
      unmatchedFiles.push(file);
      logger.warn(`Could not match file "${file.image_name}" to any machine`);
    }
  });

  return {
    matchedCount,
    unmatchedFiles,
    machinesWithImages
  };
}

// HELPER: Extract possible machine IDs from filename
private static extractPossibleMachineIdsFromFileName(fileName: string): string[] {
  const suggestions: string[] = [];
  
  // Try to extract patterns that look like machine IDs
  const patterns = [
    /(VM-\d+)/i,           // VM-001, VM-101
    /(MACHINE-\d+)/i,      // MACHINE-001
    /(MACH-\d+)/i,         // MACH-001
    /(EQUIP-\d+)/i,        // EQUIP-001
    /([A-Z]{2,}-\d+)/i,    // Any 2+ letters followed by - and numbers
    /(\d{3,})/,            // 3+ digit numbers
  ];

  fileName = fileName.toUpperCase();
  
  patterns.forEach(pattern => {
    const matches = fileName.match(pattern);
    if (matches && matches[1]) {
      suggestions.push(matches[1]);
    }
  });

  // Also try to extract by removing common file extensions and prefixes
  const cleanName = fileName
    .replace(/\.[^/.]+$/, '') // Remove extension
    .replace(/^IMG_/, '')     // Remove IMG_ prefix
    .replace(/^DSC_/, '')     // Remove DSC_ prefix
    .replace(/^PIC_/, '')     // Remove PIC_ prefix
    .replace(/^IMAGE_/, '');  // Remove IMAGE_ prefix

  if (cleanName && cleanName !== fileName) {
    suggestions.push(cleanName);
  }

  return [...new Set(suggestions)]; // Remove duplicates
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
            installed_status: body['sub_locations.select_machines.installed_status'] || 'not_installed', // Updated
            status: body['sub_locations.select_machines.status'] || 'active', // Updated
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

  // ADD SUB-LOCATION - UPDATED FOR NEW SCHEMA
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

      // Set default values for new schema fields if not provided
      if (!sub_location.select_machine.installed_status) {
        sub_location.select_machine.installed_status = 'not_installed';
      }
      if (!sub_location.select_machine.status) {
        sub_location.select_machine.status = 'active';
      }

      // Validate enum values
      const validInstalledStatuses = ['installed', 'not_installed'];
      const validStatuses = ['active', 'inactive'];

      if (!validInstalledStatuses.includes(sub_location.select_machine.installed_status)) {
        res.status(400).json({
          success: false,
          message: `Invalid installed_status: ${sub_location.select_machine.installed_status}. Must be one of: ${validInstalledStatuses.join(', ')}`,
        });
        return;
      }

      if (!validStatuses.includes(sub_location.select_machine.status)) {
        res.status(400).json({
          success: false,
          message: `Invalid status: ${sub_location.select_machine.status}. Must be one of: ${validStatuses.join(', ')}`,
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

  // UPDATE AREA - UPDATED FOR NEW SCHEMA
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

      // Validate machine status fields if present
      if (updateData.sub_locations) {
        for (const subLoc of updateData.sub_locations) {
          if (subLoc.select_machine) {
            // Validate installed_status if present
            if (subLoc.select_machine.installed_status) {
              const validInstalledStatuses = ['installed', 'not_installed'];
              if (!validInstalledStatuses.includes(subLoc.select_machine.installed_status)) {
                res.status(400).json({
                  success: false,
                  message: `Invalid installed_status: ${subLoc.select_machine.installed_status}. Must be one of: ${validInstalledStatuses.join(', ')}`,
                });
                return;
              }
            }

            // Validate status if present
            if (subLoc.select_machine.status) {
              const validStatuses = ['active', 'inactive'];
              if (!validStatuses.includes(subLoc.select_machine.status)) {
                res.status(400).json({
                  success: false,
                  message: `Invalid status: ${subLoc.select_machine.status}. Must be one of: ${validStatuses.join(', ')}`,
                });
                return;
              }
            }
          }
        }
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

  // DASHBOARD METHODS - UPDATED FOR NEW SCHEMA
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

      // Enrich dashboard data with machine and image information
      const enrichedAreas = dashboardData.areas.map(area => {
        const areaObj = area.toObject ? area.toObject() : area;

        // Calculate detailed statistics for new schema
        let totalMachines = 0;
        let installedMachines = 0;
        let notInstalledMachines = 0;
        let activeMachines = 0;
        let inactiveMachines = 0;
        let totalImages = 0;
        const machineIds: string[] = [];
        const imageUrls: string[] = [];

        areaObj.sub_locations?.forEach((subloc: any) => {
          if (subloc.select_machine && subloc.select_machine.machine_id) {
            totalMachines++;
            machineIds.push(subloc.select_machine.machine_id);

            // Count by installed_status
            if (subloc.select_machine.installed_status === 'installed') {
              installedMachines++;
            } else if (subloc.select_machine.installed_status === 'not_installed') {
              notInstalledMachines++;
            }

            // Count by status
            if (subloc.select_machine.status === 'active') {
              activeMachines++;
            } else if (subloc.select_machine.status === 'inactive') {
              inactiveMachines++;
            }

            if (subloc.select_machine.machine_image) {
              totalImages += subloc.select_machine.machine_image.length;
              subloc.select_machine.machine_image.forEach((img: any) => {
                if (img.file_url) {
                  imageUrls.push(img.file_url);
                }
              });
            }
          }
        });

        return {
          ...areaObj,
          summary: {
            total_machines: totalMachines,
            installed_machines: installedMachines,
            not_installed_machines: notInstalledMachines,
            active_machines: activeMachines,
            inactive_machines: inactiveMachines,
            total_images: totalImages,
            machine_ids: machineIds,
            sample_image_url: imageUrls.length > 0 ? imageUrls[0] : null
          }
        };
      });

      // Enrich statistics with image and machine counts
      const enrichedStatistics = {
        ...dashboardData.statistics,
        total_images: enrichedAreas.reduce((sum, area) => sum + (area.summary?.total_images || 0), 0),
        machines_by_installed_status: {
          installed: enrichedAreas.reduce((sum, area) => sum + (area.summary?.installed_machines || 0), 0),
          not_installed: enrichedAreas.reduce((sum, area) => sum + (area.summary?.not_installed_machines || 0), 0)
        },
        machines_by_status: {
          active: enrichedAreas.reduce((sum, area) => sum + (area.summary?.active_machines || 0), 0),
          inactive: enrichedAreas.reduce((sum, area) => sum + (area.summary?.inactive_machines || 0), 0)
        }
      };

      res.status(200).json({
        success: true,
        data: {
          ...dashboardData,
          areas: enrichedAreas,
          statistics: enrichedStatistics
        },
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

      // Enrich table data with machine and image information
      const enrichedData = await Promise.all(tableData.data.map(async (item) => {
        const area = await AreaService.getAreaById(item.id);
        if (!area) return item;

        const areaObj = area.toObject ? area.toObject() : area;

        // Calculate detailed machine and image information for new schema
        let totalMachines = 0;
        let installedMachines = 0;
        let notInstalledMachines = 0;
        let totalImages = 0;
        const machineIds: string[] = [];
        const imageUrls: string[] = [];

        areaObj.sub_locations?.forEach((subloc: any) => {
          if (subloc.select_machine && subloc.select_machine.machine_id) {
            totalMachines++;
            machineIds.push(subloc.select_machine.machine_id);

            // Count by installed_status
            if (subloc.select_machine.installed_status === 'installed') {
              installedMachines++;
            } else if (subloc.select_machine.installed_status === 'not_installed') {
              notInstalledMachines++;
            }

            if (subloc.select_machine.machine_image) {
              totalImages += subloc.select_machine.machine_image.length;
              subloc.select_machine.machine_image.forEach((img: any) => {
                if (img.file_url) {
                  imageUrls.push(img.file_url);
                }
              });
            }
          }
        });

        return {
          ...item,
          total_machines: totalMachines,
          installed_machines: installedMachines,
          not_installed_machines: notInstalledMachines,
          total_images: totalImages,
          machine_ids: machineIds,
          image_urls: imageUrls,
          sample_image_url: imageUrls.length > 0 ? imageUrls[0] : null,
          has_images: totalImages > 0
        };
      }));

      res.status(200).json({
        success: true,
        data: enrichedData,
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

  // CSV GENERATION - UPDATED FOR NEW SCHEMA
  private static convertAreasToCSV(areas: any[]): string {
    if (!areas || areas.length === 0) {
      return "No areas available for export";
    }

    try {
      const headers = [
        "ID",
        "Area Name",
        "State",
        "District",
        "Pincode",
        "Status",
        "Address",
        "Total Sub-locations",
        "Total Machines",
        "Installed Machines",
        "Not Installed Machines",
        "Machine IDs",
        "Total Images",
        "Image URLs",
        "Created At",
        "Updated At"
      ];

      let csv = "\ufeff";
      csv += headers.join(",") + "\n";

      areas.forEach(area => {
        const areaDoc = area.toObject ? area.toObject() : area;

        // Calculate machine and image information for new schema
        let totalMachines = 0;
        let installedMachines = 0;
        let notInstalledMachines = 0;
        let totalImages = 0;
        const machineIds: string[] = [];
        const imageUrls: string[] = [];

        areaDoc.sub_locations?.forEach((subloc: any) => {
          if (subloc.select_machine && subloc.select_machine.machine_id) {
            totalMachines++;
            machineIds.push(subloc.select_machine.machine_id);

            // Count by installed_status
            if (subloc.select_machine.installed_status === 'installed') {
              installedMachines++;
            } else if (subloc.select_machine.installed_status === 'not_installed') {
              notInstalledMachines++;
            }

            if (subloc.select_machine.machine_image) {
              totalImages += subloc.select_machine.machine_image.length;
              subloc.select_machine.machine_image.forEach((img: any) => {
                if (img.file_url) {
                  imageUrls.push(img.file_url);
                }
              });
            }
          }
        });

        const row = [
          areaDoc._id?.toString() || "",
          `"${(areaDoc.area_name || "").replace(/"/g, '""')}"`,
          `"${(areaDoc.state || "").replace(/"/g, '""')}"`,
          `"${(areaDoc.district || "").replace(/"/g, '""')}"`,
          areaDoc.pincode || "",
          areaDoc.status || "",
          `"${(areaDoc.address || "").replace(/"/g, '""')}"`,
          areaDoc.sub_locations?.length || 0,
          totalMachines,
          installedMachines,
          notInstalledMachines,
          `"${machineIds.join("; ").replace(/"/g, '""')}"`,
          totalImages,
          `"${imageUrls.join("; ").replace(/"/g, '""')}"`,
          areaDoc.createdAt ? new Date(areaDoc.createdAt).toISOString() : "",
          areaDoc.updatedAt ? new Date(areaDoc.updatedAt).toISOString() : ""
        ];

        csv += row.join(",") + "\n";
      });

      // Add summary
      csv += "\n\n";
      csv += "Export Summary\n";
      csv += "Total Areas," + areas.length + "\n";
      csv += "Total Sub-locations," + areas.reduce((sum, area) =>
        sum + (area.sub_locations?.length || 0), 0) + "\n";
      csv += "Total Machines," + areas.reduce((sum, area) => {
        const areaDoc = area.toObject ? area.toObject() : area;
        return sum + (areaDoc.sub_locations?.filter((sl: any) =>
          sl.select_machine && sl.select_machine.machine_id).length || 0);
      }, 0) + "\n";
      csv += "Total Installed Machines," + areas.reduce((sum, area) => {
        const areaDoc = area.toObject ? area.toObject() : area;
        return sum + (areaDoc.sub_locations?.filter((sl: any) =>
          sl.select_machine && sl.select_machine.machine_id &&
          sl.select_machine.installed_status === 'installed').length || 0);
      }, 0) + "\n";
      csv += "Total Not Installed Machines," + areas.reduce((sum, area) => {
        const areaDoc = area.toObject ? area.toObject() : area;
        return sum + (areaDoc.sub_locations?.filter((sl: any) =>
          sl.select_machine && sl.select_machine.machine_id &&
          sl.select_machine.installed_status === 'not_installed').length || 0);
      }, 0) + "\n";
      csv += "Total Images," + areas.reduce((sum, area) => {
        const areaDoc = area.toObject ? area.toObject() : area;
        return sum + (areaDoc.sub_locations?.reduce((imgSum: number, sl: any) =>
          imgSum + (sl.select_machine?.machine_image?.length || 0), 0) || 0);
      }, 0) + "\n";
      csv += "Export Date," + new Date().toISOString() + "\n";

      return csv;
    } catch (error) {
      logger.error("Error converting areas to CSV:", error);
      return "Error generating areas CSV";
    }
  }

  // REMOVE MACHINE FROM AREA - UPDATED FOR NEW SCHEMA
  static async removeMachineFromArea(req: Request, res: Response): Promise<void> {
    const { id, machineId } = req.params;

    try {
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

      // Calculate remaining machines with installed_status breakdown
      let remainingMachines = 0;
      let installedMachines = 0;
      let notInstalledMachines = 0;

      updatedArea.sub_locations?.forEach((subLoc: any) => {
        if (subLoc.select_machine && subLoc.select_machine.machine_id) {
          remainingMachines++;
          if (subLoc.select_machine.installed_status === 'installed') {
            installedMachines++;
          } else if (subLoc.select_machine.installed_status === 'not_installed') {
            notInstalledMachines++;
          }
        }
      });

      const response = {
        success: true,
        message: `Machine "${machineId}" removed successfully from area`,
        data: updatedArea,
        summary: {
          removed_machine_id: machineId,
          remaining_machines: remainingMachines,
          installed_machines: installedMachines,
          not_installed_machines: notInstalledMachines,
          total_sub_locations: updatedArea.sub_locations?.length || 0,
          has_machines: remainingMachines > 0,
          warning: remainingMachines === 0 ?
            "Warning: All machines have been removed from this area. The area will still exist with empty sub-locations." :
            undefined
        }
      };

      res.status(200).json(response);
    } catch (error) {
      logger.error("Error removing machine from area:", error);

      const statusCode = error.message.includes("not found")
        ? 404
        : error.message.includes("Invalid MongoDB ObjectId")
          ? 400
          : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
        error_details: process.env.NODE_ENV === 'development' ? {
          stack: error.stack,
          area_id: id,
          machine_id: machineId
        } : undefined
      });
    }
  }

  // HELPER METHODS (Keep as is, no changes needed)
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
            subLocation.select_machine = {
              machine_id: '',
              installed_status: 'not_installed',
              status: 'active',
              machine_image: []
            };
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
        // Get all current machine and image information from the area
        const currentMachines: any[] = [];
        const currentImages: any[] = [];

        area.sub_locations?.forEach((subloc: any, subIdx: number) => {
          if (subloc.select_machine && subloc.select_machine.machine_id) {
            currentMachines.push({
              sub_location_index: subIdx,
              campus: subloc.campus,
              tower: subloc.tower,
              floor: subloc.floor,
              machine_id: subloc.select_machine.machine_id,
              machine_status: subloc.select_machine.status,
              total_images: subloc.select_machine.machine_image?.length || 0
            });

            if (subloc.select_machine.machine_image) {
              subloc.select_machine.machine_image.forEach((img: any, imgIdx: number) => {
                if (img.file_url) {
                  currentImages.push({
                    sub_location_index: subIdx,
                    machine_id: subloc.select_machine.machine_id,
                    image_index: imgIdx,
                    image_name: img.image_name,
                    file_url: img.file_url,
                    cloudinary_public_id: img.cloudinary_public_id,
                    file_size: img.file_size,
                    mime_type: img.mime_type,
                    uploaded_at: img.uploaded_at
                  });
                }
              });
            }
          }
        });

        const exportData = {
          area: {
            id: area._id,
            name: area.area_name,
            state: area.state,
            district: area.district,
            pincode: area.pincode,
            status: area.status,
            address: area.address,
            total_sub_locations: area.sub_locations?.length || 0,
            total_machines: currentMachines.length,
            total_images: currentImages.length,
            current_machines: currentMachines,
            current_images: currentImages
          },
          audit_logs: logs.map(log => {
            const logObj = log.toObject ? log.toObject() : log;

            // Extract image URLs and machine changes from log data
            const imageChanges: any[] = [];
            const machineChanges: any[] = [];

            if (logObj.changes) {
              Object.keys(logObj.changes).forEach(key => {
                if (key.includes('machine_image')) {
                  const change = logObj.changes[key];
                  if (change.old && Array.isArray(change.old)) {
                    change.old.forEach((img: any) => {
                      if (img && img.file_url) {
                        imageChanges.push({
                          action: 'removed',
                          ...img
                        });
                      }
                    });
                  }
                  if (change.new && Array.isArray(change.new)) {
                    change.new.forEach((img: any) => {
                      if (img && img.file_url) {
                        imageChanges.push({
                          action: 'added',
                          ...img
                        });
                      }
                    });
                  }
                }

                if (key.includes('machine_id') || key.includes('machine')) {
                  machineChanges.push({
                    field: key,
                    old: logObj.changes[key].old,
                    new: logObj.changes[key].new
                  });
                }
              });
            }

            return {
              ...logObj,
              image_changes: imageChanges.length > 0 ? imageChanges : undefined,
              machine_changes: machineChanges.length > 0 ? machineChanges : undefined
            };
          }),
          export_date: new Date().toISOString(),
          total_logs: logs.length,
          summary: {
            total_image_changes: logs.reduce((sum, log) => {
              const logObj = log.toObject ? log.toObject() : log;
              if (logObj.changes) {
                Object.keys(logObj.changes).forEach(key => {
                  if (key.includes('machine_image')) {
                    const change = logObj.changes[key];
                    if (change.old && Array.isArray(change.old)) sum += change.old.length;
                    if (change.new && Array.isArray(change.new)) sum += change.new.length;
                  }
                });
              }
              return sum;
            }, 0),
            total_machine_changes: logs.reduce((sum, log) => {
              const logObj = log.toObject ? log.toObject() : log;
              if (logObj.changes) {
                Object.keys(logObj.changes).forEach(key => {
                  if (key.includes('machine')) sum++;
                });
              }
              return sum;
            }, 0)
          }
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
          activities: activities.map(activity => {
            // Extract image and machine information
            let imageChanges: any[] = [];
            let machineChanges: any[] = [];

            if (activity.changes) {
              Object.keys(activity.changes).forEach(key => {
                if (key.includes('machine_image') || key.includes('image')) {
                  const change = activity.changes[key];
                  if (change.old && Array.isArray(change.old)) {
                    change.old.forEach((img: any) => {
                      if (img && img.file_url) {
                        imageChanges.push({
                          type: 'removed',
                          image_name: img.image_name,
                          file_url: img.file_url,
                          cloudinary_id: img.cloudinary_public_id,
                          file_size: img.file_size,
                          mime_type: img.mime_type
                        });
                      }
                    });
                  }
                  if (change.new && Array.isArray(change.new)) {
                    change.new.forEach((img: any) => {
                      if (img && img.file_url) {
                        imageChanges.push({
                          type: 'added',
                          image_name: img.image_name,
                          file_url: img.file_url,
                          cloudinary_id: img.cloudinary_public_id,
                          file_size: img.file_size,
                          mime_type: img.mime_type
                        });
                      }
                    });
                  }
                }

                // Machine changes
                if (key.includes('machine_id') || key.includes('machine_status')) {
                  machineChanges.push({
                    field: key,
                    old_value: activity.changes[key].old,
                    new_value: activity.changes[key].new
                  });
                }
              });
            }

            return {
              id: activity.id,
              action: activity.action,
              area_id: activity.area_id,
              area_name: activity.area_name,
              area_state: activity.area_state,
              area_district: activity.area_district,
              performed_by: activity.performed_by,
              ip_address: activity.ip_address,
              user_agent: activity.user_agent,
              timestamp: activity.timestamp,
              changes: activity.changes,
              image_changes: imageChanges.length > 0 ? imageChanges : undefined,
              machine_changes: machineChanges.length > 0 ? machineChanges : undefined,
              total_image_changes: imageChanges.length,
              total_machine_changes: machineChanges.length
            };
          }),
          export_date: new Date().toISOString(),
          total_activities: activities.length,
          date_range: {
            start: startDate || "all",
            end: endDate || "all",
          },
          summary: {
            total_image_changes: activities.reduce((sum, activity) => {
              if (activity.changes) {
                Object.keys(activity.changes).forEach(key => {
                  if (key.includes('machine_image')) {
                    const change = activity.changes[key];
                    if (change.old && Array.isArray(change.old)) sum += change.old.length;
                    if (change.new && Array.isArray(change.new)) sum += change.new.length;
                  }
                });
              }
              return sum;
            }, 0),
            total_machine_changes: activities.reduce((sum, activity) => {
              if (activity.changes) {
                Object.keys(activity.changes).forEach(key => {
                  if (key.includes('machine')) sum++;
                });
              }
              return sum;
            }, 0),
            actions_breakdown: activities.reduce((acc: any, activity) => {
              acc[activity.action] = (acc[activity.action] || 0) + 1;
              return acc;
            }, {})
          }
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
        "Image Changes Count",
        "Added Images",
        "Removed Images",
        "Image URLs",
        "Machine Changes",
        "Machine IDs Affected"
      ];

      let csv = "\ufeff";
      csv += headers.join(",") + "\n";

      logs.forEach(log => {
        const logDoc = log.toObject ? log.toObject() : log;

        let changesSummary = "";
        let fieldChanges = "";
        let addedImages: string[] = [];
        let removedImages: string[] = [];
        let imageUrls: string[] = [];
        let imageChangesCount = 0;
        let machineChanges = "";
        let machineIdsAffected: string[] = [];

        if (logDoc.changes) {
          const changedFields = Object.keys(logDoc.changes);
          changesSummary = `${changedFields.length} field(s) changed`;
          fieldChanges = changedFields
            .map(
              field => `${field}: "${logDoc.changes[field].old}" → "${logDoc.changes[field].new}"`
            )
            .join("; ");

          // Extract image changes
          Object.keys(logDoc.changes).forEach(key => {
            if (key.includes('machine_image') || key.includes('image')) {
              const change = logDoc.changes[key];

              if (change.old && Array.isArray(change.old)) {
                change.old.forEach((img: any) => {
                  if (img && img.file_url) {
                    removedImages.push(img.image_name || "Unnamed");
                    imageUrls.push(img.file_url);
                    imageChangesCount++;
                  }
                });
              }

              if (change.new && Array.isArray(change.new)) {
                change.new.forEach((img: any) => {
                  if (img && img.file_url) {
                    addedImages.push(img.image_name || "Unnamed");
                    imageUrls.push(img.file_url);
                    imageChangesCount++;
                  }
                });
              }
            }

            // Extract machine changes
            if (key.includes('machine_id') || key.includes('machine_status')) {
              const change = logDoc.changes[key];
              machineChanges += `${key}: ${change.old} → ${change.new}; `;
              if (key === 'removed_machine_id' && change.old) {
                machineIdsAffected.push(change.old);
              }
            }
          });
        } else if (logDoc.action === "CREATE") {
          changesSummary = "New area created";
          // Extract images from new_data if CREATE action
          if (logDoc.new_data && logDoc.new_data.sub_locations) {
            logDoc.new_data.sub_locations?.forEach((subloc: any) => {
              if (subloc.select_machine?.machine_image) {
                subloc.select_machine.machine_image.forEach((img: any) => {
                  if (img && img.file_url) {
                    addedImages.push(img.image_name || "Unnamed");
                    imageUrls.push(img.file_url);
                    imageChangesCount++;
                  }
                });
              }
            });
          }
        } else if (logDoc.action === "DELETE") {
          changesSummary = "Area deleted";
        } else if (logDoc.action === "ADD_SUB_LOCATION") {
          changesSummary = "Sub-location added";
        } else if (logDoc.action === "REMOVE_MACHINE") {
          changesSummary = "Machine removed";
          if (logDoc.changes?.removed_machine_id) {
            changesSummary = `Machine ${logDoc.changes.removed_machine_id.old} removed`;
            machineIdsAffected.push(logDoc.changes.removed_machine_id.old);
            machineChanges = `Machine ${logDoc.changes.removed_machine_id.old} removed`;
          }
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
          imageChangesCount,
          `"${addedImages.join("; ").replace(/"/g, '""')}"`,
          `"${removedImages.join("; ").replace(/"/g, '""')}"`,
          `"${imageUrls.join("; ").replace(/"/g, '""')}"`,
          `"${machineChanges.replace(/"/g, '""')}"`,
          `"${machineIdsAffected.join("; ").replace(/"/g, '""')}"`
        ];

        csv += row.join(",") + "\n";
      });

      // Add current area machine and image information
      csv += "\n\n";
      csv += "Current Area Status\n";
      csv += "Area Name," + `"${area.area_name}"` + "\n";
      csv += "Status," + `"${area.status}"` + "\n";

      // Extract all current machines and images from area
      const currentMachines: any[] = [];
      const currentImages: any[] = [];

      area.sub_locations?.forEach((subloc: any, idx: number) => {
        if (subloc.select_machine && subloc.select_machine.machine_id) {
          csv += `\nSub-location ${idx + 1}\n`;
          csv += `Campus,` + `"${subloc.campus}"` + "\n";
          csv += `Tower,` + `"${subloc.tower}"` + "\n";
          csv += `Floor,` + `"${subloc.floor}"` + "\n";
          csv += `Machine ID,` + `"${subloc.select_machine.machine_id}"` + "\n";
          csv += `Machine Status,` + `"${subloc.select_machine.status}"` + "\n";

          currentMachines.push({
            machine_id: subloc.select_machine.machine_id,
            status: subloc.select_machine.status
          });

          if (subloc.select_machine.machine_image && subloc.select_machine.machine_image.length > 0) {
            csv += `Total Images,${subloc.select_machine.machine_image.length}\n`;
            subloc.select_machine.machine_image.forEach((img: any, imgIdx: number) => {
              if (img.file_url) {
                csv += `Image ${imgIdx + 1} Name,` + `"${img.image_name || 'Unnamed'}"` + "\n";
                csv += `Image ${imgIdx + 1} URL,` + `"${img.file_url}"` + "\n";
                currentImages.push(img.file_url);
              }
            });
          } else {
            csv += `Total Images,0\n`;
          }
        }
      });

      csv += "\nSummary\n";
      csv += "Total Sub-locations," + (area.sub_locations?.length || 0) + "\n";
      csv += "Total Current Machines," + currentMachines.length + "\n";
      csv += "Total Current Images," + currentImages.length + "\n";
      csv += "Total Audit Logs," + logs.length + "\n";
      csv += "First Log," + (logs[logs.length - 1]?.timestamp ? new Date(logs[logs.length - 1].timestamp).toISOString() : "") + "\n";
      csv += "Last Log," + (logs[0]?.timestamp ? new Date(logs[0].timestamp).toISOString() : "") + "\n";
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
        "Image Changes",
        "Image URLs",
        "Machine Changes",
        "Machine IDs Affected"
      ];

      let csv = "\ufeff";
      csv += headers.join(",") + "\n";

      activities.forEach(activity => {
        const activityDoc = activity.toObject ? activity.toObject() : activity;

        let changesSummary = "";
        let imageChanges = "";
        let imageUrls: string[] = [];
        let machineChanges = "";
        let machineIdsAffected: string[] = [];

        if (activityDoc.changes) {
          const changedFields = Object.keys(activityDoc.changes);
          changesSummary = `${changedFields.length} field(s) changed`;

          // Check for status change
          if (activityDoc.changes.status) {
            changesSummary = `Status changed: ${activityDoc.changes.status.old} → ${activityDoc.changes.status.new}`;
          }

          // Check for image changes
          Object.keys(activityDoc.changes).forEach(key => {
            if (key.includes('machine_image') || key.includes('image')) {
              const change = activityDoc.changes[key];
              let added = 0;
              let removed = 0;

              if (change.old && Array.isArray(change.old)) {
                removed = change.old.filter((img: any) => img && img.file_url).length;
                change.old.forEach((img: any) => {
                  if (img && img.file_url) {
                    imageUrls.push(img.file_url);
                  }
                });
              }

              if (change.new && Array.isArray(change.new)) {
                added = change.new.filter((img: any) => img && img.file_url).length;
                change.new.forEach((img: any) => {
                  if (img && img.file_url) {
                    imageUrls.push(img.file_url);
                  }
                });
              }

              imageChanges = `Images: ${added} added, ${removed} removed`;
            }

            // Check for machine changes
            if (key.includes('machine_id')) {
              const change = activityDoc.changes[key];
              machineChanges += `${key}: ${change.old} → ${change.new}; `;
              if (key === 'removed_machine_id' && change.old) {
                machineIdsAffected.push(change.old);
              }
            }
            if (key.includes('machine_status')) {
              const change = activityDoc.changes[key];
              machineChanges += `Status: ${change.old} → ${change.new}; `;
            }
          });
        } else if (activityDoc.action === "CREATE") {
          changesSummary = "New area created";
        } else if (activityDoc.action === "DELETE") {
          changesSummary = "Area deleted";
        } else if (activityDoc.action === "ADD_SUB_LOCATION") {
          changesSummary = "Sub-location added";
        } else if (activityDoc.action === "REMOVE_MACHINE") {
          changesSummary = "Machine removed";
          if (activityDoc.changes?.removed_machine_id) {
            changesSummary = `Machine ${activityDoc.changes.removed_machine_id.old} removed`;
            machineIdsAffected.push(activityDoc.changes.removed_machine_id.old);
            machineChanges = `Machine ${activityDoc.changes.removed_machine_id.old} removed`;
          }
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
          `"${imageChanges.replace(/"/g, '""')}"`,
          `"${imageUrls.join("; ").replace(/"/g, '""')}"`,
          `"${machineChanges.replace(/"/g, '""')}"`,
          `"${machineIdsAffected.join("; ").replace(/"/g, '""')}"`
        ];

        csv += row.join(",") + "\n";
      });

      csv += "\n\n";
      csv += "Summary\n";
      csv += "Total Activities," + activities.length + "\n";

      // Calculate totals
      let totalImageChanges = 0;
      let totalMachineChanges = 0;
      const actionCounts: Record<string, number> = {};

      activities.forEach(activity => {
        const action = activity.action || "UNKNOWN";
        actionCounts[action] = (actionCounts[action] || 0) + 1;

        if (activity.changes) {
          Object.keys(activity.changes).forEach(key => {
            if (key.includes('machine_image')) {
              const change = activity.changes[key];
              if (change.old && Array.isArray(change.old)) totalImageChanges += change.old.length;
              if (change.new && Array.isArray(change.new)) totalImageChanges += change.new.length;
            }
            if (key.includes('machine')) totalMachineChanges++;
          });
        }
      });

      csv += "Total Image Changes," + totalImageChanges + "\n";
      csv += "Total Machine Changes," + totalMachineChanges + "\n";
      csv += "Date Range," + new Date(activities[activities.length - 1]?.timestamp).toISOString() + " to " + new Date(activities[0]?.timestamp).toISOString() + "\n";
      csv += "Export Date," + new Date().toISOString() + "\n";
      csv += "Actions Breakdown\n";

      Object.entries(actionCounts).forEach(([action, count]) => {
        csv += `${action},${count}\n`;
      });

      return csv;
    } catch (error) {
      logger.error("Error converting activities to CSV:", error);
      return "Error generating activities CSV";
    }
  }

  private static convertDashboardToCSV(dashboardData: any[]): string {
    if (!dashboardData || dashboardData.length === 0) {
      return "No dashboard data available for export";
    }

    try {
      const headers = [
        "Area ID",
        "Area Name",
        "State",
        "District",
        "Campus",
        "Tower",
        "Floor",
        "Machine ID",
        "Machine Status",
        "Installed Status",
        "Total Machines",
        "Installed Machines",
        "Not Installed Machines",
        "Total Images",
        "Machine IDs",
        "Image URLs",
        "Sample Image URL"
      ];

      let csv = "\ufeff";
      csv += headers.join(",") + "\n";

      dashboardData.forEach(item => {
        const row = [
          item.id || "",
          `"${(item.area_name || "").replace(/"/g, '""')}"`,
          `"${(item.state || "").replace(/"/g, '""')}"`,
          `"${(item.district || "").replace(/"/g, '""')}"`,
          `"${(item.campus || "").replace(/"/g, '""')}"`,
          `"${(item.tower || "").replace(/"/g, '""')}"`,
          `"${(item.floor || "").replace(/"/g, '""')}"`,
          `"${(item.machine_id || "").replace(/"/g, '""')}"`,
          `"${(item.machine_status || "").replace(/"/g, '""')}"`,
          `"${(item.installed_status || "").replace(/"/g, '""')}"`,
          item.total_machines || 0,
          item.installed_machines || 0,
          item.not_installed_machines || 0,
          item.total_images || 0,
          `"${(item.machine_ids?.join("; ") || "").replace(/"/g, '""')}"`,
          `"${(item.image_urls?.join("; ") || "").replace(/"/g, '""')}"`,
          `"${(item.sample_image_url || "").replace(/"/g, '""')}"`
        ];

        csv += row.join(",") + "\n";
      });

      // Add summary
      csv += "\n\n";
      csv += "Export Summary\n";
      csv += "Total Rows," + dashboardData.length + "\n";
      csv += "Total Machines," + dashboardData.reduce((sum, item) => sum + (item.total_machines || 0), 0) + "\n";
      csv += "Total Installed Machines," + dashboardData.reduce((sum, item) => sum + (item.installed_machines || 0), 0) + "\n";
      csv += "Total Not Installed Machines," + dashboardData.reduce((sum, item) => sum + (item.not_installed_machines || 0), 0) + "\n";
      csv += "Total Images," + dashboardData.reduce((sum, item) => sum + (item.total_images || 0), 0) + "\n";
      csv += "Export Date," + new Date().toISOString() + "\n";

      return csv;
    } catch (error) {
      logger.error("Error converting dashboard data to CSV:", error);
      return "Error generating dashboard CSV";
    }
  }

  // UPDATED EXPORT METHODS

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
        const csv = AreaController.convertAreasToCSV(result.data);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=areas-export.csv");
        res.status(200).send(csv);
      } else if (format === "json") {
        const enrichedData = result.data.map(area => {
          const areaObj = area.toObject ? area.toObject() : area;

          // Extract machine and image information
          const machines: any[] = [];
          const images: any[] = [];
          let totalImages = 0;

          areaObj.sub_locations?.forEach((subloc: any, idx: number) => {
            if (subloc.select_machine && subloc.select_machine.machine_id) {
              const machineInfo = {
                sub_location_index: idx,
                campus: subloc.campus,
                tower: subloc.tower,
                floor: subloc.floor,
                machine_id: subloc.select_machine.machine_id,
                machine_status: subloc.select_machine.status,
                images: subloc.select_machine.machine_image?.map((img: any) => ({
                  image_name: img.image_name,
                  file_url: img.file_url,
                  cloudinary_public_id: img.cloudinary_public_id,
                  uploaded_at: img.uploaded_at
                })) || []
              };
              machines.push(machineInfo);
              totalImages += machineInfo.images.length;
            }
          });

          return {
            ...areaObj,
            summary: {
              total_sub_locations: areaObj.sub_locations?.length || 0,
              total_machines: machines.length,
              total_images: totalImages,
              machines: machines
            }
          };
        });

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", "attachment; filename=areas-export.json");
        res.status(200).json({
          success: true,
          data: enrichedData,
          export_date: new Date().toISOString(),
          total_areas: result.data.length
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Unsupported format. Use "csv" or "json"',
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
        const csv = AreaController.convertDashboardToCSV(tableData.data);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", "attachment; filename=dashboard-export.csv");
        res.status(200).send(csv);
      } else if (format === "json") {
        const enrichedData = tableData.data.map(item => {
          // Get full area data for additional details
          return {
            ...item,
            export_date: new Date().toISOString()
          };
        });

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", "attachment; filename=dashboard-export.json");
        res.status(200).json({
          success: true,
          data: enrichedData,
          total: tableData.total,
          export_date: new Date().toISOString(),
          filter_params: params
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

      if (format === "csv") {
        const filename = `areas-export-${timestamp}.csv`;
        const csv = AreaController.generateDetailedCSV(areas);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.status(200).send(csv);
      } else if (format === "json") {
        const filename = `areas-export-${timestamp}.json`;
        const enrichedAreas = areas.map(area => {
          const areaObj = area.toObject ? area.toObject() : area;

          // Extract detailed information
          const subLocations = areaObj.sub_locations?.map((subloc: any, idx: number) => {
            const machineInfo = subloc.select_machine ? {
              machine_id: subloc.select_machine.machine_id,
              status: subloc.select_machine.status,
              images: subloc.select_machine.machine_image?.map((img: any, imgIdx: number) => ({
                image_index: imgIdx,
                image_name: img.image_name,
                file_url: img.file_url,
                cloudinary_public_id: img.cloudinary_public_id,
                file_size: img.file_size,
                mime_type: img.mime_type,
                uploaded_at: img.uploaded_at
              })) || []
            } : null;

            return {
              index: idx,
              campus: subloc.campus,
              tower: subloc.tower,
              floor: subloc.floor,
              machine: machineInfo,
              has_machine: !!subloc.select_machine,
              total_images: machineInfo?.images.length || 0
            };
          });

          return {
            ...areaObj,
            detailed_info: {
              total_sub_locations: areaObj.sub_locations?.length || 0,
              total_machines: areaObj.sub_locations?.filter((sl: any) => sl.select_machine).length || 0,
              total_images: areaObj.sub_locations?.reduce((sum: number, sl: any) =>
                sum + (sl.select_machine?.machine_image?.length || 0), 0) || 0,
              sub_locations: subLocations,
              machine_ids: areaObj.sub_locations
                ?.filter((sl: any) => sl.select_machine?.machine_id)
                .map((sl: any) => sl.select_machine.machine_id) || [],
              image_urls: areaObj.sub_locations?.reduce((urls: string[], sl: any) => {
                if (sl.select_machine?.machine_image) {
                  sl.select_machine.machine_image.forEach((img: any) => {
                    if (img.file_url) urls.push(img.file_url);
                  });
                }
                return urls;
              }, []) || []
            }
          };
        });

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}"`);
        res.status(200).json({
          success: true,
          data: enrichedAreas,
          export_date: new Date().toISOString(),
          total_areas: areas.length,
          area_ids: areaIds
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Unsupported format. Use "csv" or "json"',
        });
      }
    } catch (error) {
      logger.error("Error exporting areas by IDs:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }


  private static generateDetailedCSV(areas: any[]): string {
    if (!areas || areas.length === 0) {
      return "No data available for export";
    }

    try {
      let csv = "\ufeff";

      // Main area information
      const headers = [
        "Area ID",
        "Area Name",
        "State",
        "District",
        "Pincode",
        "Status",
        "Address",
        "Description",
        "Latitude",
        "Longitude",
        "Total Sub-locations",
        "Total Machines",
        "Total Images",
        "Created At",
        "Updated At"
      ];

      csv += headers.join(",") + "\n";

      areas.forEach(area => {
        const areaDoc = area.toObject ? area.toObject() : area;

        // Calculate totals
        let totalMachines = 0;
        let totalImages = 0;

        areaDoc.sub_locations?.forEach((subloc: any) => {
          if (subloc.select_machine && subloc.select_machine.machine_id) {
            totalMachines++;
            if (subloc.select_machine.machine_image) {
              totalImages += subloc.select_machine.machine_image.length;
            }
          }
        });

        const row = [
          areaDoc._id?.toString() || "",
          `"${(areaDoc.area_name || "").replace(/"/g, '""')}"`,
          `"${(areaDoc.state || "").replace(/"/g, '""')}"`,
          `"${(areaDoc.district || "").replace(/"/g, '""')}"`,
          areaDoc.pincode || "",
          areaDoc.status || "",
          `"${(areaDoc.address || "").replace(/"/g, '""')}"`,
          `"${(areaDoc.area_description || "").replace(/"/g, '""')}"`,
          areaDoc.latitude || "",
          areaDoc.longitude || "",
          areaDoc.sub_locations?.length || 0,
          totalMachines,
          totalImages,
          areaDoc.createdAt ? new Date(areaDoc.createdAt).toISOString() : "",
          areaDoc.updatedAt ? new Date(areaDoc.updatedAt).toISOString() : ""
        ];

        csv += row.join(",") + "\n";
      });

      // Add detailed sub-location information
      csv += "\n\n";
      csv += "Sub-location Details\n";
      csv += "Area Name,Sub-location Index,Campus,Tower,Floor,Machine ID,Machine Status,Total Images,Image URLs\n";

      areas.forEach(area => {
        const areaDoc = area.toObject ? area.toObject() : area;

        areaDoc.sub_locations?.forEach((subloc: any, idx: number) => {
          const machineId = subloc.select_machine?.machine_id || "No Machine";
          const machineStatus = subloc.select_machine?.status || "N/A";
          const totalImages = subloc.select_machine?.machine_image?.length || 0;
          const imageUrls = subloc.select_machine?.machine_image
            ?.map((img: any) => img.file_url)
            .filter(Boolean)
            .join("; ") || "";

          const row = [
            `"${areaDoc.area_name?.replace(/"/g, '""') || ""}"`,
            idx + 1,
            `"${(subloc.campus || "").replace(/"/g, '""')}"`,
            `"${(subloc.tower || "").replace(/"/g, '""')}"`,
            `"${(subloc.floor || "").replace(/"/g, '""')}"`,
            `"${machineId.replace(/"/g, '""')}"`,
            `"${machineStatus.replace(/"/g, '""')}"`,
            totalImages,
            `"${imageUrls.replace(/"/g, '""')}"`
          ];

          csv += row.join(",") + "\n";
        });
      });

      // Add summary
      csv += "\n\n";
      csv += "Export Summary\n";
      csv += "Total Areas Exported," + areas.length + "\n";
      csv += "Total Sub-locations," + areas.reduce((sum, area) =>
        sum + (area.sub_locations?.length || 0), 0) + "\n";
      csv += "Total Machines," + areas.reduce((sum, area) => {
        const areaDoc = area.toObject ? area.toObject() : area;
        return sum + (areaDoc.sub_locations?.filter((sl: any) =>
          sl.select_machine && sl.select_machine.machine_id).length || 0);
      }, 0) + "\n";
      csv += "Total Images," + areas.reduce((sum, area) => {
        const areaDoc = area.toObject ? area.toObject() : area;
        return sum + (areaDoc.sub_locations?.reduce((imgSum: number, sl: any) =>
          imgSum + (sl.select_machine?.machine_image?.length || 0), 0) || 0);
      }, 0) + "\n";
      csv += "Export Date," + new Date().toISOString() + "\n";

      return csv;
    } catch (error) {
      logger.error("Error generating detailed CSV:", error);
      return "Error generating detailed CSV data";
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



}