import mongoose, { Document, Schema, Types } from "mongoose";

export interface IFieldOpsTask extends Document {
  _id: Types.ObjectId;
  taskType: "warehouse_pickup" | "machine_refill" | "maintenance";
  title: string;
  description?: string;
  assignedAgent: Types.ObjectId;
  status: "pending" | "in_progress" | "completed" | "skipped" | "cancelled";
  priority: "high" | "medium" | "low";
  dueDate?: Date;

  // For warehouse pickup tasks
  dispatchId?: Types.ObjectId;
  warehouseId?: Types.ObjectId;

  // For refill tasks
  machineId?: Types.ObjectId;
  routeId?: Types.ObjectId;

  // For maintenance tasks
  issueId?: Types.ObjectId;

  // Metadata
  createdBy: Types.ObjectId;
  completedAt?: Date;
  completedBy?: Types.ObjectId;
  notes?: string;

  createdAt: Date;
  updatedAt: Date;
}

const fieldOpsTaskSchema = new Schema<IFieldOpsTask>(
  {
    taskType: {
      type: String,
      enum: ["warehouse_pickup", "machine_refill", "maintenance"],
      required: true,
    },
    title: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    assignedAgent: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "completed", "skipped", "cancelled"],
      default: "pending",
      index: true,
    },
    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    dueDate: {
      type: Date,
    },

    // Task-specific references
    dispatchId: {
      type: Schema.Types.ObjectId,
      ref: "DispatchOrder",
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
    },
    machineId: {
      type: Schema.Types.ObjectId,
      ref: "VendingMachine",
    },
    routeId: {
      type: Schema.Types.ObjectId,
      ref: "Route",
    },
    issueId: {
      type: Schema.Types.ObjectId,
      ref: "MaintenanceIssue",
    },

    // Metadata
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    completedAt: {
      type: Date,
    },
    completedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    notes: {
      type: String,
      maxlength: 1000,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
fieldOpsTaskSchema.index({ assignedAgent: 1, status: 1, createdAt: -1 });
fieldOpsTaskSchema.index({ taskType: 1, status: 1 });

export const FieldOpsTask = mongoose.model<IFieldOpsTask>("FieldOpsTask", fieldOpsTaskSchema);
