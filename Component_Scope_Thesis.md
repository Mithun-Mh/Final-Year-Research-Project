# Scope of the Research Components

The scope of this research is strictly defined around the design, implementation, and evaluation of the **Digital Marketplace Ecosystem** and the **Confidentiality-Aware Digital Product Passport (DPP) Architecture**. The following delineates the functional boundaries—detailing what is explicitly included within the system's operational parameters and what remains outside the purview of this study.

## 1. Scope of the Digital Marketplace Ecosystem

This module focuses on the B2B supply chain coordination and structural trade negotiation for the rubber industry.

**In Scope:**
*   **Asset Digitization:** The creation, registration, and lifecycle management of physical rubber lots as digital entities (including grade, quantity, and baseline location metrics).
*   **Counterparty Interaction:** Facilitating structured business-to-business (B2B) communications, specifically exporter expressions of interest (purchase requests) and buyer approvals.
*   **Transaction State Management:** Orchestrating the supply chain transaction state machine (e.g., from *Pending Invoice* to *Completed*).
*   **Document Aggregation:** Serving as a centralized repository linking transaction states to their required supporting documentation (e.g., Quality Inspection Reports, Invoices, and Shipping Certificates).

**Out of Scope:**
*   **Financial Gateways:** The system records agreed offer prices and transaction statuses but does not integrate with active payment gateways, fiat currency transfers, or escrow services.
*   **Live Telemetry Routing:** Physical real-time GPS tracking of rubber shipments during transit is excluded; the system tracks the transition of verifiable data states rather than physical geolocation telematics.

## 2. Scope of the Confidentiality-Aware DPP Architecture

This module encompasses the cryptographic security, data extraction, and transparency frameworks essential for a secure supply chain.

**In Scope:**
*   **Provenance Tracking:** Generation of cryptographically hashed Digital Product Passports serving as immutable digital twins for rubber lots.
*   **AI-Driven Document Triage:** The utilization of an ONNX-driven machine learning classifier to analyze uploaded supply chain documents, predicting their content and determining their sensitivity/confidentiality tier.
*   **Granular Data Extraction:** Leveraging Large Language Models (LLMs) to parse unstructured supply chain documents (like QIRs) and extract structured key-value data fields.
*   **Field-Level Encryption:** Applying localized AES-256-CBC encryption specifically to fields flagged as confidential (e.g., proprietary pricing or supplier identities), rather than encrypting entire documents as opaque BLOBs.
*   **Zero-Knowledge Searchability:** Implementation of HMAC-SHA256 blind indexing to allow the system to perform equality matches on encrypted data without decrypting the underlying plaintext.
*   **Cryptographic Access Governance:** The generation and management of Document Access Grants, securely mapping authorized users to specific plaintext decryption keys.
*   **DPP Hash Verification:** The generation of deterministic SHA-256 cryptographic hashes for physical rubber lots, encoded into physical QR codes, and the backend verification logic to dynamically detect tampering by comparing physical scans against the immutable database state.

**Out of Scope:**
*   **Foundational AI Model Training:** The research focuses on the *application* of AI classifiers (ONNX) and existing LLM architectures (e.g., Gemini) for document processing, rather than the foundational training of new, proprietary Optical Character Recognition (OCR) or generative models from scratch.
*   **Public Distributed Ledgers:** While the system employs cryptographic hashing for tamper-evidence and data integrity, it relies on a centralized or federated database architecture (e.g., MongoDB) optimized for confidentiality, rather than a globally distributed public blockchain (e.g., Ethereum) which inherently conflicts with strict commercial data privacy requirements.
