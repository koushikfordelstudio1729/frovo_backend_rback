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

export interface IGoodsReceiving extends Document {
  _id: Types.ObjectId;
  poNumber: string;
  vendor: Types.ObjectId;
  sku: string;
  productName: string;
  quantity: number;
  batchId: string;
  warehouse: Types.ObjectId;
  qcVerification: {
    packaging: boolean;
    expiry: boolean;
    label: boolean;
    documents: string[]; // File URLs for QC documents
  };
  storage: {
    zone: string;
    aisle: string;
    rack: string;
    bin: string;
  };
  status: 'received' | 'qc_pending' | 'qc_passed' | 'qc_failed';
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}
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
  email: string;
  phone: string;
  vehicleType: string;
  licensePlate: string;
  isActive: boolean;
  currentLocation?: {
    latitude: number;
    longitude: number;
  };
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
  batchId: string;
  warehouse: Types.ObjectId;
  quantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  age: number;
  expiryDate?: Date;
  location: {
    zone: string;
    aisle: string;
    rack: string;
    bin: string;
  };
  status: 'active' | 'low_stock' | 'overstock' | 'expired' | 'quarantine' | 'archived';
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
  vendor?: Types.ObjectId;
  date: Date;
  description?: string;
  billUrl?: string;
  status: 'approved' | 'pending' | 'rejected';
  paymentStatus: 'paid' | 'unpaid' | 'partially_paid'; // New field
  warehouse: Types.ObjectId;
  createdBy: Types.ObjectId;
  approvedBy?: Types.ObjectId; // New field
  approvedAt?: Date; // New field
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

const goodsReceivingSchema = new Schema<IGoodsReceiving>({
  poNumber: { type: String, required: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  quantity: { type: Number, required: true, min: 1 },
  batchId: { type: String, required: true },
  warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  qcVerification: {
    packaging: { type: Boolean, required: true },
    expiry: { type: Boolean, required: true },
    label: { type: Boolean, required: true },
    documents: [{ type: String }] // QC-specific documents
  },
  storage: {
    zone: { type: String, required: true },
    aisle: { type: String, required: true },
    rack: { type: String, required: true },
    bin: { type: String, required: true }
  },
  status: { 
    type: String, 
    enum: ['received', 'qc_pending', 'qc_passed', 'qc_failed'],
    default: 'received'
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const dispatchOrderSchema = new Schema({
  dispatchId: { type: String, required: true, unique: true },

  // merged field
  destination: { type: String, required: true },

  products: [{
    sku: { type: String, required: true },
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
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  vehicleType: { type: String, required: true },
  licensePlate: { type: String, required: true },
  isActive: { type: Boolean, default: true },
  currentLocation: {
    latitude: { type: Number },
    longitude: { type: Number }
  },
  assignedRoutes: [{ type: String }],
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

// Update the inventory schema
const inventorySchema = new Schema<IInventory>({
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  batchId: { type: String, required: true },
  warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantity: { type: Number, required: true, min: 0 },
  minStockLevel: { type: Number, default: 0 },
  maxStockLevel: { type: Number, default: 1000 },
  age: { type: Number, default: 0 },
  expiryDate: { type: Date },
  location: {
    zone: { type: String, required: true },
    aisle: { type: String, required: true },
    rack: { type: String, required: true },
    bin: { type: String, required: true }
  },
  status: {
    type: String,
    enum: ['active', 'low_stock', 'overstock', 'expired', 'quarantine', 'archived'],
    default: 'active'
  },
  isArchived: { type: Boolean, default: false },
  archivedAt: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
// Update the expense schema
const expenseSchema = new Schema<IExpense>({
  category: {
    type: String,
    enum: ['staffing', 'supplies', 'equipment', 'transport'],
    required: true
  },
  amount: { type: Number, required: true, min: 0 },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor' },
  date: { type: Date, required: true },
  description: { type: String, maxlength: 200 },
  billUrl: { type: String },
  status: {
    type: String,
    enum: ['approved', 'pending', 'rejected'],
    default: 'pending'
  },
  paymentStatus: {
    type: String,
    enum: ['paid', 'unpaid', 'partially_paid'],
    default: 'unpaid'
  },
  warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  approvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  approvedAt: { type: Date }
}, { timestamps: true });
// Export models
export const Warehouse = mongoose.model<IWarehouse>('Warehouse', warehouseSchema);
export const GoodsReceiving = mongoose.model<IGoodsReceiving>('GoodsReceiving', goodsReceivingSchema);
export const DispatchOrder = mongoose.model<IDispatchOrder>('DispatchOrder', dispatchOrderSchema);
export const QCTemplate = mongoose.model<IQCTemplate>('QCTemplate', qcTemplateSchema);
export const ReturnOrder = mongoose.model<IReturnOrder>('ReturnOrder', returnOrderSchema);
export const Inventory = mongoose.model<IInventory>('Inventory', inventorySchema);
export const Expense = mongoose.model<IExpense>('Expense', expenseSchema);
export const FieldAgent = mongoose.model<IFieldAgent>('FieldAgent', fieldAgentSchema);