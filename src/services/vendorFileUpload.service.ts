import { StorageFactory, IStorageProvider } from "../common/storage";
import {
  ICancelledChequeImage,
  IGstCertificateImage,
  IPANImage,
  IFSSAIImage,
  ICertificateOfIncorporationImage,
  IMsmeOrUdyamCertificate,
  IMoAImage,
  IAoAImage,
  ITrademarkCertificateImage,
  IAuthorizedSignatoryImage,
  ILLPAgreementImage,
  IShopAndEstablishmentCertificateImage,
  IRegisteredPartnershipDeedImage,
  IBoardResolutionImage,
} from "../models/Vendor.model";

import { logger } from "../utils/logger.util";

// Consolidated interface for all image metadata types
export interface IImageMetadata {
  image_name: string;
  file_url: string;
  cloudinary_public_id: string;
  file_size: number;
  mime_type: string;
  uploaded_at: Date;
  storage_provider?: string;
}

export type DocumentType =
  | "cancelled_cheque"
  | "gst_certificate"
  | "pan_card"
  | "fssai_certificate"
  | "certificate_of_incorporation"
  | "msme_udyam_certificate"
  | "moa"
  | "aoa"
  | "trademark_certificate"
  | "authorized_signatory"
  | "llp_agreement"
  | "shop_establishment_certificate"
  | "partnership_deed"
  | "board_resolution"
  | "areaMachine";

export class ImageUploadService {
  private storage: IStorageProvider;

  constructor() {
    this.storage = StorageFactory.getProvider();
  }

  getProviderName(): string {
    return this.storage.providerName;
  }

  private getFolderPath(documentType: DocumentType, folder?: string): string {
    if (folder) return folder;

    const defaultFolders: Record<DocumentType, string> = {
      cancelled_cheque: "frovo/cancelled_cheque_images",
      gst_certificate: "frovo/gst_certificates",
      pan_card: "frovo/pan_cards",
      fssai_certificate: "frovo/fssai_certificates",
      certificate_of_incorporation: "frovo/certificates_of_incorporation",
      msme_udyam_certificate: "frovo/msme_udyam_certificates",
      moa: "frovo/moa_documents",
      aoa: "frovo/aoa_documents",
      trademark_certificate: "frovo/trademark_certificates",
      authorized_signatory: "frovo/authorized_signatory",
      llp_agreement: "frovo/llp_agreements",
      shop_establishment_certificate: "frovo/shop_establishment_certificates",
      partnership_deed: "frovo/partnership_deeds",
      board_resolution: "frovo/board_resolutions",
      areaMachine: "frovo/areaMachine_documents",
    };

    const envVar = `${documentType.toUpperCase()}_FOLDER`;
    return process.env[envVar] || defaultFolders[documentType];
  }

