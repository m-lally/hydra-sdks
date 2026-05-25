# JavaScript SDK (Browser)

Client-side SDK for the Hydra payments API. Works in all modern browsers.

## Installation

```bash
npm install @hydra-pay/sdk
```

## Usage

```javascript
import Hydra from '@hydra-pay/sdk';

const hydra = new Hydra('pk_live_abc123'); // publishable key for client-side

// Create a payment
const payment = await hydra.payments.create({
  amount: 2000,
  currency: 'gbp',
  merchantId: 'mrp_abc123',
  paymentMethods: ['card'],
  capture: true,
  metadata: { orderId: 'ORD-001' },
});

// List payments
const payments = await hydra.payments.list({ limit: 10 });

// Retrieve a payment
const payment = await hydra.payments.get('pay_abc123');
```

## API

### `new Hydra(apiKey, options?)`

| Option | Default | Description |
|--------|---------|-------------|
| `baseUrl` | `https://api.hydrapay.io` | API base URL |
| `timeout` | `30000` | Request timeout (ms) |
| `headers` | `{}` | Additional headers |

### Methods

See [docs/api.md](../docs/api.md) for full reference.
