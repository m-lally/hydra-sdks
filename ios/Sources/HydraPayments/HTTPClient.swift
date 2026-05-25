import Foundation

public protocol HTTPClient {
    func send(request: URLRequest) async throws -> (statusCode: Int, body: Data)
}

public struct URLSessionHTTPClient: HTTPClient {
    private let session: URLSession

    public init(session: URLSession = .shared) {
        self.session = session
    }

    public func send(request: URLRequest) async throws -> (statusCode: Int, body: Data) {
        let (data, response) = try await session.data(for: request)
        guard let httpResponse = response as? HTTPURLResponse else {
            throw HydraError(
                message: "Invalid response",
                statusCode: 0,
                errorCode: "NETWORK_ERROR",
                details: nil
            )
        }
        return (httpResponse.statusCode, data)
    }
}
