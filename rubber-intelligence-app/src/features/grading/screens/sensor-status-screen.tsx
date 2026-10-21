import React, { useState } from "react";
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
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../../shared/styles/colors";
import Animated, {
    FadeInUp,
    ZoomIn,
    SlideInRight
} from "react-native-reanimated";

const { width } = Dimensions.get("window");

const SensorStatusScreen = () => {
    const navigation = useNavigation<any>();

    const handleGoBack = () => {
        navigation.goBack();
    };

    const QualityParameterCard = ({ title, optimalRange, measurement, icon, color, issues, solutions }: any) => (
        <Animated.View entering={SlideInRight.duration(600)} style={styles.parameterCard}>
            <LinearGradient
                colors={[`${color}20`, `${color}05`]}
                style={styles.parameterGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
            >
                <View style={styles.parameterHeader}>
                    <LinearGradient
                        colors={[color, `${color}CC`]}
                        style={styles.parameterIconContainer}
                    >
                        <MaterialCommunityIcons name={icon} size={28} color="white" />
                    </LinearGradient>
                    <View style={styles.parameterTitleContainer}>
                        <Text style={styles.parameterTitle}>{title}</Text>
                        <Text style={styles.parameterMeasurement}>{measurement}</Text>
                    </View>
                </View>

                <View style={[styles.optimalRangeContainer, { borderColor: `${color}30` }]}>
                    <MaterialCommunityIcons name="bullseye-arrow" size={20} color={color} />
                    <Text style={[styles.optimalRangeText, { color: color }]}>
                        Optimal: {optimalRange}
                    </Text>
                </View>

                <View style={styles.cardContentSection}>
                    <View style={styles.sectionDivider} />

                    <Text style={styles.sectionSubtitle}>Common Issues</Text>
                    {issues.map((issue: any, index: number) => (
                        <View key={index} style={styles.listItem}>
                            <View style={[styles.listIconBullet, { backgroundColor: '#EF4444' }]} />
                            <Text style={styles.listText}>{issue}</Text>
                        </View>
                    ))}

                    <View style={[styles.sectionDivider, { marginVertical: 16 }]} />

                    <Text style={styles.sectionSubtitle}>Prevention Measures</Text>
                    {solutions.map((solution: any, index: number) => (
                        <View key={index} style={styles.listItem}>
                            <View style={[styles.listIconBullet, { backgroundColor: '#10B981' }]} />
                            <Text style={styles.listText}>{solution}</Text>
                        </View>
                    ))}
                </View>
            </LinearGradient>
        </Animated.View>
    );

    const QualityFactorCard = ({ title, description, icon, color }: any) => (
        <Animated.View entering={ZoomIn.duration(500)}>
            <View style={[styles.qualityFactorCard, { borderLeftColor: color }]}>
                <View style={[styles.qualityFactorIconContainer, { backgroundColor: `${color}15` }]}>
                    <MaterialCommunityIcons name={icon} size={20} color={color} />
                </View>
                <View style={styles.qualityFactorContent}>
                    <Text style={[styles.qualityFactorTitle, { color: color }]}>{title}</Text>
                    <Text style={styles.qualityFactorDescription}>{description}</Text>
                </View>
            </View>
        </Animated.View>
    );

    const StatusIndicator = ({ status, color, description, icon }: any) => (
        <View style={styles.statusTile}>
            <View style={[styles.statusIconWrapper, { backgroundColor: `${color}15` }]}>
                <MaterialCommunityIcons name={icon} size={20} color={color} />
            </View>
            <View style={styles.statusInfo}>
                <Text style={[styles.statusLabel, { color: color }]}>{status}</Text>
                <Text style={styles.statusDesc}>{description}</Text>
            </View>
        </View>
    );

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
                        onPress={handleGoBack}
                        activeOpacity={0.7}
                    >
                        <Ionicons name="arrow-back" size={24} color="white" />
                    </TouchableOpacity>

                    <View style={styles.headerCenter}>
                        <View style={styles.headerIconContainer}>
                            <MaterialCommunityIcons name="information-variant" size={24} color="white" />
                        </View>

                        <View style={styles.headerTextContainer}>
                            <Text style={styles.headerTitle}>Latex Quality Guide</Text>
                            <Text style={styles.headerSubtitle}>Parameters & Solutions</Text>
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
                {/* Introduction Section - WITH LEFT BORDER */}
                <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="leaf" size={28} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Rubber Latex Quality Parameters</Text>
                    </View>

                    <View style={[styles.introCard, styles.leftBorderCard]}>
                        <View style={[styles.leftBorderAccent, { backgroundColor: colors.primary }]} />
                        <Text style={styles.introText}>
                            Fresh rubber latex quality depends on critical parameters measured during collection.
                            Maintaining optimal ranges ensures maximum yield, quality, and profitability.
                        </Text>
                        <View style={styles.highlightBox}>
                            <MaterialCommunityIcons name="lightbulb-on" size={20} color="#F59E0B" />
                            <Text style={styles.highlightText}>
                                Regular monitoring prevents quality degradation and financial losses
                            </Text>
                        </View>
                    </View>
                </Animated.View>

                {/* Quality Status Indicators - WITH LEFT BORDER */}
                <Animated.View entering={FadeInUp.delay(300).duration(500)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="chart-bell-curve" size={24} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Quality Status Indicators</Text>
                    </View>

                    <View style={[styles.statusContainer, styles.leftBorderCard]}>
                        <View style={[styles.leftBorderAccent, { backgroundColor: "#3B82F6" }]} />
                        <View style={styles.statusGrid}>
                            <StatusIndicator
                                status="Optimal"
                                color="#10B981"
                                icon="check-circle"
                                description="Ideal quality range"
                            />
                            <StatusIndicator
                                status="Acceptable"
                                color="#F59E0B"
                                icon="alert-circle"
                                description="Minor attention needed"
                            />
                            <StatusIndicator
                                status="Critical"
                                color="#EF4444"
                                icon="close-circle"
                                description="Action required"
                            />
                        </View>
                    </View>
                </Animated.View>

                {/* Temperature Parameter */}
                <QualityParameterCard
                    title="Temperature"
                    optimalRange="27°C - 32°C"
                    measurement="Measured in °C"
                    icon="thermometer"
                    color="#3B82F6"
                    issues={[
                        "High Temperature (>32°C): Accelerated bacterial growth, premature coagulation",
                        "Low Temperature (<27°C): Reduced latex flow, increased viscosity",
                        "Extreme Fluctuations: Stress on rubber trees, inconsistent quality"
                    ]}
                    solutions={[
                        "Use insulated collection containers",
                        "Collect during cooler morning hours (6-10 AM)",
                        "Store in shaded, well-ventilated areas",
                        "Monitor weather forecasts regularly",
                        "Consider temperature-controlled storage for large volumes"
                    ]}
                />

                {/* pH Level Parameter */}
                <QualityParameterCard
                    title="pH Level"
                    optimalRange="6.5 - 7.2 pH"
                    measurement="Acidity/Alkalinity Level"
                    icon="ph"
                    color="#8B5CF6"
                    issues={[
                        "Low pH (<6.5): Increased acidity causes premature coagulation",
                        "High pH (>7.2): Ammonia breakdown, protein denaturation",
                        "Unstable pH: Inconsistent latex properties, poor processing"
                    ]}
                    solutions={[
                        "Add stabilizers (ammonia) for pH maintenance",
                        "Regular testing with pH meters",
                        "Use pH buffers in collection containers",
                        "Avoid contamination with acidic substances",
                        "Train collectors on proper handling procedures"
                    ]}
                />

                {/* Turbidity Parameter */}
                <QualityParameterCard
                    title="Turbidity"
                    optimalRange="≤ -3500 NTU"
                    measurement="Clarity Measurement"
                    icon="water-opacity"
                    color="#10B981"
                    issues={[
                        "High Turbidity (> -3500 NTU): Contamination with soil, bark, or debris",
                        "Cloudy Latex: Bacterial contamination, poor filtration",
                        "Visible Particles: Improper tapping technique or collection"
                    ]}
                    solutions={[
                        "Proper cleaning of tapping equipment",
                        "Use clean collection cups with lids",
                        "Filter latex immediately after collection",
                        "Train tappers on clean tapping practices",
                        "Regular equipment maintenance and cleaning"
                    ]}
                />

                {/* Additional Quality Factors */}
                <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="clipboard-list" size={24} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Additional Quality Factors</Text>
                    </View>

                    <View style={styles.qualityFactorsGrid}>
                        <QualityFactorCard
                            title="Dry Rubber Content"
                            description="Optimal: 30-40%. Low DRC indicates excessive water, high DRC suggests evaporation."
                            icon="water-percent"
                            color="#EC4899"
                        />
                        <QualityFactorCard
                            title="Coagulation Time"
                            description="Optimal: 2-4 hours. Fast coagulation indicates that the latex is contaminated or contain high temperature"
                            icon="timer-sand"
                            color="#F59E0B"
                        />
                        <QualityFactorCard
                            title="Color & Odor"
                            description="Fresh latex should be milky white with mild odor. Discoloration indicates oxidation or contamination."
                            icon="palette"
                            color="#8B5CF6"
                        />
                        <QualityFactorCard
                            title="Viscosity"
                            description="Optimal flow consistency. High viscosity indicates that the latex is aging or contaminated."
                            icon="water"
                            color="#3B82F6"
                        />
                    </View>
                </Animated.View>

                {/* Best Practices Section - WITH LEFT BORDER */}
                <Animated.View entering={FadeInUp.delay(500).duration(500)} style={styles.section}>
                    <View style={styles.sectionHeader}>
                        <MaterialCommunityIcons name="shield-check" size={24} color={colors.primary} />
                        <Text style={styles.sectionTitle}>Best Practices for Quality Maintenance</Text>
                    </View>

                    <View style={[styles.practicesContainer, styles.leftBorderCard]}>
                        <View style={[styles.leftBorderAccent, { backgroundColor: "#10B981" }]} />
                        {[
                            "Collect latex within 2 hours of tapping",
                            "Use clean, non-reactive containers",
                            "Maintain proper storage temperature",
                            "Regular equipment sterilization",
                            "Immediate transportation to processing",
                            "Continuous monitoring of all parameters",
                            "Proper training for all personnel",
                            "Documentation of all measurements"
                        ].map((practice, index) => (
                            <View key={index} style={styles.practiceItem}>
                                <MaterialCommunityIcons name="check" size={18} color="#10B981" />
                                <Text style={styles.practiceText}>{practice}</Text>
                            </View>
                        ))}
                    </View>
                </Animated.View>

                {/* Benefits of Quality Control */}
                <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.section}>
                    <LinearGradient
                        colors={["#10B98115", "#05966908"]}
                        style={styles.benefitsCard}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                    >
                        <View style={styles.benefitsHeader}>
                            <MaterialCommunityIcons name="trending-up" size={28} color="#10B981" />
                            <Text style={styles.benefitsTitle}>Benefits of Quality Control</Text>
                        </View>

                        <View style={styles.benefitsGrid}>
                            <View style={styles.benefitItem}>
                                <MaterialCommunityIcons name="cash" size={24} color="#10B981" />
                                <Text style={styles.benefitText}>Higher Market Price</Text>
                            </View>
                            <View style={styles.benefitItem}>
                                <MaterialCommunityIcons name="factory" size={24} color="#10B981" />
                                <Text style={styles.benefitText}>Better Processing</Text>
                            </View>
                            <View style={styles.benefitItem}>
                                <MaterialCommunityIcons name="shield" size={24} color="#10B981" />
                                <Text style={styles.benefitText}>Consistent Quality</Text>
                            </View>
                            <View style={styles.benefitItem}>
                                <MaterialCommunityIcons name="leaf" size={24} color="#10B981" />
                                <Text style={styles.benefitText}>Reduced Waste</Text>
                            </View>
                        </View>
                    </LinearGradient>
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
        paddingBottom: 24,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 32,
        borderBottomRightRadius: 32,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 15,
        elevation: 12,
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
        backgroundColor: "rgba(255,255,255,0.25)",
        justifyContent: "center",
        alignItems: "center",
    },
    headerCenter: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
    },
    headerIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 20,
        backgroundColor: "rgba(255,255,255,0.2)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    headerTextContainer: {
        alignItems: "flex-start",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "white",
        letterSpacing: -0.5,
    },
    headerSubtitle: {
        fontSize: 12,
        color: "rgba(255,255,255,0.9)",
        fontWeight: "500",
        marginTop: -2,
    },
    headerRightPlaceholder: {
        width: 44,
    },
    scrollView: {
        flex: 1,
    },
    scrollContent: {
        paddingHorizontal: 20,
        paddingTop: 28,
    },
    section: {
        marginBottom: 32,
    },
    sectionHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#1E293B",
        marginLeft: 12,
    },
    // Left Border Styles
    leftBorderCard: {
        position: "relative",
        overflow: "hidden",
    },
    leftBorderAccent: {
        position: "absolute",
        left: 0,
        top: 0,
        bottom: 0,
        width: 5,
        borderTopRightRadius: 3,
        borderBottomRightRadius: 3,
    },
    introCard: {
        backgroundColor: "white",
        borderRadius: 24,
        padding: 24,
        paddingLeft: 30, 
        shadowColor: "#64748B",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 6,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    introText: {
        fontSize: 15,
        lineHeight: 24,
        color: "#475569",
        marginBottom: 20,
        fontWeight: "500",
    },
    highlightBox: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#FFFBEB",
        padding: 16,
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#FEF3C7",
    },
    highlightText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#92400E",
        marginLeft: 12,
        flex: 1,
        lineHeight: 18,
    },
    statusContainer: {
        backgroundColor: "white",
        borderRadius: 24,
        padding: 24,
        paddingLeft: 30, 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    statusGrid: {
        flexDirection: "column",
        gap: 12,
    },
    statusTile: {
        flexDirection: "row",
        alignItems: "center",
        padding: 16,
        backgroundColor: "white",
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
    },
    statusIconWrapper: {
        width: 48,
        height: 48,
        borderRadius: 24,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    statusInfo: {
        flex: 1,
    },
    statusLabel: {
        fontSize: 16,
        fontWeight: "800",
        marginBottom: 2,
    },
    statusDesc: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "500",
    },
    parameterCard: {
        marginBottom: 24,
        borderRadius: 28,
        overflow: "hidden",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.15,
        shadowRadius: 20,
        elevation: 10,
        backgroundColor: "white",
    },
    parameterGradient: {
        padding: 24,
    },
    parameterHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    parameterIconContainer: {
        width: 56,
        height: 56,
        borderRadius: 18,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 5,
    },
    parameterTitleContainer: {
        flex: 1,
    },
    parameterTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#1E293B",
    },
    parameterMeasurement: {
        fontSize: 13,
        color: "#64748B",
        fontWeight: "600",
        marginTop: 2,
        textTransform: "uppercase",
        letterSpacing: 0.5,
    },
    optimalRangeContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "white",
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 16,
        marginBottom: 20,
        borderWidth: 1.5,
        borderStyle: "dashed",
    },
    optimalRangeText: {
        fontSize: 15,
        fontWeight: "800",
        marginLeft: 10,
    },
    cardContentSection: {
        marginTop: 8,
    },
    sectionDivider: {
        height: 1,
        backgroundColor: "rgba(0,0,0,0.05)",
        width: "100%",
        marginBottom: 16,
    },
    sectionSubtitle: {
        fontSize: 15,
        fontWeight: "800",
        color: "#334155",
        marginBottom: 12,
        textTransform: "uppercase",
        letterSpacing: 1,
    },
    listItem: {
        flexDirection: "row",
        alignItems: "flex-start",
        marginBottom: 10,
        paddingRight: 8,
    },
    listIconBullet: {
        width: 6,
        height: 6,
        borderRadius: 3,
        marginTop: 8,
        marginRight: 12,
    },
    listText: {
        fontSize: 14,
        color: "#475569",
        lineHeight: 20,
        flex: 1,
        fontWeight: "500",
    },
    // Quality Factors Grid
    qualityFactorsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 16,
    },
    qualityFactorCard: {
        width: (width - 56) / 2,
        backgroundColor: "white",
        borderRadius: 20,
        padding: 16,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 10,
        elevation: 4,
        borderWidth: 1,
        borderColor: "#F1F5F9",
        borderLeftWidth: 4,
        minHeight: 160, 
        justifyContent: "space-between",
    },
    qualityFactorIconContainer: {
        width: 40,
        height: 40,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 12,
    },
    qualityFactorContent: {
        flex: 1,
    },
    qualityFactorTitle: {
        fontSize: 14,
        fontWeight: "800",
        marginBottom: 8,
    },
    qualityFactorDescription: {
        fontSize: 12,
        color: "#64748B",
        lineHeight: 18,
        fontWeight: "500",
    },
    practicesContainer: {
        backgroundColor: "white",
        borderRadius: 24,
        padding: 24,
        paddingLeft: 30, 
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 6,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    practiceItem: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 10,
        padding: 14,
        backgroundColor: "#F8FAFC",
        borderRadius: 16,
        borderWidth: 1,
        borderColor: "#F1F5F9",
    },
    practiceText: {
        fontSize: 13,
        fontWeight: "600",
        color: "#334155",
        marginLeft: 12,
        flex: 1,
    },
    benefitsCard: {
        borderRadius: 24,
        padding: 24,
        shadowColor: "#10B981",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.15,
        shadowRadius: 16,
        elevation: 8,
    },
    benefitsHeader: {
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 20,
    },
    benefitsTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#065F46",
        marginLeft: 12,
    },
    benefitsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
    },
    benefitItem: {
        width: "48%",
        alignItems: "center",
        padding: 16,
        backgroundColor: "rgba(255,255,255,0.8)",
        borderRadius: 20,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: "#D1FAE5",
    },
    benefitText: {
        fontSize: 13,
        fontWeight: "800",
        color: "#065F46",
        marginTop: 8,
        textAlign: "center",
    },
});

export default SensorStatusScreen;