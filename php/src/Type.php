<?php

declare(strict_types=1);

namespace HydraPayments\Sdk;

/**
 * Account types for the double-entry ledger.
 */
enum AccountType: string
{
    case Company = 'company';
    case Personal = 'personal';
    case Fractional = 'fractional';
}

/**
 * Transaction lifecycle states.
 */
enum TransactionStatus: string
{
    case Pending = 'pending';
    case Completed = 'completed';
    case Failed = 'failed';
}

/**
 * Transaction direction or kind.
 */
enum TransactionType: string
{
    case Transfer = 'transfer';
    case Credit = 'credit';
    case Debit = 'debit';
}

/**
 * Cryptocurrency wallet custody model.
 */
enum WalletType: string
{
    case Custodial = 'custodial';
    case NonCustodial = 'non-custodial';
}

/**
 * Payment intent lifecycle states.
 */
enum PaymentStatus: string
{
    case Pending = 'pending';
    case RequiresAction = 'requires_action';
    case Succeeded = 'succeeded';
    case Failed = 'failed';
}

// ============================================
// Core Models
// ============================================

/**
 * Represents a financial account in the double-entry ledger.
 */
class Account
{
    public function __construct(
        public readonly string $id,
        public readonly string $ownerId,
        public readonly string $accountType,
        public readonly string $currency,
        public readonly string $balance,
        public readonly ?string $metadata = null,
        public readonly string $createdAt = '',
        public readonly ?string $updatedAt = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            ownerId: $data['owner_id'],
            accountType: $data['account_type'],
            currency: $data['currency'],
            balance: $data['balance'],
            metadata: $data['metadata'] ?? null,
            createdAt: $data['created_at'] ?? '',
            updatedAt: $data['updated_at'] ?? null,
        );
    }

    public function balanceDecimal(): float
    {
        return (float) $this->balance;
    }

    public function formattedBalance(): string
    {
        return sprintf('%s %s', $this->currency, number_format((float) $this->balance, 2));
    }
}

/**
 * Represents a transfer, credit, or debit between accounts.
 */
class Transaction
{
    public function __construct(
        public readonly string $id,
        public readonly ?string $sourceAccountId = null,
        public readonly ?string $destAccountId = null,
        public readonly string $amount = '',
        public readonly string $currency = 'GBP',
        public readonly string $status = 'pending',
        public readonly string $transactionType = 'transfer',
        public readonly ?string $reference = null,
        public readonly ?string $description = null,
        public readonly ?string $metadata = null,
        public readonly ?string $previousStateHash = null,
        public readonly string $createdAt = '',
        public readonly ?string $updatedAt = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            sourceAccountId: $data['source_account_id'] ?? null,
            destAccountId: $data['dest_account_id'] ?? null,
            amount: $data['amount'] ?? '',
            currency: $data['currency'] ?? 'GBP',
            status: $data['status'] ?? 'pending',
            transactionType: $data['transaction_type'] ?? 'transfer',
            reference: $data['reference'] ?? null,
            description: $data['description'] ?? null,
            metadata: $data['metadata'] ?? null,
            previousStateHash: $data['previous_state_hash'] ?? null,
            createdAt: $data['created_at'] ?? '',
            updatedAt: $data['updated_at'] ?? null,
        );
    }
}

/**
 * Represents a cryptocurrency wallet.
 */
class Wallet
{
    public function __construct(
        public readonly string $id,
        public readonly string $ownerId,
        public readonly string $walletType,
        public readonly string $chain,
        public readonly string $address,
        public readonly bool $isCustodial = false,
        public readonly ?string $encryptedPrivateKey = null,
        public readonly string $createdAt = '',
        public readonly ?string $updatedAt = null,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            ownerId: $data['owner_id'],
            walletType: $data['wallet_type'],
            chain: $data['chain'],
            address: $data['address'],
            isCustodial: $data['is_custodial'] ?? false,
            encryptedPrivateKey: $data['encrypted_private_key'] ?? null,
            createdAt: $data['created_at'] ?? '',
            updatedAt: $data['updated_at'] ?? null,
        );
    }

    public function shortAddress(): string
    {
        if (strlen($this->address) > 16) {
            return substr($this->address, 0, 8) . '...' . substr($this->address, -6);
        }
        return $this->address;
    }
}

/**
 * Defines a single recipient's share of a split payment.
 */
class SplitEntry
{
    public function __construct(
        public readonly string $accountId,
        public readonly float $percentage,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            accountId: $data['account_id'],
            percentage: (float) $data['percentage'],
        );
    }

    public function toArray(): array
    {
        return [
            'account_id' => $this->accountId,
            'percentage' => $this->percentage,
        ];
    }
}

/**
 * Represents a configured split payment rule with multiple recipients.
 */
class SplitRule
{
    public function __construct(
        public readonly string $id,
        public readonly ?string $transactionId = null,
        public readonly string $total = '',
        public readonly string $currency = 'GBP',
        public readonly array $splits = [],
        public readonly ?string $sinkAccountId = null,
        public readonly string $status = 'pending',
        public readonly string $createdAt = '',
    ) {}

    public static function fromArray(array $data): self
    {
        $splits = [];
        foreach ($data['splits'] ?? [] as $entry) {
            $splits[] = $entry instanceof SplitEntry ? $entry : SplitEntry::fromArray($entry);
        }

        return new self(
            id: $data['id'],
            transactionId: $data['transaction_id'] ?? null,
            total: $data['total'] ?? '',
            currency: $data['currency'] ?? 'GBP',
            splits: $splits,
            sinkAccountId: $data['sink_account_id'] ?? null,
            status: $data['status'] ?? 'pending',
            createdAt: $data['created_at'] ?? '',
        );
    }
}

