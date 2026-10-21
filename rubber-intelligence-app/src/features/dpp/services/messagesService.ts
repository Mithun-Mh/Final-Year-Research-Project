import apiClient from '../../../core/api/apiClient';
import { MessageDto, SendMessageRequest } from '../types';

// ── POST /api/messages/{lotId} ────────────────────────────────────────
// Send a message linked to a lot. If isConfidential = true the backend
// encrypts content with AES-256-CBC before persisting.
export const sendMessage = async (
    lotId: string,
    request: SendMessageRequest
): Promise<MessageDto> => {
    const response = await apiClient.post<MessageDto>(`/messages/${lotId}`, request);
    return response.data;
};

// ── GET /api/messages/{lotId} ─────────────────────────────────────────
// Fetch all messages for a lot where the authenticated user is a participant.
// Content is always returned as plaintext (decrypted by the service layer).
export const getMessages = async (lotId: string): Promise<MessageDto[]> => {
    const response = await apiClient.get<MessageDto[]>(`/messages/${lotId}`);
    return response.data;
};

// ── GET /api/messages/unread-count ────────────────────────────────────
// Returns the count of messages received by the authenticated user that are
// not yet read. Used to drive the notification bell badge.
export const getUnreadMessageCount = async (): Promise<number> => {
    const response = await apiClient.get<{ count: number }>('/messages/unread-count');
    return response.data.count;
};

// ── POST /api/messages/{lotId}/mark-read ──────────────────────────────
// Marks all messages in the given lot addressed to the current user as read.
// Called by LotMessagingScreen when a conversation is opened.
export const markLotRead = async (lotId: string): Promise<void> => {
    await apiClient.post(`/messages/${lotId}/mark-read`);
};
