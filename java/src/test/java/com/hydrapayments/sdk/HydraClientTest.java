package com.hydrapayments.sdk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hydrapayments.sdk.exception.*;
import com.hydrapayments.sdk.model.*;
import com.hydrapayments.sdk.util.SigningUtil;
import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.io.IOException;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.http.HttpClient;
import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

class HydraClientTest {

    private com.sun.net.httpserver.HttpServer server;
    private int port;
    private HydraClient client;
    private final ObjectMapper mapper = new ObjectMapper();

    private static class RequestCapture {
        String method;
        String path;
        Map<String, List<String>> headers;
        String body;
    }

    private RequestCapture lastRequest;

    @BeforeEach
    void setUp() throws IOException {
        server = com.sun.net.httpserver.HttpServer.create(new InetSocketAddress(0), 0);
        port = server.getAddress().getPort();
        server.setExecutor(null);
        server.start();

        client = new HydraClientBuilder()
            .baseUrl("http://localhost:" + port)
            .apiKey("pk_test")
            .secretKey("sk_test")
            .withDefaultCurrency("GBP")
            .withLocale("en")
            .timeout(Duration.ofSeconds(5))
            .build();
    }

    @AfterEach
    void tearDown() {
        if (server != null) {
            server.stop(0);
        }
    }

    private void stubResponse(String method, String path, int statusCode, String responseBody) {
        server.createContext(path, exchange -> {
            lastRequest = new RequestCapture();
            lastRequest.method = exchange.getRequestMethod();
            lastRequest.path = exchange.getRequestURI().toString();
            lastRequest.headers = exchange.getRequestHeaders();
            lastRequest.body = new String(exchange.getRequestBody().readAllBytes(), StandardCharsets.UTF_8);

            byte[] resp = responseBody.getBytes(StandardCharsets.UTF_8);
            exchange.getResponseHeaders().set("Content-Type", "application/json");
            exchange.sendResponseHeaders(statusCode, resp.length);
            try (OutputStream os = exchange.getResponseBody()) {
                os.write(resp);
            }
        });
    }

    // ============================================
    // Construction Tests
    // ============================================

    @Test
    void testBuilderDefaults() {
        HydraClient c = new HydraClientBuilder().build();
        // Just verify no exception is thrown and it creates a valid client
        assertNotNull(c);
    }

    @Test
    void testBuilderCustomValues() {
        HttpClient customHttpClient = HttpClient.newBuilder()
            .connectTimeout(Duration.ofSeconds(10))
            .build();

        HydraClient c = new HydraClientBuilder()
            .baseUrl("https://api.hydra.com")
            .apiKey("pk_custom")
            .secretKey("sk_custom")
            .withDefaultCurrency("EUR")
            .withLocale("fr")
            .timeout(Duration.ofSeconds(15))
            .httpClient(customHttpClient)
            .build();

        assertNotNull(c);
    }

    @Test
    void testBuilderTrailingSlashStripped() {
        HydraClient c = new HydraClientBuilder()
            .baseUrl("http://localhost:8080/")
            .build();
        assertNotNull(c);
    }

    // ============================================
    // HMAC Signing Tests
    // ============================================

    @Test
    void testSignMessageProducesNonEmptyBase64() {
        String sig = client.signMessage("test message");
        assertNotNull(sig);
        assertFalse(sig.isEmpty());
        byte[] decoded = Base64.getDecoder().decode(sig);
        assertEquals(32, decoded.length);
    }

    @Test
    void testSignMessageIsDeterministic() {
        String sig1 = client.signMessage("test");
        String sig2 = client.signMessage("test");
        assertEquals(sig1, sig2);
    }

    @Test
    void testSignMessageDifferentMessages() {
        String sig1 = client.signMessage("message one");
        String sig2 = client.signMessage("message two");
        assertNotEquals(sig1, sig2);
    }

    @Test
    void testSignMessageDifferentKeys() {
        HydraClient c1 = new HydraClientBuilder().secretKey("sk_key1").build();
        HydraClient c2 = new HydraClientBuilder().secretKey("sk_key2").build();
        assertNotEquals(c1.signMessage("test"), c2.signMessage("test"));
    }

