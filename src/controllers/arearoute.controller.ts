import { Request, Response } from "express";
import mongoose from "mongoose";
import {
  AreaService,
  AuditLogParams,
} from "../services/arearoute.service";
import { ImageUploadService } from "../services/areaFileUpload.service";
import { logger } from "../utils/logger.util";

// Import the new models
import { LocationModel, SubLocationModel, MachineDetailsModel, HistoryAreaModel, IMachineImageData } from "../models/AreaRoute.model"

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

  // CORRECTED createLocation method
  static async createLocation(req: Request, res: Response): Promise<void> {
    try {
      let locationData: any;

      // Parse request data
      try {
        if (req.body.data) {
          locationData = JSON.parse(req.body.data);
        } else {
          locationData = req.body;
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

      // Validate required fields for Location
      const requiredFields = [
        "area_name",
        "state",
        "district",
        "pincode",
        "area_description",
        "status",
      ];

      const missingFields = requiredFields.filter(field => !locationData[field]);
      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(", ")}`,
        });
        return;
      }

      // Create location
      const newLocation = new LocationModel(locationData);
      await newLocation.save();

      // Create audit log - Use AreaController.createAuditLog
      const auditParams = AreaController.getAuditParams(req);
      await AreaController.createAuditLog({
        location_id: newLocation._id,
        action: "CREATE",
        new_data: newLocation.toObject(),
        performed_by: {
          user_id: auditParams.userId,
          email: auditParams.userEmail,
          name: auditParams.userName,
        },
        ip_address: auditParams.ipAddress,
        user_agent: auditParams.userAgent,
        timestamp: new Date(),
      });

      res.status(201).json({
        success: true,
        message: "Location created successfully",
        data: newLocation,
      });
    } catch (error) {
      logger.error("Error creating location:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
// Also fix the addSubLocation method:
static async addSubLocation(req: Request, res: Response): Promise<void> {
  try {
    const { locationId } = req.params;
    let subLocationData: any;

    // Parse sub-location data
    if (req.body.data) {
      subLocationData = JSON.parse(req.body.data);
    } else {
      subLocationData = req.body;
    }

    // Validate required fields for SubLocation
    const requiredFields = ["campus", "tower", "floor", "select_machine"];
    const missingFields = requiredFields.filter(field => !subLocationData[field]);

    if (missingFields.length > 0) {
      res.status(400).json({
        success: false,
        message: `Missing required fields: ${missingFields.join(", ")}`,
      });
      return;
    }

    // Validate select_machine is an array
    if (!Array.isArray(subLocationData.select_machine) || subLocationData.select_machine.length === 0) {
      res.status(400).json({
        success: false,
        message: "select_machine must be a non-empty array",
      });
      return;
    }

    // Check if location exists
    const location = await LocationModel.findById(locationId);
    if (!location) {
      res.status(404).json({
        success: false,
        message: "Location not found",
      });
      return;
    }

    // Create sub-location
    const newSubLocation = new SubLocationModel({
      ...subLocationData,
      location_id: locationId,
    });
    await newSubLocation.save();

    // Create MachineDetails for each selected machine and collect their IDs
    const machineDetailsPromises = subLocationData.select_machine.map(async (machineName: string) => {
      const machineDetail = new MachineDetailsModel({
        machine_name: machineName,
        sub_location_id: newSubLocation._id,
        installed_status: "not_installed",
        status: "active",
        machine_image: [],
      });
      const savedMachine = await machineDetail.save();
      return {
        id: savedMachine._id,
        machine_name: savedMachine.machine_name,
        installed_status: savedMachine.installed_status,
        status: savedMachine.status,
        sub_location_id: savedMachine.sub_location_id,
      };
    });

    const createdMachines = await Promise.all(machineDetailsPromises);

    // Create audit log - Fixed
    const auditParams = AreaController.getAuditParams(req);
    await AreaController.createAuditLog({
      location_id: new mongoose.Types.ObjectId(locationId),
      action: "ADD_SUB_LOCATION",
      new_data: {
        sub_location: newSubLocation.toObject(),
        added_machines: subLocationData.select_machine,
        machine_ids: createdMachines.map(m => m.id),
      },
      performed_by: {
        user_id: auditParams.userId,
        email: auditParams.userEmail,
        name: auditParams.userName,
      },
      ip_address: auditParams.ipAddress,
      user_agent: auditParams.userAgent,
      timestamp: new Date(),
    });

    res.status(201).json({
      success: true,
      message: "Sub-location added successfully",
      data: {
        subLocation: {
          id: newSubLocation._id,
          campus: newSubLocation.campus,
          tower: newSubLocation.tower,
          floor: newSubLocation.floor,
          select_machine: newSubLocation.select_machine,
          location_id: newSubLocation.location_id,
          created_at: newSubLocation.createdAt,
          updated_at: newSubLocation.updatedAt,
        },
        machines_added: createdMachines,
        total_machines_added: createdMachines.length,
      },
    });
  } catch (error) {
    logger.error("Error adding sub-location:", error);
    res.status(500).json({
      success: false,
      message: error.message || "Internal server error",
    });
  }
}
  // UPDATE THE HELPER METHOD - Make it static
  private static async createAuditLog(data: {
    location_id: mongoose.Types.ObjectId;
    action: "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE" | "ADD_SUB_LOCATION" | "REMOVE_MACHINE";
    old_data?: any;
    new_data?: any;
    changes?: Record<string, { old: any; new: any }>;
    performed_by: {
      user_id: string;
      email: string;
      name?: string;
    };
    ip_address?: string;
    user_agent?: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      const auditLog = new HistoryAreaModel({
        location_id: data.location_id,
        action: data.action,
        old_data: data.old_data,
        new_data: data.new_data,
        changes: data.changes || null,
        performed_by: data.performed_by,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        timestamp: data.timestamp || new Date(),
      });
      await auditLog.save();
    } catch (error) {
      logger.error("Error creating audit log:", error);
    }
  }

  // UPDATE MACHINE DETAILS (status, installed_status, machine_image)
  static async updateMachineDetails(req: Request, res: Response): Promise<void> {
    try {
      const { machineDetailsId } = req.params;
      const updateData = req.body;
      const files = req.files as Express.Multer.File[] | undefined;

      console.log("=== DEBUG: updateMachineDetails called ===");
      console.log("Machine Details ID:", machineDetailsId);
      console.log("Update Data:", JSON.stringify(updateData, null, 2));
      console.log("Files received:", files ? files.length : 0);

      // Validate update data
      if (updateData.installed_status && !["installed", "not_installed"].includes(updateData.installed_status)) {
        res.status(400).json({
          success: false,
          message: "installed_status must be either 'installed' or 'not_installed'",
        });
        return;
      }

      if (updateData.status && !["active", "inactive"].includes(updateData.status)) {
        res.status(400).json({
          success: false,
          message: "status must be either 'active' or 'inactive'",
        });
        return;
      }

      // Get current machine details
      const currentMachine = await MachineDetailsModel.findById(machineDetailsId)
        .populate({
          path: 'sub_location_id',
          populate: {
            path: 'location_id',
          }
        });

      if (!currentMachine) {
        res.status(404).json({
          success: false,
          message: "Machine details not found",
        });
        return;
      }

      const oldData = { ...currentMachine.toObject() };
      let processedFiles: IMachineImageData[] = [];
      let changes: Record<string, { old: any; new: any }> = {};

      // Process file uploads if any
      if (files && files.length > 0) {
        console.log("Processing file uploads...");

        const uploadService = new ImageUploadService();
        processedFiles = await uploadService.uploadMultipleFiles(
          files,
          "machine_images",
          "areaMachine"
        );

        console.log("Files processed:", processedFiles.length);

        // Add uploaded files to machine images
        if (!updateData.machine_image || !Array.isArray(updateData.machine_image)) {
          updateData.machine_image = [];
        }

        // Add new files to existing images
        updateData.machine_image = [...(currentMachine.machine_image || []), ...processedFiles];

        // Record image changes
        changes["machine_image"] = {
          old: oldData.machine_image?.length || 0,
          new: updateData.machine_image.length
        };
      }

      // Handle machine_image if provided in request body (for reordering or removing images)
      if (updateData.machine_image && Array.isArray(updateData.machine_image)) {
        console.log("Machine image array provided in request");
        // The array will be replaced with what's provided
      }

      // Update machine details
      const updatedMachine = await MachineDetailsModel.findByIdAndUpdate(
        machineDetailsId,
        updateData,
        { new: true }
      ).populate({
        path: 'sub_location_id',
        populate: {
          path: 'location_id',
        }
      });

      if (!updatedMachine) {
        res.status(404).json({
          success: false,
          message: "Failed to update machine details",
        });
        return;
      }

      // Get location ID for audit log
      const subLocation = await SubLocationModel.findById(updatedMachine.sub_location_id);
      const locationId = subLocation?.location_id;

      // Add other changes to audit log
      if (updateData.installed_status && updateData.installed_status !== oldData.installed_status) {
        changes["machine.installed_status"] = {
          old: oldData.installed_status,
          new: updateData.installed_status,
        };
      }

      if (updateData.status && updateData.status !== oldData.status) {
        changes["machine.status"] = {
          old: oldData.status,
          new: updateData.status,
        };
      }

      // Create audit log if there are changes
      if (Object.keys(changes).length > 0) {
        const auditParams = AreaController.getAuditParams(req);
        await AreaController.createAuditLog({
          location_id: locationId,
          action: "UPDATE",
          changes: changes,
          new_data: processedFiles.length > 0 ? {
            added_images: processedFiles.map(f => f.image_name)
          } : undefined,
          performed_by: {
            user_id: auditParams.userId,
            email: auditParams.userEmail,
            name: auditParams.userName,
          },
          ip_address: auditParams.ipAddress,
          user_agent: auditParams.userAgent,
          timestamp: new Date(),
        });
      }

      res.status(200).json({
        success: true,
        message: "Machine details updated successfully" +
          (processedFiles.length > 0 ? ` with ${processedFiles.length} new image(s)` : ""),
        data: updatedMachine,
        changes: processedFiles.length > 0 ? {
          images_added: processedFiles.length,
          image_names: processedFiles.map(f => f.image_name)
        } : undefined,
      });
    } catch (error) {
      logger.error("Error updating machine details:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // GET ALL LOCATIONS WITH SUB-LOCATIONS AND MACHINES
  static async getAllLocations(req: Request, res: Response): Promise<void> {
    try {
      const queryParams: any = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        status: req.query.status as string,
        state: req.query.state as string,
        district: req.query.district as string,
        search: req.query.search as string,
      };

      // Build query
      const query: any = {};
      if (queryParams.status && queryParams.status !== 'all') {
        query.status = queryParams.status;
      }
      if (queryParams.state) {
        query.state = new RegExp(queryParams.state, 'i');
      }
      if (queryParams.district) {
        query.district = new RegExp(queryParams.district, 'i');
      }
      if (queryParams.search) {
        query.$or = [
          { area_name: new RegExp(queryParams.search, 'i') },
          { state: new RegExp(queryParams.search, 'i') },
          { district: new RegExp(queryParams.search, 'i') },
        ];
      }

      // Get locations with pagination
      const skip = (queryParams.page - 1) * queryParams.limit;
      const [locations, total] = await Promise.all([
        LocationModel.find(query)
          .skip(skip)
          .limit(queryParams.limit)
          .sort({ createdAt: -1 }),
        LocationModel.countDocuments(query),
      ]);

      // Get sub-locations and machines for each location
      const enrichedLocations = await Promise.all(
        locations.map(async (location) => {
          const subLocations = await SubLocationModel.find({ location_id: location._id });

          // Get machine details for each sub-location
          const subLocationsWithMachines = await Promise.all(
            subLocations.map(async (subLoc) => {
              const machineDetails = await MachineDetailsModel.find({
                sub_location_id: subLoc._id
              });
              return {
                ...subLoc.toObject(),
                machines: machineDetails,
              };
            })
          );

          // Calculate summary
          const totalMachines = subLocationsWithMachines.reduce(
            (sum, subLoc) => sum + subLoc.machines.length, 0
          );
          const installedMachines = subLocationsWithMachines.reduce(
            (sum, subLoc) => sum + subLoc.machines.filter((m: any) =>
              m.installed_status === 'installed'
            ).length, 0
          );
          const activeMachines = subLocationsWithMachines.reduce(
            (sum, subLoc) => sum + subLoc.machines.filter((m: any) =>
              m.status === 'active'
            ).length, 0
          );

          return {
            ...location.toObject(),
            sub_locations: subLocationsWithMachines,
            summary: {
              total_sub_locations: subLocationsWithMachines.length,
              total_machines: totalMachines,
              installed_machines: installedMachines,
              not_installed_machines: totalMachines - installedMachines,
              active_machines: activeMachines,
              inactive_machines: totalMachines - activeMachines,
            },
          };
        })
      );

      res.status(200).json({
        success: true,
        data: enrichedLocations,
        pagination: {
          currentPage: queryParams.page,
          totalItems: total,
          totalPages: Math.ceil(total / queryParams.limit),
          itemsPerPage: queryParams.limit,
        },
      });
    } catch (error) {
      logger.error("Error fetching locations:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // GET SINGLE LOCATION WITH FULL DETAILS
  static async getLocationById(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      const location = await LocationModel.findById(locationId);
      if (!location) {
        res.status(404).json({
          success: false,
          message: "Location not found",
        });
        return;
      }

      // Get sub-locations
      const subLocations = await SubLocationModel.find({ location_id: locationId });

      // Get machine details for each sub-location
      const subLocationsWithMachines = await Promise.all(
        subLocations.map(async (subLoc) => {
          const machineDetails = await MachineDetailsModel.find({
            sub_location_id: subLoc._id
          });
          return {
            ...subLoc.toObject(),
            machines: machineDetails,
          };
        })
      );

      // Calculate summary
      const totalMachines = subLocationsWithMachines.reduce(
        (sum, subLoc) => sum + subLoc.machines.length, 0
      );
      const installedMachines = subLocationsWithMachines.reduce(
        (sum, subLoc) => sum + subLoc.machines.filter((m: any) =>
          m.installed_status === 'installed'
        ).length, 0
      );
      const activeMachines = subLocationsWithMachines.reduce(
        (sum, subLoc) => sum + subLoc.machines.filter((m: any) =>
          m.status === 'active'
        ).length, 0
      );

      const enrichedLocation = {
        ...location.toObject(),
        sub_locations: subLocationsWithMachines,
        summary: {
          total_sub_locations: subLocationsWithMachines.length,
          total_machines: totalMachines,
          installed_machines: installedMachines,
          not_installed_machines: totalMachines - installedMachines,
          active_machines: activeMachines,
          inactive_machines: totalMachines - activeMachines,
        },
      };

      res.status(200).json({
        success: true,
        data: enrichedLocation,
      });
    } catch (error) {
      logger.error("Error fetching location:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
  // UPDATE LOCATION - CORRECTED
  static async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const updateData = req.body;

      // Validate location ID
      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        res.status(400).json({
          success: false,
          message: "Invalid location ID format",
        });
        return;
      }

      // Get current location
      const currentLocation = await LocationModel.findById(locationId);
      if (!currentLocation) {
        res.status(404).json({
          success: false,
          message: "Location not found",
        });
        return;
      }

      const oldData = { ...currentLocation.toObject() };

      // Update location
      const updatedLocation = await LocationModel.findByIdAndUpdate(
        locationId,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedLocation) {
        res.status(404).json({
          success: false,
          message: "Failed to update location",
        });
        return;
      }

      // Create changes object for audit log
      const changes: Record<string, { old: any; new: any }> = {};
      Object.keys(updateData).forEach(key => {
        if (JSON.stringify(oldData[key]) !== JSON.stringify(updateData[key])) {
          changes[key] = {
            old: oldData[key],
            new: updateData[key],
          };
        }
      });

      // Create audit log if there are changes
      if (Object.keys(changes).length > 0) {
        const auditParams = AreaController.getAuditParams(req);

        // FIXED: Use AreaController.createAuditLog instead of this.createAuditLog
        await AreaController.createAuditLog({
          location_id: new mongoose.Types.ObjectId(locationId),
          action: "UPDATE",
          changes: changes,
          performed_by: {
            user_id: auditParams.userId,
            email: auditParams.userEmail,
            name: auditParams.userName,
          },
          ip_address: auditParams.ipAddress,
          user_agent: auditParams.userAgent,
          timestamp: new Date(),
        });
      }

      res.status(200).json({
        success: true,
        message: "Location updated successfully",
        data: updatedLocation,
      });
    } catch (error) {
      logger.error("Error updating location:", error);

      // Handle validation errors
      if (error instanceof mongoose.Error.ValidationError) {
        const errorMessages = Object.values(error.errors).map(err => err.message);
        res.status(400).json({
          success: false,
          message: `Validation failed: ${errorMessages.join(", ")}`,
        });
        return;
      }

      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
  // DELETE LOCATION (cascading delete) - CORRECTED
  static async deleteLocation(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      // Validate location ID
      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        res.status(400).json({
          success: false,
          message: "Invalid location ID",
        });
        return;
      }

      const location = await LocationModel.findById(locationId);
      if (!location) {
        res.status(404).json({
          success: false,
          message: "Location not found",
        });
        return;
      }

      // Get all sub-locations for this location
      const subLocations = await SubLocationModel.find({ location_id: locationId });

      // Get all machine details for these sub-locations
      const machineDetailsIds: mongoose.Types.ObjectId[] = [];
      for (const subLoc of subLocations) {
        const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });
        machineDetailsIds.push(...machines.map(m => m._id));
      }

      // Delete machine details
      await MachineDetailsModel.deleteMany({ _id: { $in: machineDetailsIds } });

      // Delete sub-locations
      await SubLocationModel.deleteMany({ location_id: locationId });

      // Delete location
      await LocationModel.findByIdAndDelete(locationId);

      // Create audit log - FIXED
      const auditParams = AreaController.getAuditParams(req);
      await AreaController.createAuditLog({
        location_id: new mongoose.Types.ObjectId(locationId),
        action: "DELETE",
        old_data: location.toObject(),
        performed_by: {
          user_id: auditParams.userId,
          email: auditParams.userEmail,
          name: auditParams.userName,
        },
        ip_address: auditParams.ipAddress,
        user_agent: auditParams.userAgent,
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: "Location and all associated data deleted successfully",
      });
    } catch (error) {
      logger.error("Error deleting location:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
  // TOGGLE LOCATION STATUS - CORRECTED
  static async toggleLocationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      // Validate location ID
      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        res.status(400).json({
          success: false,
          message: "Invalid location ID format",
        });
        return;
      }

      const location = await LocationModel.findById(locationId);
      if (!location) {
        res.status(404).json({
          success: false,
          message: "Location not found",
        });
        return;
      }

      const oldStatus = location.status;
      const newStatus = oldStatus === "active" ? "inactive" : "active";

      const updatedLocation = await LocationModel.findByIdAndUpdate(
        locationId,
        { status: newStatus },
        { new: true }
      );

      if (!updatedLocation) {
        res.status(500).json({
          success: false,
          message: "Failed to update location status",
        });
        return;
      }

      // Create audit log - FIXED: Use AreaController.createAuditLog
      const auditParams = AreaController.getAuditParams(req);
      await AreaController.createAuditLog({
        location_id: new mongoose.Types.ObjectId(locationId),
        action: "STATUS_CHANGE",
        changes: {
          status: {
            old: oldStatus,
            new: newStatus,
          },
        },
        performed_by: {
          user_id: auditParams.userId,
          email: auditParams.userEmail,
          name: auditParams.userName,
        },
        ip_address: auditParams.ipAddress,
        user_agent: auditParams.userAgent,
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: `Location status changed from ${oldStatus} to ${newStatus}`,
        data: updatedLocation,
      });
    } catch (error) {
      logger.error("Error toggling location status:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
  // REMOVE MACHINE FROM SUB-LOCATION - CORRECTED
  static async removeMachine(req: Request, res: Response): Promise<void> {
    try {
      const { machineDetailsId } = req.params;

      // Validate machine details ID
      if (!mongoose.Types.ObjectId.isValid(machineDetailsId)) {
        res.status(400).json({
          success: false,
          message: "Invalid machine details ID",
        });
        return;
      }

      const machineDetails = await MachineDetailsModel.findById(machineDetailsId)
        .populate({
          path: 'sub_location_id',
          populate: {
            path: 'location_id',
          }
        });

      if (!machineDetails) {
        res.status(404).json({
          success: false,
          message: "Machine not found",
        });
        return;
      }

      const subLocation = await SubLocationModel.findById(machineDetails.sub_location_id);
      const locationId = subLocation?.location_id;
      const machineName = machineDetails.machine_name;

      // Delete machine images from cloud storage if any
      if (machineDetails.machine_image && machineDetails.machine_image.length > 0) {
        const uploadService = new ImageUploadService();
        for (const image of machineDetails.machine_image) {
          try {
            await uploadService.deleteFromCloudinary(image.cloudinary_public_id);
          } catch (error) {
            logger.error(`Failed to delete image ${image.cloudinary_public_id}:`, error);
          }
        }
      }

      // Delete machine details
      await MachineDetailsModel.findByIdAndDelete(machineDetailsId);

      // Create audit log - FIXED: Use AreaController.createAuditLog
      const auditParams = AreaController.getAuditParams(req);
      await AreaController.createAuditLog({
        location_id: locationId,
        action: "REMOVE_MACHINE",
        changes: {
          removed_machine: {
            old: {
              machine_name: machineName,
              machine_id: machineDetailsId,
              images_count: machineDetails.machine_image.length,
            },
            new: null,
          },
        },
        performed_by: {
          user_id: auditParams.userId,
          email: auditParams.userEmail,
          name: auditParams.userName,
        },
        ip_address: auditParams.ipAddress,
        user_agent: auditParams.userAgent,
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: `Machine "${machineName}" removed successfully`,
        data: {
          machine_id: machineDetailsId,
          machine_name: machineName,
          images_deleted: machineDetails.machine_image.length,
          sub_location: subLocation ? {
            campus: subLocation.campus,
            tower: subLocation.tower,
            floor: subLocation.floor,
          } : null,
        },
      });
    } catch (error) {
      logger.error("Error removing machine:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // GET AUDIT LOGS FOR LOCATION
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        res.status(400).json({
          success: false,
          message: "Invalid location ID",
        });
        return;
      }

      const skip = (page - 1) * limit;

      const [logs, total] = await Promise.all([
        HistoryAreaModel.find({ location_id: locationId })
          .sort({ timestamp: -1 })
          .skip(skip)
          .limit(limit),
        HistoryAreaModel.countDocuments({ location_id: locationId }),
      ]);

      res.status(200).json({
        success: true,
        data: {
          logs: logs,
          pagination: {
            currentPage: page,
            totalItems: total,
            totalPages: Math.ceil(total / limit),
            itemsPerPage: limit,
          },
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

  // GET RECENT ACTIVITIES
  static async getRecentActivities(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;

      const activities = await HistoryAreaModel.find()
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate({
          path: 'location_id',
          select: 'area_name state district',
        });

      res.status(200).json({
        success: false,
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

  // DASHBOARD DATA
  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const params: any = {
        status: (req.query.status as "active" | "inactive" | "all") || "all",
        state: req.query.state as string,
        district: req.query.district as string,
        search: req.query.search as string,
      };

      // Build query
      const query: any = {};
      if (params.status && params.status !== 'all') {
        query.status = params.status;
      }
      if (params.state) {
        query.state = new RegExp(params.state, 'i');
      }
      if (params.district) {
        query.district = new RegExp(params.district, 'i');
      }
      if (params.search) {
        query.$or = [
          { area_name: new RegExp(params.search, 'i') },
          { state: new RegExp(params.search, 'i') },
          { district: new RegExp(params.search, 'i') },
        ];
      }

      // Get locations
      const locations = await LocationModel.find(query);

      // Calculate statistics
      let totalLocations = 0;
      let activeLocations = 0;
      let inactiveLocations = 0;
      let totalMachines = 0;
      let installedMachines = 0;
      let activeMachines = 0;

      for (const location of locations) {
        totalLocations++;
        if (location.status === 'active') activeLocations++;
        if (location.status === 'inactive') inactiveLocations++;

        // Get sub-locations for this location
        const subLocations = await SubLocationModel.find({ location_id: location._id });

        for (const subLoc of subLocations) {
          // Get machine details for this sub-location
          const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });
          totalMachines += machines.length;

          installedMachines += machines.filter(m => m.installed_status === 'installed').length;
          activeMachines += machines.filter(m => m.status === 'active').length;
        }
      }

      res.status(200).json({
        success: true,
        data: {
          statistics: {
            total_locations: totalLocations,
            active_locations: activeLocations,
            inactive_locations: inactiveLocations,
            total_machines: totalMachines,
            installed_machines: installedMachines,
            not_installed_machines: totalMachines - installedMachines,
            active_machines: activeMachines,
            inactive_machines: totalMachines - activeMachines,
          },
          locations: locations.slice(0, 10), // Return first 10 for preview
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


  // TOGGLE MACHINE STATUS (active ↔ inactive) - CORRECTED
  static async toggleMachineStatus(req: Request, res: Response): Promise<void> {
    try {
      const { machineDetailsId } = req.params;

      const machineDetails = await MachineDetailsModel.findById(machineDetailsId)
        .populate({
          path: 'sub_location_id',
          populate: {
            path: 'location_id',
          }
        });

      if (!machineDetails) {
        res.status(404).json({
          success: false,
          message: "Machine not found",
        });
        return;
      }

      const oldStatus = machineDetails.status;
      const newStatus = oldStatus === "active" ? "inactive" : "active";

      const updatedMachine = await MachineDetailsModel.findByIdAndUpdate(
        machineDetailsId,
        { status: newStatus },
        { new: true }
      ).populate({
        path: 'sub_location_id',
        populate: {
          path: 'location_id',
        }
      });

      // Get location ID for audit log
      const subLocation = await SubLocationModel.findById(updatedMachine?.sub_location_id);
      const locationId = subLocation?.location_id;

      // Create audit log - FIXED: Use AreaController.createAuditLog
      const auditParams = AreaController.getAuditParams(req);
      await AreaController.createAuditLog({
        location_id: locationId,
        action: "UPDATE",
        changes: {
          "machine.status": {
            old: oldStatus,
            new: newStatus,
          },
        },
        performed_by: {
          user_id: auditParams.userId,
          email: auditParams.userEmail,
          name: auditParams.userName,
        },
        ip_address: auditParams.ipAddress,
        user_agent: auditParams.userAgent,
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: `Machine status changed from ${oldStatus} to ${newStatus}`,
        data: updatedMachine,
      });
    } catch (error) {
      logger.error("Error toggling machine status:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
  // TOGGLE MACHINE INSTALLED STATUS (installed ↔ not_installed)
  static async toggleMachineInstalledStatus(req: Request, res: Response): Promise<void> {
    try {
      const { machineDetailsId } = req.params;

      const machineDetails = await MachineDetailsModel.findById(machineDetailsId)
        .populate({
          path: 'sub_location_id',
          populate: {
            path: 'location_id',
          }
        });

      if (!machineDetails) {
        res.status(404).json({
          success: false,
          message: "Machine not found",
        });
        return;
      }

      const oldInstalledStatus = machineDetails.installed_status;
      const newInstalledStatus = oldInstalledStatus === "installed" ? "not_installed" : "installed";

      const updatedMachine = await MachineDetailsModel.findByIdAndUpdate(
        machineDetailsId,
        { installed_status: newInstalledStatus },
        { new: true }
      ).populate({
        path: 'sub_location_id',
        populate: {
          path: 'location_id',
        }
      });

      // Get location ID for audit log
      const subLocation = await SubLocationModel.findById(updatedMachine?.sub_location_id);
      const locationId = subLocation?.location_id;

      // Create audit log - FIXED: Use AreaController.createAuditLog instead of this.createAuditLog
      const auditParams = AreaController.getAuditParams(req);
      await AreaController.createAuditLog({
        location_id: locationId,
        action: "UPDATE",
        changes: {
          "machine.installed_status": {
            old: oldInstalledStatus,
            new: newInstalledStatus,
          },
        },
        performed_by: {
          user_id: auditParams.userId,
          email: auditParams.userEmail,
          name: auditParams.userName,
        },
        ip_address: auditParams.ipAddress,
        user_agent: auditParams.userAgent,
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: `Machine installed status changed from ${oldInstalledStatus} to ${newInstalledStatus}`,
        data: updatedMachine,
      });
    } catch (error) {
      logger.error("Error toggling machine installed status:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
  // GET ALL SUB-LOCATIONS FOR A LOCATION
  static async getSubLocationsByLocationId(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        res.status(400).json({
          success: false,
          message: "Invalid location ID",
        });
        return;
      }

      // Check if location exists
      const location = await LocationModel.findById(locationId);
      if (!location) {
        res.status(404).json({
          success: false,
          message: "Location not found",
        });
        return;
      }

      // Get sub-locations with their machines
      const subLocations = await SubLocationModel.find({ location_id: locationId });

      const subLocationsWithMachines = await Promise.all(
        subLocations.map(async (subLoc) => {
          const machines = await MachineDetailsModel.find({
            sub_location_id: subLoc._id
          });
          return {
            ...subLoc.toObject(),
            machines: machines,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: {
          location: {
            id: location._id,
            area_name: location.area_name,
            state: location.state,
            district: location.district,
          },
          sub_locations: subLocationsWithMachines,
          total: subLocationsWithMachines.length,
        },
      });
    } catch (error) {
      logger.error("Error fetching sub-locations:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
  // DELETE SUB-LOCATION (cascading delete) - CORRECTED
  static async deleteSubLocation(req: Request, res: Response): Promise<void> {
    try {
      const { subLocationId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(subLocationId)) {
        res.status(400).json({
          success: false,
          message: "Invalid sub-location ID",
        });
        return;
      }

      const subLocation = await SubLocationModel.findById(subLocationId);
      if (!subLocation) {
        res.status(404).json({
          success: false,
          message: "Sub-location not found",
        });
        return;
      }

      const locationId = subLocation.location_id;

      // Get all machine details for this sub-location
      const machines = await MachineDetailsModel.find({ sub_location_id: subLocationId });
      const machineIds = machines.map(m => m._id);

      // Delete machine images from cloud storage
      const uploadService = new ImageUploadService();
      for (const machine of machines) {
        if (machine.machine_image && machine.machine_image.length > 0) {
          for (const image of machine.machine_image) {
            try {
              await uploadService.deleteFromCloudinary(image.cloudinary_public_id);
            } catch (error) {
              logger.error(`Failed to delete image ${image.cloudinary_public_id}:`, error);
            }
          }
        }
      }

      // Delete machine details
      await MachineDetailsModel.deleteMany({ _id: { $in: machineIds } });

      // Delete sub-location
      await SubLocationModel.findByIdAndDelete(subLocationId);

      // Create audit log - FIXED: Use AreaController.createAuditLog
      const auditParams = AreaController.getAuditParams(req);
      await AreaController.createAuditLog({
        location_id: new mongoose.Types.ObjectId(locationId.toString()),
        action: "REMOVE_MACHINE",
        changes: {
          removed_sub_location: {
            old: {
              campus: subLocation.campus,
              tower: subLocation.tower,
              floor: subLocation.floor,
              machines_count: machines.length,
            },
            new: null,
          },
        },
        performed_by: {
          user_id: auditParams.userId,
          email: auditParams.userEmail,
          name: auditParams.userName,
        },
        ip_address: auditParams.ipAddress,
        user_agent: auditParams.userAgent,
        timestamp: new Date(),
      });

      res.status(200).json({
        success: true,
        message: `Sub-location "${subLocation.campus} - ${subLocation.tower} - ${subLocation.floor}" and all associated machines deleted successfully`,
        data: {
          sub_location_id: subLocationId,
          machines_deleted: machines.length,
        },
      });
    } catch (error) {
      logger.error("Error deleting sub-location:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
  // UPDATE SUB-LOCATION
  static async updateSubLocation(req: Request, res: Response): Promise<void> {
    try {
      const { subLocationId } = req.params;
      const updateData = req.body;

      if (!mongoose.Types.ObjectId.isValid(subLocationId)) {
        res.status(400).json({
          success: false,
          message: "Invalid sub-location ID",
        });
        return;
      }

      // Validate update data
      if (updateData.select_machine && !Array.isArray(updateData.select_machine)) {
        res.status(400).json({
          success: false,
          message: "select_machine must be an array",
        });
        return;
      }

      if (updateData.select_machine && updateData.select_machine.length === 0) {
        res.status(400).json({
          success: false,
          message: "select_machine array cannot be empty",
        });
        return;
      }

      const auditParams = AreaController.getAuditParams(req);
      const result = await AreaService.updateSubLocation(
        subLocationId,
        updateData,
        auditParams
      );

      if (!result) {
        res.status(404).json({
          success: false,
          message: "Failed to update sub-location",
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Sub-location updated successfully",
        data: {
          subLocation: result.subLocation,
          changes: {
            added_machines: result.addedMachines,
            removed_machines: result.removedMachines,
            total_machines: result.subLocation.select_machine.length
          }
        },
      });
    } catch (error) {
      logger.error("Error updating sub-location:", error);

      const statusCode = error.message.includes("not found") ? 404 :
        error.message.includes("Invalid") ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // EXPORT SUB-LOCATIONS BY LOCATION ID
  static async exportSubLocationsByLocationId(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const format = (req.query.format as string) || "csv";

      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        res.status(400).json({
          success: false,
          message: "Invalid location ID",
        });
        return;
      }

      const result = await AreaService.exportSubLocationsByLocationId(locationId, format);

      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);

      if (format === "csv") {
        res.status(200).send(result.data);
      } else {
        res.status(200).json({
          success: true,
          ...result.data
        });
      }
    } catch (error) {
      logger.error("Error exporting sub-locations:", error);

      const statusCode = error.message.includes("not found") ? 404 :
        error.message.includes("Invalid") ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // GET AUDIT LOGS BY SUB-LOCATION ID
  static async getAuditLogsBySubLocationId(req: Request, res: Response): Promise<void> {
    try {
      const { subLocationId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!mongoose.Types.ObjectId.isValid(subLocationId)) {
        res.status(400).json({
          success: false,
          message: "Invalid sub-location ID",
        });
        return;
      }

      const result = await AreaService.getAuditLogsBySubLocationId(subLocationId, page, limit);

      // Enrich logs with sub-location information
      const subLocation = await SubLocationModel.findById(subLocationId);
      const enrichedLogs = result.logs.map(log => {
        const logObj = log.toObject ? log.toObject() : log;

        // Extract sub-location specific changes
        let subLocationChanges = [];
        if (logObj.changes) {
          Object.keys(logObj.changes).forEach(key => {
            if (['campus', 'tower', 'floor', 'select_machine'].includes(key)) {
              subLocationChanges.push({
                field: key,
                old: logObj.changes[key].old,
                new: logObj.changes[key].new
              });
            }
          });
        }

        return {
          ...logObj,
          sub_location_info: {
            id: subLocation?._id,
            campus: subLocation?.campus,
            tower: subLocation?.tower,
            floor: subLocation?.floor
          },
          sub_location_changes: subLocationChanges.length > 0 ? subLocationChanges : undefined,
          is_sub_location_related: subLocationChanges.length > 0
        };
      });

      res.status(200).json({
        success: true,
        data: {
          logs: enrichedLogs,
          sub_location: subLocation ? {
            id: subLocation._id,
            campus: subLocation.campus,
            tower: subLocation.tower,
            floor: subLocation.floor
          } : null,
          pagination: result.pagination,
          summary: {
            total_logs: result.pagination.totalItems,
            sub_location_related_logs: enrichedLogs.filter(log => log.is_sub_location_related).length
          }
        },
      });
    } catch (error) {
      logger.error("Error fetching sub-location audit logs:", error);

      const statusCode = error.message.includes("not found") ? 404 :
        error.message.includes("Invalid") ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
  // GET MACHINE DETAILS BY SUB-LOCATION
  static async getMachineDetailsBySubLocationId(req: Request, res: Response): Promise<void> {
    try {
      const { subLocationId } = req.params;

      if (!mongoose.Types.ObjectId.isValid(subLocationId)) {
        res.status(400).json({
          success: false,
          message: "Invalid sub-location ID",
        });
        return;
      }

      // Check if sub-location exists
      const subLocation = await SubLocationModel.findById(subLocationId);
      if (!subLocation) {
        res.status(404).json({
          success: false,
          message: "Sub-location not found",
        });
        return;
      }

      // Get machine details
      const machineDetails = await MachineDetailsModel.find({
        sub_location_id: subLocationId
      });

      // Get location info
      const location = await LocationModel.findById(subLocation.location_id);

      res.status(200).json({
        success: true,
        data: {
          sub_location: {
            id: subLocation._id,
            campus: subLocation.campus,
            tower: subLocation.tower,
            floor: subLocation.floor,
            location_info: location ? {
              id: location._id,
              area_name: location.area_name,
              state: location.state,
              district: location.district,
            } : null,
          },
          machines: machineDetails,
          total: machineDetails.length,
          summary: {
            installed_machines: machineDetails.filter(m => m.installed_status === 'installed').length,
            not_installed_machines: machineDetails.filter(m => m.installed_status === 'not_installed').length,
            active_machines: machineDetails.filter(m => m.status === 'active').length,
            inactive_machines: machineDetails.filter(m => m.status === 'inactive').length,
          },
        },
      });
    } catch (error) {
      logger.error("Error fetching machine details:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // REMOVE IMAGE FROM MACHINE
  static async removeMachineImage(req: Request, res: Response): Promise<void> {
    try {
      const { machineDetailsId, imageIndex } = req.params;
      const index = parseInt(imageIndex);

      if (!mongoose.Types.ObjectId.isValid(machineDetailsId)) {
        res.status(400).json({
          success: false,
          message: "Invalid machine details ID",
        });
        return;
      }

      if (isNaN(index) || index < 0) {
        res.status(400).json({
          success: false,
          message: "Invalid image index",
        });
        return;
      }

      const machineDetails = await MachineDetailsModel.findById(machineDetailsId)
        .populate({
          path: 'sub_location_id',
          populate: {
            path: 'location_id',
          }
        });

      if (!machineDetails) {
        res.status(404).json({
          success: false,
          message: "Machine details not found",
        });
        return;
      }

      if (machineDetails.machine_image.length <= index) {
        res.status(404).json({
          success: false,
          message: "Image not found at the specified index",
        });
        return;
      }

      const imageToRemove = machineDetails.machine_image[index];
      const oldImages = [...machineDetails.machine_image];

      // Remove the image from array
      machineDetails.machine_image.splice(index, 1);
      const updatedMachine = await machineDetails.save();

      // Delete from cloud storage
      const uploadService = new ImageUploadService();
      try {
        await uploadService.deleteFromCloudinary(imageToRemove.cloudinary_public_id);
      } catch (error) {
        logger.error("Failed to delete image from cloud storage:", error);
      }

      // Get location ID for audit log
      const subLocation = await SubLocationModel.findById(machineDetails.sub_location_id);
      const locationId = subLocation?.location_id;

      // Create audit log
      if (locationId) {
        const auditParams = AreaController.getAuditParams(req);
        await this.createAuditLog({
          location_id: new mongoose.Types.ObjectId(locationId.toString()),
          action: "UPDATE",
          changes: {
            removed_image: {
              old: imageToRemove.image_name,
              new: null
            },
            remaining_images: {
              old: oldImages.length,
              new: updatedMachine.machine_image.length
            }
          },
          performed_by: {
            user_id: auditParams.userId,
            email: auditParams.userEmail,
            name: auditParams.userName,
          },
          ip_address: auditParams.ipAddress,
          user_agent: auditParams.userAgent,
          timestamp: new Date(),
        });
      }

      res.status(200).json({
        success: true,
        message: `Image "${imageToRemove.image_name}" removed successfully`,
        data: {
          machine: updatedMachine,
          image_removed: imageToRemove,
        },
      });
    } catch (error) {
      logger.error("Error removing machine image:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // SEARCH MACHINES
  static async searchMachines(req: Request, res: Response): Promise<void> {
    try {
      const searchTerm = req.query.q as string;

      if (!searchTerm || searchTerm.trim() === '') {
        res.status(400).json({
          success: false,
          message: "Search term is required",
        });
        return;
      }

      const searchRegex = new RegExp(searchTerm, 'i');

      // Search in machine details
      const machines = await MachineDetailsModel.find({
        $or: [
          { machine_name: searchRegex },
        ]
      })
        .populate({
          path: 'sub_location_id',
          populate: {
            path: 'location_id',
            select: 'area_name state district'
          }
        })
        .limit(50);

      const enrichedMachines = machines.map(machine => ({
        id: machine._id,
        machine_name: machine.machine_name,
        installed_status: machine.installed_status,
        status: machine.status,
        images_count: machine.machine_image.length,
        sub_location: machine.sub_location_id ? {
          id: (machine.sub_location_id as any)._id,
          campus: (machine.sub_location_id as any).campus,
          tower: (machine.sub_location_id as any).tower,
          floor: (machine.sub_location_id as any).floor,
        } : null,
        location: (machine.sub_location_id as any)?.location_id ? {
          id: (machine.sub_location_id as any).location_id._id,
          area_name: (machine.sub_location_id as any).location_id.area_name,
          state: (machine.sub_location_id as any).location_id.state,
          district: (machine.sub_location_id as any).location_id.district,
        } : null,
      }));

      res.status(200).json({
        success: true,
        data: {
          machines: enrichedMachines,
          total: machines.length,
          search_term: searchTerm,
        },
      });
    } catch (error) {
      logger.error("Error searching machines:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // CHECK LOCATION EXISTS
  static async checkLocationExists(req: Request, res: Response): Promise<void> {
    try {
      const { area_name, excludeId } = req.query;

      if (!area_name) {
        res.status(400).json({
          success: false,
          message: "Area name is required",
        });
        return;
      }

      const filter: any = { area_name: area_name as string };
      if (excludeId) {
        filter._id = { $ne: excludeId };
      }

      const count = await LocationModel.countDocuments(filter);

      res.status(200).json({
        success: true,
        data: { exists: count > 0 },
      });
    } catch (error) {
      logger.error("Error checking location existence:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // ENHANCED EXPORT LOCATIONS - INCLUDES SUB-LOCATIONS AND MACHINES
  static async exportLocations(req: Request, res: Response): Promise<void> {
    try {
      const format = (req.query.format as string) || "csv";
      const status = req.query.status as string;
      const state = req.query.state as string;
      const district = req.query.district as string;
      const search = req.query.search as string;
      const includeDetails = (req.query.includeDetails as string) === "true" || true; // Default to true
      const includeImages = (req.query.includeImages as string) === "true";

      // Build filter
      const filter: any = {};
      if (status && status !== 'all') {
        filter.status = status;
      }
      if (state) {
        filter.state = { $regex: state, $options: "i" };
      }
      if (district) {
        filter.district = { $regex: district, $options: "i" };
      }
      if (search) {
        filter.$or = [
          { area_name: { $regex: search, $options: "i" } },
          { state: { $regex: search, $options: "i" } },
          { district: { $regex: search, $options: "i" } },
        ];
      }

      const locations = await LocationModel.find(filter).limit(1000);

      if (locations.length === 0) {
        res.status(404).json({
          success: false,
          message: "No locations found to export",
        });
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      if (format === "csv") {
        if (includeDetails) {
          // Get detailed CSV with sub-locations and machines
          const detailedCSV = await AreaController.generateDetailedCSVExport(locations, includeImages); // FIXED: Use AreaController
          res.setHeader("Content-Type", "text/csv");
          res.setHeader("Content-Disposition", `attachment; filename="locations-detailed-export-${timestamp}.csv"`);
          res.status(200).send(detailedCSV);
        } else {
          // Get basic CSV (only locations)
          const csv = AreaController.convertLocationsToCSV(locations);
          res.setHeader("Content-Type", "text/csv");
          res.setHeader("Content-Disposition", `attachment; filename="locations-basic-export-${timestamp}.csv"`);
          res.status(200).send(csv);
        }
      } else if (format === "json") {
        // Get COMPLETE detailed data for each location including sub-locations and machines
        const detailedLocations = await Promise.all(
          locations.map(async (location) => {
            const subLocations = await SubLocationModel.find({ location_id: location._id });

            // Get detailed sub-locations with machines
            const detailedSubLocations = await Promise.all(
              subLocations.map(async (subLoc) => {
                const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });

                // Get detailed machine information
                const detailedMachines = await Promise.all(
                  machines.map(async (machine) => {
                    const machineObj = machine.toObject();

                    // Handle image data if requested
                    let images = [];
                    if (includeImages && machine.machine_image && machine.machine_image.length > 0) {
                      images = machine.machine_image.map(img => ({
                        image_name: img.image_name,
                        file_url: img.file_url,
                        cloudinary_public_id: img.cloudinary_public_id,
                        file_size: img.file_size,
                        mime_type: img.mime_type,
                        uploaded_at: img.uploaded_at,
                        preview_url: img.file_url.replace('/upload/', '/upload/w_200,h_200,c_fill/')
                      }));
                    }

                    return {
                      id: machine._id,
                      machine_name: machine.machine_name,
                      installed_status: machine.installed_status,
                      status: machine.status,
                      images_count: machine.machine_image.length,
                      images: includeImages ? images : undefined,
                      created_at: machine.createdAt,
                      updated_at: machine.updatedAt
                    };
                  })
                );

                return {
                  id: subLoc._id,
                  campus: subLoc.campus,
                  tower: subLoc.tower,
                  floor: subLoc.floor,
                  select_machine: subLoc.select_machine,
                  total_machines: detailedMachines.length,
                  machines: detailedMachines,
                  created_at: subLoc.createdAt,
                  updated_at: subLoc.updatedAt,
                  statistics: {
                    installed_machines: detailedMachines.filter(m => m.installed_status === 'installed').length,
                    active_machines: detailedMachines.filter(m => m.status === 'active').length,
                    machines_with_images: detailedMachines.filter(m => m.images_count > 0).length
                  }
                };
              })
            );

            // Calculate statistics
            let totalMachines = 0;
            let installedMachines = 0;
            let notInstalledMachines = 0;
            let activeMachines = 0;
            let inactiveMachines = 0;

            for (const subLoc of detailedSubLocations) {
              totalMachines += subLoc.total_machines;
              installedMachines += subLoc.statistics.installed_machines;
              notInstalledMachines += (subLoc.total_machines - subLoc.statistics.installed_machines);
              activeMachines += subLoc.statistics.active_machines;
              inactiveMachines += (subLoc.total_machines - subLoc.statistics.active_machines);
            }

            return {
              ...location.toObject(),
              summary: {
                sub_locations_count: detailedSubLocations.length,
                total_machines: totalMachines,
                installed_machines: installedMachines,
                not_installed_machines: notInstalledMachines,
                active_machines: activeMachines,
                inactive_machines: inactiveMachines,
              },
              sub_locations: includeDetails ? detailedSubLocations : undefined,
              export_metadata: {
                exported_at: new Date().toISOString(),
                includes_sub_locations: includeDetails,
                includes_machine_images: includeImages
              }
            };
          })
        );

        const totalSubLocations = detailedLocations.reduce((sum, loc) =>
          sum + (loc.sub_locations ? loc.sub_locations.length : 0), 0);
        const totalMachines = detailedLocations.reduce((sum, loc) =>
          sum + loc.summary.total_machines, 0);

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="locations-detailed-export-${timestamp}.json"`);
        res.status(200).json({
          success: true,
          data: detailedLocations,
          export_summary: {
            total_locations: locations.length,
            total_sub_locations: totalSubLocations,
            total_machines: totalMachines,
            includes_sub_locations: includeDetails,
            includes_images: includeImages,
            export_date: new Date().toISOString(),
          },
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Unsupported format. Use "csv" or "json"',
        });
      }
    } catch (error) {
      logger.error("Error exporting locations:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // NEW HELPER: Generate detailed CSV export
  private static async generateDetailedCSVExport(locations: any[], includeImages: boolean): Promise<string> {
    if (!locations || locations.length === 0) {
      return "No locations available for export";
    }

    try {
      let csv = "\ufeff"; // BOM for UTF-8

      // Sheet 1: Locations Summary
      csv += "=== LOCATIONS SUMMARY ===\n";
      const locationHeaders = [
        "Location ID",
        "Area Name",
        "State",
        "District",
        "Pincode",
        "Status",
        "Address",
        "Description",
        "Sub-locations Count",
        "Total Machines",
        "Installed Machines",
        "Not Installed Machines",
        "Active Machines",
        "Inactive Machines",
        "Created At",
        "Updated At"
      ];
      csv += locationHeaders.join(",") + "\n";

      for (const location of locations) {
        const locationObj = location.toObject ? location.toObject() : location;

        // Get sub-locations for statistics
        const subLocations = await SubLocationModel.find({ location_id: location._id });
        let totalMachines = 0;
        let installedMachines = 0;
        let activeMachines = 0;

        for (const subLoc of subLocations) {
          const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });
          totalMachines += machines.length;
          installedMachines += machines.filter(m => m.installed_status === 'installed').length;
          activeMachines += machines.filter(m => m.status === 'active').length;
        }

        const notInstalledMachines = totalMachines - installedMachines;
        const inactiveMachines = totalMachines - activeMachines;

        const locationRow = [
          locationObj._id?.toString() || "",
          `"${(locationObj.area_name || "").replace(/"/g, '""')}"`,
          `"${(locationObj.state || "").replace(/"/g, '""')}"`,
          `"${(locationObj.district || "").replace(/"/g, '""')}"`,
          locationObj.pincode || "",
          locationObj.status || "",
          `"${(locationObj.address || "").replace(/"/g, '""')}"`,
          `"${(locationObj.area_description || "").replace(/"/g, '""')}"`,
          subLocations.length,
          totalMachines,
          installedMachines,
          notInstalledMachines,
          activeMachines,
          inactiveMachines,
          locationObj.createdAt ? new Date(locationObj.createdAt).toISOString() : "",
          locationObj.updatedAt ? new Date(locationObj.updatedAt).toISOString() : ""
        ];

        csv += locationRow.join(",") + "\n";
      }

      csv += "\n\n";

      // Sheet 2: Sub-locations
      csv += "=== SUB-LOCATIONS ===\n";
      const subLocationHeaders = [
        "Sub-location ID",
        "Location ID",
        "Location Name",
        "Campus",
        "Tower",
        "Floor",
        "Selected Machines",
        "Total Machines",
        "Installed Machines",
        "Active Machines",
        "Created At",
        "Updated At"
      ];
      csv += subLocationHeaders.join(",") + "\n";

      for (const location of locations) {
        const subLocations = await SubLocationModel.find({ location_id: location._id });

        for (const subLoc of subLocations) {
          const subLocObj = subLoc.toObject ? subLoc.toObject() : subLoc;
          const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });

          const installedMachines = machines.filter(m => m.installed_status === 'installed').length;
          const activeMachines = machines.filter(m => m.status === 'active').length;

          const subLocationRow = [
            subLocObj._id?.toString() || "",
            location._id?.toString() || "",
            `"${location.area_name?.replace(/"/g, '""') || ""}"`,
            `"${(subLocObj.campus || "").replace(/"/g, '""')}"`,
            `"${(subLocObj.tower || "").replace(/"/g, '""')}"`,
            `"${(subLocObj.floor || "").replace(/"/g, '""')}"`,
            `"${(subLocObj.select_machine || []).join(", ").replace(/"/g, '""')}"`,
            machines.length,
            installedMachines,
            activeMachines,
            subLocObj.createdAt ? new Date(subLocObj.createdAt).toISOString() : "",
            subLocObj.updatedAt ? new Date(subLocObj.updatedAt).toISOString() : ""
          ];

          csv += subLocationRow.join(",") + "\n";
        }
      }

      csv += "\n\n";

      // Sheet 3: Machines
      csv += "=== MACHINES ===\n";
      const machineHeaders = [
        "Machine ID",
        "Sub-location ID",
        "Location Name",
        "Campus",
        "Tower",
        "Floor",
        "Machine Name",
        "Installed Status",
        "Status",
        "Images Count",
        "Image Names",
        "Created At",
        "Updated At"
      ];
      csv += machineHeaders.join(",") + "\n";

      for (const location of locations) {
        const subLocations = await SubLocationModel.find({ location_id: location._id });

        for (const subLoc of subLocations) {
          const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });

          for (const machine of machines) {
            const machineObj = machine.toObject ? machine.toObject() : machine;
            const imageNames = machineObj.machine_image?.map(img => img.image_name).join("; ") || "";

            const machineRow = [
              machineObj._id?.toString() || "",
              subLoc._id?.toString() || "",
              `"${location.area_name?.replace(/"/g, '""') || ""}"`,
              `"${(subLoc.campus || "").replace(/"/g, '""')}"`,
              `"${(subLoc.tower || "").replace(/"/g, '""')}"`,
              `"${(subLoc.floor || "").replace(/"/g, '""')}"`,
              `"${(machineObj.machine_name || "").replace(/"/g, '""')}"`,
              machineObj.installed_status || "",
              machineObj.status || "",
              machineObj.machine_image?.length || 0,
              `"${imageNames.replace(/"/g, '""')}"`,
              machineObj.createdAt ? new Date(machineObj.createdAt).toISOString() : "",
              machineObj.updatedAt ? new Date(machineObj.updatedAt).toISOString() : ""
            ];

            csv += machineRow.join(",") + "\n";
          }
        }
      }

      // Add summary
      csv += "\n\n=== EXPORT SUMMARY ===\n";
      const totalSubLocations = (await Promise.all(
        locations.map(loc => SubLocationModel.countDocuments({ location_id: loc._id }))
      )).reduce((sum, count) => sum + count, 0);

      const totalMachines = (await Promise.all(
        locations.map(async (loc) => {
          const subLocs = await SubLocationModel.find({ location_id: loc._id });
          const machineCounts = await Promise.all(
            subLocs.map(subLoc => MachineDetailsModel.countDocuments({ sub_location_id: subLoc._id }))
          );
          return machineCounts.reduce((sum, count) => sum + count, 0);
        })
      )).reduce((sum, count) => sum + count, 0);

      csv += "Total Locations," + locations.length + "\n";
      csv += "Total Sub-locations," + totalSubLocations + "\n";
      csv += "Total Machines," + totalMachines + "\n";
      csv += "Export Format,Detailed CSV (3 sheets)\n";
      csv += "Export Date," + new Date().toISOString() + "\n";
      csv += "Includes Images," + includeImages + "\n";

      return csv;
    } catch (error) {
      logger.error("Error generating detailed CSV:", error);
      return "Error generating detailed CSV export";
    }
  }// ENHANCED EXPORT LOCATIONS BY IDS - WITH IMAGE URLS AND COMPREHENSIVE DATA
  static async exportLocationsByIds(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.params; // This comes from /location/export/:ids
      const format = (req.query.format as string) || "json";
      const includeImages = (req.query.includeImages as string) === "true";
      const includeDetails = (req.query.includeDetails as string) !== "false"; // Default to true

      if (!ids || ids.trim() === '') {
        res.status(400).json({
          success: false,
          message: "Please provide location IDs",
        });
        return;
      }

      const locationIds = ids
        .split(",")
        .map(id => id.trim())
        .filter(id => id);

      if (locationIds.length === 0) {
        res.status(400).json({
          success: false,
          message: "Please provide valid location IDs",
        });
        return;
      }

      // Validate IDs
      const invalidIds = locationIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        res.status(400).json({
          success: false,
          message: `Invalid location IDs: ${invalidIds.join(", ")}`,
          invalidIds,
        });
        return;
      }

      // Convert to ObjectId
      const objectIds = locationIds.map(id => new mongoose.Types.ObjectId(id));

      const locations = await LocationModel.find({
        _id: { $in: objectIds },
      });

      if (locations.length === 0) {
        res.status(404).json({
          success: false,
          message: "No locations found with the provided IDs",
        });
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      if (format === "csv") {
        if (includeDetails) {
          // Get detailed CSV with sub-locations, machines, and images
          const detailedCSV = await AreaController.generateDetailedCSVExportForIds(locations, includeImages);
          res.setHeader("Content-Type", "text/csv");
          res.setHeader("Content-Disposition", `attachment; filename="locations-detailed-export-${timestamp}.csv"`);
          res.status(200).send(detailedCSV);
        } else {
          // Get basic CSV (only locations)
          const csv = AreaController.convertLocationsToCSV(locations);
          res.setHeader("Content-Type", "text/csv");
          res.setHeader("Content-Disposition", `attachment; filename="locations-basic-export-${timestamp}.csv"`);
          res.status(200).send(csv);
        }
      } else if (format === "json") {
        // Get COMPLETE detailed data for each location
        const detailedLocations = await Promise.all(
          locations.map(async (location) => {
            const subLocations = await SubLocationModel.find({ location_id: location._id });

            // Get detailed sub-locations with machines
            const detailedSubLocations = await Promise.all(
              subLocations.map(async (subLoc) => {
                const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });

                // Get detailed machine information with images
                const detailedMachines = await Promise.all(
                  machines.map(async (machine) => {
                    const machineObj = machine.toObject();

                    // Handle image data
                    let images = [];
                    if (includeImages && machine.machine_image && machine.machine_image.length > 0) {
                      images = machine.machine_image.map(img => ({
                        image_name: img.image_name,
                        file_url: img.file_url,
                        cloudinary_public_id: img.cloudinary_public_id,
                        file_size: img.file_size,
                        file_size_mb: (img.file_size / (1024 * 1024)).toFixed(2) + " MB",
                        mime_type: img.mime_type,
                        uploaded_at: img.uploaded_at,
                        // Image variations
                        thumbnail_url: img.file_url.replace('/upload/', '/upload/w_100,h_100,c_fill/'),
                        preview_url: img.file_url.replace('/upload/', '/upload/w_300,h_300,c_fill/'),
                        original_url: img.file_url,
                        download_url: `${img.file_url}?download=1`,
                        // Image metadata
                        dimensions: img.file_url.includes('cloudinary') ? "Extracted from Cloudinary" : "Not available",
                        format: img.mime_type.split('/')[1]?.toUpperCase() || "Unknown"
                      }));
                    }

                    return {
                      id: machine._id.toString(),
                      machine_name: machine.machine_name,
                      installed_status: machine.installed_status,
                      status: machine.status,
                      images_count: machine.machine_image.length,
                      images: includeImages ? images : undefined,
                      image_summary: includeImages ? {
                        total_images: machine.machine_image.length,
                        image_formats: [...new Set(machine.machine_image.map(img => img.mime_type))],
                        total_size_mb: (machine.machine_image.reduce((sum, img) => sum + img.file_size, 0) / (1024 * 1024)).toFixed(2),
                        latest_image: machine.machine_image.length > 0 ?
                          new Date(Math.max(...machine.machine_image.map(img => new Date(img.uploaded_at).getTime()))).toISOString() : null
                      } : undefined,
                      created_at: machine.createdAt,
                      updated_at: machine.updatedAt,
                      last_modified: machine.updatedAt || machine.createdAt
                    };
                  })
                );

                // Calculate sub-location statistics
                const subLocStats = {
                  total_machines: detailedMachines.length,
                  installed_machines: detailedMachines.filter(m => m.installed_status === 'installed').length,
                  not_installed_machines: detailedMachines.filter(m => m.installed_status === 'not_installed').length,
                  active_machines: detailedMachines.filter(m => m.status === 'active').length,
                  inactive_machines: detailedMachines.filter(m => m.status === 'inactive').length,
                  machines_with_images: detailedMachines.filter(m => m.images_count > 0).length,
                  total_images: detailedMachines.reduce((sum, m) => sum + m.images_count, 0)
                };

                return {
                  id: subLoc._id.toString(),
                  campus: subLoc.campus,
                  tower: subLoc.tower,
                  floor: subLoc.floor,
                  select_machine: subLoc.select_machine,
                  total_machines: detailedMachines.length,
                  machines: includeDetails ? detailedMachines : undefined,
                  created_at: subLoc.createdAt,
                  updated_at: subLoc.updatedAt,
                  statistics: subLocStats,
                  export_metadata: {
                    exported_at: new Date().toISOString(),
                    includes_machines: includeDetails,
                    includes_images: includeImages
                  }
                };
              })
            );

            // Calculate location statistics
            const locationStats = {
              total_sub_locations: detailedSubLocations.length,
              total_machines: detailedSubLocations.reduce((sum, subLoc) => sum + subLoc.statistics.total_machines, 0),
              installed_machines: detailedSubLocations.reduce((sum, subLoc) => sum + subLoc.statistics.installed_machines, 0),
              not_installed_machines: detailedSubLocations.reduce((sum, subLoc) => sum + subLoc.statistics.not_installed_machines, 0),
              active_machines: detailedSubLocations.reduce((sum, subLoc) => sum + subLoc.statistics.active_machines, 0),
              inactive_machines: detailedSubLocations.reduce((sum, subLoc) => sum + subLoc.statistics.inactive_machines, 0),
              machines_with_images: detailedSubLocations.reduce((sum, subLoc) => sum + subLoc.statistics.machines_with_images, 0),
              total_images: detailedSubLocations.reduce((sum, subLoc) => sum + subLoc.statistics.total_images, 0)
            };

            return {
              location: {
                id: location._id.toString(),
                area_name: location.area_name,
                state: location.state,
                district: location.district,
                pincode: location.pincode,
                area_description: location.area_description,
                status: location.status,
                latitude: location.latitude,
                longitude: location.longitude,
                address: location.address,
                created_at: location.createdAt,
                updated_at: location.updatedAt
              },
              sub_locations: includeDetails ? detailedSubLocations : undefined,
              statistics: locationStats,
              export_metadata: {
                exported_at: new Date().toISOString(),
                includes_sub_locations: includeDetails,
                includes_machines: includeDetails,
                includes_machine_images: includeImages,
                image_count: locationStats.total_images
              }
            };
          })
        );

        // Calculate overall export statistics
        const exportSummary = {
          total_locations: detailedLocations.length,
          total_sub_locations: detailedLocations.reduce((sum, loc) => sum + loc.statistics.total_sub_locations, 0),
          total_machines: detailedLocations.reduce((sum, loc) => sum + loc.statistics.total_machines, 0),
          installed_machines: detailedLocations.reduce((sum, loc) => sum + loc.statistics.installed_machines, 0),
          active_machines: detailedLocations.reduce((sum, loc) => sum + loc.statistics.active_machines, 0),
          total_images: detailedLocations.reduce((sum, loc) => sum + loc.statistics.total_images, 0),
          includes_images: includeImages,
          includes_details: includeDetails,
          export_format: "comprehensive"
        };

        const exportData = {
          success: true,
          export_summary: exportSummary,
          data: detailedLocations,
          export_info: {
            requested_location_ids: locationIds,
            found_location_ids: locations.map(loc => loc._id.toString()),
            missing_location_ids: locationIds.filter(id =>
              !locations.some(loc => loc._id.toString() === id)
            ),
            export_date: new Date().toISOString(),
            export_options: {
              format: format,
              include_images: includeImages,
              include_details: includeDetails,
              image_quality: includeImages ? "full_urls_with_metadata" : "no_images"
            }
          }
        };

        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="locations-export-${timestamp}.json"`);
        res.status(200).json(exportData);
      } else {
        res.status(400).json({
          success: false,
          message: 'Unsupported format. Use "csv" or "json"',
        });
      }
    } catch (error) {
      logger.error("Error exporting locations by IDs:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // HELPER: Generate detailed CSV export for specific IDs
  private static async generateDetailedCSVExportForIds(locations: any[], includeImages: boolean): Promise<string> {
    if (!locations || locations.length === 0) {
      return "No locations available for export";
    }

    try {
      let csv = "\ufeff"; // BOM for UTF-8

      // Sheet 1: Locations Summary
      csv += "=== LOCATIONS SUMMARY ===\n";
      const locationHeaders = [
        "Location ID",
        "Area Name",
        "State",
        "District",
        "Pincode",
        "Status",
        "Address",
        "Description",
        "Latitude",
        "Longitude",
        "Sub-locations Count",
        "Total Machines",
        "Installed Machines",
        "Active Machines",
        "Total Images",
        "Created At",
        "Updated At"
      ];
      csv += locationHeaders.join(",") + "\n";

      for (const location of locations) {
        const locationObj = location.toObject ? location.toObject() : location;

        // Get detailed statistics
        const subLocations = await SubLocationModel.find({ location_id: location._id });
        let totalMachines = 0;
        let installedMachines = 0;
        let activeMachines = 0;
        let totalImages = 0;

        for (const subLoc of subLocations) {
          const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });
          totalMachines += machines.length;
          installedMachines += machines.filter(m => m.installed_status === 'installed').length;
          activeMachines += machines.filter(m => m.status === 'active').length;
          totalImages += machines.reduce((sum, m) => sum + (m.machine_image?.length || 0), 0);
        }

        const locationRow = [
          locationObj._id?.toString() || "",
          `"${(locationObj.area_name || "").replace(/"/g, '""')}"`,
          `"${(locationObj.state || "").replace(/"/g, '""')}"`,
          `"${(locationObj.district || "").replace(/"/g, '""')}"`,
          locationObj.pincode || "",
          locationObj.status || "",
          `"${(locationObj.address || "").replace(/"/g, '""')}"`,
          `"${(locationObj.area_description || "").replace(/"/g, '""')}"`,
          locationObj.latitude || "",
          locationObj.longitude || "",
          subLocations.length,
          totalMachines,
          installedMachines,
          activeMachines,
          totalImages,
          locationObj.createdAt ? new Date(locationObj.createdAt).toISOString() : "",
          locationObj.updatedAt ? new Date(locationObj.updatedAt).toISOString() : ""
        ];

        csv += locationRow.join(",") + "\n";
      }

      csv += "\n\n";

      // Sheet 2: Sub-locations
      csv += "=== SUB-LOCATIONS ===\n";
      const subLocationHeaders = [
        "Sub-location ID",
        "Location ID",
        "Location Name",
        "Campus",
        "Tower",
        "Floor",
        "Selected Machines",
        "Total Machines",
        "Installed Machines",
        "Active Machines",
        "Images Count",
        "Created At",
        "Updated At"
      ];
      csv += subLocationHeaders.join(",") + "\n";

      for (const location of locations) {
        const subLocations = await SubLocationModel.find({ location_id: location._id });

        for (const subLoc of subLocations) {
          const subLocObj = subLoc.toObject ? subLoc.toObject() : subLoc;
          const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });

          const installedMachines = machines.filter(m => m.installed_status === 'installed').length;
          const activeMachines = machines.filter(m => m.status === 'active').length;
          const totalImages = machines.reduce((sum, m) => sum + (m.machine_image?.length || 0), 0);

          const subLocationRow = [
            subLocObj._id?.toString() || "",
            location._id?.toString() || "",
            `"${location.area_name?.replace(/"/g, '""') || ""}"`,
            `"${(subLocObj.campus || "").replace(/"/g, '""')}"`,
            `"${(subLocObj.tower || "").replace(/"/g, '""')}"`,
            `"${(subLocObj.floor || "").replace(/"/g, '""')}"`,
            `"${(subLocObj.select_machine || []).join(", ").replace(/"/g, '""')}"`,
            machines.length,
            installedMachines,
            activeMachines,
            totalImages,
            subLocObj.createdAt ? new Date(subLocObj.createdAt).toISOString() : "",
            subLocObj.updatedAt ? new Date(subLocObj.updatedAt).toISOString() : ""
          ];

          csv += subLocationRow.join(",") + "\n";
        }
      }

      csv += "\n\n";

      // Sheet 3: Machines
      csv += "=== MACHINES ===\n";
      const machineHeaders = [
        "Machine ID",
        "Sub-location ID",
        "Location Name",
        "Campus",
        "Tower",
        "Floor",
        "Machine Name",
        "Installed Status",
        "Status",
        "Images Count",
        "Image URLs",
        "Image Names",
        "Created At",
        "Updated At"
      ];
      csv += machineHeaders.join(",") + "\n";

      for (const location of locations) {
        const subLocations = await SubLocationModel.find({ location_id: location._id });

        for (const subLoc of subLocations) {
          const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });

          for (const machine of machines) {
            const machineObj = machine.toObject ? machine.toObject() : machine;
            const imageNames = machineObj.machine_image?.map(img => img.image_name).join("; ") || "";
            const imageUrls = machineObj.machine_image?.map(img => img.file_url).join("; ") || "";

            const machineRow = [
              machineObj._id?.toString() || "",
              subLoc._id?.toString() || "",
              `"${location.area_name?.replace(/"/g, '""') || ""}"`,
              `"${(subLoc.campus || "").replace(/"/g, '""')}"`,
              `"${(subLoc.tower || "").replace(/"/g, '""')}"`,
              `"${(subLoc.floor || "").replace(/"/g, '""')}"`,
              `"${(machineObj.machine_name || "").replace(/"/g, '""')}"`,
              machineObj.installed_status || "",
              machineObj.status || "",
              machineObj.machine_image?.length || 0,
              `"${imageUrls.replace(/"/g, '""')}"`,
              `"${imageNames.replace(/"/g, '""')}"`,
              machineObj.createdAt ? new Date(machineObj.createdAt).toISOString() : "",
              machineObj.updatedAt ? new Date(machineObj.updatedAt).toISOString() : ""
            ];

            csv += machineRow.join(",") + "\n";
          }
        }
      }

      // Add summary
      csv += "\n\n=== EXPORT SUMMARY ===\n";
      const totalSubLocations = (await Promise.all(
        locations.map(loc => SubLocationModel.countDocuments({ location_id: loc._id }))
      )).reduce((sum, count) => sum + count, 0);

      const totalMachines = (await Promise.all(
        locations.map(async (loc) => {
          const subLocs = await SubLocationModel.find({ location_id: loc._id });
          const machineCounts = await Promise.all(
            subLocs.map(subLoc => MachineDetailsModel.countDocuments({ sub_location_id: subLoc._id }))
          );
          return machineCounts.reduce((sum, count) => sum + count, 0);
        })
      )).reduce((sum, count) => sum + count, 0);

      const totalImages = (await Promise.all(
        locations.map(async (loc) => {
          const subLocs = await SubLocationModel.find({ location_id: loc._id });
          let imageCount = 0;
          for (const subLoc of subLocs) {
            const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });
            imageCount += machines.reduce((sum, m) => sum + (m.machine_image?.length || 0), 0);
          }
          return imageCount;
        })
      )).reduce((sum, count) => sum + count, 0);

      csv += "Total Locations," + locations.length + "\n";
      csv += "Total Sub-locations," + totalSubLocations + "\n";
      csv += "Total Machines," + totalMachines + "\n";
      csv += "Total Images," + totalImages + "\n";
      csv += "Export Format,Detailed CSV (3 sheets)\n";
      csv += "Export Date," + new Date().toISOString() + "\n";
      csv += "Includes Images," + includeImages + "\n";
      csv += "Image URLs Included," + (includeImages ? "Yes" : "No") + "\n";

      return csv;
    } catch (error) {
      logger.error("Error generating detailed CSV for IDs:", error);
      return "Error generating detailed CSV export";
    }
  }
  // EXPORT LOCATION AUDIT LOGS
  static async exportLocationAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const format = (req.query.format as string) || "csv";

      if (!mongoose.Types.ObjectId.isValid(locationId)) {
        res.status(400).json({
          success: false,
          message: "Invalid location ID",
        });
        return;
      }

      const location = await LocationModel.findById(locationId);
      if (!location) {
        res.status(404).json({
          success: false,
          message: "Location not found",
        });
        return;
      }

      // Get all audit logs for this location
      const logs = await HistoryAreaModel.find({ location_id: locationId })
        .sort({ timestamp: -1 })
        .limit(10000);

      if (logs.length === 0) {
        res.status(404).json({
          success: false,
          message: "No audit logs found for this location",
        });
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
      const areaName = location.area_name.replace(/[^a-zA-Z0-9]/g, "_");
      const filename = `audit-logs-${areaName}-${timestamp}`;

      if (format === "csv") {
        const csv = AreaController.convertAuditLogsToCSV(logs, location);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.csv"`);
        res.status(200).send(csv);
      } else if (format === "json") {
        const exportData = {
          location: {
            id: location._id,
            name: location.area_name,
            state: location.state,
            district: location.district,
            status: location.status,
          },
          audit_logs: logs.map(log => log.toObject()),
          total_logs: logs.length,
          export_date: new Date().toISOString(),
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
      logger.error("Error exporting location audit logs:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // EXPORT RECENT AUDIT ACTIVITIES
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

      const activities = await HistoryAreaModel.find(filter)
        .sort({ timestamp: -1 })
        .limit(limit)
        .populate("location_id", "area_name state district");

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
          activities: activities.map(activity => activity.toObject()),
          total_activities: activities.length,
          export_date: new Date().toISOString(),
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

  // GET DASHBOARD TABLE DATA
  static async getDashboardTableData(req: Request, res: Response): Promise<void> {
    try {
      const params: any = {
        status: (req.query.status as "active" | "inactive" | "all") || "all",
        state: req.query.state as string,
        district: req.query.district as string,
        campus: req.query.campus as string,
        tower: req.query.tower as string,
        floor: req.query.floor as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || "area_name",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "asc",
      };

      // Build location filter
      const locationFilter: any = {};
      if (params.status && params.status !== 'all') {
        locationFilter.status = params.status;
      }
      if (params.state) {
        locationFilter.state = new RegExp(params.state, 'i');
      }
      if (params.district) {
        locationFilter.district = new RegExp(params.district, 'i');
      }
      if (params.search) {
        locationFilter.$or = [
          { area_name: new RegExp(params.search, 'i') },
          { state: new RegExp(params.search, 'i') },
          { district: new RegExp(params.search, 'i') },
        ];
      }

      // Get locations with pagination
      const skip = (params.page - 1) * params.limit;
      const [locations, total] = await Promise.all([
        LocationModel.find(locationFilter)
          .sort({ [params.sortBy]: params.sortOrder === 'asc' ? 1 : -1 })
          .skip(skip)
          .limit(params.limit),
        LocationModel.countDocuments(locationFilter),
      ]);

      // Get detailed data for each location
      const tableData = await Promise.all(
        locations.map(async (location) => {
          const subLocations = await SubLocationModel.find({ location_id: location._id });

          // Filter sub-locations if campus/tower/floor filter is applied
          let filteredSubLocations = subLocations;
          if (params.campus || params.tower || params.floor) {
            filteredSubLocations = subLocations.filter(subLoc => {
              if (params.campus && !new RegExp(params.campus, 'i').test(subLoc.campus)) {
                return false;
              }
              if (params.tower && !new RegExp(params.tower, 'i').test(subLoc.tower)) {
                return false;
              }
              if (params.floor && !new RegExp(params.floor, 'i').test(subLoc.floor)) {
                return false;
              }
              return true;
            });
          }

          // Get machine statistics
          let totalMachines = 0;
          let installedMachines = 0;
          let notInstalledMachines = 0;

          for (const subLoc of filteredSubLocations) {
            const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });
            totalMachines += machines.length;
            installedMachines += machines.filter(m => m.installed_status === 'installed').length;
            notInstalledMachines += machines.filter(m => m.installed_status === 'not_installed').length;
          }

          return {
            id: location._id,
            area_name: location.area_name,
            state: location.state,
            district: location.district,
            pincode: location.pincode,
            status: location.status,
            sub_locations_count: filteredSubLocations.length,
            total_machines: totalMachines,
            installed_machines: installedMachines,
            not_installed_machines: notInstalledMachines,
            created_at: location.createdAt,
            updated_at: location.updatedAt,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: tableData,
        pagination: {
          currentPage: params.page,
          totalItems: total,
          totalPages: Math.ceil(total / params.limit),
          itemsPerPage: params.limit,
        },
      });
    } catch (error) {
      logger.error("Error fetching dashboard table data:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // EXPORT DASHBOARD DATA
  static async exportDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const format = (req.query.format as string) || "csv";

      // Use same logic as getDashboardTableData but get all records
      const params: any = {
        status: (req.query.status as "active" | "inactive" | "all") || "all",
        state: req.query.state as string,
        district: req.query.district as string,
        campus: req.query.campus as string,
        tower: req.query.tower as string,
        floor: req.query.floor as string,
        search: req.query.search as string,
        limit: 10000,
      };

      const tableData = await AreaController.getDashboardTableDataForExport(params);

      if (tableData.length === 0) {
        res.status(404).json({
          success: false,
          message: "No dashboard data found to export",
        });
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      if (format === "csv") {
        const csv = AreaController.convertDashboardToCSV(tableData);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename="dashboard-export-${timestamp}.csv"`);
        res.status(200).send(csv);
      } else if (format === "json") {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="dashboard-export-${timestamp}.json"`);
        res.status(200).json({
          success: true,
          data: tableData,
          total: tableData.length,
          export_date: new Date().toISOString(),
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

  // GET SUMMARIZED LOCATIONS BY IDS
  static async getSummarizedLocationsByIds(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.query;

      if (!ids) {
        res.status(400).json({
          success: false,
          message: "Location IDs are required",
        });
        return;
      }

      const locationIds = (ids as string).split(",")
        .map(id => id.trim())
        .filter(id => id);

      if (locationIds.length === 0) {
        res.status(400).json({
          success: false,
          message: "Please provide location IDs",
        });
        return;
      }

      const invalidIds = locationIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        res.status(400).json({
          success: false,
          message: `Invalid location IDs: ${invalidIds.join(", ")}`,
          invalidIds,
        });
        return;
      }

      const locations = await LocationModel.find({
        _id: { $in: locationIds },
      });

      const summarizedData = await Promise.all(
        locations.map(async (location) => {
          const subLocations = await SubLocationModel.find({ location_id: location._id });

          let totalMachines = 0;
          let installedMachines = 0;
          let notInstalledMachines = 0;

          for (const subLoc of subLocations) {
            const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });
            totalMachines += machines.length;
            installedMachines += machines.filter(m => m.installed_status === 'installed').length;
            notInstalledMachines += machines.filter(m => m.installed_status === 'not_installed').length;
          }

          const uniqueCampuses = [...new Set(subLocations.map(sl => sl.campus).filter(Boolean))];

          return {
            id: location._id,
            area_name: location.area_name,
            state: location.state,
            district: location.district,
            pincode: location.pincode,
            status: location.status,
            address: location.address,
            sub_locations_count: subLocations.length,
            total_machines: totalMachines,
            installed_machines: installedMachines,
            not_installed_machines: notInstalledMachines,
            campuses: uniqueCampuses,
            created_at: location.createdAt,
            updated_at: location.updatedAt,
          };
        })
      );

      res.status(200).json({
        success: true,
        data: summarizedData,
        total: summarizedData.length,
      });
    } catch (error) {
      logger.error("Error fetching summarized locations:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // GET FILTER OPTIONS
  static async getFilterOptions(req: Request, res: Response): Promise<void> {
    try {
      const [states, districts, campuses, towers, floors] = await Promise.all([
        LocationModel.distinct("state"),
        LocationModel.distinct("district"),
        SubLocationModel.distinct("campus"),
        SubLocationModel.distinct("tower"),
        SubLocationModel.distinct("floor"),
      ]);

      res.status(200).json({
        success: true,
        data: {
          states: states.filter(Boolean).sort(),
          districts: districts.filter(Boolean).sort(),
          campuses: campuses.filter(Boolean).sort(),
          towers: towers.filter(Boolean).sort(),
          floors: floors.filter(Boolean).sort(),
        },
      });
    } catch (error) {
      logger.error("Error fetching filter options:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  // ============================================
  // HELPER METHODS FOR EXPORT
  // ============================================

  private static async getDashboardTableDataForExport(params: any): Promise<any[]> {
    // Similar to getDashboardTableData but returns all data without pagination
    const locationFilter: any = {};
    if (params.status && params.status !== 'all') {
      locationFilter.status = params.status;
    }
    if (params.state) {
      locationFilter.state = new RegExp(params.state, 'i');
    }
    if (params.district) {
      locationFilter.district = new RegExp(params.district, 'i');
    }
    if (params.search) {
      locationFilter.$or = [
        { area_name: new RegExp(params.search, 'i') },
        { state: new RegExp(params.search, 'i') },
        { district: new RegExp(params.search, 'i') },
      ];
    }

    const locations = await LocationModel.find(locationFilter).limit(params.limit || 10000);

    const tableData = await Promise.all(
      locations.map(async (location) => {
        const subLocations = await SubLocationModel.find({ location_id: location._id });

        // Filter sub-locations if campus/tower/floor filter is applied
        let filteredSubLocations = subLocations;
        if (params.campus || params.tower || params.floor) {
          filteredSubLocations = subLocations.filter(subLoc => {
            if (params.campus && !new RegExp(params.campus, 'i').test(subLoc.campus)) {
              return false;
            }
            if (params.tower && !new RegExp(params.tower, 'i').test(subLoc.tower)) {
              return false;
            }
            if (params.floor && !new RegExp(params.floor, 'i').test(subLoc.floor)) {
              return false;
            }
            return true;
          });
        }

        let totalMachines = 0;
        let installedMachines = 0;
        let notInstalledMachines = 0;

        for (const subLoc of filteredSubLocations) {
          const machines = await MachineDetailsModel.find({ sub_location_id: subLoc._id });
          totalMachines += machines.length;
          installedMachines += machines.filter(m => m.installed_status === 'installed').length;
          notInstalledMachines += machines.filter(m => m.installed_status === 'not_installed').length;
        }

        return {
          id: location._id,
          area_name: location.area_name,
          state: location.state,
          district: location.district,
          pincode: location.pincode,
          status: location.status,
          address: location.address,
          sub_locations_count: filteredSubLocations.length,
          total_machines: totalMachines,
          installed_machines: installedMachines,
          not_installed_machines: notInstalledMachines,
          created_at: location.createdAt,
          updated_at: location.updatedAt,
        };
      })
    );

    return tableData;
  }

  private static convertLocationsToCSV(locations: any[]): string {
    if (!locations || locations.length === 0) {
      return "No locations available for export";
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
        "Latitude",
        "Longitude",
        "Description",
        "Created At",
        "Updated At"
      ];

      let csv = "\ufeff";
      csv += headers.join(",") + "\n";

      locations.forEach(location => {
        const locationObj = location.toObject ? location.toObject() : location;

        const row = [
          locationObj._id?.toString() || "",
          `"${(locationObj.area_name || "").replace(/"/g, '""')}"`,
          `"${(locationObj.state || "").replace(/"/g, '""')}"`,
          `"${(locationObj.district || "").replace(/"/g, '""')}"`,
          locationObj.pincode || "",
          locationObj.status || "",
          `"${(locationObj.address || "").replace(/"/g, '""')}"`,
          locationObj.latitude || "",
          locationObj.longitude || "",
          `"${(locationObj.area_description || "").replace(/"/g, '""')}"`,
          locationObj.createdAt ? new Date(locationObj.createdAt).toISOString() : "",
          locationObj.updatedAt ? new Date(locationObj.updatedAt).toISOString() : ""
        ];

        csv += row.join(",") + "\n";
      });

      // Add summary
      csv += "\n\n";
      csv += "Export Summary\n";
      csv += "Total Locations," + locations.length + "\n";
      csv += "Export Date," + new Date().toISOString() + "\n";

      return csv;
    } catch (error) {
      logger.error("Error converting locations to CSV:", error);
      return "Error generating locations CSV";
    }
  }

  private static generateDetailedCSV(locations: any[]): string {
    if (!locations || locations.length === 0) {
      return "No data available for export";
    }

    try {
      let csv = "\ufeff";

      // Main location information
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
        "Created At",
        "Updated At"
      ];

      csv += headers.join(",") + "\n";

      locations.forEach(location => {
        const locationObj = location.toObject ? location.toObject() : location;

        const row = [
          locationObj._id?.toString() || "",
          `"${(locationObj.area_name || "").replace(/"/g, '""')}"`,
          `"${(locationObj.state || "").replace(/"/g, '""')}"`,
          `"${(locationObj.district || "").replace(/"/g, '""')}"`,
          locationObj.pincode || "",
          locationObj.status || "",
          `"${(locationObj.address || "").replace(/"/g, '""')}"`,
          `"${(locationObj.area_description || "").replace(/"/g, '""')}"`,
          locationObj.latitude || "",
          locationObj.longitude || "",
          locationObj.createdAt ? new Date(locationObj.createdAt).toISOString() : "",
          locationObj.updatedAt ? new Date(locationObj.updatedAt).toISOString() : ""
        ];

        csv += row.join(",") + "\n";
      });

      // Add summary
      csv += "\n\n";
      csv += "Export Summary\n";
      csv += "Total Locations Exported," + locations.length + "\n";
      csv += "Export Date," + new Date().toISOString() + "\n";

      return csv;
    } catch (error) {
      logger.error("Error generating detailed CSV:", error);
      return "Error generating detailed CSV data";
    }
  }

  private static convertAuditLogsToCSV(logs: any[], location: any): string {
    if (!logs || logs.length === 0) {
      return "No audit logs available for export";
    }

    try {
      const headers = [
        "Log ID",
        "Action",
        "Location ID",
        "Location Name",
        "Performed By",
        "User Email",
        "Timestamp",
        "IP Address",
        "Changes Summary"
      ];

      let csv = "\ufeff";
      csv += headers.join(",") + "\n";

      logs.forEach(log => {
        const logDoc = log.toObject ? log.toObject() : log;

        let changesSummary = "";
        if (logDoc.changes) {
          const changedFields = Object.keys(logDoc.changes);
          changesSummary = `${changedFields.length} field(s) changed`;
        } else if (logDoc.action === "CREATE") {
          changesSummary = "New location created";
        } else if (logDoc.action === "DELETE") {
          changesSummary = "Location deleted";
        }

        const row = [
          logDoc._id?.toString() || "",
          logDoc.action || "",
          location._id?.toString() || "",
          `"${location.area_name?.replace(/"/g, '""') || ""}"`,
          `"${logDoc.performed_by?.name?.replace(/"/g, '""') || logDoc.performed_by?.user_id || "Unknown"}"`,
          `"${logDoc.performed_by?.email?.replace(/"/g, '""') || "Unknown"}"`,
          logDoc.timestamp ? new Date(logDoc.timestamp).toISOString() : "",
          logDoc.ip_address || "Unknown",
          `"${changesSummary.replace(/"/g, '""')}"`
        ];

        csv += row.join(",") + "\n";
      });

      // Add summary
      csv += "\n\n";
      csv += "Export Summary\n";
      csv += "Location Name," + `"${location.area_name}"` + "\n";
      csv += "Total Audit Logs," + logs.length + "\n";
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
        "Location ID",
        "Location Name",
        "State",
        "District",
        "Performed By",
        "User Email",
        "Timestamp",
        "IP Address"
      ];

      let csv = "\ufeff";
      csv += headers.join(",") + "\n";

      activities.forEach(activity => {
        const activityDoc = activity.toObject ? activity.toObject() : activity;

        const row = [
          activityDoc._id?.toString() || "",
          activityDoc.action || "",
          activityDoc.location_id?._id?.toString() || activityDoc.location_id || "",
          `"${(activityDoc.location_id as any)?.area_name?.replace(/"/g, '""') || "Deleted Area"}"`,
          `"${(activityDoc.location_id as any)?.state?.replace(/"/g, '""') || ""}"`,
          `"${(activityDoc.location_id as any)?.district?.replace(/"/g, '""') || ""}"`,
          `"${activityDoc.performed_by?.name?.replace(/"/g, '""') || activityDoc.performed_by?.user_id || "Unknown"}"`,
          `"${activityDoc.performed_by?.email?.replace(/"/g, '""') || "Unknown"}"`,
          activityDoc.timestamp ? new Date(activityDoc.timestamp).toISOString() : "",
          activityDoc.ip_address || "Unknown"
        ];

        csv += row.join(",") + "\n";
      });

      // Add summary
      csv += "\n\n";
      csv += "Export Summary\n";
      csv += "Total Activities," + activities.length + "\n";
      csv += "Export Date," + new Date().toISOString() + "\n";

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
        "ID",
        "Area Name",
        "State",
        "District",
        "Pincode",
        "Status",
        "Address",
        "Sub-locations Count",
        "Total Machines",
        "Installed Machines",
        "Not Installed Machines",
        "Created At",
        "Updated At"
      ];

      let csv = "\ufeff";
      csv += headers.join(",") + "\n";

      dashboardData.forEach(item => {
        const row = [
          item.id || "",
          `"${(item.area_name || "").replace(/"/g, '""')}"`,
          `"${(item.state || "").replace(/"/g, '""')}"`,
          `"${(item.district || "").replace(/"/g, '""')}"`,
          item.pincode || "",
          `"${(item.status || "").replace(/"/g, '""')}"`,
          `"${(item.address || "").replace(/"/g, '""')}"`,
          item.sub_locations_count || 0,
          item.total_machines || 0,
          item.installed_machines || 0,
          item.not_installed_machines || 0,
          item.created_at ? new Date(item.created_at).toISOString() : "",
          item.updated_at ? new Date(item.updated_at).toISOString() : ""
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
      csv += "Export Date," + new Date().toISOString() + "\n";

      return csv;
    } catch (error) {
      logger.error("Error converting dashboard data to CSV:", error);
      return "Error generating dashboard CSV";
    }
  }
  
}