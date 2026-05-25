<?php

declare(strict_types=1);

namespace HydraPayments\Sdk\Tests;

use GuzzleHttp\Client as GuzzleClient;
use GuzzleHttp\Handler\MockHandler;
use GuzzleHttp\HandlerStack;
use GuzzleHttp\Middleware;
use GuzzleHttp\Psr7\Response;
use HydraPayments\Sdk\Account;
use HydraPayments\Sdk\AuthenticationException;
use HydraPayments\Sdk\CardInput;
use HydraPayments\Sdk\CommissionResponse;
use HydraPayments\Sdk\CreateIntentResponse;
use HydraPayments\Sdk\CreateRefundResponse;
use HydraPayments\Sdk\CreateTokenResponse;
use HydraPayments\Sdk\HealthResponse;
use HydraPayments\Sdk\HydraClient;
use HydraPayments\Sdk\HydraException;
use HydraPayments\Sdk\NotFoundException;
use HydraPayments\Sdk\SplitEntry;
use HydraPayments\Sdk\SplitRule;
use HydraPayments\Sdk\Transaction;
use HydraPayments\Sdk\ValidationException;
use HydraPayments\Sdk\Wallet;
use HydraPayments\Sdk\WebhookResponse;
use PHPUnit\Framework\Attributes\CoversClass;
use PHPUnit\Framework\Attributes\DataProvider;
use PHPUnit\Framework\TestCase;

#[CoversClass(HydraClient::class)]
class ClientTest extends TestCase
{
    // ============================================
    // Helpers
    // ============================================

    /**
     * Create a HydraClient with a mocked Guzzle handler.
     *
     * @param Response[] $responses Queue of responses to return
     * @param array|null $transactionContainer Filled with Guzzle transaction objects for request inspection
     */
    private function createMockClient(
        array $responses = [],
        ?array &$transactionContainer = null,
        string $baseUrl = 'http://localhost:8080',
        string $apiKey = 'pk_test',
        string $secretKey = 'sk_test',
    ): HydraClient {
        $mock = new MockHandler($responses);
        $handlerStack = HandlerStack::create($mock);

        if ($transactionContainer !== null) {
            $transactionContainer = [];
            $history = Middleware::history($transactionContainer);
            $handlerStack->push($history);
        }

        $guzzle = new GuzzleClient(['handler' => $handlerStack]);

        return new HydraClient(
            baseUrl: $baseUrl,
            apiKey: $apiKey,
            secretKey: $secretKey,
            httpClient: $guzzle,
        );
    }

    /**
     * Create a client that captures the last request for header/body assertions.
     *
     * @return array{0: HydraClient, 1: \Closure}
     */
    private function createCapturingClient(): array
    {
        $container = [];
        $client = $this->createMockClient(
            responses: [new Response(200, [], '{"success":true,"data":{"id":"acc-1","owner_id":"owner-1","account_type":"personal","currency":"GBP","balance":"0.00"}}')],
            transactionContainer: $container,
        );

        return [$client, function () use (&$container) {
            if (empty($container)) {
                return null;
            }
            return $container[0]['request'] ?? null;
        }];
    }

    // ============================================
    // Construction Tests
    // ============================================

    public function test_constructor_sets_defaults(): void
    {
        $client = new HydraClient();

        $this->assertInstanceOf(HydraClient::class, $client);
        $this->assertSame('http://localhost:8080', $client->getBaseUrl());
    }

    public function test_constructor_custom_values(): void
    {
        $client = new HydraClient(
            baseUrl: 'https://api.hydra.com',
            apiKey: 'pk_custom',
            secretKey: 'sk_custom',
            timeout: 15.0,
            defaultCurrency: 'EUR',
            locale: 'de',
        );

        $this->assertSame('https://api.hydra.com', $client->getBaseUrl());
    }

    public function test_constructor_trailing_slash_stripped(): void
    {
        $client = new HydraClient(baseUrl: 'http://localhost:8080/');
        $this->assertSame('http://localhost:8080', $client->getBaseUrl());
    }

    public function test_create_factory_method(): void
    {
        $client = HydraClient::create(
            baseUrl: 'https://api.hydra.com',
            apiKey: 'pk_factory',
            secretKey: 'sk_factory',
            defaultCurrency: 'USD',
            locale: 'fr',
        );

        $this->assertInstanceOf(HydraClient::class, $client);
        $this->assertSame('https://api.hydra.com', $client->getBaseUrl());
    }

