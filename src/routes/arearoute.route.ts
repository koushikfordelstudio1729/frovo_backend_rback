// areaRoute.routes.ts
import express from 'express';
import { AreaRouteController } from '../controllers/arearoute.controller';

const router = express.Router();

// Area Routes
router.post('/area', AreaRouteController.createArea);           // Create area
router.get('/area', AreaRouteController.getAllAreas);           // Get all areas
router.get('/area/:id', AreaRouteController.getAreaById);       // Get area by ID

// Route Routes
router.post('/route', AreaRouteController.createRoute);         // Create route
router.get('/route', AreaRouteController.getAllRoutes);         // Get all routes
router.get('/route/:id', AreaRouteController.getRouteById);     // Get route by ID
router.get('/route/area/:areaId', AreaRouteController.getRouteById); // Get routes by area ID

// Statistics Route
router.get('/statistics', AreaRouteController.getStatistics);   // Get statistics

export default router;