    @Test
    void testSignMessageEmptyString() {
        String sig = client.signMessage("");
        assertNotNull(sig);
        assertFalse(sig.isEmpty());
        assertEquals(44, sig.length());
    }

    @Test
    void testSignMessageMatchesExpectedHmac() {
        String sig = client.signMessage("test");
        String expected = SigningUtil.signMessage("sk_test", "test");
        assertEquals(expected, sig);
    }

    @Test
    void testSignMessageEmptyKey() {
        HydraClient c = new HydraClientBuilder().secretKey("").build();
        assertEquals("", c.signMessage("test"));
    }

    // ============================================
    // Signature Verification Tests
    // ============================================

    @Test
    void testVerifySignatureValid() {
        String sig = client.signMessage("payload");
        assertTrue(client.verifySignature("payload", sig));
    }

    @Test
    void testVerifySignatureTamperedPayload() {
        String sig = client.signMessage("original payload");
        assertFalse(client.verifySignature("tampered payload", sig));
    }

    @Test
    void testVerifySignatureRandomString() {
        assertFalse(client.verifySignature("payload", "aaaaaaaaaaaa"));
    }

    @Test
    void testVerifySignatureEmpty() {
        assertFalse(client.verifySignature("payload", ""));
    }

    @Test
    void testVerifySignatureInvalidBase64() {
        assertFalse(client.verifySignature("payload", "!!!not-base64!!!"));
    }

    @Test
    void testVerifySignatureWrongKey() {
        HydraClient c1 = new HydraClientBuilder().secretKey("sk_key1").build();
        HydraClient c2 = new HydraClientBuilder().secretKey("sk_key2").build();
        String sig = c1.signMessage("payload");
        assertFalse(c2.verifySignature("payload", sig));
    }

    // ============================================
    // Health Check
    // ============================================

    @Test
    void testHealthCheck() throws Exception {
        String json = "{\"status\":\"healthy\",\"version\":\"1.0.0\",\"database\":\"connected\"}";
        stubResponse("GET", "/health", 200, json);

        HealthResponse health = client.healthCheck();
        assertEquals("healthy", health.getStatus());
        assertEquals("1.0.0", health.getVersion());
        assertEquals("connected", health.getDatabase());
        assertTrue(health.isHealthy());
    }

    @Test
    void testHealthCheckUnhealthy() {
        stubResponse("GET", "/health", 200, "{\"status\":\"unhealthy\",\"version\":\"1.0.0\",\"database\":\"disconnected\"}");

        HealthResponse health = client.healthCheck();
        assertFalse(health.isHealthy());
    }

    // ============================================
    // Accounts
    // ============================================

    @Test
    void testCreateAccount() {
        String responseJson = "{\"success\":true,\"data\":{\"id\":\"acc-1\",\"owner_id\":\"owner-123\",\"account_type\":\"personal\",\"currency\":\"GBP\",\"balance\":\"0.00\",\"created_at\":\"2024-01-01T00:00:00Z\"}}";
        stubResponse("POST", "/v1/api/accounts", 200, responseJson);

        Account account = client.createAccount("owner-123", "personal", null);
        assertEquals("acc-1", account.getId());
        assertEquals("owner-123", account.getOwnerId());
        assertEquals("personal", account.getAccountType());
        assertEquals("GBP", account.getCurrency());
        assertEquals("0.00", account.getBalance());
    }

    @Test
    void testCreateAccountWithCurrency() {
        String responseJson = "{\"success\":true,\"data\":{\"id\":\"acc-1\",\"owner_id\":\"owner-1\",\"account_type\":\"company\",\"currency\":\"USD\",\"balance\":\"0.00\",\"created_at\":\"t1\"}}";
        stubResponse("POST", "/v1/api/accounts", 200, responseJson);

        Account account = client.createAccount("owner-1", "company", "USD");
        assertEquals("USD", account.getCurrency());
    }

    @Test
    void testGetAccount() {
        String responseJson = "{\"success\":true,\"data\":{\"id\":\"acc-1\",\"owner_id\":\"owner-1\",\"account_type\":\"personal\",\"currency\":\"GBP\",\"balance\":\"100.00\",\"created_at\":\"t1\"}}";
        stubResponse("GET", "/v1/api/accounts/acc-1", 200, responseJson);

        Account account = client.getAccount("acc-1");
        assertEquals("acc-1", account.getId());
        assertEquals("100.00", account.getBalance());
    }