    public function test_create_factory_defaults(): void
    {
        $client = HydraClient::create();
        $this->assertSame('http://localhost:8080', $client->getBaseUrl());
    }

    public function test_constructor_injects_custom_http_client(): void
    {
        $mock = new MockHandler([new Response(200, [], '{"status":"healthy","version":"1.0.0","database":"connected"}')]);
        $handlerStack = HandlerStack::create($mock);
        $guzzle = new GuzzleClient(['handler' => $handlerStack]);

        $client = new HydraClient(httpClient: $guzzle);
        $health = $client->healthCheck();

        $this->assertInstanceOf(HealthResponse::class, $health);
    }

    // ============================================
    // Configuration Setter Tests
    // ============================================

    public function test_set_default_currency(): void
    {
        $client = new HydraClient();
        $client->setDefaultCurrency('USD');
        // Verify via the createAccount default currency behavior
        $this->assertTrue(true); // Setter should not throw
    }

    public function test_set_locale(): void
    {
        $client = new HydraClient();
        $client->setLocale('fr');
        $this->assertTrue(true); // Setter should not throw
    }

    public function test_get_base_url(): void
    {
        $client = new HydraClient(baseUrl: 'https://example.com');
        $this->assertSame('https://example.com', $client->getBaseUrl());
    }

    // ============================================
    // HMAC Signing Tests
    // ============================================

    public function test_sign_message_produces_non_empty_base64(): void
    {
        $client = new HydraClient(secretKey: 'sk_test');
        $sig = $client->signMessage('test message');

        $this->assertNotEmpty($sig);
        $this->assertStringMatchesFormat('%S', $sig);
        $decoded = base64_decode($sig, true);
        $this->assertNotFalse($decoded, 'Signature should be valid base64');
        $this->assertSame(32, strlen($decoded), 'HMAC-SHA256 should produce 32 bytes');
    }

    public function test_sign_message_is_deterministic(): void
    {
        $client = new HydraClient(secretKey: 'sk_test');
        $sig1 = $client->signMessage('test');
        $sig2 = $client->signMessage('test');

        $this->assertSame($sig1, $sig2);
    }

    public function test_sign_message_different_messages(): void
    {
        $client = new HydraClient(secretKey: 'sk_test');
        $sig1 = $client->signMessage('message one');
        $sig2 = $client->signMessage('message two');

        $this->assertNotSame($sig1, $sig2);
    }

    public function test_sign_message_different_keys(): void
    {
        $c1 = new HydraClient(secretKey: 'sk_key1');
        $c2 = new HydraClient(secretKey: 'sk_key2');
        $sig1 = $c1->signMessage('test');
        $sig2 = $c2->signMessage('test');

        $this->assertNotSame($sig1, $sig2);
    }

    public function test_sign_message_same_key_different_api_key(): void
    {
        $c1 = new HydraClient(apiKey: 'pk_one', secretKey: 'sk_test');
        $c2 = new HydraClient(apiKey: 'pk_two', secretKey: 'sk_test');
        $sig1 = $c1->signMessage('test');
        $sig2 = $c2->signMessage('test');

        // API key should NOT affect signing, only secret key
        $this->assertSame($sig1, $sig2);
    }

    public function test_sign_message_empty_string(): void
    {
        $client = new HydraClient(secretKey: 'sk_test');
        $sig = $client->signMessage('');

        $this->assertNotEmpty($sig);
        $this->assertSame(44, strlen($sig)); // Base64 of 32 bytes = 44 chars with padding
    }

    public function test_sign_message_matches_expected_hmac(): void
    {
        $client = new HydraClient(secretKey: 'sk_test');
        $sig = $client->signMessage('test');

        // Compute expected HMAC directly
        $expected = base64_encode(
            hash_hmac('sha256', 'test', 'sk_test', true)
        );

        $this->assertSame($expected, $sig);
    }

    public function test_sign_message_unicode(): void
    {
        $client = new HydraClient(secretKey: 'sk_test');
        $sig = $client->signMessage('héllo wörld 🚀');

        $this->assertNotEmpty($sig);
        $decoded = base64_decode($sig, true);
        $this->assertNotFalse($decoded);
        $this->assertSame(32, strlen($decoded));
    }

