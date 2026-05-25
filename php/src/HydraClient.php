<?php

declare(strict_types=1);

namespace HydraPayments\Sdk;

use GuzzleHttp\Client as GuzzleClient;
use GuzzleHttp\Exception\BadResponseException;
use GuzzleHttp\Exception\GuzzleException;
use Psr\Http\Message\ResponseInterface;

/**
 * Main HTTP client for the Hydra Payment Service.
 *
 * Provides HMAC-SHA256 signed requests to both the Core Ledger API
 * and the Payment Gateway API. Supports Laravel out of the box via
 * the included service provider and facade.
 *
 * Usage:
 *     $client = new HydraClient(
 *         baseUrl: 'http://localhost:8080',
 *         apiKey: 'pk_xxx',
 *         secretKey: 'sk_xxx',
 *     );
 *
 *     $health = $client->healthCheck();
 *     $account = $client->createAccount('user-123', 'personal');
 */
class HydraClient
{
    private GuzzleClient $httpClient;
    private string $baseUrl;
    private string $apiKey;
    private string $secretKey;
    private string $defaultCurrency;
    private string $locale;

    public function __construct(
        string $baseUrl = 'http://localhost:8080',
        string $apiKey = '',
        string $secretKey = '',
        float $timeout = 30.0,
        string $defaultCurrency = 'GBP',
        string $locale = 'en',
        ?GuzzleClient $httpClient = null,
    ) {
        $this->baseUrl = rtrim($baseUrl, '/');
        $this->apiKey = $apiKey;
        $this->secretKey = $secretKey;
        $this->defaultCurrency = $defaultCurrency;
        $this->locale = $locale;
        $this->httpClient = $httpClient ?? new GuzzleClient([
            'base_uri' => $this->baseUrl,
            'timeout' => $timeout,
            'http_errors' => false,
            'headers' => [
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ],
        ]);
    }

    /**
     * Factory method to create a new HydraClient.
     */
    public static function create(
        string $baseUrl = 'http://localhost:8080',
        string $apiKey = '',
        string $secretKey = '',
        float $timeout = 30.0,
        string $defaultCurrency = 'GBP',
        string $locale = 'en',
    ): self {
        return new self(
            baseUrl: $baseUrl,
            apiKey: $apiKey,
            secretKey: $secretKey,
            timeout: $timeout,
            defaultCurrency: $defaultCurrency,
            locale: $locale,
        );
    }

    // ============================================
    // Configuration Setters
    // ============================================

    public function setDefaultCurrency(string $currency): void
    {
        $this->defaultCurrency = $currency;
    }

    public function setLocale(string $locale): void
    {
        $this->locale = $locale;
    }

    public function getBaseUrl(): string
    {
        return $this->baseUrl;
    }

    // ============================================
    // HMAC Signing
    // ============================================

    private function createSignature(string $secret, string $message): string
    {
        if ($secret === '') {
            return '';
        }
        return base64_encode(
            hash_hmac('sha256', $message, $secret, true)
        );
    }

    /**
     * Build authentication headers with HMAC signature.
     * The message format is METHOD:PATH:TIMESTAMP:BODY.
     *
     * @return array{signature: string, timestamp: string}
     */
    private function buildAuthHeaders(string $method, string $path, string $body = ''): array
    {
        $timestamp = (string) (round(microtime(true) * 1000));
        $message = "{$method}:{$path}:{$timestamp}:{$body}";
        $signature = $this->createSignature($this->secretKey, $message);

        return [
            'X-API-Key' => $this->apiKey,
            'X-Timestamp' => $timestamp,
            'X-Signature' => $signature,
            'X-Default-Currency' => $this->defaultCurrency,
            'Accept-Language' => $this->locale,
        ];
    }

    // ============================================
    // HTTP Helpers
    // ============================================

    /**
     * @param array<string, mixed> $options
     * @return array{status: int, body: string}
     * @throws HydraException
     */
    private function request(string $method, string $path, array $options = []): array
    {
        $body = $options['body'] ?? '';
        $authHeaders = $this->buildAuthHeaders($method, $path, $body);

        $headers = array_merge(
            $authHeaders,
            $options['headers'] ?? [],
        );

        try {
            $response = $this->httpClient->request($method, $path, [
                'headers' => $headers,
                'body' => $body,
            ]);
        } catch (BadResponseException $e) {
            $response = $e->getResponse();
            if ($response !== null) {
                $status = $response->getStatusCode();
                $body = (string) $response->getBody();
                $parsed = json_decode($body, true);
                $this->throwTypedError($status, is_array($parsed) ? $parsed : []);
            }
            throw new HydraException(
                message: "HTTP request failed: {$e->getMessage()}",
                errorCode: 'NETWORK_ERROR',
                previous: $e,
            );
        } catch (GuzzleException $e) {
            throw new HydraException(
                message: "HTTP request failed: {$e->getMessage()}",
                errorCode: 'NETWORK_ERROR',
                previous: $e,
            );
        }

        return [
            'status' => $response->getStatusCode(),
            'body' => (string) $response->getBody(),
        ];
    }

