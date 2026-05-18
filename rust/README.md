# Rust SDK

Rust client for the Hydra payments API.

## Installation

```toml
[dependencies]
hydra-sdk = "0.1.0"
```

## Usage

```rust
use hydra_sdk::Hydra;

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let hydra = Hydra::new("sk_live_abc123");

    let payment = hydra.payments().create(CreatePayment {
        amount: 2000,
        currency: "gbp".into(),
        merchant_id: "mrp_abc123".into(),
        payment_methods: vec!["card".into()],
        capture: true,
    }).await?;

    println!("{}: {}", payment.id, payment.status);
    Ok(())
}
```

## Features

- Async/await throughout
- Strongly typed request/response structs
- Automatic idempotency keys
- Comprehensive error handling

## Methods

See [docs/api.md](../docs/api.md) for full reference.
