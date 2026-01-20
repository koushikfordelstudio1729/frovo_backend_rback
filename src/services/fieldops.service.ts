import { Types } from "mongoose";
import { FieldOpsTask } from "../models/FieldOpsTask.model";
import { MachineRefill } from "../models/MachineRefill.model";
import { MachineSkip } from "../models/MachineSkip.model";
import { HandoverSummary } from "../models/HandoverSummary.model";
import { MaintenanceIssue } from "../models/MaintenanceIssue.model";
import { FieldAgent, DispatchOrder, Warehouse } from "../models/Warehouse.model";
import { VendingMachine } from "../models/VendingMachine.model";
import { AreaRouteModel } from "../models/AreaRoute.model";
import { User } from "../models";

export class FieldOpsService {
  async getDashboard(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    const user = await User.findById(userId).select("name email");
    if (!user) {
      throw new Error("User not found");
    }

    const [assignedTasks, pendingRefills, priorityMachines] = await Promise.all([
      FieldOpsTask.countDocuments({
        assignedAgent: userId,
        status: { $in: ["pending", "in_progress"] },
      }),
      FieldOpsTask.countDocuments({
        assignedAgent: userId,
        taskType: "machine_refill",
        status: "pending",
      }),
      FieldOpsTask.countDocuments({
        assignedAgent: userId,
        priority: "high",
        status: { $in: ["pending", "in_progress"] },
      }),
    ]);

    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const todaysTasks = await FieldOpsTask.find({
      assignedAgent: userId,
      status: { $in: ["pending", "in_progress"] },
      createdAt: { $gte: todayStart },
    })
      .populate("dispatchId", "dispatchId destination")
      .populate("machineId", "machineId name location")
      .populate("issueId", "issueType")
      .sort({ priority: -1, createdAt: -1 })
      .limit(10)
      .lean();

    return {
      agentName: user.name,
      assignedTasks,
      pendingRefills,
      priorityMachines,
      todaysTasks: todaysTasks.map(task => ({
        id: task._id,
        type: task.taskType,
        title: task.title,
        status: task.status,
        priority: task.priority,
        badge: this.getTaskBadge(task.status, task.priority),
      })),
    };
  }

  private getTaskBadge(status: string, priority: string): string {
    if (status === "in_progress") return "In Progress";
    if (priority === "high") return "Issue";
    return "Pending";
  }

  async getTasks(
    agentId: string,
    filters: {
      status?: string;
      type?: string;
      date?: string;
    }
  ) {
    if (!Types.ObjectId.isValid(agentId)) {
      throw new Error("Invalid agent ID");
    }

    const query: any = { assignedAgent: agentId };

    if (filters.status && filters.status !== "all") {
      query.status = filters.status;
    }

    if (filters.type && filters.type !== "all") {
      query.taskType = filters.type;
    }

    if (filters.date) {
      const date = new Date(filters.date);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      query.createdAt = { $gte: date, $lt: nextDate };
    }

    const tasks = await FieldOpsTask.find(query)
      .populate("dispatchId")
      .populate("machineId")
      .populate("routeId")
      .populate("issueId")
      .sort({ priority: -1, createdAt: -1 })
      .lean();

    return {
      tasks: tasks.map(task => this.formatTaskResponse(task)),
    };
  }

  private formatTaskResponse(task: any) {
    return {
      id: task._id,
      type: task.taskType,
      title: task.title,
      description: task.description,
      status: task.status,
      priority: task.priority,
      dueDate: task.dueDate,
      createdAt: task.createdAt,
      details: this.getTaskDetails(task),
    };
  }

  private getTaskDetails(task: any) {
    if (task.taskType === "warehouse_pickup" && task.dispatchId) {
      return {
        dispatchId: task.dispatchId.dispatchId,
        destination: task.dispatchId.destination,
        products: task.dispatchId.products,
      };
    }
    if (task.taskType === "machine_refill" && task.machineId) {
      return {
        machineId: task.machineId.machineId,
        machineName: task.machineId.name,
        location: task.machineId.location,
      };
    }
    if (task.taskType === "maintenance" && task.issueId) {
      return {
        issueType: task.issueId.issueType,
        description: task.issueId.description,
      };
    }
    return {};
  }

