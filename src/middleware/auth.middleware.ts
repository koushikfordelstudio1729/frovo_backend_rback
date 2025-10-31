import { Request, Response, NextFunction } from 'express';
import { User, UserStatus } from '../models';
import { verifyAccessToken } from '../utils/jwt.util';
import { sendUnauthorized, sendForbidden } from '../utils/response.util';
import { asyncHandler } from '../utils/asyncHandler.util';
import { MESSAGES } from '../config/constants';

export const authenticate = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
  // Get token from Authorization header or cookies
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    // Get token from Authorization header
    token = authHeader.substring(7); // Remove 'Bearer ' prefix
  } else {
    // Get token from cookies
    token = req.cookies?.['accessToken'];
  }
  
  if (!token) {
    return sendUnauthorized(res, MESSAGES.UNAUTHORIZED);
  }
  
  try {
    // Verify token
    const decoded = verifyAccessToken(token);
    
    // Find user by ID and populate roles and departments
    const user = await User.findById(decoded.id)
      .populate('roles')
      .populate('departments'); // Don't include password or refreshTokens for auth
    
    if (!user) {
      return sendUnauthorized(res, MESSAGES.USER_NOT_FOUND);
    }
    
    // Check if user is active
    if (user.status !== UserStatus.ACTIVE) {
      return sendForbidden(res, 'Account is inactive or suspended');
    }
    
    // Attach user to request object
    (req as any).user = user;
    
    // Capture client IP and User Agent for audit logging
    (req as any).clientIp = req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for'] as string;
    (req as any).userAgent = req.headers['user-agent'];
    
    return next();
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === 'Token has expired') {
        return sendUnauthorized(res, MESSAGES.TOKEN_EXPIRED);
      } else if (error.message === 'Invalid token') {
        return sendUnauthorized(res, MESSAGES.TOKEN_INVALID);
      }
    }
    
    return sendUnauthorized(res, MESSAGES.UNAUTHORIZED);
  }
});

// Optional authentication - doesn't fail if no token
export const optionalAuth = asyncHandler(async (req: Request, _res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  let token: string | undefined;
  
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  } else {
    token = req.cookies?.['accessToken'];
  }
  
  if (!token) {
    return next();
  }
  
  try {
    const decoded = verifyAccessToken(token);
    const user = await User.findById(decoded.id)
      .populate('roles')
      .populate('departments');
    
    if (user && user.status === UserStatus.ACTIVE) {
      (req as any).user = user;
      (req as any).clientIp = req.ip || req.socket.remoteAddress || req.headers['x-forwarded-for'] as string;
      (req as any).userAgent = req.headers['user-agent'];
    }
  } catch (error) {
    // Ignore token errors for optional auth
  }
  
  return next();
});