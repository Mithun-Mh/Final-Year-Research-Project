import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, FlatList, Image, TouchableOpacity, ActivityIndicator, RefreshControl } from 'react-native';
import { DiseaseService, DiseaseRecord } from '../services/diseaseService';
import { colors } from '../../../shared/styles/colors';
import dayjs from 'dayjs';

export const DiseaseHistoryScreen = () => {
    const [history, setHistory] = useState<DiseaseRecord[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);

    const loadHistory = async () => {
        try {
            const data = await DiseaseService.getHistory();
            setHistory(data);
        } catch (error) {
            console.error('Failed to load history', error);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        loadHistory();
    }, []);

    const onRefresh = () => {
        setRefreshing(true);
        loadHistory();
    };

    const renderItem = ({ item }: { item: DiseaseRecord }) => (
        <View style={styles.card}>
            <View style={styles.cardHeader}>
                <Text style={styles.date}>{dayjs(item.timestamp).format('MMM D, YYYY h:mm A')}</Text>
                <Text style={[styles.badge, { backgroundColor: getDiseaseColor(item.diseaseType) }]}>
                    {getDiseaseName(item.diseaseType)}
                </Text>
            </View>
            <View style={styles.row}>
                {/* Placeholder for image if we had a full URL, currently fileName is stored */}
                <View style={styles.imagePlaceholder}>
                    <Text style={{ color: '#aaa' }}>IMG</Text>
                </View>
                <View style={styles.details}>
                    <Text style={styles.label}>{item.predictedLabel}</Text>
                    <Text style={styles.confidence}>Confidence: {(item.confidence * 100).toFixed(1)}%</Text>
                </View>
            </View>
        </View>
    );

    const getDiseaseName = (type: number) => ['Leaf', 'Pest', 'Weed'][type] || 'Unknown';
    const getDiseaseColor = (type: number) => ['#4CAF50', '#FF9800', '#F44336'][type] || '#999';

    return (
        <View style={styles.container}>
            <Text style={styles.title}>Recent Detections</Text>
            {loading && !refreshing ? (
                <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 20 }} />
            ) : (
                <FlatList
                    data={history}
                    keyExtractor={(item) => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={styles.list}
                    refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
                    ListEmptyComponent={<Text style={styles.emptyText}>No records found.</Text>}
                />
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5', padding: 20 },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333' },
    list: { paddingBottom: 20 },
    card: { backgroundColor: '#fff', borderRadius: 12, padding: 15, marginBottom: 15, elevation: 2 },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
    date: { color: '#666', fontSize: 12 },
    badge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 12, color: '#fff', fontSize: 10, fontWeight: 'bold' },
    row: { flexDirection: 'row', alignItems: 'center' },
    imagePlaceholder: { width: 50, height: 50, backgroundColor: '#eee', borderRadius: 8, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    details: { flex: 1 },
    label: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    confidence: { fontSize: 12, color: '#666' },
    emptyText: { textAlign: 'center', color: '#999', marginTop: 50 }
});
