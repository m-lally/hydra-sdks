# Shopify Hydra Payment Gateway Integration

A comprehensive integration that allows Shopify merchants to accept payments through the Hydra Payment Gateway as a custom payment method.

## Overview

This integration provides a seamless way for Shopify store owners to use Hydra's secure payment processing capabilities within their Shopify stores. The solution consists of:

1. A Shopify embedded app (Node.js/Express) that handles OAuth, configuration, and payment processing
2. Frontend interface for configuring Hydra settings within the Shopify admin
3. Webhook endpoints for handling Shopify events
4. Secure communication with Hydra's Payment Gateway API

## Features

- **Secure Payment Processing**: Uses Hydra's tokenization to ensure sensitive card data never touches your servers
- **Multiple Payment Methods**: Support for credit/debit cards, Hydra Wallet, and bank transfers
- **Test & Live Mode**: Easily switch between testing and production environments
- **Webhook Integration**: Receive real-time notifications for order events
- **Configurable Settings**: Set API keys, currencies, payment methods, and more per store
- **Shopify Embedded App**: Fully integrated into the Shopify admin interface
- **RESTful API**: Clean API endpoints for extending functionality
- **Environment Configuration**: Easy setup with environment variables

## Prerequisites

Before you begin, ensure you have:

1. A [Shopify Partner](https://partners.shopify.com/) account
2. A [Hydra Payments](https://hydrapay.io) account with API keys
3. Node.js 14+ installed
4. ngrok or similar tool for local development (to expose your local server to the internet)
5. Basic knowledge of Shopify app development

## Installation & Setup

### 1. Create a Shopify App

1. Go to your [Shopify Partner Dashboard](https://partners.shopify.com/dashboard)
2. Click "Apps" → "Create app"
3. Fill in the app details:
   - App name: Hydra Payment Gateway
   - App URL: (Will be set later with ngrok)
   - Redirection URL: (Will be set later with ngrok)
4. Click "Create app"
5. Note down your API key and API secret key from the app credentials page

### 2. Configure Hydra Credentials

1. Log in to your [Hydra Dashboard](https://dashboard.hydrapay.io)
2. Navigate to Developers → API Keys
3. Create or note down your:
   - Public Key (starts with `pk_`)
   - Secret Key (starts with `sk_`)
4. (Optional) Create a webhook endpoint in Hydra if you want direct notifications

### 3. Set Up the Integration Locally

1. Clone or download this repository
2. Install dependencies:
   ```bash
   npm install
   ```
3. Create a `.env` file based on `.env.example`:
   ```bash
   cp .env.example .env
   ```
4. Edit `.env` and add your credentials:
   ```env
   SHOPIFY_API_KEY=your_shopify_api_key
   SHOPIFY_API_SECRET=your_shopify_api_secret
   SHOPIFY_SCOPES=write_orders,read_orders,write_products,read_products
   HOST=your-ngrok-url.ngrok.io  # Get this from ngrok
   SESSION_SECRET=your_session_secret

   HYDRA_API_URL=https://api.hydra.com
   HYDRA_PUBLIC_KEY=your_hydra_public_key
   HYDRA_SECRET_KEY=your_hydra_secret_key

   PORT=3000
   NODE_ENV=development
   ```

### 4. Run the Application

1. Start ngrok to expose your local server:
   ```bash
   ngrok http 3000
   ```
2. Note the forwarding URL (e.g., `https://abc123.ngrok.io`)
3. Update your `.env` file with the ngrok URL:
   ```env
   HOST=abc123.ngrok.io
   ```
4. Update your Shopify app settings:
   - App URL: `https://abc123.ngrok.io`
   - Redirection URL: `https://abc123.ngrok.io/auth`
5. Start the application:
   ```bash
   npm run dev
   ```
6. Install the app on your development store:
   - Visit: `https://abc123.ngrok.io/auth?shop=your-store.myshopify.com`
   - Log in to your Shopify store if prompted
   - Click "Install app"

### 5. Configure the Integration

1. After installation, you'll be redirected to the app interface within your Shopify admin
2. Configure your Hydra settings:
   - API URL (usually defaults to `https://api.hydra.com`)
   - Public Key (from Hydra dashboard)
   - Secret Key (from Hydra dashboard)
   - Webhook Secret (optional, for verifying Hydra webhooks)
   - Default Currency
   - Default Payment Method
   - Test Mode (enable for testing)
3. Save your settings

### 6. Set Up Webhooks (Optional but Recommended)

To receive real-time notifications for order events:

1. In your Shopify admin, go to Settings → Notifications
2. Scroll to the Webhooks section
3. Click "Create webhook"
4. Choose an event (e.g., Order creation)
5. Set format to JSON
6. Enter the webhook URL: `https://your-ngrok-url.ngrok.io/webhooks/orders/create`
7. Save the webhook
8. Repeat for other events as needed (order paid, order cancelled, etc.)

## How It Works

### Architecture

```
[Shopify Store] 
        ↓ (App Bridge / Iframe)
[Shopify Hydra Integration App] 
        ↓ (REST API Calls)
[Hydra Payment Gateway API]
        ↓
[Bank/Card Networks]
        ↓
[Customer]
```

### Payment Flow

1. Customer proceeds to checkout in Shopify
2. Shopify calls your app to determine available payment methods
3. Your app presents Hydra as a payment option
4. Customer selects Hydra and enters payment details
5. Hydra Payment Form library tokenizes the card data securely in the browser
6. Token is sent to your app's backend via AJAX
7. Your app uses the token to create a payment intent with Hydra's API
8. Hydra processes the payment with the bank/card networks
9. Your app confirms the payment intent with Hydra
10. Shopify marks the order as paid
11. Both Shopify and Hydra send webhooks/notifications (if configured)

### Security Features

- **Client-Side Encryption**: Payment details are encrypted in the browser using Hydra's public key
- **Tokenization**: Only payment tokens (not raw card data) are sent to your servers
- **Secret Key Protection**: Your Hydra secret key is never exposed to the client-side
- **Environment Separation**: Test and live modes prevent accidental production charges
- **Input Validation**: All data is validated and sanitized
- **Secure Communication**: All API calls use HTTPS

## API Endpoints

All API endpoints are prefixed with `/api/hydra` and require Shopify session authentication.

### Configuration
```
GET /api/hydra/config
```
Retrieves the Hydra configuration for the current shop (excluding secret keys).

### Payment Processing
```
POST /api/hydra/create-intent
```
Creates a payment intent with Hydra.

Request Body:
```json
{
  "amount": 10.99,
  "currency": "USD",
  "description": "Test Product",
  "paymentMethod": "card"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "pi_1234567890",
    "amount": 1099,
    "currency": "usd",
    "status": "requires_payment_method",
    "client_secret": "pi_1234567890_secret_abcdefg"
  }
}
```

```
POST /api/hydra/confirm-intent
```
Confirms a payment intent.

Request Body:
```json
{
  "intentId": "pi_1234567890"
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "pi_1234567890",
    "amount": 1099,
    "currency": "usd",
    "status": "succeeded"
  }
}
```

```
POST /api/hydra/refund-intent
```
Refunds a payment intent.

Request Body:
```json
{
  "intentId": "pi_1234567890",
  "amount": 5.00
}
```

Response:
```json
{
  "success": true,
  "data": {
    "id": "pi_1234567890",
    "amount": 500,
    "currency": "usd",
    "status": "succeeded",
    "refund": {
      "id": "re_1234567890",
      "amount": 500
    }
  }
}
```

### Webhooks
```
POST /webhooks/:topic
```
Receives webhooks from Shopify.

Supported topics:
- `orders/create`
- `orders/paid`
- `orders/cancelled`
- `orders/fulfilled`
- `orders/returned`
- And any other Shopify webhook topics

## Customization

### Adding Payment Methods

To add support for additional payment methods:

1. Modify the `paymentMethod` select in `pages/index.html`
2. Update the validation logic in `server.js` if needed
3. Ensure Hydra supports the payment method in your account

### Styling

Modify the CSS in the `<style>` section of `pages/index.html` to match your brand.

### Extending Functionality

You can add additional routes in `server.js` for:
- Retrieving payment history
- Managing saved payment methods
- Setting up subscriptions
- Handling disputes and chargebacks

## Troubleshooting

### Common Issues

#### "Invalid shop parameter" during auth
- Ensure your shop parameter matches exactly (including `.myshopify.com`)
- Check that your app URL and redirection URL are correctly set in Shopify Partner Dashboard

#### Payment form not loading
- Check browser console for JavaScript errors
- Verify your Hydra public key is correct
- Ensure you're loading the Hydra Payment Form library (if using custom form)

#### API connection errors
- Verify your Hydra API URL is correct
- Check that your server can make outbound HTTPS connections
- Ensure your Hydra secret key is valid

#### Webhook verification failing
- Double-check your webhook secret matches between Hydra and your app
- Ensure you're using the correct HMAC verification method
- Check that you're receiving the raw POST body (not parsed JSON) for verification

### Debugging

1. Check your server logs for detailed error messages
2. Use browser developer tools to inspect network requests
3. Enable verbose logging in your `.env`:
   ```env
   NODE_ENV=development
   DEBUG=express:*
   ```
4. Check Shopify admin → Apps → Hydra Payment Gateway → App logs (if available)

## Security Considerations

### Production Readiness

Before moving to production:

1. **Use environment variables**: Never commit real keys to version control
2. **Enable HTTPS**: Ensure your production site uses HTTPS
3. **Validate webhooks**: Implement proper HMAC verification for webhooks
4. **Use a proper session store**: Replace `MemorySessionStorage` with a database or Redis
5. **Implement rate limiting**: Protect your endpoints from abuse
6. **Add logging and monitoring**: Track errors and performance
7. **Regularly update dependencies**: Keep your npm packages current

### Data Protection

- Only store the minimum necessary data (payment intents IDs, last 4 digits, etc.)
- Never store raw card data
- Encrypt any sensitive data at rest
- Regularly rotate API keys if compromised
- Follow PCI DSS guidelines for service providers

## Support

For support with this integration:

1. Check the [GitHub Issues](https://github.com/your-repo/shopify-hydra-integration/issues) for known problems
2. Visit the [Hydra Documentation](https://docs.hydrapay.io/integrations/shopify)
3. Contact Hydra Support: support@hydrapay.io
4. For Shopify-specific issues, consult the [Shopify Partner Documentation](https://partner.shopify.com/)

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Built with ❤️ for the Shopify and Hydra communities
- Uses [Shopify App Node](https://github.com/Shopify/shopify-app-node) patterns
- Inspired by Shopify's payment gateway examples