import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Share, Dimensions } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../../shared/styles/colors';
import { ReportService } from '../../../core/services/ReportService';

export const TestReportScreen = () => {
    const route = useRoute();
    const navigation = useNavigation();
    const { batchId, result, params, pdfUri } = route.params || {} as any;

    const handleShare = async () => {
        if (pdfUri) {
            await ReportService.sharePDF(pdfUri);
        } else {
            // Fallback text share
            try {
                await Share.share({
                    message: `Rubber Grading Report\nBatch ID: ${batchId}\nResult: ${result?.predictedClass}\nConf: ${(result?.confidence * 100).toFixed(1)}%`,
                });
            } catch (error) {
                console.log(error);
            }
        }
    };

    return (
        <ScrollView contentContainerStyle={styles.container}>
            <LinearGradient
                colors={[colors.primary, "#1B5E20"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.headerRow}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Test Report</Text>
                <TouchableOpacity onPress={handleShare} style={styles.shareBtn}>
                    <Ionicons name="share-social-outline" size={24} color="#FFF" />
                </TouchableOpacity>
            </LinearGradient>

            <View style={styles.contentPadding}>

                <View style={styles.reportCard}>
                    <View style={styles.reportHeader}>
                        <Text style={styles.batchId}>Batch #{batchId || 'N/A'}</Text>
                        <Text style={styles.date}>{new Date().toLocaleDateString()}</Text>
                    </View>

                    <View style={styles.divider} />

                    <View style={styles.resultSection}>
                        <View style={styles.row}>
                            {/* Defect Type Section */}
                            <View style={[styles.halfCardContainer, { marginRight: 8 }]}>
                                <LinearGradient
                                    colors={['#ffffff', '#FFF5F5']}
                                    style={styles.halfCardGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <View style={styles.iconCircleRed}>
                                        <Ionicons name="alert-circle-outline" size={24} color="#E53935" />
                                    </View>
                                    <Text style={styles.sectionLabel}>Defect Type</Text>
                                    {result ? (
                                        <>
                                            <Text style={styles.gradeDisplaySmall} numberOfLines={2}>
                                                {result.predictedClass}
                                            </Text>
                                            <View style={[styles.severityBadge, { backgroundColor: '#FFEBEE' }]}>
                                                <Text style={[styles.severityText, { color: '#D32F2F' }]}>
                                                    {result.severity || 'Unknown'} Severity
                                                </Text>
                                            </View>
                                        </>
                                    ) : (
                                        <Text style={styles.noData}>N/A</Text>
                                    )}
                                </LinearGradient>
                            </View>

                            {/* Quality Grade Section */}
                            <View style={[styles.halfCardContainer, { marginLeft: 8 }]}>
                                <LinearGradient
                                    colors={['#ffffff', '#F1F8E9']}
                                    style={styles.halfCardGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 1 }}
                                >
                                    <View style={styles.iconCircleGreen}>
                                        <Ionicons name="ribbon-outline" size={24} color="#43A047" />
                                    </View>
                                    <Text style={styles.sectionLabel}>Quality Grade</Text>
                                    {result ? (
                                        (() => {
                                            const prediction = result.predictedClass?.toLowerCase() || "";
                                            let grade = "Ungraded";
                                            let isGood = false;

                                            if (prediction.includes("good")) { grade = "RSS 1"; isGood = true; }
                                            else if (prediction.includes("pin")) { grade = "RSS 2"; isGood = false; }
                                            else if (prediction.includes("reaper")) { grade = "RSS 3"; isGood = false; }

                                            return (
                                                <View style={styles.gradeContent}>
                                                    <Text style={[styles.gradeValueLarge, { color: isGood ? '#2E7D32' : '#EF6C00' }]}>
                                                        {grade}
                                                    </Text>
                                                    <View style={[styles.gradeBadge, { backgroundColor: isGood ? '#E8F5E9' : '#FFF3E0' }]}>
                                                        <Text style={[styles.gradeBadgeText, { color: isGood ? '#1B5E20' : '#E65100' }]}>
                                                            {isGood ? 'Premium' : 'Standard'}
                                                        </Text>
                                                    </View>
                                                </View>
                                            );
                                        })()
                                    ) : (
                                        <Text style={styles.noData}>N/A</Text>
                                    )}
                                </LinearGradient>
                            </View>
                        </View>

                        {result && (
                            <View style={styles.confidenceContainer}>
                                <Ionicons name="analytics-outline" size={16} color={colors.gray} style={{ marginRight: 6 }} />
                                <Text style={styles.confidence}>
                                    AI Confidence: <Text style={styles.confidenceValue}>{(result.confidence * 100).toFixed(1)}%</Text>
                                </Text>
                            </View>
                        )}
                    </View>

                    {result?.suggestions && (
                        <View style={styles.suggestionBox}>
                            <View style={styles.suggestionHeader}>
                                <Ionicons name="bulb-outline" size={20} color={colors.secondary} />
                                <Text style={styles.suggestionTitle}>AI Suggestions</Text>
                            </View>
                            {result.suggestions.split(/\r?\n/).map((point: string, index: number) => (
                                <View key={index} style={styles.suggestionRow}>
                                    <Text style={styles.bulletPoint}>•</Text>
                                    <Text style={styles.suggestionText}>{point.replace(/^•\s*/, '')}</Text>
                                </View>
                            ))}
                        </View>
                    )}

                    <View style={styles.metaContainer}>
                        <MetaRow label="Tester" value={params?.testerName || 'Unknown'} />
                        <MetaRow label="Sheet Count" value={params?.sheetCount || '-'} />
                        <MetaRow label="Weight" value={params?.sheetWeight ? `${params.sheetWeight} kg` : '-'} />
                    </View>

                    {pdfUri && (
                        <TouchableOpacity style={styles.pdfBtnContainer} onPress={handleShare}>
                            <LinearGradient
                                colors={[colors.secondary, '#FFA000']}
                                style={styles.pdfBtnGradient}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 0 }}
                            >
                                <Ionicons name="share-social" size={20} color="#FFF" />
                                <Text style={styles.pdfBtnText}>Share / Save PDF</Text>
                            </LinearGradient>
                        </TouchableOpacity>
                    )}

                    <TouchableOpacity
                        style={styles.pdfBtnContainer}
                        onPress={() => navigation.navigate('ReportsDashboard' as never)}
                    >
                        <LinearGradient
                            colors={[colors.primary, '#4CAF50']}
                            style={styles.pdfBtnGradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Ionicons name="list" size={20} color="#FFF" />
                            <Text style={styles.pdfBtnText}>View All Reports</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                </View>

                <View style={{ paddingBottom: 20 }}>
                    <TouchableOpacity
                        style={styles.doneBtnContainer}
                        onPress={() => navigation.navigate('QcLabHome' as never)}
                    >
                        <LinearGradient
                            colors={[colors.primary, '#1B5E20']}
                            style={styles.doneBtnGradient}
                        >
                            <Text style={styles.doneBtnText}>Done</Text>
                        </LinearGradient>
                    </TouchableOpacity>
                </View>
            </View>
        </ScrollView>
    );
};

