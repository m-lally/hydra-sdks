import axios, { AxiosInstance, AxiosRequestConfig, AxiosError, InternalAxiosRequestConfig } from 'axios';
import { createHmac, timingSafeEqual } from 'crypto';
import type {
  SDKOptions,
  ApiResponse,
  Account,
  Transaction,
  Wallet,
  SplitRule,
  CardInput,
  CreateTokenResponse,
  CreateIntentResponse,
  CreateRefundResponse,
  CommissionResponse,
} from './types';
import {
  HydraError,
  AuthenticationError,
  ValidationError,
  NotFoundError,
} from './types';

function createSignature(secret: string, message: string): string {
  const hmac = createHmac('sha256', secret);
  hmac.update(message, 'utf8');
  return hmac.digest('base64');
}

function verifySignature(secret: string, message: string, signature: string): boolean {
  const expected = createSignature(secret, message);
  try {
    const sigBuffer = Buffer.from(signature, 'base64');
    const expectedBuffer = Buffer.from(expected, 'base64');
    if (sigBuffer.length !== expectedBuffer.length) return false;
    return timingSafeEqual(sigBuffer, expectedBuffer);
  } catch {
    return false;
  }
}

function parseError(error: AxiosError): HydraError {
  if (error.response) {
    const data = error.response.data as ApiResponse<unknown>;
    const status = error.response.status;
    const message = data?.error || error.message;

    if (status === 401) {
      return new AuthenticationError(message, data);
    }
    if (status === 404) {
      return new NotFoundError(message, data);
    }
    if (status === 400) {
      return new ValidationError(message, data);
    }

    return new HydraError(message, 'API_ERROR', status, data);
  }

  if (error.request) {
    return new HydraError('Network error - no response received', 'NETWORK_ERROR');
  }

  return new HydraError(error.message, 'UNKNOWN_ERROR');
}

export class HydraClient {
  private readonly client: AxiosInstance;
  private readonly apiKey: string;
  private readonly secretKey: string;
  private defaultCurrency: string;
  private locale: string;

