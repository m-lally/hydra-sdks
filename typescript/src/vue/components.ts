import { defineComponent, h, type PropType } from 'vue';
import type { Account, Transaction, Wallet, SplitRule, HealthResponse } from '../types';

// ============================================
// Status Badge
// ============================================

function mapStatusToVariant(status: string): 'success' | 'warning' | 'error' | 'info' | 'default' {
  const lower = status.toLowerCase();
  if (lower === 'completed' || lower === 'healthy' || lower === 'connected') return 'success';
  if (lower === 'pending' || lower === 'degraded') return 'warning';
  if (lower === 'failed' || lower === 'disconnected') return 'error';
  return 'default';
}

export const StatusBadge = defineComponent({
  name: 'StatusBadge',
  props: {
    status: { type: String, required: true },
    variant: { type: String as PropType<'success' | 'warning' | 'error' | 'info' | 'default'>, default: undefined },
  },
  setup(props) {
    const colors: Record<string, string> = {
      success: 'bg-green-100 text-green-800 border-green-200',
      warning: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      error: 'bg-red-100 text-red-800 border-red-200',
      info: 'bg-blue-100 text-blue-800 border-blue-200',
      default: 'bg-gray-100 text-gray-800 border-gray-200',
    };

    return () => {
      const actualVariant = props.variant || mapStatusToVariant(props.status);
      return h('span', {
        class: `inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colors[actualVariant]}`,
      }, props.status);
    };
  },
});

// ============================================
// Account Card
// ============================================

function formatBalance(balance: string, currency: string): string {
  const num = parseFloat(balance);
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(num);
}

export const AccountCard = defineComponent({
  name: 'AccountCard',
  props: {
    account: { type: Object as PropType<Account>, required: true },
    onClick: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    return () => h('div', {
      class: `bg-white rounded-lg shadow-md p-6 border border-gray-200 hover:shadow-lg transition-shadow ${props.onClick ? 'cursor-pointer' : ''}`,
      onClick: props.onClick,
    }, [
      h('div', { class: 'flex justify-between items-start mb-4' }, [
        h('div', [
          h('h3', { class: 'text-lg font-semibold text-gray-900' }, props.account.account_type),
          h('p', { class: 'text-sm text-gray-500' }, `${props.account.id.slice(0, 8)}...`),
        ]),
        h(StatusBadge, { status: props.account.account_type }),
      ]),
      h('div', { class: 'mt-4' }, [
        h('p', { class: 'text-2xl font-bold text-gray-900' }, formatBalance(props.account.balance, props.account.currency)),
        h('p', { class: 'text-sm text-gray-500 mt-1' }, props.account.currency),
      ]),
      h('div', { class: 'mt-4 text-xs text-gray-400' }, `Created: ${new Date(props.account.created_at).toLocaleDateString()}`),
    ]);
  },
});

// ============================================
// Account List
// ============================================

