import React, { useState, useCallback, useRef, useMemo } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    Alert, ActivityIndicator, Modal, ScrollView, StatusBar,
    Platform, RefreshControl, TextInput
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as DocumentPicker from 'expo-document-picker';
import {
    getSellingPosts, expressInterest, getMyTransactions,
    getBuyerHistory, uploadExporterDocs, getMyInterestRequests,
} from '../services/marketplaceService';
import {
    getPassport, verifyDpp,
} from '../services/dppService';
import { SellingPost, BuyerHistory, MarketplaceTransaction, LotInterestRequest } from '../types';
import { getUnreadMessageCount } from '../services/messagesService';
import { useStore } from '../../../store';

/* ─── Light Green Palette ─────────────────────────────────────────── */
const C = {
    primary: '#2E7D32',
    primaryLight: '#4CAF50',
    primaryPale: '#E8F5E9',
    primaryDark: '#1B5E20',
    primarySoft: '#A5D6A7',
    bg: '#F1F8E9',
    card: '#FFFFFF',
    accent: '#66BB6A',
    accentLight: '#C8E6C9',
    blue: '#2196F3',
    blueLight: '#E3F2FD',
    green: '#43A047',
    greenLight: '#E8F5E9',
    orange: '#FF9800',
    orangeLight: '#FFF3E0',
    red: '#E53935',
    redLight: '#FFEBEE',
    purple: '#7E57C2',
    purpleLight: '#EDE7F6',
    text: '#1B5E20',
    textDark: '#1C1C1E',
    sub: '#6B7B6E',
    border: '#C8E6C9',
    borderLight: '#E8F5E9',
};

type TabKey = 'overview' | 'marketplace' | 'transactions';

/* ═══════════════════════════════════════════════════════════════════════
   MarketplaceScreen — Exporter Hub
   ═══════════════════════════════════════════════════════════════════════ */
