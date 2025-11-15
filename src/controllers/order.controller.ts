import { Request, Response } from 'express';
import { orderService, CreateOrderData } from '../services/order.service';
import { OrderStatus } from '../models';
import { asyncHandler } from '../utils/asyncHandler.util';
import { sendSuccess, sendError } from '../utils/response.util';

export const createOrder = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const { paymentMethod, paymentGateway, notes } = req.body;

    if (!paymentMethod || !paymentGateway) {
      return sendError(res, 'Payment method and payment gateway are required', 400);
    }

    const orderData: CreateOrderData = {
      paymentMethod,
      paymentGateway,
      notes
    };

    const order = await orderService.createOrder(userId, orderData);
    
    return sendSuccess(res, order, 'Order created successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to create order', 500);
    }
  }
});

export const getOrder = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    if (!orderId) {
      return sendError(res, 'Order ID is required', 400);
    }

    const order = await orderService.getOrderById(orderId, userId);
    
    return sendSuccess(res, order, 'Order retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, error.message.includes('not found') ? 404 : 400);
    } else {
      return sendError(res, 'Failed to retrieve order', 500);
    }
  }
});

export const getUserOrders = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const { status, page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const result = await orderService.getUserOrders(
      userId, 
      status as OrderStatus, 
      limitNum, 
      skip
    );
    
    return sendSuccess(res, result, 'User orders retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to retrieve user orders', 500);
    }
  }
});

export const getOrderSummary = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const userId = req.user?.id;

    if (!orderId) {
      return sendError(res, 'Order ID is required', 400);
    }

    const summary = await orderService.getOrderSummary(orderId, userId);
    
    return sendSuccess(res, summary, 'Order summary retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, error.message.includes('not found') ? 404 : 400);
    } else {
      return sendError(res, 'Failed to retrieve order summary', 500);
    }
  }
});

export const cancelOrder = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { reason } = req.body;
    const userId = req.user?.id;

    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    if (!orderId) {
      return sendError(res, 'Order ID is required', 400);
    }

    if (!reason) {
      return sendError(res, 'Cancellation reason is required', 400);
    }

    const order = await orderService.cancelOrder(orderId, userId, reason);
    
    return sendSuccess(res, order, 'Order cancelled successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, error.message.includes('not found') ? 404 : 400);
    } else {
      return sendError(res, 'Failed to cancel order', 500);
    }
  }
});

export const getUserOrderStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const stats = await orderService.getOrderStats(userId);
    
    return sendSuccess(res, stats, 'User order statistics retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to retrieve order statistics', 500);
    }
  }
});

// Admin/Machine Management Controllers
export const updateOrderStatus = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { status, reason } = req.body;

    if (!orderId) {
      return sendError(res, 'Order ID is required', 400);
    }

    if (!status) {
      return sendError(res, 'Order status is required', 400);
    }

    if (!Object.values(OrderStatus).includes(status)) {
      return sendError(res, 'Invalid order status', 400);
    }

    const order = await orderService.updateOrderStatus(orderId, status, reason);
    
    return sendSuccess(res, order, 'Order status updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, error.message.includes('not found') ? 404 : 400);
    } else {
      return sendError(res, 'Failed to update order status', 500);
    }
  }
});

export const markItemDispensed = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { orderId } = req.params;
    const { productId, slotNumber } = req.body;

    if (!orderId || !productId || !slotNumber) {
      return sendError(res, 'Order ID, product ID, and slot number are required', 400);
    }

    const order = await orderService.markItemDispensed(orderId, productId, slotNumber);
    
    return sendSuccess(res, order, 'Item marked as dispensed successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, error.message.includes('not found') ? 404 : 400);
    } else {
      return sendError(res, 'Failed to mark item as dispensed', 500);
    }
  }
});

export const getOrdersByMachine = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;
    const { status, page = 1, limit = 20 } = req.query;

    if (!machineId) {
      return sendError(res, 'Machine ID is required', 400);
    }

    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const result = await orderService.getOrdersByMachine(
      machineId, 
      status as OrderStatus, 
      limitNum, 
      skip
    );
    
    return sendSuccess(res, result, 'Machine orders retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to retrieve machine orders', 500);
    }
  }
});

export const getMachineOrderStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;

    if (!machineId) {
      return sendError(res, 'Machine ID is required', 400);
    }

    const stats = await orderService.getOrderStats(undefined, machineId);
    
    return sendSuccess(res, stats, 'Machine order statistics retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to retrieve machine order statistics', 500);
    }
  }
});