namespace HydraPayments.Sdk.Exceptions;

public class ValidationException : HydraException
{
    public ValidationException(string message, string? details = null)
        : base(400, "VALIDATION_ERROR", message, details)
    {
    }
}
