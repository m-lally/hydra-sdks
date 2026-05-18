use reqwest::Client;
use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use thiserror::Error;
use uuid::Uuid;

#[derive(Error, Debug)]
pub enum HydraError {
    #[error("API error: {message} (status {status})")]
    Api { message: String, status: u16, code: Option<String>, r#type: Option<String> },
    #[error("HTTP error: {0}")]
    Http(#[from] reqwest::Error),
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Payment {
    pub id: String,
    pub amount: i64,
    pub currency: String,
    pub status: String,
    pub merchant_id: String,
    pub payment_methods: Vec<String>,
    pub created_at: String,
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Serialize, Debug)]
pub struct CreatePayment {
    pub amount: i64,
    pub currency: String,
    pub merchant_id: String,
    pub payment_methods: Vec<String>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub source: Option<String>,
    pub capture: bool,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub metadata: Option<HashMap<String, String>>,
}

#[derive(Deserialize, Debug, Clone)]
pub struct PaymentList {
    pub data: Vec<Payment>,
    pub has_more: bool,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Refund {
    pub id: String,
    pub payment_id: String,
    pub amount: i64,
    pub status: String,
    pub reason: Option<String>,
    pub created_at: String,
}

#[derive(Serialize, Debug)]
pub struct CreateRefund {
    pub payment_id: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub amount: Option<i64>,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub reason: Option<String>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct CheckoutSession {
    pub id: String,
    pub url: String,
    pub status: String,
}

#[derive(Serialize, Debug)]
pub struct CreateCheckoutSession {
    pub amount: i64,
    pub currency: String,
    pub merchant_id: String,
    pub success_url: String,
    pub cancel_url: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Customer {
    pub id: String,
    pub email: Option<String>,
    pub name: Option<String>,
    pub created_at: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct Balance {
    pub available: Vec<BalanceAmount>,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct BalanceAmount {
    pub amount: i64,
    pub currency: String,
}

#[derive(Deserialize, Serialize, Debug, Clone)]
pub struct Dispute {
    pub id: String,
    pub payment_id: String,
    pub amount: i64,
    pub status: String,
    pub reason: String,
}

#[derive(Deserialize, Debug, Clone)]
pub struct BankAccountValidation {
    pub valid: bool,
    pub account_number: String,
    pub sort_code: String,
}

pub struct PaymentsResource<'a> {
    client: &'a Hydra,
}

impl<'a> PaymentsResource<'a> {
    pub async fn create(&self, params: CreatePayment) -> Result<Payment, HydraError> {
        self.client.request("POST", "/v1/payments", Some(params)).await
    }

    pub async fn list(&self, limit: Option<u32>) -> Result<PaymentList, HydraError> {
        let query = limit.map(|l| format!("?limit={}", l)).unwrap_or_default();
        self.client.request("GET", &format!("/v1/payments{}", query), None::<()>).await
    }

    pub async fn get(&self, id: &str) -> Result<Payment, HydraError> {
        self.client.request("GET", &format!("/v1/payments/{}", id), None::<()>).await
    }

    pub async fn capture(&self, id: &str) -> Result<Payment, HydraError> {
        self.client.request("POST", &format!("/v1/payments/{}/capture", id), None::<()>).await
    }

    pub async fn cancel(&self, id: &str) -> Result<Payment, HydraError> {
        self.client.request("POST", &format!("/v1/payments/{}/cancel", id), None::<()>).await
    }
}

pub struct CheckoutResource<'a> {
    client: &'a Hydra,
}

impl<'a> CheckoutResource<'a> {
    pub async fn create(&self, params: CreateCheckoutSession) -> Result<CheckoutSession, HydraError> {
        self.client.request("POST", "/v1/checkout/sessions", Some(params)).await
    }

    pub async fn get(&self, id: &str) -> Result<CheckoutSession, HydraError> {
        self.client.request("GET", &format!("/v1/checkout/sessions/{}", id), None::<()>).await
    }
}

pub struct RefundsResource<'a> {
    client: &'a Hydra,
}

impl<'a> RefundsResource<'a> {
    pub async fn create(&self, params: CreateRefund) -> Result<Refund, HydraError> {
        self.client.request("POST", "/v1/refunds", Some(params)).await
    }

    pub async fn get(&self, id: &str) -> Result<Refund, HydraError> {
        self.client.request("GET", &format!("/v1/refunds/{}", id), None::<()>).await
    }
}

pub struct CustomersResource<'a> {
    client: &'a Hydra,
}

impl<'a> CustomersResource<'a> {
    pub async fn create(&self, email: &str, name: Option<&str>) -> Result<Customer, HydraError> {
        let mut body = HashMap::new();
        body.insert("email", email);
        if let Some(n) = name {
            body.insert("name", n);
        }
        self.client.request("POST", "/v1/customers", Some(body)).await
    }

    pub async fn get(&self, id: &str) -> Result<Customer, HydraError> {
        self.client.request("GET", &format!("/v1/customers/{}", id), None::<()>).await
    }
}

pub struct DisputesResource<'a> {
    client: &'a Hydra,
}

impl<'a> DisputesResource<'a> {
    pub async fn list(&self) -> Result<Vec<Dispute>, HydraError> {
        self.client.request("GET", "/v1/disputes", None::<()>).await
    }

    pub async fn get(&self, id: &str) -> Result<Dispute, HydraError> {
        self.client.request("GET", &format!("/v1/disputes/{}", id), None::<()>).await
    }
}

pub struct BalanceResource<'a> {
    client: &'a Hydra,
}

impl<'a> BalanceResource<'a> {
    pub async fn get(&self) -> Result<Balance, HydraError> {
        self.client.request("GET", "/v1/balance", None::<()>).await
    }
}

pub struct Hydra {
    api_key: String,
    base_url: String,
    client: Client,
}

impl Hydra {
    pub fn new(api_key: &str) -> Self {
        Self {
            api_key: api_key.to_string(),
            base_url: "https://api.hydrapp.com".to_string(),
            client: Client::new(),
        }
    }

