<?php

declare(strict_types=1);

namespace HydraPayments\Sdk\Facades;

use Illuminate\Support\Facades\Facade;

/**
 * Laravel facade for the Hydra Payment SDK.
 *
 * Provides a static interface to the HydraClient:
 *
 *     Hydra::healthCheck();
 *     Hydra::createAccount('user-123', 'personal');
 *     Hydra::transfer('src-1', 'dst-1', '100.00');
 *
 * @method static \HydraPayments\Sdk\HealthResponse healthCheck()
 * @method static \HydraPayments\Sdk\Account createAccount(string $ownerId, string $accountType, ?string $currency = null)
 * @method static \HydraPayments\Sdk\Account getAccount(string $accountId)
 * @method static array getAccountsByOwner(string $ownerId)
 * @method static \HydraPayments\Sdk\Transaction transfer(string $sourceId, string $destId, string $amount, ?string $currency = null, ?string $reference = null)
 * @method static \HydraPayments\Sdk\Transaction getTransaction(string $transactionId)
 * @method static bool completeTransaction(string $transactionId)
 * @method static bool failTransaction(string $transactionId)
 * @method static \HydraPayments\Sdk\Wallet createWallet(string $ownerId, string $walletType, string $chain, string $address, ?string $encryptedPrivateKey = null)
 * @method static array getWallets(string $ownerId)
 * @method static string relayTransaction(string $walletId, string $signedTransaction)
 * @method static \HydraPayments\Sdk\SplitRule createSplit(string $total, array $splits, ?string $currency = null, ?string $reference = null)
 * @method static \HydraPayments\Sdk\SplitRule getSplit(string $splitId)
 * @method static bool verifySignature(string $payload, string $signature)
 * @method static string signMessage(string $message)
 * @method static \HydraPayments\Sdk\CreateTokenResponse createCardToken(\HydraPayments\Sdk\CardInput $card, ?string $merchantId = null)
 * @method static \HydraPayments\Sdk\CreateIntentResponse createPaymentIntent(int $amount, string $currency, ?string $token = null, ?string $merchantId = null, ?string $idempotencyKey = null)
 * @method static \HydraPayments\Sdk\CreateRefundResponse createRefund(string $chargeId, ?int $amount = null)
 * @method static \HydraPayments\Sdk\CommissionResponse getCommission()
 * @method static \HydraPayments\Sdk\WebhookResponse sendWebhookEvent(array $payload)
 * @method static string getMetrics()
 * @method static string getBaseUrl()
 * @method static void setDefaultCurrency(string $currency)
 * @method static void setLocale(string $locale)
 */
class Hydra extends Facade
{
    protected static function getFacadeAccessor(): string
    {
        return 'hydra.client';
    }
}
