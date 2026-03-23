// controllers/vendingMachine.controller.ts
import { Request, Response } from "express";
import { MachineService } from "../services/vendingMachine.service";

// ========== MACHINE CONTROLLERS ==========

export const createMachine = async (req: Request, res: Response) => {
  try {
    // Auto-generate rack names before creating
    const machineData = { ...req.body };

    if (machineData.racks && machineData.racks.length > 0) {
      machineData.racks = machineData.racks.map((rack: any, index: number) => ({
        ...rack,
        rackName: rack.rackName || String.fromCharCode(65 + index),
      }));
    }
    const machine = await MachineService.createMachine(machineData);

    res.status(201).json({
      success: true,
      message: "Machine created successfully",
      data: {
        id: machine._id,
        machineId: machine.machineId,
        serialNumber: machine.serialNumber,
        modelNumber: machine.modelNumber,
        machineType: machine.machineType,
        status: machine.machineStatus,
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
              status: slot.status,
            })),
          })) || [],
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to create machine",
      error: error.message,
    });
  }
};

export const getAllMachines = async (req: Request, res: Response) => {
  try {
    const machines = await MachineService.getAllMachines();

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
      status: m.machineStatus,
      machine_status: m.machineStatus,
      door_status: m.doorStatus,
      connectivity_status: m.connectivityStatus,
      under_maintenance: m.underMaintenance,
      decommissioned: m.decommissioned,
      internalTemperature: m.internalTemperature,
      racks:
        m.racks?.map((rack: any) => ({
          id: rack._id,
          name: rack.rackName,
          slots: rack.slots,
          capacity: rack.capacity,
          slotsCount: rack.slotsList?.length || 0,
        })) || [],
    }));

    res.status(200).json({
      success: true,
      count: machinesWithRacks.length,
      data: machinesWithRacks,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch machines",
      error: error.message,
    });
  }
};

export const getMachineById = async (req: Request, res: Response) => {
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
              productId: slot.productId,
              productName: slot.productName,
              price: slot.price,
            })),
          })) || [],
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch machine",
      error: error.message,
    });
  }
};

export const updateMachine = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const machine = await MachineService.updateMachine(machineId, req.body);

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
    res.status(500).json({
      success: false,
      message: "Failed to update machine",
      error: error.message,
    });
  }
};

export const deleteMachine = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const machine = await MachineService.deleteMachine(machineId);

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
    res.status(500).json({
      success: false,
      message: "Failed to delete machine",
      error: error.message,
    });
  }
};

export const updateMachineStatus = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const machine = await MachineService.updateMachineStatus(machineId, req.body);

    if (!machine) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Machine status updated successfully",
      data: {
        id: machine._id,
        status: machine.machineStatus,
        doorStatus: machine.doorStatus,
        connectivityStatus: machine.connectivityStatus,
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update machine status",
      error: error.message,
    });
  }
};

// ========== RACK CONTROLLERS ==========

export const addRacks = async (req: Request, res: Response) => {
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

    const createdRacks = await MachineService.addRacks(machineId, body);

    res.status(201).json({
      success: true,
      message: "Racks added successfully",
      data: createdRacks,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to add racks",
      error: error.message,
    });
  }
};

export const getMachineRacks = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const racks = await MachineService.getMachineRacks(machineId);

    res.status(200).json({
      success: true,
      data: racks,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch racks",
      error: error.message,
    });
  }
};

export const getRackById = async (req: Request, res: Response) => {
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
    res.status(500).json({
      success: false,
      message: "Failed to fetch rack",
      error: error.message,
    });
  }
};

