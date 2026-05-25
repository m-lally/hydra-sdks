<?php

declare(strict_types=1);

namespace HydraPayments\Sdk\Tests;

use HydraPayments\Sdk\Account;
use HydraPayments\Sdk\AccountType;
use HydraPayments\Sdk\ApiResponse;
use HydraPayments\Sdk\CardDetails;
use HydraPayments\Sdk\CardInput;
use HydraPayments\Sdk\CommissionResponse;
use HydraPayments\Sdk\CreateAccountRequest;
use HydraPayments\Sdk\CreateIntentResponse;
use HydraPayments\Sdk\CreateRefundResponse;
use HydraPayments\Sdk\CreateSplitRequest;
use HydraPayments\Sdk\CreateTokenResponse;
use HydraPayments\Sdk\CreateWalletRequest;
use HydraPayments\Sdk\HealthResponse;
use HydraPayments\Sdk\PaymentStatus;
use HydraPayments\Sdk\SplitEntry;
use HydraPayments\Sdk\SplitRule;
use HydraPayments\Sdk\Transaction;
use HydraPayments\Sdk\TransactionStatus;
use HydraPayments\Sdk\TransactionType;
use HydraPayments\Sdk\TransferRequest;
use HydraPayments\Sdk\Wallet;
use HydraPayments\Sdk\WalletType;
use HydraPayments\Sdk\WebhookResponse;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\TestCase;

#[CoversClass(Account::class)]
#[CoversClass(Transaction::class)]
#[CoversClass(Wallet::class)]
#[CoversClass(SplitEntry::class)]
#[CoversClass(SplitRule::class)]
#[CoversClass(HealthResponse::class)]
#[CoversClass(ApiResponse::class)]
#[CoversClass(CardInput::class)]
#[CoversClass(CardDetails::class)]
#[CoversClass(CreateTokenResponse::class)]
#[CoversClass(CreateIntentResponse::class)]
#[CoversClass(CreateRefundResponse::class)]
#[CoversClass(CommissionResponse::class)]
#[CoversClass(WebhookResponse::class)]
#[CoversClass(CreateAccountRequest::class)]
#[CoversClass(TransferRequest::class)]
#[CoversClass(CreateWalletRequest::class)]
#[CoversClass(CreateSplitRequest::class)]
class TypeTest extends TestCase
{
    // ============================================
    // Enum Tests
    // ============================================

    public function test_account_type_enum(): void
    {
        $this->assertSame('company', AccountType::Company->value);
        $this->assertSame('personal', AccountType::Personal->value);
        $this->assertSame('fractional', AccountType::Fractional->value);
    }

    public function test_transaction_status_enum(): void
    {
        $this->assertSame('pending', TransactionStatus::Pending->value);
        $this->assertSame('completed', TransactionStatus::Completed->value);
        $this->assertSame('failed', TransactionStatus::Failed->value);
    }

    public function test_transaction_type_enum(): void
    {
        $this->assertSame('transfer', TransactionType::Transfer->value);
        $this->assertSame('credit', TransactionType::Credit->value);
        $this->assertSame('debit', TransactionType::Debit->value);
    }

    public function test_wallet_type_enum(): void
    {
        $this->assertSame('custodial', WalletType::Custodial->value);
        $this->assertSame('non-custodial', WalletType::NonCustodial->value);
    }

    public function test_payment_status_enum(): void
    {
        $this->assertSame('pending', PaymentStatus::Pending->value);
        $this->assertSame('requires_action', PaymentStatus::RequiresAction->value);
        $this->assertSame('succeeded', PaymentStatus::Succeeded->value);
        $this->assertSame('failed', PaymentStatus::Failed->value);
    }

    // ============================================
    // Account
    // ============================================

    public function test_account_from_array(): void
    {
        $account = Account::fromArray([
            'id' => 'acc-123',
            'owner_id' => 'owner-456',
            'account_type' => 'personal',
            'currency' => 'GBP',
            'balance' => '150.75',
            'created_at' => '2024-01-15T10:00:00Z',
        ]);

        $this->assertSame('acc-123', $account->id);
        $this->assertSame('owner-456', $account->ownerId);
        $this->assertSame('personal', $account->accountType);
        $this->assertSame('GBP', $account->currency);
        $this->assertSame('150.75', $account->balance);
        $this->assertNull($account->metadata);
        $this->assertSame('2024-01-15T10:00:00Z', $account->createdAt);
        $this->assertNull($account->updatedAt);
    }

