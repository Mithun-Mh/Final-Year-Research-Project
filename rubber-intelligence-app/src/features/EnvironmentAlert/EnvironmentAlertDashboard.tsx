import React, { useState, useRef } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    TextInput,
    Alert,
    Dimensions
} from 'react-native';

import { LineChart } from 'react-native-chart-kit';

import { useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';

const ESP32_IP = "http://192.168.122.161";

export const EnvironmentAlertDashboard = () => {
    const { user } = useStore();
    const role = user?.role || 'farmer';

    const [soilMoisture, setSoilMoisture] = useState('');
    const [humidity, setHumidity] = useState('');
    const [temperature, setTemperature] = useState('');
    const [alertStatus, setAlertStatus] = useState('Normal');
    const [advice, setAdvice] = useState('Plantation conditions are within optimal range.');
    const [viewMode, setViewMode] = useState<'live' | 'history'>('live');
    const failCount = useRef(0);
    const lastAlertRef = useRef('Normal');

    // Mock Historical Data
    const historyData = {
        labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
        datasets: [
            {
                data: [45, 42, 38, 20, 15, 30, 48],
                color: (opacity = 1) => `rgba(46, 125, 50, ${opacity})`, // Green
                strokeWidth: 2
            }
        ],
        legend: ["Soil Moisture (%)"]
    };

    // ✅ Fetch sensor data from ESP32 every 3 seconds ONLY when screen is focused
    useFocusEffect(
        React.useCallback(() => {
            const interval = setInterval(() => {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 2000); // 2 second timeout

                fetch(`${ESP32_IP}/data`, { signal: controller.signal })
                    .then(res => res.json())
                    .then(data => {
                        clearTimeout(timeoutId);
                        failCount.current = 0;
                        setTemperature(String(data.temperature));
                        setHumidity(String(data.humidity));
                        setSoilMoisture(String(data.soilMoisture));
                        setAlertStatus(data.alert);
                        setAdvice(data.advice);

                        // Professional Real-time Notification logic
                        if (data.alert !== 'Normal' && data.alert !== lastAlertRef.current) {
                            Alert.alert(
                                `🚨 ENVIRONMENT ALERT: ${data.alert}`,
                                `Recommended Action: ${data.advice}`,
                                [{ text: "I'm on it!", onPress: () => console.log("Alert acknowledged") }],
                                { cancelable: false }
                            );
                        }
                        lastAlertRef.current = data.alert;
                    })
                    .catch(err => {
                        clearTimeout(timeoutId);
                        console.log("ESP32 Fetch Error:", err);
                        failCount.current += 1;
                        if (failCount.current >= 3) {
                            setTemperature("");
                            setHumidity("");
                            setSoilMoisture("");
                            setAlertStatus("Offline");
                            setAdvice("Cannot connect to ESP32 device.");
                        }
                    });
            }, 3000);

            return () => clearInterval(interval);
        }, [])
    );

    // Currently only visible to farmers according to requirement
    if (role !== 'farmer') {
        return (
            <View style={styles.accessDeniedContainer}>
                <Ionicons name="lock-closed" size={64} color="#ccc" />
                <Text style={styles.accessDeniedText}>
                    Access Denied. This dashboard is only available to farmers.
                </Text>
            </View>
        );
    }

    const isConnected = Number(temperature) > 0 || Number(humidity) > 0 || Number(soilMoisture) > 0;

    return (
        <ScrollView style={styles.container}>
            <LinearGradient
                colors={['#1B5E20', '#4CAF50']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.header}
            >
                <View style={styles.headerContent}>
                    <View>
                        <Text style={styles.greeting}>
                            Environmental Stress Monitor
                        </Text>
                        <Text style={styles.subtitle}>
                            Track your plantation health
                        </Text>
                    </View>

                    <View style={styles.iconCircle}>
                        <Ionicons name="leaf" size={24} color="#FFF" />
                    </View>
                </View>

                {/* View Mode Toggle */}
                <View style={styles.toggleContainer}>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'live' && styles.toggleBtnActive]}
                        onPress={() => setViewMode('live')}
                    >
                        <Text style={[styles.toggleText, viewMode === 'live' && styles.toggleTextActive]}>Live Data</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                        style={[styles.toggleBtn, viewMode === 'history' && styles.toggleBtnActive]}
                        onPress={() => setViewMode('history')}
                    >
                        <Text style={[styles.toggleText, viewMode === 'history' && styles.toggleTextActive]}>7-Day History</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* Input / Data Section */}
            <View style={styles.section}>
                <Text style={styles.sectionTitle}>
                    {viewMode === 'live' ? 'Real Time Sensor Measurements' : 'Historical Trends'}
                </Text>

                <View style={styles.inputCard}>
                    {viewMode === 'live' ? (
                        isConnected ? (
                            <View style={styles.readingsContainer}>
                                <View style={styles.readingRow}>
                                    <Text style={styles.readingLabel}>Soil Moisture</Text>
                                    <Text style={styles.readingValue}>{soilMoisture}%</Text>
                                </View>
                                <View style={styles.readingRow}>
                                    <Text style={styles.readingLabel}>Humidity</Text>
                                    <Text style={styles.readingValue}>{humidity}%</Text>
                                </View>
                                <View style={styles.readingRow}>
                                    <Text style={styles.readingLabel}>Temperature</Text>
                                    <Text style={styles.readingValue}>{temperature}°C</Text>
                                </View>
                            </View>
                        ) : (
                            <View style={styles.errorContainer}>
                                <Ionicons name="warning-outline" size={48} color="#D32F2F" />
                                <Text style={styles.errorText}>ESP32 Device Offline</Text>
                                <Text style={styles.errorSubText}>Please check the connection</Text>
                            </View>
                        )
                    ) : (
                        <View style={styles.chartContainer}>
                            <LineChart
                                data={historyData}
                                width={Dimensions.get("window").width - 80}
                                height={220}
                                chartConfig={{
                                    backgroundColor: "#FFF",
                                    backgroundGradientFrom: "#FFF",
                                    backgroundGradientTo: "#FFF",
                                    decimalPlaces: 0,
                                    color: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                    labelColor: (opacity = 1) => `rgba(0, 0, 0, ${opacity})`,
                                    style: {
                                        borderRadius: 16
                                    },
                                    propsForDots: {
                                        r: "4",
                                        strokeWidth: "2",
                                        stroke: "#2E7D32"
                                    }
                                }}
                                bezier
                                style={{
                                    marginVertical: 8,
                                    borderRadius: 16
                                }}
                            />
                        </View>
                    )}
                </View>
            </View>

            {/* Professional Alert Section */}
            {viewMode === 'live' && (
                <View style={styles.section}>
                    <Text style={styles.sectionTitle}>Status & Recommended Action</Text>

                    <View style={[
                        styles.alertCard,
                        alertStatus === 'Normal' ? styles.alertSuccess :
                            alertStatus === 'Offline' ? styles.alertOffline : styles.alertWarning
                    ]}>
                        <View style={styles.alertHeader}>
                            <Ionicons
                                name={
                                    alertStatus === 'Normal' ? "checkmark-circle" :
                                        alertStatus === 'Offline' ? "cloud-offline" : "warning"
                                }
                                size={28}
                                color="#FFF"
                            />
                            <Text style={styles.alertTitle}>
                                {alertStatus.toUpperCase()}
                            </Text>
                        </View>

                        <Text style={styles.adviceText}>{advice}</Text>

                        {alertStatus !== 'Normal' && alertStatus !== 'Offline' && (
                            <TouchableOpacity style={styles.actionButton}>
                                <Text style={styles.actionButtonText}>ACKNOWLEDGE ALERT</Text>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>
            )}

            <View style={{ height: 40 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F7FA'
    },
    header: {
        padding: 20,
        paddingTop: 60,
        borderBottomLeftRadius: 30,
        borderBottomRightRadius: 30,
        paddingBottom: 30
    },
    headerContent: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center'
    },
    greeting: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#FFF'
    },
    subtitle: {
        fontSize: 14,
        color: 'rgba(255,255,255,0.8)',
        marginTop: 4
    },
    iconCircle: {
        width: 50,
        height: 50,
        borderRadius: 25,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center'
    },
    toggleContainer: {
        flexDirection: 'row',
        backgroundColor: 'rgba(255,255,255,0.2)',
        borderRadius: 25,
        marginTop: 20,
        padding: 4
    },
    toggleBtn: {
        flex: 1,
        paddingVertical: 8,
        alignItems: 'center',
        borderRadius: 20
    },
    toggleBtnActive: {
        backgroundColor: '#FFF'
    },
    toggleText: {
        color: '#FFF',
        fontWeight: '600'
    },
    toggleTextActive: {
        color: '#2E7D32'
    },
    section: {
        padding: 20,
        paddingBottom: 0,
        marginTop: 10
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#333',
        marginBottom: 12
    },
    inputCard: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 20,
        elevation: 4
    },
    readingsContainer: {
        width: '100%'
    },
    readingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#F0F0F0'
    },
    readingLabel: {
        fontSize: 16,
        color: '#555',
        fontWeight: '500'
    },
    readingValue: {
        fontSize: 18,
        color: '#2E7D32',
        fontWeight: 'bold'
    },
    errorContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 30
    },
    errorText: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#D32F2F',
        marginTop: 10
    },
    errorSubText: {
        fontSize: 14,
        color: '#666',
        marginTop: 5
    },
    chartContainer: {
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 10
    },
    alertCard: {
        borderRadius: 20,
        padding: 20,
        elevation: 4,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
    },
    alertSuccess: {
        backgroundColor: '#2E7D32',
    },
    alertWarning: {
        backgroundColor: '#E64A19',
    },
    alertOffline: {
        backgroundColor: '#607D8B',
    },
    alertHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 10
    },
    alertTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#FFF',
        marginLeft: 10
    },
    adviceText: {
        fontSize: 16,
        color: 'rgba(255,255,255,0.9)',
        lineHeight: 24,
        fontWeight: '500'
    },
    actionButton: {
        backgroundColor: 'rgba(255,255,255,0.2)',
        paddingVertical: 10,
        borderRadius: 10,
        marginTop: 15,
        alignItems: 'center',
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.5)'
    },
    actionButtonText: {
        color: '#FFF',
        fontWeight: 'bold',
        fontSize: 14
    },
    accessDeniedContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F5F7FA',
        padding: 40
    },
    accessDeniedText: {
        marginTop: 20,
        fontSize: 18,
        color: '#666',
        textAlign: 'center',
        fontWeight: '500'
    }
});