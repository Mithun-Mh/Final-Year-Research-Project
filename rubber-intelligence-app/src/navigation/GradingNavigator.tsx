import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { withLazy } from '../shared/components/LazyScreen';
import { colors } from '../shared/styles/colors';

// Only the initial screen is eagerly loaded
import QcLabScreen from '../features/grading/screens/qclab-home-screen';

// All other screens are lazy-loaded on first navigation
const GradingScreen = withLazy(() => import('../features/grading/screens/GradingScreen').then(m => ({ default: m.GradingScreen })));
const LatexQualityStatus = withLazy(() => import('../features/grading/screens/latex-quality-screen'));
const LatexQualityHomeScreen = withLazy(() => import('../features/grading/screens/latex-quality-home'));
const RSSLogbook = withLazy(() => import('../features/grading/screens/sample-logbook-screen'));
const TestReportScreen = withLazy(() => import('../features/grading/screens/TestReportScreen').then(m => ({ default: m.TestReportScreen })));
const ReportsDashboard = withLazy(() => import('../features/grading/screens/test-reports-screen'));
const LatexQualityReports = withLazy(() => import('../features/grading/screens/latex-quality-reports'));
const SensorStatusScreen = withLazy(() => import('../features/grading/screens/sensor-status-screen'));
const ViewHistoryScreen = withLazy(() => import('../features/grading/screens/latex-process-screen'));
const LatexQualityResultScreen = withLazy(() => import('../features/grading/screens/latex-quality-result-screen'));
const LatexStorageGuide = withLazy(() => import('../features/grading/screens/latex-storage-guide'));
const StorageSelectionScreen = withLazy(() => import('../features/grading/screens/storage-selection-screen'));
const ExpertChatScreen = withLazy(() => import('../features/grading/screens/expert-chat-screen'));
const LatexQualityReportViewer = withLazy(() => import('../features/grading/screens/latex-quality-report-viewer'));

const Stack = createNativeStackNavigator();

export const GradingNavigator = () => {
    return (
        <Stack.Navigator
            screenOptions={{
                headerStyle: {
                    backgroundColor: colors.primary,
                },
                headerTintColor: '#fff',
                headerTitleStyle: {
                    fontWeight: 'bold',
                },
                headerShown: false // Custom headers are used in screens
            }}
            initialRouteName="QcLabHome"
        >
            <Stack.Screen name="QcLabHome" component={QcLabScreen} />
            <Stack.Screen name="NewTest" component={GradingScreen} />
            <Stack.Screen name="SampleLogbook" component={RSSLogbook} />
            <Stack.Screen name="LatexQualityHome" component={LatexQualityHomeScreen} />
            <Stack.Screen name="LatexTest" component={LatexQualityStatus} />
            <Stack.Screen name="SensorStatus" component={SensorStatusScreen} />
            <Stack.Screen name="ViewHistory" component={ViewHistoryScreen} />
            <Stack.Screen name="TestReports" component={TestReportScreen} />
            <Stack.Screen name="ReportsDashboard" component={ReportsDashboard} />
            <Stack.Screen name="LatexQualityReports" component={LatexQualityReports} />
            <Stack.Screen name="LatexQualityResult" component={LatexQualityResultScreen} />
            <Stack.Screen name="LatexStorageGuide" component={LatexStorageGuide} />
            <Stack.Screen name="StorageSelection" component={StorageSelectionScreen} />
            <Stack.Screen name="ExpertChat" component={ExpertChatScreen} />
            <Stack.Screen name="LatexQualityReportViewer" component={LatexQualityReportViewer} />
        </Stack.Navigator>
    );
};