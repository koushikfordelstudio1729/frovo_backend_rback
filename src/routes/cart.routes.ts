import { Router } from "express";
import * as cartController from "../controllers/cart.controller";
import { authenticate } from "../middleware/auth.middleware";

const router = Router();

// All cart routes require authentication
router.use(authenticate);

// Cart management routes
router.get("/", cartController.getCart);
router.post("/add", cartController.addToCart);
router.put("/item/:productId/:machineId/:slotNumber", cartController.updateCartItem);
router.delete("/item/:productId/:machineId/:slotNumber", cartController.removeFromCart);
router.delete("/clear", cartController.clearCart);
router.get("/validate", cartController.validateCart);
router.get("/summary", cartController.getCartSummary);

export default router;
