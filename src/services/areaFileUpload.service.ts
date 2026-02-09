import { StorageFactory, IStorageProvider, IUploadResult } from "../common/storage";
import { IMachineImageData } from "../models/AreaRoute.model";

import { logger } from "../utils/logger.util";
export interface IImageMetadata {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
  storage_provider?: string;
}

export class ImageUploadService {
  private storage: IStorageProvider;

  constructor() {
    this.storage = StorageFactory.getProvider();
  }

  getProviderName(): string {
    return this.storage.providerName;
  }

  async uploadToCloudinary(
    fileBuffer: Buffer,
    fileName: string,
    folder: string = "frovo/areaMachine_documents"
  ): Promise<{ url: string; publicId: string }> {
    try {
      const result = await this.storage.upload(fileBuffer, fileName, { folder });
      return {
        url: result.url,
        publicId: result.publicId,
      };
    } catch (error: any) {
      logger.error(`Upload failed (${this.storage.providerName}):`, error);
      throw new Error(`Failed to upload file: ${error.message}`);
    }
  }

  async deleteFromCloudinary(publicId: string): Promise<void> {
    try {
      await this.storage.delete(publicId);
    } catch (error: any) {
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  private createImageMetadata(
    file: Express.Multer.File,
    uploadResult: { url: string; publicId: string }
  ): IImageMetadata {
    return {
      image_name: file.originalname,
      file_url: uploadResult.url,
      cloudinary_public_id: uploadResult.publicId,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_at: new Date(),
      storage_provider: this.storage.providerName,
    };
  }

  createAreaMachineDocumentMetadata(
    file: Express.Multer.File,
    cloudinaryUrl: string,
    cloudinaryPublicId: string
  ): IMachineImageData {
    return {
      image_name: file.originalname,
      file_url: cloudinaryUrl,
      cloudinary_public_id: cloudinaryPublicId,
      file_size: file.size,
      mime_type: file.mimetype,
      uploaded_at: new Date(),
    };
  }

  async uploadAreaMachineImage(
    file: Express.Multer.File,
    folder?: string
  ): Promise<IMachineImageData> {
    const uploadFolder = folder || process.env.CATEGORY_IMAGE_FOLDER || "frovo/areaMachine_images";
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createAreaMachineDocumentMetadata(file, result.url, result.publicId);
  }

  async uploadMultipleFiles(
    files: Express.Multer.File[],
    folder: string,
    type: "areaMachine"
  ): Promise<IMachineImageData[]> {
    const uploadPromises = files.map(file => {
      switch (type) {
        case "areaMachine":
          return this.uploadAreaMachineImage(file, folder);
      }
    });

    return Promise.all(uploadPromises);
  }

  async deleteMultipleFiles(publicIds: string[]): Promise<void> {
    const deletePromises = publicIds.map(id => this.deleteFromCloudinary(id));
    await Promise.all(deletePromises);
  }
}
