package com.hydrapayments.sdk;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.hydrapayments.sdk.model.*;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ModelTest {

    private ObjectMapper mapper;

    @BeforeEach
    void setUp() {
        mapper = new ObjectMapper();
        mapper.configure(com.fasterxml.jackson.databind.DeserializationFeature.FAIL_ON_UNKNOWN_PROPERTIES, false);
    }

    @Test
    void testAccountDeserialization() throws Exception {
        String json = "{\"id\":\"acc-1\",\"owner_id\":\"owner-123\",\"account_type\":\"personal\",\"currency\":\"GBP\",\"balance\":\"100.00\",\"created_at\":\"2024-01-01T00:00:00Z\"}";
        Account a = mapper.readValue(json, Account.class);
        assertEquals("acc-1", a.getId());
        assertEquals("owner-123", a.getOwnerId());
        assertEquals("personal", a.getAccountType());
        assertEquals("GBP", a.getCurrency());
        assertEquals("100.00", a.getBalance());
        assertEquals("2024-01-01T00:00:00Z", a.getCreatedAt());
        assertNull(a.getUpdatedAt());
    }

    @Test
    void testAccountWithOptionalFields() throws Exception {
        String json = "{\"id\":\"acc-1\",\"owner_id\":\"owner-1\",\"account_type\":\"company\",\"currency\":\"USD\",\"balance\":\"50.00\",\"metadata\":\"info\",\"created_at\":\"t1\",\"updated_at\":\"t2\"}";
        Account a = mapper.readValue(json, Account.class);
        assertEquals("info", a.getMetadata());
        assertEquals("t2", a.getUpdatedAt());
    }

    @Test
    void testTransactionDeserialization() throws Exception {
        String json = "{\"id\":\"tx-1\",\"source_account_id\":\"src-1\",\"dest_account_id\":\"dst-1\",\"amount\":\"99.99\",\"currency\":\"GBP\",\"status\":\"completed\",\"transaction_type\":\"transfer\",\"reference\":\"REF-1\",\"created_at\":\"t1\"}";
        Transaction t = mapper.readValue(json, Transaction.class);
        assertEquals("tx-1", t.getId());
        assertEquals("src-1", t.getSourceAccountId());
        assertEquals("dst-1", t.getDestAccountId());
        assertEquals("99.99", t.getAmount());
        assertEquals("completed", t.getStatus());
        assertEquals("REF-1", t.getReference());
    }

    @Test
    void testTransactionDefaultValues() throws Exception {
        String json = "{\"id\":\"tx-1\"}";
        Transaction t = mapper.readValue(json, Transaction.class);
        assertEquals("tx-1", t.getId());
        assertNull(t.getAmount());
        assertNull(t.getStatus());
    }

    @Test
    void testWalletDeserialization() throws Exception {
        String json = "{\"id\":\"w-1\",\"owner_id\":\"owner-1\",\"wallet_type\":\"custodial\",\"chain\":\"ethereum\",\"address\":\"0xabc\",\"is_custodial\":true,\"created_at\":\"t1\"}";
        Wallet w = mapper.readValue(json, Wallet.class);
        assertEquals("w-1", w.getId());
        assertEquals("ethereum", w.getChain());
        assertTrue(w.isCustodial());
    }

    @Test
    void testWalletNonCustodial() throws Exception {
        String json = "{\"id\":\"w-1\",\"owner_id\":\"owner-1\",\"wallet_type\":\"non-custodial\",\"chain\":\"solana\",\"address\":\"0xdef\",\"is_custodial\":false,\"encrypted_private_key\":null,\"created_at\":\"t1\"}";
        Wallet w = mapper.readValue(json, Wallet.class);
        assertEquals("non-custodial", w.getWalletType());
        assertFalse(w.isCustodial());
    }

    @Test
    void testSplitEntry() throws Exception {
        String json = "{\"account_id\":\"acc-1\",\"percentage\":60.0}";
        SplitEntry s = mapper.readValue(json, SplitEntry.class);
        assertEquals("acc-1", s.getAccountId());
        assertEquals(60.0, s.getPercentage(), 0.001);
    }

    @Test
    void testHealthResponse() throws Exception {
        String json = "{\"status\":\"healthy\",\"version\":\"1.0.0\",\"database\":\"connected\"}";
        HealthResponse h = mapper.readValue(json, HealthResponse.class);
        assertEquals("healthy", h.getStatus());
        assertEquals("1.0.0", h.getVersion());
        assertEquals("connected", h.getDatabase());
        assertTrue(h.isHealthy());
    }

    @Test
    void testHealthResponseUnhealthy() throws Exception {
        String json = "{\"status\":\"down\",\"version\":\"1.0.0\",\"database\":\"disconnected\"}";
        HealthResponse h = mapper.readValue(json, HealthResponse.class);
        assertFalse(h.isHealthy());
    }

    @Test
    void testApiResponseSuccess() throws Exception {
        String json = "{\"success\":true,\"data\":{\"id\":\"acc-1\"},\"error\":null}";
        ApiResponse<Account> r = mapper.readValue(json,
            mapper.getTypeFactory().constructParametricType(ApiResponse.class, Account.class));
        assertTrue(r.isSuccess());
        assertNull(r.getError());
    }

    @Test
    void testCardInputSerialization() throws Exception {
        CardInput c = new CardInput("4242424242424242", 12, 2027, "123");
        String json = mapper.writeValueAsString(c);
        assertTrue(json.contains("\"number\":\"4242424242424242\""));
        assertTrue(json.contains("\"exp_month\":12"));
        assertTrue(json.contains("\"exp_year\":2027"));
    }

    @Test
    void testCreateTokenResponse() throws Exception {
        String json = "{\"id\":\"tok_1\",\"card\":{\"brand\":\"visa\",\"last4\":\"4242\",\"exp_month\":12,\"exp_year\":2027},\"created_at\":\"t1\"}";
        CreateTokenResponse r = mapper.readValue(json, CreateTokenResponse.class);
        assertEquals("tok_1", r.getId());
        assertEquals("visa", r.getCard().getBrand());
        assertEquals("4242", r.getCard().getLast4());
    }

    @Test
    void testCreateIntentResponse() throws Exception {
        String json = "{\"id\":\"pi_1\",\"status\":\"requires_action\",\"amount\":5000,\"currency\":\"GBP\",\"client_secret\":\"secret_xxx\"}";
        CreateIntentResponse r = mapper.readValue(json, CreateIntentResponse.class);
        assertEquals("pi_1", r.getId());
        assertEquals("requires_action", r.getStatus());
        assertEquals(5000, r.getAmount());
        assertEquals("secret_xxx", r.getClientSecret());
    }

    @Test
    void testCreateRefundResponse() throws Exception {
        String json = "{\"id\":\"re_1\",\"status\":\"succeeded\",\"amount\":2500,\"charge\":\"ch_1\"}";
        CreateRefundResponse r = mapper.readValue(json, CreateRefundResponse.class);
        assertEquals("re_1", r.getId());
        assertEquals("succeeded", r.getStatus());
        assertEquals(2500, r.getAmount());
    }

    @Test
    void testCommissionResponse() throws Exception {
        String json = "{\"total_commission\":1550}";
        CommissionResponse r = mapper.readValue(json, CommissionResponse.class);
        assertEquals(1550, r.getTotalCommission());
    }

    @Test
    void testWebhookResponse() throws Exception {
        String json = "{\"received\":true}";
        WebhookResponse r = mapper.readValue(json, WebhookResponse.class);
        assertTrue(r.isReceived());
    }

    @Test
    void testWebhookResponseNotReceived() throws Exception {
        String json = "{\"received\":false}";
        WebhookResponse r = mapper.readValue(json, WebhookResponse.class);
        assertFalse(r.isReceived());
    }
}
