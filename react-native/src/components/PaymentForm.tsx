import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert } from 'react-native';
import { useHydraClient } from './HydraProvider';
import type { CardInput } from '../types';
import { LoadingSpinner } from './LoadingSpinner';

interface PaymentFormProps {
  merchantId?: string;
  onSuccess?: (tokenId: string, last4: string) => void;
  onError?: (error: Error) => void;
}

export function PaymentForm({ merchantId, onSuccess, onError }: PaymentFormProps): JSX.Element {
  const client = useHydraClient();
  const [number, setNumber] = useState('');
  const [expMonth, setExpMonth] = useState('');
  const [expYear, setExpYear] = useState('');
  const [cvc, setCvc] = useState('');
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!number || number.replace(/\s/g, '').length < 13) {
      newErrors.number = 'Invalid card number';
    }
    const month = parseInt(expMonth, 10);
    if (!month || month < 1 || month > 12) {
      newErrors.expMonth = 'Invalid month (1-12)';
    }
    const year = parseInt(expYear, 10);
    const currentYear = new Date().getFullYear() % 100;
    if (!year || year < currentYear) {
      newErrors.expYear = 'Invalid year';
    }
    if (!cvc || cvc.length < 3) {
      newErrors.cvc = 'Invalid CVC';
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    try {
      const card: CardInput = {
        number: number.replace(/\s/g, ''),
        exp_month: parseInt(expMonth, 10),
        exp_year: parseInt(expYear, 10),
        cvc,
      };
      const result = await client.createCardToken(card, merchantId);
      onSuccess?.(result.id, result.card.last4);
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Tokenization failed');
      onError?.(error);
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      padding: 16,
      backgroundColor: '#FFFFFF',
      borderRadius: 12,
      margin: 16,
      borderWidth: 1,
      borderColor: '#e5e7eb',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.05,
      shadowRadius: 3,
      elevation: 2,
    },
    title: {
      fontSize: 18,
      fontWeight: '600',
      color: '#111827',
      marginBottom: 16,
    },
    fieldContainer: {
      marginBottom: 12,
    },
    label: {
      fontSize: 13,
      fontWeight: '500',
      color: '#374151',
      marginBottom: 4,
    },
    input: {
      borderWidth: 1,
      borderColor: '#d1d5db',
      borderRadius: 8,
      padding: 10,
      fontSize: 15,
      color: '#111827',
      backgroundColor: '#f9fafb',
    },
    inputError: {
      borderColor: '#ef4444',
    },
    errorText: {
      fontSize: 11,
      color: '#ef4444',
      marginTop: 2,
    },
    row: {
      flexDirection: 'row',
      gap: 10,
    },
    halfField: {
      flex: 1,
    },
    submitButton: {
      marginTop: 8,
      paddingVertical: 12,
      backgroundColor: '#2563eb',
      borderRadius: 8,
      alignItems: 'center',
    },
    submitButtonDisabled: {
      backgroundColor: '#93c5fd',
    },
    submitText: {
      color: '#FFFFFF',
      fontSize: 15,
      fontWeight: '600',
    },
  });

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Card Details</Text>

      <View style={styles.fieldContainer}>
        <Text style={styles.label}>Card Number</Text>
        <TextInput
          style={[styles.input, errors.number ? styles.inputError : null]}
          placeholder="4242 4242 4242 4242"
          keyboardType="number-pad"
          maxLength={19}
          value={number}
          onChangeText={(text) => {
            const cleaned = text.replace(/[^\d]/g, '');
            const formatted = cleaned.replace(/(\d{4})(?=\d)/g, '$1 ');
            setNumber(formatted);
          }}
        />
        {errors.number ? <Text style={styles.errorText}>{errors.number}</Text> : null}
      </View>

      <View style={styles.row}>
        <View style={[styles.fieldContainer, styles.halfField]}>
          <Text style={styles.label}>Month</Text>
          <TextInput
            style={[styles.input, errors.expMonth ? styles.inputError : null]}
            placeholder="MM"
            keyboardType="number-pad"
            maxLength={2}
            value={expMonth}
            onChangeText={setExpMonth}
          />
          {errors.expMonth ? <Text style={styles.errorText}>{errors.expMonth}</Text> : null}
        </View>
        <View style={[styles.fieldContainer, styles.halfField]}>
          <Text style={styles.label}>Year</Text>
          <TextInput
            style={[styles.input, errors.expYear ? styles.inputError : null]}
            placeholder="YY"
            keyboardType="number-pad"
            maxLength={2}
            value={expYear}
            onChangeText={setExpYear}
          />
          {errors.expYear ? <Text style={styles.errorText}>{errors.expYear}</Text> : null}
        </View>
        <View style={[styles.fieldContainer, styles.halfField]}>
          <Text style={styles.label}>CVC</Text>
          <TextInput
            style={[styles.input, errors.cvc ? styles.inputError : null]}
            placeholder="123"
            keyboardType="number-pad"
            maxLength={4}
            value={cvc}
            onChangeText={setCvc}
            secureTextEntry
          />
          {errors.cvc ? <Text style={styles.errorText}>{errors.cvc}</Text> : null}
        </View>
      </View>

      <TouchableOpacity
        style={[styles.submitButton, loading ? styles.submitButtonDisabled : null]}
        onPress={handleSubmit}
        disabled={loading}
        activeOpacity={0.8}
      >
        {loading ? <LoadingSpinner size="sm" /> : <Text style={styles.submitText}>Submit Payment</Text>}
      </TouchableOpacity>
    </View>
  );
}
