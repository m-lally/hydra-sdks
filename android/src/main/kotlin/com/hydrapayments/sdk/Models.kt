package com.hydrapayments.sdk

import org.json.JSONArray
import org.json.JSONObject

// ── Health ──

data class HealthResponse(
    val status: String,
    val version: String?,
    val database: String?
) {
    val isHealthy: Boolean get() = status == "healthy"

    companion object {
        fun fromJson(json: JSONObject): HealthResponse = HealthResponse(
            status = json.getString("status"),
            version = json.optString("version", null),
            database = json.optString("database", null)
        )
    }
}

// ── Account ──

data class Account(
    val id: String,
    val ownerId: String,
    val accountType: String,
    val currency: String,
    val balance: String,
    val metadata: Map<String, String>?,
    val createdAt: String,
    val updatedAt: String?
) {
    companion object {
        fun fromJson(json: JSONObject): Account = Account(
            id = json.getString("id"),
            ownerId = json.getString("owner_id"),
            accountType = json.getString("account_type"),
            currency = json.getString("currency"),
            balance = json.getString("balance"),
            metadata = json.optJSONObject("metadata")?.let { obj ->
                obj.keys().asSequence().associateWith { obj.getString(it) }
            },
            createdAt = json.getString("created_at"),
            updatedAt = json.optString("updated_at", null)
        )
    }
}

// ── Transaction ──

data class Transaction(
    val id: String,
    val sourceAccountId: String?,
    val destAccountId: String?,
    val amount: String,
    val currency: String,
    val status: String,
    val transactionType: String?,
    val reference: String?,
    val description: String?,
    val metadata: Map<String, String>?,
    val previousStateHash: String?,
    val createdAt: String,
    val updatedAt: String?
) {
    companion object {
        fun fromJson(json: JSONObject): Transaction = Transaction(
            id = json.getString("id"),
            sourceAccountId = json.optString("source_account_id", null),
            destAccountId = json.optString("dest_account_id", null),
            amount = json.getString("amount"),
            currency = json.getString("currency"),
            status = json.getString("status"),
            transactionType = json.optString("transaction_type", null),
            reference = json.optString("reference", null),
            description = json.optString("description", null),
            metadata = json.optJSONObject("metadata")?.let { obj ->
                obj.keys().asSequence().associateWith { obj.getString(it) }
            },
            previousStateHash = json.optString("previous_state_hash", null),
            createdAt = json.getString("created_at"),
            updatedAt = json.optString("updated_at", null)
        )
    }
}

// ── Wallet ──

data class Wallet(
    val id: String,
    val ownerId: String,
    val walletType: String,
    val chain: String,
    val address: String,
    val isCustodial: Boolean,
    val encryptedPrivateKey: String?,
    val createdAt: String,
    val updatedAt: String?
) {
    companion object {
        fun fromJson(json: JSONObject): Wallet = Wallet(
            id = json.getString("id"),
            ownerId = json.getString("owner_id"),
            walletType = json.getString("wallet_type"),
            chain = json.getString("chain"),
            address = json.getString("address"),
            isCustodial = json.optBoolean("is_custodial", false),
            encryptedPrivateKey = json.optString("encrypted_private_key", null),
            createdAt = json.getString("created_at"),
            updatedAt = json.optString("updated_at", null)
        )
    }
}

// ── Splits ──

data class SplitEntry(
    val accountId: String,
    val percentage: String
) {
    companion object {
        fun fromJson(json: JSONObject): SplitEntry = SplitEntry(
            accountId = json.getString("account_id"),
            percentage = json.getString("percentage")
        )
    }
}

data class SplitRule(
    val id: String,
    val transactionId: String?,
    val total: String,
    val currency: String,
    val splits: List<SplitEntry>,
    val sinkAccountId: String?,
    val status: String?,
    val createdAt: String
) {
    companion object {
        fun fromJson(json: JSONObject): SplitRule = SplitRule(
            id = json.getString("id"),
            transactionId = json.optString("transaction_id", null),
            total = json.getString("total"),
            currency = json.getString("currency"),
            splits = json.getJSONArray("splits").let { arr ->
                (0 until arr.length()).map { SplitEntry.fromJson(arr.getJSONObject(it)) }
            },
            sinkAccountId = json.optString("sink_account_id", null),
            status = json.optString("status", null),
            createdAt = json.getString("created_at")
        )
    }
}

// ── Gateway: Tokens ──

data class CardInput(
    val number: String,
    val expMonth: String,
    val expYear: String,
    val cvc: String
)

data class CardDetails(
    val brand: String?,
    val last4: String?,
    val expMonth: String?,
    val expYear: String?
) {
    companion object {
        fun fromJson(json: JSONObject): CardDetails = CardDetails(
            brand = json.optString("brand", null),
            last4 = json.optString("last4", null),
            expMonth = json.optString("exp_month", null),
            expYear = json.optString("exp_year", null)
        )
    }
}

data class CreateTokenResponse(
    val id: String,
    val card: CardDetails?,
    val createdAt: String
) {
    companion object {
        fun fromJson(json: JSONObject): CreateTokenResponse = CreateTokenResponse(
            id = json.getString("id"),
            card = json.optJSONObject("card")?.let { CardDetails.fromJson(it) },
            createdAt = json.getString("created_at")
        )
    }
}

data class CreateIntentResponse(
    val id: String,
    val status: String,
    val amount: String,
    val currency: String,
    val clientSecret: String?
) {
    companion object {
        fun fromJson(json: JSONObject): CreateIntentResponse = CreateIntentResponse(
            id = json.getString("id"),
            status = json.getString("status"),
            amount = json.getString("amount"),
            currency = json.getString("currency"),
            clientSecret = json.optString("client_secret", null)
        )
    }
}

data class CreateRefundResponse(
    val id: String,
    val status: String,
    val amount: String,
    val charge: String?
) {
    companion object {
        fun fromJson(json: JSONObject): CreateRefundResponse = CreateRefundResponse(
            id = json.getString("id"),
            status = json.getString("status"),
            amount = json.getString("amount"),
            charge = json.optString("charge", null)
        )
    }
}

data class CommissionResponse(
    val totalCommission: String
) {
    companion object {
        fun fromJson(json: JSONObject): CommissionResponse = CommissionResponse(
            totalCommission = json.getString("total_commission")
        )
    }
}

data class WebhookResponse(
    val received: Boolean
) {
    companion object {
        fun fromJson(json: JSONObject): WebhookResponse = WebhookResponse(
            received = json.getBoolean("received")
        )
    }
}
