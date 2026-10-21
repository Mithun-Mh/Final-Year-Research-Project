import React from 'react';
import { View, StyleSheet, TouchableOpacity, Text, SafeAreaView, StatusBar, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useNavigation, useRoute } from '@react-navigation/native';
import { colors } from '../../../shared/styles/colors';
import { ReportService } from '../../../core/services/ReportService';

const LatexQualityReportViewer = () => {
    const navigation = useNavigation<any>();
    const route = useRoute<any>();
    const { fileUri, testId } = route.params;

    const handleShare = () => {
        if (fileUri) {
            ReportService.sharePDF(fileUri);
        }
    };

    return (
        <SafeAreaView style={styles.container}>
            <StatusBar barStyle="light-content" backgroundColor={colors.primary} />

            <LinearGradient
                colors={[colors.primary, '#1B5E20']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <TouchableOpacity style={styles.headerButton} onPress={() => navigation.goBack()}>
                    <Ionicons name="arrow-back" size={24} color="white" />
                </TouchableOpacity>
                <View style={styles.headerTitleContainer}>
                    <Text style={styles.headerTitle}>Report Viewer</Text>
                    <Text style={styles.headerSubtitle}>{testId || 'Quality Report'}</Text>
                </View>
                <TouchableOpacity style={styles.headerButton} onPress={handleShare}>
                    <MaterialCommunityIcons name="share-variant" size={24} color="white" />
                </TouchableOpacity>
            </LinearGradient>

            <View style={styles.content}>
                {Platform.OS === 'android' ? (
                    <View style={styles.androidWarning}>
                        <MaterialCommunityIcons name="file-pdf-box" size={64} color={colors.primary} />
                        <Text style={styles.androidMainText}>PDF Document</Text>
                        <Text style={styles.androidSubText}>
                            Android WebView may struggle to display local PDFs directly.
                            If it doesn't load below, please use the Share button to open it in a PDF viewer.
                        </Text>
                        <WebView
                            source={{ uri: fileUri }}
                            style={styles.webviewPlaceholder}
                            originWhitelist={['*']}
                            allowFileAccess={true}
                            allowFileAccessFromFileURLs={true}
                            allowUniversalAccessFromFileURLs={true}
                        />
                    </View>
                ) : (
                    <WebView
                        source={{ uri: fileUri }}
                        style={styles.webview}
                        originWhitelist={['*']}
                        allowFileAccess={true}
                        allowFileAccessFromFileURLs={true}
                        allowUniversalAccessFromFileURLs={true}
                    />
                )}
            </View>
        </SafeAreaView>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F8FAFC',
    },
    header: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        paddingTop: StatusBar.currentHeight ? StatusBar.currentHeight + 10 : 50,
        paddingBottom: 20,
        paddingHorizontal: 20,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
    },
    headerButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: 'rgba(255,255,255,0.2)',
        justifyContent: 'center',
        alignItems: 'center',
    },
    headerTitleContainer: {
        flex: 1,
        alignItems: 'center',
    },
    headerTitle: {
        fontSize: 20,
        fontWeight: '800',
        color: 'white',
        letterSpacing: 0.5,
    },
    headerSubtitle: {
        fontSize: 13,
        color: 'rgba(255,255,255,0.8)',
        fontWeight: '500',
        marginTop: 2,
    },
    content: {
        flex: 1,
        overflow: 'hidden',
    },
    webview: {
        flex: 1,
        backgroundColor: 'transparent',
    },
    androidWarning: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
        backgroundColor: '#F8FAFC',
    },
    androidMainText: {
        fontSize: 20,
        fontWeight: '700',
        color: '#1E293B',
        marginTop: 16,
    },
    androidSubText: {
        fontSize: 14,
        color: '#64748B',
        textAlign: 'center',
        marginTop: 8,
        lineHeight: 22,
        marginBottom: 20,
    },
    webviewPlaceholder: {
        width: '100%',
        flex: 1,
        opacity: 0.99, // slight hack to force rendering
    }
});

export default LatexQualityReportViewer;
