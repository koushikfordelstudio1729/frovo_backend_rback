import { Router } from "express";
import { fieldOpsController } from "../controllers/fieldops.controller";
import { authenticate } from "../middleware/auth.middleware";
import { validate } from "../middleware/validation.middleware";
import {
  verifyMachineSchema,
  markPickupCollectedSchema,
  createHandoverSchema,
  submitRefillSchema,
  skipMachineSchema,
  raiseIssueSchema,
  workSummaryQuerySchema,
  getTasksQuerySchema,
  getNotificationsQuerySchema,
  updateProfileSchema,
} from "../validators/fieldops.validator";

const router = Router();

// All routes require authentication
router.use(authenticate);

// ==================== DASHBOARD ====================
router.get("/dashboard", fieldOpsController.getDashboard);

// ==================== TASKS ====================
router.get(
  "/tasks",
  validate({ query: getTasksQuerySchema.shape.query }),
  fieldOpsController.getTasks
);

// ==================== WAREHOUSE PICKUPS ====================
router.get("/warehouse-pickups", fieldOpsController.getWarehousePickups);

router.get("/warehouse-pickups/:id", fieldOpsController.getWarehousePickupById);

router.post(
  "/warehouse-pickups/:id/collect",
  validate({ body: markPickupCollectedSchema.shape.body }),
  fieldOpsController.markPickupAsCollected
);

// ==================== HANDOVER ====================
router.post(
  "/handover",
  validate({ body: createHandoverSchema.shape.body }),
  fieldOpsController.createHandover
);

// ==================== ROUTES ====================
router.get("/routes", fieldOpsController.getMyRoutes);

router.get("/routes/:routeId/machines", fieldOpsController.getRouteMachines);

// ==================== MACHINE VERIFICATION ====================
router.post(
  "/machines/verify",
  validate({ body: verifyMachineSchema.shape.body }),
  fieldOpsController.verifyMachine
);

// ==================== MACHINE DETAILS ====================
router.get("/machines/:machineId", fieldOpsController.getMachineDetails);

router.get("/machines/:machineId/health", fieldOpsController.getMachineHealth);

// ==================== REFILL ====================
router.get("/machines/:machineId/refill-data", fieldOpsController.getMachineRefillData);

router.get("/machines/:machineId/slots/:slotId", fieldOpsController.getSlotDetails);

router.post(
  "/machines/:machineId/refill",
  validate({ body: submitRefillSchema.shape.body }),
  fieldOpsController.submitRefill
);

router.get("/refills/:refillId/summary", fieldOpsController.getRefillSummary);

// ==================== SKIP MACHINE ====================
router.post(
  "/machines/:machineId/skip",
  validate({ body: skipMachineSchema.shape.body }),
  fieldOpsController.skipMachine
);

// ==================== MAINTENANCE ====================
router.post(
  "/machines/:machineId/raise-issue",
  validate({ body: raiseIssueSchema.shape.body }),
  fieldOpsController.raiseIssue
);

// ==================== WORK SUMMARY ====================
router.get(
  "/work-summary",
  validate({ query: workSummaryQuerySchema.shape.query }),
  fieldOpsController.getWorkSummary
);

// ==================== NOTIFICATIONS ====================
router.get(
  "/notifications",
  validate({ query: getNotificationsQuerySchema.shape.query }),
  fieldOpsController.getNotifications
);

router.patch("/notifications/:id/read", fieldOpsController.markNotificationAsRead);

router.patch("/notifications/mark-all-read", fieldOpsController.markAllNotificationsAsRead);

// ==================== PROFILE ====================
router.get("/profile", fieldOpsController.getProfile);

router.put(
  "/profile",
  validate({ body: updateProfileSchema.shape.body }),
  fieldOpsController.updateProfile
);

// ==================== HELP & SUPPORT ====================
router.get("/help/sections", fieldOpsController.getHelpSections);

export default router;
