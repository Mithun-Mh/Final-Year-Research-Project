import apiClient from '../../../core/api/apiClient';
import { DppUploadResponse, DppDocument, DigitalProductPassport, DppVerificationResponse, EncryptedFileInfo } from '../types';

// ── POST /api/dpp/upload ─────────────────────────────────────────────
export const uploadDppDocument = async (
    fileUri: string,
    fileName: string,
    fileType: string
): Promise<DppUploadResponse> => {
    const formData = new FormData();
    formData.append('File', { uri: fileUri, name: fileName, type: fileType } as any);

    const response = await apiClient.post<DppUploadResponse>('/dpp/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        transformRequest: [(data: any) => data],
    });
    return response.data;
};

// ── POST /api/dpp/{dppId}/generate-passport ──────────────────────────
export const generatePassport = async (dppId: string): Promise<DigitalProductPassport> => {
    const response = await apiClient.post<DigitalProductPassport>(
        `/dpp/${dppId}/generate-passport`
    );
    return response.data;
};

// ── GET /api/dpp/passport/{dppId} ────────────────────────────────────
export const getPassport = async (dppId: string): Promise<DigitalProductPassport> => {
    const response = await apiClient.get<DigitalProductPassport>(`/dpp/passport/${dppId}`);
    return response.data;
};

// ── GET /api/dpp/my-uploads ──────────────────────────────────────────
export const getBuyerDocuments = async (): Promise<DppDocument[]> => {
    try {
        const response = await apiClient.get<DppDocument[]>('/dpp/my-uploads');
        return response.data;
    } catch {
        return [];
    }
};

// ── GET /api/dpp/{id} ────────────────────────────────────────────────
export const getDppMetadata = async (id: string): Promise<DppDocument> => {
    const response = await apiClient.get<DppDocument>(`/dpp/${id}`);
    return response.data;
};

// ── GET /api/dpp/{id}/access (file download URL) ─────────────────────
export const getDppFileUrl = (id: string): string =>
    `${apiClient.defaults.baseURL}/dpp/${id}/access`;

// ── HASH VERIFICATION ─────────────────────────────────────────────────

// GET /api/dpp/verify/{lotId} (Buyer, Exporter)
export const verifyDpp = async (lotId: string, expectedLotId?: string): Promise<DppVerificationResponse> => {
    const url = expectedLotId
        ? `/dpp/verify/${lotId}?expectedLotId=${expectedLotId}`
        : `/dpp/verify/${lotId}`;
    const response = await apiClient.get<DppVerificationResponse>(url);
    return response.data;
};// ── GET /api/dpp/{id}/encrypted-file-info ──────────────────────────────
export const getEncryptedFileInfo = async (id: string): Promise<EncryptedFileInfo> => {
    const response = await apiClient.get<EncryptedFileInfo>(`/dpp/${id}/encrypted-file-info`);
    return response.data;
};
// ── PENDING INTEREST REQUESTS (Buyer notification) ─────────────────
// GET /api/Marketplace/posts/my-requests
// Returns all posts owned by the authenticated buyer with REQUESTED status.
export const getPendingAccessRequests = async (): Promise<any[]> => {
    try {
        const response = await apiClient.get('/Marketplace/posts/my-requests');
        return response.data;
    } catch {
        return [];
    }
};
