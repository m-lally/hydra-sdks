using System.Text.Json.Serialization;

namespace HydraPayments.Sdk.Models;

public class CreateTokenResponse
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("card")]
    public CardDetails Card { get; set; } = new();

    [JsonPropertyName("created_at")]
    public string CreatedAt { get; set; } = string.Empty;
}
