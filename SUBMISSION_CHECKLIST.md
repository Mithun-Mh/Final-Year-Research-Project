# 📋 Rubber Intelligence — Final Research Submission Checklist

> **Project:** Rubber Intelligence — Digital Product Passport & Marketplace  
> **Stack:** React Native (Expo) · .NET 8 Web API · MongoDB · Python (RAG Chatbot)  
> **Repo Branch:** `MithunUIdpp`

---

## 1. Source Code Repositories

### 1.1 Frontend — React Native App (`rubber-intelligence-app`)

- [ ] All feature branches merged into `MithunUIdpp` (or `main`)
- [ ] `package.json` has correct name/version
- [ ] `.env` / `.env.example` committed (no real secrets)
- [ ] `app.json` — correct `name`, `slug`, `version`, `bundleIdentifier` / `package`
- [ ] `tsconfig.json` present and clean (no `strict` violations)
- [ ] No `console.log` debug statements left in production screens
- [ ] All TODO / FIXME comments resolved or documented

#### Feature Screens — present and navigable

| Feature | Component | Done |
|---|---|---|
| Auth | Login, Register | ☐ |
| Admin Dashboard | AdminScreen | ☐ |
| Rubber Grading | GradingScreen, result screens | ☐ |
| Disease Detection | DiseaseDetectionScreen | ☐ |
| Environment Alert | EnvironmentAlertScreen | ☐ |
| Price Forecasting | PriceForecastingScreen | ☐ |
| Monitoring Dashboard | MonitoringScreen | ☐ |
| Chatbot | ChatbotScreen | ☐ |
| DPP — Buyer Flow | BuyerDashboardScreen, DocumentUploadScreen, ClassificationResultScreen, DppPassportScreen | ☐ |
| DPP — Seller Flow | CreateSellingPostScreen, MarketplaceScreen, LotBiddersScreen, PendingRequestsScreen | ☐ |
| DPP — Exporter Flow | OrderReceiptScreen, DualLayerDppScreen, ExporterDppViewScreen, ExporterScannerScreen | ☐ |
| DPP — Invoice / QIR | InvoiceExtractedFieldsScreen, QirExtractedFieldsScreen | ☐ |
| DPP — Messaging | LotMessagingScreen | ☐ |
| Profile | BuyerProfileScreen, ProfileScreen | ☐ |

---

### 1.2 Backend — .NET 8 API (`RubberIntelligence.Backend`)

- [ ] `dotnet build` exits with code 0 (no errors)
- [ ] `appsettings.json` — all required keys present (MongoDB, JWT, Gemini, etc.)
- [ ] `appsettings.Development.json` — no hardcoded production secrets committed
- [ ] ONNX model files present in `Modules/dpp/Models/`
  - [ ] `dpp_classifier_model_large.onnx`
- [ ] `App_Data/SecureInvoices/` directory exists (or `.gitkeep`)
- [ ] All migrations / seed scripts up to date

#### Endpoints — implemented and returning correct status codes

| Module | Endpoint Group | Done |
|---|---|---|
| Auth | Login, Register, Refresh | ☐ |
| DPP | Upload, Generate Passport, Get Passport, My Uploads | ☐ |
| DPP | Access Control (request / approve / reject / pending / my-requests) | ☐ |
| DPP | Verify, Confidential, Exporter Context | ☐ |
| DPP | Grant Access (RSA+AES hybrid) | ☐ |
| Marketplace | Create Post, Get Posts, Buy Item | ☐ |
| Marketplace | Get My Transactions, Get Transaction By Id | ☐ |
| Marketplace | Upload Invoice, Get Invoice, Get Invoice Fields | ☐ |
| Marketplace | Upload QIR, Get QIR Fields | ☐ |
| Marketplace | Dual-Layer DPP (Zero-Knowledge Vault) | ☐ |
| Marketplace | My Secret (one-time key claim) | ☐ |
| Marketplace | Exporter Docs Upload | ☐ |
| Marketplace | Buyer History | ☐ |
| Messages | Send Message, Get Messages | ☐ |
| Disease Detection | Detect Disease, Detect Pest | ☐ |
| Grading | Grade Rubber Sheet | ☐ |
| Price Forecasting | Forecast Price | ☐ |
| Admin | Admin Endpoints | ☐ |

---

### 1.3 Chatbot — Python RAG Service (`RubberIntelligence.Chatbot`)

- [ ] `requirements.txt` is up to date (`pip freeze > requirements.txt`)
- [ ] `app.py` starts without errors (`python app.py`)
- [ ] `knowledge/rubber_knowledge.json` has all 50+ curated entries
- [ ] FAISS index builds successfully on startup
- [ ] No hardcoded absolute paths in code
- [ ] `README.md` has working setup instructions

