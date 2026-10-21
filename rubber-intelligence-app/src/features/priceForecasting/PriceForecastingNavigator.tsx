import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { withLazy } from '../../shared/components/LazyScreen';

// Only the initial screen is eagerly loaded
import { DashboardScreen } from './screens/DashboardScreen';

// All other screens are lazy-loaded on first navigation
const PriceForecastingScreen = withLazy(() => import('./screens/PriceForecastingScreen').then(m => ({ default: m.PriceForecastingScreen })));
const ReportScreen = withLazy(() => import('./screens/ReportScreen').then(m => ({ default: m.ReportScreen })));
const AuctionBiddingScreen = withLazy(() => import('./screens/AuctionBiddingScreen').then(m => ({ default: m.AuctionBiddingScreen })));
const PlaceBidConfirmScreen = withLazy(() => import('./screens/PlaceBidConfirmScreen').then(m => ({ default: m.PlaceBidConfirmScreen })));
const CreateLotScreen = withLazy(() => import('./screens/CreateLotScreen').then(m => ({ default: m.CreateLotScreen })));
const TraceabilityScreen = withLazy(() => import('./screens/TraceabilityScreen').then(m => ({ default: m.TraceabilityScreen })));
const MyAuctionsScreen = withLazy(() => import('./screens/MyAuctionsScreen').then(m => ({ default: m.MyAuctionsScreen })));
const AuctionHistoryScreen = withLazy(() => import('./screens/AuctionHistoryScreen').then(m => ({ default: m.AuctionHistoryScreen })));

const Stack = createNativeStackNavigator();

export const PriceForecastingNavigator = () => {
    return (
        <Stack.Navigator screenOptions={{ headerShown: false }}>
            <Stack.Screen name="Dashboard" component={DashboardScreen} />
            <Stack.Screen name="PredictionForm" component={PriceForecastingScreen} />
            <Stack.Screen name="Report" component={ReportScreen} />
            <Stack.Screen name="AuctionBidding" component={AuctionBiddingScreen} />
            <Stack.Screen name="PlaceBid" component={PlaceBidConfirmScreen} options={{ presentation: 'transparentModal', animation: 'fade' }} />
            <Stack.Screen name="CreateLot" component={CreateLotScreen} />
            <Stack.Screen name="Traceability" component={TraceabilityScreen} />
            <Stack.Screen name="MyAuctions" component={MyAuctionsScreen} />
            <Stack.Screen name="AuctionHistory" component={AuctionHistoryScreen} />
        </Stack.Navigator>
    );
};
