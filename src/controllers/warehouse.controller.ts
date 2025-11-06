// controllers/warehouse.controller.ts
import { Request, Response } from 'express';
import { warehouseService } from '../services/warehouse.service';
import { asyncHandler } from '../utils/asyncHandler.util';
import { sendSuccess, sendCreated, sendError } from '../utils/response.util';

// Screen 1: Dashboard
export const getDashboard = asyncHandler(async (req: Request, res: Response) => {
  try {
    const dashboard = await warehouseService.getDashboard(
      req.query['warehouseId'] as string,
      req.query
    );
    sendSuccess(res, dashboard, 'Dashboard data retrieved successfully');
  } catch (error) {
    sendError(res, 'Failed to get dashboard data', 500);
  }
});

// Screen 2: Inbound Logistics
export const receiveGoods = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  try {
    const result = await warehouseService.receiveGoods(req.body, req.user._id);
    return sendCreated(res, result, 'Goods received successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to receive goods', 500);
  }
});

// Screen 3: Outbound Logistics - Dispatch
export const createDispatch = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  try {
    const dispatch = await warehouseService.createDispatch(req.body, req.user._id);
    sendCreated(res, dispatch, 'Dispatch order created successfully');
    return;
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to create dispatch', 500);
    return;
  }
});

// Screen 3: QC Templates
export const createQCTemplate = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  try {
    const template = await warehouseService.createQCTemplate(req.body, req.user._id);
    sendCreated(res, template, 'QC template created successfully');
    return;
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to create QC template', 500);
    return;
  }
});

export const applyQCTemplate = asyncHandler(async (req: Request, res: Response) => {
  const { templateId, batchId } = req.body;
  
  try {
    await warehouseService.applyQCTemplate(templateId, batchId);
    sendSuccess(res, null, 'QC template applied successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to apply QC template', 500);
  }
});

// Screen 3: Return Management
export const createReturnOrder = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  try {
    const returnOrder = await warehouseService.createReturnOrder(req.body, req.user._id);
    return sendCreated(res, returnOrder, 'Return order created successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to create return order', 500);
  }
});

export const getReturnQueue = asyncHandler(async (req: Request, res: Response) => {
  try {
    const returnQueue = await warehouseService.getReturnQueue(req.query['warehouseId'] as string);
    sendSuccess(res, returnQueue, 'Return queue retrieved successfully');
  } catch (error) {
    sendError(res, 'Failed to get return queue', 500);
  }
});

export const approveReturn = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  
  if (!id) {
    return sendError(res, 'Return ID is required', 400);
  }
  
  try {
    const returnOrder = await warehouseService.approveReturn(id);
    return sendSuccess(res, returnOrder, 'Return approved successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to approve return', 500);
  }
});

// Screen 4: Inventory Management
export const getInventory = asyncHandler(async (req: Request, res: Response) => {
  try {
    const inventory = await warehouseService.getInventory(
      req.query['warehouseId'] as string,
      req.query
    );
    sendSuccess(res, inventory, 'Inventory data retrieved successfully');
  } catch (error) {
    sendError(res, 'Failed to get inventory data', 500);
  }
});

export const getStockAgeingReport = asyncHandler(async (req: Request, res: Response) => {
  try {
    const report = await warehouseService.getStockAgeingReport(req.query['warehouseId'] as string);
    sendSuccess(res, report, 'Stock ageing report generated successfully');
  } catch (error) {
    sendError(res, 'Failed to generate stock ageing report', 500);
  }
});

// Screen 5: Expense Management
export const createExpense = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    sendError(res, 'Unauthorized', 401);
    return;
  }

  try {
    const expense = await warehouseService.createExpense(req.body, req.user._id);
    return sendCreated(res, expense, 'Expense recorded successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to record expense', 500);
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
    sendError(res, 'Failed to get expense summary', 500);
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

// Add these methods to warehouse.controller.ts

export const getReceivings = asyncHandler(async (req: Request, res: Response) => {
  try {
    const receivings = await warehouseService.getReceivings(
      req.query['warehouseId'] as string,
      req.query
    );
    sendSuccess(res, receivings, 'Goods receivings retrieved successfully');
  } catch (error) {
    sendError(res, 'Failed to get goods receivings', 500);
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
    sendError(res, 'Failed to get dispatches', 500);
  }
});

export const updateDispatchStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id || typeof id !== 'string') {
    return sendError(res, 'Dispatch ID is required', 400);
  }
  if (!status || typeof status !== 'string') {
    return sendError(res, 'Dispatch status is required', 400);
  }
  
  try {
    const dispatch = await warehouseService.updateDispatchStatus(id, status);
    return sendSuccess(res, dispatch, 'Dispatch status updated successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to update dispatch status', 500);
  }
});

export const getQCTemplates = asyncHandler(async (req: Request, res: Response) => {
  try {
    const templates = await warehouseService.getQCTemplates(req.query['category'] as string);
    sendSuccess(res, templates, 'QC templates retrieved successfully');
  } catch (error) {
    sendError(res, 'Failed to get QC templates', 500);
  }
});

export const rejectReturn = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    return sendError(res, 'Return ID is required', 400);
  }
  
  try {
    const returnOrder = await warehouseService.rejectReturn(id);
    return sendSuccess(res, returnOrder, 'Return rejected successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to reject return', 500);
  }
});

export const updateInventory = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || typeof id !== 'string') {
    return sendError(res, 'Inventory ID is required', 400);
  }
  
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
    sendError(res, 'Failed to get low stock alerts', 500);
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
    sendError(res, 'Failed to get expenses', 500);
  }
});

export const updateExpenseStatus = asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id || typeof id !== 'string') {
    return sendError(res, 'Expense ID is required', 400);
  }
  if (!status || typeof status !== 'string') {
    return sendError(res, 'Expense status is required', 400);
  }
  
  try {
    const expense = await warehouseService.updateExpenseStatus(id, status);
    return sendSuccess(res, expense, 'Expense status updated successfully');
  } catch (error) {
    return sendError(res, error instanceof Error ? error.message : 'Failed to update expense status', 500);
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