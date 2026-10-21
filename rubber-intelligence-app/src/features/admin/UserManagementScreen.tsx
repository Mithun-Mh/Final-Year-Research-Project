import React, { useState, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TouchableOpacity,
    RefreshControl, Alert, ActivityIndicator
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import apiClient from '../../core/api/apiClient';
import { colors } from '../../shared/styles/colors';

interface UserItem {
    id: string;
    fullName: string;
    email: string;
    role: string;
    plantationName?: string;
    isApproved: boolean;
    createdAt: string;
}

export const UserManagementScreen = () => {
    const [users, setUsers] = useState<UserItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState<'all' | 'pending' | 'approved'>('all');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const response = await apiClient.get<UserItem[]>('/admin/users');
            setUsers(response.data);
        } catch (error: any) {
            Alert.alert('Error', 'Failed to load users');
        } finally {
            setLoading(false);
        }
    };

    const approveUser = async (id: string, name: string) => {
        try {
            await apiClient.put(`/admin/users/${id}/approve`);
            setUsers(prev => prev.map(u => u.id === id ? { ...u, isApproved: true } : u));
            Alert.alert('Approved ✅', `${name} has been approved.`);
        } catch (error) {
            Alert.alert('Error', 'Failed to approve user');
        }
    };

    const rejectUser = async (id: string, name: string) => {
        Alert.alert(
            'Reject User',
            `Are you sure you want to reject ${name}?`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Reject',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiClient.put(`/admin/users/${id}/reject`);
                            setUsers(prev => prev.map(u => u.id === id ? { ...u, isApproved: false } : u));
                        } catch (error) {
                            Alert.alert('Error', 'Failed to reject user');
                        }
                    }
                }
            ]
        );
    };

    const deleteUser = async (id: string, name: string) => {
        Alert.alert(
            'Delete User',
            `Are you sure you want to permanently delete ${name}? This cannot be undone.`,
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await apiClient.delete(`/admin/users/${id}`);
                            setUsers(prev => prev.filter(u => u.id !== id));
                            Alert.alert('Deleted', `${name} has been removed.`);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete user');
                        }
                    }
                }
            ]
        );
    };

    const filteredUsers = users.filter(u => {
        if (filter === 'pending') return !u.isApproved;
        if (filter === 'approved') return u.isApproved;
        return true;
    });

    const pendingCount = users.filter(u => !u.isApproved).length;

    const formatDate = (dateStr: string) => {
        return new Date(dateStr).toLocaleDateString('en-US', {
            month: 'short', day: 'numeric', year: 'numeric'
        });
    };

    const renderUser = ({ item }: { item: UserItem }) => (
        <View style={styles.userCard}>
            <View style={styles.userHeader}>
                <View style={styles.userAvatar}>
                    <Text style={styles.userAvatarText}>
                        {item.fullName.charAt(0).toUpperCase()}
                    </Text>
                </View>
                <View style={styles.userInfo}>
                    <Text style={styles.userName}>{item.fullName}</Text>
                    <Text style={styles.userEmail}>{item.email}</Text>
                    <View style={styles.metaRow}>
                        <View style={[styles.rolePill, { backgroundColor: getRoleColor(item.role) + '20' }]}>
                            <Text style={[styles.roleText, { color: getRoleColor(item.role) }]}>
                                {item.role}
                            </Text>
                        </View>
                        {item.plantationName && (
                            <Text style={styles.plantation}>🌿 {item.plantationName}</Text>
                        )}
                    </View>
                </View>
                <View style={[styles.statusBadge, item.isApproved ? styles.approvedBadge : styles.pendingBadge]}>
                    <Text style={[styles.statusText, item.isApproved ? styles.approvedText : styles.pendingText]}>
                        {item.isApproved ? 'Approved' : 'Pending'}
                    </Text>
                </View>
            </View>

            <Text style={styles.dateText}>Registered: {formatDate(item.createdAt)}</Text>

            {/* Actions */}
            <View style={styles.actions}>
                {!item.isApproved ? (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.approveBtn]}
                        onPress={() => approveUser(item.id, item.fullName)}
                    >
                        <Ionicons name="checkmark-circle" size={18} color="#FFF" />
                        <Text style={styles.actionBtnText}>Approve</Text>
                    </TouchableOpacity>
                ) : (
                    <TouchableOpacity
                        style={[styles.actionBtn, styles.rejectBtn]}
                        onPress={() => rejectUser(item.id, item.fullName)}
                    >
                        <Ionicons name="close-circle" size={18} color="#FFF" />
                        <Text style={styles.actionBtnText}>Revoke</Text>
                    </TouchableOpacity>
                )}
                <TouchableOpacity
                    style={[styles.actionBtn, styles.deleteBtn]}
                    onPress={() => deleteUser(item.id, item.fullName)}
                >
                    <Ionicons name="trash" size={18} color="#FFF" />
                    <Text style={styles.actionBtnText}>Delete</Text>
                </TouchableOpacity>
            </View>
        </View>
    );

    const getRoleColor = (role: string) => {
        switch (role.toLowerCase()) {
            case 'farmer': return '#4CAF50';
            case 'admin': return '#D32F2F';
            case 'researcher': return '#2196F3';
            case 'buyer': return '#FF9800';
            case 'exporter': return '#9C27B0';
            default: return '#607D8B';
        }
    };

    if (loading) {
        return (
            <SafeAreaView style={styles.container}>
                <View style={styles.center}>
                    <ActivityIndicator size="large" color={colors.primary} />
                </View>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView style={styles.container}>
            <View style={styles.header}>
                <Ionicons name="people" size={28} color={colors.primary} />
                <Text style={styles.headerTitle}>User Management</Text>
                {pendingCount > 0 && (
                    <View style={styles.pendingCountBadge}>
                        <Text style={styles.pendingCountText}>{pendingCount}</Text>
                    </View>
                )}
            </View>

            {/* Filter Tabs */}
            <View style={styles.filterRow}>
                {(['all', 'pending', 'approved'] as const).map((f) => (
                    <TouchableOpacity
                        key={f}
                        style={[styles.filterTab, filter === f && styles.filterTabActive]}
                        onPress={() => setFilter(f)}
                    >
                        <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
                            {f.charAt(0).toUpperCase() + f.slice(1)}
                            {f === 'pending' && pendingCount > 0 ? ` (${pendingCount})` : ''}
                        </Text>
                    </TouchableOpacity>
                ))}
            </View>

            <FlatList
                data={filteredUsers}
                keyExtractor={(item) => item.id}
                renderItem={renderUser}
                refreshControl={
                    <RefreshControl refreshing={loading} onRefresh={fetchUsers} />
                }
                contentContainerStyle={styles.list}
                ListEmptyComponent={
                    <View style={styles.center}>
                        <Ionicons name="people-outline" size={48} color="#ccc" />
                        <Text style={styles.emptyText}>No users found</Text>
                    </View>
                }
            />
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#f9f9f9' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        padding: 16, paddingBottom: 8, gap: 10,
    },
    headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#333', flex: 1 },
    pendingCountBadge: {
        backgroundColor: '#D32F2F', borderRadius: 12,
        minWidth: 24, height: 24,
        justifyContent: 'center', alignItems: 'center',
        paddingHorizontal: 8,
    },
    pendingCountText: { color: '#FFF', fontSize: 13, fontWeight: 'bold' },
    filterRow: {
        flexDirection: 'row', paddingHorizontal: 16,
        marginBottom: 8, gap: 8,
    },
    filterTab: {
        paddingHorizontal: 16, paddingVertical: 8,
        borderRadius: 20, backgroundColor: '#EEE',
    },
    filterTabActive: { backgroundColor: colors.primary },
    filterText: { fontSize: 13, fontWeight: '600', color: '#666' },
    filterTextActive: { color: '#FFF' },
    list: { padding: 16 },
    userCard: {
        backgroundColor: '#FFF', borderRadius: 12,
        padding: 16, marginBottom: 12,
        elevation: 2, shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1, shadowRadius: 3,
    },
    userHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 8 },
    userAvatar: {
        width: 44, height: 44, borderRadius: 22,
        backgroundColor: colors.primary,
        justifyContent: 'center', alignItems: 'center',
        marginRight: 12,
    },
    userAvatarText: { fontSize: 18, fontWeight: 'bold', color: '#FFF' },
    userInfo: { flex: 1 },
    userName: { fontSize: 16, fontWeight: '700', color: '#333' },
    userEmail: { fontSize: 13, color: '#888' },
    metaRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 4 },
    rolePill: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 8 },
    roleText: { fontSize: 11, fontWeight: '700' },
    plantation: { fontSize: 11, color: '#666' },
    statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
    approvedBadge: { backgroundColor: '#E8F5E9' },
    pendingBadge: { backgroundColor: '#FFF3E0' },
    statusText: { fontSize: 11, fontWeight: '700' },
    approvedText: { color: '#4CAF50' },
    pendingText: { color: '#FF9800' },
    dateText: { fontSize: 11, color: '#aaa', marginBottom: 8 },
    actions: { flexDirection: 'row', gap: 8 },
    actionBtn: {
        flexDirection: 'row', alignItems: 'center', gap: 4,
        paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 8,
    },
    approveBtn: { backgroundColor: '#4CAF50' },
    rejectBtn: { backgroundColor: '#FF9800' },
    deleteBtn: { backgroundColor: '#D32F2F' },
    actionBtnText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 40 },
    emptyText: { color: '#999', marginTop: 8, fontSize: 14 },
});
