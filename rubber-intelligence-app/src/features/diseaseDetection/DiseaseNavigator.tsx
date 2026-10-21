import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { withLazy } from '../../shared/components/LazyScreen';

// Lazy-loaded screens — only parsed when the user navigates to them
const DiseaseCameraScreen = withLazy(() => import('./screens/DiseaseCameraScreen').then(m => ({ default: m.DiseaseCameraScreen })));
const DiseaseResultScreen = withLazy(() => import('./screens/DiseaseResultScreen').then(m => ({ default: m.DiseaseResultScreen })));
const DiseaseHistoryScreen = withLazy(() => import('./screens/DiseaseHistoryScreen').then(m => ({ default: m.DiseaseHistoryScreen })));
const DiseaseMapScreen = withLazy(() => import('./screens/DiseaseMapScreen').then(m => ({ default: m.DiseaseMapScreen })));

const Stack = createNativeStackNavigator();

// Simple Selection Screen (inline — eagerly loaded as initial screen)
const DiseaseHomeScreen = ({ navigation }: any) => {
    return (
        <View style={styles.container}>
            <Text style={styles.title}>Select Detection Type</Text>

            <MenuButton
                title="Leaf Disease"
                icon="leaf"
                color="#4CAF50"
                onPress={() => navigation.navigate('DiseaseCamera', { type: 0 })}
            />
            <MenuButton
                title="Pest Detection"
                icon="bug"
                color="#E91E63"
                onPress={() => navigation.navigate('DiseaseCamera', { type: 1 })}
            />
            <MenuButton
                title="Weed Identification"
                icon="flower"
                color="#FF9800"
                onPress={() => navigation.navigate('DiseaseCamera', { type: 2 })}
            />

            <View style={{ height: 20 }} />
            <Text style={{ fontSize: 16, color: '#666', marginBottom: 10 }}>Monitoring</Text>

            <MenuButton
                title="Disease Map"
                icon="map"
                color="#2196F3"
                onPress={() => navigation.navigate('DiseaseMap')}
            />

            <View style={{ height: 10 }} />
            <Text style={{ fontSize: 16, color: '#666', marginBottom: 10 }}>Records</Text>
            <MenuButton
                title="Recent History"
                icon="time"
                color="#607D8B"
                onPress={() => navigation.navigate('DiseaseHistory')}
            />
        </View>
    );
};

const MenuButton = ({ title, icon, color, onPress }: any) => (
    <TouchableOpacity style={styles.card} onPress={onPress}>
        <View style={[styles.iconBox, { backgroundColor: color }]}>
            <Ionicons name={icon} size={32} color="#FFF" />
        </View>
        <Text style={styles.cardText}>{title}</Text>
        <Ionicons name="chevron-forward" size={24} color="gray" />
    </TouchableOpacity>
);

export const DiseaseNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="DiseaseHome" component={DiseaseHomeScreen} />
            <Stack.Screen name="DiseaseCamera" component={DiseaseCameraScreen} />
            <Stack.Screen name="DiseaseResult" component={DiseaseResultScreen} />
            <Stack.Screen name="DiseaseHistory" component={DiseaseHistoryScreen} options={{ headerShown: true, title: 'History' }} />
            <Stack.Screen name="DiseaseMap" component={DiseaseMapScreen} />
        </Stack.Navigator>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, padding: 20, backgroundColor: '#f9f9f9', justifyContent: 'center' },
    title: { fontSize: 24, fontWeight: 'bold', marginBottom: 30, textAlign: 'center', color: '#333' },
    card: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#FFF', padding: 15, borderRadius: 15, marginBottom: 15, elevation: 2 },
    iconBox: { width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center', marginRight: 15 },
    cardText: { flex: 1, fontSize: 18, fontWeight: '600', color: '#333' },
});
