import React, { useState, useRef, useEffect } from "react";
import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    TextInput,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Dimensions
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useNavigation } from "@react-navigation/native";
import Animated, { FadeInUp, FadeInDown } from "react-native-reanimated";

const { width } = Dimensions.get("window");

const colors = {
    primary: "#10B981",
    background: "#F9FAFB",
    userBubble: "#DCFCE7",
    expertBubble: "#FFFFFF",
    textDark: "#1F2937",
    textLight: "#6B7280",
};

interface Message {
    id: string;
    text: string;
    sender: "user" | "expert";
    timestamp: Date;
    isSystem?: boolean;
}

const QA_KNOWLEDGE_BASE = [
    { q: "What is the ideal storage temperature for latex?", a: "Natural rubber latex should be stored between 25°C and 30°C. Temperatures above 35°C can accelerate bacterial growth and destabilisation, while freezing temps can irreversibly coagulate the latex.", icon: "thermometer" },
    { q: "How much ammonia should be added for preservation?", a: "For long-term storage, High Ammonia (HA) latex requires a concentration of min 0.70% w/w. Low Ammonia (LA) varieties typically use 0.20% w/w plus secondary preservatives like TMTD/ZnO.", icon: "flask" },
    { q: "Why is my latex coagulating in the drum?", a: "Coagulation is often caused by high bacterial activity (VFA formation) due to insufficient preservation, or localized acidification from dirty containers. Check pH and VFA levels immediately.", icon: "alert-circle" },
    { q: "How do I prevent bad odors in storage?", a: "Bad odors (putrefactive smell) indicate bacterial spoilage. Maintain strict hygiene, ensure airtight seals, and maintain adequate ammonia levels to inhibit bacterial activity.", icon: "scent" },
    { q: "Can I store latex in iron drums?", a: "Iron drums must be coated with epoxy or bitumen. Direct contact with iron ions (Fe) catalyzes oxidation, causing latex to darken and degrade. Plastic (HDPE) or stainless steel is preferred.", icon: "barrel" },
    { q: "How often should I test the stored latex?", a: "Quality parameters (pH, VFA, MST, Alkalinity) should be tested every 24 hours for the first week, then weekly if stable. Immediate testing is needed if temperature fluctuates.", icon: "clipboard-pulse" },
    { q: "What is the maximum storage duration?", a: "Properly preserved HA latex can be stored for 6-12 months. However, MST (Mechanical Stability Time) tends to increase initially but may drop after prolonged storage. Monitor ZOV viscosity.", icon: "calendar-clock" },
    { q: "Why is the VFA number increasing?", a: "A rising Volatile Fatty Acid (VFA) number indicates bacterial fermentation of non-rubber solids. This is a critical warning sign. Increase preservation or use a biocide immediately.", icon: "chart-line-variant" },
    { q: "Effect of direct sunlight on bacteria?", a: "Direct sunlight heats the drums, promoting bacterial growth and destabilization. UV rays can also degrade the rubber polymer at the surface.", icon: "weather-sunny-alert" },
    { q: "How to handle a latex spill?", a: "Contain the spill immediately using sand or earth. Do not wash into drains as it clogs pipes and pollutes. Coagulate with weak acid if necessary for solid removal.", icon: "water-off" },
    { q: "Can I mix old and new latex stocks?", a: "Avoid mixing unless both stocks have been tested. 'Seeding' bacteria from old spoiled latex into fresh latex can ruin the entire new batch rapidly.", icon: "flask-empty-minus" },
    { q: "What safety gear is needed?", a: "Ammonia fumes are hazardous. Usage of respirators, safety goggles, and rubber gloves is mandatory when opening drums or conducting tests.", icon: "account-hard-hat" },
    { q: "Why did the latex viscosity increase?", a: "Viscosity increase can result from 'creaming' (separation) or chemical thickening due to high Zinc Oxide (ZnO) sensitivity over time. Stirring may help if it's just creaming.", icon: "water-plus" },
    { q: "What is MST and why does it matter?", a: "Mechanical Stability Time (MST) measures resistance to shear forces. Low MST means the latex will coagulate inside pumps or during transport. Aim for >650 seconds.", icon: "timer-sand" },
    { q: "How to transport latex safely?", a: "Fill tankers fully to reduce 'sloshing' which causes coagulation. Ensure tankers are clean and free of dried skins from previous loads.", icon: "truck-delivery" },
    { q: "Effect of rain water contamination?", a: "Rain water dilutes the preservative concentration and introduces bacteria / magnesium. This rapidly drops pH and causes coagulation. Ensure lids are watertight.", icon: "water-alert" },
    { q: "What does the DRC test tell me?", a: "Dry Rubber Content (DRC) indicates the actual rubber mass. A noticeable drop in DRC during storage suggests sludge formation or theft/dilution.", icon: "scale" },
    { q: "How to correct low pH?", a: "If pH drops below 10.0, add ammonia gas or solution carefully with mixing. If VFA is already high, ammonia alone may not save the batch; secondary bactericides may be needed.", icon: "water-check" },
    { q: "What is 'skinning' on the surface?", a: "Surface drying or 'skinning' occurs due to air exposure. Always keep containers sealed. Remove skins carefully before mixing to avoid blocking filters.", icon: "layers-off" },
    { q: "Why is the latex color changing to grey?", a: "Grey or black discoloration usually points to iron contamination or chemical reaction with container walls. Verify the drum lining condition immediately.", icon: "palette-swatch" }
];

