using HydraPayments.Sdk.Exceptions;
using Xunit;

namespace HydraPayments.Sdk.Tests;

public class ExceptionTest
{
    [Fact]
    public void HydraException_HasCorrectDefaults()
    {
        var ex = new HydraException(500, "Something went wrong");

        Assert.Equal(500, ex.StatusCode);
        Assert.Equal("API_ERROR", ex.ErrorCode);
        Assert.Equal("Something went wrong", ex.Message);
        Assert.Null(ex.Details);
    }

    [Fact]
    public void HydraException_WithCustomErrorCode()
    {
        var ex = new HydraException(502, "BAD_GATEWAY", "Upstream error", "details here");

        Assert.Equal(502, ex.StatusCode);
        Assert.Equal("BAD_GATEWAY", ex.ErrorCode);
        Assert.Equal("Upstream error", ex.Message);
        Assert.Equal("details here", ex.Details);
    }

    [Fact]
    public void AuthenticationException_HasCorrectStatusCodeAndCode()
    {
        var ex = new AuthenticationException("Invalid API key");

        Assert.Equal(401, ex.StatusCode);
        Assert.Equal("AUTHENTICATION_ERROR", ex.ErrorCode);
        Assert.Equal("Invalid API key", ex.Message);
    }

    [Fact]
    public void ValidationException_HasCorrectStatusCodeAndCode()
    {
        var ex = new ValidationException("Invalid input");

        Assert.Equal(400, ex.StatusCode);
        Assert.Equal("VALIDATION_ERROR", ex.ErrorCode);
        Assert.Equal("Invalid input", ex.Message);
    }

    [Fact]
    public void NotFoundException_HasCorrectStatusCodeAndCode()
    {
        var ex = new NotFoundException("Resource not found");

        Assert.Equal(404, ex.StatusCode);
        Assert.Equal("NOT_FOUND", ex.ErrorCode);
        Assert.Equal("Resource not found", ex.Message);
    }

    [Fact]
    public void AuthenticationException_IsHydraException()
    {
        var ex = new AuthenticationException("test");
        Assert.IsAssignableFrom<HydraException>(ex);
    }

    [Fact]
    public void ValidationException_IsHydraException()
    {
        var ex = new ValidationException("test");
        Assert.IsAssignableFrom<HydraException>(ex);
    }

    [Fact]
    public void NotFoundException_IsHydraException()
    {
        var ex = new NotFoundException("test");
        Assert.IsAssignableFrom<HydraException>(ex);
    }

    [Fact]
    public void AuthenticationException_IsException()
    {
        var ex = new AuthenticationException("test");
        Assert.IsAssignableFrom<Exception>(ex);
    }

    [Fact]
    public void Details_ArePassedThrough()
    {
        var ex = new ValidationException("bad input", "{\"field\":\"amount\"}");
        Assert.Equal("bad input", ex.Message);
        Assert.Equal("{\"field\":\"amount\"}", ex.Details);
    }
}
