import mongoose, { Document, Types } from "mongoose";
export interface ILocation {
    address: string;
    city: string;
    state?: string;
    zipCode?: string;
    country: string;
    latitude?: number;
    longitude?: number;
    landmark?: string;
}
export interface IProductSlot {
    slotNumber: string;
    product: Types.ObjectId;
    quantity: number;
    maxCapacity: number;
    price: number;
}
export interface IVendingMachine extends Document {
    _id: Types.ObjectId;
    machineId: string;
    name: string;
    location: ILocation;
    status: "Active" | "Inactive" | "Maintenance" | "Out of Service";
    machineModel: string;
    manufacturer?: string;
    installationDate: Date;
    lastMaintenanceDate?: Date;
    productSlots: IProductSlot[];
    paymentMethods: string[];
    operatingHours: {
        openTime: string;
        closeTime: string;
        isAlwaysOpen: boolean;
    };
    temperature?: number;
    capacity: number;
    revenue?: number;
    totalSales?: number;
    isOnline: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const VendingMachine: mongoose.Model<IVendingMachine, {}, {}, {}, mongoose.Document<unknown, {}, IVendingMachine, {}, {}> & IVendingMachine & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=VendingMachine.model.d.ts.map