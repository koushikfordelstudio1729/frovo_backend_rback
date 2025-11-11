// controllers/vendor.controller.ts
import { Request, Response } from 'express';
import asyncHandler from 'express-async-handler';
import { Vendor } from '../models/Vendor.model';
import { sendSuccess, sendError } from '../utils/responseHandlers';

export const getVendors = asyncHandler(async (_req: Request, res: Response) => {
  try {
    const vendors = await Vendor.find({})
      .populate('createdBy', 'name email')
      .sort({ name: 1 });
    
    sendSuccess(res, vendors, 'Vendors retrieved successfully');
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to get vendors', 500);
  }
});

export const createVendor = asyncHandler(async (req: Request, res: Response) => {
  if (!req.user) {
    return sendError(res, 'Unauthorized', 401);
  }

  try {
    const vendor = await Vendor.create({
      ...req.body,
      createdBy: req.user._id
    });
    
    sendSuccess(res, vendor, 'Vendor created successfully', 201);
  } catch (error) {
    sendError(res, error instanceof Error ? error.message : 'Failed to create vendor', 500);
  }
});