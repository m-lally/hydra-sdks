import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Account } from '../types';
import { StatusBadge } from './StatusBadge';

function formatCurrency(amount: string, currency: string): string {
  const num = parseFloat(amount);
  const symbols: Record<string, string> = {
    GBP: '\u00a3', USD: '$', EUR: '\u20ac', BTC: '\u20bf', ETH: '\u039e',
  };
  const symbol = symbols[currency] || `${currency} `;
  return `${symbol}${num.toFixed(2)}`;
}

interface AccountCardProps {
  account: Account;
  onPress?: () => void;
}

export function AccountCard({ account, onPress }: AccountCardProps): JSX.Element {
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
    typeText: {
      fontSize: 16,
      fontWeight: '600',
      color: '#111827',
    },
    idText: {
      fontSize: 12,
      color: '#6b7280',
      marginTop: 2,
    },
    balanceContainer: {
      marginTop: 8,
    },
    balanceText: {
      fontSize: 24,
      fontWeight: '700',
      color: '#111827',
    },
    currencyText: {
      fontSize: 12,
      color: '#6b7280',
      marginTop: 4,
    },
    createdText: {
      fontSize: 11,
      color: '#9ca3af',
      marginTop: 8,
    },
  });

  const truncatedId = `${account.id.slice(0, 8)}...`;
  const createdDate = new Date(account.created_at).toLocaleDateString();

  const card = (
    <>
      <View style={styles.header}>
        <View>
          <Text style={styles.typeText}>{account.account_type}</Text>
          <Text style={styles.idText}>{truncatedId}</Text>
        </View>
        <StatusBadge status={account.account_type} />
      </View>
      <View style={styles.balanceContainer}>
        <Text style={styles.balanceText}>{formatCurrency(account.balance, account.currency)}</Text>
        <Text style={styles.currencyText}>{account.currency}</Text>
      </View>
      <Text style={styles.createdText}>Created: {createdDate}</Text>
    </>
  );

  if (onPress) {
    return <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>{card}</TouchableOpacity>;
  }

  return <View style={styles.card}>{card}</View>;
}
