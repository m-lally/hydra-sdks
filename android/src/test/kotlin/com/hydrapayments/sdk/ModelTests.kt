package com.hydrapayments.sdk

import org.json.JSONObject
import org.junit.jupiter.api.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNull
import kotlin.test.assertTrue

class ModelTests {
    // ── Account ──

    @Test
    fun accountFullDeserialization() {
        val json = """{"id":"acc_1","owner_id":"owner_123","account_type":"business","currency":"GBP","balance":"10000","metadata":{"ref":"ABC"},"created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-02T00:00:00Z"}"""
        val account = Account.fromJson(JSONObject(json))
        assertEquals("acc_1", account.id)
        assertEquals("owner_123", account.ownerId)
        assertEquals("business", account.accountType)
        assertEquals("GBP", account.currency)
        assertEquals("10000", account.balance)
        assertEquals("ABC", account.metadata?.get("ref"))
        assertEquals("2024-01-01T00:00:00Z", account.createdAt)
        assertEquals("2024-01-02T00:00:00Z", account.updatedAt)
    }

    @Test
    fun accountOptionalsDefaultToNull() {
        val json = """{"id":"acc_2","owner_id":"o2","account_type":"personal","currency":"USD","balance":"500","created_at":"2024-01-01T00:00:00Z"}"""
        val account = Account.fromJson(JSONObject(json))
        assertNull(account.metadata)
        assertNull(account.updatedAt)
    }

    // ── Transaction ──

    @Test
    fun transactionFullDeserialization() {
        val json = """{"id":"tx_1","source_account_id":"acc_src","dest_account_id":"acc_dst","amount":"1000","currency":"GBP","status":"completed","transaction_type":"transfer","reference":"ref_001","description":"payment","metadata":{"key":"val"},"previous_state_hash":"abc123","created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-02T00:00:00Z"}"""
        val tx = Transaction.fromJson(JSONObject(json))
        assertEquals("tx_1", tx.id)
        assertEquals("acc_src", tx.sourceAccountId)
        assertEquals("acc_dst", tx.destAccountId)
        assertEquals("1000", tx.amount)
        assertEquals("completed", tx.status)
        assertEquals("transfer", tx.transactionType)
        assertEquals("ref_001", tx.reference)
        assertEquals("payment", tx.description)
        assertEquals("val", tx.metadata?.get("key"))
        assertEquals("abc123", tx.previousStateHash)
    }

    @Test
    fun transactionOptionalsDefaultToNull() {
        val json = """{"id":"tx_2","amount":"500","currency":"USD","status":"pending","created_at":"2024-01-01T00:00:00Z"}"""
        val tx = Transaction.fromJson(JSONObject(json))
        assertNull(tx.sourceAccountId)
        assertNull(tx.destAccountId)
        assertNull(tx.reference)
    }

    // ── Wallet ──

    @Test
    fun walletCustodial() {
        val json = """{"id":"w_1","owner_id":"o1","wallet_type":"custodial","chain":"ethereum","address":"0xabc","is_custodial":true,"encrypted_private_key":"enc_key","created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-02T00:00:00Z"}"""
        val wallet = Wallet.fromJson(JSONObject(json))
        assertEquals("w_1", wallet.id)
        assertTrue(wallet.isCustodial)
        assertEquals("enc_key", wallet.encryptedPrivateKey)
    }

    @Test
    fun walletNonCustodial() {
        val json = """{"id":"w_2","owner_id":"o2","wallet_type":"non-custodial","chain":"solana","address":"0xdef","is_custodial":false,"created_at":"2024-01-01T00:00:00Z"}"""
        val wallet = Wallet.fromJson(JSONObject(json))
        assertEquals("w_2", wallet.id)
        assertFalse(wallet.isCustodial)
        assertNull(wallet.encryptedPrivateKey)
        assertNull(wallet.updatedAt)
    }

    // ── SplitRule ──

    @Test
    fun splitRuleWithNestedSplits() {
        val json = """{"id":"split_1","transaction_id":"tx_1","total":"1000","currency":"GBP","splits":[{"account_id":"acc_1","percentage":"70"},{"account_id":"acc_2","percentage":"30"}],"sink_account_id":"sink_1","status":"active","created_at":"2024-01-01T00:00:00Z"}"""
        val split = SplitRule.fromJson(JSONObject(json))
        assertEquals("split_1", split.id)
        assertEquals("tx_1", split.transactionId)
        assertEquals("1000", split.total)
        assertEquals(2, split.splits.size)
        assertEquals("acc_1", split.splits[0].accountId)
        assertEquals("70", split.splits[0].percentage)
        assertEquals("acc_2", split.splits[1].accountId)
        assertEquals("30", split.splits[1].percentage)
        assertEquals("sink_1", split.sinkAccountId)
        assertEquals("active", split.status)
    }

    // ── Gateway: Token ──

    @Test
    fun createTokenResponseWithNestedCard() {
        val json = """{"id":"tok_1","card":{"brand":"visa","last4":"1111","exp_month":"12","exp_year":"2025"},"created_at":"2024-01-01T00:00:00Z"}"""
        val token = CreateTokenResponse.fromJson(JSONObject(json))
        assertEquals("tok_1", token.id)
        assertEquals("visa", token.card?.brand)
        assertEquals("1111", token.card?.last4)
        assertEquals("12", token.card?.expMonth)
        assertEquals("2025", token.card?.expYear)
    }

    @Test
    fun createIntentResponse() {
        val json = """{"id":"pi_1","status":"requires_payment_method","amount":"2000","currency":"USD","client_secret":"sec_123"}"""
        val intent = CreateIntentResponse.fromJson(JSONObject(json))
        assertEquals("pi_1", intent.id)
        assertEquals("requires_payment_method", intent.status)
        assertEquals("2000", intent.amount)
        assertEquals("USD", intent.currency)
        assertEquals("sec_123", intent.clientSecret)
    }

    @Test
    fun createRefundResponse() {
        val json = """{"id":"ref_1","status":"succeeded","amount":"1000","charge":"ch_1"}"""
        val refund = CreateRefundResponse.fromJson(JSONObject(json))
        assertEquals("ref_1", refund.id)
        assertEquals("succeeded", refund.status)
        assertEquals("1000", refund.amount)
        assertEquals("ch_1", refund.charge)
    }

    // ── Health ──

    @Test
    fun healthResponseHealthy() {
        val json = """{"status":"healthy","version":"1.0","database":"connected"}"""
        val health = HealthResponse.fromJson(JSONObject(json))
        assertEquals("healthy", health.status)
        assertTrue(health.isHealthy)
        assertEquals("1.0", health.version)
        assertEquals("connected", health.database)
    }

    @Test
    fun healthResponseUnhealthy() {
        val json = """{"status":"unhealthy","database":"disconnected"}"""
        val health = HealthResponse.fromJson(JSONObject(json))
        assertEquals("unhealthy", health.status)
        assertFalse(health.isHealthy)
    }

    // ── Commission ──

    @Test
    fun commissionResponse() {
        val json = """{"total_commission":"1500"}"""
        val commission = CommissionResponse.fromJson(JSONObject(json))
        assertEquals("1500", commission.totalCommission)
    }

    // ── Webhook ──

    @Test
    fun webhookResponse() {
        val json = """{"received":true}"""
        val webhook = WebhookResponse.fromJson(JSONObject(json))
        assertTrue(webhook.received)
    }
}
