import { Router } from "express";
import * as authController from "../controllers/auth.controller";
import { authenticate } from "../middleware/auth.middleware";
import { auditLogin, auditLogout } from "../middleware/auditLog.middleware";

const router = Router();

// Public routes
router.post("/register", authController.register);

router.post("/register-customer", authController.registerCustomer);

router.post("/login", auditLogin(), authController.login);

router.post("/refresh-token", authController.refreshToken);

// Protected routes
router.use(authenticate);

router.post("/logout", auditLogout(), authController.logout);

router.post("/logout-all", auditLogout(), authController.logoutFromAllDevices);

router.get("/me", authController.getCurrentUser);

router.post("/change-password", authController.changePassword);

router.post("/enable-mfa", authController.enableMFA);

router.post("/verify-mfa", authController.verifyMFA);

router.post("/disable-mfa", authController.disableMFA);

export default router;
