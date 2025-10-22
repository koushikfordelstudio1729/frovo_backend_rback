import { Request, Response, NextFunction } from 'express';
import { AuditLog } from '../models';
import { asyncHandler } from '../utils/asyncHandler.util';
import { logger } from '../utils/logger.util';

interface AuditLogOptions {
  action: string;
  module: string;
  getTarget?: ((req: Request, res: Response) => {
    type: string;
    id: string;
    name?: string;
  }) | undefined;
  captureRequest?: boolean;
  captureResponse?: boolean;
}

export const auditLog = (options: AuditLogOptions) => {
  return asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    // Store original res.json to capture response
    const originalJson = res.json.bind(res);
    let responseData: any = null;
    let requestData: any = null;
    
    // Capture request data if needed
    if (options.captureRequest) {
      requestData = {
        body: req.body,
        query: req.query,
        params: req.params
      };
    }
    
    // Override res.json to capture response
    res.json = function(data: any) {
      responseData = data;
      return originalJson(data);
    };
    
    // Continue with the request
    res.on('finish', async () => {
      try {
        // Only log successful operations (2xx status codes)
        if (res.statusCode >= 200 && res.statusCode < 300 && (req as any).user) {
          const auditData: any = {
            timestamp: new Date(),
            actor: (req as any).user._id,
            action: options.action,
            module: options.module,
            ipAddress: (req as any).clientIp,
            userAgent: (req as any).userAgent
          };
          
          // Get target information
          if (options.getTarget) {
            auditData.target = options.getTarget(req, res);
          } else if (req.params['id']) {
            // Default target extraction from URL params
            auditData.target = {
              type: options.module,
              id: req.params['id']
            };
          }
          
          // Capture changes for update operations
          if (options.action.includes('update') || options.action.includes('edit')) {
            if (options.captureRequest && options.captureResponse) {
              auditData.changes = {
                before: responseData?.data?.before || null,
                after: responseData?.data || requestData?.body || null
              };
            }
          }
          
          // Add metadata
          auditData.metadata = {
            method: req.method,
            url: req.originalUrl,
            statusCode: res.statusCode
          };
          
          // Create audit log entry
          await AuditLog.create(auditData);
          
          // Log to console in development
          if (process.env['NODE_ENV'] === 'development') {
            logger.audit(
              options.action,
              (req as any).user?.email || (req as any).user?._id.toString(),
              auditData.target?.type || options.module,
              auditData
            );
          }
        }
      } catch (error) {
        // Don't fail the request if audit logging fails
        logger.error('Audit logging failed:', error);
      }
    });
    
    return next();
  });
};

// Predefined audit log middleware for common operations
export const auditCreate = (module: string, getTarget?: AuditLogOptions['getTarget']) => {
  const options: AuditLogOptions = {
    action: 'create',
    module,
    captureRequest: true,
    captureResponse: true
  };
  if (getTarget) {
    options.getTarget = getTarget;
  }
  return auditLog(options);
};

export const auditUpdate = (module: string, getTarget?: AuditLogOptions['getTarget']) => {
  const options: AuditLogOptions = {
    action: 'update',
    module,
    captureRequest: true,
    captureResponse: true
  };
  if (getTarget) {
    options.getTarget = getTarget;
  }
  return auditLog(options);
};

export const auditDelete = (module: string, getTarget?: AuditLogOptions['getTarget']) => {
  const options: AuditLogOptions = {
    action: 'delete',
    module,
    captureResponse: true
  };
  if (getTarget) {
    options.getTarget = getTarget;
  }
  return auditLog(options);
};

export const auditLogin = () => {
  return auditLog({
    action: 'login',
    module: 'Auth',
    captureResponse: true
  });
};

export const auditLogout = () => {
  return auditLog({
    action: 'logout',
    module: 'Auth'
  });
};

export const auditAssign = (module: string, getTarget?: AuditLogOptions['getTarget']) => {
  const options: AuditLogOptions = {
    action: 'assign',
    module,
    captureRequest: true,
    captureResponse: true
  };
  if (getTarget) {
    options.getTarget = getTarget;
  }
  return auditLog(options);
};

export const auditRemove = (module: string, getTarget?: AuditLogOptions['getTarget']) => {
  const options: AuditLogOptions = {
    action: 'remove',
    module,
    captureRequest: true,
    captureResponse: true
  };
  if (getTarget) {
    options.getTarget = getTarget;
  }
  return auditLog(options);
};

export const auditApprove = (module: string, getTarget?: AuditLogOptions['getTarget']) => {
  const options: AuditLogOptions = {
    action: 'approve',
    module,
    captureRequest: true,
    captureResponse: true
  };
  if (getTarget) {
    options.getTarget = getTarget;
  }
  return auditLog(options);
};

export const auditReject = (module: string, getTarget?: AuditLogOptions['getTarget']) => {
  const options: AuditLogOptions = {
    action: 'reject',
    module,
    captureRequest: true,
    captureResponse: true
  };
  if (getTarget) {
    options.getTarget = getTarget;
  }
  return auditLog(options);
};