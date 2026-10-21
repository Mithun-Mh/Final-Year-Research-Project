// ── Upload response (POST /api/dpp/upload) ──────────────────────────
export interface DppUploadResponse {
  dppId: string;
  fieldsExtracted: number;
  fields: DppFieldSummary[];
  classification: DppClassification;
  supportedFormats: string[];
  /** True when majority of fields were confidential and the file was stored AES-256-CBC encrypted in the DB */
  documentEncrypted?: boolean;
}

/**
 * Returned by POST /api/Marketplace/transactions/{id}/invoice.
 * Shape mirrors DppUploadResponse so ClassificationResultScreen is reusable.
 * dppId here is the transactionId.
 */
export interface InvoiceUploadResponse {
  dppId: string;
  message: string;
  fieldsExtracted: number;
  fields: DppFieldSummary[];
  classification: DppClassification;
  supportedFormats: string[];
}

export interface DppFieldSummary {
  fieldName: string;
  isConfidential: boolean;
  confidenceScore: number;
  hasValue: boolean;
  /** Plain value for non-confidential fields; null/undefined for encrypted ones */
  extractedValue?: string | null;
}

export interface DppClassification {
  classification: 'CONFIDENTIAL' | 'NON_CONFIDENTIAL';
  confidenceScore: number;
  confidenceLevel: string;
  systemAction: string;
  explanation: string;
  influentialKeywords: string[];
  /** Total fields Gemini extracted from the document */
  geminiExtractedCount: number;
  publicFieldCount: number;
  confidentialFieldCount: number;
}
/**
 * Returned by GET /api/Marketplace/transactions/{id}/invoice-fields.
 * Confidential fields carry their AES-256-CBC decrypted plaintext value;
 * non-confidential fields carry the value stored directly in the database.
 */
export interface InvoiceDecryptedField {
  /** Machine-friendly field key, e.g. "invoiceNumber", "totalAmount" */
  fieldName: string;
  /** Decrypted plaintext value; null if field had no value or decryption failed */
  value: string | null;
  /** True when the field was classified as commercially sensitive at upload time */
  isConfidential: boolean;
}
// ── Digital Product Passport (GET /api/dpp/passport/{dppId}) ─────────
export interface DigitalProductPassport {
  id: string;
  lotId: string;
  rubberGrade: string;
  quantity: number;
  dispatchDetails: string;
  confidentialDataExists: boolean;
  /** GENERATED | VERIFIED | REINSPECTION_REQUESTED | ACCEPTED | REJECTED */
  lifecycleState: string;
  dppHash: string;
  createdAt: string;
}

// ── DppDocument (GET /api/dpp/my-uploads) ────────────────────────────
export interface DppDocument {
  id: string;
  originalFileName: string;
  classification: string;
  confidenceScore: number;
  uploadedAt: string;
  uploadedBy: string;
  extractedTextSummary?: string;
  detectedKeywords: string[];
  contentType: string;
  /** True when the file was stored as an AES-256-CBC encrypted .enc file */
  isDocumentEncrypted?: boolean;
  encryptedFilePath?: string;
}

// ── Encrypted File Info (GET /api/dpp/{id}/encrypted-file-info) ────────────
export interface EncryptedFileInfo {
  dppId: string;
  originalFileName: string;
  contentType: string;
  isEncrypted: boolean;
  algorithm: string;
  ivDescription: string;
  keyManagement: string;
  encryptedFileName: string;
  encryptedSizeBytes: number | null;
  encryptedAt: string;
  collection: string;
  decryptAccess: string;
}

// ── Marketplace ───────────────────────────────────────────────────────
export interface SellingPost {
  id: string;
  buyerId: string;
  buyerName: string;
  grade: string;
  quantityKg: number;
  pricePerKg: number;
  location: string;
  dppDocumentId?: string;
  status: 'Active' | 'Sold' | 'Archived' | 'AVAILABLE' | 'REQUESTED' | 'APPROVED' | 'COMPLETED' | 'REJECTED' | 'REINSPECTION';
  soldToExporterId?: string;
  createdAt: string;
}

