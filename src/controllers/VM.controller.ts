// controllers/vendingMachine.controller.ts
import { Request, Response } from "express";
import { MachineService } from "../services/VM.service";

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
                    // Add other product fields as needed
                  }
                : null,
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
          slotsList: rack.slotsList?.map((slot: any) => ({
            id: slot._id,
            slotNumber: slot.slotNumber,
            product: slot.product
              ? {
                  id: slot.product._id || slot.product,
                  productName: slot.product.product_name,
                  skuId: slot.product.sku_id,
                  // Add other product fields as needed
                }
              : null,
          })),
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
// controllers/vendingMachine.controller.ts
export const updateRack = async (req: Request, res: Response) => {
  try {
    const { machineId, rackId } = req.params;

    if (!machineId || !rackId) {
      return res.status(400).json({
        success: false,
        message: "Machine ID and Rack ID are required",
      });
    }

    const rack = await MachineService.updateRack(machineId, rackId, req.body);

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
// controllers/vendingMachine.controller.ts
export const deleteRack = async (req: Request, res: Response) => {
  try {
    const { machineId, rackId } = req.params;

    if (!machineId || !rackId) {
      return res.status(400).json({
        success: false,
        message: "Machine ID and Rack ID are required",
      });
    }

    const rack = await MachineService.deleteRack(machineId, rackId);

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
// controllers/vendingMachine.controller.ts

// ========== DOOR STATUS CONTROLLERS ==========

/**
 * Toggle door status - Switches between open and closed
 * No body required
 */
export const toggleDoorStatus = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;

    // Get current machine to check current door status
    const currentMachine = await MachineService.getMachineById(machineId);
    if (!currentMachine) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    // Toggle door status
    const newDoorStatus = currentMachine.doorStatus === "open" ? "closed" : "open";

    const machine = await MachineService.updateMachineStatus(machineId, {
      doorStatus: newDoorStatus,
    });

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
    res.status(500).json({
      success: false,
      message: "Failed to toggle door status",
      error: error.message,
    });
  }
};

/**
 * Update door status with body JSON
 * Expects doorStatus in request body
 */
export const updateDoorStatus = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const { doorStatus } = req.body;

    // Validate doorStatus
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

    // Check if machine exists
    const existingMachine = await MachineService.getMachineById(machineId);
    if (!existingMachine) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    // Update door status
    const machine = await MachineService.updateMachineStatus(machineId, {
      doorStatus,
    });

    res.status(200).json({
      success: true,
      message: `Door status updated to ${doorStatus} successfully`,
      data: {
        id: machine._id,
        machineId: machine.machineId,
        serialNumber: machine.serialNumber,
        doorStatus: machine.doorStatus,
        previousStatus: existingMachine.doorStatus,
        updatedBy: req.user?.id || "system", // if you have user context
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error: any) {
    res.status(500).json({
      success: false,
      message: "Failed to update door status",
      error: error.message,
    });
  }
};

// controllers/vendingMachine.controller.ts

// ========== CONNECTIVITY STATUS CONTROLLERS ==========

/**
 * Toggle connectivity status - Switches between online and offline
 * No body required
 */
export const toggleConnectivityStatus = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;

    // Get current machine to check current connectivity status
    const currentMachine = await MachineService.getMachineById(machineId);
    if (!currentMachine) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    // Toggle connectivity status
    const newConnectivityStatus =
      currentMachine.connectivityStatus === "online" ? "offline" : "online";

    const machine = await MachineService.updateMachineStatus(machineId, {
      connectivityStatus: newConnectivityStatus,
    });

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
    res.status(500).json({
      success: false,
      message: "Failed to toggle connectivity status",
      error: error.message,
    });
  }
};

/**
 * Update connectivity status with body JSON
 * Expects connectivityStatus in request body
 */
export const updateConnectivityStatus = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const { connectivityStatus } = req.body;

    // Validate connectivityStatus
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

    // Check if machine exists
    const existingMachine = await MachineService.getMachineById(machineId);
    if (!existingMachine) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    // Update connectivity status
    const machine = await MachineService.updateMachineStatus(machineId, {
      connectivityStatus,
    });

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
    res.status(500).json({
      success: false,
      message: "Failed to update connectivity status",
      error: error.message,
    });
  }
};

// controllers/vendingMachine.controller.ts

// ========== MACHINE STATUS CONTROLLERS ==========

/**
 * Toggle machine status - Switches between active and inactive
 * No body required
 */
export const toggleMachineStatus = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;

    // Get current machine to check current machine status
    const currentMachine = await MachineService.getMachineById(machineId);
    if (!currentMachine) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    // Toggle machine status
    const newMachineStatus = currentMachine.machineStatus === "active" ? "inactive" : "active";

    const machine = await MachineService.updateMachineStatus(machineId, {
      machineStatus: newMachineStatus,
    });

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
    res.status(500).json({
      success: false,
      message: "Failed to toggle machine status",
      error: error.message,
    });
  }
};

