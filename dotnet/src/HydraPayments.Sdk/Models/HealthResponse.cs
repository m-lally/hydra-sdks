using System.Text.Json.Serialization;

namespace HydraPayments.Sdk.Models;

public class HealthResponse
{
    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("version")]
    public string Version { get; set; } = string.Empty;

    [JsonPropertyName("database")]
    public string Database { get; set; } = string.Empty;

    public bool IsHealthy() => Status == "healthy";
}
