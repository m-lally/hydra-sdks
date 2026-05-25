using System.Net;
using System.Text;
using System.Text.Json;
using HydraPayments.Sdk.Exceptions;
using HydraPayments.Sdk.Models;
using Xunit;

namespace HydraPayments.Sdk.Tests;

public class HydraClientTest
{
    private readonly MockHttpHandler _handler;
    private readonly HttpClient _httpClient;
    private readonly IHydraClient _client;

    public HydraClientTest()
    {
        _handler = new MockHttpHandler();
        _httpClient = new HttpClient(_handler);
        _client = new HydraClientBuilder()
            .BaseUrl("http://localhost:9999")
            .ApiKey("test-api-key")
            .SecretKey("test-secret-key")
            .DefaultCurrency("GBP")
            .Locale("en")
            .HttpClient(_httpClient)
            .Build();
    }

    // ── Builder Tests ──

    [Fact]
    public void Builder_Defaults()
    {
        var c = new HydraClientBuilder()
            .ApiKey("k")
            .SecretKey("s")
            .Build();

        Assert.NotNull(c);
    }

    [Fact]
    public async Task Builder_TrailingSlash_IsStripped()
    {
        var handler = new MockHttpHandler();
        handler.StubResponse(200, "{\"status\":\"healthy\",\"version\":\"1.0\",\"database\":\"ok\"}");

        var httpClient = new HttpClient(handler);
        var c = new HydraClientBuilder()
            .BaseUrl("http://localhost:9999/")
            .ApiKey("k")
            .SecretKey("s")
            .HttpClient(httpClient)
            .Build();

        await c.HealthCheckAsync();
        Assert.StartsWith("http://localhost:9999/health", handler.LastRequest!.RequestUri!.ToString());
    }

    // ── HMAC Signing Tests ──

    [Fact]
    public void SignMessage_ReturnsNonEmptyBase64()
    {
        var sig = _client.SignMessage("GET:/health:1234567890:");
        Assert.False(string.IsNullOrEmpty(sig));
        Assert.IsType<string>(sig);
    }

    [Fact]
    public void SignMessage_EmptySecret_ReturnsEmpty()
    {
        var handler = new MockHttpHandler();
        var httpClient = new HttpClient(handler);
        var client = new HydraClientBuilder()
            .ApiKey("k")
            .SecretKey("")
            .HttpClient(httpClient)
            .Build();

        var sig = client.SignMessage("test");
        Assert.Equal("", sig);
    }

    [Fact]
    public void SignMessage_Deterministic()
    {
        var sig1 = _client.SignMessage("GET:/health:1234567890:");
        var sig2 = _client.SignMessage("GET:/health:1234567890:");
        Assert.Equal(sig1, sig2);
    }

    [Fact]
    public void SignMessage_DifferentMessages_DifferentSignatures()
    {
        var sig1 = _client.SignMessage("GET:/health:1234567890:");
        var sig2 = _client.SignMessage("POST:/api/accounts:1234567890:");
        Assert.NotEqual(sig1, sig2);
    }

    [Fact]
    public void SignMessage_DifferentKeys_DifferentSignatures()
    {
        var handler1 = new MockHttpHandler();
        var handler2 = new MockHttpHandler();
        var client1 = new HydraClientBuilder().ApiKey("k1").SecretKey("key1").HttpClient(new HttpClient(handler1)).Build();
        var client2 = new HydraClientBuilder().ApiKey("k2").SecretKey("key2").HttpClient(new HttpClient(handler2)).Build();

        var sig1 = client1.SignMessage("test");
        var sig2 = client2.SignMessage("test");
        Assert.NotEqual(sig1, sig2);
    }

    [Fact]
    public void SignMessage_MatchesExpectedHMAC()
    {
        var sig = _client.SignMessage("test-message");
        var expected = Convert.ToBase64String(
            new System.Security.Cryptography.HMACSHA256(
                Encoding.UTF8.GetBytes("test-secret-key")
            ).ComputeHash(Encoding.UTF8.GetBytes("test-message"))
        );
        Assert.Equal(expected, sig);
    }

    // ── Signature Verification Tests ──

    [Fact]
    public void VerifySignature_Valid_ReturnsTrue()
    {
        var sig = _client.SignMessage("test");
        Assert.True(_client.VerifySignature("test", sig));
    }