  async getWarehousePickups(agentId: string, status?: string) {
    if (!Types.ObjectId.isValid(agentId)) {
      throw new Error("Invalid agent ID");
    }

    const query: any = {
      assignedAgent: agentId,
    };

    if (status && status !== "all") {
      query.status = status;
    }

    const dispatches = await DispatchOrder.find(query)
      .populate("warehouse", "code name location")
      .sort({ createdAt: -1 })
      .lean();

    return {
      totalPickups: dispatches.length,
      pickups: dispatches.map(dispatch => {
        const warehouse = dispatch.warehouse as any;
        return {
          id: dispatch._id,
          status: dispatch.status,
          warehouseId: warehouse?.code || "",
          warehouseName: warehouse?.name || "",
          location: warehouse?.location?.address || dispatch.destination,
          dispatchId: dispatch.dispatchId,
        };
      }),
    };
  }

  async getWarehousePickupById(pickupId: string) {
    if (!Types.ObjectId.isValid(pickupId)) {
      throw new Error("Invalid pickup ID");
    }

    const dispatch = await DispatchOrder.findById(pickupId)
      .populate("warehouse", "code name location")
      .populate("assignedAgent", "name")
      .lean();

    if (!dispatch) {
      throw new Error("Pickup not found");
    }

    const warehouse = dispatch.warehouse as any;
    return {
      warehouseId: warehouse?.code || "",
      warehouseName: warehouse?.name || "",
      location: warehouse?.location?.address || dispatch.destination,
      dispatchId: dispatch.dispatchId,
      status: dispatch.status,
      products: dispatch.products.map((p: any) => ({
        sku: p.sku,
        productName: p.productName || p.sku,
        quantity: p.quantity,
        batchId: p.batchId || "",
      })),
    };
  }

  async markPickupAsCollected(pickupId: string, agentId: string, data: { collectedAt: Date }) {
    if (!Types.ObjectId.isValid(pickupId)) {
      throw new Error("Invalid pickup ID");
    }

    const dispatch = await DispatchOrder.findOne({
      _id: pickupId,
      assignedAgent: agentId,
    });

    if (!dispatch) {
      throw new Error("Pickup not found or not assigned to you");
    }

    dispatch.status = "in_transit";
    await dispatch.save();

    await FieldOpsTask.updateOne(
      { dispatchId: pickupId, assignedAgent: agentId },
      { status: "in_progress" }
    );

    return {
      message: "Pickup marked as collected",
      status: "collected",
    };
  }

  async createHandover(agentId: string, data: any) {
    if (!Types.ObjectId.isValid(agentId)) {
      throw new Error("Invalid agent ID");
    }

    let dispatchObjectId = data.dispatchId;
    let warehouseObjectId = data.warehouseId;
    let machineObjectId = data.machineId;

    if (data.dispatchId) {
      if (Types.ObjectId.isValid(data.dispatchId)) {
        dispatchObjectId = data.dispatchId;
      } else {
        const dispatch = await DispatchOrder.findOne({ dispatchId: data.dispatchId });
        if (!dispatch) {
          throw new Error(`Dispatch order not found: ${data.dispatchId}`);
        }
        dispatchObjectId = dispatch._id;
      }
    }

    if (data.warehouseId) {
      if (Types.ObjectId.isValid(data.warehouseId)) {
        warehouseObjectId = data.warehouseId;
      } else {
        const warehouse = await Warehouse.findOne({ code: data.warehouseId });
        if (!warehouse) {
          throw new Error(`Warehouse not found: ${data.warehouseId}`);
        }
        warehouseObjectId = warehouse._id;
      }
    }

    if (data.machineId) {
      if (Types.ObjectId.isValid(data.machineId)) {
        machineObjectId = data.machineId;
      } else {
        const machine = await VendingMachine.findOne({ machineId: data.machineId });
        if (machine) {
          machineObjectId = machine._id;
        } else {
          machineObjectId = undefined;
        }
      }
    }

    const handover = await HandoverSummary.create({
      dispatchId: dispatchObjectId,
      agentId,
      warehouseId: warehouseObjectId,
      machineId: machineObjectId,
      date: data.date || new Date(),
      agentName: data.agentName,
      code: data.code,
      grade: data.grade,
      category: data.category,
      reason: data.reason,
      notes: data.notes,
      images: data.images || [],
      status: "pending",
    });

    return {
      success: true,
      message: "Handover summary created successfully",
      data: {
        handoverId: handover.handoverId,
        id: handover._id,
        dispatchId: handover.dispatchId,
        status: handover.status,
        createdAt: handover.createdAt,
      },
    };
  }

