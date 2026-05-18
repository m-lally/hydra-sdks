# Hydra SDKs

Official client libraries for the [Hydra payments API](https://api.hydrapp.com).

## Quickstart

```bash
# JavaScript (browser)
npm install @hydrapp/sdk

# Node.js
npm install @hydrapp/sdk-node

# Python
pip install hydra-sdk

# Rust
cargo add hydra-sdk
```

### Initialize

```javascript
// JavaScript / Node.js
import Hydra from '@hydrapp/sdk';

const hydra = new Hydra('sk_live_abc123');
```

```python
# Python
from hydra import Hydra

hydra = Hydra('sk_live_abc123')
```

```rust
// Rust
use hydra_sdk::Hydra;

let hydra = Hydra::new("sk_live_abc123");
```

### Create a payment

```javascript
const payment = await hydra.payments.create({
  amount: 2000,
  currency: 'gbp',
  merchantId: 'mrp_abc123',
  paymentMethods: ['card'],
  capture: true,
});
```

```python
payment = hydra.payments.create(
    amount=2000,
    currency='gbp',
    merchant_id='mrp_abc123',
    payment_methods=['card'],
    capture=True,
)
```

```rust
let payment = hydra.payments().create(CreatePayment {
    amount: 2000,
    currency: "gbp".into(),
    merchant_id: "mrp_abc123".into(),
    payment_methods: vec!["card".into()],
    capture: true,
})?;
```

## SDKs

| Language | Package | Source |
|----------|---------|--------|
| JavaScript (browser) | `@hydrapp/sdk` | [javascript/](./javascript) |
| Node.js | `@hydrapp/sdk-node` | [node/](./node) |
| Python | `hydra-sdk` | [python/](./python) |
| Rust | `hydra-sdk` | [rust/](./rust) |
| HTML (CDN) | `<script>` tag | [html/](./html) |

## Features

- **Payments** — create, list, retrieve, capture, cancel
- **Checkout** — one-time checkout sessions
- **Refunds** — full and partial refunds
- **Customers** — create, list, retrieve
- **Bank Accounts** — validate and link
- **Disputes** — list, retrieve, update evidence
- **Webhooks** — verify signatures, parse events
- **Balance** — retrieve merchant balance

## Documentation

Full API reference at [docs.hydrapp.com](https://docs.hydrapp.com).

## License

MIT
