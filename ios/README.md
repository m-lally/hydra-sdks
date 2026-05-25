# Hydra Payment Service — iOS SDK

Swift SDK for the Hydra Payment Service API with HMAC-SHA256 request signing.

## Requirements

- Swift 5.5+
- iOS 15.0+ / macOS 12.0+ / tvOS 15.0+ / watchOS 8.0+
- No external dependencies (uses `Foundation` and `CryptoKit`)

## Installation

### Swift Package Manager

Add to your `Package.swift`:

```swift
dependencies: [
    .package(url: "https://github.com/hydra-payments/hydra.git", branch: "main")
]
```

Or add via Xcode: **File → Add Packages...** → `https://github.com/hydra-payments/hydra.git`

## Usage

```swift
import HydraPayments

let client = HydraClientBuilder()
    .baseURL("https://api.wideeyedigital.co.uk")
    .apiKey("your-api-key")
    .secretKey("your-secret-key")
    .build()

// Health check
let health = try await client.healthCheck()
print(health.status)

// Create an account
let account = try await client.createAccount(
    ownerId: "owner-123",
    accountType: "business",
    currency: "GBP"
)
print(account.id)

// Transfer funds
let tx = try await client.transfer(
    sourceId: "from-wallet",
    destId: "to-wallet",
    amount: "1000",
    currency: "GBP",
    reference: "Payment"
)
print(tx.id)

// Get transaction
let fetched = try await client.getTransaction(id: tx.id)
print(fetched.status)
```

### Builder Configuration

```swift
let client = HydraClientBuilder()
    .baseURL("https://api.wideeyedigital.co.uk")
    .apiKey("sk_test_...")
    .secretKey("whsec_...")
    .defaultCurrency("USD")
    .locale("en_GB")
    .build()
```

## API Methods

| Method | Endpoint | Description |
|--------|----------|-------------|
| `healthCheck()` | `GET /health` | API health check |
| `createAccount(ownerId:accountType:currency:)` | `POST /v1/api/accounts` | Create payment account |
| `getAccount(id:)` | `GET /v1/api/accounts/{id}` | Get account by ID |
| `getAccountsByOwner(ownerId:)` | `GET /v1/api/accounts/owner/{owner_id}` | Get accounts by owner |
| `transfer(sourceId:destId:amount:currency:reference:)` | `POST /v1/api/transactions` | Transfer between wallets |
| `getTransaction(id:)` | `GET /v1/api/transactions/{id}` | Get transaction details |
| `completeTransaction(id:)` | `POST /v1/api/transactions/{id}/complete` | Complete a transaction |
| `failTransaction(id:)` | `POST /v1/api/transactions/{id}/fail` | Fail a transaction |
| `createWallet(ownerId:walletType:chain:address:encryptedPrivateKey:)` | `POST /v1/api/wallets` | Create a wallet |
| `getWallets(ownerId:)` | `GET /v1/api/wallets/owner/{owner_id}` | List wallets for an owner |
| `relayTransaction(walletId:signedTransaction:)` | `POST /v1/api/wallets/{wallet_id}/relay` | Relay a cross-chain transaction |
| `createSplit(total:splits:currency:reference:)` | `POST /v1/api/splits` | Create a split payment rule |
| `getSplit(id:)` | `GET /v1/api/splits/{id}` | Get split rule details |
| `createCardToken(card:merchantId:)` | `POST /v1/payments/tokens` | Tokenize card details |
| `createPaymentIntent(amount:currency:token:merchantId:idempotencyKey:)` | `POST /v1/payments/intents` | Create a payment intent |
| `createRefund(chargeId:amount:)` | `POST /v1/refunds` | Refund a payment |
| `getCommission()` | `GET /v1/commission` | Get commission details |
| `sendWebhookEvent(payload:)` | `POST /v1/webhooks/stripe` | Send a test webhook event |
| `getMetrics()` | `GET /v1/metrics` | Get system metrics (Prometheus format) |

## Error Handling

```swift
do {
    let account = try await client.getAccount(id: "non-existent")
} catch let error as NotFoundError {
    print("Not found: \(error.message)")
} catch let error as AuthenticationError {
    print("Auth error: \(error.message)")
} catch let error as ValidationError {
    print("Validation error: \(error.message)")
} catch let error as HydraError {
    print("API error (\(error.statusCode)): \(error.message)")
}
```

Exceptions are thrown for HTTP errors:
- `ValidationError` (400)
- `AuthenticationError` (401)
- `NotFoundError` (404)
- `HydraError` (all other errors)

All exceptions extend `HydraError` which contains `statusCode`, `errorCode`, and `details`.

## Development

```bash
# Run tests
swift test

# Run with Xcode
swift package generate-xcodeproj
```

## License

MIT