  async getMyRoutes(agentId: string) {
    if (!Types.ObjectId.isValid(agentId)) {
      throw new Error("Invalid agent ID");
    }

    const agent = await FieldAgent.findById(agentId).lean();
    if (!agent) {
      throw new Error("Agent not found");
    }

    const routes = await AreaRouteModel.find({
      _id: { $in: agent.assignedRoutes },
    }).lean();

    return {
      routes: await Promise.all(
        routes.map(async (route: any) => {
          const totalMachines = route.selected_machine?.length || 0;
          const completedToday = await this.getCompletedMachinesToday(agentId, route._id);

          return {
            routeId: route._id,
            routeName: route.route_name || `Route ${route._id}`,
            areaLocation: route.route_description || "",
            totalMachines,
            status: completedToday === totalMachines ? "completed" : "pending",
            completedMachines: completedToday,
            pendingMachines: totalMachines - completedToday,
          };
        })
      ),
    };
  }

  async getRouteMachines(routeId: string, agentId: string) {
    if (!Types.ObjectId.isValid(routeId)) {
      throw new Error("Invalid route ID");
    }

    const route: any = await AreaRouteModel.findById(routeId).lean();
    if (!route) {
      throw new Error("Route not found");
    }

    const machines = await VendingMachine.find({
      machineId: { $in: route.selected_machine || [] },
    }).lean();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const machinesWithStatus = await Promise.all(
      machines.map(async (machine: any) => {
        const refillToday = await MachineRefill.findOne({
          machineId: machine._id,
          agentId,
          createdAt: { $gte: today },
        });

        const skipToday = await MachineSkip.findOne({
          machineId: machine._id,
          agentId,
          createdAt: { $gte: today },
        });

        return {
          id: machine._id,
          machineId: machine.machineId,
          location: machine.location.address,
          floor: machine.location.landmark || "",
          vendType: "Refill",
          priority: this.getMachinePriority(machine),
          status: refillToday ? "Completed" : skipToday ? "Skipped" : "Pending",
          action: refillToday ? "View" : "Skip ↻",
        };
      })
    );

    return {
      routeId: route._id,
      routeName: route.route_name,
      areaLocation: route.route_description || "",
      totalMachines: machines.length,
      machines: machinesWithStatus,
    };
  }

  private async getCompletedMachinesToday(agentId: string, routeId: string): Promise<number> {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return await MachineRefill.countDocuments({
      agentId,
      routeId,
      createdAt: { $gte: today },
      status: "completed",
    });
  }

  private getMachinePriority(machine: any): string {
    const lowStockSlots =
      machine.productSlots?.filter((slot: any) => slot.quantity < slot.maxCapacity * 0.3).length ||
      0;

    if (lowStockSlots > 3) return "High";
    if (lowStockSlots > 1) return "Medium";
    return "Low";
  }