export const AccountList = defineComponent({
  name: 'AccountList',
  props: {
    accounts: { type: Array as PropType<Account[]>, required: true },
    onAccountClick: { type: Function as PropType<(account: Account) => void>, default: undefined },
  },
  setup(props) {
    return () => {
      if (props.accounts.length === 0) {
        return h('div', { class: 'text-center py-12 text-gray-500' }, 'No accounts found');
      }

      return h('div', { class: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4' },
        props.accounts.map((account) =>
          h(AccountCard, {
            key: account.id,
            account,
            onClick: () => props.onAccountClick?.(account),
          })
        )
      );
    };
  },
});

// ============================================
// Transaction Row
// ============================================

export const TransactionRow = defineComponent({
  name: 'TransactionRow',
  props: {
    transaction: { type: Object as PropType<Transaction>, required: true },
    onClick: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    function formatAmount(amount: string, currency: string): string {
      const num = parseFloat(amount);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(num);
    }

    function getDirection(): 'incoming' | 'outgoing' | 'internal' {
      const t = props.transaction;
      if (!t.source_account_id && t.dest_account_id) return 'incoming';
      if (t.source_account_id && !t.dest_account_id) return 'outgoing';
      return 'internal';
    }

    return () => {
      const direction = getDirection();
      const arrow = direction === 'incoming' ? '\u2193' : direction === 'outgoing' ? '\u2191' : '\u2194';

      return h('div', {
        class: `flex items-center justify-between p-4 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors ${props.onClick ? 'cursor-pointer' : ''}`,
        onClick: props.onClick,
      }, [
        h('div', { class: 'flex items-center space-x-4' }, [
          h('div', {
            class: `w-10 h-10 rounded-full flex items-center justify-center ${
              direction === 'incoming' ? 'bg-green-100 text-green-600'
              : direction === 'outgoing' ? 'bg-red-100 text-red-600'
              : 'bg-gray-100 text-gray-600'
            }`,
          }, [
            h('span', { class: 'text-lg font-bold' }, arrow),
          ]),
          h('div', [
            h('p', { class: 'font-medium text-gray-900' }, props.transaction.transaction_type),
            h('p', { class: 'text-sm text-gray-500' }, props.transaction.reference || 'No reference'),
          ]),
        ]),
        h('div', { class: 'text-right' }, [
          h('p', {
            class: `font-semibold ${
              direction === 'incoming' ? 'text-green-600'
              : direction === 'outgoing' ? 'text-red-600'
              : 'text-gray-600'
            }`,
          }, `${direction === 'outgoing' ? '-' : ''}${formatAmount(props.transaction.amount, props.transaction.currency)}`),
          h(StatusBadge, { status: props.transaction.status }),
        ]),
      ]);
    };
  },
});

// ============================================
// Transaction List
// ============================================

export const TransactionList = defineComponent({
  name: 'TransactionList',
  props: {
    transactions: { type: Array as PropType<Transaction[]>, required: true },
    onTransactionClick: { type: Function as PropType<(transaction: Transaction) => void>, default: undefined },
  },
  setup(props) {
    return () => {
      if (props.transactions.length === 0) {
        return h('div', { class: 'text-center py-12 text-gray-500' }, 'No transactions found');
      }

      return h('div', { class: 'space-y-3' },
        props.transactions.map((tx) =>
          h(TransactionRow, {
            key: tx.id,
            transaction: tx,
            onClick: () => props.onTransactionClick?.(tx),
          })
        )
      );
    };
  },
});

// ============================================
// Wallet Card
// ============================================

function getChainIcon(chain: string): string {
  const icons: Record<string, string> = {
    ethereum: '\u27D0',
    bitcoin: '\u20BF',
    solana: '\u25CE',
    polygon: '\u2B21',
  };
  return icons[chain.toLowerCase()] || '\u25CF';
}

export const WalletCard = defineComponent({
  name: 'WalletCard',
  props: {
    wallet: { type: Object as PropType<Wallet>, required: true },
    onRelay: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props) {
    return () => h('div', { class: 'bg-white rounded-lg shadow-md p-6 border border-gray-200' }, [
      h('div', { class: 'flex justify-between items-start mb-4' }, [
        h('div', { class: 'flex items-center space-x-3' }, [
          h('div', {
            class: 'w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center text-white text-xl',
          }, getChainIcon(props.wallet.chain)),
          h('div', [
            h('h3', { class: 'font-semibold text-gray-900 capitalize' }, props.wallet.chain),
            h('p', { class: 'text-sm text-gray-500' }, props.wallet.wallet_type),
          ]),
        ]),
        h(StatusBadge, {
          status: props.wallet.is_custodial ? 'Custodial' : 'Non-Custodial',
          variant: props.wallet.is_custodial ? 'warning' : 'info',
        }),
      ]),
      h('div', { class: 'mt-4' }, [
        h('p', { class: 'text-sm font-mono text-gray-600 break-all' }, props.wallet.address),
      ]),
      props.onRelay ? h('button', {
        onClick: props.onRelay,
        class: 'mt-4 w-full py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors',
      }, 'Relay Transaction') : null,
    ]);
  },
});

// ============================================
// Wallet List
// ============================================

export const WalletList = defineComponent({
  name: 'WalletList',
  props: {
    wallets: { type: Array as PropType<Wallet[]>, required: true },
    onRelay: { type: Function as PropType<(wallet: Wallet) => void>, default: undefined },
  },
  setup(props) {
    return () => {
      if (props.wallets.length === 0) {
        return h('div', { class: 'text-center py-12 text-gray-500' }, 'No wallets found');
      }

      return h('div', { class: 'grid grid-cols-1 md:grid-cols-2 gap-4' },
        props.wallets.map((wallet) =>
          h(WalletCard, {
            key: wallet.id,
            wallet,
            onRelay: () => props.onRelay?.(wallet),
          })
        )
      );
    };
  },
});

// ============================================
// Split Rule Card
// ============================================

export const SplitRuleCard = defineComponent({
  name: 'SplitRuleCard',
  props: {
    split: { type: Object as PropType<SplitRule>, required: true },
  },
  setup(props) {
    function formatAmount(amount: string, currency: string): string {
      const num = parseFloat(amount);
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency,
      }).format(num);
    }

    return () => h('div', { class: 'bg-white rounded-lg shadow-md p-6 border border-gray-200' }, [
      h('div', { class: 'flex justify-between items-center mb-4' }, [
        h('h3', { class: 'text-lg font-semibold text-gray-900' }, 'Split Rule'),
        h(StatusBadge, { status: props.split.status }),
      ]),
      h('div', { class: 'mb-4' }, [
        h('p', { class: 'text-2xl font-bold text-gray-900' }, formatAmount(props.split.total, props.split.currency)),
      ]),
      h('div', { class: 'space-y-2' },
        props.split.splits.map((entry, index) =>
          h('div', { key: index, class: 'flex justify-between items-center p-2 bg-gray-50 rounded' }, [
            h('span', { class: 'font-mono text-sm text-gray-600' }, `${entry.account_id.slice(0, 8)}...`),
            h('span', { class: 'font-semibold text-gray-900' }, `${entry.percentage}%`),
          ])
        )
      ),
    ]);
  },
});

