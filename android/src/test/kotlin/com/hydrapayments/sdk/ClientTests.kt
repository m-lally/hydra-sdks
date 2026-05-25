package com.hydrapayments.sdk

import org.json.JSONObject
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertNull
import kotlin.test.assertTrue
import kotlin.test.fail

// ── Mock HTTP Client ──

class MockHttpClient : HttpClient {
    private val responses = mutableListOf<HttpClient.Response>()
    var lastMethod: String? = null
    var lastUrl: String? = null
    var lastHeaders: Map<String, String>? = null
    var lastBody: String? = null

    override fun send(method: String, url: String, headers: Map<String, String>, body: String?): HttpClient.Response {
        lastMethod = method
        lastUrl = url
        lastHeaders = headers
        lastBody = body
        return if (responses.isEmpty()) HttpClient.Response(200, "{}")
        else responses.removeAt(0)
    }

    // For stub signature compatibility
    fun stub(statusCode: Int, body: String) {
        responses.add(HttpClient.Response(statusCode, body))
    }
}

// ── Client Tests ──

class ClientTests {
    private lateinit var mock: MockHttpClient
    private lateinit var client: HydraClient

    @BeforeEach
    fun setUp() {
        mock = MockHttpClient()
        client = HydraClientBuilder()
            .baseUrl("http://localhost:9999")
            .apiKey("test-api-key")
            .secretKey("test-secret-key")
            .httpClient(mock)
            .build()
    }

    // ── Builder ──

    @Test
    fun builderDefaults() {
        val c = HydraClientBuilder()
            .apiKey("k")
            .secretKey("s")
            .httpClient(MockHttpClient())
            .build()
        assertEquals("http://localhost:8080", c.baseUrl)
        assertEquals("GBP", c.defaultCurrency)
        assertEquals("en", c.locale)
    }

    @Test
    fun builderStripsTrailingSlash() {
        val c = HydraClientBuilder()
            .baseUrl("http://example.com/")
            .apiKey("k")
            .secretKey("s")
            .httpClient(MockHttpClient())
            .build()
        assertEquals("http://example.com", c.baseUrl)
    }

    // ── HMAC Signing ──

    @Test
    fun signProducesNonEmptyResult() {
        val sig = client.signMessage("GET:/health:12345:")
        assertTrue(sig.isNotEmpty())
    }

    @Test
    fun signWithEmptySecretReturnsEmpty() {
        val c = HydraClientBuilder()
            .apiKey("k")
            .secretKey("")
            .httpClient(MockHttpClient())
            .build()
        assertEquals("", c.signMessage("anything"))
    }

    @Test
    fun signIsDeterministic() {
        val msg = "POST:/v1/api/accounts:12345:{\"key\":\"value\"}"
        assertEquals(client.signMessage(msg), client.signMessage(msg))
    }

    @Test
    fun differentMessagesProduceDifferentSignatures() {
        assertNotEquals(client.signMessage("message one"), client.signMessage("message two"))
    }

    @Test
    fun differentKeysProduceDifferentSignatures() {
        val c2 = HydraClientBuilder()
            .apiKey("k")
            .secretKey("different-secret")
            .httpClient(MockHttpClient())
            .build()
        assertNotEquals(client.signMessage("same message"), c2.signMessage("same message"))
    }

    // ── Signature Verification ──

    @Test
    fun verifyValidSignature() {
        val msg = "test message"
        val sig = client.signMessage(msg)
        assertTrue(client.verifySignature(msg, sig))
    }

    @Test
    fun verifyTamperedPayload() {
        val sig = client.signMessage("original message")
        assertFalse(client.verifySignature("tampered", sig))
    }

    @Test
    fun verifyWrongKey() {
        val c2 = HydraClientBuilder()
            .apiKey("k")
            .secretKey("different-secret")
            .httpClient(MockHttpClient())
            .build()
        val sig = client.signMessage("test message")
        assertFalse(c2.verifySignature("test message", sig))
    }

    @Test
    fun verifyEmptyKeyAndEmptySignature() {
        val c = HydraClientBuilder()
            .apiKey("k")
            .secretKey("")
            .httpClient(MockHttpClient())
            .build()
        assertTrue(c.verifySignature("anything", ""))
    }