    @Test
    void testGetAccountsByOwner() {
        String responseJson = "{\"success\":true,\"data\":[{\"id\":\"acc-1\",\"owner_id\":\"owner-1\",\"account_type\":\"personal\",\"currency\":\"GBP\",\"balance\":\"10.00\",\"created_at\":\"t1\"},{\"id\":\"acc-2\",\"owner_id\":\"owner-1\",\"account_type\":\"personal\",\"currency\":\"GBP\",\"balance\":\"20.00\",\"created_at\":\"t1\"}]}";
        stubResponse("GET", "/v1/api/accounts/owner/owner-1", 200, responseJson);

        List<Account> accounts = client.getAccountsByOwner("owner-1");
        assertEquals(2, accounts.size());
        assertEquals("acc-1", accounts.get(0).getId());
        assertEquals("acc-2", accounts.get(1).getId());
    }

    @Test
    void testGetAccountsByOwnerEmpty() {
        stubResponse("GET", "/v1/api/accounts/owner/owner-1", 200, "{\"success\":true,\"data\":[]}");

        List<Account> accounts = client.getAccountsByOwner("owner-1");
        assertTrue(accounts.isEmpty());
    }

    // ============================================
    // Transactions
    // ============================================

    @Test
    void testTransfer() {
        String responseJson = "{\"success\":true,\"data\":{\"id\":\"tx-1\",\"amount\":\"100.00\",\"status\":\"pending\",\"currency\":\"GBP\",\"transaction_type\":\"transfer\",\"created_at\":\"t1\"}}";
        stubResponse("POST", "/v1/api/transactions", 200, responseJson);

        Transaction tx = client.transfer("src-1", "dst-1", "100.00", "GBP", "REF-1");
        assertEquals("tx-1", tx.getId());
        assertEquals("100.00", tx.getAmount());
        assertEquals("pending", tx.getStatus());
    }

    @Test
    void testGetTransaction() {
        String responseJson = "{\"success\":true,\"data\":{\"id\":\"tx-1\",\"amount\":\"99.99\",\"status\":\"completed\",\"currency\":\"GBP\",\"transaction_type\":\"transfer\",\"created_at\":\"t1\"}}";
        stubResponse("GET", "/v1/api/transactions/tx-1", 200, responseJson);

        Transaction tx = client.getTransaction("tx-1");
        assertEquals("tx-1", tx.getId());
        assertEquals("completed", tx.getStatus());
    }

    @Test
    void testCompleteTransaction() {
        stubResponse("POST", "/v1/api/transactions/tx-1/complete", 200, "{\"success\":true}");

        assertTrue(client.completeTransaction("tx-1"));
    }

    @Test
    void testCompleteTransactionFails() {
        stubResponse("POST", "/v1/api/transactions/tx-1/complete", 200, "{\"success\":false}");

        assertFalse(client.completeTransaction("tx-1"));
    }

    @Test
    void testFailTransaction() {
        stubResponse("POST", "/v1/api/transactions/tx-1/fail", 200, "{\"success\":true}");

        assertTrue(client.failTransaction("tx-1"));
    }

    @Test
    void testFailTransactionFails() {
        stubResponse("POST", "/v1/api/transactions/tx-1/fail", 200, "{\"success\":false}");

        assertFalse(client.failTransaction("tx-1"));
    }

    // ============================================
    // Wallets
    // ============================================

    @Test
    void testCreateWallet() {
        String responseJson = "{\"success\":true,\"data\":{\"id\":\"w-1\",\"owner_id\":\"owner-1\",\"wallet_type\":\"custodial\",\"chain\":\"ethereum\",\"address\":\"0xabc\",\"is_custodial\":true,\"created_at\":\"t1\"}}";
        stubResponse("POST", "/v1/api/wallets", 200, responseJson);

        Wallet w = client.createWallet("owner-1", "custodial", "ethereum", "0xabc", null);
        assertEquals("w-1", w.getId());
        assertEquals("ethereum", w.getChain());
        assertTrue(w.isCustodial());
    }

