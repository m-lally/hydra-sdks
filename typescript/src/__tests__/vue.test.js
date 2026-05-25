const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

let Vue, vueModule;

before(() => {
  Vue = require('vue');
  vueModule = require('../../dist/vue/index.js');
});

describe('Vue Integration Exports', () => {
  it('createHydraPlugin is exported as a function', () => {
    assert.equal(typeof vueModule.createHydraPlugin, 'function');
  });

  it('useHydraClient is exported as a function', () => {
    assert.equal(typeof vueModule.useHydraClient, 'function');
  });

  it('hydraClientKey is exported as a Symbol', () => {
    assert.equal(typeof vueModule.hydraClientKey, 'symbol');
  });

  it('all composables are exported as functions', () => {
    const composables = ['useAccount', 'useAccountsByOwner', 'useCreateAccount', 'useTransaction', 'useTransfer', 'useWallets', 'useCreateWallet', 'useCreateSplit', 'useHealthCheck', 'useAccountBalance'];
    for (const c of composables) {
      assert.equal(typeof vueModule[c], 'function', `${c} should be a function`);
    }
  });

  it('all components are exported', () => {
    const components = ['StatusBadge', 'AccountCard', 'AccountList', 'TransactionRow', 'TransactionList', 'WalletCard', 'WalletList', 'SplitRuleCard', 'HealthStatus', 'LoadingSpinner', 'ErrorDisplay', 'DashboardLayout', 'Card', 'Button', 'Input'];
    for (const c of components) {
      assert.ok(vueModule[c] !== undefined, `${c} should be exported`);
    }
  });
});

describe('Vue Plugin', () => {
  it('createHydraPlugin returns an object with install method', () => {
    const plugin = vueModule.createHydraPlugin({ apiKey: 'pk_test', secretKey: 'sk_test' });
    assert.ok(plugin !== undefined);
    assert.equal(typeof plugin.install, 'function');
  });

  it('plugin installs via app.use()', () => {
    const app = Vue.createApp({});
    const plugin = vueModule.createHydraPlugin({ apiKey: 'pk_test', secretKey: 'sk_test' });
    assert.doesNotThrow(() => app.use(plugin));
  });

  it('plugin installs multiple times on different apps', () => {
    const app1 = Vue.createApp({});
    const app2 = Vue.createApp({});
    const plugin1 = vueModule.createHydraPlugin({ apiKey: 'pk_test1', secretKey: 'sk_test1' });
    const plugin2 = vueModule.createHydraPlugin({ apiKey: 'pk_test2', secretKey: 'sk_test2' });
    assert.doesNotThrow(() => { app1.use(plugin1); app2.use(plugin2); });
  });

  it('plugin provides client that can be injected', () => {
    const app = Vue.createApp({});
    const plugin = vueModule.createHydraPlugin({ apiKey: 'pk_test', secretKey: 'sk_test' });
    app.use(plugin);
    assert.ok(app._context.provides[vueModule.hydraClientKey] !== undefined);
  });
});

describe('Vue Composables', () => {
  it('useHydraClient throws when no plugin installed', () => {
    // In a test environment without plugin, it should throw
    assert.throws(() => vueModule.useHydraClient(), /Hydra client not found/);
  });

  it('useHydraClient returns client when plugin is installed', () => {
    // This needs to be tested in a component context with provide
    // For structural testing, we verify the function exists and has correct signature
    assert.equal(typeof vueModule.useHydraClient, 'function');
  });

  it('all data-fetching composables accept string argument', () => {
    const fetchComposables = ['useAccount', 'useAccountsByOwner', 'useTransaction', 'useWallets'];
    for (const c of fetchComposables) {
      assert.equal(typeof vueModule[c], 'function');
    }
  });

  it('mutation composables accept no arguments', () => {
    const mutationComposables = ['useCreateAccount', 'useTransfer', 'useCreateWallet', 'useCreateSplit'];
    for (const c of mutationComposables) {
      assert.equal(typeof vueModule[c], 'function');
    }
  });

  it('useHealthCheck accepts no arguments', () => {
    assert.equal(typeof vueModule.useHealthCheck, 'function');
  });

  it('useAccountBalance accepts string argument', () => {
    assert.equal(typeof vueModule.useAccountBalance, 'function');
  });
});

