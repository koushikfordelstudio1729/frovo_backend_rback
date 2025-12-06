import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICreateArea extends Document {
    area_name: string;
    select_machine: string;
    area_description: string;
    status: 'active' | 'inactive';
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
    status: { type: String, enum: ['active', 'inactive'], required: true }
}, { timestamps: true });
export const AreaRouteModel = mongoose.model<ICreateArea>('AreaRoute', AreaRouteSchema);

export interface ICreateRoute extends Document {
    route_name: string;
    area_name: Types.ObjectId;
    route_description: string;
    selected_machine: string;
    frequency_type: 'daily' | 'weekly' | 'monthly';
}
const RouteSchema: Schema = new Schema({
    route_name: { type: String, required: true },
    area_name: { type: Schema.Types.ObjectId, ref: 'AreaRoute', required: true },
    route_description: { type: String, required: true },
    selected_machine: { type: String, required: true },
    frequency_type: { type: String, enum: ['daily', 'weekly', 'monthly'], required: true }
}, { timestamps: true });
export const RouteModel = mongoose.model<ICreateRoute>('Route', RouteSchema);
