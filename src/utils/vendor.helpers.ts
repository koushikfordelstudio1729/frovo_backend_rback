import { Response } from "express";
import mongoose from "mongoose";
import { logger } from "./logger.util";

// ============================================
// CONSTANTS
// ============================================

export const VALID_LEGAL_STRUCTURES = [
  "pvt",
  "public",
  "opc",
  "llp",
  "proprietorship",
  "partnership",
] as const;
export const VALID_REGISTRATION_TYPES = ["cin", "msme"] as const;
export const VALID_PAYMENT_METHODS = [
  "upi",
  "bank_transfer",
  "cheque",
  "credit_card",
  "debit_card",
  "other",
] as const;
export const VALID_VERIFICATION_STATUSES = ["pending", "verified", "rejected"] as const;
export const VALID_COMPANY_STATUSES = ["active", "inactive"] as const;
export const VALID_BRAND_STATUSES = ["active", "inactive"] as const;

export const CIN_REQUIRED_STRUCTURES = ["pvt", "public", "opc"];
const MSME_ALLOWED_STRUCTURES = ["llp", "proprietorship", "partnership"];
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const DOCUMENT_TYPE_MAPPING: Record<string, string> = {
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

export const UPDATABLE_DOCUMENT_FIELDS = Object.keys(DOCUMENT_TYPE_MAPPING);

// ── Company-level compliance documents (always required on Company create) ──
export const COMPANY_COMPLIANCE_DOCUMENT_FIELDS = [
  "gst_certificate_image",
  "PAN_image",
  "FSSAI_image",
] as const;

// ── Brand-level document always required on Brand create ──
const BRAND_COMMON_DOCUMENT_FIELDS = ["upload_cancelled_cheque_image"] as const;

// ── Legal-entity-specific documents required on BOTH company and brand create ──
const ENTITY_SPECIFIC_DOCUMENTS: Record<string, string[]> = {
  pvt: [
    "certificate_of_incorporation_image",
    "MSME_or_Udyam_certificate_image",
    "MOA_image",
    "AOA_image",
    "Trademark_certificate_image",
    "Authorized_Signatory_image",
  ],
  opc: [
    "certificate_of_incorporation_image",
    "MSME_or_Udyam_certificate_image",
    "MOA_image",
    "AOA_image",
  ],
  llp: [
    "certificate_of_incorporation_image",
    "MSME_or_Udyam_certificate_image",
    "LLP_agreement_image",
  ],
  proprietorship: ["MSME_or_Udyam_certificate_image", "Shop_and_Establishment_certificate_image"],
  partnership: ["Registered_Partnership_deed_image", "MSME_or_Udyam_certificate_image"],
  public: [
    "certificate_of_incorporation_image",
    "Board_resolution_image",
    "MOA_image",
    "AOA_image",
  ],
};

export class ValidationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ValidationError";
  }
}

// ============================================
// VALIDATION HELPERS
// ============================================

export function validateMongoId(id: string, label: string = "ID"): void {
  if (!id || id.trim() === "") {
    throw new ValidationError(`${label} is required`);
  }
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError(`Invalid ${label} format. Must be a valid MongoDB ObjectId`);
  }
}

export function validateEmail(email: string): void {
  if (!EMAIL_REGEX.test(email)) {
    throw new ValidationError("Invalid email format");
  }
}

export function parseDateNotFuture(dateStr: string, fieldName: string): Date {
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    throw new ValidationError(`Invalid date format for ${fieldName}. Use ISO format (YYYY-MM-DD)`);
  }
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (parsed > today) {
    throw new ValidationError(`${fieldName} cannot be in the future`);
  }
  return parsed;
}

export function parseDate(dateStr: string, fieldName: string): Date {
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) {
    throw new ValidationError(`Invalid date format for ${fieldName}. Use ISO format (YYYY-MM-DD)`);
  }
  return parsed;
}

export function validateMissingFields(body: any, requiredFields: string[]): void {
  const missing = requiredFields.filter(
    field => body[field] === undefined || body[field] === null || body[field] === ""
  );
  if (missing.length > 0) {
    throw new ValidationError(`Missing required fields: ${missing.join(", ")}`);
  }
}

