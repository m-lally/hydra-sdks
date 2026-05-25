# Hydra Payments Integration Guide

Complete guide for integrating Hydra Payment Service into your website to accept payments.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Setup](#setup)
4. [User Journey](#user-journey)
5. [API Reference](#api-reference)
6. [Code Examples](#code-examples)
7. [Security](#security)

---

## Overview

The Hydra Payment Service is a double-entry ledger system designed for:
- **Merchant payments**: Accept payments from customers
- **Account management**: Create and manage customer accounts
- **Wallet integration**: Support blockchain wallets (EVM, Solana, Bitcoin)
- **Payment splits**: Distribute payments across multiple accounts (e.g., multi-vendor marketplace)

### Key Features

- **Multi-currency support**: GBP, USD, EUR, etc.
- **Instant settlements**: Real-time balance updates
- **Audit trail**: Complete transaction history with state hashing
- **Rate limiting**: Protected against abuse
- **HMAC signatures**: Cryptographic verification of requests

---

## Prerequisites

### 1. Hydra Server Running

Ensure the Hydra service is running:

```bash
cd core
DATABASE_URL="postgres://your_user@localhost:5432/hydra" \
HYDRA_API_KEY="your-secret-api-key" \
HYDRA_HMAC_SECRET="your-hmac-secret-key" \
cargo run --release
# Server listens on 0.0.0.0:8080
```

### 2. SDK Installation

Choose the SDK for your platform:

#### Node.js/TypeScript
```bash
npm add @hydra-pay/sdk
```

#### Python
```bash
pip install hydra-payments
```

#### Rust
```toml
[dependencies]
hydra_payments = "0.1.0"
```

#### Go
```bash
go get github.com/hydra-pay/go-sdk
```

#### PHP (Laravel)
```bash
composer require hydra-payments/sdk-php
```

#### Java (Maven)
```xml
<dependency>
  <groupId>com.hydrapayments</groupId>
  <artifactId>sdk-java</artifactId>
  <version>0.1.0</version>
</dependency>
```

#### .NET (NuGet)
```bash
dotnet add package HydraPayments.Sdk
```

#### Ruby (gem)
```bash
gem install hydra_payments
```

#### iOS (Swift Package Manager)
```swift
// Add to Package.swift
dependencies: [
    .package(url: "https://github.com/hydra-pay/hydra.git", branch: "main")
]
```

#### Android (Gradle)
```kotlin
// build.gradle.kts
dependencies {
    implementation("com.hydrapayments:sdk:0.1.0")
}
```

#### React Native
```bash
npm add @hydra-pay/react-native-sdk
```

#### Terraform
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
  base_url   = var.hydra_url
  api_key    = var.hydra_api_key
  secret_key = var.hydra_secret_key
}
```

---

## Setup

### Step 1: Initialize Credentials

Obtain your API credentials from the Hydra dashboard:

```bash
# API Key (X-API-Key header)
HYDRA_API_KEY=your-secret-api-key

# HMAC Secret (for request signing)
HYDRA_HMAC_SECRET=your-hmac-secret-key

# Server URL
HYDRA_URL=http://localhost:8080 # or production URL
```

### Step 2: Environment Configuration

**Website `.env` file:**
```env
# Hydra Payment Service
VITE_HYDRA_API_KEY=your-secret-api-key
VITE_HYDRA_HMAC_SECRET=your-hmac-secret-key
VITE_HYDRA_URL=http://localhost:8080
VITE_OWNER_ID=your-merchant-uuid
```

### Step 3: Verify Server Health

```bash
curl http://localhost:8080/health
```

**Response:**
```json
{
  "status": "healthy",
  "version": "0.1.0",
  "database": "connected"
}
```

---

## User Journey

### Complete Payment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    Customer Visits Website                       │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│        1. Create/Fetch Customer Account                          │
│   Website calls: POST /v1/api/accounts                           │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│        2. Customer Adds Items to Cart & Checks Out               │
│   Total: £99.99                                                  │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│        3. Website Creates Merchant Receiving Account              │
│   Website calls: POST /v1/api/accounts                           │
│   (if not already created)                                        │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│        4. Customer Completes Payment                              │
│   Website calls: POST /v1/api/transactions                       │
│   Transfers £99.99 from customer to merchant account             │
└────────────┬────────────────────────────────────────────────────┘
             │
             ▼
┌─────────────────────────────────────────────────────────────────┐
│        5. Confirm Order & Send Receipt                            │
│   Website displays payment confirmation                           │
│   Email receipt sent to customer                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## API Reference

### Authentication

All requests must include:

```
X-API-Key: your-secret-api-key
X-Signature: base64(hmac-sha256(message, your-hmac-secret-key))
X-Timestamp: 1710000000000
```

**Message format for signing:**
```
METHOD:path:timestamp_ms:body
```

Example:
```
POST:/v1/api/accounts:1710000000000:{"owner_id":"550e8400-e29b-41d4-a716-446655440000","account_type":"personal","currency":"GBP"}
```

### Endpoints

#### 1. Create Account

**POST** `/v1/api/accounts`

Request:
```json
{
  "owner_id": "550e8400-e29b-41d4-a716-446655440000",
  "account_type": "personal",
  "currency": "GBP"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "owner_id": "550e8400-e29b-41d4-a716-446655440000",
    "account_type": "personal",
    "currency": "GBP",
    "balance": "0.0000",
    "created_at": "2026-04-20T10:00:00Z"
  }
}
```

#### 2. Get Account

**GET** `/v1/api/accounts/{id}`

Response:
```json
{
  "success": true,
  "data": {
    "id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "owner_id": "550e8400-e29b-41d4-a716-446655440000",
    "account_type": "personal",
    "currency": "GBP",
    "balance": "99.9900",
    "created_at": "2026-04-20T10:00:00Z"
  }
}
```

#### 3. Create Transfer

**POST** `/v1/api/transactions`

Request:
```json
{
  "source_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "dest_id": "7ba7b810-9dad-11d1-80b4-00c04fd430c8",
  "amount": "99.99",
  "currency": "GBP",
  "reference": "ORDER-12345"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "8ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "source_account_id": "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "dest_account_id": "7ba7b810-9dad-11d1-80b4-00c04fd430c8",
    "amount": "99.9900",
    "currency": "GBP",
    "status": "completed",
    "transaction_type": "transfer",
    "reference": "ORDER-12345",
    "created_at": "2026-04-20T10:00:01Z"
  }
}
```

#### 4. Execute Split Payment

**POST** `/v1/api/splits/execute`

Request (multi-vendor marketplace):
```json
{
  "source_id": "customer-account-id",
  "splits": [
    {
      "account_id": "vendor-1-account-id",
      "percentage": "60"
    },
    {
      "account_id": "vendor-2-account-id",
      "percentage": "40"
    }
  ],
  "total_amount": "100.00",
  "currency": "GBP",
  "reference": "ORDER-12345"
}
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "id": "transaction-1-id",
      "dest_account_id": "vendor-1-account-id",
      "amount": "60.0000",
      "currency": "GBP",
      "status": "completed"
    },
    {
      "id": "transaction-2-id",
      "dest_account_id": "vendor-2-account-id",
      "amount": "40.0000",
      "currency": "GBP",
      "status": "completed"
    }
  ]
}
```

#### 5. Preview Split Calculation

**POST** `/v1/api/splits/preview`

Request:
```json
{
  "splits": [
    {
      "account_id": "vendor-1-account-id",
      "percentage": "33"
    },
    {
      "account_id": "vendor-2-account-id",
      "percentage": "33"
    }
  ],
  "total_amount": "100.00",
  "currency": "GBP",
  "sink_account_id": "platform-account-id"
}
```

Response:
```json
{
  "success": true,
  "data": [
    {
      "account_id": "vendor-1-account-id",
      "amount": "33.0000"
    },
    {
      "account_id": "vendor-2-account-id",
      "amount": "33.0000"
    },
    {
      "account_id": "platform-account-id",
      "amount": "34.0000"
    }
  ]
}
```

---

## Code Examples

### React Native

```typescript
import { createHydraClient } from '@hydra-pay/react-native-sdk';

