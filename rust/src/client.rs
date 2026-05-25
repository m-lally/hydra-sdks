//! Hydra Payment Service - HTTP Client with HMAC-SHA256 Signing
//! 
//! Provides an async client for interacting with the Hydra Payment Service.

use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use hmac::{Hmac, Mac};
use reqwest::Client;
use sha2::Sha256;
use std::time::{SystemTime, UNIX_EPOCH};

pub use crate::types::*;

/// HMAC-SHA256 type alias
pub type HmacSha256 = Hmac<Sha256>;

/// SDK Error type
#[derive(Debug, thiserror::Error)]
pub enum Error {
    #[error("Request failed: {0}")]
    Request(#[from] reqwest::Error),
    
    #[error("Authentication failed: {0}")]
    Authentication(String),
    
    #[error("Resource not found: {0}")]
    NotFound(String),
    
    #[error("Validation failed: {0}")]
    Validation(String),
    
    #[error("API error: {0}")]
    Api(String),
    
    #[error("Invalid response: {0}")]
    InvalidResponse(String),
}

impl serde::Serialize for Error {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}

/// Hydra Payment Service Client
pub struct HydraClient {
    client: Client,
    base_url: String,
    api_key: String,
    secret_key: String,
    default_currency: String,
    locale: String,
}

impl HydraClient {
    /// Create a new Hydra client
    pub fn new(base_url: impl Into<String>, api_key: impl Into<String>, secret_key: impl Into<String>) -> Self {
        Self {
            client: Client::new(),
            base_url: base_url.into().trim_end_matches('/').to_string(),
            api_key: api_key.into(),
            secret_key: secret_key.into(),
            default_currency: "GBP".to_string(),
            locale: "en".to_string(),
        }
    }

    /// Set default currency
    pub fn with_currency(mut self, currency: impl Into<String>) -> Self {
        self.default_currency = currency.into();
        self
    }

    /// Set locale
    pub fn with_locale(mut self, locale: impl Into<String>) -> Self {
        self.locale = locale.into();
        self
    }

    /// Build URL - adds /v1 prefix for core API paths only
    fn build_url(&self, path: &str) -> String {
        if path.starts_with("/v1/") || path == "/health" {
            format!("{}{}", self.base_url, path)
        } else {
            format!("{}/v1{}", self.base_url, path)
        }
    }

    /// Returns `(signature_b64, timestamp_ms)` using one timestamp for header and message.
    fn sign_request(&self, method: &str, path: &str, body: &str) -> (String, String) {
        let timestamp = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap()
            .as_millis()
            .to_string();
        let message = format!("{}:{}:{}:{}", method, path, timestamp, body);
        let mut mac = HmacSha256::new_from_slice(self.secret_key.as_bytes())
            .expect("HMAC can take key of any size");
        mac.update(message.as_bytes());
        let signature = BASE64.encode(mac.finalize().into_bytes());
        (signature, timestamp)
    }

    /// Health check
    pub async fn health_check(&self) -> Result<HealthResponse, Error> {
        let path = "/health";
        let url = self.build_url(path);
        let (signature, timestamp) = self.sign_request("GET", path, "");

        let response = self.client
            .get(&url)
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .send()
            .await?;
        
        // Health endpoint returns directly without ApiResponse wrapper
        let parsed: HealthResponse = response.json().await?;
        
        Ok(parsed)
    }

    /// Create account
    pub async fn create_account(&self, owner_id: uuid::Uuid, account_type: &str, currency: Option<&str>) -> Result<Account, Error> {
        let path = "/api/accounts";
        let url = self.build_url(path);
        
        let request = CreateAccountRequest {
            owner_id,
            account_type: account_type.to_string(),
            currency: currency.or(Some(&self.default_currency)).map(String::from),
        };
        
        let body = serde_json::to_string(&request).map_err(|e| Error::InvalidResponse(e.to_string()))?;
        let (signature, timestamp) = self.sign_request("POST", path, &body);

        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .body(body)
            .send()
            .await?;
        
        let parsed: ApiResponse<Account> = response.json().await?;
        
        if !parsed.success {
            return Err(Error::Api(parsed.error.unwrap_or_else(|| "Unknown error".to_string())));
        }
        
        parsed.data.ok_or_else(|| Error::InvalidResponse("Missing account data".to_string()))
    }

