namespace HydraPayments.Sdk.Exceptions;

public class HydraException : Exception
{
    public string ErrorCode { get; }
    public int StatusCode { get; }
    public string? Details { get; }

    public HydraException(int statusCode, string errorCode, string message, string? details = null)
        : base(message)
    {
        StatusCode = statusCode;
        ErrorCode = errorCode;
        Details = details;
    }

    public HydraException(int statusCode, string message, string? details = null)
        : this(statusCode, "API_ERROR", message, details)
    {
    }
}
