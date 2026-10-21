
import React, { useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BlockchainService } from '../services/blockchainService';
import { BiddingService } from '../services/biddingService';

export const CreateLotScreen = () => {
    const navigation = useNavigation<any>();
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        grade: 'RSS1',
        weight: '',
        location: '',
        moisture: 'Normal',
        cleanliness: 'Clean',
        durationHours: 1
    });

    const handleMint = async () => {
        // Validation logic
        if (!formData.weight) {
            Alert.alert("Missing Input", "Please enter the weight of the rubber lot.");
            return;
        }

        const weightNum = parseFloat(formData.weight);
        if (isNaN(weightNum) || weightNum <= 0) {
            Alert.alert("Invalid Weight", "Please enter a valid weight in kilograms.");
            return;
        }

        if (!formData.location || formData.location.trim().length < 3) {
            Alert.alert("Location Required", "Please enter a valid production location (e.g., Kalutara).");
            return;
        }

        setLoading(true);
        try {
            const txHash = await BlockchainService.mintLotNFT(formData);
            const ipfsHash = await BlockchainService.uploadToIPFS({ ...formData, type: 'LotMetadata' });

            // Generate a real Auction in the backend
            const endDate = new Date();
            endDate.setMinutes(endDate.getMinutes() + (formData.durationHours * 60)); // Auction runs for selected duration

            // Assume default standard starting price based on grade for now
            let startingPrice = 400;
            if (formData.grade === 'RSS1') startingPrice = 450;
            else if (formData.grade === 'RSS2') startingPrice = 430;

            await BiddingService.createAuction({
                title: `${formData.grade} Quality Rubber - ${formData.location}`,
                subtitle: `NFT Verified - Moisture: ${formData.moisture}, Cleanliness: ${formData.cleanliness}`,
                grade: formData.grade,
                startingPrice: startingPrice,
                minIncrement: 5,
                quantityKg: parseInt(formData.weight.replace(/[^0-9]/g, '')) || 0,
                endTime: endDate.toISOString(),
                lotId: txHash // using txHash as rough LotId for NFT linkage mock
            });

            Alert.alert(
                "Success",
                `Lot NFT Passport Minted & Auction Created!\n\nTX: ${txHash.slice(0, 10)}...\nIPFS: ${ipfsHash.slice(0, 10)}...`,
                [{ text: "OK", onPress: () => navigation.goBack() }]
            );
        } catch (error) {
            Alert.alert("Error", "Failed to mint NFT or create Auction. Please try again.");
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <ScrollView style={styles.container}>
            <LinearGradient
                colors={['#1B5E20', '#2E7D32']}
                style={styles.header}
            >
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Register New Lot</Text>
                <Text style={styles.headerSubtitle}>Create NFT Digital Passport for your Rubber Lot</Text>
            </LinearGradient>

            <View style={styles.formCard}>
                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Rubber Grade</Text>
                    <View style={styles.pickerContainer}>
                        {['RSS1', 'RSS2', 'RSS3', 'RSS4', 'RSS5'].map((grade) => (
                            <TouchableOpacity
                                key={grade}
                                style={[styles.gradeOption, formData.grade === grade && styles.activeGrade]}
                                onPress={() => setFormData({ ...formData, grade })}
                            >
                                <Text style={[styles.gradeText, formData.grade === grade && styles.activeGradeText]}>{grade}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Weight (kg)</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. 2500"
                        keyboardType="numeric"
                        value={formData.weight}
                        onChangeText={(v) => setFormData({ ...formData, weight: v })}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Production Location</Text>
                    <TextInput
                        style={styles.input}
                        placeholder="e.g. Kalutara"
                        value={formData.location}
                        onChangeText={(v) => setFormData({ ...formData, location: v })}
                    />
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Moisture Level</Text>
                    <View style={styles.selectRow}>
                        {['Dry', 'Normal', 'Wet'].map(m => (
                            <TouchableOpacity
                                key={m}
                                style={[styles.selectBtn, formData.moisture === m && styles.activeSelect]}
                                onPress={() => setFormData({ ...formData, moisture: m })}
                            >
                                <Text style={[styles.selectText, formData.moisture === m && styles.activeSelectText]}>{m}</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.inputGroup}>
                    <Text style={styles.label}>Auction Duration</Text>
                    <View style={styles.selectRow}>
                        {[1, 2, 4, 12, 24].map(h => (
                            <TouchableOpacity
                                key={h}
                                style={[styles.selectBtn, formData.durationHours === h && styles.activeSelect]}
                                onPress={() => setFormData({ ...formData, durationHours: h })}
                            >
                                <Text style={[styles.selectText, formData.durationHours === h && styles.activeSelectText]}>{h}h</Text>
                            </TouchableOpacity>
                        ))}
                    </View>
                </View>

                <View style={styles.blockchainInfo}>
                    <Ionicons name="shield-checkmark-outline" size={20} color="#2E7D32" />
                    <Text style={styles.blockchainInfoText}>
                        This data will be recorded on the Ethereum blockchain and stored decentrally on IPFS for immutability and transparency.
                    </Text>
                </View>

                <TouchableOpacity
                    style={[styles.mintBtn, loading && styles.disabledBtn]}
                    onPress={handleMint}
                    disabled={loading}
                >
                    {loading ? (
                        <ActivityIndicator color="#FFF" />
                    ) : (
                        <>
                            <Ionicons name="cube-outline" size={20} color="#FFF" />
                            <Text style={styles.mintBtnText}>Mint NFT Passport</Text>
                        </>
                    )}
                </TouchableOpacity>
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { padding: 25, paddingTop: 60, paddingBottom: 40, borderBottomLeftRadius: 30, borderBottomRightRadius: 30 },
    backBtn: { marginBottom: 15 },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#FFF' },
    headerSubtitle: { fontSize: 14, color: 'rgba(255,255,255,0.8)', marginTop: 5 },
    formCard: { backgroundColor: '#FFF', margin: 20, marginTop: -20, borderRadius: 20, padding: 20, elevation: 4 },
    inputGroup: { marginBottom: 20 },
    label: { fontSize: 14, fontWeight: '600', color: '#444', marginBottom: 10 },
    input: { backgroundColor: '#F9FAFB', borderWidth: 1, borderColor: '#EEE', borderRadius: 12, padding: 15, fontSize: 16 },
    pickerContainer: { flexDirection: 'row', flexWrap: 'wrap' },
    gradeOption: { paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10, borderWidth: 1, borderColor: '#EEE', marginRight: 10, marginBottom: 10 },
    activeGrade: { backgroundColor: '#2E7D32', borderColor: '#2E7D32' },
    gradeText: { color: '#666', fontWeight: 'bold' },
    activeGradeText: { color: '#FFF' },
    selectRow: { flexDirection: 'row', justifyContent: 'space-between' },
    selectBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderWidth: 1, borderColor: '#EEE', borderRadius: 10, marginHorizontal: 4 },
    activeSelect: { backgroundColor: '#E8F5E9', borderColor: '#2E7D32' },
    selectText: { color: '#666', fontWeight: '500' },
    activeSelectText: { color: '#2E7D32', fontWeight: 'bold' },
    blockchainInfo: { flexDirection: 'row', padding: 15, backgroundColor: '#F1F8E9', borderRadius: 12, marginBottom: 25, alignItems: 'center' },
    blockchainInfoText: { flex: 1, fontSize: 12, color: '#2E7D32', marginLeft: 10, lineHeight: 18 },
    mintBtn: { flexDirection: 'row', backgroundColor: '#333', paddingVertical: 16, borderRadius: 15, justifyContent: 'center', alignItems: 'center' },
    disabledBtn: { opacity: 0.7 },
    mintBtnText: { color: '#FFF', fontSize: 18, fontWeight: 'bold', marginLeft: 10 }
});