  async verifyMachine(data: { machineId?: string; qrCode?: string }, agentId: string) {
    let machine;

    if (data.machineId) {
      machine = await VendingMachine.findOne({ machineId: data.machineId }).lean();
    } else if (data.qrCode) {
      machine = await VendingMachine.findOne({ machineId: data.qrCode }).lean();
    }

    if (!machine) {
      return {
        valid: false,
        message: "Machine not found. Please verify and try again.",
      };
    }

    const agent = await FieldAgent.findById(agentId).lean();
    const routes = await AreaRouteModel.find({
      _id: { $in: agent?.assignedRoutes || [] },
      selected_machine: machine.machineId,
    });

    const assignedToRoute = routes.length > 0;

    const lastRefill = await MachineRefill.findOne({
      machineId: machine._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return {
      valid: true,
      assignedToRoute,
      machine: {
        machineId: machine.machineId,
        location: machine.location.address,
        floor: machine.location.landmark || "Ground Floor",
        contactPerson: "ABC - 94411003", // TODO: Add to machine model
        lastSync: this.getRelativeTime(machine.updatedAt),
        lastRefill: lastRefill ? this.formatDateTime(lastRefill.createdAt) : "Never",
      },
    };
  }

  async getMachineDetails(machineId: string) {
    const machine = await VendingMachine.findOne({ machineId }).lean();

    if (!machine) {
      throw new Error("Machine not found");
    }

    const lastRefill = await MachineRefill.findOne({
      machineId: machine._id,
    })
      .sort({ createdAt: -1 })
      .lean();

    return {
      machineId: machine.machineId,
      location: machine.location.address,
      contactPerson: "ABC - 94411003",
      floor: machine.location.landmark || "Ground Floor",
      lastSync: this.getRelativeTime(machine.updatedAt),
      lastRefill: lastRefill ? this.formatDateTime(lastRefill.createdAt) : "Never",
    };
  }

  async getMachineHealth(machineId: string) {
    const machine = await VendingMachine.findOne({ machineId }).lean();

    if (!machine) {
      throw new Error("Machine not found");
    }

    const recentIssues = await MaintenanceIssue.find({
      machineId: machine._id,
      status: { $in: ["open", "in_progress"] },
    })
      .sort({ createdAt: -1 })
      .limit(5)
      .lean();

    return {
      status: machine.isOnline ? "online" : "offline",
      lastSync: this.getRelativeTime(machine.updatedAt),
      metrics: {
        temperature: {
          value: machine.temperature || 18,
          status: machine.temperature && machine.temperature > 25 ? "abnormal" : "ok",
          label: "Temp (Abnormal)",
          unit: "°C",
        },
        paymentErrors: 40, // TODO: Get from transactions
        skippedVends: 1, // TODO: Get from transactions
        doorStatus: "closed",
      },
      alerts: recentIssues.map(issue => ({
        message: `${issue.issueType} - ${this.getRelativeTime(issue.createdAt)}`,
      })),
    };
  }

  async getMachineRefillData(machineId: string) {
    const machine = await VendingMachine.findOne({ machineId })
      .populate("productSlots.product")
      .lean();

    if (!machine) {
      throw new Error("Machine not found");
    }

    const racks: any[] = [];
    const slotsByRack: { [key: number]: any[] } = {};

    machine.productSlots?.forEach((slot: any) => {
      const match = slot.slotNumber.match(/^([A-Z])(\d+)$/);
      if (match) {
        const rackLetter = match[1];
        const rackNumber = rackLetter.charCodeAt(0) - 64;
        if (!slotsByRack[rackNumber]) {
          slotsByRack[rackNumber] = [];
        }

        const product = slot.product as any;
        slotsByRack[rackNumber].push({
          slotId: slot.slotNumber,
          productCode: product?.sku || "",
          productName: product?.product_name || "",
          productImage: product?.images?.[0] || "",
          currentStock: slot.quantity,
          maxCapacity: slot.maxCapacity,
        });
      }
    });

    for (const rackNum in slotsByRack) {
      racks.push({
        rackNumber: parseInt(rackNum),
        slots: slotsByRack[rackNum].sort((a, b) => a.slotId.localeCompare(b.slotId)),
      });
    }

    return {
      machineId: machine.machineId,
      location: machine.location.address,
      totalUnitsDispensed: 35, // TODO: Calculate from transactions
      totalUnitsReplaced: null,
      beforeWithPhoto: null,
      afterRefill: null,
      racks: racks.sort((a, b) => a.rackNumber - b.rackNumber),
    };
  }

  async getSlotDetails(machineId: string, slotId: string) {
    const machine = await VendingMachine.findOne({ machineId })
      .populate("productSlots.product")
      .lean();

    if (!machine) {
      throw new Error("Machine not found");
    }

    const slot = machine.productSlots?.find((s: any) => s.slotNumber === slotId);

    if (!slot) {
      throw new Error("Slot not found");
    }

    const product = slot.product as any;
    return {
      slotId: `Rack ${Math.ceil((slotId.charCodeAt(0) - 64) / 5)} Slot ${slotId}`,
      productCode: product?.sku || "",
      productName: product?.product_name || "",
      dateTime: this.formatDateTime(new Date()),
      transUnitsDispensed: 80, // TODO: Get from transactions
      totalUnitsRefilled: null,
      currentStock: slot.quantity,
      existingQty: slot.quantity,
      variance: null,
      varianceReason: null,
      removedQty: null,
      removedReason: null,
      expiryDate: null,
    };
  }

  async submitRefill(machineId: string, agentId: string, data: any) {
    if (!Types.ObjectId.isValid(agentId)) {
      throw new Error("Invalid agent ID");
    }

    const machine = await VendingMachine.findOne({ machineId });
    if (!machine) {
      throw new Error("Machine not found");
    }

    const totalUnitsDispensed = data.refillData.reduce(
      (sum: number, slot: any) => sum + (slot.transUnitsDispensed || 0),
      0
    );
    const totalUnitsRefilled = data.refillData.reduce(
      (sum: number, slot: any) => sum + (slot.totalUnitsRefilled || 0),
      0
    );
    const totalUnitsRemoved = data.refillData.reduce(
      (sum: number, slot: any) => sum + (slot.removedQty || 0),
      0
    );
    const totalVariance = data.refillData.reduce(
      (sum: number, slot: any) => sum + (slot.variance || 0),
      0
    );

    const refill = await MachineRefill.create({
      machineId: machine._id,
      agentId,
      refillDateTime: data.completedAt || new Date(),
      beforePhoto: data.beforePhoto,
      afterPhoto: data.afterPhoto,
      slotRefills: data.refillData.map((slot: any) => ({
        slotId: slot.slotId,
        rackNumber: this.extractRackNumber(slot.slotId),
        slotPosition: this.extractSlotPosition(slot.slotId),
        productCode: slot.productCode,
        productName: slot.productName || slot.productCode,
        transUnitsDispensed: slot.transUnitsDispensed || 0,
        existingQty: slot.existingQty || 0,
        refilledQty: slot.totalUnitsRefilled || 0,
        currentStock: slot.currentStock || 0,
        variance: slot.variance || 0,
        varianceReason: slot.varianceReason || "",
        removedQty: slot.removedQty || 0,
        removedReason: slot.removedReason || "",
      })),
      totalUnitsDispensed,
      totalUnitsRefilled,
      totalUnitsRemoved,
      totalVariance,
      totalSlots: data.refillData.length,
      status: "completed",
    });

    for (const slotData of data.refillData) {
      const slotPosition = this.extractSlotPosition(slotData.slotId);
      await VendingMachine.updateOne(
        { _id: machine._id, "productSlots.slotNumber": slotPosition },
        { $set: { "productSlots.$.quantity": slotData.currentStock } }
      );
    }

    await FieldOpsTask.updateOne(
      { machineId: machine._id, assignedAgent: agentId, status: "in_progress" },
      { status: "completed", completedAt: new Date(), completedBy: agentId }
    );

    return {
      refillId: refill.refillId,
      message: "Refill submitted successfully",
      summary: {
        totalUnitsDispensed,
        totalUnitsRefilled,
        totalUnitsRemoved,
        totalVariance,
      },
    };
  }

  async getRefillSummary(refillId: string) {
    const refill = await MachineRefill.findOne({ refillId })
      .populate("machineId", "machineId name location")
      .lean();

    if (!refill) {
      throw new Error("Refill not found");
    }

    const machine = refill.machineId as any;
    return {
      machineId: machine?.machineId || "",
      dateTime: this.formatDateTime(refill.refillDateTime),
      items: refill.slotRefills.map(slot => ({
        slotId: slot.slotId,
        productCode: slot.productCode,
        productName: slot.productName,
        expiryDate: slot.expiryDate,
        transUnitsDispensed: slot.transUnitsDispensed,
        totalUnitsRefilled: slot.refilledQty,
        currentStock: slot.currentStock,
        refillingQty: slot.refilledQty,
        variance: slot.variance,
        varianceReason: slot.varianceReason,
        removedQty: slot.removedQty,
        removedReason: slot.removedReason,
      })),
    };
  }

  private extractRackNumber(slotId: string): number {
    const match = slotId.match(/Rack (\d+)/);
    return match ? parseInt(match[1]) : 1;
  }

  private extractSlotPosition(slotId: string): string {
    const match = slotId.match(/Slot ([A-Z]\d+)/);
    return match ? match[1] : slotId;
  }

  async skipMachine(machineId: string, agentId: string, data: any) {
    const machine = await VendingMachine.findOne({ machineId });
    if (!machine) {
      throw new Error("Machine not found");
    }

    const skip = await MachineSkip.create({
      machineId: machine._id,
      routeId: data.routeId,
      agentId,
      reason: data.reason,
      notes: data.notes,
      skippedAt: new Date(),
    });

    await FieldOpsTask.updateOne(
      {
        machineId: machine._id,
        assignedAgent: agentId,
        status: { $in: ["pending", "in_progress"] },
      },
      { status: "skipped" }
    );

    return {
      message: "Machine skipped successfully",
    };
  }

  async raiseIssue(machineId: string, agentId: string, data: any) {
    const machine = await VendingMachine.findOne({ machineId });
    if (!machine) {
      throw new Error("Machine not found");
    }

    const issue = await MaintenanceIssue.create({
      machineId: machine._id,
      agentId,
      issueType: data.issueType,
      machineName: data.machineName,
      dateTime: data.dateTime || new Date(),
      lastVisit: data.lastVisit,
      description: data.description,
      affectedSlots: data.affectedSlots,
      photos: data.photos || [],
      officialNote: data.officialNote,
      priority: data.priority || "medium",
      status: "open",
    });

    return {
      issueId: issue.issueId,
      message: "Issue raised successfully",
    };
  }

  async getWorkSummary(agentId: string, date?: string) {
    const queryDate = date ? new Date(date) : new Date();
    const startOfDay = new Date(queryDate);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(queryDate);
    endOfDay.setHours(23, 59, 59, 999);

    const [assignedTasks, completedTasks, refills] = await Promise.all([
      FieldOpsTask.countDocuments({
        assignedAgent: agentId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }),
      FieldOpsTask.countDocuments({
        assignedAgent: agentId,
        status: "completed",
        completedAt: { $gte: startOfDay, $lte: endOfDay },
      }),
      MachineRefill.find({
        agentId,
        createdAt: { $gte: startOfDay, $lte: endOfDay },
      }).lean(),
    ]);

    return {
      date: this.formatDate(queryDate),
      assignedTasks,
      completedTasks,
      reportTypes: ["Pickup reports", "Refill reports", "Maintenance Reports"],
    };
  }

  async getNotifications(agentId: string, read?: boolean) {
    return {
      notifications: [],
      unreadCount: 0,
    };
  }

  async getProfile(agentId: string) {
    const agent = await FieldAgent.findById(agentId).populate("createdBy", "name email").lean();

    if (!agent) {
      throw new Error("Agent not found");
    }

    return {
      name: agent.name,
      email: "",
      phone: "+91 98765 43210",
      assignedWarehouse: {
        id: "WH-A-01",
        name: "Whitefield",
      },
      assignedArea: {
        id: "area-1",
        name: "Whitefield",
      },
    };
  }

  private formatDateTime(date: Date): string {
    return new Date(date)
      .toLocaleString("en-IN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      .replace(",", " |");
  }

  private formatDate(date: Date): string {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  private getRelativeTime(date: Date): string {
    const seconds = Math.floor((new Date().getTime() - new Date(date).getTime()) / 1000);

    if (seconds < 60) return `${seconds} sec ago`;
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} min ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
    const days = Math.floor(hours / 24);
    return `${days} day${days > 1 ? "s" : ""} ago`;
  }
}

export const fieldOpsService = new FieldOpsService();
