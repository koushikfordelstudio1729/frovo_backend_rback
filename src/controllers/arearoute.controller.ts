// areaRoute.controller.ts
import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AreaRouteModel, RouteModel } from '../models/AreaRoute.model';
import { AreaRouteService } from '../services/arearoute.service';

export class AreaRouteController {
  /**
   * Create a new area
   */
  public static async createArea(req: Request, res: Response): Promise<void> {
    try {
      const { area_name, select_machine, area_description, status } = req.body;

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

     

      // Create new area
      const newArea = new AreaRouteModel({
        area_name,
        select_machine,
        area_description,
        status
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
    const { status, page = 1, limit = 10 } = req.query;

    const match: any = {};

    if (status && (status === "active" || status === "inactive")) {
      match.status = status;
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    // Aggregation pipeline
    const result = await AreaRouteModel.aggregate([
      { $match: match },

      {
        $group: {
          _id: "$area_name",
          status: { $first: "$status" },
          total_machines: { $sum: 1 },
          machines: { $push: "$select_machine" }
        }
      },

      {
        $project: {
          _id: 0,
          area_name: "$_id",
          status: 1,
          total_machines: 1,
          machines: 1
        }
      },

      { $skip: skip },
      { $limit: limitNum }
    ]);

    // Total count (grouped)
    const countResult = await AreaRouteModel.aggregate([
      { $match: match },
      { $group: { _id: "$area_name" } }
    ]);

    const totalCount = countResult.length;
    const totalPages = Math.ceil(totalCount / limitNum);

    res.status(200).json({
      success: true,
      message: "Areas retrieved successfully",
      data: result,
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
      const { id } = req.params;

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
   * Create a new route
   */
  public static async createRoute(req: Request, res: Response): Promise<void> {
    try {
      const {
        route_name,
        area_name,
        route_description,
        selected_machine,
        frequency_type
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
      const validFrequencyTypes = ['daily', 'weekly', 'monthly'];
      if (!validFrequencyTypes.includes(frequency_type)) {
        res.status(400).json({
          success: false,
          message: 'Frequency type must be either "daily", "weekly", or "monthly"'
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
        frequency_type
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
 * Get all routes with simplified response
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

    if (frequency_type && ['daily', 'weekly', 'monthly'].includes(frequency_type as string)) {
      filter.frequency_type = frequency_type;
    }

    if (area_name && mongoose.Types.ObjectId.isValid(area_name as string)) {
      filter.area_name = area_name;
    }

    if (search) {
      filter.$or = [
        { route_name: { $regex: search, $options: 'i' } },
        { selected_machine: { $regex: search, $options: 'i' } }
      ];
    }

    const pageNum = Number(page);
    const limitNum = Number(limit);
    const skip = (pageNum - 1) * limitNum;

    // Get routes with populated area name only
    const [routes, totalCount] = await Promise.all([
      RouteModel.find(filter)
        .populate('area_name', 'area_name') // Only get area_name field
        .select('route_name area_name selected_machine frequency_type') // Select only needed fields
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum),

      RouteModel.countDocuments(filter)
    ]);

    // Transform the response
    const simplifiedRoutes = routes.map(route => {
      const routeObj = route.toObject();
      const areaName = typeof routeObj.area_name === 'object' && routeObj.area_name !== null 
        ? (routeObj.area_name as any).area_name 
        : 'N/A';
      return {
        route_name: routeObj.route_name,
        area_name: areaName,
        selected_machine: routeObj.selected_machine,
        frequency_type: routeObj.frequency_type,
        // Each route has 1 machine since selected_machine is a string
        machine_count: 1
      };
    });

    res.status(200).json({
      success: true,
      message: 'Routes retrieved successfully',
      data: simplifiedRoutes,
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
    const { id } = req.params;

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
}