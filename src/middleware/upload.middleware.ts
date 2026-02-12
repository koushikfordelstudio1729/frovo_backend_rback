// upload.middleware.ts
import multer from "multer";
import path from "path";
import { ImageUploadService } from "../services/vendorFileUpload.service";
import { logger } from "../utils/logger.util";

const storage = multer.memoryStorage();

const fileFilter = (
  _req: Express.Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedExtensions = /pdf|jpg|jpeg|png|doc|docx|xls|xlsx/;

  const allowedMimeTypes = [
    "application/pdf",
    "image/jpeg",
    "image/jpg",
    "image/png",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "application/vnd.ms-excel",
    "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ];

  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error("Invalid file type. Only PDF, JPG, PNG, DOC, DOCX, XLS, XLSX files are allowed."));
  }
};

export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024,
  },
  fileFilter: fileFilter,
});

// Middleware to process uploaded files and upload to Cloudinary
export const processBrandDocuments = async (req: any, res: any, next: any) => {
  try {
    if (!req.files) {
      return next();
    }

    const imageUploadService = new ImageUploadService();

    // Process each uploaded file
    const processedFiles: any = {};

    // Get all file fields
    const fileFields = Object.keys(req.files);

    for (const fieldName of fileFields) {
      const files = req.files[fieldName];
      if (files && files.length > 0) {
        const file = files[0];

        // Map field name to document type
        const documentType = mapFieldNameToDocumentType(fieldName);

        if (documentType) {
          // Upload to Cloudinary using ImageUploadService
          const result = await imageUploadService.uploadDocument(
            file,
            documentType,
            // Optional: Pass brand/company info for folder organization
            req.body.brand_name || req.body.company_id
          );

          processedFiles[fieldName] = result;
        }
      }
    }

    // Attach processed files to request
    req.processedFiles = processedFiles;
    next();
  } catch (error: any) {
    logger.error("Error processing brand documents:", error);
    return res.status(500).json({
      success: false,
      message: "Failed to process uploaded documents",
      error: error.message,
    });
  }
};

// Helper function to map field names to document types
const mapFieldNameToDocumentType = (fieldName: string): any => {
  const mapping: Record<string, any> = {
    upload_cancelled_cheque_image: "cancelled_cheque",
    gst_certificate_image: "gst_certificate",
    PAN_image: "pan_card",
    FSSAI_image: "fssai_certificate",
    certificate_of_incorporation_image: "certificate_of_incorporation",
    MSME_or_Udyam_certificate_image: "msme_udyam_certificate",
    MOA_image: "moa",
    AOA_image: "aoa",
    Trademark_certificate_image: "trademark_certificate",
    Authorized_Signatory_image: "authorized_signatory",
    LLP_agreement_image: "llp_agreement",
    Shop_and_Establishment_certificate_image: "shop_establishment_certificate",
    Registered_Partnership_deed_image: "partnership_deed",
    Board_resolution_image: "board_resolution",
  };

  return mapping[fieldName] || null;
};

// Export middleware functions
export const uploadSingle = upload.single("document");
export const uploadMultiple = upload.array("documents", 5);

export const uploadBrandDocuments = [
  upload.fields([
    // Common mandatory documents
    { name: "upload_cancelled_cheque_image", maxCount: 1 },
    { name: "gst_certificate_image", maxCount: 1 },
    { name: "PAN_image", maxCount: 1 },
    { name: "FSSAI_image", maxCount: 1 },

    // Legal entity specific documents (all possible documents)
    { name: "certificate_of_incorporation_image", maxCount: 1 },
    { name: "MSME_or_Udyam_certificate_image", maxCount: 1 },
    { name: "MOA_image", maxCount: 1 },
    { name: "AOA_image", maxCount: 1 },
    { name: "Trademark_certificate_image", maxCount: 1 },
    { name: "Authorized_Signatory_image", maxCount: 1 },
    { name: "LLP_agreement_image", maxCount: 1 },
    { name: "Shop_and_Establishment_certificate_image", maxCount: 1 },
    { name: "Registered_Partnership_deed_image", maxCount: 1 },
    { name: "Board_resolution_image", maxCount: 1 },
  ]),
  processBrandDocuments,
];

export const uploadPOImages = upload.any();
export const uploadGRN = upload.fields([
  { name: "document", maxCount: 1 },
  { name: "damageProof", maxCount: 1 },
]);
export const uploadAreaFiles = upload.any();