/**
 * Update machine status with body JSON
 * Expects machineStatus in request body
 */
export const updateMachineStatusWithBody = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const { machineStatus } = req.body;

    // Validate machineStatus
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

    // Check if machine exists
    const existingMachine = await MachineService.getMachineById(machineId);
    if (!existingMachine) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    // Update machine status
    const machine = await MachineService.updateMachineStatus(machineId, {
      machineStatus,
    });

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
    res.status(500).json({
      success: false,
      message: "Failed to update machine status",
      error: error.message,
    });
  }
};
// controllers/vendingMachine.controller.ts

// ========== UNDER MAINTENANCE STATUS CONTROLLERS ==========

/**
 * Toggle under maintenance status - Switches between yes and no
 * No body required
 */
export const toggleUnderMaintenance = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;

    // Get current machine to check current under maintenance status
    const currentMachine = await MachineService.getMachineById(machineId);
    if (!currentMachine) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    // Toggle under maintenance status
    const newUnderMaintenance = currentMachine.underMaintenance === "yes" ? "no" : "yes";

    // If setting to "yes", automatically set machine status to inactive
    // If setting to "no", automatically set machine status to active
    const updateData: any = {
      underMaintenance: newUnderMaintenance,
    };

    if (newUnderMaintenance === "yes") {
      updateData.machineStatus = "inactive";
    } else {
      updateData.machineStatus = "active";
    }

    const machine = await MachineService.updateMachineStatus(machineId, updateData);

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
    res.status(500).json({
      success: false,
      message: "Failed to toggle under maintenance status",
      error: error.message,
    });
  }
};

/**
 * Update under maintenance status with body JSON
 * Expects underMaintenance in request body
 */
export const updateUnderMaintenance = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const { underMaintenance } = req.body;

    // Validate underMaintenance
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

    // Check if machine exists
    const existingMachine = await MachineService.getMachineById(machineId);
    if (!existingMachine) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    // Prepare update data
    const updateData: any = {
      underMaintenance,
    };

    // If setting under maintenance to "yes", automatically set machine status to inactive
    // If setting under maintenance to "no", automatically set machine status to active
    if (underMaintenance === "yes") {
      updateData.machineStatus = "inactive";
    } else {
      updateData.machineStatus = "active";
    }

    // Update under maintenance status
    const machine = await MachineService.updateMachineStatus(machineId, updateData);

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
    res.status(500).json({
      success: false,
      message: "Failed to update under maintenance status",
      error: error.message,
    });
  }
};
// controllers/vendingMachine.controller.ts

// ========== DECOMMISSIONED STATUS CONTROLLERS ==========

/**
 * Toggle decommissioned status - Switches between yes and no
 * No body required
 */
export const toggleDecommissioned = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;

    // Get current machine to check current decommissioned status
    const currentMachine = await MachineService.getMachineById(machineId);
    if (!currentMachine) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    // Toggle decommissioned status
    const newDecommissioned = currentMachine.decommissioned === "yes" ? "no" : "yes";

    // Prepare update data
    const updateData: any = {
      decommissioned: newDecommissioned,
    };

    // If decommissioning the machine, automatically set:
    // - machineStatus to inactive
    // - connectivityStatus to offline
    // - underMaintenance to no (since it's decommissioned, not under maintenance)
    if (newDecommissioned === "yes") {
      updateData.machineStatus = "inactive";
      updateData.connectivityStatus = "offline";
      updateData.underMaintenance = "no";
    } else {
      // If reactivating a decommissioned machine, set to active but let user update other statuses
      updateData.machineStatus = "active";
      updateData.connectivityStatus = "online";
    }

    const machine = await MachineService.updateMachineStatus(machineId, updateData);

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
    res.status(500).json({
      success: false,
      message: "Failed to toggle decommissioned status",
      error: error.message,
    });
  }
};

/**
 * Update decommissioned status with body JSON
 * Expects decommissioned in request body
 */
export const updateDecommissioned = async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const { decommissioned } = req.body;

    // Validate decommissioned
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

    // Check if machine exists
    const existingMachine = await MachineService.getMachineById(machineId);
    if (!existingMachine) {
      return res.status(404).json({
        success: false,
        message: "Machine not found",
      });
    }

    // Prepare update data
    const updateData: any = {
      decommissioned,
    };

    // If decommissioning the machine, automatically set:
    // - machineStatus to inactive
    // - connectivityStatus to offline
    // - underMaintenance to no (since it's decommissioned, not under maintenance)
    if (decommissioned === "yes") {
      updateData.machineStatus = "inactive";
      updateData.connectivityStatus = "offline";
      updateData.underMaintenance = "no";
    } else {
      // If reactivating a decommissioned machine, set to active but let user update other statuses
      updateData.machineStatus = "active";
      updateData.connectivityStatus = "online";
    }

    // Update decommissioned status
    const machine = await MachineService.updateMachineStatus(machineId, updateData);

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
    res.status(500).json({
      success: false,
      message: "Failed to update decommissioned status",
      error: error.message,
    });
  }
};
