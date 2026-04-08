import { Request, Response } from "express";
import path from "path";
import { S3Provider } from "../common/storage/s3.provider";
import { StorageFactory } from "../common/storage/storage.factory";
import { logger } from "../utils/logger.util";

export class UploadController {
  async getPresignedUploadUrl(req: Request, res: Response): Promise<void> {
    try {
      const { file_name, file_type, folder = "frovo/uploads" } = req.body;

      if (!file_name || !file_type) {
        res.status(400).json({ success: false, message: "file_name and file_type are required" });
        return;
      }

      const provider = StorageFactory.getProvider();

      if (provider.providerName !== "s3") {
        res.status(400).json({
          success: false,
          message: "Presigned URLs are only supported with S3 storage provider",
        });
        return;
      }

      const s3Provider = provider as S3Provider;
      const fileExtension = path.extname(file_name);
      const baseName = path.parse(file_name).name;
      const uniqueId = `${Date.now()}-${Math.random().toString(36).substring(2, 10)}-${baseName}`;
      const key = `${folder}/${uniqueId}${fileExtension}`;

      const presignedUrl = await s3Provider.getPresignedUploadUrl(key, file_type);
      const fileUrl = s3Provider.buildFileUrl(key);

      res.status(200).json({
        success: true,
        data: {
          presigned_url: presignedUrl,
          key,
          file_url: fileUrl,
          expires_in: 300,
        },
      });
    } catch (error: any) {
      logger.error("Error generating presigned URL:", error);
      res.status(500).json({ success: false, message: "Failed to generate upload URL" });
    }
  }
}

export const uploadController = new UploadController();