    [Fact]
    public void VerifySignature_TamperedPayload_ReturnsFalse()
    {
        var sig = _client.SignMessage("test");
        Assert.False(_client.VerifySignature("tampered", sig));
    }

    [Fact]
    public void VerifySignature_WrongKey_ReturnsFalse()
    {
        var handler = new MockHttpHandler();
        var client = new HydraClientBuilder().ApiKey("k").SecretKey("key-a").HttpClient(new HttpClient(handler)).Build();
        var client2 = new HydraClientBuilder().ApiKey("k").SecretKey("key-b").HttpClient(new HttpClient(handler)).Build();

        var sig = client.SignMessage("test");
        Assert.False(client2.VerifySignature("test", sig));
    }

    [Fact]
    public void VerifySignature_EmptyKey_EmptySig_ReturnsTrue()
    {
        var handler = new MockHttpHandler();
        var client = new HydraClientBuilder().ApiKey("k").SecretKey("").HttpClient(new HttpClient(handler)).Build();
        Assert.True(client.VerifySignature("test", ""));
    }

    // ── Health Check Tests ──

    [Fact]
    public async Task HealthCheck_ReturnsHealthy()
    {
        _handler.StubResponse(200, "{\"status\":\"healthy\",\"version\":\"1.0.0\",\"database\":\"connected\"}");

        var health = await _client.HealthCheckAsync();

        Assert.Equal("healthy", health.Status);
        Assert.True(health.IsHealthy());
        Assert.Equal("GET", _handler.LastRequest!.Method.Method);
        Assert.Equal("/health", _handler.LastRequest!.RequestUri!.AbsolutePath);
    }

    [Fact]
    public async Task HealthCheck_ReturnUnhealthy()
    {
        _handler.StubResponse(200, "{\"status\":\"unhealthy\",\"version\":\"1.0.0\",\"database\":\"disconnected\"}");

        var health = await _client.HealthCheckAsync();

        Assert.Equal("unhealthy", health.Status);
        Assert.False(health.IsHealthy());
    }

    [Fact]
    public async Task HealthCheck_ServerError_ThrowsHydraException()
    {
        _handler.StubResponse(500, "{\"error\":\"Internal server error\"}");

        var ex = await Assert.ThrowsAsync<HydraException>(() => _client.HealthCheckAsync());
        Assert.Equal(500, ex.StatusCode);
    }

    // ── Account Tests ──

    [Fact]
    public async Task CreateAccount_WithCurrency()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"acc_123\",\"owner_id\":\"owner_1\",\"account_type\":\"business\",\"currency\":\"USD\",\"balance\":\"0.00\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        var account = await _client.CreateAccountAsync("owner_1", "business", "USD");

        Assert.Equal("acc_123", account.Id);
        Assert.Equal("USD", account.Currency);

