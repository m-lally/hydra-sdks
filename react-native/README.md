# Hydra Payments React Native SDK

React Native SDK for the Hydra Payment Service — HMAC-signed client, TypeScript types, and React Native UI components.

## Install

```sh
npm add @hydra-payments/react-native-sdk
```

Requires React Native 0.73+ and React 18+.

## Usage

### Core Client

```ts
import { HydraClient, createHydraClient } from '@hydra-payments/react-native-sdk';

const client = createHydraClient({
  apiKey: 'pk_live_abc123',
  secretKey: 'sk_live_xyz789',
  baseUrl: 'https://api.hydra.com',
});

// Health check
const health = await client.healthCheck();

// Create an account
const account = await client.createAccount('user_123', 'personal', 'GBP');

// Transfer funds
const tx = await client.transfer('acc_1', 'acc_2', '100.00', 'GBP', 'payment');
```

### React Native Components

Wrap your app with `HydraProvider`:

```tsx
import { HydraProvider, StatusBadge, AccountCard } from '@hydra-payments/react-native-sdk/components';

function App() {
  return (
    <HydraProvider options={{ apiKey: '...', secretKey: '...' }}>
      <MyPaymentScreen />
    </HydraProvider>
  );
}
```

### Hooks

```tsx
import { useAccount, useAccountsByOwner, useHealthCheck } from '@hydra-payments/react-native-sdk/components';

function AccountScreen({ accountId }: { accountId: string }) {
  const { account, loading, error, refetch } = useAccount(accountId);
  if (loading) return <LoadingSpinner />;
  if (error) return <ErrorDisplay error={error} onRetry={refetch} />;
  return <AccountCard account={account!} />;
}
```

### Payment Form

```tsx
import { PaymentForm } from '@hydra-payments/react-native-sdk/components';

function CheckoutScreen() {
  return (
    <PaymentForm
      onSuccess={(tokenId, last4) => console.log(`Card ending in ${last4} tokenized`)}
      onError={(err) => console.error(err)}
    />
  );
}
```

## API

The SDK supports 19 API methods + 2 security methods:

**Accounts:** `createAccount`, `getAccount`, `getAccountsByOwner`
**Transactions:** `transfer`, `getTransaction`, `completeTransaction`, `failTransaction`
**Wallets:** `createWallet`, `getWallets`, `relayTransaction`
**Splits:** `createSplit`, `getSplit`
**Payments:** `createCardToken`, `createPaymentIntent`, `createRefund`
**Other:** `healthCheck`, `getCommission`, `sendWebhookEvent`, `getMetrics`, `request`
**Security:** `signMessage`, `verifyWebhookSignature`

## Components

| Component | Props |
|-----------|-------|
| `HydraProvider` | `options: SDKOptions` |
| `AccountCard` | `account: Account, onPress?: () => void` |
| `TransactionCard` | `transaction: Transaction, onPress?: () => void` |
| `WalletCard` | `wallet: Wallet, onRelay?: () => void` |
| `PaymentForm` | `merchantId?: string, onSuccess?, onError?` |
| `StatusBadge` | `status: string, variant?` |
| `LoadingSpinner` | `size?: 'sm' \| 'md' \| 'lg'` |
| `ErrorDisplay` | `error: Error \| null, onRetry?: () => void` |

## Hooks

| Hook | Returns |
|------|---------|
| `useAccount(id)` | `{ account, loading, error, refetch }` |
| `useAccountsByOwner(ownerId)` | `{ accounts[], loading, error, refetch }` |
| `useCreateAccount()` | `{ createAccount, loading, error }` |
| `useTransaction(id)` | `{ transaction, loading, error, refetch }` |
| `useTransfer()` | `{ transfer, loading, error }` |
| `useWallets(ownerId)` | `{ wallets[], loading, error, refetch }` |
| `useCreateWallet()` | `{ createWallet, loading, error }` |
| `useCreateSplit()` | `{ createSplit, loading, error }` |
| `useHealthCheck()` | `{ health, loading, error, refetch }` |
| `useAccountBalance(id)` | `{ balance, formattedBalance, currency, loading, error }` |

## Build

```sh
npm run build   # tsc -> dist/
npm test        # run tests
```

## License

MIT
