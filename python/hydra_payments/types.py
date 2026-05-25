"""
Hydra Payment Service - Type Definitions

Type definitions matching the Rust API models exactly.
"""

from dataclasses import dataclass, field
from typing import Optional, List, Any, Dict
from datetime import datetime
from enum import Enum


class AccountType(str, Enum):
    COMPANY = "company"
    PERSONAL = "personal"
    FRACTIONAL = "fractional"


class TransactionStatus(str, Enum):
    PENDING = "pending"
    COMPLETED = "completed"
    FAILED = "failed"


class TransactionType(str, Enum):
    TRANSFER = "transfer"
    CREDIT = "credit"
    DEBIT = "debit"


class WalletType(str, Enum):
    CUSTODIAL = "custodial"
    NON_CUSTODIAL = "non-custodial"


@dataclass
class Account:
    id: str
    owner_id: str
    account_type: str
    currency: str
    balance: str
    metadata: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""

    @property
    def balance_decimal(self) -> float:
        try:
            return float(self.balance)
        except (ValueError, TypeError):
            return 0.0

    @property
    def formatted_balance(self) -> str:
        try:
            return f"{self.currency} {float(self.balance):,.2f}"
        except (ValueError, TypeError):
            return f"{self.currency} 0.00"


@dataclass
class Transaction:
    id: str
    source_account_id: Optional[str] = None
    dest_account_id: Optional[str] = None
    amount: str = ""
    currency: str = "GBP"
    status: str = "pending"
    transaction_type: str = "transfer"
    reference: Optional[str] = None
    description: Optional[str] = None
    metadata: Optional[str] = None
    previous_state_hash: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""

    @property
    def amount_decimal(self) -> float:
        try:
            return float(self.amount)
        except (ValueError, TypeError):
            return 0.0

    @property
    def is_incoming(self) -> bool:
        return not self.source_account_id and bool(self.dest_account_id)

    @property
    def is_outgoing(self) -> bool:
        return bool(self.source_account_id) and not self.dest_account_id

    @property
    def direction(self) -> str:
        if self.is_incoming:
            return "incoming"
        elif self.is_outgoing:
            return "outgoing"
        return "internal"


@dataclass
class Wallet:
    id: str
    owner_id: str
    wallet_type: str
    chain: str
    address: str
    is_custodial: bool
    encrypted_private_key: Optional[str] = None
    created_at: str = ""
    updated_at: str = ""

    @property
    def short_address(self) -> str:
        if len(self.address) > 16:
            return f"{self.address[:8]}...{self.address[-6:]}"
        return self.address


@dataclass
class SplitEntry:
    account_id: str
    percentage: float


@dataclass
class SplitRule:
    id: str
    transaction_id: Optional[str] = None
    total: str = ""
    currency: str = "GBP"
    splits: List[SplitEntry] = field(default_factory=list)
    sink_account_id: Optional[str] = None
    status: str = "pending"
    created_at: str = ""

    @property
    def total_decimal(self) -> float:
        try:
            return float(self.total)
        except (ValueError, TypeError):
            return 0.0

    @property
    def total_percentage(self) -> float:
        return sum(s.percentage for s in self.splits)


@dataclass
class ApiResponse:
    success: bool
    data: Optional[Any] = None
    error: Optional[str] = None


@dataclass
class HealthResponse:
    status: str
    version: str
    database: str

    @property
    def is_healthy(self) -> bool:
        return self.status == "healthy" and self.database == "connected"


# Payment Gateway Types


@dataclass
class CardInput:
    number: str
    exp_month: int
    exp_year: int
    cvc: str


@dataclass
class CardDetails:
    brand: str
    last4: str
    exp_month: int
    exp_year: int


@dataclass
class CreateTokenRequest:
    card: CardInput
    merchant_id: Optional[str] = None


@dataclass
class CreateTokenResponse:
    id: str
    card: CardDetails
    created_at: str


@dataclass
class CreateIntentRequest:
    amount: int
    currency: str
    token: Optional[str] = None
    merchant_id: Optional[str] = None
    idempotency_key: Optional[str] = None


@dataclass
class CreateIntentResponse:
    id: str
    status: str
    amount: int
    currency: str
    client_secret: str


@dataclass
class CreateRefundRequest:
    charge_id: str
    amount: Optional[int] = None


@dataclass
class CreateRefundResponse:
    id: str
    status: str
    amount: int
    charge: str


@dataclass
class CommissionResponse:
    total_commission: int


class PaymentStatus(str, Enum):
    PENDING = "pending"
    REQUIRES_ACTION = "requires_action"
    SUCCEEDED = "succeeded"
    FAILED = "failed"


# Request models


@dataclass
class CreateAccountRequest:
    owner_id: str
    account_type: str
    currency: Optional[str] = "GBP"


@dataclass
class TransferRequest:
    source_id: str
    dest_id: str
    amount: str
    currency: Optional[str] = "GBP"
    reference: Optional[str] = None


@dataclass
class CreditRequest:
    dest_id: str
    amount: str
    currency: Optional[str] = "GBP"
    reference: Optional[str] = None


@dataclass
class DebitRequest:
    source_id: str
    amount: str
    currency: Optional[str] = "GBP"
    reference: Optional[str] = None


@dataclass
class CreateWalletRequest:
    owner_id: str
    wallet_type: str
    chain: str
    address: str
    encrypted_private_key: Optional[str] = None


@dataclass
class RelayRequest:
    signed_transaction: str


@dataclass
class CreateSplitRequest:
    total: str
    splits: List[SplitEntry]
    currency: Optional[str] = "GBP"
    reference: Optional[str] = None


# Exception classes


class HydraError(Exception):
    """Base exception for Hydra SDK"""

    def __init__(
        self,
        message: str,
        code: Optional[str] = None,
        status_code: Optional[int] = None,
        details: Optional[Any] = None,
    ):
        super().__init__(message)
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details


class AuthenticationError(HydraError):
    """Authentication failed"""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message, "AUTHENTICATION_ERROR", 401, details)


class ValidationError(HydraError):
    """Request validation failed"""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message, "VALIDATION_ERROR", 400, details)


class NotFoundError(HydraError):
    """Resource not found"""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message, "NOT_FOUND", 404, details)


class NetworkError(HydraError):
    """Network connectivity issue"""

    def __init__(self, message: str, details: Optional[Any] = None):
        super().__init__(message, "NETWORK_ERROR", None, details)