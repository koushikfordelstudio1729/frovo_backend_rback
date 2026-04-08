// models/machine.model.ts
import mongoose, { Document, Schema, Types } from "mongoose";

// ==================== AUDIT LOG SUB-SCHEMA ====================
export interface IAuditLog {
  action: string;
  entityType: string;
  entityId?: string;
  changes?: any;
  performedBy: {
    userId: string;
    userEmail: string;
    userName?: string;
    ipAddress: string;
    userAgent: string;
  };
  timestamp: Date;
  previousData?: any;
  newData?: any;
}

const AuditLogSubSchema = new Schema<IAuditLog>(
  {
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String },
    changes: { type: Schema.Types.Mixed },
    performedBy: {
      userId: { type: String, required: true },
      userEmail: { type: String, required: true },
      userName: { type: String },
      ipAddress: { type: String, required: true },
      userAgent: { type: String, required: true },
    },
    timestamp: { type: Date, default: Date.now },
    previousData: { type: Schema.Types.Mixed },
    newData: { type: Schema.Types.Mixed },
  },
  { _id: true }
);

// ==================== SLOT SUB-SCHEMA ====================
export interface ISlot {
  _id?: Types.ObjectId;
  slotNumber: string;
  product?: Types.ObjectId;
  no_of_products?: number;
}

const SlotSubSchema = new Schema<ISlot>(
  {
    slotNumber: {
      type: String,
      required: true,
    },
    product: {
      type: Schema.Types.ObjectId,
      ref: "Catalogue",
      default: null,
    },
    no_of_products: {
      type: Number,
      default: 0,
      min: 0,
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
  installed_status?: "installed" | "not_installed";
  racks: Types.DocumentArray<IRack>;
  auditLogs: Types.DocumentArray<IAuditLog>;
  createdAt?: Date;
  updatedAt?: Date;
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
    doorStatus: { type: String, enum: ["open", "closed"], default: "closed" },
    connectivityStatus: { type: String, enum: ["online", "offline"], default: "online" },
    machineStatus: { type: String, enum: ["active", "inactive"], default: "active" },
    underMaintenance: { type: String, enum: ["yes", "no"], default: "no" },
    decommissioned: { type: String, enum: ["yes", "no"], default: "no" },
    machineId: { type: String, index: true, unique: true, sparse: true },
    internalTemperature: { type: Number },
    installed_status: {
      type: String,
      enum: ["installed", "not_installed"],
      default: "not_installed",
    },
    racks: { type: [RackSubSchema], default: [] },
    auditLogs: { type: [AuditLogSubSchema], default: [] },
  },
  { timestamps: true, toJSON: { virtuals: true }, toObject: { virtuals: true } }
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
        }));
      }
    });
  }
  next();
});

// Helper function to generate machine ID in format VM{year}XXX
async function generateMachineId(): Promise<string> {
  // Use UTC date to avoid timezone issues
  const now = new Date();
  const currentYear = now.getUTCFullYear(); // or getFullYear() based on your needs
  const prefix = `VM${currentYear}`;

  // Find the highest sequence number for this year
  const lastMachine = await Machine.findOne(
    { machineId: { $regex: `^${prefix}`, $options: "i" } },
    { machineId: 1 }
  )
    .sort({ machineId: -1 })
    .lean();

  let nextSequence = 1;

  if (lastMachine && lastMachine.machineId) {
    // Extract the numeric part from VM2026001 -> 001
    const match = lastMachine.machineId.match(/\d+$/);
    if (match) {
      const lastNumber = parseInt(match[0], 10);
      nextSequence = lastNumber + 1;
    }
  }

  // Format: VM2026001, VM2026002, etc.
  const newMachineId = `${prefix}${nextSequence.toString().padStart(3, "0")}`;

  return newMachineId;
}

MachineSchema.pre("save", async function (next) {
  // Auto-generate machineId if not provided
  if (!this.machineId || this.machineId === "") {
    this.machineId = await generateMachineId();
  }

  // Auto-generate rack names and slot numbers
  if (this.racks && this.racks.length > 0) {
    this.racks.forEach((rack: any, index: number) => {
      if (!rack.rackName || rack.rackName === "") {
        rack.rackName = String.fromCharCode(65 + index);
      }

      if (!rack.slotsList || rack.slotsList.length !== rack.slots) {
        const slotNumbers = generateSlotNumbers(rack.rackName, rack.slots);
        rack.slotsList = slotNumbers.map(slotNumber => ({
          slotNumber,
        }));
      }
    });
  }
  next();
});
export const Machine = mongoose.model<IMachine>("Machine", MachineSchema);
