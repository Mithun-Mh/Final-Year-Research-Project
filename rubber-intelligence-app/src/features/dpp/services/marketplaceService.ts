import apiClient from '../../../core/api/apiClient';
import { SellingPost, MarketplaceTransaction, BuyerHistory, InvoiceUploadResponse, InvoiceDecryptedField, QirUploadResponse, QirDecryptedField, ExporterDppView, InterestedExporter, AcceptExporterRequest, DualLayerDppResponse, LotInterestRequest } from '../types';
import * as FileSystem from 'expo-file-system/legacy';
import { getToken } from '../../../core/auth/tokenStorage';

export const createSellingPost = async (postData: Partial<SellingPost>): Promise<SellingPost> => {
    try {
        const response = await apiClient.post<SellingPost>('/Marketplace/posts', postData);
        return response.data;
    } catch (error) {
        console.error('Create Post Error:', error);
        throw error;
    }
};

export const getSellingPosts = async (buyerId?: string): Promise<SellingPost[]> => {
    try {
        const url = buyerId ? `/Marketplace/posts?buyerId=${buyerId}` : '/Marketplace/posts';
        const response = await apiClient.get<SellingPost[]>(url);
        return response.data;
    } catch (error) {
        console.error('Fetch Posts Error:', error);
        return [];
    }
};

export const buyItem = async (postId: string): Promise<MarketplaceTransaction> => {
    try {
        const response = await apiClient.post<MarketplaceTransaction>(`/Marketplace/posts/${postId}/buy`, {});
        return response.data;
    } catch (error) {
        console.error('Buy Item Error:', error);
        throw error;
    }
};

export const getMyTransactions = async (): Promise<MarketplaceTransaction[]> => {
    try {
        const response = await apiClient.get<MarketplaceTransaction[]>('/Marketplace/transactions');
        return response.data;
    } catch (error) {
        console.error('Fetch Transactions Error:', error);
        return [];
    }
};

export const uploadInvoice = async (transactionId: string, file: any): Promise<InvoiceUploadResponse> => {
    try {
        const formData = new FormData();
        formData.append('file', {
            uri: file.uri,
            name: file.name || 'invoice.pdf',
            type: file.mimeType || 'application/pdf',
        } as any);

        // In React Native, setting Content-Type to 'multipart/form-data' causes the native XHR layer
        // to append the correct boundary automatically. Do NOT include transformRequest — it bypasses
        // axios's FormData handling and strips the boundary, causing ASP.NET to return 400.
        const response = await apiClient.post<InvoiceUploadResponse>(
            `/Marketplace/transactions/${transactionId}/invoice`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 120000, // 2 min — Gemini OCR + AES encryption pipeline can take 60-90 s
            }
        );
        return response.data;
    } catch (error) {
        console.error('Upload Invoice Error:', error);
        throw error;
    }
};

export const linkDppToTransaction = async (transactionId: string, dppId: string): Promise<any> => {
    try {
        const response = await apiClient.post(`/Marketplace/transactions/${transactionId}/dpp`, { dppId });
        return response.data;
    } catch (error) {
        console.error('Link DPP Error:', error);
        throw error;
    }
};

// ── BUYER HISTORY ─────────────────────────────────────────────────────

// GET /api/marketplace/buyer-history/{buyerId} (Exporter only)
export const getBuyerHistory = async (buyerId: string): Promise<BuyerHistory> => {
    const response = await apiClient.get<BuyerHistory>(`/Marketplace/buyer-history/${buyerId}`);
    return response.data;
};

