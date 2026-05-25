# Hydra Payment Service — Ruby SDK

Ruby SDK for the Hydra Payment Service API with HMAC-SHA256 request signing.

## Requirements

- Ruby 2.6+
- No external dependencies (uses stdlib `net/http`, `json`, `openssl`, `base64`)

## Installation

Add to your Gemfile:

```ruby
gem 'hydra_payments', '~> 0.1.0'
```

Or install directly:

```bash
gem install hydra_payments
```

## Usage

```ruby
require 'hydra_payments'

client = HydraPayments::ClientBuilder.new
  .base_url('https://api.hydrapay.io')
  .api_key('your-api-key')
  .secret_key('your-secret-key')
  .build

# Health check
health = client.health_check
puts health.status

# Create an account
account = client.create_account('owner-123', 'business', 'GBP')
puts account.id

# Transfer funds
tx = client.transfer('from-wallet', 'to-wallet', '1000', 'GBP', 'Payment')
puts tx.id

# Get transaction
fetched = client.get_transaction(tx.id)
puts fetched.status
```

### Builder Configuration

```ruby
client = HydraPayments::ClientBuilder.new
  .base_url('https://api.hydrapay.io')
  .api_key('sk_test_...')
  .secret_key('whsec_...')
  .default_currency('USD')
  .locale('en_GB')
  .build
```

## API Methods

| Method | Endpoint | Description |
|--------|----------|-------------|
| `health_check` | `GET /health` | API health check |
| `create_account(owner_id, account_type, currency)` | `POST /v1/api/accounts` | Create payment account |
| `get_account(id)` | `GET /v1/api/accounts/{id}` | Get account by ID |
| `get_accounts_by_owner(owner_ref)` | `GET /v1/api/accounts/owner/{owner_ref}` | Get accounts by owner |
| `transfer(source_id, dest_id, amount, currency, reference)` | `POST /v1/api/transactions` | Transfer between wallets |
| `get_transaction(id)` | `GET /v1/api/transactions/{id}` | Get transaction details |
| `complete_transaction(id)` | `POST /v1/api/transactions/{id}/complete` | Complete a transaction |
| `fail_transaction(id)` | `POST /v1/api/transactions/{id}/fail` | Fail a transaction |
| `create_wallet(owner_id, wallet_type, chain, address, encrypted_private_key)` | `POST /v1/api/wallets` | Create a wallet |
| `get_wallets(owner_id)` | `GET /v1/api/wallets/owner/{owner_id}` | List wallets for an owner |
| `relay_transaction(wallet_id, signed_tx)` | `POST /v1/api/wallets/{wallet_id}/relay` | Relay a cross-chain transaction |
| `create_split(total, splits, currency, reference)` | `POST /v1/api/splits` | Create a split payment rule |
| `get_split(id)` | `GET /v1/api/splits/{id}` | Get split rule details |
| `create_card_token(card, merchant_id)` | `POST /v1/payments/tokens` | Tokenize card details |
| `create_payment_intent(amount, currency, token, merchant_id, idempotency_key)` | `POST /v1/payments/intents` | Create a payment intent |
| `create_refund(charge_id, amount)` | `POST /v1/refunds` | Refund a payment |
| `get_commission` | `GET /v1/commission` | Get commission details |
| `send_webhook_event(payload)` | `POST /v1/webhooks/stripe` | Send a test webhook event |
| `get_metrics` | `GET /v1/metrics` | Get system metrics (Prometheus format) |

## Error Handling

```ruby
begin
  account = client.get_account('non-existent')
rescue HydraPayments::NotFoundError => e
  puts "Not found: #{e.message}"
rescue HydraPayments::AuthenticationError => e
  puts "Auth error: #{e.message}"
rescue HydraPayments::ValidationError => e
  puts "Validation error: #{e.message}"
rescue HydraPayments::HydraError => e
  puts "API error (#{e.status_code}): #{e.message}"
end
```

Exceptions are thrown for HTTP errors:
- `ValidationError` (400)
- `AuthenticationError` (401)
- `NotFoundError` (404)
- `HydraError` (all other errors)

All exceptions extend `HydraError` which contains `status_code`, `error_code`, and `details`.

## Development

```bash
# Run tests
ruby -Ilib -Ispec spec/hydra_payments/client_spec.rb
ruby -Ilib -Ispec spec/hydra_payments/model_spec.rb
ruby -Ilib -Ispec spec/hydra_payments/exception_spec.rb
```

## License

MIT
