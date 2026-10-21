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
import { LinearGradient } from 'expo-linear-gradient';
import { getQirExtractedFields } from '../services/marketplaceService';
import { QirDecryptedField } from '../types';

// ── Colour palette ──────────────────────────────────────────────────
const C = {
    primary:   '#2E7D32',
    green:     '#34C759',
    amber:     '#FF9500',
    red:       '#FF3B30',
    teal:      '#00BCD4',
    purple:    '#7E57C2',
    bg:        '#F2F2F7',
    white:     '#FFFFFF',
    textPrimary:   '#1C1C1E',
    textSecondary: '#8E8E93',
};

// ── QIR field metadata — maps fieldName → unit/icon ──────────────────
const QIR_FIELD_META: Record<string, { unit?: string; icon: keyof typeof Ionicons.glyphMap; color: string }> = {
    rubberGrade:              { unit: '',    icon: 'ribbon-outline',        color: C.primary },
    lotQuantityKg:            { unit: 'kg', icon: 'scale-outline',          color: C.amber },
    moistureContent:          { unit: '%',  icon: 'water-outline',          color: C.teal },
    dirtContent:              { unit: '%',  icon: 'alert-circle-outline',   color: C.amber },
    ashContent:               { unit: '%',  icon: 'flame-outline',          color: '#FF6B35' },
    nitrogenContent:          { unit: '%',  icon: 'analytics-outline',      color: C.purple },
    plasticityRetentionIndex: { unit: '',   icon: 'stats-chart-outline',    color: C.primary },
    wallaceRapidPlasticity:   { unit: '',   icon: 'speedometer-outline',    color: '#FF6B35' },
    mooneyViscosity:          { unit: '',   icon: 'trending-up-outline',    color: C.teal },
    odour:                    { unit: '',   icon: 'leaf-outline',            color: C.green },
    colour:                   { unit: '',   icon: 'color-palette-outline',   color: C.purple },
    inspectionDate:           { unit: '',   icon: 'calendar-outline',        color: C.primary },
    inspectorName:            { unit: '',   icon: 'person-outline',          color: C.amber },
    inspectionAgency:         { unit: '',   icon: 'business-outline',        color: C.primary },
    lotReference:             { unit: '',   icon: 'barcode-outline',         color: C.teal },
};

// ── Helper: camelCase → human label ──────────────────────────────────
function humanize(key: string): string {
    return key
        .replace(/([A-Z])/g, ' $1')
        .replace(/_/g, ' ')
        .replace(/^./, s => s.toUpperCase())
        .trim();
}

// ── Field Row Component ───────────────────────────────────────────────
function FieldRow({ field }: { field: QirDecryptedField }) {
    const meta         = QIR_FIELD_META[field.fieldName];
    const isConfidential = field.isConfidential;
    const displayValue = field.value
        ? (meta?.unit ? `${field.value} ${meta.unit}` : field.value)
        : '—';

    return (
        <View style={[st.fieldRow, isConfidential ? st.fieldRowConfidential : st.fieldRowPublic]}>
            {/* Icon bubble */}
            <View style={[st.fieldIconWrap, { backgroundColor: isConfidential ? '#FEF3F2' : '#F0FFF4' }]}>
                <Ionicons
                    name={meta?.icon ?? 'document-text-outline'}
                    size={18}
                    color={isConfidential ? C.red : (meta?.color ?? C.primary)}
                />
            </View>

            {/* Content */}
            <View style={st.fieldContent}>
                <Text style={st.fieldName}>{humanize(field.fieldName)}</Text>
                <Text style={[st.fieldValue, !field.value && st.fieldValueEmpty]}>
                    {displayValue}
                </Text>
            </View>

            {/* Badge */}
            <View style={[st.badge, isConfidential ? st.badgeConfidential : st.badgePublic]}>
                <Ionicons
                    name={isConfidential ? 'lock-closed' : 'eye-outline'}
                    size={10}
                    color={isConfidential ? '#DC2626' : '#16A34A'}
                />
                <Text style={[st.badgeText, isConfidential ? st.badgeTextConfidential : st.badgeTextPublic]}>
                    {isConfidential ? 'CONFIDENTIAL' : 'PUBLIC'}
                </Text>
            </View>
        </View>
    );
}

