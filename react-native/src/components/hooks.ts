import { useState, useCallback, useEffect, useRef } from 'react';
import { useHydraClient } from './HydraProvider';
import type { Account, Transaction, Wallet, SplitRule } from '../types';

interface UseAccountResult {
  account: Account | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAccount(accountId: string): UseAccountResult {
  const client = useHydraClient();
  const [account, setAccount] = useState<Account | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAccount = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.getAccount(accountId);
      if (response.success && response.data) {
        setAccount(response.data);
      } else {
        setError(new Error(response.error || 'Failed to fetch account'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [client, accountId]);

  useEffect(() => {
    fetchAccount();
  }, [fetchAccount]);

  return { account, loading, error, refetch: fetchAccount };
}

interface UseAccountsResult {
  accounts: Account[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useAccountsByOwner(ownerId: string): UseAccountsResult {
  const client = useHydraClient();
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchAccounts = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.getAccountsByOwner(ownerId);
      if (response.success && response.data) {
        setAccounts(response.data);
      } else {
        setError(new Error(response.error || 'Failed to fetch accounts'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [client, ownerId]);

  useEffect(() => {
    fetchAccounts();
  }, [fetchAccounts]);

  return { accounts, loading, error, refetch: fetchAccounts };
}

interface CreateAccountOptions {
  ownerId: string;
  accountType: string;
  currency?: string;
}

interface UseCreateAccountResult {
  createAccount: (options: CreateAccountOptions) => Promise<Account | null>;
  loading: boolean;
  error: Error | null;
}

export function useCreateAccount(): UseCreateAccountResult {
  const client = useHydraClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createAccountFn = useCallback(async (options: CreateAccountOptions): Promise<Account | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.createAccount(options.ownerId, options.accountType, options.currency);
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(new Error(response.error || 'Failed to create account'));
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);

  return { createAccount: createAccountFn, loading, error };
}

interface UseTransactionResult {
  transaction: Transaction | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useTransaction(transactionId: string): UseTransactionResult {
  const client = useHydraClient();
  const [transaction, setTransaction] = useState<Transaction | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchTransaction = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.getTransaction(transactionId);
      if (response.success && response.data) {
        setTransaction(response.data);
      } else {
        setError(new Error(response.error || 'Failed to fetch transaction'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [client, transactionId]);

  useEffect(() => {
    fetchTransaction();
  }, [fetchTransaction]);

  return { transaction, loading, error, refetch: fetchTransaction };
}

interface TransferOptions {
  sourceId: string;
  destId: string;
  amount: string;
  currency?: string;
  reference?: string;
}

interface UseTransferResult {
  transfer: (options: TransferOptions) => Promise<Transaction | null>;
  loading: boolean;
  error: Error | null;
}

export function useTransfer(): UseTransferResult {
  const client = useHydraClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const transferFn = useCallback(async (options: TransferOptions): Promise<Transaction | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.transfer(
        options.sourceId,
        options.destId,
        options.amount,
        options.currency,
        options.reference
      );
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(new Error(response.error || 'Transfer failed'));
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);

  return { transfer: transferFn, loading, error };
}

interface UseWalletsResult {
  wallets: Wallet[];
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useWallets(ownerId: string): UseWalletsResult {
  const client = useHydraClient();
  const [wallets, setWallets] = useState<Wallet[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchWallets = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.getWallets(ownerId);
      if (response.success && response.data) {
        setWallets(response.data);
      } else {
        setError(new Error(response.error || 'Failed to fetch wallets'));
      }
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [client, ownerId]);

  useEffect(() => {
    fetchWallets();
  }, [fetchWallets]);

  return { wallets, loading, error, refetch: fetchWallets };
}

interface CreateWalletOptions {
  ownerId: string;
  walletType: string;
  chain: string;
  address: string;
  encryptedPrivateKey?: string;
}

interface UseCreateWalletResult {
  createWallet: (options: CreateWalletOptions) => Promise<Wallet | null>;
  loading: boolean;
  error: Error | null;
}

export function useCreateWallet(): UseCreateWalletResult {
  const client = useHydraClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createWalletFn = useCallback(async (options: CreateWalletOptions): Promise<Wallet | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.createWallet(
        options.ownerId,
        options.walletType,
        options.chain,
        options.address,
        options.encryptedPrivateKey
      );
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(new Error(response.error || 'Failed to create wallet'));
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);

  return { createWallet: createWalletFn, loading, error };
}

interface CreateSplitOptions {
  total: string;
  splits: { account_id: string; percentage: number }[];
  currency?: string;
  reference?: string;
}

interface UseCreateSplitResult {
  createSplit: (options: CreateSplitOptions) => Promise<SplitRule | null>;
  loading: boolean;
  error: Error | null;
}

export function useCreateSplit(): UseCreateSplitResult {
  const client = useHydraClient();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const createSplitFn = useCallback(async (options: CreateSplitOptions): Promise<SplitRule | null> => {
    setLoading(true);
    setError(null);
    try {
      const response = await client.createSplit(
        options.total,
        options.splits,
        options.currency,
        options.reference
      );
      if (response.success && response.data) {
        return response.data;
      } else {
        setError(new Error(response.error || 'Failed to create split'));
        return null;
      }
    } catch (err) {
      const error = err instanceof Error ? err : new Error('Unknown error');
      setError(error);
      return null;
    } finally {
      setLoading(false);
    }
  }, [client]);

  return { createSplit: createSplitFn, loading, error };
}

interface HealthStatus {
  status: string;
  version?: string;
  database?: string;
}

interface UseHealthCheckResult {
  health: HealthStatus | null;
  loading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

export function useHealthCheck(): UseHealthCheckResult {
  const client = useHydraClient();
  const [health, setHealth] = useState<HealthStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const checkHealth = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await client.healthCheck();
      setHealth(result);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [client]);

  useEffect(() => {
    checkHealth();
  }, [checkHealth]);

  return { health, loading, error, refetch: checkHealth };
}

interface UsePollingOptions {
  interval?: number;
  enabled?: boolean;
}

function usePolling<T>(fetchFn: () => Promise<T>, options: UsePollingOptions = {}): T | null {
  const { interval = 5000, enabled = true } = options;
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchData = useCallback(async () => {
    try {
      const result = await fetchFn();
      setData(result);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err : new Error('Unknown error'));
    } finally {
      setLoading(false);
    }
  }, [fetchFn]);

  useEffect(() => {
    if (!enabled) return;

    fetchData();
    intervalRef.current = setInterval(fetchData, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchData, interval, enabled]);

  return data;
}

interface UseBalanceResult {
  balance: string;
  formattedBalance: string;
  currency: string;
  loading: boolean;
  error: Error | null;
}

export function useAccountBalance(accountId: string): UseBalanceResult {
  const { account, loading, error } = useAccount(accountId);

  const formattedBalance = account
    ? `${account.currency} ${account.balance}`
    : '';

  return {
    balance: account?.balance || '0',
    formattedBalance,
    currency: account?.currency || 'GBP',
    loading,
    error,
  };
}
