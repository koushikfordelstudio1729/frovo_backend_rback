"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.VendingMachine = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const locationSchema = new mongoose_1.Schema({
    address: {
        type: String,
        required: [true, "Address is required"],
        trim: true,
    },
    city: {
        type: String,
        required: [true, "City is required"],
        trim: true,
    },
    state: {
        type: String,
        trim: true,
    },
    zipCode: {
        type: String,
        trim: true,
    },
    country: {
        type: String,
        required: [true, "Country is required"],
        trim: true,
        default: "India",
    },
    latitude: {
        type: Number,
        min: -90,
        max: 90,
    },
    longitude: {
        type: Number,
        min: -180,
        max: 180,
    },
    landmark: {
        type: String,
        trim: true,
    },
}, { _id: false });
const productSlotSchema = new mongoose_1.Schema({
    slotNumber: {
        type: String,
        required: [true, "Slot number is required"],
        trim: true,
    },
    product: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Product",
        required: [true, "Product is required"],
    },
    quantity: {
        type: Number,
        required: [true, "Quantity is required"],
        min: 0,
        default: 0,
    },
    maxCapacity: {
        type: Number,
        required: [true, "Max capacity is required"],
        min: 1,
    },
    price: {
        type: Number,
        required: [true, "Price is required"],
        min: 0,
    },
}, { _id: false });
const vendingMachineSchema = new mongoose_1.Schema({
    machineId: {
        type: String,
        required: [true, "Machine ID is required"],
        unique: true,
        trim: true,
        uppercase: true,
    },
    name: {
        type: String,
        required: [true, "Machine name is required"],
        trim: true,
        minlength: [2, "Machine name must be at least 2 characters"],
        maxlength: [100, "Machine name cannot exceed 100 characters"],
    },
    location: {
        type: locationSchema,
        required: [true, "Location is required"],
    },
    status: {
        type: String,
        enum: ["Active", "Inactive", "Maintenance", "Out of Service"],
        default: "Active",
    },
    machineModel: {
        type: String,
        required: [true, "Model is required"],
        trim: true,
    },
    manufacturer: {
        type: String,
        trim: true,
    },
    installationDate: {
        type: Date,
        required: [true, "Installation date is required"],
    },
    lastMaintenanceDate: {
        type: Date,
    },
    productSlots: [productSlotSchema],
    paymentMethods: [
        {
            type: String,
            enum: ["Cash", "Card", "UPI", "Wallet", "Mobile Payment"],
        },
    ],
    operatingHours: {
        openTime: {
            type: String,
            default: "00:00",
        },
        closeTime: {
            type: String,
            default: "23:59",
        },
        isAlwaysOpen: {
            type: Boolean,
            default: true,
        },
    },
    temperature: {
        type: Number,
    },
    capacity: {
        type: Number,
        required: [true, "Capacity is required"],
        min: 1,
    },
    revenue: {
        type: Number,
        default: 0,
        min: 0,
    },
    totalSales: {
        type: Number,
        default: 0,
        min: 0,
    },
    isOnline: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: false,
    },
}, {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
});
vendingMachineSchema.index({ machineId: 1 });
vendingMachineSchema.index({ status: 1 });
vendingMachineSchema.index({ "location.city": 1 });
vendingMachineSchema.index({ "location.state": 1 });
vendingMachineSchema.index({ isOnline: 1 });
vendingMachineSchema.index({ createdAt: -1 });
vendingMachineSchema.virtual("id").get(function () {
    return this._id.toHexString();
});
vendingMachineSchema.virtual("availableProducts").get(function () {
    return (this.productSlots || []).filter(slot => slot.quantity > 0).length;
});
vendingMachineSchema.virtual("totalStock").get(function () {
    return (this.productSlots || []).reduce((total, slot) => total + slot.quantity, 0);
});
vendingMachineSchema.set("toJSON", {
    virtuals: true,
    transform: function (_doc, ret) {
        const { _id, __v, ...cleanRet } = ret;
        return cleanRet;
    },
});
exports.VendingMachine = mongoose_1.default.model("VendingMachine", vendingMachineSchema);
