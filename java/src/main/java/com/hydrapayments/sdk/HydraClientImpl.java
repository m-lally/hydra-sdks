package com.hydrapayments.sdk;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.DeserializationFeature;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.hydrapayments.sdk.exception.*;
import com.hydrapayments.sdk.model.*;
import com.hydrapayments.sdk.util.SigningUtil;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.*;

public class HydraClientImpl implements HydraClient {

    private final String baseUrl;
    private final String apiKey;
    private final String secretKey;
    private final String defaultCurrency;
    private final String locale;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;

    HydraClientImpl(String baseUrl, String apiKey, String secretKey,
                    String defaultCurrency, String locale,
                    Duration timeout, HttpClient customHttpClient) {
        this.baseUrl = baseUrl;
        this.apiKey = apiKey;
        this.secretKey = secretKey;
        this.defaultCurrency = defaultCurrency;
        this.locale = locale;
        this.httpClient = customHttpClient != null ? customHttpClient :
            HttpClient.newBuilder()
                .connectTimeout(timeout)
                .build();
        this.objectMapper = new ObjectMapper()
            .configure(DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    public String getBaseUrl() {
        return baseUrl;
    }

    // ============================================================
    // HMAC Signing & Helpers
    // ============================================================

    @Override
    public String signMessage(String message) {
        return SigningUtil.signMessage(secretKey, message);
    }

    @Override
    public boolean verifySignature(String payload, String signature) {
        return SigningUtil.verifySignature(secretKey, payload, signature);
    }

    private String currentTimestampMs() {
        return String.valueOf(System.currentTimeMillis());
    }

    // ============================================================
    // HTTP Layer
    // ============================================================

    private static class RawResponse {
        final int statusCode;
        final String body;

        RawResponse(int statusCode, String body) {
            this.statusCode = statusCode;
            this.body = body;
        }
    }

    private Map<String, String> buildAuthHeaders(String method, String path, String body) {
        String timestamp = currentTimestampMs();
        String message = SigningUtil.buildSigningMessage(method, path, timestamp, body);
        String signature = signMessage(message);

        Map<String, String> headers = new LinkedHashMap<>();
        headers.put("Content-Type", "application/json");
        headers.put("Accept", "application/json");
        headers.put("X-API-Key", apiKey);
        headers.put("X-Timestamp", timestamp);
        headers.put("X-Signature", signature);
        headers.put("X-Default-Currency", defaultCurrency);
        headers.put("Accept-Language", locale);
        return headers;
    }

    private RawResponse doRequest(String method, String path, String body) {
        Map<String, String> headers = buildAuthHeaders(method, path, body);

        HttpRequest.Builder requestBuilder;
        URI uri = URI.create(baseUrl + path);

        if ("GET".equals(method)) {
            requestBuilder = HttpRequest.newBuilder().uri(uri).GET();
        } else {
            HttpRequest.BodyPublisher bodyPublisher = body.isEmpty()
                ? HttpRequest.BodyPublishers.noBody()
                : HttpRequest.BodyPublishers.ofString(body);
            requestBuilder = HttpRequest.newBuilder()
                .uri(uri)
                .method(method, bodyPublisher);
        }

        headers.forEach(requestBuilder::header);

        try {
            HttpRequest request = requestBuilder.build();
            HttpResponse<String> response = httpClient.send(request, HttpResponse.BodyHandlers.ofString());
            return new RawResponse(response.statusCode(), response.body());
        } catch (Exception e) {
            throw new HydraException(
                "HTTP request failed: " + e.getMessage(),
                "NETWORK_ERROR", 0, null, e
            );
        }
    }

    private void throwTypedError(int statusCode, Map<String, Object> parsed) {
        String error = parsed.containsKey("error")
            ? (String) parsed.get("error")
            : (parsed.containsKey("message") ? (String) parsed.get("message") : "Request failed");

        switch (statusCode) {
            case 401:
                throw new AuthenticationException(error, parsed);
            case 404:
                throw new NotFoundException(error, parsed);
            case 400:
                throw new ValidationException(error, parsed);
            default:
                throw new HydraException(error, "API_ERROR", statusCode, parsed);
        }
    }

    // ============================================================
    // Core API Request (wrapped in ApiResponse<T>)
    // ============================================================

    @SuppressWarnings("unchecked")
    private <T> T coreRequest(String method, String path, Map<String, Object> data, Class<T> responseType) {
        String body = data != null ? writeJson(data) : "";
        RawResponse raw = doRequest(method, path, body);

        if (raw.statusCode >= 400) {
            Map<String, Object> parsed = parseJsonMap(raw.body);
            throwTypedError(raw.statusCode, parsed);
        }

        ApiResponse<Map<String, Object>> apiResponse = readApiResponse(raw.body);

        if (!apiResponse.isSuccess()) {
            throw new HydraException(
                apiResponse.getError() != null ? apiResponse.getError() : "Unknown error",
                "API_ERROR", raw.statusCode, null
            );
        }

        if (apiResponse.getData() == null) {
            throw new HydraException("Empty response data", "API_ERROR", raw.statusCode, null);
        }

        if (responseType == Map.class) {
            return (T) apiResponse.getData();
        }

        return objectMapper.convertValue(apiResponse.getData(), responseType);
    }

    @SuppressWarnings("unchecked")
    private <T> List<T> coreRequestList(String method, String path, Map<String, Object> data, Class<T> itemType) {
        String body = data != null ? writeJson(data) : "";
        RawResponse raw = doRequest(method, path, body);

        if (raw.statusCode >= 400) {
            Map<String, Object> parsed = parseJsonMap(raw.body);
            throwTypedError(raw.statusCode, parsed);
        }

        ApiResponse<List<Map<String, Object>>> apiResponse = readApiResponseList(raw.body);

        if (!apiResponse.isSuccess()) {
            throw new HydraException(
                apiResponse.getError() != null ? apiResponse.getError() : "Unknown error",
                "API_ERROR", raw.statusCode, null
            );
        }

        if (apiResponse.getData() == null) {
            return Collections.emptyList();
        }

        return apiResponse.getData().stream()
            .map(m -> objectMapper.convertValue(m, itemType))
            .toList();
    }

    // ============================================================
    // Gateway API Request (direct JSON, no ApiResponse wrapper)
    // ============================================================

    private <T> T gatewayRequest(String method, String path, Map<String, Object> data, Class<T> responseType) {
        String body = data != null ? writeJson(data) : "";
        RawResponse raw = doRequest(method, path, body);

        if (raw.statusCode >= 400) {
            Map<String, Object> parsed = parseJsonMap(raw.body);
            throwTypedError(raw.statusCode, parsed);
        }

        return readJson(raw.body, responseType);
    }

    // ============================================================
    // JSON Helpers
    // ============================================================

    private String writeJson(Object value) {
        try {
            return objectMapper.writeValueAsString(value);
        } catch (Exception e) {
            throw new HydraException("Failed to serialize JSON: " + e.getMessage());
        }
    }

    private <T> T readJson(String json, Class<T> type) {
        try {
            return objectMapper.readValue(json, type);
        } catch (Exception e) {
            throw new HydraException("Failed to parse JSON response: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private Map<String, Object> parseJsonMap(String json) {
        try {
            return objectMapper.readValue(json, LinkedHashMap.class);
        } catch (Exception e) {
            return new LinkedHashMap<>();
        }
    }

    private ApiResponse<Map<String, Object>> readApiResponse(String json) {
        try {
            return objectMapper.readValue(json,
                objectMapper.getTypeFactory().constructParametricType(ApiResponse.class,
                    objectMapper.getTypeFactory().constructType(Map.class)));
        } catch (Exception e) {
            throw new HydraException("Invalid API response: " + e.getMessage());
        }
    }

    @SuppressWarnings("unchecked")
    private ApiResponse<List<Map<String, Object>>> readApiResponseList(String json) {
        try {
            return objectMapper.readValue(json, ApiResponse.class);
        } catch (Exception e) {
            throw new HydraException("Invalid API response: " + e.getMessage());
        }
    }

    // ============================================================
    // Health
    // ============================================================

    @Override
    public HealthResponse healthCheck() {
        RawResponse raw = doRequest("GET", "/health", "");
        if (raw.statusCode >= 400) {
            Map<String, Object> parsed = parseJsonMap(raw.body);
            throwTypedError(raw.statusCode, parsed);
        }
        return readJson(raw.body, HealthResponse.class);
    }

    // ============================================================
    // Accounts
    // ============================================================

    @Override
    public Account createAccount(String ownerId, String accountType, String currency) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("owner_id", ownerId);
        data.put("account_type", accountType);
        data.put("currency", currency != null ? currency : defaultCurrency);
        return coreRequest("POST", "/v1/api/accounts", data, Account.class);
    }

    @Override
    public Account getAccount(String accountId) {
        return coreRequest("GET", "/v1/api/accounts/" + accountId, null, Account.class);
    }

    @Override
    public List<Account> getAccountsByOwner(String ownerId) {
        return coreRequestList("GET", "/v1/api/accounts/owner/" + ownerId, null, Account.class);
    }

    // ============================================================
    // Transactions
    // ============================================================

    @Override
    public Transaction transfer(String sourceId, String destId, String amount, String currency, String reference) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("source_id", sourceId);
        data.put("dest_id", destId);
        data.put("amount", amount);
        data.put("currency", currency != null ? currency : defaultCurrency);
        if (reference != null) data.put("reference", reference);
        return coreRequest("POST", "/v1/api/transactions", data, Transaction.class);
    }

    @Override
    public Transaction getTransaction(String transactionId) {
        return coreRequest("GET", "/v1/api/transactions/" + transactionId, null, Transaction.class);
    }

    @Override
    public boolean completeTransaction(String transactionId) {
        return booleanRequest("POST", "/v1/api/transactions/" + transactionId + "/complete");
    }

    @Override
    public boolean failTransaction(String transactionId) {
        return booleanRequest("POST", "/v1/api/transactions/" + transactionId + "/fail");
    }

    private boolean booleanRequest(String method, String path) {
        RawResponse raw = doRequest(method, path, "");
        if (raw.statusCode >= 400) {
            Map<String, Object> parsed = parseJsonMap(raw.body);
            throwTypedError(raw.statusCode, parsed);
        }
        Map<String, Object> parsed = parseJsonMap(raw.body);
        Object success = parsed.get("success");
        return success instanceof Boolean && (Boolean) success;
    }

    // ============================================================
    // Wallets
    // ============================================================

    @Override
    public Wallet createWallet(String ownerId, String walletType, String chain, String address, String encryptedPrivateKey) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("owner_id", ownerId);
        data.put("wallet_type", walletType);
        data.put("chain", chain);
        data.put("address", address);
        if (encryptedPrivateKey != null) data.put("encrypted_private_key", encryptedPrivateKey);
        return coreRequest("POST", "/v1/api/wallets", data, Wallet.class);
    }

    @Override
    public List<Wallet> getWallets(String ownerId) {
        return coreRequestList("GET", "/v1/api/wallets/owner/" + ownerId, null, Wallet.class);
    }

    @Override
    public String relayTransaction(String walletId, String signedTransaction) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("signed_transaction", signedTransaction);
        Map<String, Object> result = coreRequest("POST", "/v1/api/wallets/" + walletId + "/relay", data, Map.class);
        Object hash = result.get("transaction_hash");
        return hash != null ? hash.toString() : "";
    }

