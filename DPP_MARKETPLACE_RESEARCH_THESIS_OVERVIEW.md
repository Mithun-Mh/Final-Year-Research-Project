# Comprehensive Research Overview: Digital Product Passport (DPP) & Marketplace System

This document provides an in-depth, structured analysis of the Digital Product Passport (DPP) module, the Marketplace module, and the underlying Machine Learning classifier (`dpp_classifier_model`). It is specifically structured to support writing a research thesis, detailing the cryptographic, architectural, and machine learning components that comprise the system.

---

## 1. Executive Summary & Research Paradigms

The Rubber Intelligence Supply Chain platform introduces a novel paradigm in trading document security: **Conditional Zero-Knowledge Encryption coupled with Field-Level Confidentiality**. Traditional document systems encrypt entire files or leave them in plaintext. This platform introduces a field-granular privacy architecture capable of protecting individual key-value data points (e.g., pricing, financial details) while allowing public fields (e.g., rubber grade, quantity) to remain readable. 

The architecture is designed to yield a Digital Product Passport (DPP) that guarantees system transparency without leaking commercial secrets, bound physically to lots via cryptographic Physical-to-Digital QR validation.

### Key Innovations (Thesis Highlights)
1. **Per-Field Confidentiality Classification:** Employs AI (Google Gemini OCR + ONNX Classifier) to parse invoices and documents, dynamically classifying information at the lowest granular level.
2. **Selective AES-256-CBC Encryption & Blind Indexing:** Applies encryption uniquely per field with CSPRNG IVs, while enabling querying via HMAC-SHA256 blind indexing.
3. **Client-Side Decryption Vault (Zero-Knowledge):** Utilizes Relationship-Based Access Control (ReBAC) to deliver a one-time pad (`SecretRequestId`). Document decryption occurs locally on the exporter's mobile device via CryptoJS. The backend cannot read the data once it is secured.
4. **Physical-to-Digital Integrity Hash:** Hashes physical lot state and requires point-in-time backend recalculation to prevent fraud or tampered goods.

---

## 2. The Machine Learning Classification Engine

At the core of the document classification logic is the **`dpp_classifier_model_large.onnx`** model, managed by the `OnnxDppService.cs` in the backend.

### Dual-Layer AI Approach
1. **Extraction (Generative AI):** The system calls Google Gemini 2.5 Flash to extract structured key-value maps from raw document images/PDFs. It targets generic DPP fields, strict Invoice schemas, or Quality Inspection Report (QIR) schemas.
2. **Classification (ONNX Model):** The extracted text is preprocessed (e.g., standardizing currencies like "LKR", "USD") and fed into the `.onnx` inference session. The model categorizes the document as either `CONFIDENTIAL` or `NON_CONFIDENTIAL` with an associated confidence score (0.0 to 1.0) and lists heavily weighted or influential keywords.

### Fallback Heuristics
If the ONNX model is missing or fails to load, `OnnxDppService` employs a weighted term frequency heuristic algorithm.
- **Confidential weighting:** Words like 'price', 'amount', 'invoice', and 'lkr' generate positive scores.
- **Public weighting:** Words like 'grade', 'quality', 'warehouse' deduct from the confidentiality score.
If the net score crosses a threshold, the document triggers the `CONFIDENTIAL` encryption path.

---

## 3. Backend Architecture: Digital Product Passport (DPP)

**Path:** `RubberIntelligence.Backend/RubberIntelligence.API/Modules/dpp/`

### 3.1. Field-Level Processing Pipeline
When a buyer uploads a document (`POST /api/dpp/upload`):
1. **OCR Extraction:** Gemini translates the image into key-value pairs.
2. **Classification:** `FieldConfidentialityService` categorizes each field (Tier 1: High sensitivity e.g., bank, price; Tier 2: Medium sensitivity; Tier 3: Non-confidential).
3. **Encryption (`FieldEncryptionService`):** AES-256-CBC is used. Crucially, a new 16-byte random IV is generated **per field** and stored alongside the ciphertext. The encryption key is rotating and tagged via versions (e.g., `v1:`).
4. **Searchability (`BlindIndexService`):** A deterministic HMAC-SHA256 hash is generated from `fieldName + value`. This allows the SQL/NoSQL backend to perform `WHERE blindIndex = ?` equality searches without decrypting the data.

