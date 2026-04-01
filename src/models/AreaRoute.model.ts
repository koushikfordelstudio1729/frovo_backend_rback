import mongoose, { Document, Schema, Types } from "mongoose";

// Define interfaces and schemas for Location, SubLocation, MachineDetails, and HistoryArea
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
    image_name: { type: String, required: true, trim: true },
    file_url: { type: String, required: true },
    cloudinary_public_id: { type: String, required: true },
    file_size: { type: Number, required: true },
    mime_type: { type: String, required: true },
    uploaded_at: { type: Date, default: Date.now },
  },
  { _id: false }
);

export interface ILocation extends Document {
  area_name: string;
  state: string;
  district: string;
  pincode: string;
  area_description: string;
  status: "active" | "inactive";
  latitude?: number;
  longitude?: number;
  address?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const LocationSchema: Schema = new Schema(
  {
    area_name: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    district: { type: String, required: true, trim: true },
    pincode: {
      type: String,
      required: true,
      trim: true,
      validate: {
        validator: function (v: string) {
          return /^\d{6}$/.test(v);
        },
        message: "Pincode must be 6 digits",
      },
    },
    area_description: { type: String, required: true, trim: true },
    status: { type: String, enum: ["active", "inactive"], required: true, default: "active" },
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
    address: { type: String, trim: true },
  },
  {
    timestamps: true,
    collection: "locations",
  }
);

LocationSchema.index({ area_name: 1, state: 1, district: 1 }, { unique: false });
LocationSchema.index({ status: 1 });
LocationSchema.index({ pincode: 1 });

export const LocationModel = mongoose.model<ILocation>("Location", LocationSchema);

export interface ISubLocation extends Document {
  campus: string;
  tower: string;
  floor: string;
  select_machine: string[];
  location_id: Types.ObjectId;
  createdAt?: Date;
  updatedAt?: Date;
}

const SubLocationSchema: Schema = new Schema(
  {
    campus: { type: String, required: true, trim: true },
    tower: { type: String, required: true, trim: true },
    floor: { type: String, required: true, trim: true },
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
    location_id: { type: Schema.Types.ObjectId, ref: "Location", required: true },
  },
  {
    timestamps: true,
    collection: "sublocations",
  }
);

SubLocationSchema.index({ select_machine: 1 });
SubLocationSchema.index({ location_id: 1 });

export const SubLocationModel = mongoose.model<ISubLocation>("SubLocation", SubLocationSchema);

export interface IMachineDetails extends Document {
  machine_name: string;
  sub_location_id: Types.ObjectId;
  installed_status: "installed" | "not_installed";
  status: "active" | "inactive";
  machine_image: IMachineImageData[];
  createdAt?: Date;
  updatedAt?: Date;
}

const MachineDetailsSchema: Schema = new Schema(
  {
    machine_name: { type: String, required: true, trim: true },
    sub_location_id: { type: Schema.Types.ObjectId, ref: "SubLocation", required: true },
    installed_status: { type: String, enum: ["installed", "not_installed"], required: true },
    status: { type: String, enum: ["active", "inactive"], required: true, default: "active" },
    machine_image: { type: [machineImageSchema], default: [] },
  },
  {
    timestamps: true,
    collection: "machine_details",
  }
);

// Add a pre-save middleware to validate machine_name exists in sub-location
MachineDetailsSchema.pre("save", async function (next) {
  try {
    const subLocation = await mongoose.model("SubLocation").findById(this.sub_location_id);

    if (!subLocation) {
      throw new Error("Sub-location not found");
    }

    if (!subLocation.select_machine.includes(this.machine_name)) {
      throw new Error(
        `Machine "${this.machine_name}" is not in the selected machines list for this sub-location`
      );
    }

    next();
  } catch (error) {
    next(error as Error);
  }
});

MachineDetailsSchema.index({ machine_name: 1, sub_location_id: 1 }, { unique: true });
MachineDetailsSchema.index({ sub_location_id: 1 });
MachineDetailsSchema.index({ status: 1 });
MachineDetailsSchema.index({ installed_status: 1 });

export const MachineDetailsModel = mongoose.model<IMachineDetails>(
  "MachineDetails",
  MachineDetailsSchema
);

export interface IHistoryArea extends Document {
  location_id: Types.ObjectId;
  action: "CREATE" | "UPDATE" | "DELETE" | "STATUS_CHANGE" | "ADD_SUB_LOCATION" | "REMOVE_MACHINE";
  old_data?: Partial<ILocation>;
  new_data?: Partial<ILocation>;
  changes?: Record<string, { old: any; new: any }>;
  performed_by: {
    user_id: string;
    email: string;
    name?: string;
  };
  ip_address?: string;
  user_agent?: string;
  timestamp: Date;
  createdAt?: Date;
  updatedAt?: Date;
}

const HistoryAreaSchema: Schema = new Schema(
  {
    location_id: { type: Schema.Types.ObjectId, ref: "Location", required: true },
    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "STATUS_CHANGE", "ADD_SUB_LOCATION", "REMOVE_MACHINE"],
      required: true,
    },
    old_data: { type: Schema.Types.Mixed, default: null },
    new_data: { type: Schema.Types.Mixed, default: null },
    changes: { type: Schema.Types.Mixed, default: null },
    performed_by: {
      type: new Schema(
        {
          user_id: { type: String, required: true },
          email: { type: String, required: true },
          name: { type: String },
        },
        { _id: false }
      ),
      required: true,
    },
    ip_address: { type: String, trim: true },
    user_agent: { type: String, trim: true },
    timestamp: { type: Date, default: Date.now },
  },
  {
    timestamps: true,
    collection: "history_areas",
  }
);

HistoryAreaSchema.index({ location_id: 1, timestamp: -1 });
HistoryAreaSchema.index({ "performed_by.user_id": 1 });
HistoryAreaSchema.index({ action: 1 });

export const HistoryAreaModel = mongoose.model<IHistoryArea>("HistoryArea", HistoryAreaSchema);
