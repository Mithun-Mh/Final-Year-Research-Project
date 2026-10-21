import React from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    Image,
    TouchableOpacity,
    Dimensions,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { MaterialCommunityIcons, Ionicons } from "@expo/vector-icons";
import Animated, {
    FadeInDown,
    FadeInRight,
    FadeInUp,
    ZoomIn
} from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../../shared/styles/colors";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 48 - 16) / 2;

const storageGuidelines = [
    {
        title: "Temperature Control",
        description: "Store latex between 25°C - 30°C. Avoid direct sunlight and extreme heat.",
        icon: "thermometer",
        color: "#EF4444",
        gradient: ["#FEE2E2", "#FECACA"],
    },
    {
        title: "Container Hygiene",
        description: "Use stainless steel or HDPE containers. Ensure clean, dry conditions.",
        icon: "beaker-outline",
        color: "#3B82F6",
        gradient: ["#DBEAFE", "#BFDBFE"],
    },
    {
        title: "Preservation",
        description: "Add ammonia (0.7% w/w) immediately after collection to prevent bacterial growth.",
        icon: "flask-outline",
        color: "#10B981",
        gradient: ["#D1FAE5", "#A7F3D0"],
    },
    {
        title: "Safety First",
        description: "Wear protective gear when handling. Ensure proper ventilation.",
        icon: "shield-alert-outline",
        color: "#F59E0B",
        gradient: ["#FEF3C7", "#FDE68A"],
    },
    {
        title: "Humidity",
        description: "Maintain 50-60% relative humidity to prevent moisture absorption.",
        icon: "water-percent",
        color: "#8B5CF6",
        gradient: ["#EDE9FE", "#DDD6FE"],
    },
    {
        title: "Regular Checks",
        description: "Monitor quality every 24 hours. Document pH and viscosity changes.",
        icon: "clipboard-check-outline",
        color: "#EC4899",
        gradient: ["#FCE7F3", "#FBCFE8"],
    },
];

const keyPoints = [
    { label: "Use clean, dry containers", icon: "pail-outline", color: "#3B82F6" },
    { label: "Avoid temperature extremes", icon: "thermometer-alert", color: "#EF4444" },
    { label: "Add preservatives promptly", icon: "chemical-weapon", color: "#10B981" },
    { label: "Keep away from metals", icon: "magnet", color: "#6366F1" },
    { label: "Store in dark areas", icon: "weather-night", color: "#8B5CF6" },
    { label: "Label with collection date", icon: "calendar-clock", color: "#F59E0B" }
];

