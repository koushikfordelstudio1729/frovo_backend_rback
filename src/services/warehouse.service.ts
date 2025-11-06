// services/warehouse.service.ts
import { 
  GoodsReceiving,
  DispatchOrder,
  QCTemplate,
  ReturnOrder,
  Inventory,
  Expense, 
} from '../models/Warehouse.model';
import { Types } from 'mongoose';
import { IDispatchOrder, IExpense, IGoodsReceiving, IInventory, IQCTemplate, IReturnOrder } from '../models/Warehouse.model';

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
}

export interface GoodsReceivingData {
  poNumber: string;
  vendor: string;
  sku: string;
  productName: string;
  quantity: number;
  batchId: string;
  warehouse: string;
  qcVerification: {
    packaging: boolean;
    expiry: boolean;
    label: boolean;
  };
  storage: {
    zone: string;
    aisle: string;
    rack: string;
    bin: string;
  };
}

export interface DispatchData {
  vendor: string;
  destination: string;
  products: {
    sku: string;
    quantity: number;
    batchId: string;
  }[];
  assignedAgent: string;
  route: string;
  notes?: string;
}

export interface QCTemplateData {
  name: string;
  category: string;
  parameters: string[];
}

export interface ReturnOrderData {
  batchId: string;
  sku: string;
  vendor: string;
  reason: string;
  quantity: number;
}

class WarehouseService {
  // ==================== SCREEN 1: DASHBOARD ====================
  async getDashboard(warehouseId?: string, filters?: any): Promise<DashboardData> {
    const dateFilter = this.getDateFilter(filters?.dateRange);
    
    const [inbound, outbound, pendingQC, todayDispatches] = await Promise.all([
      // Inbound: Goods received in date range
      GoodsReceiving.countDocuments({
        warehouse: warehouseId,
        createdAt: dateFilter
      }),
      // Outbound: Dispatches in date range
      DispatchOrder.countDocuments({
        warehouse: warehouseId,
        createdAt: dateFilter
      }),
      // Pending QC: Goods with QC pending
      GoodsReceiving.countDocuments({
        warehouse: warehouseId,
        status: 'qc_pending'
      }),
      // Today's dispatches
      DispatchOrder.countDocuments({
        warehouse: warehouseId,
        createdAt: {
          $gte: new Date(new Date().setHours(0,0,0,0)),
          $lt: new Date(new Date().setHours(23,59,59,999))
        }
      })
    ]);

    const alerts = await this.generateAlerts(warehouseId);
    const recentActivities = await this.getRecentActivities(warehouseId);

    return {
      kpis: { inbound, outbound, pendingQC, todayDispatches },
      alerts,
      recentActivities
    };
  }

  // ==================== SCREEN 2: INBOUND LOGISTICS ====================
  async receiveGoods(data: GoodsReceivingData, createdBy: Types.ObjectId): Promise<IGoodsReceiving> {
    // Auto-generate batch ID if not provided
    const batchId = data.batchId || `BATCH-${Date.now()}`;
    
    const goodsReceiving = await GoodsReceiving.create({
      ...data,
      batchId,
      status: data.qcVerification.packaging && data.qcVerification.expiry && data.qcVerification.label 
        ? 'qc_passed' 
        : 'qc_failed',
      createdBy
    });

    // Update or create inventory
    await this.upsertInventory({
      sku: data.sku,
      productName: data.productName,
      batchId,
      warehouse: data.warehouse,
      quantity: data.quantity,
      location: data.storage,
      createdBy
    });

    return goodsReceiving;
  }

  async getReceivings(warehouseId?: string, filters?: any): Promise<IGoodsReceiving[]> {
    let query: any = {};
    
    if (warehouseId) {
      query.warehouse = new Types.ObjectId(warehouseId);
    }
    
    // Apply date filters
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }
    
    // Apply status filter
    if (filters?.status) {
      query.status = filters.status;
    }
    
