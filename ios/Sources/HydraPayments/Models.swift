import Foundation

// MARK: - Health

public struct HealthResponse: Codable {
    public let status: String
    public let version: String?
    public let database: String?

    public var isHealthy: Bool {
        status == "healthy"
    }
}

// MARK: - API Envelope

public struct ApiResponse<T: Decodable>: Decodable {
    public let success: Bool
    public let data: T?
    public let error: String?
}

// MARK: - Account

public struct Account: Codable {
    public let id: String
    public let ownerId: String
    public let accountType: String
    public let currency: String
    public let balance: String
    public let metadata: [String: String]?
    public let createdAt: String
    public let updatedAt: String?
}

// MARK: - Transaction

public struct Transaction: Codable {
    public let id: String
    public let sourceAccountId: String?
    public let destAccountId: String?
    public let amount: String
    public let currency: String
    public let status: String
    public let transactionType: String?
    public let reference: String?
    public let description: String?
    public let metadata: [String: String]?
    public let previousStateHash: String?
    public let createdAt: String
    public let updatedAt: String?
}

// MARK: - Wallet

public struct Wallet: Codable {
    public let id: String
    public let ownerId: String
    public let walletType: String
    public let chain: String
    public let address: String
    public let isCustodial: Bool
    public let encryptedPrivateKey: String?
    public let createdAt: String
    public let updatedAt: String?
}

// MARK: - Splits

public struct SplitEntry: Codable {
    public let accountId: String
    public let percentage: String
}

public struct SplitRule: Codable {
    public let id: String
    public let transactionId: String?
    public let total: String
    public let currency: String
    public let splits: [SplitEntry]
    public let sinkAccountId: String?
    public let status: String?
    public let createdAt: String
}

// MARK: - Gateway - Tokens

public struct CardInput {
    public let number: String
    public let expMonth: String
    public let expYear: String
    public let cvc: String

    public init(number: String, expMonth: String, expYear: String, cvc: String) {
        self.number = number
        self.expMonth = expMonth
        self.expYear = expYear
        self.cvc = cvc
    }
}

public struct CardDetails: Codable {
    public let brand: String?
    public let last4: String?
    public let expMonth: String?
    public let expYear: String?
}

public struct CreateTokenResponse: Codable {
    public let id: String
    public let card: CardDetails?
    public let createdAt: String
}

// MARK: - Gateway - Intents

public struct CreateIntentResponse: Codable {
    public let id: String
    public let status: String
    public let amount: String
    public let currency: String
    public let clientSecret: String?
}

// MARK: - Gateway - Refunds

public struct CreateRefundResponse: Codable {
    public let id: String
    public let status: String
    public let amount: String
    public let charge: String?
}

// MARK: - Gateway - Commission

public struct CommissionResponse: Codable {
    public let totalCommission: String
}

// MARK: - Gateway - Webhooks

public struct WebhookResponse: Codable {
    public let received: Bool
}
