import React from 'react';
import { View, Text, StyleSheet, SafeAreaView, ScrollView, TouchableOpacity } from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { Ionicons } from '@expo/vector-icons';

export default function BuyerProfileScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation();
    const { buyer } = route.params || {};

    if (!buyer) {
        return (
            <SafeAreaView style={styles.container}>
                <Text style={styles.errorText}>Buyer not found</Text>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar style="dark" />

            {/* Custom Header */}
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                    <Ionicons name="arrow-back" size={24} color="#212121" />
                </TouchableOpacity>
                <Text style={styles.headerTitle}>Buyer Profile</Text>
                <View style={{ width: 24 }} />
            </View>

            <ScrollView contentContainerStyle={styles.content}>

                {/* Profile Header Card */}
                <View style={styles.card}>
                    <View style={styles.avatarPlaceholder}>
                        <Text style={styles.avatarText}>{buyer.name.charAt(0)}</Text>
                    </View>
                    <Text style={styles.name}>{buyer.name}</Text>
                    <Text style={styles.id}>{buyer.referenceId}</Text>
                    <View style={styles.tagContainer}>
                        <View style={styles.tag}>
                            <Text style={styles.tagText}>{buyer.location}</Text>
                        </View>
                        <View style={[styles.tag, styles.riskTag, { backgroundColor: buyer.riskLevel === 'Low' ? '#E8F5E9' : '#FFEBEE' }]}>
                            <Text style={[styles.tagText, { color: buyer.riskLevel === 'Low' ? '#2E7D32' : '#C62828' }]}>
                                {buyer.riskLevel} Risk
                            </Text>
                        </View>
                    </View>
                </View>

                {/* Statistics Card */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Performance Overview</Text>

                    <View style={styles.statRow}>
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>{buyer.totalLots}</Text>
                            <Text style={styles.statLabel}>Lots Purchased</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>98%</Text>
                            <Text style={styles.statLabel}>Payment Score</Text>
                        </View>
                        <View style={styles.divider} />
                        <View style={styles.statItem}>
                            <Text style={styles.statValue}>4.5</Text>
                            <Text style={styles.statLabel}>Rating</Text>
                        </View>
                    </View>
                </View>

                {/* Additional Details */}
                <View style={styles.card}>
                    <Text style={styles.sectionTitle}>Contact Information</Text>
                    <View style={styles.detailRow}>
                        <Ionicons name="mail-outline" size={20} color="#757575" />
                        <Text style={styles.detailText}>contact@{buyer.name.replace(/\s+/g, '').toLowerCase()}.com</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="call-outline" size={20} color="#757575" />
                        <Text style={styles.detailText}>+1 (555) 123-4567</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Ionicons name="business-outline" size={20} color="#757575" />
                        <Text style={styles.detailText}>Registered Exporter Since 2021</Text>
                    </View>
                </View>

            </ScrollView>
        </SafeAreaView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F5F5F5',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFFFFF',
        borderBottomWidth: 1,
        borderBottomColor: '#E0E0E0',
    },
    backButton: {
        padding: 8,
    },
    headerTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#212121',
    },
    content: {
        padding: 16,
    },
    card: {
        backgroundColor: '#FFFFFF',
        borderRadius: 12,
        padding: 24,
        marginBottom: 16,
        alignItems: 'center', // Centered for profile card
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 2,
    },
    avatarPlaceholder: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: '#E3F2FD',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 16,
    },
    avatarText: {
        fontSize: 32,
        fontWeight: 'bold',
        color: '#1976D2',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#212121',
        marginBottom: 4,
        textAlign: 'center',
    },
    id: {
        fontSize: 14,
        color: '#757575',
        marginBottom: 16,
    },
    tagContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: 8,
    },
    tag: {
        backgroundColor: '#F5F5F5',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 16,
    },
    riskTag: {
        // Overridden inline
    },
    tagText: {
        fontSize: 12,
        color: '#616161',
    },
    sectionTitle: { // Left align for other cards
        fontSize: 16,
        fontWeight: '600',
        color: '#212121',
        alignSelf: 'flex-start',
        marginBottom: 16,
    },
    statRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        width: '100%',
    },
    statItem: {
        alignItems: 'center',
        flex: 1,
    },
    statValue: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#212121',
        marginBottom: 4,
    },
    statLabel: {
        fontSize: 12,
        color: '#757575',
    },
    divider: {
        width: 1,
        height: '100%',
        backgroundColor: '#E0E0E0',
    },
    detailRow: {
        flexDirection: 'row',
        alignItems: 'center',
        alignSelf: 'flex-start',
        marginBottom: 12,
        width: '100%',
    },
    detailText: {
        marginLeft: 12,
        fontSize: 14,
        color: '#424242',
    },
    errorText: {
        fontSize: 16,
        color: 'red',
        textAlign: 'center',
        marginTop: 20,
    }
});