export default function MarketplaceScreen() {
    const navigation = useNavigation<any>();
    const { user } = useStore();
    const [activeTab, setActiveTab] = useState<TabKey>('overview');
    const [loading, setLoading] = useState(false);

    // Data
    const [posts, setPosts] = useState<SellingPost[]>([]);
    const [transactions, setTransactions] = useState<MarketplaceTransaction[]>([]);
    const [myInterestRequests, setMyInterestRequests] = useState<LotInterestRequest[]>([]);
    const [msgCount, setMsgCount] = useState(0);

    // Filters
    const [gradeFilter, setGradeFilter] = useState('All');
    const [searchQuery, setSearchQuery] = useState('');

    // Modals
    const [historyModal, setHistoryModal] = useState(false);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [buyerHistory, setBuyerHistory] = useState<BuyerHistory | null>(null);
    const [dppModal, setDppModal] = useState(false);
    const [confirmModal, setConfirmModal] = useState<{ visible: boolean, post: SellingPost | null }>({ visible: false, post: null });
    const [successModal, setSuccessModal] = useState<{ visible: boolean, transactionId: string | null, sellerName: string }>({ visible: false, transactionId: null, sellerName: '' });
    const [dppData, setDppData] = useState<any>(null);
    const [dppLoading, setDppLoading] = useState(false);
    const [dppVerified, setDppVerified] = useState<boolean | null>(null);
    const [selectedLotId, setSelectedLotId] = useState<string | null>(null);

    /* ── Data Loading ──────────────────────── */
    const loadData = useCallback(async () => {
        setLoading(true);
        try {
            const [postsData, transData, interestData, unread] = await Promise.all([
                getSellingPosts(),
                getMyTransactions(),
                getMyInterestRequests(),
                getUnreadMessageCount().catch(() => 0),
            ]);
            setPosts(postsData);
            setTransactions(transData);
            setMyInterestRequests(interestData);
            setMsgCount(unread);
        } finally {
            setLoading(false);
        }
    }, []);

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

    /* ── Derived Stats ─────────────────────── */
    const stats = useMemo(() => {
        const completedTx = transactions.filter(t => t.status === 'Completed').length;
        return { completedTx, totalPurchased: transactions.length };
    }, [transactions]);

    /* ── Filtered Posts ─────────────────────── */
    const filteredPosts = useMemo(() => {
        let filtered = posts;
        if (gradeFilter !== 'All') {
            filtered = filtered.filter(p => p.grade === gradeFilter);
        }
        if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            filtered = filtered.filter(p =>
                p.grade.toLowerCase().includes(q) ||
                p.location.toLowerCase().includes(q) ||
                p.buyerName.toLowerCase().includes(q)
            );
        }
        return filtered;
    }, [posts, gradeFilter, searchQuery]);

    const uniqueGrades = useMemo(() => {
        const grades = new Set(posts.map(p => p.grade));
        return ['All', ...Array.from(grades)];
    }, [posts]);

    /* ── Handlers ──────────────────────────── */
    const handleBuy = (post: SellingPost) => {
        setConfirmModal({ visible: true, post });
    };

    const confirmRequestPurchase = async () => {
        const post = confirmModal.post;
        if (!post) return;

        setConfirmModal({ visible: false, post: null });
        try {
            await expressInterest(post.id);
            setSuccessModal({ visible: true, transactionId: null, sellerName: post.buyerName });
            loadData();
        } catch {
            Alert.alert('Error', 'Failed to send request. The lot may no longer be available or you may have already requested it.');
            loadData();
        }
    };

    const handleSuccessContinue = () => {
        setSuccessModal({ visible: false, transactionId: null, sellerName: '' });
    };

    const handleViewBuyerHistory = async (buyerId: string) => {
        setBuyerHistory(null);
        setHistoryModal(true);
        setHistoryLoading(true);
        try {
            const history = await getBuyerHistory(buyerId);
            setBuyerHistory(history);
        } catch {
            setBuyerHistory(null);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleViewDpp = async (dppDocId: string, lotId?: string) => {
        setDppData(null);
        setDppVerified(null);
        setSelectedLotId(lotId || dppDocId);
        setDppModal(true);
        setDppLoading(true);
        try {
            const [passport, verification] = await Promise.all([
                getPassport(dppDocId).catch(() => null),
                verifyDpp(dppDocId).catch(() => null),
            ]);
            setDppData(passport);
            setDppVerified(verification?.isValid ?? null);
        } finally {
            setDppLoading(false);
        }
    };

    const handleUploadExporterDocs = async (transactionId: string) => {
        try {
            const result = await DocumentPicker.getDocumentAsync({ type: '*/*', copyToCacheDirectory: true });
            if (result.canceled) return;
            const file = result.assets[0];
            setLoading(true);
            await uploadExporterDocs(transactionId, { uri: file.uri, name: file.name, mimeType: file.mimeType });
            Alert.alert('Documents Uploaded', `"${file.name}" has been uploaded successfully.`);
            loadData();
        } catch (error: any) {
            const msg =
                error?.response?.data?.error ||
                error?.response?.data?.message ||
                (error?.response?.status === 403 ? 'Access denied. This transaction does not belong to your account.' : null) ||
                (error?.response?.status === 404 ? 'Transaction not found.' : null) ||
                (!error?.response ? 'Network error — check your connection.' : null) ||
                error?.message ||
                'Failed to upload documents.';
            Alert.alert('Upload Failed', msg);
        } finally {
            setLoading(false);
        }
    };

    const consistencyColor = (c: BuyerHistory['verificationConsistency']) =>
        c === 'High' ? C.green : c === 'Medium' ? C.orange : C.red;

    const getGreeting = () => {
        const hour = new Date().getHours();
        if (hour < 12) return 'Good Morning';
        if (hour < 17) return 'Good Afternoon';
        return 'Good Evening';
    };

    const getInitials = (name?: string) => {
        if (!name) return 'E';
        const parts = name.trim().split(' ');
        return parts.length >= 2
            ? (parts[0][0] + parts[parts.length - 1][0]).toUpperCase()
            : parts[0][0].toUpperCase();
    };

    /* ═══════════════════════════════════════════════════════════════════
       TAB: Overview (Home Screen)
       ═══════════════════════════════════════════════════════════════════ */
    const renderOverview = () => (
        <ScrollView
            style={s.tabContent}
            contentContainerStyle={s.tabContentInner}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={C.primary} />}
        >
            {/* Scan Physical Tag Button */}
            <TouchableOpacity
                style={s.scanButton}
                activeOpacity={0.8}
                onPress={() => navigation.navigate('ExporterScanner')}
            >
                <LinearGradient
                    colors={[C.primary, C.primaryLight]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={s.scanGradient}
                >
                    <View style={s.scanIconWrap}>
                        <Ionicons name="scan" size={28} color="#FFF" />
                    </View>
                    <View style={s.scanTextWrap}>
                        <Text style={s.scanTitle}>Scan Physical Tag</Text>
                        <Text style={s.scanSub}>Read NFC/QR tag on rubber lot</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={22} color="rgba(255,255,255,0.7)" />
                </LinearGradient>
            </TouchableOpacity>

            {/* Status Metrics */}
            <Text style={s.sectionTitle}>Status Overview</Text>
            <View style={s.metricsGrid}>
                <TouchableOpacity
                    style={[s.metricCard, { borderLeftColor: C.blue }]}
                    activeOpacity={0.7}
                    onPress={() => setActiveTab('transactions')}
                >
                    <View style={[s.metricIconWrap, { backgroundColor: C.blueLight }]}>
                        <Ionicons name="cart-outline" size={20} color={C.blue} />
                    </View>
                    <Text style={s.metricValue}>{stats.totalPurchased}</Text>
                    <Text style={s.metricLabel}>Total Purchased</Text>
                </TouchableOpacity>

                <TouchableOpacity
                    style={[s.metricCard, { borderLeftColor: C.purple }]}
                    activeOpacity={0.7}
                    onPress={() => setActiveTab('marketplace')}
                >
                    <View style={[s.metricIconWrap, { backgroundColor: C.purpleLight }]}>
                        <Ionicons name="storefront-outline" size={20} color={C.purple} />
                    </View>
                    <Text style={s.metricValue}>{posts.length}</Text>
                    <Text style={s.metricLabel}>Available Lots</Text>
                </TouchableOpacity>
            </View>

            {/* Quick Actions */}
            <Text style={s.sectionTitle}>Quick Actions</Text>
            <View style={s.quickRow}>
                <TouchableOpacity
                    style={s.quickCard}
                    activeOpacity={0.7}
                    onPress={() => setActiveTab('marketplace')}
                >
                    <View style={[s.quickIconWrap, { backgroundColor: C.primaryPale }]}>
                        <Ionicons name="search" size={22} color={C.primary} />
                    </View>
                    <Text style={s.quickLabel}>Browse{'\n'}Lots</Text>
                </TouchableOpacity>
                <TouchableOpacity
                    style={s.quickCard}
                    activeOpacity={0.7}
                    onPress={() => navigation.navigate('ExporterScanner')}
                >
                    <View style={[s.quickIconWrap, { backgroundColor: C.accentLight }]}>
                        <Ionicons name="qr-code" size={22} color={C.accent} />
                    </View>
                    <Text style={s.quickLabel}>Scan{'\n'}QR/NFC</Text>
                </TouchableOpacity>
            </View>

            {/* Recent Sales */}
            <Text style={s.sectionTitle}>Recent Sales</Text>
            {transactions.length === 0 ? (
                <View style={s.emptyCard}>
                    <Ionicons name="bag-outline" size={36} color={C.sub} />
                    <Text style={s.emptyText}>No confirmed lots yet</Text>
                    <Text style={s.emptySub}>Browse the marketplace and request a lot to get started</Text>
                </View>
            ) : (
                transactions.slice(0, 3).map(tx => {
                    const stColor = tx.status === 'Completed' ? C.green
                        : tx.status === 'QirUploaded' ? C.primaryLight
                            : tx.status === 'InvoiceUploaded' ? C.blue : C.orange;
                    const stLabel = tx.status === 'Completed' ? 'Completed'
                        : tx.status === 'QirUploaded' ? 'QIR Uploaded'
                            : tx.status === 'InvoiceUploaded' ? 'Invoice Ready' : 'Lot Confirmed';
                    return (
                        <TouchableOpacity
                            key={tx.id}
                            style={s.saleCard}
                            activeOpacity={0.75}
                            onPress={() => navigation.navigate('OrderReceipt', { transactionId: tx.id })}
                        >
                            <View style={[s.saleIconWrap, { backgroundColor: stColor + '18' }]}>
                                <Ionicons name="checkmark-circle" size={22} color={stColor} />
                            </View>
                            <View style={s.saleInfo}>
                                <Text style={s.saleOrderId}>Order #{tx.id.substring(0, 8)}</Text>
                                <Text style={s.saleSellerId}>Seller: {tx.buyerId.substring(0, 8)}</Text>
                            </View>
                            <View style={s.saleRight}>
                                <Text style={s.salePrice}>LKR {tx.offerPrice.toLocaleString()}</Text>
                                <View style={[s.saleBadge, { backgroundColor: stColor + '18' }]}>
                                    <View style={[s.saleDot, { backgroundColor: stColor }]} />
                                    <Text style={[s.saleBadgeText, { color: stColor }]}>{stLabel}</Text>
                                </View>
                            </View>
                        </TouchableOpacity>
                    );
                })
            )}
            {transactions.length > 3 && (
                <TouchableOpacity style={s.seeMoreBtn} onPress={() => setActiveTab('transactions')}>
                    <Text style={s.seeMoreText}>See All ({transactions.length})</Text>
                    <Ionicons name="chevron-forward" size={16} color={C.primary} />
                </TouchableOpacity>
            )}
            <View style={{ height: 30 }} />
        </ScrollView>
    );

    /* ═══════════════════════════════════════════════════════════════════
       TAB: Marketplace / Lot Explorer
       ═══════════════════════════════════════════════════════════════════ */
    const renderMarketplaceItem = ({ item }: { item: SellingPost }) => (
        <View style={s.lotCard}>
            {/* Header */}
            <View style={s.lotHeader}>
                <View style={{ flex: 1 }}>
                    <View style={s.lotTitleRow}>
                        <Text style={s.lotGrade}>{item.grade}</Text>
                        {item.dppDocumentId && (
                            <View style={s.dppBadge}>
                                <Ionicons name="shield-checkmark" size={12} color={C.green} />
                                <Text style={s.dppBadgeText}>DPP Attached</Text>
                            </View>
                        )}
                    </View>
                    <View style={s.lotLocationRow}>
                        <Ionicons name="location-sharp" size={13} color={C.sub} />
                        <Text style={s.lotLocation}>{item.location}</Text>
                    </View>
                </View>
                <View style={s.lotPriceWrap}>
                    <Text style={s.lotPrice}>LKR {item.pricePerKg}</Text>
                    <Text style={s.lotPriceUnit}>/kg</Text>
                </View>
            </View>

            {/* Details */}
            <View style={s.lotDetails}>
                <View style={s.lotDetailItem}>
                    <Ionicons name="cube-outline" size={14} color={C.sub} />
                    <Text style={s.lotDetailLabel}>Quantity</Text>
                    <Text style={s.lotDetailValue}>{item.quantityKg} kg</Text>
                </View>
                <View style={s.lotDetailItem}>
                    <Ionicons name="person-outline" size={14} color={C.sub} />
                    <Text style={s.lotDetailLabel}>Seller</Text>
                    <Text style={s.lotDetailValue}>{item.buyerName}</Text>
                </View>
                <View style={s.lotDetailItem}>
                    <Ionicons name="pricetag-outline" size={14} color={C.sub} />
                    <Text style={s.lotDetailLabel}>Total</Text>
                    <Text style={s.lotDetailValue}>LKR {(item.quantityKg * item.pricePerKg).toLocaleString()}</Text>
                </View>
            </View>

            {/* DPP Integrity Badge (if DPP exists) */}
            {item.dppDocumentId && (
                <TouchableOpacity
                    style={s.integrityBadge}
                    activeOpacity={0.7}
                    onPress={() => handleViewDpp(item.dppDocumentId!, item.id)}
                >
                    <Ionicons name="shield-checkmark" size={14} color={C.green} />
                    <Text style={s.integrityText}>Integrity Verified · View DPP</Text>
                    <Ionicons name="chevron-forward" size={14} color={C.green} />
                </TouchableOpacity>
            )}

            {/* Actions */}
            <View style={s.lotActions}>
                <TouchableOpacity
                    style={s.historyBtn}
                    onPress={() => handleViewBuyerHistory(item.buyerId)}
                >
                    <Ionicons name="stats-chart-outline" size={14} color={C.purple} />
                    <Text style={s.historyBtnText}>Seller History</Text>
                </TouchableOpacity>

                {item.buyerId === user?.id && (item.status === 'REQUESTED' || item.status === 'Active' || item.status === 'AVAILABLE') ? (
                    <TouchableOpacity
                        style={[s.purchaseBtn, { backgroundColor: C.blue }]}
                        onPress={() => navigation.navigate('LotBidders', {
                            postId: item.id,
                            grade: item.grade,
                            quantityKg: item.quantityKg,
                        })}
                    >
                        <Ionicons name="people" size={16} color="#FFF" />
                        <Text style={s.purchaseBtnText}>View Bidders</Text>
                    </TouchableOpacity>
                ) : myInterestRequests.some(r => r.postId === item.id && r.status === 'PENDING') ? (
                    <View style={[s.purchaseBtn, { backgroundColor: C.orange, opacity: 0.85 }]}>
                        <Ionicons name="time-outline" size={16} color="#FFF" />
                        <Text style={s.purchaseBtnText}>Pending Review</Text>
                    </View>
                ) : (
                    <TouchableOpacity
                        style={s.purchaseBtn}
                        onPress={() => handleBuy(item)}
                    >
                        <Ionicons name="cart" size={16} color="#FFF" />
                        <Text style={s.purchaseBtnText}>Request Purchase</Text>
                    </TouchableOpacity>
                )}
            </View>
        </View>
    );

    const renderMarketplace = () => (
        <View style={s.tabContent}>
            {/* Search & Filters */}
            <View style={s.filterSection}>
                <View style={s.searchBar}>
                    <Ionicons name="search" size={18} color={C.sub} />
                    <TextInput
                        style={s.searchInput}
                        placeholder="Search by grade, location, seller..."
                        placeholderTextColor={C.sub}
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery('')}>
                            <Ionicons name="close-circle" size={18} color={C.sub} />
                        </TouchableOpacity>
                    )}
                </View>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterChips}>
                    {uniqueGrades.map(grade => (
                        <TouchableOpacity
                            key={grade}
                            style={[s.filterChip, gradeFilter === grade && s.filterChipActive]}
                            onPress={() => setGradeFilter(grade)}
                        >
                            <Text style={[s.filterChipText, gradeFilter === grade && s.filterChipTextActive]}>
                                {grade}
                            </Text>
                        </TouchableOpacity>
                    ))}
                </ScrollView>
            </View>

            {/* Results count */}
            <View style={s.resultsBar}>
                <Text style={s.resultsText}>
                    {filteredPosts.length} lot{filteredPosts.length !== 1 ? 's' : ''} available
                </Text>
            </View>

            {/* Lot List */}
            <FlatList
                data={filteredPosts}
                renderItem={renderMarketplaceItem}
                keyExtractor={item => item.id}
                contentContainerStyle={{ paddingHorizontal: 20, paddingBottom: 20 }}
                refreshing={loading}
                onRefresh={loadData}
                initialNumToRender={6}
                maxToRenderPerBatch={8}
                windowSize={7}
                removeClippedSubviews={true}
                ListEmptyComponent={
                    <View style={s.emptyCard}>
                        <Ionicons name="storefront-outline" size={40} color={C.sub} />
                        <Text style={s.emptyText}>No lots available</Text>
                        <Text style={s.emptySub}>Try adjusting your filters</Text>
                    </View>
                }
            />
        </View>
    );

    /* ═══════════════════════════════════════════════════════════════════
       TAB: Transaction & Invoice Center
       ═══════════════════════════════════════════════════════════════════ */
    const renderTransactions = () => (
        <ScrollView
            style={s.tabContent}
            contentContainerStyle={s.tabContentInner}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={loading} onRefresh={loadData} tintColor={C.primary} />}
        >
            {transactions.length === 0 ? (
                <View style={s.emptyCard}>
                    <Ionicons name="receipt-outline" size={40} color={C.sub} />
                    <Text style={s.emptyText}>No transactions yet</Text>
                    <Text style={s.emptySub}>Purchase a lot from the marketplace to get started</Text>
                </View>
            ) : (
                transactions.map(tx => {
                    const isCompleted = tx.status === 'Completed';
                    const isInvoiceReady = tx.status === 'InvoiceUploaded';
                    const isQirUploaded = tx.status === 'QirUploaded';
                    const isPendingInvoice = tx.status === 'PendingInvoice';
                    const hasDpp = isInvoiceReady || isQirUploaded || isCompleted;
                    const stColor = isCompleted ? C.green
                        : isQirUploaded ? C.primaryLight
                            : isInvoiceReady ? C.blue : C.orange;
                    const stBg = isCompleted ? C.greenLight
                        : isQirUploaded ? C.primaryPale
                            : isInvoiceReady ? C.blueLight : C.orangeLight;
                    const stLabel = isCompleted ? 'Completed'
                        : isQirUploaded ? 'QIR Uploaded'
                            : isInvoiceReady ? 'Invoice Ready' : 'Pending Invoice';

                    return (
                        <View key={tx.id} style={s.txCard}>
                            {/* Transaction Header */}
                            <TouchableOpacity
                                style={s.txCardHeader}
                                activeOpacity={0.7}
                                onPress={() => navigation.navigate('OrderReceipt', { transactionId: tx.id })}
                            >
                                <View style={{ flex: 1 }}>
                                    <Text style={s.txOrderId}>Order #{tx.id.substring(0, 8)}</Text>
                                    <Text style={s.txSellerId}>Seller: {tx.buyerId.substring(0, 8)}</Text>
                                </View>
                                <View>
                                    <Text style={s.txTotalPrice}>LKR {tx.offerPrice.toLocaleString()}</Text>
                                    <View style={[s.txStatusBadge, { backgroundColor: stBg }]}>
                                        <View style={[s.txStatusDot, { backgroundColor: stColor }]} />
                                        <Text style={[s.txStatusText, { color: stColor }]}>{stLabel}</Text>
                                    </View>
                                </View>
                            </TouchableOpacity>

                            {/* Purchase Summary */}
                            {tx.dppDocumentId && (
                                <View style={s.txDppLink}>
                                    <Ionicons name="shield-checkmark" size={14} color={C.green} />
                                    <Text style={s.txDppLinkText}>DPP Linked</Text>
                                    <TouchableOpacity
                                        style={s.txViewDppBtn}
                                        onPress={() => navigation.navigate('DppPassport', { dppId: tx.dppDocumentId })}
                                    >
                                        <Text style={s.txViewDppBtnText}>View DPP</Text>
                                    </TouchableOpacity>
                                </View>
                            )}

                            {/* Action Buttons */}
                            <View style={s.txActionRow}>
                                {isPendingInvoice && (
                                    <TouchableOpacity
                                        style={[s.txActionBtn, { backgroundColor: C.orange }]}
                                        onPress={() => handleUploadExporterDocs(tx.id)}
                                    >
                                        <Ionicons name="cloud-upload" size={15} color="#FFF" />
                                        <Text style={s.txActionBtnText}>Upload Your Docs</Text>
                                    </TouchableOpacity>
                                )}

                                {tx.exporterDocsUploadedAt && (
                                    <View style={[s.txActionBtn, { backgroundColor: C.green, opacity: 0.9 }]}>
                                        <Ionicons name="checkmark-circle" size={15} color="#FFF" />
                                        <Text style={s.txActionBtnText}>Docs Uploaded</Text>
                                    </View>
                                )}

                                {isInvoiceReady && (
                                    <TouchableOpacity
                                        style={[s.txActionBtn, { backgroundColor: C.blue }]}
                                        onPress={() => navigation.navigate('InvoiceExtractedFields', { transactionId: tx.id })}
                                    >
                                        <Ionicons name="document-text" size={15} color="#FFF" />
                                        <Text style={s.txActionBtnText}>View Invoice Fields</Text>
                                    </TouchableOpacity>
                                )}

                                {/* View DPP — available once invoice is uploaded; only the exporter can access */}
                                {hasDpp && (
                                    <TouchableOpacity
                                        style={[s.txActionBtn, { backgroundColor: C.primary }]}
                                        onPress={() => navigation.navigate('ExporterDppView', { transactionId: tx.id })}
                                    >
                                        <Ionicons name="shield-checkmark" size={15} color="#FFF" />
                                        <Text style={s.txActionBtnText}>View DPP</Text>
                                    </TouchableOpacity>
                                )}

                                <TouchableOpacity
                                    style={[s.txActionBtn, { backgroundColor: C.sub }]}
                                    onPress={() => navigation.navigate('OrderReceipt', { transactionId: tx.id })}
                                >
                                    <Ionicons name="receipt-outline" size={15} color="#FFF" />
                                    <Text style={s.txActionBtnText}>Receipt</Text>
                                </TouchableOpacity>
                            </View>

                            {/* Encryption Notice */}
                            {isPendingInvoice && !tx.exporterDocsUploadedAt && (
                                <View style={s.encryptionNotice}>
                                    <Ionicons name="information-circle-outline" size={12} color={C.sub} />
                                    <Text style={s.encryptionNoticeText}>
                                        Upload shipping certs, origin docs, or quality certificates to share with the buyer
                                    </Text>
                                </View>
                            )}
                        </View>
                    );
                })
            )}
            <View style={{ height: 30 }} />
        </ScrollView>
    );

    /* ═══════════════════════════════════════════════════════════════════
       MAIN RENDER
       ═══════════════════════════════════════════════════════════════════ */
    const TAB_CONFIG: { key: TabKey; label: string; icon: keyof typeof Ionicons.glyphMap }[] = [
        { key: 'overview', label: 'Home', icon: 'home' },
        { key: 'marketplace', label: 'Lots', icon: 'storefront' },
        { key: 'transactions', label: 'Orders', icon: 'receipt' },
    ];

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

            {/* ── Header ─────────────────────────────────── */}
            <LinearGradient
                colors={[C.primaryDark, C.primary, '#43A047']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.header}
            >
                <View style={s.headerCircle1} />
                <View style={s.headerCircle2} />

                <View style={s.headerTop}>
                    <TouchableOpacity
                        style={s.profileSection}
                        activeOpacity={0.85}
                        onPress={() => navigation.navigate('BuyerDashboard')}
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
                        </View>
                        <View style={s.profileInfo}>
                            <Text style={s.profileGreeting}>{getGreeting()}</Text>
                            <Text style={s.profileName} numberOfLines={1}>
                                {user?.name || 'Exporter'}
                            </Text>
                        </View>
                    </TouchableOpacity>

                    {/* Notification Bell */}
                    <TouchableOpacity style={s.headerActionBtn}>
                        <View>
                            <Ionicons
                                name={msgCount > 0 ? 'notifications' : 'notifications-outline'}
                                size={22}
                                color="#FFF"
                            />
                            {msgCount > 0 && (
                                <View style={s.notifBadge}>
                                    <Text style={s.notifBadgeText}>
                                        {msgCount > 9 ? '9+' : msgCount}
                                    </Text>
                                </View>
                            )}
                        </View>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={s.headerActionBtn}
                        onPress={() => navigation.navigate('ExporterScanner')}
                    >
                        <Ionicons name="scan-outline" size={22} color="#FFF" />
                    </TouchableOpacity>
                </View>

                {/* Stats Strip */}
                <View style={s.headerStrip}>
                    <View style={s.headerStripItem}>
                        <Text style={s.headerStripVal}>{posts.length}</Text>
                        <Text style={s.headerStripLabel}>Lots</Text>
                    </View>
                    <View style={s.headerStripDivider} />
                    <View style={s.headerStripItem}>
                        <Text style={s.headerStripVal}>{transactions.length}</Text>
                        <Text style={s.headerStripLabel}>Orders</Text>
                    </View>
                    <View style={s.headerStripDivider} />
                    <View style={s.headerStripItem}>
                        <Text style={s.headerStripVal}>{stats.completedTx}</Text>
                        <Text style={s.headerStripLabel}>Done</Text>
                    </View>
                </View>
            </LinearGradient>

            {/* ── Tab Bar ────────────────────────────────── */}
            <View style={s.tabBar}>
                {TAB_CONFIG.map(tab => {
                    const isActive = activeTab === tab.key;
                    return (
                        <TouchableOpacity
                            key={tab.key}
                            style={[s.tabItem, isActive && s.tabItemActive]}
                            onPress={() => setActiveTab(tab.key)}
                            activeOpacity={0.7}
                        >
                            <Ionicons
                                name={isActive ? tab.icon : (`${tab.icon}-outline` as any)}
                                size={20}
                                color={isActive ? C.primary : C.sub}
                            />
                            <Text style={[s.tabLabel, isActive && s.tabLabelActive]}>
                                {tab.label}
                            </Text>
                            {isActive && <View style={s.tabIndicator} />}
                        </TouchableOpacity>
                    );
                })}
            </View>

            {/* ── Tab Content ────────────────────────────── */}
            {loading && posts.length === 0 && transactions.length === 0 ? (
                <View style={s.loadingWrap}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <Text style={s.loadingText}>Loading data...</Text>
                </View>
            ) : (
                <>
                    {activeTab === 'overview' && renderOverview()}
                    {activeTab === 'marketplace' && renderMarketplace()}
                    {activeTab === 'transactions' && renderTransactions()}
                </>
            )}

            {/* ═══ DPP View Modal (Public/Locked & Unlocked) ═════════════ */}
            <Modal visible={dppModal} transparent animationType="slide">
                <View style={s.modalBackdrop}>
                    <View style={s.dppModalCard}>
                        {/* Close Button */}
                        <View style={s.dppModalHeader}>
                            <View style={{ flex: 1 }}>
                                <Text style={s.dppModalTitle}>Digital Product Passport</Text>
                                <Text style={s.dppModalSubtitle}>Lot #{selectedLotId?.substring(0, 12)}</Text>
                            </View>
                            <TouchableOpacity onPress={() => setDppModal(false)}>
                                <Ionicons name="close-circle" size={28} color={C.sub} />
                            </TouchableOpacity>
                        </View>

                        {dppLoading ? (
                            <ActivityIndicator size="large" color={C.primary} style={{ marginVertical: 40 }} />
                        ) : dppData ? (
                            <ScrollView showsVerticalScrollIndicator={false}>
                                {/* Integrity Badge */}
                                <View style={[s.dppIntegrityBanner, {
                                    backgroundColor: dppVerified ? C.greenLight : C.orangeLight
                                }]}>
                                    <Ionicons
                                        name={dppVerified ? 'shield-checkmark' : 'alert-circle'}
                                        size={20}
                                        color={dppVerified ? C.green : C.orange}
                                    />
                                    <View style={{ flex: 1, marginLeft: 10 }}>
                                        <Text style={[s.dppIntegrityTitle, {
                                            color: dppVerified ? C.green : C.orange
                                        }]}>
                                            {dppVerified ? 'Integrity Verified' : 'Verification Pending'}
                                        </Text>
                                        <Text style={s.dppIntegrityText}>
                                            {dppVerified
                                                ? 'SHA-256 hash matches — document has not been tampered with'
                                                : 'Hash verification could not be completed'}
                                        </Text>
                                    </View>
                                </View>

                                {/* Public Data Table */}
                                <Text style={s.dppSectionLabel}>Public Data</Text>
                                <View style={s.dppTable}>
                                    <DppRow label="Rubber Grade" value={dppData.rubberGrade} />
                                    <DppRow label="Quantity" value={`${dppData.quantity} kg`} />
                                    <DppRow label="Dispatch Details" value={dppData.dispatchDetails} />
                                    <DppRow label="Lifecycle State" value={dppData.lifecycleState} />
                                    <DppRow label="Created" value={new Date(dppData.createdAt).toLocaleDateString()} />
                                </View>

                                {/* Confidential Section */}
                                {dppData.confidentialDataExists && (
                                    <>
                                        <Text style={s.dppSectionLabel}>Confidential Data</Text>
                                        <View style={s.dppLockedSection}>
                                            <View style={s.dppLockedContent}>
                                                <Ionicons name="lock-closed" size={24} color={C.sub} />
                                                <Text style={s.dppLockedTitle}>Confidential Fields</Text>
                                                <Text style={s.dppLockedText}>
                                                    Price per Kg, Total Amount, Supplier Bank Details and other sensitive fields are encrypted. Only the exporter with the correct Request ID can unlock these fields on their device.
                                                </Text>
                                            </View>

                                            {/* Blurred placeholders */}
                                            <View style={s.dppBlurredRow}>
                                                <Text style={s.dppBlurredLabel}>Price per Kg</Text>
                                                <View style={s.dppBlurredValue}><Text style={s.dppBlurredText}>••••••••</Text></View>
                                            </View>
                                            <View style={s.dppBlurredRow}>
                                                <Text style={s.dppBlurredLabel}>Total Amount</Text>
                                                <View style={s.dppBlurredValue}><Text style={s.dppBlurredText}>••••••••</Text></View>
                                            </View>
                                            <View style={s.dppBlurredRow}>
                                                <Text style={s.dppBlurredLabel}>Bank Details</Text>
                                                <View style={s.dppBlurredValue}><Text style={s.dppBlurredText}>••••••••</Text></View>
                                            </View>
                                        </View>
                                    </>
                                )}

                                {/* DPP Hash Info */}
                                <View style={s.dppHashSection}>
                                    <Text style={s.dppHashLabel}>DPP Hash (SHA-256)</Text>
                                    <Text style={s.dppHashValue}>{dppData.dppHash}</Text>
                                </View>
                            </ScrollView>
                        ) : (
                            <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                                <Ionicons name="alert-circle-outline" size={40} color={C.sub} />
                                <Text style={s.emptyText}>Could not load DPP data</Text>
                            </View>
                        )}

                        <TouchableOpacity style={s.dppCloseBtn} onPress={() => setDppModal(false)}>
                            <Text style={s.dppCloseBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ═══ Confirm Request Modal ═══════════════════════════════════ */}
            <Modal visible={confirmModal.visible} transparent animationType="slide">
                <View style={s.modalBackdrop}>
                    <View style={s.confirmModalCard}>
                        <View style={s.confirmModalIconWrap}>
                            <Ionicons name="cart" size={32} color={C.primary} />
                        </View>
                        <Text style={s.confirmModalTitle}>Confirm Request</Text>
                        <Text style={s.confirmModalSubtitle}>
                            Are you sure you want to request the lot of <Text style={{ fontWeight: '700', color: C.textDark }}>{confirmModal.post?.grade}</Text> ({confirmModal.post?.quantityKg}kg) for <Text style={{ fontWeight: '700', color: C.textDark }}>LKR {confirmModal.post?.pricePerKg}/kg</Text>?
                        </Text>

                        <View style={s.confirmModalActions}>
                            <TouchableOpacity
                                style={s.confirmCancelBtn}
                                onPress={() => setConfirmModal({ visible: false, post: null })}
                            >
                                <Text style={s.confirmCancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={s.confirmRequestBtn}
                                onPress={confirmRequestPurchase}
                            >
                                <Text style={s.confirmRequestBtnText}>Confirm Request</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>

            {/* ═══ Success Alert Modal ═══════════════════════════════════ */}
            <Modal visible={successModal.visible} transparent animationType="fade">
                <View style={s.modalBackdrop}>
                    <View style={s.successModalCard}>
                        <View style={s.successModalIconWrap}>
                            <Ionicons name="checkmark-circle" size={48} color={C.green} />
                        </View>
                        <Text style={s.successModalTitle}>Request Sent!</Text>
                        <Text style={s.successModalSubtitle}>
                            Seller <Text style={{ fontWeight: '700', color: C.textDark }}>{successModal.sellerName}</Text> has been notified of your interest.
                        </Text>
                        <Text style={s.successModalInfoText}>
                            Once the seller reviews and accepts your request, a transaction will be created and you will be able to proceed.
                        </Text>

                        <TouchableOpacity
                            style={s.successContinueBtn}
                            onPress={handleSuccessContinue}
                        >
                            <Text style={s.successContinueBtnText}>Done</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>

            {/* ═══ Seller History Modal ═══════════════════════════════════ */}
            <Modal visible={historyModal} transparent animationType="slide">
                <View style={s.modalBackdrop}>
                    <View style={s.historyModalCard}>
                        <View style={s.historyModalHeader}>
                            <Ionicons name="stats-chart" size={24} color={C.primary} />
                            <Text style={s.historyModalTitle}>Seller History</Text>
                            <TouchableOpacity onPress={() => setHistoryModal(false)}>
                                <Ionicons name="close" size={22} color={C.sub} />
                            </TouchableOpacity>
                        </View>

                        {historyLoading ? (
                            <ActivityIndicator size="large" color={C.primary} style={{ marginVertical: 32 }} />
                        ) : buyerHistory ? (
                            <ScrollView>
                                <View style={s.historyGrid}>
                                    <HistoryStatBox label="Total Lots" value={buyerHistory.totalLots.toString()} color={C.blue} bg={C.blueLight} />
                                    <HistoryStatBox label="Accepted" value={buyerHistory.accepted.toString()} color={C.green} bg={C.greenLight} />
                                    <HistoryStatBox label="Rejected" value={buyerHistory.rejected.toString()} color={C.red} bg={C.redLight} />
                                    <HistoryStatBox label="Re-Inspect" value={buyerHistory.reInspections.toString()} color={C.orange} bg={C.orangeLight} />
                                </View>
                                <View style={s.historyRow}>
                                    <Text style={s.historyLabel}>Avg Quality Score</Text>
                                    <Text style={s.historyValue}>{buyerHistory.averageQuality}/100</Text>
                                </View>
                                <View style={s.historyRow}>
                                    <Text style={s.historyLabel}>DPP Verification</Text>
                                    <View style={[s.historyBadge, {
                                        backgroundColor: consistencyColor(buyerHistory.verificationConsistency) + '18'
                                    }]}>
                                        <Text style={[s.historyBadgeText, {
                                            color: consistencyColor(buyerHistory.verificationConsistency)
                                        }]}>
                                            {buyerHistory.verificationConsistency}
                                        </Text>
                                    </View>
                                </View>
                                {buyerHistory.lastActivityDate && (
                                    <Text style={s.historyLastActive}>
                                        Last active: {new Date(buyerHistory.lastActivityDate).toLocaleDateString()}
                                    </Text>
                                )}
                            </ScrollView>
                        ) : (
                            <Text style={s.historyError}>Could not load seller history.</Text>
                        )}

                        <TouchableOpacity style={s.historyCloseBtn} onPress={() => setHistoryModal(false)}>
                            <Text style={s.historyCloseBtnText}>Close</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

/* ─── DPP Table Row ───────────────────────────────────────────────── */
function DppRow({ label, value, isConfidential, isUnlocked }: {
    label: string; value: string; isConfidential?: boolean; isUnlocked?: boolean;
}) {
    return (
        <View style={s.dppRow}>
            <Text style={s.dppRowLabel}>{label}</Text>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, flex: 1, justifyContent: 'flex-end' }}>
                {isConfidential && isUnlocked && (
                    <Ionicons name="lock-open" size={12} color={C.green} />
                )}
                <Text style={[s.dppRowValue, isConfidential && isUnlocked && { color: C.primary }]}>
                    {value}
                </Text>
            </View>
        </View>
    );
}

