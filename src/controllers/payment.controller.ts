import { Request, Response } from 'express';
import { paymentService, InitiatePaymentData, PaymentWebhookData, RefundData } from '../services/payment.service';
import { orderService } from '../services/order.service';
import { PaymentMethod, PaymentGateway } from '../models';
import { asyncHandler } from '../utils/asyncHandler.util';
import { sendSuccess, sendError } from '../utils/response.util';

export const initiatePayment = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const { orderId, paymentMethod, paymentGateway } = req.body;

    if (!orderId || !paymentMethod || !paymentGateway) {
      return sendError(res, 'Order ID, payment method, and payment gateway are required', 400);
    }

    if (!Object.values(PaymentMethod).includes(paymentMethod)) {
      return sendError(res, 'Invalid payment method', 400);
    }

    if (!Object.values(PaymentGateway).includes(paymentGateway)) {
      return sendError(res, 'Invalid payment gateway', 400);
    }

    // Get order to verify amount
    const order = await orderService.getOrderById(orderId, userId);
    
    const paymentData: InitiatePaymentData = {
      orderId,
      userId,
      amount: order.totalAmount,
      paymentMethod,
      paymentGateway
    };

    const result = await paymentService.initiatePayment(paymentData);
    
    return sendSuccess(res, result, 'Payment initiated successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to initiate payment', 500);
    }
  }
});

export const getPayment = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const userId = req.user?.id;

    if (!paymentId) {
      return sendError(res, 'Payment ID is required', 400);
    }

    const payment = await paymentService.getPaymentById(paymentId, userId);
    
    return sendSuccess(res, payment, 'Payment retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, error.message.includes('not found') ? 404 : 400);
    } else {
      return sendError(res, 'Failed to retrieve payment', 500);
    }
  }
});

export const getUserPayments = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const { page = 1, limit = 10 } = req.query;
    
    const pageNum = parseInt(page as string);
    const limitNum = parseInt(limit as string);
    const skip = (pageNum - 1) * limitNum;

    const result = await paymentService.getPaymentsByUser(userId, limitNum, skip);
    
    return sendSuccess(res, result, 'User payments retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to retrieve user payments', 500);
    }
  }
});

export const processPaymentWebhook = asyncHandler(async (req: Request, res: Response) => {
  try {
    // This endpoint would typically be called by payment gateways
    // Skip authentication for webhook endpoints
    const webhookData: PaymentWebhookData = req.body;

    if (!webhookData.paymentId || !webhookData.gatewayTransactionId || !webhookData.status) {
      return sendError(res, 'Invalid webhook data', 400);
    }

    const payment = await paymentService.processPaymentWebhook(webhookData);
    
    return sendSuccess(res, payment, 'Payment webhook processed successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to process payment webhook', 500);
    }
  }
});

export const confirmPayment = asyncHandler(async (req: Request, res: Response) => {
  try {
    // This endpoint can be used for manual payment confirmation (e.g., for cash payments)
    const { paymentId, gatewayTransactionId, signature } = req.body;

    if (!paymentId) {
      return sendError(res, 'Payment ID is required', 400);
    }

    const webhookData: PaymentWebhookData = {
      paymentId,
      gatewayTransactionId: gatewayTransactionId || `MANUAL_${Date.now()}`,
      signature,
      status: 'success'
    };

    const payment = await paymentService.processPaymentWebhook(webhookData);
    
    return sendSuccess(res, payment, 'Payment confirmed successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to confirm payment', 500);
    }
  }
});

export const processRefund = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;
    const { refundAmount, reason } = req.body;

    if (!paymentId) {
      return sendError(res, 'Payment ID is required', 400);
    }

    if (!refundAmount || refundAmount <= 0) {
      return sendError(res, 'Valid refund amount is required', 400);
    }

    if (!reason) {
      return sendError(res, 'Refund reason is required', 400);
    }

    const refundData: RefundData = {
      paymentId,
      refundAmount,
      reason
    };

    const refund = await paymentService.processRefund(refundData);
    
    return sendSuccess(res, refund, 'Refund processed successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to process refund', 500);
    }
  }
});

export const getUserPaymentStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const stats = await paymentService.getPaymentStats(userId);
    
    return sendSuccess(res, stats, 'User payment statistics retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to retrieve payment statistics', 500);
    }
  }
});

export const getMachinePaymentStats = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { machineId } = req.params;

    if (!machineId) {
      return sendError(res, 'Machine ID is required', 400);
    }

    const stats = await paymentService.getPaymentStats(undefined, machineId);
    
    return sendSuccess(res, stats, 'Machine payment statistics retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to retrieve machine payment statistics', 500);
    }
  }
});

// Mock payment completion for testing (simulates successful payment)
export const mockPaymentSuccess = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return sendError(res, 'Payment ID is required', 400);
    }

    const webhookData: PaymentWebhookData = {
      paymentId,
      gatewayTransactionId: `MOCK_SUCCESS_${Date.now()}`,
      status: 'success',
      rawResponse: { mockPayment: true }
    };

    const payment = await paymentService.processPaymentWebhook(webhookData);
    
    return sendSuccess(res, payment, 'Mock payment completed successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to complete mock payment', 500);
    }
  }
});

// Mock payment failure for testing
export const mockPaymentFailure = asyncHandler(async (req: Request, res: Response) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return sendError(res, 'Payment ID is required', 400);
    }

    const webhookData: PaymentWebhookData = {
      paymentId,
      gatewayTransactionId: `MOCK_FAILED_${Date.now()}`,
      status: 'failed',
      errorCode: 'PAYMENT_FAILED',
      errorMessage: 'Mock payment failure for testing',
      rawResponse: { mockPayment: true }
    };

    const payment = await paymentService.processPaymentWebhook(webhookData);
    
    return sendSuccess(res, payment, 'Mock payment failed successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to fail mock payment', 500);
    }
  }
});