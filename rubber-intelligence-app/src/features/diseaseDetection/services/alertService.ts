import apiClient from '../../../core/api/apiClient';

export interface AlertItem {
    id: string;
    farmerId: string;
    detectionId: string;
    diseaseName: string;
    severity: string;
    distanceKm: number;
    latitude: number;
    longitude: number;
    createdAt: string;
    isRead: boolean;
}

export const AlertService = {
    getAlerts: async (limit: number = 50): Promise<AlertItem[]> => {
        const response = await apiClient.get<AlertItem[]>(`/alert?limit=${limit}`);
        return response.data;
    },

    getUnreadCount: async (): Promise<number> => {
        const response = await apiClient.get<{ count: number }>('/alert/unread-count');
        return response.data.count;
    },

    markAsRead: async (alertId: string): Promise<void> => {
        await apiClient.put(`/alert/${alertId}/read`);
    },
};