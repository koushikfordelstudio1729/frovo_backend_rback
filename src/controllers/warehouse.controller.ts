// controllers/warehouse.controller.ts
import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { warehouseService } from '../services/warehouse.service';
import { sendSuccess, sendCreated, sendError, sendNotFound, sendBadRequest } from '../utils/responseHandlers';

// Screen 1: Dashboard
// Update getDashboard controller to handle the new filters
export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { date, category, partner, warehouseId, ...otherFilters } = req.query;
    
    // Build filters object for the service
    const filters: any = { ...otherFilters };
    
    if (date) filters.dateRange = date as string;
    if (category) filters.category = category as string;
    if (partner) filters.partner = partner as string;

    const dashboard = await warehouseService.getDashboard(
      warehouseId as string,
      filters
    );
    sendSuccess(res, dashboard, 'Dashboard data retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get dashboard data', 500);
  }
});

// Screen 2: Inbound Logistics
export const receiveGoods = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, 'Unauthorized', 401);

  try {
    const result = await warehouseService.receiveGoods(req.body, req.user._id);
    return sendCreated(res, result, 'Goods received successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to receive goods', 500);
  }
});

export const getReceivings = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { warehouseId, ...filters } = req.query;
    const result = await warehouseService.getReceivings(
      warehouseId as string,
      filters
    );
    return sendSuccess(res, result, 'Receivings fetched successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to fetch receivings', 500);
  }
});

export const getReceivingById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, 'Receiving ID is required');

  try {
    const result = await warehouseService.getReceivingById(id);
    if (!result) return sendNotFound(res, 'Receiving record not found');
    return sendSuccess(res, result, 'Receiving record fetched successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to fetch receiving record', 500);
  }
});

export const updateQCVerification = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, 'Receiving ID is required');

  try {
    const { qcVerification } = req.body;
    const result = await warehouseService.updateQCVerification(id, qcVerification);
    if (!result) return sendNotFound(res, 'Receiving record not found');

    return sendSuccess(res, result, 'QC verification updated successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to update QC verification', 500);
  }
});

// Screen 3: Outbound Logistics
export const createDispatch = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, 'Unauthorized', 401);

  try {
    const dispatch = await warehouseService.createDispatch(req.body, req.user._id);
    return sendCreated(res, dispatch, 'Dispatch order created successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to create dispatch', 500);
  }
});

export const getDispatches = asyncHandler(async (req: Request, res: Response) => {
  try {
    const dispatches = await warehouseService.getDispatches(
      req.query['warehouseId'] as string,
      req.query
    );
    sendSuccess(res, dispatches, 'Dispatches retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get dispatches', 500);
  }
});

export const getDispatchById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, 'Dispatch ID is required');

  try {
    const dispatch = await warehouseService.getDispatchById(id);
    if (!dispatch) return sendNotFound(res, 'Dispatch order not found');
    sendSuccess(res, dispatch, 'Dispatch order retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get dispatch order', 500);
  }
});

export const updateDispatchStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) return sendBadRequest(res, 'Dispatch ID is required');
  if (!status) return sendBadRequest(res, 'Dispatch status is required');
  
  try {
    const dispatch = await warehouseService.updateDispatchStatus(id, status);
    return sendSuccess(res, dispatch, 'Dispatch status updated successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to update dispatch status', 500);
  }
});

// QC Templates
export const createQCTemplate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, 'Unauthorized', 401);

  try {
    const template = await warehouseService.createQCTemplate(req.body, req.user._id);
    return sendCreated(res, template, 'QC template created successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to create QC template', 500);
  }
});

export const getQCTemplates = asyncHandler(async (req: Request, res: Response) => {
  try {
    const templates = await warehouseService.getQCTemplates(
      req.query['sku'] as string // <-- updated filtering
    );
    
    sendSuccess(res, templates, 'QC templates retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get QC templates', 500);
  }
});

export const updateQCTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, 'Template ID is required');
  
  try {
    const template = await warehouseService.updateQCTemplate(id, req.body);
    if (!template) return sendNotFound(res, 'QC template not found');
  
    return sendSuccess(res, template, 'QC template updated successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to update QC template', 500);
  }
});

export const deleteQCTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, 'Template ID is required');
  
  try {
    await warehouseService.deleteQCTemplate(id);
    return sendSuccess(res, null, 'QC template deleted successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to delete QC template', 500);
  }
});


// Return Management
export const createReturnOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, 'Unauthorized', 401);

  try {
    // Extract only the required fields
    const { batchId, vendor, reason, status, quantity } = req.body;

    // Validate required fields
    if (!batchId || !vendor || !reason) {
      return sendError(res, 'Missing required fields: batchId, vendor, and reason are required', 400);
    }

    const returnOrderData = {
      batchId,
      vendor,
      reason,
      status: status || 'pending',
      quantity
    } as any;

    const returnOrder = await warehouseService.createReturnOrder(returnOrderData, req.user._id);
    return sendCreated(res, returnOrder, 'Return order created successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to create return order', 500);
  }
});

