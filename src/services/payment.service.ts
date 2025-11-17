import { TransactionType } from '../models/Payment.model';
import { Payment } from '../models/Payment.model';
import { Order } from '../models/Order.model';
import { PaymentStatus } from '../models/Order.model';
import { PaymentMethod } from '../models/Payment.model';
import { PaymentGateway } from '../models/Payment.model';
import { TransactionStatus } from '../models/Payment.model';

import { Types } from 'mongoose';

export interface InitiatePaymentData {
  orderId: string;
  userId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  paymentGateway: PaymentGateway;
  currency?: string;
}

export interface PaymentWebhookData {
  paymentId: string;
  gatewayTransactionId: string;
  gatewayPaymentId?: string;
  signature?: string;
  status: 'success' | 'failed' | 'pending';
  errorCode?: string;
  errorMessage?: string;
  rawResponse?: any;
}

export interface RefundData {
  paymentId: string;
  refundAmount: number;
  reason: string;
}

class PaymentService {
  
  async initiatePayment(paymentData: InitiatePaymentData) {
    const { orderId, userId, amount, paymentMethod, paymentGateway, currency = 'INR' } = paymentData;

    // Validate order exists and belongs to user
    const order = await Order.findOne({ orderId, userId });
    if (!order) {
      throw new Error('Order not found or does not belong to user');
    }

    if (order.totalAmount !== amount) {
      throw new Error('Payment amount does not match order total');
    }

    // Check if payment already exists for this order
    const existingPayment = await Payment.findOne({ orderId, transactionType: TransactionType.PAYMENT });
    if (existingPayment && existingPayment.status === TransactionStatus.SUCCESS) {
      throw new Error('Payment already completed for this order');
    }

    // Create payment metadata
    const metadata = {
      orderId,
      userId: new Types.ObjectId(userId),
      machineId: order.deliveryInfo.machineId,
      items: order.items.map(item => ({
        productId: item.product.toString(),
        productName: item.productName,
        quantity: item.quantity,
        unitPrice: item.unitPrice
      }))
    };

    // Create payment record
    const payment = new Payment({
      orderId,
      userId,
      amount,
      currency,
      paymentMethod,
      paymentGateway,
      transactionType: TransactionType.PAYMENT,
      status: TransactionStatus.PENDING,
      metadata,
      gatewayResponse: {}
    });

    await payment.save();

    // Generate payment gateway specific data
    let gatewayData;
    switch (paymentGateway) {
      case PaymentGateway.RAZORPAY:
        gatewayData = await this.createRazorpayPayment(payment);
        break;
      case PaymentGateway.STRIPE:
        gatewayData = await this.createStripePayment(payment);
        break;
      case PaymentGateway.CASH:
        gatewayData = await this.processCashPayment(payment);
        break;
      default:
        gatewayData = await this.createMockPayment(payment);
    }

    return {
      payment,
      gatewayData
    };
  }

  async processPaymentWebhook(webhookData: PaymentWebhookData) {
    const { paymentId, gatewayTransactionId, status, errorCode, errorMessage, rawResponse } = webhookData;

    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      throw new Error('Payment not found');
    }

    // Update gateway response
    payment.gatewayResponse = {
      ...payment.gatewayResponse,
      gatewayTransactionId,
      gatewayPaymentId: webhookData.gatewayPaymentId || undefined,
      signature: webhookData.signature || undefined,
      errorCode: errorCode || undefined,
      errorMessage: errorMessage || undefined,
      rawResponse
    } as any;

    if (status === 'success') {
      await (payment as any)['markAsSuccessful'](payment.gatewayResponse);
      
      // Update order payment status
      const order = await Order.findOne({ orderId: payment.orderId });
      if (order) {
        await (order as any)['updatePaymentStatus'](PaymentStatus.COMPLETED, gatewayTransactionId);
      }
    } else if (status === 'failed') {
      await (payment as any)['markAsFailed'](errorCode, errorMessage);
      
      // Update order payment status
      const order = await Order.findOne({ orderId: payment.orderId });
      if (order) {
        await (order as any)['updatePaymentStatus'](PaymentStatus.FAILED);
      }
    }

