import { ref, readonly, watch, type Ref, type DeepReadonly } from 'vue';
import { useHydraClient } from './provider';
import type { Account, Transaction, Wallet, SplitRule } from '../types';

function toRef<T>(v: T | Ref<T>): Ref<T> {
  return typeof v === 'object' && v !== null && 'value' in v ? v as Ref<T> : ref(v) as Ref<T>;
}

interface AsyncState<T> {
  data: DeepReadonly<Ref<T | null>>;
  loading: DeepReadonly<Ref<boolean>>;
  error: DeepReadonly<Ref<Error | null>>;
  refetch: () => Promise<void>;
}

function useFetch<T>(
  fetcher: () => Promise<{ success: boolean; data?: T; error?: string }>,
  deps: Ref<unknown>[]
): AsyncState<T> {
  const data = ref<T | null>(null) as Ref<T | null>;
  const loading = ref(true);
  const error = ref<Error | null>(null);

  async function refetch() {
    loading.value = true;
    error.value = null;
    try {
      const response = await fetcher();
      if (response.success && response.data) {
        data.value = response.data;
      } else {
        error.value = new Error(response.error || 'Request failed');
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error');
    } finally {
      loading.value = false;
    }
  }

  watch(deps, refetch, { immediate: true });

  return { data: readonly(data), loading: readonly(loading), error: readonly(error), refetch };
}

interface UseAccountResult extends AsyncState<Account> {}

export function useAccount(accountId: string | Ref<string>): UseAccountResult {
  const client = useHydraClient();
  const idRef = toRef(accountId);
  return useFetch(() => client.getAccount(idRef.value), [idRef]);
}

interface UseAccountsResult {
  accounts: DeepReadonly<Ref<Account[]>>;
  loading: DeepReadonly<Ref<boolean>>;
  error: DeepReadonly<Ref<Error | null>>;
  refetch: () => Promise<void>;
}

export function useAccountsByOwner(ownerId: string | Ref<string>): UseAccountsResult {
  const client = useHydraClient();
  const ownerRef = toRef(ownerId);
  const accounts = ref<Account[]>([]) as Ref<Account[]>;
  const loading = ref(true);
  const error = ref<Error | null>(null);

  async function refetch() {
    loading.value = true;
    error.value = null;
    try {
      const response = await client.getAccountsByOwner(ownerRef.value);
      if (response.success && response.data) {
        accounts.value = response.data;
      } else {
        error.value = new Error(response.error || 'Failed to fetch accounts');
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error');
    } finally {
      loading.value = false;
    }
  }

  watch(ownerRef, refetch, { immediate: true });

  return { accounts: readonly(accounts), loading: readonly(loading), error: readonly(error), refetch };
}

interface CreateAccountOptions {
  ownerId: string;
  accountType: string;
  currency?: string;
}

interface UseCreateAccountResult {
  createAccount: (opts: CreateAccountOptions) => Promise<Account | null>;
  loading: DeepReadonly<Ref<boolean>>;
  error: DeepReadonly<Ref<Error | null>>;
}

export function useCreateAccount(): UseCreateAccountResult {
  const client = useHydraClient();
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function createAccount(opts: CreateAccountOptions): Promise<Account | null> {
    loading.value = true;
    error.value = null;
    try {
      const response = await client.createAccount(opts.ownerId, opts.accountType, opts.currency);
      if (response.success && response.data) {
        return response.data;
      }
      error.value = new Error(response.error || 'Failed to create account');
      return null;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error');
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { createAccount, loading: readonly(loading), error: readonly(error) };
}

interface UseTransactionResult extends AsyncState<Transaction> {}

export function useTransaction(transactionId: string | Ref<string>): UseTransactionResult {
  const client = useHydraClient();
  const idRef = toRef(transactionId);
  return useFetch(() => client.getTransaction(idRef.value), [idRef]);
}

interface TransferOptions {
  sourceId: string;
  destId: string;
  amount: string;
  currency?: string;
  reference?: string;
}

interface UseTransferResult {
  transfer: (opts: TransferOptions) => Promise<Transaction | null>;
  loading: DeepReadonly<Ref<boolean>>;
  error: DeepReadonly<Ref<Error | null>>;
}

export function useTransfer(): UseTransferResult {
  const client = useHydraClient();
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function transfer(opts: TransferOptions): Promise<Transaction | null> {
    loading.value = true;
    error.value = null;
    try {
      const response = await client.transfer(opts.sourceId, opts.destId, opts.amount, opts.currency, opts.reference);
      if (response.success && response.data) {
        return response.data;
      }
      error.value = new Error(response.error || 'Transfer failed');
      return null;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error');
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { transfer, loading: readonly(loading), error: readonly(error) };
}

interface UseWalletsResult {
  wallets: DeepReadonly<Ref<Wallet[]>>;
  loading: DeepReadonly<Ref<boolean>>;
  error: DeepReadonly<Ref<Error | null>>;
  refetch: () => Promise<void>;
}

export function useWallets(ownerId: string | Ref<string>): UseWalletsResult {
  const client = useHydraClient();
  const ownerRef = toRef(ownerId);
  const wallets = ref<Wallet[]>([]) as Ref<Wallet[]>;
  const loading = ref(true);
  const error = ref<Error | null>(null);

  async function refetch() {
    loading.value = true;
    error.value = null;
    try {
      const response = await client.getWallets(ownerRef.value);
      if (response.success && response.data) {
        wallets.value = response.data;
      } else {
        error.value = new Error(response.error || 'Failed to fetch wallets');
      }
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error');
    } finally {
      loading.value = false;
    }
  }

  watch(ownerRef, refetch, { immediate: true });

  return { wallets: readonly(wallets), loading: readonly(loading), error: readonly(error), refetch };
}

interface CreateWalletOptions {
  ownerId: string;
  walletType: string;
  chain: string;
  address: string;
  encryptedPrivateKey?: string;
}

interface UseCreateWalletResult {
  createWallet: (opts: CreateWalletOptions) => Promise<Wallet | null>;
  loading: DeepReadonly<Ref<boolean>>;
  error: DeepReadonly<Ref<Error | null>>;
}

export function useCreateWallet(): UseCreateWalletResult {
  const client = useHydraClient();
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function createWallet(opts: CreateWalletOptions): Promise<Wallet | null> {
    loading.value = true;
    error.value = null;
    try {
      const response = await client.createWallet(opts.ownerId, opts.walletType, opts.chain, opts.address, opts.encryptedPrivateKey);
      if (response.success && response.data) {
        return response.data;
      }
      error.value = new Error(response.error || 'Failed to create wallet');
      return null;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error');
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { createWallet, loading: readonly(loading), error: readonly(error) };
}

interface CreateSplitOptions {
  total: string;
  splits: { account_id: string; percentage: number }[];
  currency?: string;
  reference?: string;
}

interface UseCreateSplitResult {
  createSplit: (opts: CreateSplitOptions) => Promise<SplitRule | null>;
  loading: DeepReadonly<Ref<boolean>>;
  error: DeepReadonly<Ref<Error | null>>;
}

export function useCreateSplit(): UseCreateSplitResult {
  const client = useHydraClient();
  const loading = ref(false);
  const error = ref<Error | null>(null);

  async function createSplit(opts: CreateSplitOptions): Promise<SplitRule | null> {
    loading.value = true;
    error.value = null;
    try {
      const response = await client.createSplit(opts.total, opts.splits, opts.currency, opts.reference);
      if (response.success && response.data) {
        return response.data;
      }
      error.value = new Error(response.error || 'Failed to create split');
      return null;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error');
      return null;
    } finally {
      loading.value = false;
    }
  }

  return { createSplit, loading: readonly(loading), error: readonly(error) };
}

interface HealthStatusData {
  status: string;
  version?: string;
  database?: string;
}

interface UseHealthCheckResult extends AsyncState<HealthStatusData> {}

export function useHealthCheck(): UseHealthCheckResult {
  const client = useHydraClient();
  const data = ref<HealthStatusData | null>(null) as Ref<HealthStatusData | null>;
  const loading = ref(true);
  const error = ref<Error | null>(null);

  async function refetch() {
    loading.value = true;
    error.value = null;
    try {
      const result = await client.healthCheck();
      data.value = result;
    } catch (err) {
      error.value = err instanceof Error ? err : new Error('Unknown error');
    } finally {
      loading.value = false;
    }
  }

  refetch();

  return { data: readonly(data), loading: readonly(loading), error: readonly(error), refetch };
}

interface UseBalanceResult {
  balance: DeepReadonly<Ref<string>>;
  formattedBalance: DeepReadonly<Ref<string>>;
  currency: DeepReadonly<Ref<string>>;
  loading: DeepReadonly<Ref<boolean>>;
  error: DeepReadonly<Ref<Error | null>>;
}

export function useAccountBalance(accountId: string | Ref<string>): UseBalanceResult {
  const { data: account, loading, error } = useAccount(accountId);
  const balance = ref('0');
  const formattedBalance = ref('');
  const currency = ref('GBP');

  watch(account, (acc) => {
    if (acc) {
      balance.value = acc.balance;
      formattedBalance.value = `${acc.currency} ${acc.balance}`;
      currency.value = acc.currency;
    }
  }, { immediate: true });

  return {
    balance: readonly(balance),
    formattedBalance: readonly(formattedBalance),
    currency: readonly(currency),
    loading,
    error,
  };
}