    public function test_account_with_optional_fields(): void
    {
        $account = Account::fromArray([
            'id' => 'acc-1',
            'owner_id' => 'owner-1',
            'account_type' => 'company',
            'currency' => 'USD',
            'balance' => '0.00',
            'metadata' => '{"key":"value"}',
            'created_at' => '2024-01-01T00:00:00Z',
            'updated_at' => '2024-01-02T00:00:00Z',
        ]);

        $this->assertSame('{"key":"value"}', $account->metadata);
        $this->assertSame('2024-01-02T00:00:00Z', $account->updatedAt);
    }

    public function test_account_balance_decimal(): void
    {
        $account = Account::fromArray([
            'id' => 'acc-1',
            'owner_id' => 'owner-1',
            'account_type' => 'personal',
            'currency' => 'GBP',
            'balance' => '150.75',
        ]);

        $this->assertSame(150.75, $account->balanceDecimal());
    }

    public function test_account_balance_decimal_zero(): void
    {
        $account = Account::fromArray([
            'id' => 'acc-1',
            'owner_id' => 'owner-1',
            'account_type' => 'personal',
            'currency' => 'GBP',
            'balance' => '0.00',
        ]);

        $this->assertSame(0.0, $account->balanceDecimal());
    }

    public function test_account_balance_decimal_invalid(): void
    {
        $account = Account::fromArray([
            'id' => 'acc-1',
            'owner_id' => 'owner-1',
            'account_type' => 'personal',
            'currency' => 'GBP',
            'balance' => 'not-a-number',
        ]);

        $this->assertSame(0.0, $account->balanceDecimal());
    }

    public function test_account_formatted_balance(): void
    {
        $account = Account::fromArray([
            'id' => 'acc-1', 'owner_id' => 'o-1',
            'account_type' => 'personal', 'currency' => 'GBP',
            'balance' => '1050.50',
        ]);

        $this->assertStringContainsString('GBP', $account->formattedBalance());
        $this->assertStringContainsString('1,050.50', $account->formattedBalance());
    }

    // ============================================
    // Transaction
    // ============================================

    public function test_transaction_from_array_minimal(): void
    {
        $tx = Transaction::fromArray(['id' => 'tx-1']);

        $this->assertSame('tx-1', $tx->id);
        $this->assertNull($tx->sourceAccountId);
        $this->assertNull($tx->destAccountId);
        $this->assertSame('', $tx->amount);
        $this->assertSame('GBP', $tx->currency);
        $this->assertSame('pending', $tx->status);
        $this->assertSame('transfer', $tx->transactionType);
    }

    public function test_transaction_from_array_full(): void
    {
        $tx = Transaction::fromArray([
            'id' => 'tx-1',
            'source_account_id' => 'acc-src',
            'dest_account_id' => 'acc-dst',
            'amount' => '99.99',
            'currency' => 'USD',
            'status' => 'completed',
            'transaction_type' => 'transfer',
            'reference' => 'REF-001',
            'description' => 'Test payment',
            'metadata' => '{"order":"123"}',
            'previous_state_hash' => 'abc123',
            'created_at' => '2024-01-01T00:00:00Z',
            'updated_at' => '2024-01-01T01:00:00Z',
        ]);

        $this->assertSame('tx-1', $tx->id);
        $this->assertSame('acc-src', $tx->sourceAccountId);
        $this->assertSame('acc-dst', $tx->destAccountId);
        $this->assertSame('99.99', $tx->amount);
        $this->assertSame('USD', $tx->currency);
        $this->assertSame('completed', $tx->status);
        $this->assertSame('REF-001', $tx->reference);
        $this->assertSame('Test payment', $tx->description);
        $this->assertSame('{"order":"123"}', $tx->metadata);
        $this->assertSame('abc123', $tx->previousStateHash);
    }

    // ============================================
    // Wallet
    // ============================================

    public function test_wallet_from_array(): void
    {
        $wallet = Wallet::fromArray([
            'id' => 'w-1',
            'owner_id' => 'owner-1',
            'wallet_type' => 'evm',
            'chain' => 'ethereum',
            'address' => '0x1234567890123456789012345678901234567890',
            'is_custodial' => true,
        ]);

        $this->assertSame('w-1', $wallet->id);
        $this->assertSame('owner-1', $wallet->ownerId);
        $this->assertSame('ethereum', $wallet->chain);
        $this->assertTrue($wallet->isCustodial);
    }

