import Foundation

// MARK: - Builder

public final class HydraClientBuilder {
    private var baseURL = "http://localhost:8080"
    private var apiKey = ""
    private var secretKey = ""
    private var defaultCurrency = "GBP"
    private var locale = "en"
    private var httpClient: HTTPClient?

    public init() {}

    @discardableResult
    public func baseURL(_ url: String) -> Self {
        baseURL = url.hasSuffix("/") ? String(url.dropLast()) : url
        return self
    }

    @discardableResult
    public func apiKey(_ key: String) -> Self {
        apiKey = key
        return self
    }

    @discardableResult
    public func secretKey(_ key: String) -> Self {
        secretKey = key
        return self
    }

    @discardableResult
    public func defaultCurrency(_ currency: String) -> Self {
        defaultCurrency = currency
        return self
    }

    @discardableResult
    public func locale(_ locale: String) -> Self {
        self.locale = locale
        return self
    }

    @discardableResult
    public func httpClient(_ client: HTTPClient) -> Self {
        httpClient = client
        return self
    }

    public func build() -> HydraClient {
        let client = httpClient ?? URLSessionHTTPClient()
        return HydraClient(
            baseURL: baseURL,
            apiKey: apiKey,
            secretKey: secretKey,
            defaultCurrency: defaultCurrency,
            locale: locale,
            httpClient: client
        )
    }
}

// MARK: - Client

public struct HydraClient {
    public let baseURL: String
    public let apiKey: String
    public let secretKey: String
    public let defaultCurrency: String
    public let locale: String
    private let httpClient: HTTPClient

    private let decoder: JSONDecoder = {
        let d = JSONDecoder()
        d.keyDecodingStrategy = .convertFromSnakeCase
        return d
    }()

    private let encoder: JSONEncoder = {
        let e = JSONEncoder()
        e.keyEncodingStrategy = .convertToSnakeCase
        return e
    }()

    public init(baseURL: String, apiKey: String, secretKey: String, defaultCurrency: String = "GBP", locale: String = "en", httpClient: HTTPClient) {
        self.baseURL = baseURL
        self.apiKey = apiKey
        self.secretKey = secretKey
        self.defaultCurrency = defaultCurrency
        self.locale = locale
        self.httpClient = httpClient
    }

    // MARK: - Security

    public func signMessage(_ message: String) -> String {
        SigningUtil.sign(secret: secretKey, message: message)
    }

    public func verifySignature(payload: String, signature: String) -> Bool {
        SigningUtil.verify(secret: secretKey, message: payload, signature: signature)
    }

    // MARK: - Health

    public func healthCheck() async throws -> HealthResponse {
        let data = try await sendRequest(method: "GET", path: "/health")
        return try decoder.decode(HealthResponse.self, from: data)
    }

    // MARK: - Accounts

    public func createAccount(ownerId: String, accountType: String, currency: String? = nil) async throws -> Account {
        let body = try encoder.encode([
            "owner_id": ownerId,
            "account_type": accountType,
            "currency": currency ?? defaultCurrency
        ])
        let data = try await coreRequest(method: "POST", path: "/v1/api/accounts", body: body)
        return try decoder.decode(Account.self, from: data)
    }

    public func getAccount(id: String) async throws -> Account {
        let data = try await coreRequest(method: "GET", path: "/v1/api/accounts/\(id)")
        return try decoder.decode(Account.self, from: data)
    }

    public func getAccountsByOwner(ownerId: String) async throws -> [Account] {
        let data = try await coreRequest(method: "GET", path: "/v1/api/accounts/owner/\(ownerId)")
        return try decoder.decode([Account].self, from: data)
    }

    // MARK: - Transactions

    public func transfer(sourceId: String, destId: String, amount: String, currency: String? = nil, reference: String? = nil) async throws -> Transaction {
        var bodyDict: [String: String] = [
            "source_id": sourceId,
            "dest_id": destId,
            "amount": amount,
            "currency": currency ?? defaultCurrency
        ]
        if let reference = reference { bodyDict["reference"] = reference }
        let body = try encoder.encode(bodyDict)
        let data = try await coreRequest(method: "POST", path: "/v1/api/transactions", body: body)
        return try decoder.decode(Transaction.self, from: data)
    }

