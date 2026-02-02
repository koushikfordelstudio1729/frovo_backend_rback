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
    select_machine: {
      machine_id: string;
      installed_status: "installed" | "not_installed";
      status: "active" | "inactive";
      machine_image: IMachineImageData[];
    };
  }[];
  createdAt?: Date;
  updatedAt?: Date;
}

export interface IMachineImageData {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
}

const machineImageSchema = new Schema<IMachineImageData>(
  {
    image_name: {
      type: String,
      required: true,
      trim: true,
    },
    file_url: {
      type: String,
      required: true,
    },
    cloudinary_public_id: {
      type: String,
      required: true,
    },
    file_size: {
      type: Number,
      required: true,
    },
    mime_type: {
      type: String,
      required: true,
    },
    uploaded_at: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false } // Changed from true to false since these are embedded
);

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
      type: {
        machine_id: {
          type: String
        },
        installed_status: {
          type: String,
          enum: ["installed", "not_installed"]
        },
        status: {
          type: String,
          enum: ["active", "inactive"]
        },
        machine_image: {
          type: [machineImageSchema],
          default: [],
        },
      },
      required: false, // Made optional if some sub-locations don't have machines
    },
  },
  { _id: false }
);

const AreaRouteSchema: Schema = new Schema(
  {
    area_name: {
      type: String,
      required: true,
      trim: true,
    },
    state: {
      type: String,
      required: true,
      trim: true,
    },
    district: {
      type: String,
      required: true,
      trim: true,
    },
    pincode: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^\d{6}$/.test(v); // Validates 6-digit pincode
        },
        message: "Pincode must be 6 digits",
      },
    },
    area_description: {
      type: String,
      required: true,
      trim: true,
    },
    status: {
      type: String,
      enum: ["active", "inactive"],
      required: true,
      default: "active",
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
      trim: true,
    },
    sub_locations: {
      type: [SubLocationSchema],
      required: true,
      validate: {
        validator: function (v: any[]) {
          // Check if we have at least one sub-location
          if (v.length === 0) {
            return false;
          }

          // Remove this validation to allow empty machines
          // Area can exist with sub-locations that have no machines
          return true;
        },
        message: "Area must have at least one sub-location",
      },
    },
  },
  {
    timestamps: true,
    collection: "areaRoutes"
  }
);

// Add indexes for better query performance
AreaRouteSchema.index({ area_name: 1, state: 1, district: 1 }, { unique: false });
AreaRouteSchema.index({ status: 1 });
AreaRouteSchema.index({ pincode: 1 });

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
      type: {
        user_id: { type: String, required: true },
        email: { type: String, required: true },
        name: { type: String },
      },
      required: true,
    },
    ip_address: {
      type: String,
      trim: true,
    },
    user_agent: {
      type: String,
      trim: true,
    },
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