import { Router } from "express";
import * as productController from "../controllers/product.controller";

const router = Router();

router.get("/products", productController.getAllProducts);
router.get("/products/categories", productController.getProductCategories);
router.get("/products/category/:category", productController.getProductsByCategory);
router.get("/products/:id", productController.getProductById);

export default router;
