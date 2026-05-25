# Hydra Payments SDK

TypeScript SDK for the Hydra Payment Service.

## Install

```sh
npm add @hydra-pay/sdk
```

## Usage

### Core client (no React dependency)

```ts
import { HydraClient } from '@hydra-pay/sdk';

const client = new HydraClient({
  apiKey: 'your-api-key',
  secretKey: 'your-secret-key',
  baseUrl: 'https://api.hydrapay.io',
});

const { data: account } = await client.getAccount('acc_123');
console.log(account.balance);
```

### React integration

```tsx
import { HydraProvider, useAccount, AccountCard } from '@hydra-pay/sdk/react';

function App() {
  return (
    <HydraProvider
      apiKey="your-api-key"
      secretKey="your-secret-key"
      baseUrl="https://api.hydrapay.io"
    >
      <Dashboard />
    </HydraProvider>
  );
}

function Dashboard() {
  const { account, loading } = useAccount('acc_123');
  if (loading) return <Spinner />;
  return <AccountCard account={account} />;
}
```

## API

### Core (`@hydra-pay/sdk`)

| Method | Description |
|--------|-------------|
| `HydraClient` | Main client class with HMAC-SHA256 request signing |
| `createHydraClient()` | Factory function |
| `client.healthCheck()` | API health check |
| `client.createAccount()` | Create a payment account |
| `client.getAccount()` | Get account by ID |
| `client.getAccountsByOwner()` | List accounts for an owner |
| `client.transfer()` | Transfer funds between accounts |
| `client.getTransaction()` | Get transaction by ID |
| `client.completeTransaction()` | Complete a pending transaction |
| `client.failTransaction()` | Fail a pending transaction |
| `client.createWallet()` | Register a crypto wallet |
| `client.getWallets()` | List wallets for an owner |
| `client.relayTransaction()` | Relay a signed blockchain tx |
| `client.createSplit()` | Create a payment split rule |
| `client.getSplit()` | Get split rule by ID |
| `client.createCardToken()` | Tokenize a card (PCI-compliant) |
| `client.createPaymentIntent()` | Create a payment intent |
| `client.createRefund()` | Refund a charge |
| `client.getCommission()` | Get commission totals |
| `client.verifyWebhookSignature()` | Verify incoming webhook HMAC |

### React (`@hydra-pay/sdk/react`)

| Hook/Component | Description |
|----------------|-------------|
| `HydraProvider` | Context provider wrapping the SDK client |
| `useAccount(id)` | Single account by ID |
| `useAccounts(ownerId)` | All accounts for an owner |
| `useTransactions(accountId?)` | Transaction list |
| `useTransfer()` | Trigger a transfer |
| `useWallet(ownerId)` | Crypto wallet lookup |
| `usePaymentIntents()` | Payment intent management |
| `AccountCard` | Display account details |
| `AccountList` | List of accounts |
| `TransactionList` | List of transactions |
| `StatusBadge` | Status indicator badge |

## Request Signing

All API requests are signed using HMAC-SHA256 with a timestamp, method, path, and body hash to prevent replay attacks and tampering.

```ts
// Verify incoming webhook signatures
const isValid = client.verifyWebhookSignature(rawPayload, signature);
```

## License

MIT