        var body = JsonDocument.Parse(_handler.LastRequestBody!);
        Assert.Equal("owner_1", body.RootElement.GetProperty("owner_id").GetString());
        Assert.Equal("USD", body.RootElement.GetProperty("currency").GetString());
    }

    [Fact]
    public async Task CreateAccount_NullCurrency_UsesDefault()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"acc_456\",\"owner_id\":\"owner_2\",\"account_type\":\"business\",\"currency\":\"GBP\",\"balance\":\"0.00\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        var account = await _client.CreateAccountAsync("owner_2", "business");

        Assert.Equal("GBP", account.Currency);

        var body = JsonDocument.Parse(_handler.LastRequestBody!);
        Assert.Equal("GBP", body.RootElement.GetProperty("currency").GetString());
    }

    [Fact]
    public async Task GetAccount_ReturnsAccount()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"acc_123\",\"owner_id\":\"owner_1\",\"account_type\":\"business\",\"currency\":\"GBP\",\"balance\":\"500.00\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        var account = await _client.GetAccountAsync("acc_123");

        Assert.Equal("acc_123", account.Id);
        Assert.Equal("500.00", account.Balance);
    }

    [Fact]
    public async Task GetAccountsByOwner_ReturnsList()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":[{\"id\":\"acc_1\",\"owner_id\":\"owner_1\",\"account_type\":\"business\",\"currency\":\"GBP\",\"balance\":\"100.00\",\"created_at\":\"2024-01-01T00:00:00Z\"}]}");

        var accounts = await _client.GetAccountsByOwnerAsync("owner_1");

        Assert.Single(accounts);
        Assert.Equal("acc_1", accounts[0].Id);
    }

    [Fact]
    public async Task GetAccountsByOwner_EmptyList()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":[]}");

        var accounts = await _client.GetAccountsByOwnerAsync("owner_1");

        Assert.Empty(accounts);
    }

    // ── Transaction Tests ──

    [Fact]
    public async Task Transfer_CreatesTransaction()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"txn_123\",\"source_account_id\":\"acc_1\",\"dest_account_id\":\"acc_2\",\"amount\":\"100.00\",\"currency\":\"GBP\",\"status\":\"pending\",\"transaction_type\":\"transfer\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        var tx = await _client.TransferAsync("acc_1", "acc_2", "100.00", "GBP", "ref_1");

        Assert.Equal("txn_123", tx.Id);
        Assert.Equal("100.00", tx.Amount);

        var body = JsonDocument.Parse(_handler.LastRequestBody!);
        Assert.Equal("ref_1", body.RootElement.GetProperty("reference").GetString());
    }

    [Fact]
    public async Task GetTransaction_ReturnsTransaction()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"txn_123\",\"amount\":\"50.00\",\"currency\":\"USD\",\"status\":\"completed\",\"transaction_type\":\"transfer\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        var tx = await _client.GetTransactionAsync("txn_123");

        Assert.Equal("txn_123", tx.Id);
        Assert.Equal("completed", tx.Status);
    }

    [Fact]
    public async Task CompleteTransaction_ReturnsTrue()
    {
        _handler.StubResponse(200, "{\"success\":true}");

        var result = await _client.CompleteTransactionAsync("txn_123");

        Assert.True(result);
    }

    [Fact]
    public async Task CompleteTransaction_ReturnsFalse()
    {
        _handler.StubResponse(200, "{\"success\":false}");

        var result = await _client.CompleteTransactionAsync("txn_123");

        Assert.False(result);
    }

    [Fact]
    public async Task FailTransaction_ReturnsTrue()
    {
        _handler.StubResponse(200, "{\"success\":true}");

        var result = await _client.FailTransactionAsync("txn_123");

        Assert.True(result);
    }

    [Fact]
    public async Task FailTransaction_ReturnsFalse()
    {
        _handler.StubResponse(200, "{\"success\":false}");

        var result = await _client.FailTransactionAsync("txn_123");

        Assert.False(result);
    }

    // ── Wallet Tests ──

    [Fact]
    public async Task CreateWallet_Custodial()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"wal_123\",\"owner_id\":\"owner_1\",\"wallet_type\":\"custodial\",\"chain\":\"ethereum\",\"address\":\"0xabc\",\"is_custodial\":true,\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        var wallet = await _client.CreateWalletAsync("owner_1", "custodial", "ethereum", "0xabc");

        Assert.Equal("wal_123", wallet.Id);
        Assert.True(wallet.IsCustodial);
    }

    [Fact]
    public async Task CreateWallet_NonCustodial_WithEncryptedKey()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"wal_456\",\"owner_id\":\"owner_2\",\"wallet_type\":\"non-custodial\",\"chain\":\"solana\",\"address\":\"0xdef\",\"is_custodial\":false,\"encrypted_private_key\":\"enc_key_here\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        var wallet = await _client.CreateWalletAsync("owner_2", "non-custodial", "solana", "0xdef", "enc_key_here");

        Assert.Equal("wal_456", wallet.Id);
        Assert.False(wallet.IsCustodial);

        var body = JsonDocument.Parse(_handler.LastRequestBody!);
        Assert.Equal("enc_key_here", body.RootElement.GetProperty("encrypted_private_key").GetString());
    }

    [Fact]
    public async Task GetWallets_ReturnsList()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":[{\"id\":\"wal_1\",\"owner_id\":\"owner_1\",\"wallet_type\":\"custodial\",\"chain\":\"ethereum\",\"address\":\"0xabc\",\"is_custodial\":true,\"created_at\":\"2024-01-01T00:00:00Z\"}]}");

        var wallets = await _client.GetWalletsAsync("owner_1");

        Assert.Single(wallets);
        Assert.Equal("wal_1", wallets[0].Id);
    }

    [Fact]
    public async Task GetWallets_EmptyList()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":[]}");

        var wallets = await _client.GetWalletsAsync("owner_1");

        Assert.Empty(wallets);
    }

    [Fact]
    public async Task RelayTransaction_ReturnsHash()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"transaction_hash\":\"0xhash123\"}}");

        var hash = await _client.RelayTransactionAsync("wal_123", "signed_tx");

        Assert.Equal("0xhash123", hash);

        var body = JsonDocument.Parse(_handler.LastRequestBody!);
        Assert.Equal("signed_tx", body.RootElement.GetProperty("signed_transaction").GetString());
    }

    // ── Split Tests ──

    [Fact]
    public async Task CreateSplit_ReturnsSplitRule()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"split_123\",\"total\":\"100.00\",\"currency\":\"GBP\",\"splits\":[{\"account_id\":\"acc_1\",\"percentage\":60.0},{\"account_id\":\"acc_2\",\"percentage\":40.0}],\"status\":\"active\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        var splits = new List<SplitEntry>
        {
            new() { AccountId = "acc_1", Percentage = 60.0 },
            new() { AccountId = "acc_2", Percentage = 40.0 }
        };
        var split = await _client.CreateSplitAsync("100.00", splits, "GBP", "ref_split");

        Assert.Equal("split_123", split.Id);
        Assert.Equal(2, split.Splits.Count);

        var body = JsonDocument.Parse(_handler.LastRequestBody!);
        Assert.Equal("ref_split", body.RootElement.GetProperty("reference").GetString());
    }

    [Fact]
    public async Task GetSplit_ReturnsSplitRule()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"split_123\",\"total\":\"100.00\",\"currency\":\"GBP\",\"splits\":[],\"status\":\"active\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        var split = await _client.GetSplitAsync("split_123");

        Assert.Equal("split_123", split.Id);
    }

    // ── Gateway Tests ──

    [Fact]
    public async Task CreateCardToken_ReturnsToken()
    {
        _handler.StubResponse(200, "{\"id\":\"tok_123\",\"card\":{\"brand\":\"Visa\",\"last4\":\"1111\",\"exp_month\":12,\"exp_year\":2026},\"created_at\":\"2024-01-01T00:00:00Z\"}");

        var card = new CardInput { Number = "4111111111111111", ExpMonth = 12, ExpYear = 2026, Cvc = "123" };
        var token = await _client.CreateCardTokenAsync(card, "merchant_1");

        Assert.Equal("tok_123", token.Id);
        Assert.Equal("Visa", token.Card.Brand);

        var body = JsonDocument.Parse(_handler.LastRequestBody!);
        Assert.Equal("merchant_1", body.RootElement.GetProperty("merchant_id").GetString());
    }

    [Fact]
    public async Task CreatePaymentIntent_WithIdempotencyKey()
    {
        _handler.StubResponse(200, "{\"id\":\"pi_123\",\"status\":\"requires_payment_method\",\"amount\":2000,\"currency\":\"GBP\",\"client_secret\":\"sec_123\"}");

        var intent = await _client.CreatePaymentIntentAsync(2000, "GBP", "tok_123", "merchant_1", "idem_1");

        Assert.Equal("pi_123", intent.Id);
        Assert.Equal(2000, intent.Amount);

        var body = JsonDocument.Parse(_handler.LastRequestBody!);
        Assert.Equal(2000, body.RootElement.GetProperty("amount").GetInt32());
        Assert.Equal("idem_1", body.RootElement.GetProperty("idempotency_key").GetString());
    }

    [Fact]
    public async Task CreateRefund_FullRefund()
    {
        _handler.StubResponse(200, "{\"id\":\"ref_123\",\"status\":\"succeeded\",\"amount\":1000,\"charge\":\"ch_123\"}");

        var refund = await _client.CreateRefundAsync("ch_123");

        Assert.Equal("ref_123", refund.Id);
        Assert.Equal(1000, refund.Amount);
    }

    [Fact]
    public async Task CreateRefund_PartialRefund()
    {
        _handler.StubResponse(200, "{\"id\":\"ref_456\",\"status\":\"succeeded\",\"amount\":500,\"charge\":\"ch_123\"}");

        var refund = await _client.CreateRefundAsync("ch_123", 500);

        Assert.Equal("ref_456", refund.Id);
        Assert.Equal(500, refund.Amount);

        var body = JsonDocument.Parse(_handler.LastRequestBody!);
        Assert.Equal(500, body.RootElement.GetProperty("amount").GetInt32());
    }

    [Fact]
    public async Task GetCommission_ReturnsNonZero()
    {
        _handler.StubResponse(200, "{\"total_commission\":5000}");

        var commission = await _client.GetCommissionAsync();

        Assert.Equal(5000, commission.TotalCommission);
    }

    [Fact]
    public async Task GetCommission_ReturnsZero()
    {
        _handler.StubResponse(200, "{\"total_commission\":0}");

        var commission = await _client.GetCommissionAsync();

        Assert.Equal(0, commission.TotalCommission);
    }

    [Fact]
    public async Task SendWebhookEvent_ReturnsReceived()
    {
        _handler.StubResponse(200, "{\"received\":true}");

        var payload = new Dictionary<string, object> { { "event", "charge.succeeded" }, { "amount", 1000 } };
        var response = await _client.SendWebhookEventAsync(payload);

        Assert.True(response.Received);
    }

    [Fact]
    public async Task GetMetrics_ReturnsRawText()
    {
        _handler.StubResponse(200, "http_requests_total{method=\"GET\"} 100");

        var metrics = await _client.GetMetricsAsync();

        Assert.Contains("http_requests_total", metrics);
    }

    // ── Error Mapping Tests ──

    [Fact]
    public async Task Error_401_ThrowsAuthenticationException()
    {
        _handler.StubResponse(401, "{\"error\":\"Invalid API key\"}");

        var ex = await Assert.ThrowsAsync<AuthenticationException>(() => _client.GetAccountAsync("acc_123"));
        Assert.Equal(401, ex.StatusCode);
        Assert.Equal("AUTHENTICATION_ERROR", ex.ErrorCode);
    }

    [Fact]
    public async Task Error_404_ThrowsNotFoundException()
    {
        _handler.StubResponse(404, "{\"error\":\"Account not found\"}");

        var ex = await Assert.ThrowsAsync<NotFoundException>(() => _client.GetAccountAsync("nonexistent"));
        Assert.Equal(404, ex.StatusCode);
        Assert.Equal("NOT_FOUND", ex.ErrorCode);
    }

    [Fact]
    public async Task Error_400_ThrowsValidationException()
    {
        _handler.StubResponse(400, "{\"error\":\"Invalid input\"}");

        var ex = await Assert.ThrowsAsync<ValidationException>(() => _client.CreateAccountAsync("", ""));
        Assert.Equal(400, ex.StatusCode);
        Assert.Equal("VALIDATION_ERROR", ex.ErrorCode);
    }

    [Fact]
    public async Task Error_402_ThrowsHydraException()
    {
        _handler.StubResponse(402, "{\"error\":\"Payment required\"}");

        var ex = await Assert.ThrowsAsync<HydraException>(() => _client.GetCommissionAsync());
        Assert.Equal(402, ex.StatusCode);
        Assert.Equal("API_ERROR", ex.ErrorCode);
    }

    [Fact]
    public async Task Error_Gateway_ThrowsHydraException()
    {
        _handler.StubResponse(402, "{\"error\":\"Insufficient funds\"}");

        var ex = await Assert.ThrowsAsync<HydraException>(() => _client.CreatePaymentIntentAsync(100, "GBP"));
        Assert.Equal(402, ex.StatusCode);
    }

    [Fact]
    public async Task Error_UnsuccessfulApiResponse_ThrowsHydraException()
    {
        _handler.StubResponse(200, "{\"success\":false,\"data\":null,\"error\":\"Account not found\"}");

        var ex = await Assert.ThrowsAsync<HydraException>(() => _client.GetAccountAsync("acc_123"));
    }

    // ── Header Verification Tests ──

    [Fact]
    public async Task Request_ContainsRequiredHeaders()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"acc_1\",\"owner_id\":\"o\",\"account_type\":\"b\",\"currency\":\"GBP\",\"balance\":\"0\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        await _client.GetAccountAsync("acc_1");

        Assert.NotNull(_handler.LastRequest);
        Assert.True(_handler.LastRequest!.Headers.Contains("X-API-Key"));
        Assert.True(_handler.LastRequest.Headers.Contains("X-Timestamp"));
        Assert.True(_handler.LastRequest.Headers.Contains("X-Signature"));
        Assert.True(_handler.LastRequest.Headers.Contains("X-Default-Currency"));
    }

    [Fact]
    public async Task Request_HasCorrectApiKey()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"acc_1\",\"owner_id\":\"o\",\"account_type\":\"b\",\"currency\":\"GBP\",\"balance\":\"0\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        await _client.GetAccountAsync("acc_1");

        var apiKey = _handler.LastRequest!.Headers.GetValues("X-API-Key").First();
        Assert.Equal("test-api-key", apiKey);
    }

    [Fact]
    public async Task Request_HasCorrectDefaultCurrency()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"acc_1\",\"owner_id\":\"o\",\"account_type\":\"b\",\"currency\":\"GBP\",\"balance\":\"0\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        await _client.GetAccountAsync("acc_1");

        var currency = _handler.LastRequest!.Headers.GetValues("X-Default-Currency").First();
        Assert.Equal("GBP", currency);
    }

    [Fact]
    public async Task Request_HasCorrectLocale()
    {
        var handler = new MockHttpHandler();
        var httpClient = new HttpClient(handler);
        var client = new HydraClientBuilder()
            .BaseUrl("http://localhost:9999")
            .ApiKey("k")
            .SecretKey("s")
            .Locale("en_GB")
            .HttpClient(httpClient)
            .Build();

        handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"acc_1\",\"owner_id\":\"o\",\"account_type\":\"b\",\"currency\":\"GBP\",\"balance\":\"0\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        await client.GetAccountAsync("acc_1");

        var locale = handler.LastRequest!.Headers.GetValues("Accept-Language").First();
        Assert.Equal("en_GB", locale);
    }

    [Fact]
    public async Task Request_HasContentTypeForPost()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"acc_1\",\"owner_id\":\"o\",\"account_type\":\"b\",\"currency\":\"GBP\",\"balance\":\"0\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        await _client.CreateAccountAsync("o", "b");

        Assert.NotNull(_handler.LastRequest!.Content);
        Assert.Contains("application/json", _handler.LastRequest.Content.Headers.ContentType!.ToString());
    }

    [Fact]
    public async Task Request_Body_ContainsExpectedFields()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"acc_1\",\"owner_id\":\"test_owner\",\"account_type\":\"business\",\"currency\":\"GBP\",\"balance\":\"0\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        await _client.CreateAccountAsync("test_owner", "business", "GBP");

        var body = JsonDocument.Parse(_handler.LastRequestBody!);
        Assert.Equal("test_owner", body.RootElement.GetProperty("owner_id").GetString());
        Assert.Equal("business", body.RootElement.GetProperty("account_type").GetString());
        Assert.Equal("GBP", body.RootElement.GetProperty("currency").GetString());
    }

    [Fact]
    public async Task Request_Signature_IsValidHMAC()
    {
        _handler.StubResponse(200, "{\"success\":true,\"data\":{\"id\":\"acc_1\",\"owner_id\":\"o\",\"account_type\":\"b\",\"currency\":\"GBP\",\"balance\":\"0\",\"created_at\":\"2024-01-01T00:00:00Z\"}}");

        await _client.GetAccountAsync("acc_1");

        var timestamp = _handler.LastRequest!.Headers.GetValues("X-Timestamp").First();
        var signature = _handler.LastRequest.Headers.GetValues("X-Signature").First();
        var message = $"GET:/v1/api/accounts/acc_1:{timestamp}:";
        var expected = _client.SignMessage(message);

        Assert.Equal(expected, signature);
    }

    public class MockHttpHandler : HttpMessageHandler
    {
        private readonly Queue<(HttpStatusCode StatusCode, string Body)> _responses = new();
        public HttpRequestMessage? LastRequest { get; private set; }
        public string? LastRequestBody { get; private set; }

        public void StubResponse(int statusCode, string body)
        {
            _responses.Enqueue(((HttpStatusCode)statusCode, body));
        }

        protected override async Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
        {
            LastRequest = request;
            LastRequestBody = request.Content != null ? await request.Content.ReadAsStringAsync() : null;

            var (statusCode, body) = _responses.Count > 0 ? _responses.Dequeue() : (HttpStatusCode.NotFound, "{}");
            return new HttpResponseMessage(statusCode)
            {
                Content = new StringContent(body, Encoding.UTF8, "application/json")
            };
        }
    }
}