    @Test
    void testCreateWalletWithKey() {
        String responseJson = "{\"success\":true,\"data\":{\"id\":\"w-1\",\"owner_id\":\"owner-1\",\"wallet_type\":\"non-custodial\",\"chain\":\"solana\",\"address\":\"0xdef\",\"is_custodial\":false,\"encrypted_private_key\":\"enc_key\",\"created_at\":\"t1\"}}";
        stubResponse("POST", "/v1/api/wallets", 200, responseJson);

        Wallet w = client.createWallet("owner-1", "non-custodial", "solana", "0xdef", "enc_key");
        assertEquals("non-custodial", w.getWalletType());
        assertFalse(w.isCustodial());
        assertEquals("enc_key", w.getEncryptedPrivateKey());
    }

    @Test
    void testGetWallets() {
        String responseJson = "{\"success\":true,\"data\":[{\"id\":\"w-1\",\"owner_id\":\"owner-1\",\"wallet_type\":\"custodial\",\"chain\":\"ethereum\",\"address\":\"0x1\",\"is_custodial\":true,\"created_at\":\"t1\"},{\"id\":\"w-2\",\"owner_id\":\"owner-1\",\"wallet_type\":\"non-custodial\",\"chain\":\"bitcoin\",\"address\":\"0x2\",\"is_custodial\":false,\"created_at\":\"t1\"}]}";
        stubResponse("GET", "/v1/api/wallets/owner/owner-1", 200, responseJson);

        List<Wallet> wallets = client.getWallets("owner-1");
        assertEquals(2, wallets.size());
    }

    @Test
    void testGetWalletsEmpty() {
        stubResponse("GET", "/v1/api/wallets/owner/owner-1", 200, "{\"success\":true,\"data\":[]}");

        List<Wallet> wallets = client.getWallets("owner-1");
        assertTrue(wallets.isEmpty());
    }

    @Test
    void testRelayTransaction() {
        String responseJson = "{\"success\":true,\"data\":{\"transaction_hash\":\"0xhash123\"}}";
        stubResponse("POST", "/v1/api/wallets/w-1/relay", 200, responseJson);

        String hash = client.relayTransaction("w-1", "signed_tx");
        assertEquals("0xhash123", hash);
    }

    @Test
    void testRelayTransactionMissingHash() {
        String responseJson = "{\"success\":true,\"data\":{}}";
        stubResponse("POST", "/v1/api/wallets/w-1/relay", 200, responseJson);

        String hash = client.relayTransaction("w-1", "signed_tx");
        assertEquals("", hash);
    }

    // ============================================
    // Splits
    // ============================================

    @Test
    void testCreateSplit() {
        String responseJson = "{\"success\":true,\"data\":{\"id\":\"sp-1\",\"total\":\"100.00\",\"currency\":\"GBP\",\"splits\":[{\"account_id\":\"acc-1\",\"percentage\":60.0},{\"account_id\":\"acc-2\",\"percentage\":40.0}],\"status\":\"active\",\"created_at\":\"t1\"}}";
        stubResponse("POST", "/v1/api/splits", 200, responseJson);

        List<SplitEntry> splits = List.of(
            new SplitEntry("acc-1", 60.0),
            new SplitEntry("acc-2", 40.0)
        );
        SplitRule rule = client.createSplit("100.00", splits, "GBP", "REF-1");
        assertEquals("sp-1", rule.getId());
        assertEquals(2, rule.getSplits().size());
    }

    @Test
    void testGetSplit() {
        String responseJson = "{\"success\":true,\"data\":{\"id\":\"sp-1\",\"total\":\"100.00\",\"currency\":\"GBP\",\"splits\":[{\"account_id\":\"acc-1\",\"percentage\":100.0}],\"status\":\"active\",\"created_at\":\"t1\"}}";
        stubResponse("GET", "/v1/api/splits/sp-1", 200, responseJson);

        SplitRule rule = client.getSplit("sp-1");
        assertEquals("sp-1", rule.getId());
    }

    // ============================================
    // Payment Gateway
    // ============================================