const MetaRow = ({ label, value }: { label: string, value: string }) => (
    <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>{label}</Text>
        <Text style={styles.metaValue}>{value}</Text>
    </View>
);

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: colors.lightGray,
    },
    contentPadding: {
        padding: 20,
    },
    headerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: 35,
        paddingBottom: 15,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        marginBottom: 10,
    },
    backBtn: {
        padding: 8,
    },
    shareBtn: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
    },
    reportCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 10,
        elevation: 5,
        marginBottom: 30,
    },
    reportHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 15,
    },
    batchId: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
    },
    date: {
        fontSize: 14,
        color: colors.gray,
    },
    divider: {
        height: 1,
        backgroundColor: '#F0F0F0',
        marginVertical: 15,
    },
    resultSection: {
        marginBottom: 25,
    },
    row: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
        marginBottom: 15,
    },
    halfCardContainer: {
        flex: 1,
        borderRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    halfCardGradient: {
        flex: 1,
        padding: 16,
        borderRadius: 20,
        alignItems: 'center',
        justifyContent: 'flex-start',
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.03)',
        minHeight: 180,
    },
    iconCircleRed: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#FFEBEE',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    iconCircleGreen: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: '#E8F5E9',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 12,
    },
    gradeDisplaySmall: {
        fontSize: 16,
        fontWeight: '700',
        color: '#2D3436',
        marginBottom: 10,
        textAlign: 'center',
        lineHeight: 22,
    },
    severityBadge: {
        paddingVertical: 5,
        paddingHorizontal: 10,
        borderRadius: 8,
        marginTop: 4,
    },
    severityText: {
        fontSize: 11,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    gradeContent: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    gradeValueLarge: {
        fontSize: 28,
        fontWeight: '900',
        marginBottom: 8,
        letterSpacing: 0.5,
    },
    gradeBadge: {
        paddingVertical: 4,
        paddingHorizontal: 12,
        borderRadius: 12,
    },
    gradeBadgeText: {
        fontSize: 12,
        fontWeight: '700',
        textTransform: 'uppercase',
    },
    sectionLabel: {
        fontSize: 12,
        color: '#95A5A6',
        textTransform: 'uppercase',
        letterSpacing: 0.8,
        fontWeight: '600',
        marginBottom: 8,
    },
    confidenceContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#F8F9FA',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        alignSelf: 'center',
    },
    confidence: {
        fontSize: 13,
        color: colors.gray,
        fontWeight: '500',
    },
    confidenceValue: {
        color: colors.text,
        fontWeight: '700',
    },
    noData: {
        color: colors.gray,
        fontStyle: 'italic',
        fontSize: 14,
    },
    suggestionBox: {
        backgroundColor: '#FFF9C4', // Light yellow for suggestion
        borderRadius: 12,
        padding: 15,
        marginBottom: 25,
    },
    suggestionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 8,
    },
    suggestionTitle: {
        fontSize: 15,
        fontWeight: '700',
        color: '#FBC02D',
    },
    suggestionText: {
        fontSize: 14,
        color: '#555',
        lineHeight: 22,
        flex: 1,
    },
    suggestionRow: {
        flexDirection: 'row',
        marginBottom: 6,
        alignItems: 'flex-start',
    },
    bulletPoint: {
        fontSize: 14,
        color: colors.secondary,
        marginRight: 8,
        fontWeight: 'bold',
        lineHeight: 22,
    },
    metaContainer: {
        backgroundColor: '#F9F9F9',
        borderRadius: 12,
        padding: 15,
    },
    metaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    metaLabel: {
        fontSize: 14,
        color: colors.gray,
    },
    metaValue: {
        fontSize: 14,
        fontWeight: '600',
        color: colors.text,
    },
    pdfBtnContainer: {
        marginTop: 15,
        borderRadius: 12,
        overflow: 'hidden',
    },
    pdfBtnGradient: {
        padding: 15,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    pdfBtnText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 16
    },
    doneBtnContainer: {
        borderRadius: 15,
        overflow: 'hidden',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 6,
    },
    doneBtnGradient: {
        paddingVertical: 18,
        alignItems: 'center',
    },
    doneBtnText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
    },
});
