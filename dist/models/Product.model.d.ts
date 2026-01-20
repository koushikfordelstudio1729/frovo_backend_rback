import mongoose, { Document, Types } from "mongoose";
export interface IProduct extends Document {
    _id: Types.ObjectId;
    name: string;
    description?: string;
    price: number;
    category: string;
    brand?: string;
    imageUrl?: string;
    nutritionInfo?: {
        calories?: number;
        protein?: number;
        carbs?: number;
        fat?: number;
        sugar?: number;
        sodium?: number;
    };
    allergens?: string[];
    isActive: boolean;
    createdBy: Types.ObjectId;
    createdAt: Date;
    updatedAt: Date;
}
export declare const Product: mongoose.Model<IProduct, {}, {}, {}, mongoose.Document<unknown, {}, IProduct, {}, {}> & IProduct & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Product.model.d.ts.map