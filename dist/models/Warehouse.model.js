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
exports.FieldAgent = exports.Expense = exports.Inventory = exports.ReturnOrder = exports.QCTemplate = exports.DispatchOrder = exports.GoodsReceiving = exports.Warehouse = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const warehouseSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    partner: { type: String, required: true },
    location: { type: String, required: true },
    capacity: { type: Number, required: true },
    manager: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
const goodsReceivingSchema = new mongoose_1.Schema({
    poNumber: { type: String, required: true },
    vendor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    batchId: { type: String, required: true },
    warehouse: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    qcVerification: {
        packaging: { type: Boolean, required: true },
        expiry: { type: Boolean, required: true },
        label: { type: Boolean, required: true },
        documents: [{ type: String }]
    },
    storage: {
        zone: { type: String, required: true },
        aisle: { type: String, required: true },
        rack: { type: String, required: true },
        bin: { type: String, required: true }
    },
    status: {
        type: String,
        enum: ['received', 'qc_pending', 'qc_passed', 'qc_failed'],
        default: 'received'
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
const dispatchOrderSchema = new mongoose_1.Schema({
    dispatchId: { type: String, required: true, unique: true },
    destination: { type: String, required: true },
    products: [{
            sku: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 }
        }],
    assignedAgent: { type: mongoose_1.Schema.Types.ObjectId, ref: 'FieldAgent', required: true },
    notes: { type: String, maxlength: 500 },
    status: {
        type: String,
        enum: ['pending', 'assigned', 'in_transit', 'delivered', 'cancelled'],
        default: 'pending'
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
}, { timestamps: true });
const qcTemplateSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    sku: {
        type: String,
        required: true,
        trim: true
    },
    parameters: [
        {
            name: {
                type: String,
                required: true,
                trim: true
            },
            value: {
                type: String,
                required: true,
                trim: true
            }
        }
    ],
    isActive: {
        type: Boolean,
        default: true
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    }
}, { timestamps: true });
const returnOrderSchema = new mongoose_1.Schema({
    batchId: { type: String, required: true },
    vendor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    reason: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    status: {
        type: String,
        enum: ['pending', 'approved', 'returned', 'rejected'],
        default: 'pending'
    },
    returnType: {
        type: String,
        enum: ['damaged', 'expired', 'wrong_item', 'overstock', 'other'],
        required: true
    },
    images: [{ type: String }],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
const fieldAgentSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    assignedRoutes: [{ type: String }],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
const inventorySchema = new mongoose_1.Schema({
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    batchId: { type: String, required: true },
    warehouse: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    quantity: { type: Number, required: true, min: 0 },
    minStockLevel: { type: Number, default: 0 },
    maxStockLevel: { type: Number, default: 1000 },
    age: { type: Number, default: 0 },
    expiryDate: { type: Date },
    location: {
        zone: { type: String, required: true },
        aisle: { type: String, required: true },
        rack: { type: String, required: true },
        bin: { type: String, required: true }
    },
    status: {
        type: String,
        enum: ['active', 'low_stock', 'overstock', 'expired', 'quarantine', 'archived'],
        default: 'active'
    },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
const expenseSchema = new mongoose_1.Schema({
    category: {
        type: String,
        enum: ['staffing', 'supplies', 'equipment', 'transport'],
        required: true
    },
    amount: { type: Number, required: true, min: 0 },
    vendor: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Vendor', required: true },
    date: { type: Date, required: true },
    description: { type: String, maxlength: 200 },
    billUrl: { type: String },
    status: {
        type: String,
        enum: ['approved', 'pending'],
        default: 'pending'
    },
    assignedAgent: { type: mongoose_1.Schema.Types.ObjectId, ref: 'FieldAgent', required: true },
    warehouseId: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Warehouse', required: true },
    paymentStatus: {
        type: String,
        enum: ['paid', 'unpaid', 'partially_paid'],
        default: 'unpaid'
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    approvedAt: { type: Date }
}, { timestamps: true });
exports.Warehouse = mongoose_1.default.model('Warehouse', warehouseSchema);
exports.GoodsReceiving = mongoose_1.default.model('GoodsReceiving', goodsReceivingSchema);
exports.DispatchOrder = mongoose_1.default.model('DispatchOrder', dispatchOrderSchema);
exports.QCTemplate = mongoose_1.default.model('QCTemplate', qcTemplateSchema);
exports.ReturnOrder = mongoose_1.default.model('ReturnOrder', returnOrderSchema);
exports.Inventory = mongoose_1.default.model('Inventory', inventorySchema);
exports.Expense = mongoose_1.default.model('Expense', expenseSchema);
exports.FieldAgent = mongoose_1.default.model('FieldAgent', fieldAgentSchema);
