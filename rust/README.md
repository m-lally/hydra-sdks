# Hydra Payment Service - Rust SDK

A production-grade async Rust SDK for the Hydra Payment Service with HMAC-SHA256 security.

## Features

- **Async-First**: Full async/await support with `reqwest`
- **Type-Safe**: Complete type definitions matching the Rust API
- **HMAC Signing**: Automatic request signing for security
- **i18n Support**: Localized error messages (EN, ES, DE, FR)
- **Builder Pattern**: Fluent API for client configuration

## Installation

Add to your `Cargo.toml`:

```toml
[dependencies]
hydra-sdk = "1.0"
```

Or use the latest from git:

```toml
[dependencies]
hydra-sdk = { git = "https://github.com/hydra-pay/sdk-rust" }
```

## Quick Start

```rust
use hydra_sdk::{HydraClient, Result};
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<()> {
    let client = HydraClient::new(
        "http://localhost:8080",
        "pk_xxx",
        "sk_xxx",
    )
    .with_currency("GBP")
    .with_locale("en");

    // Health check
    let health = client.health_check().await?;
    println!("Status: {}, DB: {}", health.status, health.database);

    // Create account
    let account = client.create_account(
        Uuid::new_v4(),
        "personal",
        Some("GBP"),
    ).await?;
    println!("Created account: {}", account.id);

    // Get account
    let retrieved = client.get_account(account.id).await?;
    println!("Balance: {}", retrieved.balance);

    // Transfer (requires source account with funds)
    let tx = client.transfer(
        source_account_id,
        dest_account_id,
        "100.00",
        Some("GBP"),
        Some("test-payment"),
    ).await?;
    println!("Transfer: {}", tx.id);

    Ok(())
}
```

### Payment Gateway

```rust
// Create a card token
let token = client.create_card_token(
    CardInput {
        number: "4242424242424242".to_string(),
        exp_month: 12,
        exp_year: 2028,
        cvc: "123".to_string(),
    },
    None,
).await?;
println!("Token: {}", token.id);

// Create a payment intent
let intent = client.create_payment_intent(
    2999,       // amount in minor units (£29.99)
    "GBP",
    Some(&token.id),
    None,
    None,       // optional idempotency key
).await?;
println!("Intent: {} Status: {}", intent.id, intent.status);

// Create a refund
let refund = client.create_refund("ch_abc123", Some(1000)).await?;
println!("Refund: {} Status: {}", refund.id, refund.status);

// Get commission totals
let commission = client.get_commission().await?;
println!("Total commission: {}", commission.total_commission);

// Send a Stripe webhook event (testing)
let response = client.send_webhook_event(serde_json::json!({
    "id": "evt_test",
    "type": "payment_intent.succeeded",
    "data": { "object": { "id": "pi_abc" } }
})).await?;
println!("Webhook received: {}", response.received);

// Get Prometheus metrics
let metrics = client.get_metrics().await?;
println!("Metrics:\n{}", metrics);
```

## API Reference

### Client

```rust
// Simple construction
let client = HydraClient::new(base_url, api_key, secret_key);

// Builder pattern
let client = HydraClientBuilder::new()
    .base_url("http://localhost:8080")
    .api_key("pk_xxx")
    .secret_key("sk_xxx")
    .currency("GBP")
    .locale("en")
    .build();
```

### Accounts

```rust
// Create account
let account = client.create_account(
    owner_id,           // uuid::Uuid
    "personal",         // &str (company, personal, fractional)
    Some("GBP"),        // Option<&str>
).await?;

// Get account
let account = client.get_account(account_id).await?;

// Get accounts by owner
let accounts = client.get_accounts_by_owner(owner_id).await?;
```

### Transactions

```rust
// Transfer
let tx = client.transfer(
    source_id,
    dest_id,
    "100.00",
    Some("GBP"),
    Some("reference"),
).await?;

// Get transaction
let tx = client.get_transaction(transaction_id).await?;

// Complete/fail pending transaction
client.complete_transaction(transaction_id).await?;
client.fail_transaction(transaction_id).await?;
```

### Wallets

```rust
// Create wallet
let wallet = client.create_wallet(
    owner_id,
    "non-custodial",  // or "custodial"
    "ethereum",        // ethereum, bitcoin, solana, polygon
    "0x...",
    None,              // encrypted_private_key (optional)
).await?;

// Get wallets
let wallets = client.get_wallets(owner_id).await?;

// Relay signed transaction
let tx_hash = client.relay_transaction(wallet_id, signed_tx).await?;
```

### Splits

```rust
use hydra_sdk::SplitEntry;

let split = client.create_split(
    "100.00",
    vec![
        SplitEntry { account_id: uuid1, percentage: 50.0 },
        SplitEntry { account_id: uuid2, percentage: 50.0 },
    ],
    Some("GBP"),
    Some("reference"),
).await?;
```

## Error Handling

```rust
use hydra_sdk::{Error, Result};

match client.health_check().await {
    Ok(health) => println!("Healthy: {}", health.is_healthy()),
    Err(Error::Authentication(msg)) => println!("Auth failed: {}", msg),
    Err(Error::NotFound(msg)) => println!("Not found: {}", msg),
    Err(Error::Api(msg)) => println!("API error: {}", msg),
    Err(e) => println!("Error: {}", e),
}
```

## Security

- All requests are signed with HMAC-SHA256
- Signatures include: HTTP method, path, timestamp, and body
- Timestamp prevents replay attacks
- Use environment variables for credentials in production

```rust
std::env::var("HYDRA_API_KEY").expect("HYDRA_API_KEY must be set")
```

## License

MIT