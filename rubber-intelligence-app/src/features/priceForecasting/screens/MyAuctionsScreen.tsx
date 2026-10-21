
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BiddingService, BiddingAuction } from '../services/biddingService';
import { useStore } from '../../../store';

export const MyAuctionsScreen = () => {
    const navigation = useNavigation<any>();
    const { user } = useStore();
    const [lots, setLots] = useState<BiddingAuction[]>([]);
    const [loading, setLoading] = useState(true);

    useFocusEffect(
        React.useCallback(() => {
            const fetchLots = async () => {
                setLoading(true);
                try {
                    const [active, closed] = await Promise.all([
                        BiddingService.getActiveAuctions(),
                        BiddingService.getClosedAuctions()
                    ]);
                    const allAuctions = [...active, ...closed].filter(a => a.seller === user?.name);
                    setLots(allAuctions);
                } catch (error) {
                    console.error("Failed to load seller lots:", error);
                } finally {
                    setLoading(false);
                }
            };
            if (user?.name) fetchLots();
            else setLoading(false);
        }, [user?.name])
    );

    return (
        <ScrollView style={styles.container}>
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Seller Portal</Text>
            </View>

            <View style={styles.statsRow}>
                <View style={styles.statCard}>
                    <Text style={styles.statLabel}>Active Lots</Text>
                    <Text style={styles.statValue}>{lots.filter(l => l.status !== 'Closed').length}</Text>
                </View>
                <View style={[styles.statCard, { backgroundColor: '#E3F2FD' }]}>
                    <Text style={styles.statLabel}>Sold Value</Text>
                    <Text style={[styles.statValue, { color: '#1565C0' }]}>
                        {lots.filter(l => l.status === 'Closed').reduce((sum, lot) => {
                            const val = lot.currentPrice * (parseInt(lot.quantity.replace(/\D/g, '')) || 1);
                            return sum + val;
                        }, 0).toLocaleString()}
                    </Text>
                </View>
            </View>

            <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Your Rubber Lots (NFTs)</Text>
                <TouchableOpacity
                    style={styles.addBtn}
                    onPress={() => navigation.navigate('CreateLot')}
                >
                    <Ionicons name="add" size={20} color="#FFF" />
                    <Text style={styles.addBtnText}>New Lot</Text>
                </TouchableOpacity>
            </View>

            {loading ? (
                <ActivityIndicator size="large" color="#2E7D32" style={{ marginTop: 40 }} />
            ) : lots.length === 0 ? (
                <View style={styles.emptyState}>
                    <Ionicons name="cube-outline" size={60} color="#DDD" />
                    <Text style={styles.emptyText}>No lots registered yet.</Text>
                </View>
            ) : (
                lots.map((lot) => (
                    <View key={lot.id} style={styles.lotCard}>
                        <View style={styles.lotHeader}>
                            <View>
                                <Text style={styles.lotGrade}>{lot.grade} Grade</Text>
                                <Text style={styles.lotToken}>{lot.nftTokenId || 'Minting...'}</Text>
                            </View>
                            <View style={[styles.statusBadge, lot.status === 'Closed' && { backgroundColor: '#E8F5E9' }]}>
                                <Text style={[styles.statusText, lot.status === 'Closed' && { color: '#2E7D32' }]}>
                                    {lot.status === 'Closed' ? 'Sold' : 'In Auction'}
                                </Text>
                            </View>
                        </View>

                        <View style={styles.lotDetails}>
                            <View style={styles.detailItem}>
                                <Ionicons name="scale-outline" size={14} color="#666" />
                                <Text style={styles.detailText}>{lot.quantity}</Text>
                            </View>
                            <View style={styles.detailItem}>
                                <Ionicons name="location-outline" size={14} color="#666" />
                                <Text style={styles.detailText}>{lot.subtitle}</Text>
                            </View>
                        </View>

                        <View style={styles.actions}>
                            <TouchableOpacity
                                style={styles.secondaryBtn}
                                onPress={() => navigation.navigate('Traceability', { lotId: lot.id })}
                            >
                                <Ionicons name="eye-outline" size={18} color="#2E7D32" />
                                <Text style={styles.secondaryBtnText}>History</Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                                style={styles.primaryBtn}
                                onPress={() => navigation.navigate('AuctionBidding', { id: lot.id })}
                            >
                                <Text style={styles.primaryBtnText}>View Bids</Text>
                            </TouchableOpacity>
                        </View>
                    </View>
                ))
            )}
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { flexDirection: 'row', alignItems: 'center', padding: 25, paddingTop: 60, backgroundColor: '#FFF' },
    backBtn: { marginRight: 15 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333' },
    statsRow: { flexDirection: 'row', padding: 15, justifyContent: 'space-between' },
    statCard: { flex: 1, backgroundColor: '#E8F5E9', padding: 20, borderRadius: 20, marginHorizontal: 5, elevation: 1 },
    statLabel: { fontSize: 13, color: '#666', marginBottom: 5 },
    statValue: { fontSize: 24, fontWeight: 'bold', color: '#2E7D32' },
    sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, marginTop: 10 },
    sectionTitle: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#333', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 10 },
    addBtnText: { color: '#FFF', fontWeight: 'bold', marginLeft: 5 },
    lotCard: { backgroundColor: '#FFF', margin: 15, marginTop: 0, borderRadius: 20, padding: 20, elevation: 2 },
    lotHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    lotGrade: { fontSize: 18, fontWeight: 'bold', color: '#333' },
    lotToken: { fontSize: 11, color: '#999', marginTop: 2 },
    statusBadge: { backgroundColor: '#FFF3E0', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, alignSelf: 'flex-start' },
    statusText: { color: '#E65100', fontSize: 11, fontWeight: 'bold' },
    lotDetails: { flexDirection: 'row', paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F5F5F5', marginBottom: 15 },
    detailItem: { flexDirection: 'row', alignItems: 'center', marginRight: 20 },
    detailText: { fontSize: 13, color: '#666', marginLeft: 5 },
    actions: { flexDirection: 'row', justifyContent: 'space-between' },
    secondaryBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: '#2E7D32', borderRadius: 12, paddingVertical: 10, marginRight: 10 },
    secondaryBtnText: { color: '#2E7D32', fontWeight: '600', marginLeft: 8 },
    primaryBtn: { flex: 1, backgroundColor: '#2E7D32', alignItems: 'center', justifyContent: 'center', borderRadius: 12, paddingVertical: 10 },
    primaryBtnText: { color: '#FFF', fontWeight: 'bold' },
    emptyState: { alignItems: 'center', marginTop: 60 },
    emptyText: { color: '#999', marginTop: 15, fontSize: 16 }
});
