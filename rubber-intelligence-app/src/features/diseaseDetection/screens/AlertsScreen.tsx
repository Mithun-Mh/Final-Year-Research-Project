import React, { useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../../store';
import { colors } from '../../../shared/styles/colors';

export const AlertsScreen = () => {
    const alerts = useStore(s => s.alerts);
    const alertsLoading = useStore(s => s.alertsLoading);
    const fetchAlerts = useStore(s => s.fetchAlerts);
    const markAlertRead = useStore(s => s.markAlertRead);

    useEffect(() => {
        fetchAlerts();
    }, []);

    const onRefresh = useCallback(() => {
        fetchAlerts();
    }, []);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
        const diffDays = Math.floor(diffHours / 24);

        if (diffHours < 1) return 'Just now';
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getSeverityColor = (severity: string) => {
        switch (severity?.toLowerCase()) {
            case 'high': return '#D32F2F';
            case 'medium': return '#FF9800';
            case 'low': return '#4CAF50';
            default: return '#9E9E9E';
        }
    };

    const renderAlert = ({ item }: any) => (
        <TouchableOpacity
            style={[styles.alertCard, item.isRead && styles.alertCardRead]}
            onPress={() => !item.isRead && markAlertRead(item.id)}
            activeOpacity={0.7}
        >
            <View style={styles.alertLeft}>
                <View style={[styles.severityDot, { backgroundColor: getSeverityColor(item.severity) }]} />
                {!item.isRead && <View style={styles.unreadDot} />}
            </View>
            <View style={styles.alertContent}>
                <View style={styles.alertTitleRow}>
                    <Text style={[styles.alertTitle, item.isRead && styles.alertTitleRead]} numberOfLines={1}>
                        ⚠️ {item.diseaseName} Detected Nearby
                    </Text>
                    <View style={[styles.severityBadge, { backgroundColor: getSeverityColor(item.severity) }]}>
                        <Text style={styles.severityBadgeText}>{item.severity}</Text>
                    </View>
                </View>
                <Text style={styles.alertDetail}>
                    📍 {item.distanceKm.toFixed(1)} km from your plantation
                </Text>
                <Text style={styles.alertTime}>{formatTime(item.createdAt)}</Text>
            </View>
            <Ionicons
                name={item.isRead ? 'checkmark-circle' : 'alert-circle'}
                size={24}
                color={item.isRead ? colors.gray : colors.error}
            />
        </TouchableOpacity>
    );

    if (alertsLoading && alerts.length === 0) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.emptyText}>Loading alerts...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="notifications" size={28} color={colors.primary} />
                <Text style={styles.headerTitle}>Disease Alerts</Text>
            </View>

            {alerts.length === 0 ? (
                <View style={styles.center}>
                    <Ionicons name="shield-checkmark" size={64} color={colors.success} />
                    <Text style={styles.emptyTitle}>All Clear!</Text>
                    <Text style={styles.emptyText}>No disease alerts in your area.</Text>
                </View>
            ) : (
                <FlatList
                    data={alerts}
                    keyExtractor={(item) => item.id}
                    renderItem={renderAlert}
                    refreshControl={
                        <RefreshControl refreshing={alertsLoading} onRefresh={onRefresh} />
                    }
                    contentContainerStyle={styles.list}
                />
            )}
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#f9f9f9',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        padding: 20,
        paddingBottom: 10,
        gap: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#333',
    },
    list: {
        padding: 16,
    },
    alertCard: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        padding: 16,
        borderRadius: 12,
        marginBottom: 12,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        borderLeftWidth: 4,
        borderLeftColor: colors.error,
    },
    alertCardRead: {
        borderLeftColor: colors.gray,
        opacity: 0.7,
    },
    alertLeft: {
        marginRight: 12,
        alignItems: 'center',
    },
    severityDot: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: colors.primary,
        marginTop: 4,
    },
    alertContent: {
        flex: 1,
    },
    alertTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#333',
        marginBottom: 4,
    },
    alertTitleRead: {
        fontWeight: '500',
        color: '#666',
    },
    alertDetail: {
        fontSize: 13,
        color: '#666',
        marginBottom: 2,
    },
    alertTime: {
        fontSize: 11,
        color: '#999',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: colors.success,
        marginTop: 12,
    },
    emptyText: {
        fontSize: 14,
        color: '#999',
        marginTop: 8,
    },
    alertTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 4,
    },
    severityBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
        marginLeft: 8,
    },
    severityBadgeText: {
        color: '#FFF',
        fontSize: 10,
        fontWeight: 'bold',
    },
});
