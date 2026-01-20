import mongoose, { Document, Schema, Types } from "mongoose";

export type IssueType =
  | "Offline Machine"
  | "Jammed Slot"
  | "Payment Errors"
  | "Temperature"
  | "Temp Abnormal"
  | "Door Not Locking"
  | "Vandalism"
  | "Others";

export interface IMaintenanceIssue extends Document {
  _id: Types.ObjectId;
  issueId: string;

  machineId: Types.ObjectId;
  agentId: Types.ObjectId;
  routeId?: Types.ObjectId;

  issueType: IssueType;
  machineName?: string;
  dateTime: Date;
  lastVisit?: Date;

  description: string;
  affectedSlots?: string[];
  photos: string[];
  officialNote?: string;

  priority: "high" | "medium" | "low";
  status: "open" | "in_progress" | "resolved" | "closed";

  assignedTo?: Types.ObjectId;
  assignedAt?: Date;

  resolution?: string;
  resolvedBy?: Types.ObjectId;
  resolvedAt?: Date;

  followUpRequired: boolean;
  followUpDate?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const maintenanceIssueSchema = new Schema<IMaintenanceIssue>(
  {
    issueId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },

    machineId: {
      type: Schema.Types.ObjectId,
      ref: "VendingMachine",
      required: true,
      index: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "FieldAgent",
      required: true,
      index: true,
    },
    routeId: {
      type: Schema.Types.ObjectId,
      ref: "Route",
    },

    issueType: {
      type: String,
      enum: [
        "Offline Machine",
        "Jammed Slot",
        "Payment Errors",
        "Temperature",
        "Temp Abnormal",
        "Door Not Locking",
        "Vandalism",
        "Others",
      ],
      required: true,
    },
    machineName: {
      type: String,
    },
    dateTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    lastVisit: {
      type: Date,
    },

    description: {
      type: String,
      required: true,
      maxlength: 2000,
    },
    affectedSlots: [
      {
        type: String,
      },
    ],

    photos: [
      {
        type: String,
      },
    ],
    officialNote: {
      type: String,
      maxlength: 1000,
    },

    priority: {
      type: String,
      enum: ["high", "medium", "low"],
      default: "medium",
    },
    status: {
      type: String,
      enum: ["open", "in_progress", "resolved", "closed"],
      default: "open",
      index: true,
    },

    assignedTo: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    assignedAt: {
      type: Date,
    },

    resolution: {
      type: String,
      maxlength: 2000,
    },
    resolvedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    resolvedAt: {
      type: Date,
    },

    followUpRequired: {
      type: Boolean,
      default: false,
    },
    followUpDate: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

maintenanceIssueSchema.index({ machineId: 1, status: 1, createdAt: -1 });
maintenanceIssueSchema.index({ agentId: 1, createdAt: -1 });
maintenanceIssueSchema.index({ status: 1, priority: 1 });

maintenanceIssueSchema.pre("save", async function (next) {
  if (!this.issueId) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    this.issueId = `ISS-${dateStr}-${random}`;
  }
  next();
});

export const MaintenanceIssue = mongoose.model<IMaintenanceIssue>(
  "MaintenanceIssue",
  maintenanceIssueSchema
);
