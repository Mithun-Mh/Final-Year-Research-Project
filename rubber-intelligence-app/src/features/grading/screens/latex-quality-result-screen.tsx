import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    StatusBar,
    SafeAreaView,
    Dimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation, useRoute } from "@react-navigation/native";
import { colors } from "../../../shared/styles/colors";
import Animated, {
    FadeInDown,
    FadeInUp,
    ZoomIn,
} from "react-native-reanimated";
import { LatexQualityResponse } from "../../../core/services/latexQualityService";
import { ReportService } from "../../../core/services/ReportService";
import { Alert } from "react-native";

const { width } = Dimensions.get("window");

interface RouteParams {
    result: LatexQualityResponse;
    testId: string;
    testDate: string;
    testTime: string;
}

const LatexQualityResultScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute();
    const { result, testId, testDate, testTime } = route.params as RouteParams;

    const getQualityColor = () => {
        if (result.qualityScore >= 90) return "#10B981";
        if (result.qualityScore >= 75) return "#3B82F6";
        if (result.qualityScore >= 60) return "#F59E0B";
        return "#EF4444";
    };

    const getStatusIcon = () => {
        if (result.status === "Pass") return "check-circle";
        if (result.status === "Warning") return "alert-circle";
        return "close-circle";
    };

    const getStatusColor = () => {
        if (result.status === "Pass") return "#10B981";
        if (result.status === "Warning") return "#F59E0B";
        return "#EF4444";
    };

    const handleNewTest = () => {
        navigation.navigate("LatexTest");
    };

    const handleGoHome = () => {
        navigation.navigate("LatexQualityHome");
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            {/* Header Section */}
            <LinearGradient
                colors={[colors.primary, "#1B5E20"]}
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

                    <View style={styles.headerCenter}>
                        <View style={styles.headerIconContainer}>
                            <MaterialCommunityIcons name="flask-outline" size={28} color="white" />
                        </View>

                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Test Results</Text>
                            <Text style={styles.headerSubtitle}>{testId}</Text>
                        </View>
                    </View>

                    <View style={styles.headerRightPlaceholder} />
                </View>
            </LinearGradient>

            <ScrollView
                style={styles.scrollView}
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* Quality Status Card */}
                <Animated.View entering={FadeInDown.duration(500)} style={styles.statusCard}>
                    <LinearGradient
                        colors={[`${getQualityColor()}15`, "#FFFFFF"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 0, y: 1 }}
                        style={styles.statusCardGradient}
                    >
                        <View style={[styles.statusIconContainer, { backgroundColor: `${getStatusColor()}20` }]}>
                            <MaterialCommunityIcons
                                name={getStatusIcon() as any}
                                size={60}
                                color={getStatusColor()}
                            />
                        </View>

                        <Text style={[styles.qualityGrade, { color: getQualityColor() }]}>
                            {result.qualityGrade}
                        </Text>

                        <View style={[styles.statusBadge, { backgroundColor: `${getStatusColor()}15` }]}>
                            <Text style={[styles.statusText, { color: getStatusColor() }]}>
                                {result.status}
                            </Text>
                        </View>

                        {/* Quality Score */}
                        <View style={styles.scoreContainer}>
                            <Text style={styles.scoreLabel}>Model Confidence Score</Text>
                            <Text style={[styles.scoreValue, { color: getQualityColor() }]}>
                                {result.qualityScore}
                                <Text style={styles.scoreUnit}>/100</Text>
                            </Text>
                        </View>

                        {/* Confidence Meter */}
                        <View style={styles.confidenceContainer}>
                            <View style={styles.confidenceHeader}>
                                <Text style={styles.confidenceLabel}>Model Confidence</Text>
                                <Text style={styles.confidenceValue}>
                                    {(result.confidence * 100).toFixed(1)}%
                                </Text>
                            </View>
                            <View style={styles.confidenceBarBackground}>
                                <Animated.View
                                    entering={FadeInUp.delay(300).duration(800)}
                                    style={[
                                        styles.confidenceBar,
                                        {
                                            width: `${result.confidence * 100}%`,
                                            backgroundColor: getQualityColor(),
                                        },
                                    ]}
                                />
                            </View>
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* Test Information */}
                <Animated.View entering={FadeInDown.delay(200).duration(500)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="information-outline" size={24} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Test Information</Text>
                    </View>

                    <View style={styles.infoGrid}>
                        <View style={styles.infoCard}>
                            <MaterialCommunityIcons name="calendar" size={20} color="#3B82F6" />
                            <Text style={styles.infoLabel}>Date</Text>
                            <Text style={styles.infoValue}>{testDate}</Text>
                        </View>

                        <View style={styles.infoCard}>
                            <MaterialCommunityIcons name="clock-outline" size={20} color="#8B5CF6" />
                            <Text style={styles.infoLabel}>Time</Text>
                            <Text style={styles.infoValue}>{testTime}</Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Sensor Readings */}
                <Animated.View entering={FadeInDown.delay(300).duration(500)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="chip" size={24} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Sensor Readings</Text>
                    </View>

                    <View style={styles.sensorCard}>
                        <View style={styles.sensorRow}>
                            <View style={styles.sensorItem}>
                                <View style={[styles.sensorIconBox, { backgroundColor: "#EF444415" }]}>
                                    <MaterialCommunityIcons name="thermometer" size={24} color="#EF4444" />
                                </View>
                                <Text style={styles.sensorLabel}>Temperature</Text>
                                <Text style={styles.sensorValue}>
                                    {result.sensorReadings.temperature}°C
                                </Text>
                            </View>

                            <View style={styles.sensorDivider} />

                            <View style={styles.sensorItem}>
                                <View style={[styles.sensorIconBox, { backgroundColor: "#3B82F615" }]}>
                                    <MaterialCommunityIcons name="water-opacity" size={24} color="#3B82F6" />
                                </View>
                                <Text style={styles.sensorLabel}>Turbidity</Text>
                                <Text style={styles.sensorValue}>
                                    {result.sensorReadings.turbidity} NTU
                                </Text>
                            </View>

                            <View style={styles.sensorDivider} />

                            <View style={styles.sensorItem}>
                                <View style={[styles.sensorIconBox, { backgroundColor: "#10B98115" }]}>
                                    <MaterialCommunityIcons name="ph" size={24} color="#10B981" />
                                </View>
                                <Text style={styles.sensorLabel}>pH Level</Text>
                                <Text style={styles.sensorValue}>
                                    {result.sensorReadings.pH}
                                </Text>
                            </View>
                        </View>
                    </View>
                </Animated.View>

                {/* Recommendations */}
                <Animated.View entering={FadeInDown.delay(400).duration(500)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="lightbulb-on-outline" size={24} color="#F59E0B" />
                        <Text style={styles.sectionTitle}>Recommendations</Text>
                    </View>

                    <View style={styles.recommendationsContainer}>
                        {result.recommendations.map((recommendation, index) => (
                            <Animated.View
                                key={index}
                                entering={ZoomIn.delay(500 + index * 100).duration(400)}
                                style={styles.recommendationCard}
                            >
                                <View style={styles.recommendationIconContainer}>
                                    <MaterialCommunityIcons
                                        name="check-circle-outline"
                                        size={20}
                                        color="#F59E0B"
                                    />
                                </View>
                                <Text style={styles.recommendationText}>{recommendation}</Text>
                            </Animated.View>
                        ))}
                    </View>
                </Animated.View>

                {/* Action Buttons */}
                <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.actionSection}>
                    <TouchableOpacity
                        style={[styles.primaryButton, { backgroundColor: '#4F46E5', marginBottom: 12 }]}
                        onPress={async () => {
                            try {
                                const sanitizedDate = testDate.replace(/[\/\\]/g, '-');
                                const sanitizedTime = testTime.replace(/[\/\:\s]/g, '-');
                                // Filename format: Report_Latex_{ID}_{Score}_{Grade}_{Status}_{Date}_{Time}.pdf
                                const filename = `Report_Latex_${testId}_${result.qualityScore}_${result.qualityGrade}_${result.status}_${sanitizedDate}_${sanitizedTime}.pdf`;

                                const html = ReportService.generateLatexHTML({
                                    result,
                                    testId,
                                    testDate,
                                    testTime
                                });

                                const uri = await ReportService.generatePDF(html, filename);
                                if (uri) {
                                    Alert.alert(
                                        "Report Saved",
                                        "PDF report has been generated successfully.",
                                        [
                                            { text: "View Reports", onPress: () => navigation.navigate("LatexQualityReports") },
                                            { text: "Share", onPress: () => ReportService.sharePDF(uri) },
                                            { text: "OK", style: "cancel" }
                                        ]
                                    );
                                }
                            } catch (e) {
                                Alert.alert("Error", "Failed to save report.");
                            }
                        }}
                    >
                        <LinearGradient
                            colors={['#4F46E5', '#4338CA']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.primaryButtonGradient}
                        >
                            <MaterialCommunityIcons name="file-pdf-box" size={24} color="white" />
                            <Text style={styles.primaryButtonText}>Export Report as PDF</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.primaryButton}
                        onPress={handleNewTest}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={[colors.primary, "#1B5E20"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.primaryButtonGradient}
                        >
                            <MaterialCommunityIcons name="plus-circle" size={24} color="white" />
                            <Text style={styles.primaryButtonText}>New Test</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.primaryButton, { marginBottom: 12 }]}
                        onPress={() => navigation.navigate("LatexQualityReports")}
                        activeOpacity={0.9}
                    >
                        <LinearGradient
                            colors={["#0EA5E9", "#0284C7"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.primaryButtonGradient}
                        >
                            <MaterialCommunityIcons name="format-list-bulleted" size={24} color="white" />
                            <Text style={styles.primaryButtonText}>View Quality Reports</Text>
                        </LinearGradient>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={styles.secondaryButton}
                        onPress={handleGoHome}
                    >
                        <MaterialCommunityIcons name="home-outline" size={20} color={colors.primary} />
                        <Text style={styles.secondaryButtonText}>Go to Home</Text>
                    </TouchableOpacity>
                </Animated.View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F8FAFC",
    },
    header: {
        paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 12,
        elevation: 8,
    },
    headerRow: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        height: 56,
    },
    backButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginLeft: -10,
    },
    headerCenter: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        marginLeft: 36,
    },
    headerIconContainer: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    headerTextContainer: {
        alignItems: "center",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "white",
        letterSpacing: -0.5,
        marginBottom: 2,
    },
    headerSubtitle: {
        fontSize: 13,
        color: "rgba(255,255,255,0.9)",
        fontWeight: "500",
    },
    headerRightPlaceholder: {
        width: 44,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 24,
    },
    statusCard: {
        marginBottom: 28,
        borderRadius: 24,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 6,
    },
    statusCardGradient: {
        padding: 32,
        alignItems: "center",
    },
    statusIconContainer: {
        width: 100,
        height: 100,
        borderRadius: 50,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 20,
    },
    qualityGrade: {
        fontSize: 32,
        fontWeight: "800",
        marginBottom: 12,
    },
    statusBadge: {
        paddingHorizontal: 20,
        paddingVertical: 8,
        borderRadius: 20,
        marginBottom: 24,
    },
    statusText: {
        fontSize: 14,
        fontWeight: "700",
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    scoreContainer: {
        alignItems: "center",
        marginBottom: 24,
    },
    scoreLabel: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "600",
        marginBottom: 8,
    },
    scoreValue: {
        fontSize: 48,
        fontWeight: "800",
    },
    scoreUnit: {
        fontSize: 24,
        color: "#94A3B8",
    },
    confidenceContainer: {
        width: "100%",
    },
    confidenceHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 12,
    },
    confidenceLabel: {
        fontSize: 14,
        color: "#64748B",
        fontWeight: "600",
    },
    confidenceValue: {
        fontSize: 14,
        color: "#1E293B",
        fontWeight: "700",
    },
    confidenceBarBackground: {
        height: 8,
        backgroundColor: "#E2E8F0",
        borderRadius: 4,
        overflow: "hidden",
    },
    confidenceBar: {
        height: "100%",
        borderRadius: 4,
    },
    section: {
        marginBottom: 28,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 16,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#1E293B",
        marginLeft: 12,
    },
    infoGrid: {
        flexDirection: "row",
        gap: 12,
    },
    infoCard: {
        flex: 1,
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    infoLabel: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "600",
        marginTop: 8,
        marginBottom: 4,
    },
    infoValue: {
        fontSize: 14,
        fontWeight: "700",
        color: "#1E293B",
        textAlign: "center",
    },
    sensorCard: {
        backgroundColor: "white",
        borderRadius: 20,
        padding: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.08,
        shadowRadius: 12,
        elevation: 6,
    },
    sensorRow: {
        flexDirection: "row",
        justifyContent: "space-between",
    },
    sensorItem: {
        flex: 1,
        alignItems: "center",
    },
    sensorIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    sensorLabel: {
        fontSize: 12,
        color: "#64748B",
        fontWeight: "600",
        marginBottom: 4,
        textAlign: "center",
    },
    sensorValue: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1E293B",
        textAlign: "center",
    },
    sensorDivider: {
        width: 1,
        backgroundColor: "#E2E8F0",
        marginHorizontal: 12,
    },
    recommendationsContainer: {
        gap: 12,
    },
    recommendationCard: {
        flexDirection: "row",
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        alignItems: "flex-start",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 8,
        elevation: 4,
    },
    recommendationIconContainer: {
        marginRight: 12,
        marginTop: 2,
    },
    recommendationText: {
        flex: 1,
        fontSize: 14,
        color: "#475569",
        lineHeight: 20,
    },
    actionSection: {
        marginTop: 12,
        gap: 12,
    },
    primaryButton: {
        borderRadius: 16,
        overflow: "hidden",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 6,
    },
    primaryButtonGradient: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingVertical: 16,
        gap: 8,
    },
    primaryButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: "white",
    },
    secondaryButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "white",
        borderRadius: 16,
        paddingVertical: 16,
        borderWidth: 2,
        borderColor: colors.primary,
        gap: 8,
    },
    secondaryButtonText: {
        fontSize: 16,
        fontWeight: "700",
        color: colors.primary,
    },
});

export default LatexQualityResultScreen;