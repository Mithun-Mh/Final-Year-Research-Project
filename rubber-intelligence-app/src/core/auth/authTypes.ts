export interface User {
    id: string;
    email: string;
    name: string;
    role: 'admin' | 'researcher' | 'farmer' | 'buyer' | 'exporter';
    plantationName?: string;
    latitude?: number;
    longitude?: number;
}

export interface AuthResponse {
    token: string;
    user: User;
}

export interface LoginCredentials {
    email: string;
    password: string;
}

export interface RegisterCredentials {
    fullName: string;
    email: string;
    password: string;
    role: string;
    plantationName?: string;
    latitude?: number;
    longitude?: number;
}

