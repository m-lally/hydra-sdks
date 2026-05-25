# Hydra Payment Gateway - Integration Guide

## Overview

The Hydra Payment Gateway provides:

- **Card Tokenization** - Securely store card data as tokens
- **Payment Intents** - Create and manage payments with idempotency support
- **Refunds** - Full and partial refunds against charges
- **Commission Tracking** - Automatic commission calculation (31 basis points)
- **Stripe Webhooks** - Receive real-time payment status updates
- **Prometheus Metrics** - Monitor gateway performance

## Base URL

| Environment | URL |
|-------------|-----|
| Production | `https://api.hydrapay.io` (replace with your domain) |
| Sandbox | `https://sandbox.hydrapay.io` (replace with your domain) |

## Request Limits

All API POST endpoints enforce a **64KB maximum request body size**. Requests exceeding this limit receive a `413 Payload Too Large` response. All payment operations (tokenization, intents, refunds) produce payloads well under this threshold under normal operation.

## Authentication

All API endpoints require HMAC-SHA256 signing (except `/health`):

- `X-API-Key` - Your API key
- `X-Timestamp` - Current Unix timestamp in milliseconds
- `X-Signature` - HMAC-SHA256 signature of `METHOD:PATH:TIMESTAMP:BODY`

SDKs handle this automatically. Requests with an invalid or missing signature receive `401 Unauthorized` or `403 Forbidden`. The timestamp must be within 300 seconds of the server clock (replay protection).

## SDKs

| Language | Package | Location |
|----------|---------|----------|
| Rust | `hydra-sdk` | `sdks/rust/` |
| TypeScript | `@hydra-pay/sdk` | `sdks/typescript/` |
| Python | `hydra-payments` | `sdks/python/` |
| Go | `github.com/hydra-pay/go-sdk` | `sdks/go/` |
| PHP | `hydra-payments/sdk-php` | `sdks/php/` |
| Java | `com.hydrapayments:sdk-java` | `sdks/java/` |
| .NET | `HydraPayments.Sdk` | `sdks/dotnet/` |
| Ruby | `hydra_payments` | `sdks/ruby/` |
| iOS (Swift) | `HydraPayments` | `sdks/ios/` |
| Android (Kotlin) | `com.hydrapayments:sdk` | `sdks/android/` |
| React Native | `@hydra-pay/react-native-sdk` | `sdks/react-native/` |
| Terraform | `registry.terraform.io/hydra-payments/hydra` | `sdks/terraform/` |

## API Reference

### Health Check

**Endpoint:** `GET /health`

```bash
curl https://sandbox.hydrapay.io/health
```

Response:
```json
{
  "status": "healthy"
}
```

---

### Create Token

**Endpoint:** `POST /v1/payments/tokens`

Tokenize card data for secure storage. In test mode, any card can be used.

```bash
curl -X POST https://sandbox.hydrapay.io/v1/payments/tokens \
  -H "Content-Type: application/json" \
  -d '{
    "card": {
      "number": "4242424242424242",
      "exp_month": 12,
      "exp_year": 2027,
      "cvc": "123"
    },
    "merchant_id": "merchant_123"
  }'
```

Response (201):
```json
{
  "id": "tok_test_abc123",
  "card": {
    "brand": "visa",
    "last4": "4242",
    "exp_month": 12,
    "exp_year": 2027
  },
  "created_at": "2026-04-20T10:00:00Z"
}
```

| Field | Description |
|-------|-------------|
| `card.number` | Card number (13-19 digits, spaces/dashes stripped) |
| `card.exp_month` | Expiration month (1-12) |
| `card.exp_year` | Expiration year (4 digits) |
| `card.cvc` | Card verification code |
| `merchant_id` | Optional merchant identifier |

---

### Create Payment Intent

**Endpoint:** `POST /v1/payments/intents`

Initiate a payment. Supports idempotency keys for safe retries.

```bash
curl -X POST https://sandbox.hydrapay.io/v1/payments/intents \
  -H "Content-Type: application/json" \
  -d '{
    "amount": 5000,
    "currency": "GBP",
    "token": "tok_test_abc123",
    "merchant_id": "merchant_123",
    "idempotency_key": "unique-key-123"
  }'
```