  constructor(options: SDKOptions) {
    this.apiKey = options.apiKey;
    this.secretKey = options.secretKey;
    this.defaultCurrency = options.defaultCurrency || 'GBP';
    this.locale = options.locale || 'en';

    const baseURL = options.baseUrl || 'http://localhost:8080';

    this.client = axios.create({
      baseURL,
      timeout: options.timeout || 30000,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    this.client.interceptors.request.use(
      (config: InternalAxiosRequestConfig) => {
        const timestamp = Date.now().toString();
        const method = config.method?.toUpperCase() || 'GET';
        const path = config.url || '';

        let body = '';
        if (config.data) {
          body = JSON.stringify(config.data);
        }

        const message = `${method}:${path}:${timestamp}:${body}`;
        const signature = createSignature(this.secretKey, message);

        config.headers.set('X-API-Key', this.apiKey);
        config.headers.set('X-Timestamp', timestamp);
        config.headers.set('X-Signature', signature);
        config.headers.set('X-Default-Currency', this.defaultCurrency);
        config.headers.set('Accept-Language', this.locale);

        return config;
      },
      (error) => Promise.reject(error)
    );

    this.client.interceptors.response.use(
      (response) => response,
      (error: AxiosError) => {
        return Promise.reject(parseError(error));
      }
    );
  }

  verifyWebhookSignature(payload: string, signature: string): boolean {
    return verifySignature(this.secretKey, payload, signature);
  }

  signMessage(message: string): string {
    return createSignature(this.secretKey, message);
  }

  getBaseUrl(): string {
    return this.client.defaults.baseURL || '';
  }

  setLocale(locale: string): void {
    this.locale = locale;
  }

  setDefaultCurrency(currency: string): void {
    this.defaultCurrency = currency;
  }

  async request<T>(
    method: 'GET' | 'POST' | 'PUT' | 'DELETE',
    path: string,
    data?: unknown,
    config?: AxiosRequestConfig
  ): Promise<ApiResponse<T>> {
    const response = await this.client.request<ApiResponse<T>>({
      method,
      url: path,
      data,
      ...config,
    });
    return response.data;
  }

  async healthCheck(): Promise<{ status: string; version?: string; database?: string }> {
    const response = await this.client.get('/health');
    return response.data;
  }

  async createAccount(ownerId: string, accountType: string, currency?: string): Promise<ApiResponse<Account>> {
    return this.request('POST', '/v1/api/accounts', {
      owner_id: ownerId,
      account_type: accountType,
      currency: currency || this.defaultCurrency,
    });
  }

  async getAccount(id: string): Promise<ApiResponse<Account>> {
    return this.request('GET', `/v1/api/accounts/${id}`);
  }

  async getAccountsByOwner(ownerId: string): Promise<ApiResponse<Account[]>> {
    return this.request('GET', `/v1/api/accounts/owner/${ownerId}`);
  }

  async transfer(sourceId: string, destId: string, amount: string, currency?: string, reference?: string): Promise<ApiResponse<Transaction>> {
    return this.request('POST', '/v1/api/transactions', {
      source_id: sourceId,
      dest_id: destId,
      amount,
      currency: currency || this.defaultCurrency,
      reference,
    });
  }

  async getTransaction(id: string): Promise<ApiResponse<Transaction>> {
    return this.request('GET', `/v1/api/transactions/${id}`);
  }

  async completeTransaction(id: string): Promise<ApiResponse<void>> {
    return this.request('POST', `/v1/api/transactions/${id}/complete`);
  }

  async failTransaction(id: string): Promise<ApiResponse<void>> {
    return this.request('POST', `/v1/api/transactions/${id}/fail`);
  }

  async createWallet(
    ownerId: string,
    walletType: string,
    chain: string,
    address: string,
    encryptedPrivateKey?: string
  ): Promise<ApiResponse<Wallet>> {
    return this.request('POST', '/v1/api/wallets', {
      owner_id: ownerId,
      wallet_type: walletType,
      chain,
      address,
      encrypted_private_key: encryptedPrivateKey,
    });
  }

  async getWallets(ownerId: string): Promise<ApiResponse<Wallet[]>> {
    return this.request('GET', `/v1/api/wallets/owner/${ownerId}`);
  }

  async relayTransaction(walletId: string, signedTransaction: string): Promise<ApiResponse<{ transaction_hash: string }>> {
    return this.request('POST', `/v1/api/wallets/${walletId}/relay`, {
      signed_transaction: signedTransaction,
    });
  }

  async createSplit(total: string, splits: { account_id: string; percentage: number }[], currency?: string, reference?: string): Promise<ApiResponse<SplitRule>> {
    return this.request('POST', '/v1/api/splits', {
      total,
      currency: currency || this.defaultCurrency,
      splits,
      reference,
    });
  }

  async getSplit(id: string): Promise<ApiResponse<SplitRule>> {
    return this.request('GET', `/v1/api/splits/${id}`);
  }

  // ============== Payment Gateway Methods ==============

  async createCardToken(card: CardInput, merchantId?: string): Promise<CreateTokenResponse> {
    const response = await this.client.post('/v1/payments/tokens', {
      card,
      merchant_id: merchantId,
    });
    return response.data;
  }

  async createPaymentIntent(amount: number, currency: string, token?: string, merchantId?: string, idempotencyKey?: string): Promise<CreateIntentResponse> {
    const response = await this.client.post('/v1/payments/intents', {
      amount,
      currency,
      token,
      merchant_id: merchantId,
      idempotency_key: idempotencyKey,
    });
    return response.data;
  }

  async createRefund(chargeId: string, amount?: number): Promise<CreateRefundResponse> {
    const response = await this.client.post('/v1/refunds', {
      charge_id: chargeId,
      amount,
    });
    return response.data;
  }

  async getCommission(): Promise<CommissionResponse> {
    const response = await this.client.get('/v1/commission');
    return response.data;
  }

  async sendWebhookEvent(payload: Record<string, unknown>): Promise<{ received: boolean }> {
    const response = await this.client.post('/v1/webhooks/stripe', payload);
    return response.data;
  }

  async getMetrics(): Promise<string> {
    const response = await this.client.get('/v1/metrics');
    return response.data;
  }
}

export function createHydraClient(options: SDKOptions): HydraClient {
  return new HydraClient(options);
}

export default HydraClient;
