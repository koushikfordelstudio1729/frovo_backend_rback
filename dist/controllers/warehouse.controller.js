"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getReportTypes = exports.generatePurchaseOrderReport = exports.generateInventorySummary = exports.exportReport = exports.generateReport = exports.getMonthlyExpenseTrend = exports.getExpenseById = exports.deleteExpense = exports.updateExpensePaymentStatus = exports.updateExpense = exports.getExpenseSummary = exports.updateExpenseStatus = exports.getExpenses = exports.createExpense = exports.bulkUnarchiveInventory = exports.bulkArchiveInventory = exports.getInventoryStats = exports.getArchivedInventory = exports.unarchiveInventory = exports.archiveInventory = exports.updateInventoryItem = exports.getInventoryItem = exports.getInventoryDashboard = exports.createFieldAgent = exports.getFieldAgents = exports.rejectReturn = exports.approveReturn = exports.getReturnQueue = exports.createReturnOrder = exports.deleteQCTemplate = exports.updateQCTemplate = exports.getQCTemplates = exports.createQCTemplate = exports.updateDispatchStatus = exports.getDispatchById = exports.getDispatches = exports.createDispatch = exports.updateQCVerification = exports.getReceivingById = exports.getReceivings = exports.receiveGoods = exports.getDashboard = void 0;
const express_async_handler_1 = __importDefault(require("express-async-handler"));
const warehouse_service_1 = require("../services/warehouse.service");
const responseHandlers_1 = require("../utils/responseHandlers");
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
        (0, responseHandlers_1.sendSuccess)(res, dashboard, 'Dashboard data retrieved successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get dashboard data', 500);
    }
});
exports.receiveGoods = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, 'Unauthorized', 401);
    try {
        const result = await warehouse_service_1.warehouseService.receiveGoods(req.body, req.user._id);
        return (0, responseHandlers_1.sendCreated)(res, result, 'Goods received successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to receive goods', 500);
    }
});
exports.getReceivings = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { warehouseId, ...filters } = req.query;
        const result = await warehouse_service_1.warehouseService.getReceivings(warehouseId, filters);
        return (0, responseHandlers_1.sendSuccess)(res, result, 'Receivings fetched successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to fetch receivings', 500);
    }
});
exports.getReceivingById = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, 'Receiving ID is required');
    try {
        const result = await warehouse_service_1.warehouseService.getReceivingById(id);
        if (!result)
            return (0, responseHandlers_1.sendNotFound)(res, 'Receiving record not found');
        return (0, responseHandlers_1.sendSuccess)(res, result, 'Receiving record fetched successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to fetch receiving record', 500);
    }
});
exports.updateQCVerification = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, 'Receiving ID is required');
    try {
        const { qcVerification } = req.body;
        const result = await warehouse_service_1.warehouseService.updateQCVerification(id, qcVerification);
        if (!result)
            return (0, responseHandlers_1.sendNotFound)(res, 'Receiving record not found');
        return (0, responseHandlers_1.sendSuccess)(res, result, 'QC verification updated successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to update QC verification', 500);
    }
});
exports.createDispatch = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, 'Unauthorized', 401);
    try {
        const dispatch = await warehouse_service_1.warehouseService.createDispatch(req.body, req.user._id);
        return (0, responseHandlers_1.sendCreated)(res, dispatch, 'Dispatch order created successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to create dispatch', 500);
    }
});
exports.getDispatches = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const dispatches = await warehouse_service_1.warehouseService.getDispatches(req.query['warehouseId'], req.query);
        (0, responseHandlers_1.sendSuccess)(res, dispatches, 'Dispatches retrieved successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get dispatches', 500);
    }
});
exports.getDispatchById = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, 'Dispatch ID is required');
    try {
        const dispatch = await warehouse_service_1.warehouseService.getDispatchById(id);
        if (!dispatch)
            return (0, responseHandlers_1.sendNotFound)(res, 'Dispatch order not found');
        (0, responseHandlers_1.sendSuccess)(res, dispatch, 'Dispatch order retrieved successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get dispatch order', 500);
    }
});
exports.updateDispatchStatus = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, 'Dispatch ID is required');
    if (!status)
        return (0, responseHandlers_1.sendBadRequest)(res, 'Dispatch status is required');
    try {
        const dispatch = await warehouse_service_1.warehouseService.updateDispatchStatus(id, status);
        return (0, responseHandlers_1.sendSuccess)(res, dispatch, 'Dispatch status updated successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to update dispatch status', 500);
    }
});
exports.createQCTemplate = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, 'Unauthorized', 401);
    try {
        const template = await warehouse_service_1.warehouseService.createQCTemplate(req.body, req.user._id);
        return (0, responseHandlers_1.sendCreated)(res, template, 'QC template created successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to create QC template', 500);
    }
});
exports.getQCTemplates = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const templates = await warehouse_service_1.warehouseService.getQCTemplates(req.query['sku']);
        (0, responseHandlers_1.sendSuccess)(res, templates, 'QC templates retrieved successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get QC templates', 500);
    }
});
exports.updateQCTemplate = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, 'Template ID is required');
    try {
        const template = await warehouse_service_1.warehouseService.updateQCTemplate(id, req.body);
        if (!template)
            return (0, responseHandlers_1.sendNotFound)(res, 'QC template not found');
        return (0, responseHandlers_1.sendSuccess)(res, template, 'QC template updated successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to update QC template', 500);
    }
});
exports.deleteQCTemplate = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, 'Template ID is required');
    try {
        await warehouse_service_1.warehouseService.deleteQCTemplate(id);
        return (0, responseHandlers_1.sendSuccess)(res, null, 'QC template deleted successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to delete QC template', 500);
    }
});
exports.createReturnOrder = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, 'Unauthorized', 401);
    try {
        const { batchId, vendor, reason, status, quantity } = req.body;
        if (!batchId || !vendor || !reason) {
            return (0, responseHandlers_1.sendError)(res, 'Missing required fields: batchId, vendor, and reason are required', 400);
        }
        const returnOrderData = {
            batchId,
            vendor,
            reason,
            status: status || 'pending',
            quantity
        };
        const returnOrder = await warehouse_service_1.warehouseService.createReturnOrder(returnOrderData, req.user._id);
        return (0, responseHandlers_1.sendCreated)(res, returnOrder, 'Return order created successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to create return order', 500);
    }
});
exports.getReturnQueue = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const returnQueue = await warehouse_service_1.warehouseService.getReturnQueue(req.query['warehouseId'], req.query);
        (0, responseHandlers_1.sendSuccess)(res, returnQueue, 'Return queue retrieved successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get return queue', 500);
    }
});
exports.approveReturn = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, 'Return ID is required');
    try {
        const returnOrder = await warehouse_service_1.warehouseService.approveReturn(id);
        return (0, responseHandlers_1.sendSuccess)(res, returnOrder, 'Return approved successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to approve return', 500);
    }
});
exports.rejectReturn = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, 'Return ID is required');
    try {
        const returnOrder = await warehouse_service_1.warehouseService.rejectReturn(id);
        return (0, responseHandlers_1.sendSuccess)(res, returnOrder, 'Return rejected successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to reject return', 500);
    }
});
exports.getFieldAgents = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const isActive = req.query['isActive'] === 'true';
        const agents = await warehouse_service_1.warehouseService.getFieldAgents(isActive);
        (0, responseHandlers_1.sendSuccess)(res, agents, 'Field agents retrieved successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get field agents', 500);
    }
});
exports.createFieldAgent = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, 'Unauthorized', 401);
    try {
        const agent = await warehouse_service_1.warehouseService.createFieldAgent(req.body, req.user._id);
        return (0, responseHandlers_1.sendCreated)(res, agent, 'Field agent created successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to create field agent', 500);
    }
});
exports.getInventoryDashboard = (0, express_async_handler_1.default)(async (req, res) => {
    const { warehouseId } = req.params;
    const { page = 1, limit = 50, ...filters } = req.query;
    if (!warehouseId) {
        return (0, responseHandlers_1.sendBadRequest)(res, 'Warehouse ID is required');
    }
    try {
        const result = await warehouse_service_1.warehouseService.getInventoryDashboard(warehouseId, filters, parseInt(page), parseInt(limit));
        (0, responseHandlers_1.sendSuccess)(res, result, 'Inventory dashboard data retrieved successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get inventory dashboard', 500);
    }
});
exports.getInventoryItem = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return (0, responseHandlers_1.sendBadRequest)(res, 'Inventory ID is required');
    }
    try {
        const inventoryItem = await warehouse_service_1.warehouseService.getInventoryById(id);
        if (!inventoryItem) {
            return (0, responseHandlers_1.sendError)(res, 'Inventory item not found', 404);
        }
        (0, responseHandlers_1.sendSuccess)(res, inventoryItem, 'Inventory item retrieved successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get inventory item', 500);
    }
});
exports.updateInventoryItem = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const updateData = req.body;
    if (!id) {
        return (0, responseHandlers_1.sendBadRequest)(res, 'Inventory ID is required');
    }
    try {
        const updatedItem = await warehouse_service_1.warehouseService.updateInventoryItem(id, updateData);
        (0, responseHandlers_1.sendSuccess)(res, updatedItem, 'Inventory item updated successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to update inventory item', 500);
    }
});
exports.archiveInventory = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return (0, responseHandlers_1.sendBadRequest)(res, 'Inventory ID is required');
    }
    try {
        const archivedItem = await warehouse_service_1.warehouseService.archiveInventoryItem(id);
        (0, responseHandlers_1.sendSuccess)(res, archivedItem, 'Inventory item archived successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to archive inventory item', 500);
    }
});
exports.unarchiveInventory = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id) {
        return (0, responseHandlers_1.sendBadRequest)(res, 'Inventory ID is required');
    }
    try {
        const unarchivedItem = await warehouse_service_1.warehouseService.unarchiveInventoryItem(id);
        (0, responseHandlers_1.sendSuccess)(res, unarchivedItem, 'Inventory item unarchived successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to unarchive inventory item', 500);
    }
});
exports.getArchivedInventory = (0, express_async_handler_1.default)(async (req, res) => {
    const { warehouseId } = req.params;
    const { page = 1, limit = 50 } = req.query;
    if (!warehouseId) {
        return (0, responseHandlers_1.sendBadRequest)(res, 'Warehouse ID is required');
    }
    try {
        const result = await warehouse_service_1.warehouseService.getArchivedInventory(warehouseId, parseInt(page), parseInt(limit));
        (0, responseHandlers_1.sendSuccess)(res, result, 'Archived inventory retrieved successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get archived inventory', 500);
    }
});
exports.getInventoryStats = (0, express_async_handler_1.default)(async (req, res) => {
    const { warehouseId } = req.params;
    if (!warehouseId) {
        return (0, responseHandlers_1.sendBadRequest)(res, 'Warehouse ID is required');
    }
    try {
        const stats = await warehouse_service_1.warehouseService.getInventoryStats(warehouseId);
        (0, responseHandlers_1.sendSuccess)(res, stats, 'Inventory statistics retrieved successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get inventory statistics', 500);
    }
});
exports.bulkArchiveInventory = (0, express_async_handler_1.default)(async (req, res) => {
    const { inventoryIds } = req.body;
    if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length === 0) {
        return (0, responseHandlers_1.sendBadRequest)(res, 'Inventory IDs array is required');
    }
    try {
        const result = await warehouse_service_1.warehouseService.bulkArchiveInventory(inventoryIds);
        (0, responseHandlers_1.sendSuccess)(res, result, result.message);
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to bulk archive inventory', 500);
    }
});
exports.bulkUnarchiveInventory = (0, express_async_handler_1.default)(async (req, res) => {
    const { inventoryIds } = req.body;
    if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length === 0) {
        return (0, responseHandlers_1.sendBadRequest)(res, 'Inventory IDs array is required');
    }
    try {
        const result = await warehouse_service_1.warehouseService.bulkUnarchiveInventory(inventoryIds);
        (0, responseHandlers_1.sendSuccess)(res, result, result.message);
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to bulk unarchive inventory', 500);
    }
});
exports.createExpense = (0, express_async_handler_1.default)(async (req, res) => {
    if (!req.user)
        return (0, responseHandlers_1.sendError)(res, 'Unauthorized', 401);
    try {
        const expense = await warehouse_service_1.warehouseService.createExpense(req.body, req.user._id);
        return (0, responseHandlers_1.sendCreated)(res, expense, 'Expense recorded successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to record expense', 500);
    }
});
exports.getExpenses = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const expenses = await warehouse_service_1.warehouseService.getExpenses(req.query['warehouseId'], req.query);
        (0, responseHandlers_1.sendSuccess)(res, expenses, 'Expenses retrieved successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get expenses', 500);
    }
});
exports.updateExpenseStatus = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { status } = req.body;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, 'ID required');
    const expense = await warehouse_service_1.warehouseService.updateExpense(id, { status });
    (0, responseHandlers_1.sendSuccess)(res, expense, 'Status updated');
});
exports.getExpenseSummary = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const summary = await warehouse_service_1.warehouseService.getExpenseSummary(req.query['warehouseId'], req.query);
        (0, responseHandlers_1.sendSuccess)(res, summary, 'Expense summary retrieved successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get expense summary', 500);
    }
});
exports.updateExpense = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, 'Expense ID is required');
    try {
        const expense = await warehouse_service_1.warehouseService.updateExpense(id, req.body);
        return (0, responseHandlers_1.sendSuccess)(res, expense, 'Expense updated successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to update expense', 500);
    }
});
exports.updateExpensePaymentStatus = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    const { paymentStatus } = req.body;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, 'Expense ID is required');
    if (!paymentStatus)
        return (0, responseHandlers_1.sendBadRequest)(res, 'Expense payment status is required');
    try {
        const expense = await warehouse_service_1.warehouseService.updateExpensePaymentStatus(id, paymentStatus);
        return (0, responseHandlers_1.sendSuccess)(res, expense, 'Expense payment status updated successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to update expense payment status', 500);
    }
});
exports.deleteExpense = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, 'Expense ID is required');
    try {
        await warehouse_service_1.warehouseService.deleteExpense(id);
        return (0, responseHandlers_1.sendSuccess)(res, null, 'Expense deleted successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to delete expense', 500);
    }
});
exports.getExpenseById = (0, express_async_handler_1.default)(async (req, res) => {
    const { id } = req.params;
    if (!id)
        return (0, responseHandlers_1.sendBadRequest)(res, 'Expense ID is required');
    try {
        const expense = await warehouse_service_1.warehouseService.getExpenseById(id);
        if (!expense)
            return (0, responseHandlers_1.sendNotFound)(res, 'Expense not found');
        return (0, responseHandlers_1.sendSuccess)(res, expense, 'Expense retrieved successfully');
    }
    catch (error) {
        return (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get expense', 500);
    }
});
exports.getMonthlyExpenseTrend = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const months = parseInt(req.query['months']) || 12;
        const trend = await warehouse_service_1.warehouseService.getMonthlyExpenseTrend(req.query['warehouseId'], months);
        (0, responseHandlers_1.sendSuccess)(res, trend, 'Monthly expense trend retrieved successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to get monthly expense trend', 500);
    }
});
exports.generateReport = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { type, warehouseId, ...filters } = req.query;
        if (!type)
            return (0, responseHandlers_1.sendBadRequest)(res, 'Report type is required');
        if (!warehouseId)
            return (0, responseHandlers_1.sendBadRequest)(res, 'warehouseId is required');
        const report = await warehouse_service_1.warehouseService.generateReport(type, {
            warehouse: warehouseId,
            ...filters
        });
        (0, responseHandlers_1.sendSuccess)(res, report, 'Report generated successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to generate report', 500);
    }
});
exports.exportReport = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { type, format = 'csv', warehouseId, ...filters } = req.query;
        if (!type)
            return (0, responseHandlers_1.sendBadRequest)(res, 'Report type is required');
        if (!warehouseId)
            return (0, responseHandlers_1.sendBadRequest)(res, 'warehouseId is required');
        const report = await warehouse_service_1.warehouseService.exportReport(type, format, {
            warehouse: warehouseId,
            ...filters
        });
        if (format === 'csv') {
            res.setHeader('Content-Type', 'text/csv');
            res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
            res.send(report);
        }
        else {
            (0, responseHandlers_1.sendSuccess)(res, report, 'Report exported successfully');
        }
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to export report', 500);
    }
});
exports.generateInventorySummary = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { warehouseId, ...filters } = req.query;
        const report = await warehouse_service_1.warehouseService.generateInventorySummaryReport({
            warehouse: warehouseId,
            ...filters
        });
        (0, responseHandlers_1.sendSuccess)(res, report, 'Inventory summary report generated successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to generate inventory summary report', 500);
    }
});
exports.generatePurchaseOrderReport = (0, express_async_handler_1.default)(async (req, res) => {
    try {
        const { warehouseId, ...filters } = req.query;
        const report = await warehouse_service_1.warehouseService.generatePurchaseOrderReport({
            warehouse: warehouseId,
            ...filters
        });
        (0, responseHandlers_1.sendSuccess)(res, report, 'Purchase order report generated successfully');
    }
    catch (error) {
        (0, responseHandlers_1.sendError)(res, error instanceof Error ? error.message : 'Failed to generate purchase order report', 500);
    }
});
exports.getReportTypes = (0, express_async_handler_1.default)(async (_req, res) => {
    const reportTypes = [
        { value: 'inventory_summary', label: 'Inventory Summary' },
        { value: 'purchase_orders', label: 'Purchase Orders from Vendors' },
        { value: 'inventory_turnover', label: 'Inventory Turnover' },
        { value: 'qc_summary', label: 'QC Summary' },
        { value: 'efficiency', label: 'Efficiency Report' },
        { value: 'stock_ageing', label: 'Stock Ageing' }
    ];
    (0, responseHandlers_1.sendSuccess)(res, reportTypes, 'Report types retrieved successfully');
});
