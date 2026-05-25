package com.hydrapayments.sdk;

import com.hydrapayments.sdk.model.*;
import java.util.List;
import java.util.Map;

public interface HydraClient {

    HealthResponse healthCheck();

    Account createAccount(String ownerId, String accountType, String currency);
    Account getAccount(String accountId);
    List<Account> getAccountsByOwner(String ownerId);

    Transaction transfer(String sourceId, String destId, String amount, String currency, String reference);
    Transaction getTransaction(String transactionId);
    boolean completeTransaction(String transactionId);
    boolean failTransaction(String transactionId);

    Wallet createWallet(String ownerId, String walletType, String chain, String address, String encryptedPrivateKey);
    List<Wallet> getWallets(String ownerId);
    String relayTransaction(String walletId, String signedTransaction);

    SplitRule createSplit(String total, List<SplitEntry> splits, String currency, String reference);
    SplitRule getSplit(String splitId);

    boolean verifySignature(String payload, String signature);
    String signMessage(String message);

    CreateTokenResponse createCardToken(CardInput card, String merchantId);
    CreateIntentResponse createPaymentIntent(int amount, String currency, String token, String merchantId, String idempotencyKey);
    CreateRefundResponse createRefund(String chargeId, Integer amount);
    CommissionResponse getCommission();
    WebhookResponse sendWebhookEvent(Map<String, Object> payload);
    String getMetrics();
}
