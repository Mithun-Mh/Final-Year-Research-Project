import { StateCreator } from 'zustand';
import { AlertService, AlertItem } from '../features/diseaseDetection/services/alertService';

export interface AlertSlice {
    alerts: AlertItem[];
    unreadCount: number;
    alertsLoading: boolean;
    fetchAlerts: () => Promise<void>;
    fetchUnreadCount: () => Promise<void>;
    markAlertRead: (alertId: string) => Promise<void>;
}

export const createAlertSlice: StateCreator<AlertSlice> = (set, get) => ({
    alerts: [],
    unreadCount: 0,
    alertsLoading: false,

    fetchAlerts: async () => {
        set({ alertsLoading: true });
        try {
            const alerts = await AlertService.getAlerts();
            set({ alerts, alertsLoading: false });
        } catch (error) {
            set({ alertsLoading: false });
        }
    },

    fetchUnreadCount: async () => {
        try {
            const count = await AlertService.getUnreadCount();
            set({ unreadCount: count });
        } catch (error) {
            // Silently fail for badge count
        }
    },

    markAlertRead: async (alertId: string) => {
        try {
            await AlertService.markAsRead(alertId);
            const alerts = get().alerts.map(a =>
                a.id === alertId ? { ...a, isRead: true } : a
            );
            set({ alerts, unreadCount: Math.max(0, get().unreadCount - 1) });
        } catch (error) {
            console.error('Failed to mark alert as read:', error);
        }
    },
});
