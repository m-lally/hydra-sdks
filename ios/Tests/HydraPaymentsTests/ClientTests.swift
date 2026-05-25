import XCTest
@testable import HydraPayments

// MARK: - Mock HTTP Client

final class MockHTTPClient: HTTPClient {
    private var responses: [(Int, Data)] = []
    private(set) var lastRequest: URLRequest?

    func stub(_ statusCode: Int, _ json: String) {
        responses.append((statusCode, Data(json.utf8)))
    }

    func send(request: URLRequest) async throws -> (statusCode: Int, body: Data) {
        lastRequest = request
        if responses.isEmpty {
            return (200, Data("{}".utf8))
        }
        return responses.removeFirst()
    }
}

// MARK: - Client Tests

final class ClientTests: XCTestCase {
    var mock: MockHTTPClient!
    var client: HydraClient!

    override func setUp() {
        super.setUp()
        mock = MockHTTPClient()
        client = HydraClientBuilder()
            .baseURL("http://localhost:9999")
            .apiKey("test-api-key")
            .secretKey("test-secret-key")
            .httpClient(mock)
            .build()
    }

    // MARK: Builder

    func testBuilderDefaults() {
        let c = HydraClientBuilder()
            .apiKey("k")
            .secretKey("s")
            .httpClient(MockHTTPClient())
            .build()
        XCTAssertEqual(c.baseURL, "http://localhost:8080")
        XCTAssertEqual(c.defaultCurrency, "GBP")
        XCTAssertEqual(c.locale, "en")
    }

    func testBuilderStripsTrailingSlash() {
        let c = HydraClientBuilder()
            .baseURL("http://example.com/")
            .apiKey("k")
            .secretKey("s")
            .httpClient(MockHTTPClient())
            .build()
        XCTAssertEqual(c.baseURL, "http://example.com")
    }

    // MARK: Signing Util

    func testSignProducesNonEmptyResult() {
        let sig = client.signMessage("GET:/health:12345:")
        XCTAssertFalse(sig.isEmpty)
    }

    func testSignWithEmptySecretReturnsEmpty() {
        let c = HydraClientBuilder()
            .apiKey("k")
            .secretKey("")
            .httpClient(MockHTTPClient())
            .build()
        let sig = c.signMessage("anything")
        XCTAssertEqual(sig, "")
    }

    func testSignIsDeterministic() {
        let msg = "POST:/v1/api/accounts:12345:{\"key\":\"value\"}"
        let a = client.signMessage(msg)
        let b = client.signMessage(msg)
        XCTAssertEqual(a, b)
    }

    func testDifferentMessagesProduceDifferentSignatures() {
        let a = client.signMessage("message one")
        let b = client.signMessage("message two")
        XCTAssertNotEqual(a, b)
    }

    func testDifferentKeysProduceDifferentSignatures() {
        let c2 = HydraClientBuilder()
            .apiKey("k")
            .secretKey("different-secret")
            .httpClient(MockHTTPClient())
            .build()
        let a = client.signMessage("same message")
        let b = c2.signMessage("same message")
        XCTAssertNotEqual(a, b)
    }

    // MARK: Signature Verification

    func testVerifyValidSignature() {
        let msg = "test message"
        let sig = client.signMessage(msg)
        XCTAssertTrue(client.verifySignature(payload: msg, signature: sig))
    }

    func testVerifyTamperedPayload() {
        let sig = client.signMessage("original message")
        XCTAssertFalse(client.verifySignature(payload: "tampered", signature: sig))
    }

    func testVerifyWrongKey() {
        let c2 = HydraClientBuilder()
            .apiKey("k")
            .secretKey("different-secret")
            .httpClient(MockHTTPClient())
            .build()
        let msg = "test message"
        let sig = client.signMessage(msg)
        XCTAssertFalse(c2.verifySignature(payload: msg, signature: sig))
    }

    func testVerifyEmptyKeyAndEmptySignature() {
        let c = HydraClientBuilder()
            .apiKey("k")
            .secretKey("")
            .httpClient(MockHTTPClient())
            .build()
        XCTAssertTrue(c.verifySignature(payload: "anything", signature: ""))
    }

    // MARK: Health Check

