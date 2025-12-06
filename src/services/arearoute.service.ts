import mongoose from "mongoose";
import { AreaRouteModel, RouteModel } from "../models/AreaRoute.model";

export class AreaRouteService {
  
  // ==================== AREA SERVICES ====================
  
  /**
   * Create a new area
   */
  public static async createAreaService(data: {
    area_name: string;
    select_machine: string;
    area_description: string;
    status: "active" | "inactive";
  }) {
    const { area_name, select_machine, area_description, status } = data;

    // Validate required fields
    if (!area_name || !select_machine || !area_description || !status) {
      throw new Error("All fields are required");
    }

    // Validate status enum
    const validStatus = ["active", "inactive"];
    if (!validStatus.includes(status)) {
      throw new Error('Status must be either "active" or "inactive"');
    }

    // Check if area with same name already exists
    const existingArea = await AreaRouteModel.findOne({ area_name });
    if (existingArea) {
      throw new Error("Area with this name already exists");
    }

    // Create new area
    const newArea = new AreaRouteModel({
      area_name,
      select_machine,
      area_description,
      status,
    });

    return await newArea.save();
  }

  /**
   * Get all areas with optional filtering and pagination
   */
  public static async getAllAreasService(query: {
  status?: "active" | "inactive";
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: "asc" | "desc";
  search?: string;
} = {}) {

  const {
    status,
    page = 1,
    limit = 10,
    sortBy = "createdAt",
    sortOrder = "desc",
    search
  } = query;

  let filter: any = {};

  if (status && (status === "active" || status === "inactive")) {
    filter.status = status;
  }

  if (search) {
    filter.$or = [
      { area_name: { $regex: search, $options: "i" } },
      { area_description: { $regex: search, $options: "i" } },
      { select_machine: { $regex: search, $options: "i" } }
    ];
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const sort: any = {};
  sort[String(sortBy)] = sortOrder === "asc" ? 1 : -1;

  const [areas, totalCount] = await Promise.all([
    AreaRouteModel.find(filter)
      .sort(sort)
      .skip(skip)
      .limit(limitNum),

    AreaRouteModel.countDocuments(filter)
  ]);

  /** -----------------------------------------
   * Add total machines + per-machine counts
   * ----------------------------------------*/
  for (let area of areas) {
    
    /** total machines for this area (routes count) */
    const totalMachineCount = await RouteModel.countDocuments({
      area_name: area._id
    });

    (area as any).total_machines = totalMachineCount;

    /** list of machines + their route counts */
    const machines = await RouteModel.aggregate([
      {
        $match: {
          area_name: area._id
        }
      },
      {
        $group: {
          _id: "$selected_machine",
          total_routes: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          machine: "$_id",
          total_routes: 1
        }
      }
    ]);

    (area as any).machines = machines;
  }

  const totalPages = Math.ceil(totalCount / limitNum);

  return {
    data: areas,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalCount,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
      limit: limitNum
    }
  };
}

  /**
   * Delete area by ID
   */
  public static async deleteAreaService(id: string) {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid area ID format");
    }

    const deletedArea = await AreaRouteModel.findByIdAndDelete(id);
    
    if (!deletedArea) {
      throw new Error("Area not found");
    }

