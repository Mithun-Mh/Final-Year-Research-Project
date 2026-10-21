import React, { useState, useEffect, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  StatusBar,
  SafeAreaView,
  Alert,
  TextInput,
  Dimensions
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useNavigation } from "@react-navigation/native";
import { colors } from "../../../shared/styles/colors";
import Animated, {
  FadeInDown,
  FadeInUp,
  ZoomIn
} from "react-native-reanimated";
import { latexQualityService, LatexQualityRequest } from "../../../core/services/latexQualityService";

const ESP32_IP = "http://192.168.122.34"; // Replace with your ESP32 IP

const { width } = Dimensions.get("window");

// Define types for sensor data
interface SensorData {
  temperature: number | string;
  turbidity: number | string;
  pH: number | string;
  airTemperature?: number | string;
  humidity?: number | string;
}

interface LiveSensorData {
  temperature: number;
  turbidity: number;
  ph: number;
  airTemperature: number;
  humidity: number;
}

// Helper function to get numeric value for status calculations
const getNumericValue = (value: number | string): number => {
  if (typeof value === "string") {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  }
  return value;
};

const LiveSensorScreen = () => {
  const navigation = useNavigation<any>();
  const [liveSensorData, setLiveSensorData] = useState<LiveSensorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [connectionError, setConnectionError] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<string>("");
  const failCount = useRef(0);

  const [testDate] = useState<string>(() => {
    return new Date().toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
      weekday: "long",
    });
  });

  const [testTime] = useState<string>(() => {
    return new Date().toLocaleTimeString("en-US", {
      hour12: true,
      hour: "2-digit",
      minute: "2-digit",
    });
  });

  const [testId, setTestId] = useState<string>("");
  const testerName = "Rubber Latex Collector";

  const [sensorData, setSensorData] = useState<SensorData>({
    temperature: "",
    turbidity: "",
    pH: "",
  });

  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Sample values for placeholders
  const sampleValues = {
    temperature: "28.5",
    turbidity: "-3600",
    pH: "6.8"
  };

  // Fetch live data from ESP32 - only for sensor measurements
  const fetchSensorData = async () => {
    try {
      setLoading(true);
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

      const response = await fetch(`${ESP32_IP}/data`, {
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);

      const data = await response.json();
      const newData = {
        temperature: Number(data.temp ?? 0),
        turbidity: Number(data.ntu ?? 0),
        ph: Number(data.ph ?? 0),
        airTemperature: Number(data.airtemp ?? 0),
        humidity: Number(data.hum ?? 0),
      };

      failCount.current = 0;
      setLiveSensorData(newData);
      setConnectionError(false);
      setLastUpdated(new Date().toLocaleTimeString());

      // Auto-fill sensor data from live readings
      setSensorData({
        temperature: newData.temperature.toString(),
        turbidity: newData.turbidity.toString(),
        pH: newData.ph.toString(),
      });

    } catch (err: any) {
      if (err.name === "AbortError") {
        console.warn("Fetch timed out. ESP32 might be slow or offline.");
      } else {
        console.error("Error fetching sensor data:", err);
      }
      failCount.current += 1;
      if (failCount.current >= 3) {
        setConnectionError(true);
      }
    } finally {
      setLoading(false);
    }
  };

  // Generate test ID on component mount
  useEffect(() => {
    generateTestId();
    fetchSensorData();

    // Set up interval to refresh ONLY sensor data
    const interval = setInterval(() => {
      fetchSensorData();
    }, 5000); // update every 5s

    return () => clearInterval(interval);
  }, []);

  const generateTestId = () => {
    const now = new Date();
    const year = now.getFullYear();
    const randomNum = Math.floor(Math.random() * 900) + 100;
    const newTestId = `Test-${year}-${randomNum}`;
    setTestId(newTestId);
  };

  const getTemperatureStatus = (temp: number | string) => {
    const tempNum = getNumericValue(temp);
    if (tempNum === 0) return { status: "Not Set", color: "#6B7280", icon: "help-circle" };
    if (tempNum >= 27 && tempNum <= 32) return { status: "Optimal", color: "#10B981", icon: "check-circle" };
    if (tempNum >= 25 && tempNum < 27) return { status: "Low", color: "#F59E0B", icon: "alert-circle" };
    if (tempNum > 32 && tempNum <= 35) return { status: "High", color: "#F59E0B", icon: "alert-circle" };
    return { status: "Critical", color: "#EF4444", icon: "close-circle" };
  };

  const getTurbidityStatus = (turb: number | string) => {
    const turbNum = getNumericValue(turb);
    if (turbNum === 0) return { status: "Not Set", color: "#6B7280", icon: "help-circle" };
    if (turbNum <= -3500) return { status: "Clear", color: "#10B981", icon: "check-circle" };
    if (turbNum >= -3500 && turbNum <= 0) return { status: "Moderate", color: "#F59E0B", icon: "alert-circle" };
    return { status: "Critical", color: "#EF4444", icon: "close-circle" };
  };

  const getpHStatus = (ph: number | string) => {
    const phNum = getNumericValue(ph);
    if (phNum === 0) return { status: "Not Set", color: "#6B7280", icon: "help-circle" };
    if (phNum >= 6.5 && phNum <= 7.2) return { status: "Optimal", color: "#10B981", icon: "check-circle" };
    if (phNum >= 6.0 && phNum < 6.5) return { status: "Low", color: "#F59E0B", icon: "alert-circle" };
    if (phNum > 7.2 && phNum <= 7.5) return { status: "High", color: "#F59E0B", icon: "alert-circle" };
    return { status: "Critical", color: "#EF4444", icon: "close-circle" };
  };

  const handleSubmitTest = async () => {
    // Check if any field is empty
    if (!sensorData.temperature || !sensorData.turbidity || !sensorData.pH) {
      Alert.alert(
        "Incomplete Data",
        "Please fill in all sensor measurements before submitting.",
        [{ text: "OK" }]
      );
      return;
    }

    // Validate numeric values
    const tempNum = getNumericValue(sensorData.temperature);
    const turbNum = getNumericValue(sensorData.turbidity);
    const phNum = getNumericValue(sensorData.pH);

    if (tempNum === 0 || turbNum === 0 || phNum === 0) {
      Alert.alert(
        "Invalid Data",
        "Please enter valid numeric values for all measurements.",
        [{ text: "OK" }]
      );
      return;
    }

    setIsSubmitting(true);

    try {
      const request: LatexQualityRequest = {
        temperature: parseFloat(sensorData.temperature as string),
        turbidity: parseFloat(sensorData.turbidity as string),
        pH: parseFloat(sensorData.pH as string),
        testId: testId,
        testerName: testerName,
        testDate: new Date()
      };

      console.log('Sending request:', request);
      const result = await latexQualityService.predictQuality(request);
      console.log('Received result:', result);

      navigation.navigate('LatexQualityResult', {
        result,
        testId,
        testDate,
        testTime
      });

    } catch (error: any) {
      console.error('Submission error:', error);
      Alert.alert(
        "Prediction Failed",
        error.message || "Failed to connect to quality prediction service. Please try again.",
        [{ text: "OK" }]
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoBack = () => {
    navigation.goBack();
  };

  const handleResetValues = () => {
    // Clear all input values
    setSensorData({
      temperature: "",
      turbidity: "",
      pH: "",
    });
    generateTestId(); // Regenerate test ID when resetting
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
            onPress={handleGoBack}
            disabled={isSubmitting}
          >
            <Ionicons name="arrow-back" size={24} color="white" />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <View style={styles.headerIconContainer}>
              <MaterialCommunityIcons name="test-tube" size={28} color="white" />
            </View>
            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>Rubber Latex Quality Test</Text>
              <Text style={styles.headerSubtitle}>Real - Time Sensor Measurements</Text>
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
        {/* Live Data Connection Status */}
        {connectionError && (
          <Animated.View entering={FadeInUp.duration(500)} style={styles.errorContainer}>
            <MaterialCommunityIcons name="wifi-off" size={24} color="#EF4444" />
            <Text style={styles.errorText}>
              Unable to connect the device. Please make sure device is power on and connected to the network properly.
            </Text>
            <TouchableOpacity style={styles.retryButton} onPress={fetchSensorData}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </Animated.View>
        )}

        {liveSensorData && !connectionError && (
          <Animated.View entering={FadeInUp.duration(500)} style={styles.liveDataContainer}>
            <LinearGradient
              colors={["#E0F2FE", "#F0FDF4"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.liveDataGradient}
            >
              <View style={styles.liveDataHeader}>
                <View style={styles.liveDataIconWrapper}>
                  <MaterialCommunityIcons name="access-point" size={22} color="#059669" />
                </View>
                <Text style={styles.liveDataTitle}>Live Sensor Readings</Text>
                {lastUpdated ? (
                  <View style={styles.lastUpdatedBadge}>
                    <Text style={styles.lastUpdated}>Updated: {lastUpdated}</Text>
                  </View>
                ) : null}
              </View>
              <View style={styles.liveDataGrid}>
                <View style={[styles.liveDataItem, styles.tempItem]}>
                  <MaterialCommunityIcons name="thermometer" size={20} color="#EF4444" style={styles.itemIcon} />
                  <Text style={styles.liveDataLabel}>Temperature</Text>
                      <Text style={[styles.liveDataValue, { color: "#991B1B" }]}>{liveSensorData.temperature.toFixed(1)}°C</Text>  
                </View>
                <View style={[styles.liveDataItem, styles.turbidityItem]}>
                  <MaterialCommunityIcons name="water-opacity" size={20} color="#3B82F6" style={styles.itemIcon} />
                  <Text style={styles.liveDataLabel}>Turbidity</Text>
                  <Text style={[styles.liveDataValue, { color: "#1E40AF" }]}>{liveSensorData.turbidity.toFixed(0)} NTU</Text>
                </View>
                <View style={[styles.liveDataItem, styles.phItem]}>
                  <MaterialCommunityIcons name="ph" size={20} color="#8B5CF6" style={styles.itemIcon} />
                  <Text style={styles.liveDataLabel}>pH Level</Text>
                  <Text style={[styles.liveDataValue, { color: "#5B21B6" }]}>{liveSensorData.ph.toFixed(1)}</Text>
                </View>
                <View style={[styles.liveDataItem, styles.airTempItem]}>
                  <MaterialCommunityIcons name="weather-partly-cloudy" size={20} color="#F59E0B" style={styles.itemIcon} />
                  <Text style={styles.liveDataLabel}>Air Temp</Text>
                  <Text style={[styles.liveDataValue, { color: "#B45309" }]}>{liveSensorData.airTemperature.toFixed(1)}°C</Text>
                </View>
                <View style={[styles.liveDataItem, styles.humidityItem]}>
                  <MaterialCommunityIcons name="water-percent" size={20} color="#10B981" style={styles.itemIcon} />
                  <Text style={styles.liveDataLabel}>Humidity</Text>
                  <Text style={[styles.liveDataValue, { color: "#047857" }]}>{liveSensorData.humidity.toFixed(0)}%</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>
        )}

        {/* Test Information Section - STATIC (no refresh) */}
        <Animated.View entering={FadeInUp.delay(200).duration(500)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="clipboard-text" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Test Information</Text>
          </View>
          <View style={styles.infoGrid}>
            <InfoCard
              icon="calendar"
              title="Test Date"
              value={testDate}
              color="#3B82F6"
            />
            <InfoCard
              icon="clock-outline"
              title="Test Time"
              value={testTime}
              color="#8B5CF6"
            />
          </View>
        </Animated.View>

        {/* Tester Information Section - STATIC (no refresh) */}
        <Animated.View entering={FadeInUp.delay(400).duration(500)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="account-circle" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Tester Information</Text>
          </View>
          <View style={styles.infoGrid}>
            <InfoCard
              icon="identifier"
              title="Test ID"
              value={testId || "Generating..."}
              color="#10B981"
            />
            <InfoCard
              icon="account-circle"
              title="Tester Name"
              value={testerName}
              color="#3B82F6"
            />
          </View>
          <TouchableOpacity
            style={styles.regenerateButton}
            onPress={generateTestId}
            disabled={isSubmitting}
          >
            <MaterialCommunityIcons name="refresh" size={18} color="#64748B" />
            <Text style={styles.regenerateButtonText}>Regenerate Test ID</Text>
          </TouchableOpacity>
        </Animated.View>

        {/* Sensor Inputs Section - REFRESHES EVERY 5 SECONDS */}
        <Animated.View entering={FadeInUp.delay(600).duration(500)} style={styles.section}>
          <View style={styles.sectionHeader}>
            <MaterialCommunityIcons name="chip" size={24} color={colors.primary} />
            <Text style={styles.sectionTitle}>Sensor Measurements</Text>
            {!connectionError && liveSensorData && (
              <View style={styles.liveIndicator}>
                <MaterialCommunityIcons name="sync" size={16} color="#10B981" />
                <Text style={styles.liveIndicatorText}>Live</Text>
              </View>
            )}
          </View>

          <View style={[styles.sensorContainer, styles.leftBorderContainer]}>
            <View style={styles.borderAccent} />

            {/* Temperature Input */}       
            <InputField
              label="Temperature"
              value={sensorData.temperature}          
              onChangeText={(text: string) => {
                if (text === "") {
                  setSensorData(prev => ({ ...prev, temperature: "" }));
                  return;
                }
                const decimalRegex = /^\d*\.?\d*$/;
                if (decimalRegex.test(text)) {
                  setSensorData(prev => ({ ...prev, temperature: text }));
                }
              }}
              icon="thermometer"
              unit="°C"
              status={getTemperatureStatus(sensorData.temperature)}
              optimalRange="Optimal Range: (27-32)°C"
              placeholder={`e.g., ${sampleValues.temperature}`}
              editable={false}
              isSubmitting={isSubmitting}
            />

            {/* Turbidity Input */}
            <InputField
              label="Turbidity"
              value={sensorData.turbidity}
              onChangeText={(text: string) => {
                if (text === "") {
                  setSensorData(prev => ({ ...prev, turbidity: "" }));
                  return;
                }
                const decimalRegex = /^-?\d*\.?\d*$/;
                if (decimalRegex.test(text)) {
                  setSensorData(prev => ({ ...prev, turbidity: text }));
                }
              }}
              icon="water-opacity"
              unit="NTU"
              status={getTurbidityStatus(sensorData.turbidity)}
              optimalRange="Optimal Range: ≤(-3500)NTU"
              placeholder={`e.g., ${sampleValues.turbidity}`}
              editable={false}
              isSubmitting={isSubmitting}
            />

            {/* pH Level Input */}
            <InputField
              label="pH Level"
              value={sensorData.pH}
              onChangeText={(text: string) => {
                if (text === "") {
                  setSensorData(prev => ({ ...prev, pH: "" }));
                  return;
                }
                const decimalRegex = /^\d*\.?\d*$/;
                if (decimalRegex.test(text)) {
                  setSensorData(prev => ({ ...prev, pH: text }));
                }
              }}
              icon="ph"
              unit="pH"
              status={getpHStatus(sensorData.pH)}
              optimalRange="Optimal Range: (6.5-7.2)pH"
              placeholder={`e.g., ${sampleValues.pH}`}
              editable={false}
              isSubmitting={isSubmitting}
            />
          </View>

          {/* Quality Assessment Summary */}
          <View style={[styles.assessmentCard, styles.leftBorderContainer]}>
            <View style={styles.borderAccent} />
            <View style={styles.assessmentHeader}>
              <MaterialCommunityIcons name="chart-line" size={24} color="#1E293B" />
              <Text style={styles.assessmentTitle}>Quality Assessment</Text>
            </View>
            <View style={styles.assessmentGrid}>
              <View style={styles.assessmentItem}>
                <MaterialCommunityIcons
                  name={getTemperatureStatus(sensorData.temperature).icon as any}
                  size={20}
                  color={getTemperatureStatus(sensorData.temperature).color}
                />
                <Text style={styles.assessmentLabel}>Temperature</Text>
                <Text style={styles.assessmentRange}>(27-32)°C</Text>
                <Text
                  style={[
                    styles.assessmentValue,
                    { color: getTemperatureStatus(sensorData.temperature).color }
                  ]}
                >
                  {getTemperatureStatus(sensorData.temperature).status}
                </Text>
              </View>
              <View style={styles.assessmentItem}>
                <MaterialCommunityIcons
                  name={getTurbidityStatus(sensorData.turbidity).icon as any}
                  size={20}
                  color={getTurbidityStatus(sensorData.turbidity).color}
                />
                <Text style={styles.assessmentLabel}>Turbidity</Text>
                <Text style={styles.assessmentRange}>≤(-3500)NTU</Text>
                <Text
                  style={[
                    styles.assessmentValue,
                    { color: getTurbidityStatus(sensorData.turbidity).color }
                  ]}
                >
                  {getTurbidityStatus(sensorData.turbidity).status}
                </Text>
              </View>
              <View style={styles.assessmentItem}>
                <MaterialCommunityIcons
                  name={getpHStatus(sensorData.pH).icon as any}
                  size={20}
                  color={getpHStatus(sensorData.pH).color}
                />
                <Text style={styles.assessmentLabel}>pH Level</Text>
                <Text style={styles.assessmentRange}>(6.5-7.2)pH</Text>
                <Text
                  style={[
                    styles.assessmentValue,
                    { color: getpHStatus(sensorData.pH).color }
                  ]}
                >
                  {getpHStatus(sensorData.pH).status}
                </Text>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Action Buttons */}
        <Animated.View entering={FadeInUp.delay(800).duration(500)} style={styles.actionSection}>
          <TouchableOpacity
            style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
            onPress={handleSubmitTest}
            disabled={isSubmitting}
            activeOpacity={0.9}
          >
            <LinearGradient
              colors={isSubmitting ? ["#9CA3AF", "#6B7280"] : ["#10B981", "#059669"]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.submitButtonGradient}
            >
              {isSubmitting ? (
                <>
                  <MaterialCommunityIcons name="loading" size={24} color="white" />
                  <Text style={styles.submitButtonText}>Processing...</Text>
                </>
              ) : (
                <>
                  <MaterialCommunityIcons name="check-circle" size={24} color="white" />
                  <Text style={styles.submitButtonText}>Launch Quality Test</Text>
                </>
              )}
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryButton}
            onPress={handleResetValues}
            disabled={isSubmitting}
          >
            <MaterialCommunityIcons name="refresh" size={20} color="#64748B" />
            <Text style={styles.secondaryButtonText}>Reset All Values</Text>
          </TouchableOpacity>
        </Animated.View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
};

const InputField = ({
  label,
  value,
  onChangeText,
  icon,
  unit,
  status,
  optimalRange,
  placeholder,
  editable = true,
  isSubmitting = false,
}: any) => (
  <Animated.View entering={FadeInDown.duration(500)} style={styles.inputFieldContainer}>
    <View style={styles.inputHeader}>
      <View style={styles.inputIconContainer}>
        <MaterialCommunityIcons name={icon} size={24} color={colors.primary} />
      </View>
      <View style={styles.inputLabelContainer}>
        <Text style={styles.inputLabel}>{label}</Text>
        <Text style={styles.optimalRange}>{optimalRange}</Text>
      </View>
      {status && (
        <View style={[styles.statusBadge, { backgroundColor: `${status.color}15` }]}>
          <MaterialCommunityIcons name={status.icon as any} size={16} color={status.color} />
          <Text style={[styles.statusText, { color: status.color }]}>
            {status.status}
          </Text>
        </View>
      )}
    </View>
    <View style={styles.inputWrapper}>
      <TextInput
        style={[styles.input, !value && styles.placeholderInput]}
        value={value ? value.toString() : ""}
        onChangeText={onChangeText}
        keyboardType="decimal-pad"
        placeholder={placeholder}
        placeholderTextColor="#94A3B8"
        editable={editable && !isSubmitting}
        selectTextOnFocus={editable}
      />
      <Text style={styles.unitText}>{unit}</Text>
    </View>
  </Animated.View>
);

const InfoCard = ({ icon, title, value, color }: any) => (
  <Animated.View entering={ZoomIn.duration(500)} style={styles.infoCard}>
    <View style={[styles.infoCardIconContainer, { backgroundColor: `${color}15` }]}>
      <MaterialCommunityIcons name={icon} size={20} color={color} />
    </View>
    <View style={styles.infoCardContent}>
      <Text style={styles.infoCardTitle}>{title}</Text>
      <Text style={styles.infoCardValue}>{value}</Text>
    </View>
  </Animated.View>
);

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
  errorContainer: {
    backgroundColor: "#FEF2F2",
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#FECACA",
  },
  errorText: {
    flex: 1,
    marginLeft: 12,
    color: "#991B1B",
    fontSize: 14,
    fontWeight: "500",
  },
  retryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: "#EF4444",
    borderRadius: 8,
  },
  retryButtonText: {
    color: "white",
    fontWeight: "600",
    fontSize: 12,
  },
  liveDataContainer: {
    borderRadius: 20,
    marginBottom: 20,
    shadowColor: "#059669",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    overflow: "hidden",
  },
  liveDataGradient: {
    padding: 20,
  },
  liveDataHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
    flexWrap: "wrap",
  },
  liveDataIconWrapper: {
    backgroundColor: "rgba(16, 185, 129, 0.2)",
    padding: 8,
    borderRadius: 12,
    marginRight: 12,
  },
  liveDataTitle: {
    fontSize: 18,
    fontWeight: "800",
    color: "#064E3B",
    flex: 1,
  },
  lastUpdatedBadge: {
    backgroundColor: "rgba(100, 116, 139, 0.1)",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  lastUpdated: {
    fontSize: 11,
    color: "#475569",
    fontWeight: "600",
  },
  liveDataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    justifyContent: "space-between",
  },
  liveDataItem: {
    flex: 1,
    minWidth: (width - 76) / 3,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
    borderRadius: 16,
    padding: 14,
    alignItems: "center",
    borderWidth: 1,
  },
  tempItem: {
    borderColor: "rgba(239, 68, 68, 0.2)",
    backgroundColor: "rgba(254, 242, 242, 0.8)",
  },
  turbidityItem: {
    borderColor: "rgba(59, 130, 246, 0.2)",
    backgroundColor: "rgba(239, 246, 255, 0.8)",
  },
  phItem: {
    borderColor: "rgba(139, 92, 246, 0.2)",
    backgroundColor: "rgba(245, 243, 255, 0.8)",
  },
  airTempItem: {
    borderColor: "rgba(245, 158, 11, 0.2)",
    backgroundColor: "rgba(255, 251, 235, 0.8)",
  },
  humidityItem: {
    borderColor: "rgba(16, 185, 129, 0.2)",
    backgroundColor: "rgba(236, 253, 245, 0.8)",
  },
  itemIcon: {
    marginBottom: 6,
  },
  liveDataLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "700",
    marginBottom: 4,
    textAlign: "center",
  },
  liveDataValue: {
    fontSize: 18,
    fontWeight: "800",
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
    fontSize: 20,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 12,
  },
  liveIndicator: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#D1FAE5",
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginLeft: 12,
  },
  liveIndicatorText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#065F46",
    marginLeft: 4,
  },
  infoGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 12,
  },
  infoCard: {
    flex: 1,
    backgroundColor: "white",
    borderRadius: 16,
    padding: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: "#F1F5F9",
  },
  infoCardIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 12,
  },
  infoCardContent: {
    flex: 1,
  },
  infoCardTitle: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginBottom: 4,
  },
  infoCardValue: {
    fontSize: 15,
    fontWeight: "700",
    color: "#1E293B",
  },
  regenerateButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 12,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
    marginTop: 16,
    alignSelf: "flex-start",
  },
  regenerateButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#475569",
    marginLeft: 8,
  },
  leftBorderContainer: {
    position: "relative",
    overflow: "hidden",
  },
  borderAccent: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: colors.primary,
    borderTopRightRadius: 2,
    borderBottomRightRadius: 2,
  },
  sensorContainer: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    paddingLeft: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  inputFieldContainer: {
    marginBottom: 20,
  },
  inputHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  inputIconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    backgroundColor: "#F0F9FF",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
  },
  inputLabelContainer: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "700",
    color: "#1E293B",
    marginBottom: 2,
  },
  optimalRange: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "500",
  },
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 12,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: "700",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  input: {
    flex: 1,
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    paddingVertical: 16,
  },
  placeholderInput: {
    color: "#94A3B8",
    fontWeight: "500",
  },
  unitText: {
    fontSize: 16,
    fontWeight: "700",
    color: "#64748B",
    marginLeft: 8,
    minWidth: 40,
  },
  assessmentCard: {
    marginTop: 24,
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    paddingLeft: 24,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 6,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  assessmentHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  assessmentTitle: {
    fontSize: 18,
    fontWeight: "700",
    color: "#1E293B",
    marginLeft: 12,
  },
  assessmentGrid: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 6,
    width: 320
  },
  assessmentItem: {
    flex: 1,
    alignItems: "center",
    padding: 12,
    backgroundColor: "#F8FAFC",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  assessmentLabel: {
    fontSize: 12,
    color: "#64748B",
    fontWeight: "600",
    marginTop: 8,
    marginBottom: 4,
  },
  assessmentRange: {
    fontSize: 11,
    color: "#94A3B8",
    fontWeight: "500",
    marginBottom: 4,
  },
  assessmentValue: {
    fontSize: 14,
    fontWeight: "800",
  },
  actionSection: {
    marginTop: 8,
  },
  submitButton: {
    borderRadius: 16,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    marginBottom: 16,
  },
  submitButtonDisabled: {
    opacity: 0.7,
  },
  submitButtonGradient: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    borderRadius: 16,
  },
  submitButtonText: {
    color: "white",
    fontSize: 18,
    fontWeight: "700",
    marginLeft: 12,
  },
  secondaryButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    padding: 16,
    backgroundColor: "white",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E2E8F0",
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#475569",
    marginLeft: 8,
  },
});

export default LiveSensorScreen;