export interface MarketplaceTransaction {
  id: string;
  postId: string;
  exporterId: string;
  exporterName: string;
  buyerId: string;
  /** PendingInvoice → InvoiceUploaded → QirUploaded → Completed */
  status: 'PendingInvoice' | 'InvoiceUploaded' | 'QirUploaded' | 'Completed';
  offerPrice: number;
  lastUpdatedAt: string;
  dppInvoicePath?: string;
  dppClassification?: string;
  encryptionMetadata?: string;
  dppDocumentId?: string;
  /** Safe invoice fields extracted by Gemini. Confidential values are null. */
  invoiceFields?: Record<string, string | null>;
  /** Safe QIR fields extracted by Gemini. Confidential values are null. */
  qirFields?: Record<string, string | null>;
  qirClassification?: string;
  /** Exporter's uploaded supporting documents (shipping certs, origin docs, etc.) */
  exporterDocsPath?: string;
  exporterDocsOriginalName?: string;
  exporterDocsUploadedAt?: string;
}

/**
 * Returned by POST /api/Marketplace/transactions/{id}/qir.
 * Shape mirrors InvoiceUploadResponse so ClassificationResultScreen is reusable.
 * dppId here is the transactionId.
 */
export interface QirUploadResponse {
  dppId: string;
  message: string;
  fieldsExtracted: number;
  fields: DppFieldSummary[];
  classification: DppClassification;
  supportedFormats: string[];
}

/**
 * Returned by GET /api/Marketplace/transactions/{id}/qir-fields.
 */
export interface QirDecryptedField {
  fieldName: string;
  value: string | null;
  isConfidential: boolean;
}

export interface UploadState {
  isLoading: boolean;
  error: string | null;
  result: DppUploadResponse | null;
}

// ── DPP Hash Verification (GET /api/dpp/verify/{lotId}) ───────────────
export interface DppVerificationResponse {
  isValid: boolean;
  recalculatedHash: string;
  storedHash: string;
}

// ── Buyer History (GET /api/marketplace/buyer-history/{buyerId}) ────────
export interface BuyerHistory {
  buyerId: string;
  totalLots: number;
  accepted: number;
  rejected: number;
  reInspections: number;
  averageQuality: number;
  verificationConsistency: 'High' | 'Medium' | 'Low';
  lastActivityDate: string | null;
}

// ── Exporter DPP View (GET /api/Marketplace/transactions/{id}/exporter-dpp) ──
/**
 * A single field in the exporter's view of the DPP.
 * Confidential buyer fields have value = null and isConfidential = true.
 */
export interface ExporterDppField {
  fieldName: string;
  value: string | null;
  isConfidential: boolean;
}

/**
 * Combined Digital Product Passport for a lot, as seen by the purchasing exporter.
 * Derived from the invoice + QIR files uploaded by the buyer.
 * Only the exporter who purchased the lot can access this data.
 */
export interface ExporterDppView {
  transactionId: string;
  /** PendingInvoice | InvoiceUploaded | QirUploaded | Completed */
  status: string;
  exporterName: string;
  /** Masked buyer ID (first 8 chars) */
  buyerRef: string;
  offerPrice: number;
  lastUpdatedAt: string;
  invoiceClassification: string | null;
  qirClassification: string | null;
  invoiceFields: ExporterDppField[];
  qirFields: ExporterDppField[];
  generatedAt: string;
}

// ── Lot-Linked Messaging ───────────────────────────────────────────────
export interface MessageDto {
  id: string;
  lotId: string;
  senderId: string;
  receiverId: string;
  content: string;
  isConfidential: boolean;
  createdAt: string;
}

export interface SendMessageRequest {
  receiverId: string;
  content: string;
  isConfidential: boolean;
}

// ── Interested Exporter (Trust-Scored Leaderboard) ─────────────────────
export interface InterestedExporter {
  interestId: string;
  exporterId: string;
  exporterName: string;
  country: string | null;
  organizationType: string | null;
  isVerified: boolean;
  requestedAt: string;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
}

export interface AcceptExporterRequest {
  exporterId: string;
}

// ── Lot Interest Request (Exporter → Buyer) ───────────────────────────
export interface LotInterestRequest {
  id: string;
  postId: string;
  /** PENDING | ACCEPTED | REJECTED */
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  requestedAt: string;
  trustScore: number;
}

// ── Dual-Layer DPP (Zero-Knowledge Delivery) ──────────────────────────
export interface DualLayerDppResponse {
  publicSummary: {
    lotId: string;
    rubberGrade: string;
    quantity: number;
    dppHash: string;
  };
  /** "CONFIDENTIAL" | "PUBLIC" | "NOT_UPLOADED" */
  documentStatus: string;
  /** CONFIDENTIAL: PBKDF2-AES-256-CBC ciphertext (Base64). PUBLIC: raw file bytes (Base64). */
  documentPayload: string;
  /** AES IV (Base64) — derived deterministically from PBKDF2 alongside the key */
  ivBase64: string;
}