export default function LatexStorageGuideScreen() {
    const navigation = useNavigation();

    return (
        <View style={styles.container}>
            <ScrollView
                showsVerticalScrollIndicator={false}
                contentContainerStyle={styles.scrollContent}
            >
                {/* STANDARD HEADER */}
                <Animated.View entering={FadeInDown.duration(400)}>
                    <LinearGradient
                        colors={[colors.primary, "#1B5E20"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.header}
                    >
                        <TouchableOpacity
                            onPress={() => navigation.goBack()}
                            style={styles.headerBackButton}
                        >
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>

                        <View style={styles.headerTitleContainer}>
                            <Text style={styles.headerTitle}>Storage Guide</Text>
                            <Text style={styles.headerSubtitle}>Best Practices & Safety</Text>
                        </View>

                        <View style={styles.headerRightAction}>
                            <MaterialCommunityIcons name="book-open-page-variant" size={28} color="rgba(255,255,255,0.8)" />
                        </View>
                    </LinearGradient>
                </Animated.View>

                {/* HERO IMAGE (Modified) */}
                <Animated.View entering={FadeInDown.duration(800)} style={styles.heroContainer}>
                    <Image
                        source={require("../../../../assets/latex-storage.png")}
                        style={styles.heroImage}
                        resizeMode="cover"
                    />
                    <LinearGradient
                        colors={["transparent", "rgba(243, 244, 246, 0.1)", "#F3F4F6"]}
                        locations={[0, 0.7, 1]}
                        style={styles.heroGradient}
                    />
                </Animated.View>

                {/* MAIN CONTENT */}
                <View style={styles.contentContainer}>
                    {/* INTRODUCTION */}
                    <Animated.View
                        entering={FadeInRight.delay(300).duration(600)}
                        style={styles.introContainer}
                    >
                        <View style={styles.introIcon}>
                            <MaterialCommunityIcons
                                name="database"
                                size={28}
                                color={colors.primary}
                            />
                        </View>
                        <View style={styles.introText}>
                            <Text style={styles.introTitle}>Preserve Quality, Maximize Value</Text>
                            <Text style={styles.introDescription}>
                                Proper storage maintains latex quality, prevents spoilage, and ensures optimal processing results.
                            </Text>
                        </View>
                    </Animated.View>

                    {/* KEY POINTS */}
                    <Animated.View
                        entering={FadeInDown.delay(400).duration(600)}
                        style={styles.keyPointsContainer}
                    >
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Essential Checklist</Text>
                            <MaterialCommunityIcons name="checkbox-marked-circle-outline" size={20} color={colors.primary} />
                        </View>

                        <View style={styles.keyPointsGrid}>
                            {keyPoints.map((point, index) => (
                                <Animated.View
                                    key={index}
                                    entering={ZoomIn.delay(500 + index * 100).duration(400)}
                                    style={styles.pointCardWrapper}
                                >
                                    <View style={[styles.pointCard, { borderLeftColor: point.color }]}>
                                        <View style={[styles.pointIconBox, { backgroundColor: `${point.color}15` }]}>
                                            <MaterialCommunityIcons
                                                name={point.icon as any}
                                                size={20}
                                                color={point.color}
                                            />
                                        </View>
                                        <Text style={styles.pointText}>{point.label}</Text>
                                    </View>
                                </Animated.View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* GUIDELINES GRID */}
                    <Animated.View entering={FadeInDown.delay(500).duration(600)}>
                        <View style={styles.sectionHeader}>
                            <Text style={styles.sectionTitle}>Storage Guidelines</Text>
                            <View style={styles.sectionBadge}>
                                <Text style={styles.sectionBadgeText}>{storageGuidelines.length} Steps</Text>
                            </View>
                        </View>

                        <View style={styles.grid}>
                            {storageGuidelines.map((item, index) => (
                                <Animated.View
                                    key={index}
                                    entering={FadeInDown.delay(600 + index * 100).duration(600)}
                                    style={styles.cardContainer}
                                >
                                    <LinearGradient
                                        colors={item.gradient as any}
                                        style={styles.card}
                                    >
                                        <View style={styles.cardHeader}>
                                            <View style={[styles.iconContainer, { backgroundColor: item.color }]}>
                                                <MaterialCommunityIcons
                                                    name={item.icon as any}
                                                    size={24}
                                                    color="#FFFFFF"
                                                />
                                            </View>
                                            <View style={styles.indexBadge}>
                                                <Text style={styles.indexText}>{index + 1}</Text>
                                            </View>
                                        </View>

                                        <Text style={styles.cardTitle}>{item.title}</Text>
                                        <Text style={styles.cardDescription}>{item.description}</Text>

                                        <View style={styles.cardFooter}>
                                            <View style={[styles.colorIndicator, { backgroundColor: item.color }]} />
                                            <Text style={styles.cardHint}>Tap to learn more</Text>
                                        </View>
                                    </LinearGradient>
                                </Animated.View>
                            ))}
                        </View>
                    </Animated.View>

                    {/* PRO TIP */}
                    <Animated.View
                        entering={FadeInDown.delay(1200).duration(600)}
                        style={styles.tipContainer}
                    >
                        <LinearGradient
                            colors={[colors.primary, "#0EA5E9"]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.tipGradient}
                        >
                            <View style={styles.tipIconWrapper}>
                                <MaterialCommunityIcons name="lightbulb-on" size={32} color="#FFF" />
                            </View>
                            <View style={styles.tipContent}>
                                <Text style={styles.tipTitle}>Expert Insight</Text>
                                <Text style={styles.tipText}>
                                    For long-term storage, check pH levels every 24 hours and maintain ammonia concentration at 0.7% w/w for optimal preservation.
                                </Text>
                                <View style={styles.tipFooter}>
                                    <View style={styles.tipTag}>
                                        <Text style={styles.tipTagText}>Quality Control</Text>
                                    </View>
                                    <View style={styles.tipTag}>
                                        <Text style={styles.tipTagText}>Best Practice</Text>
                                    </View>
                                </View>
                            </View>
                        </LinearGradient>
                    </Animated.View>

                    {/* NEED ASSISTANCE SECTION */}
                    <Animated.View
                        entering={FadeInUp.delay(1400).duration(600)}
                        style={styles.assistanceContainer}
                    >
                        <Text style={styles.sectionTitle}>Need Assistance?</Text>
                        <View style={styles.assistanceGrid}>
                            <TouchableOpacity
                                style={styles.assistanceCard}
                                onPress={() => navigation.navigate("ExpertChat" as never)}
                            >
                                <View style={[styles.assistanceIconBox, { backgroundColor: "#EEF2FF" }]}>
                                    <MaterialCommunityIcons name="headset" size={24} color="#6366F1" />
                                </View>
                                <View style={styles.assistanceContent}>
                                    <Text style={styles.assistanceTitle}>Contact Expert</Text>
                                    <Text style={styles.assistanceSubtitle}>Get 24/7 support</Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                            </TouchableOpacity>

                            <TouchableOpacity style={styles.assistanceCard}>
                                <View style={[styles.assistanceIconBox, { backgroundColor: "#FEF2F2" }]}>
                                    <MaterialCommunityIcons name="alert-circle-outline" size={24} color="#EF4444" />
                                </View>
                                <View style={styles.assistanceContent}>
                                    <Text style={styles.assistanceTitle}>Report Issue</Text>
                                    <Text style={styles.assistanceSubtitle}>Log storage problems</Text>
                                </View>
                                <MaterialCommunityIcons name="chevron-right" size={20} color="#9CA3AF" />
                            </TouchableOpacity>
                        </View>
                    </Animated.View>
                </View>

                <View style={{ height: 40 }} />
            </ScrollView>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#F3F4F6",
    },
    scrollContent: {
        paddingBottom: 20,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 20,
        paddingTop: 50,
        paddingBottom: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        marginBottom: 16,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.15,
        shadowRadius: 10,
        elevation: 8,
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: "center",
    },
    headerBackButton: {
        padding: 8,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 12,
    },
    headerRightAction: {
        padding: 8,
        minWidth: 40,
        alignItems: "flex-end",
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: "800",
        color: "#FFFFFF",
        letterSpacing: 0.3,
        textAlign: "center",
    },
    headerSubtitle: {
        fontSize: 12,
        color: "rgba(255,255,255,0.8)",
        marginTop: 1,
        fontWeight: "500",
        textAlign: "center",
    },
    heroContainer: {
        height: 220,
        position: "relative",
        borderRadius: 24,
        overflow: "hidden",
        marginBottom: 24,
        marginHorizontal: 16,
        alignSelf: 'center',
        width: width - 32, // Card-like width
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5,
    },
    heroImage: {
        width: "100%",
        height: "100%",
    },
    heroGradient: {
        position: "absolute",
        bottom: 0,
        left: 0,
        right: 0,
        height: 60,
    },
    contentContainer: {
        paddingHorizontal: 16,
    },
    introContainer: {
        backgroundColor: "#FFFFFF",
        padding: 20,
        borderRadius: 20,
        flexDirection: "row",
        alignItems: "center",
        marginBottom: 24,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.05,
        shadowRadius: 12,
        elevation: 3,
    },
    introIcon: {
        width: 56,
        height: 56,
        borderRadius: 16,
        backgroundColor: "rgba(16, 185, 129, 0.1)",
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    introText: {
        flex: 1,
    },
    introTitle: {
        fontSize: 18,
        fontWeight: "700",
        color: "#111827",
        marginBottom: 6,
    },
    introDescription: {
        fontSize: 14,
        color: "#6B7280",
        lineHeight: 20,
    },
    sectionHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        marginBottom: 20,
    },
    sectionTitle: {
        fontSize: 22,
        fontWeight: "800",
        color: "#111827",
        letterSpacing: -0.3,
    },
    sectionBadge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
    },
    sectionBadgeText: {
        color: "#FFFFFF",
        fontSize: 12,
        fontWeight: "700",
    },
    keyPointsContainer: {
        marginBottom: 30,
    },
    keyPointsGrid: {
        flexDirection: "row",
        flexWrap: "wrap",
        justifyContent: "space-between",
        gap: 12,
    },
    pointCardWrapper: {
        width: (width - 48 - 12) / 2, // 2 columns with gap
        marginBottom: 4,
    },
    pointCard: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        borderLeftWidth: 4,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 2,
    },
    pointIconBox: {
        width: 36,
        height: 36,
        borderRadius: 10,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 12,
    },
    pointText: {
        fontSize: 13,
        color: "#374151",
        fontWeight: "600",
        flex: 1,
        lineHeight: 18,
    },
    grid: {
        flexDirection: "row",
        flexWrap: "wrap",
        gap: 16,
        marginBottom: 24,
    },
    cardContainer: {
        width: CARD_WIDTH,
        marginBottom: 4,
    },
    card: {
        padding: 18,
        borderRadius: 20,
        minHeight: 200,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.3)",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.08,
        shadowRadius: 16,
        elevation: 4,
    },
    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 16,
    },
    iconContainer: {
        width: 48,
        height: 48,
        borderRadius: 14,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 3,
    },
    indexBadge: {
        backgroundColor: "rgba(255,255,255,0.9)",
        width: 24,
        height: 24,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "rgba(0,0,0,0.1)",
    },
    indexText: {
        fontSize: 12,
        fontWeight: "800",
        color: "#1F2937",
    },
    cardTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 8,
        lineHeight: 22,
    },
    cardDescription: {
        fontSize: 13,
        color: "#4B5563",
        lineHeight: 18,
        marginBottom: 16,
        flex: 1,
    },
    cardFooter: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingTop: 12,
        borderTopWidth: 1,
        borderTopColor: "rgba(255,255,255,0.3)",
    },
    colorIndicator: {
        width: 12,
        height: 12,
        borderRadius: 6,
    },
    cardHint: {
        fontSize: 11,
        color: "#6B7280",
        fontStyle: "italic",
    },
    tipContainer: {
        marginTop: 8,
        borderRadius: 24,
        overflow: "hidden",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 8,
        marginBottom: 24,
    },
    tipGradient: {
        flexDirection: "row",
        padding: 24,
        alignItems: "flex-start",
    },
    tipIconWrapper: {
        backgroundColor: "rgba(255,255,255,0.2)",
        width: 56,
        height: 56,
        borderRadius: 16,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    tipContent: {
        flex: 1,
    },
    tipTitle: {
        fontSize: 18,
        fontWeight: "800",
        color: "#FFF",
        marginBottom: 8,
        letterSpacing: -0.3,
    },
    tipText: {
        fontSize: 14,
        color: "rgba(255,255,255,0.95)",
        lineHeight: 22,
        marginBottom: 16,
    },
    tipFooter: {
        flexDirection: "row",
        gap: 8,
    },
    tipTag: {
        backgroundColor: "rgba(255,255,255,0.2)",
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 20,
        borderWidth: 1,
        borderColor: "rgba(255,255,255,0.3)",
    },
    tipTagText: {
        fontSize: 12,
        color: "#FFF",
        fontWeight: "600",
    },
    assistanceContainer: {
        marginTop: 8,
    },
    assistanceGrid: {
        gap: 12,
        marginTop: 12,
    },
    assistanceCard: {
        backgroundColor: "#FFFFFF",
        padding: 16,
        borderRadius: 16,
        flexDirection: "row",
        alignItems: "center",
        borderWidth: 1,
        borderColor: "#E5E7EB",
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.03,
        shadowRadius: 4,
        elevation: 1,
    },
    assistanceIconBox: {
        width: 48,
        height: 48,
        borderRadius: 12,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 16,
    },
    assistanceContent: {
        flex: 1,
    },
    assistanceTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#1F2937",
        marginBottom: 2,
    },
    assistanceSubtitle: {
        fontSize: 13,
        color: "#6B7280",
    },
});