    // ── Health ──

    @Test
    fun healthCheckHealthy() {
        mock.stub(200, """{"status":"healthy","version":"1.0","database":"connected"}""")
        val health = client.healthCheck()
        assertEquals("healthy", health.status)
        assertTrue(health.isHealthy)
        assertEquals("1.0", health.version)
    }

    @Test
    fun healthCheckUnhealthy() {
        mock.stub(200, """{"status":"unhealthy","database":"disconnected"}""")
        val health = client.healthCheck()
        assertEquals("unhealthy", health.status)
        assertFalse(health.isHealthy)
    }

    @Test
    fun healthCheckServerError() {
        mock.stub(500, """{"error":"Internal Server Error"}""")
        try {
            client.healthCheck()
            fail("Expected HydraError")
        } catch (e: HydraError) {
            assertEquals(500, e.statusCode)
        }
    }

    // ── Accounts ──

    @Test
    fun createAccountWithCurrency() {
        mock.stub(200, """{"success":true,"data":{"id":"acc_1","owner_id":"o1","account_type":"business","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}}""")
        val account = client.createAccount("o1", "business", "GBP")
        assertEquals("acc_1", account.id)
        assertEquals("o1", account.ownerId)
    }

    @Test
    fun createAccountWithDefaultCurrency() {
        mock.stub(200, """{"success":true,"data":{"id":"acc_2","owner_id":"o2","account_type":"business","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}}""")
        val account = client.createAccount("o2", "business")
        assertEquals("GBP", account.currency)
    }

    @Test
    fun getAccount() {
        mock.stub(200, """{"success":true,"data":{"id":"acc_1","owner_id":"o1","account_type":"business","currency":"GBP","balance":"1000","created_at":"2024-01-01T00:00:00Z"}}""")
        val account = client.getAccount("acc_1")
        assertEquals("acc_1", account.id)
        assertEquals("1000", account.balance)
    }

    @Test
    fun getAccountsByOwner() {
        mock.stub(200, """{"success":true,"data":[{"id":"acc_1","owner_id":"o1","account_type":"business","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}]}""")
        val accounts = client.getAccountsByOwner("o1")
        assertEquals(1, accounts.size)
        assertEquals("o1", accounts[0].ownerId)
    }

    // ── Transactions ──

    @Test
    fun transfer() {
        mock.stub(200, """{"success":true,"data":{"id":"tx_1","amount":"1000","currency":"GBP","status":"pending","created_at":"2024-01-01T00:00:00Z"}}""")
        val tx = client.transfer("w1", "w2", "1000", "GBP", "payment")
        assertEquals("tx_1", tx.id)
        assertEquals("1000", tx.amount)
    }

    @Test
    fun getTransaction() {
        mock.stub(200, """{"success":true,"data":{"id":"tx_1","amount":"500","currency":"USD","status":"completed","created_at":"2024-01-01T00:00:00Z"}}""")
        val tx = client.getTransaction("tx_1")
        assertEquals("tx_1", tx.id)
        assertEquals("completed", tx.status)
    }

    @Test
    fun completeTransaction() {
        mock.stub(200, """{"success":true}""")
        assertTrue(client.completeTransaction("tx_1"))
    }

    @Test
    fun completeTransactionFalse() {
        mock.stub(200, """{"success":false}""")
        assertFalse(client.completeTransaction("tx_1"))
    }

    @Test
    fun failTransaction() {
        mock.stub(200, """{"success":true}""")
        assertTrue(client.failTransaction("tx_1"))
    }

    // ── Wallets ──

    @Test
    fun createWalletCustodial() {
        mock.stub(200, """{"success":true,"data":{"id":"w_1","owner_id":"o1","wallet_type":"custodial","chain":"ethereum","address":"0xabc","is_custodial":true,"encrypted_private_key":"enc_key","created_at":"2024-01-01T00:00:00Z"}}""")
        val wallet = client.createWallet("o1", "custodial", "ethereum", "0xabc", "enc_key")
        assertEquals("w_1", wallet.id)
        assertTrue(wallet.isCustodial)
    }

