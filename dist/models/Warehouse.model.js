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
exports.FieldAgent = exports.Expense = exports.Inventory = exports.ReturnOrder = exports.QCTemplate = exports.DispatchOrder = exports.RaisePurchaseOrder = exports.Warehouse = exports.GRNnumber = void 0;
const mongoose_1 = __importStar(require("mongoose"));
const grnNumberSchema = new mongoose_1.Schema({
    delivery_challan: { type: String, required: true },
    transporter_name: { type: String, required: true },
    vehicle_number: { type: String, required: true },
    recieved_date: { type: Date, required: true, default: Date.now },
    remarks: { type: String },
    scanned_challan: { type: String },
    qc_status: {
        type: String,
        enum: ["bad", "moderate", "excellent"],
        required: true,
    },
    purchase_order: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "RaisePurchaseOrder",
        required: true,
    },
    vendor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "VendorCreate",
        required: true,
    },
    vendor_details: {
        vendor_name: { type: String, required: true },
        vendor_billing_name: { type: String, required: true },
        vendor_email: { type: String, required: true },
        vendor_phone: { type: String, required: true },
        vendor_category: { type: String, required: true },
        gst_number: { type: String, required: true },
        verification_status: { type: String, required: true },
        vendor_address: { type: String, required: true },
        vendor_contact: { type: String, required: true },
        vendor_id: { type: String, required: true },
    },
    grn_line_items: [
        {
            line_no: { type: Number, required: true },
            sku: { type: String, required: true },
            productName: { type: String, required: true },
            quantity: { type: Number, required: true },
            category: { type: String, required: true },
            pack_size: { type: String, required: true },
            uom: { type: String, required: true },
            unit_price: { type: Number, required: true },
            expected_delivery_date: { type: Date, required: true },
            location: { type: String, required: true },
            received_quantity: { type: Number, default: 0 },
            accepted_quantity: { type: Number, default: 0 },
            rejected_quantity: { type: Number, default: 0 },
        },
    ],
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
});
exports.GRNnumber = mongoose_1.default.model("GRNnumber", grnNumberSchema);
const raisePurchaseOrderSchema = new mongoose_1.Schema({
    po_number: {
        type: String,
        required: false,
        unique: true,
        uppercase: true,
        trim: true,
    },
    po_line_items: [
        {
            line_no: { type: Number, required: true },
            sku: { type: String, required: true },
            productName: { type: String, required: true },
            quantity: { type: Number, required: true },
            category: { type: String, required: true },
            pack_size: { type: String, required: true },
            uom: { type: String, required: true },
            unit_price: { type: Number, required: true },
            expected_delivery_date: { type: Date, required: true },
            location: { type: String, required: true },
            images: [
                {
                    file_name: { type: String, required: true },
                    file_url: { type: String, required: true },
                    cloudinary_public_id: { type: String, required: true },
                    file_size: { type: Number, required: true },
                    mime_type: { type: String, required: true },
                    uploaded_at: { type: Date, default: Date.now },
                },
            ],
        },
    ],
    vendor: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "VendorCreate",
        required: true,
    },
    warehouse: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "Warehouse",
        required: true,
    },
    vendor_details: {
        vendor_name: { type: String, required: true },
        vendor_billing_name: { type: String, required: true },
        vendor_email: { type: String, required: true },
        vendor_phone: { type: String, required: true },
        vendor_category: { type: String, required: true },
        gst_number: { type: String, required: true },
        verification_status: { type: String, required: true },
        vendor_address: { type: String, required: true },
        vendor_contact: { type: String, required: true },
        vendor_id: { type: String, required: true },
    },
    po_status: {
        type: String,
        enum: ["draft", "approved", "pending"],
        default: "draft",
    },
    po_raised_date: {
        type: Date,
        required: true,
        default: Date.now,
    },
    remarks: {
        type: String,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, {
    timestamps: true,
});
raisePurchaseOrderSchema.pre("save", async function (next) {
    if (this.isNew && !this.po_number) {
        this.po_number = await this.generatePONumber();
    }
    if (this.isNew && this.po_number) {
        this.po_number = await this.generatePONumber();
    }
    next();
});
raisePurchaseOrderSchema.methods.generatePONumber = async function () {
    const PO = mongoose_1.default.model("RaisePurchaseOrder");
    let isUnique = false;
    let poNumber = "";
    let attempts = 0;
    const maxAttempts = 10;
    while (!isUnique && attempts < maxAttempts) {
        attempts++;
        const randomNum = Math.floor(1000000 + Math.random() * 9000000);
        poNumber = `PO${randomNum}`;
        const existingPO = await PO.findOne({ po_number: poNumber });
        if (!existingPO) {
            isUnique = true;
        }
    }
    if (!isUnique) {
        throw new Error("Failed to generate unique PO number after multiple attempts");
    }
    return poNumber;
};
raisePurchaseOrderSchema.index({ vendor: 1 });
raisePurchaseOrderSchema.index({ po_status: 1 });
raisePurchaseOrderSchema.index({ po_raised_date: -1 });
const warehouseSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    code: { type: String, required: true, unique: true },
    partner: { type: String, required: true },
    location: { type: String, required: true },
    capacity: { type: Number, required: true },
    manager: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