    /// Get account by ID
    pub async fn get_account(&self, id: uuid::Uuid) -> Result<Account, Error> {
        let path = format!("/api/accounts/{}", id);
        let url = self.build_url(&path);
        let (signature, timestamp) = self.sign_request("GET", &path, "");

        let response = self.client
            .get(&url)
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .send()
            .await?;
        
        let parsed: ApiResponse<Account> = response.json().await?;
        
        if !parsed.success {
            return Err(Error::Api(parsed.error.unwrap_or_else(|| "Unknown error".to_string())));
        }
        
        parsed.data.ok_or_else(|| Error::InvalidResponse("Missing account data".to_string()))
    }

    /// Get accounts by owner
    pub async fn get_accounts_by_owner(&self, owner_id: uuid::Uuid) -> Result<Vec<Account>, Error> {
        let path = format!("/api/accounts/owner/{}", owner_id);
        let url = self.build_url(&path);
        let (signature, timestamp) = self.sign_request("GET", &path, "");

        let response = self.client
            .get(&url)
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .send()
            .await?;
        
        let parsed: ApiResponse<Vec<Account>> = response.json().await?;
        
        if !parsed.success {
            return Err(Error::Api(parsed.error.unwrap_or_else(|| "Unknown error".to_string())));
        }
        
        Ok(parsed.data.unwrap_or_default())
    }

    /// Create transfer
    pub async fn transfer(&self, source_id: uuid::Uuid, dest_id: uuid::Uuid, amount: &str, currency: Option<&str>, reference: Option<&str>) -> Result<Transaction, Error> {
        let path = "/api/transactions";
        let url = self.build_url(path);
        
        let request = TransferRequest {
            source_id,
            dest_id,
            amount: amount.to_string(),
            currency: currency.or(Some(&self.default_currency)).map(String::from),
            reference: reference.map(String::from),
        };
        
        let body = serde_json::to_string(&request).map_err(|e| Error::InvalidResponse(e.to_string()))?;
        let (signature, timestamp) = self.sign_request("POST", path, &body);

        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .body(body)
            .send()
            .await?;
        
        let parsed: ApiResponse<Transaction> = response.json().await?;
        
        if !parsed.success {
            return Err(Error::Api(parsed.error.unwrap_or_else(|| "Unknown error".to_string())));
        }
        
        parsed.data.ok_or_else(|| Error::InvalidResponse("Missing transaction data".to_string()))
    }

    /// Get transaction by ID
    pub async fn get_transaction(&self, id: uuid::Uuid) -> Result<Transaction, Error> {
        let path = format!("/api/transactions/{}", id);
        let url = self.build_url(&path);
        let (signature, timestamp) = self.sign_request("GET", &path, "");

        let response = self.client
            .get(&url)
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .send()
            .await?;
        
        let parsed: ApiResponse<Transaction> = response.json().await?;
        
        if !parsed.success {
            return Err(Error::Api(parsed.error.unwrap_or_else(|| "Unknown error".to_string())));
        }
        
        parsed.data.ok_or_else(|| Error::InvalidResponse("Missing transaction data".to_string()))
    }

    /// Complete pending transaction
    pub async fn complete_transaction(&self, id: uuid::Uuid) -> Result<bool, Error> {
        let path = format!("/api/transactions/{}/complete", id);
        let url = self.build_url(&path);
        let (signature, timestamp) = self.sign_request("POST", &path, "");

        let response = self.client
            .post(&url)
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .send()
            .await?;
        
        let parsed: ApiResponse<()> = response.json().await?;
        Ok(parsed.success)
    }