    @Test
    fun createWalletNonCustodialNoKey() {
        mock.stub(200, """{"success":true,"data":{"id":"w_2","owner_id":"o2","wallet_type":"non-custodial","chain":"solana","address":"0xdef","is_custodial":false,"created_at":"2024-01-01T00:00:00Z"}}""")
        val wallet = client.createWallet("o2", "non-custodial", "solana", "0xdef")
        assertEquals("w_2", wallet.id)
        assertFalse(wallet.isCustodial)
        assertNull(wallet.encryptedPrivateKey)
    }

    @Test
    fun getWallets() {
        mock.stub(200, """{"success":true,"data":[{"id":"w_1","owner_id":"o1","wallet_type":"custodial","chain":"ethereum","address":"0xabc","is_custodial":true,"created_at":"2024-01-01T00:00:00Z"}]}""")
        val wallets = client.getWallets("o1")
        assertEquals(1, wallets.size)
        assertEquals("ethereum", wallets[0].chain)
    }

    @Test
    fun getWalletsEmpty() {
        mock.stub(200, """{"success":true,"data":[]}""")
        assertEquals(0, client.getWallets("nonexistent").size)
    }

    @Test
    fun relayTransaction() {
        mock.stub(200, """{"success":true,"data":{"transaction_hash":"0xhash123"}}""")
        val hash = client.relayTransaction("w_1", "signed_tx_data")
        assertEquals("0xhash123", hash)
    }

    // ── Splits ──

    @Test
    fun createSplit() {
        val entries = listOf(SplitEntry("acc_1", "70"), SplitEntry("acc_2", "30"))
        mock.stub(200, """{"success":true,"data":{"id":"split_1","total":"1000","currency":"GBP","splits":[{"account_id":"acc_1","percentage":"70"},{"account_id":"acc_2","percentage":"30"}],"sink_account_id":"acc_sink","status":"active","created_at":"2024-01-01T00:00:00Z"}}""")
        val split = client.createSplit("1000", entries, "GBP")
        assertEquals("split_1", split.id)
        assertEquals(2, split.splits.size)
    }

    @Test
    fun getSplit() {
        mock.stub(200, """{"success":true,"data":{"id":"split_1","total":"1000","currency":"GBP","splits":[{"account_id":"acc_1","percentage":"100"}],"status":"active","created_at":"2024-01-01T00:00:00Z"}}""")
        val split = client.getSplit("split_1")
        assertEquals("split_1", split.id)
        assertEquals("acc_1", split.splits[0].accountId)
    }

    // ── Gateway ──

    @Test
    fun createCardToken() {
        val card = CardInput("4111111111111111", "12", "2025", "123")
        mock.stub(200, """{"id":"tok_1","card":{"brand":"visa","last4":"1111","exp_month":"12","exp_year":"2025"},"created_at":"2024-01-01T00:00:00Z"}""")
        val token = client.createCardToken(card)
        assertEquals("tok_1", token.id)
        assertEquals("visa", token.card?.brand)
    }

    @Test
    fun createPaymentIntent() {
        mock.stub(200, """{"id":"pi_1","status":"requires_payment_method","amount":"2000","currency":"USD","client_secret":"sec_123"}""")
        val intent = client.createPaymentIntent("2000", "USD", "tok_1", idempotencyKey = "idemp_1")
        assertEquals("pi_1", intent.id)
        assertEquals("sec_123", intent.clientSecret)
    }

    @Test
    fun createRefundFull() {
        mock.stub(200, """{"id":"ref_1","status":"succeeded","amount":"1000","charge":"ch_1"}""")
        val refund = client.createRefund("ch_1", "1000")
        assertEquals("ref_1", refund.id)
        assertEquals("ch_1", refund.charge)
    }

    @Test
    fun createRefundPartial() {
        mock.stub(200, """{"id":"ref_2","status":"succeeded","amount":"500","charge":"ch_1"}""")
        val refund = client.createRefund("ch_1", "500")
        assertEquals("500", refund.amount)
    }

    @Test
    fun getCommission() {
        mock.stub(200, """{"total_commission":"1500"}""")
        val commission = client.getCommission()
        assertEquals("1500", commission.totalCommission)
    }

