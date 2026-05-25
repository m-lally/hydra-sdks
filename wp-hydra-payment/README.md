# Hydra Payment Gateway for WordPress

A secure and easy-to-integrate WordPress plugin that connects your WooCommerce or any WordPress site to the Hydra Payment Gateway for processing credit card payments, digital wallets, and other payment methods.

## Features

- Secure payment processing with Hydra Payment Gateway
- Support for multiple payment methods (Credit/Debit Card, Hydra Wallet, Bank Transfer)
- Test and live mode switching
- Webhook support for real-time payment notifications
- REST API endpoints for custom integrations
- Responsive and customizable payment form
- Shortcode-based implementation for easy placement
- Full WordPress coding standards compliance
- Comprehensive documentation and support

## Installation

### Automatic Installation

1. Log in to your WordPress dashboard.
2. Navigate to Plugins > Add New.
3. Search for "Hydra Payment Gateway".
4. Click "Install Now" and then "Activate".

### Manual Installation

1. Download the plugin ZIP file from the official repository.
2. Log in to your WordPress dashboard.
3. Navigate to Plugins > Add New > Upload Plugin.
4. Choose the ZIP file and click "Install Now".
5. After installation, click "Activate Plugin".

## Setup and Configuration

### Basic Setup

1. After activation, go to Settings > Hydra Payment Gateway.
2. Enter your Hydra API credentials:
   - **API URL**: Your Hydra API endpoint (defaults to test/live URLs if not specified)
   - **Public Key**: Your Hydra public key for client-side encryption
   - **Secret Key**: Your Hydra secret key for server-side operations
   - **Webhook Secret**: Used to verify webhook signatures from Hydra
   - **Currency**: Default currency for transactions (e.g., USD, EUR)
   - **Payment Method**: Default payment method to use
   - **Test Mode**: Enable/disable test mode

### Obtaining Hydra API Keys

To use this plugin, you need a Hydra Payments account:

