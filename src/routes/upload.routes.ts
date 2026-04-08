import express from "express";
import { uploadController } from "../controllers/upload.controller";
import { authenticate } from "../middleware/auth.middleware";
import { authorize } from "../middleware/authorize.middleware";

const router = express.Router();
const MANAGEMENT = ["super_admin", "admin", "ops_manager"];

router.post(
  "/presigned-url",
  authenticate,
  authorize(MANAGEMENT),
  uploadController.getPresignedUploadUrl.bind(uploadController)
);

export default router;
