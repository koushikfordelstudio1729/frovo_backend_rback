import mongoose, { Document, Schema, Types } from "mongoose";
import { AccessRequestStatus } from "./enums";

export interface IAccessRequest extends Document {
  _id: Types.ObjectId;
  requester: Types.ObjectId;
  requestedRole?: Types.ObjectId;
  requestedPermissions?: string[];
  reason: string;
  duration?: number;
  approver?: Types.ObjectId;
  status: AccessRequestStatus;
  approvedAt?: Date;
  rejectedAt?: Date;
  expiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const accessRequestSchema = new Schema<IAccessRequest>(
  {
    requester: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "Requester is required"],
    },
    requestedRole: {
      type: Schema.Types.ObjectId,
      ref: "Role",
    },
    requestedPermissions: [
      {
        type: String,
        trim: true,
      },
    ],
    reason: {
      type: String,
      required: [true, "Reason is required"],
      trim: true,
      minlength: [10, "Reason must be at least 10 characters"],
      maxlength: [1000, "Reason cannot exceed 1000 characters"],
    },
    duration: {
      type: Number,
      min: [1, "Duration must be at least 1 day"],
      max: [365, "Duration cannot exceed 365 days"],
    },
    approver: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
    status: {
      type: String,
      enum: Object.values(AccessRequestStatus),
      default: AccessRequestStatus.PENDING,
    },
    approvedAt: {
      type: Date,
    },
    rejectedAt: {
      type: Date,
    },
    expiresAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes
accessRequestSchema.index({ requester: 1 });
accessRequestSchema.index({ status: 1 });
accessRequestSchema.index({ expiresAt: 1 });
accessRequestSchema.index({ createdAt: -1 });
accessRequestSchema.index({ requester: 1, status: 1 });

// Pre-save hook to validate request
accessRequestSchema.pre("save", function (next) {
  // Ensure either requestedRole or requestedPermissions is provided
  if (
    !this.requestedRole &&
    (!this.requestedPermissions || this.requestedPermissions.length === 0)
  ) {
    return next(new Error("Either requestedRole or requestedPermissions must be provided"));
  }

  // Set expiresAt if duration is provided and status is approved
  if (this.status === AccessRequestStatus.APPROVED && this.duration && !this.expiresAt) {
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + this.duration);
    this.expiresAt = expiryDate;
  }

  next();
});

// Virtual for id
accessRequestSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Virtual for isExpired
accessRequestSchema.virtual("isExpired").get(function () {
  if (!this.expiresAt) return false;
  return new Date() > this.expiresAt;
});

// Ensure virtual fields are serialized
accessRequestSchema.set("toJSON", {
  virtuals: true,
  transform: function (_doc, ret) {
    const { _id, __v, ...cleanRet } = ret;
    return cleanRet;
  },
});

export const AccessRequest = mongoose.model<IAccessRequest>("AccessRequest", accessRequestSchema);