    pub fn with_base_url(mut self, base_url: &str) -> Self {
        self.base_url = base_url.to_string();
        self
    }

    async fn request<T: Serialize, R: for<'de> Deserialize<'de>>(
        &self,
        method: &str,
        path: &str,
        body: Option<T>,
    ) -> Result<R, HydraError> {
        let url = format!("{}{}", self.base_url, path);
        let mut req = self.client
            .request(
                reqwest::Method::from_bytes(method.as_bytes()).unwrap(),
                &url,
            )
            .header("Authorization", format!("Bearer {}", self.api_key))
            .header("Content-Type", "application/json")
            .header("Idempotency-Key", Uuid::new_v4().to_string());

        if let Some(b) = body {
            req = req.json(&b);
        }

        let resp = req.send().await?;
        let status = resp.status().as_u16();

        if status >= 400 {
            let err: serde_json::Value = resp.json().await?;
            let msg = err["error"]["message"].as_str().unwrap_or("API error");
            return Err(HydraError::Api {
                message: msg.to_string(),
                status,
                code: err["error"]["code"].as_str().map(String::from),
                r#type: err["error"]["type"].as_str().map(String::from),
            });
        }

        Ok(resp.json().await?)
    }

    pub fn payments(&self) -> PaymentsResource {
        PaymentsResource { client: self }
    }

    pub fn checkout(&self) -> CheckoutResource {
        CheckoutResource { client: self }
    }

    pub fn refunds(&self) -> RefundsResource {
        RefundsResource { client: self }
    }

    pub fn customers(&self) -> CustomersResource {
        CustomersResource { client: self }
    }

    pub fn disputes(&self) -> DisputesResource {
        DisputesResource { client: self }
    }

    pub fn balance(&self) -> BalanceResource {
        BalanceResource { client: self }
    }
}
