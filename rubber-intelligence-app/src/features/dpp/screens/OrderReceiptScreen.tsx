/**
 * OrderReceiptScreen
 *
 * Post-purchase confirmation screen — styled to match the Marketplace
 * green-palette design system.
 */
import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity,
    ActivityIndicator, ScrollView, StatusBar, Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import { getMyTransactions, getInvoiceFileUri } from '../services/marketplaceService';
import { MarketplaceTransaction } from '../types';
import { useStore } from '../../../store';

/* ─── Marketplace Palette ──────────────────────────────────────────── */
const C = {
    primary: '#2E7D32',
    primaryLight: '#4CAF50',
    primaryPale: '#E8F5E9',
    primaryDark: '#1B5E20',
    bg: '#F1F8E9',
    card: '#FFFFFF',
    blue: '#2196F3',
    blueLight: '#E3F2FD',
    orange: '#FF9800',
    orangeLight: '#FFF3E0',
    purple: '#7E57C2',
    purpleLight: '#EDE7F6',
    cyan: '#00ACC1',
    cyanLight: '#E0F7FA',
    text: '#1B5E20',
    textDark: '#1C1C1E',
    sub: '#6B7B6E',
    border: '#C8E6C9',
    borderLight: '#E8F5E9',
};

const statusColor = (s: string) => {
    if (s === 'Completed') return C.primary;
    if (s === 'InvoiceUploaded') return C.blue;
    if (s === 'PendingInvoice') return C.orange;
    return C.sub;
};
const statusBg = (s: string) => {
    if (s === 'Completed') return C.primaryPale;
    if (s === 'InvoiceUploaded') return C.blueLight;
    if (s === 'PendingInvoice') return C.orangeLight;
    return '#F0F0F0';
};
/* ═══════════════════════════════════════════════════════════════════════ */
export default function OrderReceiptScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { transactionId } = route.params;
    const { user } = useStore();

    const [transaction, setTransaction] = useState<MarketplaceTransaction | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => { loadTransaction(); }, []);

    const loadTransaction = async () => {
        try {
            const all = await getMyTransactions();
            const found = all.find((t: MarketplaceTransaction) => t.id === transactionId);
            if (found) setTransaction(found);
        } finally {
            setLoading(false);
        }
    };

    const handleViewInvoice = async () => {
        if (!transaction) return;
        try {
            const { uri, mimeType } = await getInvoiceFileUri(transaction.id);
            if (await Sharing.isAvailableAsync()) {
                await Sharing.shareAsync(uri, {
                    mimeType,
                    dialogTitle: 'View Source Invoice',
                    UTI: mimeType.includes('pdf') ? 'com.adobe.pdf' : 'public.image'
                });
            } else {
                alert('Sharing not available on this device');
            }
        } catch (e) {
            console.error(e);
            alert('Error viewing invoice');
        }
    };

    /* ── Loading / not-found ──────────────────────────────────────── */
    if (loading) {
        return (
            <View style={s.loadingWrap}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={s.loadingText}>Loading order…</Text>
            </View>
        );
    }
    if (!transaction) {
        return (
            <View style={s.loadingWrap}>
                <Ionicons name="alert-circle-outline" size={52} color={C.sub} />
                <Text style={s.loadingText}>Transaction not found</Text>
            </View>
        );
    }

    /* ── Main ─────────────────────────────────────────────────────── */
    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

            {/* ── Gradient Header ─────────────────────────────────── */}
            <LinearGradient
                colors={[C.primaryDark, C.primary, C.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.header}
            >
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>

                <View style={s.successBadge}>
                    <Ionicons name="checkmark" size={38} color={C.primary} />
                </View>
                <Text style={s.headerTitle}>Purchase Confirmed!</Text>
                <Text style={s.headerSub}>Your order has been placed successfully</Text>

                <View style={s.orderChip}>
                    <Ionicons name="receipt-outline" size={13} color={C.primaryLight} />
                    <Text style={s.orderChipText}>
                        Order #{transaction.id.substring(0, 8).toUpperCase()}
                    </Text>
                </View>
            </LinearGradient>

            <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}>

                {/* ── Summary Card ─────────────────────────────────── */}
                <View style={s.card}>
                    <Text style={s.cardTitle}>Order Summary</Text>
                    <View style={s.cardDivider} />

                    {/* Amount */}
                    <View style={s.infoRow}>
                        <View style={[s.infoIcon, { backgroundColor: C.primaryPale }]}>
                            <Ionicons name="cash-outline" size={18} color={C.primary} />
                        </View>
                        <View style={s.infoBody}>
                            <Text style={s.infoLabel}>Amount Paid</Text>
                            <Text style={s.infoValue}>
                                LKR {Number(transaction.offerPrice).toLocaleString()}
                            </Text>
                        </View>
                    </View>

                    {/* Status */}
                    <View style={s.infoRow}>
                        <View style={[s.infoIcon, { backgroundColor: statusBg(transaction.status) }]}>
                            <Ionicons name="pulse-outline" size={18} color={statusColor(transaction.status)} />
                        </View>
                        <View style={s.infoBody}>
                            <Text style={s.infoLabel}>Status</Text>
                            <View style={[s.statusPill, { backgroundColor: statusBg(transaction.status) }]}>
                                <View style={[s.statusDot, { backgroundColor: statusColor(transaction.status) }]} />
                                <Text style={[s.statusPillText, { color: statusColor(transaction.status) }]}>
                                    {transaction.status}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* Buyer */}
                    <View style={[s.infoRow, { borderBottomWidth: 0 }]}>
                        <View style={[s.infoIcon, { backgroundColor: C.blueLight }]}>
                            <Ionicons name="person-outline" size={18} color={C.blue} />
                        </View>
                        <View style={s.infoBody}>
                            <Text style={s.infoLabel}>Buyer ID</Text>
                            <Text style={s.infoValue}>
                                {transaction.buyerId.substring(0, 8).toUpperCase()}
                            </Text>
                        </View>
                    </View>
                </View>

                {/* ── Actions ──────────────────────────────────────── */}
                <Text style={s.sectionTitle}>Digital Assets & Actions</Text>

                {transaction.dppDocumentId && (
                    <ActionCard
                        icon="lock-closed" iconBg={C.purpleLight} iconColor={C.purple} accent={C.purple}
                        title="Secure Digital Passport"
                        subtitle="You now have full owner access to the DPP"
                        label="View Passport"
                        onPress={() => navigation.navigate('DppDetail', { id: transaction.dppDocumentId })}
                    />
                )}

                {transaction.status === 'InvoiceUploaded' && (
                    <ActionCard
                        icon="document-text" iconBg={C.orangeLight} iconColor={C.orange} accent={C.orange}
                        title="Encrypted Invoice"
                        subtitle="Decrypted and shared securely on your device"
                        label="Download"
                        onPress={handleViewInvoice}
                    />
                )}

                {transaction.status === 'InvoiceUploaded' && user?.role === 'buyer' && (
                    <ActionCard
                        icon="analytics" iconBg={C.cyanLight} iconColor={C.cyan} accent={C.cyan}
                        title="Extracted Invoice Data"
                        subtitle="AI-parsed fields — decrypted on demand"
                        label="View Fields"
                        onPress={() =>
                            navigation.navigate('InvoiceExtractedFields', { transactionId: transaction.id })
                        }
                    />
                )}

                <ActionCard
                    icon="chatbubbles" iconBg={C.blueLight} iconColor={C.blue} accent={C.blue}
                    title="Secure Lot Messaging"
                    subtitle="Chat directly with the buyer about this lot"
                    label="Open Chat"
                    onPress={() =>
                        navigation.navigate('LotMessaging', {
                            lotId: transaction.id,
                            receiverId: transaction.buyerId,
                            lotLabel: `Order ${transaction.id.substring(0, 8)}`,
                        })
                    }
                />

                {/* Continue button */}
                <TouchableOpacity style={s.continueBtn} activeOpacity={0.85}
                    onPress={() => navigation.navigate('Marketplace')}>
                    <LinearGradient
                        colors={[C.primary, C.primaryLight]}
                        start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                        style={s.continueBtnGrad}
                    >
                        <Ionicons name="storefront-outline" size={20} color="#fff" />
                        <Text style={s.continueBtnText}>Continue Shopping</Text>
                    </LinearGradient>
                </TouchableOpacity>

                <View style={{ height: 32 }} />
            </ScrollView>
        </View>
    );
}

