using System.Text.Json.Serialization;

namespace HydraPayments.Sdk.Models;

public class CommissionResponse
{
    [JsonPropertyName("total_commission")]
    public int TotalCommission { get; set; }
}
