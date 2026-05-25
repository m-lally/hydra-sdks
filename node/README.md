# Node.js SDK

Server-side SDK for the Hydra payments API.

## Installation

```bash
npm install @hydra-pay/sdk-node
```

## Usage

```javascript
const Hydra = require('@hydra-pay/sdk-node');

const hydra = new Hydra('sk_live_abc123');

async function main() {
  const payment = await hydra.payments.create({
    amount: 2000,
    currency: 'gbp',
    merchantId: 'mrp_abc123',
    source: 'pm_card_visa',
    capture: true,
  });

  console.log(payment.id, payment.status);
}
```

## Methods

See [docs/api.md](../docs/api.md) for full reference.