export function validateLegalEntityRelationship(
  structure: string | undefined,
  regType: string | undefined,
  currentCompany?: any
): void {
  const effectiveStructure = structure || currentCompany?.legal_entity_structure;
  const effectiveRegType = regType || currentCompany?.registration_type;

  if (!effectiveStructure || !effectiveRegType) return;

  if (CIN_REQUIRED_STRUCTURES.includes(effectiveStructure) && effectiveRegType !== "cin") {
    throw new ValidationError(
      `For legal entity structure '${effectiveStructure}', registration type must be 'cin'`
    );
  }

  if (MSME_ALLOWED_STRUCTURES.includes(effectiveStructure) && effectiveRegType !== "msme") {
    throw new ValidationError(
      `For legal entity structure '${effectiveStructure}', registration type must be 'msme'`
    );
  }
}
export function validateEnumValue(
  value: string,
  validValues: readonly string[],
  fieldName: string
): void {
  // Trim the value before validation
  const trimmedValue = value?.trim();

  if (!trimmedValue || !validValues.includes(trimmedValue)) {
    throw new ValidationError(`Invalid ${fieldName}. Must be one of: ${validValues.join(", ")}`);
  }
}
/**
 * Returns the list of required document field names for a given legal entity structure
 * when creating or updating a COMPANY.
 * Includes compliance docs (GST, PAN, FSSAI) + entity-specific docs.
 */
export function getRequiredCompanyDocumentsForLegalEntity(legalEntity: string): string[] {
  return [...COMPANY_COMPLIANCE_DOCUMENT_FIELDS, ...(ENTITY_SPECIFIC_DOCUMENTS[legalEntity] || [])];
}

/**
 * Returns the list of required document field names for a given legal entity structure
 * when creating or updating a BRAND.
 * Includes only the cancelled cheque + entity-specific docs
 * (compliance docs GST/PAN/FSSAI stay on the Company).
 */
export function getRequiredDocumentsForLegalEntity(legalEntity: string): string[] {
  return [...BRAND_COMMON_DOCUMENT_FIELDS, ...(ENTITY_SPECIFIC_DOCUMENTS[legalEntity] || [])];
}

export function getRequiredDocumentForCancelledCheque(): string[] {
  return [...BRAND_COMMON_DOCUMENT_FIELDS];
}
/**
 * Trims all top-level string values in the request body.
 * Returns a shallow copy so the original req.body is not mutated.
 */
export function normalizeBody(body: Record<string, any>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const key of Object.keys(body)) {
    const val = body[key];
    result[key] = typeof val === "string" ? val.trim() : val;
  }
  return result;
}

// ============================================
// RESPONSE HELPERS
// ============================================

export function handleControllerError(res: Response, error: unknown, context: string): void {
  logger.error(`Error ${context}:`, error);

  if (error instanceof ValidationError) {
    res.status(400).json({ success: false, message: error.message });
    return;
  }

  if (error instanceof Error) {
    const msg = error.message;
    const statusCode = (error as any).statusCode;

    if (statusCode === 403 || msg.includes("Access denied")) {
      res.status(403).json({ success: false, message: msg });
      return;
    }
    if (msg.includes("not found") || msg.includes("does not exist")) {
      res.status(404).json({ success: false, message: msg });
      return;
    }
    if (msg.includes("already exists") || msg.includes("duplicate key")) {
      res.status(409).json({ success: false, message: msg });
      return;
    }
    if (
      msg.includes("Invalid") ||
      msg.includes("Missing") ||
      error.name === "CastError" ||
      msg.includes("Cast to ObjectId failed")
    ) {
      res.status(400).json({ success: false, message: msg });
      return;
    }
  }

  res.status(500).json({
    success: false,
    message: "Internal server error",
    error: error instanceof Error ? error.message : "Unknown error",
  });
}

export function setExportHeaders(res: Response, format: string, filenameBase: string): void {
  const timestamp = Date.now();
  const contentTypes: Record<string, string> = {
    csv: "text/csv",
    json: "application/json",
    excel: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    pdf: "application/pdf",
  };
  const extensions: Record<string, string> = {
    csv: "csv",
    json: "json",
    excel: "xlsx",
    pdf: "pdf",
  };

  if (contentTypes[format]) {
    res.setHeader("Content-Type", contentTypes[format]);
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=${filenameBase}_${timestamp}.${extensions[format]}`
    );
  }
}

export function requireRole(userRole: string, allowedRoles: string[], action: string): void {
  if (!allowedRoles.includes(userRole)) {
    throw Object.assign(
      new Error(`Access denied. Only ${allowedRoles.join(" and ")} can ${action}`),
      { statusCode: 403 }
    );
  }
}

// ============================================
// CSV HELPERS
// ============================================

export function escapeCSVCell(cell: any): string {
  const cellStr = String(cell ?? "");
  if (cellStr.includes(",") || cellStr.includes('"') || cellStr.includes("\n")) {
    return `"${cellStr.replace(/"/g, '""')}"`;
  }
  return cellStr;
}

export function buildCSV(headers: string[], rows: string[][]): string {
  const headerLine = headers.join(",");
  const dataLines = rows.map(row => row.map(escapeCSVCell).join(","));
  return [headerLine, ...dataLines].join("\n");
}
