using System.Text.Json;
using System.Text.Json.Serialization;
using HydraPayments.Sdk.Models;
using Xunit;

namespace HydraPayments.Sdk.Tests;

public class ModelTest
{
    private static readonly JsonSerializerOptions Options = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };

    [Fact]
    public void Account_Serialization()
    {
        var account = new Account
        {
            Id = "acc_123",
            OwnerId = "owner_456",
            AccountType = "business",
            Currency = "GBP",
            Balance = "1000.00",
            CreatedAt = "2024-01-01T00:00:00Z"
        };

        var json = JsonSerializer.Serialize(account, Options);
        Assert.Contains("\"owner_id\":\"owner_456\"", json);
        Assert.Contains("\"account_type\":\"business\"", json);
        Assert.DoesNotContain("\"metadata\"", json);
        Assert.DoesNotContain("\"updated_at\"", json);
    }

    [Fact]
    public void Account_Deserialization()
    {
        var json = "{\"id\":\"acc_123\",\"owner_id\":\"owner_456\",\"account_type\":\"business\",\"currency\":\"GBP\",\"balance\":\"500.00\",\"metadata\":\"extra\",\"created_at\":\"2024-01-01T00:00:00Z\",\"updated_at\":\"2024-01-02T00:00:00Z\"}";
        var account = JsonSerializer.Deserialize<Account>(json, Options)!;

        Assert.Equal("acc_123", account.Id);
        Assert.Equal("owner_456", account.OwnerId);
        Assert.Equal("business", account.AccountType);
        Assert.Equal("GBP", account.Currency);
        Assert.Equal("500.00", account.Balance);
        Assert.Equal("extra", account.Metadata);
        Assert.Equal("2024-01-01T00:00:00Z", account.CreatedAt);
        Assert.Equal("2024-01-02T00:00:00Z", account.UpdatedAt);
    }

    [Fact]
    public void Transaction_Deserialization()
    {
        var json = "{\"id\":\"txn_123\",\"source_account_id\":\"acc_1\",\"dest_account_id\":\"acc_2\",\"amount\":\"100.00\",\"currency\":\"GBP\",\"status\":\"completed\",\"transaction_type\":\"transfer\",\"reference\":\"ref_1\",\"description\":\"payment\",\"previous_state_hash\":\"abc123\",\"created_at\":\"2024-01-01T00:00:00Z\",\"updated_at\":\"2024-01-02T00:00:00Z\"}";
        var tx = JsonSerializer.Deserialize<Transaction>(json, Options)!;

        Assert.Equal("txn_123", tx.Id);
        Assert.Equal("acc_1", tx.SourceAccountId);
        Assert.Equal("acc_2", tx.DestAccountId);
        Assert.Equal("100.00", tx.Amount);
        Assert.Equal("GBP", tx.Currency);
        Assert.Equal("completed", tx.Status);
        Assert.Equal("transfer", tx.TransactionType);
        Assert.Equal("ref_1", tx.Reference);
        Assert.Equal("payment", tx.Description);
        Assert.Equal("abc123", tx.PreviousStateHash);
        Assert.Equal("2024-01-01T00:00:00Z", tx.CreatedAt);
        Assert.Equal("2024-01-02T00:00:00Z", tx.UpdatedAt);
    }

    [Fact]
    public void Transaction_OptionalFieldsDefaultToNull()
    {
        var json = "{\"id\":\"txn_123\",\"amount\":\"50.00\",\"currency\":\"USD\",\"status\":\"pending\",\"transaction_type\":\"transfer\",\"created_at\":\"2024-01-01T00:00:00Z\"}";
        var tx = JsonSerializer.Deserialize<Transaction>(json, Options)!;

        Assert.Equal("txn_123", tx.Id);
        Assert.Null(tx.SourceAccountId);
        Assert.Null(tx.DestAccountId);
        Assert.Null(tx.Reference);
        Assert.Null(tx.Description);
        Assert.Null(tx.Metadata);
    }

    [Fact]
    public void Wallet_Deserialization()
    {
        var json = "{\"id\":\"wal_123\",\"owner_id\":\"owner_456\",\"wallet_type\":\"custodial\",\"chain\":\"ethereum\",\"address\":\"0xabc\",\"is_custodial\":true,\"encrypted_private_key\":\"enc_key\",\"created_at\":\"2024-01-01T00:00:00Z\",\"updated_at\":\"2024-01-02T00:00:00Z\"}";
        var wallet = JsonSerializer.Deserialize<Wallet>(json, Options)!;

        Assert.Equal("wal_123", wallet.Id);
        Assert.Equal("owner_456", wallet.OwnerId);
        Assert.Equal("custodial", wallet.WalletType);
        Assert.Equal("ethereum", wallet.Chain);
        Assert.Equal("0xabc", wallet.Address);
        Assert.True(wallet.IsCustodial);
        Assert.Equal("enc_key", wallet.EncryptedPrivateKey);
        Assert.Equal("2024-01-01T00:00:00Z", wallet.CreatedAt);
        Assert.Equal("2024-01-02T00:00:00Z", wallet.UpdatedAt);
    }

    [Fact]
    public void Wallet_NonCustodial()
    {
        var json = "{\"id\":\"wal_456\",\"owner_id\":\"owner_789\",\"wallet_type\":\"non-custodial\",\"chain\":\"solana\",\"address\":\"0xdef\",\"is_custodial\":false,\"created_at\":\"2024-01-01T00:00:00Z\"}";
        var wallet = JsonSerializer.Deserialize<Wallet>(json, Options)!;

        Assert.Equal("non-custodial", wallet.WalletType);
        Assert.False(wallet.IsCustodial);
        Assert.Null(wallet.EncryptedPrivateKey);
        Assert.Null(wallet.UpdatedAt);
    }

    [Fact]
    public void SplitEntry_Serialization()
    {
        var entry = new SplitEntry { AccountId = "acc_1", Percentage = 50.0 };
        var json = JsonSerializer.Serialize(entry, Options);

        Assert.Contains("\"account_id\":\"acc_1\"", json);
        Assert.Contains("\"percentage\":50", json);
    }

    [Fact]
    public void SplitRule_WithNestedSplits()
    {
        var json = "{\"id\":\"split_123\",\"transaction_id\":\"txn_123\",\"total\":\"100.00\",\"currency\":\"GBP\",\"splits\":[{\"account_id\":\"acc_1\",\"percentage\":60.0},{\"account_id\":\"acc_2\",\"percentage\":40.0}],\"sink_account_id\":\"acc_3\",\"status\":\"active\",\"created_at\":\"2024-01-01T00:00:00Z\"}";
        var split = JsonSerializer.Deserialize<SplitRule>(json, Options)!;

        Assert.Equal("split_123", split.Id);
        Assert.Equal("txn_123", split.TransactionId);
        Assert.Equal("100.00", split.Total);
        Assert.Equal("GBP", split.Currency);
        Assert.Equal(2, split.Splits.Count);
        Assert.Equal("acc_1", split.Splits[0].AccountId);
        Assert.Equal(60.0, split.Splits[0].Percentage);
        Assert.Equal("acc_2", split.Splits[1].AccountId);
        Assert.Equal(40.0, split.Splits[1].Percentage);
        Assert.Equal("acc_3", split.SinkAccountId);
        Assert.Equal("active", split.Status);
    }

    [Fact]
    public void CardInput_Serialization()
    {
        var card = new CardInput { Number = "4111111111111111", ExpMonth = 12, ExpYear = 2026, Cvc = "123" };
        var json = JsonSerializer.Serialize(card, Options);

        Assert.Contains("\"number\":\"4111111111111111\"", json);
        Assert.Contains("\"exp_month\":12", json);
        Assert.Contains("\"exp_year\":2026", json);
        Assert.Contains("\"cvc\":\"123\"", json);
    }

    [Fact]
    public void CreateTokenResponse_Deserialization()
    {
        var json = "{\"id\":\"tok_123\",\"card\":{\"brand\":\"Visa\",\"last4\":\"1111\",\"exp_month\":12,\"exp_year\":2026},\"created_at\":\"2024-01-01T00:00:00Z\"}";
        var response = JsonSerializer.Deserialize<CreateTokenResponse>(json, Options)!;

        Assert.Equal("tok_123", response.Id);
        Assert.Equal("Visa", response.Card.Brand);
        Assert.Equal("1111", response.Card.Last4);
        Assert.Equal(12, response.Card.ExpMonth);
        Assert.Equal(2026, response.Card.ExpYear);
    }

    [Fact]
    public void CreateIntentResponse_Deserialization()
    {
        var json = "{\"id\":\"pi_123\",\"status\":\"requires_payment_method\",\"amount\":2000,\"currency\":\"GBP\",\"client_secret\":\"sec_123\"}";
        var response = JsonSerializer.Deserialize<CreateIntentResponse>(json, Options)!;

        Assert.Equal("pi_123", response.Id);
        Assert.Equal("requires_payment_method", response.Status);
        Assert.Equal(2000, response.Amount);
        Assert.Equal("GBP", response.Currency);
        Assert.Equal("sec_123", response.ClientSecret);
    }

    [Fact]
    public void CreateRefundResponse_Deserialization()
    {
        var json = "{\"id\":\"ref_123\",\"status\":\"succeeded\",\"amount\":1000,\"charge\":\"ch_123\"}";
        var response = JsonSerializer.Deserialize<CreateRefundResponse>(json, Options)!;

        Assert.Equal("ref_123", response.Id);
        Assert.Equal("succeeded", response.Status);
        Assert.Equal(1000, response.Amount);
        Assert.Equal("ch_123", response.Charge);
    }

    [Fact]
    public void HealthResponse_Deserialization()
    {
        var json = "{\"status\":\"healthy\",\"version\":\"1.0.0\",\"database\":\"connected\"}";
        var health = JsonSerializer.Deserialize<HealthResponse>(json, Options)!;

        Assert.Equal("healthy", health.Status);
        Assert.Equal("1.0.0", health.Version);
        Assert.Equal("connected", health.Database);
        Assert.True(health.IsHealthy());
    }

    [Fact]
    public void HealthResponse_Unhealthy()
    {
        var json = "{\"status\":\"unhealthy\",\"version\":\"1.0.0\",\"database\":\"disconnected\"}";
        var health = JsonSerializer.Deserialize<HealthResponse>(json, Options)!;

        Assert.Equal("unhealthy", health.Status);
        Assert.False(health.IsHealthy());
    }

    [Fact]
    public void ApiResponse_Deserialization()
    {
        var json = "{\"success\":true,\"data\":{\"id\":\"acc_123\",\"owner_id\":\"owner_1\",\"account_type\":\"business\",\"currency\":\"GBP\",\"balance\":\"100.00\",\"created_at\":\"2024-01-01T00:00:00Z\"},\"error\":null}";
        var response = JsonSerializer.Deserialize<ApiResponse<Account>>(json, Options)!;

        Assert.True(response.Success);
        Assert.NotNull(response.Data);
        Assert.Equal("acc_123", response.Data!.Id);
        Assert.Null(response.Error);
    }

    [Fact]
    public void ApiResponse_WithError()
    {
        var json = "{\"success\":false,\"data\":null,\"error\":\"Something went wrong\"}";
        var response = JsonSerializer.Deserialize<ApiResponse<Account>>(json, Options)!;

        Assert.False(response.Success);
        Assert.Null(response.Data);
        Assert.Equal("Something went wrong", response.Error);
    }

    [Fact]
    public void OptionalFields_OmittedWhenNull()
    {
        var obj = new { Name = "test", Optional = (string?)null };
        var json = JsonSerializer.Serialize(obj, Options);

        Assert.Contains("\"name\":\"test\"", json);
        Assert.DoesNotContain("optional", json);
    }
}
