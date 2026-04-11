import { Request, Response } from "express";
import mongoose from "mongoose";
import { AreaService, AuditLogParams, DashboardFilterParams } from "../services/arearoute.service";
import { ImageUploadService } from "../services/areaFileUpload.service";
import { logger } from "../utils/logger.util";

import {
  LocationModel,
  SubLocationModel,
  MachineDetailsModel,
  HistoryAreaModel,
  IMachineImageData,
} from "../models/AreaRoute.model";

// ─────────────────────────────────────────────────────────────────────────────
// Controller
// ─────────────────────────────────────────────────────────────────────────────

export class AreaController {
  // ── Shared helpers ──────────────────────────────────────────────────────────

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

  private static async createAuditLog(data: {
    location_id: mongoose.Types.ObjectId;
    action:
      | "CREATE"
      | "UPDATE"
      | "DELETE"
      | "STATUS_CHANGE"
      | "ADD_SUB_LOCATION"
      | "REMOVE_MACHINE";
    old_data?: any;
    new_data?: any;
    changes?: Record<string, { old: any; new: any }>;
    performed_by: { user_id: string; email: string; name?: string };
    ip_address?: string;
    user_agent?: string;
    timestamp: Date;
  }): Promise<void> {
    try {
      await new HistoryAreaModel({
        location_id: data.location_id,
        action: data.action,
        old_data: data.old_data ?? null,
        new_data: data.new_data ?? null,
        changes: data.changes ?? null,
        performed_by: data.performed_by,
        ip_address: data.ip_address,
        user_agent: data.user_agent,
        timestamp: data.timestamp || new Date(),
      }).save();
    } catch (error) {
      logger.error("Error creating audit log:", error);
    }
  }

  private static isValidObjectId(id: string): boolean {
    return mongoose.Types.ObjectId.isValid(id);
  }

  // ── Location endpoints ──────────────────────────────────────────────────────