const hydra = createHydraClient({
  apiKey: process.env.HYDRA_API_KEY!,
  secretKey: process.env.HYDRA_HMAC_SECRET!,
  baseUrl: process.env.HYDRA_URL || 'http://localhost:8080',
});

// 1. Create customer account
async function createCustomerAccount(customerId: string, currency = 'GBP') {
  const response = await hydra.createAccount(customerId, 'personal', currency);
  if (!response.success) {
    throw new Error(`Failed to create account: ${response.error}`);
  }
  return response.data!.id;
}

// 2. Process checkout
async function processCheckout(
  customerAccountId: string,
  merchantAccountId: string,
  orderTotal: string,
  orderId: string,
) {
  const txResponse = await hydra.transfer(
    customerAccountId,
    merchantAccountId,
    orderTotal,
    'GBP',
    `ORDER-${orderId}`,
  );
  if (!txResponse.success) {
    throw new Error(`Payment failed: ${txResponse.error}`);
  }
  return {
    transactionId: txResponse.data!.id,
    status: txResponse.data!.status,
    amount: txResponse.data!.amount,
  };
}

// 3. React Native UI with hooks
import { HydraProvider, useAccount, AccountCard } from '@hydra-pay/react-native-sdk/components';

function App() {
  return (
    <HydraProvider
      options={{
        apiKey: process.env.HYDRA_API_KEY!,
        secretKey: process.env.HYDRA_HMAC_SECRET!,
        baseUrl: process.env.HYDRA_URL || 'http://localhost:8080',
      }}
    >
      <CheckoutScreen />
    </HydraProvider>
  );
}

