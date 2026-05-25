/**
 * Hydra Payment Service - React Components
 * 
 * Production-ready UI components for payment dashboards
 */

import React from 'react';
import type { Account, Transaction, Wallet, SplitRule, HealthResponse } from '../types';

// ============================================
// Status Badge Component
// ============================================

interface StatusBadgeProps {
  status: string;
  variant?: 'success' | 'warning' | 'error' | 'info' | 'default';
}

function mapStatusToVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  const lower = status.toLowerCase();
  if (lower === 'completed' || lower === 'healthy' || lower === 'connected') return 'success';
  if (lower === 'pending' || lower === 'degraded') return 'warning';
  if (lower === 'failed' || lower === 'disconnected') return 'error';
  return 'default';
}

export function StatusBadge({ status, variant }: StatusBadgeProps): JSX.Element {
  const actualVariant = variant || mapStatusToVariant(status);
  
  const colors = {
    success: 'bg-green-100 text-green-800 border-green-200',
    warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    error: 'bg-red-100 text-red-800 border-red-200',
    info: 'bg-blue-100 text-blue-800 border-blue-200',
    default: 'bg-gray-100 text-gray-800 border-gray-200',
  };
  
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[actualVariant]}`}>
      {status}
    </span>
  );
}

// ============================================
// Account Card Component
// ============================================

interface AccountCardProps {
  account: Account;
  onClick?: () => void;
}

export function AccountCard({ account, onClick }: AccountCardProps): JSX.Element {
  const formatBalance = (balance: string, currency: string): string => {
    const num = parseFloat(balance);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(num);
  };

  return (
    <div 
      className={`bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{account.account_type}</h3>
          <p className="text-sm text-gray-500">{account.id.slice(0, 8)}...</p>
        </div>
        <StatusBadge status={account.account_type} />
      </div>
      <div className="mt-4">
        <p className="text-2xl font-bold text-gray-900">{formatBalance(account.balance, account.currency)}</p>
        <p className="text-sm text-gray-500 mt-1">{account.currency}</p>
      </div>
      <div className="mt-4 text-xs text-gray-400">
        Created: {new Date(account.created_at).toLocaleDateString()}
      </div>
    </div>
  );
}

// ============================================
// Account List Component
// ============================================

interface AccountListProps {
  accounts: Account[];
  onAccountClick?: (account: Account) => void;
}

export function AccountList({ accounts, onAccountClick }: AccountListProps): JSX.Element {
  if (accounts.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No accounts found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {accounts.map((account) => (
        <AccountCard 
          key={account.id} 
          account={account}
          onClick={() => onAccountClick?.(account)}
        />
      ))}
    </div>
  );
}

// ============================================
// Transaction Row Component
// ============================================

interface TransactionRowProps {
  transaction: Transaction;
  onClick?: () => void;
}

