/// <reference path="../types/express.d.ts" />
import { Request, Response } from 'express';
import { authService } from '../services/auth.service';
import { asyncHandler } from '../utils/asyncHandler.util';
import { sendSuccess, sendCreated, sendError } from '../utils/response.util';
import { MESSAGES } from '../config/constants';

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;
  
  try {
    // For Super Admin registration, use a default createdBy (will be set to the user's own ID)
    const result = await authService.register({ name, email, password }, req.body.createdBy);
    
    return sendCreated(res, result, MESSAGES.REGISTER_SUCCESS);
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Registration failed', 500);
    }
  }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;
  
  try {
    const result = await authService.login({ email, password });
    
    return sendSuccess(res, result, MESSAGES.LOGIN_SUCCESS);
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 401);
    } else {
      return sendError(res, MESSAGES.INVALID_CREDENTIALS, 401);
    }
  }
});

export const logout = asyncHandler(async (_req: Request, res: Response) => {
  // For JWT-based auth, logout is handled client-side by removing the token
  // We could implement a token blacklist here if needed
  return sendSuccess(res, null, MESSAGES.LOGOUT_SUCCESS);
});

export const getCurrentUser = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }
  
  try {
    const user = await authService.getCurrentUser(req.user._id.toString());
    const permissions = await req.user.getPermissions();
    
    return sendSuccess(res, {
      user,
      permissions
    });
  } catch (error) {
    return sendError(res, 'Failed to get user data', 500);
  }
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;
  
  try {
    const tokens = await authService.refreshToken(refreshToken);
    
    return sendSuccess(res, tokens, 'Token refreshed successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 401);
    } else {
      return sendError(res, 'Invalid refresh token', 401);
    }
  }
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }
  
  const { currentPassword, newPassword } = req.body;
  
  try {
    await authService.changePassword(
      req.user._id.toString(),
      currentPassword,
      newPassword
    );
    
    return sendSuccess(res, null, 'Password changed successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to change password', 500);
    }
  }
});

export const enableMFA = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }
  
  try {
    const result = await authService.enableMFA(req.user._id.toString());
    
    return sendSuccess(res, result, 'MFA enabled successfully');
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'Failed to enable MFA', 500);
    }
  }
});

export const verifyMFA = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }
  
  const { token } = req.body;
  
  try {
    const isValid = await authService.verifyMFA(req.user._id.toString(), token);
    
    if (isValid) {
      return sendSuccess(res, { valid: true }, 'MFA token verified');
    } else {
      return sendError(res, 'Invalid MFA token', 400);
    }
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, 'MFA verification failed', 500);
    }
  }
});

export const disableMFA = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }
  
  try {
    await authService.disableMFA(req.user._id.toString());
    
    return sendSuccess(res, null, 'MFA disabled successfully');
  } catch (error) {
    return sendError(res, 'Failed to disable MFA', 500);
  }
});