    @Test
    void testCreateCardToken() {
        String responseJson = "{\"id\":\"tok_1\",\"card\":{\"brand\":\"visa\",\"last4\":\"4242\",\"exp_month\":12,\"exp_year\":2027},\"created_at\":\"t1\"}";
        stubResponse("POST", "/v1/payments/tokens", 200, responseJson);

        CardInput card = new CardInput("4242424242424242", 12, 2027, "123");
        CreateTokenResponse token = client.createCardToken(card, null);
        assertEquals("tok_1", token.getId());
        assertEquals("visa", token.getCard().getBrand());
    }

    @Test
    void testCreatePaymentIntent() {
        String responseJson = "{\"id\":\"pi_1\",\"status\":\"requires_action\",\"amount\":5000,\"currency\":\"GBP\",\"client_secret\":\"secret_xxx\"}";
        stubResponse("POST", "/v1/payments/intents", 200, responseJson);

        CreateIntentResponse intent = client.createPaymentIntent(5000, "GBP", "tok_1", "merchant_1", null);
        assertEquals("pi_1", intent.getId());
        assertEquals("requires_action", intent.getStatus());
        assertEquals(5000, intent.getAmount());
    }

    @Test
    void testCreatePaymentIntentWithIdempotencyKey() {
        String responseJson = "{\"id\":\"pi_1\",\"status\":\"succeeded\",\"amount\":1000,\"currency\":\"USD\",\"client_secret\":\"secret_xxx\"}";
        stubResponse("POST", "/v1/payments/intents", 200, responseJson);

        CreateIntentResponse intent = client.createPaymentIntent(1000, "USD", null, null, "idem-1");
        assertEquals("succeeded", intent.getStatus());
    }

    @Test
    void testCreateRefund() {
        String responseJson = "{\"id\":\"re_1\",\"status\":\"succeeded\",\"amount\":2500,\"charge\":\"ch_1\"}";
        stubResponse("POST", "/v1/refunds", 200, responseJson);

        CreateRefundResponse refund = client.createRefund("ch_1", 2500);
        assertEquals("re_1", refund.getId());
        assertEquals("succeeded", refund.getStatus());
    }

    @Test
    void testCreateRefundPartial() {
        String responseJson = "{\"id\":\"re_1\",\"status\":\"succeeded\",\"amount\":500,\"charge\":\"ch_1\"}";
        stubResponse("POST", "/v1/refunds", 200, responseJson);

        CreateRefundResponse refund = client.createRefund("ch_1", 500);
        assertEquals(500, refund.getAmount());
    }

    @Test
    void testGetCommission() {
        stubResponse("GET", "/v1/commission", 200, "{\"total_commission\":1550}");

        CommissionResponse commission = client.getCommission();
        assertEquals(1550, commission.getTotalCommission());
    }

    @Test
    void testGetCommissionZero() {
        stubResponse("GET", "/v1/commission", 200, "{\"total_commission\":0}");

        CommissionResponse commission = client.getCommission();
        assertEquals(0, commission.getTotalCommission());
    }

    @Test
    void testSendWebhookEvent() {
        stubResponse("POST", "/v1/webhooks/stripe", 200, "{\"received\":true}");

        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("type", "payment_intent.succeeded");
        WebhookResponse webhook = client.sendWebhookEvent(payload);
        assertTrue(webhook.isReceived());
    }

    @Test
    void testGetMetrics() {
        String metricsBody = "# TYPE hydra_payments_created_total counter\nhydra_payments_created_total 42\n";
        stubResponse("GET", "/v1/metrics", 200, metricsBody);

        String metrics = client.getMetrics();
        assertTrue(metrics.contains("hydra_payments_created_total"));
    }

    // ============================================
    // Error Handling
    // ============================================

    @Test
    void testAuthenticationError() {
        stubResponse("GET", "/v1/api/accounts/any", 401, "{\"success\":false,\"error\":\"Invalid API key\"}");

        assertThrows(AuthenticationException.class, () -> client.getAccount("any"));
    }

    @Test
    void testNotFoundError() {
        stubResponse("GET", "/v1/api/accounts/non-existent", 404, "{\"success\":false,\"error\":\"Account not found\"}");

        assertThrows(NotFoundException.class, () -> client.getAccount("non-existent"));
    }

    @Test
    void testValidationError() {
        stubResponse("POST", "/v1/api/accounts", 400, "{\"success\":false,\"error\":\"Invalid account type\"}");

        assertThrows(ValidationException.class, () -> client.createAccount("owner-1", "invalid", null));
    }

