# Digital Product Passport (DPP) & Marketplace — Full Technical Reference

> Covers every file inside:
> - `RubberIntelligence.Backend/RubberIntelligence.API/Modules/dpp/`
> - `RubberIntelligence.Backend/RubberIntelligence.API/Modules/Marketplace/`
> - `rubber-intelligence-app/src/features/dpp/`

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Technology Stack](#2-technology-stack)
3. [Authentication & Roles](#3-authentication--roles)
4. [Backend — DPP Module](#4-backend--dpp-module)
   - [DppController](#41-dppcontroller)
   - [MessageController](#42-messagecontroller)
   - [DPP DTOs](#43-dpp-dtos)
   - [DPP Models](#44-dpp-models)
   - [DPP Services](#45-dpp-services)
5. [Backend — Marketplace Module](#5-backend--marketplace-module)
   - [MarketplaceController](#51-marketplacecontroller)
   - [Marketplace DTOs](#52-marketplace-dtos)
   - [Marketplace Models](#53-marketplace-models)
   - [Marketplace Services](#54-marketplace-services)
6. [Repository Layer](#6-repository-layer)
7. [MongoDB Collections](#7-mongodb-collections)
8. [Security Architecture](#8-security-architecture)
9. [Frontend — Type Definitions](#9-frontend--type-definitions)
10. [Frontend — Services](#10-frontend--services)
11. [Frontend — Screens](#11-frontend--screens)
12. [Frontend — Navigation](#12-frontend--navigation)
13. [End-to-End Workflows](#13-end-to-end-workflows)

---

## 1. Architecture Overview

```
┌─────────────────────────── React Native / Expo (TypeScript) ────────────────────────────┐
│                                                                                          │
│  DppNavigator (Stack, 16 screens)                                                        │
│  ├── BuyerDashboardScreen ──→ PendingRequestsScreen ──→ LotBiddersScreen                 │
│  │         ↓                                                                             │
│  │   DocumentUploadScreen ──→ ClassificationResultScreen ──→ DppPassportScreen           │
│  │                                                                                       │
│  ├── CreateSellingPostScreen ──→ MarketplaceScreen                                       │
│  │                                    ↓                                                  │
│  │                             LotBiddersScreen ──→ OrderReceiptScreen                   │
│  │                                                      ↓                                │
│  │                             InvoiceExtractedFieldsScreen / QirExtractedFieldsScreen   │
│  │                             ExporterDppViewScreen / DualLayerDppScreen                │
│  │                             LotMessagingScreen                                        │
│  │                                                                                       │
│  └── ExporterScannerScreen → DppDetailScreen → ExporterDppViewScreen                    │
│                                                                                          │
│  Services: dppService.ts | marketplaceService.ts | messagesService.ts                   │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                       │  Axios (Bearer JWT)
                                       ▼
┌─────────────────────────── .NET 8 / ASP.NET Core Web API ───────────────────────────────┐
│  Controllers                                                                             │
│  ├── DppController          api/dpp          (14 endpoints)                              │
│  ├── MessageController      api/messages     (2 endpoints)                               │
│  └── MarketplaceController  api/Marketplace  (16 endpoints)                              │
│                                                                                          │
│  DPP Services                          Marketplace Services                              │
│  ├── GeminiOcrService                  └── BuyerHistoryService                           │
│  ├── OnnxDppService (ONNX + RSA/AES)                                                    │
│  ├── DppDocumentProcessingService                                                        │
│  ├── FieldConfidentialityService                                                         │
│  ├── FieldEncryptionService (AES-256-CBC)                                                │
│  ├── DppEncryptionService                                                                │
│  ├── BlindIndexService (HMAC-SHA256)                                                     │
│  ├── DppService (passport + SHA-256)                                                     │
│  ├── ExporterContextService                                                              │
│  └── MessageService (AES messaging)                                                      │
│                                                                                          │
│  Repositories                                                                            │
│  ├── IDppRepository / DppRepository            (15 methods)                              │
│  ├── IMarketplaceRepository / MarketplaceRepository (14 methods)                         │
│  └── IMessageRepository / MessageRepository   (2 methods)                                │
└──────────────────────────────────────────────────────────────────────────────────────────┘
                                       │
                                       ▼
                                  MongoDB Atlas
         (dppDocuments, extractedFields, digitalProductPassports, accessRequests,
          sellingPosts, marketplaceTransactions, lotInterestRequests, lotMessages, users)
```

---

## 2. Technology Stack

| Layer | Technology |
|-------|------------|
| Backend runtime | .NET 8 / ASP.NET Core Web API |
| Database | MongoDB Atlas (MongoDB.Driver) |
| AI / OCR | Google Gemini 2.5 Flash (generative language API) |
| ML classification | ONNX Runtime (`dpp_classifier_model_large.onnx`) |
| Symmetric encryption | AES-256-CBC (CSPRNG IV, PKCS7 padding) |
| Asymmetric encryption | RSA-2048 OAEP-SHA256 (XML key format, per-exporter key pairs) |
| Blind indexing | HMAC-SHA256 (deterministic, URL-safe Base64) |
| Integrity verification | SHA-256 hash of DPP passport records |
| Authentication | JWT Bearer tokens (role-based claims) |
| Frontend framework | React Native (Expo SDK 52) with TypeScript |
| HTTP client | Axios (`apiClient` singleton with Bearer interceptor) |
| Navigation | `@react-navigation/native-stack` |
| UI components | expo-linear-gradient, `@expo/vector-icons` (Ionicons), expo-camera |

---

## 3. Authentication & Roles

All endpoints require a valid JWT issued by `AuthController`. The JWT carries two claims:

| Claim | Value |
|-------|-------|
| `ClaimTypes.NameIdentifier` | MongoDB user ObjectId (string) |
| `ClaimTypes.Role` | `Buyer` \| `Exporter` \| `Admin` |

Role access rules are enforced via `[Authorize(Roles = "...")]` on every controller action. The frontend stores the token in `AsyncStorage` and injects it through an Axios request interceptor.

---

## 4. Backend — DPP Module

**Directory:** `Modules/dpp/`

### 4.1 DppController

**Base route:** `api/dpp`

| # | Method | Path | Roles | Purpose |
|---|--------|------|-------|---------|
| 1 | POST | `/upload` | Buyer, Admin | Upload document → Gemini OCR → ONNX classify → per-field AES-256 encrypt confidential fields → persist `DppDocument` + `ExtractedField[]` |
| 2 | POST | `/{dppId}/generate-passport` | Buyer, Admin | Assemble `DigitalProductPassport` from public `ExtractedField` records; compute SHA-256 hash and persist |
| 3 | GET | `/passport/{dppId}` | Buyer, Exporter, Admin | Retrieve persisted `DigitalProductPassport` |
| 4 | GET | `/my-uploads` | Buyer, Admin | List authenticated buyer's `DppDocument` records |
| 5 | GET | `/{id}` | Exporter, Admin | Get single `DppDocument` metadata |
| 6 | GET | `/{id}/access` | Exporter, Admin | Download physical document file (authenticated `FileStream`) |
| 7 | POST | `/request-confidential/{lotId}` | Exporter | Create `AccessRequest` (status = `PENDING`) for confidential fields of a lot |
| 8 | POST | `/approve-confidential/{requestId}` | Buyer, Admin | Approve an access request (status → `APPROVED`) |
| 9 | POST | `/reject-confidential/{requestId}` | Buyer, Admin | Reject an access request (status → `REJECTED`) |
| 10 | GET | `/pending-requests` | Buyer, Admin | Get all `PENDING` access requests for buyer's lots |
| 11 | GET | `/my-requests` | Exporter, Admin | Get authenticated exporter's access requests |
| 12 | GET | `/confidential/{lotId}` | Exporter, Admin | Decrypt and return confidential fields — only if an `APPROVED` AccessRequest exists |
| 13 | GET | `/verify/{lotId}` | Buyer, Exporter, Admin | Re-hash DPP fields and compare with stored hash (tamper detection) |
| 14 | GET | `/exporter-context/{exporterId}` | Buyer, Admin | Return exporter's profile context (tenure, collaborations, verification status) |

**Constructor-injected dependencies:**
`GeminiOcrService`, `OnnxDppService`, `DppDocumentProcessingService`, `DppService`, `ConfidentialAccessService`, `ExporterContextService`, `IDppRepository`, `IUserRepository`, `IWebHostEnvironment`, `ILogger<DppController>`

---

### 4.2 MessageController

**Base route:** `api/messages`

| # | Method | Path | Roles | Purpose |
|---|--------|------|-------|---------|
| 1 | POST | `/{lotId}` | Any (Buyer + Exporter) | Send a message on a lot thread; AES-256-CBC encrypts content when `isConfidential = true` |
| 2 | GET | `/{lotId}` | Any (Buyer + Exporter) | Retrieve all lot messages for authenticated participant; decrypt confidential messages on read |

**Constructor-injected dependencies:**
`MessageService`, `ILogger<MessageController>`

---

### 4.3 DPP DTOs

**Directory:** `Modules/dpp/DTOs/`

#### `ClassificationResultDto.cs`
Returned from `POST /upload`. Summarises the ONNX classification decision.

| Property | Type | Notes |
|----------|------|-------|
| `FileName` | `string` | Uploaded file name |
| `Classification` | `string` | `CONFIDENTIAL` or `NON_CONFIDENTIAL` |
| `ConfidenceScore` | `double` | 0.0–1.0 from ONNX model |
| `ConfidenceLevel` | `string` | `High`, `Medium`, or `Low` |
| `SystemAction` | `string` | `ENCRYPT + RESTRICT` or `ALLOW VIEWING` |
| `Explanation` | `string` | Human-readable justification |
| `InfluentialKeywords` | `List<string>` | Top keywords from model explanation |
| `IsEncrypted` | `bool` | Whether AES encryption was applied to the file |
| `FieldsExtracted` | `int` | Count of Gemini-extracted fields |
| `Fields` | `List<FieldSummaryDto>` | Per-field results (fieldName, isConfidential, confidence) |

#### `DocumentUploadRequest.cs`
Submitted as `multipart/form-data`.

| Property | Type | Notes |
|----------|------|-------|
| `File` | `IFormFile` | Required; allowed MIME: JPEG, PNG, WEBP, GIF, PDF |
| `Notes` | `string?` | Optional user notes (not persisted to DB) |

#### `DppVerificationResponseDto.cs`
Returned from `GET /verify/{lotId}`.

| Property | Type | Notes |
|----------|------|-------|
| `LotId` | `string` | Lot identifier |
| `StoredHash` | `string` | SHA-256 originally stored at passport generation |
| `RecomputedHash` | `string` | SHA-256 recomputed from current field data |
| `IsValid` | `bool` | `true` when hashes match |
| `VerifiedAt` | `DateTime` | Server verification timestamp |

#### `ExporterContextDto.cs`
Returned from `GET /exporter-context/{exporterId}`.

| Property | Type | Notes |
|----------|------|-------|
| `ExporterId` | `string` | |
| `FullName` | `string` | |
| `Country` | `string` | |
| `OrganizationType` | `string` | |
| `IsVerified` | `bool` | Platform-verified badge |
| `PlatformTenureMonths` | `int` | How long the exporter has been registered |
| `SuccessfulCollaborations` | `int` | Completed `MarketplaceTransaction` count |

#### `InvoiceUploadResponseDto.cs`
Returned from `POST /Marketplace/transactions/{id}/invoice`.

| Property | Type | Notes |
|----------|------|-------|
| `DppId` | `string` | Transaction ID used as DPP lot reference |
| `Message` | `string` | Success text |
| `FieldsExtracted` | `int` | Number of invoice fields extracted |
| `Fields` | `List<InvoiceFieldSummaryDto>` | Per-field summary (name, isConfidential, confidence, extracted value if public) |
| `Classification` | `InvoiceClassificationDto` | ONNX classification summary |

#### `MessageDto.cs`
Used by both request body and response in `MessageController`.

| Property | Type | Notes |
|----------|------|-------|
| `Id` | `string` | MongoDB ObjectId |
| `LotId` | `string` | Lot the message belongs to |
| `SenderId` | `string` | Sender's user ID |
| `SenderName` | `string` | Cached display name |
| `Content` | `string` | Plaintext (decrypted on read if was confidential) |
| `IsConfidential` | `bool` | If true, content was encrypted at rest |
| `SentAt` | `DateTime` | |

---

### 4.4 DPP Models

**Directory:** `Modules/dpp/Models/`

#### `DppDocument.cs`
MongoDB collection: `dppDocuments`

| Field | Type | Notes |
|-------|------|-------|
| `Id` | `string` | BsonId, ObjectId |
| `LotId` | `string` | Same as `Id` on creation (set in upload) |
| `UserId` | `string` | Uploader's userId |
| `FileName` | `string` | Original file name |
| `FilePath` | `string` | Server-side path (AES-encrypted copy) |
| `ContentType` | `string` | MIME type |
| `Classification` | `string` | ONNX result: `CONFIDENTIAL` or `NON_CONFIDENTIAL` |
| `ConfidenceScore` | `double` | |
| `FieldsExtracted` | `int` | Count |
| `UploadedAt` | `DateTime` | UTC |

#### `DigitalProductPassport.cs`
MongoDB collection: `digitalProductPassports`

| Field | Type | Notes |
|-------|------|-------|
| `Id` | `string` | ObjectId |
| `LotId` | `string` | References `DppDocument.Id` |
| `RubberGrade` | `string` | e.g., RSS1, RSS2 |
| `Quantity` | `double` | kg |
| `DispatchDetails` | `string` | Port/origin info |
| `ConfidentialDataExists` | `bool` | True if any field was classified confidential |
| `DppHash` | `string` | SHA-256 of the serialized passport (camelCase JSON) |
| `CreatedAt` | `DateTime` | |

#### `ExtractedField.cs`
MongoDB collection: `extractedFields`

| Field | Type | Notes |
|-------|------|-------|
| `Id` | `string` | ObjectId |
| `LotId` | `string` | The parent document/transaction ID |
| `FieldName` | `string` | e.g., `invoiceNumber`, `rubberGrade` |
| `EncryptedValue` | `string` | Ciphertext (confidential) or plaintext (public) |
| `IV` | `string?` | Base64 AES IV — only present for confidential fields |
| `BlindIndex` | `string` | HMAC-SHA256 for searchable equality |
| `IsConfidential` | `bool` | Classification result |
| `ConfidenceScore` | `double` | |
| `ExtractedAt` | `DateTime` | |

#### `Message.cs`
MongoDB collection: `lotMessages`

| Field | Type | Notes |
|-------|------|-------|
| `Id` | `string` | ObjectId |
| `LotId` | `string` | References the rubber lot |
| `SenderId` | `string` | |
| `SenderName` | `string` | |
| `EncryptedContent` | `string` | AES-CBC ciphertext (or plaintext if not confidential) |
| `IV` | `string?` | Present when `IsConfidential = true` |
| `IsConfidential` | `bool` | |
| `SentAt` | `DateTime` | |

#### `dpp_classifier_model_large.onnx`
Binary ONNX model used by `OnnxDppService` for document classification. Classifies extracted text into `CONFIDENTIAL` / `NON_CONFIDENTIAL` with a confidence score. The `dpp_classifier_model_large.onnx.opset25.bak` file is the original opset-25 backup before downgrade conversion for compatibility.

---

### 4.5 DPP Services

**Directory:** `Modules/dpp/Services/`

#### `GeminiOcrService.cs`
Calls Google Gemini 2.5 Flash to extract structured key-value fields from documents.

- `ExtractFieldsAsync(stream, mimeType)` → `Dictionary<string, string>` — generic DPP fields
- `ExtractInvoiceFieldsAsync(stream, mimeType)` → `Dictionary<string, string>` — invoice schema (invoiceNumber, supplierName, totalAmount, etc.)
- `ExtractQirFieldsAsync(stream, mimeType)` → `Dictionary<string, string>` — QIR schema (rubberGrade, drcPercentage, weight, testResults, etc.)
- Automatically uses Gemini File API for PDFs > inline size limit; retries once on `429`

#### `OnnxDppService.cs`
Manages the ONNX model lifecycle and the RSA/AES file encryption pipeline.

- `ClassifyDocument(text, fileName)` → `ClassificationResultDto` — runs ONNX inference
- `ProcessAndSecureInvoiceAsync(stream, fileName, classifyText, exporterId, storagePath)` → `(encryptedPath, classification, encryptionMetadata)` — AES-256-CBC encrypts the file; wraps the AES key with the exporter's RSA public key; stores to disk
- `RetrieveInvoiceAsync(path, metadata, exporterId)` → `byte[]` — decrypts with exporter RSA private key

#### `DppDocumentProcessingService.cs`
Orchestrates the per-field pipeline for a `Dictionary<string, string>` payload.

- `ProcessFields(fields, lotId)` → `List<ExtractedField>` — for each field: run `FieldConfidentialityService` to classify, run `FieldEncryptionService` to encrypt if confidential, run `BlindIndexService` to compute HMAC index

#### `FieldConfidentialityService.cs`
Keyword + ML based classifier. Each field name/value is scored against a confidentiality keyword list and the ONNX model. Returns `(isConfidential, confidence)` per field.

#### `FieldEncryptionService.cs`
AES-256-CBC symmetric encryption for individual field values.

- `Encrypt(plaintext)` → `(ciphertext, ivBase64)` — CSPRNG IV, PKCS7 padding
- `Decrypt(ciphertext, ivBase64)` → `plaintext`
- Key is sourced from `EncryptionKeyProvider` (from `appsettings.json` `Encryption:FieldKey`)

#### `DppEncryptionService.cs`
File-level AES encryption (symmetric). Used independently of the RSA wrapping for raw document storage.

- `EncryptFileAsync(inputPath, outputPath)` — AES-256-CBC, stores IV prepended
- `DecryptFileAsync(inputPath)` → `byte[]`

#### `BlindIndexService.cs`
HMAC-SHA256 deterministic blind index for searchable-encrypted fields.

- `ComputeIndex(value)` → URL-safe Base64 string
- Same input always produces the same index, enabling equality queries without decrypting

#### `DppService.cs`
Manages `DigitalProductPassport` records.

- `GenerateDpp(dppId)` — loads all `ExtractedField` records for a lot, builds passport from public fields only, computes SHA-256 hash, persists to MongoDB
- `VerifyDppHash(lotId)` — re-serializes passport, recomputes hash, compares with stored value; returns `DppVerificationResponseDto`

#### `ExporterContextService.cs`
Builds `ExporterContextDto` for buyers to evaluate exporters before accepting their interest request.

- `GetExporterContextAsync(exporterId)` → `ExporterContextDto` — queries `Users` collection for profile, counts completed `MarketplaceTransaction`s for collaboration score

#### `MessageService.cs`
Lot-scoped encrypted messaging.

- `SendMessageAsync(lotId, senderId, senderName, content, isConfidential)` → `Message`
- `GetMessagesAsync(lotId, callerId)` → `List<MessageDto>` — decrypts confidential messages inline before returning

---

## 5. Backend — Marketplace Module

**Directory:** `Modules/Marketplace/`

### 5.1 MarketplaceController

**Base route:** `api/Marketplace`

#### Selling Posts Group

| # | Method | Path | Roles | Purpose |
|---|--------|------|-------|---------|
| 1 | POST | `/posts` | Buyer, Admin | Create a new rubber lot listing; auto-sets `BuyerId`, `CreatedAt`, `Status = AVAILABLE` |
| 2 | GET | `/posts` | Any (auth) | List posts: Exporter/Admin → all active; Buyer → own posts; `?buyerId=` → filter |

#### Express-Interest Flow (New)

| # | Method | Path | Roles | Purpose |
|---|--------|------|-------|---------|
| 3 | POST | `/posts/{id}/express-interest` | Exporter | Exporter signals interest in a lot; creates `LotInterestRequest`; calculates trust score from completed transactions + platform tenure + verification; marks post `REQUESTED` |
| 4 | GET | `/posts/{id}/interested-exporters` | Buyer, Admin | Returns trust-scored `LotInterestRequest[]` — only to the lot's owner |
| 5 | POST | `/posts/{id}/accept-exporter` | Buyer | Buyer accepts one exporter: creates `MarketplaceTransaction` (`PendingInvoice`), marks post `Sold`, marks all other requests `REJECTED` |
| 6 | GET | `/posts/my-requests` | Buyer, Admin | Returns buyer's lots that currently have `Status = REQUESTED` (for notification badge) |

#### Transactions Group

| # | Method | Path | Roles | Purpose |
|---|--------|------|-------|---------|
| 7 | POST | `/posts/{id}/buy` | Exporter | *(Legacy direct-buy)* Immediately creates `PendingInvoice` transaction without buyer approval |
| 8 | GET | `/transactions` | Any (auth) | Get authenticated user's transactions (as buyer or exporter) |

#### Invoice & DPP Group

| # | Method | Path | Roles | Purpose |
|---|--------|------|-------|---------|
| 9 | POST | `/transactions/{id}/dpp` | Buyer | Link an existing DPP document to a transaction |
| 10 | POST | `/transactions/{id}/invoice` | Buyer | Upload invoice → Gemini OCR → per-field confidentiality classification → AES-256-CBC encryption → ONNX classify → store; advance status to `InvoiceUploaded` |
| 11 | GET | `/transactions/{id}/invoice-fields` | Buyer, Admin | Decrypt and return all extracted invoice fields for the transaction owner |
| 12 | GET | `/transactions/{id}/invoice` | Exporter | Download physical invoice file — decrypted for the purchasing exporter via their RSA private key |

#### QIR Group

| # | Method | Path | Roles | Purpose |
|---|--------|------|-------|---------|
| 13 | POST | `/transactions/{id}/qir` | Buyer | Upload Quality Inspection Report after `InvoiceUploaded`; same Gemini-OCR + AES pipeline; lot key `qir_{transactionId}`; advance status to `QirUploaded` |
| 14 | GET | `/transactions/{id}/qir-fields` | Buyer, Admin | Decrypt and return extracted QIR fields |

#### Exporter DPP Views

| # | Method | Path | Roles | Purpose |
|---|--------|------|-------|---------|
| 15 | GET | `/transactions/{id}/exporter-dpp` | Exporter, Admin | Returns combined invoice + QIR fields for the purchasing exporter; confidential buyer fields are withheld (`value = null`) |
| 16 | GET | `/transactions/{id}/dual-layer-dpp` | Exporter, Admin | Returns public summary + RSA-AES wrapped encrypted vault (zero-knowledge delivery) |

#### Other

| # | Method | Path | Roles | Purpose |
|---|--------|------|-------|---------|
| 17 | GET | `/buyer-history/{buyerId}` | Exporter, Admin | Aggregated buyer trading history: lot counts, quality averages, DPP verification consistency |

**Constructor-injected dependencies:**
`IMarketplaceRepository`, `IUserRepository`, `OnnxDppService`, `GeminiOcrService`, `BuyerHistoryService`, `DppDocumentProcessingService`, `IWebHostEnvironment`, `ILogger<MarketplaceController>`, `IDppRepository`, `FieldEncryptionService`

---

### 5.2 Marketplace DTOs

**Directory:** `Modules/Marketplace/DTOs/`

#### `BuyerHistoryDto.cs`

| Property | Type | Notes |
|----------|------|-------|
| `BuyerId` | `string` | |
| `TotalLotsListed` | `int` | All-time posts count |
| `CompletedTransactions` | `int` | `Status = Completed` count |
| `AverageGrade` | `string` | Most common rubber grade |
| `DppVerificationRate` | `double` | % of lots with generated DPP |
| `MemberSince` | `DateTime` | User registration date |

#### `InvoiceFieldDecryptedDto.cs`
Returned from `GET /transactions/{id}/invoice-fields`.

| Property | Type | Notes |
|----------|------|-------|
| `FieldName` | `string` | |
| `Value` | `string?` | Decrypted plaintext; `null` for failed decryption |
| `IsConfidential` | `bool` | |

#### `QirDtos.cs`
Contains three nested DTOs:

**`QirUploadResponseDto`** — returned from `POST /transactions/{id}/qir`

| Property | Type |
|----------|------|
| `DppId` | `string` |
| `Message` | `string` |
| `FieldsExtracted` | `int` |
| `Fields` | `List<QirFieldSummaryDto>` |
| `Classification` | `QirClassificationDto` |

**`QirFieldSummaryDto`** — per-field result in upload response

| Property | Type |
|----------|------|
| `FieldName` | `string` |
| `IsConfidential` | `bool` |
| `ConfidenceScore` | `double` |
| `HasValue` | `bool` |
| `ExtractedValue` | `string?` (null if confidential) |

**`QirClassificationDto`** — ONNX classification summary in upload response

| Property | Type |
|----------|------|
| `Classification` | `string` |
| `ConfidenceScore` | `double` |
| `ConfidenceLevel` | `string` |
| `SystemAction` | `string` |
| `Explanation` | `string` |
| `InfluentialKeywords` | `List<string>` |
| `GeminiExtractedCount` | `int` |
| `PublicFieldCount` | `int` |
| `ConfidentialFieldCount` | `int` |

---

### 5.3 Marketplace Models

**Directory:** `Modules/Marketplace/Models/`

#### `SellingPost.cs`
MongoDB collection: `sellingPosts`

| Field | Type | Notes |
|-------|------|-------|
| `Id` | `string` | BsonId, ObjectId |
| `BuyerId` | `string` | Owner's userId |
| `BuyerName` | `string` | Cached at creation |
| `Grade` | `string` | RSS1, RSS2, RSS3, etc. |
| `QuantityKg` | `double` | |
| `PricePerKg` | `double` | |
| `Currency` | `string` | Default: `LKR` |
| `Location` | `string` | Seller's location |
| `DppDocumentId` | `string?` | Linked DPP proof |
| `Status` | `string` | `AVAILABLE` → `REQUESTED` → `Sold`; legacy: `Active`, `Archived` |
| `SoldToExporterId` | `string?` | Set when accepted exporter creates transaction |
| `CreatedAt` | `DateTime` | |

**Status lifecycle:**

```
AVAILABLE  ──[exporter expresses interest]──▶  REQUESTED
REQUESTED  ──[buyer accepts exporter]────────▶  Sold
AVAILABLE  ──[legacy direct buy]─────────────▶  Sold
```

#### `MarketplaceTransaction.cs`
MongoDB collection: `marketplaceTransactions`

| Field | Type | Notes |
|-------|------|-------|
| `Id` | `string` | ObjectId |
| `PostId` | `string` | References `SellingPost.Id` |
| `ExporterId` | `string` | |
| `ExporterName` | `string` | |
| `BuyerId` | `string` | |
| `Status` | `string` | `PendingInvoice` → `InvoiceUploaded` → `QirUploaded` → `Completed` |
| `OfferPrice` | `decimal` | Lot's price per kg at time of transaction |
| `LastUpdatedAt` | `DateTime` | |
| `SecretRequestId` | `string?` | |
| `DppInvoicePath` | `string?` | Path to AES-encrypted invoice file on disk |
| `DppClassification` | `string?` | ONNX classification of invoice document |
| `EncryptionMetadata` | `string?` | JSON: `{ "IV": "...", "EncryptedKey": "..." }` — RSA-wrapped AES key |
| `DppDocumentId` | `string?` | Linked `DppDocument.Id` |
| `InvoiceFields` | `Dictionary<string, string?>?` | Gemini-extracted invoice fields; confidential values stored as `null` |
| `QirPath` | `string?` | Path to AES-encrypted QIR file |
| `QirClassification` | `string?` | ONNX classification of QIR document |
| `QirEncryptionMetadata` | `string?` | RSA-wrapped AES key for QIR file |
| `QirFields` | `Dictionary<string, string?>?` | Gemini-extracted QIR fields; confidential values stored as `null` |

**Status lifecycle:**

```
PendingInvoice  ──[buyer uploads invoice]──▶  InvoiceUploaded
InvoiceUploaded ──[buyer uploads QIR]───────▶  QirUploaded
QirUploaded     ──[admin/system marks done]──▶  Completed
```

#### `LotInterestRequest.cs`
MongoDB collection: `lotInterestRequests`

| Field | Type | Notes |
|-------|------|-------|
| `Id` | `string` | ObjectId |
| `PostId` | `string` | References `SellingPost.Id` |
| `ExporterId` | `string` | |
| `ExporterName` | `string` | |
| `Country` | `string?` | |
| `OrganizationType` | `string?` | |
| `IsVerified` | `bool` | Platform-verified exporter badge |
| `PlatformTenureMonths` | `int` | |
| `SuccessfulCollaborations` | `int` | Count of completed transactions |
| `TrustScore` | `double` | Computed at request time: (collaborations × 20) + (tenure × 0.5) + (isVerified ? 15 : 0); max shown 100 |
| `Status` | `string` | `PENDING` → `ACCEPTED` or `REJECTED` |
| `RequestedAt` | `DateTime` | |

---

### 5.4 Marketplace Services

**Directory:** `Modules/Marketplace/Services/`

#### `BuyerHistoryService.cs`
Aggregates buyer activity for the exporter-facing trading history view.

- `GetBuyerHistory(buyerId)` → `BuyerHistoryDto` — counts total posts, completed transactions, dominant grade, DPP verification rate, and registration date from `Users` collection

---

## 6. Repository Layer

**Directory:** `Data/Repositories/`

### `IMarketplaceRepository` / `MarketplaceRepository`

| Method | Signature | Notes |
|--------|-----------|-------|
| `CreatePostAsync` | `(SellingPost)` → `Task` | |
| `GetPostByIdAsync` | `(string id)` → `Task<SellingPost?>` | |
| `GetPostsByBuyerIdAsync` | `(string buyerId)` → `Task<List<SellingPost>>` | |
| `GetActivePostsAsync` | `()` → `Task<List<SellingPost>>` | Returns posts with `Status IN [Active, AVAILABLE, REQUESTED]` |
| `UpdatePostAsync` | `(SellingPost)` → `Task` | |
| `CreateTransactionAsync` | `(MarketplaceTransaction)` → `Task` | |
| `GetTransactionByIdAsync` | `(string id)` → `Task<MarketplaceTransaction?>` | |
| `GetTransactionsByUserIdAsync` | `(string userId)` → `Task<List<MarketplaceTransaction>>` | Matches `BuyerId` OR `ExporterId` |
| `UpdateTransactionAsync` | `(MarketplaceTransaction)` → `Task` | |
| `AddInterestRequestAsync` | `(LotInterestRequest)` → `Task` | |
| `GetInterestRequestAsync` | `(string postId, string exporterId)` → `Task<LotInterestRequest?>` | |
| `GetInterestRequestsByPostIdAsync` | `(string postId)` → `Task<List<LotInterestRequest>>` | |
| `UpdateInterestRequestAsync` | `(LotInterestRequest)` → `Task` | |
| `GetRequestedPostsByBuyerIdAsync` | `(string buyerId)` → `Task<List<SellingPost>>` | Returns buyer's posts with `Status = REQUESTED` |

### `IDppRepository` / `DppRepository`

| Method | Signature | Notes |
|--------|-----------|-------|
| `CreateDocumentAsync` | `(DppDocument)` → `Task` | |
| `GetDocumentByIdAsync` | `(string id)` → `Task<DppDocument?>` | |
| `GetDocumentsByUserIdAsync` | `(string userId)` → `Task<List<DppDocument>>` | |
| `SaveExtractedFieldsAsync` | `(List<ExtractedField>)` → `Task` | Bulk upsert |
| `GetExtractedFieldsByLotIdAsync` | `(string lotId)` → `Task<List<ExtractedField>>` | |
| `SearchByBlindIndexAsync` | `(string index)` → `Task<List<ExtractedField>>` | Equality search |
| `CreateDppAsync` | `(DigitalProductPassport)` → `Task` | |
| `GetDppByLotIdAsync` | `(string lotId)` → `Task<DigitalProductPassport?>` | |
| `CreateAccessRequestAsync` | `(AccessRequest)` → `Task` | |
| `GetAccessRequestByIdAsync` | `(string id)` → `Task<AccessRequest?>` | |
| `GetPendingAccessRequestsByBuyerIdAsync` | `(string buyerId)` → `Task<List<AccessRequest>>` | |
| `GetAccessRequestsByExporterIdAsync` | `(string exporterId)` → `Task<List<AccessRequest>>` | |
| `GetAccessRequestAsync` | `(string lotId, string exporterId)` → `Task<AccessRequest?>` | |
| `UpdateAccessRequestAsync` | `(AccessRequest)` → `Task` | |
| `GetDppDocumentsByBuyerIdAsync` | `(string buyerId)` → `Task<List<DppDocument>>` | |

### `IMessageRepository` / `MessageRepository`

| Method | Signature | Notes |
|--------|-----------|-------|
| `AddMessageAsync` | `(Message)` → `Task` | |
| `GetMessagesByLotIdAsync` | `(string lotId)` → `Task<List<Message>>` | |

---

## 7. MongoDB Collections

| Collection | Model | Key Indexes |
|------------|-------|-------------|
| `dppDocuments` | `DppDocument` | `userId`, `lotId` |
| `extractedFields` | `ExtractedField` | `lotId`, `blindIndex` |
| `digitalProductPassports` | `DigitalProductPassport` | `lotId` |
| `accessRequests` | `AccessRequest` | `lotId + exporterId` (compound) |
| `sellingPosts` | `SellingPost` | `buyerId`, `status` |
| `marketplaceTransactions` | `MarketplaceTransaction` | `buyerId`, `exporterId`, `postId` |
| `lotInterestRequests` | `LotInterestRequest` | `postId`, `exporterId` |
| `lotMessages` | `Message` | `lotId` |
| `users` | `User` | `email` (unique) |

---

## 8. Security Architecture

### Encryption Layers

```
Document upload (DPP / invoice / QIR):
  File ──[AES-256-CBC]──▶ .enc file on disk
       └─ AES key ──[RSA-2048 OAEP-SHA256]──▶ stored in EncryptionMetadata JSON

Per-field encryption (confidential fields only):
  FieldValue ──[AES-256-CBC, CSPRNG IV]──▶ ExtractedField.EncryptedValue
  Plaintext never written to MongoDB

Blind indexing (for equality query without decryption):
  FieldValue ──[HMAC-SHA256]──▶ ExtractedField.BlindIndex

DPP integrity:
  Passport (public fields only) ──[SHA-256]──▶ DigitalProductPassport.DppHash

Messaging:
  Confidential message content ──[AES-256-CBC]──▶ Message.EncryptedContent
```

### Access Control Summary

| Resource | Buyer | Exporter | Admin |
|----------|-------|----------|-------|
| Upload document | ✅ | ❌ | ✅ |
| Download document | ❌ | ✅ (own transactions) | ✅ |
| View confidential fields | ✅ (own lots) | ✅ (APPROVED only) | ✅ |
| Create lot listing | ✅ | ❌ | ✅ |
| Browse active lots | ❌ | ✅ | ✅ |
| Express interest in lot | ❌ | ✅ | ❌ |
| Accept/reject interest request | ✅ (own lots) | ❌ | ✅ |
| Upload invoice | ✅ (own transactions) | ❌ | ✅ |
| Upload QIR | ✅ (own transactions) | ❌ | ✅ |
| View DPP (exporter view) | ❌ | ✅ (own transactions) | ✅ |

---

## 9. Frontend — Type Definitions

**File:** `src/features/dpp/types/index.ts`

| Interface | Purpose |
|-----------|---------|
| `DppUploadResponse` | Shape of `POST /dpp/upload` response |
| `InvoiceUploadResponse` | Shape of `POST /transactions/{id}/invoice` response |
| `DppFieldSummary` | Per-field summary inside upload responses |
| `DppClassification` | ONNX classification block inside upload responses |
| `InvoiceDecryptedField` | `GET /invoice-fields` response item (`fieldName`, `value`, `isConfidential`) |
| `DigitalProductPassport` | Full DPP record from `GET /passport/{dppId}` |
| `DppDocument` | Metadata record from `GET /my-uploads` |
| `SellingPost` | Lot listing; status union type covers all lifecycle values |
| `MarketplaceTransaction` | Transaction; status: `PendingInvoice` \| `InvoiceUploaded` \| `QirUploaded` \| `Completed` |
| `QirUploadResponse` | Shape of `POST /transactions/{id}/qir` response |
| `QirDecryptedField` | `GET /qir-fields` response item |
| `UploadState` | Local component state shape for document upload screens |
| `DppVerificationResponse` | `GET /verify/{lotId}` response |
| `BuyerHistory` | `GET /buyer-history/{buyerId}` response |
| `ExporterDppField` | Single field item in exporter DPP view |
| `ExporterDppView` | Combined invoice + QIR data for `ExporterDppViewScreen` |
| `MessageDto` | Lot message item (used in `LotMessagingScreen`) |
| `SendMessageRequest` | Request body for `POST /messages/{lotId}` |
| `InterestedExporter` | Trust-scored exporter from `GET /posts/{id}/interested-exporters` |
| `AcceptExporterRequest` | Body for `POST /posts/{id}/accept-exporter` (`exporterId`, `exporterName`) |
| `DualLayerDppResponse` | Zero-knowledge delivery payload from `GET /transactions/{id}/dual-layer-dpp` |

---

## 10. Frontend — Services

All services are in `src/features/dpp/services/` and use the shared `apiClient` Axios instance which automatically injects the JWT Bearer token from `AsyncStorage`.

### `dppService.ts`

| Function | Endpoint | Description |
|----------|----------|-------------|
| `uploadDppDocument(fileUri, fileName, fileType)` | `POST /dpp/upload` | Sends `multipart/form-data`; returns `DppUploadResponse` |
| `generatePassport(dppId)` | `POST /dpp/{dppId}/generate-passport` | Returns `DigitalProductPassport` |
| `getPassport(dppId)` | `GET /dpp/passport/{dppId}` | Returns `DigitalProductPassport` |
| `getBuyerDocuments()` | `GET /dpp/my-uploads` | Returns `DppDocument[]`; returns `[]` on error |
| `getDppMetadata(id)` | `GET /dpp/{id}` | Returns `DppDocument` |
| `getDppFileUrl(id)` | — | Constructs authenticated download URL |
| `verifyDpp(lotId)` | `GET /dpp/verify/{lotId}` | Returns `DppVerificationResponse` |
| `getPendingAccessRequests()` | `GET /Marketplace/posts/my-requests` | Returns buyer's REQUESTED lots for notification badge |

### `marketplaceService.ts`

| Function | Endpoint | Description |
|----------|----------|-------------|
| `createSellingPost(postData)` | `POST /Marketplace/posts` | Returns `SellingPost` |
| `getSellingPosts(buyerId?)` | `GET /Marketplace/posts` | Returns `SellingPost[]` |
| `buyItem(postId)` | `POST /Marketplace/posts/{id}/buy` | *(Legacy)* Direct buy → transaction |
| `expressInterest(postId)` | `POST /Marketplace/posts/{id}/express-interest` | Exporter requests to buy; returns `{ message, interestId }` |
| `getMyRequestedPosts()` | `GET /Marketplace/posts/my-requests` | Returns buyer's REQUESTED `SellingPost[]` |
| `getInterestedExporters(postId)` | `GET /Marketplace/posts/{id}/interested-exporters` | Returns `InterestedExporter[]` |
| `acceptExporter(postId, request)` | `POST /Marketplace/posts/{id}/accept-exporter` | Returns `MarketplaceTransaction` |
| `getMyTransactions()` | `GET /Marketplace/transactions` | Returns `MarketplaceTransaction[]` |
| `uploadInvoice(transactionId, file)` | `POST /Marketplace/transactions/{id}/invoice` | `multipart/form-data`; returns `InvoiceUploadResponse`; 120 s timeout |
| `linkDppToTransaction(transactionId, dppId)` | `POST /Marketplace/transactions/{id}/dpp` | Links DPP to transaction |
| `getBuyerHistory(buyerId)` | `GET /Marketplace/buyer-history/{buyerId}` | Returns `BuyerHistory` |
| `getInvoiceExtractedFields(transactionId)` | `GET /Marketplace/transactions/{id}/invoice-fields` | Returns `InvoiceDecryptedField[]` |
| `uploadQir(transactionId, file)` | `POST /Marketplace/transactions/{id}/qir` | `multipart/form-data`; returns `QirUploadResponse`; 180 s timeout |
| `getQirExtractedFields(transactionId)` | `GET /Marketplace/transactions/{id}/qir-fields` | Returns `QirDecryptedField[]` |
| `getExporterTransactionDpp(transactionId)` | `GET /Marketplace/transactions/{id}/exporter-dpp` | Returns `ExporterDppView` |
| `getDualLayerDpp(transactionId)` | `GET /Marketplace/transactions/{id}/dual-layer-dpp` | Returns `DualLayerDppResponse` |
| `getInvoice(transactionId)` | — | Constructs authenticated invoice download URL |

### `messagesService.ts`

| Function | Endpoint | Description |
|----------|----------|-------------|
| `sendMessage(lotId, content, isConfidential)` | `POST /messages/{lotId}` | Returns `MessageDto` |
| `getMessages(lotId)` | `GET /messages/{lotId}` | Returns `MessageDto[]` |
| `getUnreadMessageCount()` | `GET /messages/unread-count` | Returns `number` |
| `markMessagesAsRead(lotId)` | `POST /messages/{lotId}/read` | |

---

## 11. Frontend — Screens

**Directory:** `src/features/dpp/screens/`

### `BuyerDashboardScreen.tsx`
Home screen for buyers. Tabs: Documents, Transactions, Sales Overview.

- Loads `getBuyerDocuments()`, `getMyTransactions()`, `getPendingAccessRequests()`, and `getUnreadMessageCount()` in a single `Promise.all`
- Notification bell badge = `pendingCount` (REQUESTED lots) + `msgCount` (unread messages)
- Animated slide-in banner for new `PendingInvoice` transactions (green "View Order" button → `OrderReceiptScreen`)
- Animated slide-in banner for new REQUESTED lots from exporters (green "Review Requests" button → `PendingRequestsScreen`)
- Quick action cards: "New Document", "View Marketplace", "Access Requests" (→ `PendingRequestsScreen`), "Messages"
- Stats cards: Completed Transactions, Active Lots, Pending Invoice count, Unique Exporters

### `PendingRequestsScreen.tsx`
Buyer-only screen showing all lots that have received exporter interest requests (status = `REQUESTED`).

- Calls `getMyRequestedPosts()` on focus
- Each lot card shows grade, quantity, price, location, and "Review Exporters" button
- Tapping navigates to `LotBiddersScreen` with `{ postId, grade, quantityKg }`

### `LotBiddersScreen.tsx`
Trust-scored leaderboard of exporters who expressed interest in a specific lot.

- Calls `getInterestedExporters(postId)` on load
- Displays trust score bar, verification badge, country, organization type, tenure, collaboration count
- Buyer taps "Accept" → calls `acceptExporter()` → transaction is created → navigates to `OrderReceiptScreen`
- Buyer can tap exporter row to see history via `getBuyerHistory(buyerId)`

### `MarketplaceScreen.tsx`
Exporter-facing browsing and action screen. Five tabs: Browse, Scan QR, Access Requests, My Transactions, Overview.

- **Browse tab:** Lists active lots from `getSellingPosts()`; tap "Request Purchase" → confirmation modal → `expressInterest(post.id)` → success modal "Request Sent!"
- **Scan tab:** Expo camera, QR scan → decode DPP ID → navigate to `DppDetailScreen`
- **Transactions tab:** List exporter's transactions with status indicators; each row leads to `OrderReceiptScreen`

### `DocumentUploadScreen.tsx`
Buyer uploads a rubber lot document (PDF / image).

- Uses `expo-document-picker`
- Calls `uploadDppDocument()` → success → navigate to `ClassificationResultScreen`

### `ClassificationResultScreen.tsx`
Displays ONNX classification result after document upload.

- Shows classification (`CONFIDENTIAL` / `NON_CONFIDENTIAL`), confidence, influential keywords, all extracted fields
- "Generate Passport" button → `generatePassport()` → navigate to `DppPassportScreen`

### `DppPassportScreen.tsx`
Shows the generated `DigitalProductPassport` with a scannable QR code.

- QR value encodes the lot ID for exporter scanner verification
- Shows hash, rubber grade, quantity, dispatch details, confidential data indicator

### `OrderReceiptScreen.tsx`
Transaction receipt for buyer after an exporter has been accepted.

- Shows transaction status progress bar: PendingInvoice → InvoiceUploaded → QirUploaded → Completed
- Buyer can upload invoice (`uploadInvoice()`) when `status === 'PendingInvoice'`
- Buyer can upload QIR (`uploadQir()`) when `status === 'InvoiceUploaded'`
- Links to `InvoiceExtractedFieldsScreen`, `QirExtractedFieldsScreen`, `ExporterDppViewScreen`
- "Secure Messages" button → `LotMessagingScreen`

### `InvoiceExtractedFieldsScreen.tsx`
Displays decrypted invoice fields after upload.

- Calls `getInvoiceExtractedFields(transactionId)`
- Confidential fields are shown with lock icon and decrypted value; public fields shown plaintext

### `QirExtractedFieldsScreen.tsx`
Displays decrypted QIR fields.

- Calls `getQirExtractedFields(transactionId)`
- Same layout as InvoiceExtractedFieldsScreen

### `ExporterDppViewScreen.tsx`
Combined DPP view from the exporter's perspective.

- Calls `getExporterTransactionDpp(transactionId)`
- Shows invoice fields + QIR fields; confidential buyer fields shown as "Protected / Confidential"
- "View Dual-Layer DPP" button → `DualLayerDppScreen`

### `DualLayerDppScreen.tsx`
Displays the zero-knowledge dual-layer DPP payload for the exporter.

- Calls `getDualLayerDpp(transactionId)`
- Public layer shown in plaintext; encrypted vault section shown as RSA-wrapped hex (not decryptable on device)

### `CreateSellingPostScreen.tsx`
Buyer creates a new rubber lot listing.

- Form: grade, quantity (kg), price per kg, location, optional DPP document link
- Calls `createSellingPost()`; navigates back to dashboard on success

### `ExporterScannerScreen.tsx`
Exporter scans a QR code shown by a buyer.

- Expo Camera with barcode scanner
- Decoded lot ID → `getDppMetadata(id)` → navigate to `DppDetailScreen`

### `DppDetailScreen.tsx`
Shows document metadata (file name, classification, confidence) for an exporter after QR scan.

- Option to request confidential access (legacy flow)

### `DppPassportScreen.tsx`
As described above — passport display with QR code.

### `ExporterDppViewScreen.tsx`
As described above.

### `LotMessagingScreen.tsx`
Real-time lot-scoped messaging between buyer and exporter.

- Calls `getMessages(lotId)` on focus; `sendMessage()` on send
- Confidential messages shown with lock indicator

### `BuyerProfileScreen.tsx`
Buyer's profile page with statistics summary.

---

## 12. Frontend — Navigation

**File:** `src/navigation/DppNavigator.tsx`

Wraps all DPP/Marketplace screens in a `createNativeStackNavigator`. Registered screen names:

| Screen Name | Component |
|-------------|-----------|
| `BuyerDashboard` | `BuyerDashboardScreen` |
| `DocumentUpload` | `DocumentUploadScreen` |
| `ClassificationResult` | `ClassificationResultScreen` |
| `DppPassport` | `DppPassportScreen` |
| `CreateSellingPost` | `CreateSellingPostScreen` |
| `Marketplace` | `MarketplaceScreen` |
| `LotBidders` | `LotBiddersScreen` |
| `OrderReceipt` | `OrderReceiptScreen` |
| `PendingRequests` | `PendingRequestsScreen` |
| `InvoiceExtractedFields` | `InvoiceExtractedFieldsScreen` |
| `QirExtractedFields` | `QirExtractedFieldsScreen` |
| `ExporterDppView` | `ExporterDppViewScreen` |
| `DualLayerDpp` | `DualLayerDppScreen` |
| `LotMessaging` | `LotMessagingScreen` |
| `ExporterScanner` | `ExporterScannerScreen` |
| `DppDetail` | `DppDetailScreen` |

---

## 13. End-to-End Workflows

### A. Buyer Creates & Proofs a Lot

```
1. Buyer takes a photo / selects PDF of lot documentation
2. POST /dpp/upload
   → Gemini 2.5 Flash extracts structured fields
   → FieldConfidentialityService classifies each field (CONFIDENTIAL / PUBLIC)
   → Confidential fields → FieldEncryptionService (AES-256-CBC) + BlindIndexService (HMAC)
   → DppDocument + ExtractedField[] persisted to MongoDB
   → ONNX model classifies overall document
   → ClassificationResultDto returned to app
3. App shows ClassificationResultScreen with field breakdown
4. Buyer taps "Generate Passport"
5. POST /dpp/{dppId}/generate-passport
   → DppService reads non-confidential ExtractedFields
   → Builds DigitalProductPassport with rubber grade, quantity, dispatch info
   → Computes SHA-256 hash
   → Passport persisted to MongoDB
   → DppPassportScreen shows QR code of lot ID
6. Buyer creates a selling post via POST /Marketplace/posts, optionally linking the DppDocumentId
```

### B. Exporter Requests a Lot

```
1. Exporter browses GET /Marketplace/posts (returns AVAILABLE + REQUESTED posts)
2. Exporter taps "Request Purchase" on a lot
3. POST /Marketplace/posts/{id}/express-interest
   → LotInterestRequest created (status: PENDING)
   → TrustScore calculated: completed_txns×20 + tenure_months×0.5 + (verified?15:0)
   → SellingPost.Status → REQUESTED
4. App shows success modal: "Request Sent! The seller has been notified."
```

### C. Buyer Receives Notification and Accepts an Exporter

```
1. BuyerDashboardScreen loads → getPendingAccessRequests() returns REQUESTED posts
2. pendingCount badge updates; animated banner slides in
3. Buyer taps "Review Requests" → PendingRequestsScreen
4. Buyer taps a lot → LotBiddersScreen
5. Buyer reviews trust-scored list; taps "Accept"
6. POST /Marketplace/posts/{id}/accept-exporter (body: { exporterId, exporterName })
   → MarketplaceTransaction created (status: PendingInvoice)
   → SellingPost.Status → Sold
   → All other LotInterestRequests for this post → REJECTED
7. App navigates to OrderReceiptScreen
```

### D. Buyer Uploads Invoice & QIR

```
1. OrderReceiptScreen shows status: PendingInvoice
2. Buyer selects invoice PDF/image → POST /Marketplace/transactions/{id}/invoice
   → Gemini extracts invoice fields
   → Per-field: FieldConfidentialityService + AES encrypt + HMAC blind index
   → ExtractedFields persisted (lotId = transactionId)
   → OnnxDppService encrypts the RAW file with AES; wraps key with exporter's RSA pub key
   → Transaction.Status → InvoiceUploaded
3. Status bar advances; buyer selects QIR document → POST /Marketplace/transactions/{id}/qir
   → Same pipeline; ExtractedFields persisted (lotId = "qir_{transactionId}")
   → Transaction.Status → QirUploaded
4. Both documents secured; exporter can now access their DPP view
```

### E. Exporter Views the DPP

```
1. GET /Marketplace/transactions/{id}/exporter-dpp
   → Reads invoice ExtractedFields + QIR ExtractedFields
   → Confidential buyer fields withheld (value = null, isConfidential = true)
   → Public fields returned as plaintext
2. ExporterDppViewScreen renders two-section breakdown
3. Exporter taps "View Dual-Layer DPP" → DualLayerDppScreen
4. GET /Marketplace/transactions/{id}/dual-layer-dpp
   → Public summary + RSA-AES encrypted vault
```

### F. DPP Integrity Verification

```
1. GET /dpp/verify/{lotId}
   → DppService loads stored passport
   → Re-serializes with DppHash = ""
   → Computes SHA-256
   → Compares with stored DppHash
   → Returns { isValid, storedHash, recomputedHash }
```

---

## File Inventory

### Backend — `Modules/dpp/`

```
Controllers/
  DppController.cs         — 14 endpoints, document upload + DPP + confidential access
  MessageController.cs     — 2 endpoints, AES-encrypted lot messaging
DTOs/
  ClassificationResultDto.cs
  DocumentUploadRequest.cs
  DppVerificationResponseDto.cs
  ExporterContextDto.cs
  InvoiceUploadResponseDto.cs
  MessageDto.cs
Models/
  DigitalProductPassport.cs
  DppDocument.cs
  ExtractedField.cs
  Message.cs
  dpp_classifier_model_large.onnx      — ONNX binary (ML classifier)
  dpp_classifier_model_large.onnx.opset25.bak
Services/
  BlindIndexService.cs                 — HMAC-SHA256 blind index
  DppDocumentProcessingService.cs      — per-field OCR→classify→encrypt pipeline
  DppEncryptionService.cs              — file-level AES-256-CBC
  DppService.cs                        — DPP assembly + SHA-256 integrity
  ExporterContextService.cs            — exporter profile aggregation
  FieldConfidentialityService.cs       — per-field CONFIDENTIAL/PUBLIC classification
  FieldEncryptionService.cs            — AES-256-CBC for individual field values
  GeminiOcrService.cs                  — Google Gemini 2.5 Flash structured extraction
  MessageService.cs                    — AES-encrypted lot messaging logic
  OnnxDppService.cs                    — ONNX inference + RSA-wrapped AES file pipeline
```

### Backend — `Modules/Marketplace/`

```
Controllers/
  MarketplaceController.cs   — 17 endpoints: posts, express-interest flow, invoices, QIR, exporter DPP
DTOs/
  BuyerHistoryDto.cs
  InvoiceFieldDecryptedDto.cs
  QirDtos.cs                 — QirUploadResponseDto, QirFieldSummaryDto, QirClassificationDto
Models/
  LotInterestRequest.cs      — exporter interest request with trust score
  MarketplaceTransaction.cs  — full transaction lifecycle model
  SellingPost.cs             — rubber lot listing
Services/
  BuyerHistoryService.cs     — buyer trading history aggregation
```

### Frontend — `src/features/dpp/`

```
index.ts                     — barrel export
types/
  index.ts                   — 23 TypeScript interfaces
services/
  dppService.ts              — 8 functions (DPP + access + pending requests)
  marketplaceService.ts      — 16 functions (lots + transactions + invoice + QIR + exporter DPP)
  messagesService.ts         — 4 functions (send, get, unread count, mark read)
screens/
  BuyerDashboardScreen.tsx   — buyer home: docs, transactions, sales, notifications
  PendingRequestsScreen.tsx  — buyer view of REQUESTED lots
  LotBiddersScreen.tsx       — trust-scored exporter leaderboard
  MarketplaceScreen.tsx      — exporter browse + express-interest
  DocumentUploadScreen.tsx   — document picker + DPP upload
  ClassificationResultScreen.tsx
  DppPassportScreen.tsx
  CreateSellingPostScreen.tsx
  OrderReceiptScreen.tsx     — transaction receipt + invoice/QIR upload
  InvoiceExtractedFieldsScreen.tsx
  QirExtractedFieldsScreen.tsx
  ExporterDppViewScreen.tsx
  DualLayerDppScreen.tsx
  LotMessagingScreen.tsx
  ExporterScannerScreen.tsx
  DppDetailScreen.tsx
  BuyerProfileScreen.tsx
  ExporterDppViewScreen.tsx
```

