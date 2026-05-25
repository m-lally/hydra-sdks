const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');

// Load the compiled modules once
let core, react, vue;

before(() => {
  core = require('../../dist/index.js');
  react = require('../../dist/react/index.js');
  vue = require('../../dist/vue/index.js');
});

describe('Core root (@hydra-pay/sdk)', () => {
  it('exports HydraClient', () => {
    assert.equal(typeof core.HydraClient, 'function');
  });

  it('exports createHydraClient', () => {
    assert.equal(typeof core.createHydraClient, 'function');
  });

  it('type aliases exist in declaration file', () => {
    // TypeScript types are erased at runtime, so check the .d.ts instead
    const fs = require('fs');
    const dts = fs.readFileSync(require.resolve('../../dist/index.d.ts'), 'utf8');
    const expectedTypes = ['SDKOptions', 'HydraConfig', 'ApiResponse', 'Account', 'AccountType',
      'CreateAccountRequest', 'Transaction', 'TransactionStatus', 'TransactionType',
      'TransferRequest', 'CreditRequest', 'DebitRequest', 'Wallet', 'WalletType',
      'ChainType', 'CreateWalletRequest', 'RelayRequest', 'RelayResponse',
      'SplitRule', 'SplitEntry', 'CreateSplitRequest', 'HealthResponse',
      'CardInput', 'CardDetails', 'CreateTokenRequest', 'CreateTokenResponse',
      'CreateIntentRequest', 'CreateIntentResponse', 'CreateRefundRequest',
      'CreateRefundResponse', 'CommissionResponse'];
    for (const t of expectedTypes) {
      assert.ok(dts.includes(t), `Declaration file should export type ${t}`);
    }
  });

  it('exports error classes', () => {
    assert.equal(typeof core.HydraError, 'function');
    assert.equal(typeof core.AuthenticationError, 'function');
    assert.equal(typeof core.ValidationError, 'function');
    assert.equal(typeof core.NotFoundError, 'function');
  });

  it('does NOT export React-specific items', () => {
    const reactItems = ['HydraProvider', 'HydraContext', 'useAccount', 'useTransfer',
      'StatusBadge', 'AccountCard', 'AccountList'];
    for (const item of reactItems) {
      assert.equal(core[item], undefined, `Core should NOT export ${item}`);
    }
  });

  it('does NOT export Vue-specific items', () => {
    const vueItems = ['createHydraPlugin', 'useHydraClient', 'hydraClientKey'];
    for (const item of vueItems) {
      assert.equal(core[item], undefined, `Core should NOT export ${item}`);
    }
  });

  it('does not require react at load time', () => {
    // The core module should not trigger a react import
    const fs = require('fs');
    const coreJS = fs.readFileSync(require.resolve('../../dist/index.js'), 'utf8');
    assert.ok(!coreJS.includes('require("react")'), 'Core should not require react');
  });

  it('does not require vue at load time', () => {
    const fs = require('fs');
    const coreJS = fs.readFileSync(require.resolve('../../dist/index.js'), 'utf8');
    assert.ok(!coreJS.includes('require("vue")'), 'Core should not require vue');
  });
});

describe('React subpath (@hydra-pay/sdk/react)', () => {
  it('exports HydraProvider', () => {
    assert.equal(typeof react.HydraProvider, 'function');
  });

  it('exports all hooks', () => {
    const hooks = ['useAccount', 'useAccountsByOwner', 'useCreateAccount',
      'useTransaction', 'useTransfer', 'useWallets', 'useCreateWallet',
      'useCreateSplit', 'useHealthCheck', 'useAccountBalance'];
    for (const h of hooks) {
      assert.equal(typeof react[h], 'function', `React should export ${h}`);
    }
  });

  it('exports all components', () => {
    const components = ['StatusBadge', 'AccountCard', 'AccountList', 'TransactionRow',
      'TransactionList', 'WalletCard', 'WalletList', 'SplitRuleCard',
      'HealthStatus', 'LoadingSpinner', 'ErrorDisplay', 'DashboardLayout',
      'Card', 'Button', 'Input'];
    for (const c of components) {
      assert.ok(react[c] !== undefined, `React should export ${c}`);
    }
  });

  it('exports HydraContext', () => {
    assert.ok(react.HydraContext !== undefined);
  });

  it('does NOT export Vue-specific items', () => {
    assert.equal(react.createHydraPlugin, undefined);
    assert.equal(react.hydraClientKey, undefined);
  });
});

describe('Vue subpath (@hydra-pay/sdk/vue)', () => {
  it('exports createHydraPlugin', () => {
    assert.equal(typeof vue.createHydraPlugin, 'function');
  });

  it('exports useHydraClient', () => {
    assert.equal(typeof vue.useHydraClient, 'function');
  });

  it('exports hydraClientKey', () => {
    assert.equal(typeof vue.hydraClientKey, 'symbol');
  });

  it('exports all composables', () => {
    const composables = ['useAccount', 'useAccountsByOwner', 'useCreateAccount',
      'useTransaction', 'useTransfer', 'useWallets', 'useCreateWallet',
      'useCreateSplit', 'useHealthCheck', 'useAccountBalance'];
    for (const c of composables) {
      assert.equal(typeof vue[c], 'function', `Vue should export ${c}`);
    }
  });

  it('exports all components', () => {
    const components = ['StatusBadge', 'AccountCard', 'AccountList', 'TransactionRow',
      'TransactionList', 'WalletCard', 'WalletList', 'SplitRuleCard',
      'HealthStatus', 'LoadingSpinner', 'ErrorDisplay', 'DashboardLayout',
      'Card', 'Button', 'Input'];
    for (const c of components) {
      assert.ok(vue[c] !== undefined, `Vue should export ${c}`);
    }
  });

  it('does NOT export React-specific items', () => {
    assert.equal(vue.HydraProvider, undefined);
    assert.equal(vue.HydraContext, undefined);
  });
});

describe('Pack dry-run (tarball contents)', () => {
  it('npm pack includes only dist/, README.md, LICENSE', (_, done) => {
    const { exec } = require('child_process');
    exec('npm pack --dry-run 2>&1', { cwd: require('path').resolve(__dirname, '../..') }, (err, stdout) => {
      if (err) { done(err); return; }
      assert.ok(stdout.includes('dist/index.js'), 'tarball should include dist/index.js');
      assert.ok(stdout.includes('dist/react/index.js'), 'tarball should include dist/react/index.js');
      assert.ok(stdout.includes('dist/vue/index.js'), 'tarball should include dist/vue/index.js');
      assert.ok(stdout.includes('README.md'), 'tarball should include README.md');
      assert.ok(!stdout.includes('.DS_Store'), 'tarball should not include .DS_Store');
      assert.ok(!stdout.includes('node_modules'), 'tarball should not include node_modules');
      done();
    });
  });
});
