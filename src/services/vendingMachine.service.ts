// services/vendingMachine.service.ts
import { Machine, Rack } from "../models/VendingMachine.model";
import { Types } from "mongoose";

export class MachineService {
  // ========== MACHINE SERVICES ==========

  static async createMachine(machineData: any) {
    const machine = new Machine(machineData);
    return await machine.save();
  }

  static async getAllMachines() {
    return await Machine.find().sort({ createdAt: -1 });
  }

  static async getMachineById(machineId: string) {
    return await Machine.findById(machineId);
  }

  static async updateMachine(machineId: string, updateData: any) {
    return await Machine.findByIdAndUpdate(machineId, updateData, {
      new: true,
      runValidators: true,
    });
  }

  static async deleteMachine(machineId: string) {
    await Rack.deleteMany({ machineId });
    return await Machine.findByIdAndDelete(machineId);
  }

  static async updateMachineStatus(machineId: string, statusData: any) {
    return await Machine.findByIdAndUpdate(machineId, statusData, { new: true });
  }

  // ========== RACK SERVICES ==========

  static async addRacks(machineId: string, racksData: Array<{ slots: number; capacity: number }>) {
    // Check if machine exists
    const machine = await Machine.findById(machineId);
    if (!machine) {
      throw new Error("Machine not found");
    }

    // Get existing racks to determine next rack name
    const existingRacks = await Rack.find({ machineId }).sort("rackName");
    const startIndex = existingRacks.length;

    // Create racks with auto-generated names (A, B, C, D...)
    const racksToCreate = racksData.map((rack, index) => ({
      machineId: new Types.ObjectId(machineId),
      rackName: String.fromCharCode(65 + startIndex + index),
      slots: rack.slots,
      capacity: rack.capacity,
    }));

    // Insert all racks
    const createdRacks = await Rack.insertMany(racksToCreate);

    // Return SIMPLE response - just the racks array as they are
    return createdRacks.map(rack => ({
      id: rack._id,
      name: rack.rackName,
      slots: rack.slots,
      capacity: rack.capacity,
      machineId: rack.machineId,
    }));
  }

  static async getMachineRacks(machineId: string) {
    const racks = await Rack.find({ machineId }).sort("rackName");

    // Return SIMPLE response
    return racks.map(rack => ({
      id: rack._id,
      name: rack.rackName,
      slots: rack.slots,
      capacity: rack.capacity,
      machineId: rack.machineId,
    }));
  }

  static async getRackById(rackId: string) {
    const rack = await Rack.findById(rackId);
    if (!rack) return null;

    // Return SIMPLE response
    return {
      id: rack._id,
      name: rack.rackName,
      slots: rack.slots,
      capacity: rack.capacity,
      machineId: rack.machineId,
    };
  }

  static async updateRack(rackId: string, updateData: any) {
    const rack = await Rack.findByIdAndUpdate(rackId, updateData, {
      new: true,
      runValidators: true,
    });
    if (!rack) return null;

    // Return SIMPLE response
    return {
      id: rack._id,
      name: rack.rackName,
      slots: rack.slots,
      capacity: rack.capacity,
      machineId: rack.machineId,
    };
  }

  static async deleteRack(rackId: string) {
    return await Rack.findByIdAndDelete(rackId);
  }

  static async deleteAllMachineRacks(machineId: string) {
    return await Rack.deleteMany({ machineId });
  }

  // ========== COMBINED SERVICES ==========

  static async getMachineWithRacks(machineId: string) {
    const machine = await Machine.findById(machineId);
    const racks = await Rack.find({ machineId }).sort("rackName");

    // Return SIMPLE combined response
    return {
      machine: {
        id: machine?._id,
        serialNumber: machine?.serialNumber,
        modelNumber: machine?.modelNumber,
        machineType: machine?.machineType,
        status: machine?.machineStatus,
      },
      racks: racks.map(rack => ({
        id: rack._id,
        name: rack.rackName,
        slots: rack.slots,
        capacity: rack.capacity,
      })),
      totalRacks: racks.length,
    };
  }
}
