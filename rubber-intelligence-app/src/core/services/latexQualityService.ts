import apiClient from '../api/apiClient';

export interface LatexQualityRequest {
    temperature: number;
    turbidity: number;
    pH: number;
    testId?: string;
    testerName?: string;
    testDate?: Date;
}

export interface SensorReadings {
    temperature: number;
    turbidity: number;
    pH: number;
}

export interface LatexQualityResponse {
    qualityGrade: string; // "Excellent", "Good", "Fair", "Poor"
    confidence: number; // 0-1
    qualityScore: number; // 0-100
    status: string; // "Pass", "Warning", "Fail"
    recommendations: string[];
    sensorReadings: SensorReadings;
}

export const latexQualityService = {
    async predictQuality(request: LatexQualityRequest): Promise<LatexQualityResponse> {
        try {
            const response = await apiClient.post<LatexQualityResponse>(
                '/latex-quality/predict',
                {
                    temperature: request.temperature,
                    turbidity: request.turbidity,
                    pH: request.pH,
                    testId: request.testId,
                    testerName: request.testerName,
                    testDate: request.testDate
                }
            );
            return response.data;
        } catch (error: any) {
            console.error('Latex quality prediction failed:', error);
            throw new Error(
                error.response?.data?.message ||
                error.message ||
                'Failed to predict latex quality'
            );
        }
    }
};
