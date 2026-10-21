import React, { useState, useCallback, useMemo } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, Alert, ActivityIndicator, ScrollView, TextInput, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { FadeInDown } from 'react-native-reanimated';
import { colors } from '../../../shared/styles/colors';
import { GradingService, GradingResponse } from '../services/gradingService';
import { ReportService } from '../../../core/services/ReportService';

// Custom Alert Component for Validation
interface ValidationAlertProps {
    visible: boolean;
    title: string;
    message: string;
    errors?: string[];
    onClose: () => void;
}

const ValidationAlert = ({ visible, title, message, errors = [], onClose }: ValidationAlertProps) => {
    const getIconByType = () => {
        if (title.toLowerCase().includes('success')) {
            return <Ionicons name="checkmark-circle" size={60} color="#4CAF50" />;
        } else if (title.toLowerCase().includes('warning')) {
            return <Ionicons name="warning" size={60} color="#FF9800" />;
        } else {
            return <Ionicons name="alert-circle" size={60} color="#F44336" />;
        }
    };

    const getGradientColors = () => {
        if (title.toLowerCase().includes('success')) {
            return ['#4CAF50', '#45a049'] as const;
        } else if (title.toLowerCase().includes('warning')) {
            return ['#FF9800', '#f57c00'] as const;
        } else {
            return ['#F44336', '#d32f2f'] as const;
        }
    };

    return (
        <Modal
            visible={visible}
            transparent={true}
            animationType="fade"
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                <Animated.View entering={FadeInDown.duration(300)} style={styles.modalContent}>
                    <View style={styles.modalIconContainer}>
                        {getIconByType()}
                    </View>

                    <Text style={styles.modalTitle}>{title}</Text>

                    {message ? <Text style={styles.modalMessage}>{message}</Text> : null}

                    {errors.length > 0 ? (
                        <View style={styles.modalErrorsContainer}>
                            {errors.map((error, index) => (
                                <View key={index} style={styles.modalErrorItem}>
                                    <Ionicons name="close-circle" size={18} color="#F44336" />
                                    <Text style={styles.modalErrorText}>{error}</Text>
                                </View>
                            ))}
                        </View>
                    ) : null}

                    <TouchableOpacity
                        style={styles.modalButtonContainer}
                        onPress={onClose}
                        activeOpacity={0.8}
                    >
                        <LinearGradient
                            colors={getGradientColors()}
                            style={styles.modalButton}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                        >
                            <Text style={styles.modalButtonText}>Got It</Text>
                            <Ionicons name="checkmark" size={20} color="#FFF" />
                        </LinearGradient>
                    </TouchableOpacity>
                </Animated.View>
            </View>
        </Modal>
    );
};

