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
  GRNnumber,
  Warehouse
} from '../models/Warehouse.model';
import { Types } from 'mongoose';
import { IDispatchOrder, IExpense, IRaisePurchaseOrder, IInventory, IQCTemplate, IReturnOrder, IFieldAgent, IGRNnumber } from '../models/Warehouse.model';
import { DocumentUploadService } from './documentUpload.service';

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
  warehouse: string; // Warehouse ID (required - ensures inventory is created properly)
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
  warehouse: Types.ObjectId;
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
  warehouse: Types.ObjectId;
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

export interface GRNData {
  delivery_challan: string;
  transporter_name: string;
  vehicle_number: string;
  recieved_date: Date;
  remarks?: string;
  scanned_challan?: string;
  qc_status: 'bad' | 'moderate' | 'excellent';
  quantities?: Array<{
    sku: string;
    received_quantity: number;
    accepted_quantity: number;
    rejected_quantity: number;
    expiry_date?: string;
    item_remarks?: string;
  }>;
}

class WarehouseService {
  private documentUploadService: DocumentUploadService;

  constructor() {
    this.documentUploadService = new DocumentUploadService();
  }

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
  async createPurchaseOrder(data: RaisePurchaseOrderData, createdBy: Types.ObjectId): Promise<IRaisePurchaseOrder> {
    try {
      console.log('📦 Received PO data:', {
        vendor: data.vendor,
        warehouse: data.warehouse,
        po_line_items_count: data.po_line_items?.length || 0,
        vendor_details_present: data.vendor_details ? 'Yes' : 'No'
      });

      // Validate vendor exists and get vendor details
      const VendorModel = mongoose.model('VendorCreate');
      const vendor = await VendorModel.findById(data.vendor);
      if (!vendor) {
        throw new Error('Vendor not found');
      }

      // Validate and use provided warehouse ID (now required)
      if (!data.warehouse) {
        throw new Error('Warehouse ID is required when creating a purchase order');
      }

      const warehouseId = new Types.ObjectId(data.warehouse);
      console.log('🏢 Using warehouse ID:', warehouseId);

      // Verify warehouse exists and is active
      const warehouseExists = await Warehouse.findOne({
        _id: warehouseId,
        isActive: true
      });

      if (!warehouseExists) {
        throw new Error('Warehouse not found or inactive');
      }

      // Extract vendor details to store in PO document
      const vendorDetails = {
        vendor_name: vendor.vendor_name,
        vendor_billing_name: vendor.vendor_billing_name,
        vendor_email: vendor.vendor_email,
        vendor_phone: vendor.contact_phone,
        vendor_category: vendor.vendor_category,
        gst_number: vendor.gst_number,
        verification_status: vendor.verification_status,
        vendor_address: vendor.vendor_address,
        vendor_contact: vendor.primary_contact_name,
        vendor_id: vendor.vendor_id
      };

      // Create purchase order with vendor details and warehouse stored directly
      const purchaseOrder = await RaisePurchaseOrder.create({
        vendor: data.vendor,
        warehouse: warehouseId, // Add warehouse ID
        vendor_details: vendorDetails,
        po_raised_date: data.po_raised_date || new Date(),
        po_status: data.po_status || 'draft',
        remarks: data.remarks,
        po_line_items: data.po_line_items || [],
        createdBy
      });

      console.log('✅ PO created with vendor details and warehouse stored in document');
      return purchaseOrder;
    } catch (error) {
      console.error('❌ Error creating PO:', error);
      throw new Error(`Failed to create purchase order: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  async createGRN(purchaseOrderId: string, grnData: GRNData, createdBy: Types.ObjectId, uploadedFile?: Express.Multer.File): Promise<IGRNnumber> {
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

      if (purchaseOrder.po_status !== 'approved') {
        throw new Error('Cannot create GRN for non-approved purchase order');
      }

      // Check if GRN already exists for this PO using purchase_order field
      const existingGRN = await GRNnumber.findOne({ purchase_order: purchaseOrderId });
      if (existingGRN) {
        throw new Error('GRN already exists for this purchase order');
      }

      // Generate unique GRN number
      const grnNumber = await this.generateGRNNumber();

      // Handle scanned challan upload
      let scannedChallanUrl = grnData.scanned_challan;
      if (uploadedFile) {
        console.log('📤 Uploading scanned challan to Cloudinary...');
        const documentUploadService = new DocumentUploadService();
        const uploadResult = await documentUploadService.uploadToCloudinary(
          uploadedFile.buffer,
          uploadedFile.originalname,
          'frovo/grn_challans'
        );
        scannedChallanUrl = uploadResult.url;
        console.log('✅ Scanned challan uploaded:', uploadResult.url);
      }

      // Create GRN with proper structure
      const grnPayload = {
        grn_number: grnNumber,
        purchase_order: purchaseOrderId,
        delivery_challan: grnData.delivery_challan,
        transporter_name: grnData.transporter_name,
        vehicle_number: grnData.vehicle_number,
        recieved_date: grnData.recieved_date,
        remarks: grnData.remarks,
        scanned_challan: scannedChallanUrl, // Use uploaded URL or provided URL
        qc_status: grnData.qc_status,
        
        // Copy vendor information from PO
        vendor: purchaseOrder.vendor,
        vendor_details: purchaseOrder.vendor_details,
        
        // Copy and transform line items
        grn_line_items: purchaseOrder.po_line_items.map(item => {
          // Find matching quantity data from frontend
          const quantityData = grnData.quantities?.find((q: any) => q.sku === item.sku);

          return {
            line_no: item.line_no,
            sku: item.sku,
            productName: item.productName,
            quantity: item.quantity,
            category: item.category,
            pack_size: item.pack_size,
            uom: item.uom,
            unit_price: item.unit_price,
            expected_delivery_date: item.expected_delivery_date,
            location: item.location,
            received_quantity: quantityData?.received_quantity || 0,
            accepted_quantity: quantityData?.accepted_quantity || 0,
            rejected_quantity: quantityData?.rejected_quantity || 0
          };
        }),
        
        createdBy,
        po_status: 'received'
      };

      const grn = await GRNnumber.create(grnPayload);

      // Update purchase order status to 'received'
      await RaisePurchaseOrder.findByIdAndUpdate(
        purchaseOrderId,
        { po_status: 'received' }
      );

      console.log('✅ GRN created successfully:', grn.delivery_challan);

      // Get warehouse ID from purchase order
      const warehouseId = purchaseOrder.warehouse;

      if (!warehouseId) {
        console.warn('⚠️  Warning: Purchase order does not have warehouse assigned. Skipping inventory creation.');
        console.warn('   Please add warehouse field to existing POs for inventory tracking.');
      } else {
        // Add inventory for each line item
        console.log('📦 Adding inventory from GRN to warehouse:', warehouseId);
        for (const item of purchaseOrder.po_line_items) {
          const existingInventory = await Inventory.findOne({
            sku: item.sku,
            warehouse: warehouseId // ✅ Using correct warehouse ID from PO
          });

          if (existingInventory) {
            // Update existing inventory
            await Inventory.findByIdAndUpdate(existingInventory._id, {
              $inc: { quantity: item.quantity }
            });
            console.log(`  ✅ Updated inventory for ${item.sku}: +${item.quantity}`);
          } else {
            // Create new inventory
            await Inventory.create({
              sku: item.sku,
              productName: item.productName,
              batchId: grn.delivery_challan, // Use delivery challan as batch ID
              warehouse: warehouseId, // ✅ Using correct warehouse ID from PO
              quantity: item.quantity,
              minStockLevel: 0,
              maxStockLevel: 10000,
              age: 0,
              location: {
                zone: item.location || 'A',
                aisle: '1',
                rack: '1',
                bin: '1'
              },
              status: 'active',
              isArchived: false,
              createdBy
            });
            console.log(`  ✅ Created inventory for ${item.sku}: ${item.quantity} units`);
          }
        }
      }

      // Populate vendor details for response
      const populatedGRN = await GRNnumber.findById(grn._id)
        .populate('vendor')
        .populate('purchase_order')
        .populate('createdBy', 'name email');

      return populatedGRN as IGRNnumber;
    } catch (error) {
      console.error('❌ Error creating GRN:', error);
      throw new Error(`Failed to create GRN: ${error instanceof Error ? error.message : 'Unknown error'}`);
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

        // Update each line item
        lineItems.forEach(updateItem => {
          const existingItem = grn.grn_line_items.find(
            item => item.line_no === updateItem.line_no
          );
        });

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

      // Update line items
      lineItems.forEach(updateItem => {
        const existingItem = grn.grn_line_items.find(
          item => item.line_no === updateItem.line_no
        );
      }
      );

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
      warehouse: data.warehouse,
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
      warehouse: data.warehouse,
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

  async uploadExpenseBill(
    expenseId: string,
    file: Express.Multer.File
  ): Promise<IExpense> {
    // Validate expense ID
    if (!Types.ObjectId.isValid(expenseId)) {
      throw new Error('Invalid expense ID');
    }

    // Find expense
    const expense = await Expense.findById(expenseId);
    if (!expense) {
      throw new Error('Expense not found');
    }

    // Upload to Cloudinary
    const { url } = await this.documentUploadService.uploadToCloudinary(
      file.buffer,
      file.originalname,
      `frovo/expenses/${expenseId}`
    );

    // Update expense with bill URL
    expense.billUrl = url;
    await expense.save();

    // Return populated expense
    return await Expense.findById(expenseId)
      .populate('vendor', 'vendor_name vendor_email vendor_contact')
      .populate('warehouseId', 'name code location')
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .then(e => e!);
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

    inventory.forEach(item => {
      const age = item.age || 0;
      if (age <= 30) {
        ageingBuckets['0-30 days']++;
      } else if (age <= 60) {
        ageingBuckets['31-60 days']++;
      } else if (age <= 90) {
        ageingBuckets['61-90 days']++;
      } else {
        ageingBuckets['90+ days']++;
      }
    });

    return {
      report: 'stock_ageing',
      ageingBuckets,
      totalItems: inventory.length,
      generatedOn: new Date()
    };
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

  // ==================== WAREHOUSE MANAGEMENT ====================
  async createWarehouse(data: {
    name: string;
    code: string;
    partner: string;
    location: string;
    capacity: number;
    manager: Types.ObjectId;
  }, createdBy: Types.ObjectId) {
    const { Warehouse } = await import('../models/Warehouse.model');

    // Check if warehouse code already exists
    const existingWarehouse = await Warehouse.findOne({ code: data.code });
    if (existingWarehouse) {
      throw new Error('Warehouse with this code already exists');
    }

    const warehouse = await Warehouse.create({
      ...data,
      isActive: true,
      createdBy
    });

    return await Warehouse.findById(warehouse._id)
      .populate('manager', 'name email phone')
      .populate('createdBy', 'name email');
  }

  async getWarehouses(filters: {
    page?: number;
    limit?: number;
    search?: string;
    isActive?: boolean;
    partner?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }, userId: Types.ObjectId, userRoles: any[]) {
    const { Warehouse } = await import('../models/Warehouse.model');

    const page = filters.page || 1;
    const limit = filters.limit || 10;
    const skip = (page - 1) * limit;

    // Build query
    const query: any = {};

    // Role-based filtering: Warehouse managers only see their warehouses
    const isWarehouseManager = userRoles.some(
      (role: any) => role.systemRole === 'warehouse_manager'
    );

    if (isWarehouseManager) {
      query.manager = userId;
    }

    // Apply filters
    if (filters.search) {
      query.$or = [
        { name: { $regex: filters.search, $options: 'i' } },
        { code: { $regex: filters.search, $options: 'i' } },
        { location: { $regex: filters.search, $options: 'i' } }
      ];
    }

    if (filters.isActive !== undefined) {
      query.isActive = filters.isActive;
    }

    if (filters.partner) {
      query.partner = { $regex: filters.partner, $options: 'i' };
    }

    // Sorting
    const sortBy = filters.sortBy || 'createdAt';
    const sortOrder = filters.sortOrder === 'asc' ? 1 : -1;
    const sort: any = { [sortBy]: sortOrder };

    const [warehouses, total] = await Promise.all([
      Warehouse.find(query)
        .populate('manager', 'name email phone')
        .populate('createdBy', 'name email')
        .sort(sort)
        .skip(skip)
        .limit(limit),
      Warehouse.countDocuments(query)
    ]);

    return {
      warehouses,
      pagination: {
        total,
        page,
        limit,
        pages: Math.ceil(total / limit)
      }
    };
  }

  async getWarehouseById(warehouseId: string, userId: Types.ObjectId, userRoles: any[]) {
    const { Warehouse } = await import('../models/Warehouse.model');

    if (!Types.ObjectId.isValid(warehouseId)) {
      throw new Error('Invalid warehouse ID');
    }

    const warehouse = await Warehouse.findById(warehouseId)
      .populate('manager', 'name email phone')
      .populate('createdBy', 'name email');

    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    // Role-based access: Warehouse managers can only view their warehouses
    const isWarehouseManager = userRoles.some(
      (role: any) => role.systemRole === 'warehouse_manager'
    );

    if (isWarehouseManager && warehouse.manager?.toString() !== userId.toString()) {
      throw new Error('Access denied: You can only view your assigned warehouse');
    }

    return warehouse;
  }

  async updateWarehouse(
    warehouseId: string,
    updateData: Partial<{
      name: string;
      code: string;
      partner: string;
      location: string;
      capacity: number;
      manager: Types.ObjectId;
      isActive: boolean;
    }>
  ) {
    const { Warehouse } = await import('../models/Warehouse.model');

    if (!Types.ObjectId.isValid(warehouseId)) {
      throw new Error('Invalid warehouse ID');
    }

    // Check if updating code and if it already exists
    if (updateData.code) {
      const existingWarehouse = await Warehouse.findOne({
        code: updateData.code,
        _id: { $ne: warehouseId }
      });
      if (existingWarehouse) {
        throw new Error('Warehouse with this code already exists');
      }
    }

    const warehouse = await Warehouse.findByIdAndUpdate(
      warehouseId,
      { $set: updateData },
      { new: true, runValidators: true }
    )
      .populate('manager', 'name email phone')
      .populate('createdBy', 'name email');

    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    return warehouse;
  }

  async deleteWarehouse(warehouseId: string) {
    const { Warehouse } = await import('../models/Warehouse.model');

    if (!Types.ObjectId.isValid(warehouseId)) {
      throw new Error('Invalid warehouse ID');
    }

    // Check if warehouse has active inventory
    const inventoryCount = await Inventory.countDocuments({
      warehouse: warehouseId,
      isArchived: false
    });

    if (inventoryCount > 0) {
      throw new Error('Cannot delete warehouse with active inventory. Please archive or transfer inventory first.');
    }

    const warehouse = await Warehouse.findByIdAndDelete(warehouseId);

    if (!warehouse) {
      throw new Error('Warehouse not found');
    }

    return { message: 'Warehouse deleted successfully', warehouse };
  }

  // Get warehouse assigned to a specific manager (for warehouse manager to know their warehouse)
  async getMyWarehouse(managerId: Types.ObjectId | string) {
    // Convert to ObjectId if it's a string to ensure proper comparison
    const managerObjectId = typeof managerId === 'string'
      ? new Types.ObjectId(managerId)
      : managerId;

    console.log('🔍 Looking for warehouse with manager ID:', managerObjectId.toString());

    const warehouse = await Warehouse.findOne({
      manager: managerObjectId,
      isActive: true
    })
      .populate('manager', 'name email phone')
      .populate('createdBy', 'name email')
      .lean();

    if (!warehouse) {
      // Debug: Check if warehouse exists with any status
      const anyWarehouse = await Warehouse.findOne({
        manager: managerObjectId
      }).lean();

      if (anyWarehouse) {
        console.log('⚠️  Warehouse found but isActive:', (anyWarehouse as any).isActive);
        throw new Error('Warehouse assigned to this manager is not active');
      }

      console.log('❌ No warehouse found for manager ID:', managerObjectId.toString());
      throw new Error('No warehouse assigned to this manager');
    }

    console.log('✅ Warehouse found:', (warehouse as any).code);
    return warehouse;
  }
}

export const warehouseService = new WarehouseService();