function CheckoutScreen() {
  const { account, loading, error } = useAccount('acc_123');
  if (loading) return <ActivityIndicator />;
  if (error) return <ErrorDisplay error={error} />;
  return <AccountCard account={account} />;
}
```

### TypeScript/JavaScript

```typescript
import { createHydraClient } from '@hydra-pay/sdk';

const hydra = createHydraClient({
  apiKey: process.env.VITE_HYDRA_API_KEY!,
  secretKey: process.env.VITE_HYDRA_HMAC_SECRET!,
  baseUrl: process.env.VITE_HYDRA_URL || 'http://localhost:8080',
});

// 1. Create customer account
async function createCustomerAccount(customerId: string, currency = 'GBP') {
  const response = await hydra.createAccount(customerId, 'personal', currency);

  if (!response.success) {
    throw new Error(`Failed to create account: ${response.error}`);
  }

  return response.data!.id;
}

// 2. Process checkout payment
async function processCheckout(
  customerAccountId: string,
  merchantAccountId: string,
  orderTotal: string,
  orderId: string,
) {
  const txResponse = await hydra.transfer(
    customerAccountId,
    merchantAccountId,
    orderTotal,
    'GBP',
    `ORDER-${orderId}`,
  );

  if (!txResponse.success) {
    throw new Error(`Payment failed: ${txResponse.error}`);
  }

  return {
    transactionId: txResponse.data!.id,
    status: txResponse.data!.status,
    amount: txResponse.data!.amount,
    timestamp: txResponse.data!.created_at,
  };
}

// 3. React integration with HydraProvider
import { HydraProvider, useAccount, AccountCard } from '@hydra-pay/sdk/react';

