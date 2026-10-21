
import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Linking, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { BiddingService, BiddingAuction } from '../services/biddingService';

export const TraceabilityScreen = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { lotId } = route.params || {};
    const [lot, setLot] = useState<BiddingAuction | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchLot = async () => {
            if (!lotId || lotId === '1') {
                setLoading(false);
                return;
            }
            try {
                const data = await BiddingService.getAuctionById(lotId);
                setLot(data);
            } catch (error) {
                console.error("Traceability lot load failed", error);
            } finally {
                setLoading(false);
            }
        };
        fetchLot();
    }, [lotId]);

    if (loading) {
        return (
            <View style={styles.center}>
                <ActivityIndicator size="large" color="#2E7D32" />
            </View>
        );
    }

    if (!lotId || lotId === '1') {
        return (
            <View style={styles.center}>
                <Ionicons name="alert-circle-outline" size={48} color="#CCC" />
                <Text style={{ marginTop: 10, color: '#666' }}>Invalid Lot ID.</Text>
            </View>
        );
    }

    if (!lot) {
        return (
            <View style={styles.center}>
                <Text>Lot not found.</Text>
            </View>
        );
    }

    const renderDateStr = (dateInput?: string, offsetMinutes = 0) => {
        const baseDate = dateInput ? new Date(dateInput) : new Date();
        const adjustedDate = new Date(baseDate.getTime() + offsetMinutes * 60000);
        // Returns local date-time string omitting seconds
        return adjustedDate.toLocaleString('sv-SE', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }).replace('T', ' ');
    };

    const generatedHistory = [
        {
            event: 'Lot Registered',
            timestamp: renderDateStr(lot?.endTime, -60), // Start time is -60 min
            actor: `Farmer: ${lot?.seller}`,
            details: `Added ${lot?.quantity} ${lot?.grade}`,
            txHash: `0x${Math.random().toString(16).slice(2, 10)}...`
        },
        {
            event: 'NFT Passport Minted',
            timestamp: renderDateStr(lot?.endTime, -59), // Minted 1 min after start
            actor: 'Ethereum Network',
            details: `Token ID: ${lot?.nftTokenId || 'Pending'}`,
            txHash: `0x${Math.random().toString(16).slice(2, 10)}...`
        }
    ];

    if (lot?.status === 'Closed') {
        generatedHistory.push({
            event: 'Auction Closed',
            timestamp: renderDateStr(lot.endTime, 0), // End time
            actor: 'Smart Contract',
            details: `Winner: ${lot.highestBidder}`,
            txHash: `0x${Math.random().toString(16).slice(2, 10)}...`
        });
    }

    return (
        <ScrollView style={styles.container}>
            <LinearGradient colors={['#37474F', '#263238']} style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>NFT Traceability</Text>
                <View style={styles.tokenBadge}>
                    <Ionicons name="link" size={12} color="#81C784" />
                    <Text style={styles.tokenText}>{lot.nftTokenId || 'Minting...'}</Text>
                </View>
            </LinearGradient>

            <View style={styles.metadataCard}>
                <Text style={styles.sectionTitle}>Digital Passport Metadata</Text>
                <View style={styles.metaGrid}>
                    <View style={styles.metaBox}>
                        <Text style={styles.metaLabel}>Grade</Text>
                        <Text style={styles.metaValue}>{lot.grade}</Text>
                    </View>
                    <View style={styles.metaBox}>
                        <Text style={styles.metaLabel}>Weight</Text>
                        <Text style={styles.metaValue}>{lot.quantity}</Text>
                    </View>
                    <View style={styles.metaBox}>
                        <Text style={styles.metaLabel}>Source</Text>
                        <Text style={styles.metaValue}>{lot.subtitle}</Text>
                    </View>
                </View>
                <TouchableOpacity
                    style={styles.ipfsLink}
                    onPress={() => Alert.alert("IPFS Content", "CID: DefaultIPFSHashPending")}
                >
                    <Ionicons name="cloud-done-outline" size={16} color="#1565C0" />
                    <Text style={styles.ipfsText}>View Metadata on IPFS</Text>
                </TouchableOpacity>
            </View>

            <View style={styles.timelineContainer}>
                <Text style={styles.sectionTitle}>Blockchain Ledger Events</Text>
                {generatedHistory.map((event, index) => (
                    <View key={index} style={styles.timelineItem}>
                        <View style={styles.timelineLeft}>
                            <View style={[styles.timelineDot, index === 0 && styles.activeDot]} />
                            {index !== generatedHistory.length - 1 && <View style={styles.timelineLine} />}
                        </View>
                        <View style={styles.timelineRight}>
                            <View style={styles.eventHeader}>
                                <Text style={styles.eventTitle}>{event.event}</Text>
                                <Text style={styles.eventTime}>{event.timestamp}</Text>
                            </View>
                            <Text style={styles.eventActor}>By: {event.actor}</Text>
                            <Text style={styles.eventDetails}>{event.details}</Text>
                            <TouchableOpacity style={styles.txRow}>
                                <Text style={styles.txLabel}>TX Hash:</Text>
                                <Text style={styles.txHash}>{event.txHash}</Text>
                                <Ionicons name="open-outline" size={12} color="#2962FF" />
                            </TouchableOpacity>
                        </View>
                    </View>
                ))}
            </View>
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: { padding: 25, paddingTop: 60, paddingBottom: 30 },
    backBtn: { marginBottom: 10 },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#FFF' },
    tokenBadge: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'rgba(255,255,255,0.1)', alignSelf: 'flex-start', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 6, marginTop: 8 },
    tokenText: { color: '#81C784', fontSize: 12, marginLeft: 5, fontWeight: '500' },
    metadataCard: { backgroundColor: '#FFF', margin: 15, borderRadius: 20, padding: 20, elevation: 2 },
    sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 15 },
    metaGrid: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15 },
    metaBox: { flex: 1 },
    metaLabel: { fontSize: 12, color: '#888', marginBottom: 4 },
    metaValue: { fontSize: 16, fontWeight: 'bold', color: '#333' },
    ipfsLink: { flexDirection: 'row', alignItems: 'center', padding: 12, backgroundColor: '#E3F2FD', borderRadius: 10 },
    ipfsText: { marginLeft: 8, color: '#1565C0', fontWeight: '500' },
    timelineContainer: { padding: 20 },
    timelineItem: { flexDirection: 'row', minHeight: 100 },
    timelineLeft: { width: 30, alignItems: 'center' },
    timelineDot: { width: 12, height: 12, borderRadius: 6, backgroundColor: '#BDBDBD', zIndex: 1 },
    activeDot: { backgroundColor: '#43A047', shadowColor: '#43A047', shadowRadius: 5, shadowOpacity: 0.5 },
    timelineLine: { width: 2, flex: 1, backgroundColor: '#E0E0E0', marginTop: -6 },
    timelineRight: { flex: 1, paddingLeft: 10, paddingBottom: 25 },
    eventHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
    eventTitle: { fontSize: 15, fontWeight: 'bold', color: '#333' },
    eventTime: { fontSize: 11, color: '#999' },
    eventActor: { fontSize: 12, color: '#666', marginBottom: 6 },
    eventDetails: { fontSize: 13, color: '#444', marginBottom: 8 },
    txRow: { flexDirection: 'row', alignItems: 'center' },
    txLabel: { fontSize: 11, color: '#999', marginRight: 5 },
    txHash: { fontSize: 11, color: '#2962FF', marginRight: 5 }
});
