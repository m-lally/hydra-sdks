import Foundation
import CryptoKit

public enum SigningUtil {
    public static func sign(secret: String, message: String) -> String {
        guard !secret.isEmpty else { return "" }
        let key = SymmetricKey(data: Data(secret.utf8))
        let mac = HMAC<SHA256>.authenticationCode(for: Data(message.utf8), using: key)
        return Data(mac).base64EncodedString()
    }

    public static func verify(secret: String, message: String, signature: String) -> Bool {
        if secret.isEmpty && signature.isEmpty { return true }
        let expected = sign(secret: secret, message: message)
        return expected == signature
    }

    public static func buildSigningMessage(method: String, path: String, timestamp: String, body: String) -> String {
        "\(method):\(path):\(timestamp):\(body)"
    }
}
