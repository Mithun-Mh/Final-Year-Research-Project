import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Modal, ActivityIndicator, Alert, RefreshControl, StatusBar, Platform, Animated
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import QRCode from 'react-native-qrcode-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import * as DocumentPicker from 'expo-document-picker';
import { getBuyerDocuments, getPendingAccessRequests } from '../services/dppService';
import { getMyTransactions, uploadInvoice, uploadQir } from '../services/marketplaceService';
import { getUnreadMessageCount } from '../services/messagesService';
import { DppDocument, MarketplaceTransaction, SellingPost } from '../types';
import { useStore } from '../../../store';

/* ─── Colors ─────────────────────────────────────────────────────── */
const C = {
    primary: '#2E7D32',
    primaryLight: '#4CAF50',
    primaryPale: '#E8F5E9',
    primaryDark: '#1B5E20',
    bg: '#F4F6F3',
    card: '#FFFFFF',
    accent: '#5856D6',
    accentLight: '#EDEDFC',
    blue: '#007AFF',
    green: '#34C759',
    orange: '#FF9500',
    red: '#FF3B30',
    text: '#1C1C1E',
    sub: '#8E8E93',
    border: '#E8EDE8',
};

/* ─── Reusable Section Card ─────────────────────────────────────────── */
function SectionCard({ children, style }: { children: React.ReactNode; style?: object }) {
    return <View style={[s.sectionCard, style]}>{children}</View>;
}

/* ─── Stat Indicator Card ───────────────────────────────────────────── */
function StatCard({
    icon, label, value, color, bgColor, onPress,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string; value: number; color: string; bgColor: string;
    onPress?: () => void;
}) {
    const content = (
        <View style={s.statCard}>
            <View style={[s.statIconWrap, { backgroundColor: bgColor }]}>
                <Ionicons name={icon} size={18} color={color} />
            </View>
            <Text style={s.statValue}>{value}</Text>
            <Text style={s.statLabel}>{label}</Text>
        </View>
    );
    if (onPress) {
        return <TouchableOpacity activeOpacity={0.7} onPress={onPress}>{content}</TouchableOpacity>;
    }
    return content;
}

/* ─── Workflow Step Row ─────────────────────────────────────────────── */
function StepRow({
    step, label, sublabel, icon, iconBg, onPress, trailing,
}: {
    step?: string; label: string; sublabel: string;
    icon: keyof typeof Ionicons.glyphMap; iconBg: string;
    onPress?: () => void; trailing?: React.ReactNode;
}) {
    const inner = (
        <View style={s.stepRow}>
            <View style={[s.stepIcon, { backgroundColor: iconBg }]}>
                <Ionicons name={icon} size={20} color="#FFF" />
            </View>
            <View style={s.stepContent}>
                <Text style={s.stepLabel}>{label}</Text>
                <Text style={s.stepSub}>{sublabel}</Text>
            </View>
            {trailing ?? <Ionicons name="chevron-forward" size={18} color={C.sub} />}
        </View>
    );
    return onPress ? <TouchableOpacity onPress={onPress} activeOpacity={0.65}>{inner}</TouchableOpacity> : inner;
}

/* ─── Divider ───────────────────────────────────────────────────────── */
const Divider = () => <View style={s.divider} />;

/* ═══════════════════════════════════════════════════════════════════════
   BuyerDashboardScreen
   ═══════════════════════════════════════════════════════════════════════ */