    @Test
    fun sendWebhookEvent() {
        val payload = mapOf("type" to "payment_intent.succeeded", "data" to mapOf("id" to "pi_1"))
        mock.stub(200, """{"received":true}""")
        val response = client.sendWebhookEvent(payload)
        assertTrue(response.received)
    }

    @Test
    fun getMetrics() {
        mock.stub(200, "metric1 100\nmetric2 200")
        val metrics = client.getMetrics()
        assertTrue(metrics.contains("metric1"))
    }

    // ── Error Mapping ──

    @Test
    fun authenticationError() {
        mock.stub(401, """{"error":"Invalid API key"}""")
        try {
            client.healthCheck()
            fail("Expected AuthenticationError")
        } catch (e: AuthenticationError) {
            assertTrue(e.message.contains("Invalid API key"))
        }
    }

    @Test
    fun validationError() {
        mock.stub(400, """{"error":"Validation failed","details":{"field":"amount","reason":"required"}}""")
        try {
            client.healthCheck()
            fail("Expected ValidationError")
        } catch (e: ValidationError) {
            assertEquals(400, e.statusCode)
        }
    }

    @Test
    fun notFoundError() {
        mock.stub(404, """{"error":"Account not found"}""")
        try {
            client.getAccount("nonexistent")
            fail("Expected NotFoundError")
        } catch (e: NotFoundError) {
            assertEquals(404, e.statusCode)
        }
    }

    @Test
    fun genericApiError() {
        mock.stub(402, """{"error":"Payment required"}""")
        try {
            client.healthCheck()
            fail("Expected HydraError")
        } catch (e: HydraError) {
            assertEquals(402, e.statusCode)
            assertEquals("API_ERROR", e.errorCode)
        }
    }

    @Test
    fun apiLevelError() {
        mock.stub(200, """{"success":false,"error":"Insufficient balance"}""")
        try {
            client.createAccount("o1", "business")
            fail("Expected HydraError")
        } catch (e: HydraError) {
            assertTrue(e.message.contains("Insufficient balance"))
        }
    }

    // ── Header Verification ──

    @Test
    fun requestIncludesAllRequiredHeaders() {
        mock.stub(200, """{"status":"healthy"}""")
        client.healthCheck()
        val headers = mock.lastHeaders ?: emptyMap()
        assertNotNull(headers["X-API-Key"])
        assertNotNull(headers["X-Timestamp"])
        assertNotNull(headers["X-Signature"])
        assertNotNull(headers["Accept"])
        assertNotNull(headers["X-Default-Currency"])
        assertNotNull(headers["Accept-Language"])
    }

    @Test
    fun requestHasCorrectApiKey() {
        mock.stub(200, """{"status":"healthy"}""")
        client.healthCheck()
        assertEquals("test-api-key", mock.lastHeaders?.get("X-API-Key"))
    }

    @Test
    fun requestHasDefaultCurrency() {
        mock.stub(200, """{"status":"healthy"}""")
        client.healthCheck()
        assertEquals("GBP", mock.lastHeaders?.get("X-Default-Currency"))
    }

    @Test
    fun requestHasCorrectLocale() {
        mock.stub(200, """{"status":"healthy"}""")
        client.healthCheck()
        assertEquals("en", mock.lastHeaders?.get("Accept-Language"))
    }

    @Test
    fun postRequestHasContentType() {
        mock.stub(200, """{"success":true,"data":{"id":"acc_1","owner_id":"o1","account_type":"b","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}}""")
        client.createAccount("o1", "b")
        assertEquals("application/json", mock.lastHeaders?.get("Content-Type"))
    }

    @Test
    fun hmacSignatureIsValid() {
        mock.stub(200, """{"status":"healthy"}""")
        client.healthCheck()
        val ts = mock.lastHeaders?.get("X-Timestamp") ?: ""
        val sig = mock.lastHeaders?.get("X-Signature") ?: ""
        val msg = "GET:/health:$ts:"
        assertEquals(client.signMessage(msg), sig)
    }

    private fun assertNotEquals(a: Any?, b: Any?) {
        if (a == b) throw AssertionError("Expected <$a> to not equal <$b>")
    }
}
