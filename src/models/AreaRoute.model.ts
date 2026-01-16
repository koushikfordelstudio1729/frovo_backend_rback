import mongoose, { Document, Schema, Types } from 'mongoose';

export interface ICreateArea extends Document {
    area_name: string;
    state: string;
    district: string;
    pincode: string;
    area_description: string;
    status: 'active' | 'inactive';
    latitude?: number;
    longitude?: number;
    address?: string;
    sub_locations: {
        campus: string;
        tower: string;
        floor: string;
        select_machine: string[];
    }[]
}

// Define sub-location schema separately
const SubLocationSchema: Schema = new Schema({
    campus: { 
        type: String, 
        required: true 
    },
    tower: { 
        type: String, 
        required: true 
    },
    floor: { 
        type: String, 
        required: true 
    },
    select_machine: {
        type: [String],
        required: true,
        validate: {
            validator: function (v: string[]) {
                return v.length > 0; // At least one machine
            },
            message: 'At least one machine must be selected'
        }
    }
}, { _id: false }); // _id: false prevents creating unnecessary ObjectId for subdocuments

const AreaRouteSchema: Schema = new Schema({
    area_name: { 
        type: String, 
        required: true 
    },
    state: { 
        type: String, 
        required: true 
    },
    district: { 
        type: String, 
        required: true 
    },
    pincode: { 
        type: String, 
        required: true 
    },
    area_description: { 
        type: String, 
        required: true 
    },
    status: { 
        type: String, 
        enum: ['active', 'inactive'], 
        required: true 
    },
    latitude: {
        type: Number,
        min: -90,
        max: 90,
        validate: {
            validator: function (v: number) {
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
            validator: function (v: number) {
                return v >= -180 && v <= 180;
            },
            message: 'Longitude must be between -180 and 180'
        }
    },
    address: { 
        type: String 
    },
    sub_locations: { // Changed from sub_location to sub_locations (array)
    type: [SubLocationSchema], // Now an array of sub-locations
    required: true,
    validate: {
      validator: function (v: any[]) {
        return v.length > 0; // At least one sub-location
      },
      message: 'At least one sub-location must be provided'
    }
  }
}, { timestamps: true });

export const AreaRouteModel = mongoose.model<ICreateArea>('AreaRoute', AreaRouteSchema);