    return payment;
  }

  async getPaymentById(paymentId: string, userId?: string) {
    const query: any = { paymentId };
    if (userId) {
      query.userId = userId;
    }

    const payment = await Payment.findOne(query);
    if (!payment) {
      throw new Error('Payment not found');
    }

    return payment;
  }

  async getPaymentsByUser(userId: string, limit = 10, skip = 0) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const payments = await Payment.find({ userId })
      .sort({ initiatedAt: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Payment.countDocuments({ userId });

    return {
      payments,
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    };
  }

  async processRefund(refundData: RefundData) {
    const { paymentId, refundAmount, reason } = refundData;

    const payment = await Payment.findOne({ paymentId });
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (!(payment as any).canBeRefunded) {
      throw new Error('Payment cannot be refunded');
    }

    if (refundAmount > payment.refundableAmount) {
      throw new Error('Refund amount exceeds refundable amount');
    }

    // Create refund payment record
    const refundPayment = new Payment({
      orderId: payment.orderId,
      userId: payment.userId,
      amount: refundAmount,
      currency: payment.currency,
      paymentMethod: payment.paymentMethod,
      paymentGateway: payment.paymentGateway,
      transactionType: refundAmount === payment.amount ? TransactionType.REFUND : TransactionType.PARTIAL_REFUND,
      status: TransactionStatus.PROCESSING,
      metadata: payment.metadata,
      notes: reason
    });

    await refundPayment.save();

    // Process refund with gateway
    let refundResult;
    switch (payment.paymentGateway) {
      case PaymentGateway.RAZORPAY:
        refundResult = await this.processRazorpayRefund(payment, refundAmount);
        break;
      case PaymentGateway.STRIPE:
        refundResult = await this.processStripeRefund(payment, refundAmount);
        break;
      case PaymentGateway.CASH:
        refundResult = await this.processCashRefund(payment, refundAmount);
        break;
      default:
        refundResult = await this.processMockRefund(payment, refundAmount);
    }

    if (refundResult.success) {
      await (refundPayment as any)['markAsSuccessful']({ gatewayTransactionId: refundResult.refundId });
      await (payment as any)['processRefund'](refundAmount, refundResult.refundId);
    } else {
      await (refundPayment as any)['markAsFailed']((refundResult as any).errorCode, (refundResult as any).errorMessage);
    }

    return refundPayment;
  }

  async getPaymentStats(userId?: string, machineId?: string) {
    const matchQuery: any = {};
    
    if (userId) {
      matchQuery.userId = new Types.ObjectId(userId);
    }
    
    if (machineId) {
      matchQuery['metadata.machineId'] = machineId;
    }

    const stats = await Payment.aggregate([
      { $match: { ...matchQuery, transactionType: TransactionType.PAYMENT } },
      {
        $group: {
          _id: null,
          totalPayments: { $sum: 1 },
          totalAmount: { $sum: '$amount' },
          successfulPayments: {
            $sum: { $cond: [{ $eq: ['$status', TransactionStatus.SUCCESS] }, 1, 0] }
          },
          failedPayments: {
            $sum: { $cond: [{ $eq: ['$status', TransactionStatus.FAILED] }, 1, 0] }
          },
          pendingPayments: {
            $sum: { $cond: [{ $eq: ['$status', TransactionStatus.PENDING] }, 1, 0] }
          },
          totalSuccessfulAmount: {
            $sum: { $cond: [{ $eq: ['$status', TransactionStatus.SUCCESS] }, '$amount', 0] }
          },
          avgPaymentAmount: { $avg: '$amount' }
        }
      }
    ]);

    return stats[0] || {
      totalPayments: 0,
      totalAmount: 0,
      successfulPayments: 0,
      failedPayments: 0,
      pendingPayments: 0,
      totalSuccessfulAmount: 0,
      avgPaymentAmount: 0
    };
  }

  // Gateway-specific implementations (mock implementations)
  private async createRazorpayPayment(payment: any) {
    // Mock Razorpay implementation
    const razorpayOrder = {
      id: `rzp_order_${Date.now()}`,
      amount: payment.amount * 100, // Razorpay expects amount in paise
      currency: payment.currency,
      receipt: payment.paymentId
    };

    payment.gatewayResponse.gatewayOrderId = razorpayOrder.id;
    await payment.save();

    return {
      orderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      key: 'rzp_test_key', // This would come from environment variables
      name: 'Frovo Vending',
      description: `Payment for Order ${payment.orderId}`,
      prefill: {
        email: 'customer@example.com',
        contact: '9999999999'
      }
    };
  }

  private async createStripePayment(payment: any) {
    // Mock Stripe implementation
    const stripeIntent = {
      id: `pi_${Date.now()}`,
      client_secret: `pi_${Date.now()}_secret_test`,
      amount: payment.amount * 100, // Stripe expects amount in cents
      currency: payment.currency.toLowerCase()
    };

    payment.gatewayResponse.gatewayPaymentId = stripeIntent.id;
    await payment.save();

    return {
      clientSecret: stripeIntent.client_secret,
      amount: stripeIntent.amount,
      currency: stripeIntent.currency
    };
  }

  private async processCashPayment(payment: any) {
    // For cash payments, mark as successful immediately
    await (payment as any)['markAsSuccessful']({ gatewayTransactionId: `CASH_${Date.now()}` });
    
    return {
      success: true,
      message: 'Cash payment processed',
      transactionId: payment.gatewayResponse.gatewayTransactionId
    };
  }

  private async createMockPayment(payment: any) {
    // Mock payment gateway for testing
    const mockTransactionId = `MOCK_${Date.now()}`;
    
    payment.gatewayResponse.gatewayTransactionId = mockTransactionId;
    await payment.save();

    return {
      transactionId: mockTransactionId,
      amount: payment.amount,
      currency: payment.currency,
      redirectUrl: `https://mock-payment-gateway.com/pay/${mockTransactionId}`
    };
  }

  private async processRazorpayRefund(_payment: any, amount: number) {
    // Mock Razorpay refund
    return {
      success: true,
      refundId: `rfnd_${Date.now()}`,
      amount: amount
    };
  }

  private async processStripeRefund(_payment: any, amount: number) {
    // Mock Stripe refund
    return {
      success: true,
      refundId: `re_${Date.now()}`,
      amount: amount
    };
  }

  private async processCashRefund(_payment: any, amount: number) {
    // Mock cash refund
    return {
      success: true,
      refundId: `CASH_REFUND_${Date.now()}`,
      amount: amount
    };
  }

  private async processMockRefund(_payment: any, amount: number) {
    // Mock refund
    return {
      success: true,
      refundId: `MOCK_REFUND_${Date.now()}`,
      amount: amount
    };
  }
}

export const paymentService = new PaymentService();