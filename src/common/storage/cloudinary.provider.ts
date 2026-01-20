import { v2 as cloudinary, UploadApiResponse } from "cloudinary";
import path from "path";
import {
  IStorageProvider,
  IUploadResult,
  IUploadOptions,
  IDeleteResult,
} from "./storage.interface";

import { logger } from "../../utils/logger.util";
export class CloudinaryProvider implements IStorageProvider {
  readonly providerName = "cloudinary";
  private isInitialized = false;

  private getConfig() {
    return {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME || "",
      apiKey: process.env.CLOUDINARY_API_KEY || "",
      apiSecret: process.env.CLOUDINARY_API_SECRET || "",
    };
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    const config = this.getConfig();

    if (!this.isConfigured()) {
      logger.error("Cloudinary Configuration Missing:", {
        cloud_name: config.cloudName || "MISSING",
        api_key: config.apiKey ? "SET" : "MISSING",
        api_secret: config.apiSecret ? "SET" : "MISSING",
      });
      throw new Error("Cloudinary configuration is incomplete. Please check your .env file.");
    }

    cloudinary.config({
      cloud_name: config.cloudName,
      api_key: config.apiKey,
      api_secret: config.apiSecret,
    });

    this.isInitialized = true;
    logger.info("Cloudinary provider initialized:", {
      cloud_name: config.cloudName,
      api_key: config.apiKey.substring(0, 4) + "...",
    });
  }

  isConfigured(): boolean {
    const config = this.getConfig();
    return !!(config.cloudName && config.apiKey && config.apiSecret);
  }

  async upload(
    fileBuffer: Buffer,
    fileName: string,
    options: IUploadOptions = {}
  ): Promise<IUploadResult> {
    await this.initialize();

    const {
      folder = "frovo/uploads",
      resourceType = "auto",
      publicId,
      transformation,
      tags,
    } = options;

    return new Promise((resolve, reject) => {
      const uploadOptions: any = {
        folder,
        resource_type: resourceType,
        public_id: publicId || `${Date.now()}-${path.parse(fileName).name}`,
        use_filename: true,
        unique_filename: true,
      };

      if (transformation) {
        uploadOptions.transformation = transformation;
      }

      if (tags && tags.length > 0) {
        uploadOptions.tags = tags;
      }

      const uploadStream = cloudinary.uploader.upload_stream(
        uploadOptions,
        (error, result: UploadApiResponse | undefined) => {
          if (error) {
            logger.error("Cloudinary upload error:", error);
            reject(new Error(`Cloudinary upload failed: ${error.message}`));
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
              provider: this.providerName,
              metadata: {
                width: result.width,
                height: result.height,
                format: result.format,
                size: result.bytes,
              },
            });
          } else {
            reject(new Error("Cloudinary upload failed - no result"));
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  async delete(publicId: string): Promise<IDeleteResult> {
    await this.initialize();

    try {
      logger.info(`Deleting from Cloudinary: ${publicId}`);

      let result = await cloudinary.uploader.destroy(publicId, { resource_type: "image" });

      if (result.result === "not found") {
        logger.info(`Not found as image, trying as raw: ${publicId}`);
        result = await cloudinary.uploader.destroy(publicId, { resource_type: "raw" });
      }

      if (result.result === "not found") {
        logger.info(`Not found as raw, trying as video: ${publicId}`);
        result = await cloudinary.uploader.destroy(publicId, { resource_type: "video" });
      }

      logger.info(`Cloudinary delete result for ${publicId}:`, result);

      return {
        success: result.result === "ok",
        publicId,
        provider: this.providerName,
      };
    } catch (error: any) {
      logger.error("Cloudinary delete error:", error);
      throw new Error(`Failed to delete from Cloudinary: ${error.message}`);
    }
  }

  async getSignedUrl(publicId: string, expiresIn: number = 3600): Promise<string> {
    await this.initialize();

    const timestamp = Math.floor(Date.now() / 1000) + expiresIn;

    return cloudinary.url(publicId, {
      sign_url: true,
      type: "authenticated",
      expires_at: timestamp,
    });
  }

  async exists(publicId: string): Promise<boolean> {
    await this.initialize();

    try {
      await cloudinary.api.resource(publicId);
      return true;
    } catch (error) {
      return false;
    }
  }
}
