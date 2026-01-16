import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { AreaService } from '../services/arearoute.service';
import {
  CreateAreaDto,
  UpdateAreaDto,
  AreaQueryParams,
  DashboardFilterParams,
  AuditLogParams
} from '../services/arearoute.service';

export class AreaController {
  /**
   * Helper method to get audit parameters from request
   */
  private static getAuditParams(req: Request): AuditLogParams {
    const user = (req as any).user || {};
    return {
      userId: user.id || user._id || 'unknown',
      userEmail: user.email || 'unknown@example.com',
      userName: user.name || user.username,
      ipAddress: req.ip || req.headers['x-forwarded-for'] as string || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown'
    };
  }

  /**
   * Get audit logs for an area
   */
  static async getAuditLogs(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const page = parseInt(req.query.page as string) || 1;
      const limit = parseInt(req.query.limit as string) || 10;

      if (!mongoose.Types.ObjectId.isValid(id)) {
        res.status(400).json({
          success: false,
          message: 'Invalid area ID'
        });
        return;
      }

      const result = await AreaService.getAuditLogs(id, page, limit);

      res.status(200).json({
        success: true,
        data: {
          logs: result.logs,
          pagination: result.pagination
        }
      });
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Get recent activities for dashboard
   */
  static async getRecentActivities(req: Request, res: Response): Promise<void> {
    try {
      const limit = parseInt(req.query.limit as string) || 10;
      const activities = await AreaService.getRecentActivities(limit);

      res.status(200).json({
        success: true,
        data: activities
      });
    } catch (error) {
      console.error('Error fetching recent activities:', error);
      res.status(500).json({
        success: false,
        message: error.message || 'Internal server error'
      });
    }
  }

  /**
   * Create a new area route with audit trail
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

      const auditParams = AreaController.getAuditParams(req); // Fixed: Use AreaController.getAuditParams
      const newArea = await AreaService.createArea(areaData, auditParams);

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
   * Update area route with audit trail
   */
  static async updateAreaRoute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const updateData: UpdateAreaDto = req.body;

      const auditParams = AreaController.getAuditParams(req); // Fixed: Use AreaController.getAuditParams
      const updatedAreaRoute = await AreaService.updateArea(id, updateData, auditParams);

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

  /**
   * Add sub-location with audit trail
   */
  static async addSubLocation(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { sub_location } = req.body;

      if (!sub_location || !sub_location.campus || !sub_location.tower || !sub_location.floor) {
        res.status(400).json({
          success: false,
          message: 'Sub-location with campus, tower, and floor is required'
        });
        return;
      }

      if (!Array.isArray(sub_location.select_machine) || sub_location.select_machine.length === 0) {
        res.status(400).json({
          success: false,
          message: 'At least one machine must be selected'
        });
        return;
      }

      const auditParams = AreaController.getAuditParams(req); // Fixed: Use AreaController.getAuditParams
      const updatedArea = await AreaService.addSubLocation(id, sub_location, auditParams);

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
   * Delete area route with audit trail
   */
  static async deleteAreaRoute(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const auditParams = AreaController.getAuditParams(req); // Fixed: Use AreaController.getAuditParams
      const deletedAreaRoute = await AreaService.deleteArea(id, auditParams);

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
   * Toggle area status with audit trail
   */
  static async toggleAreaStatus(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;

      const auditParams = AreaController.getAuditParams(req); // Fixed: Use AreaController.getAuditParams
      const updatedAreaRoute = await AreaService.toggleAreaStatus(id, auditParams);

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
        limit: 10000,
        status: req.query.status as 'active' | 'inactive',
        state: req.query.state as string,
        district: req.query.district as string,
        search: req.query.search as string
      };

      const result = await AreaService.getAllAreas(queryParams);
      const format = req.query.format || 'json';

      if (format === 'csv') {
        const csv = AreaController.convertToCSV(result.data);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', 'attachment; filename=areas.csv');
        res.status(200).send(csv);
      } else {
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
   * Get dashboard table data
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
        limit: 10000
      };

      const tableData = await AreaService.getDashboardTableData(params);
      const format = req.query.format || 'csv';

      if (format === 'csv') {
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
   * Export areas by IDs
   */
  static async exportAreasByIds(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const format = req.query.format as string || 'csv';

      const areaIds = id.split(',').map(id => id.trim()).filter(id => id);

      if (!areaIds || areaIds.length === 0) {
        res.status(400).json({
          success: false,
          message: 'Please provide area IDs in the URL parameter'
        });
        return;
      }

      const invalidIds = areaIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
      if (invalidIds.length > 0) {
        res.status(400).json({
          success: false,
          message: `Invalid area IDs: ${invalidIds.join(', ')}`,
          invalidIds
        });
        return;
      }

      const areas = await AreaService.getAreasByIds(areaIds);

      if (areas.length === 0) {
        res.status(404).json({
          success: false,
          message: 'No areas found with the provided IDs'
        });
        return;
      }

      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `areas-export-${timestamp}.csv`;
      
      const csv = AreaController.generateCSV(areas);
      
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
   * Convert data to CSV format
   */
  private static convertToCSV(data: any[]): string {
    if (data.length === 0) return '';

    const headers = Object.keys(data[0].toObject ? data[0].toObject() : data[0]);
    const csvRows = [];

    csvRows.push(headers.join(','));

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
   * Convert table data to CSV format
   */
  private static convertTableToCSV(data: any[]): string {
    if (data.length === 0) return '';

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

    csvRows.push(headers.join(','));

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
   * Generate CSV format (one row per area)
   */
  private static generateCSV(areas: any[]): string {
    if (!areas || areas.length === 0) {
      return 'No data available for export';
    }

    try {
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

      let csv = '\ufeff';
      csv += headers.join(',') + '\n';

      areas.forEach(area => {
        const areaDoc = area.toObject ? area.toObject() : area;
        
        const subLocationsCount = areaDoc.sub_locations?.length || 0;
        
        const totalMachines = areaDoc.sub_locations?.reduce(
          (sum: number, subLoc: any) => sum + (subLoc.select_machine?.length || 0), 0
        ) || 0;
        
        const uniqueCampuses = [...new Set(areaDoc.sub_locations?.map((sl: any) => sl.campus).filter(Boolean) || [])];
        const campuses = uniqueCampuses.join(', ');
        
        const lastUpdated = areaDoc.updatedAt ? new Date(areaDoc.updatedAt).toISOString() : '';
        const createdAt = areaDoc.createdAt ? new Date(areaDoc.createdAt).toISOString() : '';
        
        const row = [
          areaDoc._id?.toString() || '',
          `"${(areaDoc.area_name || '').replace(/"/g, '""')}"`,
          `"${(areaDoc.state || '').replace(/"/g, '""')}"`,
          `"${(areaDoc.district || '').replace(/"/g, '""')}"`,
          areaDoc.pincode || '',
          areaDoc.status || '',
          subLocationsCount,
          totalMachines,
          `"${campuses.replace(/"/g, '""')}"`,
          lastUpdated,
          createdAt
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