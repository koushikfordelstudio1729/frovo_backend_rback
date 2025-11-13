// services/warehouse.service.ts
import { 
  GoodsReceiving,
  DispatchOrder,
  QCTemplate,
  ReturnOrder,
  Inventory,
  Expense, 
  FieldAgent,
} from '../models/Warehouse.model';
import { Types } from 'mongoose';
import { IDispatchOrder, IExpense, IGoodsReceiving, IInventory, IQCTemplate, IReturnOrder, IFieldAgent } from '../models/Warehouse.model';

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
  vendor: Types.ObjectId;
  sku: string;
  productName: string;
  quantity: number;
  batchId?: string;
  warehouse: Types.ObjectId;
  qcVerification: {
    packaging: boolean;
    expiry: boolean;
    label: boolean;
    documents?: string[];
  };
  storage: {
    zone: string;
    aisle: string;
    rack: string;
    bin: string;
  };
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
  name: string;
  category: 'snacks' | 'beverages' | 'perishable' | 'non_perishable';
  parameters: {
    name: string;
    type: 'boolean' | 'text' | 'number';
    required: boolean;
    options?: string[];
  }[];
}

export interface ReturnOrderData {
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

class WarehouseService {
  // ==================== SCREEN 1: DASHBOARD ====================
  async getDashboard(warehouseId?: string, filters?: any): Promise<DashboardData> {
    const dateFilter = this.getDateFilter(filters?.dateRange);
    
    const baseQuery: any = {};
    
    if (warehouseId && Types.ObjectId.isValid(warehouseId)) {
      baseQuery.warehouse = new Types.ObjectId(warehouseId);
    }

    const [inbound, outbound, pendingQC, todayDispatches] = await Promise.all([
      GoodsReceiving.countDocuments({
        ...baseQuery,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }),
      
      DispatchOrder.countDocuments({
        ...baseQuery,
        ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter })
      }),
      
      GoodsReceiving.countDocuments({
        ...baseQuery,
        status: 'qc_pending'
      }),
      
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

    return {
      kpis: { inbound, outbound, pendingQC, todayDispatches },
      alerts,
      recentActivities
    };
  }

  // ==================== SCREEN 2: INBOUND LOGISTICS ====================
  async receiveGoods(data: GoodsReceivingData, createdBy: Types.ObjectId): Promise<IGoodsReceiving> {
    const batchId = data.batchId || `BATCH-${Date.now()}`;
    
    const qcPassed = data.qcVerification.packaging && 
                     data.qcVerification.expiry && 
                     data.qcVerification.label;
    
    const status = qcPassed ? 'qc_passed' : 'qc_failed';

    const goodsReceiving = await GoodsReceiving.create({
      ...data,
      batchId,
      status,
      createdBy
    });

    if (status === 'qc_passed') {
      await this.upsertInventory({
        sku: data.sku,
        productName: data.productName,
        batchId,
        warehouse: data.warehouse,
        quantity: data.quantity,
        location: data.storage,
        createdBy
      });
    }

    return goodsReceiving;
  }

