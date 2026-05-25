import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';

interface ErrorDisplayProps {
  error: Error | null;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps): JSX.Element {
  if (!error) return <></>;

  const styles = StyleSheet.create({
    container: {
      backgroundColor: '#fef2f2',
      borderWidth: 1,
      borderColor: '#fecaca',
      borderRadius: 10,
      padding: 14,
      marginHorizontal: 16,
      marginVertical: 8,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    iconContainer: {
      marginRight: 8,
    },
    iconText: {
      fontSize: 18,
    },
    content: {
      flex: 1,
    },
    titleText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#991b1b',
    },
    messageText: {
      fontSize: 13,
      color: '#b91c1c',
      marginTop: 4,
    },
    retryButton: {
      marginTop: 8,
    },
    retryText: {
      fontSize: 13,
      fontWeight: '600',
      color: '#7f1d1d',
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Text style={styles.iconText}>{'\u26a0'}</Text>
      </View>
      <View style={styles.content}>
        <Text style={styles.titleText}>Error</Text>
        <Text style={styles.messageText}>{error.message}</Text>
        {onRetry && (
          <TouchableOpacity style={styles.retryButton} onPress={onRetry}>
            <Text style={styles.retryText}>Try again</Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}
