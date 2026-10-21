# Blockchain-Based Bidding Platform - Complete Guide

This guide provides a comprehensive overview of the **Blockchain-Based Bidding Platform** within the Rubber Intelligence App. It is designed to explain the system architecture, user scenarios, and the role of blockchain technology to stakeholders and management.

---

## 1. High-Level Overview

The bidding platform is a decentralized, transparent marketplace that connects **Rubber Farmers** (Sellers) with **Buyers/Exporters**. By integrating blockchain technology, the platform ensures that every batch of rubber has a verifiable **Digital Product Passport (DPP)**. This guarantees authenticity, tracks the product's origin, and ensures fair, tamper-proof auctions.

### Core Value Proposition
- **Trust & Transparency:** Bidding and product data are immutable. Buyers know exactly what they are purchasing.
- **Real-Time Auctions:** Live, competitive bidding drives fair market prices for farmers.
- **Traceability:** End-to-end tracking of rubber batches from farm to export via NFT passports.

---

## 2. How the Blockchain Works in This Platform

The system leverages simulated **Ethereum Blockchain** and **IPFS (InterPlanetary File System)** technologies to secure lot data.

### Minting an NFT Passport
When a farmer registers a new batch (Lot) of rubber, the system creates a **Non-Fungible Token (NFT)**. 
- **What is it?** An NFT acts as a unique digital certificate of ownership and authenticity for that physical batch of rubber.
- **Smart Contracts:** The NFT is governed by a smart contract that dictates the rules of the item (e.g., it cannot be duplicated or falsified).

### Decentralized Storage (IPFS)
The physical characteristics of the rubber (Grade, Weight, Location, Moisture Level, Cleanliness) are stored on **IPFS**.
- **What is it?** IPFS is a secure, decentralized storage network. Instead of storing data on a single vulnerable server, it is distributed across network nodes.
- **Why use it?** It prevents anyone from altering the quality data after the fact. The IPFS Hash is permanently linked to the NFT.

---

## 3. The Bidding Lifecycle & Scenarios

### Scenario A: The Farmer Creates a Lot (Selling)
1. **Data Entry:** The farmer inputs the rubber's grade (e.g., RSS1, RSS2), weight, and production location into the `CreateLotScreen`.
2. **Blockchain Verification:** 
   - The app mints the NFT on the blockchain, generating a unique `Token ID` (e.g., *0xNFT...*).
   - The quality metadata is uploaded to IPFS, generating an `IPFS Hash`.
3. **Auction Initialization:** An auction is automatically generated with a standard starting price based on the rubber grade (e.g., LKR 450/kg for RSS1). The auction duration is strictly set to **1 Hour**.

### Scenario B: The Buyer Participates in the Auction (Bidding)
1. **Real-Time Bidding:** Buyers enter the `AuctionBiddingScreen`. Using **SignalR** websockets, the app provides a live, real-time connection. If another buyer bids, the price updates instantly on everyone's screen without refreshing.
2. **Verification:** Buyers can view the **Digital Passport (NFT)** details, ensuring they are buying verified, high-quality rubber. They can also view the ESG (Environmental, Social, and Governance) score of the lot.
3. **Placing Bids:** 
   - Buyers can use quick increments (+LKR 5, +LKR 10, +LKR 25).
   - Or, they can place custom bids.
4. **Role Restrictions:** Farmers are explicitly restricted from bidding on lots to prevent price manipulation (shill bidding).

### Scenario C: Auction Closure and Settlement
1. **Time's Up:** Exactly one hour after creation, the countdown reaches zero. The SignalR network broadcasts an `AuctionClosed` event to all participants.
2. **Declaring the Winner:** The system locks the auction. The highest bidder is declared the winner, and no further bids are accepted.
3. **Traceability Handoff:** The winner now holds the rights to that specific NFT. The buyer can use the `TraceabilityScreen` to view the entire history of the lot.

---

## 4. Technical Summary for Management

| Feature | Technology Used | Business Benefit |
| :--- | :--- | :--- |
| **Real-Time Bids** | SignalR (WebSockets) | Creates a sense of urgency, driving up final sale prices. |
| **Product Passport** | Ethereum NFTs | Prevents fraud, guarantees origin, appeals to premium international buyers. |
| **Immutable Data** | IPFS | Ensures quality metrics cannot be tampered with post-grading. |
| **Timer Enforcement** | Backend & Frontend Sync | Ensures strict 1-hour auction windows, creating a standardized daily market cycle. |

## 5. Future Capabilities
Because the infrastructure is built on blockchain principles, the platform is future-proofed for:
- **Smart Contract Escrow:** Automatically holding buyer funds and releasing them to farmers upon physical delivery.
- **Secondary Markets:** Buyers trading rubber NFTs before physical delivery.
- **IoT Integration:** Automatically updating the NFT metadata with sensor data from shipping containers.
