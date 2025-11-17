"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.orderService = void 0;
const Cart_model_1 = require("../models/Cart.model");
const VendingMachine_model_1 = require("../models/VendingMachine.model");
const Order_model_1 = require("../models/Order.model");
const Order_model_2 = require("../models/Order.model");
const Order_model_3 = require("../models/Order.model");
const mongoose_1 = require("mongoose");
class OrderService {
    async createOrder(userId, orderData) {
        if (!mongoose_1.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }
        const cart = await Cart_model_1.Cart.findOne({ userId, isActive: true })
            .populate('items.product');
        if (!cart || cart.isEmpty) {
            throw new Error('Cart is empty');
        }
        const validationResults = [];
        const orderItems = [];
        for (const cartItem of cart.items) {
            const machine = await VendingMachine_model_1.VendingMachine.findOne({ machineId: cartItem.machineId });
            if (!machine) {
                validationResults.push(`Machine ${cartItem.machineId} not found`);
                continue;
            }
            const slot = machine.productSlots.find(slot => slot.slotNumber === cartItem.slotNumber &&
                slot.product.toString() === cartItem.product._id.toString());
            if (!slot) {
                validationResults.push(`Product ${cartItem.productName} not available in slot ${cartItem.slotNumber}`);
                continue;
            }
            if (slot.quantity < cartItem.quantity) {
                validationResults.push(`Insufficient stock for ${cartItem.productName}. Available: ${slot.quantity}, Required: ${cartItem.quantity}`);
                continue;
            }
            orderItems.push({
                product: cartItem.product._id,
                productName: cartItem.productName,
                productDescription: cartItem.product.description || cartItem.productName,
                machineId: cartItem.machineId,
                machineName: machine.name,
                slotNumber: cartItem.slotNumber,
                quantity: cartItem.quantity,
                unitPrice: cartItem.unitPrice,
                totalPrice: cartItem.totalPrice,
                dispensed: false
            });
        }
        if (validationResults.length > 0) {
            throw new Error(`Order validation failed: ${validationResults.join(', ')}`);
        }
        if (orderItems.length === 0) {
            throw new Error('No valid items in cart');
        }
        const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
        const taxRate = 0.18;
        const tax = Math.round(subtotal * taxRate * 100) / 100;
        const totalAmount = subtotal + tax;
        const firstMachine = await VendingMachine_model_1.VendingMachine.findOne({ machineId: orderItems[0]?.machineId });
        if (!firstMachine) {
            throw new Error('Machine not found for delivery info');
        }
        const order = new Order_model_1.Order({
            userId,
            items: orderItems,
            totalItems: orderItems.reduce((sum, item) => sum + item.quantity, 0),
            subtotal,
            tax,
            totalAmount,
            orderStatus: Order_model_3.OrderStatus.PENDING,
            paymentInfo: {
                paymentId: `PAY-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
                paymentMethod: orderData.paymentMethod,
                transactionId: '',
                paymentGateway: orderData.paymentGateway,
                paymentStatus: Order_model_2.PaymentStatus.PENDING,
                paidAmount: totalAmount
            },
            deliveryInfo: {
                machineId: firstMachine.machineId,
                machineName: firstMachine.name,
                location: {
                    address: firstMachine.location.address,
                    city: firstMachine.location.city,
                    state: firstMachine.location.state,
                    landmark: firstMachine.location.landmark
                },
                estimatedDispenseTime: new Date(Date.now() + 5 * 60 * 1000)
            },
            notes: orderData.notes
        });
        await order.save();
        for (const item of orderItems) {
            const machine = await VendingMachine_model_1.VendingMachine.findOne({ machineId: item.machineId });
            if (machine) {
                const slot = machine.productSlots.find(slot => slot.slotNumber === item.slotNumber &&
                    slot.product.toString() === item.product.toString());
                if (slot && slot.quantity >= item.quantity) {
                    slot.quantity -= item.quantity;
                    await machine.save();
                }
            }
        }
        await cart.clearCart();
        return order;
    }
    async getOrderById(orderId, userId) {
        const query = { orderId };
        if (userId) {
            query.userId = userId;
        }
        const order = await Order_model_1.Order.findOne(query)
            .populate('userId', 'firstName lastName email')
            .populate('items.product');
        if (!order) {
            throw new Error('Order not found');
        }
        return order;
    }
    async getUserOrders(userId, status, limit = 10, skip = 0) {
        if (!mongoose_1.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }
        const query = { userId };
        if (status) {
            query.orderStatus = status;
        }
        const orders = await Order_model_1.Order.find(query)
            .populate('items.product')
            .sort({ orderDate: -1 })
            .limit(limit)
            .skip(skip);
        const total = await Order_model_1.Order.countDocuments(query);
        return {
            orders,
            total,
            page: Math.floor(skip / limit) + 1,
            totalPages: Math.ceil(total / limit)
        };
    }
    async updateOrderStatus(orderId, status, reason) {
        const order = await Order_model_1.Order.findOne({ orderId });
        if (!order) {
            throw new Error('Order not found');
        }
        await order.updateStatus(status, reason);
        if (status === Order_model_3.OrderStatus.CANCELLED) {
            await this.restoreInventory(order);
        }
        return order;
    }
    async updatePaymentStatus(orderId, paymentStatus, transactionId) {
        const order = await Order_model_1.Order.findOne({ orderId });
        if (!order) {
            throw new Error('Order not found');
        }
        await order.updatePaymentStatus(paymentStatus, transactionId);
        if (paymentStatus === Order_model_2.PaymentStatus.COMPLETED) {
            if (order.orderStatus === Order_model_3.OrderStatus.PENDING) {
                await order.updateStatus(Order_model_3.OrderStatus.CONFIRMED);
            }
        }
        if (paymentStatus === Order_model_2.PaymentStatus.FAILED) {
            await order.updateStatus(Order_model_3.OrderStatus.CANCELLED, 'Payment failed');
            await this.restoreInventory(order);
        }
        return order;
    }
    async markItemDispensed(orderId, productId, slotNumber) {
        const order = await Order_model_1.Order.findOne({ orderId });
        if (!order) {
            throw new Error('Order not found');
        }
        await order.markItemDispensed(productId, slotNumber);
        return order;
    }
    async getOrderSummary(orderId, userId) {
        const order = await this.getOrderById(orderId, userId);
        const summary = {
            orderId: order.orderId,
            orderStatus: order.orderStatus,
            paymentStatus: order.paymentInfo.paymentStatus,
            totalItems: order.totalItems,
            subtotal: order.subtotal,
            tax: order.tax,
            totalAmount: order.totalAmount,
            orderDate: order.orderDate,
            estimatedDispenseTime: order.deliveryInfo.estimatedDispenseTime,
            actualDispenseTime: order.deliveryInfo.actualDispenseTime,
            machine: {
                machineId: order.deliveryInfo.machineId,
                machineName: order.deliveryInfo.machineName,
                location: order.deliveryInfo.location
            },
            items: order.items.map(item => ({
                productName: item.productName,
                quantity: item.quantity,
                unitPrice: item.unitPrice,
                totalPrice: item.totalPrice,
                dispensed: item.dispensed,
                dispensedAt: item.dispensedAt
            })),
            canBeCancelled: order.canBeCancelled,
            isCompleted: order.isCompleted
        };
        return summary;
    }
    async cancelOrder(orderId, userId, reason) {
        const order = await Order_model_1.Order.findOne({ orderId, userId });
        if (!order) {
            throw new Error('Order not found');
        }
        if (!order.canBeCancelled) {
            throw new Error('Order cannot be cancelled at this stage');
        }
        await order.updateStatus(Order_model_3.OrderStatus.CANCELLED, reason);
        await this.restoreInventory(order);
        return order;
    }
    async restoreInventory(order) {
        for (const item of order.items) {
            if (!item.dispensed) {
                const machine = await VendingMachine_model_1.VendingMachine.findOne({ machineId: item.machineId });
                if (machine) {
                    const slot = machine.productSlots.find(slot => slot.slotNumber === item.slotNumber &&
                        slot.product.toString() === item.product.toString());
                    if (slot) {
                        slot.quantity += item.quantity;
                        await machine.save();
                    }
                }
            }
        }
    }
    async getOrdersByMachine(machineId, status, limit = 20, skip = 0) {
        const query = { 'deliveryInfo.machineId': machineId };
        if (status) {
            query.orderStatus = status;
        }
        const orders = await Order_model_1.Order.find(query)
            .populate('userId', 'firstName lastName email')
            .populate('items.product')
            .sort({ orderDate: -1 })
            .limit(limit)
            .skip(skip);
        const total = await Order_model_1.Order.countDocuments(query);
        return {
            orders,
            total,
            page: Math.floor(skip / limit) + 1,
            totalPages: Math.ceil(total / limit)
        };
    }
    async getOrderStats(userId, machineId) {
        const matchQuery = {};
        if (userId) {
            matchQuery.userId = new mongoose_1.Types.ObjectId(userId);
        }
        if (machineId) {
            matchQuery['deliveryInfo.machineId'] = machineId;
        }
        const stats = await Order_model_1.Order.aggregate([
            { $match: matchQuery },
            {
                $group: {
                    _id: null,
                    totalOrders: { $sum: 1 },
                    totalRevenue: { $sum: '$totalAmount' },
                    pendingOrders: {
                        $sum: { $cond: [{ $eq: ['$orderStatus', Order_model_3.OrderStatus.PENDING] }, 1, 0] }
                    },
                    completedOrders: {
                        $sum: { $cond: [{ $eq: ['$orderStatus', Order_model_3.OrderStatus.COMPLETED] }, 1, 0] }
                    },
                    cancelledOrders: {
                        $sum: { $cond: [{ $eq: ['$orderStatus', Order_model_3.OrderStatus.CANCELLED] }, 1, 0] }
                    },
                    avgOrderValue: { $avg: '$totalAmount' }
                }
            }
        ]);
        return stats[0] || {
            totalOrders: 0,
            totalRevenue: 0,
            pendingOrders: 0,
            completedOrders: 0,
            cancelledOrders: 0,
            avgOrderValue: 0
        };
    }
}
exports.orderService = new OrderService();
//# sourceMappingURL=order.service.js.map