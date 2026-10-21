import apiClient from '../../../core/api/apiClient';

export interface GradingResponse {
    predictedClass: string;
    confidence: number;
    severity: string;
    suggestions: string;
}

export const GradingService = {
    analyzeImage: async (imageUri: string): Promise<GradingResponse> => {
        const formData = new FormData();

        const filename = imageUri.split('/').pop() || 'upload.jpg';
        const match = /\.(\w+)$/.exec(filename);
        const type = match ? `image/${match[1]}` : `image/jpeg`;

        // Append image as form data
        formData.append('Image', {
            uri: imageUri,
            name: filename,
            type,
        } as any);

        const response = await apiClient.post<GradingResponse>('/grading/analyze', formData, {
            headers: {
                'Content-Type': 'multipart/form-data',
            },
        });
        return response.data;
    }
};