export const getInvoiceFileUri = async (transactionId: string): Promise<{ uri: string, mimeType: string }> => {
    try {
        const baseURL = apiClient.defaults.baseURL;
        const url = `${baseURL}/Marketplace/transactions/${transactionId}/invoice`;
        const token = await getToken();

        // Download to a temporary generic path
        const tempUri = `${FileSystem.documentDirectory}invoice_${transactionId}_tmp`;

        const cleanToken = token ?? '';

        const downloadRes = await FileSystem.downloadAsync(url, tempUri, {
            headers: cleanToken ? { Authorization: `Bearer ${cleanToken}` } : {}
        });

        if (downloadRes.status !== 200) {
            throw new Error(`Failed to download invoice: Status ${downloadRes.status}`);
        }

        const headers = downloadRes.headers || {};
        const contentType = headers['Content-Type'] || headers['content-type'] || 'application/octet-stream';

        let ext = '.pdf';
        if (contentType.includes('image/jpeg')) ext = '.jpg';
        if (contentType.includes('image/png')) ext = '.png';

        const finalUri = `${FileSystem.documentDirectory}invoice_${transactionId}${ext}`;

        await FileSystem.moveAsync({
            from: tempUri,
            to: finalUri
        });

        return { uri: finalUri, mimeType: contentType };
    } catch (error) {
        console.error('Get Invoice File Error:', error);
        throw error;
    }
};

// ── INVOICE EXTRACTED FIELDS ──────────────────────────────────────────────────

/**
 * POST /api/Marketplace/transactions/{transactionId}/qir
 * Buyer uploads a Quality Inspection Report after the invoice is uploaded.
 * Returns the same shape as InvoiceUploadResponse for reuse with ClassificationResultScreen.
 */
export const uploadQir = async (transactionId: string, file: any): Promise<QirUploadResponse> => {
    try {
        const formData = new FormData();
        formData.append('file', {
            uri: file.uri,
            name: file.name || 'qir.pdf',
            type: file.mimeType || 'application/pdf',
        } as any);

        // In React Native, setting Content-Type to 'multipart/form-data' lets the native XHR layer
        // append the correct boundary automatically. Do NOT include transformRequest — it bypasses
        // axios's FormData handling and strips the multipart boundary, causing a Network Error.
        const response = await apiClient.post<QirUploadResponse>(
            `/Marketplace/transactions/${transactionId}/qir`,
            formData,
            {
                headers: { 'Content-Type': 'multipart/form-data' },
                timeout: 180000, // 3 min — Gemini OCR up to 3 retry attempts + AES encryption pipeline
            }
        );
        return response.data;
    } catch (error) {
        console.error('Upload QIR Error:', error);
        throw error;
    }
};

/**
 * GET /api/Marketplace/transactions/{transactionId}/qir-fields
 * Decrypts and returns all extracted QIR fields for the authenticated Buyer.
 */
export const getQirExtractedFields = async (
    transactionId: string
): Promise<QirDecryptedField[]> => {
    const response = await apiClient.get<QirDecryptedField[]>(
        `/Marketplace/transactions/${transactionId}/qir-fields`
    );
    return response.data;
};

/**
 * GET /api/Marketplace/transactions/{transactionId}/invoice-fields
 * Decrypts and returns all extracted invoice fields for the authenticated Buyer.
 * Confidential fields carry their AES-256-CBC decrypted plaintext values.
 * Only the Buyer who owns the transaction may call this endpoint.
 */
export const getInvoiceExtractedFields = async (
    transactionId: string
): Promise<InvoiceDecryptedField[]> => {
    const response = await apiClient.get<InvoiceDecryptedField[]>(
        `/Marketplace/transactions/${transactionId}/invoice-fields`
    );
    return response.data;
};

/**
 * GET /api/Marketplace/transactions/{transactionId}/exporter-dpp
 * Returns the combined DPP view for the exporter who purchased this lot.
 * Built from the buyer's invoice + QIR extracted fields.
 * Confidential buyer fields are withheld (value = null, isConfidential = true).
 * Only accessible by the Exporter who owns the transaction.
 */
export const getExporterTransactionDpp = async (
    transactionId: string
): Promise<ExporterDppView> => {
    const response = await apiClient.get<ExporterDppView>(
        `/Marketplace/transactions/${transactionId}/exporter-dpp`
    );
    return response.data;
};

// ── INTERESTED EXPORTERS (TRUST-SCORED LEADERBOARD) ───────────────────

/**
 * POST /api/Marketplace/posts/{id}/express-interest
 * Exporter signals interest in a buyer’s rubber lot.
 * The post status changes to REQUESTED so the buyer is notified on next load.
 */