// ── Screen ────────────────────────────────────────────────────────────
export default function QirExtractedFieldsScreen() {
    const route      = useRoute<any>();
    const navigation = useNavigation<any>();
    const { transactionId } = route.params as { transactionId: string };

    const [fields,  setFields]  = useState<QirDecryptedField[]>([]);
    const [loading, setLoading] = useState(true);
    const [error,   setError]   = useState<string | null>(null);

    const loadFields = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await getQirExtractedFields(transactionId);
            setFields(data);
        } catch (e: any) {
            setError(
                e?.response?.data?.error ??
                e?.message ??
                'Failed to load QIR fields. Please try again.'
            );
        } finally {
            setLoading(false);
        }
    }, [transactionId]);

    useEffect(() => { loadFields(); }, [loadFields]);

    const publicFields       = fields.filter(f => !f.isConfidential);
    const confidentialFields = fields.filter(f =>  f.isConfidential);

    return (
        <View style={st.container}>

            {/* ── Header ── */}
            <LinearGradient
                colors={['#1B5E20', '#2E7D32', '#43A047']}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={st.header}
            >
                <TouchableOpacity style={st.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="chevron-back" size={24} color="#fff" />
                </TouchableOpacity>
                <View style={{ flex: 1 }}>
                    <Text style={st.headerTitle}>Quality Inspection Report</Text>
                    <Text style={st.headerSub}>Order {transactionId.substring(0, 8)}…</Text>
                </View>
                <View style={st.fieldCountBadge}>
                    <Ionicons name="analytics" size={14} color={C.amber} />
                    <Text style={st.fieldCountText}>{fields.length} fields</Text>
                </View>
            </LinearGradient>

            {/* ── Body ── */}
            {loading ? (
                <View style={st.centred}>
                    <ActivityIndicator size="large" color={C.primary} />
                    <Text style={st.loadingText}>Decrypting QIR fields…</Text>
                </View>
            ) : error ? (
                <View style={st.centred}>
                    <Ionicons name="alert-circle" size={52} color={C.red} />
                    <Text style={st.errorTitle}>Could Not Load Fields</Text>
                    <Text style={st.errorBody}>{error}</Text>
                    <TouchableOpacity style={st.retryBtn} onPress={loadFields}>
                        <Ionicons name="refresh" size={16} color="#fff" />
                        <Text style={st.retryBtnText}>Retry</Text>
                    </TouchableOpacity>
                </View>
            ) : (
                <ScrollView
                    contentContainerStyle={st.scrollContent}
                    showsVerticalScrollIndicator={false}
                >
                    {/* Stats chips */}
                    <View style={st.statsRow}>
                        <View style={[st.statChip, { backgroundColor: '#EAF9EE' }]}>
                            <Ionicons name="eye-outline" size={14} color={C.green} />
                            <Text style={[st.statChipText, { color: C.green }]}>
                                {publicFields.length} public
                            </Text>
                        </View>
                        <View style={[st.statChip, { backgroundColor: '#FFF0EE' }]}>
                            <Ionicons name="lock-closed" size={14} color={C.red} />
                            <Text style={[st.statChipText, { color: C.red }]}>
                                {confidentialFields.length} confidential
                            </Text>
                        </View>
                        <View style={[st.statChip, { backgroundColor: '#FFF8E1' }]}>
                            <Ionicons name="ribbon-outline" size={14} color={C.amber} />
                            <Text style={[st.statChipText, { color: C.amber }]}>
                                QIR
                            </Text>
                        </View>
                    </View>

                    {/* Public fields */}
                    {publicFields.length > 0 && (
                        <>
                            <View style={[st.sectionHeader, { borderLeftColor: C.green }]}>
                                <Ionicons name="eye-outline" size={16} color={C.green} />
                                <Text style={[st.sectionTitle, { color: C.green }]}>
                                    Non-Confidential Fields
                                </Text>
                            </View>
                            {publicFields.map((f, i) => <FieldRow key={`pub-${i}`} field={f} />)}
                        </>
                    )}

                    {/* Confidential fields */}
                    {confidentialFields.length > 0 && (
                        <>
                            <View style={[st.sectionHeader, { borderLeftColor: C.red, marginTop: 20 }]}>
                                <Ionicons name="lock-closed" size={16} color={C.red} />
                                <Text style={[st.sectionTitle, { color: C.red }]}>
                                    Confidential Fields
                                </Text>
                            </View>
                            {confidentialFields.map((f, i) => <FieldRow key={`conf-${i}`} field={f} />)}
                        </>
                    )}

                    {fields.length === 0 && (
                        <View style={st.emptyState}>
                            <Ionicons name="document-text-outline" size={48} color={C.textSecondary} />
                            <Text style={st.emptyText}>No extracted fields found for this QIR.</Text>
                        </View>
                    )}

                    {/* Security footer */}
                    <View style={st.footer}>
                        <Ionicons name="shield-checkmark-outline" size={14} color={C.textSecondary} />
                        <Text style={st.footerText}>
                            Decrypted on demand · AES-256-CBC · HMAC blind index · Data never persisted in plaintext
                        </Text>
                    </View>
                </ScrollView>
            )}
        </View>
    );
}

