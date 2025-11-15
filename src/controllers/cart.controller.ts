import { Request, Response } from 'express';
import { cartService, AddToCartData } from '../services/cart.service';
import { asyncHandler } from '../utils/asyncHandler.util';
import { sendSuccess, sendError } from '../utils/response.util';

export const getCart = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const cart = await cartService.getCart(userId);
    
    return sendSuccess(res, cart, 'Cart retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to retrieve cart', 500);
    }
  }
});

export const addToCart = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const { productId, machineId, slotNumber, quantity } = req.body;

    if (!productId || !machineId || !slotNumber || !quantity) {
      return sendError(res, 'Product ID, machine ID, slot number, and quantity are required', 400);
    }

    if (quantity <= 0 || !Number.isInteger(quantity)) {
      return sendError(res, 'Quantity must be a positive integer', 400);
    }

    const cartData: AddToCartData = {
      productId,
      machineId,
      slotNumber,
      quantity
    };

    const cart = await cartService.addToCart(userId, cartData);
    
    return sendSuccess(res, cart, 'Item added to cart successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to add item to cart', 500);
    }
  }
});

export const updateCartItem = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const { productId, machineId, slotNumber } = req.params;
    const { quantity } = req.body;

    if (!productId || !machineId || !slotNumber) {
      return sendError(res, 'Product ID, machine ID, and slot number are required', 400);
    }

    if (quantity === undefined || quantity < 0 || !Number.isInteger(quantity)) {
      return sendError(res, 'Quantity must be a non-negative integer', 400);
    }

    const cart = await cartService.updateCartItem(userId, productId, machineId, slotNumber, quantity);
    
    return sendSuccess(res, cart, 'Cart item updated successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to update cart item', 500);
    }
  }
});

export const removeFromCart = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const { productId, machineId, slotNumber } = req.params;

    if (!productId || !machineId || !slotNumber) {
      return sendError(res, 'Product ID, machine ID, and slot number are required', 400);
    }

    const cart = await cartService.removeFromCart(userId, productId, machineId, slotNumber);
    
    return sendSuccess(res, cart, 'Item removed from cart successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to remove item from cart', 500);
    }
  }
});

export const clearCart = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const cart = await cartService.clearCart(userId);
    
    return sendSuccess(res, cart, 'Cart cleared successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to clear cart', 500);
    }
  }
});

export const validateCart = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const validation = await cartService.validateCartItems(userId);
    
    return sendSuccess(res, validation, 'Cart validation completed');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to validate cart', 500);
    }
  }
});

export const getCartSummary = asyncHandler(async (req: Request, res: Response) => {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return sendError(res, 'User not authenticated', 401);
    }

    const summary = await cartService.getCartSummary(userId);
    
    return sendSuccess(res, summary, 'Cart summary retrieved successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to get cart summary', 500);
    }
  }
});