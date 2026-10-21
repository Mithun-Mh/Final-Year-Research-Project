import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { colors } from '../../../shared/styles/colors';
import { useStore } from '../../../store';
import { BiddingService, BiddingAuction } from '../services/biddingService';

// Helper component for Stat Cards
const StatCard = ({ title, value, subtitle, icon, iconColor }: any) => (
    <View style={styles.statCard}>
        <View style={styles.statContent}>
            <Text style={styles.statTitle}>{title}</Text>
            <Text style={styles.statValue}>{value}</Text>
            <Text style={styles.statSubtitle}>{subtitle}</Text>
        </View>
        <View style={styles.iconWrapper}>
            <Ionicons name={icon} size={24} color={iconColor} />
        </View>
    </View>
);

export const AuctionHistoryScreen = () => {
    const navigation = useNavigation<any>();
    const [searchQuery, setSearchQuery] = useState('');
    const [historyData, setHistoryData] = useState<BiddingAuction[]>([]);
    const [loading, setLoading] = useState(true);

    const { user } = useStore();
    const role = user?.role || 'buyer';

    useFocusEffect(
        React.useCallback(() => {
            const loadData = async () => {
                try {
                    setLoading(true);
                    const data = await BiddingService.getClosedAuctions();
                    setHistoryData(data);
                } catch (error) {
                    console.error(error);
                } finally {
                    setLoading(false);
                }
            };
            loadData();
        }, [])
    );

    // Filter data based on search and roles
    const renderData = historyData.filter(item => {
        if (searchQuery && !item.title.toLowerCase().includes(searchQuery.toLowerCase()) && !item.seller.toLowerCase().includes(searchQuery.toLowerCase())) {
            return false;
        }

        if (role === 'farmer') return item.seller === user?.name;
        // Basic buyer check, can view all closed auctions or specific
        return true;
    }).map(item => {
        const cleanStr = item.endTime ? item.endTime.substring(0, 19) : "";
        const formattedDate = cleanStr ? new Date(cleanStr + "Z").toLocaleDateString() : "Unknown";

        return {
            id: item.id,
            title: item.title,
            seller: item.seller,
            grade: item.grade,
            date: formattedDate,
            finalPrice: item.currentPrice,
            quantity: item.quantity,
            totalValue: (item.currentPrice * parseInt(item.quantity.replace(/[^0-9]/g, '') || '0')).toLocaleString(),
            winner: item.highestBidder,
            bids: item.totalBids,
            statusColor: '#48BB78'
        };
    });

    // Dynamic stats
    const totalAuctions = renderData.length;
    let totalVolumeKg = 0;
    let totalPriceSum = 0;
    let myWins = 0;

    renderData.forEach(d => {
        const kg = parseInt(d.quantity.replace(/[^0-9]/g, '') || '0');
        totalVolumeKg += kg;
        totalPriceSum += d.finalPrice;
        if (role !== 'farmer' && d.winner === user?.name) {
            myWins += 1;
        }
    });

    const avgPrice = totalAuctions > 0 ? Math.round(totalPriceSum / totalAuctions) : 0;
    const volTons = (totalVolumeKg / 1000).toFixed(1);

    return (
        <ScrollView style={styles.container}>
            {/* Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#333" />
                </TouchableOpacity>
                <View>
                    <Text style={styles.headerTitle}>Auction History</Text>
                    <Text style={styles.headerSubtitle}>Browse past auctions, analyze historical pricing trends, and download reports</Text>
                </View>
            </View>

            {/* Stat Cards Row */}
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.statsScroll} contentContainerStyle={styles.statsContainer}>
                <StatCard title="Total Auctions" value={totalAuctions.toString()} subtitle="completed" icon="ribbon-outline" iconColor="#2962FF" />
                <StatCard title="Total Volume" value={`${volTons}t`} subtitle="rubber traded" icon="cube-outline" iconColor="#4CAF50" />
                <StatCard title="Avg Price" value={`LKR ${avgPrice}`} subtitle="per kg" icon="pricetag-outline" iconColor="#9C27B0" />
                {role !== 'farmer' && (
                    <StatCard title="Your Wins" value={myWins.toString()} subtitle="auctions won" icon="trophy-outline" iconColor="#FF9800" />
                )}
            </ScrollView>

            {/* Main Content Area */}
            <View style={styles.mainContent}>

                {/* Search & Filters */}
                <View style={styles.filterCard}>
                    <View style={styles.searchContainer}>
                        <Ionicons name="search-outline" size={20} color="#888" style={{ marginLeft: 10 }} />
                        <TextInput
                            style={styles.searchInput}
                            placeholder="Search by title or seller..."
                            value={searchQuery}
                            onChangeText={setSearchQuery}
                        />
                    </View>
                </View>

                {loading ? (
                    <ActivityIndicator size="large" color={colors.primary} style={{ marginTop: 40 }} />
                ) : renderData.length === 0 ? (
                    <View style={styles.emptyState}>
                        <Ionicons name="document-text-outline" size={48} color="#CCC" />
                        <Text style={styles.emptyText}>No historical auctions found.</Text>
                    </View>
                ) : (
                    <View style={styles.listContainer}>
                        {renderData.map((item) => (
                            <View key={item.id} style={styles.auctionCard}>
                                <View style={styles.cardHeader}>
                                    <View style={{ flex: 1 }}>
                                        <Text style={styles.itemTitle}>{item.title}</Text>
                                        <Text style={styles.itemSeller}>by {item.seller}</Text>
                                    </View>
                                    <View style={styles.gradeBadge}>
                                        <Text style={styles.gradeText}>{item.grade}</Text>
                                    </View>
                                </View>

                                <View style={styles.cardInfoRow}>
                                    <View style={styles.infoCol}>
                                        <Text style={styles.infoLabel}>Final Price</Text>
                                        <Text style={[styles.infoVal, { color: item.statusColor }]}>LKR {item.finalPrice}/kg</Text>
                                    </View>
                                    <View style={styles.infoCol}>
                                        <Text style={styles.infoLabel}>Volume</Text>
                                        <Text style={styles.infoVal}>{item.quantity}</Text>
                                    </View>
                                    <View style={styles.infoCol}>
                                        <Text style={styles.infoLabel}>Total Value</Text>
                                        <Text style={styles.infoVal}>LKR {item.totalValue}</Text>
                                    </View>
                                </View>

                                <View style={styles.cardFooter}>
                                    <View style={styles.footerInfo}>
                                        <Ionicons name="trophy-outline" size={14} color="#FF9800" style={{ marginRight: 4 }} />
                                        <Text style={styles.winnerLabel}>Winner: </Text>
                                        <Text style={styles.winnerName}>{item.winner}</Text>
                                    </View>
                                    <View style={styles.footerInfo}>
                                        <Ionicons name="calendar-outline" size={14} color="#888" style={{ marginRight: 4 }} />
                                        <Text style={styles.dateLabel}>{item.date}</Text>
                                    </View>
                                </View>
                            </View>
                        ))}
                    </View>
                )}
            </View>

            <View style={{ height: 60 }} />
        </ScrollView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F5F7FA' },
    header: { padding: 20, paddingTop: 60, backgroundColor: '#FFF', flexDirection: 'column' },
    backBtn: { marginBottom: 15, alignSelf: 'flex-start' },
    headerTitle: { fontSize: 24, fontWeight: 'bold', color: '#333', marginBottom: 5 },
    headerSubtitle: { fontSize: 14, color: '#666' },

    statsScroll: { paddingLeft: 15, marginVertical: 20 },
    statsContainer: { paddingRight: 30 },
    statCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, width: 180, marginRight: 15, flexDirection: 'row', justifyContent: 'space-between', elevation: 1 },
    statContent: { flex: 1 },
    statTitle: { fontSize: 13, color: '#888', marginBottom: 8 },
    statValue: { fontSize: 22, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    statSubtitle: { fontSize: 12, color: '#888' },
    iconWrapper: { justifyContent: 'flex-start' },

    mainContent: { paddingHorizontal: 15 },
    filterCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 10, elevation: 1, marginBottom: 15 },
    searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#F8F9FA', borderRadius: 8, height: 45 },
    searchInput: { flex: 1, height: '100%', paddingHorizontal: 10, fontSize: 15 },

    emptyState: { alignItems: 'center', marginTop: 40 },
    emptyText: { color: '#888', fontSize: 16, marginTop: 10 },

    listContainer: { gap: 15 },
    auctionCard: { backgroundColor: '#FFF', borderRadius: 12, padding: 15, elevation: 1, borderWidth: 1, borderColor: '#F0F0F0' },
    cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 15 },
    itemTitle: { fontSize: 16, fontWeight: 'bold', color: '#333', marginBottom: 4 },
    itemSeller: { fontSize: 13, color: '#888' },
    gradeBadge: { backgroundColor: '#F5F5F5', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12, borderWidth: 1, borderColor: '#EEE' },
    gradeText: { fontSize: 12, fontWeight: 'bold', color: '#555' },

    cardInfoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, paddingBottom: 15, borderBottomWidth: 1, borderBottomColor: '#F0F0F0' },
    infoCol: { flex: 1, alignItems: 'center' },
    infoLabel: { fontSize: 11, color: '#888', marginBottom: 4 },
    infoVal: { fontSize: 14, fontWeight: 'bold', color: '#333' },

    cardFooter: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
    footerInfo: { flexDirection: 'row', alignItems: 'center' },
    winnerLabel: { fontSize: 12, color: '#666' },
    winnerName: { fontSize: 13, fontWeight: 'bold', color: '#333' },
    dateLabel: { fontSize: 12, color: '#666' }
});
