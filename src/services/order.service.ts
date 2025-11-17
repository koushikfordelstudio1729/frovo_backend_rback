import { Cart } from '../models/Cart.model';
import { VendingMachine } from '../models/VendingMachine.model';
import { Order } from '../models/Order.model';
import { PaymentStatus } from '../models/Order.model';
import { OrderStatus } from '../models/Order.model';
import { Types } from 'mongoose';

export interface CreateOrderData {
  paymentMethod: string;
  paymentGateway: string;
  notes?: string;
}

class OrderService {
  
  async createOrder(userId: string, orderData: CreateOrderData) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    // Get user cart
    const cart = await Cart.findOne({ userId, isActive: true })
      .populate('items.product');

    if (!cart || (cart as any).isEmpty) {
      throw new Error('Cart is empty');
    }

    // Validate cart items and check availability
    const validationResults = [];
    const orderItems = [];
    
    for (const cartItem of cart.items) {
      const machine = await VendingMachine.findOne({ machineId: cartItem.machineId });
      
      if (!machine) {
        validationResults.push(`Machine ${cartItem.machineId} not found`);
        continue;
      }

      const slot = machine.productSlots.find(
        slot => slot.slotNumber === cartItem.slotNumber && 
                slot.product.toString() === cartItem.product._id.toString()
      );

      if (!slot) {
        validationResults.push(`Product ${cartItem.productName} not available in slot ${cartItem.slotNumber}`);
        continue;
      }

      if (slot.quantity < cartItem.quantity) {
        validationResults.push(`Insufficient stock for ${cartItem.productName}. Available: ${slot.quantity}, Required: ${cartItem.quantity}`);
        continue;
      }

      // Create order item
      orderItems.push({
        product: cartItem.product._id,
        productName: cartItem.productName,
        productDescription: (cartItem.product as any).description || cartItem.productName,
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

    // Calculate totals
    const subtotal = orderItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const taxRate = 0.18; // 18% GST
    const tax = Math.round(subtotal * taxRate * 100) / 100;
    const totalAmount = subtotal + tax;

    // Get delivery info from the first machine (assuming single machine orders for now)
    const firstMachine = await VendingMachine.findOne({ machineId: orderItems[0]?.machineId });
    if (!firstMachine) {
      throw new Error('Machine not found for delivery info');
    }

    // Create order
    const order = new Order({
      userId,
      items: orderItems,
      totalItems: orderItems.reduce((sum, item) => sum + item.quantity, 0),
      subtotal,
      tax,
      totalAmount,
      orderStatus: OrderStatus.PENDING,
      paymentInfo: {
        paymentId: `PAY-${Date.now().toString(36)}-${Math.random().toString(36).substr(2, 5)}`.toUpperCase(),
        paymentMethod: orderData.paymentMethod,
        transactionId: '',
        paymentGateway: orderData.paymentGateway,
        paymentStatus: PaymentStatus.PENDING,
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
        estimatedDispenseTime: new Date(Date.now() + 5 * 60 * 1000) // 5 minutes from now
      },
      notes: orderData.notes
    });

    await order.save();

    // Reserve inventory (reduce quantities in vending machine)
    for (const item of orderItems) {
      const machine = await VendingMachine.findOne({ machineId: item.machineId });
      if (machine) {
        const slot = machine.productSlots.find(
          slot => slot.slotNumber === item.slotNumber && 
                  slot.product.toString() === item.product.toString()
        );
        
        if (slot && slot.quantity >= item.quantity) {
          slot.quantity -= item.quantity;
          await machine.save();
        }
      }
    }

    // Clear cart after successful order creation
    await (cart as any).clearCart();

    return order;
  }

  async getOrderById(orderId: string, userId?: string) {
    const query: any = { orderId };
    if (userId) {
      query.userId = userId;
    }

    const order = await Order.findOne(query)
      .populate('userId', 'firstName lastName email')
      .populate('items.product');

    if (!order) {
      throw new Error('Order not found');
    }

    return order;
  }

  async getUserOrders(userId: string, status?: OrderStatus, limit = 10, skip = 0) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error('Invalid user ID');
    }

    const query: any = { userId };
    if (status) {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .populate('items.product')
      .sort({ orderDate: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Order.countDocuments(query);

    return {
      orders,
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    };
  }

  async updateOrderStatus(orderId: string, status: OrderStatus, reason?: string) {
    const order = await Order.findOne({ orderId });
    if (!order) {
      throw new Error('Order not found');
    }

    await (order as any).updateStatus(status, reason);
    
    // If cancelling, restore inventory
    if (status === OrderStatus.CANCELLED) {
      await this.restoreInventory(order);
    }

    return order;
  }

  async updatePaymentStatus(orderId: string, paymentStatus: PaymentStatus, transactionId?: string) {
    const order = await Order.findOne({ orderId });
    if (!order) {
      throw new Error('Order not found');
    }

    await (order as any).updatePaymentStatus(paymentStatus, transactionId);

    // If payment successful, confirm the order
    if (paymentStatus === PaymentStatus.COMPLETED) {
      if (order.orderStatus === OrderStatus.PENDING) {
        await (order as any).updateStatus(OrderStatus.CONFIRMED);
      }
    }

    // If payment failed, cancel the order and restore inventory
    if (paymentStatus === PaymentStatus.FAILED) {
      await (order as any).updateStatus(OrderStatus.CANCELLED, 'Payment failed');
      await this.restoreInventory(order);
    }

    return order;
  }

  async markItemDispensed(orderId: string, productId: string, slotNumber: string) {
    const order = await Order.findOne({ orderId });
    if (!order) {
      throw new Error('Order not found');
    }

    await (order as any).markItemDispensed(productId, slotNumber);
    return order;
  }

  async getOrderSummary(orderId: string, userId?: string) {
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
      canBeCancelled: (order as any).canBeCancelled,
      isCompleted: (order as any).isCompleted
    };

    return summary;
  }

  async cancelOrder(orderId: string, userId: string, reason: string) {
    const order = await Order.findOne({ orderId, userId });
    if (!order) {
      throw new Error('Order not found');
    }

    if (!(order as any).canBeCancelled) {
      throw new Error('Order cannot be cancelled at this stage');
    }

    await (order as any).updateStatus(OrderStatus.CANCELLED, reason);
    await this.restoreInventory(order);

    return order;
  }

  private async restoreInventory(order: any) {
    for (const item of order.items) {
      if (!item.dispensed) {
        const machine = await VendingMachine.findOne({ machineId: item.machineId });
        if (machine) {
          const slot = machine.productSlots.find(
            slot => slot.slotNumber === item.slotNumber && 
                    slot.product.toString() === item.product.toString()
          );
          
          if (slot) {
            slot.quantity += item.quantity;
            await machine.save();
          }
        }
      }
    }
  }

  async getOrdersByMachine(machineId: string, status?: OrderStatus, limit = 20, skip = 0) {
    const query: any = { 'deliveryInfo.machineId': machineId };
    if (status) {
      query.orderStatus = status;
    }

    const orders = await Order.find(query)
      .populate('userId', 'firstName lastName email')
      .populate('items.product')
      .sort({ orderDate: -1 })
      .limit(limit)
      .skip(skip);

    const total = await Order.countDocuments(query);

    return {
      orders,
      total,
      page: Math.floor(skip / limit) + 1,
      totalPages: Math.ceil(total / limit)
    };
  }

  async getOrderStats(userId?: string, machineId?: string) {
    const matchQuery: any = {};
    
    if (userId) {
      matchQuery.userId = new Types.ObjectId(userId);
    }
    
    if (machineId) {
      matchQuery['deliveryInfo.machineId'] = machineId;
    }

    const stats = await Order.aggregate([
      { $match: matchQuery },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalRevenue: { $sum: '$totalAmount' },
          pendingOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', OrderStatus.PENDING] }, 1, 0] }
          },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', OrderStatus.COMPLETED] }, 1, 0] }
          },
          cancelledOrders: {
            $sum: { $cond: [{ $eq: ['$orderStatus', OrderStatus.CANCELLED] }, 1, 0] }
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

export const orderService = new OrderService();