    public func getTransaction(id: String) async throws -> Transaction {
        let data = try await coreRequest(method: "GET", path: "/v1/api/transactions/\(id)")
        return try decoder.decode(Transaction.self, from: data)
    }

    public func completeTransaction(id: String) async throws -> Bool {
        let data = try await sendRequest(method: "POST", path: "/v1/api/transactions/\(id)/complete")
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        return json["success"] as? Bool ?? false
    }

    public func failTransaction(id: String) async throws -> Bool {
        let data = try await sendRequest(method: "POST", path: "/v1/api/transactions/\(id)/fail")
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        return json["success"] as? Bool ?? false
    }

    // MARK: - Wallets

    public func createWallet(ownerId: String, walletType: String, chain: String, address: String, encryptedPrivateKey: String? = nil) async throws -> Wallet {
        var bodyDict: [String: String] = [
            "owner_id": ownerId,
            "wallet_type": walletType,
            "chain": chain,
            "address": address
        ]
        if let key = encryptedPrivateKey { bodyDict["encrypted_private_key"] = key }
        let body = try encoder.encode(bodyDict)
        let data = try await coreRequest(method: "POST", path: "/v1/api/wallets", body: body)
        return try decoder.decode(Wallet.self, from: data)
    }

    public func getWallets(ownerId: String) async throws -> [Wallet] {
        let data = try await coreRequest(method: "GET", path: "/v1/api/wallets/owner/\(ownerId)")
        return try decoder.decode([Wallet].self, from: data)
    }

    public func relayTransaction(walletId: String, signedTransaction: String) async throws -> String {
        let body = try encoder.encode(["signed_transaction": signedTransaction])
        let data = try await coreRequest(method: "POST", path: "/v1/api/wallets/\(walletId)/relay", body: body)
        let json = try JSONSerialization.jsonObject(with: data) as? [String: Any] ?? [:]
        return json["transaction_hash"] as? String ?? ""
    }

    // MARK: - Splits

    public func createSplit(total: String, splits: [SplitEntry], currency: String? = nil, reference: String? = nil) async throws -> SplitRule {
        let splitsDicts = splits.map { ["account_id": $0.accountId, "percentage": $0.percentage] }
        var bodyDict: [String: Any] = [
            "total": total,
            "splits": splitsDicts,
            "currency": currency ?? defaultCurrency
        ]
        if let reference = reference { bodyDict["reference"] = reference }
        let body = try JSONSerialization.data(withJSONObject: bodyDict)
        let data = try await coreRequest(method: "POST", path: "/v1/api/splits", body: body)
        return try decoder.decode(SplitRule.self, from: data)
    }

    public func getSplit(id: String) async throws -> SplitRule {
        let data = try await coreRequest(method: "GET", path: "/v1/api/splits/\(id)")
        return try decoder.decode(SplitRule.self, from: data)
    }

    // MARK: - Gateway: Tokens

    public func createCardToken(card: CardInput, merchantId: String? = nil) async throws -> CreateTokenResponse {
        let cardDict: [String: String] = [
            "number": card.number,
            "exp_month": card.expMonth,
            "exp_year": card.expYear,
            "cvc": card.cvc
        ]
        var bodyDict: [String: Any] = ["card": cardDict]
        if let merchantId = merchantId { bodyDict["merchant_id"] = merchantId }
        let body = try JSONSerialization.data(withJSONObject: bodyDict)
        return try await gatewayRequest(method: "POST", path: "/v1/payments/tokens", body: body)
    }

    public func createPaymentIntent(amount: String, currency: String, token: String? = nil, merchantId: String? = nil, idempotencyKey: String? = nil) async throws -> CreateIntentResponse {
        var bodyDict: [String: String] = ["amount": amount, "currency": currency]
        if let token = token { bodyDict["token"] = token }
        if let merchantId = merchantId { bodyDict["merchant_id"] = merchantId }
        if let idempotencyKey = idempotencyKey { bodyDict["idempotency_key"] = idempotencyKey }
        let body = try encoder.encode(bodyDict)
        return try await gatewayRequest(method: "POST", path: "/v1/payments/intents", body: body)
    }

