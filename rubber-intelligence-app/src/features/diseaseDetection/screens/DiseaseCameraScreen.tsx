import React, { useState, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as ImagePicker from 'expo-image-picker';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { colors } from '../../../shared/styles/colors';
import { DiseaseService } from '../services/diseaseService';
import { useStore } from '../../../store';

import * as DocumentPicker from 'expo-document-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

export const DiseaseCameraScreen = ({ navigation, route }: any) => {
    const user = useStore(state => state.user);
    const [permission, requestPermission] = useCameraPermissions();
    const [image, setImage] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const cameraRef = useRef<any>(null);

    // Default to Leaf Disease (0) if not passed
    const diseaseType = route.params?.type ?? 0;
    const diseaseTypeName = ['Leaf Disease', 'Pest', 'Weed'][diseaseType];

    if (!permission) {
        return <View />;
    }

    if (!permission.granted) {
        return (
            <View style={styles.container}>
                <Text style={{ textAlign: 'center', marginBottom: 20 }}>We need your permission to show the camera</Text>
                <TouchableOpacity onPress={requestPermission} style={styles.btn}>
                    <Text style={styles.btnText}>Grant Permission</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const takePicture = async () => {
        if (cameraRef.current) {
            const photo = await cameraRef.current.takePictureAsync();
            setImage(photo.uri);
        }
    };

    const pickImage = async () => {
        try {
            // Using standard DocumentPicker per user request
            // We import it statically at the top to prevent a sudden memory spike 
            // when pressing the button, which causes the Android background kill
            const docResult = await DocumentPicker.getDocumentAsync({
                type: 'image/*',
                copyToCacheDirectory: true,
            });

            if (!docResult.canceled && docResult.assets && docResult.assets.length > 0) {
                const docUri = docResult.assets[0].uri;

                // Programmatically resize & compress the image so the API accepts it
                try {
                    const manipResult = await manipulateAsync(
                        docUri,
                        [{ resize: { width: 1080 } }], // Resize width, keep aspect ratio
                        { compress: 0.5, format: SaveFormat.JPEG }
                    );
                    setImage(manipResult.uri);
                } catch (err) {
                    console.log("Image manipulation failed, using original document uri", err);
                    setImage(docUri);
                }
            }
        } catch (error) {
            console.error("DocumentPicker failed", error);
            Alert.alert("Error", "Could not load the file picker.");
        }
    };

    const analyzeImage = async () => {
        if (!image) return;

        setLoading(true);
        try {
            // 1. Try live GPS capture at analyze time
            let lat: number | undefined;
            let lng: number | undefined;

            try {
                const { status } = await Location.requestForegroundPermissionsAsync();
                if (status === 'granted') {
                    const loc = await Location.getCurrentPositionAsync({
                        accuracy: Location.Accuracy.Balanced,
                    });
                    lat = loc.coords.latitude;
                    lng = loc.coords.longitude;
                }
            } catch {
                console.log('Live GPS unavailable');
            }

            // 2. Fallback to user's registered plantation location
            if (lat === undefined || lng === undefined) {
                lat = user?.latitude;
                lng = user?.longitude;
            }

            const result = await DiseaseService.detect(image, diseaseType, lat, lng);
            if (result.isRejected) {
                Alert.alert(
                    "Image Rejected",
                    result.rejectionReason || "The image could not be processed. Please try a different photo.",
                    [{ text: "OK" }]
                );
            } else {
                navigation.navigate('DiseaseResult', { result, imageUri: image });
            }
        } catch (error) {
            Alert.alert("Error", "Failed to analyze image. Please try again.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <View style={styles.container}>
            {image ? (
                <View style={styles.previewContainer}>
                    <Image source={{ uri: image }} style={styles.previewParams} />
                    <View style={styles.actionRow}>
                        <TouchableOpacity style={[styles.btn, styles.secondaryBtn]} onPress={() => setImage(null)}>
                            <Text style={styles.secondaryBtnText}>Retake</Text>
                        </TouchableOpacity>
                        <TouchableOpacity style={[styles.btn, styles.primaryBtn]} onPress={analyzeImage} disabled={loading}>
                            {loading ? <ActivityIndicator color="#FFF" /> : <Text style={styles.btnText}>Analyze</Text>}
                        </TouchableOpacity>
                    </View>
                </View>
            ) : (
                <View style={{ flex: 1 }}>
                    <CameraView style={StyleSheet.absoluteFill} ref={cameraRef} />
                    <View style={[styles.overlay, StyleSheet.absoluteFill]}>
                        <View style={styles.topBar}>
                            <TouchableOpacity
                                onPress={() => {
                                    if (navigation.canGoBack()) {
                                        navigation.goBack();
                                    } else {
                                        navigation.navigate('DiseaseHome');
                                    }
                                }}
                                style={styles.backBtn}
                            >
                                <Ionicons name="arrow-back" size={24} color="#FFF" />
                            </TouchableOpacity>
                            <Text style={styles.headerText}>Detecting: {diseaseTypeName}</Text>
                            <View style={{ width: 44 }} />
                        </View>
                        <View style={styles.controls}>
                            <TouchableOpacity onPress={pickImage} style={styles.iconBtn}>
                                <Ionicons name="images-outline" size={30} color="#FFF" />
                            </TouchableOpacity>
                            <TouchableOpacity onPress={takePicture} style={styles.captureBtn}>
                                <View style={styles.captureInner} />
                            </TouchableOpacity>
                            <View style={{ width: 30 }} />
                        </View>
                    </View>
                </View>
            )}
        </View>
    );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#000' },
    camera: { flex: 1 },
    overlay: { flex: 1, justifyContent: 'space-between', padding: 20 },
    topBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 40, width: '100%' },
    backBtn: { width: 44, height: 44, borderRadius: 22, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
    headerText: { color: '#FFF', fontSize: 18, textAlign: 'center', fontWeight: 'bold', backgroundColor: 'rgba(0,0,0,0.5)', padding: 10, borderRadius: 8 },
    controls: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center', marginBottom: 30 },
    captureBtn: { width: 70, height: 70, borderRadius: 35, backgroundColor: '#FFF', justifyContent: 'center', alignItems: 'center' },
    captureInner: { width: 60, height: 60, borderRadius: 30, borderWidth: 2, borderColor: '#000' },
    iconBtn: { padding: 10 },
    previewContainer: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    previewParams: { width: '100%', height: '80%', resizeMode: 'contain' },
    actionRow: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', padding: 20 },
    btn: { padding: 15, borderRadius: 8, width: '40%', alignItems: 'center' },
    primaryBtn: { backgroundColor: colors.primary },
    secondaryBtn: { backgroundColor: '#FFF', borderWidth: 1, borderColor: colors.primary },
    btnText: { color: '#FFF', fontWeight: 'bold' },
    secondaryBtnText: { color: colors.primary, fontWeight: 'bold' }
});