/**
 * Hydra Payment Service - React Native SDK
 *
 * Core client and types — no React Native dependency.
 * For React Native hooks/components import from '@hydra-payments/react-native-sdk/components'.
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
