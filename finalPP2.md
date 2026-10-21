# finalPP2 — Working Component Implementation Reference

This document describes every working component implemented across the **DPP Module** (backend + frontend) and the **Marketplace Module** (backend + frontend) of the RubberIntelligence system.

---

## Table of Contents

1. [Backend — DPP Module (`Modules/dpp`)](#backend--dpp-module)
   - [Controllers](#backend-dpp-controllers)
   - [Services](#backend-dpp-services)
   - [Models](#backend-dpp-models)
   - [DTOs](#backend-dpp-dtos)
2. [Backend — Marketplace Module (`Modules/Marketplace`)](#backend--marketplace-module)
   - [Controllers](#backend-marketplace-controllers)
   - [Services](#backend-marketplace-services)
   - [Models](#backend-marketplace-models)
   - [DTOs](#backend-marketplace-dtos)
3. [Frontend — DPP Feature (`src/features/dpp`)](#frontend--dpp-feature)
   - [Services](#frontend-dpp-services)
   - [Screens](#frontend-dpp-screens)
   - [Types](#frontend-dpp-types)

---

## Backend — DPP Module

**Location:** `RubberIntelligence.Backend/RubberIntelligence.API/Modules/dpp/`

### Backend DPP Controllers

---

#### `DppController.cs`

**Route:** `POST /api/dpp/upload` — `GET /api/dpp/...`  
**Roles:** `Buyer`, `Admin`, `Exporter`

Orchestrates the complete DPP document ingestion pipeline:

| Step | Action |
|------|--------|
| 1 | Validates uploaded file MIME type (JPEG, PNG, WEBP, GIF, PDF only) |
| 2 | Saves file to `Uploads/Dpp/` temp folder |
| 3 | Calls `GeminiOcrService` to extract structured fields from the document |
| 4 | Calls `OnnxDppService` to classify the document as `CONFIDENTIAL` or `NON_CONFIDENTIAL` |
| 5 | Pre-generates a `docId` (MongoDB ObjectId) before persistence |
| 6 | Calls `DppDocumentProcessingService.ProcessFields()` to per-field classify and encrypt confidential fields |
| 7 | Encrypts the raw file with AES-256-CBC via `DppEncryptionService` |
| 8 | Saves the `DppDocument` record to MongoDB |
| 9 | Returns upload response with classification and lot reference |

**Other implemented endpoints:**

| Method | Route | Description |
|--------|-------|-------------|
| `POST` | `/api/dpp/{dppId}/generate-passport` | Generates and persists a `DigitalProductPassport` |
| `GET` | `/api/dpp/passport/{dppId}` | Retrieves a DPP with integrity hash |
| `GET` | `/api/dpp/my-uploads` | Returns all documents uploaded by the authenticated buyer |
| `GET` | `/api/dpp/{id}` | Returns DppDocument metadata |
| `GET` | `/api/dpp/{id}/access` | Returns the encrypted file for download |
| `GET` | `/api/dpp/verify/{lotId}` | Verifies DPP hash integrity (re-serialises and compares SHA-256) |
| `POST` | `/api/dpp/{dppId}/grant-access` | Buyer grants exporter access to a confidential DPP |
| `GET` | `/api/dpp/{dppId}/exporter-view` | Returns decrypted field values to an authorised exporter |
| `GET` | `/api/dpp/{id}/encrypted-file-info` | Returns RSA-wrapped AES key and IV metadata |

---

#### `MessageController.cs`

**Route:** `POST|GET /api/messages/{lotId}`  
**Auth:** All authenticated users

Lot-linked secure messaging. Key behaviours:

- `POST /api/messages/{lotId}` — Sends a message; if `IsConfidential = true` the content is AES-256 encrypted via `MessageService` before storage.
- `GET /api/messages/{lotId}` — Retrieves all messages for a lot, decrypting confidential payloads on the fly for authorised participants.
- `GET /api/messages/unread-count` — Returns the unread message count for the current user.

---

### Backend DPP Services

---

#### `GeminiOcrService.cs`

Calls Google Gemini Vision API to extract structured fields from uploaded documents.

- **DPP documents:** Extracts `rubberGrade`, `quantity`, `pricePerKg`, `totalAmount`, `dispatchPort`, `origin`
- **Invoice documents:** Extracts `invoiceNumber`, `invoiceDate`, `sellerName`, `buyerName`, `totalAmount`, `taxAmount`, `currency`, `paymentTerms`, `lotReference`
- **QIR documents:** Extracts `rubberGrade`, `lotQuantityKg`, `moistureContent`, `dirtContent`, `ashContent`, `nitrogenContent`, `plasticityRetentionIndex`, `wallaceRapidPlasticity`, `mooneyViscosity`, `odour`, `colour`, `inspectionDate`, `inspectorName`
- Handles `429 Too Many Requests` from Gemini with a client-readable error response.
- Reads `GOOGLE_API_KEY` from environment variable or `appsettings.json`.

---

#### `OnnxDppService.cs`

Classifies documents as `CONFIDENTIAL` or `NON_CONFIDENTIAL` using a hybrid ONNX + keyword-heuristic approach.

- Loads `dpp_classifier_model_large.onnx` **once** at startup (Singleton safe).
- Falls back to `AnalyzeContent()` keyword heuristics if the ONNX session fails to load.
- Returns a `ClassificationResultDto` with:
  - `Classification` — `CONFIDENTIAL` | `NON_CONFIDENTIAL`
  - `ConfidenceScore` — float 0–1
  - `ConfidenceLevel` — `Very High` / `High` / `Moderate`
  - `SystemAction` — `ENCRYPT + RESTRICT ACCESS` | `ALLOW NORMAL VIEWING`
  - `InfluentialKeywords` — keywords that influenced the decision
- Contains a separate pipeline for **Secure Invoice Processing** (AES-256 encryption of invoice field values).

---

#### `DppDocumentProcessingService.cs`

Pre-persistence field processing pipeline.

- Calls `FieldConfidentialityService` on every extracted field.
- For confidential fields: calls `FieldEncryptionService` (AES-256-CBC) and `BlindIndexService` (HMAC-SHA256) to produce a searchable blind index.
- Returns a list of `ExtractedField` records — never stores confidential plaintext in `ExtractedTextSummary`.

---

#### `DppService.cs`

Assembles and persists a `DigitalProductPassport`.

- Retrieves all `ExtractedField` records for the given `dppId` (= `LotId`).
- Separates confidential from non-confidential fields.
- Populates DPP fields from **public fields only** — confidential fields are excluded from the passport.
- Sets `ConfidentialDataExists = true` when any confidential field exists.
- Serialises the DPP to JSON and computes a **SHA-256 hash** stored as `DppHash`.
- Uses millisecond-truncated `DateTime` to guarantee hash reproducibility after MongoDB roundtrip.

---

#### `DppEncryptionService.cs`

AES-256-CBC file-level encryption with hybrid RSA key wrapping.

- Generates a unique **AES-256 key** per document via `RandomNumberGenerator`.
- Generates a fresh **16-byte IV** (CSPRNG) prepended to the output file.
- Wraps the AES key with **RSA-2048** (`EncryptionKeyProvider`) — the wrapped key is stored in MongoDB; the raw key is never persisted.
- Decryption: unwrap AES key with RSA → read IV from first 16 bytes → AES-CBC decrypt.

---

#### `FieldEncryptionService.cs`

Per-field AES-256-CBC encryption for confidential extracted values.

- Each field value encrypted with a unique IV (prepended).
- Ciphertext stored as Base64 in `ExtractedField.EncryptedValue`.
- Uses the same `EncryptionKeyProvider` key store as the file encryption pipeline.

---

#### `BlindIndexService.cs`

Produces deterministic HMAC-SHA256 blind indexes for searchable encrypted fields.

- Normalises input: `fieldName.ToLower() + "|" + value.Trim().ToLower()`
- HMAC key is separate from the AES encryption key (different key slot in `EncryptionKeyProvider`).
- Output: URL-safe Base64 (43 chars) — safe for MongoDB queries and API URLs.
- Prevents cross-field hash collisions by scoping the hash to the field name.

---

#### `FieldConfidentialityService.cs`

Rule-based field-level confidentiality classification using a two-tier keyword corpus.

| Tier | Confidence | Examples |
|------|-----------|---------|
| High (Tier 1) | 0.95 | `price`, `bank`, `supplier`, `tax id`, `contract number`, `password` |
| Medium (Tier 2) | 0.75 | Geographic routing, shipment schedules, inspection lab names |
| Non-confidential | 0.80 | All other fields (e.g., `rubberGrade`, `quantity`) |

---

#### `ExporterContextService.cs`

Provides exporter profile context to a buyer reviewing an access request.

- Queries `IUserRepository` for exporter profile (name, country, organisation type).
- Queries `IMarketplaceRepository` for shared transaction history.
- Returns `ExporterContextDto` with:
  - `PlatformTenureMonths` — calculated from `exporter.CreatedAt`
  - `TotalCollaborationsWithBuyer` — count of shared transactions
  - `LastCollaborationDate`
  - `IsVerified` — maps to `exporter.IsApproved`

---

#### `MessageService.cs`

Handles secure lot-linked messaging.

- Encrypts message content with AES-256-CBC when `IsConfidential = true`.
- Decrypts on retrieval for authorised participants only.
- Stores `SenderId`, `ReceiverId`, `LotId`, `SentAt`, `IsRead` metadata.

---

### Backend DPP Models

| Model | Key Fields |
|-------|-----------|
| `DigitalProductPassport` | `Id`, `LotId`, `RubberGrade`, `Quantity`, `DispatchDetails`, `ConfidentialDataExists`, `LifecycleState` (`GENERATED`/`VERIFIED`/`ACCEPTED`/`REJECTED`/`REINSPECTION_REQUESTED`), `DppHash`, `CreatedAt` |
| `DppDocument` | `Id`, `UploadedByUserId`, `LotId`, `OriginalFileName`, `EncryptedFilePath`, `EncryptedAesKey`, `ExtractedTextSummary`, `ClassificationResult`, `CreatedAt` |
| `ExtractedField` | `Id`, `LotId`, `FieldName`, `EncryptedValue`, `BlindIndex`, `IsConfidential`, `ConfidenceScore` |
| `DocumentAccessGrant` | `Id`, `DppId`, `GrantedToUserId`, `GrantedAt`, `ExpiresAt` |
| `Message` | `Id`, `LotId`, `SenderId`, `ReceiverId`, `EncryptedContent`, `IsConfidential`, `SentAt`, `IsRead` |

---

### Backend DPP DTOs

| DTO | Purpose |
|-----|---------|
| `DocumentUploadRequest` | `[FromForm]` file upload + optional metadata |
| `ClassificationResultDto` | ONNX/heuristic classification output |
| `DppVerificationResponseDto` | Hash match result + lifecycle state |
| `InvoiceUploadResponseDto` | Invoice OCR + encryption result |
| `ExporterContextDto` | Exporter profile data for buyer access-review UI |
| `GrantAccessRequest` | `ExporterId` for DPP access grant |
| `MessageDto` | Decrypted message payload for client |

---

## Backend — Marketplace Module

**Location:** `RubberIntelligence.Backend/RubberIntelligence.API/Modules/Marketplace/`

### Backend Marketplace Controllers

---

#### `MarketplaceController.cs`

**Route:** `api/[controller]`

Implements the full rubber lot buying/selling workflow:

**Selling Posts**

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| `POST` | `/api/Marketplace/posts` | Buyer, Admin | Creates a new rubber lot selling post |
| `GET` | `/api/Marketplace/posts` | All | Returns all active posts (Exporter/Admin) or own posts (Buyer) |
| `GET` | `/api/Marketplace/posts/my-requests` | Buyer | Returns buyer's own posts with `REQUESTED` status |

**Transactions**

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| `POST` | `/api/Marketplace/posts/{id}/buy` | Exporter | Express interest in a lot (creates transaction) |
| `GET` | `/api/Marketplace/transactions` | All | Returns transactions for the current user |
| `POST` | `/api/Marketplace/transactions/{id}/invoice` | Exporter | Uploads invoice; OCR extracts fields; AES + ZK encryption applied |
| `POST` | `/api/Marketplace/transactions/{id}/dpp` | Buyer | Links a DPP document to a transaction |
| `GET` | `/api/Marketplace/transactions/{id}/dual-layer-dpp` | Exporter | Returns public DPP summary + encrypted CONFIDENTIAL file info |
| `GET` | `/api/Marketplace/transactions/{id}/my-secret` | Exporter | One-time retrieval of `SecretRequestId` (ZK key delivery) |

**Buyer Intelligence**

| Method | Route | Role | Description |
|--------|-------|------|-------------|
| `GET` | `/api/Marketplace/buyers/{buyerId}/history` | Exporter | Returns buyer's trading history and quality metrics |
| `POST` | `/api/Marketplace/exporters/{id}/docs` | Exporter | Uploads exporter verification documents |

---

### Backend Marketplace Services

---

#### `ZeroKnowledgeEncryptionService.cs`

Implements **Conditional "Bank Statement" Zero-Knowledge Encryption**.

**Encryption:**
- KDF: PBKDF2-HMAC-SHA256, **100 000 iterations**, 256-bit key + 128-bit IV derived together.
- Password: `SecretRequestId` (known only to the purchasing exporter — delivered via one-time endpoint).
- Salt: UTF-8 bytes of `transactionId` (prevents cross-lot attacks).
- After encryption, `SecretRequestId` is **permanently nullified** in MongoDB — even a full DB breach cannot reveal CONFIDENTIAL file content.

**Client-side decryption (frontend):**
- Mirrors the same PBKDF2 derivation using `crypto-js` on the exporter's device.
- The backend never participates in decryption after key delivery.

---

#### `BuyerHistoryService.cs`

Builds buyer intelligence profiles for exporters to review before engaging.

- Aggregates all `SellingPost` records for the buyer.
- Counts: `Accepted`, `Rejected`, `ReInspections`.
- Fetches linked `DigitalProductPassport` records to calculate `AverageQuality` (grade-to-score mapping).
- `VerificationConsistency`: `High` (≥80% posts have DPP), `Medium` (≥40%), `Low` (<40%).
- Returns `BuyerHistoryDto`.

---

### Backend Marketplace Models

| Model | Key Fields |
|-------|-----------|
| `SellingPost` | `Id`, `BuyerId`, `BuyerName`, `Title`, `Description`, `RubberGrade`, `QuantityKg`, `PricePerKg`, `Status`, `DppDocumentId`, `InterestedExporters`, `CreatedAt` |
| `MarketplaceTransaction` | `Id`, `PostId`, `BuyerId`, `ExporterId`, `Status`, `InvoiceCiphertext` (Base64), `SecretRequestId` (nullified post-encryption), `TransactionKey`, `LastUpdatedAt` |
| `LotInterestRequest` | `ExporterId`, `PostId`, `Message` |

---

### Backend Marketplace DTOs

| DTO | Purpose |
|-----|---------|
| `BuyerHistoryDto` | Buyer analytics: lots, acceptance rate, avg quality, verification consistency |
| `InvoiceFieldDecryptedDto` | Decrypted invoice field key/value pair |
| `QirDtos` | QIR (Quality Inspection Report) upload request and response |

---

## Frontend — DPP Feature

**Location:** `rubber-intelligence-app/src/features/dpp/`

### Frontend DPP Services

---

#### `dppService.ts`

All DPP API calls via `apiClient`:

| Function | HTTP | Endpoint | Description |
|----------|------|----------|-------------|
| `uploadDppDocument` | POST | `/dpp/upload` | Multipart upload of DPP document |
| `generatePassport` | POST | `/dpp/{dppId}/generate-passport` | Triggers server-side DPP generation |
| `getPassport` | GET | `/dpp/passport/{dppId}` | Fetches a DigitalProductPassport |
| `getBuyerDocuments` | GET | `/dpp/my-uploads` | Lists buyer's uploaded documents |
| `getDppMetadata` | GET | `/dpp/{id}` | Fetches DppDocument metadata |
| `getDppFileUrl` | — | `/dpp/{id}/access` | Constructs authenticated file download URL |
| `verifyDpp` | GET | `/dpp/verify/{lotId}` | Verifies DPP hash integrity |
| `getEncryptedFileInfo` | GET | `/dpp/{id}/encrypted-file-info` | Returns RSA-wrapped AES key + IV |
| `getPendingAccessRequests` | GET | `/Marketplace/posts/my-requests` | Returns buyer's pending exporter requests |

---

#### `marketplaceService.ts`

All Marketplace API calls:

| Function | HTTP | Endpoint | Description |
|----------|------|----------|-------------|
| `createSellingPost` | POST | `/Marketplace/posts` | Creates a new selling post |
| `getSellingPosts` | GET | `/Marketplace/posts` | Lists posts (optionally filtered by buyerId) |
| `buyItem` | POST | `/Marketplace/posts/{id}/buy` | Exporter expresses interest |
| `getMyTransactions` | GET | `/Marketplace/transactions` | Lists current user's transactions |
| `uploadInvoice` | POST | `/Marketplace/transactions/{id}/invoice` | Multipart invoice upload (2 min timeout) |
| `linkDppToTransaction` | POST | `/Marketplace/transactions/{id}/dpp` | Links DPP to a transaction |
| `getDualLayerDpp` | GET | `/Marketplace/transactions/{id}/dual-layer-dpp` | Fetches ZK-protected DPP view |
| `claimSecret` | GET | `/Marketplace/transactions/{id}/my-secret` | One-time secret delivery |
| `expressInterest` | POST | `/Marketplace/posts/{id}/interest` | Exporter expresses structured interest |
| `getBuyerHistory` | GET | `/Marketplace/buyers/{id}/history` | Fetches buyer analytics |
| `uploadExporterDocs` | POST | `/Marketplace/exporters/{id}/docs` | Exporter document upload |
| `getMyInterestRequests` | GET | `/Marketplace/posts/interest-requests` | Lists exporter's interest requests |

---

#### `messagesService.ts`

Secure lot-linked messaging API calls:

| Function | Description |
|----------|-------------|
| `sendMessage` | Sends a message (optionally confidential) |
| `getMessages` | Retrieves decrypted messages for a lot |
| `getUnreadMessageCount` | Returns the unread count for the current user |

---

### Frontend DPP Screens

| Screen | Role | Description |
|--------|------|-------------|
| `DocumentUploadScreen.tsx` | Buyer | File picker + upload flow; shows `ClassificationResultScreen` on completion |
| `ClassificationResultScreen.tsx` | Buyer | Displays ONNX/heuristic classification result with confidence score and influential keywords |
| `InvoiceExtractedFieldsScreen.tsx` | Buyer | Shows OCR-extracted invoice fields after document upload |
| `DppPassportScreen.tsx` | Buyer | Displays the generated `DigitalProductPassport` with `DppHash` |
| `DppDetailScreen.tsx` | Buyer | Full DPP document detail view with encrypted file download |
| `BuyerDashboardScreen.tsx` | Buyer | Buyer home; lists uploaded documents, links to passport and marketplace |
| `BuyerProfileScreen.tsx` | Buyer | Buyer profile and account information |
| `CreateSellingPostScreen.tsx` | Buyer | Form to create a new rubber lot selling post with DPP linkage |
| `PendingRequestsScreen.tsx` | Buyer | Shows exporters who have requested access; includes `ExporterContextDto` display |
| `MarketplaceScreen.tsx` | Exporter | Tabbed hub (`overview`, `marketplace`, `transactions`); browse lots, verify DPPs, manage transactions |
| `ExporterDppViewScreen.tsx` | Exporter | Decrypted field-level DPP view after buyer grants access |
| `ExporterScannerScreen.tsx` | Exporter | QR code scanner for physical lot verification; compares scanned hash against `DppHash` |
| `DualLayerDppScreen.tsx` | Exporter | ZK dual-layer view: public DPP summary + QR + one-time key entry for AES-256-CBC client-side decryption |
| `LotBiddersScreen.tsx` | Exporter | Lists all exporters who expressed interest in a lot |
| `LotMessagingScreen.tsx` | All | Lot-linked secure messaging UI; confidential messages encrypted end-to-end |
| `OrderReceiptScreen.tsx` | Exporter | Transaction receipt after lot acceptance |
| `QirExtractedFieldsScreen.tsx` | All | QIR document extracted fields viewer |

---

### Frontend DPP Types

**Location:** `src/features/dpp/types/index.ts`

Key TypeScript interfaces used across all DPP screens and services:

| Type | Purpose |
|------|---------|
| `DppUploadResponse` | Response from document upload including `dppId`, `classification`, `extractedFields` |
| `DppDocument` | Document metadata: `id`, `lotId`, `originalFileName`, `classificationResult`, `createdAt` |
| `DigitalProductPassport` | Passport: `id`, `lotId`, `rubberGrade`, `quantity`, `dppHash`, `lifecycleState`, `confidentialDataExists` |
| `DppVerificationResponse` | `isValid`, `computedHash`, `storedHash`, `lifecycleState` |
| `EncryptedFileInfo` | `encryptedAesKey` (RSA-wrapped Base64), `ivBase64` |
| `SellingPost` | Marketplace lot: `id`, `buyerId`, `rubberGrade`, `quantityKg`, `pricePerKg`, `status`, `dppDocumentId` |
| `MarketplaceTransaction` | `id`, `postId`, `buyerId`, `exporterId`, `status`, `transactionKey` |
| `LotInterestRequest` | Exporter's interest request with message |
| `BuyerHistory` | `totalLots`, `accepted`, `rejected`, `averageQuality`, `verificationConsistency` |
| `DualLayerDppResponse` | `publicSummary` (DPP fields), `confidentialCiphertext` (Base64 or null), `isConfidential` |
| `InvoiceDecryptedField` | `fieldName`, `decryptedValue` |

---

## Security Architecture Summary

| Layer | Mechanism |
|-------|----------|
| **File encryption** | AES-256-CBC, unique key per document, IV prepended to ciphertext |
| **Key wrapping** | RSA-2048 wraps per-document AES key; raw key never stored |
| **Field encryption** | AES-256-CBC per field, unique IV per field |
| **Searchable encryption** | HMAC-SHA256 blind indexes (key separate from encryption key) |
| **ZK invoice encryption** | PBKDF2-SHA256 (100 000 iter) + AES-256-CBC; key nullified post-encryption |
| **Client-side decryption** | Exporter device decrypts ZK documents using `crypto-js` PBKDF2; backend never holds the decrypted key after delivery |
| **Document classification** | ONNX neural model + two-tier keyword heuristic fallback |
| **Hash integrity** | SHA-256 of serialised DPP JSON stored in `DppHash`; re-computable for verification |
| **Auth** | JWT Bearer; role claims (`Buyer`, `Exporter`, `Admin`) enforced at controller level |
| **Access grants** | `DocumentAccessGrant` records gate exporter field-level DPP access; buyer-initiated |

---

## API Endpoint Quick Reference

| Endpoint | Method | Role | Module |
|----------|--------|------|--------|
| `/api/dpp/upload` | POST | Buyer/Admin | DPP |
| `/api/dpp/{id}/generate-passport` | POST | Buyer/Admin | DPP |
| `/api/dpp/passport/{id}` | GET | All | DPP |
| `/api/dpp/verify/{lotId}` | GET | Buyer/Exporter | DPP |
| `/api/dpp/{id}/access` | GET | Authorised | DPP |
| `/api/dpp/{id}/grant-access` | POST | Buyer | DPP |
| `/api/dpp/{id}/exporter-view` | GET | Exporter | DPP |
| `/api/messages/{lotId}` | POST | All | DPP |
| `/api/messages/{lotId}` | GET | All | DPP |
| `/api/messages/unread-count` | GET | All | DPP |
| `/api/Marketplace/posts` | POST/GET | Buyer/All | Marketplace |
| `/api/Marketplace/posts/{id}/buy` | POST | Exporter | Marketplace |
| `/api/Marketplace/transactions/{id}/invoice` | POST | Exporter | Marketplace |
| `/api/Marketplace/transactions/{id}/dual-layer-dpp` | GET | Exporter | Marketplace |
| `/api/Marketplace/transactions/{id}/my-secret` | GET | Exporter | Marketplace |
| `/api/Marketplace/buyers/{id}/history` | GET | Exporter | Marketplace |