    public function test_wallet_short_address_long(): void
    {
        $wallet = Wallet::fromArray([
            'id' => 'w-1', 'owner_id' => 'o-1',
            'wallet_type' => 'evm', 'chain' => 'ethereum',
            'address' => '0x1234567890123456789012345678901234567890',
        ]);

        $short = $wallet->shortAddress();
        $this->assertStringContainsString('...', $short);
        $this->assertSame(17, strlen($short)); // 8 + 3 + 6
    }

    public function test_wallet_short_address_short(): void
    {
        $wallet = Wallet::fromArray([
            'id' => 'w-1', 'owner_id' => 'o-1',
            'wallet_type' => 'evm', 'chain' => 'ethereum',
            'address' => '0x1234',
        ]);

        $this->assertSame('0x1234', $wallet->shortAddress());
    }

    public function test_wallet_default_is_custodial(): void
    {
        $wallet = Wallet::fromArray([
            'id' => 'w-1', 'owner_id' => 'o-1',
            'wallet_type' => 'evm', 'chain' => 'ethereum',
            'address' => '0x1234',
        ]);

        $this->assertFalse($wallet->isCustodial);
    }

    // ============================================
    // SplitEntry
    // ============================================

    public function test_split_entry_from_array(): void
    {
        $entry = SplitEntry::fromArray([
            'account_id' => 'acc-1',
            'percentage' => 75.5,
        ]);

        $this->assertSame('acc-1', $entry->accountId);
        $this->assertSame(75.5, $entry->percentage);
    }

    public function test_split_entry_from_array_string_percentage(): void
    {
        $entry = SplitEntry::fromArray([
            'account_id' => 'acc-1',
            'percentage' => '60',
        ]);

        $this->assertSame(60.0, $entry->percentage);
    }

    public function test_split_entry_to_array(): void
    {
        $entry = new SplitEntry(accountId: 'acc-1', percentage: 33.33);
        $array = $entry->toArray();

        $this->assertSame(['account_id' => 'acc-1', 'percentage' => 33.33], $array);
    }

    // ============================================
    // SplitRule
    // ============================================

    public function test_split_rule_from_array(): void
    {
        $rule = SplitRule::fromArray([
            'id' => 'sr-1',
            'total' => '200.00',
            'currency' => 'GBP',
            'splits' => [
                ['account_id' => 'a-1', 'percentage' => 60],
                ['account_id' => 'a-2', 'percentage' => 40],
            ],
            'status' => 'pending',
            'created_at' => '2024-01-01T00:00:00Z',
        ]);

        $this->assertSame('sr-1', $rule->id);
        $this->assertSame('200.00', $rule->total);
        $this->assertCount(2, $rule->splits);
        $this->assertInstanceOf(SplitEntry::class, $rule->splits[0]);
        $this->assertSame('a-1', $rule->splits[0]->accountId);
        $this->assertSame(60.0, $rule->splits[0]->percentage);
        $this->assertSame('a-2', $rule->splits[1]->accountId);
    }

    public function test_split_rule_from_array_preserves_split_entries(): void
    {
        $entries = [new SplitEntry(accountId: 'a-1', percentage: 100.0)];
        $rule = SplitRule::fromArray([
            'id' => 'sr-1',
            'total' => '100.00',
            'splits' => $entries,
        ]);

        $this->assertSame($entries, $rule->splits);
    }

    public function test_split_rule_empty_splits(): void
    {
        $rule = SplitRule::fromArray([
            'id' => 'sr-1',
            'total' => '0.00',
            'splits' => [],
        ]);

        $this->assertEmpty($rule->splits);
    }

    // ============================================
    // HealthResponse
    // ============================================

    public function test_health_response_from_array(): void
    {
        $health = HealthResponse::fromArray([
            'status' => 'healthy',
            'version' => '1.0.0',
            'database' => 'connected',
        ]);

        $this->assertSame('healthy', $health->status);
        $this->assertSame('1.0.0', $health->version);
        $this->assertSame('connected', $health->database);
    }

    public function test_health_response_is_healthy(): void
    {
        $health = HealthResponse::fromArray([
            'status' => 'healthy',
            'version' => '1.0.0',
            'database' => 'connected',
        ]);

        $this->assertTrue($health->isHealthy());
    }

    public function test_health_response_is_not_healthy_when_down(): void
    {
        $health = HealthResponse::fromArray([
            'status' => 'degraded',
            'version' => '1.0.0',
            'database' => 'disconnected',
        ]);

        $this->assertFalse($health->isHealthy());
    }

