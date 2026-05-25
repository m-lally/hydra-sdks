import axios, { AxiosInstance } from 'axios';

export interface HydraConfig {
  apiUrl: string;
  secretKey: string;
}

export class HydraClient {
  private axiosInstance: AxiosInstance;

  constructor(config: HydraConfig) {
    this.axiosInstance = axios.create({
      baseURL: config.apiUrl,
      headers: {
        'Authorization': `Bearer ${config.secretKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  // Payment Intents
  async createPaymentIntent(params: {
    amount: number; // in smallest currency unit (e.g., cents)
    currency: string;
    description?: string;
    paymentMethod?: string;
    metadata?: Record<string, any>;
  }) {
    const response = await this.axiosInstance.post('/v1/payment_intents', params);
    return response.data;
  }

  async confirmPaymentIntent(intentId: string, params?: {
    paymentMethod?: string;
    returnUrl?: string;
  }) {
    const response = await this.axiosInstance.post(`/v1/payment_intents/${intentId}/confirm`, params);
    return response.data;
  }

  async retrievePaymentIntent(intentId: string) {
    const response = await this.axiosInstance.get(`/v1/payment_intents/${intentId}`);
    return response.data;
  }

  async refundPaymentIntent(intentId: string, params?: {
    amount?: number; // in smallest currency unit
    reason?: string;
    metadata?: Record<string, any>;
  }) {
    const response = await this.axiosInstance.post(`/v1/payment_intents/${intentId}/refund`, params);
    return response.data;
  }

  // Customers
  async createCustomer(params: {
    email?: string;
    name?: string;
    phone?: string;
    address?: {
      line1?: string;
      line2?: string;
      city?: string;
      state?: string;
      postal_code?: string;
      country?: string;
    };
    metadata?: Record<string, any>;
  }) {
    const response = await this.axiosInstance.post('/v1/customers', params);
    return response.data;
  }

  async retrieveCustomer(customerId: string) {
    const response = await this.axiosInstance.get(`/v1/customers/${customerId}`);
    return response.data;
  }

  // Payment Methods
  async listPaymentMethods(customerId: string, params?: {
    type?: string; // e.g., 'card'
  }) {
    const response = await this.axiosInstance.get(`/v1/customers/${customerId}/payment_methods`, { params });
    return response.data;
  }

  // Setup Intents (for saving payment methods for later use)
  async createSetupIntent(params: {
    customer?: string;
    paymentMethodTypes?: string[]; // e.g., ['card']
    usage?: string; // 'off_session' or 'on_session'
    metadata?: Record<string, any>;
  }) {
    const response = await this.axiosInstance.post('/v1/setup_intents', params);
    return response.data;
  }

  async confirmSetupIntent(intentId: string, params?: {
    paymentMethod?: string;
    returnUrl?: string;
  }) {
    const response = await this.axiosInstance.post(`/v1/setup_intents/${intentId}/confirm`, params);
    return response.data;
  }
}