/**
 * AWS S3 Storage Provider
 *
 * Implementation of IStorageProvider for AWS S3.
 * Also works with S3-compatible services like MinIO, DigitalOcean Spaces, etc.
 *
 * Required environment variables:
 * - AWS_ACCESS_KEY_ID
 * - AWS_SECRET_ACCESS_KEY
 * - AWS_REGION
 * - AWS_S3_BUCKET
 * - AWS_S3_ENDPOINT (optional, for S3-compatible services)
 *
 * Required npm packages (install only if using S3):
 * npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner
 */

import path from "path";

// Dynamic imports for optional S3 dependencies
let S3Client: any;
let PutObjectCommand: any;
let DeleteObjectCommand: any;
let HeadObjectCommand: any;
let GetObjectCommand: any;
let getSignedUrl: any;

// Try to load AWS SDK (optional dependency)
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
} catch {
  // AWS SDK not installed - will throw error when trying to use S3 provider
}

import {
  IStorageProvider,
  IUploadResult,
  IUploadOptions,
  IDeleteResult,
} from "./storage.interface";

export class S3Provider implements IStorageProvider {
  readonly providerName = "s3";
  private client: any = null;
  private isInitialized = false;
  private cachedConfig: any = null;

  /**
   * Get config lazily from environment variables
   * This ensures env vars are read when needed, not at class instantiation
   */
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

    // Check if AWS SDK is installed
    if (!S3Client) {
      throw new Error(
        "AWS SDK not installed. Please run: npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner"
      );
    }

    const config = this.getConfig();

    if (!this.isConfigured()) {
      console.error("AWS S3 Configuration Missing:", {
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

    // For S3-compatible services (MinIO, DigitalOcean Spaces, etc.)
    if (config.endpoint) {
      clientConfig.endpoint = config.endpoint;
      clientConfig.forcePathStyle = true; // Required for MinIO
    }

    this.client = new S3Client(clientConfig);
    this.isInitialized = true;

    console.log("AWS S3 provider initialized:", {
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

    // Generate unique key
    const fileExtension = path.extname(fileName);
    const baseName = path.parse(fileName).name;
    const uniqueId =
      publicId || `${Date.now()}-${Math.random().toString(36).substring(2, 10)}-${baseName}`;
    const key = `${folder}/${uniqueId}${fileExtension}`;

    // Determine content type
    const contentType = this.getContentType(fileExtension);

    const command = new PutObjectCommand({
      Bucket: this.getConfig().bucket,
      Key: key,
      Body: fileBuffer,
      ContentType: contentType,
      // Make publicly readable (optional - remove for private files)
      // ACL: 'public-read'
    });

    try {
      await this.client.send(command);

      // Construct the URL
      let url: string;
      if (this.getConfig().endpoint) {
        // S3-compatible service
        url = `${this.getConfig().endpoint}/${this.getConfig().bucket}/${key}`;
      } else {
        // AWS S3
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
      console.error("S3 upload error:", error);
      throw new Error(`S3 upload failed: ${error.message}`);
    }
  }

  async delete(publicId: string): Promise<IDeleteResult> {
    await this.initialize();

    if (!this.client) {
      throw new Error("S3 client not initialized");
    }

    const config = this.getConfig();
    console.log(`Deleting from S3: ${publicId} (bucket: ${config.bucket})`);

    const command = new DeleteObjectCommand({
      Bucket: config.bucket,
      Key: publicId,
    });

    try {
      await this.client.send(command);
      console.log(`S3 delete successful: ${publicId}`);
      return {
        success: true,
        publicId,
        provider: this.providerName,
      };
    } catch (error: any) {
      console.error("S3 delete error:", error);
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