    @Test
    void testGenericApiError() {
        stubResponse("POST", "/v1/api/accounts", 402, "{\"success\":false,\"error\":\"Payment required\"}");

        assertThrows(HydraException.class, () -> client.createAccount("owner-1", "personal", null));
    }

    @Test
    void testGatewayError() {
        stubResponse("POST", "/v1/payments/tokens", 402, "{\"error\":\"invalid_card\",\"message\":\"Card number is invalid\"}");

        CardInput card = new CardInput("0000", 12, 2027, "123");
        assertThrows(HydraException.class, () -> client.createCardToken(card, null));
    }

    @Test
    void testHealthCheckServerError() {
        stubResponse("GET", "/health", 500, "{\"error\":\"Internal error\"}");

        assertThrows(HydraException.class, () -> client.healthCheck());
    }

    @Test
    void testCoreApiUnsuccessfulResponse() {
        stubResponse("GET", "/v1/api/accounts/acc-1", 200, "{\"success\":false,\"error\":\"Account not available\"}");

        assertThrows(HydraException.class, () -> client.getAccount("acc-1"));
    }

    // ============================================
    // Header Verification
    // ============================================

    @Test
    void testRequestIncludesAuthHeaders() {
        stubResponse("GET", "/v1/api/accounts/acc-1", 200, "{\"success\":true,\"data\":{\"id\":\"acc-1\",\"owner_id\":\"owner-1\",\"account_type\":\"personal\",\"currency\":\"GBP\",\"balance\":\"0.00\",\"created_at\":\"t1\"}}");

        client.getAccount("acc-1");

        assertNotNull(lastRequest);
        assertEquals("GET", lastRequest.method);
        Map<String, List<String>> headers = lastRequest.headers;
        assertTrue(headers.containsKey("X-API-Key"), "Missing X-API-Key header");
        assertEquals("pk_test", headers.get("X-API-Key").get(0));
        assertTrue(headers.containsKey("X-Timestamp"));
        assertTrue(headers.containsKey("X-Signature"));
        assertTrue(headers.containsKey("X-Default-Currency"));
        assertTrue(headers.containsKey("Accept-Language"));
    }

    @Test
    void testPostRequestIncludesBody() {
        String expectedBody = "{\"owner_id\":\"owner-1\",\"account_type\":\"personal\",\"currency\":\"GBP\"}";
        stubResponse("POST", "/v1/api/accounts", 200, "{\"success\":true,\"data\":{\"id\":\"acc-1\",\"owner_id\":\"owner-1\",\"account_type\":\"personal\",\"currency\":\"GBP\",\"balance\":\"0.00\",\"created_at\":\"t1\"}}");

        client.createAccount("owner-1", "personal", null);

        assertNotNull(lastRequest);
        assertEquals("POST", lastRequest.method);
        String body = lastRequest.body;
        assertTrue(body.contains("\"owner_id\":\"owner-1\""));
        assertTrue(body.contains("\"account_type\":\"personal\""));
        assertTrue(body.contains("\"currency\":\"GBP\""));
    }

    @Test
    void testPostRequestWithCustomCurrency() {
        stubResponse("POST", "/v1/api/accounts", 200, "{\"success\":true,\"data\":{\"id\":\"acc-1\",\"owner_id\":\"owner-1\",\"account_type\":\"personal\",\"currency\":\"USD\",\"balance\":\"0.00\",\"created_at\":\"t1\"}}");

        client.createAccount("owner-1", "personal", "USD");

        assertNotNull(lastRequest);
        String body = lastRequest.body;
        assertTrue(body.contains("\"currency\":\"USD\""));
    }

    @Test
    void testTransferWithoutReference() {
        stubResponse("POST", "/v1/api/transactions", 200, "{\"success\":true,\"data\":{\"id\":\"tx-1\",\"amount\":\"50.00\",\"status\":\"completed\",\"currency\":\"GBP\",\"transaction_type\":\"transfer\",\"created_at\":\"t1\"}}");

        Transaction tx = client.transfer("src-1", "dst-1", "50.00", null, null);
        assertEquals("50.00", tx.getAmount());
        assertEquals("completed", tx.getStatus());
    }
}
