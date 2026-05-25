// Hydra SDK — Browser (CDN)
// Usage: <script src="hydra.js"></script>

(function (global) {
  'use strict';

  function uuid() {
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (c) {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    });
  }

  function Hydra(apiKey, options) {
    options = options || {};
    this.apiKey = apiKey;
    this.baseUrl = options.baseUrl || 'https://api.hydrapay.io';
    this.timeout = options.timeout || 30000;
    this.headers = options.headers || {};
  }

  Hydra.prototype.request = function (method, path, body) {
    var self = this;
    var url = this.baseUrl + path;

    return new Promise(function (resolve, reject) {
      var xhr = new XMLHttpRequest();
      xhr.open(method, url, true);
      xhr.setRequestHeader('Authorization', 'Bearer ' + self.apiKey);
      xhr.setRequestHeader('Content-Type', 'application/json');
      xhr.setRequestHeader('Idempotency-Key', uuid());
      Object.keys(self.headers).forEach(function (k) {
        xhr.setRequestHeader(k, self.headers[k]);
      });
      xhr.timeout = self.timeout;

      xhr.onload = function () {
        var data = JSON.parse(xhr.responseText);
        if (xhr.status >= 400) {
          var err = new Error(data.error && data.error.message || 'Hydra API error');
          err.statusCode = xhr.status;
          err.code = data.error && data.error.code;
          reject(err);
        } else {
          resolve(data);
        }
      };

      xhr.onerror = function () { reject(new Error('Network error')); };
      xhr.ontimeout = function () { reject(new Error('Request timeout')); };

      xhr.send(body ? JSON.stringify(body) : null);
    });
  };

  Hydra.prototype.payments = {
    create: function (params) { return this.request('POST', '/v1/payments', params); },
    list: function (params) {
      var qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('GET', '/v1/payments' + qs);
    },
    get: function (id) { return this.request('GET', '/v1/payments/' + id); },
    capture: function (id, params) { return this.request('POST', '/v1/payments/' + id + '/capture', params); },
    cancel: function (id) { return this.request('POST', '/v1/payments/' + id + '/cancel'); },
  };

  Hydra.prototype.checkout = {
    create: function (params) { return this.request('POST', '/v1/checkout/sessions', params); },
    get: function (id) { return this.request('GET', '/v1/checkout/sessions/' + id); },
  };

  Hydra.prototype.refunds = {
    create: function (params) { return this.request('POST', '/v1/refunds', params); },
    list: function (params) {
      var qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('GET', '/v1/refunds' + qs);
    },
    get: function (id) { return this.request('GET', '/v1/refunds/' + id); },
  };

  Hydra.prototype.customers = {
    create: function (params) { return this.request('POST', '/v1/customers', params); },
    list: function (params) {
      var qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('GET', '/v1/customers' + qs);
    },
    get: function (id) { return this.request('GET', '/v1/customers/' + id); },
  };

  Hydra.prototype.bankAccounts = {
    validate: function (params) { return this.request('POST', '/v1/bank-accounts/validate', params); },
    create: function (params) { return this.request('POST', '/v1/bank-accounts', params); },
  };

  Hydra.prototype.disputes = {
    list: function (params) {
      var qs = params ? '?' + new URLSearchParams(params).toString() : '';
      return this.request('GET', '/v1/disputes' + qs);
    },
    get: function (id) { return this.request('GET', '/v1/disputes/' + id); },
    update: function (id, params) { return this.request('POST', '/v1/disputes/' + id, params); },
  };

  Hydra.prototype.balance = {
    get: function () { return this.request('GET', '/v1/balance'); },
  };

  global.Hydra = Hydra;
})(typeof window !== 'undefined' ? window : this);
