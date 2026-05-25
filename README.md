# Hydra SDKs & Integrations

Official client libraries and platform integrations for the [Hydra payments API](https://hydrapay.io).

## Available SDKs

| Language | Directory | Package | Status |
|----------|-----------|---------|--------|
| **[Go](./go/README.md)** | `go/` | `github.com/hydra-payments/go-sdk` | ✅ 60 tests |
| **[PHP/Laravel](./php/README.md)** | `php/` | `hydra-payments/sdk-php` | ✅ 129 tests |
| **[Python](./python/README.md)** | `python/` | `hydra-payments` | ✅ |
| **[Rust](./rust/README.md)** | `rust/` | `hydra-sdk` | ✅ |
| **[Java](./java/README.md)** | `java/` | `com.hydrapayments:sdk-java` | ✅ 85 tests |
| **[.NET](./dotnet/README.md)** | `dotnet/` | `HydraPayments.Sdk` | ✅ 81 tests |
| **[Ruby](./ruby/README.md)** | `ruby/` | `hydra_payments` | ✅ 76 tests |
| **[iOS (Swift)](./ios/README.md)** | `ios/` | `HydraPayments` | ✅ 71 tests |
| **[Android (Kotlin)](./android/README.md)** | `android/` | `com.hydrapayments:sdk` | ✅ 69 tests |
| **[TypeScript](./typescript/README.md)** | `typescript/` | `@hydra-payments/sdk` | ✅ |
| **[React Native](./react-native/README.md)** | `react-native/` | `@hydra-payments/react-native-sdk` | ✅ 59 tests |
| **[Terraform](./terraform/README.md)** | `terraform/` | `registry.terraform.io/hydra-payments/hydra` | ✅ 7 resources + 7 data sources |
| **[JavaScript (browser)](./javascript/)** | `javascript/` | `@hydrapp/sdk` | ✅ |
| **[HTML (CDN)](./html/)** | `html/` | `<script>` tag | ✅ |

## Quick Install

```bash
# Go
go get github.com/hydra-payments/go-sdk

# PHP
composer require hydra-payments/sdk-php

# Python
pip install hydra-payments

# Rust
cargo add hydra-sdk

# Java (Maven)
# Add to pom.xml: com.hydrapayments:sdk-java:0.1.0

# .NET (NuGet)
dotnet add package HydraPayments.Sdk

# Ruby (Gemfile)
gem 'hydra_payments'

# Node.js/TypeScript
npm add @hydra-payments/sdk

# React Native
npm add @hydra-payments/react-native-sdk

# Terraform
terraform init  # with required_providers config

# JavaScript (browser)
npm install @hydrapp/sdk
```

## Platform Integrations

| Platform | Directory | Description |
|----------|-----------|-------------|
| **[Shopify](./shopify-hydra-integration/)** | `shopify-hydra-integration/` | Embedded Shopify app — Hydra as a custom payment method |
| **[WordPress](./wp-hydra-payment/)** | `wp-hydra-payment/` | WordPress/WooCommerce payment gateway plugin |

## MCP Server

| Tool | Directory | Description |
|------|-----------|-------------|
| **[MCP Server](./mcp-server/)** | `mcp-server/` | Model Context Protocol server for AI agent integration |

## Documentation

| Document | Description |
|----------|-------------|
| [Integration Guide](./docs/INTEGRATION_GUIDE.md) | Comprehensive integration guide with code examples in all SDK languages |
| [Getting Started](./docs/GETTING_STARTED.md) | 5-minute quick start guide |
| [Payment Gateway Integration](./docs/payment-gateway-integration.md) | Payment gateway-specific integration (tokenization, intents, refunds) |
| [Example Checkout](./docs/example-checkout.html) | Interactive checkout demo HTML page |

## Common Features

All SDKs support:

- **Core Ledger API**: Accounts, transactions, wallets, splits
- **Payment Gateway**: Card tokenization, payment intents, refunds, commission, webhooks
- **Health Check**: Service health monitoring
- **HMAC-SHA256 Authentication**: Automatic request signing
- **Typed Errors**: Language-specific error types mapped from HTTP status codes
- **i18n Support**: Configurable locale and default currency

## Architecture

```
Client App
    │
    ▼ (signed HTTP request)
Hydra API
    │
    ├── Core Ledger (/v1/api/) — Accounts, Transactions, Wallets, Splits
    └── Payment Gateway (/v1/payments/) — Tokens, Intents, Refunds
```

## License

MIT
