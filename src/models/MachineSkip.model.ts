import mongoose, { Document, Schema, Types } from 'mongoose';

export interface IMachineSkip extends Document {
  _id: Types.ObjectId;
  machineId: Types.ObjectId;
  routeId?: Types.ObjectId;
  agentId: Types.ObjectId;
  taskId?: Types.ObjectId;

  reason: 'Reception Closed' | 'No Access' | 'Machine Not Found' | 'Power Off' | 'Other';
  notes?: string;
  photos?: string[];

  skippedAt: Date;

  // Follow-up
  followUpRequired: boolean;
  followUpDate?: Date;
  followUpAssignedTo?: Types.ObjectId;
  resolved: boolean;
  resolvedAt?: Date;

  createdAt: Date;
  updatedAt: Date;
}

const machineSkipSchema = new Schema<IMachineSkip>({
  machineId: {
    type: Schema.Types.ObjectId,
    ref: 'VendingMachine',
    required: true,
    index: true
  },
  routeId: {
    type: Schema.Types.ObjectId,
    ref: 'Route'
  },
  agentId: {
    type: Schema.Types.ObjectId,
    ref: 'FieldAgent',
    required: true,
    index: true
  },
  taskId: {
    type: Schema.Types.ObjectId,
    ref: 'FieldOpsTask'
  },

  reason: {
    type: String,
    enum: ['Reception Closed', 'No Access', 'Machine Not Found', 'Power Off', 'Other'],
    required: true
  },
  notes: {
    type: String,
    maxlength: 500
  },
  photos: [{
    type: String
  }],

  skippedAt: {
    type: Date,
    required: true,
    default: Date.now
  },

  followUpRequired: {
    type: Boolean,
    default: true
  },
  followUpDate: {
    type: Date
  },
  followUpAssignedTo: {
    type: Schema.Types.ObjectId,
    ref: 'FieldAgent'
  },
  resolved: {
    type: Boolean,
    default: false
  },
  resolvedAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Indexes
machineSkipSchema.index({ machineId: 1, skippedAt: -1 });
machineSkipSchema.index({ agentId: 1, resolved: 1 });

export const MachineSkip = mongoose.model<IMachineSkip>('MachineSkip', machineSkipSchema);
