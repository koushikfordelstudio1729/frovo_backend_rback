"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Cart = void 0;
const mongoose_1 = require("mongoose");
const cartItemSchema = new mongoose_1.Schema({
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'Product',
        required: [true, 'Product is required']
    },
    productName: {
        type: String,
        required: [true, 'Product name is required']
    },
    productPrice: {
        type: Number,
        required: [true, 'Product price is required']
    },
    machineId: {
        type: String,
        required: [true, 'Machine ID is required']
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
    addedAt: {
        type: Date,
        default: Date.now
    }
}, { _id: false });
const cartSchema = new mongoose_1.Schema({
    userId: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'User ID is required'],
        index: true
    },
    items: [cartItemSchema],
    totalItems: {
        type: Number,
        default: 0,
        min: [0, 'Total items cannot be negative']
    },
    totalAmount: {
        type: Number,
        default: 0,
        min: [0, 'Total amount cannot be negative']
    },
    lastUpdated: {
        type: Date,
        default: Date.now
    },
    expiresAt: {
        type: Date,
        default: () => new Date(Date.now() + 24 * 60 * 60 * 1000),
        index: { expireAfterSeconds: 0 }
    },
    isActive: {
        type: Boolean,
        default: true
    }
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
});
cartSchema.index({ userId: 1, isActive: 1 });
cartSchema.pre('save', function (next) {
    if (this.isModified('items')) {
        this.totalItems = this.items.reduce((sum, item) => sum + item.quantity, 0);
        this.totalAmount = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
        this.lastUpdated = new Date();
    }
    next();
});
cartSchema.virtual('isEmpty').get(function () {
    return this.items.length === 0;
});
cartSchema.methods['addItem'] = function (item) {
    const existingItemIndex = this.items.findIndex((cartItem) => cartItem.product.toString() === item.product.toString() &&
        cartItem.machineId === item.machineId &&
        cartItem.slotNumber === item.slotNumber);
    const totalPrice = item.quantity * item.unitPrice;
    if (existingItemIndex > -1) {
        this.items[existingItemIndex].quantity += item.quantity;
        this.items[existingItemIndex].totalPrice = this.items[existingItemIndex].quantity * this.items[existingItemIndex].unitPrice;
    }
    else {
        this.items.push({
            ...item,
            totalPrice,
            addedAt: new Date()
        });
    }
    return this.save();
};
cartSchema.methods['removeItem'] = function (productId, machineId, slotNumber) {
    this.items = this.items.filter((item) => !(item.product.toString() === productId &&
        item.machineId === machineId &&
        item.slotNumber === slotNumber));
    return this.save();
};
cartSchema.methods['updateItemQuantity'] = function (productId, machineId, slotNumber, quantity) {
    const itemIndex = this.items.findIndex((item) => item.product.toString() === productId &&
        item.machineId === machineId &&
        item.slotNumber === slotNumber);
    if (itemIndex > -1) {
        if (quantity <= 0) {
            this.items.splice(itemIndex, 1);
        }
        else {
            this.items[itemIndex].quantity = quantity;
            this.items[itemIndex].totalPrice = quantity * this.items[itemIndex].unitPrice;
        }
        return this.save();
    }
    throw new Error('Item not found in cart');
};
cartSchema.methods['clearCart'] = function () {
    this.items = [];
    return this.save();
};
exports.Cart = (0, mongoose_1.model)('Cart', cartSchema);
//# sourceMappingURL=Cart.model.js.map