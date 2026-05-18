from hydra import Hydra
import os

hydra = Hydra(os.getenv('HYDRA_API_KEY', 'sk_test_abc123'))

# Create a payment
payment = hydra.payments.create(
    amount=2000,
    currency='gbp',
    merchant_id='mrp_abc123',
    payment_methods=['card'],
    capture=True,
    metadata={'order_id': 'ORD-001'},
)
print(f'Payment: {payment["id"]} ({payment["status"]})')

# List payments
payments = hydra.payments.list(limit=5)
print(f'Recent payments: {len(payments["data"])}')

# Refund the payment
refund = hydra.refunds.create(
    payment_id=payment['id'],
    amount=2000,
    reason='customer_request',
)
print(f'Refund: {refund["id"]} ({refund["status"]})')
