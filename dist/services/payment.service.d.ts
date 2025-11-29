import { PaymentMethod } from '../models/Payment.model';
import { PaymentGateway } from '../models/Payment.model';
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
declare class PaymentService {
    initiatePayment(paymentData: InitiatePaymentData): Promise<{
        payment: import("mongoose").Document<unknown, {}, import("../models/Payment.model").IPayment, {}, {}> & import("../models/Payment.model").IPayment & Required<{
            _id: unknown;
        }> & {
            __v: number;
        };
        gatewayData: any;
    }>;
    processPaymentWebhook(webhookData: PaymentWebhookData): Promise<import("mongoose").Document<unknown, {}, import("../models/Payment.model").IPayment, {}, {}> & import("../models/Payment.model").IPayment & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getPaymentById(paymentId: string, userId?: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Payment.model").IPayment, {}, {}> & import("../models/Payment.model").IPayment & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getPaymentsByUser(userId: string, limit?: number, skip?: number): Promise<{
        payments: (import("mongoose").Document<unknown, {}, import("../models/Payment.model").IPayment, {}, {}> & import("../models/Payment.model").IPayment & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    processRefund(refundData: RefundData): Promise<import("mongoose").Document<unknown, {}, import("../models/Payment.model").IPayment, {}, {}> & import("../models/Payment.model").IPayment & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getPaymentStats(userId?: string, machineId?: string): Promise<any>;
    private createRazorpayPayment;
    private createStripePayment;
    private processCashPayment;
    private createMockPayment;
    private processRazorpayRefund;
    private processStripeRefund;
    private processCashRefund;
    private processMockRefund;
}
export declare const paymentService: PaymentService;
export {};
//# sourceMappingURL=payment.service.d.ts.map