export const getReturnQueue = asyncHandler(async (req: Request, res: Response) => {
  try {
    const returnQueue = await warehouseService.getReturnQueue(
      req.query['warehouseId'] as string,
      req.query
    );
    sendSuccess(res, returnQueue, 'Return queue retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get return queue', 500);
  }
});

export const approveReturn = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, 'Return ID is required');
  
  try {
    const returnOrder = await warehouseService.approveReturn(id);
    return sendSuccess(res, returnOrder, 'Return approved successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to approve return', 500);
  }
});

export const rejectReturn = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, 'Return ID is required');
  
  try {
    const returnOrder = await warehouseService.rejectReturn(id);
    return sendSuccess(res, returnOrder, 'Return rejected successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to reject return', 500);
  }
});

// Field Agent Management
export const getFieldAgents = asyncHandler(async (req: Request, res: Response) => {
  try {
    const isActive = req.query['isActive'] === 'true';
    const agents = await warehouseService.getFieldAgents(isActive);
    sendSuccess(res, agents, 'Field agents retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get field agents', 500);
  }
});

export const createFieldAgent = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, 'Unauthorized', 401);

  try {
    const agent = await warehouseService.createFieldAgent(req.body, req.user._id);
    return sendCreated(res, agent, 'Field agent created successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to create field agent', 500);
  }
});

// Screen 4: Inventory Management
// Inventory Dashboard Controllers
export const getInventoryDashboard = asyncHandler(async (req: Request, res: Response) => {
  const { warehouseId } = req.params;
  const { page = 1, limit = 50, ...filters } = req.query;

  if (!warehouseId) {
    return sendBadRequest(res, 'Warehouse ID is required');
  }

  try {
    const result = await warehouseService.getInventoryDashboard(
      warehouseId,
      filters,
      parseInt(page as string),
      parseInt(limit as string)
    );
    
    sendSuccess(res, result, 'Inventory dashboard data retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get inventory dashboard', 500);
  }
});

export const getInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return sendBadRequest(res, 'Inventory ID is required');
  }

  try {
    const inventoryItem = await warehouseService.getInventoryById(id);
    
    if (!inventoryItem) {
      return sendError(res, 'Inventory item not found', 404);
    }
    
    sendSuccess(res, inventoryItem, 'Inventory item retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get inventory item', 500);
  }
});

export const updateInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const updateData = req.body;

  if (!id) {
    return sendBadRequest(res, 'Inventory ID is required');
  }

  try {
    const updatedItem = await warehouseService.updateInventoryItem(id, updateData);
    sendSuccess(res, updatedItem, 'Inventory item updated successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to update inventory item', 500);
  }
});

export const archiveInventory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return sendBadRequest(res, 'Inventory ID is required');
  }

  try {
    const archivedItem = await warehouseService.archiveInventoryItem(id);
    sendSuccess(res, archivedItem, 'Inventory item archived successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to archive inventory item', 500);
  }
});

export const unarchiveInventory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id) {
    return sendBadRequest(res, 'Inventory ID is required');
  }

  try {
    const unarchivedItem = await warehouseService.unarchiveInventoryItem(id);
    sendSuccess(res, unarchivedItem, 'Inventory item unarchived successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to unarchive inventory item', 500);
  }
});

export const getArchivedInventory = asyncHandler(async (req: Request, res: Response) => {
  const { warehouseId } = req.params;
  const { page = 1, limit = 50 } = req.query;

  if (!warehouseId) {
    return sendBadRequest(res, 'Warehouse ID is required');
  }

  try {
    const result = await warehouseService.getArchivedInventory(
      warehouseId,
      parseInt(page as string),
      parseInt(limit as string)
    );
    
    sendSuccess(res, result, 'Archived inventory retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get archived inventory', 500);
  }
});

export const getInventoryStats = asyncHandler(async (req: Request, res: Response) => {
  const { warehouseId } = req.params;

  if (!warehouseId) {
    return sendBadRequest(res, 'Warehouse ID is required');
  }

  try {
    const stats = await warehouseService.getInventoryStats(warehouseId);
    sendSuccess(res, stats, 'Inventory statistics retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get inventory statistics', 500);
  }
});

export const bulkArchiveInventory = asyncHandler(async (req: Request, res: Response) => {
  const { inventoryIds } = req.body;

  if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length === 0) {
    return sendBadRequest(res, 'Inventory IDs array is required');
  }

  try {
    const result = await warehouseService.bulkArchiveInventory(inventoryIds);
    sendSuccess(res, result, result.message);
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to bulk archive inventory', 500);
  }
});

