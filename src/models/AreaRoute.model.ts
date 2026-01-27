import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICreateArea extends Document {
  area_name: string;
  state: string;
  district: string;
  pincode: string;
  area_description: string;
  status: "active" | "inactive";
  latitude?: number;
  longitude?: number;
  address?: string;
  sub_locations: {
    campus: string;
    tower: string;
    floor: string;
    select_machine: string[];
  }[];
}

const SubLocationSchema: Schema = new Schema(
  {
    campus: {
      type: String,
      required: true,
    },
    tower: {
      type: String,
      required: true,
    },
    floor: {
      type: String,
      required: true,
    },
    select_machine: {
      type: [String],
      required: true,
      validate: {
        validator: function (v: string[]) {
          return v.length > 0;
        },
        message: "At least one machine must be selected",
      },
    },
  },
  { _id: false }
);
const AreaRouteSchema: Schema = new Schema(
  {
    area_name: {
      type: String,
      required: true,
    },
    state: {
      type: String,
      required: true,
    },
    district: {
      type: String,
      required: true,
    },
    pincode: {
      type: String,
      required: true,
    },
    area_description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      required: true,
    },
    latitude: {
      type: Number,
      min: -90,
      max: 90,
      validate: {
        validator: function (v: number) {
          return v >= -90 && v <= 90;
        },
        message: "Latitude must be between -90 and 90",
      },
    },
    longitude: {
      type: Number,
      min: -180,
      max: 180,
      validate: {
        validator: function (v: number) {
          return v >= -180 && v <= 180;
        },
        message: "Longitude must be between -180 and 180",
      },
    },
    address: {
      type: String,
    },
    sub_locations: {
      type: [SubLocationSchema],
      required: true,
      validate: {
        validator: function (v: any[]) {
          return v.length > 0;
        },
        message: "At least one sub-location must be provided",
      },
    },
  },
  { timestamps: true }
);

export interface IHistoryArea extends Document {
  area_id: Types.ObjectId;
  action: "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE" | "ADD_SUB_LOCATION" | "REMOVE_MACHINE";
  old_data?: Partial<ICreateArea>;
  new_data?: Partial<ICreateArea>;
  changes?: Record<string, { old: any; new: any }>;
  performed_by: {
    user_id: string;
    email: string;
    name?: string;
  };
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
}

const HistoryAreaSchema: Schema = new Schema(
  {
    area_id: {
      type: Schema.Types.ObjectId,
      ref: "AreaRoute",
      required: true,
    },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "STATUS_CHANGE", "ADD_SUB_LOCATION", "REMOVE_MACHINE"],
      required: true,
    },
    old_data: {
      type: Schema.Types.Mixed,
      default: null,
    },
    new_data: {
      type: Schema.Types.Mixed,
      default: null,
    },
    changes: {
      type: Schema.Types.Mixed,
      default: null,
    },
    performed_by: {
      user_id: { type: String, required: true },
      email: { type: String, required: true },
      name: { type: String },
    },
    ip_address: { type: String },
    user_agent: { type: String },
    timestamp: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
    collection: "historyArea",
  }
);

HistoryAreaSchema.index({ area_id: 1, timestamp: -1 });
HistoryAreaSchema.index({ "performed_by.user_id": 1 });
HistoryAreaSchema.index({ action: 1 });

export const AreaRouteModel = mongoose.model<ICreateArea>("AreaRoute", AreaRouteSchema);
export const HistoryAreaModel = mongoose.model<IHistoryArea>("HistoryArea", HistoryAreaSchema);
