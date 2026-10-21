import React, { useState } from 'react';
import {
    View, Text, StyleSheet, ScrollView,
    TouchableOpacity, Share, ActivityIndicator, Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import QRCode from 'react-native-qrcode-svg';
import * as FileSystem from 'expo-file-system/legacy';
import * as MediaLibrary from 'expo-media-library';
import { DigitalProductPassport } from '../types';
import { generatePassport, getPassport } from '../services/dppService';

const COLORS = {
    primary: '#007AFF',
    bg: '#F2F2F7',
    white: '#FFFFFF',
    text: '#1C1C1E',
    sub: '#636366',
    border: '#E5E5EA',
    green: '#34C759',
    red: '#FF3B30',
    purple: '#5856D6',
    orange: '#FF9500',
};

interface InfoRowProps {
    icon: string;
    label: string;
    value: string;
    accent?: string;
}

function InfoRow({ icon, label, value, accent = COLORS.text }: InfoRowProps) {
    return (
        <View style={rowStyles.row}>
            <View style={rowStyles.iconBox}>
                <Ionicons name={icon as any} size={18} color={COLORS.primary} />
            </View>
            <View style={rowStyles.info}>
                <Text style={rowStyles.label}>{label}</Text>
                <Text style={[rowStyles.value, { color: accent }]}>{value}</Text>
            </View>
        </View>
    );
}

const rowStyles = StyleSheet.create({
    row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 12, gap: 14 },
    iconBox: {
        width: 36, height: 36, borderRadius: 10,
        backgroundColor: '#EBF5FF', justifyContent: 'center', alignItems: 'center',
    },
    info: { flex: 1 },
    label: { fontSize: 11, color: COLORS.sub, fontWeight: '600', marginBottom: 2 },
    value: { fontSize: 15, fontWeight: '700' },
});

