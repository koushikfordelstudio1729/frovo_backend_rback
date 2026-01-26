import mongoose, { Document, Schema, Types } from "mongoose";

export interface IPriceOverride extends Document {
  _id: Types.ObjectId;
  sku_id: Types.ObjectId;
  sku_code: string;
  product_name: string;
  original_base_price: number;

  // Location hierarchy (all optional - for granular overrides)
  state?: string;
  district?: string;
  area_id?: Types.ObjectId;
  area_name?: string;
  location?: {
    campus?: string;
    tower?: string;
    floor?: string;
  };
  machine_id?: string;

  // Override details
  override_price: number;
  start_date: Date;
  end_date: Date;
  reason: string;

  // Status
  status: "active" | "inactive" | "expired";
  priority: number; // Higher = more specific (machine > location > area > district > state)

  // Audit
  created_by: Types.ObjectId;
  updated_by?: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const PriceOverrideSchema = new Schema<IPriceOverride>(
  {
    sku_id: {
      type: Schema.Types.ObjectId,
      ref: "Catalogue",
      required: true,
      index: true,
    },
    sku_code: {
      type: String,
      required: true,
      index: true,
    },
    product_name: {
      type: String,
      required: true,
    },
    original_base_price: {
      type: Number,
      required: true,
      min: 0,
    },

    // Location hierarchy
    state: {
      type: String,
      trim: true,
      index: true,
    },
    district: {
      type: String,
      trim: true,
      index: true,
    },
    area_id: {
      type: Schema.Types.ObjectId,
      ref: "AreaRoute",
      index: true,
    },
    area_name: {
      type: String,
      trim: true,
    },
    location: {
      campus: { type: String, trim: true },
      tower: { type: String, trim: true },
      floor: { type: String, trim: true },
    },
    machine_id: {
      type: String,
      trim: true,
      index: true,
    },

    // Override details
    override_price: {
      type: Number,
      required: true,
      min: 0,
    },
    start_date: {
      type: Date,
      required: true,
      index: true,
    },
    end_date: {
      type: Date,
      required: true,
      index: true,
    },
    reason: {
      type: String,
      required: true,
      trim: true,
      maxlength: 500,
    },

    // Status
    status: {
      type: String,
      enum: ["active", "inactive", "expired"],
      default: "active",
      index: true,
    },
    priority: {
      type: Number,
      default: 1,
      min: 1,
      max: 5,
      // 1 = State level
      // 2 = District level
      // 3 = Area level
      // 4 = Location level (campus/tower/floor)
      // 5 = Machine level (most specific)
    },

    // Audit
    created_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    updated_by: {
      type: Schema.Types.ObjectId,
      ref: "User",
    },
  },
  {
    timestamps: true,
  }
);

// Compound indexes for efficient querying
PriceOverrideSchema.index({ sku_id: 1, status: 1, start_date: 1, end_date: 1 });
PriceOverrideSchema.index({ sku_id: 1, machine_id: 1, status: 1 });
PriceOverrideSchema.index({ sku_id: 1, state: 1, district: 1, area_id: 1, status: 1 });
PriceOverrideSchema.index({ status: 1, end_date: 1 }); // For expiry check job

// History Model
export interface IPriceOverrideHistory extends Document {
  _id: Types.ObjectId;
  price_override_id: Types.ObjectId;
  sku_id: Types.ObjectId;
  sku_code: string;
  product_name: string;

  action: "CREATE" | "UPDATE" | "DELETE" | "ACTIVATE" | "DEACTIVATE" | "EXPIRE";

  old_data?: Partial<IPriceOverride>;
  new_data?: Partial<IPriceOverride>;
  changes?: {
    field: string;
    old_value: any;
    new_value: any;
  }[];

  performed_by: {
    user_id: Types.ObjectId;
    email: string;
    name?: string;
    role: string;
  };

  ip_address?: string;
  user_agent?: string;
  request_path?: string;

  timestamp: Date;
  createdAt: Date;
}

const PriceOverrideHistorySchema = new Schema<IPriceOverrideHistory>(
  {
    price_override_id: {
      type: Schema.Types.ObjectId,
      ref: "PriceOverride",
      required: true,
      index: true,
    },
    sku_id: {
      type: Schema.Types.ObjectId,
      ref: "Catalogue",
      required: true,
      index: true,
    },
    sku_code: {
      type: String,
      required: true,
      index: true,
    },
    product_name: {
      type: String,
      required: true,
    },

    action: {
      type: String,
      enum: ["CREATE", "UPDATE", "DELETE", "ACTIVATE", "DEACTIVATE", "EXPIRE"],
      required: true,
      index: true,
    },

    old_data: {
      type: Schema.Types.Mixed,
    },
    new_data: {
      type: Schema.Types.Mixed,
    },
    changes: [
      {
        field: { type: String },
        old_value: { type: Schema.Types.Mixed },
        new_value: { type: Schema.Types.Mixed },
      },
    ],

    performed_by: {
      user_id: { type: Schema.Types.ObjectId, ref: "User", required: true },
      email: { type: String, required: true },
      name: { type: String },
      role: { type: String, required: true },
    },

    ip_address: { type: String },
    user_agent: { type: String },
    request_path: { type: String },

    timestamp: {
      type: Date,
      default: Date.now,
      index: true,
    },
  },
  {
    timestamps: true,
    collection: "price_override_history",
  }
);

// Indexes for history queries
PriceOverrideHistorySchema.index({ price_override_id: 1, timestamp: -1 });
PriceOverrideHistorySchema.index({ sku_id: 1, timestamp: -1 });
PriceOverrideHistorySchema.index({ "performed_by.user_id": 1, timestamp: -1 });
PriceOverrideHistorySchema.index({ action: 1, timestamp: -1 });

export const PriceOverrideModel = mongoose.model<IPriceOverride>(
  "PriceOverride",
  PriceOverrideSchema
);

export const PriceOverrideHistoryModel = mongoose.model<IPriceOverrideHistory>(
  "PriceOverrideHistory",
  PriceOverrideHistorySchema
);
