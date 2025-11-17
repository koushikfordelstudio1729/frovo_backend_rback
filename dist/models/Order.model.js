"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Order = exports.PaymentStatus = exports.OrderStatus = void 0;
const mongoose_1 = require("mongoose");
var OrderStatus;
(function (OrderStatus) {
    OrderStatus["PENDING"] = "pending";
    OrderStatus["CONFIRMED"] = "confirmed";
    OrderStatus["PROCESSING"] = "processing";
    OrderStatus["DISPENSING"] = "dispensing";
    OrderStatus["COMPLETED"] = "completed";
    OrderStatus["CANCELLED"] = "cancelled";
    OrderStatus["FAILED"] = "failed";
    OrderStatus["REFUNDED"] = "refunded";
})(OrderStatus || (exports.OrderStatus = OrderStatus = {}));
var PaymentStatus;
(function (PaymentStatus) {
    PaymentStatus["PENDING"] = "pending";
    PaymentStatus["PROCESSING"] = "processing";
    PaymentStatus["COMPLETED"] = "completed";
    PaymentStatus["FAILED"] = "failed";
    PaymentStatus["REFUNDED"] = "refunded";
})(PaymentStatus || (exports.PaymentStatus = PaymentStatus = {}));
const orderItemSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required']
    },
    productName: {
        type: String,
        required: [true, 'Product name is required']
    },
    productDescription: {
        type: String,
        required: [true, 'Product description is required']
    },
    machineId: {
        type: String,
        required: [true, 'Machine ID is required']
    },
    machineName: {
        type: String,
        required: [true, 'Machine name is required']
    },
    slotNumber: {
        type: String,
        required: [true, 'Slot number is required']
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1']
    },
    unitPrice: {
        type: Number,
        required: [true, 'Unit price is required'],
        min: [0, 'Unit price must be positive']
    },
    totalPrice: {
        type: Number,
        required: [true, 'Total price is required'],
        min: [0, 'Total price must be positive']
    },
    dispensed: {
        type: Boolean,
        default: false
    },
    dispensedAt: {
        type: Date
    }
}, { _id: false });
const deliveryInfoSchema = new mongoose_1.Schema({
    machineId: {
        type: String,
        required: [true, 'Machine ID is required']
    },
    machineName: {
        type: String,
        required: [true, 'Machine name is required']
    },
    location: {
        address: { type: String, required: true },
        city: { type: String, required: true },
        state: { type: String, required: true },
        landmark: { type: String, required: true }
    },
    estimatedDispenseTime: {
        type: Date,
        required: [true, 'Estimated dispense time is required']
    },
    actualDispenseTime: {
        type: Date
    }
}, { _id: false });
const paymentInfoSchema = new mongoose_1.Schema({
    paymentId: {
        type: String,
        required: [true, 'Payment ID is required'],
        unique: true
    },
    paymentMethod: {
        type: String,
        required: [true, 'Payment method is required'],
        enum: ['card', 'upi', 'netbanking', 'wallet', 'cash']
    },
    transactionId: {
        type: String
    },
    paymentGateway: {
        type: String,
        required: [true, 'Payment gateway is required'],
        enum: ['razorpay', 'stripe', 'paytm', 'phonepe', 'googlepay', 'cash']
    },
    paymentStatus: {
        type: String,
        enum: Object.values(PaymentStatus),
        default: PaymentStatus.PENDING
    },
    paidAmount: {
        type: Number,
        required: [true, 'Paid amount is required'],
        min: [0, 'Paid amount must be positive']
    },
    paymentDate: {
        type: Date
    },
    refundId: {
        type: String
    },
    refundAmount: {
        type: Number,
        min: [0, 'Refund amount must be positive']
    },
    refundDate: {
        type: Date
    }
}, { _id: false });
const orderSchema = new mongoose_1.Schema({
    orderId: {
        type: String,
        unique: true,
        index: true
    },
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    items: [orderItemSchema],
    totalItems: {
        type: Number,
        required: [true, 'Total items is required'],
        min: [1, 'Order must have at least 1 item']
    },
    subtotal: {
        type: Number,
        required: [true, 'Subtotal is required'],
        min: [0, 'Subtotal must be positive']
    },
    tax: {
        type: Number,
        default: 0,
        min: [0, 'Tax must be positive']
    },
    totalAmount: {
        type: Number,
        required: [true, 'Total amount is required'],
        min: [0, 'Total amount must be positive']
    },
    orderStatus: {
        type: String,
        enum: Object.values(OrderStatus),
        default: OrderStatus.PENDING,
        index: true
    },
    paymentInfo: paymentInfoSchema,
    deliveryInfo: deliveryInfoSchema,
    orderDate: {
        type: Date,
        default: Date.now,
        index: true
    },
    completedDate: {
        type: Date
    },
    notes: {
        type: String,
        maxlength: [500, 'Notes cannot exceed 500 characters']
    },
    cancelReason: {
        type: String,
        maxlength: [200, 'Cancel reason cannot exceed 200 characters']
    },
    refundReason: {
        type: String,
        maxlength: [200, 'Refund reason cannot exceed 200 characters']
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
orderSchema.index({ userId: 1, orderDate: -1 });
orderSchema.index({ orderStatus: 1, orderDate: -1 });
orderSchema.index({ 'paymentInfo.paymentStatus': 1 });
orderSchema.index({ 'deliveryInfo.machineId': 1 });
orderSchema.pre('save', function (next) {
    if (this.isNew && !this.orderId) {
        const timestamp = Date.now().toString(36);
        const random = Math.random().toString(36).substr(2, 5);
        this.orderId = `ORD-${timestamp}-${random}`.toUpperCase();
    }
    next();
});
orderSchema.virtual('isCompleted').get(function () {
    return this.orderStatus === OrderStatus.COMPLETED;
});
orderSchema.virtual('canBeCancelled').get(function () {
    return [OrderStatus.PENDING, OrderStatus.CONFIRMED].includes(this.orderStatus);
});
orderSchema.virtual('isPaymentSuccessful').get(function () {
    return this.paymentInfo.paymentStatus === PaymentStatus.COMPLETED;
});
orderSchema.methods['updateStatus'] = function (status, reason) {
    this.orderStatus = status;
    if (status === OrderStatus.COMPLETED) {
        this.completedDate = new Date();
    }
    else if (status === OrderStatus.CANCELLED && reason) {
        this.cancelReason = reason;
    }
    return this.save();
};
orderSchema.methods['updatePaymentStatus'] = function (status, transactionId) {
    this.paymentInfo.paymentStatus = status;
    if (status === PaymentStatus.COMPLETED) {
        this.paymentInfo.paymentDate = new Date();
        if (transactionId) {
            this.paymentInfo.transactionId = transactionId;
        }
    }
    return this.save();
};
orderSchema.methods['markItemDispensed'] = function (productId, slotNumber) {
    const item = this.items.find((item) => item.product.toString() === productId &&
        item.slotNumber === slotNumber);
    if (item) {
        item.dispensed = true;
        item.dispensedAt = new Date();
        const allDispensed = this.items.every((item) => item.dispensed);
        if (allDispensed) {
            this.orderStatus = OrderStatus.COMPLETED;
            this.completedDate = new Date();
            this.deliveryInfo.actualDispenseTime = new Date();
        }
        return this.save();
    }
    throw new Error('Item not found in order');
};
exports.Order = (0, mongoose_1.model)('Order', orderSchema);
//# sourceMappingURL=Order.model.js.map