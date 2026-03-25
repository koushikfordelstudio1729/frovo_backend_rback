// services/vendingMachine.service.ts
import { Machine, IAuditLog } from "../models/VM.model";
import { logger } from "../utils/logger.util";

export interface AuditLogParams {
  userId: string;
  userEmail: string;
  userName?: string;
  ipAddress: string;
  userAgent: string;
}

export class MachineService {
  // Helper method to add audit log - IMPROVED with logging
  private static async addAuditLog(
    machineId: string,
    action: string,
    entityType: string,
    entityId: string | undefined,
    changes: any,
    performedBy: AuditLogParams,
    previousData?: any,
    newData?: any
  ) {
    try {
      // Log the audit parameters for debugging
      logger.info("Adding audit log:", {
        machineId,
        action,
        entityType,
        performedBy: {
          userId: performedBy.userId,
          userEmail: performedBy.userEmail,
          userName: performedBy.userName,
          ipAddress: performedBy.ipAddress,
        },
      });

      const auditEntry: IAuditLog = {
        action,
        entityType,
        entityId,
        changes,
        performedBy: {
          userId: performedBy.userId,
          userEmail: performedBy.userEmail,
          userName: performedBy.userName,
          ipAddress: performedBy.ipAddress,
          userAgent: performedBy.userAgent,
        },
        timestamp: new Date(),
        previousData,
        newData,
      };

      await Machine.findByIdAndUpdate(machineId, {
        $push: { auditLogs: auditEntry },
      });

      logger.info(`Audit log added successfully for machine ${machineId}`);
    } catch (error) {
      logger.error("Error adding audit log:", error);
    }
  }

  // ========== MACHINE SERVICES ==========

  static async createMachine(machineData: any, auditParams?: AuditLogParams) {
    try {
      // Log the audit params received
      logger.info("createMachine called with auditParams:", auditParams);

      const machine = new Machine(machineData);
      const savedMachine = await machine.save();

      if (auditParams) {
        await this.addAuditLog(
          savedMachine._id.toString(),
          "CREATE_MACHINE",
          "Machine",
          savedMachine._id.toString(),
          { created: machineData },
          auditParams,
          null,
          savedMachine.toObject()
        );
      }

      return savedMachine;
    } catch (error) {
      logger.error("Error in createMachine:", error);
      throw error;
    }
  }

  static async getAllMachines() {
    return await Machine.find().sort({ createdAt: -1 });
  }

  static async getMachineById(machineId: string) {
    return await Machine.findById(machineId);
  }

  static async updateMachine(machineId: string, updateData: any, auditParams?: AuditLogParams) {
    try {
      logger.info("updateMachine called with auditParams:", auditParams);

      const oldMachine = await Machine.findById(machineId);
      const updatedMachine = await Machine.findByIdAndUpdate(machineId, updateData, {
        new: true,
        runValidators: true,
      });

      if (auditParams && oldMachine && updatedMachine) {
        await this.addAuditLog(
          machineId,
          "UPDATE_MACHINE",
          "Machine",
          machineId,
          updateData,
          auditParams,
          oldMachine.toObject(),
          updatedMachine.toObject()
        );
      }

      return updatedMachine;
    } catch (error) {
      logger.error("Error in updateMachine:", error);
      throw error;
    }
  }

  static async deleteMachine(machineId: string, auditParams?: AuditLogParams) {
    try {
      const deletedMachine = await Machine.findByIdAndDelete(machineId);

      if (auditParams && deletedMachine) {
        await this.addAuditLog(
          machineId,
          "DELETE_MACHINE",
          "Machine",
          machineId,
          { deleted: true },
          auditParams,
          deletedMachine.toObject(),
          null
        );
      }

      return deletedMachine;
    } catch (error) {
      logger.error("Error in deleteMachine:", error);
      throw error;
    }
  }

  static async updateMachineStatus(
    machineId: string,
    statusData: any,
    auditParams?: AuditLogParams
  ) {
    try {
      logger.info("updateMachineStatus called with auditParams:", auditParams);

      const oldMachine = await Machine.findById(machineId);
      const updatedMachine = await Machine.findByIdAndUpdate(machineId, statusData, { new: true });

      if (auditParams && oldMachine && updatedMachine) {
        await this.addAuditLog(
          machineId,
          "UPDATE_MACHINE_STATUS",
          "Machine",
          machineId,
          statusData,
          auditParams,
          oldMachine.toObject(),
          updatedMachine.toObject()
        );
      }

      return updatedMachine;
    } catch (error) {
      logger.error("Error in updateMachineStatus:", error);
      throw error;
    }
  }

  // ========== RACK SERVICES ==========