const dispatchOrderSchema = new mongoose_1.Schema({
    dispatchId: { type: String, required: true, unique: true },
    destination: { type: String, required: true },
    products: [
        {
            sku: { type: String, required: true },
            quantity: { type: Number, required: true, min: 1 },
        },
    ],
    assignedAgent: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    warehouse: { type: mongoose_1.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    notes: { type: String, maxlength: 500 },
    status: {
        type: String,
        enum: ["pending", "assigned", "in_transit", "delivered", "cancelled"],
        default: "pending",
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
const qcTemplateSchema = new mongoose_1.Schema({
    title: {
        type: String,
        required: true,
        trim: true,
    },
    sku: {
        type: String,
        required: true,
        trim: true,
    },
    parameters: [
        {
            name: {
                type: String,
                required: true,
                trim: true,
            },
            value: {
                type: String,
                required: true,
                trim: true,
            },
        },
    ],
    isActive: {
        type: Boolean,
        default: true,
    },
    createdBy: {
        type: mongoose_1.Schema.Types.ObjectId,
        ref: "User",
        required: true,
    },
}, { timestamps: true });
const returnOrderSchema = new mongoose_1.Schema({
    batchId: { type: String, required: true },
    vendor: { type: mongoose_1.Schema.Types.ObjectId, ref: "VendorCreate", required: true },
    warehouse: { type: mongoose_1.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    reason: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    status: {
        type: String,
        enum: ["pending", "approved", "returned", "rejected"],
        default: "pending",
    },
    returnType: {
        type: String,
        enum: ["damaged", "expired", "wrong_item", "overstock", "other"],
        required: true,
    },
    images: [{ type: String }],
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
const fieldAgentSchema = new mongoose_1.Schema({
    userId: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    name: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true },
    phone: { type: String, trim: true },
    assignedRoutes: [{ type: String }],
    assignedWarehouse: { type: mongoose_1.Schema.Types.ObjectId, ref: "Warehouse" },
    assignedArea: { type: mongoose_1.Schema.Types.ObjectId, ref: "Area" },
    isActive: { type: Boolean, default: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
const inventorySchema = new mongoose_1.Schema({
    sku: { type: String, required: true },
    productName: { type: String, required: true },
    batchId: { type: String, required: true },
    warehouse: { type: mongoose_1.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    quantity: { type: Number, required: true, min: 0 },
    minStockLevel: { type: Number, default: 0 },
    maxStockLevel: { type: Number, default: 1000 },
    age: { type: Number, default: 0 },
    expiryDate: { type: Date },
    location: {
        zone: { type: String, required: true },
        aisle: { type: String, required: true },
        rack: { type: String, required: true },
        bin: { type: String, required: true },
    },
    status: {
        type: String,
        enum: ["active", "low_stock", "overstock", "expired", "quarantine", "archived"],
        default: "active",
    },
    isArchived: { type: Boolean, default: false },
    archivedAt: { type: Date },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: true });
const expenseSchema = new mongoose_1.Schema({
    category: {
        type: String,
        enum: ["staffing", "supplies", "equipment", "transport"],
        required: true,
    },
    amount: { type: Number, required: true, min: 0 },
    vendor: { type: mongoose_1.Schema.Types.ObjectId, ref: "VendorCreate", required: true },
    date: { type: Date, required: true },
    description: { type: String, maxlength: 200 },
    billUrl: { type: String },
    status: {
        type: String,
        enum: ["approved", "pending"],
        default: "pending",
    },
    assignedAgent: { type: mongoose_1.Schema.Types.ObjectId, ref: "FieldAgent", required: true },
    warehouseId: { type: mongoose_1.Schema.Types.ObjectId, ref: "Warehouse", required: true },
    paymentStatus: {
        type: String,
        enum: ["paid", "unpaid", "partially_paid"],
        default: "unpaid",
    },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User", required: true },
    approvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: "User" },
    approvedAt: { type: Date },
}, { timestamps: true });
exports.Warehouse = mongoose_1.default.model("Warehouse", warehouseSchema);
exports.RaisePurchaseOrder = mongoose_1.default.model("RaisePurchaseOrder", raisePurchaseOrderSchema);
exports.DispatchOrder = mongoose_1.default.model("DispatchOrder", dispatchOrderSchema);
exports.QCTemplate = mongoose_1.default.model("QCTemplate", qcTemplateSchema);
exports.ReturnOrder = mongoose_1.default.model("ReturnOrder", returnOrderSchema);
exports.Inventory = mongoose_1.default.model("Inventory", inventorySchema);
exports.Expense = mongoose_1.default.model("Expense", expenseSchema);
exports.FieldAgent = mongoose_1.default.model("FieldAgent", fieldAgentSchema);
