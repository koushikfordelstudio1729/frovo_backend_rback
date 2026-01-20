/**
 * Storage Module
 *
 * Provides a unified interface for file storage across multiple providers.
 *
 * Quick Start:
 *   import { StorageFactory } from './storage';
 *   const storage = StorageFactory.getProvider();
 *   const result = await storage.upload(buffer, filename, { folder: 'images' });
 *
 * Switching Providers:
 *   Set STORAGE_PROVIDER environment variable to: cloudinary, s3, gcs, azure, local
 */

// Interfaces
export {
  IStorageProvider,
  IUploadResult,
  IUploadOptions,
  IDeleteResult,
  IStorageConfig,
} from "./storage.interface";

// Providers
export { CloudinaryProvider } from "./cloudinary.provider";
export { S3Provider } from "./s3.provider";

// Factory
export { StorageFactory, StorageProviderType, getStorageProvider } from "./storage.factory";