  static async addRacks(
    machineId: string,
    racksData: Array<{ slots: number; capacity: number; rackName?: string }>,
    auditParams?: AuditLogParams
  ) {
    const machine = await Machine.findById(machineId);
    if (!machine) {
      throw new Error("Machine not found");
    }

    // Get existing racks count for auto-naming
    const existingRacksCount = machine.racks?.length || 0;

    // Prepare racks to add
    const racksToAdd = racksData.map((rack, index) => ({
      rackName: rack.rackName || String.fromCharCode(65 + existingRacksCount + index),
      slots: rack.slots,
      capacity: rack.capacity,
      slotsList: [], // Will be auto-generated by pre-save middleware
    }));

    // Validate unique rack names
    for (const newRack of racksToAdd) {
      const existingRack = machine.racks.find((rack: any) => rack.rackName === newRack.rackName);
      if (existingRack) {
        throw new Error(`Rack with name "${newRack.rackName}" already exists`);
      }
    }

    const oldMachine = machine.toObject();

    // Add racks to machine
    machine.racks.push(...racksToAdd);
    await machine.save();

    if (auditParams) {
      await this.addAuditLog(
        machineId,
        "ADD_RACKS",
        "Rack",
        undefined,
        { racksAdded: racksToAdd },
        auditParams,
        oldMachine,
        machine.toObject()
      );
    }

    // Return the newly added racks with slots
    const addedRacks = machine.racks.slice(-racksToAdd.length);
    return addedRacks.map((rack: any) => ({
      id: rack._id,
      name: rack.rackName,
      slots: rack.slots,
      capacity: rack.capacity,
      slotsList: rack.slotsList.map((slot: any) => ({
        id: slot._id,
        slotNumber: slot.slotNumber,
        status: slot.status,
      })),
    }));
  }

  static async getMachineRacks(machineId: string) {
    const machine = await Machine.findById(machineId);
    if (!machine) return [];

    return machine.racks.map((rack: any) => ({
      id: rack._id,
      name: rack.rackName,
      slots: rack.slots,
      capacity: rack.capacity,
      slotsList: rack.slotsList.map((slot: any) => ({
        id: slot._id,
        slotNumber: slot.slotNumber,
        status: slot.status,
        productId: slot.productId,
        productName: slot.productName,
        price: slot.price,
        expiryDate: slot.expiryDate,
      })),
    }));
  }

  static async getRackById(rackId: string) {
    const machine = await Machine.findOne({ "racks._id": rackId });
    if (!machine) return null;

    const rack = machine.racks.id(rackId);
    if (!rack) return null;

    return {
      id: rack._id,
      name: rack.rackName,
      slots: rack.slots,
      capacity: rack.capacity,
      slotsList: rack.slotsList.map((slot: any) => ({
        id: slot._id,
        slotNumber: slot.slotNumber,
        status: slot.status,
        productId: slot.productId,
        productName: slot.productName,
        price: slot.price,
        expiryDate: slot.expiryDate,
      })),
      machineId: machine._id,
    };
  }

  static async updateRack(
    machineId: string,
    rackId: string,
    updateData: any,
    auditParams?: AuditLogParams
  ) {
    // Find machine by ID
    const machine = await Machine.findById(machineId);
    if (!machine) {
      throw new Error("Machine not found");
    }

    const rack = machine.racks.id(rackId);
    if (!rack) {
      throw new Error("Rack not found in this machine");
    }

    const oldMachine = machine.toObject();
    const oldRack = { ...rack.toObject() };

    // Update rack fields
    if (updateData.rackName) rack.rackName = updateData.rackName;
    if (updateData.slots !== undefined) {
      rack.slots = updateData.slots;
      // SlotsList will be regenerated by pre-save middleware
    }
    if (updateData.capacity !== undefined) rack.capacity = updateData.capacity;

    await machine.save();

    if (auditParams) {
      await this.addAuditLog(
        machineId,
        "UPDATE_RACK",
        "Rack",
        rackId,
        updateData,
        auditParams,
        { machine: oldMachine, rack: oldRack },
        { machine: machine.toObject(), rack: rack.toObject() }
      );
    }

    return {
      id: rack._id,
      name: rack.rackName,
      slots: rack.slots,
      capacity: rack.capacity,
      slotsList: rack.slotsList.map((slot: any) => ({
        id: slot._id,
        slotNumber: slot.slotNumber,
        status: slot.status,
      })),
      machineId: machine._id,
    };
  }

  static async deleteRack(machineId: string, rackId: string, auditParams?: AuditLogParams) {
    const machine = await Machine.findById(machineId);
    if (!machine) {
      throw new Error("Machine not found");
    }

    const rack = machine.racks.id(rackId);
    if (!rack) {
      throw new Error("Rack not found in this machine");
    }

    const oldMachine = machine.toObject();
    const deletedRack = rack.toObject();

    // Remove rack
    machine.racks.pull(rack._id as any);
    await machine.save();

    if (auditParams) {
      await this.addAuditLog(
        machineId,
        "DELETE_RACK",
        "Rack",
        rackId,
        { deleted: true },
        auditParams,
        { machine: oldMachine, rack: deletedRack },
        { machine: machine.toObject() }
      );
    }

    return rack;
  }

  static async deleteAllMachineRacks(machineId: string, auditParams?: AuditLogParams) {
    const machine = await Machine.findById(machineId);
    if (!machine) return null;

    const oldMachine = machine.toObject();
    const deletedRacks = [...machine.racks];

    machine.racks.splice(0, machine.racks.length);
    await machine.save();

    if (auditParams) {
      await this.addAuditLog(
        machineId,
        "DELETE_ALL_RACKS",
        "Rack",
        undefined,
        { deletedRacksCount: deletedRacks.length },
        auditParams,
        oldMachine,
        machine.toObject()
      );
    }

    return machine;
  }

