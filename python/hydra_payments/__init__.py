"""
Hydra Payment Service - Python SDK

A production-grade async SDK for the Hydra Payment Service with:
- HMAC-SHA256 request signing
- Type-safe API methods
- i18n support (EN, ES, DE, FR)
- Full async/await support

Installation:
    pip install hydra-payments

Quick Start:
    import asyncio
    from hydra_payments import create_client

    async def main():
        client = create_client(
            base_url="http://localhost:8080",
            api_key="pk_xxx",
            secret_key="sk_xxx",
        )
        
        # Create account
        account = await client.create_account(
            owner_id="uuid-here",
            account_type="personal"
        )
        
        # Transfer
        await client.transfer(
            source_id="source-uuid",
            dest_id="dest-uuid",
            amount="100.00"
        )
        
        await client.close()

    asyncio.run(main())
"""

from .client import HydraClient, create_client
from .sync import HydraSyncClient, create_sync_client
from .types import (
    Account,
    AccountType,
    Transaction,
    TransactionStatus,
    TransactionType,
    Wallet,
    WalletType,
    SplitRule,
    SplitEntry,
    HealthResponse,
    ApiResponse,
    CreateAccountRequest,
    TransferRequest,
    CreateWalletRequest,
    RelayRequest,
    CreateSplitRequest,
    CardInput,
    CardDetails,
    CreateTokenRequest,
    CreateTokenResponse,
    CreateIntentRequest,
    CreateIntentResponse,
    CreateRefundRequest,
    CreateRefundResponse,
    CommissionResponse,
    PaymentStatus,
    HydraError,
    AuthenticationError,
    ValidationError,
    NotFoundError,
    NetworkError,
)

__version__ = "1.0.0"
__author__ = "Hydra Payments Team"

__all__ = [
    # Async client
    "HydraClient",
    "create_client",
    # Sync client
    "HydraSyncClient",
    "create_sync_client",
    # Types
    "Account",
    "AccountType",
    "Transaction",
    "TransactionStatus",
    "TransactionType",
    "Wallet",
    "WalletType",
    "SplitRule",
    "SplitEntry",
    "HealthResponse",
    "ApiResponse",
    "CardInput",
    "CardDetails",
    "CreateTokenRequest",
    "CreateTokenResponse",
    "CreateIntentRequest",
    "CreateIntentResponse",
    "CreateRefundRequest",
    "CreateRefundResponse",
    "CommissionResponse",
    "PaymentStatus",
    # Errors
    "HydraError",
    "AuthenticationError",
    "ValidationError",
    "NotFoundError",
    "NetworkError",
]