    func testHealthCheckHealthy() async throws {
        mock.stub(200, #"{"status":"healthy","version":"1.0","database":"connected"}"#)
        let health = try await client.healthCheck()
        XCTAssertEqual(health.status, "healthy")
        XCTAssertTrue(health.isHealthy)
        XCTAssertEqual(health.version, "1.0")
    }

    func testHealthCheckUnhealthy() async throws {
        mock.stub(200, #"{"status":"unhealthy","database":"disconnected"}"#)
        let health = try await client.healthCheck()
        XCTAssertEqual(health.status, "unhealthy")
        XCTAssertFalse(health.isHealthy)
    }

    func testHealthCheckServerError() async throws {
        mock.stub(500, #"{"error":"Internal Server Error"}"#)
        do {
            _ = try await client.healthCheck()
            XCTFail("Expected HydraError")
        } catch let error as HydraError {
            XCTAssertEqual(error.statusCode, 500)
        }
    }

    // MARK: Accounts

    func testCreateAccountWithCurrency() async throws {
        mock.stub(200, #"{"success":true,"data":{"id":"acc_1","owner_id":"o1","account_type":"business","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}}"#)
        let account = try await client.createAccount(ownerId: "o1", accountType: "business", currency: "GBP")
        XCTAssertEqual(account.id, "acc_1")
        XCTAssertEqual(account.ownerId, "o1")
        XCTAssertEqual(account.accountType, "business")
    }

    func testCreateAccountWithDefaultCurrency() async throws {
        mock.stub(200, #"{"success":true,"data":{"id":"acc_2","owner_id":"o2","account_type":"business","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}}"#)
        let account = try await client.createAccount(ownerId: "o2", accountType: "business")
        XCTAssertEqual(account.currency, "GBP")
    }

    func testGetAccount() async throws {
        mock.stub(200, #"{"success":true,"data":{"id":"acc_1","owner_id":"o1","account_type":"business","currency":"GBP","balance":"1000","created_at":"2024-01-01T00:00:00Z"}}"#)
        let account = try await client.getAccount(id: "acc_1")
        XCTAssertEqual(account.id, "acc_1")
        XCTAssertEqual(account.balance, "1000")
    }

    func testGetAccountsByOwner() async throws {
        mock.stub(200, #"{"success":true,"data":[{"id":"acc_1","owner_id":"o1","account_type":"business","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}]}"#)
        let accounts = try await client.getAccountsByOwner(ownerId: "o1")
        XCTAssertEqual(accounts.count, 1)
        XCTAssertEqual(accounts[0].ownerId, "o1")
    }

    // MARK: Transactions

    func testTransfer() async throws {
        mock.stub(200, #"{"success":true,"data":{"id":"tx_1","amount":"1000","currency":"GBP","status":"pending","created_at":"2024-01-01T00:00:00Z"}}"#)
        let tx = try await client.transfer(sourceId: "w1", destId: "w2", amount: "1000", currency: "GBP", reference: "payment")
        XCTAssertEqual(tx.id, "tx_1")
        XCTAssertEqual(tx.amount, "1000")
    }

    func testGetTransaction() async throws {
        mock.stub(200, #"{"success":true,"data":{"id":"tx_1","amount":"500","currency":"USD","status":"completed","created_at":"2024-01-01T00:00:00Z"}}"#)
        let tx = try await client.getTransaction(id: "tx_1")
        XCTAssertEqual(tx.id, "tx_1")
        XCTAssertEqual(tx.status, "completed")
    }

    func testCompleteTransaction() async throws {
        mock.stub(200, #"{"success":true}"#)
        let result = try await client.completeTransaction(id: "tx_1")
        XCTAssertTrue(result)
    }

    func testCompleteTransactionFalse() async throws {
        mock.stub(200, #"{"success":false}"#)
        let result = try await client.completeTransaction(id: "tx_1")
        XCTAssertFalse(result)
    }

    func testFailTransaction() async throws {
        mock.stub(200, #"{"success":true}"#)
        let result = try await client.failTransaction(id: "tx_1")
        XCTAssertTrue(result)
    }

    // MARK: Wallets

    func testCreateWalletCustodial() async throws {
        mock.stub(200, #"{"success":true,"data":{"id":"w_1","owner_id":"o1","wallet_type":"custodial","chain":"ethereum","address":"0xabc","is_custodial":true,"encrypted_private_key":"enc_key","created_at":"2024-01-01T00:00:00Z"}}"#)
        let wallet = try await client.createWallet(ownerId: "o1", walletType: "custodial", chain: "ethereum", address: "0xabc", encryptedPrivateKey: "enc_key")
        XCTAssertEqual(wallet.id, "w_1")
        XCTAssertTrue(wallet.isCustodial)
    }

    func testCreateWalletNonCustodialNoKey() async throws {
        mock.stub(200, #"{"success":true,"data":{"id":"w_2","owner_id":"o2","wallet_type":"non-custodial","chain":"solana","address":"0xdef","is_custodial":false,"created_at":"2024-01-01T00:00:00Z"}}"#)
        let wallet = try await client.createWallet(ownerId: "o2", walletType: "non-custodial", chain: "solana", address: "0xdef")
        XCTAssertEqual(wallet.id, "w_2")
        XCTAssertFalse(wallet.isCustodial)
        XCTAssertNil(wallet.encryptedPrivateKey)
    }

    func testGetWallets() async throws {
        mock.stub(200, #"{"success":true,"data":[{"id":"w_1","owner_id":"o1","wallet_type":"custodial","chain":"ethereum","address":"0xabc","is_custodial":true,"created_at":"2024-01-01T00:00:00Z"}]}"#)
        let wallets = try await client.getWallets(ownerId: "o1")
        XCTAssertEqual(wallets.count, 1)
        XCTAssertEqual(wallets[0].chain, "ethereum")
    }

    func testGetWalletsEmpty() async throws {
        mock.stub(200, #"{"success":true,"data":[]}"#)
        let wallets = try await client.getWallets(ownerId: "nonexistent")
        XCTAssertEqual(wallets.count, 0)
    }

    func testRelayTransaction() async throws {
        mock.stub(200, #"{"success":true,"data":{"transaction_hash":"0xhash123"}}"#)
        let hash = try await client.relayTransaction(walletId: "w_1", signedTransaction: "signed_tx_data")
        XCTAssertEqual(hash, "0xhash123")
    }

    // MARK: Splits

    func testCreateSplit() async throws {
        let entries = [
            SplitEntry(accountId: "acc_1", percentage: "70"),
            SplitEntry(accountId: "acc_2", percentage: "30")
        ]
        mock.stub(200, #"{"success":true,"data":{"id":"split_1","total":"1000","currency":"GBP","splits":[{"account_id":"acc_1","percentage":"70"},{"account_id":"acc_2","percentage":"30"}],"sink_account_id":"acc_sink","status":"active","created_at":"2024-01-01T00:00:00Z"}}"#)
        let split = try await client.createSplit(total: "1000", splits: entries, currency: "GBP")
        XCTAssertEqual(split.id, "split_1")
        XCTAssertEqual(split.splits.count, 2)
    }

    func testGetSplit() async throws {
        mock.stub(200, #"{"success":true,"data":{"id":"split_1","total":"1000","currency":"GBP","splits":[{"account_id":"acc_1","percentage":"100"}],"status":"active","created_at":"2024-01-01T00:00:00Z"}}"#)
        let split = try await client.getSplit(id: "split_1")
        XCTAssertEqual(split.id, "split_1")
        XCTAssertEqual(split.splits[0].accountId, "acc_1")
    }

    // MARK: Gateway

    func testCreateCardToken() async throws {
        let card = CardInput(number: "4111111111111111", expMonth: "12", expYear: "2025", cvc: "123")
        mock.stub(200, #"{"id":"tok_1","card":{"brand":"visa","last4":"1111","exp_month":"12","exp_year":"2025"},"created_at":"2024-01-01T00:00:00Z"}"#)
        let token = try await client.createCardToken(card: card)
        XCTAssertEqual(token.id, "tok_1")
        XCTAssertEqual(token.card?.brand, "visa")
    }

    func testCreatePaymentIntent() async throws {
        mock.stub(200, #"{"id":"pi_1","status":"requires_payment_method","amount":"2000","currency":"USD","client_secret":"sec_123"}"#)
        let intent = try await client.createPaymentIntent(amount: "2000", currency: "USD", token: "tok_1", idempotencyKey: "idemp_1")
        XCTAssertEqual(intent.id, "pi_1")
        XCTAssertEqual(intent.clientSecret, "sec_123")
    }

    func testCreateRefundFull() async throws {
        mock.stub(200, #"{"id":"ref_1","status":"succeeded","amount":"1000","charge":"ch_1"}"#)
        let refund = try await client.createRefund(chargeId: "ch_1", amount: "1000")
        XCTAssertEqual(refund.id, "ref_1")
        XCTAssertEqual(refund.charge, "ch_1")
    }

    func testCreateRefundPartial() async throws {
        mock.stub(200, #"{"id":"ref_2","status":"succeeded","amount":"500","charge":"ch_1"}"#)
        let refund = try await client.createRefund(chargeId: "ch_1", amount: "500")
        XCTAssertEqual(refund.amount, "500")
    }

    func testGetCommission() async throws {
        mock.stub(200, #"{"total_commission":"1500"}"#)
        let commission = try await client.getCommission()
        XCTAssertEqual(commission.totalCommission, "1500")
    }

    func testSendWebhookEvent() async throws {
        let payload: [String: Any] = ["type": "payment_intent.succeeded", "data": ["id": "pi_1"]]
        mock.stub(200, #"{"received":true}"#)
        let response = try await client.sendWebhookEvent(payload: payload)
        XCTAssertTrue(response.received)
    }

    func testGetMetrics() async throws {
        mock.stub(200, "metric1 100\nmetric2 200")
        let metrics = try await client.getMetrics()
        XCTAssertTrue(metrics.contains("metric1"))
    }

    // MARK: Error Mapping

    func testAuthenticationError() async throws {
        mock.stub(401, #"{"error":"Invalid API key"}"#)
        do {
            _ = try await client.healthCheck()
            XCTFail("Expected AuthenticationError")
        } catch let error as AuthenticationError {
            XCTAssertTrue(error.message.contains("Invalid API key"))
        }
    }

    func testValidationError() async throws {
        mock.stub(400, #"{"error":"Validation failed","details":{"field":"amount","reason":"required"}}"#)
        do {
            _ = try await client.healthCheck()
            XCTFail("Expected ValidationError")
        } catch let error as ValidationError {
            XCTAssertEqual(error.statusCode, 400)
        }
    }

    func testNotFoundError() async throws {
        mock.stub(404, #"{"error":"Account not found"}"#)
        do {
            _ = try await client.getAccount(id: "nonexistent")
            XCTFail("Expected NotFoundError")
        } catch let error as NotFoundError {
            XCTAssertEqual(error.statusCode, 404)
        }
    }

    func testGenericApiError() async throws {
        mock.stub(402, #"{"error":"Payment required"}"#)
        do {
            _ = try await client.healthCheck()
            XCTFail("Expected HydraError")
        } catch let error as HydraError {
            XCTAssertEqual(error.statusCode, 402)
            XCTAssertEqual(error.errorCode, "API_ERROR")
        }
    }

    func testApiLevelError() async throws {
        mock.stub(200, #"{"success":false,"error":"Insufficient balance"}"#)
        do {
            _ = try await client.createAccount(ownerId: "o1", accountType: "business")
            XCTFail("Expected HydraError")
        } catch let error as HydraError {
            XCTAssertTrue(error.message.contains("Insufficient balance"))
        }
    }

    // MARK: Header Verification

    func testRequestIncludesAllRequiredHeaders() async throws {
        mock.stub(200, #"{"status":"healthy"}"#)
        _ = try await client.healthCheck()
        let headers = mock.lastRequest?.allHTTPHeaderFields ?? [:]
        XCTAssertNotNil(headers["X-API-Key"])
        XCTAssertNotNil(headers["X-Timestamp"])
        XCTAssertNotNil(headers["X-Signature"])
        XCTAssertNotNil(headers["Accept"])
        XCTAssertNotNil(headers["X-Default-Currency"])
        XCTAssertNotNil(headers["Accept-Language"])
    }

    func testRequestHasCorrectApiKey() async throws {
        mock.stub(200, #"{"status":"healthy"}"#)
        _ = try await client.healthCheck()
        let headers = mock.lastRequest?.allHTTPHeaderFields ?? [:]
        XCTAssertEqual(headers["X-API-Key"], "test-api-key")
    }

    func testRequestHasDefaultCurrency() async throws {
        mock.stub(200, #"{"status":"healthy"}"#)
        _ = try await client.healthCheck()
        let headers = mock.lastRequest?.allHTTPHeaderFields ?? [:]
        XCTAssertEqual(headers["X-Default-Currency"], "GBP")
    }

    func testRequestHasCorrectLocale() async throws {
        mock.stub(200, #"{"status":"healthy"}"#)
        _ = try await client.healthCheck()
        let headers = mock.lastRequest?.allHTTPHeaderFields ?? [:]
        XCTAssertEqual(headers["Accept-Language"], "en")
    }

    func testPostRequestHasContentType() async throws {
        mock.stub(200, #"{"success":true,"data":{"id":"acc_1","owner_id":"o1","account_type":"b","currency":"GBP","balance":"0","created_at":"2024-01-01T00:00:00Z"}}"#)
        _ = try await client.createAccount(ownerId: "o1", accountType: "b")
        let headers = mock.lastRequest?.allHTTPHeaderFields ?? [:]
        XCTAssertEqual(headers["Content-Type"], "application/json")
    }

    func testHMACSignatureIsValid() async throws {
        mock.stub(200, #"{"status":"healthy"}"#)
        _ = try await client.healthCheck()
        let headers = mock.lastRequest?.allHTTPHeaderFields ?? [:]
        let sig = headers["X-Signature"] ?? ""
        let ts = headers["X-Timestamp"] ?? ""
        let msg = "GET:/health:\(ts):"
        let expected = client.signMessage(msg)
        XCTAssertEqual(sig, expected)
    }
}