  // ========== SLOT SERVICES ==========

  static async getMachineSlots(machineId: string) {
    const machine = await Machine.findById(machineId);
    if (!machine) return [];

    const allSlots: any[] = [];
    machine.racks.forEach((rack: any) => {
      rack.slotsList.forEach((slot: any) => {
        allSlots.push({
          id: slot._id,
          rackId: rack._id,
          rackName: rack.rackName,
          slotNumber: slot.slotNumber,
          status: slot.status,
          productId: slot.productId,
          productName: slot.productName,
          price: slot.price,
          expiryDate: slot.expiryDate,
        });
      });
    });

    return allSlots;
  }

  static async getSlotById(slotId: string) {
    const machine = await Machine.findOne({ "racks.slotsList._id": slotId });
    if (!machine) return null;

    let foundSlot = null;
    let foundRack = null;

    for (const rack of machine.racks) {
      const slot = rack.slotsList.id(slotId);
      if (slot) {
        foundSlot = slot;
        foundRack = rack;
        break;
      }
    }

    if (!foundSlot) return null;

    return {
      id: foundSlot._id,
      rackId: foundRack?._id,
      rackName: foundRack?.rackName,
      slotNumber: foundSlot.slotNumber,
      status: foundSlot.status,
      productId: foundSlot.productId,
      productName: foundSlot.productName,
      price: foundSlot.price,
      expiryDate: foundSlot.expiryDate,
      machineId: machine._id,
    };
  }

  static async occupySlot(
    slotId: string,
    productData: {
      productId: string;
      productName: string;
      price: number;
      expiryDate?: Date;
    },
    auditParams?: AuditLogParams
  ) {
    const machine = await Machine.findOne({ "racks.slotsList._id": slotId });
    if (!machine) throw new Error("Slot not found");

    let foundSlot = null;
    let foundRack = null;

    for (const rack of machine.racks) {
      const slot = rack.slotsList.id(slotId);
      if (slot) {
        foundSlot = slot;
        foundRack = rack;
        break;
      }
    }

    if (!foundSlot) throw new Error("Slot not found");
    if (foundSlot.status === "occupied") {
      throw new Error("Slot is already occupied");
    }

    const oldSlot = foundSlot.toObject();
    const oldMachine = machine.toObject();

    foundSlot.status = "occupied";
    foundSlot.productId = productData.productId;
    foundSlot.productName = productData.productName;
    foundSlot.price = productData.price;
    if (productData.expiryDate) {
      foundSlot.expiryDate = productData.expiryDate;
    }

    await machine.save();

    if (auditParams) {
      await this.addAuditLog(
        machine._id.toString(),
        "OCCUPY_SLOT",
        "Slot",
        slotId,
        productData,
        auditParams,
        { machine: oldMachine, slot: oldSlot },
        { machine: machine.toObject(), slot: foundSlot.toObject() }
      );
    }

    return {
      id: foundSlot._id,
      rackId: foundRack?._id,
      rackName: foundRack?.rackName,
      slotNumber: foundSlot.slotNumber,
      status: foundSlot.status,
      productId: foundSlot.productId,
      productName: foundSlot.productName,
      price: foundSlot.price,
      expiryDate: foundSlot.expiryDate,
    };
  }

  static async freeSlot(slotId: string, auditParams?: AuditLogParams) {
    const machine = await Machine.findOne({ "racks.slotsList._id": slotId });
    if (!machine) throw new Error("Slot not found");

    let foundSlot = null;

    for (const rack of machine.racks) {
      const slot = rack.slotsList.id(slotId);
      if (slot) {
        foundSlot = slot;
        break;
      }
    }

    if (!foundSlot) throw new Error("Slot not found");

    const oldSlot = foundSlot.toObject();
    const oldMachine = machine.toObject();

    foundSlot.status = "available";
    foundSlot.productId = undefined;
    foundSlot.productName = undefined;
    foundSlot.price = undefined;
    foundSlot.expiryDate = undefined;

    await machine.save();

    if (auditParams) {
      await this.addAuditLog(
        machine._id.toString(),
        "FREE_SLOT",
        "Slot",
        slotId,
        { freed: true },
        auditParams,
        { machine: oldMachine, slot: oldSlot },
        { machine: machine.toObject(), slot: foundSlot.toObject() }
      );
    }

    return {
      id: foundSlot._id,
      slotNumber: foundSlot.slotNumber,
      status: foundSlot.status,
    };
  }

