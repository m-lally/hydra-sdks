# Hydra Payment Service - Python SDK

A production-grade async Python SDK for the Hydra Payment Service with HMAC-SHA256 security.

## Features

- **Async-First**: Full async/await support with `httpx`
- **Type-Safe**: Complete type annotations matching the Rust API
- **HMAC Signing**: Automatic request signing for security
- **i18n Support**: Localized error messages (EN, ES, DE, FR)
- **Comprehensive**: Accounts, transactions, wallets, splits APIs

## Installation

```bash
pip install hydra-payments
```

## Quick Start

```python
import asyncio
from hydra_payments import create_client

async def main():
    client = create_client(
        base_url="http://localhost:8080",
        api_key="pk_xxx",
        secret_key="sk_xxx",
    )
    
    # Check health
    health = await client.health_check()
    print(f"Status: {health.status}, DB: {health.database}")
    
    # Create account
    account = await client.create_account(
        owner_id="a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11",
        account_type="personal",
        currency="GBP"
    )
    print(f"Created account: {account.id}")
    
    # Create another account for transfer
    dest_account = await client.create_account(
        owner_id="b1ffcd99-9c0b-4ef8-bb6d-6bb9bd380a22",
        account_type="personal"
    )
    
    # Transfer funds
    tx = await client.transfer(
        source_id=account.id,
        dest_id=dest_account.id,
        amount="100.00",
        reference="test-payment"
    )
    print(f"Transfer: {tx.id}, Status: {tx.status}")
    
    await client.close()

asyncio.run(main())
```

## API Reference

### Client

```python
client = create_client(
    base_url="http://localhost:8080",  # Hydra server URL
    api_key="pk_xxx",                  # Your API key
    secret_key="sk_xxx",              # Your secret key
    timeout=30.0,                      # Request timeout
    default_currency="GBP",            # Default currency
    locale="en"                        # i18n locale
)
```

### Accounts

```python
# Create account
account = await client.create_account(
    owner_id="uuid",
    account_type="personal"  # company, personal, fractional
)

# Get account
account = await client.get_account(account_id)

# Get accounts by owner
accounts = await client.get_accounts_by_owner(owner_id)
```

### Transactions

```python
# Transfer
tx = await client.transfer(
    source_id="uuid",
    dest_id="uuid",
    amount="100.00",
    currency="GBP",
    reference="optional-ref"
)

# Get transaction
tx = await client.get_transaction(transaction_id)

# Complete/fail pending transaction
await client.complete_transaction(transaction_id)
await client.fail_transaction(transaction_id)
```

### Wallets

```python
# Create wallet
wallet = await client.create_wallet(
    owner_id="uuid",
    wallet_type="non-custodial",  # custodial, non-custodial
    chain="ethereum",              # ethereum, bitcoin, solana, polygon
    address="0x..."
)

# Get wallets
wallets = await client.get_wallets(owner_id)

# Relay signed transaction
tx_hash = await client.relay_transaction(wallet_id, signed_tx)
```

### Splits

```python
# Create split
split = await client.create_split(
    total="100.00",
    splits=[
        {"account_id": "uuid1", "percentage": 50.0},
        {"account_id": "uuid2", "percentage": 50.0},
    ],
    currency="GBP"
)
```

### Payment Gateway

```python
# Create a card token
token = await client.create_card_token(
    number="4242424242424242",
    exp_month=12,
    exp_year=2028,
    cvc="123",
)
print(f"Token: {token.id}, Brand: {token.card.brand}")

# Create a payment intent (£29.99)
intent = await client.create_payment_intent(
    amount=2999,
    currency="GBP",
    token=token.id,
)
print(f"Intent: {intent.id}, Status: {intent.status}")

# Create a refund
refund = await client.create_refund(
    charge_id="ch_abc123",
    amount=1000,
)
print(f"Refund: {refund.id}, Status: {refund.status}")

# Get commission totals
commission = await client.get_commission()
print(f"Total commission: {commission.total_commission}")

# Send a test webhook event
result = await client.send_webhook_event({
    "id": "evt_test",
    "type": "payment_intent.succeeded",
    "data": {"object": {"id": "pi_abc"}},
})
print(f"Webhook received: {result['received']}")

# Get Prometheus metrics
metrics = await client.get_metrics()
print(f"Metrics:\n{metrics}")
```

## Error Handling

```python
from hydra_payments import (
    HydraError,
    AuthenticationError,
    ValidationError,
    NotFoundError
)

try:
    account = await client.get_account(account_id)
except NotFoundError as e:
    print(f"Account not found: {e}")
except AuthenticationError as e:
    print(f"Auth failed: {e}")
except HydraError as e:
    print(f"Error: {e.message}")
```

## Running Tests

```bash
# Install test dependencies
pip install pytest pytest-asyncio

# Run tests
pytest tests/
```

## Security

- All requests are signed with HMAC-SHA256
- Signatures include: HTTP method, path, timestamp, and body
- Timestamp prevents replay attacks
- Use environment variables for credentials in production

## License

MIT