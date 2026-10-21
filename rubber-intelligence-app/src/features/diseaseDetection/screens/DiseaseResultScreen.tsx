import React from 'react';
import { View, Text, StyleSheet, Image, ScrollView, TouchableOpacity } from 'react-native';
import { colors } from '../../../shared/styles/colors';
import { Ionicons } from '@expo/vector-icons';

export const DiseaseResultScreen = ({ route, navigation }: any) => {
    const { result, imageUri } = route.params;

    return (
        <ScrollView style={styles.container} bounces={false}>
            <View>
                <Image source={{ uri: imageUri }} style={styles.image} />
                <TouchableOpacity
                    onPress={() => {
                        if (navigation.canGoBack()) {
                            navigation.goBack();
                        } else {
                            navigation.navigate('DiseaseHome');
                        }
                    }}
                    style={styles.backBtn}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
            </View>

            <View style={styles.card}>
                <View style={styles.headerRow}>
                    <Text style={styles.label}>{result.label}</Text>
                    <View style={[styles.badge, { backgroundColor: getSeverityColor(result.severity) }]}>
                        <Text style={styles.badgeText}>{result.severity} Severity</Text>
                    </View>
                </View>

                <Text style={styles.confidence}>Confidence: {(result.confidence * 100).toFixed(1)}%</Text>

                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Recommended Remedy</Text>
                    <Text style={styles.bodyText}>{result.remedy}</Text>
                </View>

                <TouchableOpacity style={styles.btn} onPress={() => navigation.navigate('DiseaseHome')}>
                    <Text style={styles.btnText}>Done</Text>
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
        case 'high': return colors.error;
        case 'medium': return '#FFA500';
        case 'low': return colors.success;
        default: return 'gray';
    }
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    image: { width: '100%', height: 300 },
    backBtn: { position: 'absolute', top: 40, left: 20, width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    card: { backgroundColor: '#FFF', borderRadius: 20, marginTop: -20, padding: 20, flex: 1 },
    headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    label: { fontSize: 24, fontWeight: 'bold', flex: 1 },
    badge: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 10 },
    badgeText: { color: '#FFF', fontWeight: 'bold', fontSize: 12 },
    confidence: { color: 'gray', marginBottom: 20 },
    section: { marginBottom: 20 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 10, color: colors.text },
    bodyText: { fontSize: 16, lineHeight: 24, color: '#444' },
    btn: { backgroundColor: colors.primary, padding: 15, borderRadius: 10, alignItems: 'center', marginTop: 10 },
    btnText: { color: '#FFF', fontWeight: 'bold', fontSize: 16 }
});
