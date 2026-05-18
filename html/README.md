# HTML SDK (CDN)

Use Hydra directly in the browser via a `<script>` tag.

## Usage

```html
<script src="https://unpkg.com/@hydrapp/sdk@latest"></script>
<script>
  const hydra = new Hydra('pk_live_abc123');

  hydra.payments.create({
    amount: 2000,
    currency: 'gbp',
    merchantId: 'mrp_abc123',
    paymentMethods: ['card'],
    capture: true,
  }).then(payment => {
    console.log(payment.id, payment.status);
  });
</script>
```

## Local

```html
<script src="./hydra.js"></script>
```
