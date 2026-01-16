import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AreaService } from '../services/arearoute.service';
import {
  CreateAreaDto,
  UpdateAreaDto,
  AreaQueryParams,
  DashboardFilterParams,
} from '../services/arearoute.service';

export class AreaController {
  /**
   * Create a new area route
   */
  static async createAreaRoute(req: Request, res: Response): Promise<void> {
    try {
      const areaData: CreateAreaDto = req.body;

      // Basic validation
      const requiredFields = ['area_name', 'state', 'district', 'pincode', 'area_description', 'status', 'sub_locations'];
      const missingFields = requiredFields.filter(field => !areaData[field as keyof CreateAreaDto]);

      if (missingFields.length > 0) {
        res.status(400).json({
          success: false,
          message: `Missing required fields: ${missingFields.join(', ')}`
        });
        return;
      }

      const newArea = await AreaService.createArea(areaData);

      res.status(201).json({
        success: true,
        message: 'Area route created successfully',
        data: newArea
      });
    } catch (error) {
      console.error('Error creating area route:', error);

      const statusCode = error.message.includes('already exists') ? 409 :
        error.message.includes('Validation') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get all area routes
   */
  static async getAllAreaRoutes(req: Request, res: Response): Promise<void> {
    try {
      const queryParams: AreaQueryParams = {
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        status: req.query.status as 'active' | 'inactive',
        state: req.query.state as string,
        district: req.query.district as string,
        search: req.query.search as string,
        sortBy: req.query.sortBy as string,
        sortOrder: req.query.sortOrder as 'asc' | 'desc'
      };

      const result = await AreaService.getAllAreas(queryParams);

      res.status(200).json({
        success: true,
        data: result.data,
        pagination: result.pagination
      });
    } catch (error) {
      console.error('Error fetching area routes:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get area route by ID
   */
  static async getAreaRouteById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const areaRoute = await AreaService.getAreaById(id);

      if (!areaRoute) {
        res.status(404).json({
          success: false,
          message: 'Area route not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        data: areaRoute
      });
    } catch (error) {
      console.error('Error fetching area route:', error);

      const statusCode = error.message.includes('Invalid MongoDB ObjectId') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Update area route
   */
  static async updateAreaRoute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateAreaDto = req.body;

      const updatedAreaRoute = await AreaService.updateArea(id, updateData);

      if (!updatedAreaRoute) {
        res.status(404).json({
          success: false,
          message: 'Area route not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Area route updated successfully',
        data: updatedAreaRoute
      });
    } catch (error) {
      console.error('Error updating area route:', error);

      const statusCode = error.message.includes('already exists') ? 409 :
        error.message.includes('Invalid') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  static async addSubLocation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { sub_location } = req.body;

      // Validate required fields
      if (!sub_location || !sub_location.campus || !sub_location.tower || !sub_location.floor) {
        res.status(400).json({
          success: false,
          message: 'Sub-location with campus, tower, and floor is required'
        });
        return;
      }

      // Validate select_machine array
      if (!Array.isArray(sub_location.select_machine) || sub_location.select_machine.length === 0) {
        res.status(400).json({
          success: false,
          message: 'At least one machine must be selected'
        });
        return;
      }

      const updatedArea = await AreaService.addSubLocation(id, sub_location);

      if (!updatedArea) {
        res.status(404).json({
          success: false,
          message: 'Area not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Sub-location added successfully',
        data: updatedArea
      });
    } catch (error) {
      console.error('Error adding sub-location:', error);

      const statusCode = error.message.includes('already exists') ? 409 :
        error.message.includes('Invalid MongoDB ObjectId') ? 400 :
          error.message.includes('Validation') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Delete area route
   */
  static async deleteAreaRoute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const deletedAreaRoute = await AreaService.deleteArea(id);

      if (!deletedAreaRoute) {
        res.status(404).json({
          success: false,
          message: 'Area route not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: 'Area route deleted successfully',
        data: deletedAreaRoute
      });
    } catch (error) {
      console.error('Error deleting area route:', error);

      const statusCode = error.message.includes('Invalid MongoDB ObjectId') ? 400 : 500;

      res.status(statusCode).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  /**
   * Toggle area status
   */
  static async toggleAreaStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const updatedAreaRoute = await AreaService.toggleAreaStatus(id);

      if (!updatedAreaRoute) {
        res.status(404).json({
          success: false,
          message: 'Area route not found'
        });
        return;
      }

      res.status(200).json({
        success: true,
        message: `Area route status toggled to ${updatedAreaRoute.status}`,
        data: updatedAreaRoute
      });
    } catch (error) {
      console.error('Error toggling area status:', error);
      res.status(400).json({
        success: false,
        message: error.message || 'Invalid area ID'
      });
    }
  }


  /**
   * Get filter options
   */
  static async getFilterOptions(req: Request, res: Response): Promise<void> {
    try {
      const filterOptions = await AreaService.getFilterOptions();

      res.status(200).json({
        success: true,
        data: filterOptions
      });
    } catch (error) {
      console.error('Error fetching filter options:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Check if area exists
   */
  static async checkAreaExists(req: Request, res: Response): Promise<void> {
    try {
      const { areaName, excludeId } = req.query;

      if (!areaName) {
        res.status(400).json({
          success: false,
          message: 'Area name is required'
        });
        return;
      }

      const exists = await AreaService.checkAreaExists(
        areaName as string,
        excludeId as string
      );

      res.status(200).json({
        success: true,
        data: { exists }
      });
    } catch (error) {
      console.error('Error checking area existence:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Export areas
   */
  static async exportAreas(req: Request, res: Response): Promise<void> {
    try {
      const queryParams: AreaQueryParams = {
        page: 1,
        limit: 10000, // Large limit for export
        status: req.query.status as 'active' | 'inactive',
        state: req.query.state as string,
        district: req.query.district as string,
        search: req.query.search as string
      };

      const result = await AreaService.getAllAreas(queryParams);
      const format = req.query.format || 'json';

      if (format === 'csv') {
        // Convert to CSV
        const csv = this.convertToCSV(result.data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=areas.csv');
        res.status(200).send(csv);
      } else {
        // Default to JSON
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=areas.json');
        res.status(200).json({
          success: true,
          data: result.data
        });
      }
    } catch (error) {
      console.error('Error exporting areas:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Convert data to CSV format
   */
  private static convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0].toObject ? data[0].toObject() : data[0]);
    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const item of data) {
      const row = headers.map(header => {
        const value = item[header];
        if (typeof value === 'object') {
          return JSON.stringify(value).replace(/"/g, '""');
        }
        return `"${String(value).replace(/"/g, '""')}"`;
      });
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }
  /**
   * Get dashboard data with filters
   */
  static async getDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const params: DashboardFilterParams = {
        status: (req.query.status as 'active' | 'inactive' | 'all') || 'all',
        state: req.query.state as string,
        district: req.query.district as string,
        campus: req.query.campus as string,
        tower: req.query.tower as string,
        floor: req.query.floor as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'area_name',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc'
      };

      const dashboardData = await AreaService.getDashboardData(params);

      res.status(200).json({
        success: true,
        data: dashboardData
      });
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get dashboard table data (optimized for frontend table)
   */
  static async getDashboardTable(req: Request, res: Response): Promise<void> {
    try {
      const params: DashboardFilterParams = {
        status: (req.query.status as 'active' | 'inactive' | 'all') || 'all',
        state: req.query.state as string,
        district: req.query.district as string,
        campus: req.query.campus as string,
        tower: req.query.tower as string,
        floor: req.query.floor as string,
        search: req.query.search as string,
        page: parseInt(req.query.page as string) || 1,
        limit: parseInt(req.query.limit as string) || 10,
        sortBy: req.query.sortBy as string || 'area_name',
        sortOrder: (req.query.sortOrder as 'asc' | 'desc') || 'asc'
      };

      const tableData = await AreaService.getDashboardTableData(params);

      res.status(200).json({
        success: true,
        data: tableData.data,
        pagination: {
          currentPage: params.page || 1,
          totalItems: tableData.total,
          totalPages: Math.ceil(tableData.total / (params.limit || 10)),
          itemsPerPage: params.limit || 10
        }
      });
    } catch (error) {
      console.error('Error fetching dashboard table:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }
  /**
    * Export dashboard data to CSV/Excel
    */
  static async exportDashboardData(req: Request, res: Response): Promise<void> {
    try {
      const params: DashboardFilterParams = {
        status: (req.query.status as 'active' | 'inactive' | 'all') || 'all',
        state: req.query.state as string,
        district: req.query.district as string,
        campus: req.query.campus as string,
        tower: req.query.tower as string,
        floor: req.query.floor as string,
        search: req.query.search as string,
        limit: 10000 // Large limit for export
      };

      const tableData = await AreaService.getDashboardTableData(params);
      const format = req.query.format || 'csv';

      if (format === 'csv') {
        // Convert to CSV
        const csv = AreaController.convertTableToCSV(tableData.data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=dashboard-export.csv');
        res.status(200).send(csv);
      } else if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', 'attachment; filename=dashboard-export.json');
        res.status(200).json({
          success: true,
          data: tableData.data
        });
      } else {
        res.status(400).json({
          success: false,
          message: 'Unsupported format. Use "csv" or "json"'
        });
      }
    } catch (error) {
      console.error('Error exporting dashboard data:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Convert table data to CSV format
   */
  private static convertTableToCSV(data: any[]): string {
    if (data.length === 0) return '';

    // Define CSV headers
    const headers = [
      'ID',
      'Area Name',
      'State',
      'District',
      'Pincode',
      'Status',
      'Sub-locations Count',
      'Total Machines',
      'Campuses',
      'Last Updated',
      'Created At'
    ];

    const csvRows = [];

    // Add headers
    csvRows.push(headers.join(','));

    // Add data rows
    for (const item of data) {
      const row = [
        item.id,
        `"${item.area_name?.replace(/"/g, '""') || ''}"`,
        `"${item.state?.replace(/"/g, '""') || ''}"`,
        `"${item.district?.replace(/"/g, '""') || ''}"`,
        item.pincode || '',
        item.status || '',
        item.sub_locations_count || 0,
        item.total_machines || 0,
        `"${item.campuses?.replace(/"/g, '""') || ''}"`,
        item.last_updated ? new Date(item.last_updated).toISOString() : '',
        item.created_at ? new Date(item.created_at).toISOString() : ''
      ];
      csvRows.push(row.join(','));
    }

    return csvRows.join('\n');
  }

  /**
   * Export areas by IDs - CSV format only
   * GET /api/v1/area/export/696a230ee3dce8a83c7dc6ea,696a20606685d00b82e0c6e8
   */
/**
 * Export areas by IDs - CSV format only
 * GET /api/v1/area/export/696a230ee3dce8a83c7dc6ea,696a20606685d00b82e0c6e8
 */
static async exportAreasByIds(req: Request, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const format = req.query.format as string || 'csv';

    // Parse IDs from URL parameter (comma-separated)
    const areaIds = id.split(',').map(id => id.trim()).filter(id => id);

    // Validate input
    if (!areaIds || areaIds.length === 0) {
      res.status(400).json({
        success: false,
        message: 'Please provide area IDs in the URL parameter'
      });
      return;
    }

    // Validate MongoDB ObjectIds
    const invalidIds = areaIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      res.status(400).json({
        success: false,
        message: `Invalid area IDs: ${invalidIds.join(', ')}`,
        invalidIds
      });
      return;
    }

    // Fetch areas by IDs
    const areas = await AreaService.getAreasByIds(areaIds);

    if (areas.length === 0) {
      res.status(404).json({
        success: false,
        message: 'No areas found with the provided IDs'
      });
      return;
    }

    // Generate filename with timestamp
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `areas-export-${timestamp}.csv`;
    
    // Generate CSV - Use the class name to call the static method
    const csv = AreaController.generateCSV(areas); // Change this.generateCSV to AreaController.generateCSV
    
    // Set headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.status(200).send(csv);
    
  } catch (error) {
    console.error('Error exporting areas by IDs:', error);
    res.status(500).json({
      success: false,
      message: error.message || 'Internal server error'
    });
  }
}

  /**
   * Generate CSV format (one row per area)
   * ID,Area Name,State,District,Pincode,Status,Sub-locations Count,Total Machines,Campuses,Last Updated,Created At
   */
  private static generateCSV(areas: any[]): string {
    if (!areas || areas.length === 0) {
      return 'No data available for export';
    }

    try {
      // Headers exactly as you want
      const headers = [
        'ID',
        'Area Name',
        'State',
        'District',
        'Pincode',
        'Status',
        'Sub-locations Count',
        'Total Machines',
        'Campuses',
        'Last Updated',
        'Created At'
      ];

      // Add BOM for UTF-8 Excel compatibility
      let csv = '\ufeff';
      csv += headers.join(',') + '\n';

      // Process each area
      areas.forEach(area => {
        const areaDoc = area.toObject ? area.toObject() : area;
        
        // Calculate summary data
        const subLocationsCount = areaDoc.sub_locations?.length || 0;
        
        // Calculate total machines across all sub-locations
        const totalMachines = areaDoc.sub_locations?.reduce(
          (sum: number, subLoc: any) => sum + (subLoc.select_machine?.length || 0), 0
        ) || 0;
        
        // Get unique campuses (remove duplicates)
        const uniqueCampuses = [...new Set(areaDoc.sub_locations?.map((sl: any) => sl.campus).filter(Boolean) || [])];
        const campuses = uniqueCampuses.join(', ');
        
        // Format dates (if you want empty for now, remove the date conversion)
        const lastUpdated = areaDoc.updatedAt ? new Date(areaDoc.updatedAt).toISOString() : '';
        const createdAt = areaDoc.createdAt ? new Date(areaDoc.createdAt).toISOString() : '';
        
        const row = [
          areaDoc._id?.toString() || '', // ID - no quotes
          `"${(areaDoc.area_name || '').replace(/"/g, '""')}"`, // Area Name - quoted
          `"${(areaDoc.state || '').replace(/"/g, '""')}"`, // State - quoted
          `"${(areaDoc.district || '').replace(/"/g, '""')}"`, // District - quoted
          areaDoc.pincode || '', // Pincode - no quotes (number)
          areaDoc.status || '', // Status - no quotes
          subLocationsCount, // Sub-locations Count - no quotes
          totalMachines, // Total Machines - no quotes
          `"${campuses.replace(/"/g, '""')}"`, // Campuses - quoted
          lastUpdated, // Last Updated - no quotes (ISO string)
          createdAt // Created At - no quotes (ISO string)
        ];
        
        csv += row.join(',') + '\n';
      });

      return csv;
    } catch (error) {
      console.error('Error generating CSV:', error);
      return 'Error generating CSV data';
    }
  }
}