    /**
     * Send a request to a core API endpoint and parse the ApiResponse wrapper.
     *
     * @template T
     * @param string $method HTTP method
     * @param string $path API path
     * @param array<string, mixed>|null $data Request body data (null for no body)
     * @param callable(array): T|null $mapper Callable to transform response data
     * @return T
     * @throws HydraException
     */
    private function coreRequest(string $method, string $path, ?array $data = null, ?callable $mapper = null): mixed
    {
        $body = $data !== null ? json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : '';
        if ($body === false) {
            throw new HydraException(message: 'Failed to encode request body');
        }

        ['status' => $status, 'body' => $responseBody] = $this->request($method, $path, ['body' => $body]);

        $parsed = json_decode($responseBody, true);
        if (!is_array($parsed)) {
            throw new HydraException(message: 'Invalid JSON response from API');
        }

        $this->checkErrors($status, $parsed);

        $apiResponse = ApiResponse::fromArray($parsed, $mapper);

        if (!$apiResponse->success) {
            throw new HydraException(
                message: $apiResponse->error ?? 'Unknown error',
                errorCode: 'API_ERROR',
                statusCode: $status,
                details: $parsed,
            );
        }

        return $apiResponse->data;
    }

    /**
     * Send a request to a payment gateway endpoint (no ApiResponse wrapper).
     *
     * @param string $method HTTP method
     * @param string $path API path
     * @param array<string, mixed>|null $data Request body data
     * @return array Parsed JSON response
     * @throws HydraException
     */
    private function gatewayRequest(string $method, string $path, ?array $data = null): array
    {
        $body = $data !== null ? json_encode($data, JSON_UNESCAPED_SLASHES | JSON_UNESCAPED_UNICODE) : '';
        if ($body === false) {
            throw new HydraException(message: 'Failed to encode request body');
        }

        ['status' => $status, 'body' => $responseBody] = $this->request($method, $path, ['body' => $body]);

        $parsed = json_decode($responseBody, true);
        if (!is_array($parsed)) {
            throw new HydraException(message: 'Invalid JSON response from API');
        }

        if ($status >= 400) {
            $this->throwTypedError($status, $parsed);
        }

        return $parsed;
    }

    /**
     * Check for HTTP-level errors and throw typed exceptions.
     */
    private function checkErrors(int $statusCode, array $parsed): void
    {
        if ($statusCode >= 400) {
            $this->throwTypedError($statusCode, $parsed);
        }
    }

    /**
     * Map HTTP status codes to typed exceptions.
     */
    private function throwTypedError(int $statusCode, array $parsed): never
    {
        $error = $parsed['error'] ?? $parsed['message'] ?? 'Request failed';

        $exception = match ($statusCode) {
            401 => new AuthenticationException(message: $error, details: $parsed),
            404 => new NotFoundException(message: $error, details: $parsed),
            400 => new ValidationException(message: $error, details: $parsed),
            default => new HydraException(
                message: $error,
                errorCode: 'API_ERROR',
                statusCode: $statusCode,
                details: $parsed,
            ),
        };

        throw $exception;
    }

    // ============================================
    // Health
    // ============================================

    /**
     * Check the API service health.
     */
    public function healthCheck(): HealthResponse
    {
        $body = '';
        $authHeaders = $this->buildAuthHeaders('GET', '/health');

        try {
            $response = $this->httpClient->request('GET', '/health', [
                'headers' => $authHeaders,
                'http_errors' => false,
            ]);
        } catch (GuzzleException $e) {
            throw new HydraException(
                message: "Health check failed: {$e->getMessage()}",
                errorCode: 'NETWORK_ERROR',
                previous: $e,
            );
        }

        $parsed = json_decode((string) $response->getBody(), true);
        if (!is_array($parsed)) {
            throw new HydraException(message: 'Invalid health response');
        }

        return HealthResponse::fromArray($parsed);
    }

    // ============================================
    // Accounts
    // ============================================

    /**
     * Create a new account.
     */
    public function createAccount(string $ownerId, string $accountType, ?string $currency = null): Account
    {
        $request = new CreateAccountRequest(
            ownerId: $ownerId,
            accountType: $accountType,
            currency: $currency ?? $this->defaultCurrency,
        );

        return $this->coreRequest('POST', '/v1/api/accounts', $request->toArray(),
            mapper: fn(array $data) => Account::fromArray($data),
        );
    }

