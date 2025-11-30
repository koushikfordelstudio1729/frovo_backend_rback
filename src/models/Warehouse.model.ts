// models/Warehouse.model.ts
import mongoose, { Document, Schema, Types } from 'mongoose';
export interface IWarehouse extends Document {
  _id: Types.ObjectId;
  name: string;
  code: string;
  partner: string;
  location: string;
  capacity: number;
  manager: Types.ObjectId;
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

// models/Warehouse.model.ts
// models/Warehouse.model.ts - Complete fixed GRN schema

export interface IGRNnumber extends Document {
  _id: Types.ObjectId;
  grn_number: string;
  delivery_challan: string;
  transporter_name: string;
  vehicle_number: string;
  received_date: Date;
  remarks?: string;
  scanned_challan?: string;
  qc_status: 'bad' | 'moderate' | 'excellent';
  
  purchase_order: Types.ObjectId;
  vendor: Types.ObjectId;
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
  
  grn_line_items: Array<{
    sku: string;
    productName: string;
    ordered_quantity: number;
    received_quantity: number;
    accepted_quantity: number;
    rejected_quantity: number;
    unit_price: number;
    category: string;
    uom: string;
    expiry_date?: Date;
    item_remarks?: string;
  }>;
  
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const grnNumberSchema = new Schema<IGRNnumber>({
  grn_number: { 
    type: String, 
    required: false,
    unique: true,
    uppercase: true,
    trim: true
  },
  delivery_challan: { type: String, required: true },
  transporter_name: { type: String, required: true },
  vehicle_number: { type: String, required: true },
  received_date: { type: Date, required: true, default: Date.now },
  remarks: { type: String },
  scanned_challan: { type: String },
  qc_status: {
    type: String,
    enum: ['bad', 'moderate', 'excellent'],
    required: true
  },
  
  purchase_order: { 
    type: Schema.Types.ObjectId, 
    ref: 'RaisePurchaseOrder', 
    required: true 
  },
  vendor: { 
    type: Schema.Types.ObjectId, 
    ref: 'VendorCreate', 
    required: true 
  },
  
  vendor_details: {
    vendor_name: { type: String, required: true },
    vendor_billing_name: { type: String, required: true },
    vendor_email: { type: String, required: true },
    vendor_phone: { type: String, required: true },
    vendor_category: { type: String, required: true },
    gst_number: { type: String, required: true },
    verification_status: { type: String, required: true },
    vendor_address: { type: String, required: true },
    vendor_contact: { type: String, required: true },
    vendor_id: { type: String, required: true }
  },
  
  grn_line_items: [{
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    ordered_quantity: { type: Number, required: true },
    unit_price: { type: Number, required: true },
    received_quantity: { type: Number, required: true, default: 0 },
    accepted_quantity: { type: Number, required: true, default: 0 },
    rejected_quantity: { type: Number, required: true, default: 0 },
    category: { type: String, required: true },
    uom: { type: String, required: true },
    expiry_date: { type: Date },
    item_remarks: { type: String }
  }],
  
  createdBy: { 
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  }
}, {
  timestamps: true
});

// FIXED: Pre-save middleware for GRN number generation
grnNumberSchema.pre('save', async function(next) {
  try {
    console.log('🔧 GRN Pre-save middleware running...');
    
    // Only generate GRN number if it's a new document
    if (this.isNew) {
      console.log('📦 Generating GRN number for new document...');
      
      // Get the PO to get the PO number
      const PO = mongoose.model('RaisePurchaseOrder');
      const purchaseOrder = await PO.findById(this.purchase_order);
      
      if (!purchaseOrder) {
        throw new Error('Purchase order not found');
      }
      
      // Format: PO12345678-20231215 (PO number + received date)
      const poNumber = (purchaseOrder as any).po_number;
      const dateStr = this.received_date.toISOString().split('T')[0].replace(/-/g, '');
      this.grn_number = `${poNumber}-${dateStr}`;
      
      console.log(`✅ GRN number generated: ${this.grn_number}`);
    }
    
    next();
  } catch (error) {
    console.error('❌ Error in GRN pre-save middleware:', error);
    next(error as Error);
  }
});

// Post-save middleware to update PO status
grnNumberSchema.post('save', async function(doc: IGRNnumber, next) {
  try {
    console.log('🔧 GRN Post-save middleware running...');
    
    // Update PO status to 'delivered' when GRN is created
    const PO = mongoose.model('RaisePurchaseOrder');
    await PO.findByIdAndUpdate(doc.purchase_order, {
      po_status: 'delivered'
    });
    
    console.log(`✅ PO ${doc.purchase_order} status updated to 'delivered'`);
    next();
  } catch (error) {
    console.error('❌ Error updating PO status:', error);
    next(error as Error);
  }
});

export const GRNnumber = mongoose.model<IGRNnumber>('GRNnumber', grnNumberSchema);export interface IRaisePurchaseOrder extends Document {
  _id: Types.ObjectId;
  po_number: string; // Changed from poNumber to po_number for consistency
  vendor: Types.ObjectId;
  po_status: 'draft' | 'approved' | 'delivered';
  po_raised_date: Date;
  remarks?: string;
   po_line_items: Array<{ // Should be array here too
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
  createdAt: Date;
  updatedAt: Date;
  createdBy: Types.ObjectId;
  generatePONumber(): Promise<string>;
}

const raisePurchaseOrderSchema = new Schema<IRaisePurchaseOrder>({
  po_number: { 
    type: String, 
    required: false, // Will be generated automatically 
    unique: true,
    uppercase: true,
    trim: true
  },
  po_line_items: [{
    line_no: { type: Number, required: true },
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true },
    category: { type: String, required: true },
    pack_size: { type: String, required: true },
    uom: { type: String, required: true },
    unit_price: { type: Number, required: true },
    expected_delivery_date: { type: Date, required: true },
    location: { type: String, required: true }
  }],

  vendor: { 
    type: Schema.Types.ObjectId, 
    ref: 'VendorCreate', 
    required: true 
  },
    // Add vendor details subdocument
  vendor_details: {
    vendor_name: { type: String, required: true },
    vendor_billing_name: { type: String, required: true },
    vendor_email: { type: String, required: true },
    vendor_phone: { type: String, required: true },
    vendor_category: { type: String, required: true },
    gst_number: { type: String, required: true },
    verification_status: { type: String, required: true },
    vendor_address: { type: String, required: true },
    vendor_contact: { type: String, required: true },
    vendor_id: { type: String, required: true }
  },
  po_status: {
    type: String,
    enum: ['draft', 'approved', 'delivered'],
    default: 'draft'
  },
  po_raised_date: { 
    type: Date, 
    required: true,
    default: Date.now 
  },
  remarks: { 
    type: String 
  },
createdBy: { // Add this field to the schema
    type: Schema.Types.ObjectId, 
    ref: 'User', 
    required: true
}
}, {
  timestamps: true 
});

// Pre-save middleware to generate PO number ONLY if it doesn't exist
raisePurchaseOrderSchema.pre('save', async function(next) {
  // Only generate PO number if it's a new document and po_number is not provided
  if (this.isNew && !this.po_number) {
    this.po_number = await this.generatePONumber();
  }
  
  // If someone tries to manually set po_number, ignore it and generate a new one
  if (this.isNew && this.po_number) {
    this.po_number = await this.generatePONumber();
  }
  
  next();
});

// Method to generate unique 7-digit PO number
raisePurchaseOrderSchema.methods.generatePONumber = async function(): Promise<string> {
  const PO = mongoose.model<IRaisePurchaseOrder>('RaisePurchaseOrder');
  
  let isUnique = false;
  let poNumber = '';
  let attempts = 0;
  const maxAttempts = 10; // Prevent infinite loop
  
  while (!isUnique && attempts < maxAttempts) {
    attempts++;
    
    // Generate 7-digit number with leading zeros
    const randomNum = Math.floor(1000000 + Math.random() * 9000000);
    poNumber = `PO${randomNum}`; // This will be PO + 7 digits
    
    // Check if PO number already exists
    const existingPO = await PO.findOne({ po_number: poNumber });
    if (!existingPO) {
      isUnique = true;
    }
  }
  
  if (!isUnique) {
    throw new Error('Failed to generate unique PO number after multiple attempts');
  }
  
  return poNumber;
};

// Index for better performance
raisePurchaseOrderSchema.index({ po_number: 1 }, { unique: true });
raisePurchaseOrderSchema.index({ vendor: 1 });
raisePurchaseOrderSchema.index({ po_status: 1 });
raisePurchaseOrderSchema.index({ po_raised_date: -1 });

export interface IDispatchOrder extends Document {
  _id: Types.ObjectId;
  dispatchId: string;

