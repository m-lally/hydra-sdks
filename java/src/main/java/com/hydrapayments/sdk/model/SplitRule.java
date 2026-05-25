package com.hydrapayments.sdk.model;

import com.fasterxml.jackson.annotation.JsonProperty;
import java.util.List;

public class SplitRule {

    private String id;
    private String transactionId;
    private String total;
    private String currency;
    private List<SplitEntry> splits;
    private String sinkAccountId;
    private String status;
    private String createdAt;

    public SplitRule() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    @JsonProperty("transaction_id")
    public String getTransactionId() { return transactionId; }
    @JsonProperty("transaction_id")
    public void setTransactionId(String transactionId) { this.transactionId = transactionId; }

    public String getTotal() { return total; }
    public void setTotal(String total) { this.total = total; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public List<SplitEntry> getSplits() { return splits; }
    public void setSplits(List<SplitEntry> splits) { this.splits = splits; }

    @JsonProperty("sink_account_id")
    public String getSinkAccountId() { return sinkAccountId; }
    @JsonProperty("sink_account_id")
    public void setSinkAccountId(String sinkAccountId) { this.sinkAccountId = sinkAccountId; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    @JsonProperty("created_at")
    public String getCreatedAt() { return createdAt; }
    @JsonProperty("created_at")
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
