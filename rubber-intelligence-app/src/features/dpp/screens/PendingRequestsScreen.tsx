/**
 * PendingRequestsScreen
 *
 * Shown to Buyers when exporters have expressed interest in their lots.
 * Lists all REQUESTED lots and lets the buyer navigate to LotBidders
 * to review trust-scored exporters and accept one.
 */
import React, { useCallback, useState } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    ActivityIndicator, StatusBar,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { getMyRequestedPosts } from '../services/marketplaceService';
import { SellingPost } from '../types';

const C = {
    primary: '#2E7D32',
    primaryLight: '#4CAF50',
    primaryPale: '#E8F5E9',
    primaryDark: '#1B5E20',
    bg: '#F1F8E9',
    card: '#FFFFFF',
    orange: '#FF9800',
    orangeLight: '#FFF3E0',
    text: '#1C1C1E',
    sub: '#6B7B6E',
    border: '#C8E6C9',
};

export default function PendingRequestsScreen() {
    const navigation = useNavigation<any>();
    const [posts, setPosts] = useState<SellingPost[]>([]);
    const [loading, setLoading] = useState(true);

    const loadPosts = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getMyRequestedPosts();
            setPosts(data);
        } finally {
            setLoading(false);
        }
    }, []);

    useFocusEffect(
        useCallback(() => { loadPosts(); }, [loadPosts])
    );

    const renderItem = ({ item }: { item: SellingPost }) => (
        <TouchableOpacity
            style={s.card}
            activeOpacity={0.8}
            onPress={() =>
                navigation.navigate('LotBidders', {
                    postId: item.id,
                    grade: item.grade,
                    quantityKg: item.quantityKg,
                })
            }
        >
            <View style={s.cardLeft}>
                <View style={s.gradeBadge}>
                    <Text style={s.gradeText}>{item.grade}</Text>
                </View>
                <View style={s.cardInfo}>
                    <Text style={s.lotTitle}>{item.quantityKg} kg · {item.location}</Text>
                    <Text style={s.lotPrice}>LKR {item.pricePerKg}/kg</Text>
                    <View style={s.requestedBadge}>
                        <Ionicons name="people" size={12} color={C.orange} />
                        <Text style={s.requestedText}>Exporters Interested</Text>
                    </View>
                </View>
            </View>
            <View style={s.cardRight}>
                <Ionicons name="chevron-forward" size={20} color={C.primary} />
            </View>
        </TouchableOpacity>
    );

    return (
        <View style={s.root}>
            <StatusBar barStyle="light-content" backgroundColor={C.primaryDark} />

            {/* Header */}
            <LinearGradient
                colors={[C.primaryDark, C.primary, C.primaryLight]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={s.header}
            >
                <TouchableOpacity style={s.backBtn} onPress={() => navigation.goBack()}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                    <Ionicons name="arrow-back" size={22} color="#fff" />
                </TouchableOpacity>
                <View style={s.headerCenter}>
                    <Ionicons name="notifications" size={28} color="#fff" />
                    <Text style={s.headerTitle}>Exporter Requests</Text>
                    <Text style={s.headerSub}>Exporters interested in your lots</Text>
                </View>
            </LinearGradient>

            {loading ? (
                <View style={s.center}>
                    <ActivityIndicator size="large" color={C.primary} />
                </View>
            ) : posts.length === 0 ? (
                <View style={s.center}>
                    <Ionicons name="notifications-off-outline" size={52} color={C.sub} />
                    <Text style={s.emptyTitle}>No Pending Requests</Text>
                    <Text style={s.emptySub}>
                        When exporters express interest in your lots, they'll appear here.
                    </Text>
                </View>
            ) : (
                <FlatList
                    data={posts}
                    keyExtractor={item => item.id}
                    renderItem={renderItem}
                    contentContainerStyle={s.list}
                    onRefresh={loadPosts}
                    refreshing={loading}
                />
            )}
        </View>
    );
}

const s = StyleSheet.create({
    root: { flex: 1, backgroundColor: C.bg },
    header: {
        paddingTop: 52,
        paddingBottom: 24,
        paddingHorizontal: 20,
        alignItems: 'center',
    },
    backBtn: {
        position: 'absolute',
        left: 16,
        top: 52,
        zIndex: 10,
        padding: 4,
    },
    headerCenter: { alignItems: 'center', marginTop: 4 },
    headerTitle: { color: '#fff', fontSize: 20, fontWeight: '700', marginTop: 8 },
    headerSub: { color: 'rgba(255,255,255,0.8)', fontSize: 13, marginTop: 4 },
    list: { padding: 16 },
    card: {
        backgroundColor: C.card,
        borderRadius: 14,
        marginBottom: 12,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.06,
        shadowRadius: 4,
        elevation: 2,
    },
    cardLeft: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    gradeBadge: {
        width: 48,
        height: 48,
        borderRadius: 12,
        backgroundColor: C.primaryPale,
        alignItems: 'center',
        justifyContent: 'center',
        marginRight: 12,
    },
    gradeText: { color: C.primary, fontWeight: '800', fontSize: 13 },
    cardInfo: { flex: 1 },
    lotTitle: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 2 },
    lotPrice: { fontSize: 13, color: C.sub, marginBottom: 4 },
    requestedBadge: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: C.orangeLight,
        borderRadius: 6,
        paddingHorizontal: 8,
        paddingVertical: 3,
        alignSelf: 'flex-start',
    },
    requestedText: { fontSize: 11, color: C.orange, fontWeight: '600', marginLeft: 4 },
    cardRight: { paddingLeft: 8 },
    center: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 32,
    },
    emptyTitle: { fontSize: 18, fontWeight: '700', color: C.text, marginTop: 16 },
    emptySub: { fontSize: 14, color: C.sub, textAlign: 'center', marginTop: 8 },
});
