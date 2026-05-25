using System.Text.Json.Serialization;

namespace HydraPayments.Sdk.Models;

public class Wallet
{
    [JsonPropertyName("id")]
    public string Id { get; set; } = string.Empty;

    [JsonPropertyName("owner_id")]
    public string OwnerId { get; set; } = string.Empty;

    [JsonPropertyName("wallet_type")]
    public string WalletType { get; set; } = string.Empty;

    [JsonPropertyName("chain")]
    public string Chain { get; set; } = string.Empty;

    [JsonPropertyName("address")]
    public string Address { get; set; } = string.Empty;

    [JsonPropertyName("is_custodial")]
    public bool IsCustodial { get; set; }

    [JsonPropertyName("encrypted_private_key")]
    public string? EncryptedPrivateKey { get; set; }

    [JsonPropertyName("created_at")]
    public string CreatedAt { get; set; } = string.Empty;

    [JsonPropertyName("updated_at")]
    public string? UpdatedAt { get; set; }
}
