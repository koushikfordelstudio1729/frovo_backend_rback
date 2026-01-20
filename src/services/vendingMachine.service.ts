import { VendingMachine } from "../models/VendingMachine.model";
import { Product } from "../models/Product.model";
import { Types } from "mongoose";

export interface VendingMachineQuery {
  city?: string;
  state?: string;
  status?: string;
  isOnline?: boolean | undefined;
  search?: string;
}

class VendingMachineService {
  async getAllVendingMachines(query: VendingMachineQuery = {}) {
    const filter: any = {};

    if (query.city) {
      filter["location.city"] = new RegExp(query.city, "i");
    }

    if (query.state) {
      filter["location.state"] = new RegExp(query.state, "i");
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.isOnline !== undefined) {
      filter.isOnline = query.isOnline;
    }

    if (query.search) {
      filter.$or = [
        { name: new RegExp(query.search, "i") },
        { machineId: new RegExp(query.search, "i") },
        { "location.address": new RegExp(query.search, "i") },
        { "location.landmark": new RegExp(query.search, "i") },
      ];
    }

    const machines = await VendingMachine.find(filter)
      .populate("productSlots.product")
      .sort({ createdAt: -1 });

    return machines;
  }

  async getVendingMachineById(id: string) {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error("Invalid vending machine ID");
    }

    const machine = await VendingMachine.findById(id).populate("productSlots.product");

    if (!machine) {
      throw new Error("Vending machine not found");
    }

    return machine;
  }

  async getVendingMachineByMachineId(machineId: string) {
    const machine = await VendingMachine.findOne({ machineId }).populate("productSlots.product");

    if (!machine) {
      throw new Error("Vending machine not found");
    }

    return machine;
  }

  async getVendingMachineProducts(machineId: string) {
    const machine = await VendingMachine.findOne({ machineId })
      .populate("productSlots.product")
      .select("productSlots name machineId location");

    if (!machine) {
      throw new Error("Vending machine not found");
    }

    const availableProducts = machine.productSlots.filter(slot => slot.quantity > 0);

    return {
      machineId: machine.machineId,
      machineName: machine.name,
      location: machine.location,
      products: availableProducts.map(slot => ({
        slotNumber: slot.slotNumber,
        product: slot.product,
        quantity: slot.quantity,
        price: slot.price,
        availability: slot.quantity > 0 ? "Available" : "Out of Stock",
      })),
    };
  }

  async getVendingMachinesByLocation(city?: string | undefined, state?: string | undefined) {
    const filter: any = {};

    if (city) {
      filter["location.city"] = new RegExp(city, "i");
    }

    if (state) {
      filter["location.state"] = new RegExp(state, "i");
    }

    filter.status = "Active";
    filter.isOnline = true;

    const machines = await VendingMachine.find(filter)
      .select("machineId name location status isOnline availableProducts totalStock")
      .sort({ "location.city": 1, name: 1 });

    return machines;
  }

  async getLocationFilters() {
    const locations = await VendingMachine.aggregate([
      {
        $match: {
          status: "Active",
          isOnline: true,
        },
      },
      {
        $group: {
          _id: null,
          cities: { $addToSet: "$location.city" },
          states: { $addToSet: "$location.state" },
        },
      },
    ]);

    if (locations.length === 0) {
      return { cities: [], states: [] };
    }

    const result = locations[0];
    return {
      cities: (result.cities || []).filter(Boolean).sort(),
      states: (result.states || []).filter(Boolean).sort(),
    };
  }

  async getMachineStats(machineId: string) {
    const machine = await VendingMachine.findOne({ machineId });

    if (!machine) {
      throw new Error("Vending machine not found");
    }

    const totalProducts = machine.productSlots.length;
    const availableProducts = machine.productSlots.filter(slot => slot.quantity > 0).length;
    const totalStock = machine.productSlots.reduce((sum, slot) => sum + slot.quantity, 0);
    const outOfStockSlots = machine.productSlots.filter(slot => slot.quantity === 0).length;

    return {
      machineId: machine.machineId,
      name: machine.name,
      status: machine.status,
      isOnline: machine.isOnline,
      totalProducts,
      availableProducts,
      outOfStockSlots,
      totalStock,
      revenue: machine.revenue,
      totalSales: machine.totalSales,
      lastMaintenanceDate: machine.lastMaintenanceDate,
      location: machine.location,
    };
  }

  async checkProductAvailability(machineId: string, slotNumber: string) {
    const machine = await VendingMachine.findOne({ machineId }).populate("productSlots.product");

    if (!machine) {
      throw new Error("Vending machine not found");
    }

    const slot = machine.productSlots.find(s => s.slotNumber === slotNumber);

    if (!slot) {
      throw new Error("Product slot not found");
    }

    return {
      slotNumber: slot.slotNumber,
      product: slot.product,
      quantity: slot.quantity,
      price: slot.price,
      isAvailable: slot.quantity > 0,
    };
  }

  async searchProductAcrossMachines(productSearchTerm: string, currentMachineId?: string) {
    try {
      const matchingProducts = await Product.find({
        $or: [
          { name: new RegExp(productSearchTerm, "i") },
          { brand: new RegExp(productSearchTerm, "i") },
          { category: new RegExp(productSearchTerm, "i") },
        ],
      });

      if (matchingProducts.length === 0) {
        return {
          searchTerm: productSearchTerm,
          currentMachine: currentMachineId || null,
          productsFound: [],
          alternativeMachines: [],
        };
      }

      const productIds = matchingProducts.map(p => p._id);

      const machinesWithProducts = await VendingMachine.find({
        "productSlots.product": { $in: productIds },
        "productSlots.quantity": { $gt: 0 },
        status: "Active",
        isOnline: true,
      })
        .populate("productSlots.product")
        .select("machineId name location productSlots");

      const results = [];

      for (const machine of machinesWithProducts) {
        const availableProducts = machine.productSlots.filter(
          slot =>
            productIds.some(id => id.toString() === slot.product._id.toString()) &&
            slot.quantity > 0
        );

        if (availableProducts.length > 0) {
          results.push({
            machineId: machine.machineId,
            machineName: machine.name,
            location: machine.location,
            isCurrentMachine: machine.machineId === currentMachineId,
            availableProducts: availableProducts.map(slot => ({
              slotNumber: slot.slotNumber,
              product: slot.product,
              quantity: slot.quantity,
              price: slot.price,
            })),
          });
        }
      }

      const currentMachine = results.find(r => r.isCurrentMachine);
      const alternativeMachines = results.filter(r => !r.isCurrentMachine);

      return {
        searchTerm: productSearchTerm,
        currentMachine: currentMachine || null,
        productsFound: matchingProducts,
        alternativeMachines: alternativeMachines.sort((a, b) => {
          if (a.location.city !== b.location.city) {
            return a.location.city.localeCompare(b.location.city);
          }
          return a.machineName.localeCompare(b.machineName);
        }),
        totalMachinesWithProduct: results.length,
        totalAlternatives: alternativeMachines.length,
      };
    } catch (error) {
      throw new Error(
        `Failed to search products across machines: ${error instanceof Error ? error.message : "Unknown error"}`
      );
    }
  }
}

export const vendingMachineService = new VendingMachineService();
