# Hydra Payment Service — Terraform Provider

A [Terraform](https://www.terraform.io) provider for the [Hydra Payment Service](https://github.com/hydra-pay) — manage HydraPay resources as Infrastructure as Code.

## Features

- Manage accounts, transactions, wallets, and split rules as Terraform resources
- Read-only data sources for accounts, transactions, wallets, health, and commission
- HMAC-SHA256 request signing with constant-time verification
- Automatic retry and error handling with typed errors
- Configurable default currency and locale
- Import existing resources into Terraform state

## Requirements

- [Terraform](https://www.terraform.io/downloads) >= 1.0
- [Go](https://go.dev/dl/) >= 1.22 (to build the provider)

## Installation

### From the Terraform Registry

```hcl
terraform {
  required_providers {
    hydra = {
      source  = "hydra-payments/hydra"
      version = "~> 0.1"
    }
  }
}

provider "hydra" {
  base_url   = "https://api.hydrapay.io"
  api_key    = var.hydra_api_key
  secret_key = var.hydra_secret_key
}
```

### Building from Source

```bash
git clone https://github.com/hydra-pay/hydra.git
cd sdks/terraform
go build -o terraform-provider-hydra
```

Place the binary in your local plugin directory:

```bash
mkdir -p ~/.terraform.d/plugins/registry.terraform.io/hydra-payments/hydra/0.1.0/darwin_arm64/
cp terraform-provider-hydra ~/.terraform.d/plugins/registry.terraform.io/hydra-payments/hydra/0.1.0/darwin_arm64/
```

## Provider Configuration

| Argument | Type | Required | Default | Description |
|----------|------|----------|---------|-------------|
| `base_url` | `string` | no | `http://localhost:8080` | Hydra API base URL |
| `api_key` | `string` | yes | — | API publishable key |
| `secret_key` | `string` | yes | — | API secret key for HMAC signing |
| `default_currency` | `string` | no | `GBP` | Default currency for transactions |
| `locale` | `string` | no | `en` | Locale for i18n support |

## Resources

### hydra_account

Manages a payment account within Hydra.

```hcl
resource "hydra_account" "merchant" {
  owner_id     = "user-abc-123"
  account_type = "company"
  currency     = "GBP"
}
```

**Schema:**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `owner_id` | `string` | yes | Owner identifier |
| `account_type` | `string` | yes | `company`, `personal`, or `fractional` |
| `currency` | `string` | no | Currency code (defaults to provider default) |
| `id` | `string` | computed | Account ID |
| `balance` | `string` | computed | Current balance |
| `created_at` | `string` | computed | Creation timestamp |

### hydra_transaction

Creates a transfer between two accounts with optional completion or failure.

```hcl
resource "hydra_transaction" "payment" {
  source_id = hydra_account.merchant.id
  dest_id   = hydra_account.customer.id
  amount    = "50.00"
  currency  = "GBP"
  reference = "INV-001"
}
```

**Schema:**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `source_id` | `string` | yes | Source account ID |
| `dest_id` | `string` | yes | Destination account ID |
| `amount` | `string` | yes | Amount to transfer |
| `currency` | `string` | no | Currency code |
| `reference` | `string` | no | Optional reference |
| `action` | `string` | no | `transfer` (default), `complete`, or `fail` |
| `id` | `string` | computed | Transaction ID |
| `status` | `string` | computed | `pending`, `completed`, or `failed` |
| `created_at` | `string` | computed | Creation timestamp |

### hydra_wallet

Manages a blockchain wallet.

```hcl
resource "hydra_wallet" "main" {
  owner_id     = "user-abc-123"
  wallet_type  = "non-custodial"
  chain        = "ethereum"
  address      = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"
}
```

**Schema:**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `owner_id` | `string` | yes | Owner identifier |
| `wallet_type` | `string` | yes | `custodial` or `non-custodial` |
| `chain` | `string` | yes | `ethereum`, `bitcoin`, `solana`, or `polygon` |
| `address` | `string` | yes | Blockchain address |
| `encrypted_private_key` | `string` | no | Encrypted private key (sensitive) |
| `id` | `string` | computed | Wallet ID |
| `is_custodial` | `bool` | computed | Whether the wallet is custodial |
| `created_at` | `string` | computed | Creation timestamp |

### hydra_split_rule

Creates a split payment rule.

```hcl
resource "hydra_split_rule" "revenue" {
  total    = "100.00"
  currency = "GBP"

  split {
    account_id = hydra_account.platform.id
    percentage = 70.0
  }
  split {
    account_id = hydra_account.merchant.id
    percentage = 30.0
  }
}
```

**Schema:**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `total` | `string` | yes | Total amount for the split |
| `currency` | `string` | no | Currency code |
| `reference` | `string` | no | Optional reference |
| `split` | `list` | yes | List of split entries |
| `split.account_id` | `string` | yes | Target account ID |
| `split.percentage` | `float` | yes | Percentage of total |
| `id` | `string` | computed | Split rule ID |
| `status` | `string` | computed | Rule status |
| `created_at` | `string` | computed | Creation timestamp |

### hydra_payment_token

Tokenizes card details for use in payment intents.

```hcl
resource "hydra_payment_token" "card" {
  card_number = "4242424242424242"
  exp_month   = 12
  exp_year    = 2028
  cvc         = "123"
}
```

**Schema:**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `card_number` | `string` | yes | Card number (sensitive) |
| `exp_month` | `int` | yes | Expiration month |
| `exp_year` | `int` | yes | Expiration year |
| `cvc` | `string` | yes | CVC code (sensitive) |
| `merchant_id` | `string` | no | Optional merchant ID |
| `id` | `string` | computed | Token ID |
| `card_brand` | `string` | computed | Card brand (Visa, Mastercard, etc.) |
| `card_last4` | `string` | computed | Last 4 digits of card |
| `created_at` | `string` | computed | Creation timestamp |

### hydra_payment_intent

Creates a payment intent for processing a payment.

```hcl
resource "hydra_payment_intent" "charge" {
  amount          = 2999
  currency        = "GBP"
  token           = hydra_payment_token.card.id
  idempotency_key = "unique-key-001"
}
```

**Schema:**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `amount` | `int` | yes | Amount in the smallest currency unit |
| `currency` | `string` | yes | Currency code |
| `token` | `string` | no | Card token ID |
| `merchant_id` | `string` | no | Optional merchant ID |
| `idempotency_key` | `string` | no | Idempotency key for safe retries |
| `id` | `string` | computed | Intent ID |
| `status` | `string` | computed | Payment status |
| `client_secret` | `string` | computed | Client secret for front-end (sensitive) |

### hydra_refund

Refunds a previously created charge.

```hcl
resource "hydra_refund" "partial" {
  charge_id = "ch_abc123"
  amount    = 1000
}
```

**Schema:**

| Attribute | Type | Required | Description |
|-----------|------|----------|-------------|
| `charge_id` | `string` | yes | Charge to refund |
| `amount` | `int` | no | Amount to refund (full refund if omitted) |
| `id` | `string` | computed | Refund ID |
| `status` | `string` | computed | Refund status |
| `refunded_amount` | `int` | computed | Amount refunded |
| `charge` | `string` | computed | Charge ID |

## Data Sources

### hydra_account

```hcl
data "hydra_account" "by_id" {
  id = "acc_abc123"
}

output "balance" {
  value = data.hydra_account.by_id.balance
}
```

### hydra_accounts

```hcl
data "hydra_accounts" "by_owner" {
  owner_id = "user-abc-123"
}

output "all_accounts" {
  value = data.hydra_accounts.by_owner.accounts
}
```

### hydra_transaction

```hcl
data "hydra_transaction" "by_id" {
  id = "txn_abc123"
}
```

### hydra_wallets

```hcl
data "hydra_wallets" "by_owner" {
  owner_id = "user-abc-123"
}
```

### hydra_split_rule

```hcl
data "hydra_split_rule" "by_id" {
  id = "split_abc123"
}
```

### hydra_commission

```hcl
data "hydra_commission" "total" {}

output "commission" {
  value = data.hydra_commission.total.total_commission
}
```

### hydra_health

```hcl
data "hydra_health" "api" {}

output "api_status" {
  value = data.hydra_health.api.status
}
```

## Example: Complete Payment Flow

```hcl
terraform {
  required_providers {
    hydra = {
      source  = "hydra-payments/hydra"
      version = "~> 0.1"
    }
  }
}

provider "hydra" {
  base_url         = var.hydra_base_url
  api_key          = var.hydra_api_key
  secret_key       = var.hydra_secret_key
  default_currency = "GBP"
}

# Create accounts
resource "hydra_account" "platform" {
  owner_id     = "platform-owner"
  account_type = "company"
}

resource "hydra_account" "merchant" {
  owner_id     = "merchant-owner"
  account_type = "personal"
}

# Create a wallet
resource "hydra_wallet" "merchant_wallet" {
  owner_id    = "merchant-owner"
  wallet_type = "non-custodial"
  chain       = "ethereum"
  address     = "0x742d35Cc6634C0532925a3b844Bc9e7595f2bD18"
}

# Transfer funds
resource "hydra_transaction" "payout" {
  source_id = hydra_account.platform.id
  dest_id   = hydra_account.merchant.id
  amount    = "100.00"
  reference = "monthly-payout"
}

# Create a split rule
resource "hydra_split_rule" "revenue_share" {
  total    = "100.00"
  splits = [
    {
      account_id = hydra_account.platform.id
      percentage = 70.0
    },
    {
      account_id = hydra_account.merchant.id
      percentage = 30.0
    },
  ]
}

# Check health
data "hydra_health" "api" {}

output "api_version" {
  value = data.hydra_health.api.version
}
```

## Error Handling

The provider returns typed errors mapped from HTTP status codes:

| HTTP Status | Error | Description |
|-------------|-------|-------------|
| `400` | Validation error | Invalid request parameters |
| `401` | Authentication error | Invalid API key or signature |
| `404` | Not found | Resource doesn't exist |
| Other | API error | Generic API error |

## Importing Resources

Existing resources can be imported into Terraform state:

```bash
terraform import hydra_account.my_account acc_abc123
terraform import hydra_transaction.my_tx txn_abc123
terraform import hydra_wallet.my_wallet wal_abc123
terraform import hydra_split_rule.my_split split_abc123
```

## Building and Testing

```bash
# Build the provider
go build -o terraform-provider-hydra

# Run unit tests
go test -v ./...

# Test with a local Hydra instance
terraform init
terraform plan
terraform apply
```

## Architecture

```
Terraform Config (.tf)
      |
      ▼
Terraform Provider (Go binary)
      |
      ├── provider.go — Provider schema & factory
      ├── client.go — HMAC-signed HTTP client
      ├── resource_*.go — Resources (CRUD)
      └── data_source_*.go — Data sources (Read)
      |
      ▼ (signed HTTP request)
  Hydra API
      |
      ├── Core Ledger (/v1/api/) — Accounts, Transactions, Wallets, Splits
      └── Payment Gateway (/v1/payments/) — Tokens, Intents, Refunds
```

## License

MIT
