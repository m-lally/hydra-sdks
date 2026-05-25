/**
 * TypeScript type definitions for Hydra Payment Service
 * Matches the Rust API models exactly
 */

import type { AxiosInstance, AxiosRequestConfig } from 'axios';

// ============================================
// Account Types
// ============================================

export type AccountType = 'company' | 'personal' | 'fractional';

export interface Account {
  id: string;
  owner_id: string;
  account_type: string;
  currency: string;
  balance: string;
  metadata?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateAccountRequest {
  owner_id: string;
  account_type: string;
  currency?: string;
}

// ============================================
// Transaction Types
// ============================================

export type TransactionStatus = 'pending' | 'completed' | 'failed';
export type TransactionType = 'transfer' | 'credit' | 'debit';

export interface Transaction {
  id: string;
  source_account_id?: string;
  dest_account_id?: string;
  amount: string;
  currency: string;
  status: string;
  transaction_type: string;
  reference?: string;
  created_at: string;
}

export interface TransferRequest {
  source_id: string;
  dest_id: string;
  amount: string;
  currency?: string;
  reference?: string;
}

export interface CreditRequest {
  dest_id: string;
  amount: string;
  currency?: string;
  reference?: string;
}

export interface DebitRequest {
  source_id: string;
  amount: string;
  currency?: string;
  reference?: string;
}

// ============================================
// Wallet Types
// ============================================

export type WalletType = 'custodial' | 'non-custodial';
export type ChainType = 'ethereum' | 'bitcoin' | 'solana' | 'polygon';

export interface Wallet {
  id: string;
  owner_id: string;
  wallet_type: string;
  chain: string;
  address: string;
  is_custodial: boolean;
  created_at: string;
}

export interface CreateWalletRequest {
  owner_id: string;
  wallet_type: string;
  chain: string;
  address: string;
  encrypted_private_key?: string;
}

export interface RelayRequest {
  signed_transaction: string;
}

export interface RelayResponse {
  transaction_hash: string;
}

// ============================================
// Split Rule Types
// ============================================

export interface SplitEntry {
  account_id: string;
  percentage: number;
}

export interface SplitRule {
  id: string;
  total: string;
  currency: string;
  splits: SplitEntry[];
  status: string;
  created_at: string;
}

export interface CreateSplitRequest {
  total: string;
  currency?: string;
  splits: SplitEntry[];
  reference?: string;
}

// ============================================
// Generic API Response
// ============================================

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
}

// ============================================
// Health Check
// ============================================

export interface HealthResponse {
  status: string;
  version: string;
  database: string;
}

// ============================================
// Payment Gateway Types
// ============================================

export interface CardInput {
  number: string;
  exp_month: number;
  exp_year: number;
  cvc: string;
}

export interface CardDetails {
  brand: string;
  last4: string;
  exp_month: number;
  exp_year: number;
}

export interface CreateTokenRequest {
  card: CardInput;
  merchant_id?: string;
}

export interface CreateTokenResponse {
  id: string;
  card: CardDetails;
  created_at: string;
}

export interface CreateIntentRequest {
  amount: number;
  currency: string;
  token?: string;
  merchant_id?: string;
  idempotency_key?: string;
}

export interface CreateIntentResponse {
  id: string;
  status: string;
  amount: number;
  currency: string;
  client_secret: string;
}

export interface CreateRefundRequest {
  charge_id: string;
  amount?: number;
}

export interface CreateRefundResponse {
  id: string;
  status: string;
  amount: number;
  charge: string;
}

export interface CommissionResponse {
  total_commission: number;
}

// ============================================
// Configuration Types
// ============================================

export interface HydraConfig {
  baseUrl: string;
  apiKey: string;
  secretKey: string;
  timeout?: number;
  defaultCurrency?: string;
  locale?: string;
}

// ============================================
// SDK Options
// ============================================

export interface SDKOptions {
  baseUrl?: string;
  apiKey: string;
  secretKey: string;
  timeout?: number;
  defaultCurrency?: string;
  locale?: string;
}

// ============================================
// Error Types
// ============================================

export class HydraError extends Error {
  constructor(
    message: string,
    public code?: string,
    public statusCode?: number,
    public details?: unknown
  ) {
    super(message);
    this.name = 'HydraError';
  }
}

export class AuthenticationError extends HydraError {
  constructor(message: string, details?: unknown) {
    super(message, 'AUTHENTICATION_ERROR', 401, details);
    this.name = 'AuthenticationError';
  }
}

export class ValidationError extends HydraError {
  constructor(message: string, details?: unknown) {
    super(message, 'VALIDATION_ERROR', 400, details);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends HydraError {
  constructor(message: string, details?: unknown) {
    super(message, 'NOT_FOUND', 404, details);
    this.name = 'NotFoundError';
  }
}