  // Combined field for vendor + destination + route info
  destination: string;

  products: {
    sku: string;
    quantity: number;
  }[];

  assignedAgent: Types.ObjectId;

  notes?: string;

  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';

  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}


export interface IQCTemplate extends Document {
  _id: Types.ObjectId;

  title: string;   // Template title
  sku: string;     // Product SKU

  parameters: {
    name: string;
    value: string;
  }[];

  isActive: boolean;
  createdBy: Types.ObjectId;

  createdAt: Date;
  updatedAt: Date;
}


export interface IReturnOrder extends Document {
  _id: Types.ObjectId;
  batchId: string;
  vendor: Types.ObjectId;
  reason: string;
  quantity: number;
  status: 'pending' | 'approved' | 'returned' | 'rejected';
  returnType: 'damaged' | 'expired' | 'wrong_item' | 'overstock' | 'other';
  images?: string[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IFieldAgent extends Document {
  _id: Types.ObjectId;
  name: string;
  assignedRoutes: string[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
// In Warehouse.model.ts
export interface IInventory extends Document {
  _id: Types.ObjectId;
  sku: string;
  productName: string;
  po_number: string;
  warehouse: Types.ObjectId;
  quantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  isArchived: boolean;
  archivedAt?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
export interface IExpense extends Document {
  _id: Types.ObjectId;
  category: 'staffing' | 'supplies' | 'equipment' | 'transport';
  amount: number;
  vendor: Types.ObjectId;
  date: Date;
  description?: string;
  billUrl?: string;

  status: 'approved' | 'pending';
  assignedAgent: Types.ObjectId; // ⬅ Added to support UI
  warehouseId: Types.ObjectId;

  paymentStatus: 'paid' | 'unpaid' | 'partially_paid';

  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId;
  approvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}


// Schema definitions
const warehouseSchema = new Schema<IWarehouse>({
  name: { type: String, required: true },
  code: { type: String, required: true, unique: true },
  partner: { type: String, required: true },
  location: { type: String, required: true },
  capacity: { type: Number, required: true },
  manager: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });


const dispatchOrderSchema = new Schema({
  dispatchId: { type: String, required: true, unique: true },

  // merged field
  destination: { type: String, required: true },

  products: [{
    sku: { type: String, required: true},
    quantity: { type: Number, required: true, min: 1 }
  }],

  assignedAgent: { type: Schema.Types.ObjectId, ref: 'FieldAgent', required: true },

  notes: { type: String, maxlength: 500 },

  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending'
  },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

}, { timestamps: true });

const qcTemplateSchema = new Schema<IQCTemplate>({
  title: {
    type: String,
    required: true,
    trim: true
  },

  sku: {
    type: String,
    required: true,
    trim: true
  },

  parameters: [
    {
      name: {
        type: String,
        required: true,
        trim: true
      },
      value: {
        type: String,
        required: true,
        trim: true
      }
    }
  ],

  isActive: {
    type: Boolean,
    default: true
  },

  createdBy: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }

}, { timestamps: true });


const returnOrderSchema = new Schema<IReturnOrder>({
  batchId: { type: String, required: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
  reason: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  status: {
    type: String,
    enum: ['pending', 'approved', 'returned', 'rejected'],
    default: 'pending'
  },
  returnType: {
    type: String,
    enum: ['damaged', 'expired', 'wrong_item', 'overstock', 'other'],
    required: true
  },
  images: [{ type: String }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const fieldAgentSchema = new Schema<IFieldAgent>({
  name: { type: String, required: true },
  assignedRoutes: [{ type: String }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Update the inventory schema
const inventorySchema = new Schema<IInventory>({
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  po_number: { type: String, required: true }, // PO number from purchase order
  warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantity: { type: Number, required: true, min: 0 },
  minStockLevel: { type: Number, default: 0 },
  maxStockLevel: { type: Number, default: 1000 },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
// Post-save middleware to create inventory when PO status becomes 'delivered'
raisePurchaseOrderSchema.post('save', async function(doc: IRaisePurchaseOrder, next) {
  try {
    // Only proceed if status changed to 'delivered'
    if (doc.po_status === 'delivered' && doc.isModified('po_status')) {
      console.log(`📦 PO ${doc.po_number} delivered, creating inventory entries...`);
      
      // Get the Inventory model
      const Inventory = mongoose.model<IInventory>('Inventory');
      
      // Process each line item
      for (const lineItem of doc.po_line_items) {
        // Check if inventory item already exists for this SKU and PO
        const existingInventory = await Inventory.findOne({
          sku: lineItem.sku,
          po_number: doc.po_number
        });
        
        if (!existingInventory) {
          // Create new inventory entry with only PO line item data
          await Inventory.create({
            sku: lineItem.sku,
            productName: lineItem.productName,
            po_number: doc.po_number,
            warehouse: doc.vendor, // Using vendor as warehouse, adjust as needed
            quantity: lineItem.quantity,
            minStockLevel: 0, // Default values
            maxStockLevel: 1000, // Default values
            isArchived: false,
            createdBy: doc.createdBy
          });
          
          console.log(`✅ Created inventory for ${lineItem.sku} (Qty: ${lineItem.quantity}) from PO ${doc.po_number}`);
        } else {
          // Update existing inventory quantity
          await Inventory.findByIdAndUpdate(existingInventory._id, {
            $inc: { quantity: lineItem.quantity }
          });
          console.log(`📈 Updated inventory for ${lineItem.sku} - Added ${lineItem.quantity} units`);
        }
      }
      
      console.log(`✅ All inventory entries processed for PO ${doc.po_number}`);
    }
    
    next();
  } catch (error) {
    console.error('❌ Error creating inventory from PO:', error);
    next(error);
  }
});
// Update the expense schema
const expenseSchema = new Schema<IExpense>({
  category: {
    type: String,
    enum: ['staffing', 'supplies', 'equipment', 'transport'],
    required: true
  },

  amount: { type: Number, required: true, min: 0 },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },

  date: { type: Date, required: true },
  description: { type: String, maxlength: 200 },

  billUrl: { type: String },

  status: {
    type: String,
    enum: ['approved', 'pending'],
    default: 'pending'
  },

  assignedAgent: { type: Schema.Types.ObjectId, ref: 'FieldAgent', required: true },

  warehouseId: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },

  paymentStatus: {
    type: String,
    enum: ['paid', 'unpaid', 'partially_paid'],
    default: 'unpaid'
  },

  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },

  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date }

}, { timestamps: true });

// Export models
export const Warehouse = mongoose.model<IWarehouse>('Warehouse', warehouseSchema);
export const RaisePurchaseOrder = mongoose.model<IRaisePurchaseOrder>('RaisePurchaseOrder', raisePurchaseOrderSchema);
export const DispatchOrder = mongoose.model<IDispatchOrder>('DispatchOrder', dispatchOrderSchema);
export const QCTemplate = mongoose.model<IQCTemplate>('QCTemplate', qcTemplateSchema);
export const ReturnOrder = mongoose.model<IReturnOrder>('ReturnOrder', returnOrderSchema);
export const Inventory = mongoose.model<IInventory>('Inventory', inventorySchema);
export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
export const FieldAgent = mongoose.model<IFieldAgent>('FieldAgent', fieldAgentSchema);