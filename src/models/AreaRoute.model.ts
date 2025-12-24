import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICreateArea extends Document {
    area_name: string;
    select_machine: string[];
    area_description: string;
    status: 'active' | 'inactive';
    latitude?: number;
    longitude?: number;
    address?: string;
}
const AreaRouteSchema: Schema = new Schema({
    area_name: { type: String, required: true },
     select_machine: {
        type: [String],  // Change to array of strings
        required: true,
        validate: {
            validator: function(v: string[]) {
                return v.length > 0; // At least one machine
            },
            message: 'At least one machine must be selected'
        }
    },
    area_description: { type: String, required: true },
    status: { type: String, enum: ['active', 'inactive'], required: true },
    latitude: {
        type: Number,
        min: -90,
        max: 90,
        validate: {
            validator: function(v: number) {
                return v >= -90 && v <= 90;
            },
            message: 'Latitude must be between -90 and 90'
        }
    },
    longitude: {
        type: Number,
        min: -180,
        max: 180,
        validate: {
            validator: function(v: number) {
                return v >= -180 && v <= 180;
            },
            message: 'Longitude must be between -180 and 180'
        }
    },
    address: { type: String }
}, { timestamps: true });
export const AreaRouteModel = mongoose.model<ICreateArea>('AreaRoute', AreaRouteSchema);

export interface ICreateRoute extends Document {
    route_name: string;
    area_name: Types.ObjectId;
    route_description: string;
    selected_machine: string[];
    frequency_type: 'daily' | 'weekly' | 'monthly' | 'custom';
    weekly_days?: string[];
    custom_dates?: Date[];
    notes?: string;
    machine_sequence?: string[];
}
const RouteSchema: Schema = new Schema({
    route_name: { type: String, required: true },
    area_name: { type: Schema.Types.ObjectId, ref: 'AreaRoute', required: true },
    route_description: { type: String, required: true },
    selected_machine: {
        type: [String],
        required: true,
        validate: {
            validator: function(v: string[]) {
                return v.length > 0;
            },
            message: 'At least one machine must be selected'
        }
    },
    frequency_type: { type: String, enum: ['daily', 'weekly', 'monthly', 'custom'], required: true },
    weekly_days: {
        type: [String],
        enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
        default: undefined
    },
    custom_dates: { type: [Date], default: undefined },
    notes: { type: String },
    machine_sequence: { type: [String], default: undefined }
}, { timestamps: true });
export const RouteModel = mongoose.model<ICreateRoute>('Route', RouteSchema);