export default function DppPassportScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { passport: initialPassport, dppId } = route.params as {
        passport?: DigitalProductPassport;
        dppId: string;
    };

    const [passport, setPassport] = useState<DigitalProductPassport | null>(initialPassport || null);
    const [loading, setLoading] = useState(!initialPassport);
    const qrRef = React.useRef<any>(null);

    // If opened without passport (e.g. deep link), auto-generate
    React.useEffect(() => {
        if (!initialPassport && dppId) fetchPassport();
    }, []);

    const fetchPassport = async () => {
        setLoading(true);
        try {
            // Step 1: Try GET (works for both Buyer and Exporter — no role restriction)
            const p = await getPassport(dppId);
            setPassport(p);
        } catch (getErr: any) {
            const status = getErr?.response?.status;
            if (status === 404) {
                // Passport not yet generated — buyers can generate it via POST
                try {
                    const p = await generatePassport(dppId);
                    setPassport(p);
                } catch (genErr: any) {
                    const genStatus = genErr?.response?.status;
                    if (genStatus === 403) {
                        Alert.alert(
                            'Passport Not Ready',
                            'The buyer has not yet generated a Digital Product Passport for this lot. Please scan the buyer-shared QR code or ask the buyer to generate the passport first.'
                        );
                    } else {
                        Alert.alert('Error', genErr.response?.data?.error || 'Could not generate passport');
                    }
                    navigation.goBack();
                }
            } else {
                Alert.alert('Error', getErr.response?.data?.error || 'Could not load passport');
                navigation.goBack();
            }
        } finally {
            setLoading(false);
        }
    };

    const handleShare = async () => {
        if (!passport) return;
        try {
            await Share.share({
                message: `Digital Product Passport for Lot ${passport.lotId}\nOpen in App: ris-app://dpp/${passport.lotId}`,
                title: 'Rubber Intelligence Passport'
            });
        } catch (error) {
            console.error('Share failed', error);
        }
    };

    const handleDownloadImage = async () => {
        if (!passport || !qrRef.current) return;

        try {
            // Request write-only permissions first so Android doesn't ask for AUDIO
            const { status } = await MediaLibrary.requestPermissionsAsync(true);
            if (status !== 'granted') {
                Alert.alert('Permission needed', 'Sorry, we need camera roll permissions to save the QR code.');
                return;
            }

            // Get Base64 image representation from the QR component
            qrRef.current.toDataURL(async (dataUrl: string) => {
                // Remove the data UI prefix (data:image/png;base64,) to get raw base64 data
                const base64Data = dataUrl.replace('data:image/png;base64,', '');

                // Write to a temporary file locally
                const tempUri = FileSystem.documentDirectory + `DPP_QR_${passport.lotId}.png`;
                await FileSystem.writeAsStringAsync(tempUri, base64Data, {
                    encoding: 'base64',
                });

                // Save from the temporary file down to the device gallery
                const asset = await MediaLibrary.createAssetAsync(tempUri);
                await MediaLibrary.createAlbumAsync('Rubber Intelligence', asset, false);

                Alert.alert('Success', 'QR Code image saved to your gallery!');
            });
        } catch (error) {
            console.error('Download error:', error);
            Alert.alert('Error', 'Failed to save QR code image.');
        }
    };

    if (loading) {
        return (
            <View style={styles.centered}>
                <Ionicons name="document-lock-outline" size={56} color={COLORS.purple} />
                <Text style={styles.loadingTitle}>Generating Passport...</Text>
                <Text style={styles.loadingSubtitle}>Filtering non-confidential fields only</Text>
                <Text style={[styles.loadingSubtitle, { marginTop: 4, color: COLORS.purple }]}>Applying Where(!IsConfidential) · Computing SHA-256</Text>
                <ActivityIndicator size="large" color={COLORS.purple} style={{ marginTop: 24 }} />
            </View>
        );
    }

    if (!passport) return null;

    const hashShort = `${passport.dppHash.substring(0, 16)}...${passport.dppHash.substring(passport.dppHash.length - 8)}`;

    return (
        <ScrollView style={styles.container} contentContainerStyle={styles.inner}>
            {/* Header */}
            <View style={styles.header}>
                {/* Pipeline Complete Banner */}
                <View style={styles.pipelineCompleteBanner}>
                    <View style={styles.pipelineCompleteStep}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
                        <Text style={styles.pipelineCompleteStepText}>Step A</Text>
                    </View>
                    <View style={styles.pipelineCompleteLine} />
                    <View style={styles.pipelineCompleteStep}>
                        <Ionicons name="checkmark-circle" size={16} color={COLORS.green} />
                        <Text style={styles.pipelineCompleteStepText}>Step B</Text>
                    </View>
                    <Text style={styles.pipelineCompleteLabel}>  Pipeline Complete</Text>
                </View>

                <View style={styles.passportBadge}>
                    <Ionicons name="document-lock" size={28} color={COLORS.purple} />
                </View>
                <Text style={styles.headerTitle}>Digital Product Passport</Text>
                <Text style={styles.headerSubtitle}>Issued · {new Date(passport.createdAt).toLocaleDateString()}</Text>

                {passport.confidentialDataExists && (
                    <View style={styles.warningBadge}>
                        <Ionicons name="lock-closed" size={13} color={COLORS.orange} />
                        <Text style={styles.warningText}>
                            Confidential fields excluded · AES-256 protected
                        </Text>
                    </View>
                )}
            </View>

            {/* Public Fields */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Lot Information</Text>
                <View style={styles.card}>
                    <InfoRow icon="medal-outline" label="Rubber Grade" value={passport.rubberGrade || '—'} accent={COLORS.primary} />
                    <View style={styles.divider} />
                    <InfoRow icon="scale-outline" label="Quantity" value={`${passport.quantity} kg`} />
                    <View style={styles.divider} />
                    <InfoRow icon="boat-outline" label="Dispatch Port" value={passport.dispatchDetails || '—'} />
                    <View style={styles.divider} />
                    <InfoRow
                        icon="shield-checkmark-outline"
                        label="Confidential Data"
                        value={passport.confidentialDataExists ? 'Present (Encrypted)' : 'None'}
                        accent={passport.confidentialDataExists ? COLORS.orange : COLORS.green}
                    />
                </View>
            </View>

            {/* Integrity */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>Integrity Hash (SHA-256)</Text>
                <View style={[styles.card, { backgroundColor: '#1C1C1E' }]}>
                    <View style={styles.hashRow}>
                        <Ionicons name="finger-print-outline" size={22} color={COLORS.green} />
                        <Text style={styles.hashText}>{hashShort}</Text>
                    </View>
                    <Text style={styles.hashNote}>
                        SHA-256 hash of the serialized passport JSON. Verify document integrity against this value.
                    </Text>
                </View>
            </View>

            <View style={styles.section}>
                <Text style={styles.sectionTitle}>QR Code — Public Scan</Text>
                <View style={styles.qrCard}>
                    <QRCode
                        getRef={(c) => (qrRef.current = c)}
                        value={JSON.stringify({ lotId: passport.lotId, hash: passport.dppHash })}
                        size={180}
                        color="#1C1C1E"
                        backgroundColor="white"
                    />
                    <Text style={styles.qrNote}>
                        Encodes lot ID + SHA-256 hash.{'\n'}Confidential values are NEVER embedded.
                    </Text>
                </View>
            </View>

            {/* Lot ID */}
            <View style={styles.idPill}>
                <Ionicons name="cube-outline" size={16} color={COLORS.purple} />
                <Text style={styles.idLabel}>Lot ID</Text>
                <Text style={styles.idValue} numberOfLines={1}>{passport.lotId}</Text>
            </View>

            {/* Actions */}
            {passport.confidentialDataExists && (
                <TouchableOpacity
                    style={styles.confidBtn}
                    onPress={() => navigation.navigate('ConfidentialAccess', { lotId: passport.lotId })}
                >
                    <Ionicons name="lock-open-outline" size={20} color="white" />
                    <Text style={styles.confidBtnText}>Request / View Confidential Fields</Text>
                </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.shareBtn} onPress={handleShare}>
                <Ionicons name="share-outline" size={20} color="white" />
                <Text style={styles.shareBtnText}>Share Passport</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.printBtn} onPress={handleDownloadImage}>
                <Ionicons name="download-outline" size={20} color="white" />
                <Text style={styles.printBtnText}>Download QR Image</Text>
            </TouchableOpacity>

            <TouchableOpacity style={styles.backBtn} onPress={() => navigation.navigate('BuyerDashboard')}>
                <Ionicons name="home-outline" size={18} color={COLORS.primary} />
                <Text style={styles.backBtnText}>Back to Dashboard</Text>
            </TouchableOpacity>
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    inner: { paddingBottom: 48 },
    centered: {
        flex: 1, justifyContent: 'center', alignItems: 'center',
        backgroundColor: COLORS.bg, gap: 10, padding: 32,
    },
    loadingTitle: { fontSize: 20, fontWeight: '800', color: COLORS.text, marginTop: 16 },
    loadingSubtitle: { fontSize: 13, color: COLORS.sub, textAlign: 'center' },
    header: {
        paddingTop: 64, paddingBottom: 28, paddingHorizontal: 24,
        alignItems: 'center', backgroundColor: COLORS.white,
        borderBottomWidth: 1, borderBottomColor: COLORS.border, marginBottom: 20,
    },
    passportBadge: {
        width: 72, height: 72, borderRadius: 24,
        backgroundColor: '#EEF0FF',
        justifyContent: 'center', alignItems: 'center', marginBottom: 14,
    },
    headerTitle: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    headerSubtitle: { fontSize: 13, color: COLORS.sub, marginTop: 4 },
    warningBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#FFF5E5', paddingHorizontal: 14, paddingVertical: 7,
        borderRadius: 20, marginTop: 14,
    },
    warningText: { fontSize: 12, color: COLORS.orange, fontWeight: '600' },
    section: { marginHorizontal: 16, marginBottom: 16 },
    sectionTitle: {
        fontSize: 12, color: COLORS.sub, fontWeight: '700',
        textTransform: 'uppercase', letterSpacing: 0.8, marginBottom: 10,
    },
    card: {
        backgroundColor: COLORS.white, borderRadius: 16, padding: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    divider: { height: 1, backgroundColor: COLORS.border, marginHorizontal: 4 },
    hashRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
    hashText: {
        flex: 1, color: COLORS.green, fontFamily: 'monospace',
        fontSize: 13, fontWeight: '700',
    },
    hashNote: { color: '#8E8E93', fontSize: 11, lineHeight: 16 },
    qrCard: {
        backgroundColor: COLORS.white, borderRadius: 16, padding: 24,
        alignItems: 'center', gap: 16,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05, shadowRadius: 8, elevation: 2,
    },
    qrNote: { fontSize: 12, color: COLORS.sub, textAlign: 'center', lineHeight: 18 },
    idPill: {
        flexDirection: 'row', alignItems: 'center', gap: 10,
        marginHorizontal: 16, marginBottom: 20,
        backgroundColor: '#EEF0FF', padding: 14, borderRadius: 12,
    },
    idLabel: { color: COLORS.purple, fontWeight: '700', fontSize: 13 },
    idValue: { flex: 1, fontSize: 11, color: COLORS.sub, fontFamily: 'monospace' },
    confidBtn: {
        marginHorizontal: 16, marginBottom: 12,
        backgroundColor: '#FF9500', padding: 16, borderRadius: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        shadowColor: '#FF9500', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 10, elevation: 5,
    },
    confidBtnText: { color: 'white', fontSize: 15, fontWeight: '800' },
    shareBtn: {
        marginHorizontal: 16, marginBottom: 12,
        backgroundColor: COLORS.purple, padding: 18, borderRadius: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        shadowColor: COLORS.purple, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3, shadowRadius: 12, elevation: 6,
    },
    shareBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
    printBtn: {
        marginHorizontal: 16, marginBottom: 12,
        backgroundColor: '#1C1C1E', padding: 18, borderRadius: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10,
        shadowColor: '#1C1C1E', shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.25, shadowRadius: 8, elevation: 4,
    },
    printBtnText: { color: 'white', fontSize: 16, fontWeight: '800' },
    backBtn: {
        marginHorizontal: 16,
        borderWidth: 1.5, borderColor: COLORS.primary,
        padding: 14, borderRadius: 14,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
        backgroundColor: COLORS.white,
    },
    backBtnText: { color: COLORS.primary, fontSize: 15, fontWeight: '700' },
    // ── Pipeline complete banner ──
    pipelineCompleteBanner: {
        flexDirection: 'row', alignItems: 'center',
        backgroundColor: '#F0FFF4',
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, marginBottom: 16,
    },
    pipelineCompleteStep: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    pipelineCompleteStepText: { fontSize: 12, fontWeight: '800', color: COLORS.green },
    pipelineCompleteLine: { width: 24, height: 2, backgroundColor: COLORS.green, marginHorizontal: 6 },
    pipelineCompleteLabel: { fontSize: 12, fontWeight: '800', color: COLORS.green },
});
