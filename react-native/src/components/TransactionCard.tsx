import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import type { Transaction } from '../types';
import { StatusBadge } from './StatusBadge';

function formatCurrency(amount: string, currency: string): string {
  const num = parseFloat(amount);
  const symbols: Record<string, string> = {
    GBP: '\u00a3', USD: '$', EUR: '\u20ac', BTC: '\u20bf', ETH: '\u039e',
  };
  const symbol = symbols[currency] || `${currency} `;
  return `${symbol}${num.toFixed(2)}`;
}

interface TransactionCardProps {
  transaction: Transaction;
  onPress?: () => void;
}

export function TransactionCard({ transaction, onPress }: TransactionCardProps): JSX.Element {
  const getDirection = (): 'incoming' | 'outgoing' | 'internal' => {
    if (!transaction.source_account_id && transaction.dest_account_id) return 'incoming';
    if (transaction.source_account_id && !transaction.dest_account_id) return 'outgoing';
    return 'internal';
  };

  const direction = getDirection();
  const arrow = direction === 'incoming' ? '\u2193' : direction === 'outgoing' ? '\u2191' : '\u2194';

  const styles = StyleSheet.create({
    card: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: 14,
      backgroundColor: '#FFFFFF',
      borderRadius: 10,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      marginVertical: 4,
      marginHorizontal: 16,
    },
    leftSection: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconContainer: {
      width: 36,
      height: 36,
      borderRadius: 18,
      justifyContent: 'center',
      alignItems: 'center',
      marginRight: 10,
    },
    iconText: {
      fontSize: 16,
      fontWeight: '700',
    },
    incomingBg: {
      backgroundColor: '#dcfce7',
    },
    incomingText: {
      color: '#16a34a',
    },
    outgoingBg: {
      backgroundColor: '#fee2e2',
    },
    outgoingText: {
      color: '#dc2626',
    },
    internalBg: {
      backgroundColor: '#f3f4f6',
    },
    internalText: {
      color: '#4b5563',
    },
    typeText: {
      fontSize: 14,
      fontWeight: '600',
      color: '#111827',
    },
    referenceText: {
      fontSize: 12,
      color: '#6b7280',
      marginTop: 1,
    },
    rightSection: {
      alignItems: 'flex-end',
    },
    amountText: {
      fontSize: 14,
      fontWeight: '700',
    },
    incomingAmount: {
      color: '#16a34a',
    },
    outgoingAmount: {
      color: '#dc2626',
    },
    internalAmount: {
      color: '#4b5563',
    },
  });

  const iconBgStyle =
    direction === 'incoming' ? styles.incomingBg :
    direction === 'outgoing' ? styles.outgoingBg : styles.internalBg;

  const iconTextStyle =
    direction === 'incoming' ? styles.incomingText :
    direction === 'outgoing' ? styles.outgoingText : styles.internalText;

  const amountStyle =
    direction === 'incoming' ? styles.incomingAmount :
    direction === 'outgoing' ? styles.outgoingAmount : styles.internalAmount;

  const content = (
    <>
      <View style={styles.leftSection}>
        <View style={[styles.iconContainer, iconBgStyle]}>
          <Text style={[styles.iconText, iconTextStyle]}>{arrow}</Text>
        </View>
        <View>
          <Text style={styles.typeText}>{transaction.transaction_type}</Text>
          <Text style={styles.referenceText}>{transaction.reference || 'No reference'}</Text>
        </View>
      </View>
      <View style={styles.rightSection}>
        <Text style={[styles.amountText, amountStyle]}>
          {direction === 'outgoing' ? '-' : ''}{formatCurrency(transaction.amount, transaction.currency)}
        </Text>
        <StatusBadge status={transaction.status} />
      </View>
    </>
  );

  if (onPress) {
    return <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.7}>{content}</TouchableOpacity>;
  }

  return <View style={styles.card}>{content}</View>;
}