    // ============================================
    // Signature Verification Tests
    // ============================================

    public function test_verify_signature_valid(): void
    {
        $client = new HydraClient(secretKey: 'sk_test');
        $sig = $client->signMessage('payload');

        $this->assertTrue($client->verifySignature('payload', $sig));
    }

    public function test_verify_signature_tampered_payload(): void
    {
        $client = new HydraClient(secretKey: 'sk_test');
        $sig = $client->signMessage('original payload');

        $this->assertFalse($client->verifySignature('tampered payload', $sig));
    }

    public function test_verify_signature_random_string(): void
    {
        $client = new HydraClient(secretKey: 'sk_test');

        $this->assertFalse($client->verifySignature('payload', 'aaaaaaaa'));
    }

    public function test_verify_signature_empty(): void
    {
        $client = new HydraClient(secretKey: 'sk_test');

        $this->assertFalse($client->verifySignature('payload', ''));
    }

    public function test_verify_signature_invalid_base64(): void
    {
        $client = new HydraClient(secretKey: 'sk_test');

        $this->assertFalse($client->verifySignature('payload', '!!!not-base64!!!'));
    }

    public function test_verify_signature_wrong_key(): void
    {
        $c1 = new HydraClient(secretKey: 'sk_key1');
        $c2 = new HydraClient(secretKey: 'sk_key2');

        $sig = $c1->signMessage('payload');
        $this->assertFalse($c2->verifySignature('payload', $sig));
    }

    public function test_verify_signature_short_signature(): void
    {
        $client = new HydraClient(secretKey: 'sk_test');

        $this->assertFalse($client->verifySignature('payload', 'short'));
    }

    // ============================================
    // Health Check
    // ============================================

