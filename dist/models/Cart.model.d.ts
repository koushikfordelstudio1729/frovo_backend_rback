import { Document, Types } from 'mongoose';
export interface ICartItem {
    product: Types.ObjectId;
    productName: string;
    productPrice: number;
    machineId: string;
    slotNumber: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    addedAt: Date;
}
export interface ICart extends Document {
    userId: Types.ObjectId;
    items: ICartItem[];
    totalItems: number;
    totalAmount: number;
    lastUpdated: Date;
    expiresAt: Date;
    isActive: boolean;
}
export declare const Cart: import("mongoose").Model<ICart, {}, {}, {}, Document<unknown, {}, ICart, {}, {}> & ICart & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Cart.model.d.ts.map