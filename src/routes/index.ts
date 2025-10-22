import { Router } from 'express';
import authRoutes from './auth.routes';
import userRoutes from './user.routes';
import roleRoutes from './role.routes';
import departmentRoutes from './department.routes';
import permissionRoutes from './permission.routes';
import accessRequestRoutes from './accessRequest.routes';
import auditLogRoutes from './auditLog.routes';
import securityRoutes from './security.routes';

const router = Router();

// Health check route
router.get('/health', (_req, res) => {
  res.json({
    success: true,
    message: 'RBAC API is running',
    timestamp: new Date().toISOString(),
    version: '1.0.0'
  });
});

// API routes
router.use('/auth', authRoutes);
router.use('/users', userRoutes);
router.use('/roles', roleRoutes);
router.use('/departments', departmentRoutes);
router.use('/permissions', permissionRoutes);
router.use('/access-requests', accessRequestRoutes);
router.use('/audit-logs', auditLogRoutes);
router.use('/security', securityRoutes);

export default router;