export const bulkUnarchiveInventory = asyncHandler(async (req: Request, res: Response) => {
  const { inventoryIds } = req.body;

  if (!inventoryIds || !Array.isArray(inventoryIds) || inventoryIds.length === 0) {
    return sendBadRequest(res, 'Inventory IDs array is required');
  }

  try {
    const result = await warehouseService.bulkUnarchiveInventory(inventoryIds);
    sendSuccess(res, result, result.message);
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to bulk unarchive inventory', 500);
  }
});
// Screen 5: Expense Management
export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, 'Unauthorized', 401);

  try {
    const expense = await warehouseService.createExpense(req.body, req.user._id);
    return sendCreated(res, expense, 'Expense recorded successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to record expense', 500);
  }
});

export const getExpenses = asyncHandler(async (req: Request, res: Response) => {
  try {
    const expenses = await warehouseService.getExpenses(
      req.query['warehouseId'] as string,
      req.query
    );
    sendSuccess(res, expenses, 'Expenses retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get expenses', 500);
  }
});

export const updateExpenseStatus = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) return sendBadRequest(res, 'ID required');

  const expense = await warehouseService.updateExpense(id, { status } as any);

  sendSuccess(res, expense, 'Status updated');
});

export const getExpenseSummary = asyncHandler(async (req: Request, res: Response) => {
  try {
    const summary = await warehouseService.getExpenseSummary(
      req.query['warehouseId'] as string,
      req.query
    );
    sendSuccess(res, summary, 'Expense summary retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get expense summary', 500);
  }
});
export const updateExpense = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, 'Expense ID is required');

  try {
    const expense = await warehouseService.updateExpense(id, req.body);
    return sendSuccess(res, expense, 'Expense updated successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to update expense', 500);
  }
});

export const updateExpensePaymentStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { paymentStatus } = req.body;

  if (!id) return sendBadRequest(res, 'Expense ID is required');
  if (!paymentStatus) return sendBadRequest(res, 'Expense payment status is required');

  try {
    const expense = await warehouseService.updateExpensePaymentStatus(id, paymentStatus);
    return sendSuccess(res, expense, 'Expense payment status updated successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to update expense payment status', 500);
  }
});

export const deleteExpense = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, 'Expense ID is required');

  try {
    await warehouseService.deleteExpense(id);
    return sendSuccess(res, null, 'Expense deleted successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to delete expense', 500);
  }
});

export const getExpenseById = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, 'Expense ID is required');

  try {
    const expense = await warehouseService.getExpenseById(id);
    if (!expense) return sendNotFound(res, 'Expense not found');
    return sendSuccess(res, expense, 'Expense retrieved successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to get expense', 500);
  }
});

export const getMonthlyExpenseTrend = asyncHandler(async (req: Request, res: Response) => {
  try {
    const months = parseInt(req.query['months'] as string) || 12;
    const trend = await warehouseService.getMonthlyExpenseTrend(
      req.query['warehouseId'] as string,
      months
    );
    sendSuccess(res, trend, 'Monthly expense trend retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get monthly expense trend', 500);
  }
});

// Screen 6: Reports
// Screen 6: Reports
export const generateReport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { type, warehouseId, ...filters } = req.query;

    if (!type) return sendBadRequest(res, 'Report type is required');
    if (!warehouseId) return sendBadRequest(res, 'warehouseId is required');

    const report = await warehouseService.generateReport(type as string, {
      warehouse: warehouseId as string,
      ...filters
    });

    sendSuccess(res, report, 'Report generated successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to generate report', 500);
  }
});

export const exportReport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { type, format = 'csv', warehouseId, ...filters } = req.query;

    if (!type) return sendBadRequest(res, 'Report type is required');
    if (!warehouseId) return sendBadRequest(res, 'warehouseId is required');

    const report = await warehouseService.exportReport(
      type as string,
      format as string,
      {
        warehouse: warehouseId as string,
        ...filters
      }
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=${type}-report.csv`);
      res.send(report);
    } else {
      sendSuccess(res, report, 'Report exported successfully');
    }
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to export report', 500);
  }
});

// Enhanced Reports & Analytics
export const generateInventorySummary = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { warehouseId, ...filters } = req.query;
    const report = await warehouseService.generateInventorySummaryReport({
      warehouse: warehouseId as string,
      ...filters
    });
    sendSuccess(res, report, 'Inventory summary report generated successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to generate inventory summary report', 500);
  }
});

export const generatePurchaseOrderReport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { warehouseId, ...filters } = req.query;
    const report = await warehouseService.generatePurchaseOrderReport({
      warehouse: warehouseId as string,
      ...filters
    });
    sendSuccess(res, report, 'Purchase order report generated successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to generate purchase order report', 500);
  }
});

export const getReportTypes = asyncHandler(async (_req: Request, res: Response) => {
  const reportTypes = [
    { value: 'inventory_summary', label: 'Inventory Summary' },
    { value: 'purchase_orders', label: 'Purchase Orders from Vendors' },
    { value: 'inventory_turnover', label: 'Inventory Turnover' },
    { value: 'qc_summary', label: 'QC Summary' },
    { value: 'efficiency', label: 'Efficiency Report' },
    { value: 'stock_ageing', label: 'Stock Ageing' }
  ];
  
  sendSuccess(res, reportTypes, 'Report types retrieved successfully');
});