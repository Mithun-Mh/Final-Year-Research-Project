/**
 * DualLayerDppScreen — EXPORTER ONLY
 *
 * Conditional "Bank Statement" Zero-Knowledge Encryption Model
 * ─────────────────────────────────────────────────────────────
 *  1. Fetches GET /api/Marketplace/transactions/{id}/dual-layer-dpp
 *  2. Displays the PUBLIC SUMMARY (LotId, RubberGrade, Quantity, DppHash)
 *     and a QR code containing the DppHash for physical verification.
 *  3. PUBLIC documents: shows a "View Document" button.
 *  4. CONFIDENTIAL documents: shows a 🔒 Locked Document card.
 *     The exporter first claims their one-time key via
 *     GET /transactions/{id}/my-secret.  When they enter it,
 *     crypto-js PBKDF2-SHA256 (100 000 iterations, keySize 12 = 48 bytes)
 *     derives the AES-256-CBC key[0..31] + IV[32..47] from
 *     (password=SecretRequestId, salt=transactionId).
 *     Decryption is FULLY CLIENT-SIDE — the backend never sees the key.
 *  5. Physical QR Verification is handled by ExporterScannerScreen.
 *
 * Zero-Knowledge guarantee: After the buyer uploads the invoice the
 * SecretRequestId is permanently nullified in MongoDB. Only the exporter's
 * device holds the key. Even a full database leak cannot expose
 * CONFIDENTIAL files.
 */

import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TextInput,
    TouchableOpacity, ActivityIndicator, Alert, Modal, Platform,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import QRCode from 'react-native-qrcode-svg';
import CryptoJS from 'crypto-js';
import { claimSecret, getDualLayerDpp } from '../services/marketplaceService';
import { DualLayerDppResponse } from '../types';

// ── Palette ────────────────────────────────────────────────────────────
const C = {
    primary: '#2E7D32',
    primaryDark: '#1B5E20',
    primaryPale: '#E8F5E9',
    teal: '#00BCD4',
    amber: '#FF9500',
    green: '#34C759',
    red: '#FF3B30',
    blue: '#2196F3',
    purple: '#7E57C2',
    gold: '#F59E0B',
    bg: '#F1F8E9',
    white: '#FFFFFF',
    textPrimary: '#1C1C1E',
    textSub: '#6B7B6E',
    border: '#C8E6C9',
    vaultBg: '#0D1B2A',
    vaultCard: '#1B2838',
};

// ── PBKDF2-AES-256-CBC client-side decryption (crypto-js) ──────────────
/**
 * Single 48-byte PBKDF2-SHA256 derivation → AES-256-CBC decrypt.
 *
 * Mirrors ZeroKnowledgeEncryptionService.cs:
 *   Password   = secretRequestId
 *   Salt       = UTF-8 bytes of transactionId
 *   Iterations = 100 000
 *   Hash       = SHA-256
 *   keySize    = 12  → 12 words × 4 bytes = 48 bytes
 *   Derived[0..31]  = AES-256 key  (words 0-7)
 *   Derived[32..47] = IV           (words 8-11)
 */
function decryptWithPbkdf2(
    ciphertextBase64: string,
    secretRequestId: string,
    transactionId: string,
): string {
    const salt = CryptoJS.enc.Utf8.parse(transactionId);

    const derived = CryptoJS.PBKDF2(secretRequestId, salt, {
        keySize: 12,          // 12 words = 48 bytes
        iterations: 100_000,
        hasher: CryptoJS.algo.SHA256,
    });

    const key = CryptoJS.lib.WordArray.create(derived.words.slice(0, 8));   // 32 bytes
    const iv = CryptoJS.lib.WordArray.create(derived.words.slice(8, 12));  // 16 bytes

    const decrypted = CryptoJS.AES.decrypt(ciphertextBase64, key, {
        iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7,
    });

    const plaintext = decrypted.toString(CryptoJS.enc.Utf8);
    if (!plaintext) {
        throw new Error('Decryption failed — wrong SecretRequestId or corrupted data.');
    }
    return plaintext;
}

