import * as jwt from 'jsonwebtoken';
import { Types } from 'mongoose';

export interface JWTPayload extends jwt.JwtPayload {
  id: string;
  type: 'access' | 'refresh';
}

export const generateAccessToken = (userId: Types.ObjectId | string): string => {
  const payload = { 
    id: userId.toString(), 
    type: 'access' as const
  };
  
  const secret = process.env['JWT_ACCESS_SECRET'];
  if (!secret) {
    throw new Error('JWT_ACCESS_SECRET is not defined');
  }
  
  return jwt.sign(payload, secret, { 
    expiresIn: process.env['JWT_ACCESS_EXPIRES_IN'] || '1d',
    issuer: 'frovo-rbac',
    audience: 'frovo-users'
  } as jwt.SignOptions);
};

export const generateRefreshToken = (userId: Types.ObjectId | string): string => {
  const payload = { 
    id: userId.toString(), 
    type: 'refresh' as const
  };
  
  const secret = process.env['JWT_REFRESH_SECRET'];
  if (!secret) {
    throw new Error('JWT_REFRESH_SECRET is not defined');
  }
  
  return jwt.sign(payload, secret, { 
    expiresIn: process.env['JWT_REFRESH_EXPIRES_IN'] || '7d',
    issuer: 'frovo-rbac',
    audience: 'frovo-users'
  } as jwt.SignOptions);
};

export const verifyAccessToken = (token: string): JWTPayload => {
  try {
    const secret = process.env['JWT_ACCESS_SECRET'];
    if (!secret) {
      throw new Error('JWT_ACCESS_SECRET is not defined');
    }
    
    const decoded = jwt.verify(token, secret) as JWTPayload;
    
    if (decoded.type !== 'access') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid token');
    } else {
      throw error;
    }
  }
};

export const verifyRefreshToken = (token: string): JWTPayload => {
  try {
    const secret = process.env['JWT_REFRESH_SECRET'];
    if (!secret) {
      throw new Error('JWT_REFRESH_SECRET is not defined');
    }
    
    const decoded = jwt.verify(token, secret) as JWTPayload;
    
    if (decoded.type !== 'refresh') {
      throw new Error('Invalid token type');
    }
    
    return decoded;
  } catch (error) {
    if (error instanceof jwt.TokenExpiredError) {
      throw new Error('Refresh token has expired');
    } else if (error instanceof jwt.JsonWebTokenError) {
      throw new Error('Invalid refresh token');
    } else {
      throw error;
    }
  }
};

export const generateTokenPair = (userId: Types.ObjectId | string) => {
  return {
    accessToken: generateAccessToken(userId),
    refreshToken: generateRefreshToken(userId)
  };
};