    /**
     * Get an account by its unique ID.
     */
    public function getAccount(string $accountId): Account
    {
        return $this->coreRequest('GET', "/v1/api/accounts/{$accountId}",
            mapper: fn(array $data) => Account::fromArray($data),
        );
    }

    /**
     * Get all accounts belonging to a specific owner.
     *
     * @return Account[]
     */
    public function getAccountsByOwner(string $ownerId): array
    {
        return $this->coreRequest('GET', "/v1/api/accounts/owner/{$ownerId}",
            mapper: fn(array $data) => array_map(
                fn(array $item) => Account::fromArray($item),
                $data,
            ),
        );
    }

    // ============================================
    // Transactions
    // ============================================

    /**
     * Transfer funds between two accounts.
     */
    public function transfer(
        string $sourceId,
        string $destId,
        string $amount,
        ?string $currency = null,
        ?string $reference = null,
    ): Transaction {
        $request = new TransferRequest(
            sourceId: $sourceId,
            destId: $destId,
            amount: $amount,
            currency: $currency ?? $this->defaultCurrency,
            reference: $reference,
        );

        return $this->coreRequest('POST', '/v1/api/transactions', $request->toArray(),
            mapper: fn(array $data) => Transaction::fromArray($data),
        );
    }

    /**
     * Get a transaction by its unique ID.
     */
    public function getTransaction(string $transactionId): Transaction
    {
        return $this->coreRequest('GET', "/v1/api/transactions/{$transactionId}",
            mapper: fn(array $data) => Transaction::fromArray($data),
        );
    }

    /**
     * Complete a pending transaction.
     */
    public function completeTransaction(string $transactionId): bool
    {
        $body = '';
        $authHeaders = $this->buildAuthHeaders('POST', "/v1/api/transactions/{$transactionId}/complete");

        try {
            $response = $this->httpClient->request('POST', "/v1/api/transactions/{$transactionId}/complete", [
                'headers' => $authHeaders,
                'http_errors' => false,
            ]);
        } catch (GuzzleException $e) {
            throw new HydraException(
                message: "Request failed: {$e->getMessage()}",
                errorCode: 'NETWORK_ERROR',
                previous: $e,
            );
        }

        $status = $response->getStatusCode();
        $parsed = json_decode((string) $response->getBody(), true);

        if ($status >= 400) {
            $this->throwTypedError($status, is_array($parsed) ? $parsed : []);
        }

        return $parsed['success'] ?? false;
    }

    /**
     * Fail a pending transaction.
     */
    public function failTransaction(string $transactionId): bool
    {
        $authHeaders = $this->buildAuthHeaders('POST', "/v1/api/transactions/{$transactionId}/fail");

        try {
            $response = $this->httpClient->request('POST', "/v1/api/transactions/{$transactionId}/fail", [
                'headers' => $authHeaders,
                'http_errors' => false,
            ]);
        } catch (GuzzleException $e) {
            throw new HydraException(
                message: "Request failed: {$e->getMessage()}",
                errorCode: 'NETWORK_ERROR',
                previous: $e,
            );
        }

        $status = $response->getStatusCode();
        $parsed = json_decode((string) $response->getBody(), true);

        if ($status >= 400) {
            $this->throwTypedError($status, is_array($parsed) ? $parsed : []);
        }

        return $parsed['success'] ?? false;
    }

    // ============================================
    // Wallets
    // ============================================

    /**
     * Create a new cryptocurrency wallet.
     */
    public function createWallet(
        string $ownerId,
        string $walletType,
        string $chain,
        string $address,
        ?string $encryptedPrivateKey = null,
    ): Wallet {
        $request = new CreateWalletRequest(
            ownerId: $ownerId,
            walletType: $walletType,
            chain: $chain,
            address: $address,
            encryptedPrivateKey: $encryptedPrivateKey,
        );

        return $this->coreRequest('POST', '/v1/api/wallets', $request->toArray(),
            mapper: fn(array $data) => Wallet::fromArray($data),
        );
    }

    /**
     * Get all wallets belonging to a specific owner.
     *
     * @return Wallet[]
     */
    public function getWallets(string $ownerId): array
    {
        return $this->coreRequest('GET', "/v1/api/wallets/owner/{$ownerId}",
            mapper: fn(array $data) => array_map(
                fn(array $item) => Wallet::fromArray($item),
                $data,
            ),
        );
    }

    /**
     * Submit a signed blockchain transaction for relay.
     */
    public function relayTransaction(string $walletId, string $signedTransaction): string
    {
        $data = ['signed_transaction' => $signedTransaction];
        $result = $this->coreRequest('POST', "/v1/api/wallets/{$walletId}/relay", $data,
            mapper: fn(array $data) => $data,
        );

        return $result['transaction_hash'] ?? '';
    }

