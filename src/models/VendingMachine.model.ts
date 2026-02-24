// models/machine.model.ts
import mongoose, { Document, Schema, Types } from "mongoose";

// ==================== MACHINE SCHEMA ====================
export interface IProductSlot {
  slotNumber: string;
  product: Types.ObjectId;
  quantity: number;
  price: number;
}

export interface ILocation {
  address?: string;
  city?: string;
  state?: string;
  landmark?: string;
}

export interface IMachine extends Document {
  name?: string;
  serialNumber: string;
  modelNumber: string;
  machineType: string;
  firmwareVersion: string;
  height: number;
  width: number;
  length: number;
  doorStatus?: "open" | "closed";
  connectivityStatus?: "online" | "offline";
  machineStatus: "active" | "inactive";
  underMaintenance?: "yes" | "no";
  decommissioned?: "yes" | "no";
  productSlots: IProductSlot[];
  machineId?: string;
  location?: ILocation;
}

const ProductSlotSchema = new Schema<IProductSlot>(
  {
    slotNumber: { type: String, required: true },
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    quantity: { type: Number, required: true, default: 0 },
    price: { type: Number, required: true, default: 0 },
  },
  { _id: false }
);

const MachineSchema = new Schema<IMachine>(
  {
    name: { type: String },
    serialNumber: { type: String, required: true, unique: true },
    modelNumber: { type: String, required: true },
    machineType: {
      type: String,
      required: true,
      enum: ["snacks", "beverages", "combo", "smart_fridge"],
    },
    firmwareVersion: { type: String, required: true },
    height: { type: Number, required: true },
    width: { type: Number, required: true },
    length: { type: Number, required: true },
    doorStatus: { type: String, enum: ["open", "closed"], default: "closed" },
    connectivityStatus: { type: String, enum: ["online", "offline"], default: "offline" },
    machineStatus: { type: String, enum: ["active", "inactive"], default: "active" },
    underMaintenance: { type: String, enum: ["yes", "no"], default: "no" },
    decommissioned: { type: String, enum: ["yes", "no"], default: "no" },
    productSlots: { type: [ProductSlotSchema], default: [] },
    machineId: { type: String, index: true },
    location: {
      address: { type: String },
      city: { type: String },
      state: { type: String },
      landmark: { type: String },
    },
  },
  { timestamps: true }
);

export const Machine = mongoose.model<IMachine>("Machine", MachineSchema);

// ==================== RACK SCHEMA ====================
export interface IRack extends Document {
  machineId: Types.ObjectId;
  rackName: string;
  slots: number;
  capacity: number;
}

const RackSchema = new Schema<IRack>(
  {
    machineId: {
      type: Schema.Types.ObjectId,
      ref: "Machine",
      required: true,
      index: true,
    },
    rackName: {
      type: String,
      required: true,
    },
    slots: {
      type: Number,
      required: true,
    },
    capacity: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

// Drop any existing indexes and create new one
// You need to run this once to fix the index
RackSchema.index({ machineId: 1, rackName: 1 }, { unique: true });

export const Rack = mongoose.model<IRack>("Rack", RackSchema);
