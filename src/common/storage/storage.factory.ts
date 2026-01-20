/**
 * Storage Factory
 *
 * Factory for creating storage provider instances.
 * Uses environment variable STORAGE_PROVIDER to determine which provider to use.
 *
 * Usage:
 *   const storage = StorageFactory.getProvider();
 *   const result = await storage.upload(buffer, filename, options);
 *
 * Environment Variables:
 *   STORAGE_PROVIDER=cloudinary|s3|gcs|azure|local (default: cloudinary)
 */

import { IStorageProvider } from "./storage.interface";
import { CloudinaryProvider } from "./cloudinary.provider";
import { S3Provider } from "./s3.provider";

export type StorageProviderType = "cloudinary" | "s3" | "gcs" | "azure" | "local";

export class StorageFactory {
  private static instance: IStorageProvider | null = null;
  private static currentProvider: StorageProviderType | null = null;

  /**
   * Get the storage provider instance (singleton)
   * @param forceProvider - Force a specific provider (overrides env variable)
   */
  static getProvider(forceProvider?: StorageProviderType): IStorageProvider {
    const providerType =
      forceProvider || (process.env.STORAGE_PROVIDER as StorageProviderType) || "cloudinary";

    // Return existing instance if same provider
    if (this.instance && this.currentProvider === providerType) {
      return this.instance;
    }

    // Create new instance
    this.instance = this.createProvider(providerType);
    this.currentProvider = providerType;

    console.log(`📦 Storage provider initialized: ${providerType}`);

    return this.instance;
  }

  /**
   * Create a new provider instance
   */
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

  /**
   * Get list of available providers
   */
  static getAvailableProviders(): StorageProviderType[] {
    return ["cloudinary", "s3"];
  }

  /**
   * Check if a provider is available/configured
   */
  static isProviderConfigured(type: StorageProviderType): boolean {
    try {
      const provider = this.createProvider(type);
      return provider.isConfigured();
    } catch {
      return false;
    }
  }

  /**
   * Reset the singleton instance (useful for testing)
   */
  static reset(): void {
    this.instance = null;
    this.currentProvider = null;
  }
}

/**
 * Get storage provider lazily (only when called)
 * This avoids initialization before environment variables are loaded
 */
export const getStorageProvider = (): IStorageProvider => {
  return StorageFactory.getProvider();
};