// ============================================
// Health Status
// ============================================

export const HealthStatus = defineComponent({
  name: 'HealthStatus',
  props: {
    health: { type: Object as PropType<HealthResponse | null>, default: null },
    loading: { type: Boolean, default: false },
  },
  setup(props) {
    return () => {
      if (props.loading) {
        return h('div', { class: 'flex items-center space-x-2 text-gray-500' }, [
          h('div', { class: 'animate-spin w-4 h-4 border-2 border-gray-500 border-t-transparent rounded-full' }),
          h('span', 'Checking health...'),
        ]);
      }

      if (!props.health) {
        return h(StatusBadge, { status: 'Unknown', variant: 'default' });
      }

      const isHealthy = props.health.status === 'healthy' && props.health.database === 'connected';

      return h('div', { class: 'flex items-center space-x-4' }, [
        h(StatusBadge, { status: props.health.status, variant: isHealthy ? 'success' : 'error' }),
        h('span', { class: 'text-sm text-gray-600' }, `v${props.health.version}`),
        h(StatusBadge, { status: props.health.database, variant: props.health.database === 'connected' ? 'success' : 'error' }),
      ]);
    };
  },
});

// ============================================
// Loading Spinner
// ============================================

export const LoadingSpinner = defineComponent({
  name: 'LoadingSpinner',
  props: {
    size: { type: String as PropType<'sm' | 'md' | 'lg'>, default: 'md' },
  },
  setup(props) {
    const sizes: Record<string, string> = {
      sm: 'w-4 h-4',
      md: 'w-8 h-8',
      lg: 'w-12 h-12',
    };

    return () => h('div', {
      class: `${sizes[props.size]} animate-spin border-4 border-gray-200 border-t-blue-600 rounded-full`,
    });
  },
});

// ============================================
// Error Display
// ============================================

