// controllers/vendingMachine.controller.ts
import { Request, Response } from "express";
import { MachineService, AuditLogParams } from "../services/VM.service";
import { logger } from "../utils/logger.util";

// ========== MACHINE CONTROLLERS ==========

export class VendingMachineController {
  private static getAuditParams(req: Request): AuditLogParams {
    const user = (req as any).user || {};

    return {
      userId: user.id || user._id || user.userId || "unknown",
      userEmail: user.email || user.userEmail || "unknown@example.com",
      userName: user.name || user.userName || user.username,
      ipAddress: req.ip || (req.headers["x-forwarded-for"] as string) || "unknown",
      userAgent: req.headers["user-agent"] || "unknown",
    };
  }

  static async createMachine(req: Request, res: Response) {
    try {
      // Auto-generate rack names before creating
      const machineData = { ...req.body };

      if (machineData.racks && machineData.racks.length > 0) {
        machineData.racks = machineData.racks.map((rack: any, index: number) => ({
          ...rack,
          rackName: rack.rackName || String.fromCharCode(65 + index),
        }));
      }

      const auditParams = VendingMachineController.getAuditParams(req);
      const machine = await MachineService.createMachine(machineData, auditParams);

      res.status(201).json({
        success: true,
        message: "Machine created successfully",
        data: {
          id: machine._id,
          machineId: machine.machineId,
          serialNumber: machine.serialNumber,
          modelNumber: machine.modelNumber,
          machineType: machine.machineType,
          installed_status: machine.installed_status,
          doorStatus: machine.doorStatus,
          connectivityStatus: machine.connectivityStatus,
          machineStatus: machine.machineStatus,
          underMaintenance: machine.underMaintenance,
          decommissioned: machine.decommissioned,
          racks:
            machine.racks?.map((rack: any) => ({
              id: rack._id,
              rackName: rack.rackName,
              slots: rack.slots,
              capacity: rack.capacity,
              slotsList: rack.slotsList?.map((slot: any) => ({
                id: slot._id,
                slotNumber: slot.slotNumber,
                product: slot.product
                  ? {
                      id: slot.product._id || slot.product,
                      productName: slot.product.product_name,
                      skuId: slot.product.sku_id,
                    }
                  : null,
              })),
            })) || [],
        },
      });
    } catch (error: any) {
      logger.error("Error creating machine:", error);
      res.status(500).json({
        success: false,
        message: "Failed to create machine",
        error: error.message,
      });
    }
  }
  static async getAllMachines(req: Request, res: Response) {
    try {
      const page = Math.max(1, parseInt(req.query.page as string) || 1);
      const limit = Math.min(100, parseInt(req.query.limit as string) || 20);

      const { machines, total } = await MachineService.getAllMachines(page, limit);

      const machinesWithRacks = machines.map(m => ({
        id: m._id,
        machineId: m.machineId,
        serialNumber: m.serialNumber,
        modelNumber: m.modelNumber,
        dimensions: {
          height: m.height,
          width: m.width,
          length: m.length,
        },
        machineType: m.machineType,
        firmwareVersion: m.firmwareVersion,
        machine_status: m.machineStatus,
        door_status: m.doorStatus,
        connectivity_status: m.connectivityStatus,
        under_maintenance: m.underMaintenance,
        decommissioned: m.decommissioned,
        internalTemperature: m.internalTemperature,
        installed_status: m.installed_status,
        racks:
          m.racks?.map((rack: any) => ({
            id: rack._id,
            rackName: rack.rackName,
            slots: rack.slots,
            capacity: rack.capacity,
            slotsList:
              rack.slotsList?.map((slot: any) => ({
                id: slot._id,
                slotNumber: slot.slotNumber,
                product: slot.product
                  ? {
                      id: slot.product._id,
                      productName: slot.product.product_name,
                      skuId: slot.product.sku_id,
                    }
                  : null,
              })) || [],
          })) || [],
      }));

      res.status(200).json({
        success: true,
        count: machinesWithRacks.length,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        data: machinesWithRacks,
      });
    } catch (error: any) {
      logger.error("Error fetching all machines:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch machines",
        error: error.message,
      });
    }
  }

  static async getMachineById(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const machine = await MachineService.getMachineById(machineId);

      if (!machine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }

      res.status(200).json({
        success: true,
        data: {
          id: machine._id,
          machineId: machine.machineId,
          serialNumber: machine.serialNumber,
          modelNumber: machine.modelNumber,
          machineType: machine.machineType,
          firmwareVersion: machine.firmwareVersion,
          dimensions: {
            height: machine.height,
            width: machine.width,
            length: machine.length,
          },
          status: {
            door: machine.doorStatus,
            connectivity: machine.connectivityStatus,
            machine: machine.machineStatus,
            maintenance: machine.underMaintenance,
            decommissioned: machine.decommissioned,
            installed_status: machine.installed_status,
          },
          internalTemperature: machine.internalTemperature,
          racks:
            machine.racks?.map((rack: any) => ({
              id: rack._id,
              name: rack.rackName,
              slots: rack.slots,
              capacity: rack.capacity,
              slotsList: rack.slotsList?.map((slot: any) => ({
                id: slot._id,
                slotNumber: slot.slotNumber,
                status: slot.status,
                product: slot.product,
              })),
            })) || [],
        },
      });
    } catch (error: any) {
      logger.error("Error fetching machine by ID:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch machine",
        error: error.message,
      });
    }
  }

  static async updateMachine(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const auditParams = VendingMachineController.getAuditParams(req);
      const machine = await MachineService.updateMachine(machineId, req.body, auditParams);

      if (!machine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Machine updated successfully",
        data: {
          id: machine._id,
          serialNumber: machine.serialNumber,
          modelNumber: machine.modelNumber,
          machineType: machine.machineType,
          status: machine.machineStatus,
        },
      });
    } catch (error: any) {
      logger.error("Error updating machine:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update machine",
        error: error.message,
      });
    }
  }

  static async deleteMachine(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const auditParams = VendingMachineController.getAuditParams(req);
      const machine = await MachineService.deleteMachine(machineId, auditParams);

      if (!machine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Machine deleted successfully",
      });
    } catch (error: any) {
      logger.error("Error deleting machine:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete machine",
        error: error.message,
      });
    }
  }

  // ========== RACK CONTROLLERS ==========

  static async addRacks(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const body = req.body;

      if (!Array.isArray(body)) {
        return res.status(400).json({
          success: false,
          message: "Invalid format. Send array like: [{slots:5, capacity:10}]",
        });
      }

      for (const rack of body) {
        if (!rack.slots || !rack.capacity || rack.slots <= 0 || rack.capacity <= 0) {
          return res.status(400).json({
            success: false,
            message: "Each rack must have positive slots and capacity",
          });
        }
      }

      const auditParams = VendingMachineController.getAuditParams(req);
      const createdRacks = await MachineService.addRacks(machineId, body, auditParams);

      res.status(201).json({
        success: true,
        message: "Racks added successfully",
        data: createdRacks,
      });
    } catch (error: any) {
      logger.error("Error adding racks:", error);
      res.status(500).json({
        success: false,
        message: "Failed to add racks",
        error: error.message,
      });
    }
  }

  static async getMachineRacks(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const racks = await MachineService.getMachineRacks(machineId);

      res.status(200).json({
        success: true,
        data: racks,
      });
    } catch (error: any) {
      logger.error("Error fetching machine racks:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch racks",
        error: error.message,
      });
    }
  }

  static async getRackById(req: Request, res: Response) {
    try {
      const { rackId } = req.params;
      const rack = await MachineService.getRackById(rackId);

      if (!rack) {
        return res.status(404).json({
          success: false,
          message: "Rack not found",
        });
      }

      res.status(200).json({
        success: true,
        data: rack,
      });
    } catch (error: any) {
      logger.error("Error fetching rack by ID:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch rack",
        error: error.message,
      });
    }
  }

  static async updateRack(req: Request, res: Response) {
    try {
      const { machineId, rackId } = req.params;

      if (!machineId || !rackId) {
        return res.status(400).json({
          success: false,
          message: "Machine ID and Rack ID are required",
        });
      }

      const auditParams = VendingMachineController.getAuditParams(req);
      const rack = await MachineService.updateRack(machineId, rackId, req.body, auditParams);

      res.status(200).json({
        success: true,
        message: "Rack updated successfully",
        data: rack,
      });
    } catch (error: any) {
      logger.error("Error updating rack:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update rack",
        error: error.message,
      });
    }
  }

  static async deleteRack(req: Request, res: Response) {
    try {
      const { machineId, rackId } = req.params;

      if (!machineId || !rackId) {
        return res.status(400).json({
          success: false,
          message: "Machine ID and Rack ID are required",
        });
      }

      const auditParams = VendingMachineController.getAuditParams(req);
      const rack = await MachineService.deleteRack(machineId, rackId, auditParams);

      if (!rack) {
        return res.status(404).json({
          success: false,
          message: "Rack not found",
        });
      }

      res.status(200).json({
        success: true,
        message: "Rack deleted successfully",
        data: {
          id: rack._id,
          name: rack.rackName,
          slots: rack.slots,
          capacity: rack.capacity,
        },
      });
    } catch (error: any) {
      logger.error("Error deleting rack:", error);
      res.status(500).json({
        success: false,
        message: "Failed to delete rack",
        error: error.message,
      });
    }
  }

  // ========== SLOT CONTROLLERS ==========

  static async getMachineSlots(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const slots = await MachineService.getMachineSlots(machineId);

      res.status(200).json({
        success: true,
        data: slots,
      });
    } catch (error: any) {
      logger.error("Error fetching machine slots:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch slots",
        error: error.message,
      });
    }
  }

  static async getSlotById(req: Request, res: Response) {
    try {
      const { slotId } = req.params;
      const slot = await MachineService.getSlotById(slotId);

      if (!slot) {
        return res.status(404).json({
          success: false,
          message: "Slot not found",
        });
      }

      res.status(200).json({
        success: true,
        data: slot,
      });
    } catch (error: any) {
      logger.error("Error fetching slot by ID:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch slot",
        error: error.message,
      });
    }
  }

  static async occupySlot(req: Request, res: Response) {
    try {
      const { slotId } = req.params;
      const { productId, productName, price, expiryDate } = req.body;

      if (!productId || !productName || !price) {
        return res.status(400).json({
          success: false,
          message: "Product ID, name, and price are required",
        });
      }

      const auditParams = VendingMachineController.getAuditParams(req);
      const slot = await MachineService.occupySlot(
        slotId,
        {
          productId,
          productName,
          price,
          expiryDate,
        },
        auditParams
      );

      res.status(200).json({
        success: true,
        message: "Slot occupied successfully",
        data: slot,
      });
    } catch (error: any) {
      logger.error("Error occupying slot:", error);
      res.status(500).json({
        success: false,
        message: "Failed to occupy slot",
        error: error.message,
      });
    }
  }

  static async freeSlot(req: Request, res: Response) {
    try {
      const { slotId } = req.params;
      const auditParams = VendingMachineController.getAuditParams(req);
      const slot = await MachineService.freeSlot(slotId, auditParams);

      res.status(200).json({
        success: true,
        message: "Slot freed successfully",
        data: slot,
      });
    } catch (error: any) {
      logger.error("Error freeing slot:", error);
      res.status(500).json({
        success: false,
        message: "Failed to free slot",
        error: error.message,
      });
    }
  }

  static async updateSlotStatus(req: Request, res: Response) {
    try {
      const { slotId } = req.params;
      const { status } = req.body;

      if (!status || !["available", "occupied", "maintenance"].includes(status)) {
        return res.status(400).json({
          success: false,
          message: "Valid status (available, occupied, maintenance) is required",
        });
      }

      const auditParams = VendingMachineController.getAuditParams(req);
      const slot = await MachineService.updateSlotStatus(slotId, status, auditParams);

      res.status(200).json({
        success: true,
        message: "Slot status updated successfully",
        data: slot,
      });
    } catch (error: any) {
      logger.error("Error updating slot status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update slot status",
        error: error.message,
      });
    }
  }

  static async getAvailableSlots(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const slots = await MachineService.getAvailableSlots(machineId);

      res.status(200).json({
        success: true,
        data: slots,
      });
    } catch (error: any) {
      logger.error("Error fetching available slots:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch available slots",
        error: error.message,
      });
    }
  }

  static async getOccupiedSlots(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const slots = await MachineService.getOccupiedSlots(machineId);

      res.status(200).json({
        success: true,
        data: slots,
      });
    } catch (error: any) {
      logger.error("Error fetching occupied slots:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch occupied slots",
        error: error.message,
      });
    }
  }

  // ========== ADDITIONAL CONTROLLERS ==========

  static async getMachinesByType(req: Request, res: Response) {
    try {
      const { machineType } = req.params;
      const machines = await MachineService.getMachinesByType(machineType);

      res.status(200).json({
        success: true,
        count: machines.length,
        data: machines,
      });
    } catch (error: any) {
      logger.error("Error fetching machines by type:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch machines by type",
        error: error.message,
      });
    }
  }

  static async getActiveMachines(req: Request, res: Response) {
    try {
      const machines = await MachineService.getActiveMachines();

      res.status(200).json({
        success: true,
        count: machines.length,
        data: machines,
      });
    } catch (error: any) {
      logger.error("Error fetching active machines:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch active machines",
        error: error.message,
      });
    }
  }

  static async updateRacksBatch(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const { racks } = req.body;

      if (!Array.isArray(racks)) {
        return res.status(400).json({
          success: false,
          message: "Invalid format. Send { racks: [...] }",
        });
      }

      const auditParams = VendingMachineController.getAuditParams(req);
      const updatedRacks = await MachineService.updateRacksBatch(machineId, racks, auditParams);

      res.status(200).json({
        success: true,
        message: "Racks updated successfully",
        data: updatedRacks,
      });
    } catch (error: any) {
      logger.error("Error updating racks batch:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update racks",
        error: error.message,
      });
    }
  }

  // ========== DOOR STATUS CONTROLLERS ==========

  static async toggleDoorStatus(req: Request, res: Response) {
    try {
      const { machineId } = req.params;

      const currentMachine = await MachineService.getMachineById(machineId);
      if (!currentMachine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }

      const newDoorStatus = currentMachine.doorStatus === "open" ? "closed" : "open";

      const auditParams = VendingMachineController.getAuditParams(req);
      const machine = await MachineService.updateMachineStatus(
        machineId,
        {
          doorStatus: newDoorStatus,
        },
        auditParams
      );

      res.status(200).json({
        success: true,
        message: `Door status toggled to ${newDoorStatus} successfully`,
        data: {
          id: machine._id,
          machineId: machine.machineId,
          doorStatus: machine.doorStatus,
          previousStatus: currentMachine.doorStatus,
          newStatus: machine.doorStatus,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error toggling door status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to toggle door status",
        error: error.message,
      });
    }
  }

  static async updateDoorStatus(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const { doorStatus } = req.body;

      if (!doorStatus) {
        return res.status(400).json({
          success: false,
          message: "doorStatus is required in request body",
        });
      }

      if (!["open", "closed"].includes(doorStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid doorStatus. Must be either 'open' or 'closed'",
        });
      }

      const existingMachine = await MachineService.getMachineById(machineId);
      if (!existingMachine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }

      const auditParams = VendingMachineController.getAuditParams(req);
      const machine = await MachineService.updateMachineStatus(
        machineId,
        {
          doorStatus,
        },
        auditParams
      );

      res.status(200).json({
        success: true,
        message: `Door status updated to ${doorStatus} successfully`,
        data: {
          id: machine._id,
          machineId: machine.machineId,
          serialNumber: machine.serialNumber,
          doorStatus: machine.doorStatus,
          previousStatus: existingMachine.doorStatus,
          updatedBy: req.user?.id || "system",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error updating door status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update door status",
        error: error.message,
      });
    }
  }

  // ========== CONNECTIVITY STATUS CONTROLLERS ==========

  static async toggleConnectivityStatus(req: Request, res: Response) {
    try {
      const { machineId } = req.params;

      const currentMachine = await MachineService.getMachineById(machineId);
      if (!currentMachine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }

      const newConnectivityStatus =
        currentMachine.connectivityStatus === "online" ? "offline" : "online";

      const auditParams = VendingMachineController.getAuditParams(req);
      const machine = await MachineService.updateMachineStatus(
        machineId,
        {
          connectivityStatus: newConnectivityStatus,
        },
        auditParams
      );

      res.status(200).json({
        success: true,
        message: `Connectivity status toggled to ${newConnectivityStatus} successfully`,
        data: {
          id: machine._id,
          machineId: machine.machineId,
          serialNumber: machine.serialNumber,
          connectivityStatus: machine.connectivityStatus,
          previousStatus: currentMachine.connectivityStatus,
          newStatus: machine.connectivityStatus,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error toggling connectivity status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to toggle connectivity status",
        error: error.message,
      });
    }
  }

  static async updateConnectivityStatus(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const { connectivityStatus } = req.body;

      if (!connectivityStatus) {
        return res.status(400).json({
          success: false,
          message: "connectivityStatus is required in request body",
        });
      }

      if (!["online", "offline"].includes(connectivityStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid connectivityStatus. Must be either 'online' or 'offline'",
        });
      }

      const existingMachine = await MachineService.getMachineById(machineId);
      if (!existingMachine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }

      const auditParams = VendingMachineController.getAuditParams(req);
      const machine = await MachineService.updateMachineStatus(
        machineId,
        {
          connectivityStatus,
        },
        auditParams
      );

      res.status(200).json({
        success: true,
        message: `Connectivity status updated to ${connectivityStatus} successfully`,
        data: {
          id: machine._id,
          machineId: machine.machineId,
          serialNumber: machine.serialNumber,
          connectivityStatus: machine.connectivityStatus,
          previousStatus: existingMachine.connectivityStatus,
          updatedBy: req.user?.id || "system",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error updating connectivity status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update connectivity status",
        error: error.message,
      });
    }
  }

  // ========== MACHINE STATUS CONTROLLERS ==========

  static async toggleMachineStatus(req: Request, res: Response) {
    try {
      const { machineId } = req.params;

      const currentMachine = await MachineService.getMachineById(machineId);
      if (!currentMachine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }

      const newMachineStatus = currentMachine.machineStatus === "active" ? "inactive" : "active";

      const auditParams = VendingMachineController.getAuditParams(req);
      const machine = await MachineService.updateMachineStatus(
        machineId,
        {
          machineStatus: newMachineStatus,
        },
        auditParams
      );

      res.status(200).json({
        success: true,
        message: `Machine status toggled to ${newMachineStatus} successfully`,
        data: {
          id: machine._id,
          machineId: machine.machineId,
          serialNumber: machine.serialNumber,
          modelNumber: machine.modelNumber,
          machineType: machine.machineType,
          machineStatus: machine.machineStatus,
          previousStatus: currentMachine.machineStatus,
          newStatus: machine.machineStatus,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error toggling machine status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to toggle machine status",
        error: error.message,
      });
    }
  }

  static async updateMachineStatusWithBody(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const { machineStatus } = req.body;

      if (!machineStatus) {
        return res.status(400).json({
          success: false,
          message: "machineStatus is required in request body",
        });
      }

      if (!["active", "inactive"].includes(machineStatus)) {
        return res.status(400).json({
          success: false,
          message: "Invalid machineStatus. Must be either 'active' or 'inactive'",
        });
      }

      const existingMachine = await MachineService.getMachineById(machineId);
      if (!existingMachine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }

      const auditParams = VendingMachineController.getAuditParams(req);
      const machine = await MachineService.updateMachineStatus(
        machineId,
        {
          machineStatus,
        },
        auditParams
      );

      res.status(200).json({
        success: true,
        message: `Machine status updated to ${machineStatus} successfully`,
        data: {
          id: machine._id,
          machineId: machine.machineId,
          serialNumber: machine.serialNumber,
          modelNumber: machine.modelNumber,
          machineType: machine.machineType,
          machineStatus: machine.machineStatus,
          previousStatus: existingMachine.machineStatus,
          updatedBy: req.user?.id || "system",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error updating machine status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update machine status",
        error: error.message,
      });
    }
  }

  // ========== UNDER MAINTENANCE STATUS CONTROLLERS ==========

  static async toggleUnderMaintenance(req: Request, res: Response) {
    try {
      const { machineId } = req.params;

      const currentMachine = await MachineService.getMachineById(machineId);
      if (!currentMachine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }

      const newUnderMaintenance = currentMachine.underMaintenance === "yes" ? "no" : "yes";

      const updateData: any = {
        underMaintenance: newUnderMaintenance,
      };

      if (newUnderMaintenance === "yes") {
        updateData.machineStatus = "inactive";
      } else {
        updateData.machineStatus = "active";
      }

      const auditParams = VendingMachineController.getAuditParams(req);
      const machine = await MachineService.updateMachineStatus(machineId, updateData, auditParams);

      res.status(200).json({
        success: true,
        message: `Under maintenance status toggled to ${newUnderMaintenance} successfully`,
        data: {
          id: machine._id,
          machineId: machine.machineId,
          serialNumber: machine.serialNumber,
          modelNumber: machine.modelNumber,
          machineType: machine.machineType,
          underMaintenance: machine.underMaintenance,
          machineStatus: machine.machineStatus,
          previousStatus: currentMachine.underMaintenance,
          newStatus: machine.underMaintenance,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error toggling under maintenance status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to toggle under maintenance status",
        error: error.message,
      });
    }
  }

  static async updateUnderMaintenance(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const { underMaintenance } = req.body;

      if (!underMaintenance) {
        return res.status(400).json({
          success: false,
          message: "underMaintenance is required in request body",
        });
      }

      if (!["yes", "no"].includes(underMaintenance)) {
        return res.status(400).json({
          success: false,
          message: "Invalid underMaintenance value. Must be either 'yes' or 'no'",
        });
      }

      const existingMachine = await MachineService.getMachineById(machineId);
      if (!existingMachine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }

      const updateData: any = {
        underMaintenance,
      };

      if (underMaintenance === "yes") {
        updateData.machineStatus = "inactive";
      } else {
        updateData.machineStatus = "active";
      }

      const auditParams = VendingMachineController.getAuditParams(req);
      const machine = await MachineService.updateMachineStatus(machineId, updateData, auditParams);

      res.status(200).json({
        success: true,
        message: `Under maintenance status updated to ${underMaintenance} successfully`,
        data: {
          id: machine._id,
          machineId: machine.machineId,
          serialNumber: machine.serialNumber,
          modelNumber: machine.modelNumber,
          machineType: machine.machineType,
          underMaintenance: machine.underMaintenance,
          machineStatus: machine.machineStatus,
          previousStatus: existingMachine.underMaintenance,
          updatedBy: req.user?.id || "system",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error updating under maintenance status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update under maintenance status",
        error: error.message,
      });
    }
  }

  // ========== DECOMMISSIONED STATUS CONTROLLERS ==========

  static async toggleDecommissioned(req: Request, res: Response) {
    try {
      const { machineId } = req.params;

      const currentMachine = await MachineService.getMachineById(machineId);
      if (!currentMachine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }

      const newDecommissioned = currentMachine.decommissioned === "yes" ? "no" : "yes";

      const updateData: any = {
        decommissioned: newDecommissioned,
      };

      if (newDecommissioned === "yes") {
        updateData.machineStatus = "inactive";
        updateData.connectivityStatus = "offline";
        updateData.underMaintenance = "no";
      } else {
        updateData.machineStatus = "active";
        updateData.connectivityStatus = "online";
      }

      const auditParams = VendingMachineController.getAuditParams(req);
      const machine = await MachineService.updateMachineStatus(machineId, updateData, auditParams);

      res.status(200).json({
        success: true,
        message: `Decommissioned status toggled to ${newDecommissioned} successfully`,
        data: {
          id: machine._id,
          machineId: machine.machineId,
          serialNumber: machine.serialNumber,
          modelNumber: machine.modelNumber,
          machineType: machine.machineType,
          decommissioned: machine.decommissioned,
          machineStatus: machine.machineStatus,
          connectivityStatus: machine.connectivityStatus,
          underMaintenance: machine.underMaintenance,
          previousStatus: currentMachine.decommissioned,
          newStatus: machine.decommissioned,
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error toggling decommissioned status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to toggle decommissioned status",
        error: error.message,
      });
    }
  }

  static async updateDecommissioned(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const { decommissioned } = req.body;

      if (!decommissioned) {
        return res.status(400).json({
          success: false,
          message: "decommissioned is required in request body",
        });
      }

      if (!["yes", "no"].includes(decommissioned)) {
        return res.status(400).json({
          success: false,
          message: "Invalid decommissioned value. Must be either 'yes' or 'no'",
        });
      }

      const existingMachine = await MachineService.getMachineById(machineId);
      if (!existingMachine) {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
        });
      }

      const updateData: any = {
        decommissioned,
      };

      if (decommissioned === "yes") {
        updateData.machineStatus = "inactive";
        updateData.connectivityStatus = "offline";
        updateData.underMaintenance = "no";
      } else {
        updateData.machineStatus = "active";
        updateData.connectivityStatus = "online";
      }

      const auditParams = VendingMachineController.getAuditParams(req);
      const machine = await MachineService.updateMachineStatus(machineId, updateData, auditParams);

      res.status(200).json({
        success: true,
        message: `Decommissioned status updated to ${decommissioned} successfully`,
        data: {
          id: machine._id,
          machineId: machine.machineId,
          serialNumber: machine.serialNumber,
          modelNumber: machine.modelNumber,
          machineType: machine.machineType,
          decommissioned: machine.decommissioned,
          machineStatus: machine.machineStatus,
          connectivityStatus: machine.connectivityStatus,
          underMaintenance: machine.underMaintenance,
          previousStatus: existingMachine.decommissioned,
          updatedBy: req.user?.id || "system",
          timestamp: new Date().toISOString(),
        },
      });
    } catch (error: any) {
      logger.error("Error updating decommissioned status:", error);
      res.status(500).json({
        success: false,
        message: "Failed to update decommissioned status",
        error: error.message,
      });
    }
  }

  // ========== AUDIT TRAIL CONTROLLERS ==========

  static async getAllMachinesAuditTrails(req: Request, res: Response) {
    try {
      const { limit, skip, startDate, endDate, action, entityType, userId, machineId, sortBy } =
        req.query;

      const options: any = {};

      if (limit) options.limit = parseInt(limit as string);
      if (skip) options.skip = parseInt(skip as string);
      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);
      if (action) options.action = action as string;
      if (entityType) options.entityType = entityType as string;
      if (userId) options.userId = userId as string;
      if (machineId) options.machineId = machineId as string;
      if (sortBy && (sortBy === "asc" || sortBy === "desc"))
        options.sortBy = sortBy as "asc" | "desc";

      const result = await MachineService.getAllMachinesAuditTrails(options);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error("Error fetching all machines audit trails:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch all machines audit trails",
        error: error.message,
      });
    }
  }
  static async getAuditTrailsByMachineId(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const { page = "1", limit = "10", skip, startDate, endDate, action, entityType } = req.query;

      const pageNum = Math.max(1, parseInt(page as string));
      const limitNum = Math.min(100, Math.max(1, parseInt(limit as string))); // cap at 100
      const skipNum = skip ? parseInt(skip as string) : (pageNum - 1) * limitNum;

      const result = await MachineService.getAuditTrailsByMachineId(machineId, {
        limit: limitNum,
        skip: skipNum,
        ...(startDate && { startDate: new Date(startDate as string) }),
        ...(endDate && { endDate: new Date(endDate as string) }),
        ...(action && { action: action as string }),
        ...(entityType && { entityType: entityType as string }),
      });

      const totalPages = Math.ceil(result.total / limitNum);

      res.status(200).json({
        success: true,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: result.total,
          totalPages,
          hasNext: pageNum < totalPages,
          hasPrev: pageNum > 1,
        },
        logs: result.logs,
      });
    } catch (error: any) {
      logger.error("Error fetching audit trails:", error);
      res.status(error.message === "Machine not found" ? 404 : 500).json({
        success: false,
        message: error.message,
      });
    }
  }
  static async getAuditTrailsSummary(req: Request, res: Response) {
    try {
      const { machineId } = req.params;

      const result = await MachineService.getAuditTrailsSummary(machineId);

      res.status(200).json({
        success: true,
        data: result,
      });
    } catch (error: any) {
      logger.error("Error fetching audit trails summary:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch audit trails summary",
        error: error.message,
      });
    }
  }

  static async exportAuditTrails(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const { format = "csv", startDate, endDate, action, entityType } = req.query;

      const options: any = {};

      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);
      if (action) options.action = action as string;
      if (entityType) options.entityType = entityType as string;

      const result = await MachineService.exportAuditTrails(
        machineId,
        format as "json" | "csv",
        options
      );

      if (format === "csv") {
        res.setHeader("Content-Type", "text/csv");
        res.setHeader(
          "Content-Disposition",
          `attachment; filename=audit_trails_${machineId}_${new Date().toISOString()}.csv`
        );
        res.status(200).send(result);
      } else {
        res.status(200).json({
          success: true,
          data: result,
        });
      }
    } catch (error: any) {
      logger.error("Error exporting audit trails:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export audit trails",
        error: error.message,
      });
    }
  }

  static async exportAllMachinesAuditTrails(req: Request, res: Response) {
    try {
      const {
        format = "csv",
        startDate,
        endDate,
        action,
        entityType,
        userId,
        machineId,
      } = req.query;

      const options: any = {};

      if (startDate) options.startDate = new Date(startDate as string);
      if (endDate) options.endDate = new Date(endDate as string);
      if (action) options.action = action as string;
      if (entityType) options.entityType = entityType as string;
      if (userId) options.userId = userId as string;
      if (machineId) options.machineId = machineId as string;

      const result = await MachineService.exportAllMachinesAuditTrails(
        format as "json" | "csv",
        options
      );

      if (format === "csv") {
        const filename = `audit_trails_all_machines_${new Date().toISOString().split("T")[0]}.csv`;
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
        res.status(200).send(result);
      } else {
        res.status(200).json({
          success: true,
          data: result,
        });
      }
    } catch (error: any) {
      logger.error("Error exporting all machines audit trails:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export all machines audit trails",
        error: error.message,
      });
    }
  }

  // ========== MACHINE EXPORT CONTROLLERS ==========

  static async exportAllMachines(req: Request, res: Response) {
    try {
      const { format = "csv", machineType, status, installed_status, decommissioned } = req.query;

      const options: any = {};

      if (machineType) options.machineType = machineType as string;
      if (status) options.status = status as string;
      if (installed_status) options.installed_status = installed_status as string;
      if (decommissioned) options.decommissioned = decommissioned as string;

      const result = await MachineService.exportAllMachines(format as "json" | "csv", options);

      if (format === "csv") {
        const filename = `machines_export_${new Date().toISOString().split("T")[0]}.csv`;
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
        res.status(200).send(result);
      } else {
        res.status(200).json({
          success: true,
          data: result,
        });
      }
    } catch (error: any) {
      logger.error("Error exporting all machines:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export machines",
        error: error.message,
      });
    }
  }

  static async exportMachineById(req: Request, res: Response) {
    try {
      const { machineId } = req.params;
      const { format = "csv" } = req.query;

      const result = await MachineService.exportMachineById(machineId, format as "json" | "csv");

      if (format === "csv") {
        const filename = `machine_${machineId}_export_${new Date().toISOString().split("T")[0]}.csv`;
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
        res.status(200).send(result);
      } else {
        res.status(200).json({
          success: true,
          data: result,
        });
      }
    } catch (error: any) {
      if (error.message === "Machine not found") {
        return res.status(404).json({
          success: false,
          message: "Machine not found",
          error: error.message,
        });
      }
      logger.error("Error exporting machine by ID:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export machine",
        error: error.message,
      });
    }
  }

  static async getMachineDashboard(req: Request, res: Response) {
    try {
      const {
        page,
        limit,
        search,
        machineType,
        status,
        connectivityStatus,
        doorStatus,
        underMaintenance,
        decommissioned,
        sortBy,
        sortOrder,
      } = req.query;

      const options: any = {};

      if (page) options.page = parseInt(page as string);
      if (limit) options.limit = parseInt(limit as string);
      if (search) options.search = search as string;
      if (machineType) options.machineType = machineType as string;
      if (status) options.status = status as string;
      if (connectivityStatus) options.connectivityStatus = connectivityStatus as string;
      if (doorStatus) options.doorStatus = doorStatus as string;
      if (underMaintenance) options.underMaintenance = underMaintenance as string;
      if (decommissioned) options.decommissioned = decommissioned as string;
      if (sortBy) options.sortBy = sortBy as string;
      if (sortOrder && (sortOrder === "asc" || sortOrder === "desc"))
        options.sortOrder = sortOrder as "asc" | "desc";

      const result = await MachineService.getMachineDashboard(options);

      res.status(200).json({
        success: true,
        ...result,
      });
    } catch (error: any) {
      logger.error("Error fetching machine dashboard:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch machine dashboard",
        error: error.message,
      });
    }
  }

  /**
   * Get machine dashboard statistics only (for stats cards)
   */
  static async getMachineDashboardStats(req: Request, res: Response) {
    try {
      const stats = await MachineService.getMachineDashboardStats();

      res.status(200).json({
        success: true,
        data: stats,
      });
    } catch (error: any) {
      logger.error("Error fetching machine dashboard stats:", error);
      res.status(500).json({
        success: false,
        message: "Failed to fetch machine dashboard statistics",
        error: error.message,
      });
    }
  }

  /**
   * Export machine dashboard data
   * Query params:
   *   - format: 'json' or 'csv' (default: 'csv')
   *   - search: string
   *   - machineType: string
   *   - status: string
   *   - connectivityStatus: string
   */
  static async exportMachineDashboard(req: Request, res: Response) {
    try {
      const { format = "csv", search, machineType, status, connectivityStatus } = req.query;

      const options: any = {};

      if (search) options.search = search as string;
      if (machineType) options.machineType = machineType as string;
      if (status) options.status = status as string;
      if (connectivityStatus) options.connectivityStatus = connectivityStatus as string;

      const result = await MachineService.exportMachineDashboard(format as "json" | "csv", options);

      if (format === "csv") {
        const filename = `machine_dashboard_export_${new Date().toISOString().split("T")[0]}.csv`;
        res.setHeader("Content-Type", "text/csv");
        res.setHeader("Content-Disposition", `attachment; filename=${filename}`);
        res.status(200).send(result);
      } else {
        res.status(200).json({
          success: true,
          data: result,
        });
      }
    } catch (error: any) {
      logger.error("Error exporting machine dashboard:", error);
      res.status(500).json({
        success: false,
        message: "Failed to export machine dashboard",
        error: error.message,
      });
    }
  }
}

