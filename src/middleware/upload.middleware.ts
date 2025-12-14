import multer from 'multer';
import path from 'path';

// Configure multer for memory storage (we'll upload directly to Cloudinary)
const storage = multer.memoryStorage();

// File filter to accept only specific file types
const fileFilter = (_req: Express.Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  // Allowed file extensions
  const allowedExtensions = /pdf|jpg|jpeg|png|doc|docx|xls|xlsx/;

  // Allowed MIME types
  const allowedMimeTypes = [
    'application/pdf',
    'image/jpeg',
    'image/jpg',
    'image/png',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  ];

  // Check file extension
  const extname = allowedExtensions.test(path.extname(file.originalname).toLowerCase());

  // Check MIME type
  const mimetype = allowedMimeTypes.includes(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only PDF, JPG, PNG, DOC, DOCX, XLS, XLSX files are allowed.'));
  }
};

// Configure multer upload
export const upload = multer({
  storage: storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB max file size
  },
  fileFilter: fileFilter,
});

// Middleware for single file upload
export const uploadSingle = upload.single('document');

// Middleware for multiple file uploads (max 5 files)
export const uploadMultiple = upload.array('documents', 5);

// Middleware for PO line item images (any field name, max 50 files total)
// Field names should be like: images_0, images_1, images_2, etc.
export const uploadPOImages = upload.any();
