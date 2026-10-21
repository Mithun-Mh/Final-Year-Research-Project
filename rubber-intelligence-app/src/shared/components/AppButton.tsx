import React from 'react';
import { TouchableOpacity, Text, StyleSheet, ActivityIndicator, TouchableOpacityProps } from 'react-native';
import { colors } from '../styles/colors';

interface Props extends TouchableOpacityProps {
    title: string;
    isLoading?: boolean;
    variant?: 'primary' | 'secondary' | 'outline';
}

export const AppButton = ({ title, isLoading, variant = 'primary', style, ...props }: Props) => {
    const getBackgroundColor = () => {
        if (variant === 'outline') return 'transparent';
        if (variant === 'secondary') return '#6c757d';
        return '#2E7D32'; // Green default
    };

    const getTextColor = () => {
        if (variant === 'outline') return '#2E7D32';
        return '#FFFFFF';
    };

    return (
        <TouchableOpacity
            style={[
                styles.button,
                { backgroundColor: getBackgroundColor(), borderColor: '#2E7D32', borderWidth: variant === 'outline' ? 1 : 0 },
                style,
                props.disabled && styles.disabled
            ]}
            {...props}
        >
            {isLoading ? (
                <ActivityIndicator color={getTextColor()} />
            ) : (
                <Text style={[styles.text, { color: getTextColor() }]}>{title}</Text>
            )}
        </TouchableOpacity>
    );
};

const styles = StyleSheet.create({
    button: {
        padding: 14,
        borderRadius: 8,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    text: {
        fontSize: 16,
        fontWeight: 'bold',
    },
    disabled: {
        opacity: 0.6,
    },
});
