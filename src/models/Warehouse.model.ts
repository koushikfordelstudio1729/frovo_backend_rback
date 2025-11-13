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
  status: 'pending' | 'assigned' | 'in_transit' | 'delivered' | 'cancelled';
  estimatedDelivery?: Date;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IQCTemplate extends Document {
  _id: Types.ObjectId;
  name: string;
  category: 'snacks' | 'beverages' | 'perishable' | 'non_perishable';
  parameters: {
    name: string;
    type: 'boolean' | 'text' | 'number';
    required: boolean;
    options?: string[]; // For dropdown type
  }[];
  isActive: boolean;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReturnOrder extends Document {
  _id: Types.ObjectId;
  batchId: string;
  sku: string;
  productName: string;
  vendor: Types.ObjectId;
  reason: string;
  quantity: number;
  status: 'pending' | 'approved' | 'returned' | 'rejected';
  returnType: 'damaged' | 'expired' | 'wrong_item' | 'overstock' | 'other';
  images?: string[]; // URLs of damage photos
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
export interface IInventory extends Document {
  _id: Types.ObjectId;
  sku: string;
  productName: string;
  batchId: string;
  warehouse: Types.ObjectId;
  quantity: number;
  minStockLevel: number;
  maxStockLevel: number;
  expiryDate?: Date;
  age: number; // Days since receipt
  location: {
    zone: string;
    aisle: string;
    rack: string;
    bin: string;
  };
  status: 'active' | 'low_stock' | 'expired' | 'quarantine';
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
  warehouse: Types.ObjectId;
  createdBy: Types.ObjectId;
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

const dispatchOrderSchema = new Schema<IDispatchOrder>({
  dispatchId: { type: String, required: true, unique: true },
  vendor: { type: Schema.Types.ObjectId, ref: 'Vendor', required: true },
  destination: { type: String, required: true },
  products: [{
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    batchId: { type: String, required: true },
    unitPrice: { type: Number, min: 0 }
  }],
  assignedAgent: { type: Schema.Types.ObjectId, ref: 'FieldAgent', required: true },
  route: { type: String, required: true },
  notes: { type: String, maxlength: 500 },
  status: {
    type: String,
    enum: ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'],
    default: 'pending'
  },
  estimatedDelivery: { type: Date },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const qcTemplateSchema = new Schema<IQCTemplate>({
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['snacks', 'beverages', 'perishable', 'non_perishable'],
    required: true
  },
  parameters: [{
    name: { type: String, required: true },
    type: { 
      type: String, 
      enum: ['boolean', 'text', 'number'],
      required: true
    },
    required: { type: Boolean, default: true },
    options: [{ type: String }]
  }],
  isActive: { type: Boolean, default: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const returnOrderSchema = new Schema<IReturnOrder>({
  batchId: { type: String, required: true },
  sku: { type: String, required: true },
  productName: { type: String, required: true },
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

const inventorySchema = new Schema<IInventory>({
  sku: { type: String, required: true },
  productName: { type: String, required: true },
  batchId: { type: String, required: true },
  warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  quantity: { type: Number, required: true, min: 0 },
  minStockLevel: { type: Number, required: true },
  maxStockLevel: { type: Number, required: true },
  expiryDate: { type: Date },
  age: { type: Number, default: 0 },
  location: {
    zone: { type: String, required: true },
    aisle: { type: String, required: true },
    rack: { type: String, required: true },
    bin: { type: String, required: true }
  },
  status: {
    type: String,
    enum: ['active', 'low_stock', 'expired', 'quarantine'],
    default: 'active'
  },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

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
  warehouse: { type: Schema.Types.ObjectId, ref: 'Warehouse', required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
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