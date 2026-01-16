// areaRoute.routes.ts
import express from 'express';
import { AreaController } from '../controllers/arearoute.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireSuperAdmin } from '../middleware/permission.middleware';

const router = express.Router();

// ==================== AUTHENTICATION ====================
// All routes require authentication
router.use(authenticate);

// ==================== SCREEN 1: AREA MANAGEMENT ====================
// Only Super Admin can manage areas

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

router.post('/area/:id/add-sublocation',
  requireSuperAdmin(),
  AreaController.addSubLocation
);


// Toggle area status
router.patch('/area/:id/toggle-status',
  requireSuperAdmin(),
  AreaController.toggleAreaStatus
);


// Get unique filter options (states, districts, campuses, etc.)
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

// Dashboard routes
router.get('/dashboard/data',
  requireSuperAdmin(),
  AreaController.getDashboardData
);

router.get('/dashboard/table',
  requireSuperAdmin(),
  AreaController.getDashboardTable
);


router.get('/dashboard/export',
  requireSuperAdmin(),
  AreaController.exportDashboardData
);
export default router;