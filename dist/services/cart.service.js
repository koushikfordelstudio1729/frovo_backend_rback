"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartService = void 0;
const Cart_model_1 = require("../models/Cart.model");
const Product_model_1 = require("../models/Product.model");
const VendingMachine_model_1 = require("../models/VendingMachine.model");
const mongoose_1 = require("mongoose");
class CartService {
    async getCart(userId) {
        if (!mongoose_1.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }
        let cart = await Cart_model_1.Cart.findOne({ userId, isActive: true })
            .populate('items.product');
        if (!cart) {
            cart = new Cart_model_1.Cart({ userId, items: [] });
            await cart.save();
        }
        return cart;
    }
    async addToCart(userId, cartData) {
        if (!mongoose_1.Types.ObjectId.isValid(userId)) {
            throw new Error('Invalid user ID');
        }
        if (!mongoose_1.Types.ObjectId.isValid(cartData.productId)) {
            throw new Error('Invalid product ID');
        }
        const product = await Product_model_1.Product.findById(cartData.productId);
        if (!product) {
            throw new Error('Product not found');
        }
        const machine = await VendingMachine_model_1.VendingMachine.findOne({ machineId: cartData.machineId });
        if (!machine) {
            throw new Error('Vending machine not found');
        }
        const slot = machine.productSlots.find(slot => slot.slotNumber === cartData.slotNumber &&
            slot.product.toString() === cartData.productId);
        if (!slot) {
            throw new Error('Product not available in this slot');
        }
        if (slot.quantity < cartData.quantity) {
            throw new Error(`Insufficient stock. Only ${slot.quantity} items available`);
        }
        let cart = await Cart_model_1.Cart.findOne({ userId, isActive: true });
        if (!cart) {
            cart = new Cart_model_1.Cart({ userId, items: [] });
        }
        await cart.addItem({
            product: new mongoose_1.Types.ObjectId(cartData.productId),
            productName: product.name,
            productPrice: product.price,
            machineId: cartData.machineId,
            slotNumber: cartData.slotNumber,
            quantity: cartData.quantity,
            unitPrice: slot?.price || 0
        });
        return await Cart_model_1.Cart.findById(cart?._id).populate('items.product');
    }
    async updateCartItem(userId, productId, machineId, slotNumber, quantity) {
        const cart = await Cart_model_1.Cart.findOne({ userId, isActive: true });
        if (!cart) {
            throw new Error('Cart not found');
        }
        if (quantity === 0) {
            return this.removeFromCart(userId, productId, machineId, slotNumber);
        }
        const machine = await VendingMachine_model_1.VendingMachine.findOne({ machineId });
        if (!machine) {
            throw new Error('Vending machine not found');
        }
        const slot = machine.productSlots.find(slot => slot.slotNumber === slotNumber &&
            slot.product.toString() === productId);
        if (!slot || slot.quantity < quantity) {
            throw new Error(`Insufficient stock. Only ${slot?.quantity || 0} items available`);
        }
        await cart['updateItemQuantity'](productId, machineId, slotNumber, quantity);
        return await Cart_model_1.Cart.findById(cart._id).populate('items.product');
    }
    async removeFromCart(userId, productId, machineId, slotNumber) {
        const cart = await Cart_model_1.Cart.findOne({ userId, isActive: true });
        if (!cart) {
            throw new Error('Cart not found');
        }
        await cart['removeItem'](productId, machineId, slotNumber);
        return await Cart_model_1.Cart.findById(cart._id).populate('items.product');
    }
    async clearCart(userId) {
        const cart = await Cart_model_1.Cart.findOne({ userId, isActive: true });
        if (!cart) {
            throw new Error('Cart not found');
        }
        await cart['clearCart']();
        return await Cart_model_1.Cart.findById(cart._id).populate('items.product');
    }
    async validateCartItems(userId) {
        const cart = await Cart_model_1.Cart.findOne({ userId, isActive: true })
            .populate('items.product');
        if (!cart || cart.isEmpty || cart.items.length === 0) {
            return { isValid: true, invalidItems: [], validItems: [] };
        }
        const invalidItems = [];
        const validItems = [];
        for (const item of cart.items) {
            const machine = await VendingMachine_model_1.VendingMachine.findOne({ machineId: item.machineId });
            if (!machine) {
                invalidItems.push({
                    ...item.toObject(),
                    reason: 'Vending machine not available'
                });
                continue;
            }
            const slot = machine.productSlots.find(slot => slot.slotNumber === item.slotNumber &&
                slot.product.toString() === item.product._id.toString());
            if (!slot) {
                invalidItems.push({
                    ...item.toObject(),
                    reason: 'Product no longer available in this slot'
                });
                continue;
            }
            if (slot.quantity < item.quantity) {
                invalidItems.push({
                    ...item.toObject(),
                    reason: `Insufficient stock. Only ${slot.quantity} items available`,
                    availableQuantity: slot.quantity
                });
                continue;
            }
            if (slot.price !== item.unitPrice) {
                invalidItems.push({
                    ...item.toObject(),
                    reason: 'Price has changed',
                    oldPrice: item.unitPrice,
                    newPrice: slot.price
                });
                continue;
            }
            validItems.push(item);
        }
        return {
            isValid: invalidItems.length === 0,
            invalidItems,
            validItems,
            cart
        };
    }
    async getCartSummary(userId) {
        const cart = await this.getCart(userId);
        if (!cart || cart.isEmpty || cart.items.length === 0) {
            return {
                isEmpty: true,
                totalItems: 0,
                totalAmount: 0,
                tax: 0,
                finalAmount: 0,
                items: []
            };
        }
        const itemsByMachine = cart.items.reduce((acc, item) => {
            if (!acc[item.machineId]) {
                acc[item.machineId] = [];
            }
            acc[item.machineId].push(item);
            return acc;
        }, {});
        const taxRate = 0.18;
        const subtotal = cart.totalAmount;
        const tax = Math.round(subtotal * taxRate * 100) / 100;
        const finalAmount = subtotal + tax;
        return {
            isEmpty: false,
            totalItems: cart.totalItems,
            subtotal: subtotal,
            tax: tax,
            finalAmount: finalAmount,
            itemsByMachine,
            items: cart.items,
            lastUpdated: cart.lastUpdated
        };
    }
}
exports.cartService = new CartService();
