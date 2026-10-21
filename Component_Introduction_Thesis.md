# System Architecture and Component Modules

The overarching architecture of the RubberIntelligence platform is engineered to address the dual challenges of supply chain transparency and commercial data privacy. The system is structurally divided into distinct, yet highly interoperable modules, each responsible for specific domains within the digital supply chain lifecycle. This section introduces the two primary components central to this research: the Digital Marketplace Ecosystem and the Confidentiality-Aware Digital Product Passport (DPP) Architecture.

## 1. Digital Marketplace Ecosystem

The Marketplace module serves as the primary interactive hub for the platform’s stakeholders, primarily buyers and exporters. Its architectural focus is on the structured acquisition of supply chain logistics, business-to-business (B2B) trading interactions, and the rigorous management of the transactional lifecycle.

*   **Commodity Provenance and Lot Digitization:**
    The lifecycle of an asset begins when a buyer registers a batch of rubber. The module captures granular physical and economic metrics to digitize the asset, including specific rubber grades (e.g., RSS1, RSS2), total aggregate quantity, geographic location, and baseline pricing metrics. This foundational data creates a transparent representation of available supply and is cryptographically linked to the lot's Digital Product Passport (DPP) to guarantee end-to-end traceability.

*   **B2B Interaction and Exporter Profiling:**
    To cultivate a secure and verifiable trading environment, the marketplace systematically monitors and records exporter interactions. Upon an exporter expressing purchasing interest, the platform aggregates identity data, encompassing organizational taxonomy, country of origin, and verification status. This structured profiling is critical for buyers to evaluate counterparty risk and establish mutual trust prior to initiating formal transactions.

*   **Transactional Lifecycle and Evidence Collection:**
    Upon the finalization of a trading agreement, a comprehensive transaction state machine is instantiated. This phase records critical workflow transitions, tracking the asset's state from initial handshake to final fulfillment. The transaction model acts as a centralized repository for crucial supporting documentation, aggregating Quality Inspection Reports (QIR), financial invoices, and shipping certificates. The platform employs Large Language Model (LLM) pipelines to automatically extract key performance indicators and metrics from these documents, facilitating rapid verification without necessitating the exposure of the raw, potentially sensitive files.

## 2. Confidentiality-Aware Digital Product Passport (DPP) Architecture

The DPP module represents the cornerstone of the platform’s security and traceability framework. Its data collection methodology transcends conventional storage paradigms; it integrates intelligent processing, granular encryption, and zero-knowledge principles to achieve a delicate equilibrium between systemic transparency and absolute commercial confidentiality.

*   **Core Traceability and Immutable State Tracking:**
    The system generates a cryptographically secure passport for every registered rubber lot, acting as its immutable digital twin. The core DPP record aggregates essential provenance parameters—such as dispatch logs, grading metrics, and volumetric data—and binds them using cryptographic hashing mechanisms. The platform meticulously tracks the passport's state transitions (e.g., *Generated, Verified, Accepted, Reinspection Requested*), providing a tamper-evident audit trail of the commodity's complete lifecycle.

*   **Intelligent Document Processing and AI Classification:**
    Supply chain documents uploaded to the DPP ecosystem are subjected to an intelligent preprocessing pipeline rather than static storage. The system leverages an ONNX-driven Artificial Intelligence classifier to analyze document context and determine sensitivity levels. The platform dynamically collects metadata, including classification typologies, AI confidence intervals, extracted textual summaries, and heuristically detected keywords. This intelligent triage allows the system to autonomously route and secure documents based on their inherent risk profiles.

*   **Granular, Field-Level Data Security:**
    A defining innovation of this architecture is its field-level data extraction and encryption model. Departing from the traditional practice of encrypting documents as monolithic binary large objects (BLOBs), the system isolates individual data vectors (e.g., specific unit prices, proprietary supplier identities). If the AI pipeline flags a specific field as confidential, its distinct value is immediately secured utilizing AES-256-CBC encryption. To preserve searchability without compromising security, the platform generates and stores an HMAC-SHA256 Blind Index for these fields. This zero-knowledge architectural pattern ensures sensitive data can be queried and matched without ever exposing the underlying plaintext to unauthorized network participants or the host database itself.

*   **Cryptographic Access Management:**
    To govern data visibility, the system implements a robust cryptographic access management protocol. When an authorized entity (e.g., an exporter) is granted permission to view a confidential document or field, the platform provisions a secure Access Grant. This record cryptographically maps the authenticated user identity to the specific plaintext decryption keys required to unlock the protected data payload. This mechanism guarantees that every decryption event is explicitly authenticated, rigidly authorized, and permanently recorded in the system's audit logs.

*   **DPP Hash Verification and Anti-Fraud Mechanics:**
    To guarantee the physical integrity of the supply chain against substitution or tampering, the system employs an automated DPP Hash Verification protocol. A deterministic SHA-256 hash is generated for every rubber lot, synthesizing immutable physical attributes (e.g., weight, grade) into a unique cryptographic fingerprint linked to a physical QR code. Upon scanning this code during transit or delivery, the system recalculates the passport's hash from the active database state and matches it against the physical scan. Discrepancies immediately trigger anti-fraud alerts, ensuring an unbreakable, verifiable link between the physical asset and its digital twin.