    // ============================================
    // Splits
    // ============================================

    /**
     * Create a split payment rule.
     *
     * @param SplitEntry[] $splits
     */
    public function createSplit(
        string $total,
        array $splits,
        ?string $currency = null,
        ?string $reference = null,
    ): SplitRule {
        $request = new CreateSplitRequest(
            total: $total,
            splits: $splits,
            currency: $currency ?? $this->defaultCurrency,
            reference: $reference,
        );

        return $this->coreRequest('POST', '/v1/api/splits', $request->toArray(),
            mapper: fn(array $data) => SplitRule::fromArray($data),
        );
    }

    /**
     * Get a split rule by its unique ID.
     */
    public function getSplit(string $splitId): SplitRule
    {
        return $this->coreRequest('GET', "/v1/api/splits/{$splitId}",
            mapper: fn(array $data) => SplitRule::fromArray($data),
        );
    }

    // ============================================
    // Security
    // ============================================

    /**
     * Verify an HMAC-SHA256 signature (constant-time).
     * Used to verify webhook payload signatures from the Hydra service.
     */
    public function verifySignature(string $payload, string $signature): bool
    {
        $expected = $this->createSignature($this->secretKey, $payload);

        $expectedBin = base64_decode($expected, true);
        $givenBin = base64_decode($signature, true);

        if ($expectedBin === false || $givenBin === false) {
            return false;
        }

        if (strlen($expectedBin) !== strlen($givenBin)) {
            return false;
        }

        return hash_equals($expectedBin, $givenBin);
    }

    /**
     * Generate an HMAC-SHA256 signature for a message.
     */
    public function signMessage(string $message): string
    {
        return $this->createSignature($this->secretKey, $message);
    }

    // ============================================
    // Payment Gateway
    // ============================================

    /**
     * Tokenize raw card data into a secure token.
     */
    public function createCardToken(CardInput $card, ?string $merchantId = null): CreateTokenResponse
    {
        $data = [
            'card' => $card->toArray(),
        ];
        if ($merchantId !== null) {
            $data['merchant_id'] = $merchantId;
        }

        $result = $this->gatewayRequest('POST', '/v1/payments/tokens', $data);
        return CreateTokenResponse::fromArray($result);
    }

    /**
     * Create a payment intent to initiate a payment.
     */
    public function createPaymentIntent(
        int $amount,
        string $currency,
        ?string $token = null,
        ?string $merchantId = null,
        ?string $idempotencyKey = null,
    ): CreateIntentResponse {
        $data = [
            'amount' => $amount,
            'currency' => $currency,
        ];
        if ($token !== null) {
            $data['token'] = $token;
        }
        if ($merchantId !== null) {
            $data['merchant_id'] = $merchantId;
        }
        if ($idempotencyKey !== null) {
            $data['idempotency_key'] = $idempotencyKey;
        }

        $result = $this->gatewayRequest('POST', '/v1/payments/intents', $data);
        return CreateIntentResponse::fromArray($result);
    }

    /**
     * Refund a previous charge, partially or in full.
     */
    public function createRefund(string $chargeId, ?int $amount = null): CreateRefundResponse
    {
        $data = ['charge_id' => $chargeId];
        if ($amount !== null) {
            $data['amount'] = $amount;
        }

        $result = $this->gatewayRequest('POST', '/v1/refunds', $data);
        return CreateRefundResponse::fromArray($result);
    }

    /**
     * Get the total commission collected.
     */
    public function getCommission(): CommissionResponse
    {
        $result = $this->gatewayRequest('GET', '/v1/commission');
        return CommissionResponse::fromArray($result);
    }

    /**
     * Send a Stripe webhook event to the API (for testing).
     *
     * @param array<string, mixed> $payload
     */
    public function sendWebhookEvent(array $payload): WebhookResponse
    {
        $result = $this->gatewayRequest('POST', '/v1/webhooks/stripe', $payload);
        return WebhookResponse::fromArray($result);
    }

    /**
     * Get Prometheus-format metrics from the API.
     */
    public function getMetrics(): string
    {
        $authHeaders = $this->buildAuthHeaders('GET', '/v1/metrics');

        try {
            $response = $this->httpClient->request('GET', '/v1/metrics', [
                'headers' => $authHeaders,
                'http_errors' => false,
            ]);
        } catch (GuzzleException $e) {
            throw new HydraException(
                message: "Metrics request failed: {$e->getMessage()}",
                errorCode: 'NETWORK_ERROR',
                previous: $e,
            );
        }

        $status = $response->getStatusCode();
        if ($status >= 400) {
            $parsed = json_decode((string) $response->getBody(), true);
            $this->throwTypedError($status, is_array($parsed) ? $parsed : []);
        }

        return (string) $response->getBody();
    }
}
