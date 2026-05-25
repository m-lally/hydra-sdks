# Hydra Payment Service — PHP SDK

A production-grade PHP SDK for the [Hydra Payment Service](https://github.com/hydra-pay) with HMAC-SHA256 request signing and optional Laravel integration.

## Features

- HMAC-SHA256 request signing with constant-time verification
- Type-safe DTOs with PHP 8.1+ readonly properties and enums
- Factory method and constructor injection
- Full error type support (AuthenticationException, ValidationException, NotFoundException)
- i18n support (configurable locale and default currency)
- Laravel service provider, facade, and config publishing
- Composer-friendly PSR-4 autoloading

## Requirements

- PHP 8.1 or higher
- Guzzle HTTP Client (`guzzlehttp/guzzle`)

## Installation

```bash
composer require hydra-payments/sdk-php
```

## Quick Start

```php
<?php

require_once 'vendor/autoload.php';

use HydraPayments\Sdk\HydraClient;

$client = new HydraClient(
    baseUrl: 'http://localhost:8080',
    apiKey: 'pk_xxx',
    secretKey: 'sk_xxx',
);

// Health check
$health = $client->healthCheck();
printf("Status: %s | DB: %s | Version: %s\n",
    $health->status, $health->database, $health->version
);

// Create an account
$account = $client->createAccount(
    ownerId: 'user-uuid-here',
    accountType: 'personal',
);
printf("Account: %s | Balance: %s\n", $account->id, $account->balance);
```

### Using the Factory

```php
$client = HydraClient::create(
    baseUrl: 'http://localhost:8080',
    apiKey: 'pk_xxx',
    secretKey: 'sk_xxx',
    defaultCurrency: 'USD',
    locale: 'fr',
);
```

## Usage

### Core API Methods

| Method | Description |
|--------|-------------|
| `healthCheck()` | Health check endpoint |
| `createAccount(ownerId, accountType, currency)` | Create a new account |
| `getAccount(id)` | Get account by ID |
| `getAccountsByOwner(ownerId)` | List accounts by owner |
| `transfer(sourceId, destId, amount, currency, reference)` | Transfer funds |
| `getTransaction(id)` | Get transaction by ID |
| `completeTransaction(id)` | Complete pending transaction |
| `failTransaction(id)` | Fail pending transaction |
| `createWallet(ownerId, walletType, chain, address, encryptedPrivateKey)` | Create wallet |
| `getWallets(ownerId)` | List wallets by owner |
| `relayTransaction(walletId, signedTransaction)` | Relay blockchain transaction |
| `createSplit(total, splits, currency, reference)` | Create split rule |
| `getSplit(id)` | Get split rule |

### Payment Gateway Methods

| Method | Description |
|--------|-------------|
| `createCardToken(card, merchantId)` | Tokenize card data |
| `createPaymentIntent(amount, currency, token, merchantId, idempotencyKey)` | Create payment |
| `createRefund(chargeId, amount)` | Refund a charge |
| `getCommission()` | Total commission collected |
| `sendWebhookEvent(payload)` | Send test webhook event |
| `getMetrics()` | Prometheus metrics |

### Security Methods

| Method | Description |
|--------|-------------|
| `verifySignature(payload, signature)` | Constant-time HMAC signature verification |
| `signMessage(message)` | HMAC-SHA256 message signing |

### Error Handling

The SDK throws typed exceptions for different error scenarios:

```php
use HydraPayments\Sdk\NotFoundException;
use HydraPayments\Sdk\AuthenticationException;
use HydraPayments\Sdk\ValidationException;
use HydraPayments\Sdk\HydraException;

try {
    $account = $client->getAccount('non-existent-id');
} catch (NotFoundException $e) {
    echo "Account not found: {$e->getMessage()}";
} catch (AuthenticationException $e) {
    echo "Authentication failed: {$e->getMessage()}";
} catch (ValidationException $e) {
    echo "Validation error: {$e->getMessage()}";
} catch (HydraException $e) {
    echo "API error [{$e->errorCode}]: {$e->getMessage()}";
}
```

| Exception | HTTP Status | When |
|-----------|-------------|------|
| `AuthenticationException` | 401 | Invalid API key or signature |
| `ValidationException` | 400 | Invalid request parameters |
| `NotFoundException` | 404 | Resource doesn't exist |
| `HydraException` | Other | Generic API or network error |

### Webhook Signature Verification

```php
$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_SIGNATURE'] ?? '';

if ($client->verifySignature($payload, $signature)) {
    // Process webhook
} else {
    http_response_code(401);
    echo 'Invalid signature';
}
```

### Split Payments

```php
use HydraPayments\Sdk\SplitEntry;

$splits = [
    new SplitEntry(accountId: 'vendor-1-uuid', percentage: 70.0),
    new SplitEntry(accountId: 'vendor-2-uuid', percentage: 30.0),
];

$rule = $client->createSplit(
    total: '100.00',
    splits: $splits,
    currency: 'GBP',
    reference: 'ORDER-123',
);

printf("Split rule %s created with %d recipients\n", $rule->id, count($rule->splits));
```

## Laravel Integration

### Service Provider Auto-Discovery

Laravel will automatically discover the `HydraServiceProvider` and `Hydra` facade.

### Publish Configuration

```bash
php artisan vendor:publish --tag=hydra-config
```

This publishes `config/hydra.php` with the following environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `HYDRA_BASE_URL` | `http://localhost:8080` | API base URL |
| `HYDRA_API_KEY` | — | Your API publishable key |
| `HYDRA_SECRET_KEY` | — | Your API secret key |
| `HYDRA_TIMEOUT` | `30.0` | Request timeout in seconds |
| `HYDRA_DEFAULT_CURRENCY` | `GBP` | Default transaction currency |
| `HYDRA_LOCALE` | `en` | Locale for i18n |

### Using the Facade

```php
use HydraPayments\Sdk\Facades\Hydra;

$health = Hydra::healthCheck();
$account = Hydra::createAccount('user-123', 'personal');
$tx = Hydra::transfer('src-1', 'dst-1', '50.00');
```

### Dependency Injection

```php
use HydraPayments\Sdk\HydraClient;

class PaymentController
{
    public function __construct(
        private readonly HydraClient $hydra,
    ) {}

    public function process(Request $request)
    {
        $account = $this->hydra->getAccount($request->input('account_id'));
        // ...
    }
}
```

## License

MIT