// ── Component ──────────────────────────────────────────────────────────
export default function DualLayerDppScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { transactionId } = route.params as { transactionId: string };

    const [loading, setLoading] = useState(true);
    const [fetchError, setFetchError] = useState<string | null>(null);
    const [payload, setPayload] = useState<DualLayerDppResponse | null>(null);

    const [secretKey, setSecretKey] = useState('');
    const [decrypting, setDecrypting] = useState(false);
    const [decryptedContent, setDecryptedContent] = useState<string | null>(null);
    const [decryptError, setDecryptError] = useState<string | null>(null);
    const [showDecryptModal, setShowDecryptModal] = useState(false);
    const [claimingKey, setClaimingKey] = useState(false);

    // ── Fetch DPP payload ────────────────────────────────────────────────
    const fetchPayload = useCallback(async () => {
        try {
            setLoading(true);
            setFetchError(null);
            const data = await getDualLayerDpp(transactionId);
            setPayload(data);
        } catch (e: any) {
            const status = e?.response?.status;
            if (status === 403)
                setFetchError('Access denied — only the purchasing exporter can view this DPP.');
            else if (status === 404)
                setFetchError(e?.response?.data?.error || 'Transaction not found.');
            else
                setFetchError(e?.response?.data?.error || 'Failed to load DPP payload.');
        } finally {
            setLoading(false);
        }
    }, [transactionId]);

    useEffect(() => { fetchPayload(); }, [fetchPayload]);

    // ── One-time key claim ─────────────────────────────────────────────
    const handleClaimKey = async () => {
        setClaimingKey(true);
        try {
            const { secretRequestId } = await claimSecret(transactionId);
            setSecretKey(secretRequestId);
            Alert.alert(
                'Key Claimed',
                'Your one-time decryption key has been loaded.\nSave it securely — it cannot be retrieved again after the buyer uploads.',
            );
        } catch (e: any) {
            const status = e?.response?.status;
            if (status === 410)
                Alert.alert('Key Consumed', 'The decryption key has already been used and permanently deleted from the server.');
            else if (status === 403)
                Alert.alert('Access Denied', 'Only the purchasing exporter may claim this key.');
            else
                Alert.alert('Error', e?.response?.data?.error || 'Failed to claim secret key.');
        } finally {
            setClaimingKey(false);
        }
    };

    // ── PBKDF2 client-side decryption ────────────────────────────────────
    const handleDecrypt = () => {
        if (!payload) return;
        if (!secretKey.trim()) {
            Alert.alert('Missing Key', 'Please enter your Decryption Key (SecretRequestId).');
            return;
        }

        setDecrypting(true);
        setDecryptError(null);
        setDecryptedContent(null);

        setTimeout(() => {
            try {
                const plaintext = decryptWithPbkdf2(
                    payload.documentPayload,
                    secretKey.trim(),
                    transactionId,
                );
                setDecryptedContent(plaintext);
                setShowDecryptModal(false);
            } catch (err: any) {
                setDecryptError(err?.message || 'Decryption failed.');
            } finally {
                setDecrypting(false);
            }
        }, 80);
    };

    // ── Render guards ─────────────────────────────────────────────────────
    if (loading) {
        return (
            <View style={st.center}>
                <ActivityIndicator size="large" color={C.primary} />
                <Text style={st.loadingText}>Loading encrypted DPP vault…</Text>
            </View>
        );
    }

    if (fetchError) {
        return (
            <View style={st.center}>
                <Ionicons name="alert-circle" size={52} color={C.red} />
                <Text style={st.errorText}>{fetchError}</Text>
                <TouchableOpacity style={st.retryBtn} onPress={fetchPayload}>
                    <Ionicons name="refresh" size={18} color={C.white} />
                    <Text style={st.retryBtnText}>Retry</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!payload) return null;

    const { publicSummary, documentStatus, documentPayload } = payload;
    const isConfidential = documentStatus === 'CONFIDENTIAL';
    const isPublic = documentStatus === 'PUBLIC';
    const notUploaded = documentStatus === 'NOT_UPLOADED';

    const qrValue = JSON.stringify({ lotId: transactionId, hash: publicSummary.dppHash });

    return (
        <ScrollView style={st.container} contentContainerStyle={{ paddingBottom: 64 }}>

            {/* ── Header ────────────────────────────────────────────────── */}
            <LinearGradient colors={[C.vaultBg, C.vaultCard]} style={st.header}>
                <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color={C.white} />
                </TouchableOpacity>
                <Ionicons name="shield-checkmark" size={44} color={C.gold} style={{ marginTop: 4 }} />
                <Text style={st.headerTitle}>Digital Product Passport</Text>
                <Text style={st.headerSub}>Zero-Knowledge Encrypted Vault</Text>
                <View style={[st.statusBadge, { backgroundColor: isConfidential ? '#7C3AED22' : '#0D9E6722' }]}>
                    <Ionicons
                        name={isConfidential ? 'lock-closed' : 'lock-open-outline'}
                        size={13}
                        color={isConfidential ? '#C4B5FD' : '#34D399'}
                    />
                    <Text style={[st.statusBadgeText, { color: isConfidential ? '#C4B5FD' : '#34D399' }]}>
                        {documentStatus}
                    </Text>
                </View>
            </LinearGradient>

            {/* ── Public Summary ─────────────────────────────────────────── */}
            <Section title="Public Summary" icon="globe-outline" badgeText="Layer 1 — Cleartext">
                <SummaryRow icon="cube-outline" label="Lot ID" value={publicSummary.lotId} mono />
                <SummaryRow icon="leaf-outline" label="Rubber Grade" value={publicSummary.rubberGrade || '—'} />
                <SummaryRow icon="scale-outline" label="Quantity" value={`${publicSummary.quantity} kg`} />
                <SummaryRow icon="finger-print" label="DPP Hash" value={publicSummary.dppHash || '(not generated yet)'} mono />
            </Section>

            {/* ── DPP Hash QR Code ───────────────────────────────────────── */}
            {!!publicSummary.dppHash && (
                <View style={st.qrCard}>
                    <View style={st.qrHeader}>
                        <Ionicons name="qr-code-outline" size={20} color={C.primary} />
                        <Text style={st.qrTitle}>Physical Verification QR</Text>
                    </View>
                    <Text style={st.qrHint}>
                        Attach to the physical lot. Exporter scans at port to verify authenticity.
                    </Text>
                    <View style={st.qrBox}>
                        <QRCode value={qrValue} size={180} backgroundColor={C.white} color="#1C1C1E" />
                    </View>
                    <Text style={st.qrLotId}>Lot {transactionId.substring(0, 16)}…</Text>
                </View>
            )}

            {/* ── Document Layer ─────────────────────────────────────────── */}
            <Section
                title={isConfidential ? '🔒 Locked Document' : 'Document'}
                icon={isConfidential ? 'lock-closed' : 'document-text-outline'}
                badgeText={isConfidential ? 'Layer 2 — PBKDF2 · AES-256-CBC' : 'Layer 2 — Public'}
                badgeColor={isConfidential ? '#7C3AED' : C.primary}
            >
                <View style={[st.infoCard, {
                    backgroundColor: isConfidential ? '#2D1B69' : '#E8F5E9',
                    borderColor: isConfidential ? '#4C1D95' : C.border,
                }]}>
                    <Ionicons
                        name={isConfidential ? 'lock-closed' : 'information-circle'}
                        size={16}
                        color={isConfidential ? '#A78BFA' : C.primary}
                    />
                    <Text style={[st.infoText, { color: isConfidential ? '#C4B5FD' : C.primary }]}>
                        {isConfidential
                            ? 'This invoice is encrypted with AES-256-CBC. The key is derived from your SecretRequestId using PBKDF2-SHA256 (100 000 iterations). The server never saw your key — decryption happens entirely on your device.'
                            : notUploaded
                                ? 'The buyer has not yet uploaded an invoice for this transaction.'
                                : 'This invoice is classified as public. No decryption key is required.'}
                    </Text>
                </View>

                {notUploaded && (
                    <View style={st.pendingCard}>
                        <Ionicons name="hourglass-outline" size={32} color={C.amber} />
                        <Text style={st.pendingTitle}>Invoice Not Yet Uploaded</Text>
                        <Text style={st.pendingHint}>
                            You will be notified once the buyer uploads the invoice.
                        </Text>
                    </View>
                )}

                {isPublic && !!documentPayload && !decryptedContent && (
                    <TouchableOpacity
                        style={st.viewDocBtn}
                        onPress={() => {
                            try {
                                const bytes = CryptoJS.enc.Base64.parse(documentPayload);
                                const text = bytes.toString(CryptoJS.enc.Utf8);
                                setDecryptedContent(text || '[Binary file — cannot be displayed as text]');
                            } catch {
                                setDecryptedContent('[Binary file — cannot be displayed as text]');
                            }
                        }}
                    >
                        <Ionicons name="eye-outline" size={20} color={C.white} />
                        <Text style={st.viewDocBtnText}>View Document</Text>
                    </TouchableOpacity>
                )}

                {isConfidential && !decryptedContent && (
                    <View style={{ gap: 12 }}>
                        {/* Claim Key button (one-time) */}
                        <TouchableOpacity
                            style={[st.claimKeyBtn, claimingKey && { opacity: 0.6 }]}
                            onPress={handleClaimKey}
                            disabled={claimingKey}
                        >
                            {claimingKey ? (
                                <ActivityIndicator size="small" color={C.white} />
                            ) : (
                                <Ionicons name="download-outline" size={18} color={C.white} />
                            )}
                            <Text style={st.claimKeyBtnText}>
                                {claimingKey ? 'Claiming…' : 'Claim Decryption Key'}
                            </Text>
                        </TouchableOpacity>

                        {/* Locked card → opens decrypt modal */}
                        <TouchableOpacity style={st.lockedCard} onPress={() => setShowDecryptModal(true)}>
                            <Ionicons name="lock-closed" size={40} color="#A78BFA" />
                            <Text style={st.lockedTitle}>🔒 Locked Document</Text>
                            <Text style={st.lockedHint}>
                                Tap to enter your SecretRequestId and unlock this invoice on-device.
                            </Text>
                            <View style={st.unlockBtn}>
                                <Ionicons name="key-outline" size={16} color={C.white} />
                                <Text style={st.unlockBtnText}>Enter Decryption Key</Text>
                            </View>
                        </TouchableOpacity>
                    </View>
                )}

                {decryptedContent && (
                    <View style={st.decryptedBlock}>
                        <View style={st.decryptedRowHeader}>
                            <Ionicons name="checkmark-circle" size={22} color={C.green} />
                            <Text style={st.decryptedTitle}>Decrypted Successfully</Text>
                        </View>
                        <Text style={st.decryptedHint}>Decrypted locally — the server never saw this content.</Text>
                        <ScrollView style={st.decryptedScroll} nestedScrollEnabled>
                            <Text style={st.decryptedText} selectable>{decryptedContent}</Text>
                        </ScrollView>
                        <TouchableOpacity
                            style={st.clearBtn}
                            onPress={() => {
                                setDecryptedContent(null);
                                setSecretKey('');
                                setDecryptError(null);
                            }}
                        >
                            <Ionicons name="close-circle-outline" size={16} color={C.textSub} />
                            <Text style={st.clearBtnText}>Clear</Text>
                        </TouchableOpacity>
                    </View>
                )}
            </Section>

            {/* ── Scan Physical QR button ─────────────────────────────────── */}
            <TouchableOpacity
                style={st.scanPhysicalBtn}
                onPress={() => navigation.navigate('ExporterScanner', { expectedLotId: transactionId })}
            >
                <Ionicons name="scan-circle-outline" size={24} color={C.white} />
                <Text style={st.scanPhysicalBtnText}>Scan Physical Lot QR Code</Text>
            </TouchableOpacity>

            {/* ── Decryption Modal ─────────────────────────────────────────── */}
            <Modal
                visible={showDecryptModal}
                transparent
                animationType="slide"
                onRequestClose={() => !decrypting && setShowDecryptModal(false)}
            >
                <View style={st.modalBackdrop}>
                    <View style={st.modalCard}>
                        <View style={st.modalHeader}>
                            <Ionicons name="key" size={26} color={C.gold} />
                            <Text style={st.modalTitle}>Enter Decryption Key</Text>
                        </View>
                        <Text style={st.modalHint}>
                            Enter the <Text style={{ fontWeight: '700' }}>SecretRequestId</Text> you claimed
                            via “Claim Decryption Key” above. PBKDF2-SHA256 (100 000 iter) derives the
                            AES-256-CBC key — exclusively on your device.
                        </Text>
                        <TextInput
                            style={st.keyInput}
                            placeholder="e.g. a3f1c2d4e5b6a7f8c9d0e1f2a3b4c5d6"
                            placeholderTextColor="#94A3B8"
                            value={secretKey}
                            onChangeText={setSecretKey}
                            autoCapitalize="none"
                            autoCorrect={false}
                            spellCheck={false}
                        />
                        {decryptError && (
                            <View style={st.errorBanner}>
                                <Ionicons name="close-circle" size={16} color={C.red} />
                                <Text style={st.errorBannerText}>{decryptError}</Text>
                            </View>
                        )}
                        <View style={st.modalButtons}>
                            <TouchableOpacity
                                style={st.cancelBtn}
                                onPress={() => !decrypting && setShowDecryptModal(false)}
                                disabled={decrypting}
                            >
                                <Text style={st.cancelBtnText}>Cancel</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[st.decryptBtn, decrypting && { opacity: 0.6 }]}
                                onPress={handleDecrypt}
                                disabled={decrypting}
                            >
                                {decrypting ? (
                                    <>
                                        <ActivityIndicator size="small" color={C.white} />
                                        <Text style={st.decryptBtnText}>Deriving key…</Text>
                                    </>
                                ) : (
                                    <>
                                        <Ionicons name="lock-open" size={18} color={C.white} />
                                        <Text style={st.decryptBtnText}>Decrypt</Text>
                                    </>
                                )}
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </ScrollView>
    );
}

