# Hydra Payment Service — Java SDK

Java SDK for the Hydra Payment Service API with HMAC-SHA256 request signing.

## Requirements

- Java 11+
- Apache Maven 3.6+

## Installation

Add to your `pom.xml`:

```xml
<dependency>
    <groupId>com.hydrapayments</groupId>
    <artifactId>sdk-java</artifactId>
    <version>0.1.0</version>
</dependency>
```

## Usage

```java
HydraClient client = HydraClientBuilder.newBuilder()
    .baseUrl("https://api.hydrapay.io")
    .apiKey("your-api-key")
    .secretKey("your-secret-key")
    .build();

// Health check
HealthResponse health = client.healthCheck();
System.out.println(health.status());

// Create an account
Account account = client.createAccount(new Account("owner-123", "GBP"));
System.out.println(account.getId());

// Transfer funds
Transaction tx = client.transfer("from-wallet", "to-wallet", 1000L, "GBP", "Payment");
System.out.println(tx.getId());

// Get transaction
Transaction fetched = client.getTransaction(tx.getId());
System.out.println(fetched.getStatus());
```

### Builder Configuration

```java
HydraClient client = HydraClientBuilder.newBuilder()
    .baseUrl("https://api.hydrapay.io")
    .apiKey("sk_test_...")
    .secretKey("whsec_...")
    .defaultCurrency("USD")
    .locale("en_GB")
    .connectTimeout(30)      // seconds
    .readTimeout(30)         // seconds
    .build();
```

## API Methods

| Method | Endpoint | Description |
|--------|----------|-------------|
| `healthCheck()` | `GET /health` | API health check |
| `createAccount(account)` | `POST /api/accounts` | Create payment account |
| `getAccount(id)` | `GET /api/accounts/{id}` | Get account by ID |
| `getAccountsByOwner(ownerRef, currency)` | `GET /api/accounts?owner_ref={ownerRef}&currency={currency}` | Get accounts by owner |
| `transfer(from, to, amount, currency, description)` | `POST /api/transfers` | Transfer between wallets |
| `getTransaction(id)` | `GET /api/transactions/{id}` | Get transaction details |
| `completeTransaction(id)` | `PATCH /api/transactions/{id}/complete` | Complete a transaction |
| `failTransaction(id)` | `PATCH /api/transactions/{id}/fail` | Fail a transaction |
| `createWallet(wallet)` | `POST /api/wallets` | Create a wallet |
| `getWallets(accountId)` | `GET /api/wallets?account_id={accountId}` | List wallets for an account |
| `relayTransaction(relay)` | `POST /api/transactions/relay` | Relay a cross-ledger transaction |
| `createSplit(split)` | `POST /api/splits` | Create a split payment rule |
| `getSplit(id)` | `GET /api/splits/{id}` | Get split rule details |
| `createCardToken(token)` | `POST /api/gateway/card-token` | Tokenize card details |
| `createPaymentIntent(intent)` | `POST /api/gateway/payment-intents` | Create a payment intent |
| `createRefund(refund)` | `POST /api/gateway/refunds` | Refund a payment |
| `getCommission(query)` | `POST /api/commissions` | Get commission details |
| `sendWebhookEvent(event)` | `POST /api/webhooks/send` | Send a test webhook event |
| `getMetrics(query)` | `POST /api/metrics` | Get system metrics |

## Error Handling

```java
try {
    Account account = client.getAccount("non-existent");
} catch (HydraException e) {
    System.err.println("Error: " + e.getMessage());
    System.err.println("Status code: " + e.getStatusCode());
}
```

Exceptions are thrown for HTTP errors:
- `ValidationException` (400)
- `AuthenticationException` (401)
- `NotFoundException` (404)

All exceptions extend `HydraException`.

## Development

```bash
# Compile
mvn compile

# Run tests
mvn test

# Package
mvn package
```

## License

MIT
