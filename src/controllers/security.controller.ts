import { Request, Response } from 'express';
import { SecurityConfig } from '../models';
import { asyncHandler } from '../utils/asyncHandler.util';
import { sendSuccess, sendError } from '../utils/response.util';
import { MESSAGES } from '../config/constants';

export const getSecurityConfig = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }
  
  try {
    // Use a default organization ID for now
    const config = await SecurityConfig.findOne({ organizationId: req.user._id });
    
    if (!config) {
      // Create default config if none exists
      const defaultConfig = await SecurityConfig.create({
        organizationId: req.user._id,
        updatedBy: req.user._id
      });
      
      return sendSuccess(res, defaultConfig);
    }
    
    return sendSuccess(res, config);
  } catch (error) {
    return sendError(res, 'Failed to get security configuration', 500);
  }
});

export const updateSecurityConfig = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, MESSAGES.UNAUTHORIZED, 401);
  }
  
  try {
    const config = await SecurityConfig.findOneAndUpdate(
      { organizationId: req.user._id },
      {
        ...req.body,
        updatedBy: req.user._id
      },
      {
        new: true,
        upsert: true,
        runValidators: true
      }
    );
    
    return sendSuccess(res, config, MESSAGES.UPDATED);
  } catch (error) {
    return sendError(res, 'Failed to update security configuration', 500);
  }
});