import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    View, Text, StyleSheet, TouchableOpacity, TextInput,
    FlatList, KeyboardAvoidingView, Platform, Dimensions,
    ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useStore } from '../../../store';
import { ChatbotService, ChatResponse } from '../services/chatService';

const { width } = Dimensions.get('window');
const msgKeyExtractor = (item: Message) => item.id;

const themeColors = {
    primary: '#10B981',
    primaryDark: '#047857',
    background: '#F9FAFB',
    userBubble: '#10B981',
    botBubble: '#FFFFFF',
    textDark: '#1F2937',
    textLight: '#6B7280',
    highConfidence: '#10B981',
    mediumConfidence: '#F59E0B',
    lowConfidence: '#EF4444',
};

interface Message {
    id: string;
    text: string;
    sender: 'user' | 'bot';
    timestamp: Date;
    confidence?: number;
    confidence_level?: string;
    category?: string;
    suggested_topics?: string[];
    action?: {
        type: string;
        params: any;
    };
}

export default function ChatbotScreen() {
    const [message, setMessage] = useState('');
    const [messages, setMessages] = useState<Message[]>([]);
    const [isTyping, setIsTyping] = useState(false);
    const [sessionId] = useState(() => `session_${Date.now()}`);
    const [isOnline, setIsOnline] = useState(true);
    const flatListRef = useRef<FlatList>(null);
    const { user } = useStore();
    const navigation = useNavigation<any>();

    // Load welcome message on mount
    useEffect(() => {
        loadWelcome();
    }, []);

    const loadWelcome = useCallback(async () => {
        setIsTyping(true);
        // Parallel API calls instead of sequential — halves initial load time
        const [welcome, online] = await Promise.all([
            ChatbotService.getWelcome(),
            ChatbotService.getHealth()
        ]);
        setIsOnline(online);

        setMessages([{
            id: '0',
            text: welcome.reply,
            sender: 'bot',
            timestamp: new Date(),
            confidence: welcome.confidence,
            confidence_level: welcome.confidence_level,
            suggested_topics: welcome.suggested_topics,
        }]);
        setIsTyping(false);
    }, []);

    const handleSend = useCallback(async (text: string = message) => {
        if (!text.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: text.trim(),
            sender: 'user',
            timestamp: new Date(),
        };

        setMessages(prev => [...prev, userMsg]);
        setMessage('');
        setIsTyping(true);

        const response = await ChatbotService.sendMessage(text.trim(), sessionId, user?.latitude, user?.longitude);

        const botMsg: Message = {
            id: (Date.now() + 1).toString(),
            text: response.reply,
            sender: 'bot',
            timestamp: new Date(),
            confidence: response.confidence,
            confidence_level: response.confidence_level,
            category: response.category,
            suggested_topics: response.suggested_topics,
            action: response.action,
        };

        setMessages(prev => [...prev, botMsg]);
        setIsTyping(false);
    }, [message, sessionId]);

    const handleRefresh = useCallback(() => {
        setMessages([]);
        loadWelcome();
    }, [loadWelcome]);

    useEffect(() => {
        setTimeout(() => flatListRef.current?.scrollToEnd({ animated: true }), 100);
    }, [messages]);

    const formatTime = useCallback((date: Date) =>
        date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }), []);

    const getConfidenceColor = useCallback((level?: string) => {
        switch (level) {
            case 'high': return themeColors.highConfidence;
            case 'medium': return themeColors.mediumConfidence;
            case 'low': return themeColors.lowConfidence;
            default: return themeColors.textLight;
        }
    }, []);

    const getConfidenceIcon = useCallback((level?: string) => {
        switch (level) {
            case 'high': return 'checkmark-circle';
            case 'medium': return 'alert-circle';
            case 'low': return 'help-circle';
            default: return 'ellipse';
        }
    }, []);

    // Memoized render function for FlatList
    const renderMessage = useCallback(({ item: msg }: { item: Message }) => (
        <View key={msg.id} style={[styles.messageRow, msg.sender === 'user' ? styles.userRow : styles.botRow]}>
            {msg.sender === 'bot' && (
                <View style={styles.messageAvatar}>
                    <MaterialCommunityIcons name="robot" size={16} color="#FFF" />
                </View>
            )}

            <View style={[styles.messageBubble, msg.sender === 'user' ? styles.userBubble : styles.botBubble]}>
                <Text style={[styles.messageText, msg.sender === 'user' ? styles.userText : styles.botText]}>
                    {msg.text}
                </Text>

                {/* Confidence badge */}
                {msg.sender === 'bot' && msg.confidence_level && msg.confidence_level !== 'high' && (
                    <View style={styles.confidenceRow}>
                        <Ionicons
                            name={getConfidenceIcon(msg.confidence_level) as any}
                            size={12}
                            color={getConfidenceColor(msg.confidence_level)}
                        />
                        <Text style={[styles.confidenceText, { color: getConfidenceColor(msg.confidence_level) }]}>
                            {msg.confidence_level === 'medium' ? 'Partial match' : 'Low confidence'}
                        </Text>
                    </View>
                )}

                {/* Category tag */}
                {msg.sender === 'bot' && msg.category && msg.confidence_level === 'high' && (
                    <View style={styles.categoryTag}>
                        <Text style={styles.categoryText}>{msg.category}</Text>
                    </View>
                )}

                {/* Special Action Button */}
                {msg.sender === 'bot' && msg.action && msg.action.type === 'NAVIGATE_TO_MAP' && (
                    <TouchableOpacity
                        style={styles.actionButton}
                        onPress={() => navigation.navigate('DiseaseMap', msg.action!.params)}
                    >
                        <Ionicons name="map-outline" size={16} color="#FFF" />
                        <Text style={styles.actionButtonText}>View '{msg.action!.params.diseaseName}' on Map</Text>
                    </TouchableOpacity>
                )}

                <Text style={[styles.timestamp, msg.sender === 'user' ? styles.userTimestamp : styles.botTimestamp]}>
                    {formatTime(msg.timestamp)}
                </Text>
            </View>
        </View>
    ), [formatTime, getConfidenceColor, getConfidenceIcon]);

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
            keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 25}
        >
            {/* Header */}
            <LinearGradient
                colors={[themeColors.primary, themeColors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <View style={styles.headerTitleContainer}>
                    <View style={styles.avatarContainer}>
                        <MaterialCommunityIcons name="robot" size={24} color={themeColors.primary} />
                        <View style={[styles.statusDot, { backgroundColor: isOnline ? '#22C55E' : '#EF4444' }]} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>RubberBot</Text>
                        <Text style={styles.headerSubtitle}>
                            {isOnline ? 'Online • Rubber Expert' : 'Offline • Connecting...'}
                        </Text>
                    </View>
                </View>

                <TouchableOpacity onPress={handleRefresh} style={styles.headerAction}>
                    <MaterialCommunityIcons name="refresh" size={22} color="rgba(255,255,255,0.9)" />
                </TouchableOpacity>
            </LinearGradient>

            {/* Chat Area — FlatList for virtualized rendering */}
            <FlatList
                ref={flatListRef}
                style={styles.chatArea}
                contentContainerStyle={styles.chatContent}
                showsVerticalScrollIndicator={false}
                data={messages}
                renderItem={renderMessage}
                keyExtractor={msgKeyExtractor}
                initialNumToRender={15}
                maxToRenderPerBatch={10}
                windowSize={10}
                ListHeaderComponent={<Text style={styles.dateLabel}>Today</Text>}
                ListFooterComponent={
                    <>
                        {/* Suggested Topics */}
                        {messages.length > 0 && messages[messages.length - 1].sender === 'bot' &&
                            messages[messages.length - 1].suggested_topics &&
                            (messages[messages.length - 1].suggested_topics?.length ?? 0) > 0 && (
                                <View style={styles.suggestionsContainer}>
                                    <Text style={styles.suggestionsLabel}>Related topics:</Text>
                                    <FlatList
                                        horizontal
                                        showsHorizontalScrollIndicator={false}
                                        data={messages[messages.length - 1].suggested_topics}
                                        keyExtractor={(topic, i) => `topic-${i}`}
                                        renderItem={({ item: topic }) => (
                                            <TouchableOpacity
                                                style={styles.suggestionChip}
                                                onPress={() => handleSend(topic)}
                                            >
                                                <Text style={styles.suggestionText} numberOfLines={2}>{topic}</Text>
                                            </TouchableOpacity>
                                        )}
                                    />
                                </View>
                            )}

                        {/* Typing indicator */}
                        {isTyping && (
                            <View style={styles.typingContainer}>
                                <ActivityIndicator size="small" color={themeColors.primary} />
                                <Text style={styles.typingText}>RubberBot is thinking...</Text>
                            </View>
                        )}
                    </>
                }
            />

            {/* Input Area */}
            <View style={styles.inputContainer}>
                <View style={styles.inputWrapper}>
                    <TextInput
                        style={styles.input}
                        placeholder="Ask about rubber cultivation..."
                        placeholderTextColor="#9CA3AF"
                        value={message}
                        onChangeText={setMessage}
                        multiline
                        onSubmitEditing={() => handleSend()}
                    />
                </View>
                <TouchableOpacity
                    style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
                    onPress={() => handleSend()}
                    disabled={!message.trim() || isTyping}
                >
                    <Ionicons name="send" size={18} color="#FFF" />
                </TouchableOpacity>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: themeColors.background },
    header: {
        flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
        paddingHorizontal: 16, paddingTop: 50, paddingBottom: 16,
        borderBottomLeftRadius: 20, borderBottomRightRadius: 20,
        elevation: 6, shadowColor: themeColors.primary,
        shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 8,
    },
    headerTitleContainer: { flex: 1, flexDirection: 'row', alignItems: 'center' },
    avatarContainer: {
        width: 40, height: 40, backgroundColor: '#FFF', borderRadius: 20,
        justifyContent: 'center', alignItems: 'center', marginRight: 10, position: 'relative',
    },
    statusDot: {
        width: 10, height: 10, borderRadius: 5, position: 'absolute',
        bottom: 0, right: 0, borderWidth: 2, borderColor: '#FFF',
    },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#FFF' },
    headerSubtitle: { fontSize: 12, color: 'rgba(255,255,255,0.85)', fontWeight: '500' },
    headerAction: { padding: 8 },
    chatArea: { flex: 1 },
    chatContent: { padding: 16, paddingBottom: 24 },
    dateLabel: { textAlign: 'center', color: '#9CA3AF', fontSize: 12, marginBottom: 16, fontWeight: '500' },
    messageRow: { marginBottom: 12, flexDirection: 'row', alignItems: 'flex-end' },
    userRow: { justifyContent: 'flex-end' },
    botRow: { justifyContent: 'flex-start' },
    messageAvatar: {
        width: 28, height: 28, borderRadius: 14, backgroundColor: themeColors.primary,
        justifyContent: 'center', alignItems: 'center', marginRight: 8,
    },
    messageBubble: {
        maxWidth: '78%', padding: 12, borderRadius: 18,
        shadowColor: '#000', shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05, shadowRadius: 2, elevation: 1,
    },
    userBubble: { backgroundColor: themeColors.userBubble, borderBottomRightRadius: 4 },
    botBubble: { backgroundColor: themeColors.botBubble, borderBottomLeftRadius: 4 },
    messageText: { fontSize: 14.5, lineHeight: 21 },
    userText: { color: '#FFF' },
    botText: { color: themeColors.textDark },
    timestamp: { fontSize: 10, marginTop: 4, alignSelf: 'flex-end' },
    userTimestamp: { color: 'rgba(255,255,255,0.7)' },
    botTimestamp: { color: '#9CA3AF' },
    confidenceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 6, gap: 4 },
    confidenceText: { fontSize: 11, fontWeight: '600' },
    categoryTag: {
        alignSelf: 'flex-start', marginTop: 6, paddingHorizontal: 8, paddingVertical: 2,
        backgroundColor: themeColors.primary + '15', borderRadius: 8,
    },
    categoryText: { fontSize: 11, color: themeColors.primary, fontWeight: '600' },
    suggestionsContainer: { marginLeft: 36, marginBottom: 12, marginTop: 4 },
    suggestionsLabel: { fontSize: 11, color: '#9CA3AF', marginBottom: 6, fontWeight: '500' },
    suggestionChip: {
        backgroundColor: '#FFF', paddingHorizontal: 12, paddingVertical: 8,
        borderRadius: 16, marginRight: 8, borderWidth: 1, borderColor: themeColors.primary + '30',
        maxWidth: 220,
    },
    suggestionText: { fontSize: 12, color: themeColors.primary, fontWeight: '500' },
    typingContainer: { flexDirection: 'row', alignItems: 'center', marginLeft: 36, marginBottom: 12, gap: 8 },
    typingText: { fontSize: 12, color: '#6B7280', fontStyle: 'italic' },
    inputContainer: {
        padding: 12, paddingBottom: Platform.OS === 'ios' ? 30 : 12,
        backgroundColor: '#FFF', flexDirection: 'row', alignItems: 'center',
        borderTopWidth: 1, borderTopColor: '#E5E7EB',
    },
    inputWrapper: {
        flex: 1, backgroundColor: '#F3F4F6', borderRadius: 22,
        paddingHorizontal: 16, paddingVertical: 8, marginRight: 8,
        minHeight: 42, justifyContent: 'center',
    },
    input: { fontSize: 15, color: themeColors.textDark, padding: 0 },
    sendButton: {
        width: 42, height: 42, borderRadius: 21, backgroundColor: themeColors.primary,
        justifyContent: 'center', alignItems: 'center',
        shadowColor: themeColors.primary, shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3, shadowRadius: 4, elevation: 3,
    },
    sendButtonDisabled: { backgroundColor: '#D1D5DB', shadowOpacity: 0 },
    actionButton: {
        flexDirection: 'row', alignItems: 'center', backgroundColor: themeColors.primaryDark,
        paddingHorizontal: 14, paddingVertical: 10, borderRadius: 10, marginTop: 12, gap: 8,
        alignSelf: 'flex-start',
    },
    actionButtonText: { color: '#FFF', fontSize: 13, fontWeight: '600' },
});