export default function ExpertChatScreen() {
    const navigation = useNavigation();
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState<Message[]>([
        {
            id: "1",
            text: "Hello! I'm Dr. Latex, your storage and quality expert. How can I assist you today regarding latex preservation?",
            sender: "expert",
            timestamp: new Date(),
        },
    ]);
    const scrollViewRef = useRef<ScrollView>(null);
    const [isTyping, setIsTyping] = useState(false);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");

    const filteredSuggestions = QA_KNOWLEDGE_BASE.filter(item =>
        item.q.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleSend = (text: string = message) => {
        if (!text.trim()) return;

        const userMsg: Message = {
            id: Date.now().toString(),
            text: text,
            sender: "user",
            timestamp: new Date(),
        };

        setMessages((prev) => [...prev, userMsg]);
        setMessage("");
        setIsTyping(true);

        // Check for knowledge base match
        const knowledgeMatch = QA_KNOWLEDGE_BASE.find(k => k.q === text);

        // Mock expert response
        setTimeout(() => {
            const expertMsg: Message = {
                id: (Date.now() + 1).toString(),
                text: knowledgeMatch
                    ? knowledgeMatch.a
                    : "I'm analyzing your specific query. Generally, for storage issues, ensuring air-tight seals and stable temperatures (25-30°C) solves 80% of problems. Could you provide more details?",
                sender: "expert",
                timestamp: new Date(),
            };
            setMessages((prev) => [...prev, expertMsg]);
            setIsTyping(false);
        }, 1500);
    };

    const handleRefresh = () => {
        setMessages([
            {
                id: Date.now().toString(),
                text: "Hello! I'm Dr. Latex, your storage and quality expert. How can I assist you today regarding latex preservation?",
                sender: "expert",
                timestamp: new Date(),
            },
        ]);
        setMessage("");
        setIsTyping(false);
    };

    useEffect(() => {
        setTimeout(() => {
            scrollViewRef.current?.scrollToEnd({ animated: true });
        }, 100);
    }, [messages]);

    const formatTime = (date: Date) => {
        return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    const renderSuggestions = () => {
        if (!showSuggestions) return null;

        return (
            <View style={styles.suggestionsContainer}>
                <View style={styles.suggestionsHeader}>
                    <Text style={styles.suggestionsTitle}>Common Topics:</Text>
                    <TouchableOpacity onPress={() => setShowSuggestions(false)}>
                        <MaterialCommunityIcons name="close" size={20} color="#9CA3AF" />
                    </TouchableOpacity>
                </View>

                {/* SEARCH BAR IN SUGGESTIONS */}
                <View style={styles.searchContainer}>
                    <Ionicons name="search" size={16} color="#9CA3AF" style={styles.searchIcon} />
                    <TextInput
                        style={styles.searchInput}
                        placeholder="Search questions..."
                        placeholderTextColor="#9CA3AF"
                        value={searchQuery}
                        onChangeText={setSearchQuery}
                    />
                    {searchQuery.length > 0 && (
                        <TouchableOpacity onPress={() => setSearchQuery("")}>
                            <MaterialCommunityIcons name="close-circle" size={16} color="#9CA3AF" />
                        </TouchableOpacity>
                    )}
                </View>

                <ScrollView
                    horizontal
                    showsHorizontalScrollIndicator={false}
                    contentContainerStyle={styles.suggestionsScroll}
                    keyboardShouldPersistTaps="handled"
                >
                    {filteredSuggestions.map((item, index) => (
                        <TouchableOpacity
                            key={index}
                            style={styles.suggestionChip}
                            onPress={() => {
                                handleSend(item.q);
                                setShowSuggestions(false);
                            }}
                        >
                            <MaterialCommunityIcons
                                name={item.icon as any}
                                size={16}
                                color={colors.primary}
                                style={styles.suggestionIcon}
                            />
                            <Text style={styles.suggestionText}>{item.q}</Text>
                        </TouchableOpacity>
                    ))}
                    {filteredSuggestions.length === 0 && (
                        <Text style={styles.noResultsText}>No topics found</Text>
                    )}
                </ScrollView>
            </View>
        );
    };

    return (
        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
            keyboardVerticalOffset={Platform.OS === "ios" ? 0 : 0}
        >
            {/* GRADIENT HEADER */}
            <LinearGradient
                colors={[colors.primary, "#047857"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.header}
            >
                <TouchableOpacity
                    onPress={() => navigation.goBack()}
                    style={styles.headerBackButton}
                >
                    <Ionicons name="arrow-back" size={24} color="#FFF" />
                </TouchableOpacity>

                <View style={styles.headerTitleContainer}>
                    <View style={styles.avatarContainer}>
                        <MaterialCommunityIcons name="face-man-profile" size={24} color={colors.primary} />
                        <View style={styles.onlineBadge} />
                    </View>
                    <View>
                        <Text style={styles.headerTitle}>Dr. Latex</Text>
                        <Text style={styles.headerSubtitle}>Senior Quality Consultant</Text>
                    </View>
                </View>

                <View style={{ flexDirection: 'row' }}>
                    <TouchableOpacity onPress={handleRefresh} style={[styles.headerRightAction, { marginRight: 4 }]}>
                        <MaterialCommunityIcons name="refresh" size={24} color="rgba(255,255,255,0.9)" />
                    </TouchableOpacity>
                    <TouchableOpacity style={styles.headerRightAction}>
                        <MaterialCommunityIcons name="dots-vertical" size={24} color="rgba(255,255,255,0.8)" />
                    </TouchableOpacity>
                </View>
            </LinearGradient>

            {/* CHAT AREA */}
            <ScrollView
                ref={scrollViewRef}
                style={styles.chatArea}
                contentContainerStyle={styles.chatContent}
                showsVerticalScrollIndicator={false}
            >
                <Text style={styles.dateLabel}>Today</Text>

                {messages.map((msg, index) => (
                    <Animated.View
                        key={msg.id}
                        entering={FadeInUp.delay(index * 100).duration(400)}
                        style={[
                            styles.messageRow,
                            msg.sender === "user" ? styles.userRow : styles.expertRow
                        ]}
                    >
                        {msg.sender === "expert" && (
                            <View style={styles.messageAvatar}>
                                <MaterialCommunityIcons name="face-man-profile" size={20} color="#FFF" />
                            </View>
                        )}

                        <View style={[
                            styles.messageBubble,
                            msg.sender === "user" ? styles.userBubble : styles.expertBubble
                        ]}>
                            <Text style={[
                                styles.messageText,
                                msg.sender === "user" ? styles.userText : styles.expertText
                            ]}>{msg.text}</Text>
                            <Text style={[
                                styles.timestamp,
                                msg.sender === "user" ? styles.userTimestamp : styles.expertTimestamp
                            ]}>{formatTime(msg.timestamp)}</Text>
                        </View>
                    </Animated.View>
                ))}

                {isTyping && (
                    <View style={styles.typingContainer}>
                        <Text style={styles.typingText}>Dr. Latex is typing...</Text>
                    </View>
                )}
            </ScrollView>

            {/* INPUT AREA */}
            <View>
                {renderSuggestions()}
                <View style={styles.inputContainer}>
                    <TouchableOpacity
                        style={styles.attachButton}
                        onPress={() => {
                            setShowSuggestions(!showSuggestions);
                            setSearchQuery("");
                        }}
                    >
                        <MaterialCommunityIcons
                            name={showSuggestions ? "close" : "plus"}
                            size={24}
                            color={showSuggestions ? colors.primary : "#9CA3AF"}
                        />
                    </TouchableOpacity>

                    <View style={styles.inputWrapper}>
                        <TextInput
                            style={styles.input}
                            placeholder="Type your message..."
                            placeholderTextColor="#9CA3AF"
                            value={message}
                            onChangeText={setMessage}
                            multiline
                        />
                    </View>

                    <TouchableOpacity
                        style={[styles.sendButton, !message.trim() && styles.sendButtonDisabled]}
                        onPress={() => handleSend(message)}
                        disabled={!message.trim()}
                    >
                        <MaterialCommunityIcons name="send" size={20} color="#FFF" />
                    </TouchableOpacity>
                </View>
            </View>
        </KeyboardAvoidingView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.background,
    },
    header: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "space-between",
        paddingHorizontal: 16,
        paddingTop: 50,
        paddingBottom: 16,
        borderBottomLeftRadius: 24,
        borderBottomRightRadius: 24,
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.15,
        shadowRadius: 8,
        elevation: 8,
        zIndex: 10,
    },
    headerBackButton: {
        padding: 8,
        backgroundColor: "rgba(255,255,255,0.15)",
        borderRadius: 12,
    },
    headerTitleContainer: {
        flex: 1,
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        paddingHorizontal: 16,
    },
    avatarContainer: {
        width: 40,
        height: 40,
        backgroundColor: "#FFF",
        borderRadius: 20,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 10,
        position: 'relative'
    },
    onlineBadge: {
        width: 10,
        height: 10,
        backgroundColor: "#22C55E",
        borderRadius: 5,
        position: "absolute",
        bottom: 0,
        right: 0,
        borderWidth: 2,
        borderColor: "#FFF"
    },
    headerTitle: {
        fontSize: 16,
        fontWeight: "700",
        color: "#FFFFFF",
    },
    headerSubtitle: {
        fontSize: 12,
        color: "rgba(255,255,255,0.9)",
        fontWeight: "500",
    },
    headerRightAction: {
        padding: 8,
    },
    chatArea: {
        flex: 1,
    },
    chatContent: {
        padding: 16,
        paddingBottom: 24,
    },
    dateLabel: {
        textAlign: "center",
        color: "#9CA3AF",
        fontSize: 12,
        marginBottom: 20,
        fontWeight: "500",
    },
    messageRow: {
        marginBottom: 16,
        flexDirection: "row",
        alignItems: "flex-end",
    },
    userRow: {
        justifyContent: "flex-end",
    },
    expertRow: {
        justifyContent: "flex-start",
    },
    messageAvatar: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        marginRight: 8,
    },
    messageBubble: {
        maxWidth: "75%",
        padding: 12,
        borderRadius: 20,
        shadowColor: "#000",
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
        elevation: 1,
    },
    userBubble: {
        backgroundColor: colors.primary,
        borderBottomRightRadius: 4,
    },
    expertBubble: {
        backgroundColor: "#FFFFFF",
        borderBottomLeftRadius: 4,
    },
    messageText: {
        fontSize: 15,
        lineHeight: 22,
    },
    userText: {
        color: "#FFFFFF",
    },
    expertText: {
        color: colors.textDark,
    },
    timestamp: {
        fontSize: 10,
        marginTop: 4,
        alignSelf: "flex-end",
    },
    userTimestamp: {
        color: "rgba(255,255,255,0.7)",
    },
    expertTimestamp: {
        color: "#9CA3AF",
    },
    typingContainer: {
        marginLeft: 40,
        marginBottom: 16,
    },
    typingText: {
        fontSize: 12,
        color: "#6B7280",
        fontStyle: "italic",
    },
    suggestionsContainer: {
        backgroundColor: "#FFFFFF",
        paddingVertical: 10,
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
        maxHeight: 180, // limit height
    },
    suggestionsHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "center",
        paddingRight: 16,
    },
    suggestionsTitle: {
        fontSize: 12,
        fontWeight: "600",
        color: "#6B7280",
        marginLeft: 16,
        marginBottom: 8,
    },
    searchContainer: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#F3F4F6",
        marginHorizontal: 16,
        marginBottom: 8,
        paddingHorizontal: 12,
        borderRadius: 12,
        height: 36,
    },
    searchIcon: {
        marginRight: 8,
    },
    searchInput: {
        flex: 1,
        fontSize: 13,
        color: colors.textDark,
        padding: 0,
    },
    suggestionsScroll: {
        paddingHorizontal: 16,
        paddingBottom: 4,
    },
    suggestionChip: {
        backgroundColor: "#F3F4F6",
        paddingHorizontal: 14,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        borderWidth: 1,
        borderColor: "#E5E7EB",
        flexDirection: "row",
        alignItems: "center",
    },
    suggestionIcon: {
        marginRight: 6,
    },
    suggestionText: {
        fontSize: 13,
        color: colors.textDark,
        fontWeight: "500",
    },
    noResultsText: {
        fontSize: 13,
        color: "#9CA3AF",
        fontStyle: "italic",
    },
    inputContainer: {
        padding: 16,
        paddingBottom: Platform.OS === "ios" ? 34 : 16,
        backgroundColor: "#FFF",
        flexDirection: "row",
        alignItems: "center",
        borderTopWidth: 1,
        borderTopColor: "#E5E7EB",
    },
    attachButton: {
        padding: 8,
        marginRight: 8,
    },
    inputWrapper: {
        flex: 1,
        backgroundColor: "#F3F4F6",
        borderRadius: 24,
        paddingHorizontal: 16,
        paddingVertical: 8,
        marginRight: 8,
        minHeight: 44,
        justifyContent: "center",
    },
    input: {
        fontSize: 15,
        color: colors.textDark,
        padding: 0,
    },
    sendButton: {
        width: 44,
        height: 44,
        borderRadius: 22,
        backgroundColor: colors.primary,
        justifyContent: "center",
        alignItems: "center",
        shadowColor: colors.primary,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.3,
        shadowRadius: 4,
        elevation: 3,
    },
    sendButtonDisabled: {
        backgroundColor: "#D1D5DB",
        shadowOpacity: 0,
    },
});
