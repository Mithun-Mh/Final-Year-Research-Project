import React, { useState, useEffect, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getInvoiceExtractedFields } from '../services/marketplaceService';
import { InvoiceDecryptedField } from '../types';

// ── Colour palette (matches the rest of the DPP UI) ──────────────────
const COLORS = {
    primary:  '#007AFF',
    green:    '#34C759',
    red:      '#FF3B30',
    teal:     '#00BCD4',
    bg:       '#F2F2F7',
    white:    '#FFFFFF',
    textPrimary:   '#1C1C1E',
    textSecondary: '#8E8E93',
};

// ── Helpers ───────────────────────────────────────────────────────────

/** Convert a camelCase/snake_case key to a human-readable label. */
function humanize(key: string): string {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, s => s.toUpperCase())
        .trim();
}

// ── Field row component ───────────────────────────────────────────────
interface FieldRowProps {
    field: InvoiceDecryptedField;
}
function FieldRow({ field }: FieldRowProps) {
    const isConfidential = field.isConfidential;
    const displayValue   = field.value ?? '—';

    return (
        <View style={[styles.fieldRow, isConfidential ? styles.fieldRowConfidential : styles.fieldRowPublic]}>
            <View style={styles.fieldLeft}>
                <Ionicons
                    name={isConfidential ? 'lock-closed' : 'eye-outline'}
                    size={16}
                    color={isConfidential ? COLORS.red : COLORS.green}
                    style={{ marginTop: 2 }}
                />
                <View style={{ flex: 1, marginLeft: 10 }}>
                    <Text style={styles.fieldName}>{humanize(field.fieldName)}</Text>
                    <Text style={[styles.fieldValue, !field.value && styles.fieldValueEmpty]}>
                        {displayValue}
                    </Text>
                </View>
            </View>
            <View style={[styles.badge, isConfidential ? styles.badgeConfidential : styles.badgePublic]}>
                <Text style={[styles.badgeText, isConfidential ? styles.badgeTextConfidential : styles.badgeTextPublic]}>
                    {isConfidential ? 'CONFIDENTIAL' : 'PUBLIC'}
                </Text>
            </View>
        </View>
    );
}

