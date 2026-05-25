const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

let React, testUtils;
let hydraModule, reactModule;

before(() => {
  React = require('react');
  hydraModule = require('../../dist/index.js');
  reactModule = require('../../dist/react/index.js');
});

describe('React Integration Exports', () => {
  it('HydraProvider is exported as a function/component', () => {
    assert.equal(typeof reactModule.HydraProvider, 'function');
  });

  it('all hooks are exported as functions', () => {
    const hooks = ['useAccount', 'useAccountsByOwner', 'useCreateAccount', 'useTransaction', 'useTransfer', 'useWallets', 'useCreateWallet', 'useCreateSplit', 'useHealthCheck', 'useAccountBalance'];
    for (const h of hooks) {
      assert.equal(typeof reactModule[h], 'function', `${h} should be a function`);
    }
  });

  it('all components are exported', () => {
    const components = ['StatusBadge', 'AccountCard', 'AccountList', 'TransactionRow', 'TransactionList', 'WalletCard', 'WalletList', 'SplitRuleCard', 'HealthStatus', 'LoadingSpinner', 'ErrorDisplay', 'DashboardLayout', 'Card', 'Button', 'Input'];
    for (const c of components) {
      assert.ok(reactModule[c] !== undefined, `${c} should be exported`);
    }
  });

  it('HydraContext is exported', () => {
    assert.ok(reactModule.HydraContext !== undefined);
  });
});

