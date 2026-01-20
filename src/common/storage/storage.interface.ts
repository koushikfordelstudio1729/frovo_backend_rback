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
  resourceType?: "auto" | "image" | "video" | "raw";
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
  readonly providerName: string;

  initialize(): Promise<void>;

  isConfigured(): boolean;

  upload(fileBuffer: Buffer, fileName: string, options?: IUploadOptions): Promise<IUploadResult>;

  delete(publicId: string): Promise<IDeleteResult>;

  getSignedUrl?(publicId: string, expiresIn?: number): Promise<string>;

  exists?(publicId: string): Promise<boolean>;
}

export interface IStorageConfig {
  provider: "cloudinary" | "s3" | "gcs" | "azure" | "local";

  cloudinary?: {
    cloudName: string;
    apiKey: string;
    apiSecret: string;
  };

  s3?: {
    accessKeyId: string;
    secretAccessKey: string;
    region: string;
    bucket: string;
    endpoint?: string;
  };

  gcs?: {
    projectId: string;
    keyFilename: string;
    bucket: string;
  };

  azure?: {
    connectionString: string;
    containerName: string;
  };

  local?: {
    uploadDir: string;
    baseUrl: string;
  };
}