    /// Fail pending transaction
    pub async fn fail_transaction(&self, id: uuid::Uuid) -> Result<bool, Error> {
        let path = format!("/api/transactions/{}/fail", id);
        let url = self.build_url(&path);
        let (signature, timestamp) = self.sign_request("POST", &path, "");
        
        let response = self.client
            .post(&url)
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .send()
            .await?;
        
        let parsed: ApiResponse<()> = response.json().await?;
        Ok(parsed.success)
    }

    /// Create wallet
    pub async fn create_wallet(&self, owner_id: uuid::Uuid, wallet_type: &str, chain: &str, address: &str, encrypted_private_key: Option<&str>) -> Result<Wallet, Error> {
        let path = "/api/wallets";
        let url = self.build_url(path);
        
        let request = CreateWalletRequest {
            owner_id,
            wallet_type: wallet_type.to_string(),
            chain: chain.to_string(),
            address: address.to_string(),
            encrypted_private_key: encrypted_private_key.map(String::from),
        };
        
        let body = serde_json::to_string(&request).map_err(|e| Error::InvalidResponse(e.to_string()))?;
        let (signature, timestamp) = self.sign_request("POST", path, &body);

        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .body(body)
            .send()
            .await?;
        
        let parsed: ApiResponse<Wallet> = response.json().await?;
        
        if !parsed.success {
            return Err(Error::Api(parsed.error.unwrap_or_else(|| "Unknown error".to_string())));
        }
        
        parsed.data.ok_or_else(|| Error::InvalidResponse("Missing wallet data".to_string()))
    }

    /// Get wallets by owner
    pub async fn get_wallets(&self, owner_id: uuid::Uuid) -> Result<Vec<Wallet>, Error> {
        let path = format!("/api/wallets/owner/{}", owner_id);
        let url = self.build_url(&path);
        let (signature, timestamp) = self.sign_request("GET", &path, "");

        let response = self.client
            .get(&url)
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .send()
            .await?;
        
        let parsed: ApiResponse<Vec<Wallet>> = response.json().await?;
        
        if !parsed.success {
            return Err(Error::Api(parsed.error.unwrap_or_else(|| "Unknown error".to_string())));
        }
        
        Ok(parsed.data.unwrap_or_default())
    }

    /// Relay signed transaction
    pub async fn relay_transaction(&self, wallet_id: uuid::Uuid, signed_transaction: &str) -> Result<String, Error> {
        let path = format!("/api/wallets/{}/relay", wallet_id);
        let url = self.build_url(&path);
        
        let request = RelayRequest {
            signed_transaction: signed_transaction.to_string(),
        };
        
        let body = serde_json::to_string(&request).map_err(|e| Error::InvalidResponse(e.to_string()))?;
        let (signature, timestamp) = self.sign_request("POST", &path, &body);

        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .body(body)
            .send()
            .await?;
        
        let parsed: ApiResponse<RelayResponse> = response.json().await?;
        
        if !parsed.success {
            return Err(Error::Api(parsed.error.unwrap_or_else(|| "Unknown error".to_string())));
        }
        
        parsed.data.map(|r| r.transaction_hash).ok_or_else(|| Error::InvalidResponse("Missing transaction hash".to_string()))
    }

    /// Create split
    pub async fn create_split(&self, total: &str, splits: Vec<SplitEntry>, currency: Option<&str>, reference: Option<&str>) -> Result<SplitRule, Error> {
        let path = "/api/splits";
        let url = self.build_url(path);
        
        let request = CreateSplitRequest {
            total: total.to_string(),
            splits,
            currency: currency.or(Some(&self.default_currency)).map(String::from),
            reference: reference.map(String::from),
        };
        
        let body = serde_json::to_string(&request).map_err(|e| Error::InvalidResponse(e.to_string()))?;
        let (signature, timestamp) = self.sign_request("POST", path, &body);

        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .body(body)
            .send()
            .await?;
        
        let parsed: ApiResponse<SplitRule> = response.json().await?;
        
        if !parsed.success {
            return Err(Error::Api(parsed.error.unwrap_or_else(|| "Unknown error".to_string())));
        }
        
        parsed.data.ok_or_else(|| Error::InvalidResponse("Missing split data".to_string()))
    }

