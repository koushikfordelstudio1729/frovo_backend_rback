// models/machine.model.ts
import mongoose, { Document, Schema, Types } from "mongoose";

// ==================== SLOT SUB-SCHEMA ====================
export interface ISlot {
  _id?: Types.ObjectId;
  slotNumber: string;
}

const SlotSubSchema = new Schema<ISlot>(
  {
    slotNumber: {
      type: String,
      required: true,
    },
  },
  { _id: true }
);

// ==================== RACK SUB-SCHEMA ====================
export interface IRack {
  _id?: Types.ObjectId;
  rackName: string;
  slots: number;
  capacity: number;
  slotsList: Types.DocumentArray<ISlot>;
}

const RackSubSchema = new Schema<IRack>(
  {
    rackName: {
      type: String,
      required: true,
    },
    slots: {
      type: Number,
      required: true,
      min: 1,
    },
    capacity: {
      type: Number,
      required: true,
      min: 0,
    },
    slotsList: {
      type: [SlotSubSchema],
      default: [],
    },
  },
  { _id: true }
);

// ==================== MACHINE SCHEMA ====================
export interface IMachine extends Document {
  machineId?: string;
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
  internalTemperature?: number;
  name?: string;
  racks: Types.DocumentArray<IRack>;
}

// Helper function to generate slot numbers
function generateSlotNumbers(rackName: string, numberOfSlots: number): string[] {
  const slots: string[] = [];
  for (let i = 1; i <= numberOfSlots; i++) {
    slots.push(`${rackName}${i}`);
  }
  return slots;
}

const MachineSchema = new Schema<IMachine>(
  {
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
    name: { type: String },
    doorStatus: { type: String, enum: ["open", "closed"], default: "closed" },
    connectivityStatus: {
      type: String,
      enum: ["online", "offline"],
      default: "online",
    },
    machineStatus: {
      type: String,
      enum: ["active", "inactive"],
      default: "active",
    },
    underMaintenance: { type: String, enum: ["yes", "no"], default: "no" },
    decommissioned: { type: String, enum: ["yes", "no"], default: "no" },
    machineId: { type: String, index: true, unique: true, sparse: true },
    internalTemperature: { type: Number },
    racks: {
      type: [RackSubSchema],
      default: [],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Pre-save middleware to auto-generate rack names and slot numbers
MachineSchema.pre("save", function (next) {
  // Auto-generate rack names if not provided
  if (this.racks && this.racks.length > 0) {
    this.racks.forEach((rack: any, index: number) => {
      // If rackName is not provided, auto-generate it (A, B, C, D...)
      if (!rack.rackName || rack.rackName === "") {
        rack.rackName = String.fromCharCode(65 + index);
      }

      // Generate slotsList if it doesn't exist or if slots count changed
      if (!rack.slotsList || rack.slotsList.length !== rack.slots) {
        const slotNumbers = generateSlotNumbers(rack.rackName, rack.slots);
        rack.slotsList = slotNumbers.map(slotNumber => ({
          slotNumber,
          status: "available",
        }));
      }
    });
  }
  next();
});

export const Machine = mongoose.model<IMachine>("Machine", MachineSchema);