export const expressInterest = async (postId: string): Promise<{ message: string; interestId: string }> => {
    const response = await apiClient.post<{ message: string; interestId: string }>(
        `/Marketplace/posts/${postId}/express-interest`
    );
    return response.data;
};

/**
 * GET /api/Marketplace/posts/my-requests
 * Returns all REQUESTED posts owned by the authenticated buyer.
 * Used by BuyerDashboard to show the notification badge and PendingRequestsScreen.
 */
export const getMyRequestedPosts = async (): Promise<SellingPost[]> => {
    try {
        const response = await apiClient.get<SellingPost[]>('/Marketplace/posts/my-requests');
        return response.data;
    } catch {
        return [];
    }
};

export const getInterestedExporters = async (
    postId: string
): Promise<InterestedExporter[]> => {
    const response = await apiClient.get<InterestedExporter[]>(
        `/Marketplace/posts/${postId}/interested-exporters`
    );
    return response.data;
};

export const acceptExporter = async (
    postId: string,
    request: AcceptExporterRequest
): Promise<MarketplaceTransaction> => {
    const response = await apiClient.post<MarketplaceTransaction>(
        `/Marketplace/posts/${postId}/accept-exporter`,
        request
    );
    return response.data;
};

// ── DUAL-LAYER DPP (Zero-Knowledge Delivery) ─────────────────────────

/**
 * GET /api/Marketplace/transactions/{transactionId}/my-secret
 * One-time key claim: Only the purchasing Exporter (ReBAC) can call this.
 * Returns the SecretRequestId for client-side PBKDF2-AES-256-CBC decryption.
 * After the Buyer uploads the invoice the key is permanently nullified — claim early.
 * Returns 410 Gone if the key has already been consumed.
 */
export const claimSecret = async (
    transactionId: string
): Promise<{ secretRequestId: string }> => {
    const response = await apiClient.get<{ secretRequestId: string }>(
        `/Marketplace/transactions/${transactionId}/my-secret`
    );
    return response.data;
};

/**
 * GET /api/Marketplace/transactions/{transactionId}/dual-layer-dpp
 * Returns the conditional vault payload for client-side PBKDF2-AES-256-CBC decryption.
 * documentStatus: "CONFIDENTIAL" | "PUBLIC" | "NOT_UPLOADED"
 * documentPayload: Base64 ciphertext (CONFIDENTIAL) or Base64 raw bytes (PUBLIC)
 * Only the purchasing Exporter may call this endpoint (ReBAC: 403 otherwise).
 */
export const getDualLayerDpp = async (
    transactionId: string
): Promise<DualLayerDppResponse> => {
    const response = await apiClient.get<DualLayerDppResponse>(
        `/Marketplace/transactions/${transactionId}/dual-layer-dpp`
    );
    return response.data;
};

/**
 * POST /api/Marketplace/transactions/{transactionId}/exporter-docs
 * Accepted exporter uploads their own supporting documents (shipping certs, origin docs, etc.)
 * Only the accepted Exporter for this transaction may call this.
 */
export const uploadExporterDocs = async (
    transactionId: string,
    file: any
): Promise<{ message: string; fileName: string; uploadedAt: string; transactionId: string }> => {
    const formData = new FormData();
    formData.append('file', {
        uri: file.uri,
        name: file.name || 'document.pdf',
        type: file.mimeType || 'application/pdf',
    } as any);

    const response = await apiClient.post(
        `/Marketplace/transactions/${transactionId}/exporter-docs`,
        formData,
        {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 60000,
        }
    );
    return response.data;
};

/**
 * GET /api/Marketplace/posts/my-interest-requests
 * Returns all interest requests submitted by the calling Exporter.
 * Used to show "Already Requested" state on marketplace items.
 */
export const getMyInterestRequests = async (): Promise<LotInterestRequest[]> => {
    try {
        const response = await apiClient.get<LotInterestRequest[]>('/Marketplace/posts/my-interest-requests');
        return response.data;
    } catch {
        return [];
    }
};
