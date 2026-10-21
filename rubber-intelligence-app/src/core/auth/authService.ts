import apiClient from '../api/apiClient';
import { LoginCredentials, RegisterCredentials, AuthResponse } from './authTypes';
import { saveToken, removeToken } from './tokenStorage';

export const AuthService = {
    login: async (credentials: LoginCredentials): Promise<AuthResponse> => {
        const response = await apiClient.post<AuthResponse>('/auth/login', credentials);
        if (response.data && response.data.token) {
            await saveToken(response.data.token);
        }
        return response.data;
    },

    register: async (credentials: RegisterCredentials): Promise<any> => {
        const response = await apiClient.post('/auth/register', credentials);
        return response.data; // Returns { message, user } — no token (pending approval)
    },

    updateProfile: async (data: {
        fullName?: string;
        password?: string;
        plantationName?: string;
        latitude?: number;
        longitude?: number;
    }) => {
        const response = await apiClient.put('/auth/profile', data);
        return response.data;
    },

    logout: async (): Promise<void> => {
        await removeToken();
    },

    getCurrentUser: async () => {
        const response = await apiClient.get('/auth/me');
        return response.data;
    },
};


