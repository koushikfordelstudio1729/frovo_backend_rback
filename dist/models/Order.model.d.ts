import { Document, Types } from 'mongoose';
export declare enum OrderStatus {
    PENDING = "pending",
    CONFIRMED = "confirmed",
    PROCESSING = "processing",
    DISPENSING = "dispensing",
    COMPLETED = "completed",
    CANCELLED = "cancelled",
    FAILED = "failed",
    REFUNDED = "refunded"
}
export declare enum PaymentStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    COMPLETED = "completed",
    FAILED = "failed",
    REFUNDED = "refunded"
}
export interface IOrderItem {
    product: Types.ObjectId;
    productName: string;
    productDescription: string;
    machineId: string;
    machineName: string;
    slotNumber: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    dispensed: boolean;
    dispensedAt?: Date;
}
export interface IDeliveryInfo {
    machineId: string;
    machineName: string;
    location: {
        address: string;
        city: string;
        state: string;
        landmark: string;
    };
    estimatedDispenseTime: Date;
    actualDispenseTime?: Date;
}
export interface IPaymentInfo {
    paymentId: string;
    paymentMethod: string;
    transactionId?: string;
    paymentGateway: string;
    paymentStatus: PaymentStatus;
    paidAmount: number;
    paymentDate?: Date;
    refundId?: string;
    refundAmount?: number;
    refundDate?: Date;
}
export interface IOrder extends Document {
    orderId: string;
    userId: Types.ObjectId;
    items: IOrderItem[];
    totalItems: number;
    subtotal: number;
    tax: number;
    totalAmount: number;
    orderStatus: OrderStatus;
    paymentInfo: IPaymentInfo;
    deliveryInfo: IDeliveryInfo;
    orderDate: Date;
    completedDate?: Date;
    notes?: string;
    cancelReason?: string;
    refundReason?: string;
}
export declare const Order: import("mongoose").Model<IOrder, {}, {}, {}, Document<unknown, {}, IOrder, {}, {}> & IOrder & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Order.model.d.ts.map