// ========== EXPORT ALL CONTROLLER METHODS ==========

export const createMachine = VendingMachineController.createMachine;
export const getAllMachines = VendingMachineController.getAllMachines;
export const getMachineById = VendingMachineController.getMachineById;
export const updateMachine = VendingMachineController.updateMachine;
export const deleteMachine = VendingMachineController.deleteMachine;
export const addRacks = VendingMachineController.addRacks;
export const getMachineRacks = VendingMachineController.getMachineRacks;
export const getRackById = VendingMachineController.getRackById;
export const updateRack = VendingMachineController.updateRack;
export const deleteRack = VendingMachineController.deleteRack;
export const getMachineSlots = VendingMachineController.getMachineSlots;
export const getSlotById = VendingMachineController.getSlotById;
export const occupySlot = VendingMachineController.occupySlot;
export const freeSlot = VendingMachineController.freeSlot;
export const updateSlotStatus = VendingMachineController.updateSlotStatus;
export const getAvailableSlots = VendingMachineController.getAvailableSlots;
export const getOccupiedSlots = VendingMachineController.getOccupiedSlots;
export const getMachinesByType = VendingMachineController.getMachinesByType;
export const getActiveMachines = VendingMachineController.getActiveMachines;
export const updateRacksBatch = VendingMachineController.updateRacksBatch;
export const toggleDoorStatus = VendingMachineController.toggleDoorStatus;
export const updateDoorStatus = VendingMachineController.updateDoorStatus;
export const toggleConnectivityStatus = VendingMachineController.toggleConnectivityStatus;
export const updateConnectivityStatus = VendingMachineController.updateConnectivityStatus;
export const toggleMachineStatus = VendingMachineController.toggleMachineStatus;
export const updateMachineStatusWithBody = VendingMachineController.updateMachineStatusWithBody;
export const toggleUnderMaintenance = VendingMachineController.toggleUnderMaintenance;
export const updateUnderMaintenance = VendingMachineController.updateUnderMaintenance;
export const toggleDecommissioned = VendingMachineController.toggleDecommissioned;
export const updateDecommissioned = VendingMachineController.updateDecommissioned;
export const getAllMachinesAuditTrails = VendingMachineController.getAllMachinesAuditTrails;
export const getAuditTrailsByMachineId = VendingMachineController.getAuditTrailsByMachineId;
export const getAuditTrailsSummary = VendingMachineController.getAuditTrailsSummary;
export const exportAuditTrails = VendingMachineController.exportAuditTrails;
export const exportAllMachinesAuditTrails = VendingMachineController.exportAllMachinesAuditTrails;
export const exportAllMachines = VendingMachineController.exportAllMachines;
export const exportMachineById = VendingMachineController.exportMachineById;
export const getMachineDashboard = VendingMachineController.getMachineDashboard;
export const getMachineDashboardStats = VendingMachineController.getMachineDashboardStats;
export const exportMachineDashboard = VendingMachineController.exportMachineDashboard;