function App() {
  return (
    <HydraProvider
      apiKey={process.env.VITE_HYDRA_API_KEY!}
      secretKey={process.env.VITE_HYDRA_HMAC_SECRET!}
      baseUrl={process.env.VITE_HYDRA_URL || 'http://localhost:8080'}
    >
      <CheckoutPage />
    </HydraProvider>
  );
}

function CheckoutPage() {
  const { account, loading, error } = useAccount('acc_123');
  if (loading) return <div>Loading...</div>;
  if (error) return <div className="error">{error}</div>;
  return <AccountCard account={account} />;
}
```

### Python

```python
import asyncio
import os
from hydra_payments import create_client

async def main():
    hydra = create_client(
        api_key=os.getenv('HYDRA_API_KEY'),
        secret_key=os.getenv('HYDRA_HMAC_SECRET'),
        base_url=os.getenv('HYDRA_URL', 'http://localhost:8080'),
    )

    # Create customer account
    response = await hydra.create_account(
        owner_id='customer-uuid',
        account_type='personal',
        currency='GBP',
    )
    customer_account_id = response.id
    print(f"Created account: {customer_account_id}")

    # Transfer to merchant
    tx = await hydra.transfer(
        source_id=customer_account_id,
        dest_id='merchant-uuid',
        amount='99.99',
        currency='GBP',
        reference='ORDER-12345',
    )
    print(f"Transfer: {tx.id}, Status: {tx.status}")

    await hydra.close()

asyncio.run(main())
```

#### Flask Example (sync client)

```python
from flask import Flask, request, jsonify
from hydra_payments import create_sync_client
import os

hydra = create_sync_client(
    api_key=os.getenv('HYDRA_API_KEY'),
    secret_key=os.getenv('HYDRA_HMAC_SECRET'),
    base_url=os.getenv('HYDRA_URL', 'http://localhost:8080'),
)

app = Flask(__name__)

@app.route('/api/checkout', methods=['POST'])
def checkout():
    try:
        data = request.json
        account = hydra.create_account(
            owner_id=data['customer_id'],
            account_type='personal',
            currency='GBP',
        )
        tx = hydra.transfer(
            source_id=account.id,
            dest_id=os.getenv('HYDRA_MERCHANT_ACCOUNT'),
            amount=data['amount'],
            currency='GBP',
            reference=f"ORDER-{data['order_id']}",
        )
        return jsonify({'success': True, 'transaction_id': tx.id, 'status': tx.status})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 400

if __name__ == '__main__':
    app.run(debug=True)
```

### Rust

```rust
use hydra_sdk::{HydraClient, Result};
use uuid::Uuid;

#[tokio::main]
async fn main() -> Result<()> {
    let client = HydraClient::new(
        std::env::var("HYDRA_URL").unwrap_or("http://localhost:8080".into()),
        std::env::var("HYDRA_API_KEY").expect("HYDRA_API_KEY must be set"),
        std::env::var("HYDRA_HMAC_SECRET").expect("HYDRA_HMAC_SECRET must be set"),
    );

    // Health check
    let health = client.health_check().await?;
    println!("Status: {}", health.status);

    // Create customer account
    let account = client.create_account(
        Uuid::new_v4(),
        "personal",
        Some("GBP"),
    ).await?;
    println!("Account: {} Balance: {}", account.id, account.balance);

    // Transfer to merchant
    let tx = client.transfer(
        account.id,
        Uuid::new_v4(),
        "99.99",
        Some("GBP"),
        Some("ORDER-12345"),
    ).await?;
    println!("Transfer: {} Status: {}", tx.id, tx.status);

    Ok(())
}
```

### Go

```go
package main

import (
    "fmt"
    "log"
    "github.com/hydra-pay/go-sdk"
)

