import { PaymentStatus } from '../models/Order.model';
import { OrderStatus } from '../models/Order.model';
export interface CreateOrderData {
    paymentMethod: string;
    paymentGateway: string;
    notes?: string;
}
declare class OrderService {
    createOrder(userId: string, orderData: CreateOrderData): Promise<import("mongoose").Document<unknown, {}, import("../models/Order.model").IOrder, {}, {}> & import("../models/Order.model").IOrder & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getOrderById(orderId: string, userId?: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Order.model").IOrder, {}, {}> & import("../models/Order.model").IOrder & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getUserOrders(userId: string, status?: OrderStatus, limit?: number, skip?: number): Promise<{
        orders: (import("mongoose").Document<unknown, {}, import("../models/Order.model").IOrder, {}, {}> & import("../models/Order.model").IOrder & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    updateOrderStatus(orderId: string, status: OrderStatus, reason?: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Order.model").IOrder, {}, {}> & import("../models/Order.model").IOrder & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, transactionId?: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Order.model").IOrder, {}, {}> & import("../models/Order.model").IOrder & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    markItemDispensed(orderId: string, productId: string, slotNumber: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Order.model").IOrder, {}, {}> & import("../models/Order.model").IOrder & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    getOrderSummary(orderId: string, userId?: string): Promise<{
        orderId: string;
        orderStatus: OrderStatus;
        paymentStatus: PaymentStatus;
        totalItems: number;
        subtotal: number;
        tax: number;
        totalAmount: number;
        orderDate: Date;
        estimatedDispenseTime: Date;
        actualDispenseTime: Date | undefined;
        machine: {
            machineId: string;
            machineName: string;
            location: {
                address: string;
                city: string;
                state: string;
                landmark: string;
            };
        };
        items: {
            productName: string;
            quantity: number;
            unitPrice: number;
            totalPrice: number;
            dispensed: boolean;
            dispensedAt: Date | undefined;
        }[];
        canBeCancelled: any;
        isCompleted: any;
    }>;
    cancelOrder(orderId: string, userId: string, reason: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Order.model").IOrder, {}, {}> & import("../models/Order.model").IOrder & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    private restoreInventory;
    getOrdersByMachine(machineId: string, status?: OrderStatus, limit?: number, skip?: number): Promise<{
        orders: (import("mongoose").Document<unknown, {}, import("../models/Order.model").IOrder, {}, {}> & import("../models/Order.model").IOrder & Required<{
            _id: unknown;
        }> & {
            __v: number;
        })[];
        total: number;
        page: number;
        totalPages: number;
    }>;
    getOrderStats(userId?: string, machineId?: string): Promise<any>;
}
export declare const orderService: OrderService;
export {};
//# sourceMappingURL=order.service.d.ts.map