    public function test_health_response_is_not_healthy_partial(): void
    {
        $healthyStatus = HealthResponse::fromArray([
            'status' => 'healthy',
            'version' => '1.0.0',
            'database' => 'disconnected',
        ]);
        $this->assertFalse($healthyStatus->isHealthy());

        $healthyDb = HealthResponse::fromArray([
            'status' => 'degraded',
            'version' => '1.0.0',
            'database' => 'connected',
        ]);
        $this->assertFalse($healthyDb->isHealthy());
    }

    // ============================================
    // ApiResponse
    // ============================================

    public function test_api_response_success(): void
    {
        $response = ApiResponse::fromArray([
            'success' => true,
            'data' => ['id' => 'acc-1'],
        ]);

        $this->assertTrue($response->success);
        $this->assertSame(['id' => 'acc-1'], $response->data);
        $this->assertNull($response->error);
    }

    public function test_api_response_error(): void
    {
        $response = ApiResponse::fromArray([
            'success' => false,
            'error' => 'Not found',
        ]);

        $this->assertFalse($response->success);
        $this->assertNull($response->data);
        $this->assertSame('Not found', $response->error);
    }

    public function test_api_response_with_mapper(): void
    {
        $response = ApiResponse::fromArray(
            data: ['success' => true, 'data' => ['id' => 'acc-1', 'owner_id' => 'owner-1', 'account_type' => 'personal', 'currency' => 'GBP', 'balance' => '50.00']],
            mapper: fn(array $d) => Account::fromArray($d),
        );

        $this->assertTrue($response->success);
        $this->assertInstanceOf(Account::class, $response->data);
        $this->assertSame('acc-1', $response->data->id);
        $this->assertSame('50.00', $response->data->balance);
    }

    // ============================================
    // CardInput
    // ============================================

    public function test_card_input_to_array(): void
    {
        $card = new CardInput(
            number: '4111111111111111',
            expMonth: 12,
            expYear: 2026,
            cvc: '123',
        );

        $array = $card->toArray();

        $this->assertSame([
            'number' => '4111111111111111',
            'exp_month' => 12,
            'exp_year' => 2026,
            'cvc' => '123',
        ], $array);
    }

    // ============================================
    // CardDetails
    // ============================================

    public function test_card_details_from_array(): void
    {
        $details = CardDetails::fromArray([
            'brand' => 'visa',
            'last4' => '4242',
            'exp_month' => 12,
            'exp_year' => 2026,
        ]);

        $this->assertSame('visa', $details->brand);
        $this->assertSame('4242', $details->last4);
        $this->assertSame(12, $details->expMonth);
        $this->assertSame(2026, $details->expYear);
    }

    // ============================================
    // CreateTokenResponse
    // ============================================

    public function test_create_token_response_from_array(): void
    {
        $response = CreateTokenResponse::fromArray([
            'id' => 'tok_abc123',
            'card' => [
                'brand' => 'mastercard',
                'last4' => '5555',
                'exp_month' => 6,
                'exp_year' => 2027,
            ],
            'created_at' => '2024-06-15T12:00:00Z',
        ]);

        $this->assertSame('tok_abc123', $response->id);
        $this->assertInstanceOf(CardDetails::class, $response->card);
        $this->assertSame('mastercard', $response->card->brand);
        $this->assertSame('5555', $response->card->last4);
        $this->assertSame('2024-06-15T12:00:00Z', $response->createdAt);
    }

    // ============================================
    // CreateIntentResponse
    // ============================================

    public function test_create_intent_response_from_array(): void
    {
        $response = CreateIntentResponse::fromArray([
            'id' => 'pi_xyz',
            'status' => 'succeeded',
            'amount' => 2999,
            'currency' => 'GBP',
            'client_secret' => 'secret_pi_xyz',
        ]);

        $this->assertSame('pi_xyz', $response->id);
        $this->assertSame('succeeded', $response->status);
        $this->assertSame(2999, $response->amount);
        $this->assertSame('GBP', $response->currency);
        $this->assertSame('secret_pi_xyz', $response->clientSecret);
    }

    // ============================================
    // CreateRefundResponse
    // ============================================

    public function test_create_refund_response_from_array(): void
    {
        $response = CreateRefundResponse::fromArray([
            'id' => 're_123',
            'status' => 'succeeded',
            'amount' => 1000,
            'charge' => 'ch_456',
        ]);

        $this->assertSame('re_123', $response->id);
        $this->assertSame('succeeded', $response->status);
        $this->assertSame(1000, $response->amount);
        $this->assertSame('ch_456', $response->charge);
    }

