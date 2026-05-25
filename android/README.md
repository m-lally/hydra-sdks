# Hydra Payment Service — Android SDK

Kotlin SDK for the Hydra Payment Service API with HMAC-SHA256 request signing.

## Requirements

- Kotlin 1.8+
- Java 11+ / Android API 26+
- Only runtime dependency: `org.json:json` (bundled on Android)

## Installation

### Gradle

```kotlin
// settings.gradle.kts
dependencyResolutionManagement {
    repositories.mavenCentral()
}

// build.gradle.kts
dependencies {
    implementation("com.hydrapayments:sdk:0.1.0")
}
```

Or use a local copy:

```kotlin
dependencies {
    implementation(files("libs/hydra-payments-sdk-0.1.0.jar"))
}
```

## Usage

```kotlin
import com.hydrapayments.sdk.*

val client = HydraClientBuilder()
    .baseUrl("https://api.wideeyedigital.co.uk")
    .apiKey("your-api-key")
    .secretKey("your-secret-key")
    .build()

// Health check
val health = client.healthCheck()
println(health.status)

// Create an account
val account = client.createAccount("owner-123", "business", "GBP")
println(account.id)

// Transfer funds
val tx = client.transfer("from-wallet", "to-wallet", "1000", "GBP", "Payment")
println(tx.id)

// Get transaction
val fetched = client.getTransaction(tx.id)
println(fetched.status)
```

### Builder Configuration

```kotlin
val client = HydraClientBuilder()
    .baseUrl("https://api.wideeyedigital.co.uk")
    .apiKey("sk_test_...")
    .secretKey("whsec_...")
    .defaultCurrency("USD")
    .locale("en_GB")
    .httpClient(customHttpClient)  // optional: inject custom HTTP client
    .build()
```

## API Methods

| Method | Endpoint | Description |
|--------|----------|-------------|
| `healthCheck()` | `GET /health` | API health check |
| `createAccount(ownerId, accountType, currency)` | `POST /v1/api/accounts` | Create payment account |
| `getAccount(id)` | `GET /v1/api/accounts/{id}` | Get account by ID |
| `getAccountsByOwner(ownerId)` | `GET /v1/api/accounts/owner/{owner_id}` | Get accounts by owner |
| `transfer(sourceId, destId, amount, currency, reference)` | `POST /v1/api/transactions` | Transfer between wallets |
| `getTransaction(id)` | `GET /v1/api/transactions/{id}` | Get transaction details |
| `completeTransaction(id)` | `POST /v1/api/transactions/{id}/complete` | Complete a transaction |
| `failTransaction(id)` | `POST /v1/api/transactions/{id}/fail` | Fail a transaction |
| `createWallet(ownerId, walletType, chain, address, encryptedPrivateKey)` | `POST /v1/api/wallets` | Create a wallet |
| `getWallets(ownerId)` | `GET /v1/api/wallets/owner/{owner_id}` | List wallets for an owner |
| `relayTransaction(walletId, signedTransaction)` | `POST /v1/api/wallets/{wallet_id}/relay` | Relay a cross-chain transaction |
| `createSplit(total, splits, currency, reference)` | `POST /v1/api/splits` | Create a split payment rule |
| `getSplit(id)` | `GET /v1/api/splits/{id}` | Get split rule details |
| `createCardToken(card, merchantId)` | `POST /v1/payments/tokens` | Tokenize card details |
| `createPaymentIntent(amount, currency, token, merchantId, idempotencyKey)` | `POST /v1/payments/intents` | Create a payment intent |
| `createRefund(chargeId, amount)` | `POST /v1/refunds` | Refund a payment |
| `getCommission()` | `GET /v1/commission` | Get commission details |
| `sendWebhookEvent(payload)` | `POST /v1/webhooks/stripe` | Send a test webhook event |
| `getMetrics()` | `GET /v1/metrics` | Get system metrics (Prometheus format) |

## Error Handling

```kotlin
try {
    val account = client.getAccount("non-existent")
} catch (e: NotFoundError) {
    println("Not found: ${e.message}")
} catch (e: AuthenticationError) {
    println("Auth error: ${e.message}")
} catch (e: ValidationError) {
    println("Validation error: ${e.message}")
} catch (e: HydraError) {
    println("API error (${e.statusCode}): ${e.message}")
}
```

Exceptions are thrown for HTTP errors:
- `ValidationError` (400)
- `AuthenticationError` (401)
- `NotFoundError` (404)
- `HydraError` (all other errors)

All exceptions extend `HydraError` which contains `statusCode`, `errorCode`, and `details`.

## Testing

### Mock HTTP Client

```kotlin
val mock = MockHttpClient()
mock.stub(200, """{"status":"healthy"}""")

val client = HydraClientBuilder()
    .apiKey("test-key")
    .secretKey("test-secret")
    .httpClient(mock)
    .build()

val health = client.healthCheck()
assertEquals("healthy", health.status)
```

### Run Tests

```bash
./gradlew test
```

## HTTP Client Interface

Implement `HttpClient` to inject a custom HTTP transport:

```kotlin
class OkHttpClientAdapter(private val okHttp: OkHttpClient) : HttpClient {
    override fun send(method: String, url: String, headers: Map<String, String>, body: String?): HttpClient.Response {
        val request = Request.Builder().url(url).method(method, body?.toRequestBody()).apply {
            headers.forEach { (k, v) -> addHeader(k, v) }
        }.build()
        val response = okHttp.newCall(request).execute()
        return HttpClient.Response(response.code, response.body?.string() ?: "")
    }
}
```

## License

MIT
