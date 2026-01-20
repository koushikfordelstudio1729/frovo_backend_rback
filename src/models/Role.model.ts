import mongoose, { Document, Schema, Types } from "mongoose";
import { RoleType, RoleStatus, ScopeLevel, SystemRole, UIAccess } from "./enums";

export interface IScope {
  level: ScopeLevel;
  entities?: Types.ObjectId[];
}

export interface IRole extends Document {
  _id: Types.ObjectId;
  name: string;
  key: string;
  systemRole?: SystemRole;
  description?: string;
  type: RoleType;
  department?: Types.ObjectId;
  permissions: string[];
  scope: IScope;
  uiAccess: UIAccess;
  status: RoleStatus;
  createdBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const scopeSchema = new Schema<IScope>(
  {
    level: {
      type: String,
      enum: Object.values(ScopeLevel),
      required: [true, "Scope level is required"],
    },
    entities: [
      {
        type: Schema.Types.ObjectId,
        refPath: "scope.level",
      },
    ],
  },
  { _id: false }
);

const roleSchema = new Schema<IRole>(
  {
    name: {
      type: String,
      required: [true, "Role name is required"],
      trim: true,
      minlength: [2, "Role name must be at least 2 characters"],
      maxlength: [100, "Role name cannot exceed 100 characters"],
    },
    key: {
      type: String,
      unique: true,
      trim: true,
      lowercase: true,
    },
    systemRole: {
      type: String,
      enum: Object.values(SystemRole),
      sparse: true,
    },
    description: {
      type: String,
      trim: true,
      maxlength: [500, "Description cannot exceed 500 characters"],
    },
    type: {
      type: String,
      enum: Object.values(RoleType),
      default: RoleType.CUSTOM,
    },
    department: {
      type: Schema.Types.ObjectId,
      ref: "Department",
    },
    permissions: [
      {
        type: String,
        required: true,
      },
    ],
    scope: {
      type: scopeSchema,
      required: [true, "Scope is required"],
    },
    uiAccess: {
      type: String,
      enum: Object.values(UIAccess),
      required: [true, "UI Access is required"],
    },
    status: {
      type: String,
      enum: Object.values(RoleStatus),
      default: RoleStatus.DRAFT,
    },
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

// Indexes (key already has unique index from schema)
roleSchema.index({ type: 1 });
roleSchema.index({ status: 1 });
roleSchema.index({ department: 1 });
roleSchema.index({ createdAt: -1 });

// Pre-save hook to generate key from name
roleSchema.pre("save", function (next) {
  if (this.isModified("name") && !this.key) {
    this.key = this.name
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9\s]/g, "")
      .replace(/\s+/g, "_");
  }
  next();
});

// Pre-save hook to set systemRole for system roles
roleSchema.pre("save", function (next) {
  if (this.type === RoleType.SYSTEM && this.key && !this.systemRole) {
    const systemRoleKey = this.key.toUpperCase() as keyof typeof SystemRole;
    if (SystemRole[systemRoleKey]) {
      this.systemRole = SystemRole[systemRoleKey];
    }
  }
  next();
});

// Virtual for id
roleSchema.virtual("id").get(function () {
  return this._id.toHexString();
});

// Ensure virtual fields are serialized
roleSchema.set("toJSON", {
  virtuals: true,
  transform: function (_doc, ret) {
    const { _id, __v, ...cleanRet } = ret;
    return cleanRet;
  },
});

export const Role = mongoose.model<IRole>("Role", roleSchema);
