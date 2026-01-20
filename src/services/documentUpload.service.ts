import { v2 as cloudinary } from "cloudinary";
import { IVendorDocument } from "../models/Vendor.model";

import { logger } from "../utils/logger.util";
export class DocumentUploadService {
  private cloudinaryConfigured = false;

  private ensureCloudinaryConfigured() {
    if (!this.cloudinaryConfigured) {
      const config = {
        cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
        api_key: process.env.CLOUDINARY_API_KEY,
        api_secret: process.env.CLOUDINARY_API_SECRET,
      };

      if (!config.cloud_name || !config.api_key || !config.api_secret) {
        logger.error("❌ Cloudinary Configuration Missing:", {
          cloud_name: config.cloud_name || "❌ MISSING",
          api_key: config.api_key ? "✅ SET" : "❌ MISSING",
          api_secret: config.api_secret ? "✅ SET" : "❌ MISSING",
        });
        throw new Error("Cloudinary configuration is incomplete. Please check your .env file.");
      }

      cloudinary.config(config);
      this.cloudinaryConfigured = true;

      logger.info("✅ Cloudinary configured successfully:", {
        cloud_name: config.cloud_name,
        api_key: config.api_key.substring(0, 4) + "...",
      });
    }
  }
  async uploadToCloudinary(
    fileBuffer: Buffer,
    fileName: string,
    folder: string = "frovo/vendor_documents"
  ): Promise<{ url: string; publicId: string }> {
    this.ensureCloudinaryConfigured();

    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder: folder,
          resource_type: "auto",
          public_id: `${Date.now()}-${fileName}`,
          use_filename: true,
          unique_filename: true,
        },
        (error, result) => {
          if (error) {
            reject(error);
          } else if (result) {
            resolve({
              url: result.secure_url,
              publicId: result.public_id,
            });
          } else {
            reject(new Error("Upload failed - no result"));
          }
        }
      );

      uploadStream.end(fileBuffer);
    });
  }

  async deleteFromCloudinary(publicId: string): Promise<void> {
    this.ensureCloudinaryConfigured();

    try {
      await cloudinary.uploader.destroy(publicId);
    } catch (error) {
      throw new Error(`Failed to delete file from Cloudinary: ${error}`);
    }
  }

  createDocumentMetadata(
    file: Express.Multer.File,
    documentType: IVendorDocument["document_type"],
    cloudinaryUrl: string,
    cloudinaryPublicId: string,
    expiryDate?: Date
  ): Omit<IVendorDocument, "_id"> {
    return {
      document_name: file.originalname,
      document_type: documentType,
      file_url: cloudinaryUrl,
      cloudinary_public_id: cloudinaryPublicId,
      file_size: file.size,
      mime_type: file.mimetype,
      expiry_date: expiryDate,
      uploaded_at: new Date(),
    };
  }

  validateDocumentType(documentType: string): boolean {
    const validTypes = [
      "signed_contract",
      "gst_certificate",
      "msme_certificate",
      "tds_exemption",
      "pan_card",
      "bank_proof",
      "other",
    ];
    return validTypes.includes(documentType);
  }
}
