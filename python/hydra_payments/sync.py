import hmac
import hashlib
import base64
import time
import json
from typing import Optional, Any, Dict

import httpx

from .types import (
    Account,
    Transaction,
    Wallet,
    SplitRule,
    HealthResponse,
    ApiResponse,
    CreateTokenResponse,
    CreateIntentResponse,
    CreateRefundResponse,
    CommissionResponse,
    HydraError,
    AuthenticationError,
    ValidationError,
    NotFoundError,
    NetworkError,
)


def _create_signature(secret: str, message: str) -> str:
    h = hmac.new(secret.encode(), message.encode(), hashlib.sha256)
    return base64.b64encode(h.digest()).decode()


def _canonical_json(data: Dict[str, Any]) -> str:
    cleaned = {k: v for k, v in data.items() if v is not None}
    return json.dumps(cleaned, separators=(",", ":"), default=str)


class HydraSyncClient:
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
        self._client = httpx.Client(
            base_url=self.base_url,
            timeout=timeout,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
        )

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self._client.close()

    @property
    def is_closed(self) -> bool:
        return self._client.is_closed

    def close(self):
        self._client.close()

    def _build_headers(self, method: str, path: str, body: str = "") -> Dict[str, str]:
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
        try:
            data = response.json()
        except Exception:
            raise NetworkError(f"Invalid JSON response: {response.text[:200]}")

        if "status" in data and "version" in data and "database" in data:
            return ApiResponse(success=True, data=data, error=None)

        if response.status_code == 401:
            raise AuthenticationError(data.get("error", "Authentication failed"))
        if response.status_code == 404:
            raise NotFoundError(data.get("error", "Resource not found"))
        if response.status_code == 400:
            raise ValidationError(data.get("error", "Validation failed"))
        if response.status_code >= 400:
            raise HydraError(data.get("error", "Request failed"))

        return ApiResponse(
            success=data.get("success", False),
            data=data.get("data"),
            error=data.get("error"),
        )

    def _request(
        self, method: str, path: str, data: Optional[Dict] = None
    ) -> httpx.Response:
        body = _canonical_json(data) if data else ""
        headers = self._build_headers(method, path, body)
        if data:
            headers["Content-Type"] = "application/json"
        return self._client.request(method, path, content=body or None, headers=headers)

    # Health
    def health_check(self) -> HealthResponse:
        response = self._request("GET", "/health")
        parsed = self._parse_response(response)
        return HealthResponse(**parsed.data)

    # Accounts
    def create_account(
        self, owner_id: str, account_type: str, currency: Optional[str] = None
    ) -> Account:
        data = {"owner_id": owner_id, "account_type": account_type, "currency": currency or self.default_currency}
        response = self._request("POST", "/v1/api/accounts", data)
        parsed = self._parse_response(response)
        return Account(**parsed.data)

    def get_account(self, account_id: str) -> Account:
        response = self._request("GET", f"/v1/api/accounts/{account_id}")
        parsed = self._parse_response(response)
        return Account(**parsed.data)

    def get_accounts_by_owner(self, owner_id: str) -> list[Account]:
        response = self._request("GET", f"/v1/api/accounts/owner/{owner_id}")
        parsed = self._parse_response(response)
        return [Account(**a) for a in parsed.data]

    # Transactions
    def transfer(
        self,
        source_id: str,
        dest_id: str,
        amount: str,
        currency: Optional[str] = None,
        reference: Optional[str] = None,
    ) -> Transaction:
        data = {
            "source_id": source_id,
            "dest_id": dest_id,
            "amount": amount,
            "currency": currency or self.default_currency,
            "reference": reference,
        }
        response = self._request("POST", "/v1/api/transactions", data)
        parsed = self._parse_response(response)
        return Transaction(**parsed.data)

    def get_transaction(self, transaction_id: str) -> Transaction:
        response = self._request("GET", f"/v1/api/transactions/{transaction_id}")
        parsed = self._parse_response(response)
        return Transaction(**parsed.data)

    def complete_transaction(self, transaction_id: str) -> bool:
        response = self._request("POST", f"/v1/api/transactions/{transaction_id}/complete")
        return self._parse_response(response).success

    def fail_transaction(self, transaction_id: str) -> bool:
        response = self._request("POST", f"/v1/api/transactions/{transaction_id}/fail")
        return self._parse_response(response).success

    # Wallets
    def create_wallet(
        self,
        owner_id: str,
        wallet_type: str,
        chain: str,
        address: str,
        encrypted_private_key: Optional[str] = None,
    ) -> Wallet:
        data = {
            "owner_id": owner_id,
            "wallet_type": wallet_type,
            "chain": chain,
            "address": address,
            "encrypted_private_key": encrypted_private_key,
        }
        response = self._request("POST", "/v1/api/wallets", data)
        parsed = self._parse_response(response)
        return Wallet(**parsed.data)

    def get_wallets(self, owner_id: str) -> list[Wallet]:
        response = self._request("GET", f"/v1/api/wallets/owner/{owner_id}")
        parsed = self._parse_response(response)
        return [Wallet(**w) for w in parsed.data]

    def relay_transaction(self, wallet_id: str, signed_transaction: str) -> str:
        data = {"signed_transaction": signed_transaction}
        response = self._request("POST", f"/v1/api/wallets/{wallet_id}/relay", data)
        parsed = self._parse_response(response)
        return parsed.data.get("transaction_hash", "")

    # Splits
    def create_split(
        self,
        total: str,
        splits: list[dict],
        currency: Optional[str] = None,
        reference: Optional[str] = None,
    ) -> SplitRule:
        data = {
            "total": total,
            "currency": currency or self.default_currency,
            "splits": splits,
            "reference": reference,
        }
        response = self._request("POST", "/v1/api/splits", data)
        parsed = self._parse_response(response)
        return SplitRule(**parsed.data)

    # Payment Gateway
    def create_card_token(
        self,
        number: str,
        exp_month: int,
        exp_year: int,
        cvc: str,
        merchant_id: Optional[str] = None,
    ) -> CreateTokenResponse:
        data = {
            "card": {
                "number": number,
                "exp_month": exp_month,
                "exp_year": exp_year,
                "cvc": cvc,
            },
            "merchant_id": merchant_id,
        }
        response = self._request("POST", "/v1/payments/tokens", data)
        if response.status_code >= 400:
            raise HydraError(f"Token creation failed: {response.status_code}")
        return CreateTokenResponse(**response.json())

    def create_payment_intent(
        self,
        amount: int,
        currency: str,
        token: Optional[str] = None,
        merchant_id: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> CreateIntentResponse:
        data = {
            "amount": amount,
            "currency": currency,
            "token": token,
            "merchant_id": merchant_id,
            "idempotency_key": idempotency_key,
        }
        response = self._request("POST", "/v1/payments/intents", data)
        if response.status_code >= 400:
            raise HydraError(f"Payment intent creation failed: {response.status_code}")
        return CreateIntentResponse(**response.json())

    def create_refund(
        self,
        charge_id: str,
        amount: Optional[int] = None,
    ) -> CreateRefundResponse:
        data = {
            "charge_id": charge_id,
            "amount": amount,
        }
        response = self._request("POST", "/v1/refunds", data)
        if response.status_code >= 400:
            raise HydraError(f"Refund creation failed: {response.status_code}")
        return CreateRefundResponse(**response.json())

    def get_commission(self) -> CommissionResponse:
        response = self._request("GET", "/v1/commission")
        if response.status_code >= 400:
            raise HydraError(f"Get commission failed: {response.status_code}")
        return CommissionResponse(**response.json())

    def send_webhook_event(self, payload: dict) -> dict:
        response = self._request("POST", "/v1/webhooks/stripe", payload)
        return response.json()

    def get_metrics(self) -> str:
        response = self._request("GET", "/v1/metrics")
        if response.status_code >= 400:
            raise HydraError(f"Get metrics failed: {response.status_code}")
        return response.text


def create_sync_client(
    base_url: str = "http://localhost:8080",
    api_key: str = "",
    secret_key: str = "",
    timeout: float = 30.0,
    default_currency: str = "GBP",
    locale: str = "en",
) -> HydraSyncClient:
    return HydraSyncClient(
        base_url=base_url,
        api_key=api_key,
        secret_key=secret_key,
        timeout=timeout,
        default_currency=default_currency,
        locale=locale,
    )
