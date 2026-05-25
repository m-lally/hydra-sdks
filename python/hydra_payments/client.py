"""
Hydra Payment Service - HTTP Client with HMAC-SHA256 Signing

Security features:
- HMAC-SHA256 request signing
- Automatic timestamp inclusion
- Base64 encoding
- Request/response validation
"""

import hmac
import hashlib
import base64
import json
import time
from typing import Optional, Any, Dict

import httpx

from .types import (
    Account,
    Transaction,
    Wallet,
    SplitRule,
    HealthResponse,
    ApiResponse,
    CreateAccountRequest,
    TransferRequest,
    CreateWalletRequest,
    RelayRequest,
    CreateSplitRequest,
    CreateTokenRequest,
    CreateTokenResponse,
    CreateIntentRequest,
    CreateIntentResponse,
    CreateRefundRequest,
    CreateRefundResponse,
    CommissionResponse,
    CardInput,
    CardDetails,
    HydraError,
    AuthenticationError,
    ValidationError,
    NotFoundError,
    NetworkError,
)


def _create_signature(secret: str, message: str) -> str:
    """Create HMAC-SHA256 signature"""
    h = hmac.new(secret.encode(), message.encode(), hashlib.sha256)
    return base64.b64encode(h.digest()).decode()


def _canonical_json(data: Dict[str, Any]) -> str:
    """Serialize like JSON.stringify: compact, omit None (optional fields)."""
    cleaned = {k: v for k, v in data.items() if v is not None}
    return json.dumps(cleaned, separators=(",", ":"), default=str)


def _verify_signature(secret: str, message: str, signature: str) -> bool:
    """Verify HMAC-SHA256 signature"""
    expected = _create_signature(secret, message)
    try:
        sig_bytes = base64.b64decode(signature)
        exp_bytes = base64.b64decode(expected)
        if len(sig_bytes) != len(exp_bytes):
            return False
        return hmac.compare_digest(sig_bytes, exp_bytes)
    except Exception:
        return False