/* ─── Reusable Action Card ─────────────────────────────────────────── */
interface ActionCardProps {
    icon: any; iconBg: string; iconColor: string; accent: string;
    title: string; subtitle: string; label: string; onPress: () => void;
}
function ActionCard({ icon, iconBg, iconColor, accent, title, subtitle, label, onPress }: ActionCardProps) {
    return (
        <TouchableOpacity style={s.actionCard} activeOpacity={0.78} onPress={onPress}>
            <View style={[s.actionIconWrap, { backgroundColor: iconBg }]}>
                <Ionicons name={icon} size={22} color={iconColor} />
            </View>
            <View style={s.actionBody}>
                <Text style={s.actionTitle}>{title}</Text>
                <Text style={s.actionSub}>{subtitle}</Text>
            </View>
            <View style={[s.actionPill, { backgroundColor: iconBg }]}>
                <Text style={[s.actionPillText, { color: accent }]}>{label}</Text>
                <Ionicons name="chevron-forward" size={13} color={accent} />
            </View>
        </TouchableOpacity>
    );
}

/* ─── Styles ───────────────────────────────────────────────────────── */
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: C.bg },
    loadingText: { marginTop: 12, color: C.sub, fontSize: 15 },

    /* Header */
    header: {
        paddingTop: Platform.OS === 'android' ? 44 : 56,
        paddingBottom: 28,
        paddingHorizontal: 24,
        alignItems: 'center',
        borderBottomLeftRadius: 28,
        borderBottomRightRadius: 28,
    },
    backBtn: {
        position: 'absolute',
        top: Platform.OS === 'android' ? 44 : 56,
        left: 20,
        width: 38, height: 38, borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    successBadge: {
        width: 74, height: 74, borderRadius: 37,
        backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
        shadowColor: '#000', shadowOpacity: 0.15,
        shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
        elevation: 6,
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: '#fff', marginBottom: 6 },
    headerSub: { fontSize: 13, color: 'rgba(255,255,255,0.78)', marginBottom: 16 },
    orderChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingHorizontal: 14, paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.28)',
    },
    orderChipText: { color: '#fff', fontSize: 12, fontWeight: '700', letterSpacing: 0.6 },

    /* Scroll */
    scroll: { flex: 1 },
    scrollContent: { padding: 20, paddingTop: 24 },

    /* Summary card */
    card: {
        backgroundColor: C.card,
        borderRadius: 20, padding: 20, marginBottom: 24,
        shadowColor: C.primary, shadowOpacity: 0.09,
        shadowRadius: 12, shadowOffset: { width: 0, height: 4 },
        elevation: 3,
        borderWidth: 1, borderColor: C.borderLight,
    },
    cardTitle: { fontSize: 15, fontWeight: '700', color: C.textDark, marginBottom: 14 },
    cardDivider: { height: 1, backgroundColor: C.borderLight, marginBottom: 8 },

    infoRow: {
        flexDirection: 'row', alignItems: 'center', gap: 14,
        paddingVertical: 10,
        borderBottomWidth: 1, borderBottomColor: C.borderLight,
    },
    infoIcon: { width: 38, height: 38, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    infoBody: { flex: 1 },
    infoLabel: { fontSize: 11, color: C.sub, fontWeight: '500', marginBottom: 3 },
    infoValue: { fontSize: 15, fontWeight: '700', color: C.textDark },

    statusPill: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 4,
        borderRadius: 10, alignSelf: 'flex-start',
    },
    statusDot: { width: 7, height: 7, borderRadius: 4 },
    statusPillText: { fontSize: 12, fontWeight: '700' },

    /* Section */
    sectionTitle: { fontSize: 16, fontWeight: '800', color: C.textDark, marginBottom: 14 },

    /* Action cards */
    actionCard: {
        backgroundColor: C.card,
        borderRadius: 18, padding: 15,
        flexDirection: 'row', alignItems: 'center', gap: 14,
        marginBottom: 12,
        shadowColor: C.primary, shadowOpacity: 0.07,
        shadowRadius: 8, shadowOffset: { width: 0, height: 3 },
        elevation: 2,
        borderWidth: 1, borderColor: C.borderLight,
    },
    actionIconWrap: { width: 46, height: 46, borderRadius: 14, justifyContent: 'center', alignItems: 'center' },
    actionBody: { flex: 1 },
    actionTitle: { fontSize: 14, fontWeight: '700', color: C.textDark, marginBottom: 3 },
    actionSub: { fontSize: 11, color: C.sub, lineHeight: 15 },
    actionPill: {
        flexDirection: 'row', alignItems: 'center', gap: 2,
        paddingHorizontal: 9, paddingVertical: 6, borderRadius: 10,
    },
    actionPillText: { fontSize: 11, fontWeight: '700' },

    /* Continue */
    continueBtn: { marginTop: 14, borderRadius: 16, overflow: 'hidden' },
    continueBtnGrad: {
        flexDirection: 'row', alignItems: 'center',
        justifyContent: 'center', gap: 10, paddingVertical: 16,
    },
    continueBtnText: { color: '#fff', fontSize: 16, fontWeight: '800', letterSpacing: 0.3 },
});
