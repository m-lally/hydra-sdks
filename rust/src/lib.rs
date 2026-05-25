//! Hydra Payment Service - Rust SDK
//! 
//! A production-grade async SDK for the Hydra Payment Service with HMAC-SHA256 security.
//! 
//! # Features
//! - Full async/await support with reqwest
//! - HMAC-SHA256 request signing
//! - Type-safe API methods
//! - i18n support (EN, ES, DE, FR)
//! 
//! # Quick Start
//! 
//! ```rust
//! use hydra_sdk::{HydraClient, Result};
//! use uuid::Uuid;
//! 
//! #[tokio::main]
//! async fn main() -> Result<()> {
//!     let client = HydraClient::new(
//!         "http://localhost:8080",
//!         "pk_xxx",
//!         "sk_xxx",
//!     );
//! 
//!     // Health check
//!     let health = client.health_check().await?;
//!     println!("Status: {}", health.status);
//! 
//!     // Create account
//!     let account = client.create_account(
//!         Uuid::new_v4(),
//!         "personal",
//!         Some("GBP"),
//!     ).await?;
//! 
//!     Ok(())
//! }
//! ```
//! 
//! # Installation
//! 
//! Add to your `Cargo.toml`:
//! 
//! ```toml
//! [dependencies]
//! hydra-sdk = "1.0"
//! ```

pub mod client;
pub mod types;

pub use client::{HydraClient, HydraClientBuilder, Error};
pub use types::*;

pub type Result<T> = std::result::Result<T, Error>;