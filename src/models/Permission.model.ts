import mongoose, { Document, Schema, Types } from "mongoose";
import { PermissionModule, PermissionAction } from "./enums";

export interface IPermission extends Document {
  _id: Types.ObjectId;
  key: string;
  module: PermissionModule;
  action: PermissionAction;
  description: string;
  group: string;
  createdAt: Date;
  updatedAt: Date;
}

const permissionSchema = new Schema<IPermission>(
  {
    key: {
      type: String,
      unique: true,
      required: [true, "Permission key is required"],
      lowercase: true,
    },
    module: {
      type: String,
      enum: Object.values(PermissionModule),
      required: [true, "Module is required"],
    },
    action: {
      type: String,
      enum: Object.values(PermissionAction),
      required: [true, "Action is required"],
    },
    description: {
      type: String,
      required: [true, "Description is required"],
      trim: true,
      maxlength: [200, "Description cannot exceed 200 characters"],
    },
    group: {
      type: String,
      required: [true, "Group is required"],
      trim: true,
      maxlength: [50, "Group cannot exceed 50 characters"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Indexes (key already has unique index from schema)
permissionSchema.index({ module: 1 });
permissionSchema.index({ group: 1 });
permissionSchema.index({ module: 1, action: 1 });

// Pre-save hook to auto-generate key
permissionSchema.pre("save", function (next) {
  if (this.isModified("module") || this.isModified("action") || !this.key) {
    this.key = `${this.module}:${this.action}`;
  }
  next();
});

// Virtual for id
permissionSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
permissionSchema.set("toJSON", {
  virtuals: true,
  transform: function (_doc, ret) {
    const { _id, __v, ...cleanRet } = ret;
    return cleanRet;
  },
});

export const Permission = mongoose.model<IPermission>("Permission", permissionSchema);
