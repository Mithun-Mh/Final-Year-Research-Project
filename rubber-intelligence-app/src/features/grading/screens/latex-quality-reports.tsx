import React, { useState, useCallback } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    Alert,
    RefreshControl,
    Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons, MaterialIcons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { ReportService, SavedReportInfo } from '../../../core/services/ReportService';
import { colors } from '../../../shared/styles/colors';
import Animated, { FadeInDown } from 'react-native-reanimated';

const { width } = Dimensions.get('window');

interface ParsedReport {
    fileUri: string;
    fileName: string;
    testId: string;
    score: number;
    grade: string;
    status: string;
    date: string;
    time: string;
}

const LatexQualityReportsScreen = () => {
    const navigation = useNavigation<any>();
    const [reports, setReports] = useState<ParsedReport[]>([]);
    const [refreshing, setRefreshing] = useState(false);

    const parseFilename = (filename: string): ParsedReport | null => {
        // Format: Report_Latex_{ID}_{Score}_{Grade}_{Status}_{Date}_{Time}.pdf
        try {
            if (!filename.startsWith('Report_Latex_')) return null;

            const parts = filename.replace('.pdf', '').split('_');
            if (parts.length < 8) return null;

            // 0: Report, 1: Latex
            const testId = parts[2];
            const score = parseInt(parts[3]);
            const grade = parts[4];
            const status = parts[5];
            const date = parts[6];
            const time = parts.slice(7).join(':'); // Rejoin time if it had underscores, though we used hyphens

            return {
                fileUri: filename, // Just the name, uri constructed in service list
                fileName: filename,
                testId,
                score,
                grade,
                status,
                date,
                time
            };
        } catch (e) {
            return null;
        }
    };

    const loadReports = async () => {
        try {
            const files = await ReportService.listSavedReports();
            const parsed = files
                .map(f => {
                    const parsedData = parseFilename(f.name);
                    if (parsedData) {
                        return { ...parsedData, fileUri: f.uri };
                    }
                    return null;
                })
                .filter((r): r is ParsedReport => r !== null);

            setReports(parsed);
        } catch (error) {
            console.error("Error loading reports", error);
        }
    };

    useFocusEffect(
        useCallback(() => {
            loadReports();
        }, [])
    );

    const onRefresh = React.useCallback(async () => {
        setRefreshing(true);
        await loadReports();
        setRefreshing(false);
    }, []);

    const handleDownloadReport = async (uri: string) => {
        await ReportService.sharePDF(uri);
    };

    const handleDeleteReport = (report: ParsedReport) => {
        Alert.alert(
            "Delete Report",
            `Are you sure you want to delete the report for ${report.testId}?`,
            [
                { text: "Cancel", style: "cancel" },
                {
                    text: "Delete",
                    style: "destructive",
                    onPress: async () => {
                        const success = await ReportService.deleteReport(report.fileUri);
                        if (success) {
                            loadReports();
                        } else {
                            Alert.alert("Error", "Failed to delete report.");
                        }
                    }
                }
            ]
        );
    };

    const getStatusColor = (status: string) => {
        if (status === 'Pass') return '#10B981';
        if (status === 'Warning') return '#F59E0B';
        return '#EF4444';
    };

    const getStatusIcon = (status: string) => {
        if (status === 'Pass') return 'check-circle';
        if (status === 'Warning') return 'alert-circle';
        return 'close-circle';
    };

    return (
        <View style={styles.container}>
            {/* Header */}
            <LinearGradient
                colors={[colors.primary, '#1B5E20']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <View style={styles.headerRow}>
                    <TouchableOpacity
                        style={styles.backButton}
                        onPress={() => navigation.goBack()}
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>
                    <View style={styles.headerContent}>
                        <View style={styles.headerTitleRow}>
                            <MaterialCommunityIcons name="file-document-multiple-outline" size={26} color="white" />
                            <Text style={styles.headerTitle}>Quality Reports</Text>
                        </View>
                        <Text style={styles.headerSubtitle}>{reports.length} Reports Available</Text>
                    </View>
                    <View style={{ width: 40 }} />
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[colors.primary]} />
                }
            >
                {reports.length === 0 ? (
                    <View style={styles.emptyState}>
                        <MaterialCommunityIcons name="file-document-outline" size={64} color="#CBD5E1" />
                        <Text style={styles.emptyStateText}>No saved reports found</Text>
                        <Text style={styles.emptyStateSubtext}>Run a test and export the results to see them here.</Text>
                    </View>
                ) : (
                    <View style={styles.reportsList}>
                        {reports.map((report, index) => {
                            const statusColor = getStatusColor(report.status);
                            const icon = getStatusIcon(report.status);

                            return (
                                <Animated.View
                                    key={report.fileName}
                                    entering={FadeInDown.delay(index * 100).duration(500)}
                                >
                                    <LinearGradient
                                        colors={[`${statusColor}08`, '#FFFFFF']}
                                        start={{ x: 0, y: 0 }}
                                        end={{ x: 1, y: 1 }}
                                        style={[styles.reportCard, { borderLeftColor: statusColor }]}
                                    >
                                        <View style={styles.cardHeader}>
                                            <View style={styles.titleRow}>
                                                <MaterialCommunityIcons name={icon as any} size={20} color={statusColor} />
                                                <Text style={styles.testId}>{report.testId}</Text>
                                                <View style={[styles.statusBadge, { backgroundColor: `${statusColor}15` }]}>
                                                    <Text style={[styles.statusText, { color: statusColor }]}>{report.status}</Text>
                                                </View>
                                            </View>
                                        </View>

                                        <View style={styles.cardBody}>
                                            <View style={styles.scoreBlock}>
                                                <Text style={styles.scoreValue}>{report.score}%</Text>
                                                <Text style={[styles.gradeText, { color: statusColor }]}>{report.grade} </Text>
                                            </View>
                                            <View style={styles.timeBlock}>
                                                <MaterialCommunityIcons name="clock-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
                                                <Text style={styles.timeText}>{report.time}</Text>
                                            </View>
                                        </View>

                                        <View style={styles.cardFooter}>
                                            <View style={styles.actionButtons}>
                                                <TouchableOpacity
                                                    style={styles.actionButton}
                                                    onPress={() => handleDownloadReport(report.fileUri)}
                                                >
                                                    <Text style={[styles.actionButtonText, { color: colors.primary }]}>Download</Text>
                                                    <MaterialIcons name="file-download" size={16} color={colors.primary} style={{ marginLeft: 4 }} />
                                                </TouchableOpacity>

                                                <TouchableOpacity
                                                    style={[styles.actionButton, styles.deleteButton]}
                                                    onPress={() => handleDeleteReport(report)}
                                                >
                                                    <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete</Text>
                                                    <MaterialIcons name="delete-outline" size={16} color="#EF4444" style={{ marginLeft: 4 }} />
                                                </TouchableOpacity>
                                            </View>
                                            <Text style={styles.dateText}>{report.date}</Text>
                                        </View>
                                    </LinearGradient>
                                </Animated.View>
                            );
                        })}
                    </View>
                )}
                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        paddingTop: 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerContent: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 4,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: '800',
        color: 'white',
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        padding: 20,
        paddingTop: 10,
    },
    emptyState: {
        alignItems: 'center',
        justifyContent: 'center',
        marginTop: 80,
        opacity: 0.7,
    },
    emptyStateText: {
        fontSize: 18,
        fontWeight: '700',
        color: '#64748B',
        marginTop: 16,
    },
    emptyStateSubtext: {
        fontSize: 14,
        color: '#94A3B8',
        marginTop: 8,
        textAlign: 'center',
        maxWidth: 250,
    },
    reportsList: {
        gap: 16,
        paddingTop: 10,
    },
    reportCard: {
        backgroundColor: 'white',
        borderRadius: 20,
        padding: 20,
        borderLeftWidth: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 16,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    testId: {
        fontSize: 17,
        fontWeight: '800',
        color: '#1E293B',
    },
    statusBadge: {
        paddingHorizontal: 10,
        paddingVertical: 4,
        borderRadius: 12,
    },
    statusText: {
        fontSize: 11,
        fontWeight: '800',
        textTransform: 'uppercase',
    },
    cardBody: {
        paddingBottom: 16,
        marginBottom: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#F1F5F9',
    },
    scoreBlock: {
        flexDirection: 'row',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: 8,
    },
    scoreValue: {
        fontSize: 32,
        fontWeight: '800',
        color: '#333',
        letterSpacing: -1,
    },
    gradeText: {
        fontSize: 15,
        fontWeight: '600',
    },
    timeBlock: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    timeText: {
        fontSize: 13,
        color: '#64748B',
        fontWeight: '500',
    },
    cardFooter: {
        marginTop: 12,
        alignItems: 'flex-end', // Align content to the right
    },
    actionButtons: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 6, // Space between buttons and date
    },
    actionButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 10,
        backgroundColor: '#F8FAFC',
        borderWidth: 1,
        borderColor: '#E2E8F0',
    },
    deleteButton: {
        backgroundColor: '#FEF2F2',
        borderColor: '#FEE2E2',
    },
    actionButtonText: {
        fontSize: 13,
        fontWeight: '700',
    },
    dateText: {
        fontSize: 11,
        color: '#94A3B8',
        fontWeight: '500',
    },
});

export default LatexQualityReportsScreen;