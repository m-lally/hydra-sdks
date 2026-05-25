const { describe, it, before } = require('node:test');
const assert = require('node:assert/strict');
const path = require('path');
const fs = require('fs');

let core;

before(() => {
  core = require('../../dist/index.js');
});

describe('Core root (@hydra-pay/react-native-sdk)', () => {
  it('exports HydraClient', () => {
    assert.equal(typeof core.HydraClient, 'function');
  });

  it('exports createHydraClient', () => {
    assert.equal(typeof core.createHydraClient, 'function');
  });

  it('type aliases exist in declaration file', () => {
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
});

describe('Components barrel', () => {
  it('components barrel file exists', () => {
    const barrelPath = path.resolve(__dirname, '../../dist/components/index.js');
    assert.ok(fs.existsSync(barrelPath), 'components barrel file should exist');
  });

  it('components declaration file exists', () => {
    const dtsPath = path.resolve(__dirname, '../../dist/components/index.d.ts');
    assert.ok(fs.existsSync(dtsPath), 'components declaration file should exist');
  });

  it('components barrel exports expected names', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../dist/components/index.js'),
      'utf8'
    );
    const expected = ['StatusBadge', 'AccountCard', 'TransactionCard', 'WalletCard',
      'PaymentForm', 'LoadingSpinner', 'ErrorDisplay'];
    for (const name of expected) {
      assert.ok(content.includes(name), `components barrel should export ${name}`);
    }
  });

  it('hooks file exports expected hooks', () => {
    const content = fs.readFileSync(
      path.resolve(__dirname, '../../dist/components/hooks.js'),
      'utf8'
    );
    const expected = ['useAccount', 'useAccountsByOwner', 'useCreateAccount',
      'useTransaction', 'useTransfer', 'useWallets', 'useCreateWallet',
      'useCreateSplit', 'useHealthCheck', 'useAccountBalance'];
    for (const name of expected) {
      assert.ok(content.includes(name), `hooks should export ${name}`);
    }
  });

  it('component modules can be required (verify exports exist as functions)', () => {
    const hooks = require('../../dist/components/hooks.js');
    const hookNames = ['useAccount', 'useAccountsByOwner', 'useCreateAccount',
      'useTransaction', 'useTransfer', 'useWallets', 'useCreateWallet',
      'useCreateSplit', 'useHealthCheck', 'useAccountBalance'];
    for (const name of hookNames) {
      assert.equal(typeof hooks[name], 'function', `hooks should export ${name} as function`);
    }
  });
});

describe('No dependency leakage', () => {
  it('core module does not require react-native', () => {
    const coreJS = fs.readFileSync(require.resolve('../../dist/index.js'), 'utf8');
    assert.ok(!coreJS.includes('require("react-native")'), 'Core should not require react-native');
  });
});
