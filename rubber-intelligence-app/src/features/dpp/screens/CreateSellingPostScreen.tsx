import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, TextInput, TouchableOpacity,
    ScrollView, Alert, ActivityIndicator, Modal, StatusBar
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { createSellingPost } from '../services/marketplaceService';

const GREEN = '#2E7D32';
const GREEN_LIGHT = '#4CAF50';
const GREEN_PALE = '#E8F5E9';
const GREEN_DARK = '#1B5E20';

export default function CreateSellingPostScreen() {
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(false);

    const [grade, setGrade] = useState('');
    const [quantity, setQuantity] = useState('');
    const [price, setPrice] = useState('');
    const [location, setLocation] = useState('');
    const [locationLoading, setLocationLoading] = useState(false);

    const GRADE_OPTIONS = ['RSS1', 'RSS2', 'RSS3', 'RSS4', 'RSS5'];
    const [showGradePicker, setShowGradePicker] = useState(false);

    const fetchGPSLocation = async () => {
        setLocationLoading(true);
        try {
            const { status } = await Location.requestForegroundPermissionsAsync();
            if (status !== 'granted') {
                Alert.alert(
                    'Permission Denied',
                    'Location access is required to auto-fill your dispatch address. Please enable it in settings.'
                );
                return;
            }
            const coords = await Location.getCurrentPositionAsync({
                accuracy: Location.Accuracy.High,
            });
            const [place] = await Location.reverseGeocodeAsync({
                latitude: coords.coords.latitude,
                longitude: coords.coords.longitude,
            });
            if (place) {
                const parts = [
                    place.name,
                    place.street,
                    place.district,
                    place.city,
                    place.region,
                    place.country,
                ].filter(Boolean);
                setLocation(parts.join(', '));
            } else {
                setLocation(
                    `${coords.coords.latitude.toFixed(6)}, ${coords.coords.longitude.toFixed(6)}`
                );
            }
        } catch {
            Alert.alert('GPS Error', 'Could not retrieve your location. Please try again or enter manually.');
        } finally {
            setLocationLoading(false);
        }
    };

    const handleSubmit = async () => {
        if (!grade || !quantity || !price || !location) {
            Alert.alert('Missing Fields', 'Please fill all details');
            return;
        }

        setLoading(true);
        try {
            await createSellingPost({
                grade,
                quantityKg: parseFloat(quantity),
                pricePerKg: parseFloat(price),
                location
            });
            Alert.alert('Success', 'Selling Post Created!');
            navigation.goBack();
        } catch (error) {
            Alert.alert('Error', 'Failed to create post');
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.screen}>
            <StatusBar barStyle="light-content" backgroundColor={GREEN_DARK} />

            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={styles.headerTextWrap}>
                    <Text style={styles.headerTitle}>New Selling Post</Text>
                    <Text style={styles.headerSub}>List your rubber for buyers</Text>
                </View>
                <View style={styles.headerIcon}>
                    <Ionicons name="pricetag" size={28} color="rgba(255,255,255,0.4)" />
                </View>
            </View>

            <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>

                {/* Section: Product Details */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="leaf" size={18} color={GREEN} />
                        <Text style={styles.sectionTitle}>Product Details</Text>
                    </View>

                    <Text style={styles.label}>Rubber Grade</Text>
                    <TouchableOpacity
                        style={styles.pickerTrigger}
                        onPress={() => setShowGradePicker(true)}
                    >
                        <View style={styles.inputRow}>
                            <Ionicons name="layers-outline" size={18} color={GREEN_LIGHT} />
                            <Text style={grade ? styles.pickerValue : styles.pickerPlaceholder}>
                                {grade || 'Select Grade'}
                            </Text>
                        </View>
                        <Ionicons name="chevron-down" size={18} color="#999" />
                    </TouchableOpacity>

                    <Text style={styles.label}>Quantity (Kg)</Text>
                    <View style={styles.inputWrap}>
                        <Ionicons name="cube-outline" size={18} color={GREEN_LIGHT} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 1000"
                            placeholderTextColor="#bbb"
                            keyboardType="numeric"
                            value={quantity}
                            onChangeText={setQuantity}
                        />
                    </View>

                    <Text style={styles.label}>Price per Kg (LKR)</Text>
                    <View style={styles.inputWrap}>
                        <Ionicons name="cash-outline" size={18} color={GREEN_LIGHT} />
                        <TextInput
                            style={styles.input}
                            placeholder="e.g. 500"
                            placeholderTextColor="#bbb"
                            keyboardType="numeric"
                            value={price}
                            onChangeText={setPrice}
                        />
                    </View>
                </View>

                {/* Section: Dispatch Info */}
                <View style={styles.sectionCard}>
                    <View style={styles.sectionHeader}>
                        <Ionicons name="location" size={18} color={GREEN} />
                        <Text style={styles.sectionTitle}>Dispatch Info</Text>
                    </View>

                    <Text style={styles.label}>Dispatched Address</Text>

                    {/* GPS Auto-Fill Button */}
                    <TouchableOpacity
                        style={[styles.gpsBtn, locationLoading && { opacity: 0.7 }]}
                        onPress={fetchGPSLocation}
                        disabled={locationLoading}
                        activeOpacity={0.8}
                    >
                        {locationLoading ? (
                            <ActivityIndicator size="small" color="#fff" />
                        ) : (
                            <Ionicons name="locate" size={18} color="#fff" />
                        )}
                        <Text style={styles.gpsBtnText}>
                            {locationLoading ? 'Getting Location...' : 'Use My Current GPS Location'}
                        </Text>
                    </TouchableOpacity>

                    {/* Address Display / Manual Override */}
                    <View style={[styles.inputWrap, { alignItems: 'flex-start', paddingTop: 14, marginTop: 10 }]}>
                        <Ionicons name="navigate-outline" size={18} color={GREEN_LIGHT} style={{ marginTop: 2 }} />
                        <TextInput
                            style={[styles.input, { height: 72, textAlignVertical: 'top' }]}
                            placeholder="Auto-filled from GPS or enter manually..."
                            placeholderTextColor="#bbb"
                            value={location}
                            onChangeText={setLocation}
                            multiline
                            numberOfLines={3}
                        />
                        {location.length > 0 && (
                            <TouchableOpacity onPress={() => setLocation('')} style={{ paddingTop: 12 }}>
                                <Ionicons name="close-circle" size={20} color="#ccc" />
                            </TouchableOpacity>
                        )}
                    </View>
                    {location.length > 0 && (
                        <View style={styles.gpsConfirmedRow}>
                            <Ionicons name="checkmark-circle" size={14} color={GREEN_LIGHT} />
                            <Text style={styles.gpsConfirmedText}>Location captured</Text>
                        </View>
                    )}
                </View>


                {/* Submit Button */}
                <TouchableOpacity
                    style={[styles.submitBtn, loading && { opacity: 0.7 }]}
                    onPress={handleSubmit}
                    disabled={loading}
                    activeOpacity={0.8}
                >
                    {loading ? (
                        <ActivityIndicator color="#fff" />
                    ) : (
                        <View style={styles.submitInner}>
                            <Ionicons name="rocket-outline" size={20} color="#fff" />
                            <Text style={styles.submitText}>Publish Post</Text>
                        </View>
                    )}
                </TouchableOpacity>

                <View style={{ height: 40 }} />
            </ScrollView>

            {/* Grade Picker Modal */}
            <Modal visible={showGradePicker} transparent animationType="slide">
                <TouchableOpacity style={styles.modalOverlay} activeOpacity={1} onPress={() => setShowGradePicker(false)}>
                    <View style={styles.modalContent}>
                        <View style={styles.modalHandle} />
                        <Text style={styles.modalTitle}>Select Rubber Grade</Text>
                        {GRADE_OPTIONS.map(opt => (
                            <TouchableOpacity
                                key={opt}
                                style={[styles.modalOption, grade === opt && styles.modalOptionActive]}
                                onPress={() => { setGrade(opt); setShowGradePicker(false); }}
                            >
                                <View style={styles.inputRow}>
                                    <Ionicons
                                        name="leaf"
                                        size={16}
                                        color={grade === opt ? GREEN : '#bbb'}
                                    />
                                    <Text style={[styles.modalOptionText, grade === opt && { color: GREEN, fontWeight: 'bold' }]}>
                                        {opt}
                                    </Text>
                                </View>
                                {grade === opt && <Ionicons name="checkmark-circle" size={22} color={GREEN} />}
                            </TouchableOpacity>
                        ))}
                        <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowGradePicker(false)}>
                            <Text style={styles.cancelText}>Cancel</Text>
                        </TouchableOpacity>
                    </View>
                </TouchableOpacity>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    screen: {
        flex: 1,
        backgroundColor: '#F4F6F3',
    },

    // Header
    header: {
        backgroundColor: GREEN,
        paddingTop: 56,
        paddingBottom: 22,
        paddingHorizontal: 20,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: GREEN_DARK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 8,
    },
    backBtn: {
        width: 38,
        height: 38,
        borderRadius: 19,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTextWrap: {
        flex: 1,
        marginLeft: 14,
    },
    headerTitle: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#fff',
    },
    headerSub: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.75)',
        marginTop: 2,
    },
    headerIcon: {
        marginLeft: 8,
    },

    // Body
    body: {
        flex: 1,
        paddingHorizontal: 16,
        paddingTop: 16,
    },

    // Section Card
    sectionCard: {
        backgroundColor: '#fff',
        borderRadius: 16,
        padding: 18,
        marginBottom: 14,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    sectionHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        marginBottom: 12,
        paddingBottom: 10,
        borderBottomWidth: 1,
        borderBottomColor: GREEN_PALE,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: '700',
        color: GREEN_DARK,
    },

    // Labels & Inputs
    label: {
        fontSize: 13,
        fontWeight: '600',
        color: '#666',
        marginBottom: 6,
        marginTop: 14,
    },
    inputWrap: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8FAF8',
        borderRadius: 12,
        paddingHorizontal: 14,
        borderWidth: 1,
        borderColor: '#E8EDE8',
    },
    input: {
        flex: 1,
        fontSize: 15,
        color: '#222',
        paddingVertical: 13,
        paddingHorizontal: 10,
    },
    pickerTrigger: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        backgroundColor: '#F8FAF8',
        borderRadius: 12,
        paddingHorizontal: 14,
        paddingVertical: 14,
        borderWidth: 1,
        borderColor: '#E8EDE8',
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    pickerValue: { fontSize: 15, color: '#222' },
    pickerPlaceholder: { fontSize: 15, color: '#bbb' },

    // GPS Button
    gpsBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
        backgroundColor: GREEN,
        paddingVertical: 13,
        paddingHorizontal: 16,
        borderRadius: 12,
        justifyContent: 'center',
        shadowColor: GREEN_DARK,
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.25,
        shadowRadius: 5,
        elevation: 4,
    },
    gpsBtnText: {
        color: '#fff',
        fontWeight: '700',
        fontSize: 14,
        letterSpacing: 0.2,
    },
    gpsConfirmedRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 5,
        marginTop: 6,
        marginLeft: 4,
    },
    gpsConfirmedText: {
        fontSize: 11,
        color: GREEN_LIGHT,
        fontWeight: '600',
    },

    // Helper
    helperText: {
        fontSize: 12,
        color: '#888',
        lineHeight: 18,
        marginBottom: 12,
    },

    // Submit Button
    submitBtn: {
        backgroundColor: GREEN,
        paddingVertical: 16,
        borderRadius: 14,
        alignItems: 'center',
        marginTop: 8,
        shadowColor: GREEN_DARK,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 6,
        elevation: 6,
    },
    submitInner: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 10,
    },
    submitText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 17,
        letterSpacing: 0.3,
    },

    // Modal
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.45)',
        justifyContent: 'flex-end',
    },
    modalContent: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 28,
        borderTopRightRadius: 28,
        padding: 24,
        paddingTop: 14,
    },
    modalHandle: {
        width: 40,
        height: 4,
        borderRadius: 2,
        backgroundColor: '#ddd',
        alignSelf: 'center',
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        color: GREEN_DARK,
        marginBottom: 8,
        textAlign: 'center',
    },
    modalOption: {
        paddingVertical: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    modalOptionActive: {
        backgroundColor: GREEN_PALE,
        borderRadius: 10,
        marginHorizontal: -8,
        paddingHorizontal: 8,
    },
    modalOptionText: { fontSize: 16, color: '#444' },
    cancelBtn: {
        marginTop: 14,
        alignItems: 'center',
        padding: 14,
        backgroundColor: '#f5f5f5',
        borderRadius: 12,
    },
    cancelText: { color: '#888', fontSize: 15, fontWeight: '600' },
});