### 3.2. Product Passport Generation
The actual DPP object (`DigitalProductPassport`) is instantiated by stripping away all confidential fields. It includes only public data (Rubber Grade, Quantity, Origin Port) and sets a boolean flag: `ConfidentialDataExists = true`. 
Finally, the passport is sealed using a `SHA-256` tamper hash. The original document is never stored inside the DPP.

### 3.3. Secure Messaging
The DPP module includes `MessageController` and `MessageService`, facilitating lot-scoped chat. Messages can have an `isConfidential` flag; if true, the backend encrypts the content using AES-256 before persisting it to MongoDB.

---

## 4. Backend Architecture: Marketplace Module

**Path:** `RubberIntelligence.Backend/RubberIntelligence.API/Modules/Marketplace/`

The Marketplace controls the trading mechanics and Zero-Knowledge (ZK) key distribution.

### 4.1. Trading Lifecycle
1. **Listing:** A buyer posts a `SellingPost` (Status: `AVAILABLE`).
2. **Interest / Bidding:** Exporters signal interest (`LotInterestRequest`). A **Trust Score** algorithm evaluates the exporter based on `SuccessfulCollaborations`, platform tenure, and verification state. The post enters `REQUESTED`.
3. **Acceptance:** Buyer selects an exporter, generating a `MarketplaceTransaction` (`PendingInvoice`).
4. **Document Attachment:** The Buyer uploads the Invoice and optionally the Quality Inspection Report (QIR). These are routed through the ONNX classification and AES processing pipelines.

### 4.2. File-Level RSA/AES Envelope Encryption
Unlike individual fields, the actual physical invoice PDF uploaded by the buyer undergoes envelope encryption:
- A random ephemeral AES key is generated to encrypt the file.
- The ephemeral AES key is encrypted using the *Purchasing Exporter's* **RSA-2048 Public Key**.
- When the exporter downloads the invoice, the backend uses the exporter's private key to decrypt the AES key on the fly, unlocking the file.

---

## 5. Frontend Architecture & Zero-Knowledge Vault

**Path:** `rubber-intelligence-app/src/features/dpp/`

The React Native application handles the human interaction side of the cryptographic handshake.

### 5.1. Dual-Layer Zero-Knowledge Exporter Vault
Situated in `DualLayerDppScreen.tsx`, this serves as the local decryption vault.
1. The Exporter receives a `SecretRequestId` (acting as a one-time pad).
2. The App utilizes **CryptoJS** to derive a symmetric key using **PBKDF2 / HMAC-SHA256 with 100,000 iterations**, mixing the `SecretRequestId` and the `TransactionId` (Salt).
3. The encrypted document data is downloaded.
4. **Client-Side Decryption:** Decryption via AES-256-CBC runs strictly on the mobile CPU. The plaintext is rendered immediately into the UI (Layer 2) and is never transmitted back across the network, enforcing a pure Zero-Knowledge protocol against the backend.

### 5.2. Physical-to-Digital Verification Scanner
The `ExporterScannerScreen.tsx` utilizes `expo-camera` to scan QR codes attached to physical shipments.
1. Scans the physical QR (`lotId` + `hash`).
2. Sends the `lotId` to `GET /api/dpp/verify/{lotId}`.
3. The backend recalculates the SHA-256 digest from the live database fields utilizing strict millisecond-truncated timestamp precision.
4. If the Recalculated Hash ≠ Stored Hash ≠ Physical QR Hash, a severe Anti-Fraud alert is triggered.

---

## 6. Thesis Structure Recommendations based on Codebase

If writing a technical thesis, the repository maps perfectly to the following academic chapters:

- **Introduction:** Supply chain transparency vs. commercial privacy paradox.
- **Methodology (AI):** Using ONNX (`dpp_classifier_model_large.onnx`) and LLM orchestration (Google Gemini 2.5 Flash) for field-level OCR and categorization.
- **Security Engineering:** The structural design of granular AES-CBC field encryption and deterministic HMAC blind indices vs. traditional full-disk/full-file encryption.
- **Zero-Knowledge Implementation:** Mobile-side PBKDF2 vaulting (`DualLayerDppScreen`), Client-side AES-256-CBC decryption, and ReBAC (Relationship-Based Access Control) in the Marketplace API.
- **System Integrity:** Digital Product Passports tied physically via hardware-independent QR SHA-256 fingerprinting.