    return await GoodsReceiving.find(query)
      .populate('vendor', 'name code')
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
  }

  // ==================== SCREEN 3: OUTBOUND LOGISTICS ====================
  async createDispatch(data: DispatchData, createdBy: Types.ObjectId): Promise<IDispatchOrder> {
    // Validate stock availability
    await this.validateStockAvailability(data.products);

    // Generate dispatch ID (DO-5678 format)
    const dispatchCount = await DispatchOrder.countDocuments();
    const dispatchId = `DO-${String(dispatchCount + 1).padStart(4, '0')}`;

    const dispatch = await DispatchOrder.create({
      dispatchId,
      ...data,
      status: 'assigned',
      createdBy
    });

    // Update inventory quantities
    await this.updateInventoryQuantities(data.products, 'outbound');

    return dispatch;
  }

  async getDispatches(warehouseId?: string, filters?: any): Promise<IDispatchOrder[]> {
    let query: any = {};
    
    if (warehouseId) {
      query.warehouse = new Types.ObjectId(warehouseId);
    }
    
    // Apply status filter
    if (filters?.status) {
      query.status = filters.status;
    }
    
    // Apply date filters
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }
    
    return await DispatchOrder.find(query)
      .populate('vendor', 'name code')
      .populate('assignedAgent', 'name email')
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
  }

  async updateDispatchStatus(dispatchId: string, status: string): Promise<IDispatchOrder> {
    const validStatuses = ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    const dispatch = await DispatchOrder.findByIdAndUpdate(
      dispatchId,
      { status },
      { new: true }
    ).populate('vendor assignedAgent warehouse');
    
    if (!dispatch) {
      throw new Error('Dispatch order not found');
    }
    
    return dispatch;
  }

  // ==================== SCREEN 3: QC TEMPLATES ====================
  async createQCTemplate(data: QCTemplateData, createdBy: Types.ObjectId): Promise<IQCTemplate> {
    const parameters = data.parameters.map(param => ({
      name: param,
      type: 'boolean', // Default type as per wireframe
      required: true
    }));

    return await QCTemplate.create({
      name: data.name,
      category: data.category,
      parameters,
      createdBy
    });
  }

  async getQCTemplates(category?: string): Promise<IQCTemplate[]> {
    let query: any = {};
    
    if (category) {
      query.category = category;
    }
    
    return await QCTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
  }

  async applyQCTemplate(templateId: string, batchId: string): Promise<void> {
    const template = await QCTemplate.findById(templateId);
    if (!template) {
      throw new Error('QC template not found');
    }

    // Apply template to goods receiving record
    await GoodsReceiving.findOneAndUpdate(
      { batchId },
      { 
        status: 'qc_pending',
        // Store template application details
      }
    );
  }

  // ==================== SCREEN 3: RETURN MANAGEMENT ====================
  async createReturnOrder(data: ReturnOrderData, createdBy: Types.ObjectId): Promise<IReturnOrder> {
    return await ReturnOrder.create({
      ...data,
      status: 'pending',
      createdBy
    });
  }

  async getReturnQueue(warehouseId?: string): Promise<IReturnOrder[]> {
    return await ReturnOrder.find(warehouseId ? { warehouse: warehouseId } : {})
      .populate('vendor', 'name')
      .sort({ createdAt: -1 });
  }

  async approveReturn(returnId: string): Promise<IReturnOrder> {
    const updated = await ReturnOrder.findByIdAndUpdate(
      returnId,
      { status: 'approved' },
      { new: true }
    ).populate('vendor', 'name');

    if (!updated) {
      throw new Error('Return order not found');
    }

    return updated;
  }

  async rejectReturn(returnId: string): Promise<IReturnOrder> {
    const updated = await ReturnOrder.findByIdAndUpdate(
      returnId,
      { status: 'rejected' },
      { new: true }
    ).populate('vendor', 'name');
    
    if (!updated) {
      throw new Error('Return order not found');
    }
    
    return updated;
  }

  // ==================== SCREEN 4: INVENTORY MANAGEMENT ====================
  async getInventory(warehouseId: string, filters?: any): Promise<IInventory[]> {
    let query: any = { warehouse: warehouseId };
    
    // Apply filters
    if (filters?.ageRange) {
      query.age = this.getAgeFilter(filters.ageRange);
    }
    
    if (filters?.category) {
      // Assuming category is stored in product metadata
      // This would need integration with product catalog
    }

    const inventory = await Inventory.find(query)
      .populate('warehouse', 'name code')
      .sort({ age: -1 });

    return inventory;
  }

  async updateInventory(inventoryId: string, updateData: any): Promise<IInventory> {
    const allowedUpdates = ['quantity', 'minStockLevel', 'maxStockLevel', 'location', 'status'];
    const updates: any = {};
    
    // Only allow specific fields to be updated
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });
    
    // Recalculate status if quantity is updated
    if (updates.quantity !== undefined) {
      const inventory = await Inventory.findById(inventoryId);
      if (inventory) {
        updates.status = this.calculateInventoryStatus({
          quantity: updates.quantity,
          minStockLevel: updates.minStockLevel || inventory.minStockLevel,
          maxStockLevel: updates.maxStockLevel || inventory.maxStockLevel
        });
      }
    }
    
    const updated = await Inventory.findByIdAndUpdate(
      inventoryId,
      updates,
      { new: true, runValidators: true }
    ).populate('warehouse', 'name code');
    
    if (!updated) {
      throw new Error('Inventory item not found');
    }
    
    return updated;
  }

  async getLowStockAlerts(warehouseId?: string): Promise<IInventory[]> {
    let query: any = { status: 'low_stock' };
    
    if (warehouseId) {
      query.warehouse = new Types.ObjectId(warehouseId);
    }
    
    return await Inventory.find(query)
      .populate('warehouse', 'name code')
      .sort({ quantity: 1 }); // Sort by lowest quantity first
  }

  async getStockAgeingReport(warehouseId: string): Promise<{
    ageingBuckets: { [key: string]: number };
    details: IInventory[];
  }> {
    const inventory = await this.getInventory(warehouseId);
    
    const ageingBuckets = {
      '0-30': 0,
      '31-60': 0,
      '61-90': 0,
      '90+': 0
    };

    inventory.forEach(item => {
      if (item.age <= 30) ageingBuckets['0-30']++;
      else if (item.age <= 60) ageingBuckets['31-60']++;
      else if (item.age <= 90) ageingBuckets['61-90']++;
      else ageingBuckets['90+']++;
    });

    return {
      ageingBuckets,
      details: inventory
    };
  }

  // ==================== SCREEN 5: EXPENSE MANAGEMENT ====================
  async createExpense(data: {
    category: string;
    amount: number;
    vendor?: string;
    date: Date;
    description?: string;
    warehouse: string;
  }, createdBy: Types.ObjectId): Promise<IExpense> {
    return await Expense.create({
      ...data,
      status: 'pending',
      createdBy
    });
  }

  async getExpenses(warehouseId?: string, filters?: any): Promise<IExpense[]> {
    let query: any = {};
    
    if (warehouseId) {
      query.warehouse = new Types.ObjectId(warehouseId);
    }
    
    // Apply category filter
    if (filters?.category) {
      query.category = filters.category;
    }
    
    // Apply status filter
    if (filters?.status) {
      query.status = filters.status;
    }
    
    // Apply date filters
    if (filters?.startDate || filters?.endDate) {
      query.date = {};
      if (filters.startDate) {
        query.date.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.date.$lte = new Date(filters.endDate);
      }
    }
    
    return await Expense.find(query)
      .populate('vendor', 'name code')
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .sort({ date: -1 });
  }

  async updateExpenseStatus(expenseId: string, status: string): Promise<IExpense> {
    const validStatuses = ['approved', 'pending', 'rejected'];
    
    if (!validStatuses.includes(status)) {
      throw new Error(`Invalid status. Must be one of: ${validStatuses.join(', ')}`);
    }
    
    const expense = await Expense.findByIdAndUpdate(
      expenseId,
      { status },
      { new: true }
    ).populate('vendor warehouse');
    
    if (!expense) {
      throw new Error('Expense not found');
    }
    
    return expense;
  }

  async getExpenseSummary(warehouseId: string, filters?: any): Promise<{
    total: number;
    approved: number;
    pending: number;
    byCategory: { [key: string]: number };
  }> {
    const matchStage: any = { warehouse: new Types.ObjectId(warehouseId) };
    
    if (filters?.dateRange) {
      matchStage.date = this.getDateFilter(filters.dateRange);
    }

    const summary = await Expense.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: null,
          total: { $sum: '$amount' },
          approved: {
            $sum: {
              $cond: [{ $eq: ['$status', 'approved'] }, '$amount', 0]
            }
          },
          pending: {
            $sum: {
              $cond: [{ $eq: ['$status', 'pending'] }, '$amount', 0]
            }
          },
          byCategory: {
            $push: {
              category: '$category',
              amount: '$amount'
            }
          }
        }
      }
    ]);

    const result = summary[0] || { total: 0, approved: 0, pending: 0, byCategory: [] };
    
    // Transform byCategory
    const byCategory: { [key: string]: number } = {};
    if (result.byCategory) {
      result.byCategory.forEach((item: any) => {
        byCategory[item.category] = (byCategory[item.category] || 0) + item.amount;
      });
    }

    return {
      total: result.total,
      approved: result.approved,
      pending: result.pending,
      byCategory
    };
  }

  // ==================== SCREEN 6: REPORTS & ANALYTICS ====================
  async generateReport(type: string, filters: any): Promise<any> {
    switch (type) {
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

  async exportReport(type: string, format: string, filters: any): Promise<any> {
    const reportData = await this.generateReport(type, filters);
    
    if (format === 'csv') {
      return this.convertToCSV(reportData, type);
    }
    
    return reportData;
  }

  // ==================== PRIVATE HELPER METHODS ====================
  private getDateFilter(dateRange?: string): any {
    if (!dateRange) return {};
    
    const now = new Date();
    switch (dateRange) {
      case 'this_week':
        const startOfWeek = new Date(now.setDate(now.getDate() - now.getDay()));
        const endOfWeek = new Date(now.setDate(now.getDate() - now.getDay() + 6));
        return {
          $gte: startOfWeek,
          $lte: endOfWeek
        };
      case 'this_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        return {
          $gte: startOfMonth,
          $lte: endOfMonth
        };
      default:
        return {};
    }
  }

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
    
    // QC Failed alerts
    const qcFailed = await GoodsReceiving.countDocuments({
      warehouse: warehouseId,
      status: 'qc_failed'
    });
    if (qcFailed > 0) {
      alerts.push({
        type: 'qc_failed',
        message: `${qcFailed} batches failed QC`,
        count: qcFailed
      });
    }

    // Low stock alerts
    const lowStock = await Inventory.countDocuments({
      warehouse: warehouseId,
      status: 'low_stock'
    });
    if (lowStock > 0) {
      alerts.push({
        type: 'low_stock',
        message: `${lowStock} items below safety stock`,
        count: lowStock
      });
    }

    return alerts;
  }

  private async getRecentActivities(warehouseId?: string): Promise<any[]> {
    const [receivingActivities, dispatchActivities] = await Promise.all([
      GoodsReceiving.find(warehouseId ? { warehouse: warehouseId } : {})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('vendor', 'name')
        .populate('createdBy', 'name'),
      DispatchOrder.find(warehouseId ? { warehouse: warehouseId } : {})
        .sort({ createdAt: -1 })
        .limit(5)
        .populate('vendor', 'name')
        .populate('assignedAgent', 'name')
    ]);

    return [
      ...receivingActivities.map((item: any) => ({
        type: 'inbound',
        message: `Received ${item.quantity} units of ${item.sku}`,
        timestamp: item.createdAt,
        user: (item.createdBy && (item.createdBy as any).name) || undefined
      })),
      ...dispatchActivities.map((item: any) => ({
        type: 'outbound',
        message: `Dispatched ${(item.products || []).length} products to ${item.destination}`,
        timestamp: item.createdAt,
        user: (item.assignedAgent && (item.assignedAgent as any).name) || undefined
      }))
    ].sort((a: any, b: any) => (b.timestamp?.getTime?.() || 0) - (a.timestamp?.getTime?.() || 0)).slice(0, 8);
  }

  private async validateStockAvailability(products: { sku: string; quantity: number; batchId: string }[]): Promise<void> {
    for (const product of products) {
      const inventory = await Inventory.findOne({
        sku: product.sku,
        batchId: product.batchId,
        status: 'active'
      });
      
      if (!inventory || inventory.quantity < product.quantity) {
        throw new Error(`Insufficient stock for ${product.sku} in batch ${product.batchId}. Available: ${inventory?.quantity || 0}, Requested: ${product.quantity}`);
      }
    }
  }

  private async updateInventoryQuantities(products: { sku: string; quantity: number; batchId: string }[], direction: 'inbound' | 'outbound'): Promise<void> {
    for (const product of products) {
      const multiplier = direction === 'inbound' ? 1 : -1;
      await Inventory.findOneAndUpdate(
        { sku: product.sku, batchId: product.batchId },
        { 
          $inc: { quantity: multiplier * product.quantity },
          $set: { 
            status: this.calculateInventoryStatus({
              quantity: product.quantity + (multiplier * product.quantity),
              minStockLevel: 0, // This should come from existing record
              maxStockLevel: 0  // This should come from existing record
            })
          }
        }
      );
    }
  }

  private async upsertInventory(data: {
    sku: string;
    productName: string;
    batchId: string;
    warehouse: string;
    quantity: number;
    location: { zone: string; aisle: string; rack: string; bin: string };
    createdBy: Types.ObjectId;
  }): Promise<void> {
    const existing = await Inventory.findOne({
      sku: data.sku,
      batchId: data.batchId,
      warehouse: data.warehouse
    });

    if (existing) {
      // Update existing inventory
      await Inventory.findByIdAndUpdate(existing._id, {
        $inc: { quantity: data.quantity },
        age: Math.floor((Date.now() - existing.createdAt.getTime()) / (1000 * 60 * 60 * 24))
      });
    } else {
      // Create new inventory record
      await Inventory.create({
        ...data,
        minStockLevel: Math.floor(data.quantity * 0.1),
        maxStockLevel: data.quantity * 2,
        age: 0,
        status: 'active'
      });
    }
  }

  private calculateInventoryStatus(data: { quantity: number; minStockLevel: number; maxStockLevel: number }): string {
    if (data.quantity <= data.minStockLevel) return 'low_stock';
    if (data.quantity >= data.maxStockLevel * 0.9) return 'active'; // 90% of max
    return 'active';
  }

  // ==================== REPORT GENERATION METHODS ====================
  private async generateInventoryTurnoverReport(filters: any): Promise<any> {
    const { warehouse, startDate, endDate } = filters;
    
    // Calculate inventory turnover ratio
    const turnoverData = await Inventory.aggregate([
      {
        $match: {
          warehouse: new Types.ObjectId(warehouse),
          ...(startDate && endDate ? {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          } : {})
        }
      },
      {
        $group: {
          _id: '$sku',
          sku: { $first: '$sku' },
          productName: { $first: '$productName' },
          averageStock: { $avg: '$quantity' },
          totalReceived: { $sum: '$quantity' },
          stockOutCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'low_stock'] }, 1, 0]
            }
          }
        }
      },
      {
        $project: {
          sku: 1,
          productName: 1,
          averageStock: 1,
          totalReceived: 1,
          stockOutCount: 1,
          turnoverRate: {
            $cond: [
              { $gt: ['$averageStock', 0] },
              { $divide: ['$totalReceived', '$averageStock'] },
              0
            ]
          }
        }
      },
      { $sort: { turnoverRate: -1 } }
    ]);
    
    return {
      report: 'inventory_turnover',
      data: turnoverData,
      summary: {
        totalSKUs: turnoverData.length,
        averageTurnover: turnoverData.reduce((acc, item) => acc + item.turnoverRate, 0) / turnoverData.length,
        highTurnoverItems: turnoverData.filter((item: any) => item.turnoverRate > 2).length
      }
    };
  }

  private async generateQCSummaryReport(filters: any): Promise<any> {
    const { warehouse, startDate, endDate } = filters;
    
    const qcData = await GoodsReceiving.aggregate([
      {
        $match: {
          warehouse: new Types.ObjectId(warehouse),
          ...(startDate && endDate ? {
            createdAt: {
              $gte: new Date(startDate),
              $lte: new Date(endDate)
            }
          } : {})
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalQuantity: { $sum: '$quantity' }
        }
      }
    ]);
    
    const totalReceivings = qcData.reduce((acc, item) => acc + item.count, 0);
    const passRate = totalReceivings > 0 
      ? (qcData.find(item => item._id === 'qc_passed')?.count || 0) / totalReceivings * 100 
      : 0;
    
    return {
      report: 'qc_summary',
      data: qcData,
      summary: {
        totalReceivings,
        passRate: Math.round(passRate * 100) / 100,
        failedCount: qcData.find(item => item._id === 'qc_failed')?.count || 0,
        pendingCount: qcData.find(item => item._id === 'qc_pending')?.count || 0
      }
    };
  }

  private async generateEfficiencyReport(filters: any): Promise<any> {
    const { warehouse, startDate, endDate } = filters;
    
    const dateMatch: any = {};
    if (startDate && endDate) {
      dateMatch.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }
    
    const [dispatchEfficiency, inventoryEfficiency] = await Promise.all([
      // Dispatch efficiency (time from creation to delivery)
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
                1000 * 60 * 60 // Convert to hours
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
      
      // Inventory efficiency (stock utilization)
      Inventory.aggregate([
        {
          $match: {
            warehouse: new Types.ObjectId(warehouse),
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
      )
    };
  }

  private calculateOverallEfficiencyScore(dispatchData: any, inventoryData: any): number {
    let score = 0;
    
    if (dispatchData?.avgProcessingTime) {
      // Lower processing time is better (max 48 hours = 100%, min 0 hours = 0%)
      const processingScore = Math.max(0, 100 - (dispatchData.avgProcessingTime / 48 * 100));
      score += processingScore * 0.4; // 40% weight
    }
    
    if (inventoryData?.avgUtilization) {
      // Higher utilization is better (target 80% utilization)
      const utilizationScore = Math.min(100, inventoryData.avgUtilization * 100 * 1.25); // 80% = 100 points
      score += utilizationScore * 0.4; // 40% weight
    }
    
    if (inventoryData?.lowStockCount && inventoryData?.totalItems) {
      // Lower low stock percentage is better
      const lowStockRate = inventoryData.lowStockCount / inventoryData.totalItems;
      const lowStockScore = Math.max(0, 100 - (lowStockRate * 500)); // 20% low stock = 0 points
      score += lowStockScore * 0.2; // 20% weight
    }
    
    return Math.round(score);
  }

  // ==================== CSV EXPORT METHODS ====================
  private convertToCSV(data: any, reportType: string): string {
    let csv = '';
    
    switch (reportType) {
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

  private convertStockAgeingToCSV(data: any): string {
    let csv = 'Age Range,Count\n';
    
    if (data.ageingBuckets) {
      Object.entries(data.ageingBuckets).forEach(([range, count]) => {
        csv += `${range},${count}\n`;
      });
    }
    
    if (data.details && Array.isArray(data.details)) {
      csv += '\nSKU,Product Name,Batch ID,Quantity,Age (Days),Location\n';
      data.details.forEach((item: any) => {
        csv += `"${item.sku}","${item.productName}","${item.batchId}",${item.quantity},${item.age},"${item.location.zone}-${item.location.aisle}-${item.location.rack}-${item.location.bin}"\n`;
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
    csv += 'Status,Count,Total Quantity\n';
    
    if (data.data && Array.isArray(data.data)) {
      data.data.forEach((item: any) => {
        csv += `${item._id},${item.count},${item.totalQuantity}\n`;
      });
    }
    
    return csv;
  }
}

export const warehouseService = new WarehouseService();