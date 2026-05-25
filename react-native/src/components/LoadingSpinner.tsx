import React from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  color?: string;
}

export function LoadingSpinner({ size = 'md', color = '#2563eb' }: LoadingSpinnerProps): JSX.Element {
  const sizes: Record<string, 'small' | 'large'> = {
    sm: 'small',
    md: 'small',
    lg: 'large',
  };

  const dimension: Record<string, number> = {
    sm: 16,
    md: 32,
    lg: 48,
  };

  return (
    <View style={[styles.container, { width: dimension[size], height: dimension[size] }]}>
      <ActivityIndicator size={sizes[size]} color={color} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    justifyContent: 'center',
    alignItems: 'center',
  },
});
