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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.warehouseService = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
const Warehouse_model_1 = require("../models/Warehouse.model");
const mongoose_2 = require("mongoose");
const documentUpload_service_1 = require("./documentUpload.service");
const FieldOpsTask_model_1 = require("../models/FieldOpsTask.model");
const models_1 = require("../models");
const logger_util_1 = require("../utils/logger.util");
class WarehouseService {
    constructor() {
        this.documentUploadService = new documentUpload_service_1.DocumentUploadService();
    }
    async getDashboard(warehouseId, filters) {
        const dateFilter = this.getDateFilter(filters?.dateRange);
        const baseQuery = {};
        if (warehouseId && mongoose_2.Types.ObjectId.isValid(warehouseId)) {
            baseQuery.warehouse = new mongoose_2.Types.ObjectId(warehouseId);
        }
        if (filters?.category) {
            baseQuery.productName = { $regex: filters.category, $options: "i" };
        }
        const [inbound, outbound, pendingQC, todayDispatches] = await Promise.all([
            Warehouse_model_1.RaisePurchaseOrder.countDocuments({
                ...baseQuery,
                ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            }),
            Warehouse_model_1.DispatchOrder.countDocuments({
                ...baseQuery,
                ...(Object.keys(dateFilter).length > 0 && { createdAt: dateFilter }),
            }),
            Warehouse_model_1.RaisePurchaseOrder.countDocuments({
                ...baseQuery,
                po_status: "draft",
            }),
            Warehouse_model_1.DispatchOrder.countDocuments({
                ...baseQuery,
                createdAt: {
                    $gte: new Date(new Date().setHours(0, 0, 0, 0)),
                    $lte: new Date(new Date().setHours(23, 59, 59, 999)),
                },
            }),
        ]);
        const alerts = await this.generateAlerts(warehouseId);
        const recentActivities = await this.getRecentActivities(warehouseId);
        const pendingVsRefill = await this.generatePendingVsRefillData(warehouseId, filters);
        const filterOptions = await this.getFilterOptions();
        const warehouseInfo = await this.getWarehouseInfo(warehouseId);
        return {
            kpis: { inbound, outbound, pendingQC, todayDispatches },
            alerts,
            recentActivities,
            pendingVsRefill,
            filters: filterOptions,
            warehouseInfo,
        };
    }
    async generatePendingVsRefillData(_warehouseId, _filters) {
        const days = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
        const pendingPercentages = [100, 90, 60, 40, 20, 50, 70];
        const refillPercentages = [80, 70, 90, 60, 40, 85, 95];
        return { days, pendingPercentages, refillPercentages };
    }
    async getFilterOptions() {
        try {
            const categories = await Warehouse_model_1.Inventory.aggregate([
                {
                    $match: {
                        productName: { $exists: true, $ne: "" },
                    },
                },
                {
                    $group: {
                        _id: { $toLower: "$productName" },
                    },
                },
                {
                    $project: {
                        name: "$_id",
                        _id: 0,
                    },
                },
                { $limit: 10 },
            ]);
            const categoryNames = categories
                .map((cat) => cat.name.charAt(0).toUpperCase() + cat.name.slice(1))
                .filter((name) => name.length > 0);
            const partners = await Warehouse_model_1.RaisePurchaseOrder.aggregate([
                {
                    $lookup: {
                        from: "vendorcreates",
                        localField: "vendor",
                        foreignField: "_id",
                        as: "vendorData",
                    },
                },
                {
                    $unwind: {
                        path: "$vendorData",
                        preserveNullAndEmptyArrays: true,
                    },
                },
                {
                    $group: {
                        _id: "$vendor",
                        vendorName: { $first: "$vendorData.vendor_name" },
                    },
                },
                {
                    $match: {
                        vendorName: { $exists: true, $ne: null },
                    },
                },
                {
                    $project: {
                        name: "$vendorName",
                        _id: 0,
                    },
                },
                { $limit: 10 },
            ]);
            const partnerNames = partners.map((p) => p.name).filter(Boolean);
            return {
                categories: categoryNames.length > 0
                    ? categoryNames
                    : ["Snacks", "Beverages", "Perishable", "Non-Perishable"],
                partners: partnerNames.length > 0
                    ? partnerNames
                    : ["XYZ Warehouse", "ABC Suppliers", "Global Foods"],
            };
        }
        catch (error) {
            logger_util_1.logger.error("Error getting filter options:", error);
            return {
                categories: ["Snacks", "Beverages", "Perishable", "Non-Perishable"],
                partners: ["XYZ Warehouse", "ABC Suppliers", "Global Foods"],
            };
        }
    }
    async getWarehouseInfo(warehouseId) {
        try {
            const pendingBatches = await Warehouse_model_1.RaisePurchaseOrder.countDocuments({
                ...(warehouseId &&
                    mongoose_2.Types.ObjectId.isValid(warehouseId) && {
                    warehouse: new mongoose_2.Types.ObjectId(warehouseId),
                }),
                po_status: "draft",
            });
            return {
                name: "XYZ WAREHOUSE",
                pendingBatches,
            };
        }
        catch (error) {
            logger_util_1.logger.error("Error getting warehouse info:", error);
            return {
                name: "XYZ WAREHOUSE",
                pendingBatches: 3,
            };
        }
    }
    getDateFilter(dateRange) {
        if (!dateRange)
            return {};
        if (typeof dateRange === "string" && dateRange.includes("-")) {
            try {
                const parts = dateRange.split("-");
                const [dayStr, monthStr, yearStr] = parts;
                const day = Number(dayStr);
                const month = Number(monthStr);
                const year = Number(yearStr);
                if ([day, month, year].every(n => Number.isInteger(n) && !Number.isNaN(n))) {
                    const customDate = new Date(year, month - 1, day);
                    const startOfDay = new Date(customDate);
                    startOfDay.setHours(0, 0, 0, 0);
                    const endOfDay = new Date(customDate);
                    endOfDay.setHours(23, 59, 59, 999);
                    return { $gte: startOfDay, $lte: endOfDay };
                }
            }
            catch (error) {
                logger_util_1.logger.error("Error parsing custom date:", error);
                return {};
            }
        }
        const now = new Date();
        switch (dateRange) {
            case "today":
                return {
                    $gte: new Date(now.setHours(0, 0, 0, 0)),
                    $lte: new Date(now.setHours(23, 59, 59, 999)),
                };
            case "this_week": {
                const startOfWeek = new Date(now);
                startOfWeek.setDate(now.getDate() - now.getDay());
                startOfWeek.setHours(0, 0, 0, 0);
                const endOfWeek = new Date(startOfWeek);
                endOfWeek.setDate(startOfWeek.getDate() + 6);
                endOfWeek.setHours(23, 59, 59, 999);
                return { $gte: startOfWeek, $lte: endOfWeek };
            }
            case "this_month": {
                const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
                const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0);
                endOfMonth.setHours(23, 59, 59, 999);
                return { $gte: startOfMonth, $lte: endOfMonth };
            }
            default:
                return {};
        }
    }
    async createPurchaseOrder(data, createdBy) {
        try {
            logger_util_1.logger.info("📦 Received PO data:", {
                vendor: data.vendor,
                warehouse: data.warehouse,
                po_line_items_count: data.po_line_items?.length || 0,
                vendor_details_present: data.vendor_details ? "Yes" : "No",
            });
            const VendorModel = mongoose_1.default.model("VendorCreate");
            const vendor = await VendorModel.findById(data.vendor);
            if (!vendor) {
                throw new Error("Vendor not found");
            }
            if (!data.warehouse) {
                throw new Error("Warehouse ID is required when creating a purchase order");
            }
            const warehouseId = new mongoose_2.Types.ObjectId(data.warehouse);
            logger_util_1.logger.info("🏢 Using warehouse ID:", warehouseId);
            const warehouseExists = await Warehouse_model_1.Warehouse.findOne({
                _id: warehouseId,
                isActive: true,
            });
            if (!warehouseExists) {
                throw new Error("Warehouse not found or inactive");
            }
            const vendorDetails = {
                vendor_name: vendor.vendor_name,
                vendor_billing_name: vendor.vendor_billing_name,
                vendor_email: vendor.vendor_email,
                vendor_phone: vendor.contact_phone,
                vendor_category: vendor.vendor_category,
                gst_number: vendor.gst_number,
                verification_status: vendor.verification_status,
                vendor_address: vendor.vendor_address,
                vendor_contact: vendor.primary_contact_name,
                vendor_id: vendor.vendor_id,
            };
            const purchaseOrder = await Warehouse_model_1.RaisePurchaseOrder.create({
                vendor: data.vendor,
                warehouse: warehouseId,
                vendor_details: vendorDetails,
                po_raised_date: data.po_raised_date || new Date(),
                po_status: data.po_status || "draft",
                remarks: data.remarks,
                po_line_items: data.po_line_items || [],
                createdBy,
            });
            logger_util_1.logger.info("✅ PO created with vendor details and warehouse stored in document");
            return purchaseOrder;
        }
        catch (error) {
            logger_util_1.logger.error("❌ Error creating PO:", error);
            throw new Error(`Failed to create purchase order: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async createGRN(purchaseOrderId, grnData, createdBy, uploadedFile) {
        try {
            logger_util_1.logger.info("📦 Creating GRN for PO:", purchaseOrderId);
            if (!mongoose_2.Types.ObjectId.isValid(purchaseOrderId)) {
                throw new Error("Invalid purchase order ID");
            }
            if (!grnData.delivery_challan || !grnData.transporter_name || !grnData.vehicle_number) {
                throw new Error("Missing required GRN fields: delivery_challan, transporter_name, vehicle_number");
            }
            const purchaseOrder = await Warehouse_model_1.RaisePurchaseOrder.findById(purchaseOrderId).populate("vendor");
            if (!purchaseOrder) {
                throw new Error("Purchase order not found");
            }
            if (purchaseOrder.po_status !== "approved") {
                throw new Error("Cannot create GRN for non-approved purchase order");
            }
            const existingGRN = await Warehouse_model_1.GRNnumber.findOne({ purchase_order: purchaseOrderId });
            if (existingGRN) {
                throw new Error("GRN already exists for this purchase order");
            }
            const grnNumber = await this.generateGRNNumber();
            let scannedChallanUrl = grnData.scanned_challan;
            if (uploadedFile) {
                logger_util_1.logger.info("📤 Uploading scanned challan to Cloudinary...");
                const documentUploadService = new documentUpload_service_1.DocumentUploadService();
                const uploadResult = await documentUploadService.uploadToCloudinary(uploadedFile.buffer, uploadedFile.originalname, "frovo/grn_challans");
                scannedChallanUrl = uploadResult.url;
                logger_util_1.logger.info("✅ Scanned challan uploaded:", uploadResult.url);
            }
            const grnPayload = {
                grn_number: grnNumber,
                purchase_order: purchaseOrderId,
                delivery_challan: grnData.delivery_challan,
                transporter_name: grnData.transporter_name,
                vehicle_number: grnData.vehicle_number,
                recieved_date: grnData.recieved_date,
                remarks: grnData.remarks,
                scanned_challan: scannedChallanUrl,
                qc_status: grnData.qc_status,
                vendor: purchaseOrder.vendor,
                vendor_details: purchaseOrder.vendor_details,
                grn_line_items: purchaseOrder.po_line_items.map(item => {
                    const quantityData = grnData.quantities?.find((q) => q.sku === item.sku);
                    return {
                        line_no: item.line_no,
                        sku: item.sku,
                        productName: item.productName,
                        quantity: item.quantity,
                        category: item.category,
                        pack_size: item.pack_size,
                        uom: item.uom,
                        unit_price: item.unit_price,
                        expected_delivery_date: item.expected_delivery_date,
                        location: item.location,
                        received_quantity: quantityData?.received_quantity || 0,
                        accepted_quantity: quantityData?.accepted_quantity || 0,
                        rejected_quantity: quantityData?.rejected_quantity || 0,
                    };
                }),
                createdBy,
                po_status: "received",
            };
            const grn = await Warehouse_model_1.GRNnumber.create(grnPayload);
            await Warehouse_model_1.RaisePurchaseOrder.findByIdAndUpdate(purchaseOrderId, { po_status: "received" });
            logger_util_1.logger.info("✅ GRN created successfully:", grn.delivery_challan);
            const warehouseId = purchaseOrder.warehouse;
            if (!warehouseId) {
                logger_util_1.logger.warn("⚠️  Warning: Purchase order does not have warehouse assigned. Skipping inventory creation.");
                logger_util_1.logger.warn("   Please add warehouse field to existing POs for inventory tracking.");
            }
            else {
                logger_util_1.logger.info("📦 Adding inventory from GRN to warehouse:", warehouseId);
                for (const item of purchaseOrder.po_line_items) {
                    const quantityData = grnData.quantities?.find((q) => q.sku === item.sku);
                    const existingInventory = await Warehouse_model_1.Inventory.findOne({
                        sku: item.sku,
                        warehouse: warehouseId,
                    });
                    if (existingInventory) {
                        const updateData = {
                            $inc: { quantity: item.quantity },
                        };
                        if (quantityData?.expiry_date) {
                            const newExpiryDate = new Date(quantityData.expiry_date);
                            if (!existingInventory.expiryDate || newExpiryDate < existingInventory.expiryDate) {
                                updateData.expiryDate = newExpiryDate;
                            }
                        }
                        await Warehouse_model_1.Inventory.findByIdAndUpdate(existingInventory._id, updateData);
                        logger_util_1.logger.info(`  ✅ Updated inventory for ${item.sku}: +${item.quantity}`);
                    }
                    else {
                        const inventoryData = {
                            sku: item.sku,
                            productName: item.productName,
                            batchId: grn.delivery_challan,
                            warehouse: warehouseId,
                            quantity: item.quantity,
                            minStockLevel: 0,
                            maxStockLevel: 10000,
                            age: 0,
                            location: {
                                zone: item.location || "A",
                                aisle: "1",
                                rack: "1",
                                bin: "1",
                            },
                            status: "active",
                            isArchived: false,
                            createdBy,
                        };
                        if (quantityData?.expiry_date) {
                            inventoryData.expiryDate = new Date(quantityData.expiry_date);
                        }
                        await Warehouse_model_1.Inventory.create(inventoryData);
                        logger_util_1.logger.info(`  ✅ Created inventory for ${item.sku}: ${item.quantity} units`);
                    }
                }
            }
            const populatedGRN = await Warehouse_model_1.GRNnumber.findById(grn._id)
                .populate("vendor")
                .populate("purchase_order")
                .populate("createdBy", "name email");
            return populatedGRN;
        }
        catch (error) {
            logger_util_1.logger.error("❌ Error creating GRN:", error);
            throw new Error(`Failed to create GRN: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async generateGRNNumber() {
        let isUnique = false;
        let grnNumber = "";
        let attempts = 0;
        const maxAttempts = 10;
        while (!isUnique && attempts < maxAttempts) {
            attempts++;
            const randomNum = Math.floor(10000000 + Math.random() * 90000000);
            grnNumber = `GRN${randomNum}`;
            const existingGRN = await Warehouse_model_1.GRNnumber.findOne({ grn_number: grnNumber });
            if (!existingGRN) {
                isUnique = true;
            }
        }
        if (!isUnique) {
            throw new Error("Failed to generate unique GRN number after multiple attempts");
        }
        return grnNumber;
    }
    async deletePurchaseOrder(id) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(id)) {
                throw new Error("Invalid purchase order ID");
            }
            const purchaseOrder = await Warehouse_model_1.RaisePurchaseOrder.findById(id);
            if (!purchaseOrder) {
                throw new Error("Purchase order not found");
            }
            const existingGRN = await Warehouse_model_1.GRNnumber.findOne({ purchase_order: id });
            if (existingGRN) {
                throw new Error("Cannot delete purchase order - GRN already exists for this PO");
            }
            if (purchaseOrder.po_status === "approved") {
                throw new Error("Cannot delete approved purchase order");
            }
            await Warehouse_model_1.RaisePurchaseOrder.findByIdAndDelete(id);
            logger_util_1.logger.info(`✅ Purchase order ${id} deleted successfully`);
        }
        catch (error) {
            logger_util_1.logger.error("❌ Error deleting purchase order:", error);
            throw new Error(`Failed to delete purchase order: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async getGRNById(grnId) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(grnId)) {
                logger_util_1.logger.warn("⚠️ Invalid GRN ID format:", grnId);
                return null;
            }
            const grn = await Warehouse_model_1.GRNnumber.findById(grnId)
                .populate("vendor")
                .populate("purchase_order")
                .populate("createdBy", "name email");
            if (!grn) {
                logger_util_1.logger.warn("⚠️ GRN not found with ID:", grnId);
                return null;
            }
            return grn;
        }
        catch (error) {
            logger_util_1.logger.error("❌ Error fetching GRN by ID:", error);
            throw new Error(`Failed to fetch GRN: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async getGRNs(filters) {
        try {
            const query = {};
            if (filters?.qc_status) {
                query.qc_status = filters.qc_status;
            }
            if (filters?.transporter_name) {
                query.transporter_name = {
                    $regex: filters.transporter_name.trim(),
                    $options: "i",
                };
            }
            if (filters?.startDate || filters?.endDate) {
                query.recieved_date = {};
                if (filters.startDate) {
                    query.recieved_date.$gte = new Date(filters.startDate);
                }
                if (filters.endDate) {
                    const endDate = new Date(filters.endDate);
                    endDate.setHours(23, 59, 59, 999);
                    query.recieved_date.$lte = endDate;
                }
            }
            if (filters?.vendor && mongoose_2.Types.ObjectId.isValid(filters.vendor)) {
                query.vendor = new mongoose_2.Types.ObjectId(filters.vendor);
            }
            if (filters?.purchase_order && mongoose_2.Types.ObjectId.isValid(filters.purchase_order)) {
                query.purchase_order = new mongoose_2.Types.ObjectId(filters.purchase_order);
            }
            const grns = await Warehouse_model_1.GRNnumber.find(query)
                .populate("vendor")
                .populate("purchase_order")
                .populate("createdBy", "name email")
                .sort({ recieved_date: -1, createdAt: -1 });
            logger_util_1.logger.info(`✅ Found ${grns.length} GRNs with applied filters`);
            return grns;
        }
        catch (error) {
            logger_util_1.logger.error("❌ Error fetching GRNs:", error);
            throw new Error(`Failed to fetch GRNs: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async updateGRNStatus(grnId, qc_status, remarks, lineItems) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(grnId)) {
                throw new Error("Invalid GRN ID");
            }
            const updateData = {
                qc_status,
                updatedAt: new Date(),
            };
            if (remarks) {
                updateData.remarks = remarks;
            }
            if (lineItems && lineItems.length > 0) {
                const grn = await Warehouse_model_1.GRNnumber.findById(grnId);
                if (!grn) {
                    throw new Error("GRN not found");
                }
                lineItems.forEach(updateItem => {
                    const existingItem = grn.grn_line_items.find(item => item.line_no === updateItem.line_no);
                });
                updateData.grn_line_items = grn.grn_line_items;
            }
            const updatedGRN = await Warehouse_model_1.GRNnumber.findByIdAndUpdate(grnId, updateData, {
                new: true,
                runValidators: true,
            })
                .populate("vendor")
                .populate("purchase_order")
                .populate("createdBy", "name email");
            if (!updatedGRN) {
                throw new Error("GRN not found");
            }
            logger_util_1.logger.info(`✅ GRN ${grnId} status updated to: ${qc_status}`);
            return updatedGRN;
        }
        catch (error) {
            logger_util_1.logger.error("❌ Error updating GRN status:", error);
            throw new Error(`Failed to update GRN status: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async updateGRNLineItems(grnId, lineItems) {
        try {
            if (!mongoose_2.Types.ObjectId.isValid(grnId)) {
                throw new Error("Invalid GRN ID");
            }
            const grn = await Warehouse_model_1.GRNnumber.findById(grnId);
            if (!grn) {
                throw new Error("GRN not found");
            }
            lineItems.forEach(item => {
                if (item.received_quantity < 0 ||
                    item.accepted_quantity < 0 ||
                    item.rejected_quantity < 0) {
                    throw new Error("Quantities cannot be negative");
                }
                if (item.received_quantity !== item.accepted_quantity + item.rejected_quantity) {
                    throw new Error(`Received quantity must equal accepted + rejected for line ${item.line_no}`);
                }
            });
            lineItems.forEach(updateItem => {
                const existingItem = grn.grn_line_items.find(item => item.line_no === updateItem.line_no);
            });
            grn.updatedAt = new Date();
            await grn.save();
            const populatedGRN = await Warehouse_model_1.GRNnumber.findById(grn._id)
                .populate("vendor")
                .populate("purchase_order")
                .populate("createdBy", "name email");
            logger_util_1.logger.info(`✅ GRN ${grnId} line items updated successfully`);
            return populatedGRN;
        }
        catch (error) {
            logger_util_1.logger.error("❌ Error updating GRN line items:", error);
            throw new Error(`Failed to update GRN line items: ${error instanceof Error ? error.message : "Unknown error"}`);
        }
    }
    async getPurchaseOrders(warehouseId, filters) {
        const query = {};
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate)
                query.createdAt.$gte = new Date(filters.startDate);
            if (filters.endDate)
                query.createdAt.$lte = new Date(filters.endDate);
        }
        if (filters?.po_status)
            query.po_status = filters.po_status;
        if (filters?.po_number)
            query.po_number = { $regex: filters.po_number, $options: "i" };
        if (filters?.vendor && mongoose_2.Types.ObjectId.isValid(filters.vendor)) {
            query.vendor = new mongoose_2.Types.ObjectId(filters.vendor);
        }
        return await Warehouse_model_1.RaisePurchaseOrder.find(query)
            .populate("vendor", "vendor_name vendor_email vendor_contact")
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });
    }
    async getPurchaseOrderById(id) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            return null;
        return await Warehouse_model_1.RaisePurchaseOrder.findById(id)
            .populate("vendor", "vendor_name vendor_email vendor_contact vendor_phone")
            .populate("createdBy", "name email");
    }
    async updatePurchaseOrderStatus(id, po_status, remarks) {
        if (!mongoose_2.Types.ObjectId.isValid(id))
            return null;
        const updateData = { po_status };
        if (remarks) {
            updateData.remarks = remarks;
        }
        const updatedPO = await Warehouse_model_1.RaisePurchaseOrder.findByIdAndUpdate(id, updateData, { new: true })
            .populate("vendor", "vendor_name vendor_email")
            .populate("createdBy", "name email");
        return updatedPO;
    }
    async upsertInventory(data) {
        const existingInventory = await Warehouse_model_1.Inventory.findOne({
            sku: data.sku,
            batchId: data.batchId,
            warehouse: data.warehouse,
        });
        if (existingInventory) {
            await Warehouse_model_1.Inventory.findByIdAndUpdate(existingInventory._id, {
                $inc: { quantity: data.quantity },
                location: data.location,
                updatedAt: new Date(),
            });
        }
        else {
            await Warehouse_model_1.Inventory.create({
                ...data,
                minStockLevel: 0,
                maxStockLevel: 1000,
                age: 0,
                status: "active",
            });
        }
    }
    async createDispatch(data, createdBy) {
        await this.validateSkuStock(data.products);
        const latestDispatch = await Warehouse_model_1.DispatchOrder.findOne().sort({ createdAt: -1 });
        const nextNumber = latestDispatch
            ? parseInt(latestDispatch.dispatchId?.split("-")[1] || "0") + 1
            : 1;
        const dispatchId = `DO-${String(nextNumber).padStart(4, "0")}`;
        const formattedProducts = data.products.map(p => ({
            sku: p.sku,
            quantity: p.quantity,
        }));
        const dispatch = await Warehouse_model_1.DispatchOrder.create({
            dispatchId,
            destination: data.destination,
            products: formattedProducts,
            assignedAgent: data.assignedAgent,
            warehouse: data.warehouse,
            notes: data.notes,
            status: "pending",
            createdBy,
        });
        if (data.assignedAgent) {
            await FieldOpsTask_model_1.FieldOpsTask.create({
                taskType: "warehouse_pickup",
                title: `Warehouse Pickup - ${dispatchId}`,
                description: `Pickup products from ${data.destination || "warehouse"} for dispatch ${dispatchId}`,
                assignedAgent: data.assignedAgent,
                warehouseId: data.warehouse,
                dispatchId: dispatch._id,
                status: "pending",
                priority: "medium",
                dueDate: new Date(),
                createdBy,
            });
        }
        await this.reduceStockBySku(data.products);
        return dispatch;
    }
    async getDispatches(warehouseId, filters) {
        const query = {};
        if (warehouseId && mongoose_2.Types.ObjectId.isValid(warehouseId)) {
            query.warehouse = new mongoose_2.Types.ObjectId(warehouseId);
        }
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.startDate || filters?.endDate) {
            query.createdAt = {};
            if (filters.startDate)
                query.createdAt.$gte = new Date(filters.startDate);
            if (filters.endDate)
                query.createdAt.$lte = new Date(filters.endDate);
        }
        return await Warehouse_model_1.DispatchOrder.find(query)
            .populate("assignedAgent", "name email phone vehicleType")
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });
    }
    async updateDispatchStatus(dispatchId, status) {
        const validStatuses = ["pending", "assigned", "in_transit", "delivered", "cancelled"];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
        }
        if (!mongoose_2.Types.ObjectId.isValid(dispatchId)) {
            throw new Error("Invalid dispatch ID");
        }
        const updateData = { status };
        if (status === "delivered") {
            updateData.deliveredAt = new Date();
        }
        const dispatch = await Warehouse_model_1.DispatchOrder.findByIdAndUpdate(dispatchId, updateData, {
            new: true,
        }).populate("assignedAgent createdBy");
        if (!dispatch) {
            throw new Error("Dispatch order not found");
        }
        return dispatch;
    }
    async getDispatchById(dispatchId) {
        if (!mongoose_2.Types.ObjectId.isValid(dispatchId))
            return null;
        return await Warehouse_model_1.DispatchOrder.findById(dispatchId)
            .populate("assignedAgent", "name email phone vehicleType licensePlate")
            .populate("createdBy", "name email");
    }
    async createQCTemplate(data, createdBy) {
        return await Warehouse_model_1.QCTemplate.create({
            title: data.title,
            sku: data.sku,
            parameters: data.parameters,
            isActive: true,
            createdBy,
        });
    }
    async getQCTemplates(sku) {
        const query = { isActive: true };
        if (sku)
            query.sku = sku;
        return await Warehouse_model_1.QCTemplate.find(query).populate("createdBy", "name email").sort({ title: 1 });
    }
    async updateQCTemplate(templateId, updateData) {
        if (!mongoose_2.Types.ObjectId.isValid(templateId))
            return null;
        return await Warehouse_model_1.QCTemplate.findByIdAndUpdate(templateId, updateData, { new: true }).populate("createdBy", "name email");
    }
    async deleteQCTemplate(templateId) {
        if (!mongoose_2.Types.ObjectId.isValid(templateId))
            return;
        await Warehouse_model_1.QCTemplate.findByIdAndUpdate(templateId, { isActive: false });
    }
    async createReturnOrder(data, createdBy) {
        const inventory = await Warehouse_model_1.Inventory.findOne({
            batchId: data.batchId,
            isArchived: false,
        });
        if (!inventory) {
            throw new Error(`Batch ${data.batchId} not found in inventory`);
        }
        const quantity = data.quantity || Math.min(inventory.quantity, 1);
        if (inventory.quantity < quantity) {
            throw new Error(`Insufficient quantity in batch. Available: ${inventory.quantity}, Requested: ${quantity}`);
        }
        const returnType = this.determineReturnType(data.reason);
        const returnOrderData = {
            batchId: data.batchId,
            vendor: data.vendor,
            warehouse: data.warehouse,
            reason: data.reason,
            status: data.status || "pending",
            quantity: quantity,
            sku: inventory.sku,
            productName: inventory.productName,
            returnType: returnType,
            createdBy,
        };
        return await Warehouse_model_1.ReturnOrder.create(returnOrderData);
    }
    determineReturnType(reason) {
        const lowerReason = reason.toLowerCase();
        if (lowerReason.includes("damage") ||
            lowerReason.includes("broken") ||
            lowerReason.includes("defective")) {
            return "damaged";
        }
        if (lowerReason.includes("expir") ||
            lowerReason.includes("date") ||
            lowerReason.includes("spoiled")) {
            return "expired";
        }
        if (lowerReason.includes("wrong") ||
            lowerReason.includes("incorrect") ||
            lowerReason.includes("mistake")) {
            return "wrong_item";
        }
        if (lowerReason.includes("overstock") ||
            lowerReason.includes("excess") ||
            lowerReason.includes("surplus")) {
            return "overstock";
        }
        return "other";
    }
    async getReturnQueue(warehouseId, filters) {
        const query = {};
        if (warehouseId && mongoose_2.Types.ObjectId.isValid(warehouseId)) {
            query.warehouse = new mongoose_2.Types.ObjectId(warehouseId);
        }
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.returnType) {
            query.returnType = filters.returnType;
        }
        return await Warehouse_model_1.ReturnOrder.find(query)
            .populate("vendor", "vendor_name vendor_email vendor_contact")
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });
    }
    async approveReturn(returnId) {
        if (!mongoose_2.Types.ObjectId.isValid(returnId)) {
            throw new Error("Invalid return ID");
        }
        const returnOrder = await Warehouse_model_1.ReturnOrder.findById(returnId);
        if (!returnOrder) {
            throw new Error("Return order not found");
        }
        await Warehouse_model_1.Inventory.findOneAndUpdate({
            batchId: returnOrder.batchId,
            sku: returnOrder.sku,
        }, {
            $inc: { quantity: -returnOrder.quantity },
        });
        const updated = await Warehouse_model_1.ReturnOrder.findByIdAndUpdate(returnId, { status: "approved" }, { new: true }).populate("vendor", "vendor_name vendor_email");
        if (!updated) {
            throw new Error("Return order not found");
        }
        return updated;
    }
    async rejectReturn(returnId) {
        if (!mongoose_2.Types.ObjectId.isValid(returnId)) {
            throw new Error("Invalid return ID");
        }
        const updated = await Warehouse_model_1.ReturnOrder.findByIdAndUpdate(returnId, { status: "rejected" }, { new: true }).populate("vendor", "vendor_name vendor_email");
        if (!updated) {
            throw new Error("Return order not found");
        }
        return updated;
    }
    async getFieldAgents(isActive) {
        const fieldAgentRole = await models_1.Role.findOne({ key: "field_agent" });
        if (!fieldAgentRole) {
            return [];
        }
        const userQuery = {
            roles: { $in: [fieldAgentRole._id] },
        };
        if (isActive !== undefined) {
            userQuery.status = isActive ? "active" : "inactive";
        }
        const users = await models_1.User.find(userQuery)
            .populate("roles", "name key")
            .select("name email phone status lastLogin createdAt")
            .sort({ name: 1 });
        const usersWithRoutes = await Promise.all(users.map(async (user) => {
            const fieldAgentRecord = await Warehouse_model_1.FieldAgent.findOne({ userId: user._id })
                .populate("assignedWarehouse", "name code")
                .populate("assignedArea", "name");
            return {
                _id: user._id,
                name: user.name,
                email: user.email,
                phone: user.phone,
                status: user.status,
                lastLogin: user.lastLogin,
                createdAt: user.createdAt,
                roles: user.roles,
                assignedRoutes: fieldAgentRecord?.assignedRoutes || [],
                assignedWarehouse: fieldAgentRecord?.assignedWarehouse || null,
                assignedArea: fieldAgentRecord?.assignedArea || null,
                fieldAgentId: fieldAgentRecord?._id || null,
                createdBy: fieldAgentRecord?.createdBy || null,
            };
        }));
        return usersWithRoutes;
    }
    async updateFieldAgent(userId, data) {
        let fieldAgent = await Warehouse_model_1.FieldAgent.findOne({ userId });
        if (!fieldAgent) {
            const user = await models_1.User.findById(userId).select("name email phone");
            if (!user) {
                throw new Error("User not found");
            }
            fieldAgent = await Warehouse_model_1.FieldAgent.create({
                userId,
                name: data.name || user.name,
                email: user.email,
                phone: user.phone,
                assignedRoutes: data.assignedRoutes || [],
                assignedWarehouse: data.assignedWarehouse,
                assignedArea: data.assignedArea,
                isActive: true,
                createdBy: userId,
            });
        }
        else {
            if (data.name !== undefined) {
                fieldAgent.name = data.name;
            }
            if (data.assignedRoutes !== undefined) {
                fieldAgent.assignedRoutes = data.assignedRoutes;
            }
            if (data.assignedWarehouse !== undefined) {
                fieldAgent.assignedWarehouse = data.assignedWarehouse;
            }
            if (data.assignedArea !== undefined) {
                fieldAgent.assignedArea = data.assignedArea;
            }
            await fieldAgent.save();
        }
        return await Warehouse_model_1.FieldAgent.findById(fieldAgent._id)
            .populate("userId", "name email phone")
            .populate("assignedWarehouse", "name code")
            .populate("assignedArea", "name");
    }
    async createFieldAgent(data, createdBy) {
        const existingAgent = await Warehouse_model_1.FieldAgent.findOne({ userId: data.userId });
        if (existingAgent) {
            throw new Error("Field agent record already exists for this user");
        }
        const user = await models_1.User.findById(data.userId).select("name email phone");
        if (!user) {
            throw new Error("User not found");
        }
        const fieldAgent = await Warehouse_model_1.FieldAgent.create({
            userId: data.userId,
            name: user.name,
            email: user.email,
            phone: user.phone,
            assignedRoutes: data.assignedRoutes || [],
            isActive: true,
            createdBy,
        });
        return await Warehouse_model_1.FieldAgent.findById(fieldAgent._id)
            .populate("userId", "name email phone")
            .populate("assignedWarehouse", "name code")
            .populate("assignedArea", "name");
    }
    async getInventoryDashboard(warehouseId, filters = {}, page = 1, limit = 50) {
        const query = { warehouse: new mongoose_2.Types.ObjectId(warehouseId) };
        if (filters.archived !== undefined) {
            query.isArchived = filters.archived;
        }
        else {
            query.isArchived = false;
        }
        if (filters.status && filters.status !== "all") {
            query.status = filters.status;
        }
        if (filters.sku) {
            query.sku = { $regex: filters.sku, $options: "i" };
        }
        if (filters.batchId) {
            query.batchId = { $regex: filters.batchId, $options: "i" };
        }
        if (filters.productName) {
            query.productName = { $regex: filters.productName, $options: "i" };
        }
        if (filters.expiryStatus) {
            const today = new Date();
            switch (filters.expiryStatus) {
                case "expiring_soon": {
                    const next30Days = new Date(today);
                    next30Days.setDate(today.getDate() + 30);
                    query.expiryDate = { $gte: today, $lte: next30Days };
                    break;
                }
                case "expired":
                    query.expiryDate = { $lt: today };
                    break;
                case "not_expired":
                    query.expiryDate = { $gte: today };
                    break;
                case "no_expiry":
                    query.expiryDate = { $exists: false };
                    break;
            }
        }
        if (filters.ageRange) {
            query.age = this.getAgeFilter(filters.ageRange);
        }
        if (filters.quantityRange) {
            switch (filters.quantityRange) {
                case "low":
                    query.quantity = { $lte: 10 };
                    break;
                case "medium":
                    query.quantity = { $gt: 10, $lte: 50 };
                    break;
                case "high":
                    query.quantity = { $gt: 50 };
                    break;
                case "out_of_stock":
                    query.quantity = { $lte: 0 };
                    break;
            }
        }
        const skip = (page - 1) * limit;
        const total = await Warehouse_model_1.Inventory.countDocuments(query);
        const sortField = filters.sortBy || "updatedAt";
        const sortOrder = filters.sortOrder === "asc" ? 1 : -1;
        const inventory = await Warehouse_model_1.Inventory.find(query)
            .populate("warehouse", "name code")
            .populate("createdBy", "name email")
            .sort({ [sortField]: sortOrder })
            .skip(skip)
            .limit(limit);
        return {
            inventory,
            total,
            page,
            totalPages: Math.ceil(total / limit),
            filters,
        };
    }
    async getInventoryById(inventoryId) {
        if (!mongoose_2.Types.ObjectId.isValid(inventoryId)) {
            throw new Error("Invalid inventory ID");
        }
        return await Warehouse_model_1.Inventory.findById(inventoryId)
            .populate("warehouse", "name code")
            .populate("createdBy", "name email");
    }
    async updateInventoryItem(inventoryId, updateData) {
        if (!mongoose_2.Types.ObjectId.isValid(inventoryId)) {
            throw new Error("Invalid inventory ID");
        }
        const inventory = await Warehouse_model_1.Inventory.findById(inventoryId);
        if (!inventory) {
            throw new Error("Inventory item not found");
        }
        const allowedUpdates = [
            "sku",
            "productName",
            "batchId",
            "quantity",
            "minStockLevel",
            "maxStockLevel",
            "expiryDate",
            "location",
        ];
        const updates = {};
        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = updateData[key];
            }
        });
        if (updates.expiryDate) {
            updates.expiryDate = new Date(updates.expiryDate);
        }
        const now = new Date();
        const createdAt = inventory.createdAt;
        const ageInDays = Math.floor((now.getTime() - createdAt.getTime()) / (1000 * 60 * 60 * 24));
        updates.age = ageInDays;
        const finalQuantity = updates.quantity !== undefined ? updates.quantity : inventory.quantity;
        const finalExpiryDate = updates.expiryDate !== undefined ? updates.expiryDate : inventory.expiryDate;
        const finalMinStock = updates.minStockLevel !== undefined ? updates.minStockLevel : inventory.minStockLevel;
        const finalMaxStock = updates.maxStockLevel !== undefined ? updates.maxStockLevel : inventory.maxStockLevel;
        updates.status = this.calculateInventoryStatus({
            quantity: finalQuantity,
            minStockLevel: finalMinStock,
            maxStockLevel: finalMaxStock,
            expiryDate: finalExpiryDate,
        });
        const updated = await Warehouse_model_1.Inventory.findByIdAndUpdate(inventoryId, updates, {
            new: true,
            runValidators: true,
        })
            .populate("warehouse", "name code")
            .populate("createdBy", "name email");
        if (!updated) {
            throw new Error("Inventory item not found after update");
        }
        return updated;
    }
    async archiveInventoryItem(inventoryId) {
        if (!mongoose_2.Types.ObjectId.isValid(inventoryId)) {
            throw new Error("Invalid inventory ID");
        }
        const updated = await Warehouse_model_1.Inventory.findByIdAndUpdate(inventoryId, {
            isArchived: true,
            status: "archived",
            archivedAt: new Date(),
        }, { new: true })
            .populate("warehouse", "name code")
            .populate("createdBy", "name email");
        if (!updated) {
            throw new Error("Inventory item not found");
        }
        return updated;
    }
    async unarchiveInventoryItem(inventoryId) {
        if (!mongoose_2.Types.ObjectId.isValid(inventoryId)) {
            throw new Error("Invalid inventory ID");
        }
        const inventory = await Warehouse_model_1.Inventory.findById(inventoryId);
        if (!inventory) {
            throw new Error("Inventory item not found");
        }
        const status = this.calculateInventoryStatus({
            quantity: inventory.quantity,
            minStockLevel: inventory.minStockLevel,
            maxStockLevel: inventory.maxStockLevel,
            expiryDate: inventory.expiryDate,
        });
        const updated = await Warehouse_model_1.Inventory.findByIdAndUpdate(inventoryId, {
            isArchived: false,
            status: status,
            archivedAt: null,
        }, { new: true })
            .populate("warehouse", "name code")
            .populate("createdBy", "name email");
        if (!updated) {
            throw new Error("Inventory item not found");
        }
        return updated;
    }
    async getInventoryStats(warehouseId) {
        if (!mongoose_2.Types.ObjectId.isValid(warehouseId)) {
            throw new Error("Invalid warehouse ID");
        }
        const warehouseObjectId = new mongoose_2.Types.ObjectId(warehouseId);
        const [totalItems, activeItems, archivedItems, lowStockItems, expiredItems, nearExpiryItems, statusBreakdown, stockValueResult,] = await Promise.all([
            Warehouse_model_1.Inventory.countDocuments({ warehouse: warehouseObjectId }),
            Warehouse_model_1.Inventory.countDocuments({ warehouse: warehouseObjectId, isArchived: false }),
            Warehouse_model_1.Inventory.countDocuments({ warehouse: warehouseObjectId, isArchived: true }),
            Warehouse_model_1.Inventory.countDocuments({
                warehouse: warehouseObjectId,
                status: "low_stock",
                isArchived: false,
            }),
            Warehouse_model_1.Inventory.countDocuments({
                warehouse: warehouseObjectId,
                expiryDate: { $lt: new Date() },
                isArchived: false,
            }),
            Warehouse_model_1.Inventory.countDocuments({
                warehouse: warehouseObjectId,
                expiryDate: {
                    $gte: new Date(),
                    $lte: new Date(new Date().setDate(new Date().getDate() + 30)),
                },
                isArchived: false,
            }),
            Warehouse_model_1.Inventory.aggregate([
                { $match: { warehouse: warehouseObjectId, isArchived: false } },
                { $group: { _id: "$status", count: { $sum: 1 } } },
            ]),
            Warehouse_model_1.Inventory.aggregate([
                { $match: { warehouse: warehouseObjectId, isArchived: false } },
                { $group: { _id: null, totalValue: { $sum: { $multiply: ["$quantity", 100] } } } },
            ]),
        ]);
        const statusBreakdownObj = {};
        statusBreakdown.forEach((item) => {
            statusBreakdownObj[item._id] = item.count;
        });
        const totalStockValue = stockValueResult.length > 0 ? stockValueResult[0].totalValue : 0;
        return {
            totalItems,
            activeItems,
            archivedItems,
            lowStockItems,
            expiredItems,
            nearExpiryItems,
            totalStockValue,
            statusBreakdown: statusBreakdownObj,
        };
    }
    async bulkArchiveInventory(inventoryIds) {
        const validIds = inventoryIds.filter(id => mongoose_2.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            throw new Error("No valid inventory IDs provided");
        }
        const objectIds = validIds.map(id => new mongoose_2.Types.ObjectId(id));
        const result = await Warehouse_model_1.Inventory.updateMany({ _id: { $in: objectIds }, isArchived: false }, { $set: { isArchived: true, status: "archived", archivedAt: new Date() } });
        const archivedCount = result.modifiedCount;
        const failedCount = validIds.length - archivedCount;
        let failedIds = [];
        if (failedCount > 0) {
            const archivedItems = await Warehouse_model_1.Inventory.find({
                _id: { $in: objectIds },
                isArchived: true,
            }).select("_id");
            const archivedItemIds = archivedItems.map(item => item._id.toString());
            failedIds = validIds.filter(id => !archivedItemIds.includes(id));
        }
        return {
            success: archivedCount > 0,
            message: `Successfully archived ${archivedCount} items. ${failedCount} items failed to archive.`,
            archivedCount,
            failedCount,
            failedIds,
        };
    }
    async bulkUnarchiveInventory(inventoryIds) {
        const validIds = inventoryIds.filter(id => mongoose_2.Types.ObjectId.isValid(id));
        if (validIds.length === 0) {
            throw new Error("No valid inventory IDs provided");
        }
        const objectIds = validIds.map(id => new mongoose_2.Types.ObjectId(id));
        const itemsToUnarchive = await Warehouse_model_1.Inventory.find({ _id: { $in: objectIds }, isArchived: true });
        const updatePromises = itemsToUnarchive.map(async (item) => {
            const status = this.calculateInventoryStatus({
                quantity: item.quantity,
                minStockLevel: item.minStockLevel,
                maxStockLevel: item.maxStockLevel,
                expiryDate: item.expiryDate,
            });
            return Warehouse_model_1.Inventory.findByIdAndUpdate(item._id, {
                $set: { isArchived: false, status: status, archivedAt: null },
            });
        });
        await Promise.all(updatePromises);
        const unarchivedCount = itemsToUnarchive.length;
        const failedCount = validIds.length - unarchivedCount;
        let failedIds = [];
        if (failedCount > 0) {
            const unarchivedItems = await Warehouse_model_1.Inventory.find({
                _id: { $in: objectIds },
                isArchived: false,
            }).select("_id");
            const unarchivedItemIds = unarchivedItems.map(item => item._id.toString());
            failedIds = validIds.filter(id => !unarchivedItemIds.includes(id));
        }
        return {
            success: unarchivedCount > 0,
            message: `Successfully unarchived ${unarchivedCount} items. ${failedCount} items failed to unarchive.`,
            unarchivedCount,
            failedCount,
            failedIds,
        };
    }
    async getArchivedInventory(warehouseId, page = 1, limit = 50) {
        const query = {
            warehouse: new mongoose_2.Types.ObjectId(warehouseId),
            isArchived: true,
        };
        const skip = (page - 1) * limit;
        const total = await Warehouse_model_1.Inventory.countDocuments(query);
        const inventory = await Warehouse_model_1.Inventory.find(query)
            .populate("warehouse", "name code")
            .populate("createdBy", "name email")
            .sort({ archivedAt: -1 })
            .skip(skip)
            .limit(limit);
        return {
            inventory,
            total,
            page,
            totalPages: Math.ceil(total / limit),
        };
    }
    async createExpense(data, createdBy) {
        return await Warehouse_model_1.Expense.create({
            ...data,
            status: "pending",
            paymentStatus: "unpaid",
            createdBy,
        });
    }
    async getExpenses(warehouseId, filters) {
        const query = {};
        if (warehouseId && mongoose_2.Types.ObjectId.isValid(warehouseId)) {
            query.warehouseId = new mongoose_2.Types.ObjectId(warehouseId);
        }
        if (filters?.category) {
            query.category = filters.category;
        }
        if (filters?.status) {
            query.status = filters.status;
        }
        if (filters?.paymentStatus) {
            query.paymentStatus = filters.paymentStatus;
        }
        if (filters?.startDate || filters?.endDate) {
            query.date = {};
            if (filters.startDate)
                query.date.$gte = new Date(filters.startDate);
            if (filters.endDate)
                query.date.$lte = new Date(filters.endDate);
        }
        if (filters?.month) {
            const [year, month] = filters.month.split("-");
            const startDate = new Date(Number(year), Number(month) - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(Number(year), Number(month), 0);
            endDate.setHours(23, 59, 59, 999);
            query.date = { $gte: startDate, $lte: endDate };
        }
        return await Warehouse_model_1.Expense.find(query)
            .populate("vendor", "vendor_name vendor_email vendor_contact")
            .populate("warehouseId", "name code")
            .populate("createdBy", "name email")
            .populate("approvedBy", "name email")
            .populate("assignedAgent", "name email")
            .sort({ date: -1, createdAt: -1 });
    }
    async updateExpenseStatus(expenseId, status, approvedBy) {
        const validStatuses = ["approved", "pending", "rejected"];
        if (!validStatuses.includes(status)) {
            throw new Error(`Invalid status. Must be one of: ${validStatuses.join(", ")}`);
        }
        const updateData = { status };
        if (status === "approved" && approvedBy) {
            updateData.approvedBy = approvedBy;
            updateData.approvedAt = new Date();
        }
        else if (status === "pending") {
            updateData.approvedBy = null;
            updateData.approvedAt = null;
        }
        const expense = await Warehouse_model_1.Expense.findByIdAndUpdate(expenseId, updateData, { new: true }).populate("vendor warehouseId createdBy approvedBy");
        if (!expense) {
            throw new Error("Expense not found");
        }
        return expense;
    }
    async updateExpensePaymentStatus(expenseId, paymentStatus) {
        const validPaymentStatuses = ["paid", "unpaid", "partially_paid"];
        if (!validPaymentStatuses.includes(paymentStatus)) {
            throw new Error(`Invalid payment status. Must be one of: ${validPaymentStatuses.join(", ")}`);
        }
        const expense = await Warehouse_model_1.Expense.findByIdAndUpdate(expenseId, { paymentStatus }, { new: true }).populate("vendor warehouseId createdBy approvedBy");
        if (!expense) {
            throw new Error("Expense not found");
        }
        return expense;
    }
    async updateExpense(expenseId, updateData) {
        const allowedUpdates = ["category", "amount", "date", "status"];
        const updates = {};
        Object.keys(updateData).forEach(key => {
            if (allowedUpdates.includes(key)) {
                updates[key] = updateData[key];
            }
        });
        if (updates.amount !== undefined ||
            updates.category !== undefined ||
            updates.date !== undefined) {
            updates.status = "pending";
            updates.approvedBy = null;
            updates.approvedAt = null;
        }
        const expense = await Warehouse_model_1.Expense.findByIdAndUpdate(expenseId, updates, {
            new: true,
            runValidators: true,
        }).populate("vendor createdBy approvedBy warehouseId");
        if (!expense) {
            throw new Error("Expense not found");
        }
        return expense;
    }
    async deleteExpense(expenseId) {
        if (!mongoose_2.Types.ObjectId.isValid(expenseId)) {
            throw new Error("Invalid expense ID");
        }
        const result = await Warehouse_model_1.Expense.findByIdAndDelete(expenseId);
        if (!result) {
            throw new Error("Expense not found");
        }
    }
    async uploadExpenseBill(expenseId, file) {
        if (!mongoose_2.Types.ObjectId.isValid(expenseId)) {
            throw new Error("Invalid expense ID");
        }
        const expense = await Warehouse_model_1.Expense.findById(expenseId);
        if (!expense) {
            throw new Error("Expense not found");
        }
        const { url } = await this.documentUploadService.uploadToCloudinary(file.buffer, file.originalname, `frovo/expenses/${expenseId}`);
        expense.billUrl = url;
        await expense.save();
        return await Warehouse_model_1.Expense.findById(expenseId)
            .populate("vendor", "vendor_name vendor_email vendor_contact")
            .populate("warehouseId", "name code location")
            .populate("createdBy", "name email")
            .populate("approvedBy", "name email")
            .then(e => e);
    }
    async getExpenseById(expenseId) {
        if (!mongoose_2.Types.ObjectId.isValid(expenseId))
            return null;
        return await Warehouse_model_1.Expense.findById(expenseId)
            .populate("vendor", "vendor_name vendor_email vendor_contact vendor_phone")
            .populate("warehouseId", "name code location")
            .populate("createdBy", "name email")
            .populate("approvedBy", "name email");
    }
    async getExpenseSummary(warehouseId, filters) {
        const matchStage = { warehouseId: new mongoose_2.Types.ObjectId(warehouseId) };
        if (filters?.dateRange) {
            matchStage.date = this.getDateFilter(filters.dateRange);
        }
        if (filters?.month) {
            const [year, month] = filters.month.split("-");
            const startDate = new Date(Number(year), Number(month) - 1, 1);
            startDate.setHours(0, 0, 0, 0);
            const endDate = new Date(Number(year), Number(month), 0);
            endDate.setHours(23, 59, 59, 999);
            matchStage.date = { $gte: startDate, $lte: endDate };
        }
        const summary = await Warehouse_model_1.Expense.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: null,
                    total: { $sum: "$amount" },
                    approved: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] } },
                    pending: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } },
                    rejected: { $sum: { $cond: [{ $eq: ["$status", "rejected"] }, "$amount", 0] } },
                    byCategory: { $push: { category: "$category", amount: "$amount" } },
                    byMonth: {
                        $push: {
                            month: { $dateToString: { format: "%Y-%m", date: "$date" } },
                            amount: "$amount",
                        },
                    },
                    paid: { $sum: { $cond: [{ $eq: ["$paymentStatus", "paid"] }, "$amount", 0] } },
                    unpaid: { $sum: { $cond: [{ $eq: ["$paymentStatus", "unpaid"] }, "$amount", 0] } },
                    partially_paid: {
                        $sum: { $cond: [{ $eq: ["$paymentStatus", "partially_paid"] }, "$amount", 0] },
                    },
                },
            },
        ]);
        const result = summary[0] || {
            total: 0,
            approved: 0,
            pending: 0,
            rejected: 0,
            byCategory: [],
            byMonth: [],
            paid: 0,
            unpaid: 0,
            partially_paid: 0,
        };
        const byCategory = {};
        if (result.byCategory) {
            result.byCategory.forEach((item) => {
                byCategory[item.category] = (byCategory[item.category] || 0) + item.amount;
            });
        }
        const byMonth = {};
        if (result.byMonth) {
            result.byMonth.forEach((item) => {
                byMonth[item.month] = (byMonth[item.month] || 0) + item.amount;
            });
        }
        return {
            total: result.total,
            approved: result.approved,
            pending: result.pending,
            rejected: result.rejected,
            byCategory,
            byMonth,
            paymentSummary: {
                paid: result.paid,
                unpaid: result.unpaid,
                partially_paid: result.partially_paid,
            },
        };
    }
    async getMonthlyExpenseTrend(warehouseId, months = 12) {
        const endDate = new Date();
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - months);
        return await Warehouse_model_1.Expense.aggregate([
            {
                $match: {
                    warehouseId: new mongoose_2.Types.ObjectId(warehouseId),
                    date: { $gte: startDate, $lte: endDate },
                },
            },
            {
                $group: {
                    _id: { year: { $year: "$date" }, month: { $month: "$date" } },
                    totalAmount: { $sum: "$amount" },
                    approvedAmount: { $sum: { $cond: [{ $eq: ["$status", "approved"] }, "$amount", 0] } },
                    pendingAmount: { $sum: { $cond: [{ $eq: ["$status", "pending"] }, "$amount", 0] } },
                    expenseCount: { $sum: 1 },
                },
            },
            {
                $project: {
                    _id: 0,
                    period: {
                        $concat: [
                            { $toString: "$_id.year" },
                            "-",
                            {
                                $toString: {
                                    $cond: [
                                        { $lt: ["$_id.month", 10] },
                                        { $concat: ["0", { $toString: "$_id.month" }] },
                                        { $toString: "$_id.month" },
                                    ],
                                },
                            },
                        ],
                    },
                    totalAmount: 1,
                    approvedAmount: 1,
                    pendingAmount: 1,
                    expenseCount: 1,
                },
            },
            { $sort: { period: 1 } },
        ]);
    }
    async generateReport(type, filters) {
        switch (type) {
            case "inventory_summary":
                return await this.generateInventorySummaryReport(filters);
            case "purchase_orders":
                return await this.generatePurchaseOrderReport(filters);
            case "inventory_turnover":
                return await this.generateInventoryTurnoverReport(filters);
            case "qc_summary":
                return await this.generateQCSummaryReport(filters);
            case "efficiency":
                return await this.generateEfficiencyReport(filters);
            case "stock_ageing":
                return await this.getStockAgeingReport(filters.warehouse);
            default:
                throw new Error("Invalid report type");
        }
    }
    async getStockAgeingReport(warehouseId) {
        const ageingBuckets = {
            "0-30 days": 0,
            "31-60 days": 0,
            "61-90 days": 0,
            "90+ days": 0,
        };
        const inventory = await Warehouse_model_1.Inventory.find({
            warehouse: new mongoose_2.Types.ObjectId(warehouseId),
            isArchived: false,
        });
        inventory.forEach(item => {
            const age = item.age || 0;
            if (age <= 30) {
                ageingBuckets["0-30 days"]++;
            }
            else if (age <= 60) {
                ageingBuckets["31-60 days"]++;
            }
            else if (age <= 90) {
                ageingBuckets["61-90 days"]++;
            }
            else {
                ageingBuckets["90+ days"]++;
            }
        });
        return {
            report: "stock_ageing",
            ageingBuckets,
            totalItems: inventory.length,
            generatedOn: new Date(),
        };
    }
    async generateInventorySummaryReport(filters) {
        const warehouseId = filters.warehouse;
        if (!warehouseId || !mongoose_2.Types.ObjectId.isValid(warehouseId)) {
            throw new Error("Valid warehouse ID is required");
        }
        const dateFilter = this.getDateFilter(filters.dateRange);
        const inventoryQuery = {
            warehouse: new mongoose_2.Types.ObjectId(warehouseId),
            isArchived: false,
        };
        if (filters.category) {
            inventoryQuery.productName = { $regex: filters.category, $options: "i" };
        }
        if (filters.status) {
            inventoryQuery.status = filters.status;
        }
        const inventoryData = await Warehouse_model_1.Inventory.find(inventoryQuery).populate("warehouse", "name code");
        const totalSKUs = await Warehouse_model_1.Inventory.distinct("sku", {
            warehouse: new mongoose_2.Types.ObjectId(warehouseId),
            isArchived: false,
        }).then(skus => skus.length);
        const stockOutSKUs = await Warehouse_model_1.Inventory.countDocuments({
            warehouse: new mongoose_2.Types.ObjectId(warehouseId),
            status: "low_stock",
            isArchived: false,
        });
        const poQuery = { warehouse: new mongoose_2.Types.ObjectId(warehouseId) };
        if (Object.keys(dateFilter).length > 0) {
            poQuery.createdAt = dateFilter;
        }
        if (filters.vendor) {
            poQuery.vendor = new mongoose_2.Types.ObjectId(filters.vendor);
        }
        const totalPOs = await Warehouse_model_1.RaisePurchaseOrder.countDocuments(poQuery);
        const pendingPOs = await Warehouse_model_1.RaisePurchaseOrder.countDocuments({
            ...poQuery,
            po_status: "draft",
        });
        const totalStockValue = inventoryData.reduce((sum, item) => {
            return sum + item.quantity * 100;
        }, 0);
        const lowStockItems = inventoryData.filter(item => item.status === "low_stock").length;
        const today = new Date();
        const next30Days = new Date();
        next30Days.setDate(today.getDate() + 30);
        const nearExpirySKUs = inventoryData.filter(item => item.expiryDate && item.expiryDate <= next30Days && item.expiryDate >= today).length;
        const stockAccuracy = 89;
        const { pendingRefills, completedRefills } = await this.getRefillMetrics(warehouseId);
        return {
            summary: {
                totalSKUs,
                stockOutSKUs,
                totalPOs,
                pendingPOs,
                pendingRefills,
                completedRefills,
                totalStockValue,
                lowStockItems,
                nearExpirySKUs,
                stockAccuracy,
            },
            inventoryDetails: inventoryData,
            generatedOn: new Date(),
            filters: filters,
        };
    }
    async generatePurchaseOrderReport(filters) {
        const warehouseId = filters.warehouse;
        if (!warehouseId || !mongoose_2.Types.ObjectId.isValid(warehouseId)) {
            throw new Error("Valid warehouse ID is required");
        }
        const dateFilter = this.getDateFilter(filters.dateRange);
        const poQuery = { warehouse: new mongoose_2.Types.ObjectId(warehouseId) };
        if (Object.keys(dateFilter).length > 0) {
            poQuery.createdAt = dateFilter;
        }
        if (filters.vendor) {
            poQuery.vendor = new mongoose_2.Types.ObjectId(filters.vendor);
        }
        if (filters.po_status) {
            poQuery.po_status = filters.po_status;
        }
        const purchaseOrders = await Warehouse_model_1.RaisePurchaseOrder.find(poQuery)
            .populate("vendor", "vendor_name vendor_email vendor_contact")
            .populate("warehouse", "name code")
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });
        const totalPOs = purchaseOrders.length;
        const pendingPOs = purchaseOrders.filter(po => po.po_status === "draft").length;
        const approvedPOs = purchaseOrders.filter(po => po.po_status === "approved").length;
        const rejectedPOs = purchaseOrders.filter(po => po.po_status === "pending").length;
        const totalPOValue = purchaseOrders.reduce((sum, po) => sum + 1000, 0);
        const averagePOValue = totalPOs > 0 ? totalPOValue / totalPOs : 0;
        return {
            summary: {
                totalPOs,
                pendingPOs,
                approvedPOs,
                rejectedPOs,
                totalPOValue,
                averagePOValue,
            },
            purchaseOrders,
            generatedOn: new Date(),
            filters: filters,
        };
    }
    async getRefillMetrics(_warehouseId) {
        return {
            pendingRefills: 32,
            completedRefills: 77,
        };
    }
    async generateInventoryTurnoverReport(filters) {
        const { warehouse, startDate, endDate, category } = filters;
        if (!warehouse || !mongoose_2.Types.ObjectId.isValid(warehouse)) {
            throw new Error("Valid warehouse ID is required");
        }
        const matchStage = {
            warehouse: new mongoose_2.Types.ObjectId(warehouse),
            isArchived: false,
        };
        if (startDate && endDate) {
            matchStage.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }
        if (category) {
            matchStage.productName = { $regex: category, $options: "i" };
        }
        const turnoverData = await Warehouse_model_1.Inventory.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$sku",
                    sku: { $first: "$sku" },
                    productName: { $first: "$productName" },
                    category: { $first: "$productName" },
                    currentQuantity: { $first: "$quantity" },
                    averageStock: { $avg: "$quantity" },
                    totalReceived: { $sum: "$quantity" },
                    stockOutCount: {
                        $sum: {
                            $cond: [{ $eq: ["$status", "low_stock"] }, 1, 0],
                        },
                    },
                    lastUpdated: { $max: "$updatedAt" },
                },
            },
            {
                $project: {
                    sku: 1,
                    productName: 1,
                    category: 1,
                    currentQuantity: 1,
                    averageStock: 1,
                    totalReceived: 1,
                    stockOutCount: 1,
                    turnoverRate: {
                        $cond: [
                            { $gt: ["$averageStock", 0] },
                            { $divide: ["$totalReceived", "$averageStock"] },
                            0,
                        ],
                    },
                    lastUpdated: 1,
                },
            },
            { $sort: { turnoverRate: -1 } },
        ]);
        return {
            report: "inventory_turnover",
            data: turnoverData,
            summary: {
                totalSKUs: turnoverData.length,
                averageTurnover: turnoverData.length > 0
                    ? turnoverData.reduce((acc, item) => acc + item.turnoverRate, 0) /
                        turnoverData.length
                    : 0,
                highTurnoverItems: turnoverData.filter((item) => item.turnoverRate > 2).length,
                lowTurnoverItems: turnoverData.filter((item) => item.turnoverRate < 0.5).length,
            },
            generatedOn: new Date(),
            filters: filters,
        };
    }
    async generateQCSummaryReport(filters) {
        const { warehouse, startDate, endDate, vendor } = filters;
        if (!warehouse || !mongoose_2.Types.ObjectId.isValid(warehouse)) {
            throw new Error("Valid warehouse ID is required");
        }
        const matchStage = {
            warehouse: new mongoose_2.Types.ObjectId(warehouse),
        };
        if (startDate && endDate) {
            matchStage.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }
        if (vendor) {
            matchStage.vendor = new mongoose_2.Types.ObjectId(vendor);
        }
        const qcData = await Warehouse_model_1.RaisePurchaseOrder.aggregate([
            { $match: matchStage },
            {
                $group: {
                    _id: "$po_status",
                    count: { $sum: 1 },
                },
            },
        ]);
        const totalReceivings = qcData.reduce((acc, item) => acc + item.count, 0);
        const passRate = totalReceivings > 0
            ? ((qcData.find((item) => item._id === "approved")?.count || 0) / totalReceivings) *
                100
            : 0;
        const qcDetails = await Warehouse_model_1.RaisePurchaseOrder.find(matchStage)
            .populate("vendor", "vendor_name vendor_email")
            .populate("warehouse", "name code")
            .populate("createdBy", "name email")
            .sort({ createdAt: -1 });
        return {
            report: "qc_summary",
            data: qcData,
            details: qcDetails,
            summary: {
                totalReceivings,
                passRate: Math.round(passRate * 100) / 100,
                failedCount: qcData.find((item) => item._id === "pending")?.count || 0,
                pendingCount: qcData.find((item) => item._id === "draft")?.count || 0,
                totalValue: totalReceivings * 1000,
            },
            generatedOn: new Date(),
            filters: filters,
        };
    }
    async generateEfficiencyReport(filters) {
        const { warehouse, startDate, endDate } = filters;
        if (!warehouse || !mongoose_2.Types.ObjectId.isValid(warehouse)) {
            throw new Error("Valid warehouse ID is required");
        }
        const dateMatch = {};
        if (startDate && endDate) {
            dateMatch.createdAt = {
                $gte: new Date(startDate),
                $lte: new Date(endDate),
            };
        }
        const [dispatchEfficiency, inventoryEfficiency] = await Promise.all([
            Warehouse_model_1.DispatchOrder.aggregate([
                {
                    $match: {
                        warehouse: new mongoose_2.Types.ObjectId(warehouse),
                        status: "delivered",
                        ...dateMatch,
                    },
                },
                {
                    $project: {
                        dispatchId: 1,
                        processingTime: {
                            $divide: [{ $subtract: ["$updatedAt", "$createdAt"] }, 1000 * 60 * 60],
                        },
                        productsCount: { $size: "$products" },
                    },
                },
                {
                    $group: {
                        _id: null,
                        avgProcessingTime: { $avg: "$processingTime" },
                        totalDispatches: { $sum: 1 },
                        totalProductsDispatched: { $sum: "$productsCount" },
                    },
                },
            ]),
            Warehouse_model_1.Inventory.aggregate([
                {
                    $match: {
                        warehouse: new mongoose_2.Types.ObjectId(warehouse),
                        isArchived: false,
                        ...dateMatch,
                    },
                },
                {
                    $project: {
                        utilizationRate: {
                            $cond: [
                                { $gt: ["$maxStockLevel", 0] },
                                { $divide: ["$quantity", "$maxStockLevel"] },
                                0,
                            ],
                        },
                        isLowStock: { $eq: ["$status", "low_stock"] },
                    },
                },
                {
                    $group: {
                        _id: null,
                        avgUtilization: { $avg: "$utilizationRate" },
                        lowStockCount: { $sum: { $cond: ["$isLowStock", 1, 0] } },
                        totalItems: { $sum: 1 },
                    },
                },
            ]),
        ]);
        return {
            report: "efficiency",
            dispatchEfficiency: dispatchEfficiency[0] || {},
            inventoryEfficiency: inventoryEfficiency[0] || {},
            overallScore: this.calculateOverallEfficiencyScore(dispatchEfficiency[0], inventoryEfficiency[0]),
            generatedOn: new Date(),
            filters: filters,
        };
    }
    calculateOverallEfficiencyScore(dispatchData, inventoryData) {
        let score = 0;
        if (dispatchData?.avgProcessingTime) {
            const processingScore = Math.max(0, 100 - (dispatchData.avgProcessingTime / 48) * 100);
            score += processingScore * 0.4;
        }
        if (inventoryData?.avgUtilization) {
            const utilizationScore = Math.min(100, inventoryData.avgUtilization * 100 * 1.25);
            score += utilizationScore * 0.4;
        }
        if (inventoryData?.lowStockCount && inventoryData?.totalItems) {
            const lowStockRate = inventoryData.lowStockCount / inventoryData.totalItems;
            const lowStockScore = Math.max(0, 100 - lowStockRate * 500);
            score += lowStockScore * 0.2;
        }
        return Math.round(score);
    }
    async exportReport(type, format, filters) {
        const reportData = await this.generateReport(type, filters);
        if (format === "csv") {
            return this.convertToCSV(reportData, type);
        }
        else if (format === "pdf") {
            return this.convertToPDF(reportData, type);
        }
        return reportData;
    }
    convertToCSV(data, reportType) {
        let csv = "";
        switch (reportType) {
            case "inventory_summary":
                csv = this.convertInventorySummaryToCSV(data);
                break;
            case "purchase_orders":
                csv = this.convertPurchaseOrdersToCSV(data);
                break;
            case "stock_ageing":
                csv = this.convertStockAgeingToCSV(data);
                break;
            case "inventory_turnover":
                csv = this.convertInventoryTurnoverToCSV(data);
                break;
            case "qc_summary":
                csv = this.convertQCSummaryToCSV(data);
                break;
            default:
                csv = "Report Type,Data\n";
                csv += `${reportType},"${JSON.stringify(data)}"`;
        }
        return csv;
    }
    convertInventorySummaryToCSV(data) {
        let csv = "Inventory Summary Report\n";
        csv += `Generated On: ${data.generatedOn.toISOString().split("T")[0]}\n\n`;
        csv += "SUMMARY METRICS\n";
        csv += "Metric,Value\n";
        csv += `Total SKUs,${data.summary.totalSKUs}\n`;
        csv += `Stock-Out SKUs,${data.summary.stockOutSKUs}\n`;
        csv += `Total POs,${data.summary.totalPOs}\n`;
        csv += `Pending POs,${data.summary.pendingPOs}\n`;
        csv += `Total Stock Value,${data.summary.totalStockValue}\n`;
        csv += `Low Stock Items,${data.summary.lowStockItems}\n`;
        csv += `Near-Expiry SKUs,${data.summary.nearExpirySKUs}\n`;
        csv += `Stock Accuracy,${data.summary.stockAccuracy}%\n\n`;
        csv += "INVENTORY DETAILS\n";
        csv += "SKU ID,Product Name,Category,Current Qty,Threshold,Stock Status,Last Updated\n";
        data.inventoryDetails.forEach((item) => {
            const threshold = this.getStockThreshold(item.quantity, item.minStockLevel, item.maxStockLevel);
            const lastUpdated = item.updatedAt.toISOString().split("T")[0];
            csv += `"${item.sku}","${item.productName}","${this.extractCategory(item.productName)}",${item.quantity},${threshold},"${item.status}","${lastUpdated}"\n`;
        });
        return csv;
    }
    convertPurchaseOrdersToCSV(data) {
        let csv = "Purchase Orders Report\n";
        csv += `Generated On: ${data.generatedOn.toISOString().split("T")[0]}\n\n`;
        csv += "SUMMARY METRICS\n";
        csv += "Metric,Value\n";
        csv += `Total POs,${data.summary.totalPOs}\n`;
        csv += `Pending POs,${data.summary.pendingPOs}\n`;
        csv += `Approved POs,${data.summary.approvedPOs}\n`;
        csv += `Rejected POs,${data.summary.rejectedPOs}\n`;
        csv += `Total PO Value,${data.summary.totalPOValue}\n`;
        csv += `Average PO Value,${data.summary.averagePOValue.toFixed(2)}\n\n`;
        csv += "PURCHASE ORDER DETAILS\n";
        csv += "PO Number,Vendor,Status,Created Date\n";
        data.purchaseOrders.forEach((po) => {
            const createdDate = po.createdAt.toISOString().split("T")[0];
            const vendorName = po.vendor?.vendor_name || "N/A";
            csv += `"${po.po_number}","${vendorName}","${po.po_status}","${createdDate}"\n`;
        });
        return csv;
    }
    convertStockAgeingToCSV(data) {
        let csv = "Stock Ageing Report\n";
        csv += "Age Range,Count\n";
        if (data.ageingBuckets) {
            Object.entries(data.ageingBuckets).forEach(([range, count]) => {
                csv += `${range},${count}\n`;
            });
        }
        return csv;
    }
    convertInventoryTurnoverToCSV(data) {
        let csv = "Inventory Turnover Report\n";
        csv += "SKU,Product Name,Turnover Rate,Average Stock,Total Received,Stock Out Count\n";
        if (data.data && Array.isArray(data.data)) {
            data.data.forEach((item) => {
                csv += `"${item.sku}","${item.productName}",${item.turnoverRate},${item.averageStock},${item.totalReceived},${item.stockOutCount}\n`;
            });
        }
        return csv;
    }
    convertQCSummaryToCSV(data) {
        let csv = "QC Summary Report\n";
        csv += "Status,Count\n";
        if (data.data && Array.isArray(data.data)) {
            data.data.forEach((item) => {
                csv += `${item._id},${item.count}\n`;
            });
        }
        return csv;
    }
    getStockThreshold(quantity, minStock, maxStock) {
        if (quantity <= minStock)
            return "Low";
        if (quantity >= maxStock * 0.9)
            return "High";
        return "Normal";
    }
    extractCategory(productName) {
        if (productName.toLowerCase().includes("lays") || productName.toLowerCase().includes("snack")) {
            return "Snacks";
        }
        if (productName.toLowerCase().includes("beverage") ||
            productName.toLowerCase().includes("drink")) {
            return "Beverages";
        }
        return "General";
    }
    convertToPDF(data, reportType) {
        return {
            message: "PDF generation would be implemented here",
            data: data,
            format: "pdf",
            reportType: reportType,
        };
    }
    getAgeFilter(ageRange) {
        switch (ageRange) {
            case "0-30":
                return { $lte: 30 };
            case "31-60":
                return { $gt: 30, $lte: 60 };
            case "61-90":
                return { $gt: 60, $lte: 90 };
            case "90+":
                return { $gt: 90 };
            default:
                return {};
        }
    }
    async generateAlerts(warehouseId) {
        const alerts = [];
        try {
            const baseQuery = {};
            if (warehouseId && mongoose_2.Types.ObjectId.isValid(warehouseId)) {
                baseQuery.warehouse = new mongoose_2.Types.ObjectId(warehouseId);
            }
            const pendingQC = await Warehouse_model_1.RaisePurchaseOrder.countDocuments({
                ...baseQuery,
                po_status: "draft",
            });
            if (pendingQC > 0) {
                alerts.push({
                    type: "qc_failed",
                    message: `${pendingQC} purchase orders pending approval`,
                    count: pendingQC,
                });
            }
            const lowStock = await Warehouse_model_1.Inventory.countDocuments({
                ...baseQuery,
                status: "low_stock",
                isArchived: false,
            });
            if (lowStock > 0) {
                alerts.push({
                    type: "low_stock",
                    message: `${lowStock} items below safety stock`,
                    count: lowStock,
                });
            }
        }
        catch (error) {
            logger_util_1.logger.error("Error generating alerts:", error);
        }
        return alerts;
    }
    async getRecentActivities(warehouseId) {
        try {
            const baseQuery = {};
            if (warehouseId && mongoose_2.Types.ObjectId.isValid(warehouseId)) {
                baseQuery.warehouse = new mongoose_2.Types.ObjectId(warehouseId);
            }
            const [purchaseActivities, dispatchActivities] = await Promise.all([
                Warehouse_model_1.RaisePurchaseOrder.find(baseQuery)
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate("createdBy", "name"),
                Warehouse_model_1.DispatchOrder.find(baseQuery)
                    .sort({ createdAt: -1 })
                    .limit(5)
                    .populate("assignedAgent", "name"),
            ]);
            const activities = [
                ...purchaseActivities.map((item) => ({
                    type: "inbound",
                    message: `Purchase order ${item.po_number} created`,
                    timestamp: item.createdAt,
                    user: item.createdBy?.name || "System",
                })),
                ...dispatchActivities.map((item) => ({
                    type: "outbound",
                    message: `Dispatched ${item.products?.length || 0} products to ${item.destination}`,
                    timestamp: item.createdAt,
                    user: item.assignedAgent?.name || "System",
                })),
            ];
            return activities
                .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
                .slice(0, 8);
        }
        catch (error) {
            logger_util_1.logger.error("Error getting recent activities:", error);
            return [];
        }
    }
    async validateSkuStock(products) {
        for (const product of products) {
            const inventory = await Warehouse_model_1.Inventory.findOne({
                sku: product.sku,
                isArchived: false,
            });
            if (!inventory || inventory.quantity < product.quantity) {
                throw new Error(`Insufficient stock for ${product.sku}. Available: ${inventory?.quantity || 0}, Requested: ${product.quantity}`);
            }
        }
    }
    async reduceStockBySku(products) {
        for (const product of products) {
            await Warehouse_model_1.Inventory.findOneAndUpdate({ sku: product.sku, isArchived: false }, {
                $inc: { quantity: -product.quantity },
                $set: { updatedAt: new Date() },
            });
        }
    }
    calculateInventoryStatus(data) {
        const today = new Date();
        if (data.expiryDate && data.expiryDate < today) {
            return "expired";
        }
        if (data.quantity <= data.minStockLevel) {
            return "low_stock";
        }
        if (data.quantity >= data.maxStockLevel * 0.9) {
            return "overstock";
        }
        return "active";
    }
    async createWarehouse(data, createdBy) {
        const { Warehouse } = await Promise.resolve().then(() => __importStar(require("../models/Warehouse.model")));
        const existingWarehouse = await Warehouse.findOne({ code: data.code });
        if (existingWarehouse) {
            throw new Error("Warehouse with this code already exists");
        }
        const warehouse = await Warehouse.create({
            ...data,
            isActive: true,
            createdBy,
        });
        return await Warehouse.findById(warehouse._id)
            .populate("manager", "name email phone")
            .populate("createdBy", "name email");
    }
    async getWarehouses(filters, userId, userRoles) {
        const { Warehouse } = await Promise.resolve().then(() => __importStar(require("../models/Warehouse.model")));
        const page = filters.page || 1;
        const limit = filters.limit || 10;
        const skip = (page - 1) * limit;
        const query = {};
        const isWarehouseManager = userRoles.some((role) => role.systemRole === "warehouse_manager");
        if (isWarehouseManager) {
            query.manager = userId;
        }
        if (filters.search) {
            query.$or = [
                { name: { $regex: filters.search, $options: "i" } },
                { code: { $regex: filters.search, $options: "i" } },
                { location: { $regex: filters.search, $options: "i" } },
            ];
        }
        if (filters.isActive !== undefined) {
            query.isActive = filters.isActive;
        }
        if (filters.partner) {
            query.partner = { $regex: filters.partner, $options: "i" };
        }
        const sortBy = filters.sortBy || "createdAt";
        const sortOrder = filters.sortOrder === "asc" ? 1 : -1;
        const sort = { [sortBy]: sortOrder };
        const [warehouses, total] = await Promise.all([
            Warehouse.find(query)
                .populate("manager", "name email phone")
                .populate("createdBy", "name email")
                .sort(sort)
                .skip(skip)
                .limit(limit),
            Warehouse.countDocuments(query),
        ]);
        return {
            warehouses,
            pagination: {
                total,
                page,
                limit,
                pages: Math.ceil(total / limit),
            },
        };
    }
    async getWarehouseById(warehouseId, userId, userRoles) {
        const { Warehouse } = await Promise.resolve().then(() => __importStar(require("../models/Warehouse.model")));
        if (!mongoose_2.Types.ObjectId.isValid(warehouseId)) {
            throw new Error("Invalid warehouse ID");
        }
        const warehouse = await Warehouse.findById(warehouseId)
            .populate("manager", "name email phone")
            .populate("createdBy", "name email");
        if (!warehouse) {
            throw new Error("Warehouse not found");
        }
        const isWarehouseManager = userRoles.some((role) => role.systemRole === "warehouse_manager");
        if (isWarehouseManager && warehouse.manager?.toString() !== userId.toString()) {
            throw new Error("Access denied: You can only view your assigned warehouse");
        }
        return warehouse;
    }
    async updateWarehouse(warehouseId, updateData) {
        const { Warehouse } = await Promise.resolve().then(() => __importStar(require("../models/Warehouse.model")));
        if (!mongoose_2.Types.ObjectId.isValid(warehouseId)) {
            throw new Error("Invalid warehouse ID");
        }
        if (updateData.code) {
            const existingWarehouse = await Warehouse.findOne({
                code: updateData.code,
                _id: { $ne: warehouseId },
            });
            if (existingWarehouse) {
                throw new Error("Warehouse with this code already exists");
            }
        }
        const warehouse = await Warehouse.findByIdAndUpdate(warehouseId, { $set: updateData }, { new: true, runValidators: true })
            .populate("manager", "name email phone")
            .populate("createdBy", "name email");
        if (!warehouse) {
            throw new Error("Warehouse not found");
        }
        return warehouse;
    }
    async deleteWarehouse(warehouseId) {
        const { Warehouse } = await Promise.resolve().then(() => __importStar(require("../models/Warehouse.model")));
        if (!mongoose_2.Types.ObjectId.isValid(warehouseId)) {
            throw new Error("Invalid warehouse ID");
        }
        const inventoryCount = await Warehouse_model_1.Inventory.countDocuments({
            warehouse: warehouseId,
            isArchived: false,
        });
        if (inventoryCount > 0) {
            throw new Error("Cannot delete warehouse with active inventory. Please archive or transfer inventory first.");
        }
        const warehouse = await Warehouse.findByIdAndDelete(warehouseId);
        if (!warehouse) {
            throw new Error("Warehouse not found");
        }
        return { message: "Warehouse deleted successfully", warehouse };
    }
    async getMyWarehouse(managerId) {
        const managerObjectId = typeof managerId === "string" ? new mongoose_2.Types.ObjectId(managerId) : managerId;
        logger_util_1.logger.info("🔍 Looking for warehouse with manager ID:", managerObjectId.toString());
        const warehouse = await Warehouse_model_1.Warehouse.findOne({
            manager: managerObjectId,
            isActive: true,
        })
            .populate("manager", "name email phone")
            .populate("createdBy", "name email")
            .lean();
        if (!warehouse) {
            const anyWarehouse = await Warehouse_model_1.Warehouse.findOne({
                manager: managerObjectId,
            }).lean();
            if (anyWarehouse) {
                logger_util_1.logger.info("⚠️  Warehouse found but isActive:", anyWarehouse.isActive);
                throw new Error("Warehouse assigned to this manager is not active");
            }
            logger_util_1.logger.info("❌ No warehouse found for manager ID:", managerObjectId.toString());
            throw new Error("No warehouse assigned to this manager");
        }
        logger_util_1.logger.info("✅ Warehouse found:", warehouse.code);
        return warehouse;
    }
}
exports.warehouseService = new WarehouseService();
