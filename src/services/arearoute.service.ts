import mongoose, { Types } from 'mongoose';
import { AreaRouteModel, ICreateArea } from '../models/AreaRoute.model';

export interface DashboardFilterParams {
  status?: 'active' | 'inactive' | 'all';
  state?: string;
  district?: string;
  campus?: string;
  tower?: string;
  floor?: string;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface DashboardData {
  areas: ICreateArea[];
  statistics: {
    totalAreas: number;
    activeAreas: number;
    inactiveAreas: number;
    areasByState: Record<string, number>;
    areasByDistrict: Record<string, number>;
    areasByStatus: Record<string, number>;
    areasByCampus: Record<string, number>;
  };
  filterOptions: {
    states: string[];
    districts: string[];
    campuses: string[];
    towers: string[];
    floors: string[];
  };
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface CreateAreaDto {
  area_name: string;
  state: string;
  district: string;
  pincode: string;
  area_description: string;
  status: 'active' | 'inactive';
  latitude?: number;
  longitude?: number;
  address?: string;
  sub_locations: {
    campus: string;
    tower: string;
    floor: string;
    select_machine: string[];
  }[];
}

export interface UpdateAreaDto {
  area_name?: string;
  state?: string;
  district?: string;
  pincode?: string;
  area_description?: string;
  status?: 'active' | 'inactive';
  latitude?: number;
  longitude?: number;
  address?: string;
  sub_locations?: {
    campus?: string;
    tower?: string;
    floor?: string;
    select_machine?: string[];
  }[];
}

export interface AreaQueryParams {
  page?: number;
  limit?: number;
  status?: 'active' | 'inactive';
  state?: string;
  district?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface AreaPaginationResult {
  data: ICreateArea[];
  pagination: {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
  };
}

export interface BulkUpdateStatusDto {
  areaIds: string[];
  status: 'active' | 'inactive';
}

export interface LocationSearchParams {
  state?: string;
  district?: string;
}

export class AreaService {
  /**
   * Create a new area
   */
  static async createArea(areaData: CreateAreaDto): Promise<ICreateArea> {
    try {
      // Check for duplicate area name WITH SAME SUB-LOCATIONS
      // You need to check all sub-locations for duplicates
      const existingAreas = await AreaRouteModel.find({
        area_name: areaData.area_name
      });

      // Check if any existing area has overlapping sub-locations
      if (Array.isArray(areaData.sub_locations)) {
        for (const newSubLoc of areaData.sub_locations) {
          for (const existingArea of existingAreas) {
            const existingSubLocs = existingArea.sub_locations || [];
            const duplicateExists = existingSubLocs.some((existingLoc: any) =>
              existingLoc.campus === newSubLoc.campus &&
              existingLoc.tower === newSubLoc.tower &&
              existingLoc.floor === newSubLoc.floor
            );

            if (duplicateExists) {
              throw new Error(
                `Sub-location with campus "${newSubLoc.campus}", tower "${newSubLoc.tower}", floor "${newSubLoc.floor}" already exists for area "${areaData.area_name}"`
              );
            }
          }
        }
      }

      // Validate sub-location(s)
      this.validateSubLocation(areaData.sub_locations);

      // Validate coordinates if provided
      if (areaData.latitude !== undefined || areaData.longitude !== undefined) {
        this.validateCoordinates(areaData.latitude, areaData.longitude);
      }

      const newArea = new AreaRouteModel(areaData);
      return await newArea.save();
    } catch (error) {
      if (error instanceof mongoose.Error.ValidationError) {
        const errorMessages = Object.values(error.errors).map(err => err.message);
        throw new Error(`Validation failed: ${errorMessages.join(', ')}`);
      }
      throw error;
    }
  }
  /**
   * Get area by ID
   */
  static async getAreaById(id: string): Promise<ICreateArea | null> {
    this.validateObjectId(id);
    return await AreaRouteModel.findById(id);
  }

  /**
   * Get all areas with filtering and pagination
   */
  static async getAllAreas(queryParams: AreaQueryParams): Promise<AreaPaginationResult> {
    const {
      page = 1,
      limit = 10,
      status,
      state,
      district,
      search,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = queryParams;

    const filter = this.buildFilter({ status, state, district, search });

    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, Math.min(limit, 100)); // Limit to 100 items per page
    const skip = (pageNum - 1) * limitNum;

    const sort = this.buildSort(sortBy, sortOrder);

    const [data, totalItems] = await Promise.all([
      AreaRouteModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
      AreaRouteModel.countDocuments(filter)
    ]);

    const totalPages = Math.ceil(totalItems / limitNum);

    return {
      data,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems,
        itemsPerPage: limitNum
      }
    };
  }

  /**
   * Update area by ID
   */
  static async updateArea(id: string, updateData: UpdateAreaDto): Promise<ICreateArea | null> {
    this.validateObjectId(id);

    // Check for duplicate area name if updating
    if (updateData.area_name) {
      const existingArea = await AreaRouteModel.findOne({
        area_name: updateData.area_name,
        _id: { $ne: id }
      });

      if (existingArea) {
        throw new Error('Area with this name already exists');
      }
    }

    // Validate sub-location if updating
    if (updateData.sub_locations) {
      this.validateSubLocation(updateData.sub_locations as any);
    }

    // Validate coordinates if updating
    if (updateData.latitude !== undefined || updateData.longitude !== undefined) {
      this.validateCoordinates(updateData.latitude, updateData.longitude);
    }

    const updatedArea = await AreaRouteModel.findByIdAndUpdate(
      id,
      { $set: updateData },
      { new: true, runValidators: true }
    );

    return updatedArea;
  }

  /**
   * Delete area by ID
   */
  static async deleteArea(id: string): Promise<ICreateArea | null> {
    this.validateObjectId(id);
    return await AreaRouteModel.findByIdAndDelete(id);
  }

  /**
   * Get areas by status
   */
  static async getAreasByStatus(status: 'active' | 'inactive'): Promise<ICreateArea[]> {
    if (!['active', 'inactive'].includes(status)) {
      throw new Error('Invalid status value');
    }

    return await AreaRouteModel.find({ status });
  }

  /**
   * Update area status
   */
  static async updateAreaStatus(id: string, status: 'active' | 'inactive'): Promise<ICreateArea | null> {
    this.validateObjectId(id);

    if (!['active', 'inactive'].includes(status)) {
      throw new Error('Invalid status value');
    }

    return await AreaRouteModel.findByIdAndUpdate(
      id,
      { $set: { status } },
      { new: true }
    );
  }

  /**
   * Check if area exists by name
   */
  static async checkAreaExists(areaName: string, excludeId?: string): Promise<boolean> {
    const filter: any = { area_name: areaName };
    if (excludeId) {
      filter._id = { $ne: excludeId };
    }

    const count = await AreaRouteModel.countDocuments(filter);
    return count > 0;
  }


  /**
   * Toggle area status
   */
  static async toggleAreaStatus(id: string): Promise<ICreateArea | null> {
    this.validateObjectId(id);

    const area = await this.getAreaById(id);
    if (!area) {
      throw new Error('Area not found');
    }

    const newStatus = area.status === 'active' ? 'inactive' : 'active';
    return await this.updateAreaStatus(id, newStatus);
  }

  /**
   * Validate MongoDB ObjectId
   */
  private static validateObjectId(id: string): void {
    if (!mongoose.Types.ObjectId.isValid(id)) {
      throw new Error('Invalid MongoDB ObjectId');
    }
  }

  /**
   * Validate sub-location structure
   */
  private static validateSubLocation(subLocation: any): void {
    // Check if it's an array
    if (Array.isArray(subLocation)) {
      // Validate each sub-location in the array
      if (subLocation.length === 0) {
        throw new Error('At least one sub-location must be provided');
      }

      for (const loc of subLocation) {
        if (!loc.campus || !loc.tower || !loc.floor) {
          throw new Error('Campus, tower, and floor are required in each sub-location');
        }

        if (!Array.isArray(loc.select_machine) || loc.select_machine.length === 0) {
          throw new Error('At least one machine must be selected in each sub-location');
        }
      }
    }
    // Handle single object (backward compatibility)
    else if (typeof subLocation === 'object' && subLocation !== null) {
      if (!subLocation.campus || !subLocation.tower || !subLocation.floor) {
        throw new Error('Campus, tower, and floor are required in sub-location');
      }

      if (!Array.isArray(subLocation.select_machine) || subLocation.select_machine.length === 0) {
        throw new Error('At least one machine must be selected in sub-location');
      }
    }
    // Invalid type
    else {
      throw new Error('Invalid sub-location format');
    }
  }


  /**
   * Validate coordinates
   */
  private static validateCoordinates(latitude?: number, longitude?: number): void {
    if (latitude !== undefined && (latitude < -90 || latitude > 90)) {
      throw new Error('Latitude must be between -90 and 90');
    }

    if (longitude !== undefined && (longitude < -180 || longitude > 180)) {
      throw new Error('Longitude must be between -180 and 180');
    }
  }
  /**
   * Build filter for querying
   */
  private static buildFilter(params: {
    status?: string;
    state?: string;
    district?: string;
    search?: string;
  }): any {
    const filter: any = {};

    if (params.status) filter.status = params.status;
    if (params.state) filter.state = { $regex: params.state, $options: 'i' };
    if (params.district) filter.district = { $regex: params.district, $options: 'i' };

    if (params.search) {
      filter.$or = [
        { area_name: { $regex: params.search, $options: 'i' } },
        { state: { $regex: params.search, $options: 'i' } },
        { district: { $regex: params.search, $options: 'i' } },
        { pincode: { $regex: params.search, $options: 'i' } },
        { area_description: { $regex: params.search, $options: 'i' } }
      ];
    }

    return filter;
  }

  /**
   * Build sort object
   */
  private static buildSort(sortBy: string, sortOrder: 'asc' | 'desc'): any {
    const sort: any = {};

    // Ensure sortBy is a valid field
    const allowedSortFields = [
      'area_name', 'state', 'district', 'pincode',
      'status', 'createdAt', 'updatedAt'
    ];

    const field = allowedSortFields.includes(sortBy) ? sortBy : 'createdAt';
    sort[field] = sortOrder === 'asc' ? 1 : -1;

    return sort;
  }


  /**
   * Get unique values for filtering
   */
  static async getFilterOptions(): Promise<{
    states: string[];
    districts: string[];
    campuses: string[];
    towers: string[];
    floors: string[];
  }> {
    const [states, districts, campuses, towers, floors] = await Promise.all([
      AreaRouteModel.distinct('state') as Promise<string[]>,
      AreaRouteModel.distinct('district') as Promise<string[]>,
      AreaRouteModel.distinct('sub_location.campus') as Promise<string[]>,
      AreaRouteModel.distinct('sub_location.tower') as Promise<string[]>,
      AreaRouteModel.distinct('sub_location.floor') as Promise<string[]>
    ]);

    return {
      states: states.filter(Boolean).sort(),
      districts: districts.filter(Boolean).sort(),
      campuses: campuses.filter(Boolean).sort(),
      towers: towers.filter(Boolean).sort(),
      floors: floors.filter(Boolean).sort()
    };
  }
  static async addSubLocation(
    areaId: string,
    newSubLocation: {
      campus: string;
      tower: string;
      floor: string;
      select_machine: string[];
    }
  ): Promise<ICreateArea | null> {
    this.validateObjectId(areaId);

    // Validate the new sub-location
    this.validateSubLocation(newSubLocation);

    // Check if this exact sub-location already exists for this area
    const existingArea = await AreaRouteModel.findOne({
      _id: areaId,
      'sub_locations.campus': newSubLocation.campus,
      'sub_locations.tower': newSubLocation.tower,
      'sub_locations.floor': newSubLocation.floor
    });

    if (existingArea) {
      throw new Error('This sub-location (campus, tower, floor combination) already exists for this area');
    }

    // Add the new sub-location using $addToSet to prevent duplicates
    const updatedArea = await AreaRouteModel.findByIdAndUpdate(
      areaId,
      {
        $addToSet: {
          sub_locations: newSubLocation
        }
      },
      { new: true, runValidators: true }
    );

    return updatedArea;
  }
  /**
     * Get dashboard data with filters
     */
  static async getDashboardData(params: DashboardFilterParams): Promise<DashboardData> {
    const {
      status = 'all',
      state,
      district,
      campus,
      tower,
      floor,
      search,
      page = 1,
      limit = 10,
      sortBy = 'createdAt',
      sortOrder = 'desc'
    } = params;

    // Build filter
    const filter = this.buildDashboardFilter({
      status, state, district, campus, tower, floor, search
    });

    // Calculate pagination
    const pageNum = Math.max(1, page);
    const limitNum = Math.max(1, Math.min(limit, 100));
    const skip = (pageNum - 1) * limitNum;

    // Build sort
    const sort = this.buildSort(sortBy, sortOrder);

    // Execute queries in parallel
    const [areas, totalItems, statistics, filterOptions] = await Promise.all([
      // Get filtered areas
      AreaRouteModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limitNum),

      // Get total count
      AreaRouteModel.countDocuments(filter),

      // Get statistics
      this.getDashboardStatistics(),

      // Get filter options
      this.getFilterOptions()
    ]);

    const totalPages = Math.ceil(totalItems / limitNum);

    return {
      areas,
      statistics,
      filterOptions,
      pagination: {
        currentPage: pageNum,
        totalPages,
        totalItems,
        itemsPerPage: limitNum
      }
    };
  }

  /**
   * Build dashboard filter
   */
  private static buildDashboardFilter(params: {
    status?: string;
    state?: string;
    district?: string;
    campus?: string;
    tower?: string;
    floor?: string;
    search?: string;
  }): any {
    const filter: any = {};

    // Status filter
    if (params.status && params.status !== 'all') {
      filter.status = params.status;
    }

    // Location filters
    if (params.state) {
      filter.state = { $regex: params.state, $options: 'i' };
    }

    if (params.district) {
      filter.district = { $regex: params.district, $options: 'i' };
    }

    // Sub-location filters
    if (params.campus || params.tower || params.floor) {
      filter['sub_locations'] = {
        $elemMatch: {
          ...(params.campus && { campus: { $regex: params.campus, $options: 'i' } }),
          ...(params.tower && { tower: { $regex: params.tower, $options: 'i' } }),
          ...(params.floor && { floor: { $regex: params.floor, $options: 'i' } })
        }
      };
    }

    // Search across multiple fields
    if (params.search) {
      filter.$or = [
        { area_name: { $regex: params.search, $options: 'i' } },
        { state: { $regex: params.search, $options: 'i' } },
        { district: { $regex: params.search, $options: 'i' } },
        { pincode: { $regex: params.search, $options: 'i' } },
        { area_description: { $regex: params.search, $options: 'i' } },
        { address: { $regex: params.search, $options: 'i' } },
        { 'sub_locations.campus': { $regex: params.search, $options: 'i' } },
        { 'sub_locations.tower': { $regex: params.search, $options: 'i' } },
        { 'sub_locations.floor': { $regex: params.search, $options: 'i' } }
      ];
    }

    return filter;
  }

  /**
   * Get dashboard statistics
   */
  private static async getDashboardStatistics(): Promise<{
    totalAreas: number;
    activeAreas: number;
    inactiveAreas: number;
    areasByState: Record<string, number>;
    areasByDistrict: Record<string, number>;
    areasByStatus: Record<string, number>;
    areasByCampus: Record<string, number>;
  }> {
    const [
      totalAreas,
      activeAreas,
      inactiveAreas,
      stateAggregation,
      districtAggregation,
      campusAggregation
    ] = await Promise.all([
      AreaRouteModel.countDocuments(),
      AreaRouteModel.countDocuments({ status: 'active' }),
      AreaRouteModel.countDocuments({ status: 'inactive' }),
      AreaRouteModel.aggregate([
        { $group: { _id: '$state', count: { $sum: 1 } } }
      ]),
      AreaRouteModel.aggregate([
        { $group: { _id: '$district', count: { $sum: 1 } } }
      ]),
      AreaRouteModel.aggregate([
        { $unwind: '$sub_locations' },
        { $group: { _id: '$sub_locations.campus', count: { $sum: 1 } } }
      ])
    ]);

    // Convert aggregations to objects
    const areasByState: Record<string, number> = {};
    const areasByDistrict: Record<string, number> = {};
    const areasByCampus: Record<string, number> = {};

    stateAggregation.forEach(item => {
      areasByState[item._id || 'Unknown'] = item.count;
    });

    districtAggregation.forEach(item => {
      areasByDistrict[item._id || 'Unknown'] = item.count;
    });

    campusAggregation.forEach(item => {
      areasByCampus[item._id || 'Unknown'] = item.count;
    });

    return {
      totalAreas,
      activeAreas,
      inactiveAreas,
      areasByState,
      areasByDistrict,
      areasByStatus: {
        active: activeAreas,
        inactive: inactiveAreas
      },
      areasByCampus
    };
  }

  /**
   * Get aggregated table data for dashboard
   */
  static async getDashboardTableData(params: DashboardFilterParams): Promise<{
    data: any[];
    total: number;
  }> {
    const filter = this.buildDashboardFilter(params);

    const page = params.page || 1;
    const limit = params.limit || 10;
    const skip = (page - 1) * limit;

    const sort = this.buildSort(params.sortBy || 'area_name', params.sortOrder || 'asc');

    const [areas, total] = await Promise.all([
      AreaRouteModel.find(filter)
        .sort(sort)
        .skip(skip)
        .limit(limit),
      AreaRouteModel.countDocuments(filter)
    ]);

    // Transform data for table display
    const tableData = areas.map(area => ({
      id: area._id,
      area_name: area.area_name,
      state: area.state,
      district: area.district,
      pincode: area.pincode,
      status: area.status,
      sub_locations_count: area.sub_locations?.length || 0,
      total_machines: area.sub_locations?.reduce(
        (sum, sub) => sum + (sub.select_machine?.length || 0), 0
      ) || 0,
      campuses: [...new Set(area.sub_locations?.map(s => s.campus) || [])].join(', ')
    }));

    return {
      data: tableData,
      total
    };
  }

}