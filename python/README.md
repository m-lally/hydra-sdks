# Python SDK

Python client for the Hydra payments API.

## Installation

```bash
pip install hydra-sdk
```

## Usage

```python
from hydra import Hydra

hydra = Hydra('sk_live_abc123')

# Create a payment
payment = hydra.payments.create(
    amount=2000,
    currency='gbp',
    merchant_id='mrp_abc123',
    payment_methods=['card'],
    capture=True,
)

print(payment.id, payment.status)

# List payments
payments = hydra.payments.list(limit=10)

# Retrieve a payment
payment = hydra.payments.get('pay_abc123')

# Create a refund
refund = hydra.refunds.create(
    payment_id='pay_abc123',
    amount=1000,
    reason='customer_request',
)
```

## Methods

See [docs/api.md](../docs/api.md) for full reference.