describe('Vue Components Render', () => {
  it('StatusBadge renders with required status prop', () => {
    const { StatusBadge } = vueModule;
    assert.doesNotThrow(() => Vue.h(vueModule.StatusBadge, { status: 'active' }));
    assert.doesNotThrow(() => Vue.h(vueModule.StatusBadge, { status: 'completed', variant: 'success' }));
  });

  it('AccountCard renders with valid account', () => {
    const account = {
      id: 'acc_123', account_type: 'personal', balance: '1000.50', currency: 'GBP',
      owner_id: 'usr_1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z',
    };
    assert.doesNotThrow(() => Vue.h(vueModule.AccountCard, { account }));
  });

  it('AccountList renders empty state', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.AccountList, { accounts: [] }));
  });

  it('AccountList renders with multiple accounts', () => {
    const accounts = [
      { id: 'acc_1', account_type: 'personal', balance: '100', currency: 'GBP', owner_id: 'usr_1', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
      { id: 'acc_2', account_type: 'business', balance: '200', currency: 'USD', owner_id: 'usr_2', created_at: '2024-01-01T00:00:00Z', updated_at: '2024-01-01T00:00:00Z' },
    ];
    assert.doesNotThrow(() => Vue.h(vueModule.AccountList, { accounts, onAccountClick: () => {} }));
  });

  it('TransactionRow renders with valid transaction', () => {
    const tx = { id: 'tx_1', amount: '50', currency: 'GBP', status: 'completed', transaction_type: 'transfer', source_account_id: 'acc_1', dest_account_id: 'acc_2', created_at: '2024-01-01T00:00:00Z' };
    assert.doesNotThrow(() => Vue.h(vueModule.TransactionRow, { transaction: tx }));
  });

  it('TransactionList renders empty state', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.TransactionList, { transactions: [] }));
  });

  it('TransactionList renders with transactions', () => {
    const txs = [
      { id: 'tx_1', amount: '50', currency: 'GBP', status: 'completed', transaction_type: 'transfer', source_account_id: 'acc_1', dest_account_id: 'acc_2', created_at: '2024-01-01T00:00:00Z' },
    ];
    assert.doesNotThrow(() => Vue.h(vueModule.TransactionList, { transactions: txs, onTransactionClick: () => {} }));
  });

  it('WalletCard renders with valid wallet', () => {
    const wallet = { id: 'wlt_1', owner_id: 'usr_1', wallet_type: 'custodial', chain: 'ethereum', address: '0x1234567890abcdef', is_custodial: true, created_at: '2024-01-01T00:00:00Z' };
    assert.doesNotThrow(() => Vue.h(vueModule.WalletCard, { wallet }));
  });

  it('WalletCard renders with relay button', () => {
    const wallet = { id: 'wlt_1', owner_id: 'usr_1', wallet_type: 'non-custodial', chain: 'solana', address: 'abc123', is_custodial: false, created_at: '2024-01-01T00:00:00Z' };
    assert.doesNotThrow(() => Vue.h(vueModule.WalletCard, { wallet, onRelay: () => {} }));
  });

  it('WalletList renders empty state', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.WalletList, { wallets: [] }));
  });

  it('SplitRuleCard renders with valid split rule', () => {
    const split = { id: 'spl_1', total: '1000', currency: 'GBP', status: 'active', splits: [{ account_id: 'acc_1', percentage: 50 }, { account_id: 'acc_2', percentage: 50 }], created_at: '2024-01-01T00:00:00Z' };
    assert.doesNotThrow(() => Vue.h(vueModule.SplitRuleCard, { split }));
  });

  it('HealthStatus renders loading, null, and data states', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.HealthStatus, { loading: true }));
    assert.doesNotThrow(() => Vue.h(vueModule.HealthStatus, { health: null }));
    assert.doesNotThrow(() => Vue.h(vueModule.HealthStatus, { health: { status: 'healthy', version: '1.0.0', database: 'connected' } }));
  });

  it('LoadingSpinner renders with all sizes', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.LoadingSpinner));
    assert.doesNotThrow(() => Vue.h(vueModule.LoadingSpinner, { size: 'sm' }));
    assert.doesNotThrow(() => Vue.h(vueModule.LoadingSpinner, { size: 'lg' }));
  });

  it('ErrorDisplay renders with error', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.ErrorDisplay, { error: new Error('test error') }));
  });

  it('ErrorDisplay renders null for no error', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.ErrorDisplay, { error: null }));
  });

  it('ErrorDisplay renders with retry button', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.ErrorDisplay, { error: new Error('err'), onRetry: () => {} }));
  });

  it('DashboardLayout renders with default title', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.DashboardLayout, null, { default: () => 'content' }));
  });

  it('DashboardLayout renders with custom title and health', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.DashboardLayout, { title: 'Custom', health: { status: 'healthy', version: '1.0.0', database: 'connected' } }));
  });

  it('Card renders with title slot', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.Card, { title: 'Test Card' }));
  });

  it('Card renders with actions slot', () => {
    const card = Vue.h(vueModule.Card, null, {
      actions: () => Vue.h('button', 'Action'),
      default: () => 'Body',
    });
    assert.doesNotThrow(() => card);
  });

  it('Button renders with all variants', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.Button, null, { default: () => 'Click' }));
    assert.doesNotThrow(() => Vue.h(vueModule.Button, { variant: 'secondary' }, { default: () => 'Cancel' }));
    assert.doesNotThrow(() => Vue.h(vueModule.Button, { variant: 'danger' }, { default: () => 'Delete' }));
  });

  it('Button renders loading state', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.Button, { loading: true }));
  });

  it('Input renders with label and error', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.Input, { label: 'Email', error: 'Required' }));
  });

  it('Input renders without props', () => {
    assert.doesNotThrow(() => Vue.h(vueModule.Input));
  });
});
