import Foundation

public class HydraError: Error, CustomStringConvertible {
    public let statusCode: Int
    public let errorCode: String
    public let message: String
    public let details: [String: String]?

    public init(message: String, statusCode: Int = 500, errorCode: String = "API_ERROR", details: [String: String]? = nil) {
        self.message = message
        self.statusCode = statusCode
        self.errorCode = errorCode
        self.details = details
    }

    public var description: String {
        "[\(errorCode)] \(message)"
    }
}

public final class AuthenticationError: HydraError {
    public init(message: String, details: [String: String]? = nil) {
        super.init(message: message, statusCode: 401, errorCode: "AUTHENTICATION_ERROR", details: details)
    }
}

public final class ValidationError: HydraError {
    public init(message: String, details: [String: String]? = nil) {
        super.init(message: message, statusCode: 400, errorCode: "VALIDATION_ERROR", details: details)
    }
}

public final class NotFoundError: HydraError {
    public init(message: String, details: [String: String]? = nil) {
        super.init(message: message, statusCode: 404, errorCode: "NOT_FOUND", details: details)
    }
}
