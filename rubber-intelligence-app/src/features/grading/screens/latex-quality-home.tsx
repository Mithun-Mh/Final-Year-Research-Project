
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Alert,
} from "react-native";
import React from "react";
import { LinearGradient } from "expo-linear-gradient";
import {
  Ionicons,
  MaterialCommunityIcons,
  MaterialIcons,
} from "@expo/vector-icons";
import { BarChart } from "react-native-chart-kit";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import { colors } from "../../../shared/styles/colors";
import { ReportService } from "../../../core/services/ReportService";
import { useState, useCallback } from "react";

const { width } = Dimensions.get("window");
const CARD_WIDTH = (width - 72) / 2;

// --- Data for Latex Quality Home Screen ---
const latexMetrics = [
  {
    label: "Current Temp",
    value: "28.5°C",
    icon: "thermometer",
    color: colors.success,
    trend: "stable",
  },
  {
    label: "pH Level",
    value: "6.8",
    icon: "test-tube",
    color: colors.primary,
    trend: "up",
  },
  {
    label: "Turbidity",
    value: "-4300 NTU",
    icon: "water-opacity",
    color: colors.secondary,
    trend: "down",
  },
  {
    label: "Quality Score",
    value: "92%",
    icon: "star-outline",
    color: colors.success,
    trend: "stable",
  },
];

const quickActions = [
  {
    title: "Quality Test",
    icon: "flask-outline",
    color: colors.primary,
    screen: "LatexTest",
  },
  {
    title: "Latex Process Guide",
    icon: "history",
    color: colors.success,
    screen: "ViewHistory",
  },
  {
    title: "Latex Quality Guide",
    icon: "gauge",
    color: colors.secondary,
    screen: "SensorStatus",
  },
  {
    title: "Latex Quality Reports",
    icon: "file-document-outline",
    color: colors.primary,
    screen: "LatexQualityReports",
  },
  {
    title: "Storage Selection",
    icon: "warehouse",
    color: colors.primary,
    screen: "StorageSelection",
  },
  {
    title: "Latex Storage Guide",
    icon: "book-open-variant",
    color: colors.success,
    screen: "LatexStorageGuide",
  },
];

// Enhanced Alerts with more data
const alerts = [
  {
    id: "ALT-001",
    message: "Temperature approaching upper limit (29.5°C)",
    urgency: "High",
    color: "#EF4444",
    icon: "thermometer-alert",
    time: "1 day ago",
    priority: 1,
  },
  {
    id: "ALT-002",
    message: "pH sensor calibration due tomorrow",
    urgency: "Medium",
    color: "#F59E0B",
    icon: "alert-circle",
    time: "4 days ago",
    priority: 2,
  },
  {
    id: "ALT-003",
    message: "Turbidity levels above normal range",
    urgency: "Medium",
    color: "#F59E0B",
    icon: "water-alert",
    time: "6 days ago",
    priority: 2,
  },
  {
    id: "ALT-004",
    message: "Test kit stock running low (15 remaining)",
    urgency: "Low",
    color: "#3498DB",
    icon: "package-variant",
    time: "8 day ago",
    priority: 3,
  },
  {
    id: "ALT-005",
    message: "System backup scheduled for tonight",
    urgency: "Info",
    color: "#6366F1",
    icon: "backup-restore",
    time: "10 days ago",
    priority: 4,
  },
];

// Enhanced Quality Trends data with time labels
const qualityTrends = [
  { day: "Mon", score: 55, time: "10:00 AM" },
  { day: "Tue", score: 88, time: "11:30 AM" },
  { day: "Wed", score: 75, time: "09:45 AM" },
  { day: "Thu", score: 92, time: "02:15 PM" },
  { day: "Fri", score: 58, time: "10:30 AM" },
  { day: "Sat", score: 89, time: "03:00 PM" },
  { day: "Sun", score: 82, time: "11:00 AM" },
];

// Find min and max scores for chart scaling
const trendScores = qualityTrends.map(item => item.score);
const maxScore = Math.max(...trendScores);
const minScore = Math.min(...trendScores);
const chartHeight = 120;
const chartWidth = width - 48; // Increased width

