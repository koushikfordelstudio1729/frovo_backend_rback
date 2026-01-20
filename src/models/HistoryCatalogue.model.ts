import mongoose, { Schema, Document } from "mongoose";

// Audit Trail Interface
export interface IHistoryCatalogue extends Document {
  // Operation Details
  operation: "create" | "update" | "delete" | "view";
  entity_type: "category" | "sub_category" | "catalogue";
  entity_id: mongoose.Types.ObjectId;
  entity_name: string; // Category name or Product name for easy reference

  // User Details
  user_id: mongoose.Types.ObjectId;
  user_email: string;
  user_role: string;

  // Request Details
  ip_address: string;
  user_agent: string;
  request_method: string;
  request_path: string;

  // Change Details (for updates)
  changes?: {
    field: string;
    old_value: any;
    new_value: any;
  }[];

  // Before and After State (for updates and deletes)
  before_state?: any;
  after_state?: any;

  // Additional Context
  description: string;
  status: "success" | "failed";
  error_message?: string;

  // Metadata
  timestamp: Date;
  session_id?: string;

  createdAt: Date;
  updatedAt: Date;
}

// Audit Trail Schema
const HistoryCatalogueSchema = new Schema<IHistoryCatalogue>(
  {
    // Operation Details
    operation: {
      type: String,
      enum: ["create", "update", "delete", "view"],
      required: true,
      index: true,
    },
    entity_type: {
      type: String,
      enum: ["category", "sub_category", "catalogue"],
      required: true,
      index: true,
    },
    entity_id: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    entity_name: {
      type: String,
      required: true,
      index: true,
    },

    // User Details
    user_id: {
      type: Schema.Types.ObjectId,
      required: true,
      index: true,
    },
    user_email: {
      type: String,
      required: true,
      index: true,
    },
    user_role: {
      type: String,
      required: true,
      index: true,
    },

    // Request Details
    ip_address: {
      type: String,
      required: true,
    },
    user_agent: {
      type: String,
      required: true,
    },
    request_method: {
      type: String,
      required: true,
    },
    request_path: {
      type: String,
      required: true,
    },

    // Change Details
    changes: [
      {
        field: String,
        old_value: Schema.Types.Mixed,
        new_value: Schema.Types.Mixed,
      },
    ],

    // State Snapshots
    before_state: {
      type: Schema.Types.Mixed,
    },
    after_state: {
      type: Schema.Types.Mixed,
    },

    // Additional Context
    description: {
      type: String,
      required: true,
    },
    status: {
      type: String,
      enum: ["success", "failed"],
      required: true,
      default: "success",
      index: true,
    },
    error_message: {
      type: String,
    },

    // Metadata
    timestamp: {
      type: Date,
      default: Date.now,
      required: true,
      index: true,
    },
    session_id: {
      type: String,
    },
  },
  {
    timestamps: true,
    collection: "audit_trails",
  }
);

// Indexes for efficient querying
HistoryCatalogueSchema.index({ entity_type: 1, entity_id: 1 });
HistoryCatalogueSchema.index({ user_id: 1, timestamp: -1 });
HistoryCatalogueSchema.index({ operation: 1, entity_type: 1 });
HistoryCatalogueSchema.index({ timestamp: -1 });
HistoryCatalogueSchema.index({ user_email: 1, timestamp: -1 });
// Create and export model
export const HistoryCatalogue = mongoose.model<IHistoryCatalogue>(
  "HistoryCatalogue",
  HistoryCatalogueSchema
);
