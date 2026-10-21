import React, { useEffect, useState } from 'react';
import {
    View, Text, StyleSheet, ActivityIndicator,
    Alert, TouchableOpacity, ScrollView, Linking
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getDppMetadata, getDppFileUrl, generatePassport } from '../services/dppService';
import { DppDocument } from '../types';

const COLORS = {
    primary: '#007AFF',
    bg: '#1C1C1E',
    card: '#2C2C2E',
    white: '#FFFFFF',
    sub: '#8E8E93',
    border: '#3A3A3C',
    green: '#34C759',
    red: '#FF3B30',
    purple: '#5856D6',
};

export default function DppDetailScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { id } = route.params;
    const [loading, setLoading] = useState(true);
    const [genLoading, setGenLoading] = useState(false);
    const [doc, setDoc] = useState<DppDocument | null>(null);

    useEffect(() => { fetchMetadata(); }, [id]);

    const fetchMetadata = async () => {
        try {
            const d = await getDppMetadata(id);
            setDoc(d);
        } catch {
            Alert.alert('Access Denied', 'Could not verify document access.');
            navigation.goBack();
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = async () => {
        const url = getDppFileUrl(id);
        const ok = await Linking.canOpenURL(url);
        if (ok) await Linking.openURL(url);
        else Alert.alert('Error', 'Cannot open document link.');
    };

    const handleGeneratePassport = async () => {
        setGenLoading(true);
        try {
            const passport = await generatePassport(id);
            navigation.navigate('DppPassport', { passport, dppId: id });
        } catch (err: any) {
            Alert.alert('Error', err.response?.data?.error || 'Failed to generate passport.');
        } finally {
            setGenLoading(false);
        }
    };

    if (loading) {
        return (
            <View style={styles.center}>
                <Ionicons name="lock-closed-outline" size={56} color={COLORS.primary} />
                <Text style={styles.loadingTitle}>Verifying Credentials...</Text>
                <Text style={styles.loadingSubtitle}>Decrypting Secure DPP Report</Text>
                <ActivityIndicator size="large" color={COLORS.primary} style={{ marginTop: 20 }} />
            </View>
        );
    }

    if (!doc) return null;

    const isConfidential = doc.classification === 'CONFIDENTIAL';

    return (
        <ScrollView style={styles.container}>
            {/* Secure header */}
            <View style={styles.header}>
                <Ionicons name="shield-checkmark" size={44} color={COLORS.green} />
                <Text style={styles.headerTitle}>Access Granted</Text>
                <Text style={styles.headerSubtitle}>Exporter Verification Successful</Text>
            </View>

            {/* Document info */}
            <View style={styles.card}>
                <Row label="DPP ID" value={`${id.substring(0, 18)}...`} />
                <View style={styles.divider} />
                <Row label="File Name" value={doc.originalFileName} />
                <View style={styles.divider} />
                <Row label="Uploaded At" value={new Date(doc.uploadedAt).toLocaleString()} />
                <View style={styles.divider} />
                <Row
                    label="Classification"
                    value={doc.classification}
                    accent={isConfidential ? COLORS.red : COLORS.green}
                />
                <View style={styles.divider} />
                <Row label="Confidence" value={`${(doc.confidenceScore * 100).toFixed(1)}%`} />
            </View>

            {/* Keywords */}
            {doc.detectedKeywords?.length > 0 && (
                <View style={styles.keywordCard}>
                    <Text style={styles.keywordTitle}>Detected Keywords</Text>
                    <View style={styles.keywordRow}>
                        {doc.detectedKeywords.map((kw, i) => (
                            <View key={i} style={styles.keyword}>
                                <Text style={styles.keywordText}>{kw}</Text>
                            </View>
                        ))}
                    </View>
                </View>
            )}

            {/* Summary (text only, no raw values) */}
            {doc.extractedTextSummary && (
                <View style={styles.summaryCard}>
                    <Text style={styles.summaryTitle}>Document Summary</Text>
                    <Text style={styles.summaryText}>{doc.extractedTextSummary}</Text>
                </View>
            )}

            {/* Actions */}
            <TouchableOpacity
                style={[styles.btn, { backgroundColor: COLORS.purple }, genLoading && { opacity: 0.7 }]}
                onPress={handleGeneratePassport}
                disabled={genLoading}
            >
                {genLoading
                    ? <ActivityIndicator color="white" />
                    : <Ionicons name="document-lock-outline" size={20} color="white" />}
                <Text style={styles.btnText}>
                    {genLoading ? 'Generating...' : 'View Digital Product Passport'}
                </Text>
            </TouchableOpacity>

            <TouchableOpacity
                style={[styles.btn, { backgroundColor: COLORS.primary }]}
                onPress={handleDownload}
            >
                <Ionicons name="download-outline" size={20} color="white" />
                <Text style={styles.btnText}>Download Full Document</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.closeBtn} onPress={() => navigation.goBack()}>
                <Text style={styles.closeBtnText}>Close Secure View</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

function Row({ label, value, accent }: { label: string; value: string; accent?: string }) {
    return (
        <View style={styles.row}>
            <Text style={styles.rowLabel}>{label}</Text>
            <Text style={[styles.rowValue, accent ? { color: accent } : {}]}>{value}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    center: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: '#F2F2F7', gap: 8,
    },
    loadingTitle: { marginTop: 12, fontSize: 18, fontWeight: '600', color: '#1C1C1E' },
    loadingSubtitle: { fontSize: 13, color: '#636366' },
    header: {
        alignItems: 'center', padding: 36, paddingTop: 64,
        backgroundColor: '#000',
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.white, marginTop: 12 },
    headerSubtitle: { fontSize: 13, color: COLORS.green, marginTop: 6, letterSpacing: 0.5 },
    card: {
        margin: 16, backgroundColor: COLORS.card, borderRadius: 16, padding: 4,
    },
    row: {
        flexDirection: 'row', justifyContent: 'space-between',
        alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16,
    },
    rowLabel: { color: COLORS.sub, fontSize: 14 },
    rowValue: { color: COLORS.white, fontSize: 14, fontWeight: '600', flex: 1, textAlign: 'right' },
    divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 16 },
    keywordCard: { marginHorizontal: 16, marginBottom: 12, backgroundColor: COLORS.card, borderRadius: 16, padding: 16 },
    keywordTitle: { color: COLORS.sub, fontSize: 11, fontWeight: '700', textTransform: 'uppercase', marginBottom: 12 },
    keywordRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    keyword: { backgroundColor: '#3A3A3C', paddingHorizontal: 12, paddingVertical: 5, borderRadius: 20 },
    keywordText: { color: COLORS.white, fontSize: 12, fontWeight: '600' },
    summaryCard: { marginHorizontal: 16, marginBottom: 20, backgroundColor: COLORS.white, borderRadius: 16, padding: 18 },
    summaryTitle: { fontSize: 13, fontWeight: '700', marginBottom: 10, color: '#1C1C1E' },
    summaryText: { fontSize: 13, color: '#555', lineHeight: 20 },
    btn: {
        marginHorizontal: 16, marginBottom: 12, padding: 16, borderRadius: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
    },
    btnText: { color: COLORS.white, fontWeight: '800', fontSize: 15 },
    closeBtn: { margin: 16, alignItems: 'center', padding: 14 },
    closeBtnText: { color: COLORS.red, fontSize: 15, fontWeight: '600' },
});