// ── Sub-components ─────────────────────────────────────────────────────

function Section({
    title, icon, badgeText, badgeColor = '#2E7D32', children,
}: {
    title: string;
    icon: keyof typeof Ionicons.glyphMap;
    badgeText: string;
    badgeColor?: string;
    children: React.ReactNode;
}) {
    return (
        <View style={st.section}>
            <View style={st.sectionHeader}>
                <Ionicons name={icon} size={19} color={badgeColor} />
                <Text style={[st.sectionTitle, { color: badgeColor }]}>{title}</Text>
                <View style={[st.badge, { backgroundColor: badgeColor + '18' }]}>
                    <Text style={[st.badgeText, { color: badgeColor }]}>{badgeText}</Text>
                </View>
            </View>
            {children}
        </View>
    );
}

function SummaryRow({
    icon, label, value, mono,
}: {
    icon: keyof typeof Ionicons.glyphMap;
    label: string;
    value: string;
    mono?: boolean;
}) {
    return (
        <View style={st.summaryRow}>
            <View style={st.summaryIconBox}>
                <Ionicons name={icon} size={16} color={C.primary} />
            </View>
            <Text style={st.summaryLabel}>{label}</Text>
            <Text style={[st.summaryValue, mono && st.monoText]} numberOfLines={mono ? 1 : 2} ellipsizeMode="middle">
                {value}
            </Text>
        </View>
    );
}

