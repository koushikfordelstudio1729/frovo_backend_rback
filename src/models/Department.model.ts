import mongoose, { Document, Schema, Types } from "mongoose";
import { DepartmentName } from "./enums";

export interface IDepartment extends Document {
  _id: Types.ObjectId;
  name: string;
  systemName?: DepartmentName;
  description?: string;
  roles: Types.ObjectId[];
  members: Types.ObjectId[];
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const departmentSchema = new Schema<IDepartment>(
  {
    name: {
      type: String,
      required: [true, "Department name is required"],
      unique: true,
      trim: true,
      minlength: [2, "Department name must be at least 2 characters"],
      maxlength: [100, "Department name cannot exceed 100 characters"],
    },
    systemName: {
      type: String,
      enum: Object.values(DepartmentName),
      sparse: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    roles: [
      {
        type: Schema.Types.ObjectId,
        ref: "Role",
      },
    ],
    members: [
      {
        type: Schema.Types.ObjectId,
        ref: "User",
      },
    ],
    createdBy: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: [true, "CreatedBy is required"],
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

departmentSchema.index({ createdAt: -1 });

departmentSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

departmentSchema.virtual("memberCount").get(function () {
  return this.members?.length || 0;
});

departmentSchema.virtual("roleCount").get(function () {
  return this.roles?.length || 0;
});

departmentSchema.set("toJSON", {
  virtuals: true,
  transform: function (_doc, ret) {
    const { _id, __v, ...cleanRet } = ret;
    return cleanRet;
  },
});

export const Department = mongoose.model<IDepartment>("Department", departmentSchema);
