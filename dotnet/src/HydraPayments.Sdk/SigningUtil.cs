using System.Security.Cryptography;
using System.Text;

namespace HydraPayments.Sdk;

public static class SigningUtil
{
    public static string Sign(string secret, string message)
    {
        if (string.IsNullOrEmpty(secret))
            return string.Empty;

        var keyBytes = Encoding.UTF8.GetBytes(secret);
        var messageBytes = Encoding.UTF8.GetBytes(message);

        using var hmac = new HMACSHA256(keyBytes);
        var hash = hmac.ComputeHash(messageBytes);
        return Convert.ToBase64String(hash);
    }

    public static bool Verify(string secret, string message, string signature)
    {
        if (string.IsNullOrEmpty(secret) && string.IsNullOrEmpty(signature))
            return true;

        var expected = Sign(secret, message);

        if (expected.Length != signature.Length)
            return false;

        return CryptographicOperations.FixedTimeEquals(
            Encoding.UTF8.GetBytes(expected),
            Encoding.UTF8.GetBytes(signature));
    }

    public static string BuildSigningMessage(string method, string path, string timestamp, string body)
    {
        return $"{method}:{path}:{timestamp}:{body}";
    }
}
