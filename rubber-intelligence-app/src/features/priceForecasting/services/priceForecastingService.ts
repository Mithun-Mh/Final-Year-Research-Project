import apiClient from '../../../core/api/apiClient';

export interface PriceRequest {
    rubberSheetGrade: string;
    quantityKg: number;
    // UPDATED: Changed to string categories
    moistureLevel: string;
    cleanliness: string;
    visualQualityScore: number;
    district: string;
    marketAvailability: string;
}

export interface PriceResponse {
    predictedPriceLkr: number;
    currency: string;
}

export const PriceForecastingService = {
    predictPrice: async (data: PriceRequest): Promise<PriceResponse> => {
        const response = await apiClient.post<PriceResponse>('/price/predict', data);
        return response.data;
    },

    getPriceHistory: async (): Promise<any[]> => {
        const response = await apiClient.get<any[]>('/price/history');
        return response.data;
    }
};
