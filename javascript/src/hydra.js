import { v4 as uuid } from 'uuid';

class Hydra {
  constructor(apiKey, options = {}) {
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'https://api.hydrapp.com';
    this.timeout = options.timeout || 30000;
    this.headers = options.headers || {};
  }

  async request(method, path, body) {
    const url = `${this.baseUrl}${path}`;
    const headers = {
      'Authorization': `Bearer ${this.apiKey}`,
      'Content-Type': 'application/json',
      'Idempotency-Key': uuid(),
      ...this.headers,
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeout);

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: controller.signal,
      });

      const data = await res.json();

      if (!res.ok) {
        throw new HydraError(data.error || data, res.status);
      }

      return data;
    } finally {
      clearTimeout(timeout);
    }
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

export default Hydra;
