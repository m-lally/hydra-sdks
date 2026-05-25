namespace HydraPayments.Sdk.Exceptions;

public class AuthenticationException : HydraException
{
    public AuthenticationException(string message, string? details = null)
        : base(401, "AUTHENTICATION_ERROR", message, details)
    {
    }
}