    // ============================================
    // CommissionResponse
    // ============================================

    public function test_commission_response_from_array(): void
    {
        $response = CommissionResponse::fromArray([
            'total_commission' => 50000,
        ]);

        $this->assertSame(50000, $response->totalCommission);
    }

    public function test_commission_response_zero(): void
    {
        $response = CommissionResponse::fromArray([
            'total_commission' => 0,
        ]);

        $this->assertSame(0, $response->totalCommission);
    }

    // ============================================
    // WebhookResponse
    // ============================================

    public function test_webhook_response_received(): void
    {
        $response = WebhookResponse::fromArray(['received' => true]);
        $this->assertTrue($response->received);
    }

    public function test_webhook_response_not_received(): void
    {
        $response = WebhookResponse::fromArray(['received' => false]);
        $this->assertFalse($response->received);
    }

    public function test_webhook_response_default(): void
    {
        $response = WebhookResponse::fromArray([]);
        $this->assertFalse($response->received);
    }

    // ============================================
    // CreateAccountRequest
    // ============================================

    public function test_create_account_request_with_currency(): void
    {
        $request = new CreateAccountRequest(
            ownerId: 'owner-1',
            accountType: 'personal',
            currency: 'USD',
        );

        $this->assertSame([
            'owner_id' => 'owner-1',
            'account_type' => 'personal',
            'currency' => 'USD',
        ], $request->toArray());
    }

    public function test_create_account_request_without_currency(): void
    {
        $request = new CreateAccountRequest(
            ownerId: 'owner-1',
            accountType: 'company',
        );

        $this->assertSame([
            'owner_id' => 'owner-1',
            'account_type' => 'company',
        ], $request->toArray());
    }

    // ============================================
    // TransferRequest
    // ============================================

    public function test_transfer_request_full(): void
    {
        $request = new TransferRequest(
            sourceId: 'src-1',
            destId: 'dst-1',
            amount: '100.00',
            currency: 'EUR',
            reference: 'INV-001',
        );

        $this->assertSame([
            'source_id' => 'src-1',
            'dest_id' => 'dst-1',
            'amount' => '100.00',
            'currency' => 'EUR',
            'reference' => 'INV-001',
        ], $request->toArray());
    }

    public function test_transfer_request_minimal(): void
    {
        $request = new TransferRequest(
            sourceId: 'src-1',
            destId: 'dst-1',
            amount: '50.00',
        );

        $array = $request->toArray();
        $this->assertArrayNotHasKey('currency', $array);
        $this->assertArrayNotHasKey('reference', $array);
        $this->assertSame('50.00', $array['amount']);
    }

    // ============================================
    // CreateWalletRequest
    // ============================================

    public function test_create_wallet_request_with_key(): void
    {
        $request = new CreateWalletRequest(
            ownerId: 'owner-1',
            walletType: 'evm',
            chain: 'ethereum',
            address: '0x1234',
            encryptedPrivateKey: 'enc-key-here',
        );

        $array = $request->toArray();
        $this->assertSame('enc-key-here', $array['encrypted_private_key']);
    }

    public function test_create_wallet_request_without_key(): void
    {
        $request = new CreateWalletRequest(
            ownerId: 'owner-1',
            walletType: 'evm',
            chain: 'ethereum',
            address: '0x1234',
        );

        $array = $request->toArray();
        $this->assertArrayNotHasKey('encrypted_private_key', $array);
    }

    // ============================================
    // CreateSplitRequest
    // ============================================

    public function test_create_split_request(): void
    {
        $splits = [
            new SplitEntry(accountId: 'a-1', percentage: 60.0),
            new SplitEntry(accountId: 'a-2', percentage: 40.0),
        ];

        $request = new CreateSplitRequest(
            total: '200.00',
            splits: $splits,
            currency: 'GBP',
            reference: 'SPLIT-001',
        );

        $array = $request->toArray();
        $this->assertSame('200.00', $array['total']);
        $this->assertSame('GBP', $array['currency']);
        $this->assertSame('SPLIT-001', $array['reference']);
        $this->assertCount(2, $array['splits']);
        $this->assertSame('a-1', $array['splits'][0]['account_id']);
        $this->assertSame(60.0, $array['splits'][0]['percentage']);
    }

    public function test_create_split_request_minimal(): void
    {
        $request = new CreateSplitRequest(
            total: '100.00',
            splits: [],
        );

        $array = $request->toArray();
        $this->assertArrayNotHasKey('currency', $array);
        $this->assertArrayNotHasKey('reference', $array);
    }
}
