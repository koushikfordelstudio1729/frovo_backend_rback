import { Types } from "mongoose";
export interface AddToCartData {
    productId: string;
    machineId: string;
    slotNumber: string;
    quantity: number;
}
declare class CartService {
    getCart(userId: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Cart.model").ICart, {}, {}> & import("../models/Cart.model").ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    addToCart(userId: string, cartData: AddToCartData): Promise<import("mongoose").Document<unknown, {}, import("../models/Cart.model").ICart, {}, {}> & import("../models/Cart.model").ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    updateCartItem(userId: string, productId: string, machineId: string, slotNumber: string, quantity: number): Promise<import("mongoose").Document<unknown, {}, import("../models/Cart.model").ICart, {}, {}> & import("../models/Cart.model").ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    removeFromCart(userId: string, productId: string, machineId: string, slotNumber: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Cart.model").ICart, {}, {}> & import("../models/Cart.model").ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    clearCart(userId: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Cart.model").ICart, {}, {}> & import("../models/Cart.model").ICart & Required<{
        _id: Types.ObjectId;
    }> & {
        __v: number;
    }>;
    validateCartItems(userId: string): Promise<{
        isValid: boolean;
        invalidItems: any[];
        validItems: any[];
        cart?: undefined;
    } | {
        isValid: boolean;
        invalidItems: any[];
        validItems: any[];
        cart: import("mongoose").Document<unknown, {}, import("../models/Cart.model").ICart, {}, {}> & import("../models/Cart.model").ICart & Required<{
            _id: Types.ObjectId;
        }> & {
            __v: number;
        };
    }>;
    getCartSummary(userId: string): Promise<{
        isEmpty: boolean;
        totalItems: number;
        totalAmount: number;
        tax: number;
        finalAmount: number;
        items: any[];
        subtotal?: undefined;
        itemsByMachine?: undefined;
        lastUpdated?: undefined;
    } | {
        isEmpty: boolean;
        totalItems: number;
        subtotal: number;
        tax: number;
        finalAmount: number;
        itemsByMachine: any;
        items: import("../models/Cart.model").ICartItem[];
        lastUpdated: Date;
        totalAmount?: undefined;
    }>;
}
export declare const cartService: CartService;
export {};
//# sourceMappingURL=cart.service.d.ts.map