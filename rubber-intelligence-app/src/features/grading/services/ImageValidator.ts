import * as ImageManipulator from 'expo-image-manipulator';
import * as jpeg from 'jpeg-js';
import { Buffer } from 'buffer';
import { InteractionManager } from 'react-native';

export interface ValidationResult {
    isValid: boolean;
    reason?: string;
}

export const ImageValidator = {
    /**
     * Validates if the image is likely a rubber sheet and is not blurred.
     * Uses heuristic pixel analysis on a downscaled sample.
     * Deferred via InteractionManager to avoid blocking UI during animations.
     */
    validateImage: async (imageUri: string): Promise<ValidationResult> => {
        // Defer heavy work until after animations/interactions complete
        return new Promise((resolve) => {
            InteractionManager.runAfterInteractions(async () => {
                try {
                    resolve(await ImageValidator._processValidation(imageUri));
                } catch (error: any) {
                    console.error("Validation Error Details:", error);
                    resolve({ isValid: false, reason: `Validation System Error: ${error.message || "Unknown error"}` });
                }
            });
        });
    },

    /** @internal Actual pixel-level validation logic */
    _processValidation: async (imageUri: string): Promise<ValidationResult> => {
        try {
            // 1. Downscale for performance (64x64 is sufficient for color/variance)
            const manipResult = await ImageManipulator.manipulateAsync(
                imageUri,
                [{ resize: { width: 64, height: 64 } }],
                { base64: true, format: ImageManipulator.SaveFormat.JPEG }
            );

            if (!manipResult.base64) {
                return { isValid: false, reason: "Failed to process image data." };
            }

            // 2. Decode raw JPEG data
            const rawBuffer = Buffer.from(manipResult.base64, 'base64');
            const decoded = jpeg.decode(rawBuffer, { useTArray: true });
            const { data } = decoded;

            // 3. Analysis Variables
            let validHueCount = 0;
            let totalBrightness = 0;
            let varianceSum = 0;
            let prevGray = 0;

            const totalPixels = data.length / 4; // RGBA

            for (let i = 0; i < data.length; i += 4) {
                const r = data[i];
                const g = data[i + 1];
                const b = data[i + 2];

                // --- Color Analysis ---
                // RSS Rubber is Amber/Brown/Yellow.
                // Smoked sheets are usually more saturated and towards the red-orange side.
                // Refined Hue: 10 (Red-Orange) to 48 (Golden Yellow).
                // Saturation: RSS is quite rich in color (> 25).
                // Value: RSS is rarely extremely bright (> 20 and < 95).
                const { h, s, v } = rgbToHsv(r, g, b);

                const isRubberHue = (h >= 10 && h <= 48);
                const isSaturated = (s > 25);
                const isValidValue = (v > 15 && v < 95);

                if (isRubberHue && isSaturated && isValidValue) {
                    validHueCount++;
                }

                // Check for "Contaminant" colors (e.g., bright blue, neon green, etc.)
                // These are very unlikely to be on a pure rubber sheet.
                const isContaminant = (h > 150 && h < 270 && s > 40); // Cyan to Blue
                if (isContaminant) {
                    // Penalize ratio if contaminants found
                    validHueCount = Math.max(0, validHueCount - 2);
                }

                // --- Blur/Focus Analysis ---
                const gray = (r + g + b) / 3;
                totalBrightness += gray;
                varianceSum += Math.abs(gray - prevGray);
                prevGray = gray;
            }

            // 4. Thresholds
            const rubberContentRatio = validHueCount / totalPixels;
            const avgBrightness = totalBrightness / totalPixels;
            const avgVariance = varianceSum / totalPixels;

            // Check 1: Content (Rubber Sheet Colors)
            // Increased to 40% to ensure the sheet is the primary subject.
            if (rubberContentRatio < 0.40) {
                return {
                    isValid: false,
                    reason: "Subject not recognized as an RSS Rubber Sheet.\n\nTip: Place the sheet clearly in the frame with good lighting."
                };
            }

            // Check 2: Brightness
            if (avgBrightness < 35) {
                return { isValid: false, reason: "Image is too dark.\nPlease ensure proper lighting to see the texture." };
            }
            if (avgBrightness > 215) {
                return { isValid: false, reason: "Image is overexposed.\nToo much glare makes it difficult to grade." };
            }

            // Check 3: Blur (Low Variance)
            if (avgVariance < 2.5) {
                return { isValid: false, reason: "Image is blurry or lacks texture.\nPlease ensure the sheet is in focus." };
            }

            return { isValid: true };

        } catch (error: any) {
            console.error("Validation Error Details:", error);
            return { isValid: false, reason: `Validation System Error: ${error.message || "Unknown error"}` };
        }
    },
};

/**
 * Converts RGB to HSV (Hue 0-360, Sat 0-100, Val 0-100)
 */
function rgbToHsv(r: number, g: number, b: number) {
    r /= 255; g /= 255; b /= 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    const d = max - min;
    let h = 0;
    const s = max === 0 ? 0 : d / max;
    const v = max;

    if (max !== min) {
        switch (max) {
            case r: h = (g - b) / d + (g < b ? 6 : 0); break;
            case g: h = (b - r) / d + 2; break;
            case b: h = (r - g) / d + 4; break;
        }
        h /= 6;
    }

    return { h: h * 360, s: s * 100, v: v * 100 };
}