const recommendedActions = [
  {
    title: "Adjust pH",
    description: "Add pH stabilizer to maintain 6.5-7.0 range",
    icon: "calculator",
    priority: "high",
  },
  {
    title: "Cool System",
    description: "Reduce temperature by 2°C for optimal quality",
    icon: "snowflake",
    priority: "medium",
  },
  {
    title: "Clean Sensors",
    description: "Schedule maintenance for turbidity sensors",
    icon: "brush",
    priority: "medium",
  },
];

export default function LatexQualityHomeScreen() {
  const navigation = useNavigation<any>();
  const [recentTestData, setRecentTestData] = useState<any[]>([]);

  const getStatusColor = (status: string) => {
    if (status === "Pass") return "#10B981";
    if (status === "Warning") return "#F59E0B";
    return "#EF4444";
  };

  const getStatusIcon = (status: string) => {
    if (status === "Pass") return "check-circle";
    if (status === "Warning") return "alert-circle";
    return "close-circle";
  };

  const handleDeleteReport = (fileUri: string, testId: string) => {
    Alert.alert(
      "Delete Report",
      `Are you sure you want to delete the report for ${testId}?`,
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            const success = await ReportService.deleteReport(fileUri);
            if (success) {
              loadRecentTests();
            } else {
              Alert.alert("Error", "Failed to delete report.");
            }
          }
        }
      ]
    );
  };

  const loadRecentTests = async () => {
    try {
      const files = await ReportService.listSavedReports();
      const parsed = files
        .map((f) => {
          try {
            if (!f.name.startsWith("Report_Latex_")) return null;
            const parts = f.name.replace(".pdf", "").split("_");
            if (parts.length < 8) return null;

            const testId = parts[2];
            const score = parseInt(parts[3]);
            const grade = parts[4];
            const status = parts[5];
            const date = parts[6];
            const time = parts.slice(7).join(":");

            return {
              id: testId,
              fileUri: f.uri,
              result: status,
              quality: grade,
              score: score,
              statusColor: getStatusColor(status),
              icon: getStatusIcon(status),
              date: date,
              time: time,
              parameters: [],
            };
          } catch (e) {
            return null;
          }
        })
        .filter((r) => r !== null)
        .slice(0, 5); // Take top 5

      setRecentTestData(parsed);
    } catch (error) {
      console.error("Error loading recent tests", error);
    }
  };

  useFocusEffect(
    useCallback(() => {
      loadRecentTests();
    }, [])
  );

  const renderQualityScore = (score: number) => {
    if (score >= 90) return { label: "Excellent", color: "#10B981" };
    if (score >= 70) return { label: "Good", color: "#3B82F6" };
    if (score >= 50) return { label: "Fair", color: "#F59E0B" };
    return { label: "Poor", color: "#EF4444" };
  };

  // Data for the Bar Chart
  const chartData = {
    labels: qualityTrends.map(t => t.day),
    datasets: [
      {
        data: qualityTrends.map(t => t.score),
        colors: qualityTrends.map(t => (opacity = 1) => {
          if (t.score >= 90) return `rgba(16, 185, 129, ${opacity})`; // Excellent - Green
          if (t.score >= 70) return `rgba(59, 130, 246, ${opacity})`; // Good - Blue
          if (t.score >= 50) return `rgba(245, 158, 11, ${opacity})`; // Fair - Orange
          return `rgba(239, 68, 68, ${opacity})`; // Poor - Red
        }),
      },
    ],
  };

  const chartConfig = {
    backgroundColor: "#ffffff",
    backgroundGradientFrom: "#ffffff",
    backgroundGradientTo: "#ffffff",
    decimalPlaces: 0,
    color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`,
    labelColor: (opacity = 1) => `rgba(107, 114, 128, ${opacity})`,
    style: {
      borderRadius: 16,
    },
    propsForLabels: {
      fontSize: 10,
      fontWeight: "600",
    },
    barPercentage: 0.6,
  };

  const handleButtonPress = () => {
    // Empty function for buttons that should do nothing
    return;
  };

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
            <MaterialCommunityIcons
              name="test-tube"
              size={28}
              color="rgba(255,255,255,0.9)"
            />
            <View style={{ marginLeft: 12 }}>
              <Text style={styles.headerTitle}>Latex Quality Dashboard</Text>
              <Text style={styles.headerSubtitle}>
                Real-time monitoring & testing
              </Text>
            </View>
          </View>
          <TouchableOpacity style={styles.notificationButton} onPress={handleButtonPress}>
            <Ionicons name="notifications-outline" size={24} color="#FFF" />
            <View style={styles.notificationBadge}>
              <Text style={styles.notificationBadgeText}>
                {alerts.filter(a => a.priority <= 2).length}
              </Text>
            </View>
          </TouchableOpacity>
        </LinearGradient>
      </Animated.View>

      {/* KEY METRICS GRID */}
      <Animated.View
        entering={FadeInDown.delay(100).duration(500)}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>Key Metrics</Text>
        <View style={styles.metricsGrid}>
          {latexMetrics.map((metric, index) => (
            <LinearGradient
              key={index}
              colors={["#FFFFFF", "#F8FAFC"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.metricCard}
            >
              <View
                style={[
                  styles.metricIconBox,
                  { backgroundColor: `${metric.color}15` },
                ]}
              >
                <MaterialCommunityIcons
                  name={metric.icon as any}
                  size={28}
                  color={metric.color}
                />
                {metric.trend !== "stable" && (
                  <MaterialCommunityIcons
                    name={`trending-${metric.trend}` as any}
                    size={16}
                    color={metric.color}
                    style={styles.trendIcon}
                  />
                )}
              </View>
              <Text style={[styles.metricValue, { color: metric.color }]}>
                {metric.value}
              </Text>
              <Text style={styles.metricLabel}>{metric.label}</Text>
            </LinearGradient>
          ))}
        </View>
      </Animated.View>

      {/* QUALITY TRENDS CHART */}
      <Animated.View
        entering={FadeInDown.delay(200).duration(500)}
        style={[styles.section, styles.trendSection]}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Quality Trend (Last 7 Days)</Text>
          <TouchableOpacity onPress={handleButtonPress}>
            <Text style={styles.seeAllText}>Weekly Report</Text>
          </TouchableOpacity>
        </View>
        <View style={styles.trendContainer}>
          {/* Chart Header */}
          <View style={styles.chartHeader}>
            <View style={styles.chartStats}>
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Current</Text>
                <Text style={styles.statValue}>92%</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Avg</Text>
                <Text style={styles.statValue}>85%</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statLabel}>Change</Text>
                <View style={styles.changeIndicator}>
                  <MaterialCommunityIcons
                    name="trending-up"
                    size={14}
                    color="#10B981"
                  />
                  <Text style={[styles.statValue, { color: "#10B981", marginLeft: 4 }]}>
                    +3.2%
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* Chart Area */}
          <View style={styles.chartArea}>
            <BarChart
              data={chartData}
              width={chartWidth}
              height={chartHeight + 60}
              yAxisLabel=""
              yAxisSuffix="%"
              chartConfig={chartConfig}
              verticalLabelRotation={0}
              fromZero={true}
              showBarTops={false}
              withInnerLines={true}
              segments={4}
              withCustomBarColorFromData={true}
              flatColor={true}
              style={{
                marginVertical: 4,
                borderRadius: 16,
                marginLeft: -12,
              }}
            />
          </View>

          {/* Legend */}
          <View style={styles.legend}>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#10B981' }]} />
              <Text style={styles.legendText}>Excellent</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#3B82F6' }]} />
              <Text style={styles.legendText}>Good</Text>
            </View>
            <View style={styles.legendItem}>
              <View style={[styles.legendColor, { backgroundColor: '#F59E0B' }]} />
              <Text style={styles.legendText}>Average</Text>
            </View>
          </View>
        </View>
      </Animated.View>

      {/* QUICK ACTIONS - Only these buttons will navigate */}
      <Animated.View
        entering={FadeInDown.delay(300).duration(500)}
        style={styles.section}
      >
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {quickActions.map((action, index) => (
            <TouchableOpacity
              key={index}
              style={styles.actionCard}
              onPress={() => navigation.navigate(action.screen)}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[`${action.color}20`, `${action.color}10`]}
                style={styles.actionIconContainer}
              >
                <MaterialCommunityIcons
                  name={action.icon as any}
                  size={30}
                  color={action.color}
                />
              </LinearGradient>
              <Text style={styles.actionTitle}>{action.title}</Text>
            </TouchableOpacity>
          ))}
        </View>
      </Animated.View>

      {/* RECENT TESTS */}
      <Animated.View
        entering={FadeInDown.delay(400).duration(500)}
        style={styles.section}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons
              name="clipboard-list-outline"
              size={22}
              color={colors.primary}
            />
            <Text style={[styles.sectionTitle, { color: colors.primary, marginLeft: 8 }]}>
              Recent Tests
            </Text>
          </View>
          <TouchableOpacity
            style={styles.seeAllButton}
            onPress={() => navigation.navigate("LatexQualityReports")}
          >
            <Text style={styles.seeAllText}>View All</Text>
            <MaterialIcons
              name="arrow-forward-ios"
              size={14}
              color={colors.primary}
              style={{ marginLeft: 4 }}
            />
          </TouchableOpacity>
        </View>

        <View style={styles.testsContainer}>
          {recentTestData.length === 0 ? (
            <View style={{ padding: 20, alignItems: "center" }}>
              <MaterialCommunityIcons name="clipboard-text-outline" size={48} color="#CBD5E1" />
              <Text style={{ color: "#64748B", marginTop: 12, fontWeight: "500" }}>No recent tests found</Text>
            </View>
          ) : recentTestData.map((test, i) => {
            const quality = renderQualityScore(test.score);
            return (
              <LinearGradient
                key={test.id || i}
                colors={[`${test.statusColor}08`, '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={[styles.reportCard, { borderLeftColor: test.statusColor }]}
              >
                <View style={styles.cardHeader}>
                  <View style={styles.titleRow}>
                    <MaterialCommunityIcons name={test.icon as any} size={20} color={test.statusColor} />
                    <Text style={styles.testId}>{test.id}</Text>
                    <View style={[styles.statusBadge, { backgroundColor: `${test.statusColor}15` }]}>
                      <Text style={[styles.statusText, { color: test.statusColor }]}>{test.result}</Text>
                    </View>
                  </View>
                </View>

                <View style={styles.cardBody}>
                  <View style={styles.scoreBlock}>
                    <Text style={styles.scoreValue}>{test.score}%</Text>
                    <Text style={[styles.gradeText, { color: test.statusColor }]}>{test.quality} </Text>
                  </View>
                  <View style={styles.timeBlock}>
                    <MaterialCommunityIcons name="clock-outline" size={14} color="#64748B" style={{ marginRight: 4 }} />
                    <Text style={styles.timeText}>{test.time}</Text>
                  </View>
                </View>

                <View style={styles.cardFooter}>
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => test.fileUri ? ReportService.sharePDF(test.fileUri) : handleButtonPress()}
                    >
                      <Text style={[styles.actionButtonText, { color: colors.primary }]}>Download</Text>
                      <MaterialIcons name="file-download" size={16} color={colors.primary} style={{ marginLeft: 4 }} />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => test.fileUri ? handleDeleteReport(test.fileUri, test.id) : handleButtonPress()}
                    >
                      <Text style={[styles.actionButtonText, { color: '#EF4444' }]}>Delete</Text>
                      <MaterialIcons name="delete-outline" size={16} color="#EF4444" style={{ marginLeft: 4 }} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.dateText}>{test.date}</Text>
                </View>
              </LinearGradient>
            );
          })}
        </View>
      </Animated.View>

      {/* ACTIVE ALERTS */}
      <Animated.View
        entering={FadeInDown.delay(500).duration(500)}
        style={styles.section}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons
              name="alert-octagon-outline"
              size={22}
              color="#EF4444"
            />
            <Text style={[styles.sectionTitle, { color: "#EF4444" }]}>
              Active Alerts
            </Text>
          </View>
          <View style={styles.alertCountBadge}>
            <Text style={styles.alertCountText}>
              {alerts.length} Active
            </Text>
          </View>
        </View>

        <View style={styles.alertsContainer}>
          {alerts.map((alert, i) => (
            <LinearGradient
              key={i}
              colors={[`${alert.color}08`, "#FFFFFF"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={[
                styles.alertCard,
                { borderLeftColor: alert.color, borderLeftWidth: 4 },
              ]}
            >
              <View style={styles.alertHeader}>
                <View style={styles.alertTitleRow}>
                  <MaterialCommunityIcons
                    name={alert.icon as any}
                    size={20}
                    color={alert.color}
                  />
                  <Text style={styles.alertId}>{alert.id}</Text>
                  <View
                    style={[
                      styles.urgencyBadge,
                      { backgroundColor: `${alert.color}15` },
                    ]}
                  >
                    <Text style={[styles.urgencyText, { color: alert.color }]}>
                      {alert.urgency}
                    </Text>
                  </View>
                </View>
                <Text style={styles.alertTime}>{alert.time}</Text>
              </View>

              <Text style={styles.alertMessage}>{alert.message}</Text>

              <View style={styles.alertFooter}>
                <TouchableOpacity style={styles.alertActionButton} onPress={handleButtonPress}>
                  <Text style={[styles.alertActionButtonText, { color: alert.color }]}>
                    Take Action
                  </Text>
                  <MaterialIcons
                    name="arrow-forward"
                    size={16}
                    color={alert.color}
                  />
                </TouchableOpacity>
                <TouchableOpacity style={styles.dismissButton} onPress={handleButtonPress}>
                  <Text style={styles.dismissButtonText}>Dismiss</Text>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          ))}
        </View>
      </Animated.View>

      {/* RECOMMENDED ACTIONS */}
      <Animated.View
        entering={FadeInDown.delay(600).duration(500)}
        style={styles.section}
      >
        <View style={styles.sectionHeader}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons
              name="lightbulb-on-outline"
              size={22}
              color="#8B5CF6"
            />
            <Text style={[styles.sectionTitle, { color: "#8B5CF6" }]}>
              Recommended Actions
            </Text>
          </View>
        </View>
        <View style={styles.recommendationsContainer}>
          {recommendedActions.map((action, i) => (
            <View key={i} style={styles.recommendationCard}>
              <View style={styles.recommendationIconContainer}>
                <MaterialCommunityIcons
                  name={action.icon as any}
                  size={24}
                  color="#8B5CF6"
                />
              </View>
              <View style={styles.recommendationContent}>
                <View style={styles.recommendationHeader}>
                  <Text style={styles.recommendationTitle}>{action.title}</Text>
                  <View
                    style={[
                      styles.priorityBadge,
                      {
                        backgroundColor:
                          action.priority === "high"
                            ? "#EF4444"
                            : action.priority === "medium"
                              ? "#F59E0B"
                              : "#10B981",
                      },
                    ]}
                  >
                    <Text style={styles.priorityText}>
                      {action.priority.charAt(0).toUpperCase() +
                        action.priority.slice(1)}
                    </Text>
                  </View>
                </View>
                <Text style={styles.recommendationDescription}>
                  {action.description}
                </Text>
                <TouchableOpacity style={styles.applyButton} onPress={handleButtonPress}>
                  <Text style={styles.applyButtonText}>Apply</Text>
                </TouchableOpacity>
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
    justifyContent: "space-between",
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
  },
  headerTitleWrap: {
    flexDirection: "row",
    alignItems: "center",
    marginLeft: -10,
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
  notificationButton: {
    position: "relative",
    padding: 8,
  },
  notificationBadge: {
    position: "absolute",
    top: 4,
    right: 4,
    backgroundColor: "#EF4444",
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: "center",
    alignItems: "center",
  },
  notificationBadgeText: {
    color: "#FFF",
    fontSize: 10,
    fontWeight: "800",
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  trendSection: {
    paddingHorizontal: 16, // Wider container
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
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
  seeAllButton: {
    flexDirection: "row",
    alignItems: "center",
  },
  metricsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 15,
  },
  metricCard: {
    width: CARD_WIDTH,
    padding: 20,
    borderRadius: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  metricIconBox: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  trendIcon: {
    position: "absolute",
    bottom: -4,
    right: -4,
    backgroundColor: "#FFF",
    borderRadius: 8,
    padding: 2,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: "800",
    marginTop: 4,
  },
  metricLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: "#4B5563",
    opacity: 0.9,
    marginTop: 4,
  },
  // Enhanced Trend Chart Styles
  trendContainer: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
  },
  chartHeader: {
    marginBottom: 20,
  },
  chartStats: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  statItem: {
    flex: 1,
    alignItems: "center",
  },
  statLabel: {
    fontSize: 12,
    fontWeight: "600",
    color: "#6B7280",
    marginBottom: 4,
  },
  statValue: {
    fontSize: 18,
    fontWeight: "800",
    color: "#111827",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "#E5E7EB",
  },
  changeIndicator: {
    flexDirection: "row",
    alignItems: "center",
  },
  yAxisLabel: {
    fontSize: 10,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "right",
  },
  chartWrapper: {
    flex: 1,
    position: "relative",
  },
  chartArea: {
    alignItems: "center",
    justifyContent: "center",
    height: chartHeight + 80,
  },
  grid_line_removed: {},
  xAxis_removed: {},
  legend: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 20,
    gap: 16,
  },
  legendItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 6,
  },
  legendText: {
    fontSize: 12,
    color: "#6B7280",
    fontWeight: "500",
  },
  // Quick Actions
  actionsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginTop: 15,
  },
  actionCard: {
    width: CARD_WIDTH,
    backgroundColor: "#FFFFFF",
    padding: 20,
    borderRadius: 18,
    marginBottom: 20,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
  },
  actionIconContainer: {
    width: 60,
    height: 60,
    borderRadius: 15,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  actionTitle: {
    fontSize: 14,
    fontWeight: "700",
    color: "#1F2937",
    marginTop: 12,
    textAlign: "center",
  },
  // Recent Tests
  testsContainer: {
    gap: 12,
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
    alignItems: 'flex-end',
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 6,
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
  // Alert Styles
  alertsContainer: {
    gap: 12,
  },
  alertCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  alertHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    marginBottom: 12,
  },
  alertTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  alertId: {
    fontSize: 13,
    fontWeight: "700",
    color: "#6B7280",
    marginLeft: 8,
    marginRight: 12,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  alertTime: {
    fontSize: 12,
    color: "#9CA3AF",
    fontWeight: "500",
  },
  alertMessage: {
    fontSize: 15,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 16,
    lineHeight: 22,
  },
  alertFooter: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  alertActionButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  alertActionButtonText: {
    fontSize: 14,
    fontWeight: "700",
    marginRight: 4,
  },
  dismissButton: {
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  dismissButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  alertCountBadge: {
    backgroundColor: "#FEF2F2",
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  alertCountText: {
    fontSize: 12,
    fontWeight: "800",
    color: "#EF4444",
  },
  recommendationsContainer: {
    gap: 12,
  },
  recommendationCard: {
    flexDirection: "row",
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  recommendationIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: "#F5F3FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  recommendationContent: {
    flex: 1,
  },
  recommendationHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  recommendationTitle: {
    fontSize: 16,
    fontWeight: "700",
    color: "#111827",
  },
  priorityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 11,
    fontWeight: "800",
    color: "#FFFFFF",
  },
  recommendationDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 12,
    lineHeight: 20,
  },
  applyButton: {
    alignSelf: "flex-start",
    backgroundColor: "#8B5CF6",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 12,
  },
  applyButtonText: {
    fontSize: 14,
    fontWeight: "700",
    color: "#FFFFFF",
  },
});
