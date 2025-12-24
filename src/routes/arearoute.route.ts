// areaRoute.routes.ts
import express from 'express';
import { AreaRouteController } from '../controllers/arearoute.controller';
import { authenticate } from '../middleware/auth.middleware';
import { requireSuperAdmin } from '../middleware/permission.middleware';

const router = express.Router();

// ==================== AUTHENTICATION ====================
// All routes require authentication
router.use(authenticate);

// ==================== SCREEN 1: AREA MANAGEMENT ====================
// Only Super Admin can manage areas
router.post('/area',
  requireSuperAdmin(),
  AreaRouteController.createArea
);

router.get('/area',
  requireSuperAdmin(),
  AreaRouteController.getAllAreas
);

router.get('/area/:id',
  requireSuperAdmin(),
  AreaRouteController.getAreaById
);

router.put('/area/:id',
  requireSuperAdmin(),
  AreaRouteController.updateArea
);

router.delete('/area/:id',
  requireSuperAdmin(),
  AreaRouteController.deleteArea
);

// ==================== SCREEN 2: ROUTE PLANNING ====================
// Only Super Admin can manage routes
router.post('/route',
  requireSuperAdmin(),
  AreaRouteController.createRoute
);

router.get('/route',
  requireSuperAdmin(),
  AreaRouteController.getAllRoutes
);

router.get('/route/area/:areaId',
  requireSuperAdmin(),
  AreaRouteController.getRoutesByAreaId
);

router.get('/route/:id',
  requireSuperAdmin(),
  AreaRouteController.getRouteById
);

router.put('/route/:id',
  requireSuperAdmin(),
  AreaRouteController.updateRoute
);

router.delete('/route/:id',
  requireSuperAdmin(),
  AreaRouteController.deleteRoute
);

// ==================== SCREEN 3: ROUTE TRACKING ====================
// Only Super Admin can access tracking (for now)
router.post('/tracking/check-in',
  requireSuperAdmin(),
  AreaRouteController.checkIn
);

router.get('/tracking/progress/:routeId',
  requireSuperAdmin(),
  AreaRouteController.getRouteProgress
);

router.post('/tracking/reassign',
  requireSuperAdmin(),
  AreaRouteController.reassignMachines
);

// ==================== ANALYTICS & STATISTICS ====================
router.get('/statistics',
  requireSuperAdmin(),
  AreaRouteController.getStatistics
);

export default router;