export const updateRack = async (req: Request, res: Response) => {
  try {
    const { rackId } = req.params;
    const rack = await MachineService.updateRack(rackId, req.body);

    if (!rack) {
      return res.status(404).json({
        success: false,
        message: "Rack not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Rack updated successfully",
      data: rack,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update rack",
      error: error.message,
    });
  }
};

export const deleteRack = async (req: Request, res: Response) => {
  try {
    const { rackId } = req.params;
    const rack = await MachineService.deleteRack(rackId);

    if (!rack) {
      return res.status(404).json({
        success: false,
        message: "Rack not found",
      });
    }

    res.status(200).json({
      success: true,
      message: "Rack deleted successfully",
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to delete rack",
      error: error.message,
    });
  }
};

// ========== SLOT CONTROLLERS ==========

export const getMachineSlots = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const slots = await MachineService.getMachineSlots(machineId);

    res.status(200).json({
      success: true,
      data: slots,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch slots",
      error: error.message,
    });
  }
};

export const getSlotById = async (req: Request, res: Response) => {
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
    res.status(500).json({
      success: false,
      message: "Failed to fetch slot",
      error: error.message,
    });
  }
};

export const occupySlot = async (req: Request, res: Response) => {
  try {
    const { slotId } = req.params;
    const { productId, productName, price, expiryDate } = req.body;

    if (!productId || !productName || !price) {
      return res.status(400).json({
        success: false,
        message: "Product ID, name, and price are required",
      });
    }

    const slot = await MachineService.occupySlot(slotId, {
      productId,
      productName,
      price,
      expiryDate,
    });

    res.status(200).json({
      success: true,
      message: "Slot occupied successfully",
      data: slot,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to occupy slot",
      error: error.message,
    });
  }
};

export const freeSlot = async (req: Request, res: Response) => {
  try {
    const { slotId } = req.params;
    const slot = await MachineService.freeSlot(slotId);

    res.status(200).json({
      success: true,
      message: "Slot freed successfully",
      data: slot,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to free slot",
      error: error.message,
    });
  }
};

export const updateSlotStatus = async (req: Request, res: Response) => {
  try {
    const { slotId } = req.params;
    const { status } = req.body;

    if (!status || !["available", "occupied", "maintenance"].includes(status)) {
      return res.status(400).json({
        success: false,
        message: "Valid status (available, occupied, maintenance) is required",
      });
    }

    const slot = await MachineService.updateSlotStatus(slotId, status);

    res.status(200).json({
      success: true,
      message: "Slot status updated successfully",
      data: slot,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update slot status",
      error: error.message,
    });
  }
};

export const getAvailableSlots = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const slots = await MachineService.getAvailableSlots(machineId);

    res.status(200).json({
      success: true,
      data: slots,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch available slots",
      error: error.message,
    });
  }
};

export const getOccupiedSlots = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const slots = await MachineService.getOccupiedSlots(machineId);

    res.status(200).json({
      success: true,
      data: slots,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch occupied slots",
      error: error.message,
    });
  }
};

// ========== COMBINED CONTROLLERS ==========

export const getMachineWithRacks = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const result = await MachineService.getMachineWithRacks(machineId);

    if (!result.machine) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch machine details",
      error: error.message,
    });
  }
};

// ========== ADDITIONAL CONTROLLERS ==========

export const getMachinesByType = async (req: Request, res: Response) => {
  try {
    const { machineType } = req.params;
    const machines = await MachineService.getMachinesByType(machineType);

    res.status(200).json({
      success: true,
      count: machines.length,
      data: machines,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch machines by type",
      error: error.message,
    });
  }
};

export const getActiveMachines = async (req: Request, res: Response) => {
  try {
    const machines = await MachineService.getActiveMachines();

    res.status(200).json({
      success: true,
      count: machines.length,
      data: machines,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch active machines",
      error: error.message,
    });
  }
};

export const updateRacksBatch = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const { racks } = req.body;

    if (!Array.isArray(racks)) {
      return res.status(400).json({
        success: false,
        message: "Invalid format. Send { racks: [...] }",
      });
    }

    const updatedRacks = await MachineService.updateRacksBatch(machineId, racks);

    res.status(200).json({
      success: true,
      message: "Racks updated successfully",
      data: updatedRacks,
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update racks",
      error: error.message,
    });
  }
};