// ============================================
// API Response Wrapper
// ============================================

/**
 * Generic API response wrapper for core ledger endpoints.
 *
 * @template T
 */
class ApiResponse
{
    public function __construct(
        public readonly bool $success,
        public readonly mixed $data = null,
        public readonly ?string $error = null,
    ) {}

    /**
     * @param array $data
     * @param callable(array): T $mapper
     * @return self<T>
     */
    public static function fromArray(array $data, ?callable $mapper = null): self
    {
        $mapped = null;
        if ($mapper !== null && isset($data['data'])) {
            $mapped = $mapper($data['data']);
        } elseif (isset($data['data'])) {
            $mapped = $data['data'];
        }

        return new self(
            success: $data['success'] ?? false,
            data: $mapped,
            error: $data['error'] ?? null,
        );
    }
}

// ============================================
// Health
// ============================================

class HealthResponse
{
    public function __construct(
        public readonly string $status,
        public readonly string $version,
        public readonly string $database,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            status: $data['status'],
            version: $data['version'],
            database: $data['database'],
        );
    }

    public function isHealthy(): bool
    {
        return $this->status === 'healthy' && $this->database === 'connected';
    }
}

// ============================================
// Payment Gateway Types
// ============================================

class CardInput
{
    public function __construct(
        public readonly string $number,
        public readonly int $expMonth,
        public readonly int $expYear,
        public readonly string $cvc,
    ) {}

    public function toArray(): array
    {
        return [
            'number' => $this->number,
            'exp_month' => $this->expMonth,
            'exp_year' => $this->expYear,
            'cvc' => $this->cvc,
        ];
    }
}

class CardDetails
{
    public function __construct(
        public readonly string $brand,
        public readonly string $last4,
        public readonly int $expMonth,
        public readonly int $expYear,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            brand: $data['brand'],
            last4: $data['last4'],
            expMonth: $data['exp_month'],
            expYear: $data['exp_year'],
        );
    }
}

class CreateTokenResponse
{
    public function __construct(
        public readonly string $id,
        public readonly CardDetails $card,
        public readonly string $createdAt,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            card: CardDetails::fromArray($data['card']),
            createdAt: $data['created_at'],
        );
    }
}

class CreateIntentResponse
{
    public function __construct(
        public readonly string $id,
        public readonly string $status,
        public readonly int $amount,
        public readonly string $currency,
        public readonly string $clientSecret,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            status: $data['status'],
            amount: $data['amount'],
            currency: $data['currency'],
            clientSecret: $data['client_secret'],
        );
    }
}

class CreateRefundResponse
{
    public function __construct(
        public readonly string $id,
        public readonly string $status,
        public readonly int $amount,
        public readonly string $charge,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            id: $data['id'],
            status: $data['status'],
            amount: $data['amount'],
            charge: $data['charge'],
        );
    }
}

class CommissionResponse
{
    public function __construct(
        public readonly int $totalCommission,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            totalCommission: $data['total_commission'],
        );
    }
}

class WebhookResponse
{
    public function __construct(
        public readonly bool $received,
    ) {}

    public static function fromArray(array $data): self
    {
        return new self(
            received: $data['received'] ?? false,
        );
    }
}

// ============================================
// Request DTOs
// ============================================

class CreateAccountRequest
{
    public function __construct(
        public readonly string $ownerId,
        public readonly string $accountType,
        public readonly ?string $currency = null,
    ) {}

    public function toArray(): array
    {
        $data = [
            'owner_id' => $this->ownerId,
            'account_type' => $this->accountType,
        ];
        if ($this->currency !== null) {
            $data['currency'] = $this->currency;
        }
        return $data;
    }
}

class TransferRequest
{
    public function __construct(
        public readonly string $sourceId,
        public readonly string $destId,
        public readonly string $amount,
        public readonly ?string $currency = null,
        public readonly ?string $reference = null,
    ) {}

    public function toArray(): array
    {
        $data = [
            'source_id' => $this->sourceId,
            'dest_id' => $this->destId,
            'amount' => $this->amount,
        ];
        if ($this->currency !== null) {
            $data['currency'] = $this->currency;
        }
        if ($this->reference !== null) {
            $data['reference'] = $this->reference;
        }
        return $data;
    }
}

class CreateWalletRequest
{
    public function __construct(
        public readonly string $ownerId,
        public readonly string $walletType,
        public readonly string $chain,
        public readonly string $address,
        public readonly ?string $encryptedPrivateKey = null,
    ) {}

    public function toArray(): array
    {
        $data = [
            'owner_id' => $this->ownerId,
            'wallet_type' => $this->walletType,
            'chain' => $this->chain,
            'address' => $this->address,
        ];
        if ($this->encryptedPrivateKey !== null) {
            $data['encrypted_private_key'] = $this->encryptedPrivateKey;
        }
        return $data;
    }
}

class CreateSplitRequest
{
    public function __construct(
        public readonly string $total,
        public readonly array $splits,
        public readonly ?string $currency = null,
        public readonly ?string $reference = null,
    ) {}

    public function toArray(): array
    {
        $data = [
            'total' => $this->total,
            'splits' => array_map(fn(SplitEntry $s) => $s->toArray(), $this->splits),
        ];
        if ($this->currency !== null) {
            $data['currency'] = $this->currency;
        }
        if ($this->reference !== null) {
            $data['reference'] = $this->reference;
        }
        return $data;
    }
}
