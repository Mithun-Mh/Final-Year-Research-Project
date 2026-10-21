import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { withLazy } from '../shared/components/LazyScreen';

// Only the initial screen is eagerly loaded
import BuyerDashboardScreen from '../features/dpp/screens/BuyerDashboardScreen';

// All other screens are lazy-loaded on first navigation
const DocumentUploadScreen = withLazy(() => import('../features/dpp/screens/DocumentUploadScreen'));
const ClassificationResultScreen = withLazy(() => import('../features/dpp/screens/ClassificationResultScreen'));
const ExporterScannerScreen = withLazy(() => import('../features/dpp/screens/ExporterScannerScreen'));
const DppDetailScreen = withLazy(() => import('../features/dpp/screens/DppDetailScreen'));
const DppPassportScreen = withLazy(() => import('../features/dpp/screens/DppPassportScreen'));
const CreateSellingPostScreen = withLazy(() => import('../features/dpp/screens/CreateSellingPostScreen'));
const MarketplaceScreen = withLazy(() => import('../features/dpp/screens/MarketplaceScreen'));
const OrderReceiptScreen = withLazy(() => import('../features/dpp/screens/OrderReceiptScreen'));
const PendingRequestsScreen = withLazy(() => import('../features/dpp/screens/PendingRequestsScreen'));
const LotMessagingScreen = withLazy(() => import('../features/dpp/screens/LotMessagingScreen'));
const InvoiceExtractedFieldsScreen = withLazy(() => import('../features/dpp/screens/InvoiceExtractedFieldsScreen'));
const QirExtractedFieldsScreen = withLazy(() => import('../features/dpp/screens/QirExtractedFieldsScreen'));
const ExporterDppViewScreen = withLazy(() => import('../features/dpp/screens/ExporterDppViewScreen'));
const LotBiddersScreen = withLazy(() => import('../features/dpp/screens/LotBiddersScreen'));
const DualLayerDppScreen = withLazy(() => import('../features/dpp/screens/DualLayerDppScreen'));

const Stack = createNativeStackNavigator();

export default function DppNavigator() {
    return (
        <Stack.Navigator
            screenOptions={{
                headerShown: false,
                contentStyle: { backgroundColor: '#F2F2F7' }
            }}
        >
            {/* Core buyer screens */}
            <Stack.Screen name="BuyerDashboard" component={BuyerDashboardScreen} />
            <Stack.Screen name="DocumentUpload" component={DocumentUploadScreen} />
            <Stack.Screen name="ClassificationResult" component={ClassificationResultScreen} />

            {/* DPP passport & detail */}
            <Stack.Screen name="DppPassport" component={DppPassportScreen} />
            <Stack.Screen name="DppDetail" component={DppDetailScreen} />

            {/* Exporter QR scanner — now includes hash verification result */}
            <Stack.Screen name="ExporterScanner" component={ExporterScannerScreen} />

            {/* Confidential field access */}


            {/* Marketplace — includes BuyerHistory modal per post */}
            <Stack.Screen name="Marketplace" component={MarketplaceScreen} />
            <Stack.Screen name="CreateSellingPost" component={CreateSellingPostScreen} />
            <Stack.Screen name="OrderReceipt" component={OrderReceiptScreen} />

            {/* Buyer: lots with pending exporter interest requests */}
            <Stack.Screen name="PendingRequests" component={PendingRequestsScreen} />

            {/* Buyer: on-demand decryption of extracted invoice fields */}
            <Stack.Screen name="InvoiceExtractedFields" component={InvoiceExtractedFieldsScreen} />

            {/* Buyer: on-demand decryption of extracted QIR fields */}
            <Stack.Screen name="QirExtractedFields" component={QirExtractedFieldsScreen} />

            {/* Exporter: combined DPP view (invoice + QIR) — only accessible to the lot's exporter */}
            <Stack.Screen name="ExporterDppView" component={ExporterDppViewScreen} />

            {/* Secure Lot-Linked Messaging */}
            <Stack.Screen name="LotMessaging" component={LotMessagingScreen} />

            {/* Trust-Scored Interested Exporters Leaderboard (Buyer) */}
            <Stack.Screen name="LotBidders" component={LotBiddersScreen} />

            {/* Zero-Knowledge Dual-Layer DPP — client-side RSA+AES decryption */}
            <Stack.Screen name="DualLayerDpp" component={DualLayerDppScreen} />
        </Stack.Navigator>
    );
}
