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

router.use(authenticate);

router.get("/dashboard", fieldOpsController.getDashboard);

router.get(
  "/tasks",
  validate({ query: getTasksQuerySchema.shape.query }),
  fieldOpsController.getTasks
);

router.get("/warehouse-pickups", fieldOpsController.getWarehousePickups);

router.get("/warehouse-pickups/:id", fieldOpsController.getWarehousePickupById);

router.post(
  "/warehouse-pickups/:id/collect",
  validate({ body: markPickupCollectedSchema.shape.body }),
  fieldOpsController.markPickupAsCollected
);

router.post(
  "/handover",
  validate({ body: createHandoverSchema.shape.body }),
  fieldOpsController.createHandover
);

router.get("/routes", fieldOpsController.getMyRoutes);

router.get("/routes/:routeId/machines", fieldOpsController.getRouteMachines);

router.post(
  "/machines/verify",
  validate({ body: verifyMachineSchema.shape.body }),
  fieldOpsController.verifyMachine
);

router.get("/machines/:machineId", fieldOpsController.getMachineDetails);

router.get("/machines/:machineId/health", fieldOpsController.getMachineHealth);

router.get("/machines/:machineId/refill-data", fieldOpsController.getMachineRefillData);

router.get("/machines/:machineId/slots/:slotId", fieldOpsController.getSlotDetails);

router.post(
  "/machines/:machineId/refill",
  validate({ body: submitRefillSchema.shape.body }),
  fieldOpsController.submitRefill
);

router.get("/refills/:refillId/summary", fieldOpsController.getRefillSummary);

router.post(
  "/machines/:machineId/skip",
  validate({ body: skipMachineSchema.shape.body }),
  fieldOpsController.skipMachine
);

router.post(
  "/machines/:machineId/raise-issue",
  validate({ body: raiseIssueSchema.shape.body }),
  fieldOpsController.raiseIssue
);

router.get(
  "/work-summary",
  validate({ query: workSummaryQuerySchema.shape.query }),
  fieldOpsController.getWorkSummary
);

router.get(
  "/notifications",
  validate({ query: getNotificationsQuerySchema.shape.query }),
  fieldOpsController.getNotifications
);

router.patch("/notifications/:id/read", fieldOpsController.markNotificationAsRead);

router.patch("/notifications/mark-all-read", fieldOpsController.markAllNotificationsAsRead);

router.get("/profile", fieldOpsController.getProfile);

router.put(
  "/profile",
  validate({ body: updateProfileSchema.shape.body }),
  fieldOpsController.updateProfile
);

router.get("/help/sections", fieldOpsController.getHelpSections);

export default router;
