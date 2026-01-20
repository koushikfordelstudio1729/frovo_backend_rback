import { Router } from "express";
import { historyController } from "../controllers/historyCatalogue.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const SUPER_ADMIN_ONLY = ["super_admin"];
const ADMIN_ACCESS = ["super_admin", "warehouse_manager"];

const router = Router();

router.get("/entity/:entityType/:entityId", authenticate, authorize(ADMIN_ACCESS), (req, res) =>
  historyController.getEntityAuditLogs(req, res)
);

router.get("/user/:userId", authenticate, authorize(ADMIN_ACCESS), (req, res) =>
  historyController.getUserAuditLogs(req, res)
);

router.get("/my-logs", authenticate, (req, res) => historyController.getMyAuditLogs(req, res));

router.get("/search", authenticate, authorize(ADMIN_ACCESS), (req, res) =>
  historyController.searchAuditLogs(req, res)
);

router.get("/statistics", authenticate, authorize(ADMIN_ACCESS), (req, res) =>
  historyController.getAuditStatistics(req, res)
);

router.get("/recent-activity", authenticate, authorize(ADMIN_ACCESS), (req, res) =>
  historyController.getRecentActivity(req, res)
);

router.get("/export", authenticate, authorize(SUPER_ADMIN_ONLY), (req, res) =>
  historyController.exportAuditLogsCSV(req, res)
);

export default router;