1. Sign up at [https://hydra.com](https://hydra.com)
2. Navigate to the Developer section in your dashboard
3. Create API keys (Public and Secret)
4. Set up webhooks if needed for real-time notifications
5. Copy the keys into the plugin settings

## Usage

### Adding a Payment Form

The plugin provides a shortcode to add payment forms anywhere in your WordPress content:

```
[hydra_payment_form amount="10.00" currency="USD" description="Product Purchase"]
```

#### Shortcode Attributes

- `amount`: The amount to charge (required)
- `currency`: Currency code (optional, defaults to plugin setting)
- `description`: Description of the payment (optional)

### Examples

#### Simple Payment Button
```
[hydra_payment_form amount="25.00"]
```

#### Payment with Description
```
[hydra_payment_form amount="15.99" currency="USD" description="Premium Subscription"]
```

#### Different Currency
```
[hydra_payment_form amount="20.00" currency="EUR" description="European Product"]
```

## How It Works

### Frontend Process

1. When a user visits a page with the `[hydra_payment_form]` shortcode, the plugin loads:
   - Custom CSS for styling the payment form
   - JavaScript to handle the payment flow
   - The Hydra Payment Form library (hydra-pay.min.js) for secure card collection

2. The user fills in their payment details in the secure form hosted by Hydra.

3. Upon submission, Hydra tokenizes the payment information and returns a token to our JavaScript.

4. Our JavaScript sends this token to your WordPress site via AJAX to create a payment intent.

5. Your WordPress site communicates with Hydra's API to create and confirm the payment.

6. The user sees a success or error message based on the payment result.

### Backend Process

1. The plugin registers REST API endpoints for:
   - Creating payment intents (`/wp-json/hydra-payment/v1/create-intent`)
   - Confirming payments (`/wp-json/hydra-payment/v1/confirm-intent`)
   - Receiving webhooks (`/wp-json/hydra-payment/v1/webhook`)

2. All sensitive operations (communicating with Hydra's API) happen server-side using your Secret Key.

3. Payment tokens never touch your servers, reducing PCI compliance scope.

## Security Features

- **Client-Side Encryption**: Payment details are encrypted in the browser using Hydra's public key before being sent to Hydra's servers.
- **Tokenization**: Instead of handling raw card data, your site only receives payment tokens from Hydra.
- **Secret Key Protection**: Your Hydra secret key is never exposed to the client-side.
- **Webhook Verification**: Webhook signatures can be verified to ensure they come from Hydra.
- **Data Sanitization**: All inputs are properly sanitized and validated.
- **Nonce Protection**: REST API endpoints include permission checks (customizable for enhanced security).

## Webhooks

The plugin provides a webhook endpoint at:
`https://your-site.com/wp-json/hydra-payment/v1/webhook`

To use webhooks:

1. Set your webhook secret in the plugin settings.
2. In your Hydra dashboard, configure webhooks to point to the URL above.
3. The plugin will verify the webhook signature (if a secret is set) and log the received data.
4. You can extend the `webhook_callback` method to process webhook events (e.g., updating order status).

## Customization

### Styling

The plugin's CSS can be overridden by adding custom CSS to your theme or using a custom CSS plugin.

### Extending Functionality

Developers can extend the plugin by:

1. Hooking into the various actions and filters (to be added in future versions).
2. Overriding the REST API endpoints behavior.
3. Modifying the webhook processing logic.

### REST API Endpoints

All endpoints are under the namespace `hydra-payment/v1`:

#### Create Payment Intent
```
POST /wp-json/hydra-payment/v1/create-intent
```
Creates a payment intent with Hydra using a token from the frontend.

Parameters:
- `token` (required): Payment token from Hydra Payment Form
- `amount` (required): Amount to charge (in decimal format, e.g., 10.99)
- `currency` (optional): Currency code (defaults to plugin setting)
- `description` (optional): Payment description

Returns:
```json
{
  "success": true,
  "data": {
    "intent_id": "pi_1234567890"
  }
}
```

#### Confirm Payment Intent
```
POST /wp-json/hydra-payment/v1/confirm-intent
```
Confirms a payment intent to complete the payment.

Parameters:
- `intent_id` (required): The payment intent ID from the create-intent endpoint

Returns:
```json
{
  "success": true,
  "data": {
    "redirect_url": "https://example.com/thank-you/",
    "payment_id": "pay_1234567890"
  }
}
```

#### Webhook Receiver
```
POST /wp-json/hydra-payment/v1/webhook
```
Receives webhook notifications from Hydra.

Headers:
- `X-Hydra-Signature`: Signature for verification (if webhook secret is set)

Body: JSON payload from Hydra

## Troubleshooting

### Common Issues

#### "Hydra Payment Form library not loaded"
- Ensure the plugin is activated
- Check for JavaScript errors in the browser console
- Verify that no other plugins are deferring or blocking script loading

#### Payment form not displaying
- Make sure the shortcode is placed correctly in the content
- Check if the page content is being filtered or modified by other plugins
- Try switching to a default WordPress theme to rule out theme conflicts

#### API connection errors
- Verify your API URL, Public Key, and Secret Key are correct
- Ensure your server can make outbound HTTPS connections to Hydra's API
- Check if any firewall or security plugins are blocking the connection

#### Webhook not working
- Verify the webhook URL is correctly configured in your Hydra dashboard
- Check that your server is accessible from the internet (not behind a local firewall)
- Ensure the webhook secret matches between Hydra and the plugin settings

### Debugging

To enable debugging:

1. Add the following to your `wp-config.php` file:
   ```php
   define( 'WP_DEBUG', true );
   define( 'WP_DEBUG_LOG', true );
   define( 'WP_DEBUG_DISPLAY', false );
   ```

2. Check the `wp-content/debug.log` file for error messages.

3. Use browser developer tools to inspect network requests and console errors.

## Requirements

- WordPress 5.0 or higher
- PHP 7.2 or higher
- HTTPS connection (required for payment processing)
- Active Hydra Payments account

## Support

For support, please visit:
- Documentation: [https://docs.hydra.com/wordpress](https://docs.hydra.com/wordpress)
- Support Forum: [https://support.hydra.com](https://support.hydra.com)
- Email: support@hydra.com

## Changelog

### 1.0.0 (Initial Release)
- Initial release of the Hydra Payment Gateway plugin
- Secure payment form integration
- REST API endpoints for payment processing
- Webhook support
- Comprehensive settings panel
- Shortcode-based implementation

## License

This plugin is released under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## Acknowledgments

- Thanks to the Hydra Payments team for providing the payment gateway infrastructure
- Built with ❤️ for the WordPress community