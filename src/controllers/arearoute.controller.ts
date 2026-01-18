// areaRoute.controller.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AreaRouteModel, RouteModel } from '../models/AreaRoute.model';

import { AreaRouteService } from '../services/arearoute.service';
import { CheckInModel, MachineReassignmentModel } from '../models/RouteTracking.model';

export class AreaRouteController {
  /**
   * Create a new area
   */
  public static async createArea(req: Request, res: Response): Promise<void> {
    try {
      const { area_name, select_machine, area_description, status, latitude, longitude, address } = req.body;

      // Validate required fields
      if (!area_name || !select_machine || !area_description || !status) {
        res.status(400).json({
          success: false,
          message: 'All fields are required: area_name, select_machine, area_description, status'
        });
        return;
      }

      // Validate status enum
      const validStatus = ['active', 'inactive'];
      if (!validStatus.includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Status must be either "active" or "inactive"'
        });
        return;
      }

      // Validate latitude/longitude if provided
      if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
        res.status(400).json({
          success: false,
          message: 'Latitude must be between -90 and 90'
        });
        return;
      }

      if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
        res.status(400).json({
          success: false,
          message: 'Longitude must be between -180 and 180'
        });
        return;
      }

      // Create new area
      const newArea = new AreaRouteModel({
        area_name,
        select_machine,
        area_description,
        status,
        latitude,
        longitude,
        address
      });

      const savedArea = await newArea.save();

      res.status(201).json({
        success: true,
        message: 'Area created successfully',
        data: savedArea
      });

    } catch (error) {
      console.error('Error creating area:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all areas
   */
  public static async getAllAreas(req: Request, res: Response): Promise<void> {
  try {
    const { status, page = 1, limit = 10, search } = req.query;

    // Build filter
    const filter: any = {};

    if (status && (status === "active" || status === "inactive")) {
      filter.status = status;
    }

    // Search by area name
    if (search) {
      filter.area_name = { $regex: search, $options: 'i' };
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Get all areas with complete data
    const [areas, totalCount] = await Promise.all([
      AreaRouteModel.find(filter)
        .select('_id area_name select_machine area_description status latitude longitude address createdAt updatedAt')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      AreaRouteModel.countDocuments(filter)
    ]);

    // Add machine count to each area
    const areasWithCount = areas.map(area => ({
      ...area,
      total_machines: area.select_machine.length
    }));

    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      message: "Areas retrieved successfully",
      data: areasWithCount,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalCount,
        hasNextPage: pageNum < totalPages,
        hasPreviousPage: pageNum > 1,
        limit: limitNum
      }
    });

  } catch (error) {
    console.log("Error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error instanceof Error ? error.message : "Unknown error"
    });
  }
}

  /**
   * Get area by ID
   */
  public static async getAreaById(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid area ID format'
        });
        return;
      }

      const area = await AreaRouteModel.findById(id);

      if (!area) {
        res.status(404).json({
          success: false,
          message: 'Area not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Area retrieved successfully',
        data: area
      });

    } catch (error) {
      console.error('Error fetching area:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Update area by ID
   */
  public static async updateArea(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const { area_name, select_machine, area_description, status, latitude, longitude, address } = req.body;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid area ID format'
        });
        return;
      }

      // Validate status enum if provided
      if (status && !['active', 'inactive'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Status must be either "active" or "inactive"'
        });
        return;
      }

      // Validate latitude/longitude if provided
      if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
        res.status(400).json({
          success: false,
          message: 'Latitude must be between -90 and 90'
        });
        return;
      }

      if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
        res.status(400).json({
          success: false,
          message: 'Longitude must be between -180 and 180'
        });
        return;
      }

      // Build update object
      const updateData: any = {};
      if (area_name) updateData.area_name = area_name;
      if (select_machine) updateData.select_machine = select_machine;
      if (area_description) updateData.area_description = area_description;
      if (status) updateData.status = status;
      if (latitude !== undefined) updateData.latitude = latitude;
      if (longitude !== undefined) updateData.longitude = longitude;
      if (address !== undefined) updateData.address = address;

      const updatedArea = await AreaRouteModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      );

      if (!updatedArea) {
        res.status(404).json({
          success: false,
          message: 'Area not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Area updated successfully',
        data: updatedArea
      });

    } catch (error) {
      console.error('Error updating area:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete/Deactivate area by ID
   */
  public static async deleteArea(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid area ID format'
        });
        return;
      }

      // Soft delete: Set status to inactive
      const deletedArea = await AreaRouteModel.findByIdAndUpdate(
        id,
        { status: 'inactive' },
        { new: true }
      );

      if (!deletedArea) {
        res.status(404).json({
          success: false,
          message: 'Area not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Area deactivated successfully',
        data: deletedArea
      });

    } catch (error) {
      console.error('Error deleting area:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Create a new route
   */
  public static async createRoute(req: Request, res: Response): Promise<void> {
    try {
      const {
        route_name,
        area_name,
        route_description,
        selected_machine,
        frequency_type,
        weekly_days,
        custom_dates,
        notes,
        machine_sequence
      } = req.body;

      // Validate required fields
      if (!route_name || !area_name || !route_description || !selected_machine || !frequency_type) {
        res.status(400).json({
          success: false,
          message: 'All fields are required: route_name, area_name, route_description, selected_machine, frequency_type'
        });
        return;
      }

      // Validate frequency_type enum
      const validFrequencyTypes = ['daily', 'weekly', 'monthly', 'custom'];
      if (!validFrequencyTypes.includes(frequency_type)) {
        res.status(400).json({
          success: false,
          message: 'Frequency type must be either "daily", "weekly", "monthly", or "custom"'
        });
        return;
      }

      // Validate weekly_days if frequency is weekly
      if (frequency_type === 'weekly' && (!weekly_days || weekly_days.length === 0)) {
        res.status(400).json({
          success: false,
          message: 'Weekly days are required for weekly frequency type'
        });
        return;
      }

      // Validate custom_dates if frequency is custom
      if (frequency_type === 'custom' && (!custom_dates || custom_dates.length === 0)) {
        res.status(400).json({
          success: false,
          message: 'Custom dates are required for custom frequency type'
        });
        return;
      }

      // Validate area_name is a valid ObjectId and exists
      if (!mongoose.Types.ObjectId.isValid(area_name)) {
        res.status(400).json({
          success: false,
          message: 'Invalid area ID format'
        });
        return;
      }

      const areaExists = await AreaRouteModel.findById(area_name);
      if (!areaExists) {
        res.status(404).json({
          success: false,
          message: 'Area not found'
        });
        return;
      }

      // Create new route
      const newRoute = new RouteModel({
        route_name,
        area_name,
        route_description,
        selected_machine,
        frequency_type,
        weekly_days,
        custom_dates,
        notes,
        machine_sequence
      });

      const savedRoute = await newRoute.save();

      // Populate area_name field for response
      const populatedRoute = await RouteModel.findById(savedRoute._id)
        .populate('area_name', 'area_name select_machine status');

      res.status(201).json({
        success: true,
        message: 'Route created successfully',
        data: populatedRoute
      });

    } catch (error) {
      console.error('Error creating route:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get all routes with optional filtering
   */
/**
 * Get all routes with complete data
 */
public static async getAllRoutes(req: Request, res: Response): Promise<void> {
  try {
    const {
      frequency_type,
      area_name,
      page = 1,
      limit = 10,
      search
    } = req.query;

    let filter: any = {};

    // Filter by frequency type (including custom)
    if (frequency_type && ['daily', 'weekly', 'monthly', 'custom'].includes(frequency_type as string)) {
      filter.frequency_type = frequency_type;
    }

    // Filter by area
    if (area_name && mongoose.Types.ObjectId.isValid(area_name as string)) {
      filter.area_name = area_name;
    }

    // Search by route name or machine ID
    if (search) {
      filter.$or = [
        { route_name: { $regex: search, $options: 'i' } },
        { selected_machine: { $in: [new RegExp(search as string, 'i')] } }
      ];
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get routes with complete data and populated area
    const [routes, totalCount] = await Promise.all([
      RouteModel.find(filter)
        .populate('area_name', 'area_name select_machine status latitude longitude address')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),

      RouteModel.countDocuments(filter)
    ]);

    // Add machine count to each route
    const routesWithCount = routes.map(route => ({
      ...route,
      machine_count: route.selected_machine.length
    }));

    res.status(200).json({
      success: true,
      message: 'Routes retrieved successfully',
      data: routesWithCount,
      pagination: {
        currentPage: pageNum,
        totalPages: Math.ceil(totalCount / limitNum),
        totalCount,
        hasNextPage: pageNum < Math.ceil(totalCount / limitNum),
        hasPreviousPage: pageNum > 1,
        limit: limitNum
      }
    });

  } catch (error) {
    console.error('Error fetching routes:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}
  /**
   * Get routes by area ID
   */
  public static async getRouteById(req: Request, res: Response): Promise<void> {
  try {
    const id = req.params.id as string;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      res.status(400).json({
        success: false,
        message: 'Invalid route ID format'
      });
      return;
    }

    let route: any = await RouteModel.findById(id)
      .populate('area_name', 'area_name select_machine status');

    if (!route) {
      res.status(404).json({
        success: false,
        message: 'Route not found'
      });
      return;
    }

    // count machines inside route for that area
    const count = await RouteModel.countDocuments({
      area_name: route.area_name?._id,
      selected_machine: route.selected_machine
    });

    route = route.toObject();
    route.total_machines = count;

    res.status(200).json({
      success: true,
      message: 'Route retrieved successfully',
      data: route
    });

  } catch (error) {
    console.error('Error fetching route:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error'
    });
  }
}

  /**
   * Update route by ID
   */
  public static async updateRoute(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;
      const {
        route_name,
        area_name,
        route_description,
        selected_machine,
        frequency_type,
        weekly_days,
        custom_dates,
        notes,
        machine_sequence
      } = req.body;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid route ID format'
        });
        return;
      }

      // Validate frequency_type if provided
      if (frequency_type && !['daily', 'weekly', 'monthly', 'custom'].includes(frequency_type)) {
        res.status(400).json({
          success: false,
          message: 'Frequency type must be either "daily", "weekly", "monthly", or "custom"'
        });
        return;
      }

      // Validate area_name if provided
      if (area_name && !mongoose.Types.ObjectId.isValid(area_name)) {
        res.status(400).json({
          success: false,
          message: 'Invalid area ID format'
        });
        return;
      }

      // Build update object
      const updateData: any = {};
      if (route_name) updateData.route_name = route_name;
      if (area_name) updateData.area_name = area_name;
      if (route_description) updateData.route_description = route_description;
      if (selected_machine) updateData.selected_machine = selected_machine;
      if (frequency_type) updateData.frequency_type = frequency_type;
      if (weekly_days) updateData.weekly_days = weekly_days;
      if (custom_dates) updateData.custom_dates = custom_dates;
      if (notes !== undefined) updateData.notes = notes;
      if (machine_sequence) updateData.machine_sequence = machine_sequence;

      const updatedRoute = await RouteModel.findByIdAndUpdate(
        id,
        updateData,
        { new: true, runValidators: true }
      ).populate('area_name', 'area_name select_machine status');

      if (!updatedRoute) {
        res.status(404).json({
          success: false,
          message: 'Route not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Route updated successfully',
        data: updatedRoute
      });

    } catch (error) {
      console.error('Error updating route:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Delete route by ID
   */
  public static async deleteRoute(req: Request, res: Response): Promise<void> {
    try {
      const id = req.params.id as string;

      // Validate ID format
      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid route ID format'
        });
        return;
      }

      const deletedRoute = await RouteModel.findByIdAndDelete(id);

      if (!deletedRoute) {
        res.status(404).json({
          success: false,
          message: 'Route not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Route deleted successfully',
        data: deletedRoute
      });

    } catch (error) {
      console.error('Error deleting route:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get routes by area ID
   */
  public static async getRoutesByAreaId(req: Request, res: Response): Promise<void> {
    try {
      const areaId = req.params.areaId as string;

      // Validate area ID format
      if (!mongoose.Types.ObjectId.isValid(areaId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid area ID format'
        });
        return;
      }

      const routes = await RouteModel.find({ area_name: areaId })
        .populate('area_name', 'area_name select_machine status')
        .sort({ createdAt: -1 });

      res.status(200).json({
        success: true,
        message: 'Routes retrieved successfully',
        data: routes,
        count: routes.length
      });

    } catch (error) {
      console.error('Error fetching routes by area:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get combined area and route statistics
   */
  public static async getStatistics(req: Request, res: Response): Promise<void> {
    try {
      const [totalAreas, totalRoutes, activeAreas, dailyRoutes, weeklyRoutes, monthlyRoutes] = await Promise.all([
        AreaRouteModel.countDocuments(),
        RouteModel.countDocuments(),
        AreaRouteModel.countDocuments({ status: 'active' }),
        RouteModel.countDocuments({ frequency_type: 'daily' }),
        RouteModel.countDocuments({ frequency_type: 'weekly' }),
        RouteModel.countDocuments({ frequency_type: 'monthly' })
      ]);

      // Get areas with their route counts
      const areasWithRouteCount = await RouteModel.aggregate([
        {
          $group: {
            _id: '$area_name',
            routeCount: { $sum: 1 }
          }
        },
        {
          $lookup: {
            from: 'arearoutes',
            localField: '_id',
            foreignField: '_id',
            as: 'area'
          }
        },
        {
          $unwind: '$area'
        },
        {
          $project: {
            areaId: '$_id',
            areaName: '$area.area_name',
            areaStatus: '$area.status',
            routeCount: 1
          }
        },
        {
          $sort: { routeCount: -1 }
        }
      ]);

      res.status(200).json({
        success: true,
        message: 'Statistics retrieved successfully',
        data: {
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
            averageRoutesPerArea: totalAreas > 0 ? (totalRoutes / totalAreas).toFixed(2) : '0.00',
            activeAreasPercentage: totalAreas > 0 ? ((activeAreas / totalAreas) * 100).toFixed(2) + '%' : '0%'
          }
        }
      });

    } catch (error) {
      console.error('Error fetching statistics:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Check-in to a machine
   */
  public static async checkIn(req: Request, res: Response): Promise<void> {
    try {
      const {
        route_id,
        machine_id,
        agent_id,
        status,
        planned_sequence,
        actual_sequence,
        notes
      } = req.body;

      // Validate required fields
      if (!route_id || !machine_id || !agent_id || !status) {
        res.status(400).json({
          success: false,
          message: 'Required fields: route_id, machine_id, agent_id, status'
        });
        return;
      }

      // Validate route_id
      if (!mongoose.Types.ObjectId.isValid(route_id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid route ID format'
        });
        return;
      }

      // Validate status enum
      if (!['completed', 'skipped'].includes(status)) {
        res.status(400).json({
          success: false,
          message: 'Status must be either "completed" or "skipped"'
        });
        return;
      }

      // Check if route exists
      const route = await RouteModel.findById(route_id);
      if (!route) {
        res.status(404).json({
          success: false,
          message: 'Route not found'
        });
        return;
      }

      // Check if already checked in today
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const existingCheckIn = await CheckInModel.findOne({
        route_id,
        machine_id,
        agent_id,
        date: today
      });

      if (existingCheckIn) {
        res.status(400).json({
          success: false,
          message: 'Already checked in for this machine today'
        });
        return;
      }

      // Create check-in
      const checkIn = new CheckInModel({
        route_id,
        machine_id,
        agent_id,
        status,
        planned_sequence,
        actual_sequence,
        notes,
        date: today
      });

      const savedCheckIn = await checkIn.save();

      res.status(201).json({
        success: true,
        message: 'Check-in recorded successfully',
        data: savedCheckIn
      });

    } catch (error) {
      console.error('Error recording check-in:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Get route progress for a specific route
   */
  public static async getRouteProgress(req: Request, res: Response): Promise<void> {
    try {
      const routeId = req.params.routeId as string;
      const { date, agent_id } = req.query;

      // Validate route ID
      if (!mongoose.Types.ObjectId.isValid(routeId)) {
        res.status(400).json({
          success: false,
          message: 'Invalid route ID format'
        });
        return;
      }

      // Get route details
      const route = await RouteModel.findById(routeId)
        .populate('area_name', 'area_name');

      if (!route) {
        res.status(404).json({
          success: false,
          message: 'Route not found'
        });
        return;
      }

      // Set date filter (default to today)
      const targetDate = date ? new Date(date as string) : new Date();
      targetDate.setHours(0, 0, 0, 0);

      // Build filter
      const filter: any = { route_id: routeId, date: targetDate };
      if (agent_id) filter.agent_id = agent_id;

      // Get check-ins for this route
      const checkIns = await CheckInModel.find(filter).sort({ check_in_time: 1 });

      // Build progress data for each machine in the route
      const machineProgress = route.selected_machine.map((machineId, index) => {
        const checkIn = checkIns.find(ci => ci.machine_id === machineId);

        return {
          machine_id: machineId,
          planned_sequence: route.machine_sequence?.[index] || index + 1,
          check_in_status: checkIn ? checkIn.status : 'pending',
          check_in_time: checkIn ? checkIn.check_in_time : null,
          actual_sequence: checkIn?.actual_sequence,
          deviation_alert: checkIn && checkIn.actual_sequence !== (route.machine_sequence?.[index] || index + 1)
            ? 'out-of-sequence'
            : checkIn?.status === 'skipped' ? 'skipped' : null,
          notes: checkIn?.notes
        };
      });

      // Calculate summary
      const totalMachines = route.selected_machine.length;
      const completed = machineProgress.filter(m => m.check_in_status === 'completed').length;
      const skipped = machineProgress.filter(m => m.check_in_status === 'skipped').length;
      const pending = totalMachines - completed - skipped;

      res.status(200).json({
        success: true,
        message: 'Route progress retrieved successfully',
        data: {
          route_info: {
            route_id: route._id,
            route_name: route.route_name,
            area_name: route.area_name,
            date: targetDate
          },
          summary: {
            total_machines: totalMachines,
            completed,
            pending,
            skipped
          },
          machine_progress: machineProgress
        }
      });

    } catch (error) {
      console.error('Error fetching route progress:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }

  /**
   * Reassign machines to a different agent
   */
  public static async reassignMachines(req: Request, res: Response): Promise<void> {
    try {
      const {
        route_id,
        machine_ids,
        original_agent_id,
        reassigned_agent_id,
        reason
      } = req.body;

      // Validate required fields
      if (!route_id || !machine_ids || !original_agent_id || !reassigned_agent_id) {
        res.status(400).json({
          success: false,
          message: 'Required fields: route_id, machine_ids, original_agent_id, reassigned_agent_id'
        });
        return;
      }

      // Validate route_id
      if (!mongoose.Types.ObjectId.isValid(route_id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid route ID format'
        });
        return;
      }

      // Validate machine_ids is an array
      if (!Array.isArray(machine_ids) || machine_ids.length === 0) {
        res.status(400).json({
          success: false,
          message: 'machine_ids must be a non-empty array'
        });
        return;
      }

      // Check if route exists
      const route = await RouteModel.findById(route_id);
      if (!route) {
        res.status(404).json({
          success: false,
          message: 'Route not found'
        });
        return;
      }

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // Create reassignment records
      const reassignments = machine_ids.map(machine_id => ({
        route_id,
        machine_id,
        original_agent_id,
        reassigned_agent_id,
        reassignment_date: today,
        reason
      }));

      const savedReassignments = await MachineReassignmentModel.insertMany(reassignments);

      res.status(201).json({
        success: true,
        message: 'Machines reassigned successfully',
        data: {
          reassignment_count: savedReassignments.length,
          reassignments: savedReassignments
        }
      });

    } catch (error) {
      console.error('Error reassigning machines:', error);
      res.status(500).json({
        success: false,
        message: 'Internal server error',
        error: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  }
}