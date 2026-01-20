import { IStorageProvider } from "./storage.interface";
import { CloudinaryProvider } from "./cloudinary.provider";
import { S3Provider } from "./s3.provider";

import { logger } from "../../utils/logger.util";
export type StorageProviderType = "cloudinary" | "s3" | "gcs" | "azure" | "local";

export class StorageFactory {
  private static instance: IStorageProvider | null = null;
  private static currentProvider: StorageProviderType | null = null;

  static getProvider(forceProvider?: StorageProviderType): IStorageProvider {
    const providerType =
      forceProvider || (process.env.STORAGE_PROVIDER as StorageProviderType) || "cloudinary";

    if (this.instance && this.currentProvider === providerType) {
      return this.instance;
    }

    this.instance = this.createProvider(providerType);
    this.currentProvider = providerType;

    logger.info(`📦 Storage provider initialized: ${providerType}`);

    return this.instance;
  }

  private static createProvider(type: StorageProviderType): IStorageProvider {
    switch (type) {
      case "cloudinary":
        return new CloudinaryProvider();

      case "s3":
        return new S3Provider();

      case "gcs":
        // TODO: Implement Google Cloud Storage provider
        throw new Error("Google Cloud Storage provider not yet implemented. Use cloudinary or s3.");

      case "azure":
        // TODO: Implement Azure Blob Storage provider
        throw new Error("Azure Blob Storage provider not yet implemented. Use cloudinary or s3.");

      case "local":
        // TODO: Implement local file storage provider
        throw new Error("Local storage provider not yet implemented. Use cloudinary or s3.");

      default:
        throw new Error(`Unknown storage provider: ${type}. Supported: cloudinary, s3`);
    }
  }

  static getAvailableProviders(): StorageProviderType[] {
    return ["cloudinary", "s3"];
  }

  static isProviderConfigured(type: StorageProviderType): boolean {
    try {
      const provider = this.createProvider(type);
      return provider.isConfigured();
    } catch {
      return false;
    }
  }

  static reset(): void {
    this.instance = null;
    this.currentProvider = null;
  }
}

export const getStorageProvider = (): IStorageProvider => {
  return StorageFactory.getProvider();
};
