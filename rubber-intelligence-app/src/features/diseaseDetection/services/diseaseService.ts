import apiClient from '../../../core/api/apiClient';

interface PredictionResponse {
    label: string;
    confidence: number;
    remedy: string;
    severity: string;
    isRejected: boolean;
    rejectionReason: string | null;
}

export interface DiseaseRecord {
    id: string;
    userId: string;
    diseaseType: number;
    predictedLabel: string;
    confidence: number;
    timestamp: string;
    imagePath: string;
}

export interface MapDataPoint {
    id: string;
    disease: string;
    latitude: number;
    longitude: number;
    confidence: number;
    detectedAt: string;
    diseaseType: string;
}

export const DiseaseService = {
    detect: async (imageUri: string, type: number, latitude?: number, longitude?: number): Promise<PredictionResponse> => {
        try {
            const formData = new FormData();

            // Append Image
            const filename = imageUri.split('/').pop();
            const match = /\.(\w+)$/.exec(filename || '');
            const ext = match ? match[1] : 'jpg';

            formData.append('Image', {
                uri: imageUri,
                name: filename || `photo.${ext}`,
                type: `image/${ext}`
            } as any);

            // Append Disease Type (0=Leaf, 1=Pest, 2=Weed)
            formData.append('Type', type.toString());

            // Append GPS coordinates if available
            if (latitude !== undefined && longitude !== undefined) {
                formData.append('Latitude', latitude.toString());
                formData.append('Longitude', longitude.toString());
            }

            const response = await apiClient.post('/disease/detect', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });

            return response.data;
        } catch (error) {
            console.error('Disease Detection Error:', error);
            throw error;
        }
    },

    getHistory: async (): Promise<DiseaseRecord[]> => {
        const response = await apiClient.get<DiseaseRecord[]>('/disease/history');
        return response.data;
    },

    getMapData: async (days: number = 30): Promise<MapDataPoint[]> => {
        const response = await apiClient.get<MapDataPoint[]>(`/disease/map-data?days=${days}`);
        return response.data;
    }
};

