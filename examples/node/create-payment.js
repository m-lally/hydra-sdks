const Hydra = require('./node/src/hydra');

const hydra = new Hydra(process.env.HYDRA_API_KEY || 'sk_test_abc123');

async function main() {
  // Create a payment
  const payment = await hydra.payments.create({
    amount: 2000,
    currency: 'gbp',
    merchantId: 'mrp_abc123',
    paymentMethods: ['card'],
    source: 'pm_card_visa',
    capture: true,
    metadata: { orderId: 'ORD-001' },
  });
  console.log('Payment:', payment.id, payment.status);

  // List payments
  const payments = await hydra.payments.list({ limit: 5 });
  console.log('Recent payments:', payments.length);

  // Refund the payment
  const refund = await hydra.refunds.create({
    paymentId: payment.id,
    amount: 2000,
    reason: 'customer_request',
  });
  console.log('Refund:', refund.id, refund.status);
}

main().catch(console.error);