func main() {
    client := hydra.NewClient(
        "http://localhost:8080",
        "pk_xxx",
        "sk_xxx",
    )

    // Health check
    health, err := client.HealthCheck()
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Status: %s\n", health.Status)

    // Create customer account
    account, err := client.CreateAccount(
        "customer-uuid",
        "personal",
        nil,
    )
    if err != nil {
        log.Fatal(err)
    }

    // Transfer to merchant
    tx, err := client.Transfer(
        account.ID,
        "merchant-uuid",
        "99.99",
        nil,
        strPtr("ORDER-12345"),
    )
    if err != nil {
        log.Fatal(err)
    }
    fmt.Printf("Transfer: %s, Status: %s\n", tx.ID, tx.Status)
}

func strPtr(s string) *string { return &s }
```

### PHP

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
printf("Status: %s\n", $health->status);

// Create customer account
$account = $client->createAccount(
    ownerId: 'customer-uuid',
    accountType: 'personal',
);

// Transfer to merchant
$tx = $client->transfer(
    sourceId: $account->id,
    destId: 'merchant-uuid',
    amount: '99.99',
    currency: 'GBP',
    reference: 'ORDER-12345',
);
printf("Transfer: %s, Status: %s\n", $tx->id, $tx->status);
```

---

## Security

### Best Practices

1. **Never expose secrets**
   - Store `HYDRA_HMAC_SECRET` on backend only
   - Never send secret key to frontend

2. **Use HTTPS in production**
   ```
   https://hydra-api.yourcompany.com
   ```

3. **Verify signatures**
   - Always verify the HMAC signature
   - Check timestamps (within 5 minutes)

4. **Rate limiting**
   - Service enforces rate limits per API key
   - Implement exponential backoff on 429

5. **PCI compliance**
   - Hydra does not store credit card data
   - All payments are account-based transfers
   - Use webhook signatures for settlement

### Example: Signature Verification

```typescript
import crypto from 'crypto';

function verifySignature(
  secret: string,
  method: string,
  path: string,
  timestamp: string,
  body: string,
  signature: string
): boolean {
  const message = `${method}:${path}:${timestamp}:${body}`;
  const expectedSig = crypto
    .createHmac('sha256', secret)
    .update(message)
    .digest('base64');
  
  // Decode both to raw bytes for constant-time comparison
  const sigBuf = Buffer.from(signature, 'base64');
  const expBuf = Buffer.from(expectedSig, 'base64');
  if (sigBuf.length !== expBuf.length) return false;
  return crypto.timingSafeEqual(sigBuf, expBuf);
}
```

---

## Testing

### Manual API Testing

```bash
#!/bin/bash

API_KEY="your-secret-api-key"
HMAC_SECRET="your-hmac-secret-key"
TIMESTAMP=$(date +%s)000
HYDRA_URL="http://localhost:8080"

# Create account
curl -X POST "$HYDRA_URL/v1/api/accounts" \
  -H "Content-Type: application/json" \
  -H "X-API-Key: $API_KEY" \
  -H "X-Timestamp: $TIMESTAMP" \
  -H "X-Signature: $(echo -n "POST:/v1/api/accounts:$TIMESTAMP:{...}" | openssl dgst -sha256 -mac HMAC -macopt key=$HMAC_SECRET -binary | base64)" \
  -d '{
    "owner_id": "550e8400-e29b-41d4-a716-446655440000",
    "account_type": "personal",
    "currency": "GBP"
  }'
```

### Unit Tests

```bash
# Core service
cd core && cargo test
# test result: ok. 72 passed

# Payment gateway
cd gateway && cargo test
# test result: ok. 61 passed
```

---

## Support

- **Documentation**: See `design.md` for architecture details
- **SDKs**: Available for Python, Node.js, TypeScript, Rust, Go, PHP/Laravel, React Native, Terraform
- **Issues**: Report via GitHub issues
- **Contact**: payments@hydrapay.io

---

## Next Steps

1. ✅ Set up Hydra server
2. ✅ Install SDK for your platform
3. ✅ Create test accounts
4. ✅ Implement checkout flow
5. ✅ Test with sample payments
6. ✅ Deploy to production

For questions about integration, see the [SDK documentation](./sdks/README.md).
