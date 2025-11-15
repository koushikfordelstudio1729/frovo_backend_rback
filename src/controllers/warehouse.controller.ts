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
    const templates = await warehouseService.getQCTemplates(req.query['category'] as string);
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

export const applyQCTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { templateId, batchId } = req.body;
  if (!templateId || !batchId) return sendBadRequest(res, 'Template ID and Batch ID are required');
  
  try {
    await warehouseService.applyQCTemplate(templateId, batchId);
    sendSuccess(res, null, 'QC template applied successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to apply QC template', 500);
  }
});

// Return Management
export const createReturnOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) return sendError(res, 'Unauthorized', 401);

  try {
    const returnOrder = await warehouseService.createReturnOrder(req.body, req.user._id);
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
// Enhanced Inventory Management
export const getInventoryWithExpiry = asyncHandler(async (req: Request, res: Response) => {
  try {
    const inventory = await warehouseService.getInventoryWithExpiry(
      req.query['warehouseId'] as string,
      req.query
    );
    sendSuccess(res, inventory, 'Inventory data with expiry retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get inventory data', 500);
  }
});

export const updateInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, 'Inventory ID is required');

  try {
    const inventory = await warehouseService.updateInventory(id, req.body);
    return sendSuccess(res, inventory, 'Inventory item updated successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to update inventory item', 500);
  }
});

export const archiveInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, 'Inventory ID is required');

  try {
    const inventory = await warehouseService.archiveInventoryItem(id);
    return sendSuccess(res, inventory, 'Inventory item archived successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to archive inventory item', 500);
  }
});

export const unarchiveInventoryItem = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, 'Inventory ID is required');

  try {
    const inventory = await warehouseService.unarchiveInventoryItem(id);
    return sendSuccess(res, inventory, 'Inventory item unarchived successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to unarchive inventory item', 500);
  }
});

export const getExpiryAlerts = asyncHandler(async (req: Request, res: Response) => {
  try {
    const daysThreshold = parseInt(req.query['days'] as string) || 15;
    const alerts = await warehouseService.getExpiryAlerts(
      req.query['warehouseId'] as string,
      daysThreshold
    );
    sendSuccess(res, alerts, 'Expiry alerts retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get expiry alerts', 500);
  }
});

export const getQuarantineItems = asyncHandler(async (req: Request, res: Response) => {
  try {
    const items = await warehouseService.getQuarantineItems(req.query['warehouseId'] as string);
    sendSuccess(res, items, 'Quarantine items retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get quarantine items', 500);
  }
});

export const getInventory = asyncHandler(async (req: Request, res: Response) => {
  try {
    const inventory = await warehouseService.getInventory(
      req.query['warehouseId'] as string,
      req.query
    );
    sendSuccess(res, inventory, 'Inventory data retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get inventory data', 500);
  }
});

export const updateInventory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  if (!id) return sendBadRequest(res, 'Inventory ID is required');

  try {
    const inventory = await warehouseService.updateInventory(id, req.body);
    return sendSuccess(res, inventory, 'Inventory updated successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to update inventory', 500);
  }
});

export const getLowStockAlerts = asyncHandler(async (req: Request, res: Response) => {
  try {
    const alerts = await warehouseService.getLowStockAlerts(req.query['warehouseId'] as string);
    sendSuccess(res, alerts, 'Low stock alerts retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get low stock alerts', 500);
  }
});

export const getStockAgeingReport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const report = await warehouseService.getStockAgeingReport(req.query['warehouseId'] as string);
    sendSuccess(res, report, 'Stock ageing report generated successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to generate stock ageing report', 500);
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

export const updateExpenseStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id) return sendBadRequest(res, 'Expense ID is required');
  if (!status) return sendBadRequest(res, 'Expense status is required');

  try {
    const approvedBy = req.user?._id;
    const expense = await warehouseService.updateExpenseStatus(id, status, approvedBy);
    return sendSuccess(res, expense, 'Expense status updated successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to update expense status', 500);
  }
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
export const generateReport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { type, ...filters } = req.query;
    const report = await warehouseService.generateReport(type as string, filters);
    sendSuccess(res, report, 'Report generated successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to generate report', 500);
  }
});

export const exportReport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { type, format, ...filters } = req.query;
    const report = await warehouseService.exportReport(type as string, format as string, filters);

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