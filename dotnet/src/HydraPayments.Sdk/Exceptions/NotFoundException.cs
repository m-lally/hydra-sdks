namespace HydraPayments.Sdk.Exceptions;

public class NotFoundException : HydraException
{
    public NotFoundException(string message, string? details = null)
        : base(404, "NOT_FOUND", message, details)
    {
    }
}
