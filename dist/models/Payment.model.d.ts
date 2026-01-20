import { Document, Types } from "mongoose";
export declare enum PaymentMethod {
    CARD = "card",
    UPI = "upi",
    NETBANKING = "netbanking",
    WALLET = "wallet",
    CASH = "cash"
}
export declare enum PaymentGateway {
    RAZORPAY = "razorpay",
    STRIPE = "stripe",
    PAYTM = "paytm",
    PHONEPE = "phonepe",
    GOOGLEPAY = "googlepay",
    CASH = "cash"
}
export declare enum TransactionType {
    PAYMENT = "payment",
    REFUND = "refund",
    PARTIAL_REFUND = "partial_refund"
}
export declare enum TransactionStatus {
    PENDING = "pending",
    PROCESSING = "processing",
    SUCCESS = "success",
    FAILED = "failed",
    CANCELLED = "cancelled",
    EXPIRED = "expired"
}
export interface IPaymentMetadata {
    orderId: string;
    userId: Types.ObjectId;
    machineId: string;
    items: Array<{
        productId: string;
        productName: string;
        quantity: number;
        unitPrice: number;
    }>;
}
export interface IGatewayResponse {
    gatewayTransactionId?: string;
    gatewayOrderId?: string;
    gatewayPaymentId?: string;
    signature?: string;
    errorCode?: string;
    errorMessage?: string;
    rawResponse?: any;
}
export interface IPayment extends Document {
    paymentId: string;
    orderId: string;
    userId: Types.ObjectId;
    amount: number;
    currency: string;
    paymentMethod: PaymentMethod;
    paymentGateway: PaymentGateway;
    transactionType: TransactionType;
    status: TransactionStatus;
    gatewayResponse: IGatewayResponse;
    metadata: IPaymentMetadata;
    initiatedAt: Date;
    completedAt?: Date;
    failedAt?: Date;
    expiresAt: Date;
    attempts: number;
    maxAttempts: number;
    lastAttemptAt?: Date;
    refundableAmount: number;
    refundedAmount: number;
    notes?: string;
}
export declare const Payment: import("mongoose").Model<IPayment, {}, {}, {}, Document<unknown, {}, IPayment, {}, {}> & IPayment & Required<{
    _id: Types.ObjectId;
}> & {
    __v: number;
}, any>;
//# sourceMappingURL=Payment.model.d.ts.map