// controllers/vendingMachine.controller.ts
import { Request, Response } from "express";
import { MachineService } from "../services/vendingMachine.service";

// ========== MACHINE CONTROLLERS ==========

export const createMachine = async (req: Request, res: Response) => {
  try {
    const machine = await MachineService.createMachine(req.body);

    res.status(201).json({
      success: true,
      message: "Machine created successfully",
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
      message: "Failed to create machine",
      error: error.message,
    });
  }
};

export const getAllMachines = async (req: Request, res: Response) => {
  try {
    const machines = await MachineService.getAllMachines();

    // Fetch racks for each machine
    const machinesWithRacks = await Promise.all(
      machines.map(async m => {
        const racks = await MachineService.getMachineRacks(m._id.toString());
        return {
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
          racks: racks, // Add racks here
          totalRacks: racks.length,
          totalSlots: racks.reduce((sum, rack) => sum + rack.slots, 0),
          totalCapacity: racks.reduce((sum, rack) => sum + rack.capacity, 0),
        };
      })
    );

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

    // Fetch racks for this machine
    const racks = await MachineService.getMachineRacks(machineId);

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
        racks: racks, // Add racks here
        totalRacks: racks.length,
        totalSlots: racks.reduce((sum, rack) => sum + rack.slots, 0),
        totalCapacity: racks.reduce((sum, rack) => sum + rack.capacity, 0),
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
      message: "Machine and its racks deleted successfully",
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

// ========== RACK CONTROLLERS ==========

export const addRacks = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const body = req.body;

    // SIMPLE: Just check if it's an array
    if (!Array.isArray(body)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid format. Send array like: [{slots:5, capacity:10}]',
      });
    }

    // Validate each rack
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
      data: racks, // SIMPLE array of racks
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
      data: rack, // SIMPLE rack object
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
      data: rack, // SIMPLE rack object
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
      data: result, // SIMPLE combined object
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to fetch machine details",
      error: error.message,
    });
  }
};
