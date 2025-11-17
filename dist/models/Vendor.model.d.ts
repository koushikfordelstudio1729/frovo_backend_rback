import mongoose, { Document, Types } from 'mongoose';
export interface IVendor extends Document {
    _id: Types.ObjectId;
    name: string;
    code: string;
    contactPerson: string;
    email: string;
    phone: string;
    address: {
        street: string;
        city: string;
        state: string;
        zipCode: string;
        country: string;
    };
    taxId: string;
    paymentTerms: string;
    isActive: boolean;
    category: 'supplier' | 'distributor' | 'manufacturer';
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Vendor: mongoose.Model<IVendor, {}, {}, {}, mongoose.Document<unknown, {}, IVendor, {}, {}> & IVendor & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Vendor.model.d.ts.map