export default function BuyerDashboardScreen() {
    const navigation = useNavigation<any>();
    const { user } = useStore();
    const scrollRef = useRef<ScrollView>(null);
    const docSectionY = useRef(0);
    const [selectedQr, setSelectedQr] = useState<string | null>(null);
    const [documents, setDocuments] = useState<DppDocument[]>([]);
    const [transactions, setTransactions] = useState<MarketplaceTransaction[]>([]);
    const [docsLoading, setDocsLoading] = useState(false);
    const [otherLoading, setOtherLoading] = useState(false);
    const [pendingCount, setPendingCount] = useState(0);
    const [msgCount, setMsgCount] = useState(0);
    const [showAllSales, setShowAllSales] = useState(false);
    const [showAllDocs, setShowAllDocs] = useState(false);
    const [purchaseNotifs, setPurchaseNotifs] = useState<MarketplaceTransaction[]>([]);
    const notifAnim = useRef(new Animated.Value(0)).current;

    /* ── Show / dismiss purchase notification ── */
    const showNextNotif = useCallback((queue: MarketplaceTransaction[]) => {
        if (queue.length === 0) return;
        setPurchaseNotifs(queue);
        notifAnim.setValue(0);
        Animated.spring(notifAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
    }, [notifAnim]);

    const dismissNotif = useCallback(() => {
        Animated.timing(notifAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
            setPurchaseNotifs([])
        );
    }, [notifAnim]);

    /* ── Show / dismiss exporter interest notification ── */
    const [interestNotifs, setInterestNotifs] = useState<SellingPost[]>([]);
    const interestNotifAnim = useRef(new Animated.Value(0)).current;

    const showInterestNotif = useCallback((posts: SellingPost[]) => {
        if (posts.length === 0) return;
        setInterestNotifs(posts);
        interestNotifAnim.setValue(0);
        Animated.spring(interestNotifAnim, { toValue: 1, useNativeDriver: true, tension: 60, friction: 8 }).start();
    }, [interestNotifAnim]);

    const dismissInterestNotif = useCallback(() => {
        Animated.timing(interestNotifAnim, { toValue: 0, duration: 200, useNativeDriver: true }).start(() =>
            setInterestNotifs([])
        );
    }, [interestNotifAnim]);

    /* ── Derived stats ──────────────────── */
    const stats = useMemo(() => {
        const completedCount = transactions.filter(t => t.status === 'Completed').length;
        const pendingInvoice = transactions.filter(t => t.status === 'PendingInvoice').length;
        const uniqueExporters = new Set(transactions.map(t => t.exporterId)).size;
        return { completedCount, pendingInvoice, uniqueExporters };
    }, [transactions]);

    /* ── Timeout wrapper for slow API calls ── */
    const withTimeout = <T,>(promise: Promise<T>, ms: number, label: string): Promise<T> =>
        Promise.race([
            promise,
            new Promise<never>((_, reject) =>
                setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
            ),
        ]);

    const API_TIMEOUT = 15000; // 15 seconds

    /* ── Data fetch (decoupled: documents load independently) ── */
    const loadData = useCallback(async () => {
        const loadStart = Date.now();

        // ──────────────────────────────────────────────
        // 1. Load documents FIRST — renders immediately
        // ──────────────────────────────────────────────
        setDocsLoading(true);
        const docsPromise = (async () => {
            try {
                console.time('[BuyerDashboard] getBuyerDocuments');
                const docs = await withTimeout(getBuyerDocuments(), API_TIMEOUT, 'getBuyerDocuments');
                console.timeEnd('[BuyerDashboard] getBuyerDocuments');
                setDocuments(docs);
            } catch (err: any) {
                console.warn('[BuyerDashboard] getBuyerDocuments failed:', err?.message);
                // Keep existing documents on failure so UI doesn't flash empty
            } finally {
                setDocsLoading(false);
            }
        })();

        // ──────────────────────────────────────────────
        // 2. Load other data in parallel (does NOT block documents)
        // ──────────────────────────────────────────────
        setOtherLoading(true);
        const otherPromise = (async () => {
            let trans: MarketplaceTransaction[] = [];
            let pending: any[] = [];

            // Transactions
            try {
                console.time('[BuyerDashboard] getMyTransactions');
                trans = await withTimeout(getMyTransactions(), API_TIMEOUT, 'getMyTransactions');
                console.timeEnd('[BuyerDashboard] getMyTransactions');
                setTransactions(trans);
            } catch (err: any) {
                console.warn('[BuyerDashboard] getMyTransactions failed:', err?.message);
            }

            // Pending access requests
            try {
                console.time('[BuyerDashboard] getPendingAccessRequests');
                pending = await withTimeout(getPendingAccessRequests(), API_TIMEOUT, 'getPendingAccessRequests');
                console.timeEnd('[BuyerDashboard] getPendingAccessRequests');
                setPendingCount(pending.length);
            } catch (err: any) {
                console.warn('[BuyerDashboard] getPendingAccessRequests failed:', err?.message);
            }

            // Unread messages
            try {
                console.time('[BuyerDashboard] getUnreadMessageCount');
                const unread = await withTimeout(getUnreadMessageCount(), API_TIMEOUT, 'getUnreadMessageCount');
                console.timeEnd('[BuyerDashboard] getUnreadMessageCount');
                setMsgCount(unread);
            } catch (err: any) {
                console.warn('[BuyerDashboard] getUnreadMessageCount failed:', err?.message);
            }

            /* ── Detect new purchase requests (PendingInvoice transactions) ── */
            if (trans.length > 0) {
                try {
                    const NOTIF_KEY = 'buyer_notified_purchase_ids';
                    const raw = await AsyncStorage.getItem(NOTIF_KEY);
                    const notifiedIds: string[] = raw ? JSON.parse(raw) : [];
                    const newPurchases = trans.filter(
                        (t: MarketplaceTransaction) =>
                            t.status === 'PendingInvoice' && !notifiedIds.includes(t.id)
                    );
                    if (newPurchases.length > 0) {
                        const updatedIds = [...notifiedIds, ...newPurchases.map((t: MarketplaceTransaction) => t.id)];
                        await AsyncStorage.setItem(NOTIF_KEY, JSON.stringify(updatedIds));
                        showNextNotif(newPurchases);
                    }
                } catch (err: any) {
                    console.warn('[BuyerDashboard] Purchase notification check failed:', err?.message);
                }
            }

            /* ── Detect new exporter interest requests (REQUESTED lots) ── */
            if (pending.length > 0) {
                try {
                    const POSTS_NOTIF_KEY = 'buyer_notified_requested_post_ids';
                    const rawPosts = await AsyncStorage.getItem(POSTS_NOTIF_KEY);
                    const notifiedPostIds: string[] = rawPosts ? JSON.parse(rawPosts) : [];
                    const newRequestedPosts = (pending as SellingPost[]).filter(p => !notifiedPostIds.includes(p.id));
                    if (newRequestedPosts.length > 0) {
                        const updatedPostIds = [...notifiedPostIds, ...newRequestedPosts.map(p => p.id)];
                        await AsyncStorage.setItem(POSTS_NOTIF_KEY, JSON.stringify(updatedPostIds));
                        showInterestNotif(newRequestedPosts);
                    }
                } catch (err: any) {
                    console.warn('[BuyerDashboard] Interest notification check failed:', err?.message);
                }
            }

            setOtherLoading(false);
        })();

        // Wait for both streams to finish (for pull-to-refresh indicator)
        await Promise.all([docsPromise, otherPromise]);
        console.log(`[BuyerDashboard] Full load completed in ${Date.now() - loadStart}ms`);
    }, [showNextNotif, showInterestNotif]);

    /* ── Derived refreshing state for pull-to-refresh ── */
    const refreshing = docsLoading || otherLoading;

    const lastFetchRef = useRef(0);
    const CACHE_TTL = 30000;
    useFocusEffect(
        useCallback(() => {
            if (Date.now() - lastFetchRef.current > CACHE_TTL) {
                lastFetchRef.current = Date.now();
                loadData();
            }
        }, [loadData])
    );

    /* ── Invoice upload ─────────────────── */
    const handleUploadInvoice = async (transactionId: string) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
            if (result.canceled) return;
            const file = result.assets[0];
            setOtherLoading(true);
            const response = await uploadInvoice(transactionId, { uri: file.uri, name: file.name, mimeType: file.mimeType });
            loadData();
            // Navigate to ClassificationResultScreen with isInvoice=true to show invoice-specific UI
            navigation.navigate('ClassificationResult', { result: response, isInvoice: true });
        } catch (error: any) {
            const msg =
                error?.response?.data?.error ||
                error?.response?.data?.message ||
                (error?.response?.status === 429 ? 'Gemini API quota exceeded. Please try again later.' : null) ||
                (error?.response?.status === 403 ? 'Access denied. This transaction does not belong to your account.' : null) ||
                (error?.response?.status === 404 ? 'Transaction not found.' : null) ||
                (error?.code === 'ECONNABORTED' ? 'Request timed out. The server is processing — please retry in a moment.' : null) ||
                (!error?.response ? 'Network error — check your connection and ensure the server is running.' : null) ||
                error?.message ||
                'Failed to upload invoice.';
            Alert.alert('Invoice Upload Failed', msg);
        } finally {
            setOtherLoading(false);
        }
    };
    /* ── QIR upload ─────────────────────── */
    const handleUploadQir = async (transactionId: string) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
            if (result.canceled) return;
            const file = result.assets[0];
            setOtherLoading(true);
            const response = await uploadQir(transactionId, { uri: file.uri, name: file.name, mimeType: file.mimeType });
            loadData();
            // Reuse ClassificationResultScreen — pass isInvoice:false so header shows "Quality Inspection Report"
            navigation.navigate('ClassificationResult', { result: response, isInvoice: false, isQir: true });
        } catch (error: any) {
            const status = error?.response?.status;
            const apiMsg = error?.response?.data?.error as string | undefined;
            const msg =
                apiMsg ||
                (status === 503 ? 'Gemini AI is temporarily unavailable due to high demand. Please try again in a few minutes.' :
                    status === 429 ? 'Gemini AI is rate-limited. Please wait a moment and try again.' :
                        status === 500 ? 'Server error during OCR processing. Please try again.' :
                            !error?.response ? 'Network error — check your connection and ensure the server is running.' :
                                error?.message ||
                                'Failed to upload Quality Inspection Report.');
            Alert.alert('QIR Upload Failed', msg);
        } finally {
            setOtherLoading(false);
        }
    };
    /* ── Helpers ─────────────────────────── */
    const statusColor = (status: string) =>
        status === 'Completed' ? C.green
            : status === 'QirUploaded' ? C.accent
                : status === 'InvoiceUploaded' ? C.blue
                    : C.orange;

    const statusLabel = (status: string) =>
        status === 'Completed' ? 'Payment Completed'
            : status === 'QirUploaded' ? 'QIR Uploaded'
                : status === 'PendingInvoice' ? 'Pending Invoice'
                    : 'Invoice Uploaded';

    const getInitials = (name?: string) => {
        if (!name) return 'B';
        const parts = name.trim().split(' ');
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0][0].toUpperCase();
    };

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    /* ════════════════════════════════════════════════════════════════════ */
    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

            {/* ── Header ───────────────────────────────────── */}
            <LinearGradient
                colors={[C.primaryDark, C.primary, '#43A047']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.header}
            >
                {/* Decorative circles for depth */}
                <View style={s.headerCircle1} />
                <View style={s.headerCircle2} />

                <View style={s.headerTop}>
                    {/* ── Left: Avatar + Greeting ── */}
                    <TouchableOpacity
                        style={s.profileSection}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('Profile')}
                    >
                        <View style={s.avatarWrap}>
                            <LinearGradient
                                colors={['#A5D6A7', '#ffffff30']}
                                style={s.avatarRing}
                            >
                                <View style={s.avatar}>
                                    <Text style={s.avatarText}>{getInitials(user?.name)}</Text>
                                </View>
                            </LinearGradient>
                            <View style={s.onlineDot} />
                        </View>

                        <View style={s.profileInfo}>
                            <Text style={s.profileGreeting}>{getGreeting()} 👋</Text>
                            <Text style={s.profileName} numberOfLines={1}>
                                {user?.name || 'Buyer'}
                            </Text>
                            <View style={s.roleBadge}>
                                <Ionicons name="shield-checkmark" size={11} color={C.primaryLight} />
                                <Text style={s.roleText}>
                                    {user?.role
                                        ? user.role.charAt(0).toUpperCase() + user.role.slice(1)
                                        : 'Buyer'}
                                </Text>
                            </View>
                        </View>
                    </TouchableOpacity>

                    {/* ── Right: Notification Bell ── */}
                    <TouchableOpacity
                        style={s.notifBtn}
                        activeOpacity={0.8}
                        onPress={() => navigation.navigate('PendingRequests')}
                    >
                        <View style={s.notifInner}>
                            <Ionicons
                                name={(pendingCount + msgCount) > 0 ? 'notifications' : 'notifications-outline'}
                                size={24}
                                color="#fff"
                            />
                            {(pendingCount + msgCount) > 0 && (
                                <View style={s.notifBadge}>
                                    <Text style={s.notifBadgeText}>
                                        {(pendingCount + msgCount) > 9 ? '9+' : (pendingCount + msgCount)}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                </View>

                {/* ── Bottom summary strip ── */}
                <View style={s.headerFooter}>
                    <View style={s.headerStat}>
                        <Text style={s.headerStatVal}>{documents.length}</Text>
                        <Text style={s.headerStatLabel}>Documents</Text>
                    </View>
                    <View style={s.headerStatDivider} />
                    <View style={s.headerStat}>
                        <Text style={s.headerStatVal}>{transactions.length}</Text>
                        <Text style={s.headerStatLabel}>Transactions</Text>
                    </View>
                    <View style={s.headerStatDivider} />
                    <View style={s.headerStat}>
                        <Text style={s.headerStatVal}>{stats.completedCount}</Text>
                        <Text style={s.headerStatLabel}>Completed</Text>
                    </View>
                </View>
            </LinearGradient>

            <ScrollView
                ref={scrollRef}
                style={s.scroll}
                contentContainerStyle={s.scrollContent}
                showsVerticalScrollIndicator={false}
                refreshControl={<RefreshControl refreshing={refreshing} onRefresh={loadData} tintColor={C.primary} />}
            >
                {/* ═══ Stat Indicators ══════════════════════════ */}
                <View style={s.statsRow}>
                    <StatCard
                        icon="document-text"
                        label="Documents"
                        value={documents.length}
                        color={C.primary}
                        bgColor={C.primaryPale}
                        onPress={() => scrollRef.current?.scrollTo({ y: docSectionY.current, animated: true })}
                    />
                    <StatCard
                        icon="people"
                        label="Exporters"
                        value={stats.uniqueExporters}
                        color={C.blue}
                        bgColor="#E3F2FD"
                    />
                    <StatCard
                        icon="checkmark-circle"
                        label="Completed"
                        value={stats.completedCount}
                        color={C.green}
                        bgColor="#E8F5E9"
                    />
                    <StatCard
                        icon="time"
                        label="Pending"
                        value={stats.pendingInvoice}
                        color={C.orange}
                        bgColor="#FFF3E0"
                    />
                </View>

                {/* ═══ Quick Actions ═══════════════════════════ */}
                <Text style={s.sectionTitle}>Quick Actions</Text>
                <View style={s.quickRow}>
                    <TouchableOpacity
                        style={s.quickCard}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('CreateSellingPost')}
                    >
                        <View style={[s.quickIcon, { backgroundColor: C.primary }]}>
                            <Ionicons name="pricetag" size={22} color="#FFF" />
                        </View>
                        <Text style={s.quickLabel}>Create{'\n'}Rubber Lot</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={s.quickCard}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('DocumentUpload')}
                    >
                        <View style={[s.quickIcon, { backgroundColor: C.primaryLight }]}>
                            <Ionicons name="cloud-upload" size={22} color="#FFF" />
                        </View>
                        <Text style={s.quickLabel}>Upload{'\n'}Document</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={s.quickCard}
                        activeOpacity={0.7}
                        onPress={() => navigation.navigate('PendingRequests')}
                    >
                        <View style={[s.quickIcon, { backgroundColor: '#66BB6A' }]}>
                            <Ionicons name="shield-checkmark" size={22} color="#FFF" />
                        </View>
                        <Text style={s.quickLabel}>Access{'\n'}Requests</Text>
                    </TouchableOpacity>
                </View>

                {/* ═══ Recent Sales / Transactions ═════════════ */}
                {transactions.length > 0 && (
                    <>
                        <View style={s.sectionTitleRow}>
                            <Text style={s.sectionTitle}>Recent Sales</Text>
                            <View style={s.countBadge}>
                                <Text style={s.countBadgeText}>{transactions.length}</Text>
                            </View>
                        </View>

                        {(showAllSales ? transactions : transactions.slice(0, 2)).map(t => (
                            <SectionCard key={t.id} style={{ marginBottom: 12 }}>
                                <TouchableOpacity
                                    style={s.txHeader}
                                    activeOpacity={0.7}
                                    onPress={() => navigation.navigate('OrderReceipt', { transactionId: t.id })}
                                >
                                    <View style={s.txLeft}>
                                        <Text style={s.txPrice}>LKR {t.offerPrice.toLocaleString()}</Text>
                                        <Text style={s.txExporter}>{t.exporterName || 'Exporter'}</Text>
                                    </View>
                                    <View style={[s.txBadge, { backgroundColor: statusColor(t.status) + '18' }]}>
                                        <View style={[s.txDot, { backgroundColor: statusColor(t.status) }]} />
                                        <Text style={[s.txBadgeText, { color: statusColor(t.status) }]}>
                                            {statusLabel(t.status)}
                                        </Text>
                                    </View>
                                </TouchableOpacity>

                                <Divider />

                                <View style={s.txActions}>
                                    {t.status === 'PendingInvoice' && (
                                        <TouchableOpacity
                                            style={[s.txBtn, { backgroundColor: C.orange }]}
                                            onPress={() => handleUploadInvoice(t.id)}
                                        >
                                            <Ionicons name="cloud-upload" size={14} color="#FFF" />
                                            <Text style={s.txBtnText}>Upload Invoice</Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* Step 2 — upload QIR after invoice */}
                                    {t.status === 'InvoiceUploaded' && (
                                        <TouchableOpacity
                                            style={[s.txBtn, { backgroundColor: C.primary }]}
                                            onPress={() => handleUploadQir(t.id)}
                                        >
                                            <Ionicons name="clipboard" size={14} color="#FFF" />
                                            <Text style={s.txBtnText}>Upload QIR</Text>
                                        </TouchableOpacity>
                                    )}

                                    {/* View QIR extracted fields once uploaded */}
                                    {(t.status === 'QirUploaded' || t.status === 'Completed') && t.qirFields && (
                                        <TouchableOpacity
                                            style={[s.txBtn, { backgroundColor: C.accent }]}
                                            onPress={() => navigation.navigate('QirExtractedFields', { transactionId: t.id })}
                                        >
                                            <Ionicons name="analytics" size={14} color="#FFF" />
                                            <Text style={s.txBtnText}>View QIR</Text>
                                        </TouchableOpacity>
                                    )}

                                    {!t.dppDocumentId && (
                                        <TouchableOpacity
                                            style={[s.txBtn, { backgroundColor: C.primary }]}
                                            onPress={() => navigation.navigate('DocumentUpload', { transactionId: t.id })}
                                        >
                                            <Ionicons name="document-attach" size={14} color="#FFF" />
                                            <Text style={s.txBtnText}>Link DPP</Text>
                                        </TouchableOpacity>
                                    )}

                                    <TouchableOpacity
                                        style={[s.txBtn, { backgroundColor: '#FF375F' }]}
                                        onPress={() => navigation.navigate('LotMessaging', {
                                            lotId: t.id,
                                            receiverId: t.exporterId,
                                            lotLabel: `Order ${t.id.substring(0, 8)} · ${t.exporterName}`
                                        })}
                                    >
                                        <Ionicons name="chatbubbles" size={14} color="#FFF" />
                                        <Text style={s.txBtnText}>Message</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[s.txBtn, { backgroundColor: C.sub }]}
                                        onPress={() => navigation.navigate('OrderReceipt', { transactionId: t.id })}
                                    >
                                        <Ionicons name="receipt-outline" size={14} color="#FFF" />
                                        <Text style={s.txBtnText}>Receipt</Text>
                                    </TouchableOpacity>

                                    {/* ── DOWNLOAD DPP QR SCAN TAG ── */}
                                    <TouchableOpacity
                                        style={[s.txBtn, { backgroundColor: '#1C1C1E' }]}
                                        onPress={() => navigation.navigate('DppPassport', { dppId: t.id })}
                                    >
                                        <Ionicons name="download-outline" size={14} color="#FFF" />
                                        <Text style={s.txBtnText}>Download QR</Text>
                                    </TouchableOpacity>
                                </View>
                            </SectionCard>
                        ))}

                        {transactions.length > 2 && (
                            <TouchableOpacity style={s.seeMoreBtn} onPress={() => setShowAllSales(!showAllSales)}>
                                <Text style={s.seeMoreText}>{showAllSales ? 'Show Less' : `See More (${transactions.length - 2})`}</Text>
                                <Ionicons name={showAllSales ? 'chevron-up' : 'chevron-down'} size={16} color={C.primary} />
                            </TouchableOpacity>
                        )}
                    </>
                )}

                {/* ═══ My Documents ════════════════════════════ */}
                <View style={s.sectionTitleRow} onLayout={(e) => { docSectionY.current = e.nativeEvent.layout.y; }}>
                    <Text style={s.sectionTitle}>My Documents</Text>
                    {documents.length > 0 && (
                        <View style={s.countBadge}>
                            <Text style={s.countBadgeText}>{documents.length}</Text>
                        </View>
                    )}
                </View>

                {docsLoading && documents.length === 0 ? (
                    <View style={s.emptyWrap}>
                        <ActivityIndicator size="large" color={C.primary} />
                    </View>
                ) : documents.length === 0 ? (
                    <SectionCard>
                        <View style={s.emptyWrap}>
                            <Ionicons name="document-outline" size={40} color={C.sub} />
                            <Text style={s.emptyTitle}>No documents yet</Text>
                            <Text style={s.emptySub}>Upload a rubber lot document to begin the DPP pipeline.</Text>
                            <TouchableOpacity
                                style={s.emptyBtn}
                                onPress={() => navigation.navigate('DocumentUpload')}
                            >
                                <Ionicons name="add" size={18} color="#FFF" />
                                <Text style={s.emptyBtnText}>Upload Document</Text>
                            </TouchableOpacity>
                        </View>
                    </SectionCard>
                ) : (
                    <>
                        {(showAllDocs ? documents : documents.slice(0, 2)).map(doc => (
                            <SectionCard key={doc.id} style={{ marginBottom: 10 }}>
                                <View style={s.docRow}>
                                    <View style={[s.docIconWrap, {
                                        backgroundColor: doc.classification === 'CONFIDENTIAL' ? '#FFEBEE' : C.primaryPale
                                    }]}>
                                        <Ionicons
                                            name={doc.classification === 'CONFIDENTIAL' ? 'lock-closed' : 'document-text'}
                                            size={22}
                                            color={doc.classification === 'CONFIDENTIAL' ? C.red : C.primary}
                                        />
                                    </View>
                                    <View style={s.docInfo}>
                                        <Text style={s.docName} numberOfLines={1}>{doc.originalFileName}</Text>
                                        <Text style={s.docDate}>{new Date(doc.uploadedAt).toLocaleDateString()}</Text>
                                    </View>
                                    <View style={[
                                        s.docTag,
                                        { backgroundColor: doc.classification === 'CONFIDENTIAL' ? '#FFEBEE' : C.primaryPale }
                                    ]}>
                                        <Text style={{
                                            color: doc.classification === 'CONFIDENTIAL' ? C.red : C.primary,
                                            fontSize: 10, fontWeight: '700',
                                        }}>
                                            {doc.classification}
                                        </Text>
                                    </View>
                                    <TouchableOpacity
                                        style={s.qrBtn}
                                        onPress={() => navigation.navigate('DppPassport', { dppId: doc.id })}
                                    >
                                        <Ionicons name="qr-code-outline" size={20} color={C.primary} />
                                    </TouchableOpacity>
                                </View>
                            </SectionCard>
                        ))}

                        {documents.length > 2 && (
                            <TouchableOpacity style={s.seeMoreBtn} onPress={() => setShowAllDocs(!showAllDocs)}>
                                <Text style={s.seeMoreText}>{showAllDocs ? 'Show Less' : `See More (${documents.length - 2})`}</Text>
                                <Ionicons name={showAllDocs ? 'chevron-up' : 'chevron-down'} size={16} color={C.primary} />
                            </TouchableOpacity>
                        )}
                    </>
                )}

                {/* ═══ DPP Pipeline Workflow ═══════════════════ */}
                <Text style={s.sectionTitle}>DPP Pipeline Workflow</Text>
                <SectionCard>
                    <StepRow
                        step="1"
                        icon="pricetag-outline"
                        iconBg={C.primary}
                        label="Create Rubber Lot"
                        sublabel="Post grade, quantity & asking price"
                        onPress={() => navigation.navigate('CreateSellingPost')}
                    />
                    <Divider />
                    <StepRow
                        step="2"
                        icon="checkmark-done-outline"
                        iconBg={C.green}
                        label="Accept Exporter Sale"
                        sublabel="Finalize an order from an interested exporter"
                    />
                    <Divider />
                    <StepRow
                        step="3"
                        icon="document-attach-outline"
                        iconBg={C.primaryLight}
                        label="Link DPP to Order"
                        sublabel="Upload document (Step A — Gemini Extract)"
                    />
                    <Divider />
                    <StepRow
                        step="4"
                        icon="eye-outline"
                        iconBg="#FF9F0A"
                        label="Review & Generate Passport"
                        sublabel="Verify classification & Mint SHA-256 Hash"
                    />
                    <Divider />
                    <StepRow
                        step="5"
                        icon="reader-outline"
                        iconBg="#AF52DE"
                        label="View Digital Passport"
                        sublabel="Privacy-preserving DPP with integrity hash"
                    />
                    <Divider />
                    <StepRow
                        step="6"
                        icon="chatbubbles-outline"
                        iconBg="#FF375F"
                        label="Secure Lot Messaging"
                        sublabel="AES-256 encrypted confidential messages"
                    />
                </SectionCard>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* ── Purchase Notification Modal ─────────────── */}
            <Modal
                visible={purchaseNotifs.length > 0}
                transparent
                animationType="none"
                statusBarTranslucent
                onRequestClose={dismissNotif}
            >
                <View style={s.notifOverlay}>
                    <Animated.View style={[
                        s.notifCard,
                        {
                            opacity: notifAnim,
                            transform: [{ scale: notifAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
                        },
                    ]}>
                        <LinearGradient
                            colors={[C.primaryDark, C.primary]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={s.notifAccentBar}
                        />
                        <View style={s.notifIconWrap}>
                            <LinearGradient colors={[C.primaryLight, C.primaryDark]} style={s.notifIconCircle}>
                                <Ionicons name="bag-check" size={32} color="#fff" />
                            </LinearGradient>
                        </View>
                        <Text style={s.notifTitle}>Purchase Request!</Text>
                        <Text style={s.notifSubtitle}>
                            {purchaseNotifs.length === 1
                                ? `${purchaseNotifs[0].exporterName || 'An exporter'} wants to buy your rubber lot.`
                                : `${purchaseNotifs.length} exporters have requested to buy your lots.`}
                        </Text>
                        {purchaseNotifs.length === 1 && (
                            <View style={s.notifDetails}>
                                <View style={s.notifDetailRow}>
                                    <View style={s.notifDetailIcon}><Ionicons name="person" size={14} color={C.primary} /></View>
                                    <Text style={s.notifDetailLabel}>Exporter</Text>
                                    <Text style={s.notifDetailVal}>{purchaseNotifs[0].exporterName || 'Unknown'}</Text>
                                </View>
                                <View style={s.notifDetailRow}>
                                    <View style={s.notifDetailIcon}><Ionicons name="cash" size={14} color={C.green} /></View>
                                    <Text style={s.notifDetailLabel}>Offer Price</Text>
                                    <Text style={[s.notifDetailVal, { color: C.green, fontWeight: '700' }]}>
                                        LKR {purchaseNotifs[0].offerPrice.toLocaleString()}
                                    </Text>
                                </View>
                                <View style={s.notifDetailRow}>
                                    <View style={s.notifDetailIcon}><Ionicons name="time" size={14} color={C.orange} /></View>
                                    <Text style={s.notifDetailLabel}>Action needed</Text>
                                    <Text style={[s.notifDetailVal, { color: C.orange }]}>Upload Invoice</Text>
                                </View>
                            </View>
                        )}
                        <View style={s.notifActions}>
                            <TouchableOpacity style={s.notifDismissBtn} onPress={dismissNotif} activeOpacity={0.7}>
                                <Text style={s.notifDismissText}>Later</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={s.notifViewBtn}
                                activeOpacity={0.85}
                                onPress={() => {
                                    dismissNotif();
                                    if (purchaseNotifs.length === 1) {
                                        navigation.navigate('OrderReceipt', { transactionId: purchaseNotifs[0].id });
                                    } else {
                                        scrollRef.current?.scrollTo({ y: 0, animated: true });
                                    }
                                }}
                            >
                                <LinearGradient
                                    colors={[C.primary, C.primaryDark]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={s.notifViewBtnInner}
                                >
                                    <Ionicons name="eye" size={16} color="#fff" />
                                    <Text style={s.notifViewText}>View Order</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* ── Exporter Interest Notification Modal ──────── */}
            <Modal
                visible={interestNotifs.length > 0}
                transparent
                animationType="none"
                statusBarTranslucent
                onRequestClose={dismissInterestNotif}
            >
                <View style={s.notifOverlay}>
                    <Animated.View style={[
                        s.notifCard,
                        {
                            opacity: interestNotifAnim,
                            transform: [{ scale: interestNotifAnim.interpolate({ inputRange: [0, 1], outputRange: [0.85, 1] }) }],
                        },
                    ]}>
                        <LinearGradient
                            colors={[C.primaryDark, C.primary]}
                            start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                            style={s.notifAccentBar}
                        />
                        <View style={s.notifIconWrap}>
                            <LinearGradient colors={[C.primaryLight, C.primaryDark]} style={s.notifIconCircle}>
                                <Ionicons name="hand-right" size={32} color="#fff" />
                            </LinearGradient>
                        </View>
                        <Text style={s.notifTitle}>Exporter Interest!</Text>
                        <Text style={s.notifSubtitle}>
                            {interestNotifs.length === 1
                                ? `An exporter is interested in your ${interestNotifs[0].grade} lot (${interestNotifs[0].quantityKg} kg).`
                                : `${interestNotifs.length} of your lots have received exporter interest requests.`}
                        </Text>
                        <View style={s.notifActions}>
                            <TouchableOpacity style={s.notifDismissBtn} onPress={dismissInterestNotif} activeOpacity={0.7}>
                                <Text style={s.notifDismissText}>Later</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={s.notifViewBtn}
                                activeOpacity={0.85}
                                onPress={() => {
                                    dismissInterestNotif();
                                    navigation.navigate('PendingRequests');
                                }}
                            >
                                <LinearGradient
                                    colors={[C.primary, C.primaryDark]}
                                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                                    style={s.notifViewBtnInner}
                                >
                                    <Ionicons name="people" size={16} color="#fff" />
                                    <Text style={s.notifViewText}>Review Requests</Text>
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>
            </Modal>

            {/* ── QR Modal ──────────────────────────────────── */}
            <Modal visible={!!selectedQr} transparent animationType="fade">
                <View style={s.modalBg}>
                    <View style={s.modalCard}>
                        <View style={s.modalHandle} />
                        <Text style={s.modalTitle}>DPP QR Code</Text>
                        <Text style={s.modalSub}>Scan with exporter device to access passport</Text>
                        {selectedQr && (
                            <View style={s.qrWrap}>
                                <QRCode value={selectedQr} size={200} />
                            </View>
                        )}
                        <Text style={s.qrId}>ID: {selectedQr}</Text>
                        <TouchableOpacity style={s.modalClose} onPress={() => setSelectedQr(null)}>
                            <Text style={s.modalCloseText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    scroll: { flex: 1 },
    scrollContent: { paddingHorizontal: 20, paddingBottom: 20 },

    /* ── Header ────── */
    header: {
        paddingTop: Platform.OS === 'ios' ? 54 : 44,
        paddingBottom: 0,
        paddingHorizontal: 20,
        overflow: 'hidden',
    },
    headerCircle1: {
        position: 'absolute', width: 200, height: 200, borderRadius: 100,
        backgroundColor: 'rgba(255,255,255,0.07)',
        top: -70, right: -50,
    },
    headerCircle2: {
        position: 'absolute', width: 140, height: 140, borderRadius: 70,
        backgroundColor: 'rgba(255,255,255,0.05)',
        bottom: 30, left: -40,
    },
    headerTop: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 20,
    },
    profileSection: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
    avatarWrap: { position: 'relative', marginRight: 14 },
    avatarRing: {
        width: 58, height: 58, borderRadius: 29,
        padding: 2.5,
        justifyContent: 'center', alignItems: 'center',
    },
    avatar: {
        width: 52, height: 52, borderRadius: 26,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontSize: 20, fontWeight: '800', color: '#fff', letterSpacing: 0.5 },
    onlineDot: {
        position: 'absolute', bottom: 2, right: 2,
        width: 13, height: 13, borderRadius: 7,
        backgroundColor: '#69F0AE',
        borderWidth: 2, borderColor: C.primaryDark,
    },
    profileInfo: { flex: 1 },
    profileGreeting: { fontSize: 13, color: 'rgba(255,255,255,0.75)', fontWeight: '500', letterSpacing: 0.2 },
    profileName: { fontSize: 20, fontWeight: '800', color: '#fff', marginTop: 1, letterSpacing: 0.2 },
    roleBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        marginTop: 5,
        backgroundColor: 'rgba(255,255,255,0.15)',
        alignSelf: 'flex-start',
        paddingHorizontal: 8, paddingVertical: 3, borderRadius: 20,
    },
    roleText: { color: 'rgba(255,255,255,0.9)', fontSize: 11, fontWeight: '600' },
    notifBtn: {
        width: 46, height: 46, borderRadius: 23,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    },
    notifInner: { position: 'relative', justifyContent: 'center', alignItems: 'center' },
    notifBadge: {
        position: 'absolute', top: -6, right: -8,
        backgroundColor: C.red,
        borderRadius: 10, minWidth: 18, height: 18,
        justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 4,
        borderWidth: 2, borderColor: C.primary,
    },
    notifBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' },
    headerFooter: {
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: 16, paddingVertical: 12, marginBottom: 18,
    },
    headerStat: { alignItems: 'center', flex: 1 },
    headerStatVal: { fontSize: 20, fontWeight: '800', color: '#fff' },
    headerStatLabel: { fontSize: 11, color: 'rgba(255,255,255,0.7)', marginTop: 2, fontWeight: '500' },
    headerStatDivider: { width: 1, height: 30, backgroundColor: 'rgba(255,255,255,0.2)' },

    /* ── Section titles ────── */
    sectionTitle: { fontSize: 17, fontWeight: '700', color: C.text, marginTop: 22, marginBottom: 10 },
    sectionBadge: { fontSize: 15, fontWeight: '600', color: C.sub },
    sectionTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 22, marginBottom: 10 },
    countBadge: {
        backgroundColor: C.primaryPale, borderRadius: 12,
        paddingHorizontal: 8, paddingVertical: 2,
    },
    countBadgeText: { fontSize: 12, fontWeight: '700', color: C.primary },
    seeMoreBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 4, paddingVertical: 10, marginBottom: 4,
    },
    seeMoreText: { fontSize: 14, fontWeight: '600', color: C.primary },

    /* ── Section card ────── */
    sectionCard: {
        backgroundColor: C.card, borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },

    /* ── Stat indicators ────── */
    statsRow: {
        flexDirection: 'row', gap: 10, marginTop: 16,
    },
    statCard: {
        flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 12,
        alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    statIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center', marginBottom: 6,
    },
    statValue: { fontSize: 18, fontWeight: '800', color: C.text },
    statLabel: { fontSize: 11, fontWeight: '500', color: C.sub, marginTop: 2, textAlign: 'center' },

    /* ── Quick actions ────── */
    quickRow: { flexDirection: 'row', gap: 12 },
    quickCard: {
        flex: 1, backgroundColor: C.card, borderRadius: 16, padding: 14, alignItems: 'center',
        shadowColor: '#000', shadowOpacity: 0.04, shadowRadius: 8, shadowOffset: { width: 0, height: 2 },
        elevation: 2,
    },
    quickIcon: {
        width: 44, height: 44, borderRadius: 14, justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    quickLabel: { fontSize: 12, fontWeight: '600', color: C.text, textAlign: 'center', lineHeight: 16 },

    /* ── Step rows (workflow) ────── */
    stepRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, gap: 12 },
    stepIcon: { width: 36, height: 36, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
    stepContent: { flex: 1 },
    stepLabel: { fontSize: 15, fontWeight: '600', color: C.text },
    stepSub: { fontSize: 12, color: C.sub, marginTop: 1 },

    /* ── Divider ────── */
    divider: { height: 1, backgroundColor: C.border, marginVertical: 2 },

    /* ── Transaction cards ────── */
    txHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingBottom: 10 },
    txLeft: {},
    txPrice: { fontSize: 18, fontWeight: '700', color: C.text },
    txExporter: { fontSize: 13, color: C.sub, marginTop: 2 },
    txBadge: { flexDirection: 'row', alignItems: 'center', gap: 6, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20 },
    txDot: { width: 7, height: 7, borderRadius: 4 },
    txBadgeText: { fontSize: 12, fontWeight: '600' },
    txActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingTop: 10 },
    txBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
    },
    txBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

    /* ── Document rows ────── */
    docRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    docIconWrap: {
        width: 40, height: 40, borderRadius: 12, backgroundColor: C.bg,
        justifyContent: 'center', alignItems: 'center',
    },
    docInfo: { flex: 1 },
    docName: { fontSize: 14, fontWeight: '600', color: C.text },
    docDate: { fontSize: 11, color: C.sub, marginTop: 2 },
    docTag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    qrBtn: { padding: 8, backgroundColor: '#F0F8FF', borderRadius: 10 },

    /* ── Empty state ────── */
    emptyWrap: { alignItems: 'center', paddingVertical: 28, gap: 8 },
    emptyTitle: { fontSize: 16, fontWeight: '600', color: C.text },
    emptySub: { fontSize: 13, color: C.sub, textAlign: 'center', paddingHorizontal: 20 },
    emptyBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: C.accent, paddingHorizontal: 18, paddingVertical: 10, borderRadius: 12, marginTop: 8,
    },
    emptyBtnText: { color: '#FFF', fontWeight: '600', fontSize: 14 },

    /* ── Purchase Notification Modal ────── */
    notifOverlay: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.55)',
        justifyContent: 'center', alignItems: 'center', paddingHorizontal: 24,
    },
    notifCard: {
        backgroundColor: '#fff', borderRadius: 24, width: '100%',
        overflow: 'hidden',
        shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 24, shadowOffset: { width: 0, height: 8 },
        elevation: 12,
    },
    notifAccentBar: { height: 5, width: '100%' },
    notifIconWrap: { alignItems: 'center', marginTop: 28, marginBottom: 12 },
    notifIconCircle: {
        width: 72, height: 72, borderRadius: 36,
        justifyContent: 'center', alignItems: 'center',
    },
    notifTitle: {
        fontSize: 22, fontWeight: '800', color: C.text,
        textAlign: 'center', marginBottom: 6, paddingHorizontal: 20,
    },
    notifSubtitle: {
        fontSize: 14, color: C.sub, textAlign: 'center',
        lineHeight: 20, paddingHorizontal: 24, marginBottom: 20,
    },
    notifDetails: {
        marginHorizontal: 20, backgroundColor: C.primaryPale,
        borderRadius: 14, padding: 14, marginBottom: 20, gap: 10,
    },
    notifDetailRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    notifDetailIcon: {
        width: 26, height: 26, borderRadius: 8, backgroundColor: '#fff',
        justifyContent: 'center', alignItems: 'center',
    },
    notifDetailLabel: { flex: 1, fontSize: 13, color: C.sub, fontWeight: '500' },
    notifDetailVal: { fontSize: 13, color: C.text, fontWeight: '600' },
    notifActions: {
        flexDirection: 'row', gap: 10,
        paddingHorizontal: 20, paddingBottom: 24,
    },
    notifDismissBtn: {
        flex: 1, paddingVertical: 14, borderRadius: 14,
        backgroundColor: C.bg, alignItems: 'center', justifyContent: 'center',
        borderWidth: 1, borderColor: C.border,
    },
    notifDismissText: { fontSize: 15, fontWeight: '600', color: C.sub },
    notifViewBtn: { flex: 2, borderRadius: 14, overflow: 'hidden' },
    notifViewBtnInner: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 14,
    },
    notifViewText: { fontSize: 15, fontWeight: '700', color: '#fff' },

    /* ── QR Modal ────── */
    modalBg: { flex: 1, backgroundColor: 'rgba(0,0,0,0.45)', justifyContent: 'center', alignItems: 'center' },
    modalCard: { backgroundColor: C.card, width: '82%', padding: 28, borderRadius: 24, alignItems: 'center' },
    modalHandle: { width: 36, height: 4, borderRadius: 2, backgroundColor: C.border, marginBottom: 16 },
    modalTitle: { fontSize: 20, fontWeight: '700', color: C.text, marginBottom: 4 },
    modalSub: { fontSize: 13, color: C.sub, marginBottom: 20 },
    qrWrap: {
        padding: 16, borderRadius: 16, backgroundColor: C.card,
        shadowColor: '#000', shadowOpacity: 0.08, shadowRadius: 12, elevation: 4, marginBottom: 16,
    },
    qrId: { fontFamily: 'monospace', fontSize: 11, color: C.sub, marginBottom: 16 },
    modalClose: { paddingVertical: 12, paddingHorizontal: 36, backgroundColor: C.blue, borderRadius: 12 },
    modalCloseText: { color: '#FFF', fontWeight: '700', fontSize: 15 },
});