class HydraClient:
    """
    Main HTTP client for Hydra Payment Service.

    Provides:
    - Automatic HMAC signing of all requests
    - Request/response validation
    - Type-safe API methods
    - Error handling with typed errors
    """

    def __init__(
        self,
        base_url: str = "http://localhost:8080",
        api_key: str = "",
        secret_key: str = "",
        timeout: float = 30.0,
        default_currency: str = "GBP",
        locale: str = "en",
    ):
        self.base_url = base_url.rstrip("/")
        self.api_key = api_key
        self.secret_key = secret_key
        self.default_currency = default_currency
        self.locale = locale
        self._client = httpx.AsyncClient(
            base_url=self.base_url,
            timeout=timeout,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

    async def __aenter__(self):
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self._client.aclose()

    @property
    def is_closed(self) -> bool:
        return self._client.is_closed

    async def close(self):
        """Close the HTTP client"""
        await self._client.aclose()

    def _build_headers(self, method: str, path: str, body: str = "") -> Dict[str, str]:
        """Build headers with HMAC signature (body must match the exact bytes sent)."""
        timestamp = str(int(time.time() * 1000))
        message = f"{method}:{path}:{timestamp}:{body}"
        signature = _create_signature(self.secret_key, message)

        return {
            "X-API-Key": self.api_key,
            "X-Timestamp": timestamp,
            "X-Signature": signature,
            "X-Default-Currency": self.default_currency,
            "Accept-Language": self.locale,
        }

    def _parse_response(self, response: httpx.Response) -> ApiResponse:
        """Parse API response and handle errors"""
        try:
            data = response.json()
        except Exception:
            raise NetworkError(f"Invalid JSON response: {response.text[:200]}")

        # Handle non-standard responses (like health check)
        if "status" in data and "version" in data and "database" in data:
            return ApiResponse(success=True, data=data, error=None)

        if response.status_code == 401:
            raise AuthenticationError(
                data.get("error", "Authentication failed"), data
            )
        if response.status_code == 404:
            raise NotFoundError(data.get("error", "Resource not found"), data)
        if response.status_code == 400:
            raise ValidationError(data.get("error", "Validation failed"), data)
        if response.status_code >= 400:
            raise HydraError(
                data.get("error", "Request failed"),
                "API_ERROR",
                response.status_code,
                data,
            )

        return ApiResponse(
            success=data.get("success", False),
            data=data.get("data"),
            error=data.get("error"),
        )

    # ==================== Health ====================

    async def health_check(self) -> HealthResponse:
        """Health check endpoint"""
        headers = self._build_headers("GET", "/health")
        response = await self._client.get("/health", headers=headers)
        parsed = self._parse_response(response)
        if parsed.data:
            return HealthResponse(**parsed.data)
        raise HydraError("Invalid health response")

    # ==================== Accounts ====================

    async def create_account(
        self,
        owner_id: str,
        account_type: str,
        currency: Optional[str] = None,
    ) -> Account:
        """Create a new account"""
        data = {
            "owner_id": owner_id,
            "account_type": account_type,
            "currency": currency or self.default_currency,
        }
        body = _canonical_json(data)
        headers = self._build_headers("POST", "/v1/api/accounts", body)
        headers["Content-Type"] = "application/json"
        response = await self._client.post("/v1/api/accounts", content=body, headers=headers)
        parsed = self._parse_response(response)
        if parsed.success and parsed.data:
            return Account(**parsed.data)
        raise HydraError(parsed.error or "Failed to create account")

    async def get_account(self, account_id: str) -> Account:
        """Get account by ID"""
        path = f"/v1/api/accounts/{account_id}"
        headers = self._build_headers("GET", path)
        response = await self._client.get(path, headers=headers)
        parsed = self._parse_response(response)
        if parsed.success and parsed.data:
            return Account(**parsed.data)
        raise NotFoundError(parsed.error or "Account not found")

    async def get_accounts_by_owner(self, owner_id: str) -> list[Account]:
        """Get all accounts for an owner"""
        path = f"/v1/api/accounts/owner/{owner_id}"
        headers = self._build_headers("GET", path)
        response = await self._client.get(path, headers=headers)
        parsed = self._parse_response(response)
        if parsed.success and parsed.data:
            return [Account(**a) for a in parsed.data]
        raise HydraError(parsed.error or "Failed to fetch accounts")

    # ==================== Transactions ====================

    async def transfer(
        self,
        source_id: str,
        dest_id: str,
        amount: str,
        currency: Optional[str] = None,
        reference: Optional[str] = None,
    ) -> Transaction:
        """Create a transfer transaction"""
        data = {
            "source_id": source_id,
            "dest_id": dest_id,
            "amount": amount,
            "currency": currency or self.default_currency,
            "reference": reference,
        }
        body = _canonical_json(data)
        headers = self._build_headers("POST", "/v1/api/transactions", body)
        headers["Content-Type"] = "application/json"
        response = await self._client.post(
            "/v1/api/transactions", content=body, headers=headers
        )
        parsed = self._parse_response(response)
        if parsed.success and parsed.data:
            return Transaction(**parsed.data)
        raise HydraError(parsed.error or "Transfer failed")

    async def get_transaction(self, transaction_id: str) -> Transaction:
        """Get transaction by ID"""
        path = f"/v1/api/transactions/{transaction_id}"
        headers = self._build_headers("GET", path)
        response = await self._client.get(path, headers=headers)
        parsed = self._parse_response(response)
        if parsed.success and parsed.data:
            return Transaction(**parsed.data)
        raise NotFoundError(parsed.error or "Transaction not found")

    async def complete_transaction(self, transaction_id: str) -> bool:
        """Complete a pending transaction"""
        path = f"/v1/api/transactions/{transaction_id}/complete"
        headers = self._build_headers("POST", path)
        response = await self._client.post(path, headers=headers)
        parsed = self._parse_response(response)
        return parsed.success

    async def fail_transaction(self, transaction_id: str) -> bool:
        """Fail a pending transaction"""
        path = f"/v1/api/transactions/{transaction_id}/fail"
        headers = self._build_headers("POST", path)
        response = await self._client.post(path, headers=headers)
        parsed = self._parse_response(response)
        return parsed.success

    # ==================== Wallets ====================

    async def create_wallet(
        self,
        owner_id: str,
        wallet_type: str,
        chain: str,
        address: str,
        encrypted_private_key: Optional[str] = None,
    ) -> Wallet:
        """Create a wallet"""
        data = {
            "owner_id": owner_id,
            "wallet_type": wallet_type,
            "chain": chain,
            "address": address,
            "encrypted_private_key": encrypted_private_key,
        }
        body = _canonical_json(data)
        headers = self._build_headers("POST", "/v1/api/wallets", body)
        headers["Content-Type"] = "application/json"
        response = await self._client.post("/v1/api/wallets", content=body, headers=headers)
        parsed = self._parse_response(response)
        if parsed.success and parsed.data:
            return Wallet(**parsed.data)
        raise HydraError(parsed.error or "Failed to create wallet")

    async def get_wallets(self, owner_id: str) -> list[Wallet]:
        """Get wallets for an owner"""
        path = f"/v1/api/wallets/owner/{owner_id}"
        headers = self._build_headers("GET", path)
        response = await self._client.get(path, headers=headers)
        parsed = self._parse_response(response)
        if parsed.success and parsed.data:
            return [Wallet(**w) for w in parsed.data]
        raise HydraError(parsed.error or "Failed to fetch wallets")

    async def relay_transaction(
        self, wallet_id: str, signed_transaction: str
    ) -> str:
        """Relay a signed crypto transaction"""
        data = {"signed_transaction": signed_transaction}
        path = f"/v1/api/wallets/{wallet_id}/relay"
        body = _canonical_json(data)
        headers = self._build_headers("POST", path, body)
        headers["Content-Type"] = "application/json"
        response = await self._client.post(path, content=body, headers=headers)
        parsed = self._parse_response(response)
        if parsed.success and parsed.data:
            return parsed.data.get("transaction_hash", "")
        raise HydraError(parsed.error or "Relay failed")

    # ==================== Splits ====================

    async def create_split(
        self,
        total: str,
        splits: list[dict],
        currency: Optional[str] = None,
        reference: Optional[str] = None,
    ) -> SplitRule:
        """Create a split transaction"""
        data = {
            "total": total,
            "currency": currency or self.default_currency,
            "splits": splits,
            "reference": reference,
        }
        body = _canonical_json(data)
        headers = self._build_headers("POST", "/v1/api/splits", body)
        headers["Content-Type"] = "application/json"
        response = await self._client.post("/v1/api/splits", content=body, headers=headers)
        parsed = self._parse_response(response)
        if parsed.success and parsed.data:
            return SplitRule(**parsed.data)
        raise HydraError(parsed.error or "Failed to create split")

    async def get_split(self, split_id: str) -> SplitRule:
        """Get split by ID"""
        path = f"/v1/api/splits/{split_id}"
        headers = self._build_headers("GET", path)
        response = await self._client.get(path, headers=headers)
        parsed = self._parse_response(response)
        if parsed.success and parsed.data:
            return SplitRule(**parsed.data)
        raise NotFoundError(parsed.error or "Split not found")

    # ==================== Security ====================

    def verify_webhook_signature(self, payload: str, signature: str) -> bool:
        """Verify a webhook or callback signature"""
        return _verify_signature(self.secret_key, payload, signature)

    def sign_message(self, message: str) -> str:
        """Generate a signature for client-side operations"""
        return _create_signature(self.secret_key, message)

    # ==================== Payment Gateway ====================

    async def create_card_token(
        self,
        number: str,
        exp_month: int,
        exp_year: int,
        cvc: str,
        merchant_id: Optional[str] = None,
    ) -> CreateTokenResponse:
        """Create a card token for secure card data storage"""
        data = {
            "card": {
                "number": number,
                "exp_month": exp_month,
                "exp_year": exp_year,
                "cvc": cvc,
            },
            "merchant_id": merchant_id,
        }
        body = _canonical_json(data)
        headers = self._build_headers("POST", "/v1/payments/tokens", body)
        headers["Content-Type"] = "application/json"
        response = await self._client.post("/v1/payments/tokens", content=body, headers=headers)
        if response.status_code >= 400:
            raise HydraError(f"Token creation failed: {response.status_code}")
        data = response.json()
        return CreateTokenResponse(**data)

    async def create_payment_intent(
        self,
        amount: int,
        currency: str,
        token: Optional[str] = None,
        merchant_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> CreateIntentResponse:
        """Create a payment intent to initiate a payment"""
        data = {
            "amount": amount,
            "currency": currency,
            "token": token,
            "merchant_id": merchant_id,
            "idempotency_key": idempotency_key,
        }
        body = _canonical_json(data)
        headers = self._build_headers("POST", "/v1/payments/intents", body)
        headers["Content-Type"] = "application/json"
        response = await self._client.post("/v1/payments/intents", content=body, headers=headers)
        if response.status_code >= 400:
            raise HydraError(f"Payment intent creation failed: {response.status_code}")
        data = response.json()
        return CreateIntentResponse(**data)

    async def create_refund(
        self,
        charge_id: str,
        amount: Optional[int] = None,
    ) -> CreateRefundResponse:
        """Create a refund for a previous charge"""
        data = {
            "charge_id": charge_id,
            "amount": amount,
        }
        body = _canonical_json(data)
        headers = self._build_headers("POST", "/v1/refunds", body)
        headers["Content-Type"] = "application/json"
        response = await self._client.post("/v1/refunds", content=body, headers=headers)
        if response.status_code >= 400:
            raise HydraError(f"Refund creation failed: {response.status_code}")
        data = response.json()
        return CreateRefundResponse(**data)

    async def get_commission(self) -> CommissionResponse:
        """Get total commission collected"""
        headers = self._build_headers("GET", "/v1/commission")
        response = await self._client.get("/v1/commission", headers=headers)
        if response.status_code >= 400:
            raise HydraError(f"Get commission failed: {response.status_code}")
        data = response.json()
        return CommissionResponse(**data)


    async def send_webhook_event(self, payload: dict) -> dict:
        headers = self._build_headers("POST", "/v1/webhooks/stripe", json.dumps(payload))
        headers["Content-Type"] = "application/json"
        response = await self._client.post("/v1/webhooks/stripe", content=json.dumps(payload), headers=headers)
        return response.json()

    async def get_metrics(self) -> str:
        headers = self._build_headers("GET", "/v1/metrics")
        response = await self._client.get("/v1/metrics", headers=headers)
        if response.status_code >= 400:
            raise HydraError(f"Get metrics failed: {response.status_code}")
        return response.text


def create_client(
    base_url: str = "http://localhost:8080",
    api_key: str = "",
    secret_key: str = "",
    timeout: float = 30.0,
    default_currency: str = "GBP",
    locale: str = "en",
) -> HydraClient:
    """Factory function to create a Hydra client"""
    return HydraClient(
        base_url=base_url,
        api_key=api_key,
        secret_key=secret_key,
        timeout=timeout,
        default_currency=default_currency,
        locale=locale,
    )