export function TransactionRow({ transaction, onClick }: TransactionRowProps): JSX.Element {
  const formatAmount = (amount: string, currency: string): string => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(num);
  };

  const getDirection = (): 'incoming' | 'outgoing' | 'internal' => {
    if (!transaction.source_account_id && transaction.dest_account_id) return 'incoming';
    if (transaction.source_account_id && !transaction.dest_account_id) return 'outgoing';
    return 'internal';
  };

  const direction = getDirection();
  const arrow = direction === 'incoming' ? '↓' : direction === 'outgoing' ? '↑' : '↔';

  return (
    <div 
      className={`flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-center space-x-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
          direction === 'incoming' ? 'bg-green-100 text-green-600' :
          direction === 'outgoing' ? 'bg-red-100 text-red-600' :
          'bg-gray-100 text-gray-600'
        }`}>
          <span className="text-lg font-bold">{arrow}</span>
        </div>
        <div>
          <p className="font-medium text-gray-900">{transaction.transaction_type}</p>
          <p className="text-sm text-gray-500">{transaction.reference || 'No reference'}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-semibold ${
          direction === 'incoming' ? 'text-green-600' :
          direction === 'outgoing' ? 'text-red-600' :
          'text-gray-600'
        }`}>
          {direction === 'outgoing' ? '-' : ''}{formatAmount(transaction.amount, transaction.currency)}
        </p>
        <StatusBadge status={transaction.status} />
      </div>
    </div>
  );
}

// ============================================
// Transaction List Component
// ============================================

interface TransactionListProps {
  transactions: Transaction[];
  onTransactionClick?: (transaction: Transaction) => void;
}

export function TransactionList({ transactions, onTransactionClick }: TransactionListProps): JSX.Element {
  if (transactions.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No transactions found
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {transactions.map((transaction) => (
        <TransactionRow 
          key={transaction.id}
          transaction={transaction}
          onClick={() => onTransactionClick?.(transaction)}
        />
      ))}
    </div>
  );
}

// ============================================
// Wallet Card Component
// ============================================

interface WalletCardProps {
  wallet: Wallet;
  onRelay?: () => void;
}

export function WalletCard({ wallet, onRelay }: WalletCardProps): JSX.Element {
  const getChainIcon = (chain: string): string => {
    const icons: Record<string, string> = {
      ethereum: '⟐',
      bitcoin: '₿',
      solana: '◎',
      polygon: '⬡',
    };
    return icons[chain.toLowerCase()] || '●';
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-start mb-4">
        <div className="flex items-center space-x-3">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xl">
            {getChainIcon(wallet.chain)}
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 capitalize">{wallet.chain}</h3>
            <p className="text-sm text-gray-500">{wallet.wallet_type}</p>
          </div>
        </div>
        <StatusBadge status={wallet.is_custodial ? 'Custodial' : 'Non-Custodial'} variant={wallet.is_custodial ? 'warning' : 'info'} />
      </div>
      <div className="mt-4">
        <p className="text-sm font-mono text-gray-600 break-all">{wallet.address}</p>
      </div>
      {onRelay && (
        <button 
          onClick={onRelay}
          className="mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          Relay Transaction
        </button>
      )}
    </div>
  );
}

// ============================================
// Wallet List Component
// ============================================

interface WalletListProps {
  wallets: Wallet[];
  onRelay?: (wallet: Wallet) => void;
}

export function WalletList({ wallets, onRelay }: WalletListProps): JSX.Element {
  if (wallets.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        No wallets found
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {wallets.map((wallet) => (
        <WalletCard key={wallet.id} wallet={wallet} onRelay={() => onRelay?.(wallet)} />
      ))}
    </div>
  );
}

// ============================================
// Split Rule Display Component
// ============================================

interface SplitRuleCardProps {
  split: SplitRule;
}

export function SplitRuleCard({ split }: SplitRuleCardProps): JSX.Element {
  const formatAmount = (amount: string, currency: string): string => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
    }).format(num);
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6 border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Split Rule</h3>
        <StatusBadge status={split.status} />
      </div>
      <div className="mb-4">
        <p className="text-2xl font-bold text-gray-900">{formatAmount(split.total, split.currency)}</p>
      </div>
      <div className="space-y-2">
        {split.splits.map((entry, index) => (
          <div key={index} className="flex justify-between items-center p-2 bg-gray-50 rounded">
            <span className="font-mono text-sm text-gray-600">{entry.account_id.slice(0, 8)}...</span>
            <span className="font-semibold text-gray-900">{entry.percentage}%</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================
// Health Status Component
// ============================================

interface HealthStatusProps {
  health: HealthResponse | null;
  loading?: boolean;
}

export function HealthStatus({ health, loading }: HealthStatusProps): JSX.Element {
  if (loading) {
    return (
      <div className="flex items-center space-x-2 text-gray-500">
        <div className="animate-spin w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full" />
        <span>Checking health...</span>
      </div>
    );
  }

  if (!health) {
    return <StatusBadge status="Unknown" variant="default" />;
  }

  const isHealthy = health.status === 'healthy' && health.database === 'connected';

  return (
    <div className="flex items-center space-x-4">
      <StatusBadge status={health.status} variant={isHealthy ? 'success' : 'error'} />
      <span className="text-sm text-gray-600">v{health.version}</span>
      <StatusBadge status={health.database} variant={health.database === 'connected' ? 'success' : 'error'} />
    </div>
  );
}

// ============================================
// Loading Spinner Component
// ============================================

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
}

export function LoadingSpinner({ size = 'md' }: LoadingSpinnerProps): JSX.Element {
  const sizes = {
    sm: 'w-4 h-4',
    md: 'w-8 h-8',
    lg: 'w-12 h-12',
  };

  return (
    <div className={`${sizes[size]} animate-spin border-4 border-gray-200 border-t-blue-600 rounded-full`} />
  );
}

// ============================================
// Error Display Component
// ============================================

interface ErrorDisplayProps {
  error: Error | null;
  onRetry?: () => void;
}

export function ErrorDisplay({ error, onRetry }: ErrorDisplayProps): JSX.Element {
  if (!error) return <></>;

  return (
    <div className="bg-red-50 border border-red-200 rounded-lg p-4">
      <div className="flex items-start">
        <div className="flex-shrink-0">
          <span className="text-red-500 text-xl">⚠</span>
        </div>
        <div className="ml-3">
          <h3 className="text-sm font-medium text-red-800">Error</h3>
          <p className="text-sm text-red-600 mt-1">{error.message}</p>
          {onRetry && (
            <button 
              onClick={onRetry}
              className="mt-2 text-sm text-red-700 hover:text-red-900 font-medium"
            >
              Try again
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================
// Dashboard Layout Component
// ============================================

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  health?: HealthResponse | null;
}

export function DashboardLayout({ children, title = 'Hydra Payments', health }: DashboardLayoutProps): JSX.Element {
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold text-gray-900">{title}</h1>
            {health && <HealthStatus health={health} />}
          </div>
        </div>
      </header>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {children}
      </main>
    </div>
  );
}

// ============================================
// Card Component
// ============================================

interface CardProps {
  title?: string;
  children: React.ReactNode;
  actions?: React.ReactNode;
}

export function Card({ title, children, actions }: CardProps): JSX.Element {
  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200">
      {(title || actions) && (
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center">
          {title && <h2 className="text-lg font-semibold text-gray-900">{title}</h2>}
          {actions}
        </div>
      )}
      <div className="p-6">{children}</div>
    </div>
  );
}

// ============================================
// Button Component
// ============================================

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger';
  loading?: boolean;
}

export function Button({ 
  children, 
  variant = 'primary', 
  loading = false, 
  disabled,
  className = '',
  ...props 
}: ButtonProps): JSX.Element {
  const variants = {
    primary: 'bg-blue-600 hover:bg-blue-700 text-white',
    secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
    danger: 'bg-red-600 hover:bg-red-700 text-white',
  };

  return (
    <button 
      className={`px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center">
          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
          Loading...
        </span>
      ) : children}
    </button>
  );
}

// ============================================
// Input Component
// ============================================

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export function Input({ label, error, className = '', ...props }: InputProps): JSX.Element {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <input 
        className={`w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          error ? 'border-red-500' : 'border-gray-300'
        } ${className}`}
        {...props}
      />
      {error && (
        <p className="mt-1 text-sm text-red-600">{error}</p>
      )}
    </div>
  );
}

// ============================================
// Export all components
// ============================================

export default {
  StatusBadge,
  AccountCard,
  AccountList,
  TransactionRow,
  TransactionList,
  WalletCard,
  WalletList,
  SplitRuleCard,
  HealthStatus,
  LoadingSpinner,
  ErrorDisplay,
  DashboardLayout,
  Card,
  Button,
  Input,
};