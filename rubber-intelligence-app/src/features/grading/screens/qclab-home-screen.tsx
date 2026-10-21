import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../../shared/styles/colors";

const { width } = Dimensions.get("window");
const QC_CARD_WIDTH = (width - 72) / 2; // (Screen width - 24*2 padding - 24 gap) / 2

// --- Data for QC Lab Screen ---
const qcMetrics = [
  {
    label: "Pending Tests",
    value: "5",
    icon: "flask-outline",
    color: colors.secondary,
  },
  {
    label: "Pass Rate (30d)",
    value: "95.4%",
    icon: "check-decagram",
    color: colors.success,
  },
  {
    label: "Failed Tests",
    value: "3",
    icon: "alert-circle-outline",
    color: colors.error,
  },
  {
    label: "Next Audit",
    value: "35 Days",
    icon: "calendar-today",
    color: "#3498DB", // Info blue
  },
];

const qcQuickActions = [
  {
    title: "New Test",
    icon: "plus-box-outline",
    color: colors.primary,
    screen: "NewTest",
  },
  {
    title: "Sample Logbook",
    icon: "clipboard-list-outline",
    color: colors.success,
    screen: "SampleLogbook",
  },
  {
    title: "Test Reports",
    icon: "file-document-multiple-outline",
    color: colors.primary,
    screen: "ReportsDashboard",
  },
  {
    title: "Latex Quality",
    icon: "flask-round-bottom",
    color: colors.secondary,
    screen: "LatexQualityHome",
  },
];

const failedBatches = [
  {
    id: "BATCH-2025-2341",
    grade: "RSS5",
    failedTest: "Reaper Marks",
    urgency: "High",
    color: "#EF4444",
  },
  {
    id: "BATCH-2025-7895",
    grade: "RSS4",
    failedTest: "Pin Head Bubbles",
    urgency: "Medium",
    color: "#F59E0B",
  },
  {
    id: "BATCH-2025-5621",
    grade: "SMR20",
    failedTest: "Dirt contamination",
    urgency: "High",
    color: "#EF4444",
  },
];

// --- NEW DATA ---
const recentResults = [
  {
    id: "BATCH-2025-7895",
    result: "Fail",
    test: "Medium Amount of Pin Head Bubbles Found",
    grade: "RSS4",
    statusColor: "#EF4444",
  },
  {
    id: "BATCH-2025-3456",
    result: "Pass",
    test: "Small Amount of Tar spots Found",
    grade: "RSS2",
    statusColor: "#10B981",
  },
  {
    id: "BATCH-2025-2341",
    result: "Fail",
    test: "Large Amount of Reaper Marks Found",
    grade: "RSS5",
    statusColor: "#EF4444",
  },
  {
    id: "BATCH-2025-7890",
    result: "Pass",
    test: "No Major Defects Found",
    grade: "RSS1",
    statusColor: "#10B981",
  },
  {
    id: "BATCH-2025-5621",
    result: "Fail",
    test: "Large Amount of Dirts Found",
    grade: "RSS5",
    statusColor: "#EF4444",
  },
];

const LatexQualityStatus = [
  {
    name: "Temperature Level",
    reason: "Increases Bacterial Activity",
    status: "High",
    color: "#EF4444",
  },
  {
    name: "Turbidity Value",
    reason: "Clear Fresh Rubber Latex",
    status: "OK",
    color: "#10B981",
  },
  {
    name: "pH Value",
    reason: "Clear Fresh Rubber Latex",
    status: "OK",
    color: "#10B981",
  },
];
// ------------------------------------