// ── Styles ────────────────────────────────────────────────────────────
const st = StyleSheet.create({
    container:    { flex: 1, backgroundColor: C.bg },

    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingTop: 52, paddingBottom: 16, paddingHorizontal: 16, gap: 10,
    },
    backBtn: {
        width: 36, height: 36, borderRadius: 18,
        backgroundColor: 'rgba(255,255,255,0.18)',
        justifyContent: 'center', alignItems: 'center',
    },
    headerTitle:  { fontSize: 17, fontWeight: '700', color: '#fff' },
    headerSub:    { fontSize: 12, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
    fieldCountBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        backgroundColor: 'rgba(255,255,255,0.18)',
        paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
    },
    fieldCountText: { fontSize: 12, fontWeight: '700', color: C.amber },

    centred: {
        flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32, gap: 12,
    },
    loadingText:  { fontSize: 14, color: C.textSecondary, marginTop: 8 },
    errorTitle:   { fontSize: 18, fontWeight: '700', color: C.textPrimary, marginTop: 4 },
    errorBody:    { fontSize: 14, color: C.textSecondary, textAlign: 'center', lineHeight: 20 },
    retryBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        backgroundColor: C.primary, paddingHorizontal: 20, paddingVertical: 12,
        borderRadius: 12, marginTop: 8,
    },
    retryBtnText: { color: '#fff', fontWeight: '700', fontSize: 15 },

    scrollContent:  { padding: 16, paddingBottom: 40 },
    statsRow:       { flexDirection: 'row', gap: 10, marginBottom: 20 },
    statChip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20,
    },
    statChipText:   { fontSize: 13, fontWeight: '600' },

    sectionHeader: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        borderLeftWidth: 3, paddingLeft: 10, marginBottom: 10,
    },
    sectionTitle:   { fontSize: 15, fontWeight: '700' },

    fieldRow: {
        flexDirection: 'row', alignItems: 'center',
        padding: 12, borderRadius: 14, marginBottom: 8, borderWidth: 1, gap: 10,
    },
    fieldRowPublic:       { backgroundColor: '#F0FFF4', borderColor: '#C3EDD3' },
    fieldRowConfidential: { backgroundColor: '#FFF5F5', borderColor: '#FECACA' },
    fieldIconWrap: {
        width: 38, height: 38, borderRadius: 11,
        justifyContent: 'center', alignItems: 'center', flexShrink: 0,
    },
    fieldContent:   { flex: 1 },
    fieldName:      { fontSize: 12, fontWeight: '600', color: C.textSecondary, marginBottom: 2 },
    fieldValue:     { fontSize: 15, fontWeight: '700', color: C.textPrimary },
    fieldValueEmpty:{ color: C.textSecondary, fontStyle: 'italic', fontWeight: '400' },

    badge: {
        flexDirection: 'row', alignItems: 'center', gap: 3,
        paddingHorizontal: 7, paddingVertical: 3, borderRadius: 8, alignSelf: 'flex-start',
    },
    badgePublic:       { backgroundColor: '#DCFCE7' },
    badgeConfidential: { backgroundColor: '#FEE2E2' },
    badgeText:         { fontSize: 9, fontWeight: '800', letterSpacing: 0.4 },
    badgeTextPublic:       { color: '#16A34A' },
    badgeTextConfidential: { color: '#DC2626' },

    emptyState:  { alignItems: 'center', paddingVertical: 40, gap: 12 },
    emptyText:   { fontSize: 14, color: C.textSecondary, textAlign: 'center' },

    footer: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginTop: 24, padding: 14,
        backgroundColor: C.white, borderRadius: 10,
        borderWidth: 1, borderColor: '#E5E5EA',
    },
    footerText: { fontSize: 11, color: C.textSecondary, flex: 1 },
});
