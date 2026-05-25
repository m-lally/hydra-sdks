# Hydra Payment Service — .NET SDK

.NET SDK for the Hydra Payment Service API with HMAC-SHA256 request signing.

## Requirements

- .NET 8.0+
- NuGet

## Installation

```xml
<PackageReference Include="HydraPayments.Sdk" Version="0.1.0" />
```

Or via CLI:

```bash
dotnet add package HydraPayments.Sdk
```

## Usage

```csharp
using HydraPayments.Sdk;

var client = new HydraClientBuilder()
    .BaseUrl("https://api.wideeyedigital.co.uk")
    .ApiKey("your-api-key")
    .SecretKey("your-secret-key")
    .Build();

// Health check
var health = await client.HealthCheckAsync();
Console.WriteLine(health.Status);

// Create an account
var account = await client.CreateAccountAsync("owner-123", "business", "GBP");
Console.WriteLine(account.Id);

// Transfer funds
var tx = await client.TransferAsync("from-wallet", "to-wallet", "1000", "GBP", "Payment");
Console.WriteLine(tx.Id);

// Get transaction
var fetched = await client.GetTransactionAsync(tx.Id);
Console.WriteLine(fetched.Status);
```

### Builder Configuration

```csharp
var client = new HydraClientBuilder()
    .BaseUrl("https://api.wideeyedigital.co.uk")
    .ApiKey("sk_test_...")
    .SecretKey("whsec_...")
    .DefaultCurrency("USD")
    .Locale("en_GB")
    .Timeout(TimeSpan.FromSeconds(30))
    .Build();
```

### Custom HttpClient

```csharp
var httpClient = new HttpClient();
var client = new HydraClientBuilder()
    .BaseUrl("https://api.wideeyedigital.co.uk")
    .ApiKey("sk_test_...")
    .SecretKey("whsec_...")
    .HttpClient(httpClient)
    .Build();
```

## API Methods

| Method | Endpoint | Description |
|--------|----------|-------------|
| `HealthCheckAsync()` | `GET /health` | API health check |
| `CreateAccountAsync(ownerId, accountType, currency?)` | `POST /v1/api/accounts` | Create payment account |
| `GetAccountAsync(id)` | `GET /v1/api/accounts/{id}` | Get account by ID |
| `GetAccountsByOwnerAsync(ownerRef)` | `GET /v1/api/accounts/owner/{ownerRef}` | Get accounts by owner |
| `TransferAsync(sourceId, destId, amount, currency?, reference?)` | `POST /v1/api/transactions` | Transfer between wallets |
| `GetTransactionAsync(id)` | `GET /v1/api/transactions/{id}` | Get transaction details |
| `CompleteTransactionAsync(id)` | `POST /v1/api/transactions/{id}/complete` | Complete a transaction |
| `FailTransactionAsync(id)` | `POST /v1/api/transactions/{id}/fail` | Fail a transaction |
| `CreateWalletAsync(ownerId, walletType, chain, address, encryptedPrivateKey?)` | `POST /v1/api/wallets` | Create a wallet |
| `GetWalletsAsync(ownerId)` | `GET /v1/api/wallets/owner/{ownerId}` | List wallets for an owner |
| `RelayTransactionAsync(walletId, signedTx)` | `POST /v1/api/wallets/{walletId}/relay` | Relay a cross-chain transaction |
| `CreateSplitAsync(total, splits, currency?, reference?)` | `POST /v1/api/splits` | Create a split payment rule |
| `GetSplitAsync(id)` | `GET /v1/api/splits/{id}` | Get split rule details |
| `CreateCardTokenAsync(card, merchantId?)` | `POST /v1/payments/tokens` | Tokenize card details |
| `CreatePaymentIntentAsync(amount, currency, token?, merchantId?, idempotencyKey?)` | `POST /v1/payments/intents` | Create a payment intent |
| `CreateRefundAsync(chargeId, amount?)` | `POST /v1/refunds` | Refund a payment |
| `GetCommissionAsync()` | `GET /v1/commission` | Get commission details |
| `SendWebhookEventAsync(payload)` | `POST /v1/webhooks/stripe` | Send a test webhook event |
| `GetMetricsAsync()` | `GET /v1/metrics` | Get system metrics (Prometheus format) |

## Error Handling

```csharp
try
{
    var account = await client.GetAccountAsync("non-existent");
}
catch (NotFoundException ex)
{
    Console.WriteLine($"Not found: {ex.Message}");
}
catch (AuthenticationException ex)
{
    Console.WriteLine($"Auth error: {ex.Message}");
}
catch (ValidationException ex)
{
    Console.WriteLine($"Validation error: {ex.Message}");
}
catch (HydraException ex)
{
    Console.WriteLine($"API error ({ex.StatusCode}): {ex.Message}");
}
```

Exceptions are thrown for HTTP errors:
- `ValidationException` (400)
- `AuthenticationException` (401)
- `NotFoundException` (404)
- `HydraException` (all other errors)

All exceptions extend `HydraException` which contains `StatusCode`, `ErrorCode`, and `Details`.

## Development

```bash
# Build
dotnet build

# Run tests
dotnet test

# Run tests with verbose output
dotnet test --verbosity detailed
```

## License

MIT
