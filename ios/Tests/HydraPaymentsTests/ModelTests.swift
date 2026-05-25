import XCTest
@testable import HydraPayments

final class ModelTests: XCTestCase {
    let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    // MARK: Account

    func testAccountFullDeserialization() throws {
        let json = """
        {"id":"acc_1","owner_id":"owner_123","account_type":"business","currency":"GBP","balance":"10000","metadata":{"ref":"ABC"},"created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-02T00:00:00Z"}
        """
        let account = try decoder.decode(Account.self, from: Data(json.utf8))
        XCTAssertEqual(account.id, "acc_1")
        XCTAssertEqual(account.ownerId, "owner_123")
        XCTAssertEqual(account.accountType, "business")
        XCTAssertEqual(account.currency, "GBP")
        XCTAssertEqual(account.balance, "10000")
        XCTAssertEqual(account.metadata?["ref"], "ABC")
        XCTAssertEqual(account.createdAt, "2024-01-01T00:00:00Z")
        XCTAssertEqual(account.updatedAt, "2024-01-02T00:00:00Z")
    }

    func testAccountOptionalsDefaultToNil() throws {
        let json = """
        {"id":"acc_2","owner_id":"o2","account_type":"personal","currency":"USD","balance":"500","created_at":"2024-01-01T00:00:00Z"}
        """
        let account = try decoder.decode(Account.self, from: Data(json.utf8))
        XCTAssertNil(account.metadata)
        XCTAssertNil(account.updatedAt)
    }

    // MARK: Transaction

    func testTransactionFullDeserialization() throws {
        let json = """
        {"id":"tx_1","source_account_id":"acc_src","dest_account_id":"acc_dst","amount":"1000","currency":"GBP","status":"completed","transaction_type":"transfer","reference":"ref_001","description":"payment","metadata":{"key":"val"},"previous_state_hash":"abc123","created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-02T00:00:00Z"}
        """
        let tx = try decoder.decode(Transaction.self, from: Data(json.utf8))
        XCTAssertEqual(tx.id, "tx_1")
        XCTAssertEqual(tx.sourceAccountId, "acc_src")
        XCTAssertEqual(tx.destAccountId, "acc_dst")
        XCTAssertEqual(tx.amount, "1000")
        XCTAssertEqual(tx.currency, "GBP")
        XCTAssertEqual(tx.status, "completed")
        XCTAssertEqual(tx.transactionType, "transfer")
        XCTAssertEqual(tx.reference, "ref_001")
        XCTAssertEqual(tx.description, "payment")
        XCTAssertEqual(tx.metadata?["key"], "val")
        XCTAssertEqual(tx.previousStateHash, "abc123")
    }

    func testTransactionOptionalsDefaultToNil() throws {
        let json = """
        {"id":"tx_2","amount":"500","currency":"USD","status":"pending","created_at":"2024-01-01T00:00:00Z"}
        """
        let tx = try decoder.decode(Transaction.self, from: Data(json.utf8))
        XCTAssertNil(tx.sourceAccountId)
        XCTAssertNil(tx.destAccountId)
        XCTAssertNil(tx.reference)
    }

    // MARK: Wallet

    func testWalletCustodial() throws {
        let json = """
        {"id":"w_1","owner_id":"o1","wallet_type":"custodial","chain":"ethereum","address":"0xabc","is_custodial":true,"encrypted_private_key":"enc_key","created_at":"2024-01-01T00:00:00Z","updated_at":"2024-01-02T00:00:00Z"}
        """
        let wallet = try decoder.decode(Wallet.self, from: Data(json.utf8))
        XCTAssertEqual(wallet.id, "w_1")
        XCTAssertTrue(wallet.isCustodial)
        XCTAssertEqual(wallet.encryptedPrivateKey, "enc_key")
    }

    func testWalletNonCustodial() throws {
        let json = """
        {"id":"w_2","owner_id":"o2","wallet_type":"non-custodial","chain":"solana","address":"0xdef","is_custodial":false,"created_at":"2024-01-01T00:00:00Z"}
        """
        let wallet = try decoder.decode(Wallet.self, from: Data(json.utf8))
        XCTAssertEqual(wallet.id, "w_2")
        XCTAssertFalse(wallet.isCustodial)
        XCTAssertNil(wallet.encryptedPrivateKey)
        XCTAssertNil(wallet.updatedAt)
    }

    // MARK: SplitRule

