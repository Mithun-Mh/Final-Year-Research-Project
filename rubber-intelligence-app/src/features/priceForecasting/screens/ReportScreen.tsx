
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { colors } from '../../../shared/styles/colors';
import { Ionicons } from '@expo/vector-icons';
import { ReportService } from '../../../core/services/ReportService';
import { PriceForecastingService } from '../services/priceForecastingService';

const Grades = ['RSS1', 'RSS2', 'RSS3', 'RSS4', 'RSS5'];

const VIEW_MODES = {
    HISTORY: 'Historical Data', // External Market Data (Mock for now)
    PREDICTION: 'My Predictions' // Saved Predictions from DB
};

const MOCK_HISTORY = [
    { id: 1, date: '11/30/2024', grade: 'RSS1', price: 1187.77 },
    { id: 2, date: '10/31/2024', grade: 'RSS1', price: 1151.10 },
    { id: 3, date: '09/30/2024', grade: 'RSS1', price: 1165.40 },
    { id: 4, date: '11/30/2024', grade: 'RSS2', price: 1120.00 },
];

export const ReportScreen = ({ navigation }: any) => {
    const [viewMode, setViewMode] = useState(VIEW_MODES.PREDICTION);
    const [selectedGrade, setSelectedGrade] = useState(Grades[0]);
    const [loading, setLoading] = useState(false);
    const [predictions, setPredictions] = useState<any[]>([]);

    // Fetch data when entering "Predictions" mode
    React.useEffect(() => {
        if (viewMode === VIEW_MODES.PREDICTION) {
            loadPredictions();
        }
    }, [viewMode]);

    const loadPredictions = async () => {
        try {
            const data = await PriceForecastingService.getPriceHistory(); // Uses the service we just updated
            // Map API data to UI format
            const formatted = data.map((item: any, index: number) => ({
                id: index,
                date: new Date(item.date).toLocaleDateString(),
                grade: item.grade || 'Unknown',
                price: item.price
            }));
            setPredictions(formatted);
        } catch (error) {
            console.error("Failed to load history", error);
        }
    };

    // Filter data based on view mode and grade
    const getFilteredData = () => {
        const source = viewMode === VIEW_MODES.PREDICTION ? predictions : MOCK_HISTORY;
        return source.filter(item => item.grade === selectedGrade);
    };

    const filteredData = getFilteredData();

    const handleDownloadPDF = async () => {
        if (loading) return;
        setLoading(true);
        try {
            const html = ReportService.generatePriceForecastHTML({
                type: viewMode === VIEW_MODES.PREDICTION ? 'prediction' : 'history',
                grade: selectedGrade,
                items: filteredData
            });

            const filename = `RubberPrice_${viewMode === VIEW_MODES.PREDICTION ? 'Forecast' : 'History'}_${selectedGrade}.pdf`;
            const uri = await ReportService.generatePDF(html, filename);

            if (uri) {
                await ReportService.sharePDF(uri);
            }
        } catch (error) {
            Alert.alert("Error", "Failed to generate PDF.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.title}>Rubber Reports</Text>
            </View>

            {/* Controls */}
            <View style={styles.controls}>
                {/* View Mode Toggle */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === VIEW_MODES.HISTORY && styles.toggleBtnActive]}
                        onPress={() => setViewMode(VIEW_MODES.HISTORY)}
                    >
                        <Text style={[styles.toggleText, viewMode === VIEW_MODES.HISTORY && styles.toggleTextActive]}>
                            Historical Data
                        </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === VIEW_MODES.PREDICTION && styles.toggleBtnActive]}
                        onPress={() => setViewMode(VIEW_MODES.PREDICTION)}
                    >
                        <Text style={[styles.toggleText, viewMode === VIEW_MODES.PREDICTION && styles.toggleTextActive]}>
                            Predictions
                        </Text>
                    </TouchableOpacity>
                </View>

                {/* Grade Selector (Custom Pill Style) */}
                <View style={styles.gradeSelector}>
                    <Text style={styles.label}>Grade:</Text>
                    <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginLeft: 10 }}>
                        {Grades.map(g => (
                            <TouchableOpacity
                                key={g}
                                style={[styles.gradePill, selectedGrade === g && styles.gradePillActive]}
                                onPress={() => setSelectedGrade(g)}
                            >
                                <Text style={[styles.gradeText, selectedGrade === g && styles.gradeTextActive]}>{g}</Text>
                            </TouchableOpacity>
                        ))}
                    </ScrollView>
                </View>
            </View>

            {/* Download Button */}
            <TouchableOpacity style={styles.downloadBtn} onPress={handleDownloadPDF} disabled={loading}>
                <Ionicons name="download-outline" size={20} color="#FFF" />
                <Text style={styles.downloadText}>
                    {loading ? 'Generating...' : 'Download Predictions PDF'}
                </Text>
            </TouchableOpacity>

            {/* Data List */}
            <ScrollView style={styles.list} contentContainerStyle={{ paddingBottom: 40 }}>
                {filteredData.map((item) => (
                    <View key={item.id} style={styles.card}>
                        <View style={styles.col}>
                            <Text style={styles.cardLabel}>Date</Text>
                            <Text style={styles.cardValue}>{item.date}</Text>
                        </View>
                        <View style={styles.col}>
                            <Text style={styles.cardLabel}>Grade</Text>
                            <Text style={styles.cardValue}>
                                {item.grade}
                            </Text>
                        </View>
                        <View style={[styles.col, { alignItems: 'flex-end' }]}>
                            <Text style={styles.cardLabel}>Forecasted Price</Text>
                            <Text style={styles.priceValue}>{item.price.toFixed(2)}</Text>
                        </View>
                    </View>
                ))}
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F8F9FA' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 50, backgroundColor: '#FFF' },
    backBtn: { padding: 5, marginRight: 15 },
    title: { fontSize: 22, fontWeight: 'bold' },

    controls: { backgroundColor: '#FFF', padding: 15, paddingBottom: 5 },

    toggleContainer: { flexDirection: 'row', backgroundColor: '#F0F0F0', borderRadius: 24, padding: 4, marginBottom: 15 },
    toggleBtn: { flex: 1, paddingVertical: 10, alignItems: 'center', borderRadius: 20 },
    toggleBtnActive: { backgroundColor: colors.primary },
    toggleText: { fontWeight: '500', color: '#666' },
    toggleTextActive: { color: '#FFF', fontWeight: 'bold' },

    gradeSelector: { flexDirection: 'row', alignItems: 'center', marginBottom: 10 },
    label: { fontSize: 14, color: '#666', fontWeight: '600' },
    gradePill: { paddingVertical: 6, paddingHorizontal: 12, backgroundColor: '#EEE', borderRadius: 16, marginRight: 8 },
    gradePillActive: { backgroundColor: '#E8F5E9', borderWidth: 1, borderColor: colors.primary },
    gradeText: { fontSize: 14, color: '#555' },
    gradeTextActive: { color: colors.primary, fontWeight: 'bold' },

    downloadBtn: { flexDirection: 'row', backgroundColor: '#000', margin: 15, padding: 14, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
    downloadText: { color: '#FFF', fontWeight: 'bold', marginLeft: 8 },

    list: { padding: 15 },
    card: { flexDirection: 'row', justifyContent: 'space-between', backgroundColor: '#FFF', borderRadius: 8, padding: 16, marginBottom: 12, borderWidth: 1, borderColor: '#EEE' },
    col: { flex: 1 },
    cardLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
    cardValue: { fontSize: 15, fontWeight: '600', color: '#333' },
    priceValue: { fontSize: 16, fontWeight: 'bold', color: colors.primary }
});
