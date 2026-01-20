"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateQCSummaryReport = exports.generateInventoryTurnoverReport = exports.generatePurchaseOrderReport = exports.generateInventorySummary = exports.exportReport = exports.generateReport = exports.getMonthlyExpenseTrend = exports.getExpenseSummary = exports.getExpenseById = exports.uploadExpenseBill = exports.deleteExpense = exports.updateExpense = exports.updateExpensePaymentStatus = exports.updateExpenseStatus = exports.getExpenses = exports.createExpense = exports.bulkUnarchiveInventory = exports.bulkArchiveInventory = exports.getInventoryStats = exports.getArchivedInventory = exports.unarchiveInventory = exports.archiveInventory = exports.updateInventoryItem = exports.getInventoryItem = exports.getInventoryDashboard = exports.updateFieldAgent = exports.createFieldAgent = exports.getFieldAgents = exports.rejectReturn = exports.approveReturn = exports.getReturnQueue = exports.createReturnOrder = exports.deleteQCTemplate = exports.updateQCTemplate = exports.getQCTemplates = exports.createQCTemplate = exports.updateDispatchStatus = exports.getDispatchById = exports.getDispatches = exports.createDispatch = exports.deletePurchaseOrder = exports.updatePurchaseOrderStatus = exports.getPurchaseOrderById = exports.getPurchaseOrders = exports.updateGRNStatus = exports.getGRNs = exports.getGRNById = exports.createGRN = exports.createPurchaseOrder = exports.getDashboard = void 0;
exports.getMyWarehouse = exports.deleteWarehouse = exports.updateWarehouse = exports.getWarehouseById = exports.getWarehouses = exports.createWarehouse = exports.getStockAgeingReport = exports.getReportTypes = exports.generateEfficiencyReport = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const warehouse_service_1 = require("../services/warehouse.service");
const responseHandlers_1 = require("../utils/responseHandlers");
const auth_middleware_1 = require("../middleware/auth.middleware");
const documentUpload_service_1 = require("../services/documentUpload.service");
exports.getDashboard = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { date, category, partner, warehouseId, ...otherFilters } = req.query;
        const filters = { ...otherFilters };
        if (date)
            filters.dateRange = date;
        if (category)
            filters.category = category;
        if (partner)
            filters.partner = partner;
        const dashboard = await warehouse_service_1.warehouseService.getDashboard(warehouseId, filters);
        (0, responseHandlers_1.sendSuccess)(res, dashboard, "Dashboard data retrieved successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get dashboard data", 500);
    }
});
exports.createPurchaseOrder = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    if (!(0, auth_middleware_1.checkPermission)(req.user, "purchase_orders:create")) {
        return (0, responseHandlers_1.sendError)(res, "Insufficient permissions to create purchase orders", 403);
    }
    try {
        const uploadService = new documentUpload_service_1.DocumentUploadService();
        const files = req.files;
        console.log("📥 Request received:", {
            hasFiles: !!files,
            fileCount: files?.length || 0,
            contentType: req.headers["content-type"],
        });
        const poData = { ...req.body };
        if (typeof req.body.po_line_items === "string") {
            try {
                poData.po_line_items = JSON.parse(req.body.po_line_items);
            }
            catch (parseError) {
                return (0, responseHandlers_1.sendBadRequest)(res, "Invalid po_line_items format. Must be valid JSON.");
            }
        }
        if (files && files.length > 0) {
            console.log("📤 Processing file uploads...");
            const filesByLineItem = {};
            for (const file of files) {
                const match = file.fieldname.match(/images_(\d+)/);
                if (match) {
                    const lineItemIndex = parseInt(match[1], 10);
                    if (!filesByLineItem[lineItemIndex]) {
                        filesByLineItem[lineItemIndex] = [];
                    }
                    filesByLineItem[lineItemIndex].push(file);
                }
            }
            console.log("📊 Files grouped by line item:", Object.keys(filesByLineItem).map(key => ({
                lineItem: key,
                fileCount: filesByLineItem[parseInt(key)].length,
            })));
            for (const [lineItemIndex, lineItemFiles] of Object.entries(filesByLineItem)) {
                const index = parseInt(lineItemIndex, 10);
                if (!poData.po_line_items[index]) {
                    console.warn(`⚠️ Warning: Files uploaded for line item ${index}, but line item doesn't exist`);
                    continue;
                }
                const uploadedImages = [];
                for (const file of lineItemFiles) {
                    try {
                        console.log(`⬆️ Uploading ${file.originalname} for line item ${index}...`);
                        const uploadResult = await uploadService.uploadToCloudinary(file.buffer, file.originalname, "frovo/purchase_orders");
                        uploadedImages.push({
                            file_name: file.originalname,
                            file_url: uploadResult.url,
                            cloudinary_public_id: uploadResult.publicId,
                            file_size: file.size,
                            mime_type: file.mimetype,
                            uploaded_at: new Date(),
                        });
                        console.log(`✅ Uploaded ${file.originalname} successfully`);
                    }
                    catch (uploadError) {
                        console.error(`❌ Failed to upload ${file.originalname}:`, uploadError);
                        return (0, responseHandlers_1.sendError)(res, `Failed to upload file ${file.originalname}`, 500);
                    }
                }
                poData.po_line_items[index].images = uploadedImages;
            }
            console.log("✅ All files uploaded successfully");
        }
        console.log("📥 Final PO data:", {
            vendor: poData.vendor,
            po_line_items_count: poData.po_line_items?.length || 0,
            all_fields: Object.keys(poData),
        });
        const isWarehouseStaff = req.user.roles?.some((role) => {
            return role.systemRole === "warehouse_staff";
        });
        if (isWarehouseStaff) {
            poData.po_status = "draft";
            console.log("🔒 Warehouse staff: PO status forced to draft");
        }
        const result = await warehouse_service_1.warehouseService.createPurchaseOrder(poData, req.user._id);
        console.log("📤 Service result:", {
            po_number: result.po_number,
            warehouse: result.warehouse || "Not assigned",
            line_items_count: result.po_line_items?.length || 0,
            line_items: result.po_line_items,
        });
        const responseData = {
            ...result.toObject(),
            vendor: result.vendor
                ? {
                    _id: result.vendor._id,
                    vendor_name: result.vendor.vendor_name,
                    vendor_billing_name: result.vendor.vendor_billing_name,
                    vendor_email: result.vendor.vendor_email,
                    vendor_phone: result.vendor.vendor_phone,
                    vendor_category: result.vendor.vendor_category,
                    gst_number: result.vendor.gst_number,
                    verification_status: result.vendor.verification_status,
                    vendor_address: result.vendor.vendor_address,
                    vendor_contact: result.vendor.vendor_contact,
                    vendor_id: result.vendor.vendor_id,
                }
                : null,
        };
        console.log("📄 Final response data:", {
            line_items_count: responseData.po_line_items?.length || 0,
            line_items: responseData.po_line_items,
        });
        return (0, responseHandlers_1.sendCreated)(res, responseData, "Purchase order created successfully");
    }
    catch (error) {
        console.error("❌ Controller error:", error);
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to create purchase order", 500);
    }
});
exports.createGRN = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    if (!(0, auth_middleware_1.checkPermission)(req.user, "grn:create")) {
        return (0, responseHandlers_1.sendError)(res, "Insufficient permissions to create GRN", 403);
    }
    try {
        const { purchaseOrderId } = req.params;
        if (!purchaseOrderId) {
            return (0, responseHandlers_1.sendBadRequest)(res, "Purchase order ID is required");
        }
        const files = req.files;
        const uploadedFile = files?.document?.[0];
        const result = await warehouse_service_1.warehouseService.createGRN(purchaseOrderId, req.body, req.user._id, uploadedFile);
        return (0, responseHandlers_1.sendCreated)(res, result, "GRN created successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to create GRN", 500);
    }
});
exports.getGRNById = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user || !(0, auth_middleware_1.checkPermission)(req.user, "grn:view")) {
        return (0, responseHandlers_1.sendError)(res, "Insufficient permissions to view GRN", 403);
    }
    try {
        const { id } = req.params;
        if (!id) {
            return (0, responseHandlers_1.sendBadRequest)(res, "GRN ID is required");
        }
        const grn = await warehouse_service_1.warehouseService.getGRNById(id);
        if (!grn) {
            return (0, responseHandlers_1.sendNotFound)(res, "GRN not found");
        }
        return (0, responseHandlers_1.sendSuccess)(res, grn, "GRN retrieved successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get GRN", 500);
    }
});
exports.getGRNs = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user || !(0, auth_middleware_1.checkPermission)(req.user, "grn:view")) {
        return (0, responseHandlers_1.sendError)(res, "Insufficient permissions to view GRNs", 403);
    }
    try {
        const grns = await warehouse_service_1.warehouseService.getGRNs(req.query);
        return (0, responseHandlers_1.sendSuccess)(res, grns, "GRNs retrieved successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get GRNs", 500);
    }
});
exports.updateGRNStatus = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    if (!(0, auth_middleware_1.checkPermission)(req.user, "grn:edit")) {
        return (0, responseHandlers_1.sendError)(res, "Insufficient permissions to update GRN status", 403);
    }
    try {
        const { id } = req.params;
        const { qc_status, remarks } = req.body;
        if (!id) {
            return (0, responseHandlers_1.sendBadRequest)(res, "GRN ID is required");
        }
        if (!qc_status) {
            return (0, responseHandlers_1.sendBadRequest)(res, "QC status is required");
        }
        const result = await warehouse_service_1.warehouseService.updateGRNStatus(id, qc_status, remarks);
        return (0, responseHandlers_1.sendSuccess)(res, result, "GRN status updated successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to update GRN status", 500);
    }
});
exports.getPurchaseOrders = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user || !(0, auth_middleware_1.checkPermission)(req.user, "purchase_orders:view")) {
        return (0, responseHandlers_1.sendError)(res, "Insufficient permissions to view purchase orders", 403);
    }
    try {
        const { warehouseId, ...filters } = req.query;
        const result = await warehouse_service_1.warehouseService.getPurchaseOrders(warehouseId, filters);
        return (0, responseHandlers_1.sendSuccess)(res, result, "Purchase orders fetched successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to fetch purchase orders", 500);
    }
});
exports.getPurchaseOrderById = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user || !(0, auth_middleware_1.checkPermission)(req.user, "purchase_orders:view")) {
        return (0, responseHandlers_1.sendError)(res, "Insufficient permissions to view purchase orders", 403);
    }
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Purchase order ID is required");
    try {
        const result = await warehouse_service_1.warehouseService.getPurchaseOrderById(id);
        if (!result)
            return (0, responseHandlers_1.sendNotFound)(res, "Purchase order not found");
        return (0, responseHandlers_1.sendSuccess)(res, result, "Purchase order fetched successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to fetch purchase order", 500);
    }
});
exports.updatePurchaseOrderStatus = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    if (!(0, auth_middleware_1.checkPermission)(req.user, "purchase_orders:status_update")) {
        return (0, responseHandlers_1.sendError)(res, "Insufficient permissions to update purchase order status", 403);
    }
    const { id } = req.params;
    const { po_status, remarks } = req.body;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Purchase order ID is required");
    if (!po_status)
        return (0, responseHandlers_1.sendBadRequest)(res, "Purchase order status is required");
    try {
        const result = await warehouse_service_1.warehouseService.updatePurchaseOrderStatus(id, po_status, remarks);
        if (!result)
            return (0, responseHandlers_1.sendNotFound)(res, "Purchase order not found");
        return (0, responseHandlers_1.sendSuccess)(res, result, "Purchase order status updated successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to update purchase order status", 500);
    }
});
exports.deletePurchaseOrder = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    if (!(0, auth_middleware_1.checkPermission)(req.user, "purchase_orders:delete")) {
        return (0, responseHandlers_1.sendError)(res, "Insufficient permissions to delete purchase orders", 403);
    }
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Purchase order ID is required");
    try {
        await warehouse_service_1.warehouseService.deletePurchaseOrder(id);
        return (0, responseHandlers_1.sendSuccess)(res, null, "Purchase order deleted successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to delete purchase order", 500);
    }
});
exports.createDispatch = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    try {
        const dispatch = await warehouse_service_1.warehouseService.createDispatch(req.body, req.user._id);
        return (0, responseHandlers_1.sendCreated)(res, dispatch, "Dispatch order created successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to create dispatch", 500);
    }
});
exports.getDispatches = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { warehouseId, ...filters } = req.query;
        const dispatches = await warehouse_service_1.warehouseService.getDispatches(warehouseId, filters);
        (0, responseHandlers_1.sendSuccess)(res, dispatches, "Dispatches retrieved successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get dispatches", 500);
    }
});
exports.getDispatchById = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Dispatch ID is required");
    try {
        const dispatch = await warehouse_service_1.warehouseService.getDispatchById(id);
        if (!dispatch)
            return (0, responseHandlers_1.sendNotFound)(res, "Dispatch order not found");
        (0, responseHandlers_1.sendSuccess)(res, dispatch, "Dispatch order retrieved successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get dispatch order", 500);
    }
});
exports.updateDispatchStatus = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Dispatch ID is required");
    if (!status)
        return (0, responseHandlers_1.sendBadRequest)(res, "Dispatch status is required");
    try {
        const dispatch = await warehouse_service_1.warehouseService.updateDispatchStatus(id, status);
        return (0, responseHandlers_1.sendSuccess)(res, dispatch, "Dispatch status updated successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to update dispatch status", 500);
    }
});
exports.createQCTemplate = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    try {
        const template = await warehouse_service_1.warehouseService.createQCTemplate(req.body, req.user._id);
        return (0, responseHandlers_1.sendCreated)(res, template, "QC template created successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to create QC template", 500);
    }
});
exports.getQCTemplates = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { sku } = req.query;
        const templates = await warehouse_service_1.warehouseService.getQCTemplates(sku);
        (0, responseHandlers_1.sendSuccess)(res, templates, "QC templates retrieved successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get QC templates", 500);
    }
});
exports.updateQCTemplate = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Template ID is required");
    try {
        const template = await warehouse_service_1.warehouseService.updateQCTemplate(id, req.body);
        if (!template)
            return (0, responseHandlers_1.sendNotFound)(res, "QC template not found");
        return (0, responseHandlers_1.sendSuccess)(res, template, "QC template updated successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to update QC template", 500);
    }
});
exports.deleteQCTemplate = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Template ID is required");
    try {
        await warehouse_service_1.warehouseService.deleteQCTemplate(id);
        return (0, responseHandlers_1.sendSuccess)(res, null, "QC template deleted successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to delete QC template", 500);
    }
});
exports.createReturnOrder = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    try {
        const returnOrder = await warehouse_service_1.warehouseService.createReturnOrder(req.body, req.user._id);
        return (0, responseHandlers_1.sendCreated)(res, returnOrder, "Return order created successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to create return order", 500);
    }
});
exports.getReturnQueue = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { warehouseId, ...filters } = req.query;
        const returnQueue = await warehouse_service_1.warehouseService.getReturnQueue(warehouseId, filters);
        (0, responseHandlers_1.sendSuccess)(res, returnQueue, "Return queue retrieved successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get return queue", 500);
    }
});
exports.approveReturn = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Return ID is required");
    try {
        const returnOrder = await warehouse_service_1.warehouseService.approveReturn(id);
        return (0, responseHandlers_1.sendSuccess)(res, returnOrder, "Return approved successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to approve return", 500);
    }
});
exports.rejectReturn = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Return ID is required");
    try {
        const returnOrder = await warehouse_service_1.warehouseService.rejectReturn(id);
        return (0, responseHandlers_1.sendSuccess)(res, returnOrder, "Return rejected successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to reject return", 500);
    }
});
exports.getFieldAgents = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const isActive = req.query["isActive"] !== undefined ? req.query["isActive"] === "true" : undefined;
        const agents = await warehouse_service_1.warehouseService.getFieldAgents(isActive);
        (0, responseHandlers_1.sendSuccess)(res, agents, "Field agents retrieved successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get field agents", 500);
    }
});
exports.createFieldAgent = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    try {
        const agent = await warehouse_service_1.warehouseService.createFieldAgent(req.body, req.user._id);
        return (0, responseHandlers_1.sendCreated)(res, agent, "Field agent created successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to create field agent", 500);
    }
});
exports.updateFieldAgent = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "User ID is required");
    try {
        const agent = await warehouse_service_1.warehouseService.updateFieldAgent(id, req.body);
        return (0, responseHandlers_1.sendSuccess)(res, agent, "Field agent updated successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to update field agent", 500);
    }
});
exports.getInventoryDashboard = (0, express_async_handler_1.default)(async (req, res) => {
    const { warehouseId } = req.params;
    const { page = 1, limit = 50, ...filters } = req.query;
    if (!warehouseId) {
        return (0, responseHandlers_1.sendBadRequest)(res, "Warehouse ID is required");
    }
    try {
        const result = await warehouse_service_1.warehouseService.getInventoryDashboard(warehouseId, filters, parseInt(page), parseInt(limit));
        (0, responseHandlers_1.sendSuccess)(res, result, "Inventory dashboard data retrieved successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get inventory dashboard", 500);
    }
});
exports.getInventoryItem = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return (0, responseHandlers_1.sendBadRequest)(res, "Inventory ID is required");
    }
    try {
        const inventoryItem = await warehouse_service_1.warehouseService.getInventoryById(id);
        if (!inventoryItem) {
            return (0, responseHandlers_1.sendError)(res, "Inventory item not found", 404);
        }
        (0, responseHandlers_1.sendSuccess)(res, inventoryItem, "Inventory item retrieved successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get inventory item", 500);
    }
});
exports.updateInventoryItem = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    if (!id) {
        return (0, responseHandlers_1.sendBadRequest)(res, "Inventory ID is required");
    }
    try {
        const updatedItem = await warehouse_service_1.warehouseService.updateInventoryItem(id, updateData);
        (0, responseHandlers_1.sendSuccess)(res, updatedItem, "Inventory item updated successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to update inventory item", 500);
    }
});
exports.archiveInventory = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return (0, responseHandlers_1.sendBadRequest)(res, "Inventory ID is required");
    }
    try {
        const archivedItem = await warehouse_service_1.warehouseService.archiveInventoryItem(id);
        (0, responseHandlers_1.sendSuccess)(res, archivedItem, "Inventory item archived successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to archive inventory item", 500);
    }
});
exports.unarchiveInventory = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return (0, responseHandlers_1.sendBadRequest)(res, "Inventory ID is required");
    }
    try {
        const unarchivedItem = await warehouse_service_1.warehouseService.unarchiveInventoryItem(id);
        (0, responseHandlers_1.sendSuccess)(res, unarchivedItem, "Inventory item unarchived successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to unarchive inventory item", 500);
    }
});
exports.getArchivedInventory = (0, express_async_handler_1.default)(async (req, res) => {
    const { warehouseId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    if (!warehouseId) {
        return (0, responseHandlers_1.sendBadRequest)(res, "Warehouse ID is required");
    }
    try {
        const result = await warehouse_service_1.warehouseService.getArchivedInventory(warehouseId, parseInt(page), parseInt(limit));
        (0, responseHandlers_1.sendSuccess)(res, result, "Archived inventory retrieved successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get archived inventory", 500);
    }
});
exports.getInventoryStats = (0, express_async_handler_1.default)(async (req, res) => {
    const { warehouseId } = req.params;
    if (!warehouseId) {
        return (0, responseHandlers_1.sendBadRequest)(res, "Warehouse ID is required");
    }
    try {
        const stats = await warehouse_service_1.warehouseService.getInventoryStats(warehouseId);
        (0, responseHandlers_1.sendSuccess)(res, stats, "Inventory statistics retrieved successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get inventory statistics", 500);
    }
});
exports.bulkArchiveInventory = (0, express_async_handler_1.default)(async (req, res) => {
    const { inventoryIds } = req.body;
    if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length === 0) {
        return (0, responseHandlers_1.sendBadRequest)(res, "Inventory IDs array is required");
    }
    try {
        const result = await warehouse_service_1.warehouseService.bulkArchiveInventory(inventoryIds);
        (0, responseHandlers_1.sendSuccess)(res, result, result.message);
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to bulk archive inventory", 500);
    }
});
exports.bulkUnarchiveInventory = (0, express_async_handler_1.default)(async (req, res) => {
    const { inventoryIds } = req.body;
    if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length === 0) {
        return (0, responseHandlers_1.sendBadRequest)(res, "Inventory IDs array is required");
    }
    try {
        const result = await warehouse_service_1.warehouseService.bulkUnarchiveInventory(inventoryIds);
        (0, responseHandlers_1.sendSuccess)(res, result, result.message);
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to bulk unarchive inventory", 500);
    }
});
exports.createExpense = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    try {
        const expense = await warehouse_service_1.warehouseService.createExpense(req.body, req.user._id);
        return (0, responseHandlers_1.sendCreated)(res, expense, "Expense recorded successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to record expense", 500);
    }
});
exports.getExpenses = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { warehouseId, ...filters } = req.query;
        const expenses = await warehouse_service_1.warehouseService.getExpenses(warehouseId, filters);
        (0, responseHandlers_1.sendSuccess)(res, expenses, "Expenses retrieved successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get expenses", 500);
    }
});
exports.updateExpenseStatus = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Expense ID is required");
    if (!status)
        return (0, responseHandlers_1.sendBadRequest)(res, "Expense status is required");
    try {
        const expense = await warehouse_service_1.warehouseService.updateExpenseStatus(id, status, req.user?._id);
        return (0, responseHandlers_1.sendSuccess)(res, expense, "Expense status updated successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to update expense status", 500);
    }
});
exports.updateExpensePaymentStatus = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Expense ID is required");
    if (!paymentStatus)
        return (0, responseHandlers_1.sendBadRequest)(res, "Expense payment status is required");
    try {
        const expense = await warehouse_service_1.warehouseService.updateExpensePaymentStatus(id, paymentStatus);
        return (0, responseHandlers_1.sendSuccess)(res, expense, "Expense payment status updated successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to update expense payment status", 500);
    }
});
exports.updateExpense = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Expense ID is required");
    try {
        const expense = await warehouse_service_1.warehouseService.updateExpense(id, req.body);
        return (0, responseHandlers_1.sendSuccess)(res, expense, "Expense updated successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to update expense", 500);
    }
});
exports.deleteExpense = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Expense ID is required");
    try {
        await warehouse_service_1.warehouseService.deleteExpense(id);
        return (0, responseHandlers_1.sendSuccess)(res, null, "Expense deleted successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to delete expense", 500);
    }
});
exports.uploadExpenseBill = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Expense ID is required");
    if (!req.file) {
        return (0, responseHandlers_1.sendBadRequest)(res, "No file uploaded");
    }
    try {
        const expense = await warehouse_service_1.warehouseService.uploadExpenseBill(id, req.file);
        return (0, responseHandlers_1.sendSuccess)(res, expense, "Bill uploaded successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to upload bill", 500);
    }
});
exports.getExpenseById = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Expense ID is required");
    try {
        const expense = await warehouse_service_1.warehouseService.getExpenseById(id);
        if (!expense)
            return (0, responseHandlers_1.sendNotFound)(res, "Expense not found");
        return (0, responseHandlers_1.sendSuccess)(res, expense, "Expense retrieved successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get expense", 500);
    }
});
exports.getExpenseSummary = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { warehouseId, ...filters } = req.query;
        const summary = await warehouse_service_1.warehouseService.getExpenseSummary(warehouseId, filters);
        (0, responseHandlers_1.sendSuccess)(res, summary, "Expense summary retrieved successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get expense summary", 500);
    }
});
exports.getMonthlyExpenseTrend = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { warehouseId, months = 12 } = req.query;
        const trend = await warehouse_service_1.warehouseService.getMonthlyExpenseTrend(warehouseId, parseInt(months));
        (0, responseHandlers_1.sendSuccess)(res, trend, "Monthly expense trend retrieved successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to get monthly expense trend", 500);
    }
});
exports.generateReport = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { type, warehouseId, ...filters } = req.query;
        if (!type)
            return (0, responseHandlers_1.sendBadRequest)(res, "Report type is required");
        if (!warehouseId)
            return (0, responseHandlers_1.sendBadRequest)(res, "warehouseId is required");
        const report = await warehouse_service_1.warehouseService.generateReport(type, {
            warehouse: warehouseId,
            ...filters,
        });
        (0, responseHandlers_1.sendSuccess)(res, report, "Report generated successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to generate report", 500);
    }
});
exports.exportReport = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { type, format = "csv", warehouseId, ...filters } = req.query;
        if (!type)
            return (0, responseHandlers_1.sendBadRequest)(res, "Report type is required");
        if (!warehouseId)
            return (0, responseHandlers_1.sendBadRequest)(res, "warehouseId is required");
        const report = await warehouse_service_1.warehouseService.exportReport(type, format, {
            warehouse: warehouseId,
            ...filters,
        });
        if (format === "csv") {
            res.setHeader("Content-Type", "text/csv");
            res.setHeader("Content-Disposition", `attachment; filename=${type}-report.csv`);
            res.send(report);
        }
        else {
            (0, responseHandlers_1.sendSuccess)(res, report, "Report exported successfully");
        }
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to export report", 500);
    }
});
exports.generateInventorySummary = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { warehouseId, ...filters } = req.query;
        const report = await warehouse_service_1.warehouseService.generateReport("inventory_summary", {
            warehouse: warehouseId,
            ...filters,
        });
        (0, responseHandlers_1.sendSuccess)(res, report, "Inventory summary report generated successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to generate inventory summary report", 500);
    }
});
exports.generatePurchaseOrderReport = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { warehouseId, ...filters } = req.query;
        const report = await warehouse_service_1.warehouseService.generateReport("purchase_orders", {
            warehouse: warehouseId,
            ...filters,
        });
        (0, responseHandlers_1.sendSuccess)(res, report, "Purchase order report generated successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to generate purchase order report", 500);
    }
});
exports.generateInventoryTurnoverReport = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { warehouseId, ...filters } = req.query;
        const report = await warehouse_service_1.warehouseService.generateReport("inventory_turnover", {
            warehouse: warehouseId,
            ...filters,
        });
        (0, responseHandlers_1.sendSuccess)(res, report, "Inventory turnover report generated successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to generate inventory turnover report", 500);
    }
});
exports.generateQCSummaryReport = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { warehouseId, ...filters } = req.query;
        const report = await warehouse_service_1.warehouseService.generateReport("qc_summary", {
            warehouse: warehouseId,
            ...filters,
        });
        (0, responseHandlers_1.sendSuccess)(res, report, "QC summary report generated successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to generate QC summary report", 500);
    }
});
exports.generateEfficiencyReport = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { warehouseId, ...filters } = req.query;
        const report = await warehouse_service_1.warehouseService.generateReport("efficiency", {
            warehouse: warehouseId,
            ...filters,
        });
        (0, responseHandlers_1.sendSuccess)(res, report, "Efficiency report generated successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to generate efficiency report", 500);
    }
});
exports.getReportTypes = (0, express_async_handler_1.default)(async (_req, res) => {
    const reportTypes = [
        { value: "inventory_summary", label: "Inventory Summary" },
        { value: "purchase_orders", label: "Purchase Orders from Vendors" },
        { value: "inventory_turnover", label: "Inventory Turnover" },
        { value: "qc_summary", label: "QC Summary" },
        { value: "efficiency", label: "Efficiency Report" },
        { value: "stock_ageing", label: "Stock Ageing" },
    ];
    (0, responseHandlers_1.sendSuccess)(res, reportTypes, "Report types retrieved successfully");
});
exports.getStockAgeingReport = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { warehouseId } = req.query;
        const report = await warehouse_service_1.warehouseService.generateReport("stock_ageing", {
            warehouse: warehouseId,
        });
        (0, responseHandlers_1.sendSuccess)(res, report, "Stock ageing report generated successfully");
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to generate stock ageing report", 500);
    }
});
exports.createWarehouse = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    const isSuperAdmin = req.user.roles?.some((role) => role.systemRole === "super_admin");
    if (!isSuperAdmin) {
        return (0, responseHandlers_1.sendError)(res, "Only Super Admin can create warehouses", 403);
    }
    try {
        const warehouse = await warehouse_service_1.warehouseService.createWarehouse(req.body, req.user._id);
        return (0, responseHandlers_1.sendCreated)(res, warehouse, "Warehouse created successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to create warehouse", 500);
    }
});
exports.getWarehouses = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    if (!(0, auth_middleware_1.checkPermission)(req.user, "warehouse:view")) {
        return (0, responseHandlers_1.sendError)(res, "Insufficient permissions to view warehouses", 403);
    }
    try {
        const filters = {
            page: parseInt(req.query.page) || 1,
            limit: parseInt(req.query.limit) || 10,
            search: req.query.search,
            isActive: req.query.isActive === "true" ? true : req.query.isActive === "false" ? false : undefined,
            partner: req.query.partner,
            sortBy: req.query.sortBy || "createdAt",
            sortOrder: req.query.sortOrder || "desc",
        };
        const result = await warehouse_service_1.warehouseService.getWarehouses(filters, req.user._id, req.user.roles);
        return (0, responseHandlers_1.sendSuccess)(res, result, "Warehouses retrieved successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to retrieve warehouses", 500);
    }
});
exports.getWarehouseById = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    if (!(0, auth_middleware_1.checkPermission)(req.user, "warehouse:view")) {
        return (0, responseHandlers_1.sendError)(res, "Insufficient permissions to view warehouse", 403);
    }
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Warehouse ID is required");
    try {
        const warehouse = await warehouse_service_1.warehouseService.getWarehouseById(id, req.user._id, req.user.roles);
        return (0, responseHandlers_1.sendSuccess)(res, warehouse, "Warehouse retrieved successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to retrieve warehouse", 500);
    }
});
exports.updateWarehouse = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    if (!(0, auth_middleware_1.checkPermission)(req.user, "warehouse:manage")) {
        return (0, responseHandlers_1.sendError)(res, "Insufficient permissions to update warehouse", 403);
    }
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Warehouse ID is required");
    try {
        const warehouse = await warehouse_service_1.warehouseService.updateWarehouse(id, req.body);
        return (0, responseHandlers_1.sendSuccess)(res, warehouse, "Warehouse updated successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to update warehouse", 500);
    }
});
exports.deleteWarehouse = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    const isSuperAdmin = req.user.roles?.some((role) => role.systemRole === "super_admin");
    if (!isSuperAdmin) {
        return (0, responseHandlers_1.sendError)(res, "Only Super Admin can delete warehouses", 403);
    }
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, "Warehouse ID is required");
    try {
        await warehouse_service_1.warehouseService.deleteWarehouse(id);
        return (0, responseHandlers_1.sendSuccess)(res, null, "Warehouse deleted successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to delete warehouse", 500);
    }
});
exports.getMyWarehouse = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, "Unauthorized", 401);
    try {
        const isSuperAdmin = req.user.roles?.some((role) => role.systemRole === "super_admin");
        const permissions = await req.user.getPermissions();
        if (isSuperAdmin) {
            const warehousesResult = await warehouse_service_1.warehouseService.getWarehouses({ isActive: true }, req.user._id, req.user.roles);
            const responseData = {
                warehouse: null,
                warehouses: warehousesResult.warehouses,
                pagination: warehousesResult.pagination,
                manager: {
                    _id: req.user._id,
                    name: req.user.name,
                    email: req.user.email,
                    phone: req.user.phone,
                    roles: req.user.roles?.map((role) => ({
                        id: role._id || role.id,
                        name: role.name,
                        key: role.key,
                        systemRole: role.systemRole,
                    })),
                    permissions: permissions,
                },
                isSuperAdmin: true,
            };
            return (0, responseHandlers_1.sendSuccess)(res, responseData, "All warehouses retrieved successfully for Super Admin");
        }
        const warehouse = await warehouse_service_1.warehouseService.getMyWarehouse(req.user._id);
        const responseData = {
            warehouse,
            manager: {
                _id: req.user._id,
                name: req.user.name,
                email: req.user.email,
                phone: req.user.phone,
                roles: req.user.roles?.map((role) => ({
                    id: role._id || role.id,
                    name: role.name,
                    key: role.key,
                    systemRole: role.systemRole,
                })),
                permissions: permissions,
            },
            isSuperAdmin: false,
        };
        return (0, responseHandlers_1.sendSuccess)(res, responseData, "Your assigned warehouse retrieved successfully");
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : "Failed to retrieve assigned warehouse", 500);
    }
});
