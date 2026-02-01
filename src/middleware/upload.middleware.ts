import multer from "multer";
import path from "path";

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

export const uploadSingle = upload.single("document");

export const uploadMultiple = upload.array("documents", 5);

export const uploadPOImages = upload.any();

export const uploadGRN = upload.fields([{ name: "document", maxCount: 1 }]);

// ✅ ADD THIS NEW EXPORT FOR AREA ROUTES
export const uploadAreaFiles = upload.any(); // Accepts any field name

// ✅ OR if you want to be specific about field names:
// export const uploadAreaFiles = upload.fields([
//   { name: "files", maxCount: 10 },
//   { name: "machine_image", maxCount: 10 },
//   { name: "sub_locations.select_machines.machine_image", maxCount: 10 },
// ]);