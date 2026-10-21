import React, { useState, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, Modal, StatusBar, RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getInterestedExporters, acceptExporter } from '../services/marketplaceService';
import { InterestedExporter } from '../types';

/* ─── Light Green Palette (shared with MarketplaceScreen) ──────────── */
const C = {
    primary: '#2E7D32',
    primaryLight: '#4CAF50',
    primaryPale: '#E8F5E9',
    primaryDark: '#1B5E20',
    bg: '#F1F8E9',
    card: '#FFFFFF',
    green: '#43A047',
    greenLight: '#E8F5E9',
    red: '#E53935',
    redLight: '#FFEBEE',
    textDark: '#1C1C1E',
    sub: '#6B7B6E',
    border: '#C8E6C9',
};

export default function LotBiddersScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { postId, grade, quantityKg } = route.params;

    const [exporters, setExporters] = useState<InterestedExporter[]>([]);
    const [loading, setLoading] = useState(true);
    const [accepting, setAccepting] = useState(false);

    // Confirm-accept modal
    const [confirmModal, setConfirmModal] = useState<{
        visible: boolean;
        exporter: InterestedExporter | null;
    }>({ visible: false, exporter: null });

    // Success modal
    const [successModal, setSuccessModal] = useState<{
        visible: boolean;
        exporterName: string;
        transactionId: string | null;
    }>({ visible: false, exporterName: '', transactionId: null });

    const loadExporters = useCallback(async () => {
        try {
            setLoading(true);
            const data = await getInterestedExporters(postId);
            setExporters(data);
        } catch {
            setExporters([]);
        } finally {
            setLoading(false);
        }
    }, [postId]);

    useFocusEffect(
        useCallback(() => {
            loadExporters();
        }, [loadExporters])
    );

    const handleAccept = (exporter: InterestedExporter) => {
        setConfirmModal({ visible: true, exporter });
    };

    const confirmAcceptExporter = async () => {
        const exp = confirmModal.exporter;
        if (!exp) return;
        setConfirmModal({ visible: false, exporter: null });
        setAccepting(true);
        try {
            const tx = await acceptExporter(postId, { exporterId: exp.exporterId });
            setSuccessModal({ visible: true, exporterName: exp.exporterName, transactionId: tx.id });
            loadExporters();
        } catch {
            // Reload to show true state
            loadExporters();
        } finally {
            setAccepting(false);
        }
    };

    const handleSuccessDone = () => {
        const txId = successModal.transactionId;
        setSuccessModal({ visible: false, exporterName: '', transactionId: null });
        if (txId) {
            navigation.navigate('OrderReceipt', { transactionId: txId });
        } else {
            navigation.goBack();
        }
    };

    /* ─── Render each exporter row ─────────────────────────────────── */
    const renderExporter = ({ item, index }: { item: InterestedExporter; index: number }) => {
        const isAccepted = item.status === 'ACCEPTED';
        const isRejected = item.status === 'REJECTED';

        return (
            <View style={s.bidderCard}>
                {/* Rank */}
                <View style={s.rankCol}>
                    <View style={s.rankCircle}>
                        <Text style={s.rankNum}>#{index + 1}</Text>
                    </View>
                </View>

                {/* Main content */}
                <View style={s.bidderContent}>
                    {/* Name + Verified badge */}
                    <View style={s.nameRow}>
                        <Text style={s.bidderName} numberOfLines={1}>
                            {item.exporterName}
                        </Text>
                        {item.isVerified && (
                            <View style={s.verifiedBadge}>
                                <Ionicons name="shield-checkmark" size={12} color={C.green} />
                                <Text style={s.verifiedText}>Verified</Text>
                            </View>
                        )}
                    </View>

                    {/* Stats row */}
                    <View style={s.statsRow}>
                        {item.country && (
                            <View style={s.statChip}>
                                <Ionicons name="globe-outline" size={12} color={C.sub} />
                                <Text style={s.statText}>{item.country}</Text>
                            </View>
                        )}
                    </View>

                    {/* Requested date */}
                    <Text style={s.requestedAt}>
                        Requested {new Date(item.requestedAt).toLocaleDateString()}
                    </Text>
                </View>

                {/* Action / Status column */}
                <View style={s.actionCol}>
                    {isAccepted ? (
                        <View style={[s.statusBadge, { backgroundColor: C.greenLight }]}>
                            <Ionicons name="checkmark-circle" size={14} color={C.green} />
                            <Text style={[s.statusText, { color: C.green }]}>Accepted</Text>
                        </View>
                    ) : isRejected ? (
                        <View style={[s.statusBadge, { backgroundColor: C.redLight }]}>
                            <Ionicons name="close-circle" size={14} color={C.red} />
                            <Text style={[s.statusText, { color: C.red }]}>Rejected</Text>
                        </View>
                    ) : (
                        <TouchableOpacity
                            style={s.acceptBtn}
                            onPress={() => handleAccept(item)}
                            disabled={accepting}
                        >
                            <Text style={s.acceptBtnText}>Accept</Text>
                        </TouchableOpacity>
                    )}
                </View>
            </View>
        );
    };

    /* ─── Main Render ──────────────────────────────────────────────── */
    return (
        <View style={s.container}>
            <StatusBar barStyle="light-content" />

            {/* Header */}
            <LinearGradient colors={[C.primary, C.primaryLight]} style={s.header}>
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color="#FFF" />
                </TouchableOpacity>
                <View style={s.headerCenter}>
                    <Text style={s.headerTitle}>Interested Exporters</Text>
                    <Text style={s.headerSub}>
                        {grade} · {quantityKg}kg
                    </Text>
                </View>
                <View style={s.headerRight}>
                    <View style={s.countBadge}>
                        <Text style={s.countText}>{exporters.length}</Text>
                    </View>
                </View>
            </LinearGradient>



            {/* List */}
            {loading ? (
                <View style={s.loadingWrap}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <Text style={s.loadingText}>Loading leaderboard…</Text>
                </View>
            ) : (
                <FlatList
                    data={exporters}
                    renderItem={renderExporter}
                    keyExtractor={(item) => item.interestId}
                    contentContainerStyle={s.listContent}
                    refreshControl={
                        <RefreshControl refreshing={loading} onRefresh={loadExporters} tintColor={C.primary} />
                    }
                    ListEmptyComponent={
                        <View style={s.emptyWrap}>
                            <Ionicons name="people-outline" size={48} color={C.sub} />
                            <Text style={s.emptyTitle}>No Interested Exporters</Text>
                            <Text style={s.emptySub}>
                                No exporters have expressed interest in this lot yet.
                            </Text>
                        </View>
                    }
                />
            )}

            {/* ═══ Confirm Accept Modal ════════════════════════════════ */}
            <Modal visible={confirmModal.visible} transparent animationType="slide">
                <View style={s.modalBackdrop}>
                    <View style={s.confirmCard}>
                        <View style={s.confirmIconWrap}>
                            <Ionicons name="person-add" size={32} color={C.primary} />
                        </View>
                        <Text style={s.confirmTitle}>Accept Exporter?</Text>
                        <Text style={s.confirmSub}>
                            Accept{' '}
                            <Text style={{ fontWeight: '700', color: C.textDark }}>
                                {confirmModal.exporter?.exporterName}
                            </Text>{' '}
                            for this lot?
                            {'\n\n'}All other interested exporters will be automatically rejected.
                        </Text>
                        <View style={s.confirmActions}>
                            <TouchableOpacity
                                style={s.cancelBtn}
                                onPress={() => setConfirmModal({ visible: false, exporter: null })}
                            >
                                <Text style={s.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity style={s.confirmBtn} onPress={confirmAcceptExporter}>
                                <Text style={s.confirmBtnText}>Accept Sale</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ═══ Success Modal ════════════════════════════════════════ */}
            <Modal visible={successModal.visible} transparent animationType="fade">
                <View style={s.modalBackdrop}>
                    <View style={s.successCard}>
                        <View style={s.successIconWrap}>
                            <Ionicons name="checkmark-circle" size={48} color={C.green} />
                        </View>
                        <Text style={s.successTitle}>Sale Accepted!</Text>
                        <Text style={s.successSub}>
                            <Text style={{ fontWeight: '700', color: C.textDark }}>
                                {successModal.exporterName}
                            </Text>{' '}
                            has been notified and a transaction has been created.
                        </Text>
                        <TouchableOpacity style={s.successBtn} onPress={handleSuccessDone}>
                            <Text style={s.successBtnText}>View Transaction</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {accepting && (
                <View style={s.overlay}>
                    <ActivityIndicator size="large" color="#FFF" />
                </View>
            )}
        </View>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },

    /* Header */
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 54,
        paddingBottom: 16,
        paddingHorizontal: 20,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.2)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerCenter: { flex: 1, marginLeft: 14 },
    headerTitle: { fontSize: 20, fontWeight: '800', color: '#FFF' },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.8)', marginTop: 2 },
    headerRight: { marginLeft: 12 },
    countBadge: {
        backgroundColor: 'rgba(255,255,255,0.25)',
        paddingHorizontal: 12,
        paddingVertical: 4,
        borderRadius: 14,
    },
    countText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

    /* List */
    listContent: { paddingHorizontal: 16, paddingTop: 12, paddingBottom: 30 },

    /* Bidder Card */
    bidderCard: {
        flexDirection: 'row',
        backgroundColor: C.card,
        borderRadius: 16,
        padding: 14,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: C.border,
    },

    /* Rank */
    rankCol: { width: 44, alignItems: 'center', justifyContent: 'flex-start', paddingTop: 2 },
    rankCircle: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: C.primaryPale,
        alignItems: 'center',
        justifyContent: 'center',
    },
    rankNum: { fontSize: 12, fontWeight: '700', color: C.primary },

    /* Content */
    bidderContent: { flex: 1, marginLeft: 4 },
    nameRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
    bidderName: { fontSize: 15, fontWeight: '700', color: C.textDark, flexShrink: 1 },
    verifiedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: C.greenLight,
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 8,
    },
    verifiedText: { fontSize: 10, fontWeight: '600', color: C.green },



    /* Stats */
    statsRow: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', marginBottom: 4 },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 3,
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 6,
        paddingVertical: 2,
        borderRadius: 6,
    },
    statText: { fontSize: 11, color: C.sub },
    requestedAt: { fontSize: 10, color: C.sub, marginTop: 2 },

    /* Action column */
    actionCol: { marginLeft: 8, justifyContent: 'center' },
    acceptBtn: {
        backgroundColor: C.primary,
        paddingHorizontal: 16,
        paddingVertical: 10,
        borderRadius: 12,
    },
    acceptBtnText: { color: '#FFF', fontSize: 13, fontWeight: '700' },
    statusBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        paddingHorizontal: 10,
        paddingVertical: 6,
        borderRadius: 10,
    },
    statusText: { fontSize: 11, fontWeight: '600' },

    /* Loading / Empty */
    loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    loadingText: { marginTop: 10, color: C.sub, fontSize: 14 },
    emptyWrap: { alignItems: 'center', paddingTop: 80 },
    emptyTitle: { fontSize: 17, fontWeight: '700', color: C.textDark, marginTop: 12 },
    emptySub: { fontSize: 13, color: C.sub, marginTop: 4, textAlign: 'center', paddingHorizontal: 40 },

    /* Modal shared */
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },

    /* Confirm modal */
    confirmCard: {
        backgroundColor: C.card,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 28,
        alignItems: 'center',
    },
    confirmIconWrap: {
        width: 64,
        height: 64,
        borderRadius: 32,
        backgroundColor: C.primaryPale,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    confirmTitle: { fontSize: 20, fontWeight: '800', color: C.textDark, marginBottom: 8 },
    confirmSub: { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 20 },
    confirmActions: {
        flexDirection: 'row',
        marginTop: 24,
        gap: 12,
        width: '100%',
    },
    cancelBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: '#F5F5F5',
        alignItems: 'center',
    },
    cancelBtnText: { fontSize: 15, fontWeight: '600', color: C.sub },
    confirmBtn: {
        flex: 1,
        paddingVertical: 14,
        borderRadius: 14,
        backgroundColor: C.primary,
        alignItems: 'center',
    },
    confirmBtnText: { fontSize: 15, fontWeight: '700', color: '#FFF' },

    /* Success modal */
    successCard: {
        backgroundColor: C.card,
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 28,
        alignItems: 'center',
    },
    successIconWrap: {
        width: 72,
        height: 72,
        borderRadius: 36,
        backgroundColor: C.greenLight,
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    successTitle: { fontSize: 22, fontWeight: '800', color: C.textDark, marginBottom: 8 },
    successSub: { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 20 },
    successBtn: {
        marginTop: 24,
        width: '100%',
        paddingVertical: 16,
        borderRadius: 14,
        backgroundColor: C.primary,
        alignItems: 'center',
    },
    successBtnText: { fontSize: 16, fontWeight: '700', color: '#FFF' },

    /* Overlay */
    overlay: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: 'rgba(0,0,0,0.35)',
        alignItems: 'center',
        justifyContent: 'center',
    },
});