// ── Styles ─────────────────────────────────────────────────────────────
const st = StyleSheet.create({
    container: { flex: 1, backgroundColor: C.bg },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, backgroundColor: C.bg },
    loadingText: { marginTop: 12, color: C.textSub, fontSize: 14 },
    errorText: { marginTop: 12, color: C.red, fontSize: 15, textAlign: 'center', lineHeight: 22 },
    retryBtn: { flexDirection: 'row', alignItems: 'center', marginTop: 20, backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 10, borderRadius: 8, gap: 6 },
    retryBtnText: { color: C.white, fontWeight: '600', fontSize: 14 },

    header: { paddingTop: Platform.OS === 'ios' ? 52 : 40, paddingBottom: 28, paddingHorizontal: 20, alignItems: 'center', gap: 6 },
    backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: 'rgba(255,255,255,0.1)', justifyContent: 'center', alignItems: 'center', alignSelf: 'flex-start', marginBottom: 8 },
    headerTitle: { fontSize: 22, fontWeight: '800', color: C.white },
    headerSub: { fontSize: 12, color: 'rgba(255,255,255,0.55)', marginBottom: 4 },
    statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20, marginTop: 4 },
    statusBadgeText: { fontSize: 11, fontWeight: '700', letterSpacing: 0.5 },

    section: { margin: 14, marginBottom: 6, backgroundColor: C.white, borderRadius: 16, padding: 16, elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 }, gap: 10 },
    sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    sectionTitle: { flex: 1, fontSize: 15, fontWeight: '700' },
    badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
    badgeText: { fontSize: 10, fontWeight: '700' },

    summaryRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    summaryIconBox: { width: 30, height: 30, borderRadius: 15, backgroundColor: C.primaryPale, justifyContent: 'center', alignItems: 'center' },
    summaryLabel: { fontSize: 12, color: C.textSub, width: 88 },
    summaryValue: { flex: 1, fontSize: 13, fontWeight: '600', color: C.textPrimary },
    monoText: { fontFamily: 'monospace', fontSize: 11, color: '#555' },

    qrCard: { margin: 14, marginBottom: 6, backgroundColor: C.white, borderRadius: 16, padding: 16, alignItems: 'center', elevation: 2, shadowColor: '#000', shadowOpacity: 0.06, shadowRadius: 8, shadowOffset: { width: 0, height: 2 } },
    qrHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, alignSelf: 'flex-start', marginBottom: 6 },
    qrTitle: { fontSize: 15, fontWeight: '700', color: C.textPrimary },
    qrHint: { fontSize: 11, color: C.textSub, textAlign: 'center', lineHeight: 16, marginBottom: 12 },
    qrBox: { backgroundColor: '#FFF', padding: 12, borderRadius: 12, borderWidth: 1, borderColor: C.border },
    qrLotId: { marginTop: 8, fontSize: 11, color: C.textSub, fontFamily: 'monospace' },

    infoCard: { flexDirection: 'row', gap: 8, borderRadius: 10, padding: 12, borderWidth: 1 },
    infoText: { flex: 1, fontSize: 12, lineHeight: 18 },

    pendingCard: { alignItems: 'center', padding: 24, gap: 8 },
    pendingTitle: { fontSize: 16, fontWeight: '700', color: C.amber },
    pendingHint: { fontSize: 13, color: C.textSub, textAlign: 'center', lineHeight: 19 },

    viewDocBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.primary, paddingVertical: 14, borderRadius: 12 },
    viewDocBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },

    claimKeyBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#0EA5E9', paddingVertical: 13, borderRadius: 12 },
    claimKeyBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },
    lockedCard: { alignItems: 'center', padding: 28, gap: 10, backgroundColor: '#0F0A23', borderRadius: 14, borderWidth: 1, borderColor: '#4C1D95' },
    lockedTitle: { fontSize: 18, fontWeight: '800', color: '#C4B5FD' },
    lockedHint: { fontSize: 12, color: '#94A3B8', textAlign: 'center', lineHeight: 18 },
    unlockBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 4, backgroundColor: '#7C3AED', paddingHorizontal: 18, paddingVertical: 10, borderRadius: 10 },
    unlockBtnText: { color: C.white, fontWeight: '700', fontSize: 14 },

    decryptedBlock: { gap: 10 },
    decryptedRowHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    decryptedTitle: { fontSize: 16, fontWeight: '700', color: C.green },
    decryptedHint: { fontSize: 11, color: C.textSub, fontStyle: 'italic' },
    decryptedScroll: { backgroundColor: '#F0FFF4', borderRadius: 10, padding: 12, maxHeight: 280, borderWidth: 1, borderColor: C.border },
    decryptedText: { fontFamily: 'monospace', fontSize: 11, color: C.textPrimary, lineHeight: 18 },
    clearBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, alignSelf: 'center', paddingVertical: 8 },
    clearBtnText: { color: C.textSub, fontSize: 13 },

    scanPhysicalBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, margin: 14, marginTop: 8, backgroundColor: C.teal, paddingVertical: 14, borderRadius: 14 },
    scanPhysicalBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },

    modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end' },
    modalCard: { backgroundColor: C.white, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingBottom: Platform.OS === 'ios' ? 36 : 24, gap: 14 },
    modalHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
    modalTitle: { fontSize: 20, fontWeight: '800', color: C.textPrimary },
    modalHint: { fontSize: 13, color: C.textSub, lineHeight: 19 },
    keyInput: { backgroundColor: '#1E1E2E', color: '#E2E8F0', fontFamily: 'monospace', fontSize: 13, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: '#334155' },
    errorBanner: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: '#FEF2F2', padding: 10, borderRadius: 8 },
    errorBannerText: { flex: 1, color: C.red, fontSize: 12, lineHeight: 17 },
    modalButtons: { flexDirection: 'row', gap: 10 },
    cancelBtn: { flex: 1, alignItems: 'center', paddingVertical: 13, borderRadius: 12, borderWidth: 1, borderColor: C.border },
    cancelBtnText: { color: C.textSub, fontWeight: '600', fontSize: 15 },
    decryptBtn: { flex: 2, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: C.gold, paddingVertical: 13, borderRadius: 12 },
    decryptBtnText: { color: C.white, fontWeight: '700', fontSize: 15 },
});
