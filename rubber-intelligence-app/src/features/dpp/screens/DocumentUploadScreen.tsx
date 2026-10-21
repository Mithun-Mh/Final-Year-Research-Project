import React, { useState } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, Image,
    ScrollView, ActivityIndicator, Alert
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { uploadDppDocument } from '../services/dppService';
import { linkDppToTransaction } from '../services/marketplaceService';

const COLORS = {
    primary: '#007AFF',
    bg: '#F2F2F7',
    white: '#FFFFFF',
    text: '#1C1C1E',
    sub: '#636366',
    border: '#E5E5EA',
    purple: '#5856D6',
};

export default function DocumentUploadScreen() {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { transactionId } = route.params || {};
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);

    const pickImage = async () => {
        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            quality: 1,
        });
        if (!result.canceled) setImage(result.assets[0].uri);
    };

    const takePhoto = async () => {
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Camera access is required to scan documents.');
            return;
        }
        const result = await ImagePicker.launchCameraAsync({ allowsEditing: true, quality: 1 });
        if (!result.canceled) setImage(result.assets[0].uri);
    };

    const processDocument = async () => {
        if (!image) return;
        setLoading(true);
        try {
            const fileName = image.split('/').pop() || 'document.jpg';
            const match = /\.(\w+)$/.exec(fileName);
            const fileType = match ? `image/${match[1]}` : `image/jpeg`;

            const result = await uploadDppDocument(image, fileName, fileType);

            if (transactionId) {
                await linkDppToTransaction(transactionId, result.dppId);
                Alert.alert('✅ Success', 'DPP Document linked to order successfully!');
                navigation.navigate('BuyerDashboard');
                return;
            }

            // Navigate to classification result with new shape
            navigation.navigate('ClassificationResult', { result });
        } catch (error: any) {
            if (error.response?.status === 429) {
                Alert.alert('Quota Exceeded', 'Gemini API quota exceeded. Please try again later.');
            } else if (error.response?.status >= 500) {
                Alert.alert('Server Error', 'The server encountered an error. Please try again.');
            } else if (error.response) {
                Alert.alert('Upload Failed', error.response.data?.error || 'Unknown error occurred.');
            } else if (error.request) {
                Alert.alert('Network Error', 'No response from server. Check your connection.');
            } else {
                Alert.alert('Error', 'An unexpected error occurred.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="chevron-back" size={24} color={COLORS.primary} />
                </TouchableOpacity>
                <View>
                    <Text style={styles.title}>
                        {transactionId ? 'Link Order DPP' : 'Secure DPP Upload'}
                    </Text>
                    <Text style={styles.subtitle}>
                        {transactionId
                            ? `Order #${transactionId.substring(0, 8)}`
                            : 'Field-level AES-256 confidentiality protection'}
                    </Text>
                </View>
            </View>

            <ScrollView contentContainerStyle={styles.content}>
                {/* Security badge */}
                {/* Pipeline step indicator */}
                <View style={styles.pipelineStrip}>
                    <View style={styles.pipelineStep}>
                        <View style={[styles.stepDot, styles.stepDotActive]}>
                            <Text style={styles.stepDotText}>A</Text>
                        </View>
                        <Text style={styles.stepLabel}>Extract &amp; Secure</Text>
                    </View>
                    <View style={styles.pipelineConnector} />
                    <View style={styles.pipelineStep}>
                        <View style={styles.stepDot}>
                            <Text style={styles.stepDotTextInactive}>B</Text>
                        </View>
                        <Text style={[styles.stepLabel, { color: '#AEAEB2' }]}>Generate Passport</Text>
                    </View>
                </View>

                <View style={styles.securityBadge}>
                    <Ionicons name="shield-checkmark" size={16} color={COLORS.purple} />
                    <Text style={styles.securityText}>
                        Gemini AI OCR · Field-Level AES-256 · SHA-256 Integrity
                    </Text>
                </View>

                {/* Document preview */}
                <View style={styles.previewContainer}>
                    {image ? (
                        <Image source={{ uri: image }} style={styles.image} />
                    ) : (
                        <View style={styles.placeholder}>
                            <Ionicons name="document-text-outline" size={64} color="#C7C7CC" />
                            <Text style={styles.placeholderText}>No document selected</Text>
                            <Text style={styles.placeholderSub}>JPG · PNG · PDF · WEBP · GIF</Text>
                        </View>
                    )}
                </View>

                {/* Pick actions */}
                <View style={styles.actions}>
                    <TouchableOpacity style={styles.buttonSecondary} onPress={pickImage}>
                        <Ionicons name="images-outline" size={22} color={COLORS.primary} />
                        <Text style={styles.buttonTextSecondary}>Gallery</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.buttonSecondary} onPress={takePhoto}>
                        <Ionicons name="camera-outline" size={22} color={COLORS.primary} />
                        <Text style={styles.buttonTextSecondary}>Camera</Text>
                    </TouchableOpacity>
                </View>

                {/* Supported formats */}
                <View style={styles.formatsStrip}>
                    <Ionicons name="document-attach-outline" size={14} color={COLORS.purple} />
                    <Text style={styles.formatsLabel}>Supported:</Text>
                    {['JPG', 'PNG', 'PDF', 'WEBP', 'GIF'].map(fmt => (
                        <View key={fmt} style={styles.formatChip}>
                            <Text style={styles.formatChipText}>{fmt}</Text>
                        </View>
                    ))}
                </View>

                {image && (
                    <TouchableOpacity
                        style={[styles.buttonPrimary, loading && styles.buttonDisabled]}
                        onPress={processDocument}
                        disabled={loading}
                    >  
                        {loading ? (
                            <>
                                <ActivityIndicator color="white" />
                                <Text style={styles.buttonTextPrimary}>Extracting and Securing Document...</Text>
                            </>
                        ) : (
                            <>
                                <Ionicons name="scan-circle-outline" size={24} color="white" />
                                <Text style={styles.buttonTextPrimary}>Extract &amp; Secure Document</Text>
                            </>
                        )}
                    </TouchableOpacity>
                )}

                {/* Info strip */}
                <View style={styles.infoStrip}>
                    <Ionicons name="information-circle-outline" size={16} color={COLORS.sub} />
                    <Text style={styles.infoText}>
                        <Text style={{ fontWeight: '700' }}>Step A</Text>
                        {' — Gemini AI extracts fields, classifies each one, and AES-256 encrypts confidential values before any data reaches MongoDB.\n'}
                        <Text style={{ fontWeight: '700' }}>Step B</Text>
                        {' — You review and approve before the privacy-preserving Digital Product Passport is minted.'}
                    </Text>
                </View>
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: COLORS.bg },
    header: {
        paddingTop: 60,
        paddingBottom: 20,
        paddingHorizontal: 20,
        backgroundColor: COLORS.white,
        borderBottomWidth: 1,
        borderBottomColor: COLORS.border,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    backBtn: {
        width: 36, height: 36,
        borderRadius: 18,
        backgroundColor: '#F0F8FF',
        justifyContent: 'center', alignItems: 'center',
    },
    title: { fontSize: 22, fontWeight: '800', color: COLORS.text },
    subtitle: { fontSize: 13, color: COLORS.sub, marginTop: 2 },
    content: { padding: 20, alignItems: 'center' },
    securityBadge: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        backgroundColor: '#EEF0FF',
        paddingHorizontal: 14, paddingVertical: 8,
        borderRadius: 20, marginBottom: 20, alignSelf: 'stretch',
        justifyContent: 'center',
    },
    securityText: { color: COLORS.purple, fontSize: 11, fontWeight: '600' },
    previewContainer: {
        width: '100%', height: 360,
        backgroundColor: COLORS.white,
        borderRadius: 20, overflow: 'hidden',
        justifyContent: 'center', alignItems: 'center',
        elevation: 4,
        shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08, shadowRadius: 10,
        marginBottom: 20,
    },
    image: { width: '100%', height: '100%', resizeMode: 'contain' },
    placeholder: { alignItems: 'center', gap: 8 },
    placeholderText: { color: '#AEAEB2', fontSize: 16, fontWeight: '600' },
    placeholderSub: { color: '#C7C7CC', fontSize: 12 },
    actions: { flexDirection: 'row', gap: 12, marginBottom: 16, width: '100%' },
    buttonSecondary: {
        flex: 1, flexDirection: 'row', backgroundColor: COLORS.white,
        padding: 14, borderRadius: 14,
        alignItems: 'center', justifyContent: 'center', gap: 8,
        borderWidth: 1.5, borderColor: COLORS.primary,
    },
    buttonTextSecondary: { color: COLORS.primary, fontWeight: '700', fontSize: 15 },
    buttonPrimary: {
        width: '100%', backgroundColor: COLORS.primary,
        padding: 18, borderRadius: 16,
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12,
        shadowColor: COLORS.primary, shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.35, shadowRadius: 12, elevation: 6,
        marginBottom: 20,
    },
    buttonDisabled: { opacity: 0.7 },
    buttonTextPrimary: { color: 'white', fontSize: 17, fontWeight: '800' },
    infoStrip: {
        flexDirection: 'row', gap: 8, padding: 14,
        backgroundColor: '#F0F8FF', borderRadius: 12, alignItems: 'flex-start',
        alignSelf: 'stretch',
    },
    infoText: { flex: 1, fontSize: 12, color: COLORS.sub, lineHeight: 18 },
    // Pipeline step strip
    pipelineStrip: {
        flexDirection: 'row', alignItems: 'center',
        alignSelf: 'stretch', marginBottom: 16, paddingHorizontal: 4,
    },
    pipelineStep: { alignItems: 'center', gap: 5 },
    pipelineConnector: { flex: 1, height: 2, backgroundColor: COLORS.purple, marginHorizontal: 8, marginBottom: 14 },
    stepDot: {
        width: 28, height: 28, borderRadius: 14,
        backgroundColor: '#E5E5EA',
        justifyContent: 'center', alignItems: 'center',
    },
    stepDotActive: { backgroundColor: COLORS.purple },
    stepDotText: { color: 'white', fontSize: 12, fontWeight: '800' },
    stepDotTextInactive: { color: '#8E8E93', fontSize: 12, fontWeight: '800' },
    stepLabel: { fontSize: 11, fontWeight: '700', color: COLORS.purple },
    formatsStrip: {
        flexDirection: 'row', alignItems: 'center', gap: 6,
        marginBottom: 14, flexWrap: 'wrap', alignSelf: 'stretch',
    },
    formatsLabel: { fontSize: 11, color: COLORS.sub, fontWeight: '700' },
    formatChip: {
        borderWidth: 1.5, borderColor: COLORS.purple,
        paddingHorizontal: 10, paddingVertical: 3, borderRadius: 14,
    },
    formatChipText: { color: COLORS.purple, fontSize: 11, fontWeight: '700' },
});