/* ─── History Stat Box ────────────────────────────────────────────── */
function HistoryStatBox({ label, value, color, bg }: {
    label: string; value: string; color: string; bg: string;
}) {
    return (
        <View style={[s.historyStatBox, { backgroundColor: bg, borderColor: color + '33' }]}>
            <Text style={[s.historyStatValue, { color }]}>{value}</Text>
            <Text style={s.historyStatLabel}>{label}</Text>
        </View>
    );
}

/* ═══════════════════════════════════════════════════════════════════════
   Styles
   ═══════════════════════════════════════════════════════════════════════ */
const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },

    /* ── Header ────────────────── */
    header: {
        paddingTop: Platform.OS === 'ios' ? 54 : 44,
        paddingBottom: 0,
        paddingHorizontal: 20,
        overflow: 'hidden',
    },
    headerCircle1: {
        position: 'absolute', width: 180, height: 180, borderRadius: 90,
        backgroundColor: 'rgba(255,255,255,0.07)', top: -60, right: -40,
    },
    headerCircle2: {
        position: 'absolute', width: 120, height: 120, borderRadius: 60,
        backgroundColor: 'rgba(255,255,255,0.05)', bottom: 20, left: -30,
    },
    headerTop: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        marginBottom: 16,
    },
    profileSection: { flexDirection: 'row', alignItems: 'center', flex: 1, marginRight: 12 },
    avatarWrap: { marginRight: 12 },
    avatarRing: {
        width: 48, height: 48, borderRadius: 24, padding: 2,
        justifyContent: 'center', alignItems: 'center',
    },
    avatar: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.25)',
        justifyContent: 'center', alignItems: 'center',
    },
    avatarText: { fontSize: 17, fontWeight: '800', color: '#fff' },
    profileInfo: { flex: 1 },
    profileGreeting: { fontSize: 12, color: 'rgba(255,255,255,0.7)', fontWeight: '500' },
    profileName: { fontSize: 18, fontWeight: '800', color: '#fff', marginTop: 1 },
    headerActionBtn: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center', alignItems: 'center',
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.25)',
    },
    notifBadge: {
        position: 'absolute', top: -5, right: -6,
        backgroundColor: '#FF3B30', borderRadius: 8,
        minWidth: 16, height: 16, justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 2,
    },
    notifBadgeText: { color: '#FFF', fontSize: 10, fontWeight: '800' } as const,
    headerStrip: {
        flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.15)',
        borderRadius: 14, paddingVertical: 10, marginBottom: 16,
    },
    headerStripItem: { alignItems: 'center', flex: 1 },
    headerStripVal: { fontSize: 18, fontWeight: '800', color: '#fff' },
    headerStripLabel: { fontSize: 10, color: 'rgba(255,255,255,0.7)', marginTop: 1, fontWeight: '500' },
    headerStripDivider: { width: 1, height: 24, backgroundColor: 'rgba(255,255,255,0.2)' },

    /* ── Tab Bar ────────────────── */
    tabBar: {
        flexDirection: 'row', backgroundColor: C.card,
        paddingHorizontal: 8, paddingTop: 4,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    tabItem: {
        flex: 1, alignItems: 'center', paddingVertical: 10, position: 'relative',
    },
    tabItemActive: {},
    tabLabel: { fontSize: 11, fontWeight: '600', color: C.sub, marginTop: 3 },
    tabLabelActive: { color: C.primary, fontWeight: '700' },
    tabIndicator: {
        position: 'absolute', bottom: 0, width: 28, height: 3,
        backgroundColor: C.primary, borderTopLeftRadius: 3, borderTopRightRadius: 3,
    },

    /* ── Tab Content ────────────── */
    tabContent: { flex: 1 },
    tabContentInner: { paddingHorizontal: 20, paddingTop: 16 },

    /* ── Loading ────────────────── */
    loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 12 },
    loadingText: { fontSize: 14, color: C.sub, fontWeight: '500' },

    /* ── Section ────────────────── */
    sectionTitle: { fontSize: 16, fontWeight: '700', color: C.textDark, marginTop: 20, marginBottom: 10 },

    /* ── Empty State ────────────── */
    emptyCard: {
        backgroundColor: C.card, borderRadius: 16, padding: 32, alignItems: 'center',
        borderWidth: 1, borderColor: C.border, marginBottom: 16,
    },
    emptyText: { fontSize: 15, fontWeight: '600', color: C.textDark, marginTop: 12 },
    emptySub: { fontSize: 13, color: C.sub, textAlign: 'center', marginTop: 4 },

    /* ═══ OVERVIEW TAB ═══════════ */
    scanButton: { marginTop: 16 },
    scanGradient: {
        flexDirection: 'row', alignItems: 'center', padding: 18,
        borderRadius: 16, gap: 14,
    },
    scanIconWrap: {
        width: 50, height: 50, borderRadius: 14, backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center', alignItems: 'center',
    },
    scanTextWrap: { flex: 1 },
    scanTitle: { fontSize: 17, fontWeight: '700', color: '#FFF' },
    scanSub: { fontSize: 12, color: 'rgba(255,255,255,0.8)', marginTop: 2 },

    metricsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    metricCard: {
        width: '47.5%' as any, backgroundColor: C.card, borderRadius: 14, padding: 14,
        borderLeftWidth: 4, borderWidth: 1, borderColor: C.border,
    },
    metricIconWrap: {
        width: 34, height: 34, borderRadius: 10, justifyContent: 'center',
        alignItems: 'center', marginBottom: 8,
    },
    metricValue: { fontSize: 24, fontWeight: '800', color: C.textDark },
    metricLabel: { fontSize: 12, color: C.sub, marginTop: 2, fontWeight: '500' },

    quickRow: { flexDirection: 'row', gap: 12 },
    quickCard: {
        flex: 1, backgroundColor: C.card, borderRadius: 14, padding: 16,
        alignItems: 'center', borderWidth: 1, borderColor: C.border,
    },
    quickIconWrap: {
        width: 46, height: 46, borderRadius: 14,
        justifyContent: 'center', alignItems: 'center', marginBottom: 8,
    },
    quickLabel: { fontSize: 12, fontWeight: '600', color: C.textDark, textAlign: 'center', lineHeight: 16 },

    activityList: {
        backgroundColor: C.card, borderRadius: 14, overflow: 'hidden',
        borderWidth: 1, borderColor: C.border,
    },
    activityItem: {
        flexDirection: 'row', alignItems: 'center', padding: 14, gap: 12,
        borderBottomWidth: 1, borderBottomColor: C.borderLight,
    },
    activityDot: { width: 10, height: 10, borderRadius: 5 },
    activityContent: { flex: 1 },
    activityText: { fontSize: 14, fontWeight: '600', color: C.textDark },
    activityTime: { fontSize: 12, color: C.sub, marginTop: 2 },
    activityAction: {
        width: 34, height: 34, borderRadius: 10, backgroundColor: C.primaryPale,
        justifyContent: 'center', alignItems: 'center',
    },

    /* ═══ MARKETPLACE TAB ═══════ */
    filterSection: { paddingHorizontal: 20, paddingTop: 12 },
    searchBar: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: C.card,
        borderRadius: 12, paddingHorizontal: 14, paddingVertical: 10,
        borderWidth: 1, borderColor: C.border, gap: 8,
    },
    searchInput: { flex: 1, fontSize: 14, color: C.textDark, padding: 0 },
    filterChips: { flexDirection: 'row', marginTop: 10, marginBottom: 4 },
    filterChip: {
        paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20,
        backgroundColor: C.card, marginRight: 8,
        borderWidth: 1, borderColor: C.border,
    },
    filterChipActive: { backgroundColor: C.primary, borderColor: C.primary },
    filterChipText: { fontSize: 13, fontWeight: '600', color: C.sub },
    filterChipTextActive: { color: '#FFF' },
    resultsBar: { paddingHorizontal: 20, paddingTop: 12, paddingBottom: 6 },
    resultsText: { fontSize: 13, color: C.sub, fontWeight: '500' },

    lotCard: {
        backgroundColor: C.card, borderRadius: 16, padding: 18, marginBottom: 14,
        borderWidth: 1, borderColor: C.border,
    },
    lotHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 14 },
    lotTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    lotGrade: { fontSize: 19, fontWeight: '800', color: C.textDark },
    lotLocationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 },
    lotLocation: { fontSize: 13, color: C.sub },
    lotPriceWrap: { alignItems: 'flex-end' },
    lotPrice: { fontSize: 18, fontWeight: '800', color: C.primary },
    lotPriceUnit: { fontSize: 11, color: C.sub },

    dppBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: C.greenLight, paddingHorizontal: 8, paddingVertical: 3,
        borderRadius: 8,
    },
    dppBadgeText: { fontSize: 10, fontWeight: '700', color: C.green },

    lotDetails: {
        flexDirection: 'row', gap: 16, marginBottom: 14,
        backgroundColor: C.bg, borderRadius: 10, padding: 12,
    },
    lotDetailItem: { flex: 1, gap: 2 },
    lotDetailLabel: { fontSize: 11, color: C.sub, fontWeight: '500' },
    lotDetailValue: { fontSize: 14, fontWeight: '700', color: C.textDark },

    integrityBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: C.greenLight, borderRadius: 10, padding: 10, marginBottom: 14,
    },
    integrityText: { flex: 1, fontSize: 13, fontWeight: '600', color: C.green },

    lotActions: { flexDirection: 'row', gap: 10 },
    historyBtn: {
        flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, borderWidth: 1.5, borderColor: C.purple, borderRadius: 12,
        paddingVertical: 11,
    },
    historyBtnText: { fontSize: 13, fontWeight: '700', color: C.purple },
    purchaseBtn: {
        flex: 1.5, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 11,
    },
    purchaseBtnText: { fontSize: 14, fontWeight: '700', color: '#FFF' },

    /* ═══ TRANSACTIONS TAB ═════ */
    txCard: {
        backgroundColor: C.card, borderRadius: 14, padding: 16, marginBottom: 14,
        borderWidth: 1, borderColor: C.border,
    },
    txCardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    txOrderId: { fontSize: 15, fontWeight: '700', color: C.textDark },
    txSellerId: { fontSize: 12, color: C.sub, marginTop: 2 },
    txTotalPrice: { fontSize: 17, fontWeight: '800', color: C.textDark, textAlign: 'right' },
    txStatusBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 10, paddingVertical: 4, borderRadius: 16, marginTop: 4,
        alignSelf: 'flex-end',
    },
    txStatusDot: { width: 7, height: 7, borderRadius: 4 },
    txStatusText: { fontSize: 11, fontWeight: '700' },

    txDppLink: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: C.greenLight, borderRadius: 8, padding: 10, marginBottom: 12,
    },
    txDppLinkText: { flex: 1, fontSize: 12, fontWeight: '600', color: C.green },
    txViewDppBtn: {
        backgroundColor: C.green, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8,
    },
    txViewDppBtnText: { fontSize: 11, fontWeight: '700', color: '#FFF' },

    txActionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    txActionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        paddingHorizontal: 14, paddingVertical: 9, borderRadius: 10,
    },
    txActionBtnText: { color: '#FFF', fontSize: 12, fontWeight: '600' },

    encryptionNotice: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: C.borderLight,
    },
    encryptionNoticeText: { fontSize: 11, color: C.sub, flex: 1, fontStyle: 'italic' },

    /* ═══ CONFIRM REQUEST MODAL ═════════════ */
    confirmModalCard: {
        backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, alignItems: 'center',
    },
    confirmModalIconWrap: {
        width: 64, height: 64, borderRadius: 32,
        backgroundColor: C.primaryPale,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
    },
    confirmModalTitle: {
        fontSize: 20, fontWeight: '800', color: C.textDark, marginBottom: 8, textAlign: 'center',
    },
    confirmModalSubtitle: {
        fontSize: 15, color: C.sub, textAlign: 'center', marginBottom: 24, lineHeight: 22, paddingHorizontal: 10,
    },
    confirmModalActions: {
        flexDirection: 'row', gap: 12, width: '100%',
    },
    confirmCancelBtn: {
        flex: 1, backgroundColor: C.bg, borderRadius: 12, paddingVertical: 14,
        alignItems: 'center', borderWidth: 1, borderColor: C.border,
    },
    confirmCancelBtnText: {
        fontSize: 15, fontWeight: '700', color: C.sub,
    },
    confirmRequestBtn: {
        flex: 1, backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14,
        alignItems: 'center',
    },
    confirmRequestBtnText: {
        fontSize: 15, fontWeight: '700', color: '#FFF',
    },

    /* ═══ SUCCESS MODAL ═════════════ */
    successModalCard: {
        backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, paddingBottom: Platform.OS === 'ios' ? 40 : 24, alignItems: 'center',
    },
    successModalIconWrap: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: C.greenLight,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 16,
    },
    successModalTitle: {
        fontSize: 22, fontWeight: '800', color: C.green, marginBottom: 8, textAlign: 'center',
    },
    successModalSubtitle: {
        fontSize: 15, color: C.sub, textAlign: 'center', marginBottom: 12, lineHeight: 22,
    },
    successModalInfoText: {
        fontSize: 13, color: C.sub, textAlign: 'center', marginBottom: 24, fontStyle: 'italic', paddingHorizontal: 10,
    },
    successContinueBtn: {
        width: '100%', backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14,
        alignItems: 'center',
        shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.2, shadowRadius: 8, elevation: 3,
    },
    successContinueBtnText: {
        fontSize: 16, fontWeight: '700', color: '#FFF',
    },

    /* ═══ DPP MODAL ═════════════ */
    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
    dppModalCard: {
        backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, maxHeight: '80%',
    },
    dppModalHeader: {
        flexDirection: 'row', alignItems: 'flex-start', marginBottom: 20,
    },
    dppModalTitle: { fontSize: 18, fontWeight: '800', color: C.textDark },
    dppModalSubtitle: { fontSize: 13, color: C.sub, marginTop: 2 },

    dppIntegrityBanner: {
        flexDirection: 'row', alignItems: 'flex-start', borderRadius: 12, padding: 14, marginBottom: 18,
    },
    dppIntegrityTitle: { fontSize: 14, fontWeight: '700' },
    dppIntegrityText: { fontSize: 12, color: C.sub, marginTop: 2, lineHeight: 17 },

    dppSectionLabel: {
        fontSize: 13, fontWeight: '700', color: C.textDark,
        textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 8, marginTop: 4,
    },
    dppTable: {
        backgroundColor: C.bg, borderRadius: 12, overflow: 'hidden', marginBottom: 16,
    },
    dppRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingHorizontal: 14, paddingVertical: 12,
        borderBottomWidth: 1, borderBottomColor: C.border,
    },
    dppRowLabel: { fontSize: 13, color: C.sub, fontWeight: '500' },
    dppRowValue: { fontSize: 14, fontWeight: '600', color: C.textDark, textAlign: 'right' },

    dppLockedSection: {
        backgroundColor: '#F5F5F5', borderRadius: 12, padding: 16, marginBottom: 16,
        borderWidth: 1, borderColor: '#E0E0E0', borderStyle: 'dashed',
    },
    dppLockedContent: { alignItems: 'center', marginBottom: 16 },
    dppLockedTitle: { fontSize: 15, fontWeight: '700', color: C.sub, marginTop: 8 },
    dppLockedText: { fontSize: 12, color: C.sub, textAlign: 'center', marginTop: 4, lineHeight: 17 },

    dppBlurredRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#E8E8E8',
    },
    dppBlurredLabel: { fontSize: 13, color: '#BDBDBD', fontWeight: '500' },
    dppBlurredValue: { backgroundColor: '#E0E0E0', borderRadius: 6, paddingHorizontal: 14, paddingVertical: 4 },
    dppBlurredText: { fontSize: 13, color: '#BDBDBD', letterSpacing: 2 },

    dppHashSection: {
        backgroundColor: C.bg, borderRadius: 10, padding: 12, marginBottom: 8,
    },
    dppHashLabel: { fontSize: 11, color: C.sub, fontWeight: '600', marginBottom: 4 },
    dppHashValue: { fontSize: 11, color: C.textDark, fontFamily: 'monospace' },

    dppCloseBtn: {
        backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14,
        alignItems: 'center', marginTop: 12,
    },
    dppCloseBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

    /* ═══ HISTORY MODAL ═════════ */
    historyModalCard: {
        backgroundColor: C.card, borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 24, maxHeight: '60%',
    },
    historyModalHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 20,
    },
    historyModalTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: C.textDark },
    historyGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 16 },
    historyStatBox: {
        flex: 1, minWidth: '45%' as any, alignItems: 'center', padding: 14,
        borderRadius: 12, borderWidth: 1.5,
    },
    historyStatValue: { fontSize: 22, fontWeight: '800' },
    historyStatLabel: { fontSize: 11, color: C.sub, marginTop: 4, textAlign: 'center' },
    historyRow: {
        flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
        paddingVertical: 12, borderTopWidth: 1, borderTopColor: C.borderLight,
    },
    historyLabel: { fontSize: 14, color: C.sub, fontWeight: '600' },
    historyValue: { fontSize: 18, fontWeight: '800', color: C.textDark },
    historyBadge: { paddingHorizontal: 14, paddingVertical: 6, borderRadius: 16 },
    historyBadgeText: { fontWeight: '800', fontSize: 13 },
    historyLastActive: { color: C.sub, fontSize: 12, textAlign: 'center', marginTop: 8 },
    historyError: { color: C.sub, textAlign: 'center', marginVertical: 24 },
    historyCloseBtn: {
        backgroundColor: C.primary, borderRadius: 14, paddingVertical: 14,
        alignItems: 'center', marginTop: 12,
    },
    historyCloseBtnText: { color: '#FFF', fontWeight: '700', fontSize: 15 },

    /* ═══ RECENT SALES (Overview) ═══════════ */
    saleCard: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: C.card, borderRadius: 14, padding: 14, marginBottom: 10,
        borderWidth: 1, borderColor: C.border,
    },
    saleIconWrap: { width: 42, height: 42, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
    saleInfo: { flex: 1 },
    saleOrderId: { fontSize: 14, fontWeight: '700', color: C.textDark },
    saleSellerId: { fontSize: 12, color: C.sub, marginTop: 2 },
    saleRight: { alignItems: 'flex-end', gap: 4 },
    salePrice: { fontSize: 15, fontWeight: '800', color: C.textDark },
    saleBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
    saleDot: { width: 6, height: 6, borderRadius: 3 },
    saleBadgeText: { fontSize: 10, fontWeight: '700' },

    seeMoreBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, paddingVertical: 10, marginBottom: 4,
    },
    seeMoreText: { fontSize: 13, fontWeight: '600', color: C.primary },
});
