import React, { useState, useEffect } from 'react';
import {
    View, Text, StyleSheet, Alert, KeyboardAvoidingView,
    Platform, ScrollView, TouchableOpacity, Image
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import MapView, { Marker, Circle } from 'react-native-maps';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useStore } from '../../../store';
import { AppTextInput } from '../../../shared/components/AppTextInput';
import { AppButton } from '../../../shared/components/AppButton';
import { colors } from '../../../shared/styles/colors';
import { RegisterCredentials } from '../../../core/auth/authTypes';

export const SignupScreen = ({ navigation }: any) => {
    const { register, isLoading, error } = useStore();

    // Step 1: Account Details
    const [fullName, setFullName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [role, setRole] = useState('Farmer');

    // Step 2: Plantation Details
    const [plantationName, setPlantationName] = useState('');
    const [latitude, setLatitude] = useState(7.8731); // Default: Sri Lanka center
    const [longitude, setLongitude] = useState(80.7718);
    const [locationFetched, setLocationFetched] = useState(false);

    // UI state
    const [step, setStep] = useState(1);
    const [errors, setErrors] = useState<Record<string, string>>({});

    // Auto-detect GPS location
    useEffect(() => {
        (async () => {
            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                    setLatitude(loc.coords.latitude);
                    setLongitude(loc.coords.longitude);
                    setLocationFetched(true);
                }
            } catch (err) {
                console.log('Location permission denied or unavailable');
            }
        })();
    }, []);

    const roles = ['Farmer', 'Buyer', 'Exporter', 'Researcher'];

    const validateStep1 = () => {
        const e: Record<string, string> = {};
        if (!fullName.trim()) e.fullName = 'Full name is required';
        if (!email.trim()) e.email = 'Email is required';
        else if (!/\S+@\S+\.\S+/.test(email)) e.email = 'Invalid email format';
        if (!password) e.password = 'Password is required';
        else if (password.length < 6) e.password = 'Password must be at least 6 characters';
        if (password !== confirmPassword) e.confirmPassword = 'Passwords do not match';
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const validateStep2 = () => {
        const e: Record<string, string> = {};
        if (role === 'Farmer' && !plantationName.trim()) {
            e.plantationName = 'Plantation name is required for farmers';
        }
        setErrors(e);
        return Object.keys(e).length === 0;
    };

    const isFarmer = role === 'Farmer';

    const handleNext = () => {
        if (validateStep1()) {
            if (isFarmer) {
                setStep(2);
                setErrors({});
            } else {
                // Non-farmer roles skip step 2 (no plantation/location needed)
                handleRegisterDirect();
            }
        }
    };

    const doRegister = async (credentials: RegisterCredentials) => {
        try {
            await register(credentials);
            Alert.alert(
                'Registration Successful! 🎉',
                'Your account has been created and is pending admin approval. You will be able to login once approved.',
                [{ text: 'Go to Login', onPress: () => navigation.navigate('Login') }]
            );
        } catch (err: any) {
            Alert.alert('Registration Failed', err.response?.data || err.message || 'An error occurred');
        }
    };

    // For non-farmer roles (skip step 2)
    const handleRegisterDirect = async () => {
        await doRegister({ fullName, email, password, role, plantationName: '' });
    };

    // For farmer (from step 2)
    const handleRegister = async () => {
        if (!validateStep2()) return;
        await doRegister({ fullName, email, password, role, plantationName, latitude, longitude });
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
                <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
                    <View style={styles.header}>
                        <Image
                            source={require('../../../../assets/launch_icon_new.png')}
                            style={styles.logo}
                            resizeMode="contain"
                        />
                        <Text style={styles.title}>RubberEX</Text>
                        <Text style={styles.subtitle}>Create Account</Text>
                        <View style={styles.stepIndicator}>
                            <View style={[styles.stepDot, step >= 1 && styles.stepDotActive]}>
                                <Ionicons name="person" size={16} color={step >= 1 ? '#FFF' : '#999'} />
                            </View>
                            <View style={[styles.stepLine, step >= 2 && styles.stepLineActive]} />
                            <View style={[styles.stepDot, step >= 2 && styles.stepDotActive]}>
                                <Ionicons name="location" size={16} color={step >= 2 ? '#FFF' : '#999'} />
                            </View>
                        </View>
                    </View>

                    {step === 1 ? (
                        <View style={styles.formCard}>
                            <Text style={styles.welcomeText}>Create an Account</Text>
                            <Text style={styles.instructionText}>Enter your details below</Text>

                            <AppTextInput
                                label="Full Name"
                                placeholder="e.g. John Planter"
                                value={fullName}
                                onChangeText={setFullName}
                                error={errors.fullName}
                            />
                            <AppTextInput
                                label="Email Address"
                                placeholder="e.g. farmer@example.com"
                                value={email}
                                onChangeText={setEmail}
                                keyboardType="email-address"
                                autoCapitalize="none"
                                error={errors.email}
                            />
                            <AppTextInput
                                label="Password"
                                placeholder="••••••••"
                                value={password}
                                onChangeText={setPassword}
                                secureTextEntry
                                error={errors.password}
                            />
                            <AppTextInput
                                label="Confirm Password"
                                placeholder="••••••••"
                                value={confirmPassword}
                                onChangeText={setConfirmPassword}
                                secureTextEntry
                                error={errors.confirmPassword}
                            />

                            <Text style={styles.label}>Role</Text>
                            <View style={styles.roleRow}>
                                {roles.map((r) => {
                                    const iconName: any = r === 'Farmer' ? 'leaf-outline'
                                        : r === 'Buyer' ? 'cart-outline'
                                            : r === 'Exporter' ? 'boat-outline'
                                                : 'flask-outline';

                                    return (
                                        <TouchableOpacity
                                            key={r}
                                            style={[styles.roleChip, role === r && styles.roleChipActive]}
                                            onPress={() => setRole(r)}
                                        >
                                            <Ionicons
                                                name={iconName}
                                                size={16}
                                                color={role === r ? '#FFF' : '#666'}
                                                style={{ marginRight: 6 }}
                                            />
                                            <Text style={[styles.roleText, role === r && styles.roleTextActive]}>
                                                {r}
                                            </Text>
                                        </TouchableOpacity>
                                    );
                                })}
                            </View>
                            {!isFarmer && (
                                <Text style={styles.helperSmall}>
                                    {role === 'Buyer' ? '🛒 Buyers can purchase rubber through the DPP marketplace.'
                                        : role === 'Exporter' ? '🚢 Exporters can verify and ship rubber batches.'
                                            : '🔬 Researchers can access monitoring dashboards.'}
                                </Text>
                            )}

                            <AppButton title={isFarmer ? 'Next →' : 'Create Account'} onPress={handleNext} isLoading={!isFarmer && isLoading} style={styles.button} />

                            <TouchableOpacity onPress={() => navigation.navigate('Login')} style={styles.link}>
                                <Text style={styles.linkText}>Already have an account? <Text style={{ fontWeight: 'bold', color: colors.primary }}>Sign In</Text></Text>
                            </TouchableOpacity>
                        </View>
                    ) : (
                        <View style={styles.formCard}>
                            <Text style={styles.welcomeText}>Plantation Details</Text>
                            <Text style={styles.instructionText}>Tell us about your location</Text>

                            <TouchableOpacity onPress={() => setStep(1)} style={styles.backBtn}>
                                <Ionicons name="arrow-back" size={20} color={colors.primary} />
                                <Text style={styles.backText}>Back to account details</Text>
                            </TouchableOpacity>

                            {role === 'Farmer' && (
                                <AppTextInput
                                    label="Plantation Name"
                                    placeholder="e.g. Green Valley Plantation"
                                    value={plantationName}
                                    onChangeText={setPlantationName}
                                    error={errors.plantationName}
                                />
                            )}

                            <Text style={styles.label}>Plantation Location</Text>
                            <Text style={styles.helperSmall}>
                                {locationFetched
                                    ? 'GPS detected. Tap the map to adjust your plantation marker.'
                                    : 'Tap the map to set your plantation location.'}
                            </Text>

                            <View style={styles.mapContainer}>
                                <MapView
                                    style={styles.map}
                                    initialRegion={{
                                        latitude,
                                        longitude,
                                        latitudeDelta: 0.05,
                                        longitudeDelta: 0.05,
                                    }}
                                    region={{
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
                                        onDragEnd={(e) => {
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

                            <View style={styles.coordRow}>
                                <Text style={styles.coordText}>📍 {latitude.toFixed(4)}, {longitude.toFixed(4)}</Text>
                            </View>

                            {error ? <Text style={styles.serverError}>{error}</Text> : null}

                            <AppButton
                                title="Create Account"
                                onPress={handleRegister}
                                isLoading={isLoading}
                                style={styles.button}
                            />
                        </View>
                    )}
                </ScrollView>
            </KeyboardAvoidingView>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.lightGray,
    },
    scrollContent: {
        flexGrow: 1,
        justifyContent: 'center',
        padding: 24,
    },
    header: {
        alignItems: 'center',
        marginBottom: 32,
        marginTop: 16,
    },
    logo: {
        width: 100,
        height: 100,
        marginBottom: 16,
    },
    title: {
        fontSize: 34,
        fontWeight: 'bold',
        color: colors.primary,
        marginBottom: 4,
        letterSpacing: 1,
    },
    subtitle: {
        fontSize: 16,
        color: colors.gray,
        marginBottom: 16,
        letterSpacing: 0.5,
    },
    stepIndicator: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 8,
    },
    stepDot: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: colors.lightGray,
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    stepDotActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
    },
    stepText: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#999',
    },
    stepTextActive: {
        color: '#FFF',
    },
    stepLine: {
        width: 60,
        height: 3,
        backgroundColor: '#eee',
        marginHorizontal: 8,
        borderRadius: 2,
    },
    stepLineActive: {
        backgroundColor: colors.primary,
    },
    formCard: {
        backgroundColor: colors.background,
        borderRadius: 24,
        padding: 24,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.1,
        shadowRadius: 16,
        elevation: 5,
        width: '100%',
    },
    welcomeText: {
        fontSize: 24,
        fontWeight: 'bold',
        color: colors.text,
        marginBottom: 4,
    },
    instructionText: {
        fontSize: 14,
        color: colors.gray,
        marginBottom: 24,
    },
    label: {
        fontSize: 14,
        fontWeight: '600',
        color: '#333',
        marginBottom: 8,
        marginTop: 12,
    },
    roleRow: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 12,
        marginBottom: 16,
    },
    roleChip: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingVertical: 12,
        borderRadius: 24,
        backgroundColor: colors.background,
        borderWidth: 1.5,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 2,
    },
    roleChipActive: {
        backgroundColor: colors.primary,
        borderColor: colors.primary,
        shadowOpacity: 0.2,
        elevation: 4,
    },
    roleText: {
        color: '#666',
        fontWeight: '600',
    },
    roleTextActive: {
        color: '#FFF',
    },
    button: {
        marginTop: 16,
    },
    serverError: {
        color: colors.error,
        textAlign: 'center',
        marginBottom: 16,
    },
    link: {
        marginTop: 20,
        alignItems: 'center',
    },
    linkText: {
        color: '#666',
        fontSize: 14,
    },
    backBtn: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 16,
    },
    backText: {
        color: colors.primary,
        marginLeft: 4,
        fontWeight: '500',
    },
    helperSmall: {
        fontSize: 12,
        color: '#999',
        marginBottom: 8,
    },
    mapContainer: {
        height: 250,
        borderRadius: 16,
        overflow: 'hidden',
        marginBottom: 12,
        borderWidth: 1,
        borderColor: '#eee',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 8,
        elevation: 4,
    },
    map: {
        flex: 1,
    },
    coordRow: {
        alignItems: 'center',
        marginBottom: 8,
    },
    coordText: {
        fontSize: 13,
        color: '#666',
        fontWeight: '500',
    },
});