import { Cart } from "../models/Cart.model";
import { Product } from "../models/Product.model";
import { VendingMachine } from "../models/VendingMachine.model";
import { Types } from "mongoose";

export interface AddToCartData {
  productId: string;
  machineId: string;
  slotNumber: string;
  quantity: number;
}

class CartService {
  async getCart(userId: string) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    let cart = await Cart.findOne({ userId, isActive: true }).populate("items.product");

    if (!cart) {
      cart = new Cart({ userId, items: [] });
      await cart.save();
    }

    return cart;
  }

  async addToCart(userId: string, cartData: AddToCartData) {
    if (!Types.ObjectId.isValid(userId)) {
      throw new Error("Invalid user ID");
    }

    if (!Types.ObjectId.isValid(cartData.productId)) {
      throw new Error("Invalid product ID");
    }

    const product = await Product.findById(cartData.productId);
    if (!product) {
      throw new Error("Product not found");
    }

    const machine = await VendingMachine.findOne({ machineId: cartData.machineId });
    if (!machine) {
      throw new Error("Vending machine not found");
    }

    const slot = machine.productSlots.find(
      slot =>
        slot.slotNumber === cartData.slotNumber && slot.product.toString() === cartData.productId
    );

    if (!slot) {
      throw new Error("Product not available in this slot");
    }

    if (slot.quantity < cartData.quantity) {
      throw new Error(`Insufficient stock. Only ${slot.quantity} items available`);
    }

    let cart = await Cart.findOne({ userId, isActive: true });
    if (!cart) {
      cart = new Cart({ userId, items: [] });
    }

    await (cart as any).addItem({
      product: new Types.ObjectId(cartData.productId),
      productName: product.name,
      productPrice: product.price,
      machineId: cartData.machineId,
      slotNumber: cartData.slotNumber,
      quantity: cartData.quantity,
      unitPrice: slot?.price || 0,
    });

    return await Cart.findById(cart?._id).populate("items.product");
  }

  async updateCartItem(
    userId: string,
    productId: string,
    machineId: string,
    slotNumber: string,
    quantity: number
  ) {
    const cart = await Cart.findOne({ userId, isActive: true });
    if (!cart) {
      throw new Error("Cart not found");
    }

    if (quantity === 0) {
      return this.removeFromCart(userId, productId, machineId, slotNumber);
    }

    const machine = await VendingMachine.findOne({ machineId });
    if (!machine) {
      throw new Error("Vending machine not found");
    }

    const slot = machine.productSlots.find(
      slot => slot.slotNumber === slotNumber && slot.product.toString() === productId
    );

    if (!slot || slot.quantity < quantity) {
      throw new Error(`Insufficient stock. Only ${slot?.quantity || 0} items available`);
    }

    await (cart as any)["updateItemQuantity"](productId, machineId, slotNumber, quantity);
    return await Cart.findById(cart._id).populate("items.product");
  }

  async removeFromCart(userId: string, productId: string, machineId: string, slotNumber: string) {
    const cart = await Cart.findOne({ userId, isActive: true });
    if (!cart) {
      throw new Error("Cart not found");
    }

    await (cart as any)["removeItem"](productId, machineId, slotNumber);
    return await Cart.findById(cart._id).populate("items.product");
  }

  async clearCart(userId: string) {
    const cart = await Cart.findOne({ userId, isActive: true });
    if (!cart) {
      throw new Error("Cart not found");
    }

    await (cart as any)["clearCart"]();
    return await Cart.findById(cart._id).populate("items.product");
  }

  async validateCartItems(userId: string) {
    const cart = await Cart.findOne({ userId, isActive: true }).populate("items.product");

    if (!cart || (cart as any).isEmpty || cart.items.length === 0) {
      return { isValid: true, invalidItems: [], validItems: [] };
    }

    const invalidItems = [];
    const validItems = [];

    for (const item of cart.items) {
      const machine = await VendingMachine.findOne({ machineId: item.machineId });

      if (!machine) {
        invalidItems.push({
          ...(item as any).toObject(),
          reason: "Vending machine not available",
        });
        continue;
      }

      const slot = machine.productSlots.find(
        slot =>
          slot.slotNumber === item.slotNumber &&
          slot.product.toString() === (item.product as any)._id.toString()
      );

      if (!slot) {
        invalidItems.push({
          ...(item as any).toObject(),
          reason: "Product no longer available in this slot",
        });
        continue;
      }

      if (slot.quantity < item.quantity) {
        invalidItems.push({
          ...(item as any).toObject(),
          reason: `Insufficient stock. Only ${slot.quantity} items available`,
          availableQuantity: slot.quantity,
        });
        continue;
      }

      if (slot.price !== item.unitPrice) {
        invalidItems.push({
          ...(item as any).toObject(),
          reason: "Price has changed",
          oldPrice: item.unitPrice,
          newPrice: slot.price,
        });
        continue;
      }

      validItems.push(item);
    }

    return {
      isValid: invalidItems.length === 0,
      invalidItems,
      validItems,
      cart,
    };
  }

  async getCartSummary(userId: string) {
    const cart = await this.getCart(userId);

    if (!cart || (cart as any).isEmpty || cart.items.length === 0) {
      return {
        isEmpty: true,
        totalItems: 0,
        totalAmount: 0,
        tax: 0,
        finalAmount: 0,
        items: [],
      };
    }

    const itemsByMachine = cart.items.reduce((acc: any, item: any) => {
      if (!acc[item.machineId]) {
        acc[item.machineId] = [];
      }
      acc[item.machineId].push(item as any);
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
      lastUpdated: cart.lastUpdated,
    };
  }
}

export const cartService = new CartService();
