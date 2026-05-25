using System.Text.Json.Serialization;

namespace HydraPayments.Sdk.Models;

public class CardDetails
{
    [JsonPropertyName("brand")]
    public string Brand { get; set; } = string.Empty;

    [JsonPropertyName("last4")]
    public string Last4 { get; set; } = string.Empty;

    [JsonPropertyName("exp_month")]
    public int ExpMonth { get; set; }

    [JsonPropertyName("exp_year")]
    public int ExpYear { get; set; }
}
