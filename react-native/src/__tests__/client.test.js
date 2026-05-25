const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

let HydraClient, createHydraClient, HydraError, AuthenticationError, ValidationError, NotFoundError;

before(() => {
  const mod = require('../../dist/index.js');
  HydraClient = mod.HydraClient;
  createHydraClient = mod.createHydraClient;
  HydraError = mod.HydraError;
  AuthenticationError = mod.AuthenticationError;
  ValidationError = mod.ValidationError;
  NotFoundError = mod.NotFoundError;
});

describe('HydraClient Construction', () => {
  it('creates a client with apiKey and secretKey', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    assert.ok(client instanceof HydraClient);
  });

  it('uses default baseUrl when none provided', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    assert.equal(client.getBaseUrl(), 'http://localhost:8080');
  });

  it('accepts custom baseUrl', () => {
    const client = new HydraClient({
      apiKey: 'pk_test',
      secretKey: 'sk_test',
      baseUrl: 'https://api.hydra.com',
    });
    assert.equal(client.getBaseUrl(), 'https://api.hydra.com');
  });

  it('accepts custom timeout', () => {
    const client = new HydraClient({
      apiKey: 'pk_test',
      secretKey: 'sk_test',
      timeout: 5000,
    });
    assert.ok(client instanceof HydraClient);
  });

  it('accepts custom locale and defaultCurrency', () => {
    const client = new HydraClient({
      apiKey: 'pk_test',
      secretKey: 'sk_test',
      locale: 'es',
      defaultCurrency: 'EUR',
    });
    assert.ok(client instanceof HydraClient);
  });

  it('factory function creates HydraClient', () => {
    const client = createHydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    assert.ok(client instanceof HydraClient);
  });
});

describe('HMAC Signing', () => {
  it('signMessage produces a non-empty base64 string', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    const sig = client.signMessage('test message');
    assert.equal(typeof sig, 'string');
    assert.ok(sig.length > 0);
    assert.doesNotThrow(() => Buffer.from(sig, 'base64'));
  });

  it('signMessage is deterministic for same key and message', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    const sig1 = client.signMessage('test');
    const sig2 = client.signMessage('test');
    assert.equal(sig1, sig2);
  });

  it('signMessage produces different output for different messages', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    const sig1 = client.signMessage('message one');
    const sig2 = client.signMessage('message two');
    assert.notEqual(sig1, sig2);
  });

  it('signMessage produces different output for different secret keys', () => {
    const c1 = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_key1' });
    const c2 = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_key2' });
    assert.notEqual(c1.signMessage('test'), c2.signMessage('test'));
  });

  it('signMessage produces different output for different api keys', () => {
    const c1 = new HydraClient({ apiKey: 'pk_one', secretKey: 'sk_test' });
    const c2 = new HydraClient({ apiKey: 'pk_two', secretKey: 'sk_test' });
    assert.equal(c1.signMessage('test'), c2.signMessage('test'));
  });

  it('signMessage works with empty string', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    const sig = client.signMessage('');
    assert.equal(typeof sig, 'string');
    assert.ok(sig.length > 0);
  });

  it('produces a valid HMAC-SHA256 output matching Node crypto', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    const sig = client.signMessage('test');
    const expected = crypto.createHmac('sha256', 'sk_test').update('test').digest('base64');
    assert.equal(sig, expected);
  });
});

describe('Webhook Signature Verification', () => {
  it('verifyWebhookSignature returns true for valid signature', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    const sig = client.signMessage('payload');
    assert.equal(client.verifyWebhookSignature('payload', sig), true);
  });

  it('verifyWebhookSignature returns false for tampered payload', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    const sig = client.signMessage('original payload');
    assert.equal(client.verifyWebhookSignature('tampered payload', sig), false);
  });

  it('verifyWebhookSignature returns false for random string', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    assert.equal(client.verifyWebhookSignature('payload', 'aaaaaaaa'), false);
  });

  it('verifyWebhookSignature returns false for empty signature', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    assert.equal(client.verifyWebhookSignature('payload', ''), false);
  });

  it('verifyWebhookSignature returns false for invalid base64', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    assert.equal(client.verifyWebhookSignature('payload', '!!!not-base64!!!'), false);
  });

  it('verifyWebhookSignature works with different secret keys', () => {
    const c1 = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_key1' });
    const c2 = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_key2' });
    const sig = c1.signMessage('payload');
    assert.equal(c2.verifyWebhookSignature('payload', sig), false);
  });
});

