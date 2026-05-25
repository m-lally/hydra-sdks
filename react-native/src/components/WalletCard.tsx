import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Wallet } from '../types';
import { StatusBadge } from './StatusBadge';

function getChainIcon(chain: string): string {
  const icons: Record<string, string> = {
    ethereum: '\u27d0',
    bitcoin: '\u20bf',
    solana: '\u25ce',
    polygon: '\u2b21',
  };
  return icons[chain.toLowerCase()] || '\u25cf';
}

interface WalletCardProps {
  wallet: Wallet;
  onRelay?: () => void;
}

export function WalletCard({ wallet, onRelay }: WalletCardProps): JSX.Element {
  const styles = StyleSheet.create({
    card: {
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      padding: 16,
      marginVertical: 6,
      marginHorizontal: 16,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    iconContainer: {
      width: 44,
      height: 44,
      borderRadius: 22,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    iconGradient: {
      backgroundColor: '#8b5cf6',
    },
    iconText: {
      color: '#FFFFFF',
      fontSize: 20,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    chainText: {
      fontSize: 15,
      fontWeight: '600',
      color: '#111827',
      textTransform: 'capitalize',
    },
    typeText: {
      fontSize: 12,
      color: '#6b7280',
      marginTop: 1,
    },
    addressContainer: {
      marginTop: 8,
    },
    addressText: {
      fontSize: 12,
      fontFamily: 'monospace',
      color: '#4b5563',
    },
    relayButton: {
      marginTop: 12,
      paddingVertical: 10,
      paddingHorizontal: 16,
      backgroundColor: '#2563eb',
      borderRadius: 8,
      alignItems: 'center',
    },
    relayButtonText: {
      color: '#FFFFFF',
      fontSize: 14,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.card}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={[styles.iconContainer, styles.iconGradient]}>
            <Text style={styles.iconText}>{getChainIcon(wallet.chain)}</Text>
          </View>
          <View>
            <Text style={styles.chainText}>{wallet.chain}</Text>
            <Text style={styles.typeText}>{wallet.wallet_type}</Text>
          </View>
        </View>
        <StatusBadge
          status={wallet.is_custodial ? 'Custodial' : 'Non-Custodial'}
          variant={wallet.is_custodial ? 'warning' : 'info'}
        />
      </View>
      <View style={styles.addressContainer}>
        <Text style={styles.addressText} numberOfLines={2}>{wallet.address}</Text>
      </View>
      {onRelay && (
        <TouchableOpacity style={styles.relayButton} onPress={onRelay} activeOpacity={0.8}>
          <Text style={styles.relayButtonText}>Relay Transaction</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}
