import React, { Suspense, ComponentType } from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';

/**
 * Wraps a React.lazy() component with a Suspense boundary + loading spinner.
 *
 * Usage:
 *   const LazyScreen = withLazy(() => import('./screens/SomeScreen'));
 *   <Stack.Screen name="SomeScreen" component={LazyScreen} />
 */
export function withLazy(
    factory: () => Promise<{ default: ComponentType<any> }>
): React.FC<any> {
    const LazyComponent = React.lazy(factory);

    const Wrapper: React.FC<any> = (props) => (
        <Suspense fallback={<LoadingFallback />}>
            <LazyComponent {...props} />
        </Suspense>
    );

    // Preserve display name for debugging
    Wrapper.displayName = `LazyScreen`;
    return Wrapper;
}

function LoadingFallback() {
    return (
        <View style={styles.container}>
            <ActivityIndicator size="large" color="#2E7D32" />
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#F9FAFB',
    },
});