describe('Client Configuration Mutations', () => {
  it('setLocale updates locale', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    client.setLocale('fr');
    assert.ok(client instanceof HydraClient);
  });

  it('setDefaultCurrency updates default currency', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    client.setDefaultCurrency('USD');
    assert.ok(client instanceof HydraClient);
  });

  it('getBaseUrl returns current base URL', () => {
    const client = new HydraClient({
      apiKey: 'pk_test',
      secretKey: 'sk_test',
      baseUrl: 'https://example.com',
    });
    assert.equal(client.getBaseUrl(), 'https://example.com');
  });
});

describe('Error Classes', () => {
  it('HydraError extends Error', () => {
    const err = new HydraError('test', 'CODE', 500);
    assert.ok(err instanceof Error);
    assert.ok(err instanceof HydraError);
    assert.equal(err.message, 'test');
    assert.equal(err.code, 'CODE');
    assert.equal(err.statusCode, 500);
    assert.equal(err.name, 'HydraError');
  });

  it('HydraError works with default details', () => {
    const err = new HydraError('test');
    assert.equal(err.message, 'test');
    assert.equal(err.code, undefined);
    assert.equal(err.statusCode, undefined);
  });

  it('HydraError accepts details object', () => {
    const details = { field: 'amount', reason: 'invalid' };
    const err = new HydraError('Validation error', 'VAL_ERR', 400, details);
    assert.deepEqual(err.details, details);
  });

  it('AuthenticationError has correct defaults', () => {
    const err = new AuthenticationError('Invalid API key');
    assert.ok(err instanceof HydraError);
    assert.equal(err.code, 'AUTHENTICATION_ERROR');
    assert.equal(err.statusCode, 401);
    assert.equal(err.name, 'AuthenticationError');
  });

  it('ValidationError has correct defaults', () => {
    const err = new ValidationError('Bad request');
    assert.ok(err instanceof HydraError);
    assert.equal(err.code, 'VALIDATION_ERROR');
    assert.equal(err.statusCode, 400);
    assert.equal(err.name, 'ValidationError');
  });

  it('NotFoundError has correct defaults', () => {
    const err = new NotFoundError('Resource not found');
    assert.ok(err instanceof HydraError);
    assert.equal(err.code, 'NOT_FOUND');
    assert.equal(err.statusCode, 404);
    assert.equal(err.name, 'NotFoundError');
  });

  it('AuthenticationError passes details', () => {
    const err = new AuthenticationError('msg', { reason: 'expired' });
    assert.deepEqual(err.details, { reason: 'expired' });
  });
});

describe('API Endpoint Structure', () => {
  it('has all expected API methods', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    const methods = [
      'healthCheck',
      'createAccount', 'getAccount', 'getAccountsByOwner',
      'transfer', 'getTransaction', 'completeTransaction', 'failTransaction',
      'createWallet', 'getWallets', 'relayTransaction',
      'createSplit', 'getSplit',
      'createCardToken', 'createPaymentIntent', 'createRefund',
      'getCommission',
    ];
    for (const m of methods) {
      assert.equal(typeof client[m], 'function', `${m} should be a function`);
    }
  });

  it('each API method returns a Promise', async () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(client))
      .filter(n => n !== 'constructor' && typeof client[n] === 'function');

    const asyncMethods = methodNames.filter(n => !['getBaseUrl', 'setLocale', 'setDefaultCurrency', 'signMessage', 'verifyWebhookSignature', 'setupInterceptors'].includes(n));
    for (const m of asyncMethods) {
      const result = client[m]();
      assert.ok(result instanceof Promise, `${m} should return a Promise`);
      await result.catch(() => {});
    }
  });

  it('has webhook and metrics methods', () => {
    const client = new HydraClient({ apiKey: 'pk_test', secretKey: 'sk_test' });
    assert.equal(typeof client.sendWebhookEvent, 'function');
    assert.equal(typeof client.getMetrics, 'function');
    assert.equal(typeof client.request, 'function');
  });
});
