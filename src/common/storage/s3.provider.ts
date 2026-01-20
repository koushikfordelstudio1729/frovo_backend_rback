import path from "path";

let S3Client: any;
let PutObjectCommand: any;
let DeleteObjectCommand: any;
let HeadObjectCommand: any;
let GetObjectCommand: any;
let getSignedUrl: any;

try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const s3Module = require("@aws-sdk/client-s3");
  S3Client = s3Module.S3Client;
  PutObjectCommand = s3Module.PutObjectCommand;
  DeleteObjectCommand = s3Module.DeleteObjectCommand;
  HeadObjectCommand = s3Module.HeadObjectCommand;
  GetObjectCommand = s3Module.GetObjectCommand;

  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const presignerModule = require("@aws-sdk/s3-request-presigner");
  getSignedUrl = presignerModule.getSignedUrl;
} catch (_) {
  void 0;
}

import {
  IStorageProvider,
  IUploadResult,
  IUploadOptions,
  IDeleteResult,
} from "./storage.interface";

import { logger } from "../../utils/logger.util";
export class S3Provider implements IStorageProvider {
  readonly providerName = "s3";
  private client: any = null;
  private isInitialized = false;
  private cachedConfig: any = null;

  private getConfig() {
    if (!this.cachedConfig) {
      this.cachedConfig = {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        region: process.env.AWS_REGION || "us-east-1",
        bucket: process.env.AWS_S3_BUCKET || "",
        endpoint: process.env.AWS_S3_ENDPOINT || undefined,
      };
    }
    return this.cachedConfig;
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    if (!S3Client) {
      throw new Error(
        "AWS SDK not installed. Please run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner"
      );
    }

    const config = this.getConfig();

    if (!this.isConfigured()) {
      logger.error("AWS S3 Configuration Missing:", {
        access_key: config.accessKeyId ? "SET" : "MISSING",
        secret_key: config.secretAccessKey ? "SET" : "MISSING",
        region: config.region || "MISSING",
        bucket: config.bucket || "MISSING",
      });
      throw new Error("AWS S3 configuration is incomplete. Please check your .env file.");
    }

    const clientConfig: any = {
      region: config.region,
      credentials: {
        accessKeyId: config.accessKeyId,
        secretAccessKey: config.secretAccessKey,
      },
    };

    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      clientConfig.forcePathStyle = true;
    }

    this.client = new S3Client(clientConfig);
    this.isInitialized = true;

    logger.info("AWS S3 provider initialized:", {
      region: config.region,
      bucket: config.bucket,
      endpoint: config.endpoint || "AWS S3",
    });
  }

  isConfigured(): boolean {
    const config = this.getConfig();
    return !!(config.accessKeyId && config.secretAccessKey && config.bucket);
  }

  async upload(
    fileBuffer: Buffer,
    fileName: string,
    options: IUploadOptions = {}
  ): Promise<IUploadResult> {
    await this.initialize();

    if (!this.client) {
      throw new Error("S3 client not initialized");
    }

    const { folder = "frovo/uploads", publicId } = options;

    const fileExtension = path.extname(fileName);
    const baseName = path.parse(fileName).name;
    const uniqueId =
      publicId || `${Date.now()}-${Math.random().toString(36).substring(2, 10)}-${baseName}`;
    const key = `${folder}/${uniqueId}${fileExtension}`;

    const contentType = this.getContentType(fileExtension);

    const command = new PutObjectCommand({
      Bucket: this.getConfig().bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
    });

    try {
      await this.client.send(command);

      let url: string;
      if (this.getConfig().endpoint) {
        url = `${this.getConfig().endpoint}/${this.getConfig().bucket}/${key}`;
      } else {
        url = `https://${this.getConfig().bucket}.s3.${this.getConfig().region}.amazonaws.com/${key}`;
      }

      return {
        url,
        publicId: key,
        provider: this.providerName,
        metadata: {
          size: fileBuffer.length,
          format: fileExtension.replace(".", ""),
        },
      };
    } catch (error: any) {
      logger.error("S3 upload error:", error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  async delete(publicId: string): Promise<IDeleteResult> {
    await this.initialize();

    if (!this.client) {
      throw new Error("S3 client not initialized");
    }

    const config = this.getConfig();
    logger.info(`Deleting from S3: ${publicId} (bucket: ${config.bucket})`);

    const command = new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: publicId,
    });

    try {
      await this.client.send(command);
      logger.info(`S3 delete successful: ${publicId}`);
      return {
        success: true,
        publicId,
        provider: this.providerName,
      };
    } catch (error: any) {
      logger.error("S3 delete error:", error);
      throw new Error(`Failed to delete from S3: ${error.message}`);
    }
  }

  async getSignedUrl(publicId: string, expiresIn: number = 3600): Promise<string> {
    await this.initialize();

    if (!this.client) {
      throw new Error("S3 client not initialized");
    }

    const command = new GetObjectCommand({
      Bucket: this.getConfig().bucket,
      Key: publicId,
    });

    return getSignedUrl(this.client, command, { expiresIn });
  }

  async exists(publicId: string): Promise<boolean> {
    await this.initialize();

    if (!this.client) {
      throw new Error("S3 client not initialized");
    }

    const command = new HeadObjectCommand({
      Bucket: this.getConfig().bucket,
      Key: publicId,
    });

    try {
      await this.client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  private getContentType(extension: string): string {
    const mimeTypes: Record<string, string> = {
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
      ".svg": "image/svg+xml",
      ".pdf": "application/pdf",
      ".mp4": "video/mp4",
      ".webm": "video/webm",
      ".mp3": "audio/mpeg",
      ".wav": "audio/wav",
    };

    return mimeTypes[extension.toLowerCase()] || "application/octet-stream";
  }
}
