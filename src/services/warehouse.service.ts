import mongoose from 'mongoose';
// services/warehouse.service.ts
import { 
  RaisePurchaseOrder,
  DispatchOrder,
  QCTemplate,
  ReturnOrder,
  Inventory,
  Expense, 
  FieldAgent,
} from '../models/Warehouse.model';
import { Types } from 'mongoose';
import { IDispatchOrder, IExpense, IRaisePurchaseOrder, IInventory, IQCTemplate, IReturnOrder, IFieldAgent } from '../models/Warehouse.model';

// Interfaces
export interface InventoryStats {
  totalItems: number;
  activeItems: number;
  archivedItems: number;
  lowStockItems: number;
  expiredItems: number;
  nearExpiryItems: number;
  totalStockValue: number;
  statusBreakdown: { [key: string]: number };
}

export interface InventoryDashboardFilters {
  status?: string;
  sku?: string;
  batchId?: string;
  productName?: string;
  expiryStatus?: 'expiring_soon' | 'expired' | 'not_expired' | 'no_expiry';
  ageRange?: '0-30' | '31-60' | '61-90' | '90+';
  quantityRange?: 'low' | 'medium' | 'high' | 'out_of_stock';
  archived?: boolean;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface InventoryDashboardResponse {
  inventory: IInventory[];
  total: number;
  page: number;
  totalPages: number;
  filters: InventoryDashboardFilters;
}

export interface DashboardData {
  kpis: {
    inbound: number;
    outbound: number;
    pendingQC: number;
    todayDispatches: number;
  };
  alerts: {
    type: 'qc_failed' | 'low_stock';
    message: string;
    count: number;
  }[];
  recentActivities: any[];
  pendingVsRefill: {
    days: string[];
    pendingPercentages: number[];
    refillPercentages: number[];
  };
  filters: {
    categories: string[];
    partners: string[];
  };
  warehouseInfo: {
    name: string;
    pendingBatches: number;
  };
}

export interface RaisePurchaseOrderData {
  po_number?: string;
  vendor: Types.ObjectId;
  po_raised_date: Date;
  po_status: 'pending' | 'approved' | 'draft';
  vendor_id: string;
  vendor_address: string;
  vendor_contact: string;
  vendor_email: string;
  vendor_phone: string;
  gst_number: string;
  remarks?: string;
  warehouse?: Types.ObjectId;
}

export interface DispatchData {
  vendor: Types.ObjectId;
  destination: string;
  products: {
    sku: string;
    productName: string;
    quantity: number;
    batchId: string;
    unitPrice?: number;
  }[];
  assignedAgent: Types.ObjectId;
  route: string;
  notes?: string;
  estimatedDelivery?: Date;
}

export interface QCTemplateData {
  title: string;
  sku: string;
  parameters: {
    name: string;
    value: string;
  }[];
}

export interface ReturnOrderData {
  status: string;
  batchId: string;
  sku: string;
  productName: string;
  vendor: Types.ObjectId;
  reason: string;
  quantity: number;
  returnType: 'damaged' | 'expired' | 'wrong_item' | 'overstock' | 'other';
  images?: string[];
}

export interface InventoryUpsertData {
  sku: string;
  productName: string;
  batchId: string;
  warehouse: Types.ObjectId;
  quantity: number;
  location: {
    zone: string;
    aisle: string;
    rack: string;
    bin: string;
  };
  createdBy: Types.ObjectId;
}

export interface ReportFilters {
  reportType: 'inventory_summary' | 'purchase_orders' | 'inventory_turnover' | 'qc_summary' | 'efficiency' | 'stock_ageing';
  dateRange?: {
    startDate: Date;
    endDate: Date;
  };
  warehouse?: string;
  category?: string;
  vendor?: string;
  status?: string;
  sku?: string;
}

export interface InventorySummaryReport {
  summary: {
    totalSKUs: number;
    stockOutSKUs: number;
    totalPOs: number;
    pendingPOs: number;
    pendingRefills: number;
    completedRefills: number;
    totalStockValue: number;
    lowStockItems: number;
    nearExpirySKUs: number;
    stockAccuracy: number;
  };
  inventoryDetails: IInventory[];
  generatedOn: Date;
  filters: ReportFilters;
}

export interface PurchaseOrderReport {
  summary: {
    totalPOs: number;
    pendingPOs: number;
    approvedPOs: number;
    rejectedPOs: number;
    totalPOValue: number;
    averagePOValue: number;
  };
  purchaseOrders: any[];
  generatedOn: Date;
  filters: ReportFilters;
}

class WarehouseService {
  // ==================== SCREEN 1: DASHBOARD ====================
  async getDashboard(warehouseId?: string, filters?: any): Promise<DashboardData> {
    const dateFilter = this.getDateFilter(filters?.dateRange);
    
    const baseQuery: any = {};
    
    if (warehouseId && Types.ObjectId.isValid(warehouseId)) {
      baseQuery.warehouse = new Types.ObjectId(warehouseId);
    }

    // Apply category filter if provided
    if (filters?.category) {
      baseQuery.productName = { $regex: filters.category, $options: 'i' };
    }

    const [inbound, outbound, pendingQC, todayDispatches] = await Promise.all([
      // Use RaisePurchaseOrder for inbound count
      RaisePurchaseOrder.countDocuments({
        ...baseQuery,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }),
      
      // Use DispatchOrder for outbound count
      DispatchOrder.countDocuments({
        ...baseQuery,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }),
      
      // Use RaisePurchaseOrder with draft status for pending QC
      RaisePurchaseOrder.countDocuments({
        ...baseQuery,
        po_status: 'draft'
      }),
      
      // Today's dispatches
      DispatchOrder.countDocuments({
        ...baseQuery,
        createdAt: {
          $gte: new Date(new Date().setHours(0, 0, 0, 0)),
          $lte: new Date(new Date().setHours(23, 59, 59, 999))
        }
      })
    ]);

    const alerts = await this.generateAlerts(warehouseId);
    const recentActivities = await this.getRecentActivities(warehouseId);
    const pendingVsRefill = await this.generatePendingVsRefillData(warehouseId, filters);
    const filterOptions = await this.getFilterOptions();
    const warehouseInfo = await this.getWarehouseInfo(warehouseId);

    return {
      kpis: { inbound, outbound, pendingQC, todayDispatches },
      alerts,
      recentActivities,
      pendingVsRefill,
      filters: filterOptions,
      warehouseInfo
    };
  }

  private async generatePendingVsRefillData(_warehouseId?: string, _filters?: any): Promise<{
    days: string[];
    pendingPercentages: number[];
    refillPercentages: number[];
  }> {
    // Sample data
    const days = ['MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT', 'SUN'];
    const pendingPercentages = [100, 90, 60, 40, 20, 50, 70];
    const refillPercentages = [80, 70, 90, 60, 40, 85, 95];
    
    return { days, pendingPercentages, refillPercentages };
  }

  private async getFilterOptions(): Promise<{
    categories: string[];
    partners: string[];
  }> {
    try {
      // Get unique categories from Inventory
      const categories = await Inventory.aggregate([
        { 
          $match: { 
            productName: { $exists: true, $ne: '' } 
          } 
        },
        {
          $group: {
            _id: { $toLower: "$productName" }
          }
        },
        {
          $project: {
            name: "$_id",
            _id: 0
          }
        },
        { $limit: 10 }
      ]);

      const categoryNames = categories.map((cat: any) => 
        cat.name.charAt(0).toUpperCase() + cat.name.slice(1)
      ).filter((name: string) => name.length > 0);

      // Get partners from RaisePurchaseOrder vendors
      const partners = await RaisePurchaseOrder.aggregate([
        {
          $lookup: {
            from: 'vendorcreates',
            localField: 'vendor',
            foreignField: '_id',
            as: 'vendorData'
          }
        },
        {
          $unwind: {
            path: '$vendorData',
            preserveNullAndEmptyArrays: true
          }
        },
        {
          $group: {
            _id: '$vendor',
            vendorName: { $first: '$vendorData.vendor_name' }
          }
        },
        {
          $match: {
            vendorName: { $exists: true, $ne: null }
          }
        },
        {
          $project: {
            name: '$vendorName',
            _id: 0
          }
        },
        { $limit: 10 }
      ]);

      const partnerNames = partners.map((p: any) => p.name).filter(Boolean);

      return {
        categories: categoryNames.length > 0 ? categoryNames : ['Snacks', 'Beverages', 'Perishable', 'Non-Perishable'],
        partners: partnerNames.length > 0 ? partnerNames : ['XYZ Warehouse', 'ABC Suppliers', 'Global Foods']
      };
    } catch (error) {
      console.error('Error getting filter options:', error);
      return {
        categories: ['Snacks', 'Beverages', 'Perishable', 'Non-Perishable'],
        partners: ['XYZ Warehouse', 'ABC Suppliers', 'Global Foods']
      };
    }
  }

