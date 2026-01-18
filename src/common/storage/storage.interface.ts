/**
 * Storage Provider Interface
 *
 * This interface defines the contract for all storage providers.
 * Implement this interface to add support for new storage services.
 *
 * Supported providers:
 * - Cloudinary (implemented)
 * - AWS S3 (implemented)
 * - Google Cloud Storage (template)
 * - Azure Blob Storage (template)
 * - Local Storage (template)
 */

export interface IUploadResult {
    url: string;
    publicId: string;
    provider: string;
    metadata?: {
        width?: number;
        height?: number;
        format?: string;
        size?: number;
    };
}

export interface IUploadOptions {
    folder?: string;
    publicId?: string;
    resourceType?: 'auto' | 'image' | 'video' | 'raw';
    transformation?: any;
    tags?: string[];
    overwrite?: boolean;
}

export interface IDeleteResult {
    success: boolean;
    publicId: string;
    provider: string;
}

export interface IStorageProvider {
    /**
     * Provider name identifier
     */
    readonly providerName: string;

    /**
     * Initialize the storage provider
     * Called once when the provider is created
     */
    initialize(): Promise<void>;

    /**
     * Check if provider is properly configured
     */
    isConfigured(): boolean;

    /**
     * Upload a file to the storage provider
     * @param fileBuffer - File data as Buffer
     * @param fileName - Original file name
     * @param options - Upload options
     */
    upload(
        fileBuffer: Buffer,
        fileName: string,
        options?: IUploadOptions
    ): Promise<IUploadResult>;

    /**
     * Delete a file from the storage provider
     * @param publicId - The public ID or key of the file
     */
    delete(publicId: string): Promise<IDeleteResult>;

    /**
     * Get a signed URL for temporary access (optional)
     * @param publicId - The public ID or key of the file
     * @param expiresIn - Expiration time in seconds
     */
    getSignedUrl?(publicId: string, expiresIn?: number): Promise<string>;

    /**
     * Check if a file exists (optional)
     * @param publicId - The public ID or key of the file
     */
    exists?(publicId: string): Promise<boolean>;
}

/**
 * Storage configuration interface
 */
export interface IStorageConfig {
    provider: 'cloudinary' | 's3' | 'gcs' | 'azure' | 'local';

    // Cloudinary config
    cloudinary?: {
        cloudName: string;
        apiKey: string;
        apiSecret: string;
    };

    // AWS S3 config
    s3?: {
        accessKeyId: string;
        secretAccessKey: string;
        region: string;
        bucket: string;
        endpoint?: string; // For S3-compatible services like MinIO
    };

    // Google Cloud Storage config
    gcs?: {
        projectId: string;
        keyFilename: string;
        bucket: string;
    };

    // Azure Blob Storage config
    azure?: {
        connectionString: string;
        containerName: string;
    };

    // Local storage config
    local?: {
        uploadDir: string;
        baseUrl: string;
    };
}
