using System.Text.Json.Serialization;

namespace HydraPayments.Sdk.Models;

public class WebhookResponse
{
    [JsonPropertyName("received")]
    public bool Received { get; set; }
}
