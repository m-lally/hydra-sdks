using HydraPayments.Sdk.Models;

namespace HydraPayments.Sdk;

public interface IHydraClient
{
    Task<HealthResponse> HealthCheckAsync();

    Task<Account> CreateAccountAsync(string ownerId, string accountType, string? currency = null);
    Task<Account> GetAccountAsync(string accountId);
    Task<List<Account>> GetAccountsByOwnerAsync(string ownerId);

    Task<Transaction> TransferAsync(string sourceId, string destId, string amount, string? currency = null, string? reference = null);
    Task<Transaction> GetTransactionAsync(string transactionId);
    Task<bool> CompleteTransactionAsync(string transactionId);
    Task<bool> FailTransactionAsync(string transactionId);

    Task<Wallet> CreateWalletAsync(string ownerId, string walletType, string chain, string address, string? encryptedPrivateKey = null);
    Task<List<Wallet>> GetWalletsAsync(string ownerId);
    Task<string> RelayTransactionAsync(string walletId, string signedTransaction);

    Task<SplitRule> CreateSplitAsync(string total, List<SplitEntry> splits, string? currency = null, string? reference = null);
    Task<SplitRule> GetSplitAsync(string splitId);

    Task<CreateTokenResponse> CreateCardTokenAsync(CardInput card, string? merchantId = null);
    Task<CreateIntentResponse> CreatePaymentIntentAsync(int amount, string currency, string? token = null, string? merchantId = null, string? idempotencyKey = null);
    Task<CreateRefundResponse> CreateRefundAsync(string chargeId, int? amount = null);
    Task<CommissionResponse> GetCommissionAsync();
    Task<WebhookResponse> SendWebhookEventAsync(Dictionary<string, object> payload);
    Task<string> GetMetricsAsync();

    string SignMessage(string message);
    bool VerifySignature(string payload, string signature);
}
