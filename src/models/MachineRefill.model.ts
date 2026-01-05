import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ISlotRefill {
  slotId: string; // e.g., "Rack 1 Slot A1"
  rackNumber: number;
  slotPosition: string; // e.g., "A1"
  productCode: string;
  productName: string;
  productId?: Types.ObjectId;

  // Refill data
  transUnitsDispensed: number; // Total units sold since last refill
  existingQty: number; // Stock before refill
  refilledQty: number; // Units added
  currentStock: number; // Stock after refill

  // Variance tracking
  variance?: number;
  varianceReason?: string;

  // Removal tracking
  removedQty?: number;
  removedReason?: string; // "Damaged", "Expired", "Other"

  // Product details
  expiryDate?: Date;
  batchNumber?: string;

  // Pricing
  unitPrice?: number;
}

export interface IMachineRefill extends Document {
  _id: Types.ObjectId;
  refillId: string; // Unique refill ID

  // References
  machineId: Types.ObjectId;
  agentId: Types.ObjectId;
  routeId?: Types.ObjectId;
  taskId?: Types.ObjectId;
  warehouseId?: Types.ObjectId;

  // Refill details
  refillDateTime: Date;
  beforePhoto?: string;
  afterPhoto?: string;
  additionalPhotos?: string[];

  // Slot-wise refill data
  slotRefills: ISlotRefill[];

  // Summary
  totalUnitsDispensed: number;
  totalUnitsRefilled: number;
  totalUnitsRemoved: number;
  totalVariance: number;
  totalSlots: number;

  // Status
  status: 'draft' | 'completed' | 'verified' | 'rejected';
  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;

  // Notes
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const slotRefillSchema = new Schema<ISlotRefill>({
  slotId: { type: String, required: true },
  rackNumber: { type: Number, required: true },
  slotPosition: { type: String, required: true },
  productCode: { type: String, required: true },
  productName: { type: String, required: true },
  productId: { type: Schema.Types.ObjectId, ref: 'Product' },

  transUnitsDispensed: { type: Number, required: true, min: 0 },
  existingQty: { type: Number, required: true, min: 0 },
  refilledQty: { type: Number, required: true, min: 0 },
  currentStock: { type: Number, required: true, min: 0 },

  variance: { type: Number, default: 0 },
  varianceReason: { type: String },

  removedQty: { type: Number, default: 0, min: 0 },
  removedReason: {
    type: String,
    enum: ['Damaged', 'Expired', 'Missing', 'Other', '']
  },

  expiryDate: { type: Date },
  batchNumber: { type: String },
  unitPrice: { type: Number }
}, { _id: false });

const machineRefillSchema = new Schema<IMachineRefill>({
  refillId: {
    type: String,
    required: true,
    unique: true,
    index: true
  },

  machineId: {
    type: Schema.Types.ObjectId,
    ref: 'VendingMachine',
    required: true,
    index: true
  },
  agentId: {
    type: Schema.Types.ObjectId,
    ref: 'FieldAgent',
    required: true,
    index: true
  },
  routeId: {
    type: Schema.Types.ObjectId,
    ref: 'Route'
  },
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'FieldOpsTask'
  },
  warehouseId: {
    type: Schema.Types.ObjectId,
    ref: 'Warehouse'
  },

  refillDateTime: {
    type: Date,
    required: true,
    default: Date.now
  },
  beforePhoto: { type: String },
  afterPhoto: { type: String },
  additionalPhotos: [{ type: String }],

  slotRefills: [slotRefillSchema],

  totalUnitsDispensed: { type: Number, default: 0 },
  totalUnitsRefilled: { type: Number, default: 0 },
  totalUnitsRemoved: { type: Number, default: 0 },
  totalVariance: { type: Number, default: 0 },
  totalSlots: { type: Number, default: 0 },

  status: {
    type: String,
    enum: ['draft', 'completed', 'verified', 'rejected'],
    default: 'completed'
  },
  verifiedBy: {
    type: Schema.Types.ObjectId,
    ref: 'User'
  },
  verifiedAt: { type: Date },

  notes: { type: String, maxlength: 1000 }
}, {
  timestamps: true
});

// Indexes
machineRefillSchema.index({ machineId: 1, refillDateTime: -1 });
machineRefillSchema.index({ agentId: 1, createdAt: -1 });
machineRefillSchema.index({ status: 1 });

// Auto-generate refillId
machineRefillSchema.pre('save', async function(next) {
  if (!this.refillId) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    this.refillId = `REF-${dateStr}-${random}`;
  }
  next();
});

export const MachineRefill = mongoose.model<IMachineRefill>('MachineRefill', machineRefillSchema);