  private async getWarehouseInfo(warehouseId?: string): Promise<{
    name: string;
    pendingBatches: number;
  }> {
    try {
      const pendingBatches = await RaisePurchaseOrder.countDocuments({
        ...(warehouseId && Types.ObjectId.isValid(warehouseId) && { 
          warehouse: new Types.ObjectId(warehouseId) 
        }),
        po_status: 'draft'
      });

      return {
        name: 'XYZ WAREHOUSE',
        pendingBatches
      };
    } catch (error) {
      console.error('Error getting warehouse info:', error);
      return {
        name: 'XYZ WAREHOUSE',
        pendingBatches: 3
      };
    }
  }

  private getDateFilter(dateRange?: any): any {
    if (!dateRange) return {};
    
    // Handle custom date string like "22-10-2025"
    if (typeof dateRange === 'string' && dateRange.includes('-')) {
      try {
        const parts = dateRange.split('-');
        const [dayStr, monthStr, yearStr] = parts;
        const day = Number(dayStr);
        const month = Number(monthStr);
        const year = Number(yearStr);

        if ([day, month, year].every(n => Number.isInteger(n) && !Number.isNaN(n))) {
          const customDate = new Date(year, month - 1, day);
          const startOfDay = new Date(customDate);
          startOfDay.setHours(0, 0, 0, 0);
          const endOfDay = new Date(customDate);
          endOfDay.setHours(23, 59, 59, 999);
          
          return { $gte: startOfDay, $lte: endOfDay };
        }
      } catch (error) {
        console.error('Error parsing custom date:', error);
        return {};
      }
    }
    
    const now = new Date();
    switch (dateRange) {
      case 'today':
        return {
          $gte: new Date(now.setHours(0, 0, 0, 0)),
          $lte: new Date(now.setHours(23, 59, 59, 999))
        };
      case 'this_week':
        const startOfWeek = new Date(now);
        startOfWeek.setDate(now.getDate() - now.getDay());
        startOfWeek.setHours(0, 0, 0, 0);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        endOfWeek.setHours(23, 59, 59, 999);
        return { $gte: startOfWeek, $lte: endOfWeek };
      case 'this_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        return { $gte: startOfMonth, $lte: endOfMonth };
      default:
        return {};
    }
  }

