import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  SafeAreaView,
  RefreshControl,
  Modal,
  Animated,
  Dimensions,
  Platform,
  StatusBar,
  Linking,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Animatable from "react-native-animatable";
import { colors } from "../../../shared/styles/colors";
import {
  ReportService,
  SavedReportInfo,
} from "../../../core/services/ReportService";
import * as Print from "expo-print";
import * as Sharing from "expo-sharing";
import type { NativeStackScreenProps } from "@react-navigation/native-stack";

type RootStackParamList = {
  Reports: undefined;
  // Add other screens here as needed
};

type ReportsScreenProps = NativeStackScreenProps<RootStackParamList, "Reports">;

const { width, height } = Dimensions.get("window");

const ReportsScreen: React.FC<any> = ({ navigation }) => {
  const [reports, setReports] = useState<SavedReportInfo[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedReport, setSelectedReport] = useState<SavedReportInfo | null>(
    null
  );
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showPdfViewer, setShowPdfViewer] = useState(false);
  const [pdfUri, setPdfUri] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [fadeAnim] = useState(new Animated.Value(0));

  // Load reports on component mount
  useEffect(() => {
    loadReports();
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();
  }, []);

  const loadReports = async () => {
    try {
      setLoading(true);
      const savedReports = await ReportService.listSavedReports();
      const filteredReports = savedReports.filter(report => !report.name.startsWith('Report_Latex_'));
      setReports(filteredReports);
    } catch (error) {
      console.error("Error loading reports:", error);
      Alert.alert("Error", "Failed to load reports");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadReports();
  };

  const handleViewReport = async (report: SavedReportInfo) => {
    try {
      setPdfLoading(true);
      setSelectedReport(report);
      setPdfUri(report.uri);
      setShowPdfViewer(true);
    } catch (error) {
      console.error("Error opening PDF:", error);
      Alert.alert("Error", "Could not open PDF file");
    } finally {
      setPdfLoading(false);
    }
  };

  const handleShareReport = async () => {
    if (!pdfUri) return;

    try {
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(pdfUri, {
          mimeType: "application/pdf",
          dialogTitle: "Share PDF Report",
          UTI: "com.adobe.pdf",
        });
      } else {
        Alert.alert(
          "Sharing not available",
          "Sharing is not available on this device"
        );
      }
    } catch (error) {
      console.error("Error sharing PDF:", error);
      Alert.alert("Error", "Failed to share PDF");
    }
  };

  const handlePrintReport = async () => {
    if (!pdfUri) return;

    try {
      await Print.printAsync({
        uri: pdfUri,
      });
    } catch (error) {
      console.error("Error printing PDF:", error);
      Alert.alert("Error", "Failed to print PDF");
    }
  };

  const handleDeleteReport = (report: SavedReportInfo) => {
    setSelectedReport(report);
    setShowDeleteModal(true);
  };

  const confirmDelete = async () => {
    if (!selectedReport) return;

    try {
      const success = await ReportService.deleteReport(selectedReport.uri);
      if (success) {
        Alert.alert("✅ Success", "Report deleted successfully");
        loadReports(); // Refresh the list
      } else {
        Alert.alert("❌ Error", "Failed to delete report");
      }
    } catch (error) {
      console.error("Error deleting report:", error);
      Alert.alert("❌ Error", "Failed to delete report");
    } finally {
      setShowDeleteModal(false);
      setSelectedReport(null);
    }
  };

  const getQualityColor = (reportName: string) => {
    const colors = ["#6B7280", "#9CA3AF", "#D1D5DB", "#4B5563", "#374151"];
    const index = reportName.length % colors.length;
    return colors[index];
  };

  const extractBatchId = (filename: string): string => {
    // Remove file extension and any timestamp
    const nameWithoutExt = filename.replace(/\.pdf$/i, "");
    // Remove any trailing timestamp pattern (_ followed by numbers)
    return nameWithoutExt.replace(/_\d+$/, "");
  };

  const formatFileSize = (bytes?: number): string => {
    if (!bytes) return "Unknown";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const handleGoBack = () => {
    if (showPdfViewer) {
      setShowPdfViewer(false);
    } else if (showDeleteModal) {
      setShowDeleteModal(false);
    } else {
      navigation.goBack();
    }
  };

  const renderReportItem = ({
    item,
    index,
  }: {
    item: SavedReportInfo;
    index: number;
  }) => {
    const displayName = extractBatchId(item.name);
    const fileSize = formatFileSize(item.sizeInBytes);

    return (
      <Animatable.View
        animation="fadeInUp"
        delay={index * 100}
        duration={500}
        style={styles.reportCard}
      >
        <LinearGradient
          colors={["#ffffff", "#F8FAFC"]}
          style={styles.cardGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.cardHeader}>
            <View style={styles.reportIconContainer}>
              <View
                style={[
                  styles.iconContainer,
                  { backgroundColor: getQualityColor(item.name) + "20" },
                ]}
              >
                <MaterialCommunityIcons
                  name="file-pdf-box"
                  size={28}
                  color={getQualityColor(item.name)}
                />
              </View>
            </View>
            <View style={styles.reportInfo}>
              <Text style={styles.reportName} numberOfLines={1}>
                {displayName}
              </Text>
              <View style={styles.metaContainer}>
                <View style={styles.metaItem}>
                  <Ionicons name="calendar-outline" size={12} color="#6B7280" />
                  <Text style={styles.metaText}>
                    {item.modified || "Date unknown"}
                  </Text>
                </View>
                <View style={styles.metaItem}>
                  <Ionicons
                    name="stats-chart-outline"
                    size={12}
                    color="#6B7280"
                  />
                  <Text style={styles.metaText}>{fileSize}</Text>
                </View>
              </View>
            </View>
            <View style={styles.statusIndicator}>
              <View
                style={[
                  styles.statusDot,
                  { backgroundColor: getQualityColor(item.name) },
                ]}
              />
              <Text style={styles.statusText}>PDF</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleViewReport(item)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={[colors.primary, "#4CAF50"]}
                style={styles.viewButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="eye" size={18} color="#ffffff" />
                <Text style={styles.viewButtonText}>View</Text>
              </LinearGradient>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeleteReport(item)}
              activeOpacity={0.7}
            >
              <LinearGradient
                colors={["#EF4444", "#DC2626"]}
                style={styles.deleteButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Ionicons name="trash-outline" size={18} color="#ffffff" />
                <Text style={styles.deleteButtonText}>Delete</Text>
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </Animatable.View>
    );
  };

  const renderEmptyState = () => (
    <Animatable.View
      animation="fadeIn"
      duration={800}
      style={styles.emptyState}
    >
      <LinearGradient
        colors={["#F0F9FF", "#E0F2FE"]}
        style={styles.emptyStateGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.emptyStateIconContainer}>
          <MaterialCommunityIcons
            size={80}
            color="#6B7280"
          />
        </View>
        <Text style={styles.emptyStateTitle}>No Reports Yet</Text>
        <Text style={styles.emptyStateText}>
          Generate quality test reports to see them listed here. Your reports
          will appear in this dashboard once created.
        </Text>
        <TouchableOpacity
          style={styles.emptyStateButton}
          onPress={loadReports}
          activeOpacity={0.8}
        >
          <LinearGradient
            colors={[colors.primary, "#4CAF50"]}
            style={styles.emptyStateButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="refresh" size={20} color="#ffffff" />
            <Text style={styles.emptyStateButtonText}>Refresh Reports</Text>
          </LinearGradient>
        </TouchableOpacity>
      </LinearGradient>
    </Animatable.View>
  );

  const renderHeader = () => (
    <LinearGradient
      colors={[colors.primary, "#1B5E20"]}
      style={styles.headerGradient}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
    >
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.headerContent}>
          <View style={styles.headerTopRow}>
            {/* Removed back button from header */}
            <View style={styles.headerTitleContainer}>
              <Text style={styles.headerTitle}>📋 Test Reports</Text>
              <Text style={styles.headerSubtitle}>
                Manage and review your quality test reports
              </Text>
            </View>
            <View style={styles.placeholder} />
          </View>
          <View style={styles.headerStats}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{reports.length}</Text>
              <Text style={styles.statLabel}>Total Reports</Text>
            </View>
            <View style={styles.statDivider} />
            <View style={styles.statItem}>
              <Text style={styles.statValue}>
                {formatFileSize(
                  reports.reduce(
                    (acc, report) => acc + (report.sizeInBytes || 0),
                    0
                  )
                )}
              </Text>
              <Text style={styles.statLabel}>Total Size</Text>
            </View>
          </View>
        </View>
      </SafeAreaView>
    </LinearGradient>
  );

  const PdfViewerModal = () => (
    <Modal
      visible={showPdfViewer}
      animationType="slide"
      onRequestClose={handleGoBack}
    >
      <SafeAreaView style={styles.pdfViewerContainer}>
        <View style={styles.pdfViewerHeader}>
          <TouchableOpacity
            style={styles.pdfBackButton}
            onPress={handleGoBack}
            activeOpacity={0.7}
          >
            <Ionicons name="arrow-back" size={24} color="#1E293B" />
          </TouchableOpacity>
          <Text style={styles.pdfViewerTitle} numberOfLines={1}>
            {selectedReport
              ? extractBatchId(selectedReport.name)
              : "PDF Viewer"}
          </Text>
          <View style={styles.pdfActions}>
            <TouchableOpacity
              style={styles.pdfActionButton}
              onPress={handleShareReport}
              activeOpacity={0.7}
            >
              <Ionicons name="share-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.pdfActionButton}
              onPress={handlePrintReport}
              activeOpacity={0.7}
            >
              <Ionicons name="print-outline" size={22} color={colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        {pdfLoading ? (
          <View style={styles.pdfLoadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.pdfLoadingText}>Loading PDF...</Text>
          </View>
        ) : (
          <View style={styles.pdfContent}>
            <View style={styles.pdfPreview}>
              <View style={styles.pdfPreviewIcon}>
                <MaterialCommunityIcons
                  name="file-pdf-box"
                  size={120}
                  color="#EF4444"
                />
              </View>
              <Text style={styles.pdfPreviewText}>PDF Document Ready</Text>
              <Text style={styles.pdfPreviewSubtext}>
                {selectedReport
                  ? formatFileSize(selectedReport.sizeInBytes)
                  : "Unknown size"}
              </Text>

              <TouchableOpacity
                style={styles.openInExternalButton}
                onPress={() =>
                  pdfUri &&
                  Linking.openURL(pdfUri).catch((err) => {
                    console.error("Error opening PDF:", err);
                    Alert.alert(
                      "Error",
                      "Could not open PDF. Make sure you have a PDF viewer app installed."
                    );
                  })
                }
                activeOpacity={0.7}
              >
                <LinearGradient
                  colors={[colors.primary, "#4CAF50"]}
                  style={styles.openInExternalGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  <Ionicons name="open-outline" size={20} color="#ffffff" />
                  <Text style={styles.openInExternalText}>
                    Open in PDF Viewer
                  </Text>
                </LinearGradient>
              </TouchableOpacity>
            </View>

            <View style={styles.pdfDetails}>
              <Text style={styles.pdfDetailsTitle}>Report Details</Text>
              <View style={styles.pdfDetailItem}>
                <Text style={styles.pdfDetailLabel}>File Name:</Text>
                <Text style={styles.pdfDetailValue}>
                  {selectedReport
                    ? extractBatchId(selectedReport.name)
                    : "Unknown"}
                </Text>
              </View>
              <View style={styles.pdfDetailItem}>
                <Text style={styles.pdfDetailLabel}>File Size:</Text>
                <Text style={styles.pdfDetailValue}>
                  {selectedReport
                    ? formatFileSize(selectedReport.sizeInBytes)
                    : "Unknown"}
                </Text>
              </View>
              <View style={styles.pdfDetailItem}>
                <Text style={styles.pdfDetailLabel}>Last Modified:</Text>
                <Text style={styles.pdfDetailValue}>
                  {selectedReport?.modified || "Unknown"}
                </Text>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
    </Modal>
  );

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

      {renderHeader()}

      <Animated.View
        style={[
          styles.content,
          {
            opacity: fadeAnim,
            transform: [
              {
                translateY: fadeAnim.interpolate({
                  inputRange: [0, 1],
                  outputRange: [20, 0],
                }),
              },
            ],
          },
        ]}
      >
        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={styles.loadingText}>Loading your reports...</Text>
          </View>
        ) : (
          <FlatList
            data={reports}
            renderItem={renderReportItem}
            keyExtractor={(item, index) => `${item.uri}-${index}`}
            contentContainerStyle={
              reports.length === 0
                ? styles.emptyListContent
                : styles.listContent
            }
            ListEmptyComponent={renderEmptyState}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={handleRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
                title="Pull to refresh"
                titleColor={colors.primary}
              />
            }
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              reports.length > 0 ? (
                <Animatable.Text
                  animation="fadeIn"
                  duration={600}
                  style={styles.resultsCount}
                >
                  {reports.length} report{reports.length !== 1 ? "s" : ""} found
                </Animatable.Text>
              ) : null
            }
          />
        )}
      </Animated.View>

      {/* PDF Viewer Modal */}
      <PdfViewerModal />

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent
        animationType="fade"
        onRequestClose={handleGoBack}
      >
        <View style={styles.modalOverlay}>
          <Animatable.View animation="zoomIn" duration={300}>
            <LinearGradient
              colors={["#ffffff", "#F9FAFB"]}
              style={styles.modalContent}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.modalIconContainer}>
                <MaterialCommunityIcons
                  name="alert-circle-outline"
                  size={56}
                  color="#EF4444"
                />
              </View>
              <Text style={styles.modalTitle}>Confirm Delete</Text>
              <Text style={styles.modalText}>
                Are you sure you want to delete "
                {selectedReport
                  ? extractBatchId(selectedReport.name)
                  : "this report"}
                "? This action cannot be undone.
              </Text>

              <View style={styles.modalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleGoBack}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.deleteModalButton}
                  onPress={confirmDelete}
                  activeOpacity={0.7}
                >
                  <LinearGradient
                    colors={["#EF4444", "#DC2626"]}
                    style={styles.deleteModalButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  >
                    <Text style={styles.deleteModalButtonText}>Delete</Text>
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </Animatable.View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F8FAFC",
  },
  headerGradient: {
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  headerSafeArea: {
    paddingTop: Platform.OS === "ios" ? 0 : StatusBar.currentHeight,
  },
  headerContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  headerTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  // Removed backButton style since it's no longer used in the main header
  headerTitleContainer: {
    flex: 1,
    alignItems: "center",
  },
  placeholder: {
    width: 40,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
    marginLeft: 25
  },
  headerSubtitle: {
    fontSize: 14,
    color: "#E0E7FF",
    fontWeight: "500",
    textAlign: "center",
    marginLeft: 25
  },
  headerStats: {
    flexDirection: "row",
    backgroundColor: "rgba(255, 255, 255, 0.15)",
    borderRadius: 16,
    padding: 16,
    alignItems: "center",
    justifyContent: "space-around",
  },
  statItem: {
    alignItems: "center",
    flex: 1,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#ffffff",
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: "#E0E7FF",
    fontWeight: "500",
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: "rgba(255, 255, 255, 0.3)",
  },
  content: {
    flex: 1,
    marginTop: -10,
    zIndex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 32,
    paddingTop: 24,
  },
  emptyListContent: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  resultsCount: {
    fontSize: 14,
    color: "#64748B",
    marginBottom: 16,
    marginLeft: 4,
    fontWeight: "600",
  },
  reportCard: {
    marginBottom: 16,
    borderRadius: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 12,
    elevation: 5,
  },
  cardGradient: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: "rgba(226, 232, 240, 0.5)",
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  reportIconContainer: {
    marginRight: 16,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },
  reportInfo: {
    flex: 1,
  },
  reportName: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 8,
  },
  metaContainer: {
    flexDirection: "row",
    gap: 16,
  },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  metaText: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  statusIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  statusText: {
    fontSize: 10,
    color: "#475569",
    fontWeight: "600",
  },
  actionButtons: {
    flexDirection: "row",
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  viewButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  deleteButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 14,
    gap: 8,
  },
  viewButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  deleteButtonText: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  emptyState: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyStateGradient: {
    borderRadius: 24,
    padding: 32,
    alignItems: "center",
    borderWidth: 2,
    borderColor: "rgba(79, 70, 229, 0.1)",
    borderStyle: "dashed",
  },
  emptyStateIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: "rgba(79, 70, 229, 0.1)",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 24,
  },
  emptyStateTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 12,
    textAlign: "center",
  },
  emptyStateText: {
    fontSize: 14,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  emptyStateButton: {
    width: 200,
    borderRadius: 16,
    overflow: "hidden",
  },
  emptyStateButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  emptyStateButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  // PDF Viewer Styles
  pdfViewerContainer: {
    flex: 1,
    backgroundColor: "#ffffff",
  },
  pdfViewerHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pdfBackButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  pdfViewerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: "600",
    color: "#1E293B",
    textAlign: "center",
    marginHorizontal: 12,
  },
  pdfActions: {
    flexDirection: "row",
    gap: 8,
  },
  pdfActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#F3F4F6",
    justifyContent: "center",
    alignItems: "center",
  },
  pdfLoadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  pdfLoadingText: {
    marginTop: 16,
    fontSize: 16,
    color: "#64748B",
    fontWeight: "500",
  },
  pdfContent: {
    flex: 1,
    padding: 24,
  },
  pdfPreview: {
    alignItems: "center",
    marginBottom: 32,
  },
  pdfPreviewIcon: {
    width: 160,
    height: 160,
    borderRadius: 80,
    backgroundColor: "#FEF2F2",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
  },
  pdfPreviewText: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 8,
  },
  pdfPreviewSubtext: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 24,
  },
  openInExternalButton: {
    width: "100%",
    borderRadius: 12,
    overflow: "hidden",
  },
  openInExternalGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 16,
    gap: 10,
  },
  openInExternalText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
  pdfDetails: {
    backgroundColor: "#F9FAFB",
    borderRadius: 16,
    padding: 20,
  },
  pdfDetailsTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 16,
  },
  pdfDetailItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#E5E7EB",
  },
  pdfDetailLabel: {
    fontSize: 14,
    color: "#6B7280",
    fontWeight: "500",
  },
  pdfDetailValue: {
    fontSize: 14,
    color: "#1E293B",
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(15, 23, 42, 0.7)",
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
  },
  modalContent: {
    borderRadius: 24,
    padding: 32,
    width: "100%",
    maxWidth: 400,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 12,
  },
  modalIconContainer: {
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#1E293B",
    marginBottom: 12,
    textAlign: "center",
  },
  modalText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 32,
  },
  modalButtons: {
    flexDirection: "row",
    gap: 12,
    width: "100%",
  },
  cancelButton: {
    flex: 1,
    backgroundColor: "#F1F5F9",
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  deleteModalButton: {
    flex: 1,
    borderRadius: 12,
    overflow: "hidden",
  },
  deleteModalButtonGradient: {
    paddingVertical: 16,
    alignItems: "center",
  },
  cancelButtonText: {
    color: "#475569",
    fontSize: 16,
    fontWeight: "700",
  },
  deleteModalButtonText: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
  },
});

export default ReportsScreen;