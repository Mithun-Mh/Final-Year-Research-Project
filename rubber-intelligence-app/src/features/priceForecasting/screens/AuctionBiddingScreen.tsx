import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Dimensions, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation, useFocusEffect } from '@react-navigation/native';
import { useStore } from '../../../store';
import { colors } from '../../../shared/styles/colors';
import { BiddingService, BiddingAuction } from '../services/biddingService';
import * as signalR from '@microsoft/signalr';
import { ENV } from '../../../core/config/environment';

const SCREEN_WIDTH = Dimensions.get("window").width;

export const AuctionBiddingScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { id } = route.params || {};
    const { user } = useStore();
    const role = user?.role || 'buyer'; // default to buyer for testing if null

    const [auctionData, setAuctionData] = useState<BiddingAuction | null>(null);
    const [loading, setLoading] = useState(true);
    const [timeLeftSeconds, setTimeLeftSeconds] = useState(0);

    const loadAuction = async (isSilent = false) => {
        if (!id || id === '1') {
            setLoading(false);
            return;
        }
        try {
            if (!isSilent) setLoading(true);
            const data = await BiddingService.getAuctionById(id);
            setAuctionData(data);

            // Calculate time left from data.endTime
            if (data.endTime) {
                // Safely extract just the YYYY-MM-DDTHH:mm:ss part to avoid Hermes NaN issues with fractional seconds
                const cleanStr = data.endTime.substring(0, 19);
                // Ensure it parses as local time if no Z is present, though we can just attach Z if assuming UTC
                const end = new Date(cleanStr + "Z").getTime();
                const now = new Date().getTime();
                const diffSeconds = Math.max(0, Math.floor((end - now) / 1000));
                setTimeLeftSeconds(diffSeconds);
            }
        } catch (error) {
            console.error("Failed to load auction", error);
        } finally {
            if (!isSilent) setLoading(false);
        }
    };

    useFocusEffect(
        React.useCallback(() => {
            loadAuction();
        }, [id])
    );

    // SignalR real-time connection
    useEffect(() => {
        if (!id || id === '1') return;

        const connection = new signalR.HubConnectionBuilder()
            .withUrl(`${ENV.API_URL.replace(/\/api\/?$/, '')}/hubs/auction`)
            .withAutomaticReconnect()
            .build();

        connection.start()
            .then(() => {
                console.log('Connected to AuctionHub');
                connection.invoke('JoinAuctionGroup', id);
            })
            .catch(err => console.error('SignalR Connection Error: ', err));

        connection.on('ReceiveBid', (bid: any) => {
            setAuctionData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    currentPrice: bid.amount,
                    highestBidder: bid.bidderName,
                    totalBids: prev.totalBids + 1
                };
            });
        });

        connection.on('AuctionClosed', (auctionId: string, winnerName: string, winningAmount: number) => {
            setAuctionData(prev => {
                if (!prev) return prev;
                return {
                    ...prev,
                    status: 'Closed',
                    highestBidder: winnerName || 'No Winner',
                    currentPrice: winningAmount || prev.currentPrice
                };
            });
            setTimeLeftSeconds(0);
        });

        return () => {
            if (connection.state === signalR.HubConnectionState.Connected) {
                connection.invoke('LeaveAuctionGroup', id).then(() => connection.stop());
            }
        };
    }, [id]);

    // Derived state for easy rendering
    const isLive = timeLeftSeconds > 0 && auctionData?.status !== 'Closed';

    const formatTime = (totalSeconds: number) => {
        if (totalSeconds <= 0 || auctionData?.status === 'Closed') return "Auction Closed";

        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        const seconds = totalSeconds % 60;

        if (hours > 0) {
            return `${hours}h ${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
        }
        return `${minutes}m ${seconds < 10 ? '0' : ''}${seconds}s`;
    };

    useEffect(() => {
        if (!isLive) return;

        const interval = setInterval(() => {
            setTimeLeftSeconds(prev => {
                if (prev <= 1) {
                    clearInterval(interval);
                    return 0;
                }
                return prev - 1;
            });
        }, 1000);

        return () => clearInterval(interval);
    }, [isLive]);

    const timeLeftStr = formatTime(timeLeftSeconds);

    if (loading) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <ActivityIndicator size="large" color={colors.primary} />
            </View>
        );
    }

    if (!id || id === '1') {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
                <Ionicons name="alert-circle-outline" size={48} color="#CCC" />
                <Text style={{ marginTop: 10, color: '#666' }}>Invalid Auction ID.</Text>
                <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginTop: 20 }}>
                    <Text style={{ color: colors.primary }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    if (!auctionData) {
        return (
            <View style={[styles.container, { justifyContent: 'center', alignItems: 'center', padding: 20 }]}>
                <Ionicons name="warning-outline" size={64} color="#CCC" style={{ marginBottom: 15 }} />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#333' }}>Auction Not Found</Text>
                <Text style={{ fontSize: 14, color: '#666', textAlign: 'center', marginTop: 10, marginBottom: 20 }}>
                    We couldn't load the details for this auction. It might have been removed or the ID is invalid.
                </Text>
                <TouchableOpacity
                    style={{ paddingHorizontal: 20, paddingVertical: 10, backgroundColor: colors.primary, borderRadius: 8 }}
                    onPress={() => navigation.goBack()}
                >
                    <Text style={{ color: '#FFF', fontWeight: 'bold' }}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    return (
        <ScrollView style={styles.container}>
            {/* Header / Back */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Auction Details</Text>
            </View>

            {/* Auction Info Card */}
            <View style={styles.mainCard}>
                <View style={styles.tagSection}>
                    <View style={[styles.liveBadge, !isLive && { backgroundColor: '#FFEBEE' }]}>
                        <View style={[styles.liveDot, !isLive && { backgroundColor: '#F44336' }]} />
                        <Text style={[styles.liveText, !isLive && { color: '#F44336' }]}>{isLive ? 'Live' : 'Closed'}</Text>
                    </View>
                    <View style={styles.gradeBadge}>
                        <Text style={styles.gradeText}>{auctionData.grade}</Text>
                    </View>
                    {role === 'farmer' && auctionData.isNftSecured && (
                        <View style={styles.nftBadge}>
                            <Ionicons name="shield-checkmark" size={12} color="#2E7D32" />
                            <Text style={styles.nftBadgeText}>NFT Secured</Text>
                        </View>
                    )}
                    {auctionData.esgScore !== undefined && (
                        <View style={[styles.nftBadge, { backgroundColor: '#E3F2FD', marginLeft: 8 }]}>
                            <Ionicons name="leaf" size={12} color="#1565C0" />
                            <Text style={[styles.nftBadgeText, { color: '#1565C0' }]}>ESG Score: {auctionData.esgScore}/100</Text>
                        </View>
                    )}
                </View>

                <Text style={styles.title}>{auctionData.title}</Text>
                <Text style={styles.subtitle}>{auctionData.subtitle}</Text>

                {/* Winner Banner for Closed Auctions */}
                {auctionData.status === 'Closed' && (
                    <View style={styles.winnerBanner}>
                        <Ionicons name={auctionData.highestBidder === 'No Winner' ? "close-circle-outline" : "trophy"} size={24} color={auctionData.highestBidder === 'No Winner' ? "#F44336" : "#FFC107"} style={{ marginRight: 10 }} />
                        <View style={{ flex: 1 }}>
                            <Text style={styles.winnerBannerText}>
                                {auctionData.highestBidder === 'No Winner' ? "Auction Ended With No Winner" : "Auction Winner!"}
                            </Text>
                            {auctionData.highestBidder !== 'No Winner' && (
                                <Text style={styles.winnerBannerSubtext}>
                                    {auctionData.highestBidder} won with a bid of LKR {auctionData.currentPrice}/kg
                                </Text>
                            )}
                        </View>
                    </View>
                )}

                {/* Timer Section */}
                <View style={styles.timerSection}>
                    <View style={styles.timerHeader}>
                        <Text style={styles.timerLabel}>Time Remaining</Text>
                        <View style={styles.timerValueRow}>
                            <Ionicons name="time-outline" size={16} color={isLive ? "#FF6D00" : "#F44336"} />
                            <Text style={[styles.timerValue, !isLive && { color: '#F44336' }]}>{timeLeftStr}</Text>
                        </View>
                    </View>
                    <View style={styles.progressBarBg}>
                        <View style={[styles.progressBarFill, { width: `${auctionData.progress * 100}%` }]} />
                    </View>
                </View>

                {/* Price & Quantity Grid */}
                <View style={styles.statsGrid}>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Current Price</Text>
                        <Text style={styles.currentPriceText}>LKR {auctionData.currentPrice}/kg</Text>
                    </View>
                    <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Quantity</Text>
                        <Text style={styles.statValueText}>{auctionData.quantity}</Text>
                    </View>
                </View>

                {/* Detailed Info */}
                <View style={styles.infoList}>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Seller:</Text>
                        <Text style={styles.infoValue}>{auctionData.seller}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Highest Bidder:</Text>
                        <Text style={styles.infoValue}>{auctionData.highestBidder}</Text>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Total Bids:</Text>
                        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                            <Text style={styles.infoValue}>{auctionData.totalBids} </Text>
                            <TouchableOpacity onPress={() => navigation.navigate('AuctionHistory')}>
                                <Text style={styles.viewHistoryText}>View History</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                    <View style={styles.infoRow}>
                        <Text style={styles.infoLabel}>Minimum Increment:</Text>
                        <Text style={styles.infoValue}>LKR {auctionData.minIncrement}/kg</Text>
                    </View>
                </View>

                {/* NFT Passport Section */}
                {auctionData.isNftSecured && (
                    <View style={styles.nftSection}>
                        <Text style={styles.nftTitle}>Digital Passport (NFT)</Text>

                        <View style={styles.nftRow}>
                            <Ionicons name="cube-outline" size={32} color="#333" />
                            <View style={styles.nftDetails}>
                                <Text style={styles.nftLabel}>Token ID</Text>
                                <Text style={styles.nftValue}>{auctionData.nftTokenId || 'Minting...'}</Text>
                            </View>
                        </View>

                        {auctionData.ipfsHash && (
                            <View style={[styles.nftRow, { marginTop: 12 }]}>
                                <Ionicons name="cloud-done-outline" size={32} color="#333" />
                                <View style={styles.nftDetails}>
                                    <Text style={styles.nftLabel}>IPFS Metadata Hash</Text>
                                    <Text style={styles.nftValue}>{auctionData.ipfsHash}</Text>
                                </View>
                            </View>
                        )}

                        {role === 'farmer' && (
                            <TouchableOpacity
                                style={[styles.traceBtn, { marginTop: 15 }]}
                                onPress={() => navigation.navigate('Traceability', { lotId: id })}
                            >
                                <Text style={styles.traceBtnText}>Traceability</Text>
                                <Ionicons name="chevron-forward" size={16} color="#2962FF" />
                            </TouchableOpacity>
                        )}
                    </View>
                )}

                {/* Bid Actions */}
                {role === 'farmer' ? (
                    <View style={styles.bidActions}>
                        <View style={styles.restrictedWarning}>
                            <Ionicons name="information-circle-outline" size={20} color="#FF9800" />
                            <Text style={styles.restrictedText}>Farmers cannot place bids on lots.</Text>
                        </View>
                    </View>
                ) : (
                    <View style={styles.bidActions}>
                        {isLive ? (
                            <>
                                <View style={styles.incrementRow}>
                                    <TouchableOpacity style={styles.incrementBtn} onPress={() => navigation.navigate('PlaceBid', {
                                        id: auctionData.id, title: auctionData.title, currentPrice: auctionData.currentPrice, quantityKg: parseInt(auctionData.quantity.replace(/[^0-9]/g, '')), prefilledAmount: String(auctionData.currentPrice + 5)
                                    })}>
                                        <Ionicons name="flash-outline" size={18} color="#333" />
                                        <Text style={styles.incrementText}>+5</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.incrementBtn} onPress={() => navigation.navigate('PlaceBid', {
                                        id: auctionData.id, title: auctionData.title, currentPrice: auctionData.currentPrice, quantityKg: parseInt(auctionData.quantity.replace(/[^0-9]/g, '')), prefilledAmount: String(auctionData.currentPrice + 10)
                                    })}>
                                        <Ionicons name="flash-outline" size={18} color="#333" />
                                        <Text style={styles.incrementText}>+10</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity style={styles.incrementBtn} onPress={() => navigation.navigate('PlaceBid', {
                                        id: auctionData.id, title: auctionData.title, currentPrice: auctionData.currentPrice, quantityKg: parseInt(auctionData.quantity.replace(/[^0-9]/g, '')), prefilledAmount: String(auctionData.currentPrice + 25)
                                    })}>
                                        <Ionicons name="flash-outline" size={18} color="#333" />
                                        <Text style={styles.incrementText}>+25</Text>
                                    </TouchableOpacity>
                                </View>

                                <TouchableOpacity
                                    style={styles.placeBidBtn}
                                    onPress={() => navigation.navigate('PlaceBid', {
                                        id: auctionData.id,
                                        title: auctionData.title,
                                        currentPrice: auctionData.currentPrice,
                                        quantityKg: parseInt(auctionData.quantity.replace(/[^0-9]/g, ''))
                                    })}
                                >
                                    <Ionicons name="hammer-outline" size={20} color="#FFF" />
                                    <Text style={styles.placeBidText}>Place Custom Bid</Text>
                                </TouchableOpacity>
                            </>
                        ) : (
                            <View style={styles.restrictedWarning}>
                                <Ionicons name="lock-closed-outline" size={20} color="#F44336" />
                                <Text style={[styles.restrictedText, { color: '#F44336' }]}>Auction is closed. Bidding has ended.</Text>
                            </View>
                        )}
                    </View>
                )}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, backgroundColor: '#FFF' },
    backBtn: { padding: 8, marginRight: 15 },
    headerTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },

    mainCard: { backgroundColor: '#FFF', margin: 15, borderRadius: 20, padding: 20, elevation: 2 },
    tagSection: { flexDirection: 'row', marginBottom: 15 },
    liveBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
    liveDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#4CAF50', marginRight: 6 },
    liveText: { color: '#4CAF50', fontSize: 12, fontWeight: 'bold' },
    gradeBadge: { backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginRight: 8 },
    gradeText: { color: '#666', fontSize: 12, fontWeight: 'bold' },
    nftBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#E8F5E9', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6 },
    nftBadgeText: { color: '#2E7D32', fontSize: 12, fontWeight: 'bold', marginLeft: 4 },

    title: { fontSize: 20, fontWeight: 'bold', color: '#333', marginBottom: 8 },
    subtitle: { fontSize: 14, color: '#666', marginBottom: 25 },

    timerSection: { marginBottom: 25 },
    timerHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
    timerLabel: { fontSize: 14, color: '#888' },
    timerValueRow: { flexDirection: 'row', alignItems: 'center' },
    timerValue: { color: '#FF6D00', fontSize: 14, fontWeight: 'bold', marginLeft: 4 },
    progressBarBg: { height: 8, backgroundColor: '#EEEEEE', borderRadius: 4 },
    progressBarFill: { height: '100%', backgroundColor: '#333', borderRadius: 4 },

    statsGrid: { flexDirection: 'row', backgroundColor: '#F9FAFB', borderRadius: 12, padding: 15, marginBottom: 25 },
    statBox: { flex: 1 },
    statLabel: { fontSize: 12, color: '#888', marginBottom: 6 },
    currentPriceText: { fontSize: 22, fontWeight: 'bold', color: '#2E7D32' },
    statValueText: { fontSize: 20, fontWeight: 'bold', color: '#333' },

    infoList: { marginBottom: 30 },
    infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
    infoLabel: { color: '#888', fontSize: 14 },
    infoValue: { color: '#333', fontSize: 14, fontWeight: '500' },
    viewHistoryText: { color: '#2962FF', fontSize: 12, fontWeight: 'bold' },

    nftSection: { backgroundColor: '#F9FAFB', borderRadius: 12, padding: 15, marginBottom: 25, borderLeftWidth: 4, borderLeftColor: '#2E7D32' },
    nftTitle: { fontSize: 14, fontWeight: 'bold', color: '#333', marginBottom: 12 },
    nftRow: { flexDirection: 'row', alignItems: 'center' },
    nftDetails: { flex: 1, marginLeft: 12 },
    nftLabel: { fontSize: 11, color: '#888' },
    nftValue: { fontSize: 13, color: '#333', fontWeight: 'bold' },
    traceBtn: { flexDirection: 'row', alignItems: 'center' },
    traceBtnText: { color: '#2962FF', fontWeight: 'bold', fontSize: 13, marginRight: 4 },

    bidActions: { borderTopWidth: 1, borderTopColor: '#EEE', paddingTop: 20 },
    incrementRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    incrementBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF', borderWidth: 1, borderColor: '#EEE', paddingVertical: 10, borderRadius: 8, marginHorizontal: 4 },
    incrementText: { marginLeft: 4, fontWeight: 'bold', color: '#333' },
    placeBidBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#2962FF', paddingVertical: 15, borderRadius: 12 },
    placeBidText: { color: '#FFF', fontWeight: 'bold', fontSize: 16, marginLeft: 8 },
    restrictedWarning: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFF3E0', padding: 15, borderRadius: 12 },
    restrictedText: { color: '#E65100', fontWeight: '500', marginLeft: 8 },
    winnerBanner: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFFDF0', padding: 15, borderRadius: 12, marginBottom: 20, borderWidth: 1, borderColor: '#FFE082' },
    winnerBannerText: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    winnerBannerSubtext: { fontSize: 13, color: '#666', marginTop: 2 }
});
