import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'user_auth_token';

// In-memory cache to avoid SecureStore bridge call on every API request
let cachedToken: string | null = null;
let tokenCacheInitialized = false;

export const saveToken = async (token: string): Promise<void> => {
    cachedToken = token;
    tokenCacheInitialized = true;
    await SecureStore.setItemAsync(TOKEN_KEY, token);
};

export const getToken = async (): Promise<string | null> => {
    if (tokenCacheInitialized) return cachedToken;
    cachedToken = await SecureStore.getItemAsync(TOKEN_KEY);
    tokenCacheInitialized = true;
    return cachedToken;
};

export const removeToken = async (): Promise<void> => {
    cachedToken = null;
    tokenCacheInitialized = true;
    await SecureStore.deleteItemAsync(TOKEN_KEY);
};