export const ErrorDisplay = defineComponent({
  name: 'ErrorDisplay',
  props: {
    error: { type: Object as PropType<Error | null>, default: null },
    onRetry: { type: Function as PropType<() => void>, default: undefined },
  },
  setup(props, { slots }) {
    return () => {
      if (!props.error) return null;

      return h('div', { class: 'bg-red-50 border border-red-200 rounded-lg p-4' }, [
        h('div', { class: 'flex items-start' }, [
          h('div', { class: 'flex-shrink-0' }, [
            h('span', { class: 'text-red-500 text-xl' }, '\u26A0'),
          ]),
          h('div', { class: 'ml-3' }, [
            h('h3', { class: 'text-sm font-medium text-red-800' }, 'Error'),
            h('p', { class: 'text-sm text-red-600 mt-1' }, props.error.message),
            props.onRetry ? h('button', {
              onClick: props.onRetry,
              class: 'mt-2 text-sm text-red-700 hover:text-red-900 font-medium',
            }, 'Try again') : null,
          ]),
          slots.default ? slots.default() : null,
        ]),
      ]);
    };
  },
});

// ============================================
// Dashboard Layout
// ============================================

export const DashboardLayout = defineComponent({
  name: 'DashboardLayout',
  props: {
    title: { type: String, default: 'Hydra Payments' },
    health: { type: Object as PropType<HealthResponse | null>, default: null },
  },
  setup(props, { slots }) {
    return () => h('div', { class: 'min-h-screen bg-gray-50' }, [
      h('header', { class: 'bg-white shadow-sm' }, [
        h('div', { class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4' }, [
          h('div', { class: 'flex justify-between items-center' }, [
            h('h1', { class: 'text-2xl font-bold text-gray-900' }, props.title),
            props.health ? h(HealthStatus, { health: props.health }) : null,
          ]),
        ]),
      ]),
      h('main', { class: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8' }, slots.default?.()),
    ]);
  },
});

// ============================================
// Card
// ============================================

export const Card = defineComponent({
  name: 'Card',
  props: {
    title: { type: String, default: undefined },
  },
  setup(props, { slots }) {
    return () => h('div', { class: 'bg-white rounded-lg shadow-md border border-gray-200' }, [
      (props.title || slots.actions) ? h('div', {
        class: 'px-6 py-4 border-b border-gray-200 flex justify-between items-center',
      }, [
        props.title ? h('h2', { class: 'text-lg font-semibold text-gray-900' }, props.title) : null,
        slots.actions ? slots.actions() : null,
      ]) : null,
      h('div', { class: 'p-6' }, slots.default?.()),
    ]);
  },
});

// ============================================
// Button
// ============================================

export const Button = defineComponent({
  name: 'Button',
  props: {
    variant: { type: String as PropType<'primary' | 'secondary' | 'danger'>, default: 'primary' },
    loading: { type: Boolean, default: false },
    disabled: { type: Boolean, default: false },
  },
  emits: ['click'],
  setup(props, { emit, slots, attrs }) {
    const variants: Record<string, string> = {
      primary: 'bg-blue-600 hover:bg-blue-700 text-white',
      secondary: 'bg-gray-200 hover:bg-gray-300 text-gray-900',
      danger: 'bg-red-600 hover:bg-red-700 text-white',
    };

    return () => h('button', {
      class: `px-4 py-2 rounded-md font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed ${variants[props.variant]}`,
      disabled: props.disabled || props.loading,
      onClick: () => emit('click'),
      ...attrs,
    }, props.loading
      ? [
          h('span', { class: 'flex items-center' }, [
            h('span', { class: 'w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2' }),
            'Loading...',
          ]),
        ]
      : slots.default?.()
    );
  },
});

// ============================================
// Input
// ============================================

export const Input = defineComponent({
  name: 'Input',
  props: {
    label: { type: String, default: undefined },
    error: { type: String, default: undefined },
    modelValue: { type: String, default: '' },
  },
  emits: ['update:modelValue'],
  setup(props, { emit, attrs }) {
    return () => h('div', { class: 'mb-4' }, [
      props.label ? h('label', { class: 'block text-sm font-medium text-gray-700 mb-1' }, props.label) : null,
      h('input', {
        class: `w-full px-3 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 ${
          props.error ? 'border-red-500' : 'border-gray-300'
        }`,
        value: props.modelValue,
        onInput: (e: Event) => emit('update:modelValue', (e.target as HTMLInputElement).value),
        ...attrs,
      }),
      props.error ? h('p', { class: 'mt-1 text-sm text-red-600' }, props.error) : null,
    ]);
  },
});
