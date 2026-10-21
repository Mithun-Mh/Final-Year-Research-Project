import React, { useState } from 'react';
import { View, Text, StyleSheet, Alert, Image, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useStore } from '../../../store';
import { AppTextInput } from '../../../shared/components/AppTextInput';
import { AppButton } from '../../../shared/components/AppButton';
import { colors } from '../../../shared/styles/colors';

export const LoginScreen = ({ navigation }: any) => {
    const { login, isLoading, error } = useStore();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [emailError, setEmailError] = useState('');
    const [passwordError, setPasswordError] = useState('');

    const validate = () => {
        let isValid = true;
        if (!email) {
            setEmailError('Email is required');
            isValid = false;
        } else {
            setEmailError('');
        }

        if (!password) {
            setPasswordError('Password is required');
            isValid = false;
        } else {
            setPasswordError('');
        }
        return isValid;
    };

    const handleLogin = async () => {
        if (!validate()) return;

        try {
            await login({ email, password });
        } catch (err: any) {
            // Error is handled by store but good to alert or show toast
            Alert.alert("Login Failed", err.message || "An error occurred");
        }
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
                        <Text style={styles.subtitle}>Intelligence Platform</Text>
                    </View>

                    <View style={styles.formCard}>
                        <Text style={styles.welcomeText}>Welcome Back</Text>
                        <Text style={styles.instructionText}>Sign in to continue</Text>

                        <AppTextInput
                            label="Email Address"
                            placeholder="e.g. farmer@test.com"
                            value={email}
                            onChangeText={setEmail}
                            keyboardType="email-address"
                            autoCapitalize="none"
                            error={emailError}
                        />

                        <AppTextInput
                            label="Password"
                            placeholder="••••••••"
                            value={password}
                            onChangeText={setPassword}
                            secureTextEntry
                            error={passwordError}
                        />

                        {error ? <Text style={styles.serverError}>{error}</Text> : null}

                        <AppButton
                            title="Sign In"
                            onPress={handleLogin}
                            isLoading={isLoading}
                            style={styles.button}
                        />

                        <TouchableOpacity onPress={() => navigation.navigate('Register')} style={styles.signupLink}>
                            <Text style={styles.signupText}>
                                Don't have an account? <Text style={{ fontWeight: 'bold', color: colors.primary }}>Sign Up</Text>
                            </Text>
                        </TouchableOpacity>
                    </View>
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
        letterSpacing: 0.5,
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
    serverError: {
        color: colors.error,
        textAlign: 'center',
        marginBottom: 16,
    },
    button: {
        marginTop: 16,
    },
    signupLink: {
        marginTop: 24,
        alignItems: 'center',
    },
    signupText: {
        color: colors.gray,
        fontSize: 14,
    }
});