    /// Get split by ID
    pub async fn get_split(&self, id: uuid::Uuid) -> Result<SplitRule, Error> {
        let path = format!("/api/splits/{}", id);
        let url = self.build_url(&path);
        let (signature, timestamp) = self.sign_request("GET", &path, "");

        let response = self.client
            .get(&url)
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .send()
            .await?;
        
        let parsed: ApiResponse<SplitRule> = response.json().await?;
        
        if !parsed.success {
            return Err(Error::Api(parsed.error.unwrap_or_else(|| "Unknown error".to_string())));
        }
        
        parsed.data.ok_or_else(|| Error::InvalidResponse("Missing split data".to_string()))
    }

    /// Verify webhook signature (uses HMAC constant-time verification)
    pub fn verify_signature(&self, payload: &str, signature: &str) -> bool {
        let mut mac = HmacSha256::new_from_slice(self.secret_key.as_bytes()).expect("HMAC can take key of any size");
        mac.update(payload.as_bytes());
        let sig_bytes = match BASE64.decode(signature) {
            Ok(b) => b,
            Err(_) => return false,
        };
        mac.verify_slice(&sig_bytes).is_ok()
    }

    /// Sign a message
    pub fn sign_message(&self, message: &str) -> String {
        let mut mac = HmacSha256::new_from_slice(self.secret_key.as_bytes()).expect("HMAC can take key of any size");
        mac.update(message.as_bytes());
        BASE64.encode(mac.finalize().into_bytes())
    }

    // ============== Payment Gateway Methods ==============

    /// Create card token for secure card data storage
    pub async fn create_card_token(&self, card: CardInput, merchant_id: Option<&str>) -> Result<CreateTokenResponse, Error> {
        let path = "/v1/payments/tokens";
        let url = self.build_url(path);
        
        let request = CreateTokenRequest {
            card,
            merchant_id: merchant_id.map(String::from),
        };
        
        let body = serde_json::to_string(&request).map_err(|e| Error::InvalidResponse(e.to_string()))?;
        let (signature, timestamp) = self.sign_request("POST", path, &body);

        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .body(body)
            .send()
            .await?;
        
        if !response.status().is_success() {
            return Err(Error::Api(format!("Token creation failed: {}", response.status())));
        }
        
        let parsed: CreateTokenResponse = response.json().await?;
        Ok(parsed)
    }

    /// Create payment intent to initiate a payment
    pub async fn create_payment_intent(&self, amount: i64, currency: Option<&str>, token: Option<&str>, merchant_id: Option<&str>, idempotency_key: Option<&str>) -> Result<CreateIntentResponse, Error> {
        let path = "/v1/payments/intents";
        let url = self.build_url(path);
        
        let request = CreateIntentRequest {
            amount,
            currency: currency.or(Some(&self.default_currency)).unwrap().to_string(),
            token: token.map(String::from),
            merchant_id: merchant_id.map(String::from),
            idempotency_key: idempotency_key.map(String::from),
        };
        
        let body = serde_json::to_string(&request).map_err(|e| Error::InvalidResponse(e.to_string()))?;
        let (signature, timestamp) = self.sign_request("POST", path, &body);

        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .body(body)
            .send()
            .await?;
        
        if !response.status().is_success() {
            return Err(Error::Api(format!("Payment intent creation failed: {}", response.status())));
        }
        
        let parsed: CreateIntentResponse = response.json().await?;
        Ok(parsed)
    }

