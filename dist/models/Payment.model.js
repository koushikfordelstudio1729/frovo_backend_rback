"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Payment = exports.TransactionStatus = exports.TransactionType = exports.PaymentGateway = exports.PaymentMethod = void 0;
const mongoose_1 = require("mongoose");
var PaymentMethod;
(function (PaymentMethod) {
    PaymentMethod["CARD"] = "card";
    PaymentMethod["UPI"] = "upi";
    PaymentMethod["NETBANKING"] = "netbanking";
    PaymentMethod["WALLET"] = "wallet";
    PaymentMethod["CASH"] = "cash";
})(PaymentMethod || (exports.PaymentMethod = PaymentMethod = {}));
var PaymentGateway;
(function (PaymentGateway) {
    PaymentGateway["RAZORPAY"] = "razorpay";
    PaymentGateway["STRIPE"] = "stripe";
    PaymentGateway["PAYTM"] = "paytm";
    PaymentGateway["PHONEPE"] = "phonepe";
    PaymentGateway["GOOGLEPAY"] = "googlepay";
    PaymentGateway["CASH"] = "cash";
})(PaymentGateway || (exports.PaymentGateway = PaymentGateway = {}));
var TransactionType;
(function (TransactionType) {
    TransactionType["PAYMENT"] = "payment";
    TransactionType["REFUND"] = "refund";
    TransactionType["PARTIAL_REFUND"] = "partial_refund";
})(TransactionType || (exports.TransactionType = TransactionType = {}));
var TransactionStatus;
(function (TransactionStatus) {
    TransactionStatus["PENDING"] = "pending";
    TransactionStatus["PROCESSING"] = "processing";
    TransactionStatus["SUCCESS"] = "success";
    TransactionStatus["FAILED"] = "failed";
    TransactionStatus["CANCELLED"] = "cancelled";
    TransactionStatus["EXPIRED"] = "expired";
})(TransactionStatus || (exports.TransactionStatus = TransactionStatus = {}));
const paymentMetadataSchema = new mongoose_1.Schema({
    orderId: {
        type: String,
        required: [true, "Order ID is required"],
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User ID is required"],
    },
    machineId: {
        type: String,
        required: [true, "Machine ID is required"],
    },
    items: [
        {
            productId: { type: String, required: true },
            productName: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
            unitPrice: { type: Number, required: true, min: 0 },
        },
    ],
}, { _id: false });
const gatewayResponseSchema = new mongoose_1.Schema({
    gatewayTransactionId: String,
    gatewayOrderId: String,
    gatewayPaymentId: String,
    signature: String,
    errorCode: String,
    errorMessage: String,
    rawResponse: mongoose_1.Schema.Types.Mixed,
}, { _id: false });
const paymentSchema = new mongoose_1.Schema({
    paymentId: {
        type: String,
        unique: true,
        index: true,
    },
    orderId: {
        type: String,
        required: [true, "Order ID is required"],
        index: true,
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: [true, "User ID is required"],
        index: true,
    },
    amount: {
        type: Number,
        required: [true, "Amount is required"],
        min: [0, "Amount must be positive"],
    },
    currency: {
        type: String,
        required: [true, "Currency is required"],
        default: "INR",
        enum: ["INR", "USD", "EUR"],
    },
    paymentMethod: {
        type: String,
        enum: Object.values(PaymentMethod),
        required: [true, "Payment method is required"],
    },
    paymentGateway: {
        type: String,
        enum: Object.values(PaymentGateway),
        required: [true, "Payment gateway is required"],
    },
    transactionType: {
        type: String,
        enum: Object.values(TransactionType),
        default: TransactionType.PAYMENT,
    },
    status: {
        type: String,
        enum: Object.values(TransactionStatus),
        default: TransactionStatus.PENDING,
        index: true,
    },
    gatewayResponse: gatewayResponseSchema,
    metadata: paymentMetadataSchema,
    initiatedAt: {
        type: Date,
        default: Date.now,
        index: true,
    },
    completedAt: Date,
    failedAt: Date,
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 15 * 60 * 1000),
        index: true,
    },
    attempts: {
        type: Number,
        default: 0,
        min: [0, "Attempts cannot be negative"],
    },
    maxAttempts: {
        type: Number,
        default: 3,
        min: [1, "Max attempts must be at least 1"],
    },
    lastAttemptAt: Date,
    refundableAmount: {
        type: Number,
        default: 0,
        min: [0, "Refundable amount cannot be negative"],
    },
    refundedAmount: {
        type: Number,
        default: 0,
        min: [0, "Refunded amount cannot be negative"],
    },
    notes: {
        type: String,
        maxlength: [500, "Notes cannot exceed 500 characters"],
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
paymentSchema.index({ userId: 1, initiatedAt: -1 });
paymentSchema.index({ status: 1, initiatedAt: -1 });
paymentSchema.index({ paymentGateway: 1, status: 1 });
paymentSchema.index({ orderId: 1, transactionType: 1 });
paymentSchema.pre("save", function (next) {
    if (this.isNew && !this.paymentId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 8);
        this.paymentId = `PAY-${timestamp}-${random}`.toUpperCase();
    }
    if (this.status === TransactionStatus.SUCCESS &&
        this.transactionType === TransactionType.PAYMENT) {
        this.refundableAmount = this.amount - this.refundedAmount;
    }
    next();
});
paymentSchema.virtual("isSuccessful").get(function () {
    return this.status === TransactionStatus.SUCCESS;
});
paymentSchema.virtual("isFailed").get(function () {
    return [
        TransactionStatus.FAILED,
        TransactionStatus.CANCELLED,
        TransactionStatus.EXPIRED,
    ].includes(this.status);
});
paymentSchema.virtual("isPending").get(function () {
    return [TransactionStatus.PENDING, TransactionStatus.PROCESSING].includes(this.status);
});
paymentSchema.virtual("isExpired").get(function () {
    return new Date() > this.expiresAt;
});
paymentSchema.virtual("canBeRefunded").get(function () {
    return (this.status === TransactionStatus.SUCCESS &&
        this.refundableAmount > 0 &&
        this.transactionType === TransactionType.PAYMENT);
});
paymentSchema.methods["markAsSuccessful"] = function (gatewayResponse) {
    this.status = TransactionStatus.SUCCESS;
    this.completedAt = new Date();
    this.gatewayResponse = { ...this.gatewayResponse, ...gatewayResponse };
    this.refundableAmount = this.amount;
    return this.save();
};
paymentSchema.methods["markAsFailed"] = function (errorCode, errorMessage) {
    this.status = TransactionStatus.FAILED;
    this.failedAt = new Date();
    if (errorCode)
        this.gatewayResponse.errorCode = errorCode;
    if (errorMessage)
        this.gatewayResponse.errorMessage = errorMessage;
    return this.save();
};
paymentSchema.methods["incrementAttempt"] = function () {
    this.attempts += 1;
    this.lastAttemptAt = new Date();
    if (this.attempts >= this.maxAttempts) {
        this.status = TransactionStatus.FAILED;
        this.failedAt = new Date();
    }
    return this.save();
};
paymentSchema.methods["processRefund"] = function (refundAmount, refundId) {
    if (!this.canBeRefunded) {
        throw new Error("Payment cannot be refunded");
    }
    if (refundAmount > this.refundableAmount) {
        throw new Error("Refund amount exceeds refundable amount");
    }
    this.refundedAmount += refundAmount;
    this.refundableAmount -= refundAmount;
    this.gatewayResponse.gatewayTransactionId = refundId;
    return this.save();
};
paymentSchema.statics["createPayment"] = function (paymentData) {
    return new this(paymentData).save();
};
paymentSchema.statics["findByOrderId"] = function (orderId) {
    return this.findOne({ orderId, transactionType: TransactionType.PAYMENT });
};
exports.Payment = (0, mongoose_1.model)("Payment", paymentSchema);