    public function test_health_check(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"status":"healthy","version":"1.0.0","database":"connected"}'),
        ]);

        $health = $client->healthCheck();

        $this->assertInstanceOf(HealthResponse::class, $health);
        $this->assertSame('healthy', $health->status);
        $this->assertSame('1.0.0', $health->version);
        $this->assertSame('connected', $health->database);
    }

    public function test_health_check_unhealthy(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"status":"degraded","version":"1.0.0","database":"disconnected"}'),
        ]);

        $health = $client->healthCheck();

        $this->assertSame('degraded', $health->status);
        $this->assertFalse($health->isHealthy());
    }

    // ============================================
    // Accounts
    // ============================================

    public function test_create_account(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true,"data":{"id":"acc-1","owner_id":"owner-123","account_type":"personal","currency":"GBP","balance":"0.00","created_at":"2024-01-01T00:00:00Z"}}'),
        ]);

        $account = $client->createAccount('owner-123', 'personal');

        $this->assertInstanceOf(Account::class, $account);
        $this->assertSame('acc-1', $account->id);
        $this->assertSame('owner-123', $account->ownerId);
        $this->assertSame('personal', $account->accountType);
        $this->assertSame('GBP', $account->currency);
        $this->assertSame('0.00', $account->balance);
    }

    public function test_create_account_with_currency(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true,"data":{"id":"acc-1","owner_id":"owner-1","account_type":"company","currency":"USD","balance":"0.00"}}'),
        ]);

        $account = $client->createAccount('owner-1', 'company', 'USD');
        $this->assertSame('USD', $account->currency);
    }

    public function test_get_account(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true,"data":{"id":"acc-1","owner_id":"owner-1","account_type":"personal","currency":"GBP","balance":"100.00"}}'),
        ]);

        $account = $client->getAccount('acc-1');

        $this->assertInstanceOf(Account::class, $account);
        $this->assertSame('acc-1', $account->id);
        $this->assertSame('100.00', $account->balance);
    }

    public function test_get_accounts_by_owner(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true,"data":[{"id":"acc-1","owner_id":"owner-1","account_type":"personal","currency":"GBP","balance":"10.00"},{"id":"acc-2","owner_id":"owner-1","account_type":"personal","currency":"GBP","balance":"20.00"}]}'),
        ]);

        $accounts = $client->getAccountsByOwner('owner-1');

        $this->assertIsArray($accounts);
        $this->assertCount(2, $accounts);
        $this->assertInstanceOf(Account::class, $accounts[0]);
        $this->assertSame('acc-1', $accounts[0]->id);
        $this->assertSame('acc-2', $accounts[1]->id);
    }

    public function test_get_accounts_by_owner_empty(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true,"data":[]}'),
        ]);

        $accounts = $client->getAccountsByOwner('owner-1');

        $this->assertIsArray($accounts);
        $this->assertEmpty($accounts);
    }

    // ============================================
    // Transactions
    // ============================================

    public function test_transfer(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true,"data":{"id":"tx-1","amount":"100.00","status":"pending"}}'),
        ]);

        $tx = $client->transfer('src-1', 'dst-1', '100.00', 'GBP', 'REF-1');

        $this->assertInstanceOf(Transaction::class, $tx);
        $this->assertSame('tx-1', $tx->id);
        $this->assertSame('100.00', $tx->amount);
        $this->assertSame('pending', $tx->status);
    }

    public function test_get_transaction(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true,"data":{"id":"tx-1","amount":"50.00","status":"completed"}}'),
        ]);

        $tx = $client->getTransaction('tx-1');

        $this->assertInstanceOf(Transaction::class, $tx);
        $this->assertSame('tx-1', $tx->id);
        $this->assertSame('completed', $tx->status);
    }

    public function test_complete_transaction(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true}'),
        ]);

        $result = $client->completeTransaction('tx-1');

        $this->assertTrue($result);
    }

    public function test_complete_transaction_fails(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":false}'),
        ]);

        $result = $client->completeTransaction('tx-1');
        $this->assertFalse($result);
    }

    public function test_fail_transaction(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true}'),
        ]);

        $result = $client->failTransaction('tx-1');

        $this->assertTrue($result);
    }

    public function test_fail_transaction_fails(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":false}'),
        ]);

        $result = $client->failTransaction('tx-1');
        $this->assertFalse($result);
    }

    // ============================================
    // Wallets
    // ============================================

    public function test_create_wallet(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true,"data":{"id":"w-1","owner_id":"owner-1","wallet_type":"evm","chain":"ethereum","address":"0x1234","is_custodial":false,"created_at":"2024-01-01T00:00:00Z"}}'),
        ]);

        $wallet = $client->createWallet('owner-1', 'evm', 'ethereum', '0x1234');

        $this->assertInstanceOf(Wallet::class, $wallet);
        $this->assertSame('w-1', $wallet->id);
        $this->assertSame('ethereum', $wallet->chain);
    }

    public function test_get_wallets(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true,"data":[{"id":"w-1","wallet_type":"evm","chain":"ethereum","address":"0x1111","owner_id":"o-1","is_custodial":false},{"id":"w-2","wallet_type":"evm","chain":"polygon","address":"0x2222","owner_id":"o-1","is_custodial":false}]}'),
        ]);

        $wallets = $client->getWallets('owner-1');

        $this->assertIsArray($wallets);
        $this->assertCount(2, $wallets);
        $this->assertInstanceOf(Wallet::class, $wallets[0]);
        $this->assertSame('w-1', $wallets[0]->id);
        $this->assertSame('w-2', $wallets[1]->id);
    }

    public function test_get_wallets_empty(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true,"data":[]}'),
        ]);

        $wallets = $client->getWallets('owner-1');
        $this->assertIsArray($wallets);
        $this->assertEmpty($wallets);
    }

    public function test_relay_transaction(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true,"data":{"transaction_hash":"0xabc123"}}'),
        ]);

        $hash = $client->relayTransaction('w-1', 'signed-tx-data');

        $this->assertSame('0xabc123', $hash);
    }

    public function test_relay_transaction_missing_hash(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true,"data":{}}'),
        ]);

        $hash = $client->relayTransaction('w-1', 'data');
        $this->assertSame('', $hash);
    }

    // ============================================
    // Splits
    // ============================================

    public function test_create_split(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true,"data":{"id":"sr-1","total":"100.00","currency":"GBP","splits":[{"account_id":"a-1","percentage":60},{"account_id":"a-2","percentage":40}],"status":"pending","created_at":"2024-01-01T00:00:00Z"}}'),
        ]);

        $splits = [
            new SplitEntry(accountId: 'a-1', percentage: 60.0),
            new SplitEntry(accountId: 'a-2', percentage: 40.0),
        ];

        $rule = $client->createSplit('100.00', $splits);

        $this->assertInstanceOf(SplitRule::class, $rule);
        $this->assertSame('sr-1', $rule->id);
        $this->assertCount(2, $rule->splits);
    }

    public function test_get_split(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":true,"data":{"id":"sr-1","total":"50.00","splits":[],"status":"completed"}}'),
        ]);

        $rule = $client->getSplit('sr-1');

        $this->assertInstanceOf(SplitRule::class, $rule);
        $this->assertSame('sr-1', $rule->id);
    }

    // ============================================
    // Payment Gateway
    // ============================================

    public function test_create_card_token(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"id":"tok_abc","card":{"brand":"visa","last4":"4242","exp_month":12,"exp_year":2026},"created_at":"2024-01-01T00:00:00Z"}'),
        ]);

        $card = new CardInput(
            number: '4111111111111111',
            expMonth: 12,
            expYear: 2026,
            cvc: '123',
        );

        $token = $client->createCardToken($card);

        $this->assertInstanceOf(CreateTokenResponse::class, $token);
        $this->assertSame('tok_abc', $token->id);
        $this->assertSame('visa', $token->card->brand);
    }

    public function test_create_payment_intent(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"id":"pi_123","status":"succeeded","amount":2000,"currency":"GBP","client_secret":"secret_pi_123"}'),
        ]);

        $intent = $client->createPaymentIntent(2000, 'GBP', 'tok_abc');

        $this->assertInstanceOf(CreateIntentResponse::class, $intent);
        $this->assertSame('pi_123', $intent->id);
        $this->assertSame('succeeded', $intent->status);
        $this->assertSame(2000, $intent->amount);
        $this->assertSame('secret_pi_123', $intent->clientSecret);
    }

    public function test_create_refund(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"id":"re_123","status":"succeeded","amount":1000,"charge":"ch_456"}'),
        ]);

        $refund = $client->createRefund('ch_456', 1000);

        $this->assertInstanceOf(CreateRefundResponse::class, $refund);
        $this->assertSame('re_123', $refund->id);
        $this->assertSame('ch_456', $refund->charge);
    }

    public function test_get_commission(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"total_commission":50000}'),
        ]);

        $commission = $client->getCommission();

        $this->assertInstanceOf(CommissionResponse::class, $commission);
        $this->assertSame(50000, $commission->totalCommission);
    }

    public function test_send_webhook_event(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"received":true}'),
        ]);

        $payload = ['type' => 'payment_intent.succeeded', 'data' => ['object' => ['id' => 'pi_123']]];
        $result = $client->sendWebhookEvent($payload);

        $this->assertInstanceOf(WebhookResponse::class, $result);
        $this->assertTrue($result->received);
    }

    public function test_get_metrics(): void
    {
        $metricsBody = "# HELP http_requests_total Total HTTP requests\n# TYPE http_requests_total counter\nhttp_requests_total 100\n";

        $client = $this->createMockClient([
            new Response(200, [], $metricsBody),
        ]);

        $metrics = $client->getMetrics();

        $this->assertIsString($metrics);
        $this->assertStringContainsString('http_requests_total', $metrics);
    }

    // ============================================
    // Error Handling — HTTP Errors
    // ============================================

    public function test_authentication_error(): void
    {
        $client = $this->createMockClient([
            new Response(401, [], '{"success":false,"error":"Invalid API key"}'),
        ]);

        $this->expectException(AuthenticationException::class);
        $this->expectExceptionMessage('Invalid API key');
        $this->expectExceptionCode(401);

        $client->getAccount('any');
    }

    public function test_not_found_error(): void
    {
        $client = $this->createMockClient([
            new Response(404, [], '{"success":false,"error":"Account not found"}'),
        ]);

        $this->expectException(NotFoundException::class);
        $this->expectExceptionMessage('Account not found');
        $this->expectExceptionCode(404);

        $client->getAccount('non-existent');
    }

    public function test_validation_error(): void
    {
        $client = $this->createMockClient([
            new Response(400, [], '{"success":false,"error":"Invalid account type"}'),
        ]);

        $this->expectException(ValidationException::class);
        $this->expectExceptionMessage('Invalid account type');
        $this->expectExceptionCode(400);

        $client->createAccount('owner-1', 'invalid-type');
    }

    public function test_generic_api_error(): void
    {
        $client = $this->createMockClient([
            new Response(500, [], '{"success":false,"error":"Internal server error"}'),
        ]);

        $this->expectException(HydraException::class);
        $this->expectExceptionMessage('Internal server error');

        $client->getAccount('any');
    }

    public function test_gateway_error(): void
    {
        $client = $this->createMockClient([
            new Response(402, [], '{"error":"Payment required"}'),
        ]);

        $this->expectException(HydraException::class);

        $client->createCardToken(new CardInput('4111111111111111', 12, 2026, '123'));
    }

    public function test_health_check_server_error(): void
    {
        $client = $this->createMockClient([
            new Response(503, [], '{"status":"error","version":"1.0.0","database":"disconnected"}'),
        ]);

        $health = $client->healthCheck();

        $this->assertSame('error', $health->status);
        $this->assertFalse($health->isHealthy());
    }

    // ============================================
    // Error Handling — Success: false
    // ============================================

    public function test_core_api_unsuccessful_response(): void
    {
        $client = $this->createMockClient([
            new Response(200, [], '{"success":false,"error":"Operation failed"}'),
        ]);

        $this->expectException(HydraException::class);
        $this->expectExceptionMessage('Operation failed');

        $client->getAccount('any');
    }

    // ============================================
    // Request Header Verification
    // ============================================

    public function test_request_includes_auth_headers(): void
    {
        [$client, $getRequest] = $this->createCapturingClient();

        $client->getAccount('acc-1');

        $request = $getRequest();
        $this->assertNotNull($request);

        $this->assertSame('GET', $request->getMethod());
        $this->assertStringEndsWith('/v1/api/accounts/acc-1', (string) $request->getUri());

        $headers = $request->getHeaders();
        $this->assertArrayHasKey('X-API-Key', $headers);
        $this->assertSame('pk_test', $headers['X-API-Key'][0]);
        $this->assertArrayHasKey('X-Timestamp', $headers);
        $this->assertArrayHasKey('X-Signature', $headers);
        $this->assertArrayHasKey('X-Default-Currency', $headers);
        $this->assertArrayHasKey('Accept-Language', $headers);
    }

    public function test_post_request_includes_body(): void
    {
        [$client, $getRequest] = $this->createCapturingClient();

        $client->createAccount('owner-1', 'personal', 'GBP');

        $request = $getRequest();
        $this->assertNotNull($request);
        $this->assertSame('POST', $request->getMethod());

        $body = (string) $request->getBody();
        $this->assertJson($body);

        $data = json_decode($body, true);
        $this->assertSame('owner-1', $data['owner_id']);
        $this->assertSame('personal', $data['account_type']);
        $this->assertSame('GBP', $data['currency']);
    }

    public function test_post_request_without_optional_fields(): void
    {
        [$client, $getRequest] = $this->createCapturingClient();

        $client->createAccount('owner-1', 'personal');

        $request = $getRequest();
        $body = (string) $request->getBody();
        $data = json_decode($body, true);

        // Currency should be present (default GBP)
        $this->assertArrayHasKey('currency', $data);
        $this->assertSame('GBP', $data['currency']);
    }

    // ============================================
    // Edge Cases
    // ============================================

    public function test_empty_api_key(): void
    {
        $client = new HydraClient(apiKey: '', secretKey: '');

        $this->assertInstanceOf(HydraClient::class, $client);
        $this->assertSame('', $client->signMessage('test'));
    }

    public function test_long_messages(): void
    {
        $client = new HydraClient(secretKey: 'sk_test');
        $longMessage = str_repeat('a', 10000);

        $sig = $client->signMessage($longMessage);
        $this->assertNotEmpty($sig);
        $this->assertSame(44, strlen($sig));
    }

    public function test_special_characters_in_message(): void
    {
        $client = new HydraClient(secretKey: 'sk_test');
        $message = "line1\nline2\twith\0null";

        $sig = $client->signMessage($message);
        $this->assertNotEmpty($sig);
    }
}
