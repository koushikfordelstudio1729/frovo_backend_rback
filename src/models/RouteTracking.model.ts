import mongoose, { Document, Schema, Types } from "mongoose";

export interface ICheckIn extends Document {
  route_id: Types.ObjectId;
  machine_id: string;
  agent_id: string;
  check_in_time: Date;
  status: "completed" | "skipped";
  planned_sequence?: number;
  actual_sequence?: number;
  notes?: string;
  date: Date;
}

const CheckInSchema: Schema = new Schema(
  {
    route_id: { type: Schema.Types.ObjectId, ref: "Route", required: true },
    machine_id: { type: String, required: true },
    agent_id: { type: String, required: true },
    check_in_time: { type: Date, default: Date.now },
    status: { type: String, enum: ["completed", "skipped"], required: true },
    planned_sequence: { type: Number },
    actual_sequence: { type: Number },
    notes: { type: String },
    date: { type: Date, required: true, default: () => new Date().setHours(0, 0, 0, 0) },
  },
  { timestamps: true }
);

// Index for efficient queries
CheckInSchema.index({ route_id: 1, date: 1 });
CheckInSchema.index({ agent_id: 1, date: 1 });

export const CheckInModel = mongoose.model<ICheckIn>("CheckIn", CheckInSchema);

export interface IMachineReassignment extends Document {
  route_id: Types.ObjectId;
  machine_id: string;
  original_agent_id: string;
  reassigned_agent_id: string;
  reassignment_date: Date;
  reason?: string;
}

const MachineReassignmentSchema: Schema = new Schema(
  {
    route_id: { type: Schema.Types.ObjectId, ref: "Route", required: true },
    machine_id: { type: String, required: true },
    original_agent_id: { type: String, required: true },
    reassigned_agent_id: { type: String, required: true },
    reassignment_date: { type: Date, required: true },
    reason: { type: String },
  },
  { timestamps: true }
);

export const MachineReassignmentModel = mongoose.model<IMachineReassignment>(
  "MachineReassignment",
  MachineReassignmentSchema
);