  async getReceivings(warehouseId?: string, filters?: any): Promise<IGoodsReceiving[]> {
    let query: any = {};
    
    if (warehouseId && Types.ObjectId.isValid(warehouseId)) {
      query.warehouse = new Types.ObjectId(warehouseId);
    }
    
    if (filters?.startDate || filters?.endDate) {
      query.createdAt = {};
      if (filters.startDate) {
        query.createdAt.$gte = new Date(filters.startDate);
      }
      if (filters.endDate) {
        query.createdAt.$lte = new Date(filters.endDate);
      }
    }
    
    if (filters?.status) {
      query.status = filters.status;
    }

    if (filters?.poNumber) {
      query.poNumber = { $regex: filters.poNumber, $options: 'i' };
    }

    if (filters?.vendor && Types.ObjectId.isValid(filters.vendor)) {
      query.vendor = new Types.ObjectId(filters.vendor);
    }
    
    return await GoodsReceiving.find(query)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 });
  }

  async getReceivingById(id: string): Promise<IGoodsReceiving | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    return await GoodsReceiving.findById(id)
      .populate('warehouse', 'name code')
      .populate('createdBy', 'name email');
  }

  async updateQCVerification(
    id: string, 
    qcData: Partial<GoodsReceivingData['qcVerification']>
  ): Promise<IGoodsReceiving | null> {
    if (!Types.ObjectId.isValid(id)) return null;
    
    const receiving = await GoodsReceiving.findById(id);
    if (!receiving) return null;

    const updatedQC = { ...receiving.qcVerification, ...qcData };
    const qcPassed = updatedQC.packaging && updatedQC.expiry && updatedQC.label;
    const status = qcPassed ? 'qc_passed' : 'qc_failed';

    const updatedReceiving = await GoodsReceiving.findByIdAndUpdate(
      id,
      {
        qcVerification: updatedQC,
        status
      },
      { new: true }
    ).populate('warehouse', 'name code')
     .populate('createdBy', 'name email');

    if (status === 'qc_passed' && receiving.status !== 'qc_passed') {
      await this.upsertInventory({
        sku: receiving.sku,
        productName: receiving.productName,
        batchId: receiving.batchId,
        warehouse: receiving.warehouse,
        quantity: receiving.quantity,
        location: receiving.storage,
        createdBy: receiving.createdBy
      });
    }

    return updatedReceiving;
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
    await this.validateStockAvailability(data.products);

    const latestDispatch = await DispatchOrder.findOne().sort({ createdAt: -1 });
    const nextNumber = latestDispatch ? parseInt(latestDispatch.dispatchId.split('-')[1] || "0") + 1 : 1;
    const dispatchId = `DO-${String(nextNumber).padStart(4, '0')}`;

    const dispatch = await DispatchOrder.create({
      dispatchId,
      ...data,
      status: 'assigned',
      createdBy
    });

    await this.updateInventoryQuantities(data.products, 'outbound');
    return dispatch;
  }

  async getDispatches(_warehouseId?: string, filters?: any): Promise<IDispatchOrder[]> {
    let query: any = {};
    
    if (filters?.status) {
      query.status = filters.status;
    }
    
    if (filters?.vendor && Types.ObjectId.isValid(filters.vendor)) {
      query.vendor = new Types.ObjectId(filters.vendor);
    }
    
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
      .populate('vendor', 'name code contactPerson phone')
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
    .populate('vendor assignedAgent createdBy');
    
    if (!dispatch) {
      throw new Error('Dispatch order not found');
    }
    
    return dispatch;
  }

  async getDispatchById(dispatchId: string): Promise<IDispatchOrder | null> {
    if (!Types.ObjectId.isValid(dispatchId)) return null;
    return await DispatchOrder.findById(dispatchId)
      .populate('vendor', 'name code contactPerson phone address')
      .populate('assignedAgent', 'name email phone vehicleType licensePlate')
      .populate('createdBy', 'name email');
  }

  // ==================== QC TEMPLATES ====================
  async createQCTemplate(data: QCTemplateData, createdBy: Types.ObjectId): Promise<IQCTemplate> {
    return await QCTemplate.create({
      ...data,
      isActive: true,
      createdBy
    });
  }

  async getQCTemplates(category?: string): Promise<IQCTemplate[]> {
    let query: any = { isActive: true };
    
    if (category) {
      query.category = category;
    }
    
    return await QCTemplate.find(query)
      .populate('createdBy', 'name email')
      .sort({ name: 1 });
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

  async applyQCTemplate(templateId: string, batchId: string): Promise<void> {
    if (!Types.ObjectId.isValid(templateId)) {
      throw new Error('Invalid template ID');
    }
    
    const template = await QCTemplate.findById(templateId);
    if (!template) {
      throw new Error('QC template not found');
    }

    await GoodsReceiving.findOneAndUpdate(
      { batchId },
      { 
        status: 'qc_pending',
        qcTemplate: templateId
      }
    );
  }

  // ==================== RETURN MANAGEMENT ====================
  async createReturnOrder(data: ReturnOrderData, createdBy: Types.ObjectId): Promise<IReturnOrder> {
    const inventory = await Inventory.findOne({
      batchId: data.batchId,
      sku: data.sku
    });
    
    if (!inventory) {
      throw new Error(`Batch ${data.batchId} with SKU ${data.sku} not found in inventory`);
    }
    
    if (inventory.quantity < data.quantity) {
      throw new Error(`Insufficient quantity in batch. Available: ${inventory.quantity}, Requested: ${data.quantity}`);
    }

    return await ReturnOrder.create({
      ...data,
      status: 'pending',
      createdBy
    });
  }

  async getReturnQueue(_warehouseId?: string, filters?: any): Promise<IReturnOrder[]> {
    let query: any = {};
    
    if (filters?.status) {
      query.status = filters.status;
    }
    
    if (filters?.returnType) {
      query.returnType = filters.returnType;
    }

    return await ReturnOrder.find(query)
      .populate('vendor', 'name code contactPerson')
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
        sku: returnOrder.sku
      },
      {
        $inc: { quantity: -returnOrder.quantity }
      }
    );

    const updated = await ReturnOrder.findByIdAndUpdate(
      returnId,
      { status: 'approved' },
      { new: true }
    ).populate('vendor', 'name code');

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
    ).populate('vendor', 'name code');
    
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
      .populate('createdBy', 'name email')
      .sort({ name: 1 });
  }

  async createFieldAgent(data: {
    name: string;
    email: string;
    phone: string;
    vehicleType: string;
    licensePlate: string;
    assignedRoutes: string[];
  }, createdBy: Types.ObjectId): Promise<IFieldAgent> {
    return await FieldAgent.create({
      ...data,
      isActive: true,
      createdBy
    });
  }

  // ==================== SCREEN 4: INVENTORY MANAGEMENT ====================
  async getInventory(warehouseId: string, filters?: any): Promise<IInventory[]> {
    let query: any = { warehouse: new Types.ObjectId(warehouseId) };
    
    if (filters?.ageRange) {
      query.age = this.getAgeFilter(filters.ageRange);
    }

    const inventory = await Inventory.find(query)
      .populate('warehouse', 'name code')
      .sort({ age: -1 });

    return inventory;
  }

  async updateInventory(inventoryId: string, updateData: any): Promise<IInventory> {
    const allowedUpdates = ['quantity', 'minStockLevel', 'maxStockLevel', 'location', 'status'];
    const updates: any = {};
    
    Object.keys(updateData).forEach(key => {
      if (allowedUpdates.includes(key)) {
        updates[key] = updateData[key];
      }
    });
    
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
    
    if (warehouseId && Types.ObjectId.isValid(warehouseId)) {
      query.warehouse = new Types.ObjectId(warehouseId);
    }
    
    return await Inventory.find(query)
      .populate('warehouse', 'name code')
      .sort({ quantity: 1 });
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
    category: 'staffing' | 'supplies' | 'equipment' | 'transport';
    amount: number;
    vendor?: Types.ObjectId;
    date: Date;
    description?: string;
    warehouse: Types.ObjectId;
    billUrl?: string;
  }, createdBy: Types.ObjectId): Promise<IExpense> {
    return await Expense.create({
      ...data,
      status: 'pending',
      createdBy
    });
  }

  async getExpenses(warehouseId?: string, filters?: any): Promise<IExpense[]> {
    let query: any = {};
    
    if (warehouseId && Types.ObjectId.isValid(warehouseId)) {
      query.warehouse = new Types.ObjectId(warehouseId);
    }
    
    if (filters?.category) {
      query.category = filters.category;
    }
    
    if (filters?.status) {
      query.status = filters.status;
    }
    
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
        
        return {
          $gte: startOfWeek,
          $lte: endOfWeek
        };
      case 'this_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
        endOfMonth.setHours(23, 59, 59, 999);
        
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
    
    try {
      const baseQuery: any = {};
      if (warehouseId && Types.ObjectId.isValid(warehouseId)) {
        baseQuery.warehouse = new Types.ObjectId(warehouseId);
      }
      
      const qcFailed = await GoodsReceiving.countDocuments({
        ...baseQuery,
        status: 'qc_failed'
      });
      
      if (qcFailed > 0) {
        alerts.push({
          type: 'qc_failed',
          message: `${qcFailed} batches failed QC`,
          count: qcFailed
        });
      }

      const lowStock = await Inventory.countDocuments({
        ...baseQuery,
        status: 'low_stock'
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
      
      const [receivingActivities, dispatchActivities] = await Promise.all([
        GoodsReceiving.find(baseQuery)
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('createdBy', 'name'),
        DispatchOrder.find(baseQuery)
          .sort({ createdAt: -1 })
          .limit(5)
          .populate('assignedAgent', 'name')
      ]);

      const activities = [
        ...receivingActivities.map((item: any) => ({
          type: 'inbound',
          message: `Received ${item.quantity} units of ${item.sku}`,
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
          $inc: { quantity: multiplier * product.quantity }
        }
      );
    }
  }

  private calculateInventoryStatus(data: { quantity: number; minStockLevel: number; maxStockLevel: number }): string {
    if (data.quantity <= data.minStockLevel) return 'low_stock';
    if (data.quantity >= data.maxStockLevel * 0.9) return 'active';
    return 'active';
  }

  // ==================== REPORT GENERATION METHODS ====================
  private async generateInventoryTurnoverReport(filters: any): Promise<any> {
    const { warehouse, startDate, endDate } = filters;
    
    if (!warehouse || !Types.ObjectId.isValid(warehouse)) {
      throw new Error('Valid warehouse ID is required');
    }

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
        averageTurnover: turnoverData.length > 0 ? turnoverData.reduce((acc, item) => acc + item.turnoverRate, 0) / turnoverData.length : 0,
        highTurnoverItems: turnoverData.filter((item: any) => item.turnoverRate > 2).length
      }
    };
  }

  private async generateQCSummaryReport(filters: any): Promise<any> {
    const { warehouse, startDate, endDate } = filters;
    
    if (!warehouse || !Types.ObjectId.isValid(warehouse)) {
      throw new Error('Valid warehouse ID is required');
    }

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