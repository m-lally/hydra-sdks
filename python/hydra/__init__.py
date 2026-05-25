import json
import uuid
from http.client import HTTPSConnection
from urllib.parse import urlencode


class HydraError(Exception):
    def __init__(self, message, status_code=None, code=None, type=None, param=None):
        super().__init__(message)
        self.status_code = status_code
        self.code = code
        self.type = type
        self.param = param


class HydraResource:
    def __init__(self, client):
        self._client = client


class Payments(HydraResource):
    def create(self, **params):
        return self._client.request('POST', '/v1/payments', params)

    def list(self, **params):
        return self._client.request('GET', f'/v1/payments?{urlencode(params)}')

    def get(self, id):
        return self._client.request('GET', f'/v1/payments/{id}')

    def capture(self, id, **params):
        return self._client.request('POST', f'/v1/payments/{id}/capture', params)

    def cancel(self, id):
        return self._client.request('POST', f'/v1/payments/{id}/cancel')


class Checkout(HydraResource):
    def create(self, **params):
        return self._client.request('POST', '/v1/checkout/sessions', params)

    def get(self, id):
        return self._client.request('GET', f'/v1/checkout/sessions/{id}')


class Refunds(HydraResource):
    def create(self, **params):
        return self._client.request('POST', '/v1/refunds', params)

    def list(self, **params):
        return self._client.request('GET', f'/v1/refunds?{urlencode(params)}')

    def get(self, id):
        return self._client.request('GET', f'/v1/refunds/{id}')


class Customers(HydraResource):
    def create(self, **params):
        return self._client.request('POST', '/v1/customers', params)

    def list(self, **params):
        return self._client.request('GET', f'/v1/customers?{urlencode(params)}')

    def get(self, id):
        return self._client.request('GET', f'/v1/customers/{id}')


class BankAccounts(HydraResource):
    def validate(self, **params):
        return self._client.request('POST', '/v1/bank-accounts/validate', params)

    def create(self, **params):
        return self._client.request('POST', '/v1/bank-accounts', params)


class Disputes(HydraResource):
    def list(self, **params):
        return self._client.request('GET', f'/v1/disputes?{urlencode(params)}')

    def get(self, id):
        return self._client.request('GET', f'/v1/disputes/{id}')

    def update(self, id, **params):
        return self._client.request('POST', f'/v1/disputes/{id}', params)


class Balance(HydraResource):
    def get(self):
        return self._client.request('GET', '/v1/balance')


class Hydra:
    def __init__(self, api_key, base_url='https://api.hydrapay.io', timeout=30):
        self.api_key = api_key
        self.base_url = base_url.rstrip('/')
        self.timeout = timeout

    def request(self, method, path, body=None):
        url = self.base_url + path
        parsed = url.replace('https://', '').split('/', 1)
        host = parsed[0]
        endpoint = '/' + parsed[1] if len(parsed) > 1 else '/'

        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json',
            'Idempotency-Key': str(uuid.uuid4()),
        }

        conn = HTTPSConnection(host, timeout=self.timeout)
        try:
            data = json.dumps(body) if body else None
            conn.request(method, endpoint, body=data, headers=headers)
            response = conn.getresponse()
            resp_body = json.loads(response.read().decode())

            if response.status >= 400:
                err = resp_body.get('error', resp_body)
                raise HydraError(
                    message=err.get('message', 'Hydra API error'),
                    status_code=response.status,
                    code=err.get('code'),
                    type=err.get('type'),
                    param=err.get('param'),
                )
            return resp_body
        finally:
            conn.close()

    @property
    def payments(self):
        return Payments(self)

    @property
    def checkout(self):
        return Checkout(self)

    @property
    def refunds(self):
        return Refunds(self)

    @property
    def customers(self):
        return Customers(self)

    @property
    def bank_accounts(self):
        return BankAccounts(self)

    @property
    def disputes(self):
        return Disputes(self)

    @property
    def balance(self):
        return Balance(self)
