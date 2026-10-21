import axios from 'axios';
import { ENV } from '../config/environment';
import { getToken } from '../auth/tokenStorage';

const apiClient = axios.create({
    baseURL: ENV.API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 15000,
});

apiClient.interceptors.request.use(
    async (config) => {
        const token = await getToken();
        if (token) {
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

apiClient.interceptors.response.use(
    (response) => response,
    async (error) => {
        const config = error.config;

        // Handle 401 Unauthorized
        if (error.response && error.response.status === 401) {
            const url: string = config?.url ?? '';
            // Suppress warning for auth endpoints — 401 there is expected
            // (no session, expired token, wrong credentials)
            if (!url.includes('/auth/')) {
                console.warn('Session expired - please log in again');
            }
            return Promise.reject(error);
        }

        // Setup retry logic for transient errors (Network errors, 5xx server errors, timeouts)
        if (!config || !config.retry) {
            // First time failing
            config.retry = { count: 0, maxRetries: 2, delay: 1000 };
        }

        const isNetworkError = !error.response || (error.response.status >= 500 && error.response.status <= 599);

        if (isNetworkError && config.retry.count < config.retry.maxRetries) {
            config.retry.count += 1;
            console.log(`[Axios] Transient error detected. Retrying request (${config.retry.count}/${config.retry.maxRetries})...`);

            // Wait for delay
            await new Promise(resolve => setTimeout(resolve, config.retry.delay));

            // Retry the original request
            return apiClient(config);
        }

        return Promise.reject(error);
    }
);

export default apiClient;