export default function QcLabScreen() {
  const navigation = useNavigation<any>();
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* HEADER */}
      <Animated.View entering={FadeInDown.duration(400)}>
        <LinearGradient
          colors={[colors.primary, "#1B5E20"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerTitleWrap}>
            <MaterialCommunityIcons name="microscope" size={28} color="rgba(255,255,255,0.9)" />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.headerTitle}>QC Lab Dashboard</Text>
              <Text style={styles.headerSubtitle}>Monitor quality & testing</Text>
            </View>
          </View>
        </LinearGradient>
      </Animated.View>

      {/* QC METRICS GRID - Primary Focus */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
        <View style={styles.metricsGrid}>
          {qcMetrics.map((metric, index) => (
            <LinearGradient
              key={index}
              colors={[metric.color, `${metric.color}80`]} // Use deep color for better contrast/visual
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.metricCard}
            >
              <View style={styles.metricIconBox}>
                <MaterialCommunityIcons
                  name={metric.icon as any}
                  size={28}
                  color="#FFFFFF"
                />
              </View>
              <Text style={styles.metricValue}>{metric.value}</Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </LinearGradient>
          ))}
        </View>
      </Animated.View>

      {/* --- Horizontal Rule --- */}
      <View style={styles.horizontalRule} />

      {/* QC QUICK ACTIONS - Utility */}
      <Animated.View
        entering={FadeInDown.delay(300).duration(500)}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>Quick Access</Text>
        <View style={styles.actionsGrid}>
          {qcQuickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.8}
            >
              <MaterialCommunityIcons
                name={action.icon as any}
                size={30}
                color={action.color}
              />
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* --- Horizontal Rule --- */}
      <View style={styles.horizontalRule} />

      {/* NEW SECTION 1: RECENT TEST RESULTS */}
      <Animated.View
        entering={FadeInDown.delay(500).duration(500)}
        style={styles.section}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>✅ Recent Test Results</Text>
          <TouchableOpacity onPress={() => { }}>
            <Text style={styles.seeAllText}>Full History</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardListContainer}>
          {recentResults.map((result, i) => (
            <View
              key={i}
              style={[
                styles.listRow,
                i === recentResults.length - 1 && { borderBottomWidth: 0 },
                { borderLeftColor: result.statusColor, borderLeftWidth: 4 }, // Status stripe
              ]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <MaterialIcons
                  name="done"
                  size={20}
                  color={result.statusColor}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowPrimary}>
                    Batch **{result.id}** ({result.grade})
                  </Text>
                  <Text style={styles.listRowSecondary}>{result.test}</Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${result.statusColor}15` },
                ]}
              >
                <Text
                  style={[styles.statusText, { color: result.statusColor }]}
                >
                  {result.result}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      {/* PRIORITY: FAILED BATCHES - Critical Callout */}
      <Animated.View
        entering={FadeInDown.delay(700).duration(500)}
        style={styles.section}
      >
        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: "#EF4444" }]}>
            ⚠️ High Priority Actions
          </Text>
          <TouchableOpacity onPress={() => { }}>
            <Text style={styles.seeAllText}>View all 3</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.cardListContainer}>
          {failedBatches.map((batch, i) => (
            <TouchableOpacity
              key={i}
              style={[
                styles.listRow,
                i === failedBatches.length - 1 && { borderBottomWidth: 0 },
                { borderLeftColor: batch.color, borderLeftWidth: 4 },
              ]}
              activeOpacity={0.8}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <MaterialCommunityIcons
                  name="skull-crossbones"
                  size={20}
                  color={batch.color}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowPrimary}>
                    Batch **{batch.id}** ({batch.grade})
                  </Text>
                  <Text style={styles.listRowSecondary}>
                    Failed Test: {batch.failedTest}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${batch.color}15` },
                ]}
              >
                <Text style={[styles.statusText, { color: batch.color }]}>
                  {batch.urgency}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* NEW SECTION 2: LAB EQUIPMENT STATUS */}
      <Animated.View
        entering={FadeInDown.delay(900).duration(500)}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>🧪 Rubber Latex Quality Status</Text>
        <View style={styles.cardListContainer}>
          {LatexQualityStatus.map((item, i) => (
            <View
              key={i}
              style={[
                styles.listRow,
                i === LatexQualityStatus.length - 1 && { borderBottomWidth: 0 },
                { borderLeftColor: item.color, borderLeftWidth: 4 },
              ]}
            >
              <View
                style={{ flexDirection: "row", alignItems: "center", flex: 1 }}
              >
                <MaterialCommunityIcons
                  name="calendar-sync-outline"
                  size={20}
                  color={item.color}
                  style={{ marginRight: 12 }}
                />
                <View style={{ flex: 1 }}>
                  <Text style={styles.listRowPrimary}>**{item.name}**</Text>
                  <Text style={styles.listRowSecondary}>
                    Result: {item.reason}
                  </Text>
                </View>
              </View>
              <View
                style={[
                  styles.statusBadge,
                  { backgroundColor: `${item.color}15` },
                ]}
              >
                <Text style={[styles.statusText, { color: item.color }]}>
                  {item.status}
                </Text>
              </View>
            </View>
          ))}
        </View>
      </Animated.View>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F3F4F6",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    marginBottom: 10,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 10,
    elevation: 8,
    justifyContent: "center",
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitle: {
    fontSize: 26,
    fontWeight: "800",
    color: "#FFFFFF",
    letterSpacing: 0.3,
  },
  headerSubtitle: {
    fontSize: 15,
    color: "rgba(255,255,255,0.8)",
    marginTop: 1,
    fontWeight: "500",
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  horizontalRule: {
    borderBottomColor: "#E5E7EB",
    borderBottomWidth: 1,
    marginHorizontal: 24,
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#111827",
  },
  seeAllText: {
    fontSize: 14,
    fontWeight: "700",
    color: colors.primary,
  },

  // --- QC Metrics Grid Styles (Deep Color Accent) ---
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 15,
  },
  metricCard: {
    width: QC_CARD_WIDTH,
    padding: 18,
    borderRadius: 16,
    marginBottom: 16,
    // Removed border for a flatter, bolder look
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1, // Increased shadow for floating effect
    shadowRadius: 8,
    elevation: 5,
  },
  metricIconBox: {
    width: 48,
    height: 48,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 10,
    backgroundColor: "rgba(255, 255, 255, 0.2)", // Light translucent white for icon box
  },
  metricValue: {
    fontSize: 24,
    fontWeight: "700",
    color: "#FFFFFF", // White text for contrast
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: "#FFFFFF", // White text for contrast
    opacity: 0.8,
    marginTop: 4,
  },

  // --- QC Quick Actions Styles ---
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 15,
  },
  actionCard: {
    width: QC_CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 18,
    marginBottom: 20,
    alignItems: "center", // Centered items
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 12,
    textAlign: "center",
  },

  // --- List Styles (Unified listRow for clarity) ---
  cardListContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 18,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
    marginTop: 15,
  },
  listRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 18,
    borderBottomWidth: 0.5,
    borderBottomColor: "#E5E7EB",
    backgroundColor: "#FFFFFF",
  },
  listRowPrimary: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
  },
  listRowSecondary: {
    fontSize: 13,
    fontWeight: "400",
    color: "#6B7280",
    marginTop: 2,
  },
  statusBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  receivedText: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280", // Changed to gray for lower emphasis
  },
});
