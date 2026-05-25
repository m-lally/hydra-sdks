using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using HydraPayments.Sdk.Exceptions;
using HydraPayments.Sdk.Models;

namespace HydraPayments.Sdk;

public class HydraClient : IHydraClient
{
    private readonly string _baseUrl;
    private readonly string _apiKey;
    private readonly string _secretKey;
    private readonly string _defaultCurrency;
    private readonly string _locale;
    private readonly HttpClient _httpClient;

    private static readonly JsonSerializerOptions _jsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = System.Text.Json.Serialization.JsonIgnoreCondition.WhenWritingNull
    };

    internal HydraClient(string baseUrl, string apiKey, string secretKey, string defaultCurrency, string locale, HttpClient httpClient)
    {
        _baseUrl = baseUrl;
        _apiKey = apiKey;
        _secretKey = secretKey;
        _defaultCurrency = defaultCurrency;
        _locale = locale;
        _httpClient = httpClient;
    }

    public string SignMessage(string message)
    {
        return SigningUtil.Sign(_secretKey, message);
    }

    public bool VerifySignature(string payload, string signature)
    {
        return SigningUtil.Verify(_secretKey, payload, signature);
    }

    public async Task<HealthResponse> HealthCheckAsync()
    {
        var json = await SendRequestAsync(HttpMethod.Get, "/health", null);
        return Deserialize<HealthResponse>(json);
    }

    public async Task<Account> CreateAccountAsync(string ownerId, string accountType, string? currency = null)
    {
        var body = new Dictionary<string, object?>
        {
            ["owner_id"] = ownerId,
            ["account_type"] = accountType,
            ["currency"] = currency ?? _defaultCurrency
        };
        return await CoreRequestAsync<Account>(HttpMethod.Post, "/v1/api/accounts", body);
    }

    public async Task<Account> GetAccountAsync(string accountId)
    {
        return await CoreRequestAsync<Account>(HttpMethod.Get, $"/v1/api/accounts/{accountId}");
    }

    public async Task<List<Account>> GetAccountsByOwnerAsync(string ownerId)
    {
        return await CoreRequestAsync<List<Account>>(HttpMethod.Get, $"/v1/api/accounts/owner/{ownerId}");
    }

    public async Task<Transaction> TransferAsync(string sourceId, string destId, string amount, string? currency = null, string? reference = null)
    {
        var body = new Dictionary<string, object?>
        {
            ["source_id"] = sourceId,
            ["dest_id"] = destId,
            ["amount"] = amount,
            ["currency"] = currency ?? _defaultCurrency
        };
        if (reference != null) body["reference"] = reference;
        return await CoreRequestAsync<Transaction>(HttpMethod.Post, "/v1/api/transactions", body);
    }

    public async Task<Transaction> GetTransactionAsync(string transactionId)
    {
        return await CoreRequestAsync<Transaction>(HttpMethod.Get, $"/v1/api/transactions/{transactionId}");
    }

    public async Task<bool> CompleteTransactionAsync(string transactionId)
    {
        var json = await SendRequestAsync(HttpMethod.Post, $"/v1/api/transactions/{transactionId}/complete", null);
        return ParseSuccess(json);
    }

    public async Task<bool> FailTransactionAsync(string transactionId)
    {
        var json = await SendRequestAsync(HttpMethod.Post, $"/v1/api/transactions/{transactionId}/fail", null);
        return ParseSuccess(json);
    }

    public async Task<Wallet> CreateWalletAsync(string ownerId, string walletType, string chain, string address, string? encryptedPrivateKey = null)
    {
        var body = new Dictionary<string, object?>
        {
            ["owner_id"] = ownerId,
            ["wallet_type"] = walletType,
            ["chain"] = chain,
            ["address"] = address
        };
        if (encryptedPrivateKey != null) body["encrypted_private_key"] = encryptedPrivateKey;
        return await CoreRequestAsync<Wallet>(HttpMethod.Post, "/v1/api/wallets", body);
    }

    public async Task<List<Wallet>> GetWalletsAsync(string ownerId)
    {
        return await CoreRequestAsync<List<Wallet>>(HttpMethod.Get, $"/v1/api/wallets/owner/{ownerId}");
    }

    public async Task<string> RelayTransactionAsync(string walletId, string signedTransaction)
    {
        var body = new Dictionary<string, object?>
        {
            ["signed_transaction"] = signedTransaction
        };
        var response = await CoreRequestAsync<RelayResponse>(HttpMethod.Post, $"/v1/api/wallets/{walletId}/relay", body);
        return response.TransactionHash;
    }

    public async Task<SplitRule> CreateSplitAsync(string total, List<SplitEntry> splits, string? currency = null, string? reference = null)
    {
        var body = new Dictionary<string, object?>
        {
            ["total"] = total,
            ["splits"] = splits,
            ["currency"] = currency ?? _defaultCurrency
        };
        if (reference != null) body["reference"] = reference;
        return await CoreRequestAsync<SplitRule>(HttpMethod.Post, "/v1/api/splits", body);
    }

    public async Task<SplitRule> GetSplitAsync(string splitId)
    {
        return await CoreRequestAsync<SplitRule>(HttpMethod.Get, $"/v1/api/splits/{splitId}");
    }

    public async Task<CreateTokenResponse> CreateCardTokenAsync(CardInput card, string? merchantId = null)
    {
        var body = new Dictionary<string, object?>
        {
            ["card"] = card
        };
        if (merchantId != null) body["merchant_id"] = merchantId;
        return await GatewayRequestAsync<CreateTokenResponse>(HttpMethod.Post, "/v1/payments/tokens", body);
    }

    public async Task<CreateIntentResponse> CreatePaymentIntentAsync(int amount, string currency, string? token = null, string? merchantId = null, string? idempotencyKey = null)
    {
        var body = new Dictionary<string, object?>
        {
            ["amount"] = amount,
            ["currency"] = currency
        };
        if (token != null) body["token"] = token;
        if (merchantId != null) body["merchant_id"] = merchantId;
        if (idempotencyKey != null) body["idempotency_key"] = idempotencyKey;
        return await GatewayRequestAsync<CreateIntentResponse>(HttpMethod.Post, "/v1/payments/intents", body);
    }

    public async Task<CreateRefundResponse> CreateRefundAsync(string chargeId, int? amount = null)
    {
        var body = new Dictionary<string, object?>
        {
            ["charge_id"] = chargeId
        };
        if (amount.HasValue) body["amount"] = amount.Value;
        return await GatewayRequestAsync<CreateRefundResponse>(HttpMethod.Post, "/v1/refunds", body);
    }

    public async Task<CommissionResponse> GetCommissionAsync()
    {
        return await GatewayRequestAsync<CommissionResponse>(HttpMethod.Get, "/v1/commission");
    }

    public async Task<WebhookResponse> SendWebhookEventAsync(Dictionary<string, object> payload)
    {
        return await GatewayRequestAsync<WebhookResponse>(HttpMethod.Post, "/v1/webhooks/stripe", payload);
    }

    public async Task<string> GetMetricsAsync()
    {
        var request = CreateRequest(HttpMethod.Get, "/v1/metrics", null);
        var response = await _httpClient.SendAsync(request);
        return await response.Content.ReadAsStringAsync();
    }

    private async Task<T> CoreRequestAsync<T>(HttpMethod method, string path, object? body = null)
    {
        var json = await SendRequestAsync(method, path, body);
        var apiResponse = Deserialize<ApiResponse<T>>(json);

        if (apiResponse == null || !apiResponse.Success || apiResponse.Data == null)
        {
            var errorMsg = apiResponse?.Error ?? "Request failed";
            throw new HydraException(500, "API_ERROR", errorMsg, json);
        }

        return apiResponse.Data;
    }

    private async Task<T> GatewayRequestAsync<T>(HttpMethod method, string path, object? body = null)
    {
        var json = await SendRequestAsync(method, path, body);
        return Deserialize<T>(json);
    }

    private async Task<string> SendRequestAsync(HttpMethod method, string path, object? body)
    {
        var request = CreateRequest(method, path, body);
        var response = await _httpClient.SendAsync(request);
        var responseBody = await response.Content.ReadAsStringAsync();

        if (!response.IsSuccessStatusCode)
        {
            throw ParseError(responseBody, (int)response.StatusCode);
        }

        return responseBody;
    }

    private HttpRequestMessage CreateRequest(HttpMethod method, string path, object? body)
    {
        var timestamp = DateTimeOffset.UtcNow.ToUnixTimeMilliseconds().ToString();
        var bodyJson = body != null ? JsonSerializer.Serialize(body, _jsonOptions) : "";
        var message = SigningUtil.BuildSigningMessage(method.Method.ToUpperInvariant(), path, timestamp, bodyJson);
        var signature = SigningUtil.Sign(_secretKey, message);

        var request = new HttpRequestMessage(method, $"{_baseUrl}{path}");
        request.Headers.Add("X-API-Key", _apiKey);
        request.Headers.Add("X-Timestamp", timestamp);
        request.Headers.Add("X-Signature", signature);
        request.Headers.Add("X-Default-Currency", _defaultCurrency);
        request.Headers.TryAddWithoutValidation("Accept-Language", _locale);
        request.Headers.Accept.Add(new MediaTypeWithQualityHeaderValue("application/json"));

        if (!string.IsNullOrEmpty(bodyJson))
        {
            request.Content = new StringContent(bodyJson, Encoding.UTF8, "application/json");
        }

        return request;
    }

    private static bool ParseSuccess(string json)
    {
        using var doc = JsonDocument.Parse(json);
        return doc.RootElement.TryGetProperty("success", out var success) && success.GetBoolean();
    }

    private static T Deserialize<T>(string json)
    {
        var result = JsonSerializer.Deserialize<T>(json, _jsonOptions);
        return result ?? throw new HydraException(500, "PARSE_ERROR", "Failed to deserialize response", json);
    }

    private static HydraException ParseError(string responseBody, int statusCode)
    {
        string message;
        try
        {
            using var doc = JsonDocument.Parse(responseBody);
            message = doc.RootElement.TryGetProperty("error", out var error)
                ? error.GetString() ?? "Unknown error"
                : $"Request failed with status {statusCode}";
        }
        catch
        {
            message = $"Request failed with status {statusCode}";
        }

        return statusCode switch
        {
            400 => new ValidationException(message, responseBody),
            401 => new AuthenticationException(message, responseBody),
            404 => new NotFoundException(message, responseBody),
            _ => new HydraException(statusCode, message, responseBody)
        };
    }

    private class RelayResponse
    {
        public string TransactionHash { get; set; } = string.Empty;
    }
}