    return deletedArea;
  }

  // ==================== ROUTE SERVICES ====================

  /**
   * Create a new route
   */
  public static async createRouteService(data: {
    route_name: string;
    area_name: string;
    route_description: string;
    selected_machine: string;
    frequency_type: "daily" | "weekly" | "monthly";
  }) {
    const {
      route_name,
      area_name,
      route_description,
      selected_machine,
      frequency_type,
    } = data;

    // Validate required fields
    if (
      !route_name ||
      !area_name ||
      !route_description ||
      !selected_machine ||
      !frequency_type
    ) {
      throw new Error(
        "All fields are required: route_name, area_name, route_description, selected_machine, frequency_type"
      );
    }

    // Validate frequency_type enum
    const validFreq = ["daily", "weekly", "monthly"];
    if (!validFreq.includes(frequency_type)) {
      throw new Error("Frequency must be daily, weekly, or monthly");
    }

    // Validate area ID format
    if (!mongoose.Types.ObjectId.isValid(area_name)) {
      throw new Error("Invalid area ID format");
    }

    // Check if area exists
    const areaExists = await AreaRouteModel.findById(area_name);
    if (!areaExists) {
      throw new Error("Area does not exist");
    }

    // Check if route with same name already exists
    const existingRoute = await RouteModel.findOne({ route_name });
    if (existingRoute) {
      throw new Error("Route with this name already exists");
    }

    // Create new route
    const newRoute = new RouteModel({
      route_name,
      area_name,
      route_description,
      selected_machine,
      frequency_type,
    });

    const saved = await newRoute.save();
    
    // Return populated route
    return await RouteModel.findById(saved._id).populate(
      "area_name",
      "area_name select_machine status"
    );
  }

 public static async getAllRoutesService(query: {
  frequency_type?: "daily" | "weekly" | "monthly";
  area_name?: string;
  page?: number;
  limit?: number;
  search?: string;
} = {}) {

  const {
    frequency_type,
    area_name,
    page = 1,
    limit = 10,
    search
  } = query;

  let match: any = {};

  if (frequency_type && ["daily", "weekly", "monthly"].includes(frequency_type)) {
    match.frequency_type = frequency_type;
  }

  if (area_name && mongoose.Types.ObjectId.isValid(area_name)) {
    match.area_name = new mongoose.Types.ObjectId(area_name);
  }

  if (search) {
    match.$or = [
      { route_name: { $regex: search, $options: "i" } },
      { route_description: { $regex: search, $options: "i" } },
      { selected_machine: { $regex: search, $options: "i" } }
    ];
  }

  const pageNum = Number(page);
  const limitNum = Number(limit);
  const skip = (pageNum - 1) * limitNum;

  const [routes, totalCount] = await Promise.all([
    RouteModel.find(match)
      .populate("area_name", "area_name select_machine status")
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 }),

    RouteModel.countDocuments(match)
  ]);

  // Process each route to add machine information
  for (const route of routes) {
    const area = route.area_name as any;
    
    if (area) {
      // Get total machines in the area
      const totalMachinesInArea = Array.isArray(area.select_machine) 
        ? area.select_machine.length 
        : 1;
      
      // Count routes for this specific machine in the same area
      const machineRouteCount = await RouteModel.countDocuments({
        area_name: area._id,
        selected_machine: route.selected_machine
      });
      
      // Check if the route's machine is in the area's machine list
      const isMachineInArea = Array.isArray(area.select_machine)
        ? area.select_machine.includes(route.selected_machine)
        : area.select_machine === route.selected_machine;
      
      // Add virtual properties
      (route as any).total_machines_in_area = totalMachinesInArea;
      (route as any).machine_route_count = machineRouteCount;
      (route as any).is_machine_valid = isMachineInArea;
      (route as any).available_machines = Array.isArray(area.select_machine)
        ? area.select_machine
        : [area.select_machine];
    }
  }

  const totalPages = Math.ceil(totalCount / limitNum);

  return {
    data: routes,
    pagination: {
      currentPage: pageNum,
      totalPages,
      totalCount,
      hasNextPage: pageNum < totalPages,
      hasPreviousPage: pageNum > 1,
      limit: limitNum
    }
  };
}
  /**
   * Get routes by area ID
   */
  public static async getRoutesByAreaIdService(areaId: string) {
    // Validate area ID format
    if (!mongoose.Types.ObjectId.isValid(areaId)) {
      throw new Error("Invalid area ID format");
    }

    // Check if area exists
    const areaExists = await AreaRouteModel.findById(areaId);
    if (!areaExists) {
      throw new Error("Area not found");
    }

    // Get routes for this area
    const routes = await RouteModel.find({ area_name: areaId })
      .populate("area_name", "area_name select_machine status")
      .sort({ createdAt: -1 });

    return {
      area: {
        id: areaExists._id,
        area_name: areaExists.area_name,
        status: areaExists.status
      },
      data: routes,
      count: routes.length
    };
  }

  /**
   * Update route by ID
   */
  public static async updateRouteService(id: string, data: Partial<{
    route_name: string;
    area_name: string;
    route_description: string;
    selected_machine: string;
    frequency_type: "daily" | "weekly" | "monthly";
  }>) {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid route ID format");
    }

    // Check if route exists
    const existingRoute = await RouteModel.findById(id);
    if (!existingRoute) {
      throw new Error("Route not found");
    }

    // If updating area_name, validate it
    if (data.area_name) {
      if (!mongoose.Types.ObjectId.isValid(data.area_name)) {
        throw new Error("Invalid area ID format");
      }

      const areaExists = await AreaRouteModel.findById(data.area_name);
      if (!areaExists) {
        throw new Error("Area does not exist");
      }
    }

    // If updating route_name, check for duplicates
    if (data.route_name && data.route_name !== existingRoute.route_name) {
      const routeWithSameName = await RouteModel.findOne({
        route_name: data.route_name,
        _id: { $ne: id }
      });
      
      if (routeWithSameName) {
        throw new Error("Route with this name already exists");
      }
    }

    // Update route
    const updatedRoute = await RouteModel.findByIdAndUpdate(
      id,
      data,
      { new: true, runValidators: true }
    );

    // Return populated route
    if (updatedRoute) {
      return await RouteModel.findById(updatedRoute._id)
        .populate("area_name", "area_name select_machine status");
    }

    return null;
  }

  /**
   * Delete route by ID
   */
  public static async deleteRouteService(id: string) {
    // Validate ID format
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error("Invalid route ID format");
    }

    const deletedRoute = await RouteModel.findByIdAndDelete(id);
    
    if (!deletedRoute) {
      throw new Error("Route not found");
    }

    return deletedRoute;
  }

  /**
   * Get statistics about areas and routes
   */
  public static async getStatisticsService() {
    const [
      totalAreas,
      totalRoutes,
      activeAreas,
      dailyRoutes,
      weeklyRoutes,
      monthlyRoutes
    ] = await Promise.all([
      AreaRouteModel.countDocuments(),
      RouteModel.countDocuments(),
      AreaRouteModel.countDocuments({ status: "active" }),
      RouteModel.countDocuments({ frequency_type: "daily" }),
      RouteModel.countDocuments({ frequency_type: "weekly" }),
      RouteModel.countDocuments({ frequency_type: "monthly" })
    ]);

    // Get areas with their route counts
    const areasWithRouteCount = await RouteModel.aggregate([
      {
        $group: {
          _id: "$area_name",
          routeCount: { $sum: 1 }
        }
      },
      {
        $lookup: {
          from: "arearoutes",
          localField: "_id",
          foreignField: "_id",
          as: "area"
        }
      },
      {
        $unwind: "$area"
      },
      {
        $project: {
          areaId: "$_id",
          areaName: "$area.area_name",
          areaStatus: "$area.status",
          routeCount: 1
        }
      },
      {
        $sort: { routeCount: -1 }
      }
    ]);

    return {
      areas: {
        total: totalAreas,
        active: activeAreas,
        inactive: totalAreas - activeAreas
      },
      routes: {
        total: totalRoutes,
        daily: dailyRoutes,
        weekly: weeklyRoutes,
        monthly: monthlyRoutes
      },
      areasWithRouteCount,
      summary: {
        averageRoutesPerArea: totalAreas > 0 ? (totalRoutes / totalAreas).toFixed(2) : "0.00",
        activeAreasPercentage: totalAreas > 0 ? ((activeAreas / totalAreas) * 100).toFixed(2) + "%" : "0%"
      }
    };
  }

  /**
   * Check if area exists by ID
   */
  public static async checkAreaExists(areaId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(areaId)) {
      return false;
    }
    const area = await AreaRouteModel.findById(areaId);
    return !!area;
  }

  /**
   * Check if route exists by ID
   */
  public static async checkRouteExists(routeId: string): Promise<boolean> {
    if (!mongoose.Types.ObjectId.isValid(routeId)) {
      return false;
    }
    const route = await RouteModel.findById(routeId);
    return !!route;
  }
}