import { ENV } from '../../../core/config/environment';

// Extract hostname from API_URL (e.g., "http://10.66.11.216:5001/api" → "10.66.11.216")
const getHost = () => {
    try {
        const url = new URL(ENV.API_URL);
        return url.hostname;
    } catch {
        return 'localhost';
    }
};

const CHATBOT_BASE_URL = `http://${getHost()}:5008`;

export interface ChatResponse {
    reply: string;
    confidence: number;
    confidence_level: 'high' | 'medium' | 'low';
    category?: string;
    sources?: { category: string; question: string; score: number }[];
    suggested_topics?: string[];
    action?: {
        type: string;
        params: any;
    };
}

export interface TopicsByCategory {
    [category: string]: { id: string; question: string }[];
}

export const ChatbotService = {
    sendMessage: async (message: string, sessionId: string, latitude?: number, longitude?: number): Promise<ChatResponse> => {
        try {
            const bodyData: any = { message, sessionId };
            if (latitude !== undefined) bodyData.latitude = latitude;
            if (longitude !== undefined) bodyData.longitude = longitude;

            const response = await fetch(`${CHATBOT_BASE_URL}/api/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(bodyData),
            });

            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        } catch (error) {
            console.error('Chatbot API error:', error);
            // Offline fallback
            return {
                reply: "I'm unable to connect to the chatbot service. Please make sure the Python chatbot server is running on port 5008.",
                confidence: 0,
                confidence_level: 'low',
                suggested_topics: [],
            };
        }
    },

    getWelcome: async (): Promise<ChatResponse> => {
        try {
            const response = await fetch(`${CHATBOT_BASE_URL}/api/chat/welcome`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        } catch (error) {
            return {
                reply: "Hello! I'm **RubberBot** 🌿, your rubber cultivation expert.\n\nI seem to be offline right now. Please ensure the chatbot server is running.",
                confidence: 1.0,
                confidence_level: 'high',
                suggested_topics: [
                    "What is Corynespora leaf fall?",
                    "What is DRC and how to measure it?",
                    "How to make ribbed smoked sheets?"
                ],
            };
        }
    },

    getTopics: async (): Promise<TopicsByCategory> => {
        try {
            const response = await fetch(`${CHATBOT_BASE_URL}/api/chat/topics`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return response.json();
        } catch (error) {
            return {};
        }
    },

    getHealth: async (): Promise<boolean> => {
        try {
            const response = await fetch(`${CHATBOT_BASE_URL}/api/chat/health`);
            return response.ok;
        } catch {
            return false;
        }
    },
};
