//! Hydra Payment Service - Type Definitions
//! 
//! Types matching the Rust API models exactly.

use serde::{Deserialize, Serialize};
use std::fmt;

/// Account type enumeration
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum AccountType {
    Company,
    Personal,
    Fractional,
}

impl fmt::Display for AccountType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            AccountType::Company => write!(f, "company"),
            AccountType::Personal => write!(f, "personal"),
            AccountType::Fractional => write!(f, "fractional"),
        }
    }
}

impl Default for AccountType {
    fn default() -> Self {
        AccountType::Personal
    }
}

/// Transaction status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransactionStatus {
    Pending,
    Completed,
    Failed,
}

impl Default for TransactionStatus {
    fn default() -> Self {
        TransactionStatus::Pending
    }
}

/// Transaction type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum TransactionType {
    Transfer,
    Credit,
    Debit,
}

impl Default for TransactionType {
    fn default() -> Self {
        TransactionType::Transfer
    }
}

/// Wallet type
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "kebab-case")]
pub enum WalletType {
    Custodial,
    NonCustodial,
}

impl fmt::Display for WalletType {
    fn fmt(&self, f: &mut fmt::Formatter<'_>) -> fmt::Result {
        match self {
            WalletType::Custodial => write!(f, "custodial"),
            WalletType::NonCustodial => write!(f, "non-custodial"),
        }
    }
}

impl Default for WalletType {
    fn default() -> Self {
        WalletType::NonCustodial
    }
}

/// Account model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Account {
    pub id: uuid::Uuid,
    pub owner_id: uuid::Uuid,
    pub account_type: String,
    pub currency: String,
    pub balance: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<String>,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

impl Account {
    pub fn balance_decimal(&self) -> f64 {
        self.balance.parse().unwrap_or(0.0)
    }
}

/// Transaction model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Transaction {
    pub id: uuid::Uuid,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source_account_id: Option<uuid::Uuid>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub dest_account_id: Option<uuid::Uuid>,
    pub amount: String,
    pub currency: String,
    pub status: String,
    pub transaction_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub description: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub previous_state_hash: Option<String>,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

impl Transaction {
    pub fn amount_decimal(&self) -> f64 {
        self.amount.parse().unwrap_or(0.0)
    }
}

/// Wallet model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Wallet {
    pub id: uuid::Uuid,
    pub owner_id: uuid::Uuid,
    pub wallet_type: String,
    pub chain: String,
    pub address: String,
    pub is_custodial: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encrypted_private_key: Option<String>,
    pub created_at: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub updated_at: Option<String>,
}

impl Wallet {
    pub fn short_address(&self) -> String {
        if self.address.len() > 16 {
            format!("{}...{}", &self.address[..8], &self.address[self.address.len()-6..])
        } else {
            self.address.clone()
        }
    }
}

/// Split entry
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplitEntry {
    pub account_id: uuid::Uuid,
    pub percentage: f64,
}

/// Split rule model
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SplitRule {
    pub id: uuid::Uuid,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub transaction_id: Option<uuid::Uuid>,
    pub total: String,
    pub currency: String,
    pub splits: Vec<SplitEntry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub sink_account_id: Option<uuid::Uuid>,
    pub status: String,
    pub created_at: String,
}

impl SplitRule {
    pub fn total_decimal(&self) -> f64 {
        self.total.parse().unwrap_or(0.0)
    }

    pub fn total_percentage(&self) -> f64 {
        self.splits.iter().map(|s| s.percentage).sum()
    }
}

/// Generic API response wrapper
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ApiResponse<T> {
    pub success: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub data: Option<T>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub error: Option<String>,
}

/// Health check response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HealthResponse {
    pub status: String,
    pub version: String,
    pub database: String,
}

impl HealthResponse {
    pub fn is_healthy(&self) -> bool {
        self.status == "healthy" && self.database == "connected"
    }
}

// ============== Request Types ==============

/// Create account request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateAccountRequest {
    pub owner_id: uuid::Uuid,
    pub account_type: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,
}

/// Transfer request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TransferRequest {
    pub source_id: uuid::Uuid,
    pub dest_id: uuid::Uuid,
    pub amount: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference: Option<String>,
}

/// Create wallet request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateWalletRequest {
    pub owner_id: uuid::Uuid,
    pub wallet_type: String,
    pub chain: String,
    pub address: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub encrypted_private_key: Option<String>,
}

/// Relay transaction request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayRequest {
    pub signed_transaction: String,
}

/// Create split request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateSplitRequest {
    pub total: String,
    pub splits: Vec<SplitEntry>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub currency: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reference: Option<String>,
}

/// Relay response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RelayResponse {
    pub transaction_hash: String,
}

// ============== Payment Gateway Types ==============

/// Card input for tokenization
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardInput {
    pub number: String,
    pub exp_month: u32,
    pub exp_year: u32,
    pub cvc: String,
}

/// Create token request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTokenRequest {
    pub card: CardInput,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub merchant_id: Option<String>,
}

/// Card details from token
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CardDetails {
    pub brand: String,
    pub last4: String,
    pub exp_month: u32,
    pub exp_year: u32,
}

/// Create token response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateTokenResponse {
    pub id: String,
    pub card: CardDetails,
    pub created_at: String,
}

/// Create payment intent request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIntentRequest {
    pub amount: i64,
    pub currency: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub token: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub merchant_id: Option<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub idempotency_key: Option<String>,
}

/// Create payment intent response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateIntentResponse {
    pub id: String,
    pub status: String,
    pub amount: i64,
    pub currency: String,
    pub client_secret: String,
}

/// Create refund request
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRefundRequest {
    pub charge_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub amount: Option<i64>,
}

/// Create refund response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CreateRefundResponse {
    pub id: String,
    pub status: String,
    pub amount: i64,
    pub charge: String,
}

/// Commission response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct CommissionResponse {
    pub total_commission: i64,
}

/// Payment status
#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "lowercase")]
pub enum PaymentStatus {
    Pending,
    RequiresAction,
    Succeeded,
    Failed,
}

impl Default for PaymentStatus {
    fn default() -> Self {
        PaymentStatus::Pending
    }
}

/// Stripe webhook event
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StripeWebhookEvent {
    pub id: String,
    #[serde(rename = "type")]
    pub event_type: String,
    pub data: StripeEventData,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StripeEventData {
    pub object: StripeEventObject,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StripeEventObject {
    pub id: Option<String>,
    pub status: Option<String>,
    pub payment_intent: Option<String>,
    pub charge: Option<String>,
    pub amount: Option<i64>,
    pub currency: Option<String>,
}

/// Webhook response
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct WebhookResponse {
    pub received: bool,
}

/// Prometheus metrics response (raw text)
pub type MetricsResponse = String;