package com.hydrapayments.sdk

import org.json.JSONArray
import org.json.JSONObject

// ── Builder ──

class HydraClientBuilder {
    private var baseUrl: String = "http://localhost:8080"
    private var apiKey: String = ""
    private var secretKey: String = ""
    private var defaultCurrency: String = "GBP"
    private var locale: String = "en"
    private var httpClient: HttpClient? = null

    fun baseUrl(url: String) = apply {
        baseUrl = url.trimEnd('/')
    }

    fun apiKey(key: String) = apply { apiKey = key }

    fun secretKey(key: String) = apply { secretKey = key }

    fun defaultCurrency(currency: String) = apply { defaultCurrency = currency }

    fun locale(locale: String) = apply { this.locale = locale }

    fun httpClient(client: HttpClient) = apply { httpClient = client }

    fun build(): HydraClient = HydraClient(
        baseUrl = baseUrl,
        apiKey = apiKey,
        secretKey = secretKey,
        defaultCurrency = defaultCurrency,
        locale = locale,
        httpClient = httpClient ?: HttpURLConnectionClient()
    )
}

// ── Client ──

class HydraClient internal constructor(
    val baseUrl: String,
    val apiKey: String,
    val secretKey: String,
    val defaultCurrency: String,
    val locale: String,
    private val httpClient: HttpClient
) {
    // ── Security ──

    fun signMessage(message: String): String =
        SigningUtil.sign(secretKey, message)

    fun verifySignature(payload: String, signature: String): Boolean =
        SigningUtil.verify(secretKey, payload, signature)

    // ── Health ──

    fun healthCheck(): HealthResponse {
        val response = sendRequest("GET", "/health")
        return HealthResponse.fromJson(JSONObject(response))
    }

    // ── Accounts ──

    fun createAccount(ownerId: String, accountType: String, currency: String? = null): Account {
        val body = JSONObject().apply {
            put("owner_id", ownerId)
            put("account_type", accountType)
            put("currency", currency ?: defaultCurrency)
        }
        val data = coreRequest("POST", "/v1/api/accounts", body)
        return Account.fromJson(data as JSONObject)
    }

    fun getAccount(accountId: String): Account {
        val data = coreRequest("GET", "/v1/api/accounts/$accountId")
        return Account.fromJson(data as JSONObject)
    }

    fun getAccountsByOwner(ownerId: String): List<Account> {
        val data = coreRequest("GET", "/v1/api/accounts/owner/$ownerId")
        return (data as JSONArray).let { arr ->
            (0 until arr.length()).map { Account.fromJson(arr.getJSONObject(it)) }
        }
    }

    // ── Transactions ──

    fun transfer(sourceId: String, destId: String, amount: String, currency: String? = null, reference: String? = null): Transaction {
        val body = JSONObject().apply {
            put("source_id", sourceId)
            put("dest_id", destId)
            put("amount", amount)
            put("currency", currency ?: defaultCurrency)
            reference?.let { put("reference", it) }
        }
        val data = coreRequest("POST", "/v1/api/transactions", body)
        return Transaction.fromJson(data as JSONObject)
    }

    fun getTransaction(transactionId: String): Transaction {
        val data = coreRequest("GET", "/v1/api/transactions/$transactionId")
        return Transaction.fromJson(data as JSONObject)
    }

    fun completeTransaction(transactionId: String): Boolean {
        val response = sendRequest("POST", "/v1/api/transactions/$transactionId/complete")
        return JSONObject(response).optBoolean("success", false)
    }

    fun failTransaction(transactionId: String): Boolean {
        val response = sendRequest("POST", "/v1/api/transactions/$transactionId/fail")
        return JSONObject(response).optBoolean("success", false)
    }

    // ── Wallets ──

    fun createWallet(ownerId: String, walletType: String, chain: String, address: String, encryptedPrivateKey: String? = null): Wallet {
        val body = JSONObject().apply {
            put("owner_id", ownerId)
            put("wallet_type", walletType)
            put("chain", chain)
            put("address", address)
            encryptedPrivateKey?.let { put("encrypted_private_key", it) }
        }
        val data = coreRequest("POST", "/v1/api/wallets", body)
        return Wallet.fromJson(data as JSONObject)
    }

    fun getWallets(ownerId: String): List<Wallet> {
        val data = coreRequest("GET", "/v1/api/wallets/owner/$ownerId")
        return (data as JSONArray).let { arr ->
            (0 until arr.length()).map { Wallet.fromJson(arr.getJSONObject(it)) }
        }
    }

    fun relayTransaction(walletId: String, signedTransaction: String): String {
        val body = JSONObject().apply { put("signed_transaction", signedTransaction) }
        val data = coreRequest("POST", "/v1/api/wallets/$walletId/relay", body)
        return (data as JSONObject).getString("transaction_hash")
    }

    // ── Splits ──

    fun createSplit(total: String, splits: List<SplitEntry>, currency: String? = null, reference: String? = null): SplitRule {
        val body = JSONObject().apply {
            put("total", total)
            put("splits", JSONArray(splits.map { s ->
                JSONObject().apply {
                    put("account_id", s.accountId)
                    put("percentage", s.percentage)
                }
            }))
            put("currency", currency ?: defaultCurrency)
            reference?.let { put("reference", it) }
        }
        val data = coreRequest("POST", "/v1/api/splits", body)
        return SplitRule.fromJson(data as JSONObject)
    }

    fun getSplit(splitId: String): SplitRule {
        val data = coreRequest("GET", "/v1/api/splits/$splitId")
        return SplitRule.fromJson(data as JSONObject)
    }

    // ── Gateway: Tokens ──

    fun createCardToken(card: CardInput, merchantId: String? = null): CreateTokenResponse {
        val body = JSONObject().apply {
            put("card", JSONObject().apply {
                put("number", card.number)
                put("exp_month", card.expMonth)
                put("exp_year", card.expYear)
                put("cvc", card.cvc)
            })
            merchantId?.let { put("merchant_id", it) }
        }
        val data = gatewayRequest("POST", "/v1/payments/tokens", body)
        return CreateTokenResponse.fromJson(data)
    }

    fun createPaymentIntent(amount: String, currency: String, token: String? = null, merchantId: String? = null, idempotencyKey: String? = null): CreateIntentResponse {
        val body = JSONObject().apply {
            put("amount", amount)
            put("currency", currency)
            token?.let { put("token", it) }
            merchantId?.let { put("merchant_id", it) }
            idempotencyKey?.let { put("idempotency_key", it) }
        }
        val data = gatewayRequest("POST", "/v1/payments/intents", body)
        return CreateIntentResponse.fromJson(data)
    }

    fun createRefund(chargeId: String, amount: String? = null): CreateRefundResponse {
        val body = JSONObject().apply {
            put("charge_id", chargeId)
            amount?.let { put("amount", it) }
        }
        val data = gatewayRequest("POST", "/v1/refunds", body)
        return CreateRefundResponse.fromJson(data)
    }

    fun getCommission(): CommissionResponse {
        val data = gatewayRequest("GET", "/v1/commission")
        return CommissionResponse.fromJson(data)
    }

    fun sendWebhookEvent(payload: Map<String, Any?>): WebhookResponse {
        val body = JSONObject(payload)
        val data = gatewayRequest("POST", "/v1/webhooks/stripe", body)
        return WebhookResponse.fromJson(data)
    }

    fun getMetrics(): String {
        return sendRequest("GET", "/v1/metrics")
    }

    // ── Private ──

    private fun coreRequest(method: String, path: String, body: JSONObject? = null): Any {
        val response = sendRequest(method, path, body)
        val parsed = JSONObject(response)
        if (!parsed.optBoolean("success", false) || !parsed.has("data")) {
            val errMsg = parsed.optString("error", "Request failed")
            throw HydraError(message = errMsg, statusCode = 500, errorCode = "API_ERROR")
        }
        return parsed.get("data")
    }

    private fun gatewayRequest(method: String, path: String, body: JSONObject? = null): JSONObject {
        val response = sendRequest(method, path, body)
        return JSONObject(response)
    }

    private fun sendRequest(method: String, path: String, body: JSONObject? = null): String {
        val bodyStr = body?.toString() ?: ""
        val timestamp = System.currentTimeMillis().toString()
        val message = SigningUtil.buildSigningMessage(method, path, timestamp, bodyStr)
        val signature = SigningUtil.sign(secretKey, message)

        val headers = linkedMapOf(
            "X-API-Key" to apiKey,
            "X-Timestamp" to timestamp,
            "X-Signature" to signature,
            "X-Default-Currency" to defaultCurrency,
            "Accept-Language" to locale,
            "Accept" to "application/json"
        ).toMutableMap()
        if (bodyStr.isNotEmpty()) {
            headers["Content-Type"] = "application/json"
        }

        val response = httpClient.send(method, "$baseUrl$path", headers, bodyStr.ifEmpty { null })

        if (response.statusCode >= 300) {
            throw parseError(response.statusCode, response.body)
        }

        return response.body
    }

    private fun parseError(statusCode: Int, responseBody: String): HydraError {
        val message: String
        val details: Map<String, Any?>?
        try {
            val parsed = JSONObject(responseBody)
            message = parsed.optString("error", "Request failed with status $statusCode")
            details = parsed.optJSONObject("details")?.let { obj ->
                obj.keys().asSequence().associateWith { key -> obj.get(key) }
            }
        } catch (_: Exception) {
            return HydraError("Request failed with status $statusCode", statusCode, "API_ERROR")
        }
        return when (statusCode) {
            400 -> ValidationError(message, details)
            401 -> AuthenticationError(message, details)
            404 -> NotFoundError(message, details)
            else -> HydraError(message, statusCode, "API_ERROR", details)
        }
    }
}
