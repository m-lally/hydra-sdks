using System.Text.Json.Serialization;

namespace HydraPayments.Sdk.Models;

public class CreateRefundResponse
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("status")]
    public string Status { get; set; } = string.Empty;

    [JsonPropertyName("amount")]
    public int Amount { get; set; }

    [JsonPropertyName("charge")]
    public string Charge { get; set; } = string.Empty;
}
