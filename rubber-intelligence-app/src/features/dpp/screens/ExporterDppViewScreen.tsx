/**
 * ExporterDppViewScreen
 *
 * Displays the Digital Product Passport (DPP) for a specific transaction,
 * as seen by the Exporter who purchased the lot.
 *
 * The DPP is assembled from:
 *   • Invoice extracted fields (uploaded by the Buyer after purchase)
 *   • QIR (Quality Inspection Report) extracted fields (uploaded after invoice)
 *
 * Access rule (enforced on both frontend and backend):
 *   ─ Only reachable when `user.role === 'Exporter'`
 *   ─ Backend checks `transaction.exporterId === requesterId` (403 otherwise)
 *
 * Confidential buyer data (e.g. commercial pricing terms) is withheld.
 * Those fields are displayed with a 🔒 badge and value shown as "Protected".
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, ActivityIndicator, Alert, Modal, Image, Dimensions
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { getExporterTransactionDpp, getInvoiceFileUri } from '../services/marketplaceService';
import { ExporterDppView, ExporterDppField } from '../types';
import { WebView } from 'react-native-webview';

// ── Palette (matches MarketplaceScreen green theme) ───────────────────
const C = {
    primary: '#2E7D32',
    primaryDark: '#1B5E20',
    primaryLight: '#4CAF50',
    primaryPale: '#E8F5E9',
    teal: '#00BCD4',
    amber: '#FF9500',
    green: '#34C759',
    red: '#FF3B30',
    blue: '#2196F3',
    purple: '#7E57C2',
    bg: '#F1F8E9',
    white: '#FFFFFF',
    textPrimary: '#1C1C1E',
    textSub: '#6B7B6E',
    border: '#C8E6C9',
};

// ── Status metadata ───────────────────────────────────────────────────
function statusMeta(status: string): { label: string; color: string; bg: string } {
    switch (status) {
        case 'QirUploaded': return { label: 'QIR Uploaded', color: C.teal, bg: '#E0F7FA' };
        case 'InvoiceUploaded': return { label: 'Invoice Uploaded', color: C.blue, bg: '#E3F2FD' };
        case 'Completed': return { label: 'Completed', color: C.green, bg: '#E8FAE8' };
        default: return { label: status, color: C.amber, bg: '#FFF8E1' };
    }
}

// ── Human-readable field name ──────────────────────────────────────────
function humanize(key: string): string {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, s => s.toUpperCase())
        .trim();
}

// ── Single field row ──────────────────────────────────────────────────
function FieldRow({ field, accent }: { field: ExporterDppField; accent: string }) {
    const isProtected = field.isConfidential;
    const displayVal = isProtected ? 'Protected — buyer confidential' : (field.value ?? '—');
    return (
        <View style={[
            st.fieldRow,
            isProtected ? st.fieldRowProtected : { borderColor: C.border },
        ]}>
            <View style={[st.fieldIconWrap, { backgroundColor: isProtected ? '#FFF0EE' : C.primaryPale }]}>
                <Ionicons
                    name={isProtected ? 'lock-closed' : 'document-text-outline'}
                    size={16}
                    color={isProtected ? C.red : accent}
                />
            </View>
            <View style={st.fieldContent}>
                <Text style={st.fieldName}>{humanize(field.fieldName)}</Text>
                <Text style={[
                    st.fieldValue,
                    isProtected && st.fieldValueProtected,
                ]}>
                    {displayVal}
                </Text>
            </View>
            <View style={[st.badge, isProtected ? st.badgeLocked : st.badgePublic]}>
                <Text style={[st.badgeText, isProtected ? st.badgeTextLocked : st.badgeTextPublic]}>
                    {isProtected ? 'PROTECTED' : 'PUBLIC'}
                </Text>
            </View>
        </View>
    );
}

// ── Section header ────────────────────────────────────────────────────
function SectionHeader({
    icon, title, subtitle, accentColor,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    title: string;
    subtitle?: string;
    accentColor: string;
}) {
    return (
        <View style={[st.sectionHeader, { borderLeftColor: accentColor }]}>
            <Ionicons name={icon} size={18} color={accentColor} />
            <View>
                <Text style={[st.sectionTitle, { color: accentColor }]}>{title}</Text>
                {subtitle ? <Text style={st.sectionSub}>{subtitle}</Text> : null}
            </View>
        </View>
    );
}

// ── Stat chip ─────────────────────────────────────────────────────────
function StatChip({
    icon, label, color, bg,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    color: string;
    bg: string;
}) {
    return (
        <View style={[st.statChip, { backgroundColor: bg }]}>
            <Ionicons name={icon} size={14} color={color} />
            <Text style={[st.statChipText, { color }]}>{label}</Text>
        </View>
    );
}

// ═════════════════════════════════════════════════════════════════════════
// Screen
// ═════════════════════════════════════════════════════════════════════════
export default function ExporterDppViewScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { transactionId } = route.params as { transactionId: string };

    const [dpp, setDpp] = useState<ExporterDppView | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [downloadingInv, setDownloadingInv] = useState(false);
    const [downloadingPlain, setDownloadingPlain] = useState(false);

    // Document Viewer Modal State
    const [viewerVisible, setViewerVisible] = useState(false);
    const [viewerUri, setViewerUri] = useState<string | null>(null);
    const [viewerMime, setViewerMime] = useState<string | null>(null);

    const handleViewInvoice = async () => {
        setDownloadingInv(true);
        try {
            const { uri, mimeType } = await getInvoiceFileUri(transactionId);
            setViewerUri(uri);
            setViewerMime(mimeType);
            setViewerVisible(true);
        } catch (e: any) {
            Alert.alert('Decrypt Failed', e.message || 'Could not fetch or decrypt the document.');
        } finally {
            setDownloadingInv(false);
        }
    };

    const handleViewPlainInvoice = async () => {
        setDownloadingPlain(true);
        try {
            const { uri, mimeType } = await getInvoiceFileUri(transactionId);
            setViewerUri(uri);
            setViewerMime(mimeType);
            setViewerVisible(true);
        } catch (e: any) {
            Alert.alert('Could Not Open Document', e.message || 'Could not fetch the source document.');
        } finally {
            setDownloadingPlain(false);
        }
    };

    const loadDpp = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getExporterTransactionDpp(transactionId);
            setDpp(data);
        } catch (e: any) {
            setError(
                e?.response?.data?.error ??
                e?.message ??
                'Failed to load DPP. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    }, [transactionId]);

    useEffect(() => { loadDpp(); }, [loadDpp]);

    // ── derived ────────────────────────────────────────────────────────
    const invPublic = dpp?.invoiceFields.filter(f => !f.isConfidential) ?? [];
    const invConf = dpp?.invoiceFields.filter(f => f.isConfidential) ?? [];
    const qirPublic = dpp?.qirFields.filter(f => !f.isConfidential) ?? [];
    const qirConf = dpp?.qirFields.filter(f => f.isConfidential) ?? [];
    const stMeta = dpp ? statusMeta(dpp.status) : null;
    const hasQir = dpp ? dpp.qirFields.length > 0 : false;

    // ── render ────────────────────────────────────────────────────────
    return (
        <View style={st.container}>

            {/* ══ HEADER ══ */}
            <LinearGradient
                colors={[C.primaryDark, C.primary, C.primaryLight]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={st.header}
            >
                <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={st.headerTitle}>Digital Product Passport</Text>
                    <Text style={st.headerSub}>
                        Order {transactionId.substring(0, 8)}…
                    </Text>
                </View>
                <View style={st.dppBadge}>
                    <Ionicons name="shield-checkmark" size={15} color="#fff" />
                    <Text style={st.dppBadgeText}>DPP</Text>
                </View>
            </LinearGradient>

            {/* ══ BODY ══ */}
            {loading ? (
                <View style={st.centred}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <Text style={st.loadingText}>Loading DPP…</Text>
                </View>
            ) : error ? (
                <View style={st.centred}>
                    <Ionicons name="alert-circle" size={56} color={C.red} />
                    <Text style={st.errorTitle}>Could Not Load DPP</Text>
                    <Text style={st.errorBody}>{error}</Text>
                    <TouchableOpacity style={st.retryBtn} onPress={loadDpp}>
                        <Ionicons name="refresh" size={18} color="#fff" />
                        <Text style={st.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : dpp ? (
                <ScrollView
                    contentContainerStyle={st.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Lot summary card ── */}
                    <View style={st.summaryCard}>
                        <View style={st.summaryRow}>
                            <View style={st.summaryIconWrap}>
                                <Ionicons name="leaf" size={22} color={C.primary} />
                            </View>
                            <View style={{ flex: 1, marginLeft: 12 }}>
                                <Text style={st.summaryLabel}>Transaction</Text>
                                <Text style={st.summaryValue}>#{dpp.transactionId.substring(0, 12)}…</Text>
                            </View>
                            {stMeta && (
                                <View style={[st.statusBadge, { backgroundColor: stMeta.bg }]}>
                                    <Text style={[st.statusBadgeText, { color: stMeta.color }]}>
                                        {stMeta.label}
                                    </Text>
                                </View>
                            )}
                        </View>
                        <View style={st.summaryDivider} />
                        <View style={st.summaryGrid}>
                            <View style={st.summaryGridItem}>
                                <Text style={st.summaryGridLabel}>Lot Value</Text>
                                <Text style={st.summaryGridValue}>LKR {dpp.offerPrice.toLocaleString()}</Text>
                            </View>
                            <View style={st.summaryGridItem}>
                                <Text style={st.summaryGridLabel}>Buyer Ref</Text>
                                <Text style={st.summaryGridValue}>{dpp.buyerRef}…</Text>
                            </View>
                            <View style={st.summaryGridItem}>
                                <Text style={st.summaryGridLabel}>Last Updated</Text>
                                <Text style={st.summaryGridValue}>
                                    {new Date(dpp.lastUpdatedAt).toLocaleDateString()}
                                </Text>
                            </View>
                            <View style={st.summaryGridItem}>
                                <Text style={st.summaryGridLabel}>Generated</Text>
                                <Text style={st.summaryGridValue}>
                                    {new Date(dpp.generatedAt).toLocaleDateString()}
                                </Text>
                            </View>
                        </View>
                    </View>

                    {/* ── Classification chips ── */}
                    <View style={st.chipsRow}>
                        <StatChip
                            icon="document-text-outline"
                            label={`Invoice · ${dpp.invoiceFields.length} fields`}
                            color={C.blue}
                            bg="#E3F2FD"
                        />
                        {hasQir && (
                            <StatChip
                                icon="ribbon-outline"
                                label={`QIR · ${dpp.qirFields.length} fields`}
                                color={C.primary}
                                bg={C.primaryPale}
                            />
                        )}
                        <StatChip
                            icon="lock-closed"
                            label={`${invConf.length + qirConf.length} protected`}
                            color={C.red}
                            bg="#FFF0EE"
                        />
                    </View>

                    {/* ── DPP classification row ── */}
                    {(dpp.invoiceClassification || dpp.qirClassification) && (
                        <View style={st.classRow}>
                            <Ionicons name="analytics-outline" size={16} color={C.teal} />
                            <Text style={st.classText}>
                                ONNX Classification:{' '}
                                <Text style={st.classValue}>
                                    {dpp.invoiceClassification ?? dpp.qirClassification}
                                </Text>
                            </Text>
                        </View>
                    )}

                    {/* ── SCAN QR VERIFICATION BUTTON ── */}
                    <TouchableOpacity
                        style={st.scanQrBtn}
                        onPress={() => navigation.navigate('ExporterScanner', { expectedLotId: transactionId })}
                    >
                        <Ionicons name="qr-code-outline" size={24} color={C.white} />
                        <Text style={st.scanQrBtnText}>Scan Physical Lot QR Code</Text>
                        <Ionicons name="chevron-forward" size={20} color={C.white} style={{ marginLeft: 'auto' }} />
                    </TouchableOpacity>

                    {/* ════════════════════════════════════════════
                        INVOICE SECTION
                    ════════════════════════════════════════════ */}
                    {dpp.invoiceFields.length > 0 ? (
                        <>
                            <SectionHeader
                                icon="document-text-outline"
                                title="Invoice Fields"
                                subtitle={`${invPublic.length} public · ${invConf.length} protected`}
                                accentColor={C.blue}
                            />

                            {/* ── CONFIDENTIAL: show decrypt button ── */}
                            {dpp.invoiceClassification === 'CONFIDENTIAL' && (
                                <TouchableOpacity
                                    style={st.downloadDocBtn}
                                    onPress={handleViewInvoice}
                                    disabled={downloadingInv}
                                >
                                    <Ionicons name="document-lock-outline" size={20} color={C.blue} />
                                    <Text style={st.downloadDocBtnText}>
                                        {downloadingInv ? 'Decrypting Source Document...' : 'View Decrypted Source Document'}
                                    </Text>
                                    {downloadingInv
                                        ? <ActivityIndicator size="small" color={C.blue} />
                                        : <Ionicons name="lock-open-outline" size={20} color={C.blue} />}
                                </TouchableOpacity>
                            )}

                            {/* ── NON_CONFIDENTIAL: show plain view button ── */}
                            {dpp.invoiceClassification !== 'CONFIDENTIAL' && dpp.invoiceClassification != null && (
                                <TouchableOpacity
                                    style={st.viewPlainDocBtn}
                                    onPress={handleViewPlainInvoice}
                                    disabled={downloadingPlain}
                                >
                                    <Ionicons name="document-outline" size={20} color={C.primary} />
                                    <Text style={st.viewPlainDocBtnText}>
                                        {downloadingPlain ? 'Opening Document...' : 'View Non-Confidential Document'}
                                    </Text>
                                    {downloadingPlain
                                        ? <ActivityIndicator size="small" color={C.primary} />
                                        : <Ionicons name="eye-outline" size={20} color={C.primary} />}
                                </TouchableOpacity>
                            )}

                            {dpp.invoiceFields.map((f, i) => (
                                <FieldRow key={`inv-${i}`} field={f} accent={C.blue} />
                            ))}
                        </>
                    ) : (
                        <View style={st.emptySection}>
                            <Ionicons name="document-outline" size={32} color={C.textSub} />
                            <Text style={st.emptySectionText}>Invoice not yet uploaded by the buyer.</Text>
                        </View>
                    )}

                    {/* ════════════════════════════════════════════
                        QIR SECTION
                    ════════════════════════════════════════════ */}
                    {hasQir ? (
                        <>
                            <SectionHeader
                                icon="ribbon-outline"
                                title="Quality Inspection Report"
                                subtitle={`${qirPublic.length} public · ${qirConf.length} protected`}
                                accentColor={C.primary}
                            />
                            {dpp.qirFields.map((f, i) => (
                                <FieldRow key={`qir-${i}`} field={f} accent={C.primary} />
                            ))}
                        </>
                    ) : (
                        <View style={[st.emptySection, { marginTop: 4 }]}>
                            <Ionicons name="ribbon-outline" size={32} color={C.textSub} />
                            <Text style={st.emptySectionText}>
                                Quality Inspection Report not yet uploaded.
                            </Text>
                        </View>
                    )}

                    {/* ── Security / access notice ── */}
                    <View style={st.noticeCard}>
                        <Ionicons name="information-circle-outline" size={16} color={C.blue} />
                        <Text style={st.noticeText}>
                            <Text style={st.noticeBold}>Protected fields</Text> contain the buyer's confidential
                            commercial data (e.g. pricing terms, payment details). To request access,
                            use the{' '}
                            <Text style={st.noticeLink}>Confidential Access</Text> workflow from the lot DPP.
                        </Text>
                    </View>

                    {/* ── Security footer ── */}
                    <View style={st.footer}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={C.textSub} />
                        <Text style={st.footerText}>
                            DPP generated on demand · AES-256-CBC field encryption ·
                            Confidential buyer data withheld · Access logged
                        </Text>
                    </View>
                </ScrollView>
            ) : null}

            {/* ══ IN-APP DOCUMENT VIEWER MODAL ══ */}
            <Modal
                visible={viewerVisible}
                animationType="slide"
                presentationStyle="pageSheet"
                onRequestClose={() => setViewerVisible(false)}
            >
                <View style={st.viewerContainer}>
                    <View style={st.viewerHeader}>
                        <TouchableOpacity style={st.viewerCloseBtn} onPress={() => setViewerVisible(false)}>
                            <Text style={st.viewerCloseText}>Close</Text>
                        </TouchableOpacity>
                        <Text style={st.viewerTitle}>Source Document</Text>
                        <View style={{ width: 60 }} />
                    </View>

                    <View style={st.viewerBody}>
                        {viewerUri && viewerMime ? (
                            viewerMime.includes('pdf') ? (
                                <WebView
                                    style={{ flex: 1 }}
                                    source={{ uri: viewerUri }}
                                    allowFileAccess={true}
                                />
                            ) : (
                                <Image
                                    source={{ uri: viewerUri }}
                                    style={st.viewerImage}
                                    resizeMode="contain"
                                />
                            )
                        ) : (
                            <ActivityIndicator size="large" color="#fff" />
                        )}
                    </View>
                </View>
            </Modal>
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────
const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },

    /* Header */
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingTop: 52, paddingBottom: 18, paddingHorizontal: 16, gap: 10,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle: { fontSize: 18, fontWeight: '700', color: '#fff' },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
    dppBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 5,
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingHorizontal: 12, paddingVertical: 6, borderRadius: 14,
    },
    dppBadgeText: { fontSize: 12, fontWeight: '800', color: '#fff', letterSpacing: 1 },

    /* Centred states */
    centred: {
        flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 14,
    },
    loadingText: { fontSize: 14, color: C.textSub, marginTop: 8 },
    errorTitle: { fontSize: 18, fontWeight: '700', color: C.textPrimary },
    errorBody: { fontSize: 14, color: C.textSub, textAlign: 'center', lineHeight: 20 },
    retryBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: C.primary, paddingHorizontal: 24, paddingVertical: 12,
        borderRadius: 12, marginTop: 6,
    },
    retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    /* Scroll */
    scrollContent: { padding: 16, paddingBottom: 48 },

    /* Summary card */
    summaryCard: {
        backgroundColor: C.white, borderRadius: 18,
        padding: 16, marginBottom: 16,
        borderWidth: 1, borderColor: C.border,
        shadowColor: C.primary, shadowOpacity: 0.07, shadowRadius: 8, elevation: 2,
    },
    summaryRow: { flexDirection: 'row', alignItems: 'center' },
    summaryIconWrap: {
        width: 44, height: 44, borderRadius: 14,
        backgroundColor: C.primaryPale,
        justifyContent: 'center', alignItems: 'center',
    },
    summaryLabel: { fontSize: 11, color: C.textSub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
    summaryValue: { fontSize: 15, fontWeight: '700', color: C.textPrimary, marginTop: 1 },
    statusBadge: {
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10,
    },
    statusBadgeText: { fontSize: 11, fontWeight: '800' },
    summaryDivider: { height: 1, backgroundColor: C.border, marginVertical: 14 },
    summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
    summaryGridItem: { flex: 1, minWidth: '42%' },
    summaryGridLabel: { fontSize: 11, color: C.textSub, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.4 },
    summaryGridValue: { fontSize: 14, fontWeight: '700', color: C.textPrimary, marginTop: 2 },

    /* Chips */
    chipsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 14 },
    statChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    },
    statChipText: { fontSize: 12, fontWeight: '600' },

    /* Classification row */
    classRow: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: '#E0F7FA', padding: 10, borderRadius: 10, marginBottom: 18,
    },
    classText: { fontSize: 13, color: C.textPrimary, flex: 1 },
    classValue: { fontWeight: '700', color: C.teal },

    /* Section header */
    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderLeftWidth: 3, paddingLeft: 10, marginBottom: 12, marginTop: 20,
    },
    sectionTitle: { fontSize: 15, fontWeight: '700' },
    sectionSub: { fontSize: 11, color: C.textSub, marginTop: 1 },

    /* Field row */
    fieldRow: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: C.white, borderRadius: 14,
        padding: 12, marginBottom: 8,
        borderWidth: 1, gap: 10,
    },
    fieldRowProtected: { backgroundColor: '#FFF5F5', borderColor: '#FECACA' },
    fieldIconWrap: {
        width: 36, height: 36, borderRadius: 10,
        justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    },
    fieldContent: { flex: 1 },
    fieldName: { fontSize: 11, fontWeight: '600', color: C.textSub, marginBottom: 2 },
    fieldValue: { fontSize: 14, fontWeight: '700', color: C.textPrimary },
    fieldValueProtected: { fontSize: 13, fontWeight: '500', color: '#B0B0B0', fontStyle: 'italic' },

    /* Badges */
    badge: {
        paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start',
    },
    badgePublic: { backgroundColor: '#DCFCE7' },
    badgeLocked: { backgroundColor: '#FEE2E2' },
    badgeText: { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
    badgeTextPublic: { color: '#16A34A' },
    badgeTextLocked: { color: '#DC2626' },

    /* Empty section */
    emptySection: {
        alignItems: 'center', paddingVertical: 28, gap: 8,
        backgroundColor: C.white, borderRadius: 14, borderWidth: 1,
        borderColor: C.border, marginTop: 12, marginBottom: 4,
    },
    emptySectionText: { fontSize: 13, color: C.textSub, textAlign: 'center' },

    /* Notice */
    noticeCard: {
        flexDirection: 'row', alignItems: 'flex-start', gap: 10,
        backgroundColor: '#E3F2FD', padding: 14, borderRadius: 12,
        borderWidth: 1, borderColor: '#BBDEFB', marginTop: 24,
    },
    noticeText: { flex: 1, fontSize: 12, color: '#1565C0', lineHeight: 18 },
    noticeBold: { fontWeight: '700' },
    noticeLink: { fontWeight: '700', textDecorationLine: 'underline' },

    /* Footer */
    footer: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        marginTop: 16, padding: 14,
        backgroundColor: C.white, borderRadius: 12,
        borderWidth: 1, borderColor: C.border,
    },
    footerText: { fontSize: 11, color: C.textSub, flex: 1, lineHeight: 16 },

    /* Action Button for Docs — CONFIDENTIAL (blue, lock) */
    downloadDocBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#E3F2FD', padding: 14,
        borderRadius: 12, marginBottom: 16,
        borderWidth: 1, borderColor: '#BBDEFB'
    },
    downloadDocBtnText: {
        flex: 1, marginLeft: 10,
        color: '#1565C0', fontWeight: '700', fontSize: 13
    },

    /* Action Button for Docs — NON_CONFIDENTIAL (green, open) */
    viewPlainDocBtn: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#E8F5E9', padding: 14,
        borderRadius: 12, marginBottom: 16,
        borderWidth: 1, borderColor: '#C8E6C9'
    },
    viewPlainDocBtnText: {
        flex: 1, marginLeft: 10,
        color: '#2E7D32', fontWeight: '700', fontSize: 13
    },

    /* Scan QR Button */
    scanQrBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 12,
        backgroundColor: '#1C1C1E', padding: 16, borderRadius: 16,
        marginBottom: 20,
        shadowColor: '#000', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2, shadowRadius: 8, elevation: 4,
    },
    scanQrBtnText: { color: C.white, fontSize: 15, fontWeight: '700' },

    /* Viewer Modal */
    viewerContainer: {
        flex: 1, backgroundColor: '#000',
    },
    viewerHeader: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingTop: 50, paddingBottom: 15, paddingHorizontal: 16,
        backgroundColor: '#1C1C1E',
        borderBottomWidth: 1, borderBottomColor: '#333'
    },
    viewerTitle: {
        color: '#fff', fontSize: 16, fontWeight: '600'
    },
    viewerCloseBtn: {
        width: 60, alignItems: 'flex-start'
    },
    viewerCloseText: {
        color: C.blue, fontSize: 16, fontWeight: '600'
    },
    viewerBody: {
        flex: 1, justifyContent: 'center', alignItems: 'center'
    },
    viewerImage: {
        width: Dimensions.get('window').width,
        height: Dimensions.get('window').height - 100,
    }
});