  static async updateSlotStatus(
    slotId: string,
    status: "available" | "occupied" | "maintenance",
    auditParams?: AuditLogParams
  ) {
    const machine = await Machine.findOne({ "racks.slotsList._id": slotId });
    if (!machine) throw new Error("Slot not found");

    let foundSlot = null;

    for (const rack of machine.racks) {
      const slot = rack.slotsList.id(slotId);
      if (slot) {
        foundSlot = slot;
        break;
      }
    }

    if (!foundSlot) throw new Error("Slot not found");

    const oldSlot = foundSlot.toObject();
    const oldMachine = machine.toObject();

    foundSlot.status = status;

    // If status is not occupied, clear product data
    if (status !== "occupied") {
      foundSlot.productId = undefined;
      foundSlot.productName = undefined;
      foundSlot.price = undefined;
      foundSlot.expiryDate = undefined;
    }

    await machine.save();

    if (auditParams) {
      await this.addAuditLog(
        machine._id.toString(),
        "UPDATE_SLOT_STATUS",
        "Slot",
        slotId,
        { status },
        auditParams,
        { machine: oldMachine, slot: oldSlot },
        { machine: machine.toObject(), slot: foundSlot.toObject() }
      );
    }

    return {
      id: foundSlot._id,
      slotNumber: foundSlot.slotNumber,
      status: foundSlot.status,
    };
  }

  // ========== COMBINED SERVICES ==========