    public func createRefund(chargeId: String, amount: String? = nil) async throws -> CreateRefundResponse {
        var bodyDict: [String: String] = ["charge_id": chargeId]
        if let amount = amount { bodyDict["amount"] = amount }
        let body = try encoder.encode(bodyDict)
        return try await gatewayRequest(method: "POST", path: "/v1/refunds", body: body)
    }

    public func getCommission() async throws -> CommissionResponse {
        try await gatewayRequest(method: "GET", path: "/v1/commission")
    }

    public func sendWebhookEvent(payload: [String: Any]) async throws -> WebhookResponse {
        let body = try JSONSerialization.data(withJSONObject: payload)
        return try await gatewayRequest(method: "POST", path: "/v1/webhooks/stripe", body: body)
    }

    public func getMetrics() async throws -> String {
        let data = try await sendRequest(method: "GET", path: "/v1/metrics")
        return String(data: data, encoding: .utf8) ?? ""
    }

    // MARK: - Private

    private func coreRequest(method: String, path: String, body: Data? = nil) async throws -> Data {
        let responseData = try await sendRequest(method: method, path: path, body: body)
        let json = try JSONSerialization.jsonObject(with: responseData) as? [String: Any] ?? [:]
        guard let success = json["success"] as? Bool, success else {
            let errorMsg = (json["error"] as? String) ?? "Request failed"
            throw HydraError(message: errorMsg, statusCode: 500, errorCode: "API_ERROR", details: nil)
        }
        guard let dataValue = json["data"] else {
            throw HydraError(message: "No data in response", statusCode: 500, errorCode: "API_ERROR", details: nil)
        }
        return try JSONSerialization.data(withJSONObject: dataValue)
    }

    private func gatewayRequest<T: Decodable>(method: String, path: String, body: Data? = nil) async throws -> T {
        let responseData = try await sendRequest(method: method, path: path, body: body)
        return try decoder.decode(T.self, from: responseData)
    }

    private func sendRequest(method: String, path: String, body: Data? = nil) async throws -> Data {
        guard let url = URL(string: "\(baseURL)\(path)") else {
            throw HydraError(message: "Invalid URL", statusCode: 0, errorCode: "URL_ERROR")
        }

        var request = URLRequest(url: url)
        request.httpMethod = method

        let timestamp = "\(Int(Date().timeIntervalSince1970 * 1000))"
        let bodyStr = body.flatMap { String(data: $0, encoding: .utf8) } ?? ""
        let message = SigningUtil.buildSigningMessage(method: method, path: path, timestamp: timestamp, body: bodyStr)
        let signature = SigningUtil.sign(secret: secretKey, message: message)

        request.setValue(apiKey, forHTTPHeaderField: "X-API-Key")
        request.setValue(timestamp, forHTTPHeaderField: "X-Timestamp")
        request.setValue(signature, forHTTPHeaderField: "X-Signature")
        request.setValue(defaultCurrency, forHTTPHeaderField: "X-Default-Currency")
        request.setValue(locale, forHTTPHeaderField: "Accept-Language")
        request.setValue("application/json", forHTTPHeaderField: "Accept")

        if let body = body {
            request.setValue("application/json", forHTTPHeaderField: "Content-Type")
            request.httpBody = body
        }

        let (statusCode, responseData) = try await httpClient.send(request: request)

        if statusCode >= 300 {
            throw parseError(statusCode: statusCode, data: responseData)
        }

        return responseData
    }

    private func parseError(statusCode: Int, data: Data) -> HydraError {
        let message: String
        let details: [String: String]?
        if let json = try? JSONSerialization.jsonObject(with: data) as? [String: Any] {
            message = (json["error"] as? String) ?? "Request failed with status \(statusCode)"
            details = json["details"] as? [String: String]
        } else {
            message = "Request failed with status \(statusCode)"
            details = nil
        }
        switch statusCode {
        case 400: return ValidationError(message: message, details: details)
        case 401: return AuthenticationError(message: message, details: details)
        case 404: return NotFoundError(message: message, details: details)
        default: return HydraError(message: message, statusCode: statusCode, details: details)
        }
    }
}
