import React, { useEffect, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    KeyboardAvoidingView,
    Modal,
    Platform,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../../../shared/styles/colors';

const ESP32_IP = 'http://192.168.122.34';

interface StorageLocation {
    name: string;
    type: string;
    description: string;
    recommended: boolean;
    note?: string;
    advantages?: string[];
}

interface StorageDetails {
    suitability: string;
    duration: string;
    tips: string;
    ammoniaLevel?: string;
    coagulation?: string;
    locations?: StorageLocation[];
}

interface Prediction {
    type: string;
    confidence: string;
    recommendation: string;
    icon: string;
    details: StorageDetails;
    humidity: number;
    airTemperature: number;
    recommendedLocations?: StorageLocation[];
}

interface LiveSensorData {
    humidity: number;
    airTemperature: number;
}

export default function StorageSelectionScreen() {
    const navigation = useNavigation<any>();
    const [humidity, setHumidity] = useState('');
    const [airTemperature, setAirTemperature] = useState('');
    const [prediction, setPrediction] = useState<Prediction | null>(null);
    const [storageType, setStorageType] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [successMessage, setSuccessMessage] = useState('');

    const [liveData, setLiveData] = useState<LiveSensorData | null>(null);
    const [liveDataLoading, setLiveDataLoading] = useState(true);
    const [connectionError, setConnectionError] = useState(false);
    const [lastUpdated, setLastUpdated] = useState('');

    const failCount = useRef(0);
    const fadeAnim = useRef(new Animated.Value(0)).current;

    const showSuccessPopup = (message: string) => {
        setSuccessMessage(message);
        setShowSuccessModal(true);
    };

    const fetchLiveData = async () => {
        try {
            setLiveDataLoading(true);
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 10000);

            const response = await fetch(`${ESP32_IP}/data`, {
                signal: controller.signal
            });

            clearTimeout(timeoutId);

            if (!response.ok) {
                throw new Error(`HTTP error: ${response.status}`);
            }

            const data = await response.json();
            const nextData: LiveSensorData = {
                humidity: Number(data.hum ?? 0),
                airTemperature: Number(data.airtemp ?? 0)
            };

            failCount.current = 0;
            setLiveData(nextData);
            setConnectionError(false);
            setLastUpdated(new Date().toLocaleTimeString());
            setHumidity(nextData.humidity.toString());
            setAirTemperature(nextData.airTemperature.toString());
        } catch (error: any) {
            if (error?.name === 'AbortError') {
                console.warn('Live data request timed out.');
            } else {
                console.error('Failed to fetch live data:', error);
            }

            failCount.current += 1;
            if (failCount.current >= 3) {
                setConnectionError(true);
            }
        } finally {
            setLiveDataLoading(false);
        }
    };

    useEffect(() => {
        fetchLiveData();
        const interval = setInterval(fetchLiveData, 5000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        if (!prediction) {
            fadeAnim.setValue(0);
            return;
        }

        Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 600,
            useNativeDriver: true
        }).start();
    }, [fadeAnim, prediction]);

    const validateInputs = () => {
        if (!humidity.trim() || !airTemperature.trim()) {
            Alert.alert('Missing Information', 'Please enter humidity and air temperature values.');
            return false;
        }

        const hum = parseFloat(humidity);
        const airTemp = parseFloat(airTemperature);

        if (Number.isNaN(hum) || Number.isNaN(airTemp)) {
            Alert.alert('Invalid Input', 'Please enter valid numeric values.');
            return false;
        }

        if (hum < 0 || hum > 100) {
            Alert.alert('Invalid Humidity', 'Humidity must be between 0% and 100%.');
            return false;
        }

        if (airTemp < -10 || airTemp > 50) {
            Alert.alert('Invalid Air Temperature', 'Air temperature must be between -10°C and 50°C.');
            return false;
        }

        return true;
    };

    const getRecommendedLocations = (hum: number, airTemp: number): StorageLocation[] => {
        const locations: StorageLocation[] = [];

        if (airTemp < 0) {
            locations.push({
                name: 'Emergency Freezer Storage',
                type: 'Critical Storage',
                description: 'Below-freezing air temperature. Use only as an emergency holding option.',
                recommended: false,
                advantages: [
                    'Emergency backup option',
                    'Slows bacterial growth',
                    'Temporary preservation support'
                ],
                note: 'Risk of freezing damage. Test viscosity before processing.'
            });
        }

        if (airTemp >= 0 && airTemp < 5) {
            locations.push({
                name: 'Industrial Cold Room',
                type: 'Cold Storage',
                description: 'Refrigerated facility for short-term latex preservation.',
                recommended: false,
                advantages: [
                    'Reduces ammonia evaporation',
                    'Slows bacterial activity',
                    'Useful for concentrate storage'
                ],
                note: 'Monitor for cold thickening and warm gradually before use.'
            });
        }

        if (airTemp >= 5 && airTemp < 10) {
            locations.push({
                name: 'Chilled Latex Warehouse',
                type: 'Cold Storage',
                description: 'Controlled low-temperature environment for extended preservation.',
                recommended: airTemp >= 7 && airTemp <= 9,
                advantages: [
                    'Longer storage duration',
                    'Low coagulation risk',
                    'Energy-efficient cooling'
                ],
                note: 'Keep the temperature stable and avoid sudden fluctuations.'
            });
        }

        if (airTemp >= 10 && airTemp < 15) {
            locations.push({
                name: 'Traditional Latex Cellar',
                type: 'Cool Storage',
                description: 'Naturally cool storage area such as a cellar or basement.',
                recommended: airTemp >= 12 && airTemp <= 14,
                advantages: [
                    'Naturally stable temperature',
                    'Low energy cost',
                    'Suitable for field latex'
                ],
                note: 'Ensure good ventilation and keep humidity under control.'
            });
        }

        if (airTemp >= 15 && airTemp < 20) {
            locations.push({
                name: 'Premium Climate-Controlled Warehouse',
                type: 'Optimal Storage',
                description: 'Well-regulated storage with precise temperature control.',
                recommended: true,
                advantages: [
                    'Ideal for long-term storage',
                    'Automated monitoring systems',
                    'Backup power support'
                ],
                note: 'Regular calibration of sensors is recommended.'
            });
        }

        if (airTemp >= 20 && airTemp <= 25) {
            locations.push({
                name: 'Standard Processing Facility Storage',
                type: 'Indoor Storage',
                description: 'Covered storage inside a processing facility.',
                recommended: airTemp >= 21 && airTemp <= 24,
                advantages: [
                    'Convenient for processing',
                    'Easy handling access',
                    'Basic climate control'
                ],
                note: 'Watch for temperature spikes in the afternoon.'
            });
        }

        if (airTemp >= 18 && airTemp <= 22 && hum >= 60 && hum <= 70) {
            locations.push({
                name: 'Premium Latex Storage Vault',
                type: 'Elite Storage',
                description: 'High-end insulated facility with advanced environmental control.',
                recommended: true,
                advantages: [
                    'Precision control',
                    'Humidity stabilization',
                    '24/7 monitoring'
                ],
                note: 'Best option for premium-quality latex preservation.'
            });
        }

        if (airTemp >= 25 && airTemp < 28) {
            locations.push({
                name: 'Tropical Climate Warehouse',
                type: 'Warm Storage',
                description: 'Ventilated warehouse designed for warm tropical conditions.',
                recommended: airTemp <= 27 && hum <= 75,
                advantages: [
                    'High-volume ventilation',
                    'Shaded loading areas',
                    'Natural air circulation'
                ],
                note: 'Increase preservation chemicals and avoid afternoon loading.'
            });
        }

        if (airTemp >= 28 && airTemp <= 30) {
            locations.push({
                name: 'High-Ceiling Ventilated Shed',
                type: 'Warm Storage',
                description: 'Open structure with forced ventilation for short-term holding.',
                recommended: false,
                advantages: [
                    'Good airflow',
                    'Fast access',
                    'Cost-effective setup'
                ],
                note: 'Limit storage duration and use stronger preservation controls.'
            });
        }

        if (airTemp > 35) {
            locations.push({
                name: 'Extreme Temperature Alert Zone',
                type: 'Emergency Only',
                description: 'Critical heat condition that is unsafe for normal storage.',
                recommended: false,
                advantages: [
                    'Temporary emergency holding',
                    'Rapid cooling response',
                    'Immediate transfer support'
                ],
                note: 'Do not store latex here for long. Process or cool immediately.'
            });
        }

        if (hum < 40) {
            locations.push({
                name: 'Humidity-Controlled Dry Chamber',
                type: 'Specialized Storage',
                description: 'Sealed environment with humidification support.',
                recommended: false,
                advantages: [
                    'Prevents surface skinning',
                    'Protects seals',
                    'Supports controlled moisture balance'
                ],
                note: 'Use humidifiers and sealed containers when possible.'
            });
        }

        if (hum >= 50 && hum < 60) {
            locations.push({
                name: 'Standard Humidity Warehouse',
                type: 'General Storage',
                description: 'Balanced conditions with basic humidity management.',
                recommended: hum >= 55,
                advantages: [
                    'Suitable for most latex grades',
                    'Stable general-purpose environment',
                    'Standard preservation works well'
                ],
                note: 'Routine monitoring is usually sufficient.'
            });
        }

        if (hum >= 60 && hum <= 70) {
            locations.push({
                name: 'Optimal Humidity Storage Chamber',
                type: 'Premium Humidity Control',
                description: 'Ideal humidity range for preserving natural rubber latex.',
                recommended: true,
                advantages: [
                    'Minimal evaporation',
                    'Strong quality retention',
                    'Excellent preservation conditions'
                ],
                note: 'Maintain this humidity range for the best long-term results.'
            });
        }

        if (hum > 70 && hum <= 80) {
            locations.push({
                name: 'High Humidity Storage Zone',
                type: 'Moisture-Controlled Storage',
                description: 'Storage area with enhanced antifungal precautions.',
                recommended: hum <= 75 && airTemp <= 25,
                advantages: [
                    'Good for concentrated latex',
                    'Reduces surface drying',
                    'Works well with cool storage'
                ],
                note: 'Increase antifungal protection and inspect regularly.'
            });
        }

        if (hum > 80 && hum <= 90) {
            locations.push({
                name: 'High-Moisture Storage Facility',
                type: 'Special Handling Required',
                description: 'Controlled space with dehumidification backup.',
                recommended: false,
                advantages: [
                    'Emergency storage support',
                    'Dehumidifier-equipped setup',
                    'Antifungal readiness'
                ],
                note: 'Limit storage duration and strengthen microbial controls.'
            });
        }

        if (hum > 90) {
            locations.push({
                name: 'Extreme Humidity Containment Zone',
                type: 'Crisis Management',
                description: 'Very high moisture environment requiring immediate action.',
                recommended: false,
                advantages: [
                    'Emergency containment only',
                    'Rapid response protocols',
                    'Quick transfer capability'
                ],
                note: 'Do not use for standard storage. Rapid spoilage risk is very high.'
            });
        }

        if (airTemp >= 18 && airTemp <= 22 && hum >= 60 && hum <= 70) {
            locations.push({
                name: 'Perfect Storage Conditions Chamber',
                type: 'Reference Standard Storage',
                description: 'Near-ideal conditions for high-quality latex preservation.',
                recommended: true,
                advantages: [
                    'Longest storage life',
                    'Very low coagulation risk',
                    'Minimal preservation adjustment needed'
                ],
                note: 'Represents an excellent benchmark condition for premium latex.'
            });
        }

        if (airTemp > 28 && hum > 80) {
            locations.push({
                name: 'Tropical Storm Storage Protocol Area',
                type: 'Emergency Response Storage',
                description: 'Hot and humid environment requiring urgent intervention.',
                recommended: false,
                advantages: [
                    'Rapid cooling support',
                    'Emergency chemical dosing',
                    'Quick transfer workflow'
                ],
                note: 'Immediate action required due to very high coagulation risk.'
            });
        }

        if (airTemp >= 15 && airTemp <= 30) {
            locations.push({
                name: 'Mobile Storage Tank Farm',
                type: 'Transport Storage',
                description: 'Modular tanks for temporary storage and transfer.',
                recommended: airTemp <= 25 && hum <= 75,
                advantages: [
                    'Flexible deployment',
                    'Fast setup',
                    'Scalable capacity'
                ],
                note: 'Insulate during transport and monitor environmental changes.'
            });
        }

        if (airTemp >= 16 && airTemp <= 20 && hum >= 65 && hum <= 75) {
            locations.push({
                name: 'Natural Cave Storage System',
                type: 'Geological Storage',
                description: 'Natural underground storage with stable environmental conditions.',
                recommended: true,
                advantages: [
                    'Naturally stable temperature',
                    'Low energy cost',
                    'Protected from external heat changes'
                ],
                note: 'Check access, ventilation, and structural stability before use.'
            });
        }

        const uniqueLocations = locations.filter((location, index, self) => {
            return index === self.findIndex((item) => item.name === location.name);
        });

        return uniqueLocations.sort((a, b) => {
            if (a.recommended && !b.recommended) return -1;
            if (!a.recommended && b.recommended) return 1;
            return a.name.localeCompare(b.name);
        });
    };

    const predictStorage = () => {
        if (!validateInputs()) return;

        setIsLoading(true);

        setTimeout(() => {
            const hum = parseFloat(humidity);
            const airTemp = parseFloat(airTemperature);
            const recommendedLocations = getRecommendedLocations(hum, airTemp);

            let type = '';
            let confidence = '';
            let recommendation = '';
            let icon = '';
            let details: StorageDetails = {
                suitability: '',
                duration: '',
                tips: '',
                ammoniaLevel: '',
                coagulation: '',
                locations: recommendedLocations
            };

            if (airTemp >= 15 && airTemp <= 25 && hum >= 60 && hum <= 75) {
                type = 'Optimal Latex Storage';
                confidence = 'High';
                icon = 'check-circle';
                recommendation = 'Ideal air temperature and humidity for preserving natural rubber latex.';
                details = {
                    suitability: 'Natural rubber latex, field-grade latex, and concentrated latex.',
                    duration: '3-6 months with proper preservation.',
                    tips: `Maintain ammonia at 0.6% - 0.7%. Current air temperature: ${airTemp}°C and humidity: ${hum}%.`,
                    ammoniaLevel: '0.6% - 0.7% recommended',
                    coagulation: 'Low coagulation risk',
                    locations: recommendedLocations
                };
            } else if (airTemp >= 10 && airTemp < 15 && hum >= 65 && hum <= 80) {
                type = 'Cool Air Storage';
                confidence = 'High';
                icon = 'thermometer-chevron-down';
                recommendation = 'Cool air conditions are suitable for shorter storage cycles.';
                details = {
                    suitability: 'Preserved latex concentrate and field latex.',
                    duration: '2-4 months.',
                    tips: `Monitor viscosity and warm gently before use if required. Current air temperature: ${airTemp}°C and humidity: ${hum}%.`,
                    ammoniaLevel: '0.7% - 0.8% recommended',
                    coagulation: 'Minimal coagulation risk',
                    locations: recommendedLocations
                };
            } else if (airTemp >= 25 && airTemp <= 30 && hum >= 55 && hum <= 70) {
                type = 'Warm Air Storage';
                confidence = 'Medium';
                icon = 'weather-sunny';
                recommendation = 'Warmer storage is possible, but it needs stronger preservation control.';
                details = {
                    suitability: 'Stabilized latex with enhanced preservation.',
                    duration: '1-2 months.',
                    tips: `Increase ammonia and keep latex shaded from direct sunlight. Current air temperature: ${airTemp}°C and humidity: ${hum}%.`,
                    ammoniaLevel: '0.8% - 0.9% recommended',
                    coagulation: 'Moderate coagulation risk',
                    locations: recommendedLocations
                };
            } else if (airTemp >= 2 && airTemp < 10 && hum >= 70 && hum <= 85) {
                type = 'Cold Air Storage';
                confidence = 'Medium';
                icon = 'snowflake';
                recommendation = 'Cold air is suitable for longer preservation when freezing is avoided.';
                details = {
                    suitability: 'Long-term latex concentrate storage.',
                    duration: '6-8 months.',
                    tips: `Prevent freezing and warm gradually before use. Current air temperature: ${airTemp}°C and humidity: ${hum}%.`,
                    ammoniaLevel: '0.5% - 0.6% recommended',
                    coagulation: 'Low risk, but watch for thickening',
                    locations: recommendedLocations
                };
            } else if (airTemp > 30 && airTemp <= 35 && hum >= 40 && hum <= 60) {
                type = 'High Air Temperature Storage';
                confidence = 'Low';
                icon = 'alert';
                recommendation = 'Elevated air temperatures accelerate latex degradation.';
                details = {
                    suitability: 'Emergency or short-term storage only.',
                    duration: 'Less than 2 weeks.',
                    tips: `Use maximum preservation, run frequent quality checks, and add cooling if possible. Current air temperature: ${airTemp}°C and humidity: ${hum}%.`,
                    ammoniaLevel: '0.9% - 1.0% required',
                    coagulation: 'High coagulation risk',
                    locations: recommendedLocations
                };
            } else if (hum < 40 || hum > 90) {
                type = 'Humidity Warning';
                confidence = 'Low';
                icon = 'water-alert';
                recommendation = 'Extreme humidity levels make latex stability more difficult.';
                details = {
                    suitability: 'Not recommended for standard storage.',
                    duration: 'Temporary only.',
                    tips: hum < 40
                        ? `Increase humidity or use sealed containers to prevent skinning. Current air temperature: ${airTemp}°C and humidity: ${hum}%.`
                        : `Increase ammonia and antifungal support to control bacterial growth. Current air temperature: ${airTemp}°C and humidity: ${hum}%.`,
                    ammoniaLevel: hum < 40 ? '0.6% minimum' : '0.8% - 1.0% recommended',
                    coagulation: hum < 40 ? 'Surface coagulation risk' : 'Bacterial coagulation risk',
                    locations: recommendedLocations
                };
            } else {
                type = 'Out of Standard Storage Conditions';
                confidence = 'Low';
                icon = 'alert-circle';
                recommendation = 'Conditions are outside the preferred range for reliable latex storage.';
                details = {
                    suitability: 'Consult a latex handling specialist.',
                    duration: 'Not recommended for long-term storage.',
                    tips: `Consider immediate processing or stronger preservation control. Current air temperature: ${airTemp}°C and humidity: ${hum}%.`,
                    ammoniaLevel: 'Consult preservation guidelines',
                    coagulation: 'High risk - monitor closely',
                    locations: recommendedLocations
                };
            }

            setStorageType(type);
            setPrediction({
                type,
                confidence,
                recommendation,
                icon,
                details,
                humidity: hum,
                airTemperature: airTemp,
                recommendedLocations
            });
            setIsLoading(false);
            showSuccessPopup(`Storage Recommendation: ${recommendation}`);
        }, 1000);
    };

    const getConfidenceColor = (confidence: string) => {
        switch (confidence) {
            case 'High':
                return '#10B981';
            case 'Medium':
                return '#F59E0B';
            case 'Low':
                return '#EF4444';
            default:
                return '#6B7280';
        }
    };

    const getStorageIcon = (type: string | null) => {
        if (!type) return 'barrel';
        if (type.includes('Optimal')) return 'check-decagram';
        if (type.includes('Cool')) return 'thermometer-chevron-down';
        if (type.includes('Warm')) return 'weather-sunny';
        if (type.includes('Cold')) return 'snowflake';
        if (type.includes('High Air Temperature')) return 'thermometer-alert';
        if (type.includes('Humidity')) return 'water-alert';
        if (type.includes('Out of Standard')) return 'alert-circle';
        return 'barrel';
    };

    const getLocationIcon = (locationName: string) => {
        if (locationName.includes('Vault')) return 'crown';
        if (locationName.includes('Climate')) return 'air-conditioner';
        if (locationName.includes('Cold') || locationName.includes('Freezer')) return 'fridge-industrial';
        if (locationName.includes('Cellar') || locationName.includes('Cave')) return 'warehouse';
        if (locationName.includes('Tropical')) return 'palm-tree';
        if (locationName.includes('Ventilated')) return 'fan';
        if (locationName.includes('Humidity')) return 'water-circle';
        if (locationName.includes('Tank')) return 'truck-cargo-container';
        if (locationName.includes('Alert')) return 'alert-octagon';
        return 'warehouse';
    };

    const clearInputs = () => {
        setHumidity('');
        setAirTemperature('');
        setPrediction(null);
        setStorageType(null);
        setShowSuccessModal(false);
        setSuccessMessage('');
    };

    const recommendedLocationName =
        prediction?.recommendedLocations?.find((location) => location.recommended)?.name ||
        storageType ||
        'Latex Storage';

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={100}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <MaterialCommunityIcons name="arrow-left" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Rubber Latex Storage</Text>
                {prediction ? (
                    <TouchableOpacity onPress={clearInputs} style={styles.clearButton}>
                        <MaterialCommunityIcons name="refresh" size={24} color="#FFF" />
                    </TouchableOpacity>
                ) : (
                    <View style={styles.headerSpacer} />
                )}
            </View>

            <ScrollView
                style={styles.scrollView}
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.content}>
                    {liveData && !connectionError && (
                        <View style={styles.liveDataContainer}>
                            <View style={styles.liveDataHeader}>
                                <View style={styles.liveDataTitleContainer}>
                                    <MaterialCommunityIcons name="access-point" size={20} color="#10B981" />
                                    <Text style={styles.liveDataTitle}>Live Sensor Readings</Text>
                                </View>
                                <Text style={styles.lastUpdated}>
                                    {liveDataLoading ? 'Syncing...' : `Updated: ${lastUpdated}`}
                                </Text>
                            </View>

                            <View style={styles.liveDataGrid}>
                                <View style={styles.liveDataItem}>
                                    <MaterialCommunityIcons name="water-percent" size={24} color={colors.primary} />
                                    <Text style={styles.liveDataLabel}>Humidity</Text>
                                    <Text style={styles.liveDataValue}>{liveData.humidity.toFixed(0)}%</Text>
                                </View>

                                <View style={styles.liveDataItem}>
                                    <MaterialCommunityIcons name="weather-sunny" size={24} color={colors.primary} />
                                    <Text style={styles.liveDataLabel}>Air Temp</Text>
                                    <Text style={styles.liveDataValue}>{liveData.airTemperature.toFixed(1)}°C</Text>
                                </View>
                            </View>
                        </View>
                    )}

                    {connectionError && (
                        <View style={styles.errorContainer}>
                            <MaterialCommunityIcons name="wifi-off" size={24} color="#EF4444" />
                            <Text style={styles.errorText}>
                                Unable to connect to the ESP32. Please verify the device and network.
                            </Text>
                            <TouchableOpacity style={styles.retryButton} onPress={fetchLiveData}>
                                <Text style={styles.retryButtonText}>Retry</Text>
                            </TouchableOpacity>
                        </View>
                    )}

                    <View style={styles.iconContainer}>
                        <View style={styles.iconBackground}>
                            <MaterialCommunityIcons
                                name={getStorageIcon(storageType) as any}
                                size={80}
                                color={colors.primary}
                            />
                        </View>
                    </View>

                    <Text style={styles.sectionTitle}>Storage Conditions</Text>
                    <Text style={styles.sectionSubtitle}>
                        Live humidity and air temperature measurements are applied automatically
                    </Text>

                    <View style={styles.inputWrapper}>
                        <View style={styles.inputContainer}>
                            <View style={styles.inputIconContainer}>
                                <MaterialCommunityIcons name="water-percent" size={24} color={colors.primary} />
                            </View>
                            <TextInput
                                style={[styles.input, styles.readOnlyInput]}
                                placeholder="Humidity (%)"
                                value={humidity}
                                keyboardType="numeric"
                                placeholderTextColor="#9CA3AF"
                                maxLength={5}
                                editable={false}
                                selectTextOnFocus={false}
                            />
                        </View>

                        <View style={styles.inputContainer}>
                            <View style={styles.inputIconContainer}>
                                <MaterialCommunityIcons name="weather-sunny" size={24} color={colors.primary} />
                            </View>
                            <TextInput
                                style={[styles.input, styles.readOnlyInput]}
                                placeholder="Air Temperature (°C)"
                                value={airTemperature}
                                keyboardType="numeric"
                                placeholderTextColor="#9CA3AF"
                                maxLength={6}
                                editable={false}
                                selectTextOnFocus={false}
                            />
                        </View>
                    </View>

                    <TouchableOpacity
                        style={[styles.predictButton, isLoading && styles.predictButtonDisabled]}
                        onPress={predictStorage}
                        disabled={isLoading}
                    >
                        {isLoading ? (
                            <View style={styles.loadingContainer}>
                                <MaterialCommunityIcons name="loading" size={20} color="#FFF" />
                                <Text style={styles.predictButtonText}> Analyzing...</Text>
                            </View>
                        ) : (
                            <View style={styles.buttonContent}>
                                <MaterialCommunityIcons name="flash" size={20} color="#FFF" />
                                <Text style={styles.predictButtonText}> Analyze Latex Storage</Text>
                            </View>
                        )}
                    </TouchableOpacity>

                    {prediction && (
                        <Animated.View style={[styles.predictionContainer, { opacity: fadeAnim }]}>
                            <View style={styles.predictionHeader}>
                                <MaterialCommunityIcons
                                    name={(prediction.icon || 'check-circle') as any}
                                    size={32}
                                    color={colors.primary}
                                />
                                <Text style={styles.predictionTitle}>Storage Analysis</Text>
                            </View>

                            <View style={styles.predictionCard}>
                                <View style={styles.resultBadge}>
                                    <Text style={styles.resultBadgeText}>{prediction.type}</Text>
                                </View>

                                <View style={styles.statsContainer}>
                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>Confidence</Text>
                                        <Text
                                            style={[
                                                styles.statValue,
                                                { color: getConfidenceColor(prediction.confidence) }
                                            ]}
                                        >
                                            {prediction.confidence}
                                        </Text>
                                    </View>

                                    <View style={styles.statDivider} />

                                    <View style={styles.statItem}>
                                        <Text style={styles.statLabel}>Conditions</Text>
                                        <Text style={styles.statValue}>
                                            {prediction.humidity}% / {prediction.airTemperature}°C
                                        </Text>
                                    </View>
                                </View>

                                <View style={styles.airTempContainer}>
                                    <MaterialCommunityIcons name="weather-sunny" size={18} color={colors.primary} />
                                    <Text style={styles.airTempText}>
                                        Air Temperature: {prediction.airTemperature}°C | Humidity: {prediction.humidity}%
                                    </Text>
                                </View>

                                <View style={styles.detailsSection}>
                                    <Text style={styles.detailsTitle}>Latex Storage Details</Text>
                                    <Text style={styles.detailsText}>{prediction.details.suitability}</Text>

                                    <View style={styles.detailsGrid}>
                                        <View style={styles.detailItem}>
                                            <MaterialCommunityIcons name="clock-outline" size={20} color={colors.primary} />
                                            <View style={styles.detailTextContainer}>
                                                <Text style={styles.detailLabel}>Storage Duration</Text>
                                                <Text style={styles.detailValue}>{prediction.details.duration}</Text>
                                            </View>
                                        </View>

                                        {prediction.details.ammoniaLevel ? (
                                            <View style={styles.detailItem}>
                                                <MaterialCommunityIcons name="flask" size={20} color={colors.primary} />
                                                <View style={styles.detailTextContainer}>
                                                    <Text style={styles.detailLabel}>Ammonia Level</Text>
                                                    <Text style={styles.detailValue}>{prediction.details.ammoniaLevel}</Text>
                                                </View>
                                            </View>
                                        ) : null}

                                        {prediction.details.coagulation ? (
                                            <View style={styles.detailItem}>
                                                <MaterialCommunityIcons name="test-tube" size={20} color={colors.primary} />
                                                <View style={styles.detailTextContainer}>
                                                    <Text style={styles.detailLabel}>Coagulation Risk</Text>
                                                    <Text style={styles.detailValue}>{prediction.details.coagulation}</Text>
                                                </View>
                                            </View>
                                        ) : null}

                                        <View style={styles.detailItem}>
                                            <MaterialCommunityIcons
                                                name="lightbulb-outline"
                                                size={20}
                                                color={colors.primary}
                                            />
                                            <View style={styles.detailTextContainer}>
                                                <Text style={styles.detailLabel}>Storage Tips</Text>
                                                <Text style={styles.detailValue}>{prediction.details.tips}</Text>
                                            </View>
                                        </View>
                                    </View>
                                </View>

                                {prediction.recommendedLocations?.length ? (
                                    <View style={styles.locationsSection}>
                                        <Text style={styles.locationsTitle}>Recommended Storage Locations</Text>

                                        {prediction.recommendedLocations.map((location, index) => (
                                            <View
                                                key={`${location.name}-${index}`}
                                                style={[
                                                    styles.locationCard,
                                                    location.recommended && styles.recommendedLocationCard
                                                ]}
                                            >
                                                <View style={styles.locationHeader}>
                                                    <MaterialCommunityIcons
                                                        name={getLocationIcon(location.name) as any}
                                                        size={24}
                                                        color={location.recommended ? colors.primary : '#6B7280'}
                                                    />
                                                    <View style={styles.locationTitleContainer}>
                                                        <Text style={styles.locationName}>{location.name}</Text>
                                                        <View
                                                            style={[
                                                                styles.locationTypeBadge,
                                                                location.recommended && styles.recommendedBadge
                                                            ]}
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.locationTypeText,
                                                                    location.recommended && styles.recommendedBadgeText
                                                                ]}
                                                            >
                                                                {location.type}
                                                            </Text>
                                                        </View>
                                                    </View>
                                                    {location.recommended ? (
                                                        <MaterialCommunityIcons name="star" size={20} color="#F59E0B" />
                                                    ) : null}
                                                </View>

                                                <Text style={styles.locationDescription}>{location.description}</Text>

                                                {location.advantages?.length ? (
                                                    <View style={styles.advantagesContainer}>
                                                        <Text style={styles.advantagesTitle}>Advantages:</Text>
                                                        {location.advantages.map((advantage, idx) => (
                                                            <View key={`${location.name}-adv-${idx}`} style={styles.advantageItem}>
                                                                <MaterialCommunityIcons
                                                                    name="check-circle"
                                                                    size={16}
                                                                    color="#10B981"
                                                                />
                                                                <Text style={styles.advantageText}>{advantage}</Text>
                                                            </View>
                                                        ))}
                                                    </View>
                                                ) : null}

                                                {location.note ? (
                                                    <View style={styles.noteContainer}>
                                                        <MaterialCommunityIcons
                                                            name="alert-circle"
                                                            size={16}
                                                            color="#F59E0B"
                                                        />
                                                        <Text style={styles.noteText}>{location.note}</Text>
                                                    </View>
                                                ) : null}
                                            </View>
                                        ))}
                                    </View>
                                ) : null}

                                <View style={styles.recommendationContainer}>
                                    <MaterialCommunityIcons name="information" size={20} color={colors.primary} />
                                    <Text style={styles.recommendationText}>{prediction.recommendation}</Text>
                                </View>
                            </View>
                        </Animated.View>
                    )}
                </View>
            </ScrollView>

            <Modal
                visible={showSuccessModal}
                transparent
                animationType="fade"
                onRequestClose={() => setShowSuccessModal(false)}
            >
                <View style={styles.successModalOverlay}>
                    <View style={styles.successModalCard}>
                        <LinearGradient
                            colors={['#22C55E', '#14B8A6', '#0EA5E9']}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.successModalHeader}
                        >
                            <View style={styles.successIconBadge}>
                                <MaterialCommunityIcons name="check-decagram" size={44} color="#FFFFFF" />
                            </View>
                            <Text style={styles.successModalEyebrow}>Storage Ready</Text>
                            <Text style={styles.successModalTitle}>Analysis Complete</Text>
                        </LinearGradient>

                        <View style={styles.successModalBody}>
                            <Text style={styles.successModalMessage}>{successMessage}</Text>

                            <View style={styles.successResultPill}>
                                <MaterialCommunityIcons name="barrel" size={18} color={colors.primary} />
                                <Text style={styles.successResultPillText}>{recommendedLocationName}</Text>
                            </View>

                            <TouchableOpacity
                                style={styles.successButtonWrap}
                                onPress={() => setShowSuccessModal(false)}
                                activeOpacity={0.85}
                            >
                                <LinearGradient
                                    colors={[colors.primary, '#0F766E']}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                    style={styles.successButton}
                                >
                                    <Text style={styles.successButtonText}>Done</Text>
                                    <MaterialCommunityIcons name="arrow-right" size={18} color="#FFFFFF" />
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>
                    </View>
                </View>
            </Modal>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F3F4F6'
    },
    header: {
        height: 100,
        backgroundColor: colors.primary,
        paddingTop: 40,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 5
    },
    backButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)'
    },
    clearButton: {
        padding: 8,
        borderRadius: 20,
        backgroundColor: 'rgba(255,255,255,0.2)'
    },
    headerSpacer: {
        width: 40
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#FFF',
        letterSpacing: 0.5,
        textAlign: 'center',
        flex: 1
    },
    scrollView: {
        flex: 1
    },
    scrollContent: {
        flexGrow: 1
    },
    content: {
        flex: 1,
        padding: 24,
        alignItems: 'center'
    },
    liveDataContainer: {
        backgroundColor: '#FFF',
        borderRadius: 16,
        padding: 16,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 8,
        elevation: 3,
        width: '100%'
    },
    liveDataHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: 16,
        flexWrap: 'wrap'
    },
    liveDataTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center'
    },
    liveDataTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: '#1E293B',
        marginLeft: 8
    },
    lastUpdated: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '500'
    },
    liveDataGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 16
    },
    liveDataItem: {
        flex: 1,
        backgroundColor: '#F8FAFC',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#E2E8F0',
        marginHorizontal: 4
    },
    liveDataLabel: {
        fontSize: 12,
        color: '#64748B',
        fontWeight: '600',
        marginTop: 6,
        marginBottom: 4
    },
    liveDataValue: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1E293B'
    },
    errorContainer: {
        backgroundColor: '#FEF2F2',
        borderRadius: 12,
        padding: 16,
        marginBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderWidth: 1,
        borderColor: '#FECACA',
        width: '100%'
    },
    errorText: {
        flex: 1,
        marginLeft: 12,
        color: '#991B1B',
        fontSize: 14,
        fontWeight: '500'
    },
    retryButton: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        backgroundColor: '#EF4444',
        borderRadius: 8
    },
    retryButtonText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 12
    },
    iconContainer: {
        marginTop: 20,
        marginBottom: 20
    },
    iconBackground: {
        width: 120,
        height: 120,
        borderRadius: 60,
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5
    },
    sectionTitle: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 8
    },
    sectionSubtitle: {
        fontSize: 14,
        color: '#6B7280',
        marginBottom: 24,
        textAlign: 'center'
    },
    inputWrapper: {
        width: '100%',
        marginBottom: 16
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#FFF',
        borderRadius: 16,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 4,
        elevation: 2,
        overflow: 'hidden'
    },
    inputIconContainer: {
        padding: 16,
        backgroundColor: '#F9FAFB',
        borderRightWidth: 1,
        borderRightColor: '#E5E7EB'
    },
    input: {
        flex: 1,
        paddingHorizontal: 16,
        fontSize: 16,
        color: '#1F2937',
        paddingVertical: 16
    },
    readOnlyInput: {
        color: '#475569'
    },
    predictButton: {
        backgroundColor: colors.primary,
        paddingVertical: 16,
        paddingHorizontal: 24,
        borderRadius: 16,
        marginTop: 8,
        width: '100%',
        alignItems: 'center',
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 8,
        elevation: 5
    },
    predictButtonDisabled: {
        opacity: 0.7
    },
    buttonContent: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    loadingContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center'
    },
    predictButtonText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: '600',
        letterSpacing: 0.5
    },
    predictionContainer: {
        marginTop: 32,
        width: '100%'
    },
    predictionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16
    },
    predictionTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#1F2937',
        marginLeft: 12
    },
    predictionCard: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 5
    },
    resultBadge: {
        backgroundColor: '#F3F4F6',
        paddingVertical: 12,
        paddingHorizontal: 16,
        borderRadius: 12,
        marginBottom: 20,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    resultBadgeText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: colors.primary,
        textAlign: 'center',
        letterSpacing: 0.5
    },
    statsContainer: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginBottom: 20,
        paddingVertical: 16,
        backgroundColor: '#F9FAFB',
        borderRadius: 16
    },
    statItem: {
        alignItems: 'center',
        flex: 1
    },
    statLabel: {
        fontSize: 12,
        color: '#6B7280',
        marginBottom: 4,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    statValue: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#1F2937',
        textAlign: 'center'
    },
    statDivider: {
        width: 1,
        backgroundColor: '#E5E7EB'
    },
    airTempContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F0F9FF',
        padding: 12,
        borderRadius: 12,
        marginBottom: 16,
        borderWidth: 1,
        borderColor: '#E0F2FE'
    },
    airTempText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#0369A1',
        marginLeft: 8,
        flex: 1
    },
    detailsSection: {
        marginBottom: 16
    },
    detailsTitle: {
        fontSize: 16,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 12
    },
    detailsText: {
        fontSize: 15,
        color: '#4B5563',
        marginBottom: 16,
        lineHeight: 22
    },
    detailsGrid: {
        marginBottom: 12
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'flex-start',
        marginBottom: 16
    },
    detailTextContainer: {
        flex: 1,
        marginLeft: 12
    },
    detailLabel: {
        fontSize: 13,
        color: '#6B7280',
        marginBottom: 2,
        textTransform: 'uppercase',
        letterSpacing: 0.5
    },
    detailValue: {
        fontSize: 15,
        color: '#1F2937',
        lineHeight: 20
    },
    locationsSection: {
        marginTop: 16,
        marginBottom: 16,
        borderTopWidth: 1,
        borderTopColor: '#E5E7EB',
        paddingTop: 16
    },
    locationsTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#1F2937',
        marginBottom: 16
    },
    locationCard: {
        backgroundColor: '#F9FAFB',
        borderRadius: 16,
        padding: 16,
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#E5E7EB'
    },
    recommendedLocationCard: {
        backgroundColor: '#F0F9FF',
        borderColor: colors.primary,
        borderWidth: 2
    },
    locationHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12
    },
    locationTitleContainer: {
        flex: 1,
        marginLeft: 12
    },
    locationName: {
        fontSize: 16,
        fontWeight: '600',
        color: '#1F2937',
        marginBottom: 4
    },
    locationTypeBadge: {
        backgroundColor: '#E5E7EB',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 12,
        alignSelf: 'flex-start'
    },
    recommendedBadge: {
        backgroundColor: colors.primary
    },
    locationTypeText: {
        fontSize: 11,
        color: '#4B5563',
        fontWeight: '500'
    },
    recommendedBadgeText: {
        color: '#FFF'
    },
    locationDescription: {
        fontSize: 14,
        color: '#4B5563',
        marginBottom: 12,
        lineHeight: 20
    },
    advantagesContainer: {
        marginTop: 8,
        marginBottom: 8
    },
    advantagesTitle: {
        fontSize: 14,
        fontWeight: '600',
        color: '#374151',
        marginBottom: 8
    },
    advantageItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 6
    },
    advantageText: {
        fontSize: 13,
        color: '#4B5563',
        marginLeft: 8,
        flex: 1
    },
    noteContainer: {
        flexDirection: 'row',
        backgroundColor: '#FEF3C7',
        padding: 10,
        borderRadius: 8,
        marginTop: 8,
        alignItems: 'center'
    },
    noteText: {
        flex: 1,
        marginLeft: 8,
        fontSize: 12,
        color: '#92400E'
    },
    recommendationContainer: {
        flexDirection: 'row',
        backgroundColor: '#FEF3C7',
        padding: 16,
        borderRadius: 12,
        borderLeftWidth: 4,
        borderLeftColor: '#F59E0B',
        marginTop: 8
    },
    recommendationText: {
        flex: 1,
        marginLeft: 12,
        fontSize: 14,
        color: '#92400E',
        lineHeight: 20
    },
    successModalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(15, 23, 42, 0.55)',
        justifyContent: 'center',
        alignItems: 'center',
        padding: 24
    },
    successModalCard: {
        width: '100%',
        maxWidth: 360,
        backgroundColor: '#FFFFFF',
        borderRadius: 28,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 10 },
        shadowOpacity: 0.2,
        shadowRadius: 18,
        elevation: 12
    },
    successModalHeader: {
        paddingHorizontal: 24,
        paddingTop: 26,
        paddingBottom: 22,
        alignItems: 'center'
    },
    successIconBadge: {
        width: 76,
        height: 76,
        borderRadius: 38,
        backgroundColor: 'rgba(255,255,255,0.22)',
        justifyContent: 'center',
        alignItems: 'center',
        marginBottom: 14,
        borderWidth: 2,
        borderColor: 'rgba(255,255,255,0.28)'
    },
    successModalEyebrow: {
        fontSize: 13,
        fontWeight: '700',
        color: 'rgba(255,255,255,0.85)',
        letterSpacing: 1,
        textTransform: 'uppercase',
        marginBottom: 6
    },
    successModalTitle: {
        fontSize: 28,
        fontWeight: '800',
        color: '#FFFFFF',
        textAlign: 'center'
    },
    successModalBody: {
        padding: 24,
        alignItems: 'center'
    },
    successModalMessage: {
        fontSize: 16,
        lineHeight: 24,
        color: '#475569',
        textAlign: 'center',
        marginBottom: 18
    },
    successResultPill: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#ECFDF5',
        borderColor: '#A7F3D0',
        borderWidth: 1,
        borderRadius: 999,
        paddingHorizontal: 16,
        paddingVertical: 10,
        marginBottom: 22
    },
    successResultPillText: {
        marginLeft: 8,
        fontSize: 14,
        fontWeight: '700',
        color: colors.primary
    },
    successButtonWrap: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden'
    },
    successButton: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 16,
        gap: 8
    },
    successButtonText: {
        color: '#FFFFFF',
        fontSize: 16,
        fontWeight: '700'
    }
});
