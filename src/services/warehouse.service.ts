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
  GRNnumber
} from '../models/Warehouse.model';
import { Types } from 'mongoose';
import { IDispatchOrder, IExpense, IRaisePurchaseOrder, IInventory, IQCTemplate, IReturnOrder, IFieldAgent, IGRNnumber } from '../models/Warehouse.model';

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
  status?: 'active' | 'expired' | 'expiring_soon' | 'archived';
  sku?: string;
  productName?: string;
  po_number?: string;
  expiryStatus?: 'expiring_soon' | 'expired' | 'not_expired' | 'no_expiry';
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
  po_line_items: Array<{
    line_no: number;
    sku: string;
    productName: string;
    quantity: number;
    category: string;
    pack_size: string;
    uom: string;
    unit_price: number;
    expected_delivery_date: Date;
    location: string;
  }>;
  vendor_details: {
    vendor_name: string;
    vendor_billing_name: string;
    vendor_email: string;
    vendor_phone: string;
    vendor_category: string;
    gst_number: string;
    verification_status: string;
    vendor_address: string;
    vendor_contact: string;
    vendor_id: string;
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
  po_number: string; // Changed from batchId to po_number
  warehouse: Types.ObjectId;
  quantity: number;
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

// Update the GRNData interface in your types
export interface GRNData {
  delivery_challan: string;
  transporter_name: string;
  vehicle_number: string;
  received_date?: Date;
  remarks?: string;
  scanned_challan?: string;
  qc_status: 'bad' | 'moderate' | 'excellent';
  quantities?: Array<{ // Make it optional
    sku: string;
    received_quantity: number;
    accepted_quantity: number;
    rejected_quantity: number;
    expiry_date?: Date;
    item_remarks?: string;
  }>;
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
  // In WarehouseService class - update the createPurchaseOrder method
async createPurchaseOrder(data: RaisePurchaseOrderData, createdBy: Types.ObjectId): Promise<IRaisePurchaseOrder> {
  try {
    console.log('📦 Received PO data:', {
      vendor: data.vendor,
      po_line_items_count: data.po_line_items?.length || 0,
      vendor_details_present: data.vendor_details ? 'Yes' : 'No'
    });

    // Validate vendor exists and get vendor details
    const VendorModel = mongoose.model('VendorCreate');
    const vendor = await VendorModel.findById(data.vendor);
    if (!vendor) {
      throw new Error('Vendor not found');
    }

    // Extract vendor details to store in PO document
    const vendorDetails = {
      vendor_name: vendor.vendor_name,
      vendor_billing_name: vendor.vendor_billing_name,
      vendor_email: vendor.vendor_email,
      vendor_phone: vendor.vendor_phone,
      vendor_category: vendor.vendor_category,
      gst_number: vendor.gst_number,
      verification_status: vendor.verification_status,
      vendor_address: vendor.vendor_address,
      vendor_contact: vendor.vendor_contact,
      vendor_id: vendor.vendor_id
    };

    // Create purchase order with vendor details stored directly
    const purchaseOrder = await RaisePurchaseOrder.create({
      vendor: data.vendor,
      vendor_details: vendorDetails,
      po_raised_date: data.po_raised_date || new Date(),
      po_status: data.po_status || 'draft',
      remarks: data.remarks,
      po_line_items: data.po_line_items || [],
      createdBy
    });

    console.log('✅ PO created with vendor details stored in document');
    return purchaseOrder;
  } catch (error) {
    console.error('❌ Error creating PO:', error);
    throw new Error(`Failed to create purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// Update the updatePurchaseOrderStatus method
async updatePurchaseOrderStatus(
  id: string,
  po_status: 'draft' | 'approved' | 'delivered', // Updated to match new enum
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
  .populate('vendor', 'vendor_name vendor_email')
  .populate('createdBy', 'name email');

  // If status is updated to 'delivered', inventory will be automatically created via the post-save middleware

  return updatedPO;
}

  // In createGRN method - update the status check
// In services/warehouse.service.ts - Update GRN methods

// Update the createGRN method to handle the new workflow
// In services/warehouse.service.ts - Update createGRN method

// services/warehouse.service.ts - COMPLETELY REPLACE the createGRN method
// services/warehouse.service.ts - FIX the createGRN method

async createGRN(purchaseOrderId: string, grnData: GRNData, createdBy: Types.ObjectId): Promise<IGRNnumber> {
  try {
    console.log('📦 Creating GRN for PO:', purchaseOrderId);

    // Validate ObjectId
    if (!Types.ObjectId.isValid(purchaseOrderId)) {
      throw new Error('Invalid purchase order ID');
    }

    // Validate GRN data
    if (!grnData.delivery_challan || !grnData.transporter_name || !grnData.vehicle_number) {
      throw new Error('Missing required GRN fields: delivery_challan, transporter_name, vehicle_number');
    }

    // Validate purchase order exists and is approved
    const purchaseOrder = await RaisePurchaseOrder.findById(purchaseOrderId)
      .populate('vendor');
    
    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    // Only allow GRN creation for approved POs
    if (purchaseOrder.po_status !== 'approved') {
      throw new Error('Cannot create GRN for non-approved purchase order. PO must be approved first.');
    }

    // Check if GRN already exists for this PO
    const existingGRN = await GRNnumber.findOne({ purchase_order: purchaseOrderId });
    if (existingGRN) {
      throw new Error('GRN already exists for this purchase order');
    }

    // FIX: Proper date handling
    const receivedDate = grnData.received_date ? new Date(grnData.received_date) : new Date();
    
    // Generate GRN number manually (PO number + date)
    const poNumber = purchaseOrder.po_number;
    const dateStr = receivedDate.toISOString().split('T')[0].replace(/-/g, '');
    const grnNumber = `${poNumber}-${dateStr}`;

    console.log('🔢 Generated GRN number:', grnNumber);

    // Create GRN with quantities
    const grnPayload = {
      grn_number: grnNumber,
      purchase_order: purchaseOrderId,
      delivery_challan: grnData.delivery_challan,
      transporter_name: grnData.transporter_name,
      vehicle_number: grnData.vehicle_number,
      received_date: receivedDate, // Use the Date object
      remarks: grnData.remarks,
      scanned_challan: grnData.scanned_challan,
      qc_status: grnData.qc_status,
      
      vendor: purchaseOrder.vendor,
      vendor_details: purchaseOrder.vendor_details,
      
      // Build line items with quantities
      grn_line_items: purchaseOrder.po_line_items.map(item => {
        // Find quantity data for this SKU if provided
        const quantityData = grnData.quantities?.find(q => q.sku === item.sku);
        
        // FIX: Handle expiry_date conversion if it's a string
        let expiryDate = quantityData?.expiry_date;
        if (expiryDate && typeof expiryDate === 'string') {
          expiryDate = new Date(expiryDate);
        }
        
        return {
          sku: item.sku,
          productName: item.productName,
          ordered_quantity: item.quantity,
          unit_price: item.unit_price,
          
          // Use provided quantities or default to 0
          received_quantity: quantityData?.received_quantity || 0,
          accepted_quantity: quantityData?.accepted_quantity || 0,
          rejected_quantity: quantityData?.rejected_quantity || 0,
          
          category: item.category,
          uom: item.uom,
          
          // Use the converted date
          expiry_date: expiryDate,
          item_remarks: quantityData?.item_remarks
        };
      }),
      
      createdBy
    };

    console.log('📦 Creating GRN with payload...');

    // STEP 1: Create the GRN
    const grn = await GRNnumber.create(grnPayload);
    console.log('✅ GRN created:', grn.grn_number);

    // STEP 2: Update PO status to 'delivered'
    await RaisePurchaseOrder.findByIdAndUpdate(purchaseOrderId, {
      po_status: 'delivered'
    });
    console.log('✅ PO status updated to delivered');

    // STEP 3: MANUALLY CREATE INVENTORY ITEMS
    console.log('🏗️ Creating inventory items from GRN...');
    await this.createInventoryFromGRN(grn);

    // Populate for response
    const populatedGRN = await GRNnumber.findById(grn._id)
      .populate('vendor')
      .populate('purchase_order')
      .populate('createdBy', 'name email');

    console.log('🎉 GRN creation process completed successfully!');
    return populatedGRN as IGRNnumber;
  } catch (error) {
    console.error('❌ Error creating GRN:', error);
    throw new Error(`Failed to create GRN: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
// services/warehouse.service.ts - ADD this method

// services/warehouse.service.ts - FIX the createInventoryFromGRN method

private async createInventoryFromGRN(grn: IGRNnumber): Promise<void> {
  try {
    console.log('📦 Creating inventory from GRN:', grn.grn_number);
    
    const poNumber = grn.grn_number.split('-')[0];
    let createdCount = 0;
    let updatedCount = 0;

    // Process each line item that has accepted quantity > 0
    for (const lineItem of grn.grn_line_items) {
      if (lineItem.accepted_quantity > 0) {
        console.log(`Processing: ${lineItem.sku} - Accepted Qty: ${lineItem.accepted_quantity}`);
        
        // FIX: Handle expiry_date conversion
        let expiryDate = lineItem.expiry_date;
        if (expiryDate && typeof expiryDate === 'string') {
          expiryDate = new Date(expiryDate);
        }
        
        // Check if inventory item already exists for this SKU and PO
        const existingInventory = await Inventory.findOne({
          sku: lineItem.sku,
          po_number: poNumber
        });
        
        if (!existingInventory) {
          // Create new inventory entry
          await Inventory.create({
            sku: lineItem.sku,
            productName: lineItem.productName,
            po_number: poNumber,
            quantity: lineItem.accepted_quantity,
            expiry_date: expiryDate, // Use the converted date
            minStockLevel: 0,
            maxStockLevel: 1000,
            isArchived: false,
            createdBy: grn.createdBy
          });
          createdCount++;
          console.log(`✅ Created NEW inventory for ${lineItem.sku}`);
        } else {
          // Update existing inventory quantity
          await Inventory.findByIdAndUpdate(existingInventory._id, {
            $inc: { quantity: lineItem.accepted_quantity },
            ...(expiryDate && { expiry_date: expiryDate }),
            updatedAt: new Date()
          });
          updatedCount++;
          console.log(`📈 Updated EXISTING inventory for ${lineItem.sku}`);
        }
      }
    }
    
    console.log(`🎯 Inventory creation summary:`);
    console.log(`   New items created: ${createdCount}`);
    console.log(`   Existing items updated: ${updatedCount}`);
    console.log(`   Total processed: ${createdCount + updatedCount}`);
    
  } catch (error) {
    console.error('❌ Error creating inventory from GRN:', error);
    throw error;
  }
}
// New method to update GRN quantities
async updateGRNQuantities(
  grnId: string,
  lineItems: Array<{
    line_no: number;
    received_quantity: number;
    accepted_quantity: number;
    rejected_quantity: number;
  }>
): Promise<IGRNnumber> {
  try {
    if (!Types.ObjectId.isValid(grnId)) {
      throw new Error('Invalid GRN ID');
    }

    const grn = await GRNnumber.findById(grnId);
    if (!grn) {
      throw new Error('GRN not found');
    }

    // Update each line item
    lineItems.forEach(item => {
      const lineItem = grn.grn_line_items.find((li: any) => li.line_no === item.line_no);
      
      if (lineItem) {
        lineItem.received_quantity = item.received_quantity;
        lineItem.accepted_quantity = item.accepted_quantity;
        lineItem.rejected_quantity = item.rejected_quantity;
        
        // Validate that received = accepted + rejected
        if (item.received_quantity !== item.accepted_quantity + item.rejected_quantity) {
          throw new Error(`Received quantity (${item.received_quantity}) must equal accepted (${item.accepted_quantity}) + rejected (${item.rejected_quantity}) for line ${item.line_no}`);
        }
      }
    });

    await grn.save();

    const populatedGRN = await GRNnumber.findById(grn._id)
      .populate('vendor')
      .populate('purchase_order')
      .populate('createdBy', 'name email');

    console.log(`✅ GRN ${grnId} quantities updated successfully`);
    return populatedGRN as IGRNnumber;
  } catch (error) {
    console.error('❌ Error updating GRN quantities:', error);
    throw new Error(`Failed to update GRN quantities: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
  // Helper method to generate unique GRN number
  private async generateGRNNumber(): Promise<string> {
    let isUnique = false;
    let grnNumber = '';
    let attempts = 0;
    const maxAttempts = 10;

    while (!isUnique && attempts < maxAttempts) {
      attempts++;
      
      // Generate 8-digit number with leading zeros
      const randomNum = Math.floor(10000000 + Math.random() * 90000000);
      grnNumber = `GRN${randomNum}`;
      
      // Check if GRN number already exists
      const existingGRN = await GRNnumber.findOne({ grn_number: grnNumber });
      if (!existingGRN) {
        isUnique = true;
      }
    }

    if (!isUnique) {
      throw new Error('Failed to generate unique GRN number after multiple attempts');
    }

    return grnNumber;
  }
// services/warehouse.service.ts - Add this method to your WarehouseService class

async deletePurchaseOrder(id: string): Promise<void> {
  try {
    if (!Types.ObjectId.isValid(id)) {
      throw new Error('Invalid purchase order ID');
    }

    const purchaseOrder = await RaisePurchaseOrder.findById(id);
    if (!purchaseOrder) {
      throw new Error('Purchase order not found');
    }

    // Check if GRN exists for this PO (prevent deletion if GRN exists)
    const existingGRN = await GRNnumber.findOne({ purchase_order: id });
    if (existingGRN) {
      throw new Error('Cannot delete purchase order - GRN already exists for this PO');
    }

    // Check if PO status allows deletion (you might want to restrict deletion of approved POs)
    if (purchaseOrder.po_status === 'approved') {
      throw new Error('Cannot delete approved purchase order');
    }

    await RaisePurchaseOrder.findByIdAndDelete(id);
    
    console.log(`✅ Purchase order ${id} deleted successfully`);
  } catch (error) {
    console.error('❌ Error deleting purchase order:', error);
    throw new Error(`Failed to delete purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
  async getGRNById(grnId: string): Promise<IGRNnumber | null> {
    try {
      if (!Types.ObjectId.isValid(grnId)) {
        console.warn('⚠️ Invalid GRN ID format:', grnId);
        return null;
      }

      const grn = await GRNnumber.findById(grnId)
        .populate('vendor')
        .populate('purchase_order')
        .populate('createdBy', 'name email');

      if (!grn) {
        console.warn('⚠️ GRN not found with ID:', grnId);
        return null;
      }

      return grn;
    } catch (error) {
      console.error('❌ Error fetching GRN by ID:', error);
      throw new Error(`Failed to fetch GRN: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async getGRNs(filters?: {
    qc_status?: 'bad' | 'moderate' | 'excellent';
    transporter_name?: string;
    startDate?: string;
    endDate?: string;
    vendor?: string;
    purchase_order?: string;
  }): Promise<IGRNnumber[]> {
    try {
      let query: any = {};

      // QC Status filter
      if (filters?.qc_status) {
        query.qc_status = filters.qc_status;
      }

      // Transporter name filter (case-insensitive)
      if (filters?.transporter_name) {
        query.transporter_name = { 
          $regex: filters.transporter_name.trim(), 
          $options: 'i' 
        };
      }

      // Date range filter
      if (filters?.startDate || filters?.endDate) {
        query.recieved_date = {};
        if (filters.startDate) {
          query.recieved_date.$gte = new Date(filters.startDate);
        }
        if (filters.endDate) {
          // Set to end of day for end date
          const endDate = new Date(filters.endDate);
          endDate.setHours(23, 59, 59, 999);
          query.recieved_date.$lte = endDate;
        }
      }

      // Vendor filter
      if (filters?.vendor && Types.ObjectId.isValid(filters.vendor)) {
        query.vendor = new Types.ObjectId(filters.vendor);
      }

      // Purchase order filter
      if (filters?.purchase_order && Types.ObjectId.isValid(filters.purchase_order)) {
        query.purchase_order = new Types.ObjectId(filters.purchase_order);
      }

      const grns = await GRNnumber.find(query)
        .populate('vendor')
        .populate('purchase_order')
        .populate('createdBy', 'name email')
        .sort({ recieved_date: -1, createdAt: -1 });

      console.log(`✅ Found ${grns.length} GRNs with applied filters`);
      return grns;
    } catch (error) {
      console.error('❌ Error fetching GRNs:', error);
      throw new Error(`Failed to fetch GRNs: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async updateGRNStatus(
    grnId: string, 
    qc_status: 'bad' | 'moderate' | 'excellent', 
    remarks?: string,
    lineItems?: Array<{
      line_no: number;
      received_quantity: number;
      accepted_quantity: number;
      rejected_quantity: number;
    }>
  ): Promise<IGRNnumber> {
    try {
      if (!Types.ObjectId.isValid(grnId)) {
        throw new Error('Invalid GRN ID');
      }

      const updateData: any = { 
        qc_status,
        updatedAt: new Date()
      };

      if (remarks) {
        updateData.remarks = remarks;
      }

      // Update line items if provided
      if (lineItems && lineItems.length > 0) {
        const grn = await GRNnumber.findById(grnId);
        if (!grn) {
          throw new Error('GRN not found');
        }
;

        updateData.grn_line_items = grn.grn_line_items;
      }

      const updatedGRN = await GRNnumber.findByIdAndUpdate(
        grnId,
        updateData,
        { new: true, runValidators: true }
      )
      .populate('vendor')
      .populate('purchase_order')
      .populate('createdBy', 'name email');

      if (!updatedGRN) {
        throw new Error('GRN not found');
      }

      console.log(`✅ GRN ${grnId} status updated to: ${qc_status}`);
      return updatedGRN;
    } catch (error) {
      console.error('❌ Error updating GRN status:', error);
      throw new Error(`Failed to update GRN status: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  // New method to update GRN line items
  async updateGRNLineItems(
    grnId: string,
    lineItems: Array<{
      line_no: number;
      received_quantity: number;
      accepted_quantity: number;
      rejected_quantity: number;
    }>
  ): Promise<IGRNnumber> {
    try {
      if (!Types.ObjectId.isValid(grnId)) {
        throw new Error('Invalid GRN ID');
      }

      const grn = await GRNnumber.findById(grnId);
      if (!grn) {
        throw new Error('GRN not found');
      }

      // Validate line items
      lineItems.forEach(item => {
        if (item.received_quantity < 0 || item.accepted_quantity < 0 || item.rejected_quantity < 0) {
          throw new Error('Quantities cannot be negative');
        }
        
        if (item.received_quantity !== item.accepted_quantity + item.rejected_quantity) {
          throw new Error(`Received quantity must equal accepted + rejected for line ${item.line_no}`);
        }
      });

      grn.updatedAt = new Date();
      await grn.save();

      const populatedGRN = await GRNnumber.findById(grn._id)
        .populate('vendor')
        .populate('purchase_order')
        .populate('createdBy', 'name email');

      console.log(`✅ GRN ${grnId} line items updated successfully`);
      return populatedGRN as IGRNnumber;
    } catch (error) {
      console.error('❌ Error updating GRN line items:', error);
      throw new Error(`Failed to update GRN line items: ${error instanceof Error ? error.message : 'Unknown error'}`);
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


 // Update inventory upsert method to handle new schema
async upsertInventory(data: {
  sku: string;
  productName: string;
  po_number: string;
  warehouse: Types.ObjectId;
  quantity: number;
  createdBy: Types.ObjectId;
}): Promise<void> {
  const existingInventory = await Inventory.findOne({
    sku: data.sku,
    po_number: data.po_number,
    warehouse: data.warehouse
  });

  if (existingInventory) {
    await Inventory.findByIdAndUpdate(existingInventory._id, {
      $inc: { quantity: data.quantity },
      updatedAt: new Date()
    });
  } else {
    await Inventory.create({
      ...data,
      minStockLevel: 0,
      maxStockLevel: 1000,
      isArchived: false
    });
  }
}
// services/warehouse.service.ts - Remove all warehouse references

async getInventoryDashboard(
  filters: InventoryDashboardFilters = {}, 
  page: number = 1, 
  limit: number = 50
): Promise<InventoryDashboardResponse> {
  let query: any = {};
  
  if (filters.archived !== undefined) {
    query.isArchived = filters.archived;
  } else {
    query.isArchived = false;
  }

  // SKU filter
  if (filters.sku) {
    query.sku = { $regex: filters.sku, $options: 'i' };
  }

  // Product name filter
  if (filters.productName) {
    query.productName = { $regex: filters.productName, $options: 'i' };
  }

  // PO number filter
  if (filters.po_number) {
    query.po_number = { $regex: filters.po_number, $options: 'i' };
  }

  // Expiry status filter
  if (filters.expiryStatus) {
    switch (filters.expiryStatus) {
      case 'expiring_soon':
        query.age = { $lte: 30, $gte: 0 };
        break;
      case 'expired':
        query.age = { $lt: 0 };
        break;
      case 'not_expired':
        query.age = { $gte: 0 };
        break;
      case 'no_expiry':
        query.expiry_date = { $exists: false };
        break;
    }
  }

  // Quantity range filter
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
  
  const sortField = filters.sortBy || 'age';
  const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;

  const inventory = await Inventory.find(query)
    .populate('createdBy', 'name email') // REMOVED warehouse populate
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

// Fixed inventory stats - remove warehouse completely
async getInventoryStats(): Promise<InventoryStats> {
  const [
    totalItems,
    activeItems,
    archivedItems,
    lowStockItems,
    expiredItems,
    nearExpiryItems,
    stockValueResult
  ] = await Promise.all([
    Inventory.countDocuments(),
    Inventory.countDocuments({ isArchived: false }),
    Inventory.countDocuments({ isArchived: true }),
    Inventory.countDocuments({ 
      quantity: { $lte: 10 },
      isArchived: false 
    }),
    // Expired items (age < 0)
    Inventory.countDocuments({ 
      age: { $lt: 0 },
      isArchived: false 
    }),
    // Near expiry items (0-30 days)
    Inventory.countDocuments({
      age: { $lte: 30, $gte: 0 },
      isArchived: false
    }),
    Inventory.aggregate([
      { $match: { isArchived: false } },
      { $group: { _id: null, totalValue: { $sum: { $multiply: ['$quantity', 100] } } } }
    ])
  ]);

  const statusBreakdownObj: { [key: string]: number } = {
    'active': activeItems,
    'archived': archivedItems,
    'expired': expiredItems,
    'near_expiry': nearExpiryItems
  };

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
  
async getInventoryById(inventoryId: string): Promise<IInventory | null> {
  if (!Types.ObjectId.isValid(inventoryId)) {
    throw new Error('Invalid inventory ID');
  }
  
  return await Inventory.findById(inventoryId)
    .populate('createdBy', 'name email'); // REMOVED warehouse populate
}
  
 async archiveInventoryItem(inventoryId: string): Promise<IInventory> {
  if (!Types.ObjectId.isValid(inventoryId)) {
    throw new Error('Invalid inventory ID');
  }

  const updated = await Inventory.findByIdAndUpdate(
    inventoryId,
    { 
      isArchived: true,
      archivedAt: new Date()
    },
    { new: true }
  ).populate('createdBy', 'name email'); // REMOVED warehouse populate

  if (!updated) {
    throw new Error('Inventory item not found');
  }

  return updated;
}

async unarchiveInventoryItem(inventoryId: string): Promise<IInventory> {
  if (!Types.ObjectId.isValid(inventoryId)) {
    throw new Error('Invalid inventory ID');
  }

  const updated = await Inventory.findByIdAndUpdate(
    inventoryId,
    { 
      isArchived: false,
      archivedAt: null
    },
    { new: true }
  ).populate('createdBy', 'name email'); // REMOVED warehouse populate

  if (!updated) {
    throw new Error('Inventory item not found');
  }

  return updated;
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
// services/warehouse.service.ts
async createInventoryItem(data: {
  sku: string;
  productName: string;
  po_number: string;
  quantity: number;
  expiry_date?: Date;
  minStockLevel?: number;
  maxStockLevel?: number;
}, createdBy: Types.ObjectId): Promise<IInventory> {
  try {
    const inventory = await Inventory.create({
      ...data,
      minStockLevel: data.minStockLevel || 0,
      maxStockLevel: data.maxStockLevel || 1000,
      isArchived: false,
      createdBy
    });

    return inventory;
  } catch (error) {
    console.error('❌ Error creating inventory:', error);
    throw new Error(`Failed to create inventory: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
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
        maxStockLevel: item.maxStockLevel
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

  private async getStockAgeingReport(warehouseId: string): Promise<any> {
    const ageingBuckets = {
      '0-30 days': 0,
      '31-60 days': 0,
      '61-90 days': 0,
      '90+ days': 0
    };

    const inventory = await Inventory.find({
      warehouse: new Types.ObjectId(warehouseId),
      isArchived: false
    });

    return {
      report: 'stock_ageing',
      ageingBuckets,
      totalItems: inventory.length,
      generatedOn: new Date()
    };
  }

  // Update inventory summary report
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

  const inventoryData = await Inventory.find(inventoryQuery)
    .populate('warehouse', 'name code');

  const totalSKUs = await Inventory.distinct('sku', { 
    warehouse: new Types.ObjectId(warehouseId),
    isArchived: false 
  }).then(skus => skus.length);

  const stockOutSKUs = await Inventory.countDocuments({
    warehouse: new Types.ObjectId(warehouseId),
    quantity: { $lte: 0 },
    isArchived: false
  });

  const poQuery: any = {};
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
    return sum + (item.quantity * 100); // Using default unit price
  }, 0);

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
      lowStockItems: await Inventory.countDocuments({
        warehouse: new Types.ObjectId(warehouseId),
        quantity: { $lte: 10 },
        isArchived: false
      }),
      nearExpirySKUs: 0, // No longer tracked
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
    const rejectedPOs = purchaseOrders.filter(po => po.po_status === 'draft').length;
    
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
      quantity: { $lte: 10 }, // Low stock threshold
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
  private async validateSkuStock(products: { sku: string; quantity: number }[]): Promise<void> {
  for (const product of products) {
    const inventory = await Inventory.findOne({
      sku: product.sku,
      isArchived: false,
      quantity: { $gte: product.quantity }
    });

    if (!inventory) {
      throw new Error(
        `Insufficient stock for ${product.sku}. Available: ${inventory?.quantity || 0}, Requested: ${product.quantity}`
      );
    }
  }
}
}

export const warehouseService = new WarehouseService();