import { Request, Response } from 'express';
import { permissionService } from '../services/permission.service';
import { asyncHandler } from '../utils/asyncHandler.util';
import { sendSuccess, sendError } from '../utils/response.util';

export const getPermissions = asyncHandler(async (_req: Request, res: Response) => {
  try {
    const permissions = await permissionService.getPermissionsGrouped();
    
    return sendSuccess(res, { permissions });
  } catch (error) {
    return sendError(res, 'Failed to get permissions', 500);
  }
});

export const checkPermission = asyncHandler(async (req: Request, res: Response) => {
  const { permission, userId } = req.query;
  
  if (!permission) {
    return sendError(res, 'Permission parameter is required', 400);
  }
  
  const targetUserId = userId || req.user?._id.toString();
  
  if (!targetUserId) {
    return sendError(res, 'User ID is required', 400);
  }
  
  try {
    const result = await permissionService.checkUserPermission(
      targetUserId as string,
      permission as string
    );
    
    return sendSuccess(res, result);
  } catch (error) {
    return sendError(res, 'Failed to check permission', 500);
  }
});

export const getPermissionsByModule = asyncHandler(async (req: Request, res: Response) => {
  const module = req.params.module as string;
  
  if (!module) {
    return sendError(res, 'Module parameter is required', 400);
  }
  
  try {
    const permissions = await permissionService.getPermissionsByModule(module);
    
    return sendSuccess(res, permissions);
  } catch (error) {
    return sendError(res, 'Failed to get permissions by module', 500);
  }
});

export const searchPermissions = asyncHandler(async (req: Request, res: Response) => {
  const { q } = req.query;
  
  if (!q) {
    return sendError(res, 'Search query is required', 400);
  }
  
  try {
    const permissions = await permissionService.searchPermissions(q as string);
    
    return sendSuccess(res, permissions);
  } catch (error) {
    return sendError(res, 'Failed to search permissions', 500);
  }
});

export const getPermissionStats = asyncHandler(async (_req: Request, res: Response) => {
  try {
    const stats = await permissionService.getPermissionStats();
    
    return sendSuccess(res, stats);
  } catch (error) {
    return sendError(res, 'Failed to get permission stats', 500);
  }
});