/**
 * Shopify Hydra Payment Gateway Integration
 * 
 * This is a Shopify embedded app that integrates Hydra Payment Gateway
 * as a custom payment method for Shopify stores.
 * 
 * @package Shopify_Hydra_Integration
 */

require('dotenv').config();
const express = require('express');
const session = require('express-session');
const crypto = require('crypto');
const { Shopify, ApiVersion } = require('@shopify/shopify-api');
const axios = require('axios');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Shopify API configuration
Shopify.Context.initialize({
  API_KEY: process.env.SHOPIFY_API_KEY,
  API_SECRET_KEY: process.env.SHOPIFY_API_SECRET,
  SCOPES: process.env.SHOPIFY_SCOPES.split(','),
  HOST_NAME: process.env.HOST.replace(/https?:\/\//, ''),
  API_VERSION: ApiVersion.April22,
  IS_EMBEDDED_APP: true,
  SESSION_STORAGE: new Shopify.Session.MemorySessionStorage(),
});

// Set up session middleware
app.use(
  session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: { httpOnly: true, secure: process.env.NODE_ENV === 'production' },
  })
);

// Set up Shopify authentication
app.get('/auth', async (req, res) => {
  const authRoute = await Shopify.Auth.beginAuth(
    req,
    res,
    req.query.shop,
    '/auth/callback',
    false // isOnline
  });
  res.redirect(authRoute);
});

app.get('/auth/callback', async (req, res) => {
  try {
    const session = await Shopify.Auth.validateAuthCallback(
      req,
      res,
      req.query
    );
    req.session.shopify = session;
    res.redirect('/');
  } catch (error) {
    console.error('Auth callback error:', error);
    res.status(error.status || 500).send(error.message);
  }
});

// Middleware to verify Shopify session
function verifyShopifySession(req, res, next) {
  const { shop } = req.session.shopify || {};
  if (!shop) {
    return res.status(401).send('Unauthorized');
  }
  next();
}

// Serve the embedded app
app.get('/', verifyShopifySession, (req, res) => {
  res.sendFile(path.resolve('./pages/index.html'));
});

// Hydra Payment Gateway API helper
class HydraClient {
  constructor(apiUrl, publicKey, secretKey) {
    this.apiUrl = apiUrl;
    this.publicKey = publicKey;
    this.secretKey = secretKey;
  }

  async createPaymentIntent(amount, currency, description, paymentMethod) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/payment_intents`,
        {
          amount: Math.round(amount * 100), // Convert to smallest currency unit
          currency,
          description,
          payment_method: paymentMethod || 'card',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Hydra API error: ${error.response?.data?.message || error.message}`);
    }
  }

  async confirmPaymentIntent(intentId) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/payment_intents/${intentId}/confirm`,
        {},
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Hydra API error: ${error.response?.data?.message || error.message}`);
    }
  }

  async refundPaymentIntent(intentId, amount) {
    try {
      const response = await axios.post(
        `${this.apiUrl}/v1/payment_intents/${intentId}/refund`,
        {
          amount: Math.round(amount * 100),
        },
        {
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${this.secretKey}`,
          },
        }
      );
      return response.data;
    } catch (error) {
      throw new Error(`Hydra API error: ${error.response?.data?.message || error.message}`);
    }
  }
}

// Route to get Hydra configuration for the store
app.get('/api/hydra/config', verifyShopifySession, async (req, res) => {
  try {
    // In a real app, you would load the store's Hydra configuration from a database
    // For this example, we'll use environment variables or return mock data
    const config = {
      apiUrl: process.env.HYDRA_API_URL || 'https://api.hydra.com',
      publicKey: process.env.HYDRA_PUBLIC_KEY || 'pk_test_...',
      // Note: Never send secret key to the client!
    };
    res.json({ success: true, data: config });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// Route to create a payment intent (called from frontend)
app.post('/api/hydra/create-intent', verifyShopifySession, async (req, res) => {
  try {
    const { amount, currency, description, paymentMethod } = req.body;
    
    // In a real app, you would load the store's Hydra secret key from a database
    const hydraClient = new HydraClient(
      process.env.HYDRA_API_URL || 'https://api.hydra.com',
      process.env.HYDRA_PUBLIC_KEY || '',
      process.env.HYDRA_SECRET_KEY || ''
    );

    const intent = await hydraClient.createPaymentIntent(
      amount,
      currency,
      description,
      paymentMethod
    );

    res.json({ success: true, data: intent });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Route to confirm a payment intent
app.post('/api/hydra/confirm-intent', verifyShopifySession, async (req, res) => {
  try {
    const { intentId } = req.body;
    
    const hydraClient = new HydraClient(
      process.env.HYDRA_API_URL || 'https://api.hydra.com',
      process.env.HYDRA_PUBLIC_KEY || '',
      process.env.HYDRA_SECRET_KEY || ''
    );

    const confirmation = await hydraClient.confirmPaymentIntent(intentId);
    
    res.json({ success: true, data: confirmation });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Route to refund a payment intent
app.post('/api/hydra/refund-intent', verifyShopifySession, async (req, res) => {
  try {
    const { intentId, amount } = req.body;
    
    const hydraClient = new HydraClient(
      process.env.HYDRA_API_URL || 'https://api.hydra.com',
      process.env.HYDRA_PUBLIC_KEY || '',
      process.env.HYDRA_SECRET_KEY || ''
    );

    const refund = await hydraClient.refundPaymentIntent(intentId, amount);
    
    res.json({ success: true, data: refund });
  } catch (error) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// Webhook endpoint for Shopify webhooks
app.post('/webhooks/:topic', express.json({ type: '*/*' }), (req, res) => {
  const { topic } = req.params;
  const hmac = req.get('X-Shopify-Hmac-Sha256');
  
  // Verify webhook authenticity (in production)
  // const hash = crypto
  //   .createHmac('sha256', process.env.SHOPIFY_API_SECRET)
  //   .update(JSON.stringify(req.body), 'utf8')
  //   .digest('base64');
  // if (hash !== hmac) {
  //   return res.status(400).send('Invalid HMAC');
  // }

  // Handle different webhook topics
  switch (topic) {
    case 'orders/create':
      handleOrderCreate(req.body);
      break;
    case 'orders/paid':
      handleOrderPaid(req.body);
      break;
    case 'orders/cancelled':
      handleOrderCancelled(req.body);
      break;
    // Add more topics as needed
    default:
      console.log(`Unhandled webhook topic: ${topic}`);
  }

  res.status(200).send('Webhook received');
});

function handleOrderCreate(order) {
  console.log('Order created:', order.order_number);
  // Logic for when an order is created
}

function handleOrderPaid(order) {
  console.log('Order paid:', order.order_number);
  // Logic for when an order is paid
  // You might want to verify the payment with Hydra here
}

function handleOrderCancelled(order) {
  console.log('Order cancelled:', order.order_number);
  // Logic for when an order is cancelled
}

// Health check endpoint
app.get('/health', (req, res) => {
  res.send('OK');
});

app.listen(port, () => {
  console.log(`Shopify Hydra Integration server listening on port ${port}`);
});

module.exports = app;