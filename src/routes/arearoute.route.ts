import express from 'express';
import { AreaController } from '../controllers/arearoute.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireSuperAdmin } from '../middleware/permission.middleware';

const router = express.Router();

// ==================== AUTHENTICATION ====================
router.use(authenticate);

// ==================== AUDIT TRAIL ROUTES ====================
// Get audit logs for a specific area
router.get('/area/:id/audit-logs',
  requireSuperAdmin(),
  AreaController.getAuditLogs
);

// Get recent activities for dashboard
router.get('/area/audit/recent-activities',
  requireSuperAdmin(),
  AreaController.getRecentActivities
);

// ==================== SCREEN 1: AREA MANAGEMENT ====================

// Create a new area
router.post('/area',
  requireSuperAdmin(),
  AreaController.createAreaRoute
);

// Get all areas with filtering, pagination, and search
router.get('/area',
  requireSuperAdmin(),
  AreaController.getAllAreaRoutes
);

// Get area by ID
router.get('/area/:id',
  requireSuperAdmin(),
  AreaController.getAreaRouteById
);

// Update area by ID
router.put('/area/:id',
  requireSuperAdmin(),
  AreaController.updateAreaRoute
);

// Delete area by ID
router.delete('/area/:id',
  requireSuperAdmin(),
  AreaController.deleteAreaRoute
);

// Add sub-location to area
router.post('/area/:id/add-sublocation',
  requireSuperAdmin(),
  AreaController.addSubLocation
);

// Toggle area status
router.patch('/area/:id/toggle-status',
  requireSuperAdmin(),
  AreaController.toggleAreaStatus
);

// Get unique filter options
router.get('/area/filter/options',
  requireSuperAdmin(),
  AreaController.getFilterOptions
);

// Check if area name exists
router.get('/area/check-exists',
  requireSuperAdmin(),
  AreaController.checkAreaExists
);

// Export areas (CSV/JSON)
router.get('/area/bulk/export',
  requireSuperAdmin(),
  AreaController.exportAreas
);

// ==================== DASHBOARD ROUTES ====================

// Get dashboard data
router.get('/dashboard/data',
  requireSuperAdmin(),
  AreaController.getDashboardData
);

// Get dashboard table data
router.get('/dashboard/table',
  requireSuperAdmin(),
  AreaController.getDashboardTable
);

// Export dashboard data
router.get('/dashboard/export',
  requireSuperAdmin(),
  AreaController.exportDashboardData
);

// Export areas by IDs
router.get('/export/:id',
  requireSuperAdmin(),
  AreaController.exportAreasByIds
);

export default router;