Response (201):
```json
{
  "id": "pi_test_abc123",
  "status": "requires_action",
  "amount": 5000,
  "currency": "GBP",
  "client_secret": "pi_test_abc123_secret_xxx"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `amount` | Yes | Amount in minor units (pence/cents) |
| `currency` | Yes | ISO 4217 currency code (e.g. GBP, USD, EUR) |
| `token` | No | Card token from Create Token |
| `merchant_id` | No | Optional merchant identifier |
| `idempotency_key` | No | Unique key for idempotent retries |

Commission of 31 basis points (0.31%) is automatically calculated and recorded.

Rate limit: 100 requests per 60-second window.

---

### Create Refund

**Endpoint:** `POST /v1/refunds`

Refund a previous charge. Supports partial refunds.

```bash
curl -X POST https://sandbox.hydrapay.io/v1/refunds \
  -H "Content-Type: application/json" \
  -d '{
    "charge_id": "ch_test123",
    "amount": 2500
  }'
```

Response (201):
```json
{
  "id": "re_test_abc123",
  "status": "succeeded",
  "amount": 2500,
  "charge": "ch_test123"
}
```

| Field | Required | Description |
|-------|----------|-------------|
| `charge_id` | Yes | ID of the charge to refund |
| `amount` | No | Partial refund amount (full refund if omitted) |

---

### Get Commission

**Endpoint:** `GET /v1/commission`

Get the total commission collected across all payments.

```bash
curl https://sandbox.hydrapay.io/v1/commission
```

Response:
```json
{
  "total_commission": 1550
}
```

Commission rate: 31 basis points (0.31%).

---

### Stripe Webhooks

**Endpoint:** `POST /v1/webhooks/stripe`

Receive Stripe webhook events. Supported event types:

- `payment_intent.succeeded` - Payment completed successfully
- `payment_intent.payment_failed` - Payment failed
- `charge.refunded` - Charge was refunded

The gateway automatically updates payment status in its database.

```json
{
  "id": "evt_abc123",
  "type": "payment_intent.succeeded",
  "data": {
    "object": {
      "id": "pi_xyz789",
      "status": "succeeded"
    }
  }
}
```

Response:
```json
{
  "received": true
}
```

---

### Metrics

**Endpoint:** `GET /v1/metrics`

Prometheus-format metrics for monitoring.

```bash
curl https://sandbox.hydrapay.io/v1/metrics
```

Response:
```
# TYPE hydra_payments_created_total counter
hydra_payments_created_total 42
# TYPE hydra_refunds_created_total counter
hydra_refunds_created_total 5
# TYPE hydra_tokens_created_total counter
hydra_tokens_created_total 100
# TYPE hydra_http_requests_total counter
hydra_http_requests_total 200
# TYPE hydra_http_errors_total counter
hydra_http_errors_total 3
# TYPE hydra_commission_total_cents gauge
hydra_commission_total_cents 1550
```

---

## Test Cards (Sandbox)

| Number | Result |
|--------|--------|
| `4242424242424242` | Visa success |
| `5555555555554444` | Mastercard success |
| `378282246310005` | Amex success |

## Deployment

### TLS / HTTPS

TLS should be terminated at a reverse proxy (Nginx, Caddy, AWS ALB). The gateway listens on plain HTTP. Set `SERVER_PORT` to `127.0.0.1:3001` when behind a proxy to avoid direct exposure.

### Required Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `STRIPE_SECRET_KEY` | `sk_test_placeholder` | Stripe secret key (test if starts with `sk_test_`) |
| `DATABASE_PATH` | `hydra_gateway.db` | SQLite database path |
| `HYDRA_API_KEY` | (required) | API key for `X-API-Key` auth header |
| `HYDRA_HMAC_SECRET` | (required) | HMAC-SHA256 signing secret |
| `HYDRA_INSECURE_SKIP_AUTH` | `0` | `1` to disable auth (dev only) |

## Error Codes

| Code | Meaning |
|------|---------|
| `invalid_card` | Card number is invalid |
| `invalid_amount` | Amount must be positive |
| `invalid_charge` | Charge ID is empty |
| `rate_limit` | Rate limit exceeded |
| `stripe_error` | Stripe API error |
| `unauthorized` | Authentication failed |
| `forbidden` | Invalid signature, timestamp, or bad request |
| `bad_request` | Malformed request body or invalid timestamp format |
| `not_found` | Resource not found |
| `payload_too_large` | Request body exceeds 64KB limit |
| `internal_error` | Server error |

## Currency

All amounts are in **minor units** (pence/cents):

| Currency | Units | Example |
|----------|-------|---------|
| GBP | pence | £50.00 = 5000 |
| USD | cents | $50.00 = 5000 |
| EUR | cents | €50.00 = 5000 |