    // ============================================================
    // Splits
    // ============================================================

    @Override
    public SplitRule createSplit(String total, List<SplitEntry> splits, String currency, String reference) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("total", total);
        data.put("currency", currency != null ? currency : defaultCurrency);
        data.put("splits", splits.stream().map(s -> {
            Map<String, Object> entry = new LinkedHashMap<>();
            entry.put("account_id", s.getAccountId());
            entry.put("percentage", s.getPercentage());
            return entry;
        }).toList());
        if (reference != null) data.put("reference", reference);
        return coreRequest("POST", "/v1/api/splits", data, SplitRule.class);
    }

    @Override
    public SplitRule getSplit(String splitId) {
        return coreRequest("GET", "/v1/api/splits/" + splitId, null, SplitRule.class);
    }

    // ============================================================
    // Payment Gateway
    // ============================================================

    @Override
    public CreateTokenResponse createCardToken(CardInput card, String merchantId) {
        Map<String, Object> data = new LinkedHashMap<>();
        Map<String, Object> cardData = new LinkedHashMap<>();
        cardData.put("number", card.getNumber());
        cardData.put("exp_month", card.getExpMonth());
        cardData.put("exp_year", card.getExpYear());
        cardData.put("cvc", card.getCvc());
        data.put("card", cardData);
        if (merchantId != null) data.put("merchant_id", merchantId);
        return gatewayRequest("POST", "/v1/payments/tokens", data, CreateTokenResponse.class);
    }

    @Override
    public CreateIntentResponse createPaymentIntent(int amount, String currency, String token, String merchantId, String idempotencyKey) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("amount", amount);
        data.put("currency", currency);
        if (token != null) data.put("token", token);
        if (merchantId != null) data.put("merchant_id", merchantId);
        if (idempotencyKey != null) data.put("idempotency_key", idempotencyKey);
        return gatewayRequest("POST", "/v1/payments/intents", data, CreateIntentResponse.class);
    }

    @Override
    public CreateRefundResponse createRefund(String chargeId, Integer amount) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("charge_id", chargeId);
        if (amount != null) data.put("amount", amount);
        return gatewayRequest("POST", "/v1/refunds", data, CreateRefundResponse.class);
    }

    @Override
    public CommissionResponse getCommission() {
        return gatewayRequest("GET", "/v1/commission", null, CommissionResponse.class);
    }

    @Override
    public WebhookResponse sendWebhookEvent(Map<String, Object> payload) {
        return gatewayRequest("POST", "/v1/webhooks/stripe", payload, WebhookResponse.class);
    }

    @Override
    public String getMetrics() {
        RawResponse raw = doRequest("GET", "/v1/metrics", "");
        if (raw.statusCode >= 400) {
            Map<String, Object> parsed = parseJsonMap(raw.body);
            throwTypedError(raw.statusCode, parsed);
        }
        return raw.body;
    }
}
