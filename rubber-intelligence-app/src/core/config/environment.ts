import { Platform } from 'react-native';

// ─── UPDATE THIS when you switch WiFi networks ───────────────────────────────
// Run `ipconfig` on Windows → "Wireless LAN adapter WiFi" → IPv4 Address
// Also update .env: EXPO_PUBLIC_API_URL=http://<YOUR_IP>:5001/api
const MACHINE_IP = '10.76.50.253';
// ─────────────────────────────────────────────────────────────────────────────

function getApiUrl(): string {
    const envUrl = process.env.EXPO_PUBLIC_API_URL?.trim();
    if (envUrl) return envUrl;

    // Fallback if .env is missing
    if (Platform.OS === 'android') {
        return `http://${MACHINE_IP}:5001/api`;
    }
    return 'http://localhost:5001/api';
}

export const ENV = {
    API_URL: getApiUrl(),
    IS_DEV: __DEV__,
};