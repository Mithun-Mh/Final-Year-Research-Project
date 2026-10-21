# Simplified Code Logic & Component Guide

This document explains the core logic of your Rubber Intelligence Supply Chain project in simple, easy-to-understand English. It is organized by the main features of your system. You can use this to quickly explain how any part of your code works.

---

## 1. Document Classification (The AI Gatekeeper & The Rule Engine)

This component is responsible for reading the uploaded documents (like invoices) and deciding if they contain secrets.

### A. The Machine Learning Model (Whole Document Classifier)
* **File Location:** `RubberIntelligence.Backend/RubberIntelligence.API/Modules/dpp/Services/OnnxDppService.cs`
* **How it works:** This file uses the `dpp_classifier_model_large.onnx` AI model. When a full document is uploaded, it feeds all the text into this model. The AI acts as an overarching "gatekeeper" and scores the entire document. If it detects too many financial or sensitive words, it flags the entire file as `CONFIDENTIAL` so that the physical PDF gets locked in the database.

### B. The Rule Engine (Individual Field Classifier)
* **File Location:** `RubberIntelligence.Backend/RubberIntelligence.API/Modules/dpp/Services/FieldConfidentialityService.cs`
* **How it works:** Instead of guessing, this code uses strict, mathematical rules. It looks at every single data point extracted by Google Gemini OCR. If a field name matches a Tier-1 keyword (like `"price"`, `"bank"`, `"tax id"`), it flags it securely as a secret. If it matches safe words (like `"grade"`, `"quantity"`), it allows it to be public. This ensures no financial data is ever leaked by AI hallucination.

---

## 2. Encryption and Decryption logic (The Security Locks)

This component locks the secret data so hackers cannot read it. It is split into two types of locks.

### A. Field-Level Encryption
* **File Location:** `RubberIntelligence.Backend/RubberIntelligence.API/Modules/dpp/Services/FieldEncryptionService.cs`
* **How it works:** When the Rule Engine finds a secret word (like price: $2000), this file runs a highly secure locking algorithm called `AES-256-CBC`. What makes this special is that it creates a brand new, random "IV" (Initialization Vector) for every single word it locks. This guarantees that even if two invoices have the exact same price, their encrypted text will look completely different in the database. 

### B. File-Level Envelope Encryption
* **File Location:** `RubberIntelligence.Backend/RubberIntelligence.API/Modules/dpp/Services/OnnxDppService.cs` (in `ProcessAndSecureInvoiceAsync`)
* **How it works:** To protect the actual PDF file containing the invoice, this code creates a random, temporary lock (an AES key) to lock the PDF. Then, it uses the Buyer's personal "Public Key" (RSA encryption) to lock that temporary key. It is like putting the document in a safe, locking the safe with a padlock, and mailing the key directly to the buyer in a locked box.

---

## 3. Client-Side Decryption (The Zero-Knowledge Mobile Vault)

This component ensures the main server is permanently blind and never actually holds the keys to the secrets.

* **File Location (Frontend):** `rubber-intelligence-app/src/features/dpp/screens/DualLayerDppScreen.tsx`
* **How it works:** When an exporter buys rubber, they need to see the secret invoice. Instead of the server unlocking it for them and sending it over the internet, the server sends them the locked file and a secret password called a `SecretRequestId`. The React Native mobile app takes that password and uses a heavy mathematical tool (`PBKDF2` running 100,000 times) to unlock the file right on their phone's CPU using `CryptoJS`. The secret data is never sent over the internet, and the server owner can never see it.

---

## 4. DPP Hash Verification (The Physical Anti-Fraud Scanner)

This component proves mathematically that the physical rubber sitting in the warehouse perfectly matches the digital file stored in the app.

### A. Mobile App side (Scanning)
* **File Location (Frontend):** `rubber-intelligence-app/src/features/dpp/screens/ExporterScannerScreen.tsx`
* **How it works:** The buyer prints a QR code sticker containing an ID and a "Hash" (a unique fingerprint string of letters and numbers) and places it on the rubber bin. The exporter scans this sticker with their phone camera.

### B. Backend side (Verification)
* **File Location (Backend):** `RubberIntelligence.Backend/RubberIntelligence.API/Modules/dpp/Services/DppService.cs` (in `VerifyDppHash`)
* **How it works:** When the sticker is scanned, the server grabs the digital passport for that rubber from the database. It strips away any timestamps, and mathematically rebuilds the SHA-256 fingerprint from scratch based on the rubber's grade and quantity. It then compares the fingerprint it just calculated with the fingerprint stored in the database, and the fingerprint from the physical sticker. If someone stole 10kg of rubber from the physical bin, the application will throw a massive red "Anti-Fraud" warning because the fingerprints will no longer match.