  static async createLocation(req: Request, res: Response): Promise<void> {
    try {
      let locationData: any;
      try {
        locationData = req.body.data ? JSON.parse(req.body.data) : req.body;
      } catch {
        res.status(400).json({ success: false, message: "Failed to parse request data" });
        return;
      }

      const required = ["area_name", "state", "district", "pincode", "area_description", "status"];
      const missing = required.filter(f => !locationData[f]);
      if (missing.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required fields: ${missing.join(", ")}`,
        });
        return;
      }

      const auditParams = AreaController.getAuditParams(req);
      const newLocation = await AreaService.createLocation(locationData, auditParams);

      res.status(201).json({
        success: true,
        message: "Location created successfully",
        data: newLocation,
      });
    } catch (error: any) {
      logger.error("Error creating location:", error);
      const status = error.message?.includes("already exists") ? 409 : 500;
      res
        .status(status)
        .json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async getAllLocations(req: Request, res: Response): Promise<void> {
    try {
      const queryParams: any = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        status: req.query.status as string,
        state: req.query.state as string,
        district: req.query.district as string,
        search: req.query.search as string,
        sortBy: (req.query.sortBy as string) || "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
      };

      // Build query for enrichment
      const filter: any = {};
      if (queryParams.status && queryParams.status !== "all") filter.status = queryParams.status;
      if (queryParams.state) filter.state = new RegExp(queryParams.state, "i");
      if (queryParams.district) filter.district = new RegExp(queryParams.district, "i");
      if (queryParams.search) {
        filter.$or = [
          { area_name: new RegExp(queryParams.search, "i") },
          { state: new RegExp(queryParams.search, "i") },
          { district: new RegExp(queryParams.search, "i") },
        ];
      }

      const skip = (queryParams.page - 1) * queryParams.limit;
      const [locations, total] = await Promise.all([
        LocationModel.find(filter)
          .sort({ [queryParams.sortBy]: queryParams.sortOrder === "asc" ? 1 : -1 })
          .skip(skip)
          .limit(queryParams.limit),
        LocationModel.countDocuments(filter),
      ]);

      const enriched = await Promise.all(
        locations.map(async location => {
          const subLocations = await SubLocationModel.find({
            location_id: location._id,
          });
          const subLocationsWithMachines = await Promise.all(
            subLocations.map(async subLoc => {
              const machines = await MachineDetailsModel.find({
                sub_location_id: subLoc._id,
              });
              return { ...subLoc.toObject(), machines };
            })
          );
          const totalMachines = subLocationsWithMachines.reduce(
            (s, sl) => s + sl.machines.length,
            0
          );
          const installedMachines = subLocationsWithMachines.reduce(
            (s, sl) =>
              s + sl.machines.filter((m: any) => m.installed_status === "installed").length,
            0
          );
          const activeMachines = subLocationsWithMachines.reduce(
            (s, sl) => s + sl.machines.filter((m: any) => m.status === "active").length,
            0
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
        data: enriched,
        pagination: {
          currentPage: queryParams.page,
          totalItems: total,
          totalPages: Math.ceil(total / queryParams.limit),
          itemsPerPage: queryParams.limit,
        },
      });
    } catch (error: any) {
      logger.error("Error fetching locations:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async getLocationById(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      if (!AreaController.isValidObjectId(locationId)) {
        res.status(400).json({ success: false, message: "Invalid location ID format" });
        return;
      }

      const location = await LocationModel.findById(locationId);
      if (!location) {
        res.status(404).json({ success: false, message: "Location not found" });
        return;
      }

      const subLocations = await SubLocationModel.find({ location_id: locationId });
      const subLocationsWithMachines = await Promise.all(
        subLocations.map(async subLoc => {
          const machines = await MachineDetailsModel.find({
            sub_location_id: subLoc._id,
          });
          return { ...subLoc.toObject(), machines };
        })
      );

      const totalMachines = subLocationsWithMachines.reduce((s, sl) => s + sl.machines.length, 0);
      const installedMachines = subLocationsWithMachines.reduce(
        (s, sl) => s + sl.machines.filter((m: any) => m.installed_status === "installed").length,
        0
      );
      const activeMachines = subLocationsWithMachines.reduce(
        (s, sl) => s + sl.machines.filter((m: any) => m.status === "active").length,
        0
      );

      res.status(200).json({
        success: true,
        data: {
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
        },
      });
    } catch (error: any) {
      logger.error("Error fetching location:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async updateLocation(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      if (!AreaController.isValidObjectId(locationId)) {
        res.status(400).json({ success: false, message: "Invalid location ID format" });
        return;
      }

      const auditParams = AreaController.getAuditParams(req);
      const updated = await AreaService.updateLocation(locationId, req.body, auditParams);

      if (!updated) {
        res.status(404).json({ success: false, message: "Location not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Location updated successfully",
        data: updated,
      });
    } catch (error: any) {
      logger.error("Error updating location:", error);
      if (error instanceof mongoose.Error.ValidationError) {
        const msgs = Object.values(error.errors).map((e: any) => e.message);
        res.status(400).json({ success: false, message: `Validation failed: ${msgs.join(", ")}` });
        return;
      }
      const status = error.message?.includes("not found")
        ? 404
        : error.message?.includes("already exists")
          ? 409
          : 500;
      res
        .status(status)
        .json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async deleteLocation(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      if (!AreaController.isValidObjectId(locationId)) {
        res.status(400).json({ success: false, message: "Invalid location ID" });
        return;
      }

      const auditParams = AreaController.getAuditParams(req);
      const deleted = await AreaService.deleteLocation(locationId, auditParams);

      if (!deleted) {
        res.status(404).json({ success: false, message: "Location not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Location and all associated data deleted successfully",
      });
    } catch (error: any) {
      logger.error("Error deleting location:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async toggleLocationStatus(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      if (!AreaController.isValidObjectId(locationId)) {
        res.status(400).json({ success: false, message: "Invalid location ID format" });
        return;
      }

      const auditParams = AreaController.getAuditParams(req);
      const updated = await AreaService.toggleLocationStatus(locationId, auditParams);

      if (!updated) {
        res.status(404).json({ success: false, message: "Location not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Location status changed to ${updated.status}`,
        data: updated,
      });
    } catch (error: any) {
      logger.error("Error toggling location status:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async checkLocationExists(req: Request, res: Response): Promise<void> {
    try {
      const { area_name, excludeId } = req.query;
      if (!area_name) {
        res.status(400).json({ success: false, message: "Area name is required" });
        return;
      }
      const exists = await AreaService.checkLocationExists(
        area_name as string,
        excludeId as string | undefined
      );
      res.status(200).json({ success: true, data: { exists } });
    } catch (error: any) {
      logger.error("Error checking location existence:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async addSubLocation(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      if (!AreaController.isValidObjectId(locationId)) {
        res.status(400).json({ success: false, message: "Invalid location ID" });
        return;
      }

      let subLocationData: any;
      try {
        subLocationData = req.body.data ? JSON.parse(req.body.data) : req.body;
      } catch {
        res.status(400).json({ success: false, message: "Failed to parse request data" });
        return;
      }

      const required = ["campus", "tower", "floor", "select_machine"];
      const missing = required.filter(f => !subLocationData[f]);
      if (missing.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required fields: ${missing.join(", ")}`,
        });
        return;
      }

      if (
        !Array.isArray(subLocationData.select_machine) ||
        subLocationData.select_machine.length === 0
      ) {
        res.status(400).json({
          success: false,
          message: "select_machine must be a non-empty array of machineIds",
        });
        return;
      }

      const auditParams = AreaController.getAuditParams(req);
      const result = await AreaService.createSubLocation(locationId, subLocationData, auditParams);

      res.status(201).json({
        success: true,
        message: "Sub-location added successfully",
        data: {
          subLocation: {
            id: result.subLocation._id,
            campus: result.subLocation.campus,
            tower: result.subLocation.tower,
            floor: result.subLocation.floor,
            select_machine: result.subLocation.select_machine,
            location_id: result.subLocation.location_id,
            created_at: result.subLocation.createdAt,
            updated_at: result.subLocation.updatedAt,
          },
          machines_added: result.machines.map(m => ({
            id: m._id,
            machineId: m.machineId, // ← machineId field
            installed_status: m.installed_status,
            status: m.status,
            sub_location_id: m.sub_location_id,
          })),
          total_machines_added: result.machines.length,
        },
      });
    } catch (error: any) {
      logger.error("Error adding sub-location:", error);
      const status = error.message?.includes("not found")
        ? 404
        : error.message?.includes("do not exist")
          ? 422
          : 500;
      res
        .status(status)
        .json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async getSubLocationsByLocationId(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;

      if (!AreaController.isValidObjectId(locationId)) {
        res.status(400).json({ success: false, message: "Invalid location ID" });
        return;
      }

      const location = await LocationModel.findById(locationId);
      if (!location) {
        res.status(404).json({ success: false, message: "Location not found" });
        return;
      }

      const subLocations = await SubLocationModel.find({ location_id: locationId });
      const subLocationsWithMachines = await Promise.all(
        subLocations.map(async subLoc => {
          const machines = await MachineDetailsModel.find({
            sub_location_id: subLoc._id,
          });
          return { ...subLoc.toObject(), machines };
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
    } catch (error: any) {
      logger.error("Error fetching sub-locations:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async updateSubLocation(req: Request, res: Response): Promise<void> {
    try {
      const { subLocationId } = req.params;

      if (!AreaController.isValidObjectId(subLocationId)) {
        res.status(400).json({ success: false, message: "Invalid sub-location ID" });
        return;
      }

      const updateData = req.body;

      if (updateData.select_machine !== undefined) {
        if (!Array.isArray(updateData.select_machine)) {
          res.status(400).json({
            success: false,
            message: "select_machine must be an array of machineIds",
          });
          return;
        }
        if (updateData.select_machine.length === 0) {
          res.status(400).json({
            success: false,
            message: "select_machine cannot be empty",
          });
          return;
        }
      }

      const auditParams = AreaController.getAuditParams(req);
      const result = await AreaService.updateSubLocation(subLocationId, updateData, auditParams);

      if (!result) {
        res.status(404).json({ success: false, message: "Sub-location not found" });
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
            total_machines: result.subLocation.select_machine.length,
          },
        },
      });
    } catch (error: any) {
      logger.error("Error updating sub-location:", error);
      const status = error.message?.includes("not found")
        ? 404
        : error.message?.includes("do not exist")
          ? 422
          : error.message?.includes("Invalid")
            ? 400
            : 500;
      res
        .status(status)
        .json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async deleteSubLocation(req: Request, res: Response): Promise<void> {
    try {
      const { subLocationId } = req.params;

      if (!AreaController.isValidObjectId(subLocationId)) {
        res.status(400).json({ success: false, message: "Invalid sub-location ID" });
        return;
      }

      const subLocation = await SubLocationModel.findById(subLocationId);
      if (!subLocation) {
        res.status(404).json({ success: false, message: "Sub-location not found" });
        return;
      }

      const auditParams = AreaController.getAuditParams(req);
      await AreaService.deleteSubLocation(subLocationId, auditParams);

      res.status(200).json({
        success: true,
        message: `Sub-location "${subLocation.campus} - ${subLocation.tower} - ${subLocation.floor}" deleted successfully`,
      });
    } catch (error: any) {
      logger.error("Error deleting sub-location:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  // ── MachineDetails endpoints ────────────────────────────────────────────────

  static async getMachineDetailsBySubLocationId(req: Request, res: Response): Promise<void> {
    try {
      const { subLocationId } = req.params;

      if (!AreaController.isValidObjectId(subLocationId)) {
        res.status(400).json({ success: false, message: "Invalid sub-location ID" });
        return;
      }

      const subLocation = await SubLocationModel.findById(subLocationId);
      if (!subLocation) {
        res.status(404).json({ success: false, message: "Sub-location not found" });
        return;
      }

      const machines = await MachineDetailsModel.find({
        sub_location_id: subLocationId,
      });
      const location = await LocationModel.findById(subLocation.location_id);

      res.status(200).json({
        success: true,
        data: {
          sub_location: {
            id: subLocation._id,
            campus: subLocation.campus,
            tower: subLocation.tower,
            floor: subLocation.floor,
            location_info: location
              ? {
                  id: location._id,
                  area_name: location.area_name,
                  state: location.state,
                  district: location.district,
                }
              : null,
          },
          machines,
          total: machines.length,
          summary: {
            installed_machines: machines.filter(m => m.installed_status === "installed").length,
            not_installed_machines: machines.filter(m => m.installed_status === "not_installed")
              .length,
            active_machines: machines.filter(m => m.status === "active").length,
            inactive_machines: machines.filter(m => m.status === "inactive").length,
          },
        },
      });
    } catch (error: any) {
      logger.error("Error fetching machine details:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async updateMachineDetails(req: Request, res: Response): Promise<void> {
    try {
      const { machineDetailsId } = req.params;
      const updateData = req.body;
      const files = req.files as Express.Multer.File[] | undefined;

      if (!AreaController.isValidObjectId(machineDetailsId)) {
        res.status(400).json({ success: false, message: "Invalid machine details ID" });
        return;
      }

      if (
        updateData.installed_status &&
        !["installed", "not_installed"].includes(updateData.installed_status)
      ) {
        res.status(400).json({
          success: false,
          message: "installed_status must be 'installed' or 'not_installed'",
        });
        return;
      }
      if (updateData.status && !["active", "inactive"].includes(updateData.status)) {
        res.status(400).json({
          success: false,
          message: "status must be 'active' or 'inactive'",
        });
        return;
      }

      const current = await MachineDetailsModel.findById(machineDetailsId);
      if (!current) {
        res.status(404).json({ success: false, message: "Machine details not found" });
        return;
      }

      const oldData = current.toObject();
      let processedFiles: IMachineImageData[] = [];

      // Handle new file uploads — append to existing images
      if (files && files.length > 0) {
        const uploadService = new ImageUploadService();
        processedFiles = await uploadService.uploadMultipleFiles(
          files,
          "machine_images",
          "areaMachine"
        );
        updateData.machine_image = [...(current.machine_image || []), ...processedFiles];
      }

      const updated = await MachineDetailsModel.findByIdAndUpdate(machineDetailsId, updateData, {
        new: true,
      });
      if (!updated) {
        res.status(404).json({ success: false, message: "Failed to update machine details" });
        return;
      }

      // Build audit changes
      const subLocation = await SubLocationModel.findById(updated.sub_location_id);
      const locationId = subLocation?.location_id;
      const changes: Record<string, { old: any; new: any }> = {};

      if (updateData.installed_status && updateData.installed_status !== oldData.installed_status) {
        changes["machine.installed_status"] = {
          old: oldData.installed_status,
          new: updateData.installed_status,
        };
      }
      if (updateData.status && updateData.status !== oldData.status) {
        changes["machine.status"] = { old: oldData.status, new: updateData.status };
      }
      if (processedFiles.length > 0) {
        changes["machine_image"] = {
          old: oldData.machine_image?.length || 0,
          new: updated.machine_image.length,
        };
      }

      if (Object.keys(changes).length > 0 && locationId) {
        const auditParams = AreaController.getAuditParams(req);
        await AreaController.createAuditLog({
          location_id: locationId as mongoose.Types.ObjectId,
          action: "UPDATE",
          changes,
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
        message:
          "Machine details updated successfully" +
          (processedFiles.length > 0 ? ` with ${processedFiles.length} new image(s)` : ""),
        data: updated,
      });
    } catch (error: any) {
      logger.error("Error updating machine details:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async removeMachine(req: Request, res: Response): Promise<void> {
    try {
      const { machineDetailsId } = req.params;

      if (!AreaController.isValidObjectId(machineDetailsId)) {
        res.status(400).json({ success: false, message: "Invalid machine details ID" });
        return;
      }

      const machineDetails = await MachineDetailsModel.findById(machineDetailsId);
      if (!machineDetails) {
        res.status(404).json({ success: false, message: "Machine not found" });
        return;
      }

      const machineId = machineDetails.machineId; // ← machineId field
      const auditParams = AreaController.getAuditParams(req);
      await AreaService.deleteMachine(machineDetailsId, auditParams);

      res.status(200).json({
        success: true,
        message: `Machine "${machineId}" removed successfully`,
        data: { machine_details_id: machineDetailsId, machineId },
      });
    } catch (error: any) {
      logger.error("Error removing machine:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async toggleMachineStatus(req: Request, res: Response): Promise<void> {
    try {
      const { machineDetailsId } = req.params;

      if (!AreaController.isValidObjectId(machineDetailsId)) {
        res.status(400).json({ success: false, message: "Invalid machine details ID" });
        return;
      }

      const auditParams = AreaController.getAuditParams(req);
      const updated = await AreaService.toggleMachineStatus(machineDetailsId, auditParams);
      if (!updated) {
        res.status(404).json({ success: false, message: "Machine not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Machine status changed to ${updated.status}`,
        data: updated,
      });
    } catch (error: any) {
      logger.error("Error toggling machine status:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async toggleMachineInstalledStatus(req: Request, res: Response): Promise<void> {
    try {
      const { machineDetailsId } = req.params;

      if (!AreaController.isValidObjectId(machineDetailsId)) {
        res.status(400).json({ success: false, message: "Invalid machine details ID" });
        return;
      }

      const auditParams = AreaController.getAuditParams(req);
      const updated = await AreaService.toggleMachineInstalledStatus(machineDetailsId, auditParams);
      if (!updated) {
        res.status(404).json({ success: false, message: "Machine not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Machine installed status changed to ${updated.installed_status}`,
        data: updated,
      });
    } catch (error: any) {
      logger.error("Error toggling machine installed status:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  // ── Machine Image endpoints ─────────────────────────────────────────────────

  static async removeMachineImage(req: Request, res: Response): Promise<void> {
    try {
      const { machineDetailsId, imageIndex } = req.params;
      const index = parseInt(imageIndex);

      if (!AreaController.isValidObjectId(machineDetailsId)) {
        res.status(400).json({ success: false, message: "Invalid machine details ID" });
        return;
      }
      if (isNaN(index) || index < 0) {
        res.status(400).json({ success: false, message: "Invalid image index" });
        return;
      }

      const auditParams = AreaController.getAuditParams(req);
      const updated = await AreaService.removeMachineImage(machineDetailsId, index, auditParams);
      if (!updated) {
        res.status(404).json({ success: false, message: "Machine details not found" });
        return;
      }

      res.status(200).json({
        success: true,
        message: "Image removed successfully",
        data: { machine: updated },
      });
    } catch (error: any) {
      logger.error("Error removing machine image:", error);
      const status = error.message?.includes("not found") ? 404 : 500;
      res
        .status(status)
        .json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async updateMachineImages(req: Request, res: Response): Promise<void> {
    try {
      const { machineDetailsId } = req.params;
      const files = req.files as Express.Multer.File[] | undefined;

      if (!AreaController.isValidObjectId(machineDetailsId)) {
        res.status(400).json({ success: false, message: "Invalid machine details ID" });
        return;
      }
      if (!files || files.length === 0) {
        res.status(400).json({ success: false, message: "No images provided for update" });
        return;
      }

      const auditParams = AreaController.getAuditParams(req);
      const updated = await AreaService.updateMachineImages(machineDetailsId, files, auditParams);

      res.status(200).json({
        success: true,
        message: `Machine images replaced with ${updated.machine_image.length} new image(s)`,
        data: {
          machine: {
            id: updated._id,
            machineId: updated.machineId, // ← machineId field
            images_count: updated.machine_image.length,
            images: updated.machine_image.map(img => ({
              image_name: img.image_name,
              file_url: img.file_url,
              uploaded_at: img.uploaded_at,
            })),
          },
        },
      });
    } catch (error: any) {
      logger.error("Error updating machine images:", error);
      const status = error.message?.includes("not found") ? 404 : 500;
      res
        .status(status)
        .json({ success: false, message: error.message || "Internal server error" });
    }
  }

  // ── Search ──────────────────────────────────────────────────────────────────

  /**
   * GET /machines/search?q=VM2024
   * Searches MachineDetails by machineId (partial match).
   */
  static async searchMachines(req: Request, res: Response): Promise<void> {
    try {
      const searchTerm = (req.query.q as string)?.trim();
      if (!searchTerm) {
        res.status(400).json({ success: false, message: "Search term is required" });
        return;
      }

      const machines = await AreaService.searchMachines(searchTerm);

      const enriched = machines.map(machine => ({
        id: machine._id,
        machineId: machine.machineId, // ← machineId field
        installed_status: machine.installed_status,
        status: machine.status,
        images_count: machine.machine_image.length,
        sub_location: machine.sub_location_id
          ? {
              id: (machine.sub_location_id as any)._id,
              campus: (machine.sub_location_id as any).campus,
              tower: (machine.sub_location_id as any).tower,
              floor: (machine.sub_location_id as any).floor,
            }
          : null,
        location: (machine.sub_location_id as any)?.location_id
          ? {
              id: (machine.sub_location_id as any).location_id._id,
              area_name: (machine.sub_location_id as any).location_id.area_name,
              state: (machine.sub_location_id as any).location_id.state,
              district: (machine.sub_location_id as any).location_id.district,
            }
          : null,
      }));

      res.status(200).json({
        success: true,
        data: { machines: enriched, total: enriched.length, search_term: searchTerm },
      });
    } catch (error: any) {
      logger.error("Error searching machines:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  // ── Audit Log endpoints ─────────────────────────────────────────────────────

  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!AreaController.isValidObjectId(locationId)) {
        res.status(400).json({ success: false, message: "Invalid location ID" });
        return;
      }

      const result = await AreaService.getAuditLogs(locationId, page, limit);

      res.status(200).json({
        success: true,
        data: { logs: result.logs, pagination: result.pagination },
      });
    } catch (error: any) {
      logger.error("Error fetching audit logs:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async getAuditLogsBySubLocationId(req: Request, res: Response): Promise<void> {
    try {
      const { subLocationId } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!AreaController.isValidObjectId(subLocationId)) {
        res.status(400).json({ success: false, message: "Invalid sub-location ID" });
        return;
      }

      const result = await AreaService.getAuditLogsBySubLocationId(subLocationId, page, limit);
      const subLocation = await SubLocationModel.findById(subLocationId);

      const enrichedLogs = result.logs.map(log => {
        const logObj = (log as any).toObject ? (log as any).toObject() : log;
        const subLocationChanges: any[] = [];
        if (logObj.changes) {
          Object.keys(logObj.changes).forEach(key => {
            if (["campus", "tower", "floor", "select_machine"].includes(key)) {
              subLocationChanges.push({
                field: key,
                old: logObj.changes[key].old,
                new: logObj.changes[key].new,
              });
            }
          });
        }
        return {
          ...logObj,
          sub_location_info: subLocation
            ? {
                id: subLocation._id,
                campus: subLocation.campus,
                tower: subLocation.tower,
                floor: subLocation.floor,
              }
            : null,
          sub_location_changes: subLocationChanges.length > 0 ? subLocationChanges : undefined,
        };
      });

      res.status(200).json({
        success: true,
        data: {
          logs: enrichedLogs,
          sub_location: subLocation
            ? {
                id: subLocation._id,
                campus: subLocation.campus,
                tower: subLocation.tower,
                floor: subLocation.floor,
              }
            : null,
          pagination: result.pagination,
        },
      });
    } catch (error: any) {
      logger.error("Error fetching sub-location audit logs:", error);
      const status = error.message?.includes("not found") ? 404 : 500;
      res
        .status(status)
        .json({ success: false, message: error.message || "Internal server error" });
    }
  }
  static async getRecentActivities(req: Request, res: Response): Promise<void> {
    try {
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;
      const action = req.query.action as string;
      const locationId = req.query.locationId as string;
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      // Build filter
      const filter: any = {};

      if (action && action !== "all") {
        filter.action = action;
      }

      if (locationId) {
        if (!mongoose.Types.ObjectId.isValid(locationId)) {
          res.status(400).json({
            success: false,
            activities: [],
            message: "Invalid location ID format",
          });
          return;
        }
        filter.location_id = new mongoose.Types.ObjectId(locationId);
      }

      if (startDate || endDate) {
        filter.timestamp = {};
        if (startDate) {
          filter.timestamp.$gte = new Date(startDate);
        }
        if (endDate) {
          filter.timestamp.$lte = new Date(endDate);
        }
      }

      const result = await AreaService.getRecentActivities(page, limit, filter);

      // Get summary statistics
      const totalByAction = await HistoryAreaModel.aggregate([
        { $match: filter },
        { $group: { _id: "$action", count: { $sum: 1 } } },
      ]);

      const actionSummary: Record<string, number> = {};
      totalByAction.forEach(item => {
        actionSummary[item._id] = item.count;
      });

      res.status(200).json({
        success: true,
        activities: Array.isArray(result.activities) ? result.activities : [],
        summary: {
          total: result.pagination.totalItems,
          by_action: actionSummary,
        },
        pagination: result.pagination,
      });
    } catch (error: any) {
      logger.error("Error fetching recent activities:", error);
      res.status(500).json({
        success: false,
        activities: [],
        summary: {
          total: 0,
          by_action: {},
        },
        pagination: {
          currentPage: 1,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage: 10,
        },
        message: error.message || "Internal server error",
      });
    }
  }
  // ── Dashboard endpoints ─────────────────────────────────────────────────────

  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const params = {
        status: (req.query.status as "active" | "inactive" | "all") || "all",
        state: req.query.state as string,
        district: req.query.district as string,
        address: req.query.address as string,
        campus: req.query.campus as string,
        tower: req.query.tower as string,
        floor: req.query.floor as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: (req.query.sortBy as string) || "createdAt",
        sortOrder: (req.query.sortOrder as "asc" | "desc") || "desc",
      };

      const data = await AreaService.getDashboardData(params);

      res.status(200).json({ success: true, data });
    } catch (error: any) {
      logger.error("Error fetching dashboard data:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async getDashboardTableData(req: Request, res: Response): Promise<void> {
    try {
      const params = {
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

      const result = await AreaService.getDashboardTableData(params);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: {
          currentPage: params.page,
          totalItems: result.total,
          totalPages: Math.ceil(result.total / params.limit),
          itemsPerPage: params.limit,
        },
      });
    } catch (error: any) {
      logger.error("Error fetching dashboard table data:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  // ── Filter Options ──────────────────────────────────────────────────────────

  static async getFilterOptions(req: Request, res: Response): Promise<void> {
    try {
      const options = await AreaService.getFilterOptions();
      res.status(200).json({ success: true, data: options });
    } catch (error: any) {
      logger.error("Error fetching filter options:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  // ── Export endpoints ────────────────────────────────────────────────────────

  static async exportSubLocationsByLocationId(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const format = (req.query.format as string) || "csv";

      if (!AreaController.isValidObjectId(locationId)) {
        res.status(400).json({ success: false, message: "Invalid location ID" });
        return;
      }

      const result = await AreaService.exportSubLocationsByLocationId(locationId, format);

      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);

      if (format === "csv") {
        res.status(200).send(result.data);
      } else {
        res.status(200).json({ success: true, ...result.data });
      }
    } catch (error: any) {
      logger.error("Error exporting sub-locations:", error);
      const status = error.message?.includes("not found") ? 404 : 500;
      res
        .status(status)
        .json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async exportLocations(req: Request, res: Response): Promise<void> {
    try {
      const format = (req.query.format as string) || "csv";
      const status = req.query.status as string;
      const state = req.query.state as string;
      const district = req.query.district as string;
      const search = req.query.search as string;
      const includeImages = req.query.includeImages === "true";

      const filter: any = {};
      if (status && status !== "all") filter.status = status;
      if (state) filter.state = { $regex: state, $options: "i" };
      if (district) filter.district = { $regex: district, $options: "i" };
      if (search) {
        filter.$or = [
          { area_name: { $regex: search, $options: "i" } },
          { state: { $regex: search, $options: "i" } },
          { district: { $regex: search, $options: "i" } },
        ];
      }

      const locations = await LocationModel.find(filter).limit(1000);
      if (locations.length === 0) {
        res.status(404).json({ success: false, message: "No locations found to export" });
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, "-");

      if (format === "csv") {
        const csv = await AreaController.generateDetailedCSVExport(locations, includeImages);
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="locations-export-${timestamp}.csv"`
        );
        res.status(200).send(csv);
      } else if (format === "json") {
        const detailed = await AreaController.buildDetailedLocationsJson(locations, includeImages);
        res.setHeader("Content-Type", "application/json");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename="locations-export-${timestamp}.json"`
        );
        res.status(200).json({
          success: true,
          data: detailed,
          export_date: new Date().toISOString(),
          total: detailed.length,
        });
      } else {
        res
          .status(400)
          .json({ success: false, message: 'Unsupported format. Use "csv" or "json"' });
      }
    } catch (error: any) {
      logger.error("Error exporting locations:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async exportLocationAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { locationId } = req.params;
      const format = (req.query.format as string) || "csv";

      if (!AreaController.isValidObjectId(locationId)) {
        res.status(400).json({ success: false, message: "Invalid location ID" });
        return;
      }

      const location = await LocationModel.findById(locationId);
      if (!location) {
        res.status(404).json({ success: false, message: "Location not found" });
        return;
      }

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
      } else {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
        res.status(200).json({
          success: true,
          location: {
            id: location._id,
            name: location.area_name,
            state: location.state,
            district: location.district,
          },
          audit_logs: logs.map(l => (l as any).toObject()),
          total_logs: logs.length,
          export_date: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error("Error exporting location audit logs:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  static async exportRecentAuditActivities(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 100;
      const format = (req.query.format as string) || "csv";
      const startDate = req.query.startDate as string;
      const endDate = req.query.endDate as string;

      const filter: any = {};
      if (startDate) filter.timestamp = { $gte: new Date(startDate) };
      if (endDate) filter.timestamp = { ...(filter.timestamp || {}), $lte: new Date(endDate) };

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
      } else {
        res.setHeader("Content-Type", "application/json");
        res.setHeader("Content-Disposition", `attachment; filename="${filename}.json"`);
        res.status(200).json({
          success: true,
          activities: activities.map(a => (a as any).toObject()),
          total_activities: activities.length,
          export_date: new Date().toISOString(),
        });
      }
    } catch (error: any) {
      logger.error("Error exporting recent audit activities:", error);
      res.status(500).json({ success: false, message: error.message || "Internal server error" });
    }
  }

  // ── Private CSV/JSON helpers ────────────────────────────────────────────────

  private static async buildDetailedLocationsJson(
    locations: any[],
    includeImages: boolean
  ): Promise<any[]> {
    return Promise.all(
      locations.map(async location => {
        const subLocations = await SubLocationModel.find({
          location_id: location._id,
        });
        const detailedSubLocations = await Promise.all(
          subLocations.map(async subLoc => {
            const machines = await MachineDetailsModel.find({
              sub_location_id: subLoc._id,
            });
            const detailedMachines = machines.map(m => ({
              id: m._id,
              machineId: m.machineId, // ← machineId field
              installed_status: m.installed_status,
              status: m.status,
              images_count: m.machine_image.length,
              images: includeImages ? m.machine_image : undefined,
              created_at: m.createdAt,
              updated_at: m.updatedAt,
            }));
            return {
              id: subLoc._id,
              campus: subLoc.campus,
              tower: subLoc.tower,
              floor: subLoc.floor,
              select_machine: subLoc.select_machine,
              machines: detailedMachines,
              created_at: subLoc.createdAt,
              updated_at: subLoc.updatedAt,
            };
          })
        );
        return {
          ...location.toObject(),
          sub_locations: detailedSubLocations,
        };
      })
    );
  }

  private static async generateDetailedCSVExport(
    locations: any[],
    _includeImages: boolean
  ): Promise<string> {
    try {
      let csv = "\ufeff";
      const headers = [
        "Location ID",
        "Area Name",
        "State",
        "District",
        "Pincode",
        "Location Status",
        "Address",
        "Sub-location ID",
        "Campus",
        "Tower",
        "Floor",
        "Selected Machine IDs", // ← renamed
        "Machine Details ID",
        "Machine ID",
        "Installed Status",
        "Machine Status",
        "Images Count", // ← machineId
        "Machine Created At",
      ];
      csv += headers.join(",") + "\n";

      for (const location of locations) {
        const locObj = location.toObject ? location.toObject() : location;
        const subLocations = await SubLocationModel.find({
          location_id: location._id,
        });

        if (subLocations.length === 0) {
          csv +=
            [
              locObj._id,
              `"${locObj.area_name}"`,
              `"${locObj.state}"`,
              `"${locObj.district}"`,
              locObj.pincode,
              locObj.status,
              `"${locObj.address || ""}"`,
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
              "",
            ].join(",") + "\n";
          continue;
        }

        for (const subLoc of subLocations) {
          const subLocObj = subLoc.toObject ? subLoc.toObject() : subLoc;
          const machines = await MachineDetailsModel.find({
            sub_location_id: subLoc._id,
          });

          if (machines.length === 0) {
            csv +=
              [
                locObj._id,
                `"${locObj.area_name}"`,
                `"${locObj.state}"`,
                `"${locObj.district}"`,
                locObj.pincode,
                locObj.status,
                `"${locObj.address || ""}"`,
                subLocObj._id,
                `"${subLocObj.campus}"`,
                `"${subLocObj.tower}"`,
                `"${subLocObj.floor}"`,
                `"${(subLocObj.select_machine || []).join("; ")}"`,
                "",
                "",
                "",
                "",
                "",
                "",
              ].join(",") + "\n";
            continue;
          }

          for (const m of machines) {
            const mObj = m.toObject ? m.toObject() : m;
            csv +=
              [
                locObj._id,
                `"${locObj.area_name}"`,
                `"${locObj.state}"`,
                `"${locObj.district}"`,
                locObj.pincode,
                locObj.status,
                `"${locObj.address || ""}"`,
                subLocObj._id,
                `"${subLocObj.campus}"`,
                `"${subLocObj.tower}"`,
                `"${subLocObj.floor}"`,
                `"${(subLocObj.select_machine || []).join("; ")}"`,
                mObj._id,
                `"${mObj.machineId || ""}"`, // ← machineId field
                mObj.installed_status,
                mObj.status,
                mObj.machine_image?.length || 0,
                mObj.createdAt ? new Date(mObj.createdAt).toISOString() : "",
              ].join(",") + "\n";
          }
        }
      }

      csv += `\n\nTotal Locations,${locations.length}\nExport Date,${new Date().toISOString()}\n`;
      return csv;
    } catch (error) {
      logger.error("Error generating CSV:", error);
      return "Error generating CSV export";
    }
  }

  private static convertAuditLogsToCSV(logs: any[], location: any): string {
    const headers = [
      "Log ID",
      "Action",
      "Location ID",
      "Location Name",
      "Performed By",
      "User Email",
      "Timestamp",
      "IP Address",
      "Changes Summary",
    ];
    let csv = "\ufeff" + headers.join(",") + "\n";

    logs.forEach(log => {
      const l = log.toObject ? log.toObject() : log;
      const changesSummary = l.changes
        ? `${Object.keys(l.changes).length} field(s) changed`
        : l.action === "CREATE"
          ? "New location created"
          : l.action === "DELETE"
            ? "Location deleted"
            : "";

      csv +=
        [
          l._id,
          l.action,
          location._id,
          `"${location.area_name}"`,
          `"${l.performed_by?.name || l.performed_by?.user_id || "Unknown"}"`,
          `"${l.performed_by?.email || "Unknown"}"`,
          l.timestamp ? new Date(l.timestamp).toISOString() : "",
          l.ip_address || "Unknown",
          `"${changesSummary}"`,
        ].join(",") + "\n";
    });

    csv += `\n\nTotal Audit Logs,${logs.length}\nExport Date,${new Date().toISOString()}\n`;
    return csv;
  }

  private static convertActivitiesToCSV(activities: any[]): string {
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
      "IP Address",
    ];
    let csv = "\ufeff" + headers.join(",") + "\n";

    activities.forEach(activity => {
      const a = activity.toObject ? activity.toObject() : activity;
      csv +=
        [
          a._id,
          a.action,
          a.location_id?._id || a.location_id,
          `"${(a.location_id as any)?.area_name || "Deleted Area"}"`,
          `"${(a.location_id as any)?.state || ""}"`,
          `"${(a.location_id as any)?.district || ""}"`,
          `"${a.performed_by?.name || a.performed_by?.user_id || "Unknown"}"`,
          `"${a.performed_by?.email || "Unknown"}"`,
          a.timestamp ? new Date(a.timestamp).toISOString() : "",
          a.ip_address || "Unknown",
        ].join(",") + "\n";
    });

    csv += `\n\nTotal Activities,${activities.length}\nExport Date,${new Date().toISOString()}\n`;
    return csv;
  }

  static async exportLocationById(req: Request, res: Response): Promise<void> {
    try {
      const { ids } = req.params;
      const format = (req.query.format as string) || "json";

      if (!AreaController.isValidObjectId(ids)) {
        res.status(400).json({ success: false, message: "Invalid location ID" });
        return;
      }

      const result = await AreaService.exportLocationById(ids, format);

      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);

      if (format === "csv") {
        res.status(200).send(result.data);
      } else {
        res.status(200).json({
          success: true,
          ...result.data,
        });
      }
    } catch (error: any) {
      logger.error("Error exporting location by ID:", error);
      const status = error.message?.includes("not found") ? 404 : 500;
      res.status(status).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }

  /**
   * Export dashboard data
   * GET /api/dashboard/export?format=csv|json&status=active&state=Maharashtra&campus=Main
   */
  static async exportDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const format = (req.query.format as string) || "json";

      const params = {
        status: (req.query.status as "active" | "inactive" | "all") || "all",
        state: req.query.state as string,
        district: req.query.district as string,
        address: req.query.address as string,
        campus: req.query.campus as string,
        tower: req.query.tower as string,
        floor: req.query.floor as string,
        search: req.query.search as string,
        page: 1,
        limit: 999999, // Get all data for export
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as "asc" | "desc",
      };

      const result = await AreaService.exportDashboardData(params, format);

      res.setHeader("Content-Type", result.contentType);
      res.setHeader("Content-Disposition", `attachment; filename="${result.filename}"`);

      if (format === "csv") {
        res.status(200).send(result.data);
      } else {
        res.status(200).json({
          success: true,
          ...result.data,
        });
      }
    } catch (error: any) {
      logger.error("Error exporting dashboard data:", error);
      res.status(500).json({
        success: false,
        message: error.message || "Internal server error",
      });
    }
  }
}
