export interface AddToCartData {
    productId: string;
    machineId: string;
    slotNumber: string;
    quantity: number;
}
declare class CartService {
    getCart(userId: string): Promise<import("mongoose").Document<unknown, {}, import("../models/Cart.model").ICart, {}, {}> & import("../models/Cart.model").ICart & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }>;
    addToCart(userId: string, cartData: AddToCartData): Promise<(import("mongoose").Document<unknown, {}, import("../models/Cart.model").ICart, {}, {}> & import("../models/Cart.model").ICart & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    updateCartItem(userId: string, productId: string, machineId: string, slotNumber: string, quantity: number): Promise<(import("mongoose").Document<unknown, {}, import("../models/Cart.model").ICart, {}, {}> & import("../models/Cart.model").ICart & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    removeFromCart(userId: string, productId: string, machineId: string, slotNumber: string): Promise<(import("mongoose").Document<unknown, {}, import("../models/Cart.model").ICart, {}, {}> & import("../models/Cart.model").ICart & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    clearCart(userId: string): Promise<(import("mongoose").Document<unknown, {}, import("../models/Cart.model").ICart, {}, {}> & import("../models/Cart.model").ICart & Required<{
        _id: unknown;
    }> & {
        __v: number;
    }) | null>;
    validateCartItems(userId: string): Promise<{
        isValid: boolean;
        invalidItems: never[];
        validItems: never[];
        cart?: never;
    } | {
        isValid: boolean;
        invalidItems: any[];
        validItems: import("../models/Cart.model").ICartItem[];
        cart: import("mongoose").Document<unknown, {}, import("../models/Cart.model").ICart, {}, {}> & import("../models/Cart.model").ICart & Required<{
            _id: unknown;
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
        items: never[];
        subtotal?: never;
        itemsByMachine?: never;
        lastUpdated?: never;
    } | {
        isEmpty: boolean;
        totalItems: number;
        subtotal: number;
        tax: number;
        finalAmount: number;
        itemsByMachine: any;
        items: import("../models/Cart.model").ICartItem[];
        lastUpdated: Date;
        totalAmount?: never;
    }>;
}
export declare const cartService: CartService;
export {};
//# sourceMappingURL=cart.service.d.ts.map