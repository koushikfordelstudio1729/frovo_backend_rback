import { v2 as cloudinary } from 'cloudinary';
import path from 'path';
import { ICategoryImageData, IProductImageData, ISubCategoryImageData } from '../models/Catalogue.model';

export class ImageUploadService {
    private cloudinaryConfigured = false;

    /**
     * Configure Cloudinary (lazy initialization)
     */
    private ensureCloudinaryConfigured() {
        if (!this.cloudinaryConfigured) {
            const config = {
                cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
                api_key: process.env.CLOUDINARY_API_KEY,
                api_secret: process.env.CLOUDINARY_API_SECRET,
            };

            // Validate configuration
            if (!config.cloud_name || !config.api_key || !config.api_secret) {
                console.error('❌ Cloudinary Configuration Missing:', {
                    cloud_name: config.cloud_name || '❌ MISSING',
                    api_key: config.api_key ? '✅ SET' : '❌ MISSING',
                    api_secret: config.api_secret ? '✅ SET' : '❌ MISSING'
                });
                throw new Error('Cloudinary configuration is incomplete. Please check your .env file.');
            }

            cloudinary.config(config);
            this.cloudinaryConfigured = true;

            console.log('✅ Cloudinary configured successfully:', {
                cloud_name: config.cloud_name,
                api_key: config.api_key.substring(0, 4) + '...'
            });
        }
    }
    /**
     * Upload a file to Cloudinary
     * @param fileBuffer - File buffer from multer
     * @param fileName - Original file name
     * @param folder - Cloudinary folder path
     * @returns Promise with upload result
     */
    async uploadToCloudinary(
        fileBuffer: Buffer,
        fileName: string,
        folder: string = 'frovo/category_documents'
    ): Promise<{ url: string; publicId: string }> {
        // Ensure Cloudinary is configured before upload
        this.ensureCloudinaryConfigured();

        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    resource_type: 'auto',
                    public_id: `${Date.now()}-${path.parse(fileName).name}`,
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
                        reject(new Error('Upload failed - no result'));
                    }
                }
            );

            uploadStream.end(fileBuffer);
        });
    }

    /**
     * Delete a file from Cloudinary
     * @param publicId - Cloudinary public ID
     * @returns Promise with deletion result
     */
    async deleteFromCloudinary(publicId: string): Promise<void> {
        // Ensure Cloudinary is configured before deletion
        this.ensureCloudinaryConfigured();

        try {
            await cloudinary.uploader.destroy(publicId);
        } catch (error) {
            throw new Error(`Failed to delete file from Cloudinary: ${error}`);
        }
    }

    /**
     * Create document metadata object (generic method for all image types)
     * @param file - Multer file object
     * @param cloudinaryUrl - URL from Cloudinary
     * @param cloudinaryPublicId - Public ID from Cloudinary
     * @returns Image metadata object
     */
    private createImageMetadata(
        file: Express.Multer.File,
        cloudinaryUrl: string,
        cloudinaryPublicId: string,
    ): ICategoryImageData | ISubCategoryImageData | IProductImageData {
        return {
            image_name: file.originalname,
            file_url: cloudinaryUrl,
            cloudinary_public_id: cloudinaryPublicId,
            file_size: file.size,
            mime_type: file.mimetype,
            uploaded_at: new Date(),
        };
    }

    /**
     * Create category document metadata
     */
    createCategoryDocumentMetadata(
        file: Express.Multer.File,
        cloudinaryUrl: string,
        cloudinaryPublicId: string,
    ): ICategoryImageData {
        return this.createImageMetadata(file, cloudinaryUrl, cloudinaryPublicId) as ICategoryImageData;
    }

    /**
     * Create sub-category document metadata
     */
    createSubCategoryDocumentMetadata(
        file: Express.Multer.File,
        cloudinaryUrl: string,
        cloudinaryPublicId: string,
    ): ISubCategoryImageData {
        return this.createImageMetadata(file, cloudinaryUrl, cloudinaryPublicId) as ISubCategoryImageData;
    }

    /**
     * Create product document metadata
     */
    createProductDocumentMetadata(
        file: Express.Multer.File,
        cloudinaryUrl: string,
        cloudinaryPublicId: string,
    ): IProductImageData {
        return this.createImageMetadata(file, cloudinaryUrl, cloudinaryPublicId) as IProductImageData;
    }
}
