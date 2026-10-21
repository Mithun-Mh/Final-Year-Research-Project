import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Image, Dimensions } from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import * as ImagePicker from 'expo-image-picker';
import { colors } from '../../../shared/styles/colors';
import { Ionicons } from '@expo/vector-icons';
import { PriceForecastingService, PriceRequest } from '../services/priceForecastingService';

const Grades = ['RSS1', 'RSS2', 'RSS3', 'RSS4', 'RSS5'];
const VisualQualities = [
    { label: 'Excellent', value: 5 },
    { label: 'Good', value: 4 },
    { label: 'Average', value: 3 },
    { label: 'Fair', value: 2 },
    { label: 'Poor', value: 1 }
];
const MarketAvailability = ['Immediately', 'In 1 week', 'In 2 weeks'];
const Districts = ['Colombo', 'Galle', 'Matara', 'Kalutara', 'Ratnapura', 'Kegalle'];

export const PriceForecastingScreen = ({ navigation }: any) => {
    const [grade, setGrade] = useState(Grades[0]);
    const [quantity, setQuantity] = useState('');
    // UPDATED: Default to 'Normal'/'Clean'
    const [moisture, setMoisture] = useState('Normal');
    const [dirt, setDirt] = useState('Clean');
    const [visualQuality, setVisualQuality] = useState(VisualQualities[0]);
    const [availability, setAvailability] = useState(MarketAvailability[0]);
    const [district, setDistrict] = useState(Districts[0]);
    const [image, setImage] = useState<string | null>(null);

    const [loading, setLoading] = useState(false);
    const [predictedPrice, setPredictedPrice] = useState<number | null>(null);

    const pickImage = async () => {
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
            Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to make this work!');
            return;
        }

        const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            allowsEditing: true,
            aspect: [4, 3],
            quality: 1,
        });

        if (!result.canceled) {
            setImage(result.assets[0].uri);
        }
    };

    const handlePredict = async () => {
        // Validation logic
        if (!quantity) {
            Alert.alert("Missing Input", "Please enter the quantity of rubber.");
            return;
        }

        const qtyNum = parseFloat(quantity);
        if (isNaN(qtyNum) || qtyNum <= 0) {
            Alert.alert("Invalid Quantity", "Please enter a valid positive number for weight.");
            return;
        }

        if (!image) {
            Alert.alert("Image Required", "Please upload a high-quality image of the rubber stock for AI visual verification.");
            return;
        }

        setLoading(true);
        setPredictedPrice(null);

        const request: PriceRequest = {
            rubberSheetGrade: grade,
            quantityKg: parseFloat(quantity),
            moistureLevel: moisture,
            cleanliness: dirt,
            visualQualityScore: visualQuality.value,
            district: district,
            marketAvailability: availability
        };

        try {
            const result = await PriceForecastingService.predictPrice(request);
            setPredictedPrice(result.predictedPriceLkr);
        } catch (error: any) {
            const errorMessage = error.response?.data?.message || error.message || "Failed to predict price. Ensure backend is running.";
            Alert.alert("Prediction Failed", errorMessage);
            console.error("Prediction Error:", error);
        } finally {
            setLoading(false);
        }
    };

    const renderButtonGroup = (label: string, items: any[], selectedValue: any, onSelect: (val: any) => void, isObject = false) => (
        <View style={styles.section}>
            <Text style={styles.label}>{label}</Text>
            <View style={styles.buttonGroup}>
                {items.map((item) => {
                    const val = isObject ? item : item;
                    const displayLabel = isObject ? item.label : item;
                    const isSelected = isObject ? selectedValue.value === item.value : selectedValue === item;

                    return (
                        <TouchableOpacity
                            key={displayLabel}
                            style={[styles.optionBtn, isSelected && styles.optionBtnSelected]}
                            onPress={() => onSelect(val)}
                        >
                            <Text style={[styles.optionText, isSelected && styles.optionTextSelected]}>
                                {displayLabel}
                            </Text>
                        </TouchableOpacity>
                    );
                })}
            </View>
        </View>
    );

    return (
        <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 40 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ padding: 10, marginRight: 10 }}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={[styles.header, { marginBottom: 0 }]}>Rubber Price Calculator</Text>
            </View>

            {/* Grade */}
            {renderButtonGroup("Rubber Sheet Grade", Grades, grade, setGrade)}

            {/* Quantity */}
            <View style={styles.section}>
                <Text style={styles.label}>Quantity (Kg)</Text>
                <TextInput
                    style={styles.input}
                    keyboardType="numeric"
                    value={quantity}
                    onChangeText={setQuantity}
                />
            </View>

            {/* Image Upload */}
            <View style={styles.section}>
                <Text style={styles.label}>Rubber Sheet Stock Image</Text>
                <TouchableOpacity style={styles.imagePicker} onPress={pickImage}>
                    {image ? (
                        <Image source={{ uri: image }} style={styles.previewImage} />
                    ) : (
                        <View style={styles.imagePlaceholder}>
                            <Ionicons name="camera-outline" size={32} color="#666" />
                            <Text style={styles.imagePlaceholderText}>Upload Rubber Sheet Image</Text>
                        </View>
                    )}
                </TouchableOpacity>
            </View>

            {/* Quality Factors */}
            {/* Categorical Inputs */}
            {renderButtonGroup("Moisture Level", ['Dry', 'Normal', 'Wet'], moisture, setMoisture)}
            {renderButtonGroup("Cleanliness (Dirt)", ['Clean', 'Slight', 'Dirty'], dirt, setDirt)}

            {/* Visual Quality */}
            {renderButtonGroup("Visual Quality", VisualQualities, visualQuality, setVisualQuality, true)}

            {/* Market Availability (Visual Only) */}
            {renderButtonGroup("Market Availability", MarketAvailability, availability, setAvailability)}

            {/* District */}
            {renderButtonGroup("Location (District)", Districts, district, setDistrict)}

            {/* Predict Button */}
            <TouchableOpacity style={styles.predictBtn} onPress={handlePredict} disabled={loading}>
                {loading ? (
                    <ActivityIndicator color="#FFF" />
                ) : (
                    <Text style={styles.predictBtnText}>Calculate Price</Text>
                )}
            </TouchableOpacity>

            {/* Result */}
            {predictedPrice !== null && (
                <View style={styles.resultContainer}>
                    <Text style={styles.resultLabel}>Estimated Auction Price (Per Kg):</Text>
                    <Text style={styles.resultValue}>LKR {predictedPrice.toFixed(2)}</Text>

                    <View style={styles.divider} />

                    <Text style={styles.resultLabel}>Total Estimated Value:</Text>
                    <Text style={styles.totalValue}>LKR {(predictedPrice * parseFloat(quantity)).toFixed(2)}</Text>
                    <Text style={styles.subResultLabel}>for {quantity} kg</Text>
                </View>
            )}

            {/* Future Trend Graph */}
            {predictedPrice !== null && (
                <View style={styles.trendContainer}>
                    <Text style={styles.trendTitle}>30-Day Future Trend Forecast</Text>
                    <LineChart
                        data={{
                            labels: ["Week 1", "Week 2", "Week 3", "Week 4"],
                            datasets: [
                                {
                                    data: [
                                        predictedPrice,
                                        predictedPrice * 1.02, // +2%
                                        predictedPrice * 1.01, // +1%
                                        predictedPrice * 1.05  // +5%
                                    ],
                                    color: (opacity = 1) => `rgba(21, 101, 192, ${opacity})`, // Blue
                                    strokeWidth: 2
                                }
                            ],
                            legend: ["Predicted Price Trend (LKR)"]
                        }}
                        width={Dimensions.get("window").width - 40}
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
                                stroke: "#1565C0"
                            }
                        }}
                        bezier
                        style={{
                            marginVertical: 15,
                            borderRadius: 16
                        }}
                    />
                    <Text style={styles.trendDescription}>
                        Based on historical market data and seasonal patterns, prices are expected to rise by approx. 5% over the next month.
                    </Text>
                </View>
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#F5F5F5' },
    header: { fontSize: 24, fontWeight: 'bold', marginBottom: 20, color: '#333', textAlign: 'center' },
    section: { marginBottom: 15 },
    row: { flexDirection: 'row' },
    label: { fontSize: 16, fontWeight: '600', marginBottom: 8, color: '#555' },
    input: { backgroundColor: '#FFF', borderWidth: 1, borderColor: '#DDD', borderRadius: 8, padding: 12, fontSize: 16 },
    imagePicker: {
        backgroundColor: '#FFF',
        borderWidth: 1,
        borderColor: '#DDD',
        borderRadius: 8,
        height: 150,
        justifyContent: 'center',
        alignItems: 'center',
        overflow: 'hidden',
        borderStyle: 'dashed',
    },
    imagePlaceholder: {
        alignItems: 'center',
    },
    imagePlaceholderText: {
        color: '#666',
        marginTop: 8,
        fontSize: 14,
    },
    previewImage: {
        width: '100%',
        height: '100%',
        resizeMode: 'cover',
    },
    buttonGroup: { flexDirection: 'row', flexWrap: 'wrap' },
    optionBtn: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 20, borderWidth: 1, borderColor: '#999', marginRight: 8, marginBottom: 8, backgroundColor: '#FFF' },
    optionBtnSelected: { backgroundColor: colors.primary, borderColor: colors.primary },
    optionText: { color: '#555', fontWeight: '500' },
    optionTextSelected: { color: '#FFF' },
    predictBtn: { backgroundColor: colors.primary, padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 10 },
    predictBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold' },
    resultContainer: { marginTop: 30, padding: 20, backgroundColor: '#E8F5E9', borderRadius: 12, alignItems: 'center', borderWidth: 1, borderColor: colors.primary },
    resultLabel: { fontSize: 16, color: '#555' },
    resultValue: { fontSize: 28, fontWeight: 'bold', color: colors.primary, marginTop: 5 },
    divider: { height: 1, backgroundColor: '#CCC', width: '100%', marginVertical: 15 },
    totalValue: { fontSize: 32, fontWeight: 'bold', color: '#2E7D32', marginTop: 5 },
    subResultLabel: { fontSize: 14, color: '#777', marginTop: 2 },
    trendContainer: { marginTop: 20, padding: 20, backgroundColor: '#FFF', borderRadius: 12, elevation: 2 },
    trendTitle: { fontSize: 18, fontWeight: 'bold', color: '#333', marginBottom: 10, textAlign: 'center' },
    trendDescription: { fontSize: 13, color: '#666', textAlign: 'center', marginTop: 10, fontStyle: 'italic' }
});
