import React, { useState, useEffect } from 'react';
import {
    Text, View, StyleSheet, TouchableOpacity,
    ActivityIndicator, Modal, ScrollView
} from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { verifyDpp } from '../services/dppService';
import { DppVerificationResponse } from '../types';

type ScanPayload = { lotId: string; hash: string };

export default function ExporterScannerScreen() {
    const [hasPermission, setHasPermission] = useState<boolean | null>(null);
    const [scanned, setScanned] = useState(false);
    const [verifying, setVerifying] = useState(false);
    const [verificationResult, setVerificationResult] = useState<DppVerificationResponse | null>(null);
    const [scannedLotId, setScannedLotId] = useState<string | null>(null);
    const [scannedPhysicalHash, setScannedPhysicalHash] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const expectedLotId = route.params?.expectedLotId as string | undefined;

    useEffect(() => {
        Camera.requestCameraPermissionsAsync().then(({ status }) =>
            setHasPermission(status === 'granted')
        );
    }, []);

    const handleBarCodeScanned = async ({ data }: { type: string; data: string }) => {
        setScanned(true);
        setError(null);
        setVerificationResult(null);

        // QR payload: { lotId, hash }
        let payload: ScanPayload | null = null;
        try {
            payload = JSON.parse(data) as ScanPayload;
        } catch {
            setError('Invalid QR code. Expected a DPP passport QR.');
            return;
        }

        if (!payload?.lotId) {
            setError('QR code does not contain a valid lot ID.');
            return;
        }

        setScannedLotId(payload.lotId);
        setScannedPhysicalHash(payload.hash ?? null);
        setVerifying(true);
        try {
            if (expectedLotId && expectedLotId !== payload.lotId) {
                // Client-side quick rejection if we already know they don't match
                setError(`Lot Mismatch: You scanned a QR code for Lot ${payload.lotId.substring(0, 8)}…, but you are verifying Lot ${expectedLotId.substring(0, 8)}…`);
                setVerifying(false);
                return;
            }

            const result = await verifyDpp(payload.lotId, expectedLotId);
            setVerificationResult(result);
        } catch (e: any) {
            setError(e?.response?.data?.error ?? 'Hash verification request failed.');
        } finally {
            setVerifying(false);
        }
    };

    const handleReset = () => {
        setScanned(false);
        setVerificationResult(null);
        setScannedLotId(null);
        setScannedPhysicalHash(null);
        setError(null);
    };

    if (hasPermission === null) {
        return <View style={styles.center}><Text>Requesting camera permission…</Text></View>;
    }
    if (hasPermission === false) {
        return <View style={styles.center}><Text>Camera permission denied.</Text></View>;
    }

    return (
        <View style={styles.container}>
            <CameraView
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
                style={StyleSheet.absoluteFillObject}
            />

            <View style={styles.overlay}>
                <Text style={styles.scanText}>Scan DPP QR Code</Text>
                <View style={styles.scanFrame} />
                <Text style={styles.hint}>Point at the passport QR to verify integrity</Text>
            </View>

            {/* Result modal shown after scan */}
            <Modal visible={scanned} transparent animationType="slide">
                <View style={styles.modalBackdrop}>
                    <View style={styles.resultCard}>
                        {verifying ? (
                            <>
                                <ActivityIndicator size="large" color="#5856D6" />
                                <Text style={styles.verifyingText}>Verifying SHA-256 hash…</Text>
                            </>
                        ) : error ? (
                            <>
                                <Ionicons name="alert-circle" size={56} color="#FF3B30" />
                                <Text style={styles.resultTitle}>Scan Error</Text>
                                <Text style={styles.resultSub}>{error}</Text>
                            </>
                        ) : verificationResult ? (
                            <>
                                {/* ── Physical vs Digital hash comparison ── */}
                                {scannedPhysicalHash != null && (() => {
                                    const physicalMatchesDigital = scannedPhysicalHash === verificationResult.storedHash;
                                    return (
                                        <View style={[
                                            styles.physicalCheckBanner,
                                            { backgroundColor: physicalMatchesDigital ? '#052E16' : '#3B0A0A' },
                                        ]}>
                                            <Text style={[styles.physicalCheckIcon]}>
                                                {physicalMatchesDigital ? '✅' : '❌'}
                                            </Text>
                                            <Text style={[
                                                styles.physicalCheckText,
                                                { color: physicalMatchesDigital ? '#4ADE80' : '#F87171' },
                                            ]}>
                                                {physicalMatchesDigital
                                                    ? 'PHYSICAL LOT MATCHES DIGITAL PASSPORT'
                                                    : 'TAMPERING DETECTED: HASH MISMATCH'}
                                            </Text>
                                        </View>
                                    );
                                })()}

                                <Ionicons
                                    name={verificationResult.isValid ? 'shield-checkmark' : 'shield-outline'}
                                    size={64}
                                    color={verificationResult.isValid ? '#34C759' : '#FF3B30'}
                                />
                                <View style={[
                                    styles.resultBadge,
                                    { backgroundColor: verificationResult.isValid ? '#E8FAE8' : '#FFE5E5' }
                                ]}>
                                    <Text style={[
                                        styles.resultBadgeText,
                                        { color: verificationResult.isValid ? '#34C759' : '#FF3B30' }
                                    ]}>
                                        {verificationResult.isValid ? '✓  VERIFIED' : '✗  MISMATCH'}
                                    </Text>
                                </View>
                                <Text style={styles.resultTitle}>
                                    {verificationResult.isValid
                                        ? 'Passport Integrity Confirmed'
                                        : 'Hash Mismatch Detected'}
                                </Text>
                                <Text style={styles.resultSub}>
                                    Lot: {scannedLotId?.substring(0, 16)}…
                                </Text>
                                <ScrollView style={styles.hashBox} nestedScrollEnabled>
                                    <Text style={styles.hashLabel}>Stored hash (digital DPP)</Text>
                                    <Text style={styles.hashValue}>{verificationResult.storedHash}</Text>
                                    {scannedPhysicalHash != null && (
                                        <>
                                            <Text style={[styles.hashLabel, { marginTop: 8 }]}>Physical QR hash</Text>
                                            <Text style={[
                                                styles.hashValue,
                                                { color: scannedPhysicalHash === verificationResult.storedHash ? '#34C759' : '#FF3B30' },
                                            ]}>
                                                {scannedPhysicalHash}
                                            </Text>
                                        </>
                                    )}
                                    <Text style={[styles.hashLabel, { marginTop: 8 }]}>Recalculated</Text>
                                    <Text style={[
                                        styles.hashValue,
                                        { color: verificationResult.isValid ? '#34C759' : '#FF3B30' }
                                    ]}>
                                        {verificationResult.recalculatedHash}
                                    </Text>
                                </ScrollView>

                                {verificationResult.isValid && (
                                    <TouchableOpacity
                                        style={styles.viewBtn}
                                        onPress={() => {
                                            handleReset();
                                            navigation.navigate('DppPassport', { dppId: scannedLotId });
                                        }}
                                    >
                                        <Ionicons name="document-text-outline" size={18} color="white" />
                                        <Text style={styles.viewBtnText}>View Passport</Text>
                                    </TouchableOpacity>
                                )}
                            </>
                        ) : null}

                        <TouchableOpacity style={styles.rescanBtn} onPress={handleReset}>
                            <Ionicons name="scan-outline" size={18} color="#5856D6" />
                            <Text style={styles.rescanText}>Scan Again</Text>
                        </TouchableOpacity>
                    </View>
                </View>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1 },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    overlay: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
    },
    scanText: {
        fontSize: 22, fontWeight: 'bold', color: 'white',
        marginBottom: 32, textShadowColor: 'black', textShadowRadius: 8,
    },
    scanFrame: {
        width: 260, height: 260,
        borderWidth: 2, borderColor: '#00E0FF',
        borderRadius: 20, backgroundColor: 'transparent',
    },
    hint: {
        color: 'rgba(255,255,255,0.7)', fontSize: 13,
        marginTop: 20, textAlign: 'center', paddingHorizontal: 40,
    },
    modalBackdrop: {
        flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'flex-end',
    },
    resultCard: {
        backgroundColor: 'white',
        borderTopLeftRadius: 28, borderTopRightRadius: 28,
        padding: 28, alignItems: 'center', gap: 12, maxHeight: '78%',
    },
    verifyingText: { fontSize: 16, color: '#5856D6', fontWeight: '600', marginTop: 8 },
    resultBadge: {
        paddingHorizontal: 22, paddingVertical: 9,
        borderRadius: 24,
    },
    resultBadgeText: { fontSize: 15, fontWeight: '800', letterSpacing: 1 },
    resultTitle: { fontSize: 18, fontWeight: '700', color: '#1C1C1E', textAlign: 'center' },
    resultSub: { fontSize: 13, color: '#636366', textAlign: 'center' },
    hashBox: {
        width: '100%', backgroundColor: '#1C1C1E',
        borderRadius: 12, padding: 14, maxHeight: 140,
    },
    hashLabel: { color: '#8E8E93', fontSize: 10, fontWeight: '700', textTransform: 'uppercase' },
    hashValue: { color: '#30D158', fontFamily: 'monospace', fontSize: 10, marginTop: 2 },
    viewBtn: {
        backgroundColor: '#5856D6', flexDirection: 'row', alignItems: 'center',
        gap: 8, paddingVertical: 14, paddingHorizontal: 28,
        borderRadius: 14, width: '100%', justifyContent: 'center',
    },
    viewBtnText: { color: 'white', fontWeight: '700', fontSize: 15 },
    rescanBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        paddingVertical: 12, paddingHorizontal: 24,
        borderRadius: 12, borderWidth: 1.5, borderColor: '#5856D6',
        width: '100%', justifyContent: 'center',
    },
    rescanText: { color: '#5856D6', fontWeight: '700', fontSize: 15 },
    physicalCheckBanner: {
        width: '100%', borderRadius: 14, padding: 16,
        flexDirection: 'row', alignItems: 'center', gap: 10,
        borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
    },
    physicalCheckIcon: { fontSize: 30 },
    physicalCheckText: { flex: 1, fontSize: 13, fontWeight: '800', lineHeight: 19 },
});