export const GradingScreen = () => {
    const navigation = useNavigation<any>();
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<GradingResponse | null>(null);

    // Alert state
    const [alertVisible, setAlertVisible] = useState(false);
    const [alertTitle, setAlertTitle] = useState('');
    const [alertMessage, setAlertMessage] = useState('');
    const [alertErrors, setAlertErrors] = useState<string[]>([]);

    // New Fields
    const [testDate] = useState(new Date().toLocaleDateString());
    const [testTime] = useState(new Date().toLocaleTimeString());
    const [testerName, setTesterName] = useState('');
    const [testerNameError, setTesterNameError] = useState('');
    const [batchId] = useState(`BATCH-${Math.floor(Math.random() * 10000).toString().padStart(4, '0')}`);
    const [rubberCategory] = useState('RSS Rubber');
    const [sheetCount, setSheetCount] = useState('');
    const [sheetCountError, setSheetCountError] = useState('');
    const [sheetWeight, setSheetWeight] = useState('');
    const [sheetWeightError, setSheetWeightError] = useState('');

    // Show custom alert
    const showValidationAlert = (title: string, message: string, errors: string[] = []) => {
        setAlertTitle(title);
        setAlertMessage(message);
        setAlertErrors(errors);
        setAlertVisible(true);
    };

    // Validation Functions
    const validateTesterName = (name: string): boolean => {
        if (!name.trim()) {
            setTesterNameError('Tester name is required');
            return false;
        } else if (name.trim().length < 2) {
            setTesterNameError('Name must be at least 2 characters');
            return false;
        } else if (name.trim().length > 50) {
            setTesterNameError('Name must be less than 50 characters');
            return false;
        } else if (!/^[a-zA-Z\s]+$/.test(name.trim())) {
            setTesterNameError('Name can only contain letters and spaces');
            return false;
        }
        setTesterNameError('');
        return true;
    };

    const validateSheetCount = (count: string): boolean => {
        if (!count) {
            setSheetCountError('Sheet count is required');
            return false;
        }

        const numCount = Number(count);
        if (isNaN(numCount) || !Number.isInteger(numCount)) {
            setSheetCountError('Sheet count must be a whole number');
            return false;
        }

        if (numCount <= 0) {
            setSheetCountError('Sheet count must be greater than 0');
            return false;
        }

        if (numCount > 1000) {
            setSheetCountError('Sheet count cannot exceed 1000');
            return false;
        }

        setSheetCountError('');
        return true;
    };

    const validateSheetWeight = (weight: string): boolean => {
        if (!weight) {
            setSheetWeightError('Sheet weight is required');
            return false;
        }

        const numWeight = Number(weight);
        if (isNaN(numWeight)) {
            setSheetWeightError('Sheet weight must be a number');
            return false;
        }

        if (numWeight <= 0) {
            setSheetWeightError('Sheet weight must be greater than 0');
            return false;
        }

        if (numWeight > 1000) {
            setSheetWeightError('Sheet weight cannot exceed 1000 kg');
            return false;
        }

        const decimalPlaces = (weight.split('.')[1] || '').length;
        if (decimalPlaces > 2) {
            setSheetWeightError('Weight can have maximum 2 decimal places');
            return false;
        }

        setSheetWeightError('');
        return true;
    };

    const validateAllFields = (): { isValid: boolean; errors: string[] } => {
        const errors: string[] = [];

        const isTesterNameValid = validateTesterName(testerName);
        if (!isTesterNameValid) {
            errors.push(testerNameError || 'Invalid tester name');
        }

        const isSheetCountValid = validateSheetCount(sheetCount);
        if (!isSheetCountValid) {
            errors.push(sheetCountError || 'Invalid sheet count');
        }

        const isSheetWeightValid = validateSheetWeight(sheetWeight);
        if (!isSheetWeightValid) {
            errors.push(sheetWeightError || 'Invalid sheet weight');
        }

        return {
            isValid: errors.length === 0,
            errors
        };
    };

    const handleTesterNameChange = (text: string) => {
        setTesterName(text);
        if (testerNameError) validateTesterName(text);
    };

    const handleSheetCountChange = (text: string) => {
        const numericText = text.replace(/[^0-9]/g, '');
        setSheetCount(numericText);
        if (sheetCountError) validateSheetCount(numericText);
    };

    const handleSheetWeightChange = (text: string) => {
        const decimalRegex = /^\d*\.?\d{0,2}$/;
        if (text === '' || decimalRegex.test(text)) {
            setSheetWeight(text);
            if (sheetWeightError) validateSheetWeight(text);
        }
    };

    const pickImage = useCallback(async () => {
        const currentPermission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (currentPermission.status !== 'granted') {
            showValidationAlert(
                "Permission Required",
                "We need gallery access to upload images for grading analysis.",
                ['Gallery permission is required']
            );
            return;
        }

        let result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            setResult(null);
            showValidationAlert(
                "Success!",
                "Image selected successfully. You can now proceed with analysis.",
                []
            );
        }
    }, []);

    const takePhoto = useCallback(async () => {
        const currentPermission = await ImagePicker.requestCameraPermissionsAsync();
        if (currentPermission.status !== 'granted') {
            showValidationAlert(
                "Permission Required",
                "We need camera access to take photos for grading analysis.",
                ['Camera permission is required']
            );
            return;
        }

        let result = await ImagePicker.launchCameraAsync({
            allowsEditing: true,
            aspect: [1, 1],
            quality: 0.7,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
            setResult(null);
            showValidationAlert(
                "Success!",
                "Photo captured successfully. Ready for analysis.",
                []
            );
        }
    }, []);

    const handleAnalyze = useCallback(async () => {
        // Validate all fields first
        const validation = validateAllFields();

        if (!validation.isValid) {
            showValidationAlert(
                "Validation Failed",
                "Please fix the following errors:",
                validation.errors
            );
            return;
        }

        if (!image) {
            showValidationAlert(
                "No Image Selected",
                "Please select or capture an image first.",
                ['Image is required for analysis']
            );
            return;
        }

        setLoading(true);
        try {
            const data = await GradingService.analyzeImage(image);
            setResult(data);
            showValidationAlert(
                "Success: Analysis Complete",
                "Image analysis completed successfully! Check the results below.",
                []
            );
        } catch (error) {
            showValidationAlert(
                "Analysis Failed",
                "Could not analyze the image. Please check your connection.",
                ['Backend service unavailable']
            );
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [image, testerName, sheetCount, sheetWeight]);

    const handleGenerateReport = useCallback(async () => {
        if (!result) {
            showValidationAlert(
                "No Results",
                "Please analyze an image first before generating a report.",
                ['Analysis results are required']
            );
            return;
        }

        const validation = validateAllFields();

        if (!validation.isValid) {
            showValidationAlert(
                "Validation Failed",
                "Please fix the following errors before generating report:",
                validation.errors
            );
            return;
        }

        try {
            const html = ReportService.generateGradingHTML({
                batchId,
                result,
                params: {
                    testerName: testerName.trim(),
                    sheetCount,
                    sheetWeight,
                    testDate,
                    testTime
                }
            });
            const filename = `Grading_${batchId}.pdf`;
            const pdfUri = await ReportService.generatePDF(html, filename);

            if (pdfUri) {
                showValidationAlert(
                    "Success: Report Generated",
                    "PDF report created successfully! Redirecting to reports page.",
                    []
                );

                setTimeout(() => {
                    navigation.navigate('TestReports', {
                        batchId,
                        result,
                        pdfUri,
                        params: {
                            testerName: testerName.trim(),
                            sheetCount,
                            sheetWeight,
                            testDate,
                            testTime
                        }
                    });
                }, 1500);
            }
        } catch (error) {
            showValidationAlert(
                "Error",
                "Failed to generate PDF report. Please try again.",
                ['Report generation failed']
            );
        }
    }, [result, batchId, testerName, sheetCount, sheetWeight, testDate, testTime, navigation]);

    const renderResult = useCallback(() => {
        if (!result) return null;

        const isGood = result.predictedClass.toLowerCase().includes("good");
        const statusColor = isGood ? colors.success : colors.error;

        return (
            <Animated.View entering={FadeInDown.duration(500)} style={styles.resultCard}>
                <View style={[styles.badge, { backgroundColor: statusColor }]}>
                    <MaterialCommunityIcons
                        name={isGood ? "check-circle" : "alert-circle"}
                        size={16}
                        color="#FFF"
                    />
                    <Text style={styles.badgeText}>Severity: {result.severity}</Text>
                </View>

                <Text style={styles.resultTitle}>{result.predictedClass}</Text>
                <Text style={styles.confidence}>Confidence: {(result.confidence * 100).toFixed(1)}%</Text>

                <View style={[styles.gradeContainer, { backgroundColor: isGood ? '#E8F5E9' : '#FFF3E0' }]}>
                    <MaterialCommunityIcons
                        name={isGood ? "star" : "alert"}
                        size={24}
                        color={isGood ? '#2E7D32' : '#EF6C00'}
                    />
                    <Text style={[styles.gradeLabel, { color: isGood ? '#2E7D32' : '#EF6C00' }]}>
                        Grading Result:
                    </Text>
                    <Text style={[styles.gradeValue, { color: isGood ? '#1B5E20' : '#E65100' }]}>
                        {(() => {
                            const prediction = result.predictedClass.toLowerCase();
                            if (prediction.includes("good")) return "RSS 1";
                            if (prediction.includes("pin")) return "RSS 2";
                            if (prediction.includes("reaper")) return "RSS 3";
                            return "Ungraded";
                        })()}
                    </Text>
                </View>

                <View style={styles.separator} />

                <Text style={styles.suggestionTitle}>Suggestion:</Text>
                <Text style={styles.suggestionText}>{result.suggestions}</Text>

                <TouchableOpacity style={styles.reportBtnContainer} onPress={handleGenerateReport}>
                    <LinearGradient
                        colors={[colors.primary, '#4CAF50']}
                        style={styles.reportBtnGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                    >
                        <Ionicons name="document-text-outline" size={20} color="#FFF" />
                        <Text style={styles.reportBtnText}>Generate Report</Text>
                        <MaterialCommunityIcons name="file-pdf-box" size={20} color="#FFF" />
                    </LinearGradient>
                </TouchableOpacity>
            </Animated.View>
        );
    }, [result, handleGenerateReport]);

    return (
        <>
            <ScrollView
                contentContainerStyle={[styles.container, result && styles.containerResult]}
                showsVerticalScrollIndicator={false}
            >
                {/* Header Section */}
                <Animated.View entering={FadeInDown.duration(400)} style={{ width: '100%' }}>
                    <LinearGradient
                        colors={[colors.primary, "#1B5E20"]}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.headerRow}
                    >
                        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonMini}>
                            <Ionicons name="arrow-back" size={24} color="#FFF" />
                        </TouchableOpacity>

                        <View style={styles.headerTitleWrap}>
                            <MaterialCommunityIcons name="image-search" size={24} color="rgba(255,255,255,0.9)" />
                            <View style={styles.headerTextWrap}>
                                <Text style={styles.headerWhite}>Rubber Sheet Grading</Text>
                                {!result && <Text style={styles.subHeaderWhite}>Detect defects & check quality</Text>}
                            </View>
                        </View>

                        <View style={styles.headerSpacer} />
                    </LinearGradient>
                </Animated.View>

                {/* Form Section with Card */}
                <View style={styles.formCard}>
                    <View style={styles.formTitleContainer}>
                        <MaterialCommunityIcons name="clipboard-text" size={24} color={colors.primary} />
                        <Text style={styles.formTitle}>Batch Information</Text>
                    </View>

                    <View style={styles.formGrid}>
                        <View style={styles.gridRow}>
                            <View style={styles.gridItem}>
                                <Text style={styles.label}>Batch ID</Text>
                                <View style={styles.inputContainer}>
                                    <MaterialCommunityIcons name="barcode" size={18} color={colors.gray} />
                                    <Text style={styles.readOnlyText}>{batchId}</Text>
                                </View>
                            </View>
                            <View style={styles.gridItem}>
                                <Text style={styles.label}>Category</Text>
                                <View style={styles.inputContainer}>
                                    <MaterialCommunityIcons name="tag" size={18} color={colors.gray} />
                                    <Text style={styles.readOnlyText}>{rubberCategory}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.gridRow}>
                            <View style={styles.gridItem}>
                                <Text style={styles.label}>Test Date</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="calendar" size={18} color={colors.gray} />
                                    <Text style={styles.readOnlyText}>{testDate}</Text>
                                </View>
                            </View>
                            <View style={styles.gridItem}>
                                <Text style={styles.label}>Test Time</Text>
                                <View style={styles.inputContainer}>
                                    <Ionicons name="time" size={18} color={colors.gray} />
                                    <Text style={styles.readOnlyText}>{testTime}</Text>
                                </View>
                            </View>
                        </View>

                        <View style={styles.gridRow}>
                            <View style={styles.fullWidthItem}>
                                <Text style={styles.label}>
                                    Tester Name <Text style={styles.requiredStar}>*</Text>
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <Ionicons name="person" size={20} color={colors.gray} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, testerNameError && styles.inputError]}
                                        value={testerName}
                                        onChangeText={handleTesterNameChange}
                                        onBlur={() => validateTesterName(testerName)}
                                        placeholder="Enter tester name"
                                        placeholderTextColor={colors.gray}
                                    />
                                </View>
                                {testerNameError ? (
                                    <View style={styles.errorContainer}>
                                        <Ionicons name="alert-circle" size={14} color={colors.error} />
                                        <Text style={styles.errorText}>{testerNameError}</Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>

                        <View style={styles.gridRow}>
                            <View style={styles.gridItem}>
                                <Text style={styles.label}>
                                    Sheet Count <Text style={styles.requiredStar}>*</Text>
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <MaterialCommunityIcons name="counter" size={20} color={colors.gray} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, sheetCountError && styles.inputError]}
                                        value={sheetCount}
                                        onChangeText={handleSheetCountChange}
                                        onBlur={() => validateSheetCount(sheetCount)}
                                        keyboardType="numeric"
                                        placeholder="Enter count"
                                        placeholderTextColor={colors.gray}
                                        maxLength={4}
                                    />
                                </View>
                                {sheetCountError ? (
                                    <View style={styles.errorContainer}>
                                        <Ionicons name="alert-circle" size={14} color={colors.error} />
                                        <Text style={styles.errorText}>{sheetCountError}</Text>
                                    </View>
                                ) : null}
                            </View>
                            <View style={styles.gridItem}>
                                <Text style={styles.label}>
                                    Weight (kg) <Text style={styles.requiredStar}>*</Text>
                                </Text>
                                <View style={styles.inputWrapper}>
                                    <MaterialCommunityIcons name="weight" size={20} color={colors.gray} style={styles.inputIcon} />
                                    <TextInput
                                        style={[styles.input, sheetWeightError && styles.inputError]}
                                        value={sheetWeight}
                                        onChangeText={handleSheetWeightChange}
                                        onBlur={() => validateSheetWeight(sheetWeight)}
                                        keyboardType="numeric"
                                        placeholder="Enter weight"
                                        placeholderTextColor={colors.gray}
                                    />
                                </View>
                                {sheetWeightError ? (
                                    <View style={styles.errorContainer}>
                                        <Ionicons name="alert-circle" size={14} color={colors.error} />
                                        <Text style={styles.errorText}>{sheetWeightError}</Text>
                                    </View>
                                ) : null}
                            </View>
                        </View>

                        <View style={styles.requiredFieldsNote}>
                            <MaterialCommunityIcons name="information" size={16} color={colors.gray} />
                            <Text style={styles.requiredNoteText}>
                                <Text style={styles.requiredStar}>*</Text> Required fields
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Image Section */}
                <View style={result ? styles.topRow : styles.centerContent}>
                    <View style={[styles.imageCard, result && styles.imageCardSmall]}>
                        {image ? (
                            <Image source={{ uri: image }} style={styles.previewImage} />
                        ) : (
                            <View style={styles.placeholder}>
                                <MaterialCommunityIcons name="image-off" size={60} color={colors.gray} />
                                <Text style={styles.placeholderText}>No Image Selected</Text>
                                <Text style={styles.placeholderSubText}>Tap buttons below to add</Text>
                            </View>
                        )}
                    </View>

                    <View style={result ? styles.controlsRight : styles.controlsCenter}>
                        <View style={result ? styles.buttonRowSmall : styles.buttonRow}>
                            <TouchableOpacity
                                style={[styles.actionBtn, result && styles.actionBtnSmall]}
                                onPress={pickImage}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#4A90E2', '#357ABD']}
                                    style={styles.actionBtnGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Ionicons name="images" size={result ? 20 : 24} color="#FFF" />
                                    {!result && <Text style={styles.btnText}>Gallery</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={[styles.actionBtn, result && styles.actionBtnSmall]}
                                onPress={takePhoto}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={['#4CAF50', '#45a049']}
                                    style={styles.actionBtnGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    <Ionicons name="camera" size={result ? 20 : 24} color="#FFF" />
                                    {!result && <Text style={styles.btnText}>Camera</Text>}
                                </LinearGradient>
                            </TouchableOpacity>
                        </View>

                        {image && (
                            <TouchableOpacity
                                style={[styles.analyzeBtn, result && styles.analyzeBtnSmall, loading && styles.disabledBtn]}
                                onPress={handleAnalyze}
                                disabled={loading}
                                activeOpacity={0.8}
                            >
                                <LinearGradient
                                    colors={loading ? ['#95A5A6', '#7F8C8D'] : ['#4CAF50', '#45a049']}
                                    style={styles.analyzeBtnGradient}
                                    start={{ x: 0, y: 0 }}
                                    end={{ x: 1, y: 0 }}
                                >
                                    {loading ? (
                                        <ActivityIndicator color="#FFF" />
                                    ) : (
                                        <>
                                            <MaterialCommunityIcons
                                                name="creation"
                                                size={result ? 18 : 22}
                                                color="#FFF"
                                            />
                                            <Text style={styles.analyzeText}>
                                                {result ? "Re-Analyze" : "Analyze Sheet"}
                                            </Text>
                                        </>
                                    )}
                                </LinearGradient>
                            </TouchableOpacity>
                        )}
                    </View>
                </View>

                {/* Result Section */}
                {renderResult()}
            </ScrollView>

            {/* Custom Validation Alert */}
            <ValidationAlert
                visible={alertVisible}
                title={alertTitle}
                message={alertMessage}
                errors={alertErrors}
                onClose={() => setAlertVisible(false)}
            />
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flexGrow: 1,
        backgroundColor: colors.lightGray,
        alignItems: 'center',
    },
    containerResult: {
        // Keeps center alignment consistent
    },

    headerContainer: {
        alignItems: 'center',
        marginBottom: 25,
        width: '100%',
    },
    header: {
        fontSize: 30,
        fontWeight: '800',
        color: colors.text,
        marginBottom: 6,
        textAlign: 'center',
        letterSpacing: 0.3,
    },
    headerSmall: {
        fontSize: 22,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 10,
        alignSelf: 'center',
        textAlign: 'center',
        width: '100%',
    },
    subHeader: {
        fontSize: 15,
        color: colors.gray,
        textAlign: 'center',
        marginTop: 4,
        letterSpacing: 0.2,
    },

    centerContent: {
        width: '90%',
        alignItems: 'center',
        marginTop: 10,
    },
    topRow: {
        flexDirection: 'row',
        width: '90%',
        alignItems: 'center',
        marginBottom: 25,
        marginTop: 5,
    },

    // Form Styles
    formCard: {
        width: '90%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 22,
        marginBottom: 28,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
    },
    formTitleContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 18,
        paddingBottom: 12,
        borderBottomWidth: 2,
        borderBottomColor: colors.lightGray,
    },
    formTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: colors.text,
        marginLeft: 8,
    },
    formGrid: {
        width: '100%',
    },
    gridRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 15,
    },
    gridItem: {
        width: '48.5%',
    },
    fullWidthItem: {
        width: '100%',
    },
    label: {
        fontSize: 14,
        color: colors.text,
        fontWeight: '600',
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    requiredStar: {
        color: colors.error,
        fontSize: 16,
        fontWeight: 'bold',
    },
    inputWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        position: 'relative',
    },
    inputIcon: {
        position: 'absolute',
        left: 12,
        zIndex: 1,
    },
    input: {
        backgroundColor: '#FFF',
        borderRadius: 12,
        padding: 14,
        paddingLeft: 42,
        borderColor: '#E0E0E0',
        borderWidth: 1.5,
        color: colors.text,
        fontSize: 15,
        width: '100%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    inputError: {
        borderColor: colors.error,
        borderWidth: 2,
    },
    errorContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 6,
        marginLeft: 4,
    },
    errorText: {
        color: colors.error,
        fontSize: 12,
        marginLeft: 4,
    },
    inputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F8F9FA',
        borderRadius: 12,
        padding: 14,
        borderColor: '#E0E0E0',
        borderWidth: 1.5,
        gap: 8,
    },
    readOnlyText: {
        color: colors.gray,
        fontSize: 15,
        fontWeight: '500',
        flex: 1,
    },
    requiredFieldsNote: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 10,
        paddingTop: 10,
        borderTopWidth: 1,
        borderTopColor: colors.lightGray,
        gap: 6,
    },
    requiredNoteText: {
        fontSize: 12,
        color: colors.gray,
        fontStyle: 'italic',
    },

    // Image Styles
    imageCard: {
        width: '100%',
        aspectRatio: 1,
        maxHeight: 350,
        borderRadius: 20,
        overflow: 'hidden',
        backgroundColor: '#FFF',
        justifyContent: 'center',
        alignItems: 'center',
        borderWidth: 2,
        borderColor: '#F0F0F0',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 8,
    },
    imageCardSmall: {
        width: 100,
        height: 100,
        borderRadius: 16,
        marginBottom: 0,
        marginRight: 15,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 6,
        elevation: 4,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        borderRadius: 18,
    },
    placeholder: {
        alignItems: 'center',
        padding: 20,
    },
    placeholderText: {
        marginTop: 12,
        color: colors.gray,
        fontSize: 16,
        fontWeight: '600',
    },
    placeholderSubText: {
        marginTop: 4,
        color: '#BBB',
        fontSize: 13,
    },

    // Controls Styles
    controlsCenter: {
        alignItems: 'center',
        width: '100%',
        marginTop: 20,
    },
    controlsRight: {
        flex: 1,
        alignItems: 'stretch',
        justifyContent: 'center',
    },
    buttonRow: {
        flexDirection: 'row',
        gap: 20,
        marginBottom: 25,
        width: '100%',
    },
    buttonRowSmall: {
        flexDirection: 'row',
        gap: 10,
        marginBottom: 12,
    },
    actionBtn: {
        flex: 1,
        height: 56,
        borderRadius: 14,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 6,
    },
    actionBtnSmall: {
        height: 48,
    },
    actionBtnGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
    },
    btnText: {
        color: '#FFF',
        fontWeight: '600',
        fontSize: 16,
        letterSpacing: 0.3,
    },
    analyzeBtn: {
        height: 60,
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.25,
        shadowRadius: 10,
        elevation: 8,
    },
    analyzeBtnSmall: {
        height: 52,
    },
    analyzeBtnGradient: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 10,
    },
    disabledBtn: {
        opacity: 0.7,
    },
    analyzeText: {
        color: '#FFF',
        fontSize: 18,
        fontWeight: 'bold',
        letterSpacing: 0.5,
    },

    // Result Styles
    resultCard: {
        width: '90%',
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 25,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.1,
        shadowRadius: 12,
        elevation: 10,
        borderLeftWidth: 6,
        borderLeftColor: colors.primary,
        marginTop: 10,
        marginBottom: 30,
    },
    badge: {
        flexDirection: 'row',
        alignSelf: 'flex-start',
        paddingVertical: 8,
        paddingHorizontal: 16,
        borderRadius: 20,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 3,
        gap: 6,
        alignItems: 'center',
    },
    badgeText: {
        color: '#FFF',
        fontSize: 13,
        fontWeight: '700',
        letterSpacing: 0.3,
    },
    resultTitle: {
        fontSize: 24,
        fontWeight: '800',
        color: '#2C3E50',
        marginBottom: 8,
        letterSpacing: 0.2,
    },
    confidence: {
        fontSize: 16,
        color: '#7F8C8D',
        marginBottom: 15,
        fontWeight: '500',
    },
    gradeContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 16,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(0,0,0,0.05)',
        gap: 8,
    },
    gradeLabel: {
        fontSize: 16,
        fontWeight: '600',
        marginRight: 4,
    },
    gradeValue: {
        fontSize: 20,
        fontWeight: '800',
        letterSpacing: 0.5,
    },
    separator: {
        height: 2,
        backgroundColor: '#F0F0F0',
        marginVertical: 20,
    },
    suggestionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2C3E50',
        marginBottom: 12,
        letterSpacing: 0.2,
    },
    suggestionText: {
        fontSize: 15,
        color: '#555',
        lineHeight: 24,
        marginBottom: 5,
    },
    headerRow: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 16,
        paddingTop: 40,
        paddingBottom: 15,
        borderBottomLeftRadius: 20,
        borderBottomRightRadius: 20,
        width: '100%',
        marginBottom: 10,
    },
    backButtonMini: {
        padding: 5,
    },
    headerTitleWrap: {
        flex: 1,
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
    },
    headerWhite: {
        fontSize: 22,
        fontWeight: '800',
        color: '#FFF',
    },
    subHeaderWhite: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
    },
    reportBtnContainer: {
        marginTop: 22,
        borderRadius: 16,
        overflow: 'hidden',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 6,
        elevation: 5,
    },
    reportBtnGradient: {
        height: 60,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 12,
    },
    reportBtnText: {
        color: '#FFF',
        fontWeight: '700',
        fontSize: 18,
    },
    headerTextWrap: {
        marginLeft: 10,
    },
    headerSpacer: {
        width: 34,
    },

    // Modal Styles
    modalOverlay: {
        flex: 1,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    modalContent: {
        backgroundColor: '#FFF',
        borderRadius: 24,
        padding: 24,
        width: '85%',
        maxWidth: 340,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.2,
        shadowRadius: 16,
        elevation: 10,
    },
    modalIconContainer: {
        marginBottom: 16,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: '700',
        color: colors.text,
        marginBottom: 12,
        textAlign: 'center',
    },
    modalMessage: {
        fontSize: 15,
        color: colors.gray,
        textAlign: 'center',
        marginBottom: 20,
        lineHeight: 22,
    },
    modalErrorsContainer: {
        width: '100%',
        marginBottom: 20,
    },
    modalErrorItem: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        gap: 8,
    },
    modalErrorText: {
        fontSize: 14,
        color: colors.text,
        flex: 1,
    },
    modalButtonContainer: {
        width: '100%',
        borderRadius: 16,
        overflow: 'hidden',
    },
    modalButton: {
        height: 50,
        flexDirection: 'row',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 8,
    },
    modalButtonText: {
        color: '#FFF',
        fontSize: 16,
        fontWeight: '600',
    },
});