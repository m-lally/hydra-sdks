using System.Text.Json.Serialization;

namespace HydraPayments.Sdk.Models;

public class SplitEntry
{
    [JsonPropertyName("account_id")]
    public string AccountId { get; set; } = string.Empty;

    [JsonPropertyName("percentage")]
    public double Percentage { get; set; }
}
