import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert, ScrollView, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../../../shared/styles/colors';
import { BiddingService } from '../services/biddingService';

export const PlaceBidConfirmScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { id, title, currentPrice, quantityKg, prefilledAmount } = route.params || {
        id: '1',
        title: "Premium RSS1 Rubber - Kalutara District",
        currentPrice: 595,
        quantityKg: 2500,
        prefilledAmount: "1000"
    };

    const [bidAmount, setBidAmount] = useState(prefilledAmount || '1000');
    const [totalAmount, setTotalAmount] = useState(0);
    const [isLoading, setIsLoading] = useState(false);

    useEffect(() => {
        const bid = parseFloat(bidAmount) || 0;
        setTotalAmount(bid * quantityKg);
    }, [bidAmount]);

    const handleConfirm = async () => {
        setIsLoading(true);
        try {
            await BiddingService.submitBid(id, parseFloat(bidAmount));
            if (parseFloat(bidAmount) > currentPrice) {
                Alert.alert(
                    "Bid Submitted",
                    "Your bid was successfully placed!",
                    [{ text: "OK", onPress: () => navigation.goBack() }]
                );
            } else {
                Alert.alert("Invalid Bid", "Bid must be greater than current price.");
            }
        } catch (error) {
            console.error(error);
            Alert.alert("Error", "Failed to connect to the bidding server.");
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <View style={styles.overlay}>
            <View style={styles.modal}>
                {/* Header */}
                <View style={styles.modalHeader}>
                    <Text style={styles.modalTitle}>Place Your Bid</Text>
                    <TouchableOpacity onPress={() => navigation.goBack()}>
                        <Ionicons name="close" size={24} color="#333" />
                    </TouchableOpacity>
                </View>

                <ScrollView showsVerticalScrollIndicator={false}>
                    {/* Auction Title */}
                    <Text style={styles.sectionLabel}>Auction</Text>
                    <Text style={styles.auctionTitle}>{title}</Text>

                    {/* Pricing Info */}
                    <View style={styles.priceGrid}>
                        <View style={styles.priceItem}>
                            <Text style={styles.priceLabel}>Current Price</Text>
                            <Text style={styles.currentPriceValue}>LKR {currentPrice}/kg</Text>
                        </View>
                        <View style={styles.priceItem}>
                            <Text style={styles.priceLabel}>Minimum Bid</Text>
                            <Text style={styles.minBidValue}>LKR {currentPrice + 5}/kg</Text>
                        </View>
                    </View>

                    {/* Quick Bid Options */}
                    <Text style={styles.sectionLabel}>Quick Bid Options</Text>
                    <View style={styles.quickBidRow}>
                        <TouchableOpacity style={styles.quickBidBtn} onPress={() => setBidAmount((currentPrice + 5).toString())}>
                            <Text style={styles.quickBidTop}>Min Bid</Text>
                            <Text style={styles.quickBidBottom}>LKR {currentPrice + 5}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickBidBtn} onPress={() => setBidAmount((currentPrice + 15).toString())}>
                            <Text style={styles.quickBidTop}>+3x</Text>
                            <Text style={styles.quickBidBottom}>LKR {currentPrice + 15}</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={styles.quickBidBtn} onPress={() => setBidAmount((currentPrice + 25).toString())}>
                            <Text style={styles.quickBidTop}>+5x</Text>
                            <Text style={styles.quickBidBottom}>LKR {currentPrice + 25}</Text>
                        </TouchableOpacity>
                    </View>

                    {/* Custom Amount */}
                    <Text style={styles.sectionLabel}>Or Enter Custom Amount (per kg)</Text>
                    <View style={styles.inputRow}>
                        <Text style={styles.currencyPrefix}>LKR</Text>
                        <TextInput
                            style={styles.input}
                            value={bidAmount}
                            onChangeText={setBidAmount}
                            keyboardType="numeric"
                        />
                        <Text style={styles.unitSuffix}>/kg</Text>
                    </View>

                    {/* Summary Card */}
                    <View style={styles.summaryCard}>
                        <View style={styles.summaryGrid}>
                            <View>
                                <Text style={styles.summaryLabel}>Your Bid per kg</Text>
                                <Text style={styles.summaryValue}>LKR {parseFloat(bidAmount || '0').toFixed(2)}</Text>
                            </View>
                            <View>
                                <Text style={styles.summaryLabel}>Total Amount</Text>
                                <Text style={styles.totalValue}>LKR {totalAmount.toLocaleString()}</Text>
                            </View>
                        </View>
                        <Text style={styles.summaryDetail}>for {quantityKg.toLocaleString()} kg @ LKR {parseFloat(bidAmount || '0').toFixed(2)}/kg</Text>
                    </View>
                </ScrollView>

                {/* Footer Buttons */}
                <View style={styles.footer}>
                    <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()} disabled={isLoading}>
                        <Text style={styles.cancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[styles.confirmBtn, isLoading && { opacity: 0.7 }]} onPress={handleConfirm} disabled={isLoading}>
                        <Ionicons name="cash-outline" size={20} color="#FFF" style={{ marginRight: 8 }} />
                        <Text style={styles.confirmText}>{isLoading ? "Processing..." : "Confirm Bid"}</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </View>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'center',
        padding: 20
    },
    modal: {
        backgroundColor: '#FFF',
        borderRadius: 20,
        padding: 24,
        maxHeight: '85%'
    },
    modalHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: 25
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#333'
    },
    sectionLabel: {
        fontSize: 14,
        color: '#718096',
        marginBottom: 8
    },
    auctionTitle: {
        fontSize: 18,
        fontWeight: '500',
        color: '#2D3748',
        marginBottom: 20
    },
    priceGrid: {
        flexDirection: 'row',
        marginBottom: 25
    },
    priceItem: {
        flex: 1
    },
    priceLabel: {
        fontSize: 14,
        color: '#718096',
        marginBottom: 6
    },
    currentPriceValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#48BB78'
    },
    minBidValue: {
        fontSize: 22,
        fontWeight: '600',
        color: '#2D3748'
    },
    quickBidRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 25
    },
    quickBidBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 10,
        alignItems: 'center',
        marginHorizontal: 4
    },
    quickBidTop: {
        fontSize: 14,
        fontWeight: 'bold',
        color: '#2D3748'
    },
    quickBidBottom: {
        fontSize: 12,
        color: '#4A5568',
        marginTop: 2
    },
    inputRow: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#F7FAFC',
        borderRadius: 12,
        paddingHorizontal: 15,
        marginBottom: 25
    },
    currencyPrefix: {
        fontSize: 16,
        color: '#4A5568',
        marginRight: 10
    },
    input: {
        flex: 1,
        height: 50,
        fontSize: 18,
        fontWeight: '500'
    },
    unitSuffix: {
        fontSize: 16,
        color: '#4A5568',
        marginLeft: 10
    },
    summaryCard: {
        backgroundColor: '#EBF8FF',
        borderRadius: 12,
        padding: 20,
        borderWidth: 1,
        borderColor: '#BEE3F8',
        marginBottom: 25
    },
    summaryGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 10
    },
    summaryLabel: {
        fontSize: 12,
        color: '#4A5568',
        marginBottom: 4
    },
    summaryValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#2D3748'
    },
    totalValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#3182CE'
    },
    summaryDetail: {
        fontSize: 12,
        color: '#718096'
    },
    footer: {
        flexDirection: 'row',
        gap: 12
    },
    cancelBtn: {
        flex: 1,
        borderWidth: 1,
        borderColor: '#E2E8F0',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center'
    },
    cancelText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#2D3748'
    },
    confirmBtn: {
        flex: 1.5,
        flexDirection: 'row',
        backgroundColor: '#2962FF',
        borderRadius: 12,
        paddingVertical: 14,
        alignItems: 'center',
        justifyContent: 'center'
    },
    confirmText: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#FFF'
    }
});
