import { Request, Response } from "express";
import { authService } from "../services/auth.service";
import { asyncHandler } from "../utils/asyncHandler.util";
import { sendSuccess, sendCreated, sendError } from "../utils/response.util";
import { MESSAGES } from "../config/constants";

// Cookie configuration
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env["NODE_ENV"] === "production",
  sameSite: "strict" as const,
  path: "/",
};

const ACCESS_TOKEN_COOKIE_NAME = "accessToken";
const REFRESH_TOKEN_COOKIE_NAME = "refreshToken";

// Helper function to set tokens in cookies
const setCookieTokens = (res: Response, accessToken: string, refreshToken: string) => {
  // Set access token cookie (expires in 1 day)
  res.cookie(ACCESS_TOKEN_COOKIE_NAME, accessToken, {
    ...COOKIE_OPTIONS,
    maxAge: 24 * 60 * 60 * 1000, // 1 day in milliseconds
  });

  // Set refresh token cookie (expires in 7 days)
  res.cookie(REFRESH_TOKEN_COOKIE_NAME, refreshToken, {
    ...COOKIE_OPTIONS,
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  });
};

// Helper function to clear cookies
const clearCookieTokens = (res: Response) => {
  res.clearCookie(ACCESS_TOKEN_COOKIE_NAME, COOKIE_OPTIONS);
  res.clearCookie(REFRESH_TOKEN_COOKIE_NAME, COOKIE_OPTIONS);
};

export const register = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    // Extract device info
    const deviceInfo = {
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get("User-Agent") || undefined,
      deviceInfo: req.get("X-Device-Info") || undefined,
    };

    // For Super Admin registration, use a default createdBy (will be set to the user's own ID)
    const result = await authService.register(
      { name, email, password },
      req.body.createdBy,
      deviceInfo
    );

    // Set tokens in cookies
    setCookieTokens(res, result.accessToken, result.refreshToken);

    return sendCreated(res, result, MESSAGES.REGISTER_SUCCESS);
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Registration failed", 500);
    }
  }
});

export const registerCustomer = asyncHandler(async (req: Request, res: Response) => {
  const { name, email, password } = req.body;

  try {
    // Extract device info
    const deviceInfo = {
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get("User-Agent") || undefined,
      deviceInfo: req.get("X-Device-Info") || undefined,
    };

    const result = await authService.registerCustomer({ name, email, password }, deviceInfo);

    // Set tokens in cookies
    setCookieTokens(res, result.accessToken, result.refreshToken);

    return sendCreated(res, result, "Customer registration successful");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Customer registration failed", 500);
    }
  }
});

export const login = asyncHandler(async (req: Request, res: Response) => {
  const { email, password } = req.body;

  try {
    // Extract device info
    const deviceInfo = {
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get("User-Agent") || undefined,
      deviceInfo: req.get("X-Device-Info") || undefined,
    };

    const result = await authService.login({ email, password }, deviceInfo);

    // Set tokens in cookies
    setCookieTokens(res, result.accessToken, result.refreshToken);

    return sendSuccess(res, result, MESSAGES.LOGIN_SUCCESS);
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 401);
    } else {
      return sendError(res, MESSAGES.INVALID_CREDENTIALS, 401);
    }
  }
});

export const logout = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }

  try {
    // Get refresh token from request body or header
    const refreshToken = req.body.refreshToken || req.get("X-Refresh-Token");

    await authService.logout(req.user._id.toString(), refreshToken);

    // Clear cookies
    clearCookieTokens(res);

    return sendSuccess(res, null, MESSAGES.LOGOUT_SUCCESS);
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Logout failed", 500);
    }
  }
});

export const logoutFromAllDevices = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }

  try {
    await authService.logoutFromAllDevices(req.user._id.toString());

    // Clear cookies
    clearCookieTokens(res);

    return sendSuccess(res, null, "Logged out from all devices successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Logout failed", 500);
    }
  }
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
      permissions,
    });
  } catch (error) {
    return sendError(res, "Failed to get user data", 500);
  }
});

export const refreshToken = asyncHandler(async (req: Request, res: Response) => {
  const { refreshToken } = req.body;

  try {
    // Extract device info
    const deviceInfo = {
      ipAddress: req.ip || req.socket.remoteAddress,
      userAgent: req.get("User-Agent") || undefined,
      deviceInfo: req.get("X-Device-Info") || undefined,
    };

    const tokens = await authService.refreshToken(refreshToken, deviceInfo);

    // Set new tokens in cookies
    setCookieTokens(res, tokens.accessToken, tokens.refreshToken);

    return sendSuccess(res, tokens, "Token refreshed successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 401);
    } else {
      return sendError(res, "Invalid refresh token", 401);
    }
  }
});

export const changePassword = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }

  const { currentPassword, newPassword } = req.body;

  try {
    await authService.changePassword(req.user._id.toString(), currentPassword, newPassword);

    return sendSuccess(res, null, "Password changed successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Failed to change password", 500);
    }
  }
});

export const enableMFA = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }

  try {
    const result = await authService.enableMFA(req.user._id.toString());

    return sendSuccess(res, result, "MFA enabled successfully");
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "Failed to enable MFA", 500);
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
      return sendSuccess(res, { valid: true }, "MFA token verified");
    } else {
      return sendError(res, "Invalid MFA token", 400);
    }
  } catch (error) {
    if (error instanceof Error) {
      return sendError(res, error.message, 400);
    } else {
      return sendError(res, "MFA verification failed", 500);
    }
  }
});

export const disableMFA = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }

  try {
    await authService.disableMFA(req.user._id.toString());

    return sendSuccess(res, null, "MFA disabled successfully");
  } catch (error) {
    return sendError(res, "Failed to disable MFA", 500);
  }
});
