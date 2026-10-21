# 🌡️ Sensor-Based Environment Alert System

## 📋 Overview
An IoT-driven monitoring system that provides real-time environmental data and agronomic advice to rubber farmers. It helps in detecting climate stress early to protect the plantation.

## 🚀 Key Features
- **Real-Time Monitoring:** Tracks Temperature, Humidity, and Soil Moisture directly from the field.
- **Stress Detection:** Automatically identifies conditions like "Heat Stress" or "Drought Stress" using pre-defined agronomic thresholds.
- **Actionable Advice:** Provides specific recommendations (e.g., "Adjust tapping schedule") based on the current alert level.
- **Mobile Optimized:** High-frequency polling (3s) with power-saving logic for mobile devices.

## 🛠️ Technology Stack
- **Hardware:** ESP32 Microcontroller, DHT22 Sensor, Capacitive Soil Moisture Sensor.
- **Mobile:** React Native (Expo), TypeScript.
- **Communication:** HTTP polling over local Wi-Fi.

## 🌡️ Alert Thresholds
| Condition | Trigger | Advice |
|-----------|---------|--------|
| **Drought** | Soil Moisture < 35% | Increase irrigation if possible. |
| **Heat Stress** | Temperature > 35°C | Avoid heavy tapping during peak heat. |
| **Waterlogging**| Soil Moisture > 85% | Check drainage systems. |
| **Low Humidity**| Humidity < 60% | Monitor for potential leaf disease. |

## 📱 Mobile Logic
- **`useFocusEffect`:** Polling only occurs when the user is actively looking at the screen.
- **`AbortController`:** Ensures that slow network connections to the ESP32 don't freeze the app.
- **Role Gating:** Only users with the **"Farmer"** role can access this sensitive data.

## 📁 File Structure
- `EnvironmentAlertDashboard.tsx`: Main UI and polling logic.
- `ESP32_Firmware/`: (External) C++ code for the microcontroller.