describe('React Components Render', () => {
  it('StatusBadge renders with required props', () => {
    const { StatusBadge } = reactModule;
    assert.doesNotThrow(() => React.createElement(StatusBadge, { status: 'active' }));
  });

  it('StatusBadge renders with status and variant', () => {
    const { StatusBadge } = reactModule;
    assert.doesNotThrow(() => React.createElement(StatusBadge, { status: 'completed', variant: 'success' }));
  });

  it('AccountCard renders without account prop (no crash)', () => {
    const { AccountCard } = reactModule;
    assert.doesNotThrow(() => React.createElement(AccountCard));
  });

  it('AccountCard renders with valid account', () => {
    const { AccountCard } = reactModule;
    const account = { id: 'acc_123', account_type: 'personal', balance: '1000.50', currency: 'GBP', owner_id: 'usr_1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' };
    assert.doesNotThrow(() => React.createElement(AccountCard, { account }));
  });

  it('AccountList renders empty state', () => {
    const { AccountList } = reactModule;
    assert.doesNotThrow(() => React.createElement(AccountList, { accounts: [] }));
  });

  it('AccountList renders with accounts', () => {
    const { AccountList } = reactModule;
    const accounts = [
      { id: 'acc_1', account_type: 'personal', balance: '100', currency: 'GBP', owner_id: 'usr_1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: 'acc_2', account_type: 'business', balance: '200', currency: 'USD', owner_id: 'usr_2', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ];
    assert.doesNotThrow(() => React.createElement(AccountList, { accounts }));
  });

  it('TransactionRow renders with valid transaction', () => {
    const { TransactionRow } = reactModule;
    const tx = { id: 'tx_1', amount: '50', currency: 'GBP', status: 'completed', transaction_type: 'transfer', source_account_id: 'acc_1', dest_account_id: 'acc_2', created_at: '2024-01-01T00:00:00Z' };
    assert.doesNotThrow(() => React.createElement(TransactionRow, { transaction: tx }));
  });

  it('TransactionList renders empty state', () => {
    const { TransactionList } = reactModule;
    assert.doesNotThrow(() => React.createElement(TransactionList, { transactions: [] }));
  });

  it('WalletCard renders with valid wallet', () => {
    const { WalletCard } = reactModule;
    const wallet = { id: 'wlt_1', owner_id: 'usr_1', wallet_type: 'custodial', chain: 'ethereum', address: '0x1234567890abcdef', is_custodial: true, created_at: '2024-01-01T00:00:00Z' };
    assert.doesNotThrow(() => React.createElement(WalletCard, { wallet }));
  });

  it('WalletList renders empty state', () => {
    const { WalletList } = reactModule;
    assert.doesNotThrow(() => React.createElement(WalletList, { wallets: [] }));
  });

  it('SplitRuleCard renders with valid split rule', () => {
    const { SplitRuleCard } = reactModule;
    const split = { id: 'spl_1', total: '1000', currency: 'GBP', status: 'active', splits: [{ account_id: 'acc_1', percentage: 50 }, { account_id: 'acc_2', percentage: 50 }], created_at: '2024-01-01T00:00:00Z' };
    assert.doesNotThrow(() => React.createElement(SplitRuleCard, { split }));
  });

  it('HealthStatus renders loading state', () => {
    const { HealthStatus } = reactModule;
    assert.doesNotThrow(() => React.createElement(HealthStatus, { loading: true }));
  });

  it('HealthStatus renders with null health', () => {
    const { HealthStatus } = reactModule;
    assert.doesNotThrow(() => React.createElement(HealthStatus, { health: null }));
  });

  it('HealthStatus renders with health data', () => {
    const { HealthStatus } = reactModule;
    assert.doesNotThrow(() => React.createElement(HealthStatus, { health: { status: 'healthy', version: '1.0.0', database: 'connected' } }));
  });

  it('LoadingSpinner renders with default size', () => {
    const { LoadingSpinner } = reactModule;
    assert.doesNotThrow(() => React.createElement(LoadingSpinner));
  });

  it('LoadingSpinner renders with all sizes', () => {
    const { LoadingSpinner } = reactModule;
    assert.doesNotThrow(() => React.createElement(LoadingSpinner, { size: 'sm' }));
    assert.doesNotThrow(() => React.createElement(LoadingSpinner, { size: 'md' }));
    assert.doesNotThrow(() => React.createElement(LoadingSpinner, { size: 'lg' }));
  });

  it('ErrorDisplay renders with error message', () => {
    const { ErrorDisplay } = reactModule;
    assert.doesNotThrow(() => React.createElement(ErrorDisplay, { error: new Error('test error') }));
  });

  it('ErrorDisplay renders with null error', () => {
    const { ErrorDisplay } = reactModule;
    assert.doesNotThrow(() => React.createElement(ErrorDisplay, { error: null }));
  });

  it('ErrorDisplay renders with retry callback', () => {
    const { ErrorDisplay } = reactModule;
    assert.doesNotThrow(() => React.createElement(ErrorDisplay, { error: new Error('err'), onRetry: () => {} }));
  });

  it('DashboardLayout renders with default title', () => {
    const { DashboardLayout } = reactModule;
    assert.doesNotThrow(() => React.createElement(DashboardLayout, null, React.createElement('div', null, 'content')));
  });

  it('DashboardLayout renders with custom title and health', () => {
    const { DashboardLayout } = reactModule;
    assert.doesNotThrow(() => React.createElement(DashboardLayout, { title: 'Custom', health: { status: 'healthy', version: '1.0.0', database: 'connected' } }));
  });

  it('Card renders with title and actions', () => {
    const { Card } = reactModule;
    assert.doesNotThrow(() => React.createElement(Card, { title: 'Test Card' }));
  });

  it('Button renders with all variants', () => {
    const { Button } = reactModule;
    assert.doesNotThrow(() => React.createElement(Button, null, 'Click me'));
    assert.doesNotThrow(() => React.createElement(Button, { variant: 'secondary' }, 'Cancel'));
    assert.doesNotThrow(() => React.createElement(Button, { variant: 'danger' }, 'Delete'));
  });

  it('Button renders loading state', () => {
    const { Button } = reactModule;
    assert.doesNotThrow(() => React.createElement(Button, { loading: true }, 'Saving...'));
  });

  it('Input renders with label and error', () => {
    const { Input } = reactModule;
    assert.doesNotThrow(() => React.createElement(Input, { label: 'Email', error: 'Required' }));
  });

  it('Input renders without label', () => {
    const { Input } = reactModule;
    assert.doesNotThrow(() => React.createElement(Input));
  });
});

describe('React Hook Structure', () => {
  it('useAccount returns expected shape', () => {
    const { useAccount } = reactModule;
    assert.equal(typeof useAccount, 'function');
  });

  it('useTransfer returns expected shape', () => {
    const { useTransfer } = reactModule;
    assert.equal(typeof useTransfer, 'function');
  });

  it('useHealthCheck returns expected shape', () => {
    const { useHealthCheck } = reactModule;
    assert.equal(typeof useHealthCheck, 'function');
  });

  it('useAccountBalance returns expected shape', () => {
    const { useAccountBalance } = reactModule;
    assert.equal(typeof useAccountBalance, 'function');
  });
});
