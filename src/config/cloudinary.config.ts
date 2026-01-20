import { v2 as cloudinary } from "cloudinary";

import { logger } from "../utils/logger.util";
const config = {
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
};

logger.info("🌥️  Cloudinary Config:", {
  cloud_name: config.cloud_name || "❌ MISSING",
  api_key: config.api_key ? "✅ SET" : "❌ MISSING",
  api_secret: config.api_secret ? "✅ SET" : "❌ MISSING",
});

cloudinary.config(config);

export default cloudinary;