  async uploadToCloudinary(
    fileBuffer: Buffer,
    fileName: string,
    folder: string
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
      logger.error(`Delete failed (${this.storage.providerName}):`, error);
      throw new Error(`Failed to delete file: ${error.message}`);
    }
  }

  private createBaseImageMetadata(
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

  private createDocumentMetadata<T extends IImageMetadata>(
    file: Express.Multer.File,
    uploadResult: { url: string; publicId: string }
  ): T {
    const baseMetadata = this.createBaseImageMetadata(file, uploadResult);
    return {
      ...baseMetadata,
      uploaded_at: new Date(),
    } as T;
  }

  async uploadCancelledChequeImage(
    file: Express.Multer.File,
    folder?: string
  ): Promise<ICancelledChequeImage> {
    const uploadFolder = this.getFolderPath("cancelled_cheque", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createDocumentMetadata<ICancelledChequeImage>(file, result);
  }

  async uploadGSTCertificateImage(
    file: Express.Multer.File,
    folder?: string
  ): Promise<IGstCertificateImage> {
    const uploadFolder = this.getFolderPath("gst_certificate", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createDocumentMetadata<IGstCertificateImage>(file, result);
  }

  async uploadPANImage(file: Express.Multer.File, folder?: string): Promise<IPANImage> {
    const uploadFolder = this.getFolderPath("pan_card", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createDocumentMetadata<IPANImage>(file, result);
  }

  async uploadFSSAIImage(file: Express.Multer.File, folder?: string): Promise<IFSSAIImage> {
    const uploadFolder = this.getFolderPath("fssai_certificate", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createDocumentMetadata<IFSSAIImage>(file, result);
  }

  async uploadCertificateOfIncorporationImage(
    file: Express.Multer.File,
    folder?: string
  ): Promise<ICertificateOfIncorporationImage> {
    const uploadFolder = this.getFolderPath("certificate_of_incorporation", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createDocumentMetadata<ICertificateOfIncorporationImage>(file, result);
  }

  async uploadMsmeOrUdyamCertificateImage(
    file: Express.Multer.File,
    folder?: string
  ): Promise<IMsmeOrUdyamCertificate> {
    const uploadFolder = this.getFolderPath("msme_udyam_certificate", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createDocumentMetadata<IMsmeOrUdyamCertificate>(file, result);
  }

  async uploadMoAImage(file: Express.Multer.File, folder?: string): Promise<IMoAImage> {
    const uploadFolder = this.getFolderPath("moa", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createDocumentMetadata<IMoAImage>(file, result);
  }

  async uploadAoAImage(file: Express.Multer.File, folder?: string): Promise<IAoAImage> {
    const uploadFolder = this.getFolderPath("aoa", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createDocumentMetadata<IAoAImage>(file, result);
  }

  async uploadTrademarkCertificateImage(
    file: Express.Multer.File,
    folder?: string
  ): Promise<ITrademarkCertificateImage> {
    const uploadFolder = this.getFolderPath("trademark_certificate", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createDocumentMetadata<ITrademarkCertificateImage>(file, result);
  }

  async uploadAuthorizedSignatoryImage(
    file: Express.Multer.File,
    folder?: string
  ): Promise<IAuthorizedSignatoryImage> {
    const uploadFolder = this.getFolderPath("authorized_signatory", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createDocumentMetadata<IAuthorizedSignatoryImage>(file, result);
  }

  async uploadLLPAgreementImage(
    file: Express.Multer.File,
    folder?: string
  ): Promise<ILLPAgreementImage> {
    const uploadFolder = this.getFolderPath("llp_agreement", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createDocumentMetadata<ILLPAgreementImage>(file, result);
  }

  async uploadShopAndEstablishmentCertificateImage(
    file: Express.Multer.File,
    folder?: string
  ): Promise<IShopAndEstablishmentCertificateImage> {
    const uploadFolder = this.getFolderPath("shop_establishment_certificate", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createDocumentMetadata<IShopAndEstablishmentCertificateImage>(file, result);
  }

  async uploadRegisteredPartnershipDeedImage(
    file: Express.Multer.File,
    folder?: string
  ): Promise<IRegisteredPartnershipDeedImage> {
    const uploadFolder = this.getFolderPath("partnership_deed", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createDocumentMetadata<IRegisteredPartnershipDeedImage>(file, result);
  }

  async uploadBoardResolutionImage(
    file: Express.Multer.File,
    folder?: string
  ): Promise<IBoardResolutionImage> {
    const uploadFolder = this.getFolderPath("board_resolution", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createDocumentMetadata<IBoardResolutionImage>(file, result);
  }

  async uploadAreaMachineImage(
    file: Express.Multer.File,
    folder?: string
  ): Promise<IImageMetadata> {
    const uploadFolder = this.getFolderPath("areaMachine", folder);
    const result = await this.uploadToCloudinary(file.buffer, file.originalname, uploadFolder);
    return this.createBaseImageMetadata(file, result);
  }

  // Generic upload method for any document type
  async uploadDocument(
    file: Express.Multer.File,
    documentType: DocumentType,
    folder?: string
  ): Promise<any> {
    switch (documentType) {
      case "cancelled_cheque":
        return this.uploadCancelledChequeImage(file, folder);
      case "gst_certificate":
        return this.uploadGSTCertificateImage(file, folder);
      case "pan_card":
        return this.uploadPANImage(file, folder);
      case "fssai_certificate":
        return this.uploadFSSAIImage(file, folder);
      case "certificate_of_incorporation":
        return this.uploadCertificateOfIncorporationImage(file, folder);
      case "msme_udyam_certificate":
        return this.uploadMsmeOrUdyamCertificateImage(file, folder);
      case "moa":
        return this.uploadMoAImage(file, folder);
      case "aoa":
        return this.uploadAoAImage(file, folder);
      case "trademark_certificate":
        return this.uploadTrademarkCertificateImage(file, folder);
      case "authorized_signatory":
        return this.uploadAuthorizedSignatoryImage(file, folder);
      case "llp_agreement":
        return this.uploadLLPAgreementImage(file, folder);
      case "shop_establishment_certificate":
        return this.uploadShopAndEstablishmentCertificateImage(file, folder);
      case "partnership_deed":
        return this.uploadRegisteredPartnershipDeedImage(file, folder);
      case "board_resolution":
        return this.uploadBoardResolutionImage(file, folder);
      case "areaMachine":
        return this.uploadAreaMachineImage(file, folder);
      default:
        throw new Error(`Unsupported document type: ${documentType}`);
    }
  }

  // Upload multiple files of the same type
  async uploadMultipleFiles(
    files: Express.Multer.File[],
    documentType: DocumentType,
    folder?: string
  ): Promise<any[]> {
    const uploadPromises = files.map(file => this.uploadDocument(file, documentType, folder));
    return Promise.all(uploadPromises);
  }

  // Upload multiple documents for brand creation
  async uploadBrandDocuments(
    files: {
      type: DocumentType;
      file: Express.Multer.File;
    }[],
    brandName?: string,
    companyId?: string
  ): Promise<Record<string, any>> {
    const results: Record<string, any> = {};

    for (const { type, file } of files) {
      // Create dynamic folder path with brand/company info if available
      let folder: string | undefined;
      if (brandName || companyId) {
        const basePath = this.getFolderPath(type);
        const brandFolder = brandName?.replace(/\s+/g, "_").toLowerCase();
        const companyFolder = companyId?.replace(/\s+/g, "_").toLowerCase();

        if (brandFolder && companyFolder) {
          folder = `${basePath}/${companyFolder}/${brandFolder}`;
        } else if (brandFolder) {
          folder = `${basePath}/${brandFolder}`;
        } else if (companyFolder) {
          folder = `${basePath}/${companyFolder}`;
        }
      }

      try {
        const result = await this.uploadDocument(file, type, folder);

        // Map the result to the appropriate field name for brand schema
        const fieldName = this.getBrandFieldName(type);
        results[fieldName] = result;
      } catch (error: any) {
        logger.error(`Failed to upload ${type} document:`, error);
        // If one upload fails, clean up any already uploaded files
        await this.cleanupUploadedFiles(results);
        throw new Error(`Failed to upload ${type} document: ${error.message}`);
      }
    }

    return results;
  }

  private getBrandFieldName(documentType: DocumentType): string {
    const fieldNameMap: Record<DocumentType, string> = {
      cancelled_cheque: "upload_cancelled_cheque_image",
      gst_certificate: "gst_certificate_image",
      pan_card: "PAN_image",
      fssai_certificate: "FSSAI_image",
      certificate_of_incorporation: "certificate_of_incorporation_image",
      msme_udyam_certificate: "MSME_or_Udyam_certificate_image",
      moa: "MOA_image",
      aoa: "AOA_image",
      trademark_certificate: "Trademark_certificate_image",
      authorized_signatory: "Authorized_Signatory_image",
      llp_agreement: "LLP_agreement_image",
      shop_establishment_certificate: "Shop_and_Establishment_certificate_image",
      partnership_deed: "Registered_Partnership_deed_image",
      board_resolution: "Board_resolution_image",
      areaMachine: "areaMachine_image",
    };

    return fieldNameMap[documentType];
  }

  private async cleanupUploadedFiles(results: Record<string, any>): Promise<void> {
    const deletePromises = Object.values(results).map(async result => {
      if (result && result.cloudinary_public_id) {
        try {
          await this.deleteFromCloudinary(result.cloudinary_public_id);
        } catch (error) {
          logger.error(`Failed to cleanup file:`, error);
        }
      }
    });

    await Promise.all(deletePromises);
  }

  async deleteMultipleFiles(publicIds: string[]): Promise<void> {
    const deletePromises = publicIds.map(id => this.deleteFromCloudinary(id));
    await Promise.all(deletePromises);
  }

  // Helper to extract public IDs from brand documents
  extractPublicIdsFromBrand(brandData: any): string[] {
    const publicIds: string[] = [];

    const documentFields = [
      "upload_cancelled_cheque_image",
      "gst_certificate_image",
      "PAN_image",
      "FSSAI_image",
      "certificate_of_incorporation_image",
      "MSME_or_Udyam_certificate_image",
      "MOA_image",
      "AOA_image",
      "Trademark_certificate_image",
      "Authorized_Signatory_image",
      "LLP_agreement_image",
      "Shop_and_Establishment_certificate_image",
      "Registered_Partnership_deed_image",
      "Board_resolution_image",
    ];

    documentFields.forEach(field => {
      if (brandData[field] && brandData[field].cloudinary_public_id) {
        publicIds.push(brandData[field].cloudinary_public_id);
      }
    });

    return publicIds;
  }
}
