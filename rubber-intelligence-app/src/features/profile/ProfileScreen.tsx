import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, ScrollView, TouchableOpacity,
    Alert, TextInput, KeyboardAvoidingView, Platform, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../store';
import { AuthService } from '../../core/auth/authService';
import { colors } from '../../shared/styles/colors';

export const ProfileScreen = () => {
    const { user, logout, checkAuth } = useStore();

    const [fullName, setFullName] = useState(user?.name || '');
    const [plantationName, setPlantationName] = useState(user?.plantationName || '');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [latitude, setLatitude] = useState(user?.latitude ?? 7.8731);
    const [longitude, setLongitude] = useState(user?.longitude ?? 80.7718);
    const [saving, setSaving] = useState(false);
    const [showPasswordFields, setShowPasswordFields] = useState(false);

    const handleSave = async () => {
        if (newPassword && newPassword !== confirmPassword) {
            Alert.alert('Error', 'Passwords do not match');
            return;
        }
        if (newPassword && newPassword.length < 6) {
            Alert.alert('Error', 'Password must be at least 6 characters');
            return;
        }

        setSaving(true);
        try {
            const updateData: any = {};
            if (fullName !== user?.name) updateData.fullName = fullName;
            if (plantationName !== user?.plantationName) updateData.plantationName = plantationName;
            if (newPassword) updateData.password = newPassword;
            if (latitude !== user?.latitude || longitude !== user?.longitude) {
                updateData.latitude = latitude;
                updateData.longitude = longitude;
            }

            if (Object.keys(updateData).length === 0) {
                Alert.alert('No Changes', 'No fields have been modified.');
                setSaving(false);
                return;
            }

            await AuthService.updateProfile(updateData);
            await checkAuth(); // Refresh user data from server
            setNewPassword('');
            setConfirmPassword('');
            setShowPasswordFields(false);
            Alert.alert('Success ✅', 'Profile updated successfully!');
        } catch (error: any) {
            Alert.alert('Error', error.response?.data || 'Failed to update profile');
        } finally {
            setSaving(false);
        }
    };

    const handleMapPress = (e: any) => {
        const { latitude: lat, longitude: lng } = e.nativeEvent.coordinate;
        setLatitude(lat);
        setLongitude(lng);
    };

    return (
        <SafeAreaView style={styles.container}>
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={{ flex: 1 }}
            >
                <ScrollView contentContainerStyle={styles.scrollContent}>
                    {/* Header */}
                    <View style={styles.header}>
                        <View style={styles.avatar}>
                            <Text style={styles.avatarText}>
                                {(user?.name || 'U').charAt(0).toUpperCase()}
                            </Text>
                        </View>
                        <Text style={styles.email}>{user?.email}</Text>
                        <View style={styles.roleBadge}>
                            <Text style={styles.roleText}>{user?.role?.toUpperCase()}</Text>
                        </View>
                    </View>

                    {/* Editable Fields */}
                    <View style={styles.section}>
                        <Text style={styles.sectionTitle}>Personal Information</Text>

                        <Text style={styles.label}>Full Name</Text>
                        <TextInput
                            style={styles.input}
                            value={fullName}
                            onChangeText={setFullName}
                            placeholder="Your full name"
                        />

                        {user?.role === 'farmer' && (
                            <>
                                <Text style={styles.label}>Plantation Name</Text>
                                <TextInput
                                    style={styles.input}
                                    value={plantationName}
                                    onChangeText={setPlantationName}
                                    placeholder="Your plantation name"
                                />
                            </>
                        )}
                    </View>

                    {/* Password Section */}
                    <View style={styles.section}>
                        <TouchableOpacity
                            style={styles.passwordToggle}
                            onPress={() => setShowPasswordFields(!showPasswordFields)}
                        >
                            <Ionicons name="key" size={20} color={colors.primary} />
                            <Text style={styles.passwordToggleText}>Change Password</Text>
                            <Ionicons name={showPasswordFields ? 'chevron-up' : 'chevron-down'} size={20} color="#999" />
                        </TouchableOpacity>

                        {showPasswordFields && (
                            <>
                                <Text style={styles.label}>New Password</Text>
                                <TextInput
                                    style={styles.input}
                                    value={newPassword}
                                    onChangeText={setNewPassword}
                                    placeholder="New password (min 6 chars)"
                                    secureTextEntry
                                />
                                <Text style={styles.label}>Confirm Password</Text>
                                <TextInput
                                    style={styles.input}
                                    value={confirmPassword}
                                    onChangeText={setConfirmPassword}
                                    placeholder="Confirm new password"
                                    secureTextEntry
                                />
                            </>
                        )}
                    </View>

                    {/* Location Section */}
                    {user?.role === 'farmer' && (
                        <View style={styles.section}>
                            <Text style={styles.sectionTitle}>Plantation Location</Text>
                            <Text style={styles.helper}>Tap the map to update your plantation location</Text>

                            <View style={styles.mapContainer}>
                                <MapView
                                    style={styles.map}
                                    initialRegion={{
                                        latitude,
                                        longitude,
                                        latitudeDelta: 0.05,
                                        longitudeDelta: 0.05,
                                    }}
                                    onPress={handleMapPress}
                                >
                                    <Marker
                                        coordinate={{ latitude, longitude }}
                                        draggable
                                        onDragEnd={(e: any) => {
                                            setLatitude(e.nativeEvent.coordinate.latitude);
                                            setLongitude(e.nativeEvent.coordinate.longitude);
                                        }}
                                        title="Your Plantation"
                                        pinColor={colors.primary}
                                    />
                                    <Circle
                                        center={{ latitude, longitude }}
                                        radius={5000}
                                        strokeColor="rgba(46, 125, 50, 0.4)"
                                        fillColor="rgba(46, 125, 50, 0.1)"
                                    />
                                </MapView>
                            </View>
                            <Text style={styles.coordText}>📍 {latitude.toFixed(4)}, {longitude.toFixed(4)}</Text>
                        </View>
                    )}

                    {/* Save Button */}
                    <TouchableOpacity
                        style={[styles.saveBtn, saving && styles.saveBtnDisabled]}
                        onPress={handleSave}
                        disabled={saving}
                    >
                        {saving ? (
                            <ActivityIndicator color="#FFF" />
                        ) : (
                            <Text style={styles.saveBtnText}>Save Changes</Text>
                        )}
                    </TouchableOpacity>

                    {/* Logout Button */}
                    <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                        <Ionicons name="log-out-outline" size={20} color={colors.error} />
                        <Text style={styles.logoutText}>Sign Out</Text>
                    </TouchableOpacity>
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    scrollContent: { padding: 20, paddingBottom: 40 },
    header: { alignItems: 'center', marginBottom: 24 },
    avatar: {
        width: 80, height: 80, borderRadius: 40,
        backgroundColor: colors.primary,
        justifyContent: 'center', alignItems: 'center',
        marginBottom: 12,
    },
    avatarText: { fontSize: 32, fontWeight: 'bold', color: '#FFF' },
    email: { fontSize: 16, color: '#666', marginBottom: 6 },
    roleBadge: {
        backgroundColor: colors.primary + '20',
        paddingHorizontal: 12, paddingVertical: 4,
        borderRadius: 12,
    },
    roleText: { fontSize: 12, fontWeight: '700', color: colors.primary },
    section: {
        backgroundColor: '#FFF', borderRadius: 12,
        padding: 16, marginBottom: 16,
        elevation: 1, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 2,
    },
    sectionTitle: { fontSize: 16, fontWeight: '700', color: '#333', marginBottom: 12 },
    label: { fontSize: 13, fontWeight: '600', color: '#555', marginBottom: 4, marginTop: 8 },
    input: {
        borderWidth: 1, borderColor: '#ddd', borderRadius: 10,
        paddingHorizontal: 14, paddingVertical: 10,
        fontSize: 15, backgroundColor: '#fafafa',
    },
    helper: { fontSize: 12, color: '#999', marginBottom: 8 },
    mapContainer: {
        height: 200, borderRadius: 12, overflow: 'hidden',
        borderWidth: 1, borderColor: '#ddd', marginBottom: 8,
    },
    map: { flex: 1 },
    coordText: { fontSize: 13, color: '#666', textAlign: 'center' },
    passwordToggle: {
        flexDirection: 'row', alignItems: 'center', gap: 8,
        paddingVertical: 4,
    },
    passwordToggleText: { flex: 1, fontSize: 15, fontWeight: '600', color: colors.primary },
    saveBtn: {
        backgroundColor: colors.primary, borderRadius: 12,
        paddingVertical: 14, alignItems: 'center',
        marginTop: 8,
    },
    saveBtnDisabled: { opacity: 0.6 },
    saveBtnText: { color: '#FFF', fontSize: 16, fontWeight: '700' },
    logoutBtn: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
        gap: 6, marginTop: 16, paddingVertical: 12,
    },
    logoutText: { color: colors.error, fontSize: 15, fontWeight: '600' },
});
