/**
 * Hydra Payment Service - TypeScript SDK
 * 
 * Core client and types — no React dependency.
 * For React hooks/components import from '@hydra-payments/sdk/react'.
 */

export { HydraClient, createHydraClient } from './client';
export type { 
  SDKOptions,
  HydraConfig,
  ApiResponse,
  Account,
  AccountType,
  CreateAccountRequest,
  Transaction,
  TransactionStatus,
  TransactionType,
  TransferRequest,
  CreditRequest,
  DebitRequest,
  Wallet,
  WalletType,
  ChainType,
  CreateWalletRequest,
  RelayRequest,
  RelayResponse,
  SplitRule,
  SplitEntry,
  CreateSplitRequest,
  HealthResponse,
  CardInput,
  CardDetails,
  CreateTokenRequest,
  CreateTokenResponse,
  CreateIntentRequest,
  CreateIntentResponse,
  CreateRefundRequest,
  CreateRefundResponse,
  CommissionResponse,
} from './types';
export { HydraError, AuthenticationError, ValidationError, NotFoundError } from './types';