  // ==================== SCREEN 2: INBOUND LOGISTICS ====================
  // In your warehouse.service.ts - update the createPurchaseOrder method

async createPurchaseOrder(data: RaisePurchaseOrderData, createdBy: Types.ObjectId): Promise<IRaisePurchaseOrder> {
  try {
    // Validate vendor exists
    const vendor = await mongoose.model('VendorCreate').findById(data.vendor);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Remove po_number from data to prevent manual assignment
    const { po_number, ...purchaseOrderData } = data;

    // Create purchase order (po_number will be auto-generated)
    const purchaseOrder = await RaisePurchaseOrder.create({
      ...purchaseOrderData,
      po_raised_date: data.po_raised_date || new Date(),
      po_status: data.po_status || 'draft',
      createdBy
    });

    // Populate vendor information
    const populatedPO = await RaisePurchaseOrder.findById(purchaseOrder._id)
      .populate({
        path: 'vendor',
        model: 'VendorCreate',
        select: 'vendor_name vendor_billing_name vendor_email vendor_phone vendor_category gst_number verification_status vendor_address vendor_contact vendor_id'
      });

    if (!populatedPO) {
      throw new Error('Failed to create purchase order');
    }

    return populatedPO;
  } catch (error) {
    throw new Error(`Failed to create purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

  async getPurchaseOrders(warehouseId?: string, filters?: any): Promise<IRaisePurchaseOrder[]> {
    let query: any = {};

    
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }

    if (filters?.po_status) query.po_status = filters.po_status;
    if (filters?.po_number) query.po_number = { $regex: filters.po_number, $options: 'i' };
    if (filters?.vendor && Types.ObjectId.isValid(filters.vendor)) {
      query.vendor = new Types.ObjectId(filters.vendor);
    }

    return await RaisePurchaseOrder.find(query)
      .populate('vendor', 'vendor_name vendor_email vendor_contact')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
  }

  async getPurchaseOrderById(id: string): Promise<IRaisePurchaseOrder | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    return await RaisePurchaseOrder.findById(id)
      .populate('vendor', 'vendor_name vendor_email vendor_contact vendor_phone')
      .populate('createdBy', 'name email');
  }

  async updatePurchaseOrderStatus(
    id: string,
    po_status: 'draft' | 'approved' | 'pending',
    remarks?: string
  ): Promise<IRaisePurchaseOrder | null> {
    if (!Types.ObjectId.isValid(id)) return null;

    const updateData: any = { po_status };
    if (remarks) {
      updateData.remarks = remarks;
    }

    const updatedPO = await RaisePurchaseOrder.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    )
    .populate('warehouse', 'name code')
    .populate('vendor', 'vendor_name vendor_email')
    .populate('createdBy', 'name email');

    return updatedPO;
  }

  async upsertInventory(data: InventoryUpsertData): Promise<void> {
    const existingInventory = await Inventory.findOne({
      sku: data.sku,
      batchId: data.batchId,
      warehouse: data.warehouse
    });

    if (existingInventory) {
      await Inventory.findByIdAndUpdate(existingInventory._id, {
        $inc: { quantity: data.quantity },
        location: data.location,
        updatedAt: new Date()
      });
    } else {
      await Inventory.create({
        ...data,
        minStockLevel: 0,
        maxStockLevel: 1000,
        age: 0,
        status: 'active'
      });
    }
  }

  // ==================== SCREEN 3: OUTBOUND LOGISTICS ====================
  async createDispatch(data: DispatchData, createdBy: Types.ObjectId): Promise<IDispatchOrder> {
    await this.validateSkuStock(data.products);

    const latestDispatch = await DispatchOrder.findOne().sort({ createdAt: -1 });
    const nextNumber = latestDispatch ? parseInt(latestDispatch.dispatchId?.split('-')[1] || "0") + 1 : 1;
    const dispatchId = `DO-${String(nextNumber).padStart(4, '0')}`;

    const formattedProducts = data.products.map(p => ({
      sku: p.sku,
      quantity: p.quantity
    }));

    const dispatch = await DispatchOrder.create({
      dispatchId,
      destination: data.destination,
      products: formattedProducts,
      assignedAgent: data.assignedAgent,
      notes: data.notes,
      status: 'pending',
      createdBy
    });

    await this.reduceStockBySku(data.products);
    return dispatch;
  }

  async getDispatches(warehouseId?: string, filters?: any): Promise<IDispatchOrder[]> {
    let query: any = {};
    
    if (warehouseId && Types.ObjectId.isValid(warehouseId)) {
      query.warehouse = new Types.ObjectId(warehouseId);
    }
    
    if (filters?.status) {
      query.status = filters.status;
    }
    
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) query.createdAt.$gte = new Date(filters.startDate);
      if (filters.endDate) query.createdAt.$lte = new Date(filters.endDate);
    }
    
    return await DispatchOrder.find(query)
      .populate('assignedAgent', 'name email phone vehicleType')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
  }

  async updateDispatchStatus(dispatchId: string, status: string): Promise<IDispatchOrder> {
    const validStatuses = ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    if (!Types.ObjectId.isValid(dispatchId)) {
      throw new Error('Invalid dispatch ID');
    }
    
    const updateData: any = { status };
    if (status === 'delivered') {
      updateData.deliveredAt = new Date();
    }
    
    const dispatch = await DispatchOrder.findByIdAndUpdate(
      dispatchId,
      updateData,
      { new: true }
    )
    .populate('assignedAgent createdBy');
    
    if (!dispatch) {
      throw new Error('Dispatch order not found');
    }
    
    return dispatch;
  }

  async getDispatchById(dispatchId: string): Promise<IDispatchOrder | null> {
    if (!Types.ObjectId.isValid(dispatchId)) return null;
    return await DispatchOrder.findById(dispatchId)
      .populate('assignedAgent', 'name email phone vehicleType licensePlate')
      .populate('createdBy', 'name email');
  }

  // ==================== QC TEMPLATES ====================
  async createQCTemplate(data: QCTemplateData, createdBy: Types.ObjectId): Promise<IQCTemplate> {
    return await QCTemplate.create({
      title: data.title,
      sku: data.sku,
      parameters: data.parameters,
      isActive: true,
      createdBy
    });
  }

  async getQCTemplates(sku?: string): Promise<IQCTemplate[]> {
    const query: any = { isActive: true };
    if (sku) query.sku = sku;

    return await QCTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort({ title: 1 });
  }

  async updateQCTemplate(templateId: string, updateData: Partial<QCTemplateData>): Promise<IQCTemplate | null> {
    if (!Types.ObjectId.isValid(templateId)) return null;

    return await QCTemplate.findByIdAndUpdate(
      templateId,
      updateData,
      { new: true }
    ).populate('createdBy', 'name email');
  }

  async deleteQCTemplate(templateId: string): Promise<void> {
    if (!Types.ObjectId.isValid(templateId)) return;

    await QCTemplate.findByIdAndUpdate(
      templateId,
      { isActive: false }
    );
  }

  // ==================== RETURN MANAGEMENT ====================
  async createReturnOrder(data: ReturnOrderData, createdBy: Types.ObjectId): Promise<IReturnOrder> {
    const inventory = await Inventory.findOne({
      batchId: data.batchId,
      isArchived: false
    });
    
    if (!inventory) {
      throw new Error(`Batch ${data.batchId} not found in inventory`);
    }

    const quantity = data.quantity || Math.min(inventory.quantity, 1);
    
    if (inventory.quantity < quantity) {
      throw new Error(`Insufficient quantity in batch. Available: ${inventory.quantity}, Requested: ${quantity}`);
    }

    const returnType = this.determineReturnType(data.reason);

    const returnOrderData = {
      batchId: data.batchId,
      vendor: data.vendor,
      reason: data.reason,
      status: data.status || 'pending',
      quantity: quantity,
      sku: inventory.sku,
      productName: inventory.productName,
      returnType: returnType,
      createdBy
    };

    return await ReturnOrder.create(returnOrderData);
  }

  private determineReturnType(reason: string): 'damaged' | 'expired' | 'wrong_item' | 'overstock' | 'other' {
    const lowerReason = reason.toLowerCase();
    
    if (lowerReason.includes('damage') || lowerReason.includes('broken') || lowerReason.includes('defective')) {
      return 'damaged';
    }
    if (lowerReason.includes('expir') || lowerReason.includes('date') || lowerReason.includes('spoiled')) {
      return 'expired';
    }
    if (lowerReason.includes('wrong') || lowerReason.includes('incorrect') || lowerReason.includes('mistake')) {
      return 'wrong_item';
    }
    if (lowerReason.includes('overstock') || lowerReason.includes('excess') || lowerReason.includes('surplus')) {
      return 'overstock';
    }
    
    return 'other';
  }

  async getReturnQueue(warehouseId?: string, filters?: any): Promise<IReturnOrder[]> {
    let query: any = {};
    
    if (warehouseId && Types.ObjectId.isValid(warehouseId)) {
      query.warehouse = new Types.ObjectId(warehouseId);
    }
    
    if (filters?.status) {
      query.status = filters.status;
    }
    
    if (filters?.returnType) {
      query.returnType = filters.returnType;
    }

    return await ReturnOrder.find(query)
      .populate('vendor', 'vendor_name vendor_email vendor_contact')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
  }

  async approveReturn(returnId: string): Promise<IReturnOrder> {
    if (!Types.ObjectId.isValid(returnId)) {
      throw new Error('Invalid return ID');
    }
    
    const returnOrder = await ReturnOrder.findById(returnId);
    if (!returnOrder) {
      throw new Error('Return order not found');
    }

    await Inventory.findOneAndUpdate(
      {
        batchId: returnOrder.batchId,
        sku: (returnOrder as any).sku
      },
      {
        $inc: { quantity: -returnOrder.quantity }
      }
    );

    const updated = await ReturnOrder.findByIdAndUpdate(
      returnId,
      { status: 'approved' },
      { new: true }
    ).populate('vendor', 'vendor_name vendor_email');

    if (!updated) {
      throw new Error('Return order not found');
    }

    return updated;
  }

  async rejectReturn(returnId: string): Promise<IReturnOrder> {
    if (!Types.ObjectId.isValid(returnId)) {
      throw new Error('Invalid return ID');
    }
    
    const updated = await ReturnOrder.findByIdAndUpdate(
      returnId,
      { status: 'rejected' },
      { new: true }
    ).populate('vendor', 'vendor_name vendor_email');
    
    if (!updated) {
      throw new Error('Return order not found');
    }
    
    return updated;
  }

  // ==================== FIELD AGENT MANAGEMENT ====================
  async getFieldAgents(isActive?: boolean): Promise<IFieldAgent[]> {
    let query: any = {};
    
    if (isActive !== undefined) {
      query.isActive = isActive;
    }
    
    return await FieldAgent.find(query)
      .populate('createdBy', 'name')
      .sort({ name: 1 });
  }

  async createFieldAgent(data: {
    name: string;
    assignedRoutes: string[];
  }, createdBy: Types.ObjectId): Promise<IFieldAgent> {
    return await FieldAgent.create({
      ...data,
      isActive: true,
      createdBy
    });
  }

  // ==================== INVENTORY DASHBOARD METHODS ====================
  async getInventoryDashboard(
    warehouseId: string, 
    filters: InventoryDashboardFilters = {}, 
    page: number = 1, 
    limit: number = 50
  ): Promise<InventoryDashboardResponse> {
    let query: any = { warehouse: new Types.ObjectId(warehouseId) };
    
    if (filters.archived !== undefined) {
      query.isArchived = filters.archived;
    } else {
      query.isArchived = false;
    }

    if (filters.status && filters.status !== 'all') {
      query.status = filters.status;
    }

    if (filters.sku) {
      query.sku = { $regex: filters.sku, $options: 'i' };
    }

    if (filters.batchId) {
      query.batchId = { $regex: filters.batchId, $options: 'i' };
    }

    if (filters.productName) {
      query.productName = { $regex: filters.productName, $options: 'i' };
    }

    if (filters.expiryStatus) {
      const today = new Date();
      switch (filters.expiryStatus) {
        case 'expiring_soon':
          const next30Days = new Date(today);
          next30Days.setDate(today.getDate() + 30);
          query.expiryDate = { $gte: today, $lte: next30Days };
          break;
        case 'expired':
          query.expiryDate = { $lt: today };
          break;
        case 'not_expired':
          query.expiryDate = { $gte: today };
          break;
        case 'no_expiry':
          query.expiryDate = { $exists: false };
          break;
      }
    }

    if (filters.ageRange) {
      query.age = this.getAgeFilter(filters.ageRange);
    }

    if (filters.quantityRange) {
      switch (filters.quantityRange) {
        case 'low':
          query.quantity = { $lte: 10 };
          break;
        case 'medium':
          query.quantity = { $gt: 10, $lte: 50 };
          break;
        case 'high':
          query.quantity = { $gt: 50 };
          break;
        case 'out_of_stock':
          query.quantity = { $lte: 0 };
          break;
      }
    }

    const skip = (page - 1) * limit;
    const total = await Inventory.countDocuments(query);
    const sortField = filters.sortBy || 'updatedAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

    const inventory = await Inventory.find(query)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .sort({ [sortField]: sortOrder })
      .skip(skip)
      .limit(limit);

    return {
      inventory,
      total,
      page,
      totalPages: Math.ceil(total / limit),
      filters
    };
  }

  async getInventoryById(inventoryId: string): Promise<IInventory | null> {
    if (!Types.ObjectId.isValid(inventoryId)) {
      throw new Error('Invalid inventory ID');
    }
    
    return await Inventory.findById(inventoryId)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email');
  }

  async updateInventoryItem(
    inventoryId: string, 
    updateData: {
      sku?: string;
      productName?: string;
      batchId?: string;
      quantity?: number;
      minStockLevel?: number;
      maxStockLevel?: number;
      expiryDate?: Date | string;
      location?: {
        zone: string;
        aisle: string;
        rack: string;
        bin: string;
      };
    }
  ): Promise<IInventory> {
    if (!Types.ObjectId.isValid(inventoryId)) {
      throw new Error('Invalid inventory ID');
    }

    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      throw new Error('Inventory item not found');
    }

    const allowedUpdates = [
      'sku', 'productName', 'batchId', 'quantity', 
      'minStockLevel', 'maxStockLevel', 'expiryDate', 'location'
    ];
    
    const updates: any = {};
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = (updateData as any)[key];
      }
    });

    if (updates.expiryDate) {
      updates.expiryDate = new Date(updates.expiryDate);
    }

    const now = new Date();
    const createdAt = inventory.createdAt;
    const ageInDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
    updates.age = ageInDays;

    const finalQuantity = updates.quantity !== undefined ? updates.quantity : inventory.quantity;
    const finalExpiryDate = updates.expiryDate !== undefined ? updates.expiryDate : inventory.expiryDate;
    const finalMinStock = updates.minStockLevel !== undefined ? updates.minStockLevel : inventory.minStockLevel;
    const finalMaxStock = updates.maxStockLevel !== undefined ? updates.maxStockLevel : inventory.maxStockLevel;

    updates.status = this.calculateInventoryStatus({
      quantity: finalQuantity,
      minStockLevel: finalMinStock,
      maxStockLevel: finalMaxStock,
      expiryDate: finalExpiryDate
    });

    const updated = await Inventory.findByIdAndUpdate(
      inventoryId,
      updates,
      { new: true, runValidators: true }
    ).populate('warehouse', 'name code')
     .populate('createdBy', 'name email');

    if (!updated) {
      throw new Error('Inventory item not found after update');
    }

    return updated;
  }

  async archiveInventoryItem(inventoryId: string): Promise<IInventory> {
    if (!Types.ObjectId.isValid(inventoryId)) {
      throw new Error('Invalid inventory ID');
    }

    const updated = await Inventory.findByIdAndUpdate(
      inventoryId,
      { 
        isArchived: true,
        status: 'archived',
        archivedAt: new Date()
      },
      { new: true }
    ).populate('warehouse', 'name code')
     .populate('createdBy', 'name email');

    if (!updated) {
      throw new Error('Inventory item not found');
    }

    return updated;
  }

  async unarchiveInventoryItem(inventoryId: string): Promise<IInventory> {
    if (!Types.ObjectId.isValid(inventoryId)) {
      throw new Error('Invalid inventory ID');
    }

    const inventory = await Inventory.findById(inventoryId);
    if (!inventory) {
      throw new Error('Inventory item not found');
    }

    const status = this.calculateInventoryStatus({
      quantity: inventory.quantity,
      minStockLevel: inventory.minStockLevel,
      maxStockLevel: inventory.maxStockLevel,
      expiryDate: inventory.expiryDate
    });

    const updated = await Inventory.findByIdAndUpdate(
      inventoryId,
      { 
        isArchived: false,
        status: status,
        archivedAt: null
      },
      { new: true }
    ).populate('warehouse', 'name code')
     .populate('createdBy', 'name email');

    if (!updated) {
      throw new Error('Inventory item not found');
    }

    return updated;
  }

  async getInventoryStats(warehouseId: string): Promise<InventoryStats> {
    if (!Types.ObjectId.isValid(warehouseId)) {
      throw new Error('Invalid warehouse ID');
    }

    const warehouseObjectId = new Types.ObjectId(warehouseId);
    
    const [
      totalItems,
      activeItems,
      archivedItems,
      lowStockItems,
      expiredItems,
      nearExpiryItems,
      statusBreakdown,
      stockValueResult
    ] = await Promise.all([
      Inventory.countDocuments({ warehouse: warehouseObjectId }),
      Inventory.countDocuments({ warehouse: warehouseObjectId, isArchived: false }),
      Inventory.countDocuments({ warehouse: warehouseObjectId, isArchived: true }),
      Inventory.countDocuments({ warehouse: warehouseObjectId, status: 'low_stock', isArchived: false }),
      Inventory.countDocuments({ warehouse: warehouseObjectId, expiryDate: { $lt: new Date() }, isArchived: false }),
      Inventory.countDocuments({
        warehouse: warehouseObjectId,
        expiryDate: { $gte: new Date(), $lte: new Date(new Date().setDate(new Date().getDate() + 30)) },
        isArchived: false
      }),
      Inventory.aggregate([
        { $match: { warehouse: warehouseObjectId, isArchived: false } },
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]),
      Inventory.aggregate([
        { $match: { warehouse: warehouseObjectId, isArchived: false } },
        { $group: { _id: null, totalValue: { $sum: { $multiply: ['$quantity', 100] } } } }
      ])
    ]);

    const statusBreakdownObj: { [key: string]: number } = {};
    statusBreakdown.forEach((item: any) => {
      statusBreakdownObj[item._id] = item.count;
    });

    const totalStockValue = stockValueResult.length > 0 ? stockValueResult[0].totalValue : 0;

    return {
      totalItems,
      activeItems,
      archivedItems,
      lowStockItems,
      expiredItems,
      nearExpiryItems,
      totalStockValue,
      statusBreakdown: statusBreakdownObj
    };
  }

  async bulkArchiveInventory(inventoryIds: string[]): Promise<{ 
    success: boolean; 
    message: string;
    archivedCount: number;
    failedCount: number;
    failedIds: string[];
  }> {
    const validIds = inventoryIds.filter(id => Types.ObjectId.isValid(id));
    
    if (validIds.length === 0) {
      throw new Error('No valid inventory IDs provided');
    }

    const objectIds = validIds.map(id => new Types.ObjectId(id));
    
    const result = await Inventory.updateMany(
      { _id: { $in: objectIds }, isArchived: false },
      { $set: { isArchived: true, status: 'archived', archivedAt: new Date() } }
    );

    const archivedCount = result.modifiedCount;
    const failedCount = validIds.length - archivedCount;
    
    let failedIds: string[] = [];
    if (failedCount > 0) {
      const archivedItems = await Inventory.find({ _id: { $in: objectIds }, isArchived: true }).select('_id');
      const archivedItemIds = archivedItems.map(item => item._id.toString());
      failedIds = validIds.filter(id => !archivedItemIds.includes(id));
    }

    return {
      success: archivedCount > 0,
      message: `Successfully archived ${archivedCount} items. ${failedCount} items failed to archive.`,
      archivedCount,
      failedCount,
      failedIds
    };
  }

  async bulkUnarchiveInventory(inventoryIds: string[]): Promise<{ 
    success: boolean; 
    message: string;
    unarchivedCount: number;
    failedCount: number;
    failedIds: string[];
  }> {
    const validIds = inventoryIds.filter(id => Types.ObjectId.isValid(id));
    
    if (validIds.length === 0) {
      throw new Error('No valid inventory IDs provided');
    }

    const objectIds = validIds.map(id => new Types.ObjectId(id));
    const itemsToUnarchive = await Inventory.find({ _id: { $in: objectIds }, isArchived: true });

    const updatePromises = itemsToUnarchive.map(async (item) => {
      const status = this.calculateInventoryStatus({
        quantity: item.quantity,
        minStockLevel: item.minStockLevel,
        maxStockLevel: item.maxStockLevel,
        expiryDate: item.expiryDate
      });

      return Inventory.findByIdAndUpdate(
        item._id,
        { $set: { isArchived: false, status: status, archivedAt: null } }
      );
    });

    await Promise.all(updatePromises);

    const unarchivedCount = itemsToUnarchive.length;
    const failedCount = validIds.length - unarchivedCount;
    
    let failedIds: string[] = [];
    if (failedCount > 0) {
      const unarchivedItems = await Inventory.find({ _id: { $in: objectIds }, isArchived: false }).select('_id');
      const unarchivedItemIds = unarchivedItems.map(item => item._id.toString());
      failedIds = validIds.filter(id => !unarchivedItemIds.includes(id));
    }

    return {
      success: unarchivedCount > 0,
      message: `Successfully unarchived ${unarchivedCount} items. ${failedCount} items failed to unarchive.`,
      unarchivedCount,
      failedCount,
      failedIds
    };
  }

  async getArchivedInventory(
    warehouseId: string, 
    page: number = 1, 
    limit: number = 50
  ): Promise<{
    inventory: IInventory[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const query = { 
      warehouse: new Types.ObjectId(warehouseId),
      isArchived: true 
    };

    const skip = (page - 1) * limit;
    const total = await Inventory.countDocuments(query);

    const inventory = await Inventory.find(query)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .sort({ archivedAt: -1 })
      .skip(skip)
      .limit(limit);

    return {
      inventory,
      total,
      page,
      totalPages: Math.ceil(total / limit)
    };
  }

  // ==================== SCREEN 5: EXPENSE MANAGEMENT ====================
  async createExpense(data: {
    category: 'staffing' | 'supplies' | 'equipment' | 'transport';
    amount: number;
    vendor?: Types.ObjectId;
    date: Date;
    description?: string;
    warehouseId: Types.ObjectId;
    billUrl?: string;
  }, createdBy: Types.ObjectId): Promise<IExpense> {
    return await Expense.create({
      ...data,
      status: 'pending',
      paymentStatus: 'unpaid',
      createdBy
    });
  }

  async getExpenses(warehouseId?: string, filters?: any): Promise<IExpense[]> {
    let query: any = {};
    
    if (warehouseId && Types.ObjectId.isValid(warehouseId)) {
      query.warehouseId = new Types.ObjectId(warehouseId);
    }
    
    if (filters?.category) {
      query.category = filters.category;
    }
    
    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }
    
    if (filters?.startDate || filters?.endDate) {
      query.date = {};
      if (filters.startDate) query.date.$gte = new Date(filters.startDate);
      if (filters.endDate) query.date.$lte = new Date(filters.endDate);
    }

    if (filters?.month) {
      const [year, month] = filters.month.split('-');
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(Number(year), Number(month), 0);
      endDate.setHours(23, 59, 59, 999);
      query.date = { $gte: startDate, $lte: endDate };
    }
    
    return await Expense.find(query)
      .populate('vendor', 'vendor_name vendor_email vendor_contact')
      .populate('warehouseId', 'name code')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('assignedAgent', 'name email')
      .sort({ date: -1, createdAt: -1 });
  }

  async updateExpenseStatus(expenseId: string, status: string, approvedBy?: Types.ObjectId): Promise<IExpense> {
    const validStatuses = ['approved', 'pending', 'rejected'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    const updateData: any = { status };
    
    if (status === 'approved' && approvedBy) {
      updateData.approvedBy = approvedBy;
      updateData.approvedAt = new Date();
    } else if (status === 'pending') {
      updateData.approvedBy = null;
      updateData.approvedAt = null;
    }
    
    const expense = await Expense.findByIdAndUpdate(
      expenseId,
      updateData,
      { new: true }
    )
    .populate('vendor warehouseId createdBy approvedBy');
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    return expense;
  }

  async updateExpensePaymentStatus(expenseId: string, paymentStatus: string): Promise<IExpense> {
    const validPaymentStatuses = ['paid', 'unpaid', 'partially_paid'];
    
    if (!validPaymentStatuses.includes(paymentStatus)) {
      throw new Error(`Invalid payment status. Must be one of: ${validPaymentStatuses.join(', ')}`);
    }
    
    const expense = await Expense.findByIdAndUpdate(
      expenseId,
      { paymentStatus },
      { new: true }
    )
    .populate('vendor warehouseId createdBy approvedBy');
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    return expense;
  }

  async updateExpense(
    expenseId: string,
    updateData: {
      category?: 'staffing' | 'supplies' | 'equipment' | 'transport';
      amount?: number;
      status?: 'approved' | 'pending';
      date?: Date;
    }
  ): Promise<IExpense> {
    const allowedUpdates = ['category', 'amount', 'date', 'status'];
    const updates: any = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = (updateData as any)[key];
      }
    });

    if (updates.amount !== undefined || updates.category !== undefined || updates.date !== undefined) {
      updates.status = 'pending';
      updates.approvedBy = null;
      updates.approvedAt = null;
    }

    const expense = await Expense.findByIdAndUpdate(
      expenseId,
      updates,
      { new: true, runValidators: true }
    )
    .populate('vendor createdBy approvedBy warehouseId');

    if (!expense) {
      throw new Error('Expense not found');
    }

    return expense;
  }

  async deleteExpense(expenseId: string): Promise<void> {
    if (!Types.ObjectId.isValid(expenseId)) {
      throw new Error('Invalid expense ID');
    }
    
    const result = await Expense.findByIdAndDelete(expenseId);
    if (!result) {
      throw new Error('Expense not found');
    }
  }

  async getExpenseById(expenseId: string): Promise<IExpense | null> {
    if (!Types.ObjectId.isValid(expenseId)) return null;
    
    return await Expense.findById(expenseId)
      .populate('vendor', 'vendor_name vendor_email vendor_contact vendor_phone')
      .populate('warehouseId', 'name code location')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email');
  }

  async getExpenseSummary(warehouseId: string, filters?: any): Promise<{
    total: number;
    approved: number;
    pending: number;
    rejected: number;
    byCategory: { [key: string]: number };
    byMonth: { [key: string]: number };
    paymentSummary: {
      paid: number;
      unpaid: number;
      partially_paid: number;
    };
  }> {
    const matchStage: any = { warehouseId: new Types.ObjectId(warehouseId) };
    
    if (filters?.dateRange) {
      matchStage.date = this.getDateFilter(filters.dateRange);
    }

    if (filters?.month) {
      const [year, month] = filters.month.split('-');
      const startDate = new Date(Number(year), Number(month) - 1, 1);
      startDate.setHours(0, 0, 0, 0);
      const endDate = new Date(Number(year), Number(month), 0);
      endDate.setHours(23, 59, 59, 999);
      matchStage.date = { $gte: startDate, $lte: endDate };
    }

    const summary = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          approved: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] } },
          pending: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
          rejected: { $sum: { $cond: [{ $eq: ['$status', 'rejected'] }, '$amount', 0] } },
          byCategory: { $push: { category: '$category', amount: '$amount' } },
          byMonth: { $push: { month: { $dateToString: { format: "%Y-%m", date: "$date" } }, amount: '$amount' } },
          paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'paid'] }, '$amount', 0] } },
          unpaid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'unpaid'] }, '$amount', 0] } },
          partially_paid: { $sum: { $cond: [{ $eq: ['$paymentStatus', 'partially_paid'] }, '$amount', 0] } }
        }
      }
    ]);

    const result = summary[0] || { 
      total: 0, approved: 0, pending: 0, rejected: 0,
      byCategory: [], byMonth: [], paid: 0, unpaid: 0, partially_paid: 0
    };
    
    const byCategory: { [key: string]: number } = {};
    if (result.byCategory) {
      result.byCategory.forEach((item: any) => {
        byCategory[item.category] = (byCategory[item.category] || 0) + item.amount;
      });
    }

    const byMonth: { [key: string]: number } = {};
    if (result.byMonth) {
      result.byMonth.forEach((item: any) => {
        byMonth[item.month] = (byMonth[item.month] || 0) + item.amount;
      });
    }

    return {
      total: result.total,
      approved: result.approved,
      pending: result.pending,
      rejected: result.rejected,
      byCategory,
      byMonth,
      paymentSummary: {
        paid: result.paid,
        unpaid: result.unpaid,
        partially_paid: result.partially_paid
      }
    };
  }

  async getMonthlyExpenseTrend(warehouseId: string, months: number = 12): Promise<any[]> {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);

    return await Expense.aggregate([
      {
        $match: {
          warehouseId: new Types.ObjectId(warehouseId),
          date: { $gte: startDate, $lte: endDate }
        }
      },
      {
        $group: {
          _id: { year: { $year: '$date' }, month: { $month: '$date' } },
          totalAmount: { $sum: '$amount' },
          approvedAmount: { $sum: { $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0] } },
          pendingAmount: { $sum: { $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0] } },
          expenseCount: { $sum: 1 }
        }
      },
      {
        $project: {
          _id: 0,
          period: {
            $concat: [
              { $toString: '$_id.year' },
              '-',
              { $toString: { $cond: [{ $lt: ['$_id.month', 10] }, { $concat: ['0', { $toString: '$_id.month' }] }, { $toString: '$_id.month' }] } }
            ]
          },
          totalAmount: 1,
          approvedAmount: 1,
          pendingAmount: 1,
          expenseCount: 1
        }
      },
      { $sort: { period: 1 } }
    ]);
  }

  // ==================== SCREEN 6: REPORTS & ANALYTICS ====================
  async generateReport(type: string, filters: any): Promise<any> {
    switch (type) {
      case 'inventory_summary':
        return await this.generateInventorySummaryReport(filters);
      case 'purchase_orders':
        return await this.generatePurchaseOrderReport(filters);
      case 'inventory_turnover':
        return await this.generateInventoryTurnoverReport(filters);
      case 'qc_summary':
        return await this.generateQCSummaryReport(filters);
      case 'efficiency':
        return await this.generateEfficiencyReport(filters);
      case 'stock_ageing':
        return await this.getStockAgeingReport(filters.warehouse);
      default:
        throw new Error('Invalid report type');
    }
  }

  getStockAgeingReport(_warehouse: any): any {
    throw new Error('Method not implemented.');
  }

  private async generateInventorySummaryReport(filters: any): Promise<InventorySummaryReport> {
    const warehouseId = filters.warehouse;
    if (!warehouseId || !Types.ObjectId.isValid(warehouseId)) {
      throw new Error('Valid warehouse ID is required');
    }

    const dateFilter = this.getDateFilter(filters.dateRange);
    
    let inventoryQuery: any = { 
      warehouse: new Types.ObjectId(warehouseId),
      isArchived: false 
    };

    if (filters.category) {
      inventoryQuery.productName = { $regex: filters.category, $options: 'i' };
    }

    if (filters.status) {
      inventoryQuery.status = filters.status;
    }

    const inventoryData = await Inventory.find(inventoryQuery)
      .populate('warehouse', 'name code');

    const totalSKUs = await Inventory.distinct('sku', { 
      warehouse: new Types.ObjectId(warehouseId),
      isArchived: false 
    }).then(skus => skus.length);

    const stockOutSKUs = await Inventory.countDocuments({
      warehouse: new Types.ObjectId(warehouseId),
      status: 'low_stock',
      isArchived: false
    });

    const poQuery: any = { warehouse: new Types.ObjectId(warehouseId) };
    if (Object.keys(dateFilter).length > 0) {
      poQuery.createdAt = dateFilter;
    }

    if (filters.vendor) {
      poQuery.vendor = new Types.ObjectId(filters.vendor);
    }

    const totalPOs = await RaisePurchaseOrder.countDocuments(poQuery);
    const pendingPOs = await RaisePurchaseOrder.countDocuments({
      ...poQuery,
      po_status: 'draft'
    });

    const totalStockValue = inventoryData.reduce((sum, item) => {
      return sum + (item.quantity * 100);
    }, 0);

    const lowStockItems = inventoryData.filter(item => 
      item.status === 'low_stock'
    ).length;

    const today = new Date();
    const next30Days = new Date();
    next30Days.setDate(today.getDate() + 30);

    const nearExpirySKUs = inventoryData.filter(item => 
      item.expiryDate && 
      item.expiryDate <= next30Days && 
      item.expiryDate >= today
    ).length;

    const stockAccuracy = 89;
    const { pendingRefills, completedRefills } = await this.getRefillMetrics(warehouseId);

    return {
      summary: {
        totalSKUs,
        stockOutSKUs,
        totalPOs,
        pendingPOs,
        pendingRefills,
        completedRefills,
        totalStockValue,
        lowStockItems,
        nearExpirySKUs,
        stockAccuracy
      },
      inventoryDetails: inventoryData,
      generatedOn: new Date(),
      filters: filters as ReportFilters
    };
  }

  private async generatePurchaseOrderReport(filters: any): Promise<PurchaseOrderReport> {
    const warehouseId = filters.warehouse;
    if (!warehouseId || !Types.ObjectId.isValid(warehouseId)) {
      throw new Error('Valid warehouse ID is required');
    }

    const dateFilter = this.getDateFilter(filters.dateRange);
    
    let poQuery: any = { warehouse: new Types.ObjectId(warehouseId) };
    
    if (Object.keys(dateFilter).length > 0) {
      poQuery.createdAt = dateFilter;
    }

    if (filters.vendor) {
      poQuery.vendor = new Types.ObjectId(filters.vendor);
    }

    if (filters.po_status) {
      poQuery.po_status = filters.po_status;
    }

    const purchaseOrders = await RaisePurchaseOrder.find(poQuery)
      .populate('vendor', 'vendor_name vendor_email vendor_contact')
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });

    const totalPOs = purchaseOrders.length;
    const pendingPOs = purchaseOrders.filter(po => po.po_status === 'draft').length;
    const approvedPOs = purchaseOrders.filter(po => po.po_status === 'approved').length;
    const rejectedPOs = purchaseOrders.filter(po => po.po_status === 'pending').length;
    
    const totalPOValue = purchaseOrders.reduce((sum, po) => sum + 1000, 0);
    const averagePOValue = totalPOs > 0 ? totalPOValue / totalPOs : 0;

    return {
      summary: {
        totalPOs,
        pendingPOs,
        approvedPOs,
        rejectedPOs,
        totalPOValue,
        averagePOValue
      },
      purchaseOrders,
      generatedOn: new Date(),
      filters: filters as ReportFilters
    };
  }

  private async getRefillMetrics(_warehouseId: string): Promise<{
    pendingRefills: number;
    completedRefills: number;
  }> {
    return {
      pendingRefills: 32,
      completedRefills: 77
    };
  }

  private async generateInventoryTurnoverReport(filters: any): Promise<any> {
    const { warehouse, startDate, endDate, category } = filters;
    
    if (!warehouse || !Types.ObjectId.isValid(warehouse)) {
      throw new Error('Valid warehouse ID is required');
    }

    const matchStage: any = {
      warehouse: new Types.ObjectId(warehouse),
      isArchived: false
    };

    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (category) {
      matchStage.productName = { $regex: category, $options: 'i' };
    }

    const turnoverData = await Inventory.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$sku',
          sku: { $first: '$sku' },
          productName: { $first: '$productName' },
          category: { $first: '$productName' },
          currentQuantity: { $first: '$quantity' },
          averageStock: { $avg: '$quantity' },
          totalReceived: { $sum: '$quantity' },
          stockOutCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'low_stock'] }, 1, 0]
            }
          },
          lastUpdated: { $max: '$updatedAt' }
        }
      },
      {
        $project: {
          sku: 1,
          productName: 1,
          category: 1,
          currentQuantity: 1,
          averageStock: 1,
          totalReceived: 1,
          stockOutCount: 1,
          turnoverRate: {
            $cond: [
              { $gt: ['$averageStock', 0] },
              { $divide: ['$totalReceived', '$averageStock'] },
              0
            ]
          },
          lastUpdated: 1
        }
      },
      { $sort: { turnoverRate: -1 } }
    ]);
    
    return {
      report: 'inventory_turnover',
      data: turnoverData,
      summary: {
        totalSKUs: turnoverData.length,
        averageTurnover: turnoverData.length > 0 ? 
          turnoverData.reduce((acc: number, item: any) => acc + item.turnoverRate, 0) / turnoverData.length : 0,
        highTurnoverItems: turnoverData.filter((item: any) => item.turnoverRate > 2).length,
        lowTurnoverItems: turnoverData.filter((item: any) => item.turnoverRate < 0.5).length
      },
      generatedOn: new Date(),
      filters: filters as ReportFilters
    };
  }

  private async generateQCSummaryReport(filters: any): Promise<any> {
    const { warehouse, startDate, endDate, vendor } = filters;
    
    if (!warehouse || !Types.ObjectId.isValid(warehouse)) {
      throw new Error('Valid warehouse ID is required');
    }

    const matchStage: any = {
      warehouse: new Types.ObjectId(warehouse)
    };

    if (startDate && endDate) {
      matchStage.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    if (vendor) {
      matchStage.vendor = new Types.ObjectId(vendor);
    }

    const qcData = await RaisePurchaseOrder.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: '$po_status',
          count: { $sum: 1 }
        }
      }
    ]);
    
    const totalReceivings = qcData.reduce((acc: number, item: any) => acc + item.count, 0);
    const passRate = totalReceivings > 0 
      ? (qcData.find((item: any) => item._id === 'approved')?.count || 0) / totalReceivings * 100 
      : 0;
    
    const qcDetails = await RaisePurchaseOrder.find(matchStage)
      .populate('vendor', 'vendor_name vendor_email')
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
    
    return {
      report: 'qc_summary',
      data: qcData,
      details: qcDetails,
      summary: {
        totalReceivings,
        passRate: Math.round(passRate * 100) / 100,
        failedCount: qcData.find((item: any) => item._id === 'pending')?.count || 0,
        pendingCount: qcData.find((item: any) => item._id === 'draft')?.count || 0,
        totalValue: totalReceivings * 1000
      },
      generatedOn: new Date(),
      filters: filters as ReportFilters
    };
  }

  private async generateEfficiencyReport(filters: any): Promise<any> {
    const { warehouse, startDate, endDate } = filters;
    
    if (!warehouse || !Types.ObjectId.isValid(warehouse)) {
      throw new Error('Valid warehouse ID is required');
    }

    const dateMatch: any = {};
    if (startDate && endDate) {
      dateMatch.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const [dispatchEfficiency, inventoryEfficiency] = await Promise.all([
      DispatchOrder.aggregate([
        {
          $match: {
            warehouse: new Types.ObjectId(warehouse),
            status: 'delivered',
            ...dateMatch
          }
        },
        {
          $project: {
            dispatchId: 1,
            processingTime: {
              $divide: [
                { $subtract: ['$updatedAt', '$createdAt'] },
                1000 * 60 * 60
              ]
            },
            productsCount: { $size: '$products' }
          }
        },
        {
          $group: {
            _id: null,
            avgProcessingTime: { $avg: '$processingTime' },
            totalDispatches: { $sum: 1 },
            totalProductsDispatched: { $sum: '$productsCount' }
          }
        }
      ]),
      
      Inventory.aggregate([
        {
          $match: {
            warehouse: new Types.ObjectId(warehouse),
            isArchived: false,
            ...dateMatch
          }
        },
        {
          $project: {
            utilizationRate: {
              $cond: [
                { $gt: ['$maxStockLevel', 0] },
                { $divide: ['$quantity', '$maxStockLevel'] },
                0
              ]
            },
            isLowStock: { $eq: ['$status', 'low_stock'] }
          }
        },
        {
          $group: {
            _id: null,
            avgUtilization: { $avg: '$utilizationRate' },
            lowStockCount: { $sum: { $cond: ['$isLowStock', 1, 0] } },
            totalItems: { $sum: 1 }
          }
        }
      ])
    ]);
    
    return {
      report: 'efficiency',
      dispatchEfficiency: dispatchEfficiency[0] || {},
      inventoryEfficiency: inventoryEfficiency[0] || {},
      overallScore: this.calculateOverallEfficiencyScore(
        dispatchEfficiency[0],
        inventoryEfficiency[0]
      ),
      generatedOn: new Date(),
      filters: filters as ReportFilters
    };
  }

  private calculateOverallEfficiencyScore(dispatchData: any, inventoryData: any): number {
    let score = 0;
    
    if (dispatchData?.avgProcessingTime) {
      const processingScore = Math.max(0, 100 - (dispatchData.avgProcessingTime / 48 * 100));
      score += processingScore * 0.4;
    }
    
    if (inventoryData?.avgUtilization) {
      const utilizationScore = Math.min(100, inventoryData.avgUtilization * 100 * 1.25);
      score += utilizationScore * 0.4;
    }
    
    if (inventoryData?.lowStockCount && inventoryData?.totalItems) {
      const lowStockRate = inventoryData.lowStockCount / inventoryData.totalItems;
      const lowStockScore = Math.max(0, 100 - (lowStockRate * 500));
      score += lowStockScore * 0.2;
    }
    
    return Math.round(score);
  }

  async exportReport(type: string, format: string, filters: any): Promise<any> {
    const reportData = await this.generateReport(type, filters);
    
    if (format === 'csv') {
      return this.convertToCSV(reportData, type);
    } else if (format === 'pdf') {
      return this.convertToPDF(reportData, type);
    }
    
    return reportData;
  }

  private convertToCSV(data: any, reportType: string): string {
    let csv = '';
    
    switch (reportType) {
      case 'inventory_summary':
        csv = this.convertInventorySummaryToCSV(data);
        break;
      case 'purchase_orders':
        csv = this.convertPurchaseOrdersToCSV(data);
        break;
      case 'stock_ageing':
        csv = this.convertStockAgeingToCSV(data);
        break;
      case 'inventory_turnover':
        csv = this.convertInventoryTurnoverToCSV(data);
        break;
      case 'qc_summary':
        csv = this.convertQCSummaryToCSV(data);
        break;
      default:
        csv = 'Report Type,Data\n';
        csv += `${reportType},"${JSON.stringify(data)}"`;
    }
    
    return csv;
  }

  private convertInventorySummaryToCSV(data: any): string {
    let csv = 'Inventory Summary Report\n';
    csv += `Generated On: ${data.generatedOn.toISOString().split('T')[0]}\n\n`;
    
    csv += 'SUMMARY METRICS\n';
    csv += 'Metric,Value\n';
    csv += `Total SKUs,${data.summary.totalSKUs}\n`;
    csv += `Stock-Out SKUs,${data.summary.stockOutSKUs}\n`;
    csv += `Total POs,${data.summary.totalPOs}\n`;
    csv += `Pending POs,${data.summary.pendingPOs}\n`;
    csv += `Total Stock Value,${data.summary.totalStockValue}\n`;
    csv += `Low Stock Items,${data.summary.lowStockItems}\n`;
    csv += `Near-Expiry SKUs,${data.summary.nearExpirySKUs}\n`;
    csv += `Stock Accuracy,${data.summary.stockAccuracy}%\n\n`;
    
    csv += 'INVENTORY DETAILS\n';
    csv += 'SKU ID,Product Name,Category,Current Qty,Threshold,Stock Status,Last Updated\n';
    
    data.inventoryDetails.forEach((item: any) => {
      const threshold = this.getStockThreshold(item.quantity, item.minStockLevel, item.maxStockLevel);
      const lastUpdated = item.updatedAt.toISOString().split('T')[0];
      
      csv += `"${item.sku}","${item.productName}","${this.extractCategory(item.productName)}",${item.quantity},${threshold},"${item.status}","${lastUpdated}"\n`;
    });
    
    return csv;
  }

  private convertPurchaseOrdersToCSV(data: any): string {
    let csv = 'Purchase Orders Report\n';
    csv += `Generated On: ${data.generatedOn.toISOString().split('T')[0]}\n\n`;
    
    csv += 'SUMMARY METRICS\n';
    csv += 'Metric,Value\n';
    csv += `Total POs,${data.summary.totalPOs}\n`;
    csv += `Pending POs,${data.summary.pendingPOs}\n`;
    csv += `Approved POs,${data.summary.approvedPOs}\n`;
    csv += `Rejected POs,${data.summary.rejectedPOs}\n`;
    csv += `Total PO Value,${data.summary.totalPOValue}\n`;
    csv += `Average PO Value,${data.summary.averagePOValue.toFixed(2)}\n\n`;
    
    csv += 'PURCHASE ORDER DETAILS\n';
    csv += 'PO Number,Vendor,Status,Created Date\n';
    
    data.purchaseOrders.forEach((po: any) => {
      const createdDate = po.createdAt.toISOString().split('T')[0];
      const vendorName = po.vendor?.vendor_name || 'N/A';
      
      csv += `"${po.po_number}","${vendorName}","${po.po_status}","${createdDate}"\n`;
    });
    
    return csv;
  }

  private convertStockAgeingToCSV(data: any): string {
    let csv = 'Stock Ageing Report\n';
    csv += 'Age Range,Count\n';
    
    if (data.ageingBuckets) {
      Object.entries(data.ageingBuckets).forEach(([range, count]) => {
        csv += `${range},${count}\n`;
      });
    }
    
    return csv;
  }

  private convertInventoryTurnoverToCSV(data: any): string {
    let csv = 'Inventory Turnover Report\n';
    csv += 'SKU,Product Name,Turnover Rate,Average Stock,Total Received,Stock Out Count\n';
    
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((item: any) => {
        csv += `"${item.sku}","${item.productName}",${item.turnoverRate},${item.averageStock},${item.totalReceived},${item.stockOutCount}\n`;
      });
    }
    
    return csv;
  }

  private convertQCSummaryToCSV(data: any): string {
    let csv = 'QC Summary Report\n';
    csv += 'Status,Count\n';
    
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((item: any) => {
        csv += `${item._id},${item.count}\n`;
      });
    }
    
    return csv;
  }

  private getStockThreshold(quantity: number, minStock: number, maxStock: number): string {
    if (quantity <= minStock) return 'Low';
    if (quantity >= maxStock * 0.9) return 'High';
    return 'Normal';
  }

  private extractCategory(productName: string): string {
    if (productName.toLowerCase().includes('lays') || productName.toLowerCase().includes('snack')) {
      return 'Snacks';
    }
    if (productName.toLowerCase().includes('beverage') || productName.toLowerCase().includes('drink')) {
      return 'Beverages';
    }
    return 'General';
  }

  private convertToPDF(data: any, reportType: string): any {
    return {
      message: 'PDF generation would be implemented here',
      data: data,
      format: 'pdf',
      reportType: reportType
    };
  }

  // ==================== PRIVATE HELPER METHODS ====================
  private getAgeFilter(ageRange: string): any {
    switch (ageRange) {
      case '0-30':
        return { $lte: 30 };
      case '31-60':
        return { $gt: 30, $lte: 60 };
      case '61-90':
        return { $gt: 60, $lte: 90 };
      case '90+':
        return { $gt: 90 };
      default:
        return {};
    }
  }

  private async generateAlerts(warehouseId?: string): Promise<DashboardData['alerts']> {
    const alerts: DashboardData['alerts'] = [];
    
    try {
      const baseQuery: any = {};
      if (warehouseId && Types.ObjectId.isValid(warehouseId)) {
        baseQuery.warehouse = new Types.ObjectId(warehouseId);
      }
      
      const pendingQC = await RaisePurchaseOrder.countDocuments({
        ...baseQuery,
        po_status: 'draft'
      });
      
      if (pendingQC > 0) {
        alerts.push({
          type: 'qc_failed',
          message: `${pendingQC} purchase orders pending approval`,
          count: pendingQC
        });
      }

      const lowStock = await Inventory.countDocuments({
        ...baseQuery,
        status: 'low_stock',
        isArchived: false
      });
      
      if (lowStock > 0) {
        alerts.push({
          type: 'low_stock',
          message: `${lowStock} items below safety stock`,
          count: lowStock
        });
      }
    } catch (error) {
      console.error('Error generating alerts:', error);
    }

    return alerts;
  }

  private async getRecentActivities(warehouseId?: string): Promise<any[]> {
    try {
      const baseQuery: any = {};
      if (warehouseId && Types.ObjectId.isValid(warehouseId)) {
        baseQuery.warehouse = new Types.ObjectId(warehouseId);
      }
      
      const [purchaseActivities, dispatchActivities] = await Promise.all([
        RaisePurchaseOrder.find(baseQuery)
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('createdBy', 'name'),
        DispatchOrder.find(baseQuery)
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('assignedAgent', 'name')
      ]);

      const activities = [
        ...purchaseActivities.map((item: any) => ({
          type: 'inbound',
          message: `Purchase order ${item.po_number} created`,
          timestamp: item.createdAt,
          user: item.createdBy?.name || 'System'
        })),
        
        ...dispatchActivities.map((item: any) => ({
          type: 'outbound',
          message: `Dispatched ${item.products?.length || 0} products to ${item.destination}`,
          timestamp: item.createdAt,
          user: item.assignedAgent?.name || 'System'
        }))
      ];

      return activities
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
        .slice(0, 8);
        
    } catch (error) {
      console.error('Error getting recent activities:', error);
      return [];
    }
  }

  private async validateSkuStock(products: { sku: string; quantity: number }[]): Promise<void> {
    for (const product of products) {
      const inventory = await Inventory.findOne({
        sku: product.sku,
        isArchived: false
      });

      if (!inventory || inventory.quantity < product.quantity) {
        throw new Error(
          `Insufficient stock for ${product.sku}. Available: ${inventory?.quantity || 0}, Requested: ${product.quantity}`
        );
      }
    }
  }

  private async reduceStockBySku(products: { sku: string; quantity: number }[]): Promise<void> {
    for (const product of products) {
      await Inventory.findOneAndUpdate(
        { sku: product.sku, isArchived: false },
        {
          $inc: { quantity: -product.quantity },
          $set: { updatedAt: new Date() }
        }
      );
    }
  }

  private calculateInventoryStatus(data: {
    quantity: number;
    minStockLevel: number;
    maxStockLevel: number;
    expiryDate?: Date | undefined;
  }): string {
    const today = new Date();
    
    if (data.expiryDate && data.expiryDate < today) {
      return 'expired';
    }
    
    if (data.quantity <= data.minStockLevel) {
      return 'low_stock';
    }
    
    if (data.quantity >= data.maxStockLevel * 0.9) {
      return 'overstock';
    }
    
    return 'active';
  }
}

export const warehouseService = new WarehouseService();