  static async getMachineWithRacks(machineId: string) {
    const machine = await Machine.findById(machineId);
    if (!machine) {
      return { machine: null, racks: [], totalRacks: 0 };
    }

    const racks = machine.racks.map((rack: any) => ({
      id: rack._id,
      name: rack.rackName,
      slots: rack.slots,
      capacity: rack.capacity,
      slotsList: rack.slotsList.map((slot: any) => ({
        id: slot._id,
        slotNumber: slot.slotNumber,
        status: slot.status,
        productId: slot.productId,
        productName: slot.productName,
        price: slot.price,
      })),
    }));

    return {
      machine: {
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
        },
        internalTemperature: machine.internalTemperature,
      },
      racks: racks,
      totalRacks: racks.length,
    };
  }

  // ========== ADDITIONAL UTILITY SERVICES ==========

  static async getMachinesByType(machineType: string) {
    return await Machine.find({ machineType, decommissioned: "no" }).sort({ createdAt: -1 });
  }

  static async getActiveMachines() {
    return await Machine.find({
      machineStatus: "active",
      decommissioned: "no",
    }).sort({ createdAt: -1 });
  }

  static async updateRacksBatch(
    machineId: string,
    racksData: Array<{ rackId?: string; rackName: string; slots: number; capacity: number }>,
    auditParams?: AuditLogParams
  ) {
    const machine = await Machine.findById(machineId);
    if (!machine) throw new Error("Machine not found");

    const oldMachine = machine.toObject();

    // Process updates
    for (const rackData of racksData) {
      if (rackData.rackId) {
        // Update existing rack
        const rack = machine.racks.id(rackData.rackId);
        if (rack) {
          rack.rackName = rackData.rackName;
          if (rack.slots !== rackData.slots) {
            rack.slots = rackData.slots;
            // SlotsList will be regenerated by pre-save middleware
          }
          rack.capacity = rackData.capacity;
        }
      } else {
        // Add new rack
        machine.racks.push({
          rackName: rackData.rackName,
          slots: rackData.slots,
          capacity: rackData.capacity,
          slotsList: [],
        });
      }
    }

    await machine.save();

    if (auditParams) {
      await this.addAuditLog(
        machineId,
        "UPDATE_RACKS_BATCH",
        "Rack",
        undefined,
        { racksData },
        auditParams,
        oldMachine,
        machine.toObject()
      );
    }

    return machine.racks.map((rack: any) => ({
      id: rack._id,
      name: rack.rackName,
      slots: rack.slots,
      capacity: rack.capacity,
      slotsCount: rack.slotsList.length,
    }));
  }

  static async getAvailableSlots(machineId: string) {
    const machine = await Machine.findById(machineId);
    if (!machine) return [];

    const availableSlots: any[] = [];
    machine.racks.forEach((rack: any) => {
      rack.slotsList.forEach((slot: any) => {
        if (slot.status === "available") {
          availableSlots.push({
            id: slot._id,
            rackId: rack._id,
            rackName: rack.rackName,
            slotNumber: slot.slotNumber,
          });
        }
      });
    });

    return availableSlots;
  }

  static async getOccupiedSlots(machineId: string) {
    const machine = await Machine.findById(machineId);
    if (!machine) return [];

    const occupiedSlots: any[] = [];
    machine.racks.forEach((rack: any) => {
      rack.slotsList.forEach((slot: any) => {
        if (slot.status === "occupied") {
          occupiedSlots.push({
            id: slot._id,
            rackId: rack._id,
            rackName: rack.rackName,
            slotNumber: slot.slotNumber,
            productId: slot.productId,
            productName: slot.productName,
            price: slot.price,
            expiryDate: slot.expiryDate,
          });
        }
      });
    });

    return occupiedSlots;
  }

  // ========== AUDIT TRAIL SERVICES ==========

  static async getAllMachinesAuditTrails(options?: {
    limit?: number;
    skip?: number;
    startDate?: Date;
    endDate?: Date;
    action?: string;
    entityType?: string;
    userId?: string;
    machineId?: string;
    sortBy?: "asc" | "desc";
  }) {
    const query: any = {};
    if (options?.machineId) {
      query._id = options.machineId;
    }

    const machines = await Machine.find(query).select(
      "_id serialNumber modelNumber machineType auditLogs"
    );

    let allAuditLogs: any[] = [];

    machines.forEach(machine => {
      const logs = machine.auditLogs.map((log: any) => ({
        id: log._id,
        machineId: machine._id,
        machineSerialNumber: machine.serialNumber,
        machineModelNumber: machine.modelNumber,
        machineType: machine.machineType,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        changes: log.changes,
        performedBy: log.performedBy,
        timestamp: log.timestamp,
        previousData: log.previousData,
        newData: log.newData,
      }));
      allAuditLogs.push(...logs);
    });

    if (options?.startDate) {
      allAuditLogs = allAuditLogs.filter(log => log.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      allAuditLogs = allAuditLogs.filter(log => log.timestamp <= options.endDate!);
    }
    if (options?.action) {
      allAuditLogs = allAuditLogs.filter(log => log.action === options.action);
    }
    if (options?.entityType) {
      allAuditLogs = allAuditLogs.filter(log => log.entityType === options.entityType);
    }
    if (options?.userId) {
      allAuditLogs = allAuditLogs.filter(log => log.performedBy.userId === options.userId);
    }

    const sortOrder = options?.sortBy === "asc" ? 1 : -1;
    allAuditLogs.sort((a, b) => {
      return sortOrder === 1
        ? a.timestamp.getTime() - b.timestamp.getTime()
        : b.timestamp.getTime() - a.timestamp.getTime();
    });

    const total = allAuditLogs.length;
    const skip = options?.skip || 0;
    const limit = options?.limit || total;
    const paginatedLogs = allAuditLogs.slice(skip, skip + limit);

    const actionCounts: { [key: string]: number } = {};
    const entityTypeCounts: { [key: string]: number } = {};
    const machineCounts: { [key: string]: number } = {};
    const userCounts: { [key: string]: number } = {};

    allAuditLogs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      entityTypeCounts[log.entityType] = (entityTypeCounts[log.entityType] || 0) + 1;
      machineCounts[log.machineId] = (machineCounts[log.machineId] || 0) + 1;
      userCounts[log.performedBy.userId] = (userCounts[log.performedBy.userId] || 0) + 1;
    });

    const dates = allAuditLogs.map(log => log.timestamp.getTime());
    const oldestDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const newestDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = allAuditLogs.filter(log => log.timestamp >= sevenDaysAgo).length;

    return {
      total,
      limit,
      skip,
      dateRange: {
        from: oldestDate,
        to: newestDate,
      },
      recentActivity: {
        last7Days: recentActivity,
      },
      summary: {
        byAction: actionCounts,
        byEntityType: entityTypeCounts,
        byMachine: machineCounts,
        byUser: userCounts,
      },
      auditLogs: paginatedLogs,
    };
  }

  static async getAuditTrailsByMachineId(
    machineId: string,
    options?: {
      limit?: number;
      skip?: number;
      startDate?: Date;
      endDate?: Date;
      action?: string;
      entityType?: string;
    }
  ) {
    const machine = await Machine.findById(machineId);
    if (!machine) {
      throw new Error("Machine not found");
    }

    let auditLogs = [...machine.auditLogs];

    if (options?.startDate) {
      auditLogs = auditLogs.filter(log => log.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      auditLogs = auditLogs.filter(log => log.timestamp <= options.endDate!);
    }
    if (options?.action) {
      auditLogs = auditLogs.filter(log => log.action === options.action);
    }
    if (options?.entityType) {
      auditLogs = auditLogs.filter(log => log.entityType === options.entityType);
    }

    auditLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const total = auditLogs.length;
    const skip = options?.skip || 0;
    const limit = options?.limit || total;
    const paginatedLogs = auditLogs.slice(skip, skip + limit);

    return {
      machineId: machine._id,
      machineSerialNumber: machine.serialNumber,
      machineModelNumber: machine.modelNumber,
      total,
      limit,
      skip,
      auditLogs: paginatedLogs.map(log => ({
        id: log._id,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        changes: log.changes,
        performedBy: log.performedBy,
        timestamp: log.timestamp,
        previousData: log.previousData,
        newData: log.newData,
      })),
    };
  }

  static async getAuditTrailsSummary(machineId: string) {
    const machine = await Machine.findById(machineId);
    if (!machine) {
      throw new Error("Machine not found");
    }

    const auditLogs = machine.auditLogs;

    const actionCounts: { [key: string]: number } = {};
    const entityTypeCounts: { [key: string]: number } = {};
    const userCounts: { [key: string]: number } = {};

    auditLogs.forEach(log => {
      actionCounts[log.action] = (actionCounts[log.action] || 0) + 1;
      entityTypeCounts[log.entityType] = (entityTypeCounts[log.entityType] || 0) + 1;
      const userId = log.performedBy.userId;
      userCounts[userId] = (userCounts[userId] || 0) + 1;
    });

    const dates = auditLogs.map(log => log.timestamp.getTime());
    const oldestDate = dates.length > 0 ? new Date(Math.min(...dates)) : null;
    const newestDate = dates.length > 0 ? new Date(Math.max(...dates)) : null;

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recentActivity = auditLogs.filter(log => log.timestamp >= sevenDaysAgo).length;

    return {
      machineId: machine._id,
      machineSerialNumber: machine.serialNumber,
      machineModelNumber: machine.modelNumber,
      totalAuditLogs: auditLogs.length,
      dateRange: {
        from: oldestDate,
        to: newestDate,
      },
      recentActivity: {
        last7Days: recentActivity,
      },
      summary: {
        byAction: actionCounts,
        byEntityType: entityTypeCounts,
        byUser: userCounts,
      },
    };
  }

  static async exportAuditTrails(
    machineId: string,
    format: "json" | "csv" = "json",
    options?: {
      startDate?: Date;
      endDate?: Date;
      action?: string;
      entityType?: string;
    }
  ) {
    const machine = await Machine.findById(machineId);
    if (!machine) {
      throw new Error("Machine not found");
    }

    let auditLogs = [...machine.auditLogs];

    if (options?.startDate) {
      auditLogs = auditLogs.filter(log => log.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      auditLogs = auditLogs.filter(log => log.timestamp <= options.endDate!);
    }
    if (options?.action) {
      auditLogs = auditLogs.filter(log => log.action === options.action);
    }
    if (options?.entityType) {
      auditLogs = auditLogs.filter(log => log.entityType === options.entityType);
    }

    auditLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const formattedLogs = auditLogs.map(log => ({
      id: log._id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      changes: JSON.stringify(log.changes),
      performedBy: `${log.performedBy.userName || log.performedBy.userEmail} (${log.performedBy.userId})`,
      ipAddress: log.performedBy.ipAddress,
      userAgent: log.performedBy.userAgent,
      timestamp: log.timestamp.toISOString(),
      previousData: log.previousData ? JSON.stringify(log.previousData) : null,
      newData: log.newData ? JSON.stringify(log.newData) : null,
    }));

    if (format === "csv") {
      const headers = [
        "ID",
        "Action",
        "Entity Type",
        "Entity ID",
        "Changes",
        "Performed By",
        "IP Address",
        "User Agent",
        "Timestamp",
        "Previous Data",
        "New Data",
      ];
      const csvRows = [headers];

      formattedLogs.forEach(log => {
        const row = [
          log.id,
          log.action,
          log.entityType,
          log.entityId || "",
          log.changes,
          log.performedBy,
          log.ipAddress,
          log.userAgent,
          log.timestamp,
          log.previousData || "",
          log.newData || "",
        ];
        csvRows.push(row.map(cell => `"${String(cell).replace(/"/g, '""')}"`));
      });

      return csvRows.map(row => row.join(",")).join("\n");
    }

    return formattedLogs;
  }

  static async exportAllMachinesAuditTrails(
    format: "json" | "csv" = "json",
    options?: {
      startDate?: Date;
      endDate?: Date;
      action?: string;
      entityType?: string;
      userId?: string;
      machineId?: string;
    }
  ) {
    const query: any = {};
    if (options?.machineId) {
      query._id = options.machineId;
    }

    const machines = await Machine.find(query).select(
      "_id serialNumber modelNumber machineType auditLogs"
    );

    let allAuditLogs: any[] = [];

    machines.forEach(machine => {
      const logs = machine.auditLogs.map((log: any) => ({
        id: log._id,
        machineId: machine._id,
        machineSerialNumber: machine.serialNumber,
        machineModelNumber: machine.modelNumber,
        machineType: machine.machineType,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        changes: log.changes,
        performedBy: log.performedBy,
        timestamp: log.timestamp,
        previousData: log.previousData,
        newData: log.newData,
      }));
      allAuditLogs.push(...logs);
    });

    if (options?.startDate) {
      allAuditLogs = allAuditLogs.filter(log => log.timestamp >= options.startDate!);
    }
    if (options?.endDate) {
      allAuditLogs = allAuditLogs.filter(log => log.timestamp <= options.endDate!);
    }
    if (options?.action) {
      allAuditLogs = allAuditLogs.filter(log => log.action === options.action);
    }
    if (options?.entityType) {
      allAuditLogs = allAuditLogs.filter(log => log.entityType === options.entityType);
    }
    if (options?.userId) {
      allAuditLogs = allAuditLogs.filter(log => log.performedBy.userId === options.userId);
    }

    allAuditLogs.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    const formattedLogs = allAuditLogs.map(log => ({
      "Audit ID": log.id,
      "Machine ID": log.machineId,
      "Machine Serial Number": log.machineSerialNumber,
      "Machine Model": log.machineModelNumber,
      "Machine Type": log.machineType,
      Action: log.action,
      "Entity Type": log.entityType,
      "Entity ID": log.entityId || "",
      Changes: typeof log.changes === "object" ? JSON.stringify(log.changes) : log.changes,
      "Performed By": `${log.performedBy.userName || log.performedBy.userEmail} (${log.performedBy.userId})`,
      "User Email": log.performedBy.userEmail,
      "IP Address": log.performedBy.ipAddress,
      "User Agent": log.performedBy.userAgent,
      Timestamp: log.timestamp.toISOString(),
      "Previous Data": log.previousData ? JSON.stringify(log.previousData) : "",
      "New Data": log.newData ? JSON.stringify(log.newData) : "",
    }));

    if (format === "csv") {
      if (formattedLogs.length === 0) {
        return "";
      }

      const headers = Object.keys(formattedLogs[0]);
      const csvRows = [headers];

      formattedLogs.forEach(log => {
        const row = headers.map(header => {
          const value = log[header as keyof typeof log];
          const stringValue = String(value || "").replace(/"/g, '""');
          return `"${stringValue}"`;
        });
        csvRows.push(row);
      });

      return csvRows.map(row => row.join(",")).join("\n");
    }

    return {
      exportDate: new Date().toISOString(),
      totalRecords: formattedLogs.length,
      filters: options || {},
      data: formattedLogs,
    };
  }

  static async exportAllMachines(
    format: "json" | "csv" = "json",
    options?: {
      machineType?: string;
      status?: string;
      installed_status?: string;
      decommissioned?: string;
    }
  ) {
    const query: any = {};
    if (options?.machineType) query.machineType = options.machineType;
    if (options?.status) query.machineStatus = options.status;
    if (options?.installed_status) query.installed_status = options.installed_status;
    if (options?.decommissioned) query.decommissioned = options.decommissioned;

    const machines = await Machine.find(query).sort({ createdAt: -1 }).lean();

    const formattedMachines = machines.map(machine => {
      let totalSlots = 0;
      let occupiedSlots = 0;
      let availableSlots = 0;
      let maintenanceSlots = 0;
      let totalCapacity = 0;

      machine.racks.forEach((rack: any) => {
        totalSlots += rack.slots;
        totalCapacity += rack.capacity;

        rack.slotsList?.forEach((slot: any) => {
          if (slot.status === "occupied") occupiedSlots++;
          else if (slot.status === "available") availableSlots++;
          else if (slot.status === "maintenance") maintenanceSlots++;
        });
      });

      return {
        "Machine ID": machine._id?.toString() || "",
        "Machine Identifier": machine.machineId || "",
        "Serial Number": machine.serialNumber || "",
        "Model Number": machine.modelNumber || "",
        "Machine Type": machine.machineType || "",
        "Firmware Version": machine.firmwareVersion || "",
        "Dimensions (H x W x L)": `${machine.height || 0} x ${machine.width || 0} x ${machine.length || 0}`,
        "Door Status": machine.doorStatus || "closed",
        "Connectivity Status": machine.connectivityStatus || "offline",
        "Machine Status": machine.machineStatus || "inactive",
        "Under Maintenance": machine.underMaintenance || "no",
        Decommissioned: machine.decommissioned || "no",
        "Installed Status": machine.installed_status || "no",
        "Internal Temperature": machine.internalTemperature || "",
        "Total Racks": machine.racks?.length || 0,
        "Total Slots": totalSlots,
        "Occupied Slots": occupiedSlots,
        "Available Slots": availableSlots,
        "Maintenance Slots": maintenanceSlots,
        "Slot Utilization":
          totalSlots > 0 ? `${((occupiedSlots / totalSlots) * 100).toFixed(2)}%` : "0%",
        "Total Capacity": totalCapacity,
        "Created At": machine.createdAt ? new Date(machine.createdAt).toISOString() : "",
        "Last Updated": machine.updatedAt ? new Date(machine.updatedAt).toISOString() : "",
      };
    });

    if (format === "csv") {
      if (formattedMachines.length === 0) {
        return "";
      }

      const headers = Object.keys(formattedMachines[0]);
      const csvRows = [headers];

      formattedMachines.forEach(row => {
        const values = headers.map(header => {
          const value = row[header as keyof typeof row];
          const stringValue = String(value || "").replace(/"/g, '""');
          return `"${stringValue}"`;
        });
        csvRows.push(values);
      });

      return csvRows.map(row => row.join(",")).join("\n");
    }

    return {
      exportDate: new Date().toISOString(),
      totalRecords: formattedMachines.length,
      filters: options || {},
      data: formattedMachines,
    };
  }

  static async exportMachineById(machineId: string, format: "json" | "csv" = "json") {
    const machine = await Machine.findById(machineId).lean();

    if (!machine) {
      throw new Error("Machine not found");
    }

    let totalSlots = 0;
    let occupiedSlots = 0;
    let availableSlots = 0;
    let maintenanceSlots = 0;
    let totalCapacity = 0;

    const racksDetails =
      machine.racks?.map((rack: any) => {
        let rackOccupied = 0;
        let rackAvailable = 0;
        let rackMaintenance = 0;

        const slotsDetails =
          rack.slotsList?.map((slot: any) => {
            if (slot.status === "occupied") {
              rackOccupied++;
              occupiedSlots++;
            } else if (slot.status === "available") {
              rackAvailable++;
              availableSlots++;
            } else if (slot.status === "maintenance") {
              rackMaintenance++;
              maintenanceSlots++;
            }

            return {
              slotNumber: slot.slotNumber,
              status: slot.status,
              productId: slot.productId || "",
              productName: slot.productName || "",
              price: slot.price || 0,
              expiryDate: slot.expiryDate ? new Date(slot.expiryDate).toISOString() : "",
            };
          }) || [];

        totalSlots += rack.slots;
        totalCapacity += rack.capacity;

        return {
          rackName: rack.rackName,
          slots: rack.slots,
          capacity: rack.capacity,
          occupiedSlots: rackOccupied,
          availableSlots: rackAvailable,
          maintenanceSlots: rackMaintenance,
          slotsList: slotsDetails,
        };
      }) || [];

    const machineData = {
      "Machine ID": machine._id?.toString() || "",
      "Machine Identifier": machine.machineId || "",
      "Serial Number": machine.serialNumber || "",
      "Model Number": machine.modelNumber || "",
      "Machine Type": machine.machineType || "",
      "Firmware Version": machine.firmwareVersion || "",
      Height: machine.height || 0,
      Width: machine.width || 0,
      Length: machine.length || 0,
      Dimensions: `${machine.height || 0} x ${machine.width || 0} x ${machine.length || 0}`,
      "Door Status": machine.doorStatus || "closed",
      "Connectivity Status": machine.connectivityStatus || "offline",
      "Machine Status": machine.machineStatus || "inactive",
      "Under Maintenance": machine.underMaintenance || "no",
      Decommissioned: machine.decommissioned || "no",
      "Installed Status": machine.installed_status || "no",
      "Internal Temperature": machine.internalTemperature || "",
      "Total Racks": machine.racks?.length || 0,
      "Total Slots": totalSlots,
      "Occupied Slots": occupiedSlots,
      "Available Slots": availableSlots,
      "Maintenance Slots": maintenanceSlots,
      "Slot Utilization":
        totalSlots > 0 ? `${((occupiedSlots / totalSlots) * 100).toFixed(2)}%` : "0%",
      "Total Capacity": totalCapacity,
      "Capacity Utilization":
        totalCapacity > 0 ? `${((occupiedSlots / totalCapacity) * 100).toFixed(2)}%` : "0%",
      "Created At": machine.createdAt ? new Date(machine.createdAt).toISOString() : "",
      "Last Updated": machine.updatedAt ? new Date(machine.updatedAt).toISOString() : "",
      Racks: racksDetails,
    };

    if (format === "csv") {
      const csvRows: string[][] = [];

      csvRows.push([
        "Machine ID",
        "Machine Identifier",
        "Serial Number",
        "Model Number",
        "Machine Type",
        "Firmware Version",
        "Dimensions",
        "Door Status",
        "Connectivity Status",
        "Machine Status",
        "Under Maintenance",
        "Decommissioned",
        "Installed Status",
        "Internal Temperature",
        "Total Racks",
        "Total Slots",
        "Occupied Slots",
        "Available Slots",
        "Maintenance Slots",
        "Slot Utilization",
        "Total Capacity",
        "Capacity Utilization",
        "Created At",
        "Last Updated",
      ]);

      csvRows.push([
        machineData["Machine ID"],
        machineData["Machine Identifier"],
        machineData["Serial Number"],
        machineData["Model Number"],
        machineData["Machine Type"],
        machineData["Firmware Version"],
        machineData["Dimensions"],
        machineData["Door Status"],
        machineData["Connectivity Status"],
        machineData["Machine Status"],
        machineData["Under Maintenance"],
        machineData["Decommissioned"],
        machineData["Installed Status"],
        String(machineData["Internal Temperature"]),
        String(machineData["Total Racks"]),
        String(machineData["Total Slots"]),
        String(machineData["Occupied Slots"]),
        String(machineData["Available Slots"]),
        String(machineData["Maintenance Slots"]),
        machineData["Slot Utilization"],
        String(machineData["Total Capacity"]),
        machineData["Capacity Utilization"],
        machineData["Created At"],
        machineData["Last Updated"],
      ]);

      csvRows.push([]);
      csvRows.push(["RACK DETAILS"]);
      csvRows.push([
        "Rack Name",
        "Slots",
        "Capacity",
        "Occupied Slots",
        "Available Slots",
        "Maintenance Slots",
      ]);

      racksDetails.forEach(rack => {
        csvRows.push([
          rack.rackName,
          String(rack.slots),
          String(rack.capacity),
          String(rack.occupiedSlots),
          String(rack.availableSlots),
          String(rack.maintenanceSlots),
        ]);
      });

      if (racksDetails.length > 0) {
        csvRows.push([]);
        csvRows.push(["SLOT DETAILS"]);
        csvRows.push([
          "Rack Name",
          "Slot Number",
          "Status",
          "Product ID",
          "Product Name",
          "Price",
          "Expiry Date",
        ]);

        racksDetails.forEach(rack => {
          rack.slotsList.forEach((slot: any) => {
            csvRows.push([
              rack.rackName,
              slot.slotNumber,
              slot.status,
              slot.productId,
              slot.productName,
              String(slot.price),
              slot.expiryDate,
            ]);
          });
        });
      }

      return csvRows
        .map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(","))
        .join("\n");
    }

    return {
      exportDate: new Date().toISOString(),
      machine: machineData,
    };
  }
}
