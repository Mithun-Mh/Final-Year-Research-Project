import React, { useEffect, useRef } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Modal, Animated, Dimensions, TouchableWithoutFeedback,
    ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { AlertItem } from '../../features/diseaseDetection/services/alertService';
import { colors } from '../styles/colors';

const SCREEN_HEIGHT = Dimensions.get('window').height;
const PANEL_HEIGHT = SCREEN_HEIGHT * 0.6;

interface NotificationPanelProps {
    visible: boolean;
    onClose: () => void;
    onViewOnMap: (alert: AlertItem) => void;
}

export const NotificationPanel = ({ visible, onClose, onViewOnMap }: NotificationPanelProps) => {
    const alerts = useStore(s => s.alerts);
    const alertsLoading = useStore(s => s.alertsLoading);
    const fetchAlerts = useStore(s => s.fetchAlerts);
    const markAlertRead = useStore(s => s.markAlertRead);
    const slideAnim = useRef(new Animated.Value(PANEL_HEIGHT)).current;

    useEffect(() => {
        if (visible) {
            fetchAlerts();
            Animated.spring(slideAnim, {
                toValue: 0,
                useNativeDriver: true,
                tension: 65,
                friction: 11,
            }).start();
        } else {
            Animated.timing(slideAnim, {
                toValue: PANEL_HEIGHT,
                duration: 250,
                useNativeDriver: true,
            }).start();
        }
    }, [visible]);

    const formatTime = (dateStr: string) => {
        const date = new Date(dateStr);
        const now = new Date();
        const diffMs = now.getTime() - date.getTime();
        const diffMins = Math.floor(diffMs / (1000 * 60));
        const diffHours = Math.floor(diffMins / 60);
        const diffDays = Math.floor(diffHours / 24);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return date.toLocaleDateString();
    };

    const getSeverityColor = (distance: number) => {
        if (distance <= 1) return '#D32F2F';
        if (distance <= 3) return '#FF9800';
        return '#4CAF50';
    };

    const getSeverityLabel = (distance: number) => {
        if (distance <= 1) return 'VERY CLOSE';
        if (distance <= 3) return 'NEARBY';
        return 'IN AREA';
    };

    const handleViewOnMap = (alert: AlertItem) => {
        if (!alert.isRead) markAlertRead(alert.id);
        onClose();
        // Small delay for close animation
        setTimeout(() => onViewOnMap(alert), 300);
    };

    const renderAlert = ({ item }: { item: AlertItem }) => (
        <View style={[styles.alertCard, item.isRead && styles.alertCardRead]}>
            <View style={styles.alertRow}>
                {/* Severity indicator */}
                <View style={[styles.severityStrip, { backgroundColor: getSeverityColor(item.distanceKm) }]} />

                <View style={styles.alertBody}>
                    <View style={styles.alertTopRow}>
                        <Text style={[styles.alertTitle, item.isRead && styles.alertTitleRead]}>
                            ⚠️ {item.diseaseName}
                        </Text>
                        {!item.isRead && <View style={styles.unreadDot} />}
                    </View>

                    <View style={styles.alertMeta}>
                        <View style={[styles.distancePill, { backgroundColor: getSeverityColor(item.distanceKm) + '20' }]}>
                            <Text style={[styles.distanceText, { color: getSeverityColor(item.distanceKm) }]}>
                                {getSeverityLabel(item.distanceKm)} • {item.distanceKm.toFixed(1)} km
                            </Text>
                        </View>
                        <Text style={styles.timeText}>{formatTime(item.createdAt)}</Text>
                    </View>

                    {/* View on Map button */}
                    <TouchableOpacity
                        style={styles.mapButton}
                        onPress={() => handleViewOnMap(item)}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="navigate" size={14} color="#FFF" />
                        <Text style={styles.mapButtonText}>View on Map</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );

    if (!visible) return null;

    return (
        <Modal transparent visible={visible} animationType="none" onRequestClose={onClose}>
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={styles.backdrop} />
            </TouchableWithoutFeedback>

            <Animated.View
                style={[
                    styles.panel,
                    { transform: [{ translateY: slideAnim }] },
                ]}
            >
                {/* Handle bar */}
                <View style={styles.handleBar} />

                {/* Header */}
                <View style={styles.panelHeader}>
                    <Text style={styles.panelTitle}>🔔 Notifications</Text>
                    <TouchableOpacity onPress={onClose}>
                        <Ionicons name="close" size={24} color="#666" />
                    </TouchableOpacity>
                </View>

                {/* Content */}
                {alertsLoading && alerts.length === 0 ? (
                    <View style={styles.center}>
                        <ActivityIndicator size="large" color={colors.primary} />
                    </View>
                ) : alerts.length === 0 ? (
                    <View style={styles.center}>
                        <Ionicons name="shield-checkmark" size={48} color={colors.success} />
                        <Text style={styles.emptyTitle}>All Clear!</Text>
                        <Text style={styles.emptyText}>No disease alerts in your area</Text>
                    </View>
                ) : (
                    <FlatList
                        data={alerts}
                        keyExtractor={(item) => item.id}
                        renderItem={renderAlert}
                        contentContainerStyle={styles.list}
                        showsVerticalScrollIndicator={false}
                    />
                )}
            </Animated.View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    backdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    panel: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        height: PANEL_HEIGHT,
        backgroundColor: '#FFF',
        borderTopLeftRadius: 24,
        borderTopRightRadius: 24,
        paddingTop: 8,
        elevation: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -5 },
        shadowOpacity: 0.2,
        shadowRadius: 10,
    },
    handleBar: {
        width: 40,
        height: 4,
        backgroundColor: '#DDD',
        borderRadius: 2,
        alignSelf: 'center',
        marginBottom: 8,
    },
    panelHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 20,
        paddingBottom: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0',
    },
    panelTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333',
    },
    list: {
        padding: 16,
        paddingBottom: 30,
    },
    alertCard: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        marginBottom: 10,
        overflow: 'hidden',
        elevation: 1,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
        borderWidth: 1,
        borderColor: '#F0F0F0',
    },
    alertCardRead: {
        opacity: 0.65,
    },
    alertRow: {
        flexDirection: 'row',
    },
    severityStrip: {
        width: 4,
    },
    alertBody: {
        flex: 1,
        padding: 12,
    },
    alertTopRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    alertTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#333',
        flex: 1,
    },
    alertTitleRead: {
        fontWeight: '500',
        color: '#888',
    },
    unreadDot: {
        width: 8,
        height: 8,
        borderRadius: 4,
        backgroundColor: '#D32F2F',
        marginLeft: 8,
    },
    alertMeta: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        gap: 8,
    },
    distancePill: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    distanceText: {
        fontSize: 11,
        fontWeight: '700',
    },
    timeText: {
        fontSize: 11,
        color: '#AAA',
    },
    mapButton: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 8,
    },
    mapButtonText: {
        color: '#FFF',
        fontSize: 12,
        fontWeight: '700',
    },
    center: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 20,
    },
    emptyTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.success,
        marginTop: 10,
    },
    emptyText: {
        fontSize: 13,
        color: '#999',
        marginTop: 4,
    },
});
