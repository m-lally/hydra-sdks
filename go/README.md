# Hydra Payment Service — Go SDK

A production-grade Go SDK for the [Hydra Payment Service](https://github.com/hydra-pay) with HMAC-SHA256 request signing.

## Features

- No external dependencies — uses only Go standard library
- HMAC-SHA256 request signing with constant-time verification
- Type-safe API methods with Go generics
- Builder pattern for easy configuration
- Full error type support (AuthenticationError, ValidationError, NotFoundError)
- i18n support (configurable locale and default currency)
- Comprehensive test suite (60 tests, 79%+ coverage)

## Installation

```bash
go get github.com/hydra-pay/go-sdk
```

## Quick Start

```go
package main

import (
    "fmt"
    "log"

    "github.com/hydra-pay/go-sdk"
)

func main() {
    client := hydra.NewClient(
        "http://localhost:8080",
        "pk_xxx",
        "sk_xxx",
    )

    // Health check
    health, err := client.HealthCheck()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Status: %s | DB: %s | Version: %s\n",
        health.Status, health.Database, health.Version)

    // Create an account
    account, err := client.CreateAccount(
        "user-uuid-here",
        "personal",
        nil, // uses default GBP
    )
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Account: %s | Balance: %s\n", account.ID, account.Balance)
}
```

## Usage

### Using the Builder

```go
client := hydra.NewHydraClientBuilder().
    BaseURL("http://localhost:8080").
    APIKey("pk_xxx").
    SecretKey("sk_xxx").
    WithDefaultCurrency("USD").
    WithLocale("fr").
    Build()
```

### Core API Methods

| Method | Description |
|--------|-------------|
| `HealthCheck()` | Health check endpoint |
| `CreateAccount(ownerID, accountType, currency)` | Create a new account |
| `GetAccount(id)` | Get account by ID |
| `GetAccountsByOwner(ownerID)` | List accounts by owner |
| `Transfer(sourceID, destID, amount, currency, reference)` | Transfer funds |
| `GetTransaction(id)` | Get transaction by ID |
| `CompleteTransaction(id)` | Complete pending transaction |
| `FailTransaction(id)` | Fail pending transaction |
| `CreateWallet(ownerID, walletType, chain, address, encryptedPrivateKey)` | Create wallet |
| `GetWallets(ownerID)` | List wallets by owner |
| `RelayTransaction(walletID, signedTransaction)` | Relay blockchain transaction |
| `CreateSplit(total, splits, currency, reference)` | Create split rule |
| `GetSplit(id)` | Get split rule |

### Payment Gateway Methods

| Method | Description |
|--------|-------------|
| `CreateCardToken(card, merchantID)` | Tokenize card data |
| `CreatePaymentIntent(amount, currency, token, merchantID, idempotencyKey)` | Create payment |
| `CreateRefund(chargeID, amount)` | Refund a charge |
| `GetCommission()` | Total commission collected |
| `SendWebhookEvent(payload)` | Send test webhook event |
| `GetMetrics()` | Prometheus metrics |

### Security Methods

| Method | Description |
|--------|-------------|
| `VerifySignature(payload, signature)` | Constant-time HMAC signature verification |
| `SignMessage(message)` | HMAC-SHA256 message signing |

### Error Handling

The SDK returns typed errors that can be checked with `errors.As`:

```go
result, err := client.GetAccount("non-existent-id")
if err != nil {
    var notFound *hydra.NotFoundError
    if errors.As(err, &notFound) {
        fmt.Println("Account not found")
    }
    var authErr *hydra.AuthenticationError
    if errors.As(err, &authErr) {
        fmt.Println("Authentication failed")
    }
}
```

Available error types:

| Type | HTTP Status | When |
|------|-------------|------|
| `*hydra.AuthenticationError` | 401 | Invalid API key or signature |
| `*hydra.ValidationError` | 400 | Invalid request parameters |
| `*hydra.NotFoundError` | 404 | Resource doesn't exist |
| `*hydra.HydraError` | Other | Generic API error |

## Testing

The SDK includes 60 tests covering all client functionality, HMAC signing, error handling, and mock server integration tests.

```bash
# Run all tests
go test -v ./...

# Run with coverage
go test -cover ./...

# View coverage in browser
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out
```

### Test Structure

- **Unit tests** — Client construction, builder pattern, HMAC signing (deterministic output, key separation, base64 encoding), signature verification (valid, tampered, empty, invalid base64, wrong key), error types (inheritance, codes, status codes), JSON serialization (round-trip, optional fields)
- **Integration tests** — Mock HTTP server (`httptest.Server`) validates request paths, methods, headers (X-API-Key, X-Signature, X-Timestamp), request body serialization, response parsing (health, accounts, transactions, wallets, splits, payment gateway), error responses (401/404/400 mapped to typed errors)

## License

MIT
