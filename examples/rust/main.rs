use hydra_sdk::{Hydra, CreatePayment, CreateRefund};

#[tokio::main]
async fn main() -> Result<(), Box<dyn std::error::Error>> {
    let hydra = Hydra::new("sk_test_abc123");

    // Create a payment
    let payment = hydra.payments().create(CreatePayment {
        amount: 2000,
        currency: "gbp".into(),
        merchant_id: "mrp_abc123".into(),
        payment_methods: vec!["card".into()],
        source: None,
        capture: true,
        metadata: None,
    }).await?;
    println!("Payment: {} ({})", payment.id, payment.status);

    // List payments
    let payments = hydra.payments().list(Some(5)).await?;
    println!("Recent payments: {}", payments.data.len());

    // Refund the payment
    let refund = hydra.refunds().create(CreateRefund {
        payment_id: payment.id.clone(),
        amount: Some(2000),
        reason: Some("customer_request".into()),
    }).await?;
    println!("Refund: {} ({})", refund.id, refund.status);

    Ok(())
}
