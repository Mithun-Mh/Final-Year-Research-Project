import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle, Region } from 'react-native-maps';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../../store';
import { DiseaseService, MapDataPoint } from '../services/diseaseService';
import { colors } from '../../../shared/styles/colors';

interface DiseaseMapParams {
    latitude?: number;
    longitude?: number;
    diseaseName?: string;
}

export const DiseaseMapScreen = ({ route, navigation }: any) => {
    const user = useStore(state => state.user);
    const mapRef = useRef<MapView>(null);
    const [mapData, setMapData] = useState<MapDataPoint[]>([]);
    const [loading, setLoading] = useState(true);

    // Route params from notification "View on Map"
    const params: DiseaseMapParams = route?.params || {};
    const hasTarget = params.latitude != null && params.longitude != null;

    // Default to target location, user plantation, or Sri Lanka center
    const defaultLat = params.latitude ?? user?.latitude ?? 7.8731;
    const defaultLng = params.longitude ?? user?.longitude ?? 80.7718;

    useEffect(() => {
        loadMapData();
    }, []);

    // Auto-zoom to target when map data is loaded and we have a target from notification
    useEffect(() => {
        if (!loading && hasTarget && mapRef.current) {
            setTimeout(() => {
                mapRef.current?.animateToRegion({
                    latitude: params.latitude!,
                    longitude: params.longitude!,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }, 800);
            }, 500);
        }
    }, [loading, hasTarget]);

    const loadMapData = async () => {
        try {
            const data = await DiseaseService.getMapData(30);
            if (params.diseaseName) {
                // Filter only markers that match the requested disease
                setMapData(data.filter(d => d.disease.toLowerCase() === params.diseaseName!.toLowerCase()));
            } else {
                setMapData(data);
            }
        } catch (error) {
            console.error('Failed to load map data:', error);
        } finally {
            setLoading(false);
        }
    };

    const getDiseaseColor = (diseaseType: string) => {
        switch (diseaseType) {
            case 'Leaf': return '#D32F2F';
            case 'Pest': return '#E91E63';
            case 'Weed': return '#FF9800';
            default: return '#9C27B0';
        }
    };

    const zoomIn = () => {
        mapRef.current?.getCamera().then(camera => {
            if (camera.center) {
                mapRef.current?.animateToRegion({
                    latitude: camera.center.latitude,
                    longitude: camera.center.longitude,
                    latitudeDelta: 0.01,
                    longitudeDelta: 0.01,
                }, 300);
            }
        });
    };

    const zoomOut = () => {
        mapRef.current?.getCamera().then(camera => {
            if (camera.center) {
                mapRef.current?.animateToRegion({
                    latitude: camera.center.latitude,
                    longitude: camera.center.longitude,
                    latitudeDelta: 0.15,
                    longitudeDelta: 0.15,
                }, 300);
            }
        });
    };

    const centerOnMe = () => {
        if (user?.latitude && user?.longitude) {
            mapRef.current?.animateToRegion({
                latitude: user.latitude,
                longitude: user.longitude,
                latitudeDelta: 0.04,
                longitudeDelta: 0.04,
            }, 600);
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                    <Text style={styles.loadingText}>Loading disease map...</Text>
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => {
                    if (navigation.canGoBack()) {
                        navigation.goBack();
                    } else {
                        navigation.navigate('DiseaseHome');
                    }
                }} style={{ marginRight: 4 }}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Ionicons name="map" size={24} color={colors.primary} />
                <Text style={styles.headerTitle}>
                    {hasTarget ? `📍 ${params.diseaseName || 'Detection'}` : 'Disease Map'}
                </Text>
                <View style={styles.badge}>
                    <Text style={styles.badgeText}>{mapData.length} detections</Text>
                </View>
            </View>

            {/* Map */}
            <View style={styles.mapContainer}>
                <MapView
                    ref={mapRef}
                    style={styles.map}
                    initialRegion={{
                        latitude: defaultLat,
                        longitude: defaultLng,
                        latitudeDelta: hasTarget ? 0.02 : 0.1,
                        longitudeDelta: hasTarget ? 0.02 : 0.1,
                    }}
                    zoomEnabled={true}
                    zoomControlEnabled={true}
                    showsUserLocation={true}
                    showsMyLocationButton={false}
                >
                    {/* Farmer's Plantation */}
                    {user?.latitude && user?.longitude && (
                        <>
                            <Marker
                                coordinate={{ latitude: user.latitude, longitude: user.longitude }}
                                title={user.plantationName || 'My Plantation'}
                                description="Your plantation location"
                                pinColor="blue"
                            />
                            <Circle
                                center={{ latitude: user.latitude, longitude: user.longitude }}
                                radius={5000}
                                strokeColor="rgba(46, 125, 50, 0.4)"
                                fillColor="rgba(46, 125, 50, 0.06)"
                                strokeWidth={2}
                            />
                        </>
                    )}

                    {/* Disease Detection Markers */}
                    {mapData.map((point) => (
                        <Marker
                            key={point.id}
                            coordinate={{ latitude: point.latitude, longitude: point.longitude }}
                            pinColor={getDiseaseColor(point.diseaseType)}
                            title={point.disease}
                            description={`${(point.confidence * 100).toFixed(0)}% confidence | ${new Date(point.detectedAt).toLocaleDateString()}`}
                        />
                    ))}

                    {/* Target marker highlight when coming from notification */}
                    {hasTarget && (
                        <Circle
                            center={{ latitude: params.latitude!, longitude: params.longitude! }}
                            radius={200}
                            strokeColor="rgba(211, 47, 47, 0.8)"
                            fillColor="rgba(211, 47, 47, 0.15)"
                            strokeWidth={3}
                        />
                    )}
                </MapView>

                {/* Floating Controls */}
                <View style={styles.floatingControls}>
                    <TouchableOpacity style={styles.controlBtn} onPress={zoomIn}>
                        <Ionicons name="add" size={22} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.controlBtn} onPress={zoomOut}>
                        <Ionicons name="remove" size={22} color="#333" />
                    </TouchableOpacity>
                    {user?.latitude && (
                        <TouchableOpacity style={[styles.controlBtn, styles.locationBtn]} onPress={centerOnMe}>
                            <Ionicons name="locate" size={20} color={colors.primary} />
                        </TouchableOpacity>
                    )}
                </View>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: 'blue' }]} />
                    <Text style={styles.legendText}>Plantation</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#D32F2F' }]} />
                    <Text style={styles.legendText}>Leaf</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#E91E63' }]} />
                    <Text style={styles.legendText}>Pest</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={[styles.legendDot, { backgroundColor: '#FF9800' }]} />
                    <Text style={styles.legendText}>Weed</Text>
                </View>
                <View style={styles.legendItem}>
                    <View style={styles.legendCircle} />
                    <Text style={styles.legendText}>5km Zone</Text>
                </View>
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f5f5f5' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        padding: 14, paddingBottom: 6, gap: 8,
    },
    headerTitle: {
        fontSize: 18, fontWeight: 'bold', color: '#333', flex: 1,
    },
    badge: {
        backgroundColor: colors.primary,
        paddingHorizontal: 10, paddingVertical: 3, borderRadius: 12,
    },
    badgeText: { color: '#FFF', fontSize: 11, fontWeight: '600' },
    mapContainer: {
        flex: 1, margin: 10, borderRadius: 16, overflow: 'hidden',
        elevation: 3, shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.15, shadowRadius: 4,
    },
    map: { flex: 1 },
    floatingControls: {
        position: 'absolute', right: 12, top: 12, gap: 8,
    },
    controlBtn: {
        width: 40, height: 40, borderRadius: 20,
        backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center',
        elevation: 4, shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.2, shadowRadius: 3,
    },
    locationBtn: { marginTop: 8 },
    legend: {
        flexDirection: 'row', flexWrap: 'wrap', padding: 10,
        paddingTop: 4, gap: 10, justifyContent: 'center',
    },
    legendItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
    legendDot: { width: 10, height: 10, borderRadius: 5 },
    legendCircle: {
        width: 12, height: 12, borderRadius: 6,
        borderWidth: 2, borderColor: 'rgba(46,125,50,0.5)',
        backgroundColor: 'rgba(46,125,50,0.1)',
    },
    legendText: { fontSize: 11, color: '#666' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    loadingText: { marginTop: 12, color: '#666' },
});
