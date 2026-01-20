// routes/index.ts
import { Router } from "express";
import authRoutes from "./auth.routes";
import userRoutes from "./user.routes";
import roleRoutes from "./role.routes";
import departmentRoutes from "./department.routes";
import permissionRoutes from "./permission.routes";
import accessRequestRoutes from "./accessRequest.routes";
import auditLogRoutes from "./auditLog.routes";
import securityRoutes from "./security.routes";
import warehouseRoutes from "./warehouse.routes";
import vendorRoutes from "./vendor.routes";
import auditTrailRoutes from "./auditTrail.routes";
import vendingMachineRoutes from "./vendingMachine.routes";
import cartRoutes from "./cart.routes";
import productRoutes from "./product.routes";
import areaRouteRoutes from "./arearoute.route";
import catalogueRoute from "./catalogue.routes";
import historyCatalogueRoutes from "./historyCatalogue.routes";
import fieldOpsRoutes from "./fieldops.routes";

const router = Router();

// Health check route
router.get("/health", (_req, res) => {
  res.json({
    success: true,
    message: "RBAC API is running",
    timestamp: new Date().toISOString(),
    version: "1.0.0",
  });
});

// API routes
router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/roles", roleRoutes);
router.use("/departments", departmentRoutes);
router.use("/permissions", permissionRoutes);
router.use("/access-requests", accessRequestRoutes);
router.use("/audit-logs", auditLogRoutes);
router.use("/security", securityRoutes);
router.use("/warehouse", warehouseRoutes);
router.use("/vendors", vendorRoutes);
router.use("/audit-trails", auditTrailRoutes);
router.use("/vending", vendingMachineRoutes);
router.use("/cart", cartRoutes);
router.use("/area-route", areaRouteRoutes);
router.use("/catalogue", catalogueRoute);
router.use("/history-catalogue", historyCatalogueRoutes);
router.use("/field-ops", fieldOpsRoutes);
router.use("/", productRoutes);

export default router;
