const https = require('https');
const { randomUUID } = require('crypto');

class Hydra {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'https://api.hydrapp.com';
    this.timeout = options.timeout || 30000;
    this.headers = options.headers || {};
  }

  request(method, path, body) {
    const url = new URL(path, this.baseUrl);
    const data = body ? JSON.stringify(body) : null;

    return new Promise((resolve, reject) => {
      const req = https.request(
        {
          hostname: url.hostname,
          path: url.pathname + url.search,
          method,
          headers: {
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json',
            'Idempotency-Key': randomUUID(),
            ...this.headers,
          },
          timeout: this.timeout,
        },
        (res) => {
          let body = '';
          res.on('data', (chunk) => (body += chunk));
          res.on('end', () => {
            try {
              const json = JSON.parse(body);
              if (!res.statusCode || res.statusCode >= 400) {
                reject(new HydraError(json.error || json, res.statusCode));
              } else {
                resolve(json);
              }
            } catch (e) {
              reject(new HydraError({ message: body }, 0));
            }
          });
        }
      );

      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('Request timeout')); });
      if (data) req.write(data);
      req.end();
    });
  }

  get payments() {
    return {
      create: (params) => this.request('POST', '/v1/payments', params),
      list: (params) => this.request('GET', `/v1/payments?${new URLSearchParams(params)}`),
      get: (id) => this.request('GET', `/v1/payments/${id}`),
      capture: (id, params) => this.request('POST', `/v1/payments/${id}/capture`, params),
      cancel: (id) => this.request('POST', `/v1/payments/${id}/cancel`),
    };
  }

  get checkout() {
    return {
      create: (params) => this.request('POST', '/v1/checkout/sessions', params),
      get: (id) => this.request('GET', `/v1/checkout/sessions/${id}`),
    };
  }

  get refunds() {
    return {
      create: (params) => this.request('POST', '/v1/refunds', params),
      list: (params) => this.request('GET', `/v1/refunds?${new URLSearchParams(params)}`),
      get: (id) => this.request('GET', `/v1/refunds/${id}`),
    };
  }

  get customers() {
    return {
      create: (params) => this.request('POST', '/v1/customers', params),
      list: (params) => this.request('GET', `/v1/customers?${new URLSearchParams(params)}`),
      get: (id) => this.request('GET', `/v1/customers/${id}`),
    };
  }

  get bankAccounts() {
    return {
      validate: (params) => this.request('POST', '/v1/bank-accounts/validate', params),
      create: (params) => this.request('POST', '/v1/bank-accounts', params),
    };
  }

  get disputes() {
    return {
      list: (params) => this.request('GET', `/v1/disputes?${new URLSearchParams(params)}`),
      get: (id) => this.request('GET', `/v1/disputes/${id}`),
      update: (id, params) => this.request('POST', `/v1/disputes/${id}`, params),
    };
  }

  get balance() {
    return {
      get: () => this.request('GET', '/v1/balance'),
    };
  }

  get webhooks() {
    return {
      constructEvent: (payload, signature, secret) => {
        const crypto = require('crypto');
        const computed = crypto.createHmac('sha256', secret).update(payload).digest('hex');
        const expected = signature.replace('sha256=', '');
        if (!crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(expected))) {
          throw new Error('Signature verification failed');
        }
        return JSON.parse(payload);
      },
    };
  }
}

class HydraError extends Error {
  constructor(error, statusCode) {
    super(error.message || 'Hydra API error');
    this.name = 'HydraError';
    this.statusCode = statusCode;
    this.code = error.code;
    this.type = error.type;
    this.param = error.param;
  }
}

module.exports = Hydra;
