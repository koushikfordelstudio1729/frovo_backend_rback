import express from "express";
import { priceOverrideController } from "../controllers/priceOverride.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = express.Router();

const MANAGEMENT = ["super_admin", "admin", "ops_manager"];
const SUPER_ADMIN_ONLY = ["super_admin"];

// ============ PRICE OVERRIDE CRUD ============

// Create new price override
router.post(
  "/",
  authenticate,
  authorize(MANAGEMENT),
  priceOverrideController.createPriceOverride.bind(priceOverrideController)
);

// Get all price overrides with filters
router.get(
  "/",
  authenticate,
  authorize(MANAGEMENT),
  priceOverrideController.getAllPriceOverrides.bind(priceOverrideController)
);

// Get price override history (all)
router.get(
  "/history",
  authenticate,
  authorize(MANAGEMENT),
  priceOverrideController.getPriceOverrideHistory.bind(priceOverrideController)
);

// Expire overrides manually (admin/cron endpoint)
router.post(
  "/expire",
  authenticate,
  authorize(SUPER_ADMIN_ONLY),
  priceOverrideController.expireOverrides.bind(priceOverrideController)
);

// Get effective price for a SKU (can be used by machines/POS)
router.get(
  "/effective-price/:skuId",
  authenticate,
  priceOverrideController.getEffectivePrice.bind(priceOverrideController)
);

// Get all overrides for a specific SKU
router.get(
  "/sku/:skuId",
  authenticate,
  authorize(MANAGEMENT),
  priceOverrideController.getOverridesBySku.bind(priceOverrideController)
);

// Get single price override by ID
router.get(
  "/:id",
  authenticate,
  authorize(MANAGEMENT),
  priceOverrideController.getPriceOverrideById.bind(priceOverrideController)
);

// Update price override
router.put(
  "/:id",
  authenticate,
  authorize(MANAGEMENT),
  priceOverrideController.updatePriceOverride.bind(priceOverrideController)
);

// Update price override status (activate/deactivate)
router.patch(
  "/:id/status",
  authenticate,
  authorize(MANAGEMENT),
  priceOverrideController.updatePriceOverrideStatus.bind(priceOverrideController)
);

// Delete price override
router.delete(
  "/:id",
  authenticate,
  authorize(MANAGEMENT),
  priceOverrideController.deletePriceOverride.bind(priceOverrideController)
);

// Get history for specific price override
router.get(
  "/:id/history",
  authenticate,
  authorize(MANAGEMENT),
  priceOverrideController.getHistoryByOverrideId.bind(priceOverrideController)
);

export default router;