    func testSplitRuleWithNestedSplits() throws {
        let json = """
        {"id":"split_1","transaction_id":"tx_1","total":"1000","currency":"GBP","splits":[{"account_id":"acc_1","percentage":"70"},{"account_id":"acc_2","percentage":"30"}],"sink_account_id":"sink_1","status":"active","created_at":"2024-01-01T00:00:00Z"}
        """
        let split = try decoder.decode(SplitRule.self, from: Data(json.utf8))
        XCTAssertEqual(split.id, "split_1")
        XCTAssertEqual(split.transactionId, "tx_1")
        XCTAssertEqual(split.total, "1000")
        XCTAssertEqual(split.splits.count, 2)
        XCTAssertEqual(split.splits[0].accountId, "acc_1")
        XCTAssertEqual(split.splits[0].percentage, "70")
        XCTAssertEqual(split.splits[1].accountId, "acc_2")
        XCTAssertEqual(split.splits[1].percentage, "30")
        XCTAssertEqual(split.sinkAccountId, "sink_1")
        XCTAssertEqual(split.status, "active")
    }

    // MARK: Gateway

    func testCreateTokenResponseWithNestedCard() throws {
        let json = """
        {"id":"tok_1","card":{"brand":"visa","last4":"1111","exp_month":"12","exp_year":"2025"},"created_at":"2024-01-01T00:00:00Z"}
        """
        let token = try decoder.decode(CreateTokenResponse.self, from: Data(json.utf8))
        XCTAssertEqual(token.id, "tok_1")
        XCTAssertEqual(token.card?.brand, "visa")
        XCTAssertEqual(token.card?.last4, "1111")
        XCTAssertEqual(token.card?.expMonth, "12")
        XCTAssertEqual(token.card?.expYear, "2025")
    }

    func testCreateIntentResponse() throws {
        let json = """
        {"id":"pi_1","status":"requires_payment_method","amount":"2000","currency":"USD","client_secret":"sec_123"}
        """
        let intent = try decoder.decode(CreateIntentResponse.self, from: Data(json.utf8))
        XCTAssertEqual(intent.id, "pi_1")
        XCTAssertEqual(intent.status, "requires_payment_method")
        XCTAssertEqual(intent.amount, "2000")
        XCTAssertEqual(intent.currency, "USD")
        XCTAssertEqual(intent.clientSecret, "sec_123")
    }

    func testCreateRefundResponse() throws {
        let json = """
        {"id":"ref_1","status":"succeeded","amount":"1000","charge":"ch_1"}
        """
        let refund = try decoder.decode(CreateRefundResponse.self, from: Data(json.utf8))
        XCTAssertEqual(refund.id, "ref_1")
        XCTAssertEqual(refund.status, "succeeded")
        XCTAssertEqual(refund.amount, "1000")
        XCTAssertEqual(refund.charge, "ch_1")
    }

    // MARK: Health

    func testHealthResponseHealthy() throws {
        let json = """
        {"status":"healthy","version":"1.0","database":"connected"}
        """
        let health = try decoder.decode(HealthResponse.self, from: Data(json.utf8))
        XCTAssertEqual(health.status, "healthy")
        XCTAssertTrue(health.isHealthy)
        XCTAssertEqual(health.version, "1.0")
        XCTAssertEqual(health.database, "connected")
    }

    func testHealthResponseUnhealthy() throws {
        let json = """
        {"status":"unhealthy","database":"disconnected"}
        """
        let health = try decoder.decode(HealthResponse.self, from: Data(json.utf8))
        XCTAssertEqual(health.status, "unhealthy")
        XCTAssertFalse(health.isHealthy)
    }

    // MARK: Commission

    func testCommissionResponse() throws {
        let json = """
        {"total_commission":"1500"}
        """
        let commission = try decoder.decode(CommissionResponse.self, from: Data(json.utf8))
        XCTAssertEqual(commission.totalCommission, "1500")
    }

    // MARK: Webhook

    func testWebhookResponse() throws {
        let json = """
        {"received":true}
        """
        let webhook = try decoder.decode(WebhookResponse.self, from: Data(json.utf8))
        XCTAssertTrue(webhook.received)
    }

    // MARK: ApiResponse

    func testApiResponseSuccess() throws {
        let json = """
        {"success":true,"data":{"id":"acc_1","owner_id":"o1","account_type":"b","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"},"error":null}
        """
        let response = try decoder.decode(ApiResponse<Account>.self, from: Data(json.utf8))
        XCTAssertTrue(response.success)
        XCTAssertNotNil(response.data)
        XCTAssertNil(response.error)
    }

    func testApiResponseError() throws {
        let json = """
        {"success":false,"data":null,"error":"Insufficient funds"}
        """
        let response = try decoder.decode(ApiResponse<Account>.self, from: Data(json.utf8))
        XCTAssertFalse(response.success)
        XCTAssertNil(response.data)
        XCTAssertEqual(response.error, "Insufficient funds")
    }
}
