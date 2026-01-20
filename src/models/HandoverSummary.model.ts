import mongoose, { Document, Schema, Types } from "mongoose";

export interface IHandoverSummary extends Document {
  _id: Types.ObjectId;
  handoverId: string;

  dispatchId: Types.ObjectId;
  agentId: Types.ObjectId;
  warehouseId: Types.ObjectId;
  machineId?: Types.ObjectId;

  date: Date;
  agentName: string;
  code?: string;
  grade?: string;
  category?: string;
  reason?: string;
  notes?: string;

  images: string[];

  verifiedBy?: Types.ObjectId;
  verifiedAt?: Date;
  status: "pending" | "verified" | "disputed";

  createdAt: Date;
  updatedAt: Date;
}

const handoverSummarySchema = new Schema<IHandoverSummary>(
  {
    handoverId: {
      type: String,
      required: false,
      unique: true,
      index: true,
    },

    dispatchId: {
      type: Schema.Types.ObjectId,
      ref: "DispatchOrder",
      required: true,
      index: true,
    },
    agentId: {
      type: Schema.Types.ObjectId,
      ref: "FieldAgent",
      required: true,
      index: true,
    },
    warehouseId: {
      type: Schema.Types.ObjectId,
      ref: "Warehouse",
      required: true,
    },
    machineId: {
      type: Schema.Types.ObjectId,
      ref: "VendingMachine",
    },

    date: {
      type: Date,
      required: true,
      default: Date.now,
    },
    agentName: {
      type: String,
      required: true,
    },
    code: {
      type: String,
    },
    grade: {
      type: String,
    },
    category: {
      type: String,
    },

    reason: {
      type: String,
      maxlength: 500,
    },
    notes: {
      type: String,
      maxlength: 1000,
    },

    images: [
      {
        type: String,
      },
    ],

    verifiedBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    verifiedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: ["pending", "verified", "disputed"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

handoverSummarySchema.pre("save", async function (next) {
  if (!this.handoverId) {
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.floor(Math.random() * 10000)
      .toString()
      .padStart(4, "0");
    this.handoverId = `HO-${dateStr}-${random}`;
  }
  next();
});

export const HandoverSummary = mongoose.model<IHandoverSummary>(
  "HandoverSummary",
  handoverSummarySchema
);
