"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentService = void 0;
const Payment_model_1 = require("../models/Payment.model");
const Payment_model_2 = require("../models/Payment.model");
const Order_model_1 = require("../models/Order.model");
const Order_model_2 = require("../models/Order.model");
const Payment_model_3 = require("../models/Payment.model");
const Payment_model_4 = require("../models/Payment.model");
const mongoose_1 = require("mongoose");
class PaymentService {
    async initiatePayment(paymentData) {
        const { orderId, userId, amount, paymentMethod, paymentGateway, currency = 'INR' } = paymentData;
        const order = await Order_model_1.Order.findOne({ orderId, userId });
        if (!order) {
            throw new Error('Order not found or does not belong to user');
        }
        if (order.totalAmount !== amount) {
            throw new Error('Payment amount does not match order total');
        }
        const existingPayment = await Payment_model_2.Payment.findOne({ orderId, transactionType: Payment_model_1.TransactionType.PAYMENT });
        if (existingPayment && existingPayment.status === Payment_model_4.TransactionStatus.SUCCESS) {
            throw new Error('Payment already completed for this order');
        }
        const metadata = {
            orderId,
            userId: new mongoose_1.Types.ObjectId(userId),
            machineId: order.deliveryInfo.machineId,
            items: order.items.map(item => ({
                productId: item.product.toString(),
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice
            }))
        };
        const payment = new Payment_model_2.Payment({
            orderId,
            userId,
            amount,
            currency,
            paymentMethod,
            paymentGateway,
            transactionType: Payment_model_1.TransactionType.PAYMENT,
            status: Payment_model_4.TransactionStatus.PENDING,
            metadata,
            gatewayResponse: {}
        });
        await payment.save();
        let gatewayData;
        switch (paymentGateway) {
            case Payment_model_3.PaymentGateway.RAZORPAY:
                gatewayData = await this.createRazorpayPayment(payment);
                break;
            case Payment_model_3.PaymentGateway.STRIPE:
                gatewayData = await this.createStripePayment(payment);
                break;
            case Payment_model_3.PaymentGateway.CASH:
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
    async processPaymentWebhook(webhookData) {
        const { paymentId, gatewayTransactionId, status, errorCode, errorMessage, rawResponse } = webhookData;
        const payment = await Payment_model_2.Payment.findOne({ paymentId });
        if (!payment) {
            throw new Error('Payment not found');
        }
        payment.gatewayResponse = {
            ...payment.gatewayResponse,
            gatewayTransactionId,
            gatewayPaymentId: webhookData.gatewayPaymentId || undefined,
            signature: webhookData.signature || undefined,
            errorCode: errorCode || undefined,
            errorMessage: errorMessage || undefined,
            rawResponse
        };
        if (status === 'success') {
            await payment['markAsSuccessful'](payment.gatewayResponse);
            const order = await Order_model_1.Order.findOne({ orderId: payment.orderId });
            if (order) {
                await order['updatePaymentStatus'](Order_model_2.PaymentStatus.COMPLETED, gatewayTransactionId);
            }
        }
        else if (status === 'failed') {
            await payment['markAsFailed'](errorCode, errorMessage);
            const order = await Order_model_1.Order.findOne({ orderId: payment.orderId });
            if (order) {
                await order['updatePaymentStatus'](Order_model_2.PaymentStatus.FAILED);
            }
        }
        return payment;
    }
    async getPaymentById(paymentId, userId) {
        const query = { paymentId };
        if (userId) {
            query.userId = userId;
        }
        const payment = await Payment_model_2.Payment.findOne(query);
        if (!payment) {
            throw new Error('Payment not found');
        }
        return payment;
    }
    async getPaymentsByUser(userId, limit = 10, skip = 0) {
        if (!mongoose_1.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }
        const payments = await Payment_model_2.Payment.find({ userId })
            .sort({ initiatedAt: -1 })
            .limit(limit)
            .skip(skip);
        const total = await Payment_model_2.Payment.countDocuments({ userId });
        return {
            payments,
            total,
            page: Math.floor(skip / limit) + 1,
            totalPages: Math.ceil(total / limit)
        };
    }
    async processRefund(refundData) {
        const { paymentId, refundAmount, reason } = refundData;
        const payment = await Payment_model_2.Payment.findOne({ paymentId });
        if (!payment) {
            throw new Error('Payment not found');
        }
        if (!payment.canBeRefunded) {
            throw new Error('Payment cannot be refunded');
        }
        if (refundAmount > payment.refundableAmount) {
            throw new Error('Refund amount exceeds refundable amount');
        }
        const refundPayment = new Payment_model_2.Payment({
            orderId: payment.orderId,
            userId: payment.userId,
            amount: refundAmount,
            currency: payment.currency,
            paymentMethod: payment.paymentMethod,
            paymentGateway: payment.paymentGateway,
            transactionType: refundAmount === payment.amount ? Payment_model_1.TransactionType.REFUND : Payment_model_1.TransactionType.PARTIAL_REFUND,
            status: Payment_model_4.TransactionStatus.PROCESSING,
            metadata: payment.metadata,
            notes: reason
        });
        await refundPayment.save();
        let refundResult;
        switch (payment.paymentGateway) {
            case Payment_model_3.PaymentGateway.RAZORPAY:
                refundResult = await this.processRazorpayRefund(payment, refundAmount);
                break;
            case Payment_model_3.PaymentGateway.STRIPE:
                refundResult = await this.processStripeRefund(payment, refundAmount);
                break;
            case Payment_model_3.PaymentGateway.CASH:
                refundResult = await this.processCashRefund(payment, refundAmount);
                break;
            default:
                refundResult = await this.processMockRefund(payment, refundAmount);
        }
        if (refundResult.success) {
            await refundPayment['markAsSuccessful']({ gatewayTransactionId: refundResult.refundId });
            await payment['processRefund'](refundAmount, refundResult.refundId);
        }
        else {
            await refundPayment['markAsFailed'](refundResult.errorCode, refundResult.errorMessage);
        }
        return refundPayment;
    }
    async getPaymentStats(userId, machineId) {
        const matchQuery = {};
        if (userId) {
            matchQuery.userId = new mongoose_1.Types.ObjectId(userId);
        }
        if (machineId) {
            matchQuery['metadata.machineId'] = machineId;
        }
        const stats = await Payment_model_2.Payment.aggregate([
            { $match: { ...matchQuery, transactionType: Payment_model_1.TransactionType.PAYMENT } },
            {
                $group: {
                    _id: null,
                    totalPayments: { $sum: 1 },
                    totalAmount: { $sum: '$amount' },
                    successfulPayments: {
                        $sum: { $cond: [{ $eq: ['$status', Payment_model_4.TransactionStatus.SUCCESS] }, 1, 0] }
                    },
                    failedPayments: {
                        $sum: { $cond: [{ $eq: ['$status', Payment_model_4.TransactionStatus.FAILED] }, 1, 0] }
                    },
                    pendingPayments: {
                        $sum: { $cond: [{ $eq: ['$status', Payment_model_4.TransactionStatus.PENDING] }, 1, 0] }
                    },
                    totalSuccessfulAmount: {
                        $sum: { $cond: [{ $eq: ['$status', Payment_model_4.TransactionStatus.SUCCESS] }, '$amount', 0] }
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
    async createRazorpayPayment(payment) {
        const razorpayOrder = {
            id: `rzp_order_${Date.now()}`,
            amount: payment.amount * 100,
            currency: payment.currency,
            receipt: payment.paymentId
        };
        payment.gatewayResponse.gatewayOrderId = razorpayOrder.id;
        await payment.save();
        return {
            orderId: razorpayOrder.id,
            amount: razorpayOrder.amount,
            currency: razorpayOrder.currency,
            key: 'rzp_test_key',
            name: 'Frovo Vending',
            description: `Payment for Order ${payment.orderId}`,
            prefill: {
                email: 'customer@example.com',
                contact: '9999999999'
            }
        };
    }
    async createStripePayment(payment) {
        const stripeIntent = {
            id: `pi_${Date.now()}`,
            client_secret: `pi_${Date.now()}_secret_test`,
            amount: payment.amount * 100,
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
    async processCashPayment(payment) {
        await payment['markAsSuccessful']({ gatewayTransactionId: `CASH_${Date.now()}` });
        return {
            success: true,
            message: 'Cash payment processed',
            transactionId: payment.gatewayResponse.gatewayTransactionId
        };
    }
    async createMockPayment(payment) {
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
    async processRazorpayRefund(_payment, amount) {
        return {
            success: true,
            refundId: `rfnd_${Date.now()}`,
            amount: amount
        };
    }
    async processStripeRefund(_payment, amount) {
        return {
            success: true,
            refundId: `re_${Date.now()}`,
            amount: amount
        };
    }
    async processCashRefund(_payment, amount) {
        return {
            success: true,
            refundId: `CASH_REFUND_${Date.now()}`,
            amount: amount
        };
    }
    async processMockRefund(_payment, amount) {
        return {
            success: true,
            refundId: `MOCK_REFUND_${Date.now()}`,
            amount: amount
        };
    }
}
exports.paymentService = new PaymentService();
//# sourceMappingURL=payment.service.js.map