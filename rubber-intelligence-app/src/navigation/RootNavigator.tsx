import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { useStore } from '../store';
import { AuthNavigator } from './AuthNavigator';
import { MainTabNavigator } from './MainTabNavigator';
import { ActivityIndicator, View } from 'react-native';

export const RootNavigator = () => {
    const isAuthenticated = useStore(s => s.isAuthenticated);
    const isLoading = useStore(s => s.isLoading);
    const checkAuth = useStore(s => s.checkAuth);

    React.useEffect(() => {
        checkAuth();
    }, []);

    if (isLoading) {
        return (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
                <ActivityIndicator size="large" />
            </View>
        );
    }

    return (
        <NavigationContainer>
            {isAuthenticated ? <MainTabNavigator /> : <AuthNavigator />}
        </NavigationContainer>
    );
};