---

## 2. Configuration & Secrets

- [ ] MongoDB Atlas connection string is in `appsettings.json` / environment variable (not hardcoded)
- [ ] JWT secret key is stored in environment variable / secrets manager
- [ ] Gemini API key is stored in environment variable (never committed to repo)
- [ ] `EXPO_PUBLIC_USE_PHYSICAL_DEVICE` documented in `README.md` or `.env.example`
- [ ] `EXPO_PUBLIC_DEVICE_API_HOST` documented if needed for LAN testing
- [ ] `.gitignore` covers:
  - [ ] `*.env` and `appsettings.*.json` secrets
  - [ ] `node_modules/`
  - [ ] `bin/`, `obj/`
  - [ ] `App_Data/SecureInvoices/` (uploaded files)
  - [ ] `__pycache__/`, `*.pyc`

---

## 3. Security Checklist (OWASP)

- [ ] All API endpoints that touch user data are behind `[Authorize]`
- [ ] ReBAC enforced on sensitive endpoints (Exporter can only access own transactions)
- [ ] `SecretRequestId` nullified after invoice encryption (zero-knowledge guarantee)
- [ ] AES-256-CBC used for all field-level and file-level encryption
- [ ] JWT expiry set to reasonable window (e.g. 7 days)
- [ ] CORS restricted to known origins in production `appsettings.json`
- [ ] No user passwords stored in plaintext (BCrypt / ASP.NET Identity hashing confirmed)
- [ ] ONNX model file is read-only — no user input influences model path
- [ ] File upload endpoints validate MIME type and size
- [ ] No SQL injection surface (MongoDB driver; parameterised where applicable)

---

## 4. Testing

- [ ] End-to-end test: Buyer creates post → Exporter bids → Buyer accepts → Invoice uploaded → Exporter decrypts via DualLayerDppScreen
- [ ] One-time key claim (`GET /my-secret`) returns 410 after invoice is encrypted
- [ ] Wrong `SecretRequestId` → decryption fails gracefully ("Incorrect Key") on device
- [ ] Public document → PDF opens via share sheet without key entry
- [ ] QR code generated from `dppHash` and scans correctly in `ExporterScannerScreen`
- [ ] Physical verification returns correct pass / fail result
- [ ] `GET /api/Marketplace/transactions` returns 401 without token (not 500)
- [ ] Invoice download (`GET /transactions/{id}/invoice`) returns 200 with valid JWT
- [ ] Disease detection returns valid classification with confidence score
- [ ] Grading returns correct RSS grade from test image
- [ ] Chatbot returns relevant answer for rubber-domain query

---

## 5. Documentation

- [ ] Root `README.md` — project overview, team, features, how to run
- [ ] `rubber-intelligence-app/README.md` — frontend setup, env vars, run commands
- [ ] `RubberIntelligence.Backend/README.md` — backend setup, env vars, run commands
- [ ] `RubberIntelligence.Chatbot/README.md` — Python env setup, how to start
- [ ] `DPP_MARKETPLACE_README.md` — full technical reference (already present)
- [ ] `PP2readme.md` — architecture & data-flow diagrams (already present)
- [ ] API documented via Swagger (`/swagger` endpoint accessible in dev)
- [ ] Each team member's student ID mapped to their feature in README

---

## 6. Individual Contributions

| Student ID | Feature | Backend Done | Frontend Done | Tested |
|---|---|---|---|---|
| IT22355928 | Rubber Grading System | ☐ | ☐ | ☐ |
| IT22563750 | Disease Detection & GPS Alert | ☐ | ☐ | ☐ |
| IT22584090 | Price Forecasting & Monitoring | ☐ | ☐ | ☐ |
| IT22625298 | DPP, Zero-Knowledge Marketplace, Chatbot | ☐ | ☐ | ☐ |

---

## 7. Build & Deployment Artefacts

- [ ] APK / EAS build generated and tested on physical Android device
- [ ] Backend deployable (Docker or publish profile confirmed)
- [ ] Chatbot deployable (`uvicorn` or `flask run` confirmed)
- [ ] Demo video recorded (walkthrough of all 4 features)
- [ ] Final report / dissertation submitted to supervisor

---

## 8. Pre-Submission Final Checks

- [ ] `adb reverse tcp:5001 tcp:5001` step documented for physical device testing
- [ ] App launches without crash on a fresh install (cleared AsyncStorage + SecureStore)
- [ ] No broken navigation routes (every screen reachable from its navigator)
- [ ] All images / assets in `rubber-intelligence-app/assets/` committed
- [ ] `FinalResearch.sln` opens and all projects load cleanly in Visual Studio / Rider
- [ ] Git history is clean — no large binary files, no secrets in commit history

---

*Last updated: March 2026*
