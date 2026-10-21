/**
 * LotMessagingScreen
 *
 * Secure chat interface linked to a specific Lot ID.
 * - Toggle "Confidential Message" to encrypt content with AES-256-CBC on the backend.
 * - Plain messages are stored as-is; confidential messages are stored as ciphertext.
 * - All content is returned as plaintext by the service layer (decryption happens server-side).
 */
import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    View, Text, StyleSheet, FlatList, TextInput,
    TouchableOpacity, KeyboardAvoidingView, Platform,
    ActivityIndicator, Switch, Alert
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { sendMessage, getMessages, markLotRead } from '../services/messagesService';
import { MessageDto } from '../types';

export default function LotMessagingScreen() {
    const route = useRoute<any>();
    const navigation = useNavigation<any>();
    const { lotId, receiverId, lotLabel } = route.params as {
        lotId: string;
        receiverId: string;
        lotLabel?: string;
    };

    const [messages, setMessages] = useState<MessageDto[]>([]);
    const [content, setContent] = useState('');
    const [isConfidential, setIsConfidential] = useState(false);
    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const listRef = useRef<FlatList>(null);

    const load = useCallback(async () => {
        try {
            const data = await getMessages(lotId);
            setMessages(data);
            markLotRead(lotId).catch(() => {}); // best-effort: clear badge on open
        } catch (e) {
            console.error('Failed to load messages', e);
        } finally {
            setLoading(false);
        }
    }, [lotId]);

    useEffect(() => { load(); }, [load]);

    useEffect(() => {
        if (messages.length > 0) {
            setTimeout(() => listRef.current?.scrollToEnd({ animated: true }), 100);
        }
    }, [messages]);

    const handleSend = async () => {
        const trimmed = content.trim();
        if (!trimmed) return;
        setSending(true);
        try {
            const sent = await sendMessage(lotId, { receiverId, content: trimmed, isConfidential });
            setMessages(prev => [...prev, sent]);
            setContent('');
        } catch (e: any) {
            Alert.alert('Send Failed', e?.response?.data?.error ?? 'Could not send message.');
        } finally {
            setSending(false);
        }
    };

    const renderMessage = ({ item }: { item: MessageDto }) => {
        const isMine = item.receiverId === receiverId;
        return (
            <View style={[styles.bubble, isMine ? styles.bubbleMine : styles.bubbleTheirs]}>
                {item.isConfidential && (
                    <View style={styles.confidentialTag}>
                        <Ionicons name="lock-closed" size={10} color="#5856D6" />
                        <Text style={styles.confidentialTagText}>Confidential</Text>
                    </View>
                )}
                <Text style={[styles.bubbleText, isMine ? styles.bubbleTextMine : styles.bubbleTextTheirs]}>
                    {item.content}
                </Text>
                <Text style={styles.bubbleTime}>
                    {new Date(item.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </Text>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            keyboardVerticalOffset={90}
        >
            <View style={styles.header}>
                <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
                    <Ionicons name="arrow-back" size={24} color="#1C1C1E" />
                </TouchableOpacity>
                <View style={styles.headerInfo}>
                    <Text style={styles.headerTitle} numberOfLines={1}>
                        {lotLabel ?? `Lot ${lotId.substring(0, 10)}…`}
                    </Text>
                    <Text style={styles.headerSub}>Secure Lot Messaging</Text>
                </View>
                <Ionicons name="shield-checkmark" size={20} color="#34C759" />
            </View>

            {loading ? (
                <View style={styles.center}>
                    <ActivityIndicator size="large" color="#5856D6" />
                </View>
            ) : (
                <FlatList
                    ref={listRef}
                    data={messages}
                    keyExtractor={item => item.id}
                    renderItem={renderMessage}
                    contentContainerStyle={styles.list}
                    ListEmptyComponent={
                        <View style={styles.emptyWrap}>
                            <Ionicons name="chatbubbles-outline" size={48} color="#C7C7CC" />
                            <Text style={styles.emptyText}>No messages yet. Start the conversation.</Text>
                        </View>
                    }
                />
            )}

            <View style={styles.compose}>
                <View style={styles.confidentialRow}>
                    <Ionicons
                        name={isConfidential ? 'lock-closed' : 'lock-open-outline'}
                        size={16}
                        color={isConfidential ? '#5856D6' : '#9CA3AF'}
                    />
                    <Text style={[styles.confidentialLabel, { color: isConfidential ? '#5856D6' : '#9CA3AF' }]}>
                        Confidential
                    </Text>
                    <Switch
                        value={isConfidential}
                        onValueChange={setIsConfidential}
                        trackColor={{ false: '#E5E5EA', true: '#BFB8F5' }}
                        thumbColor={isConfidential ? '#5856D6' : '#FFFFFF'}
                        style={{ transform: [{ scaleX: 0.8 }, { scaleY: 0.8 }] }}
                    />
                </View>
                <View style={styles.inputRow}>
                    <TextInput
                        style={styles.input}
                        value={content}
                        onChangeText={setContent}
                        placeholder={isConfidential ? 'Confidential message…' : 'Type a message…'}
                        placeholderTextColor="#C7C7CC"
                        multiline
                        maxLength={2000}
                    />
                    <TouchableOpacity
                        style={[styles.sendBtn, { opacity: content.trim() ? 1 : 0.4 }]}
                        onPress={handleSend}
                        disabled={sending || !content.trim()}
                    >
                        {sending
                            ? <ActivityIndicator size="small" color="white" />
                            : <Ionicons name="send" size={20} color="white" />}
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: '#F2F2F7' },
    center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
    header: {
        flexDirection: 'row', alignItems: 'center',
        paddingTop: 56, paddingBottom: 14, paddingHorizontal: 16,
        backgroundColor: 'white', borderBottomWidth: 1, borderBottomColor: '#E5E5EA', gap: 12,
    },
    backBtn: { padding: 4 },
    headerInfo: { flex: 1 },
    headerTitle: { fontSize: 16, fontWeight: '700', color: '#1C1C1E' },
    headerSub: { fontSize: 12, color: '#636366', marginTop: 1 },
    list: { padding: 16, paddingBottom: 8 },
    emptyWrap: { alignItems: 'center', paddingTop: 80, gap: 10 },
    emptyText: { color: '#9CA3AF', textAlign: 'center', fontSize: 14, paddingHorizontal: 40 },
    bubble: { maxWidth: '78%', padding: 12, borderRadius: 18, marginBottom: 8 },
    bubbleMine: {
        alignSelf: 'flex-end', backgroundColor: '#5856D6', borderBottomRightRadius: 4,
    },
    bubbleTheirs: {
        alignSelf: 'flex-start', backgroundColor: 'white', borderBottomLeftRadius: 4,
        shadowColor: '#000', shadowOpacity: 0.05, shadowRadius: 4, elevation: 1,
    },
    confidentialTag: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
    confidentialTagText: { fontSize: 10, color: '#5856D6', fontWeight: '700' },
    bubbleText: { fontSize: 15, lineHeight: 20 },
    bubbleTextMine: { color: 'white' },
    bubbleTextTheirs: { color: '#1C1C1E' },
    bubbleTime: { fontSize: 10, color: 'rgba(255,255,255,0.6)', marginTop: 4, textAlign: 'right' },
    compose: {
        backgroundColor: 'white', borderTopWidth: 1, borderTopColor: '#E5E5EA',
        padding: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 12,
    },
    confidentialRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 },
    confidentialLabel: { fontSize: 13, fontWeight: '600', flex: 1 },
    inputRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10 },
    input: {
        flex: 1, minHeight: 42, maxHeight: 120,
        backgroundColor: '#F2F2F7', borderRadius: 22,
        paddingHorizontal: 16, paddingVertical: 10, fontSize: 15, color: '#1C1C1E',
    },
    sendBtn: {
        width: 42, height: 42, borderRadius: 21,
        backgroundColor: '#5856D6', justifyContent: 'center', alignItems: 'center',
    },
});