    /// Create refund for a previous charge
    pub async fn create_refund(&self, charge_id: &str, amount: Option<i64>) -> Result<CreateRefundResponse, Error> {
        let path = "/v1/refunds";
        let url = self.build_url(path);
        
        let request = CreateRefundRequest {
            charge_id: charge_id.to_string(),
            amount,
        };
        
        let body = serde_json::to_string(&request).map_err(|e| Error::InvalidResponse(e.to_string()))?;
        let (signature, timestamp) = self.sign_request("POST", path, &body);

        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .body(body)
            .send()
            .await?;
        
        if !response.status().is_success() {
            return Err(Error::Api(format!("Refund creation failed: {}", response.status())));
        }
        
        let parsed: CreateRefundResponse = response.json().await?;
        Ok(parsed)
    }

    /// Get total commission collected
    pub async fn get_commission(&self) -> Result<CommissionResponse, Error> {
        let path = "/v1/commission";
        let url = self.build_url(path);
        let (signature, timestamp) = self.sign_request("GET", path, "");

        let response = self.client
            .get(&url)
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .header("X-Default-Currency", &self.default_currency)
            .header("Accept-Language", &self.locale)
            .send()
            .await?;
        
        if !response.status().is_success() {
            return Err(Error::Api(format!("Get commission failed: {}", response.status())));
        }
        
        let parsed: CommissionResponse = response.json().await?;
        Ok(parsed)
    }

    /// Send a Stripe webhook event (for testing)
    pub async fn send_webhook_event(&self, payload: serde_json::Value) -> Result<WebhookResponse, Error> {
        let path = "/v1/webhooks/stripe";
        let url = self.build_url(path);
        
        let body = serde_json::to_string(&payload).map_err(|e| Error::InvalidResponse(e.to_string()))?;
        let (signature, timestamp) = self.sign_request("POST", path, &body);

        let response = self.client
            .post(&url)
            .header("Content-Type", "application/json")
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .body(body)
            .send()
            .await?;
        
        let parsed: WebhookResponse = response.json().await?;
        Ok(parsed)
    }

    /// Get Prometheus metrics
    pub async fn get_metrics(&self) -> Result<String, Error> {
        let path = "/v1/metrics";
        let url = self.build_url(path);
        let (signature, timestamp) = self.sign_request("GET", path, "");

        let response = self.client
            .get(&url)
            .header("X-API-Key", &self.api_key)
            .header("X-Timestamp", &timestamp)
            .header("X-Signature", &signature)
            .send()
            .await?;
        
        if !response.status().is_success() {
            return Err(Error::Api(format!("Get metrics failed: {}", response.status())));
        }
        
        let parsed = response.text().await?;
        Ok(parsed)
    }
}

/// Builder for HydraClient
pub struct HydraClientBuilder {
    base_url: String,
    api_key: String,
    secret_key: String,
    default_currency: String,
    locale: String,
}

impl HydraClientBuilder {
    pub fn new() -> Self {
        Self {
            base_url: "http://localhost:8080".to_string(),
            api_key: String::new(),
            secret_key: String::new(),
            default_currency: "GBP".to_string(),
            locale: "en".to_string(),
        }
    }

    pub fn base_url(mut self, url: impl Into<String>) -> Self {
        self.base_url = url.into();
        self
    }

    pub fn api_key(mut self, key: impl Into<String>) -> Self {
        self.api_key = key.into();
        self
    }

    pub fn secret_key(mut self, key: impl Into<String>) -> Self {
        self.secret_key = key.into();
        self
    }

    pub fn currency(mut self, currency: impl Into<String>) -> Self {
        self.default_currency = currency.into();
        self
    }

    pub fn locale(mut self, locale: impl Into<String>) -> Self {
        self.locale = locale.into();
        self
    }

    pub fn build(self) -> HydraClient {
        HydraClient {
            client: Client::new(),
            base_url: self.base_url,
            api_key: self.api_key,
            secret_key: self.secret_key,
            default_currency: self.default_currency,
            locale: self.locale,
        }
    }
}

impl Default for HydraClientBuilder {
    fn default() -> Self {
        Self::new()
    }
}