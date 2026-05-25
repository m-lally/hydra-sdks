using System.Text.Json.Serialization;

namespace HydraPayments.Sdk.Models;

public class CardInput
{
    [JsonPropertyName("number")]
    public string Number { get; set; } = string.Empty;

    [JsonPropertyName("exp_month")]
    public int ExpMonth { get; set; }

    [JsonPropertyName("exp_year")]
    public int ExpYear { get; set; }

    [JsonPropertyName("cvc")]
    public string Cvc { get; set; } = string.Empty;
}