// ── Screen ────────────────────────────────────────────────────────────
export default function InvoiceExtractedFieldsScreen() {
    const route      = useRoute<any>();
    const navigation = useNavigation<any>();
    const { transactionId } = route.params as { transactionId: string };

    const [fields,  setFields]  = useState<InvoiceDecryptedField[]>([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState<string | null>(null);

    const loadFields = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getInvoiceExtractedFields(transactionId);
            setFields(data);
        } catch (e: any) {
            setError(
                e?.response?.data?.error ??
                e?.message ??
                'Failed to load invoice fields. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    }, [transactionId]);

    useEffect(() => { loadFields(); }, [loadFields]);

    // ── Derived data ──────────────────────────────────────────────────
    const publicFields       = fields.filter(f => !f.isConfidential);
    const confidentialFields = fields.filter(f =>  f.isConfidential);

    // ── Render ────────────────────────────────────────────────────────
    return (
        <View style={styles.container}>

            {/* ── Header ── */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={26} color={COLORS.primary} />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={styles.headerTitle}>Invoice Fields</Text>
                    <Text style={styles.headerSub}>Order {transactionId.substring(0, 8)}…</Text>
                </View>
                <View style={styles.tealBadge}>
                    <Ionicons name="analytics" size={16} color={COLORS.teal} />
                    <Text style={styles.tealBadgeText}>{fields.length} fields</Text>
                </View>
            </View>

            {/* ── Body ── */}
            {loading ? (
                <View style={styles.centred}>
                    <ActivityIndicator size="large" color={COLORS.teal} />
                    <Text style={styles.loadingText}>Decrypting fields…</Text>
                </View>
            ) : error ? (
                <View style={styles.centred}>
                    <Ionicons name="alert-circle" size={52} color={COLORS.red} />
                    <Text style={styles.errorTitle}>Could Not Load Fields</Text>
                    <Text style={styles.errorBody}>{error}</Text>
                    <TouchableOpacity style={styles.retryBtn} onPress={loadFields}>
                        <Ionicons name="refresh" size={18} color={COLORS.white} />
                        <Text style={styles.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* ── Stats chips ── */}
                    <View style={styles.statsRow}>
                        <View style={[styles.statChip, { backgroundColor: '#EAF9EE' }]}>
                            <Ionicons name="eye-outline" size={14} color={COLORS.green} />
                            <Text style={[styles.statChipText, { color: COLORS.green }]}>
                                {publicFields.length} public
                            </Text>
                        </View>
                        <View style={[styles.statChip, { backgroundColor: '#FFF0EE' }]}>
                            <Ionicons name="lock-closed" size={14} color={COLORS.red} />
                            <Text style={[styles.statChipText, { color: COLORS.red }]}>
                                {confidentialFields.length} confidential
                            </Text>
                        </View>
                    </View>

                    {/* ── Public fields section ── */}
                    {publicFields.length > 0 && (
                        <>
                            <View style={[styles.sectionHeader, { borderLeftColor: COLORS.green }]}>
                                <Ionicons name="eye-outline" size={16} color={COLORS.green} />
                                <Text style={[styles.sectionTitle, { color: COLORS.green }]}>
                                    Non-Confidential Fields
                                </Text>
                            </View>
                            {publicFields.map((f, i) => <FieldRow key={`pub-${i}`} field={f} />)}
                        </>
                    )}

                    {/* ── Confidential fields section ── */}
                    {confidentialFields.length > 0 && (
                        <>
                            <View style={[styles.sectionHeader, { borderLeftColor: COLORS.red, marginTop: 20 }]}>
                                <Ionicons name="lock-closed" size={16} color={COLORS.red} />
                                <Text style={[styles.sectionTitle, { color: COLORS.red }]}>
                                    Confidential Fields
                                </Text>
                            </View>
                            {confidentialFields.map((f, i) => <FieldRow key={`conf-${i}`} field={f} />)}
                        </>
                    )}

                    {fields.length === 0 && (
                        <View style={styles.emptyState}>
                            <Ionicons name="document-text-outline" size={48} color={COLORS.textSecondary} />
                            <Text style={styles.emptyText}>No extracted fields found for this invoice.</Text>
                        </View>
                    )}

                    {/* ── Security footer ── */}
                    <View style={styles.footer}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={COLORS.textSecondary} />
                        <Text style={styles.footerText}>
                            Decrypted on demand · AES-256-CBC · Data never persisted in plaintext
                        </Text>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: COLORS.bg,
    },

    // Header
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingTop: 56,
        paddingBottom: 16,
        paddingHorizontal: 16,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
        gap: 8,
    },
    backBtn: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: '#F2F2F7',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
    },
    headerSub: {
        fontSize: 12,
        color: COLORS.textSecondary,
        marginTop: 1,
    },
    tealBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 4,
        backgroundColor: '#E0F7FA',
        paddingHorizontal: 10,
        paddingVertical: 5,
        borderRadius: 12,
    },
    tealBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        color: COLORS.teal,
    },

    // Centred states
    centred: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 32,
        gap: 12,
    },
    loadingText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        marginTop: 8,
    },
    errorTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: COLORS.textPrimary,
        marginTop: 4,
    },
    errorBody: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
        lineHeight: 20,
    },
    retryBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        backgroundColor: COLORS.teal,
        paddingHorizontal: 20,
        paddingVertical: 12,
        borderRadius: 12,
        marginTop: 8,
    },
    retryBtnText: {
        color: COLORS.white,
        fontWeight: '700',
        fontSize: 15,
    },

    // Scroll content
    scrollContent: {
        padding: 16,
        paddingBottom: 40,
    },
    statsRow: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 20,
    },
    statChip: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        paddingHorizontal: 12,
        paddingVertical: 7,
        borderRadius: 20,
    },
    statChipText: {
        fontSize: 13,
        fontWeight: '600',
    },

    // Section headers
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        borderLeftWidth: 3,
        paddingLeft: 10,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 15,
        fontWeight: '700',
    },

    // Field rows
    fieldRow: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        justifyContent: 'space-between',
        padding: 14,
        borderRadius: 12,
        marginBottom: 8,
        borderWidth: 1,
    },
    fieldRowPublic: {
        backgroundColor: '#F0FFF4',
        borderColor: '#C3EDD3',
    },
    fieldRowConfidential: {
        backgroundColor: '#FFF5F5',
        borderColor: '#FECACA',
    },
    fieldLeft: {
        flexDirection: 'row',
        flex: 1,
        marginRight: 8,
    },
    fieldName: {
        fontSize: 13,
        fontWeight: '600',
        color: COLORS.textSecondary,
        marginBottom: 2,
    },
    fieldValue: {
        fontSize: 15,
        fontWeight: '600',
        color: COLORS.textPrimary,
    },
    fieldValueEmpty: {
        color: COLORS.textSecondary,
        fontStyle: 'italic',
    },

    // Badges
    badge: {
        paddingHorizontal: 8,
        paddingVertical: 3,
        borderRadius: 8,
        alignSelf: 'flex-start',
        marginTop: 2,
    },
    badgePublic: {
        backgroundColor: '#DCFCE7',
    },
    badgeConfidential: {
        backgroundColor: '#FEE2E2',
    },
    badgeText: {
        fontSize: 10,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    badgeTextPublic: {
        color: '#16A34A',
    },
    badgeTextConfidential: {
        color: '#DC2626',
    },

    // Empty state
    emptyState: {
        alignItems: 'center',
        paddingVertical: 40,
        gap: 12,
    },
    emptyText: {
        fontSize: 14,
        color: COLORS.textSecondary,
        textAlign: 'center',
    },

    // Footer
    footer: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginTop: 24,
        padding: 14,
        backgroundColor: COLORS.white,
        borderRadius: 10,
        borderWidth: 1,
        borderColor: '#E5E5EA',
    },
    footerText: {
        fontSize: 11,
        color: COLORS.textSecondary,
        flex: 1,
    },
});
