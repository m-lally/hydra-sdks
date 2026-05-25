# API Reference

Base URL: `https://api.hydrapay.io`

Authentication: `Authorization: Bearer <api_key>`

---

## Payments

### Create Payment

```http
POST /v1/payments
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | integer | yes | Amount in minor units (pence) |
| `currency` | string | yes | ISO 4217 currency code |
| `merchantId` | string | yes | Merchant ID |
| `paymentMethods` | array | yes | e.g. `["card"]` |
| `capture` | boolean | yes | Capture immediately or authorize only |
| `source` | string | no | Payment method ID |
| `metadata` | object | no | Key-value metadata |
| `description` | string | no | Payment description |

### List Payments

```http
GET /v1/payments?limit=10&status=succeeded
```

### Retrieve Payment

```http
GET /v1/payments/:id
```

### Capture Payment

```http
POST /v1/payments/:id/capture
```

### Cancel Payment

```http
POST /v1/payments/:id/cancel
```

---

## Checkout

### Create Checkout Session

```http
POST /v1/checkout/sessions
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `amount` | integer | yes | Amount in minor units |
| `currency` | string | yes | ISO 4217 |
| `merchantId` | string | yes | Merchant ID |
| `successUrl` | string | yes | Redirect on success |
| `cancelUrl` | string | yes | Redirect on cancel |

### Retrieve Checkout Session

```http
GET /v1/checkout/sessions/:id
```

---

## Refunds

### Create Refund

```http
POST /v1/refunds
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `paymentId` | string | yes | Payment to refund |
| `amount` | integer | no | Partial refund amount |
| `reason` | string | no | `duplicate`, `fraudulent`, `customer_request` |

### List Refunds

```http
GET /v1/refunds?limit=10
```

### Retrieve Refund

```http
GET /v1/refunds/:id
```

---

## Customers

### Create Customer

```http
POST /v1/customers
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `email` | string | yes | Customer email |
| `name` | string | no | Customer name |

### List Customers

```http
GET /v1/customers
```

### Retrieve Customer

```http
GET /v1/customers/:id
```

---

## Bank Accounts

### Validate

```http
POST /v1/bank-accounts/validate
```

### Create

```http
POST /v1/bank-accounts
```

---

## Disputes

### List Disputes

```http
GET /v1/disputes
```

### Retrieve Dispute

```http
GET /v1/disputes/:id
```

### Update Dispute

```http
POST /v1/disputes/:id
```

---

## Balance

### Retrieve Balance

```http
GET /v1/balance
```

---

## Webhooks

Verify webhook signatures in Node.js:

```javascript
const event = hydra.webhooks.constructEvent(
  request.body,
  request.headers['hydra-signature'],
  'whsec_abc123'
);
```

---

## Errors

The API returns standard HTTP status codes:

| Code | Meaning |
|------|---------|
| 200 | Success |
| 400 | Bad request |
| 401 | Unauthorized |
| 404 | Not found |
| 409 | Conflict |
| 429 | Rate limited |
| 500 | Server error |

Error bodies contain:

```json
{
  "error": {
    "type": "invalid_request_error",
    "code": "amount_invalid",
    "message": "Amount must be a positive integer",
    "param": "amount"
  }
}
```
