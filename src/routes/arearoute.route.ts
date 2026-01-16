import express from 'express';
import { AreaController } from '../controllers/arearoute.controller';
import { authenticate } from '../middleware/auth.middleware';
import { authorize } from '../middleware/authorize.middleware';
//import { requireSuperAdmin } from '../middleware/permission.middleware';

const SUPER_ADMIN_ONLY = ['super_admin'];
const MANAGEMENT = ['super_admin', 'ops_manager', ''];

const router = express.Router();

// ==================== AUTHENTICATION ====================
router.use(authenticate);

// ==================== AUDIT TRAIL ROUTES ====================
// Get audit logs for a specific area
router.get('/area/:id/audit-logs',
  authorize(SUPER_ADMIN_ONLY),
  AreaController.getAuditLogs
);
router.get('/area/:id/audit-logs/export',
  authorize(SUPER_ADMIN_ONLY),
  AreaController.exportAreaAuditLogs
);

// Get recent activities for dashboard
router.get('/area/audit/recent-activities',
  authorize(SUPER_ADMIN_ONLY),
  AreaController.getRecentActivities
);
router.get('/area/audit/recent-activities/export',
  authorize(SUPER_ADMIN_ONLY),
  AreaController.exportRecentAuditActivities
);

// ==================== SCREEN 1: AREA MANAGEMENT ====================

// Create a new area
router.post('/area',
  authorize(MANAGEMENT),
  AreaController.createAreaRoute
);

// Get all areas with filtering, pagination, and search
router.get('/area',
  authorize(MANAGEMENT),
  AreaController.getAllAreaRoutes
);

// Get area by ID
router.get('/area/:id',
  authorize(MANAGEMENT),
  AreaController.getAreaRouteById
);

// Update area by ID
router.put('/area/:id',
  authorize(MANAGEMENT),
  AreaController.updateAreaRoute
);

// Delete area by ID
router.delete('/area/:id',
  authorize(MANAGEMENT), 
  AreaController.deleteAreaRoute
);

// Add sub-location to area
router.post('/area/:id/add-sublocation',
  authorize(MANAGEMENT),
  AreaController.addSubLocation
);

// Toggle area status
router.patch('/area/:id/toggle-status',
  authorize(MANAGEMENT),
  AreaController.toggleAreaStatus
);

// Get unique filter options
router.get('/area/filter/options',
  authorize(MANAGEMENT),
  AreaController.getFilterOptions
);

// Check if area name exists
router.get('/area/check-exists',
  authorize(MANAGEMENT),
  AreaController.checkAreaExists
);

// Export areas (CSV/JSON)
router.get('/area/bulk/export',
  authorize(MANAGEMENT),
  AreaController.exportAreas
);

// ==================== DASHBOARD ROUTES ====================

// Get dashboard data
router.get('/dashboard/data',
  authorize(MANAGEMENT),
  AreaController.getDashboardData
);

// Get dashboard table data
router.get('/dashboard/table',
  authorize(MANAGEMENT),
  AreaController.getDashboardTable
);

// Export dashboard data
router.get('/dashboard/export',
  authorize(MANAGEMENT),
  AreaController.exportDashboardData
);

// Export areas by IDs
router.get('/export/:id',
  authorize(MANAGEMENT),
  AreaController.exportAreasByIds
);

export default router;