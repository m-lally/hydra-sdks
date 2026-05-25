import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
}

function mapStatusToVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  const lower = status.toLowerCase();
  if (lower === 'completed' || lower === 'healthy' || lower === 'connected') return 'success';
  if (lower === 'pending' || lower === 'degraded') return 'warning';
  if (lower === 'failed' || lower === 'disconnected') return 'error';
  return 'default';
}

export function StatusBadge({ status, variant }: StatusBadgeProps): JSX.Element {
  const actualVariant = variant || mapStatusToVariant(status);

  const styles = StyleSheet.create({
    badge: {
      alignSelf: 'flex-start',
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 12,
      borderWidth: 1,
    },
    text: {
      fontSize: 11,
      fontWeight: '600',
    },
    success: {
      backgroundColor: '#ecfdf5',
      borderColor: '#bbf7d0',
    },
    successText: {
      color: '#166534',
    },
    warning: {
      backgroundColor: '#fefce8',
      borderColor: '#fde68a',
    },
    warningText: {
      color: '#92400e',
    },
    error: {
      backgroundColor: '#fef2f2',
      borderColor: '#fecaca',
    },
    errorText: {
      color: '#991b1b',
    },
    info: {
      backgroundColor: '#eff6ff',
      borderColor: '#bfdbfe',
    },
    infoText: {
      color: '#1e40af',
    },
    default: {
      backgroundColor: '#f3f4f6',
      borderColor: '#e5e7eb',
    },
    defaultText: {
      color: '#374151',
    },
  });

  const colorVariant = styles[actualVariant] || styles.default;
  const textVariant = styles[`${actualVariant}Text` as keyof typeof styles] || styles.defaultText;

  return (
    <View style={[styles.badge, colorVariant]}>
      <Text style={[styles.text, textVariant]}>{status}</Text>
    </View>
  );
}
