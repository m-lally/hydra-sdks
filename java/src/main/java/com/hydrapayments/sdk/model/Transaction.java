package com.hydrapayments.sdk.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Transaction {

    private String id;
    private String sourceAccountId;
    private String destAccountId;
    private String amount;
    private String currency;
    private String status;
    private String transactionType;
    private String reference;
    private String description;
    private String metadata;
    private String previousStateHash;
    private String createdAt;
    private String updatedAt;

    public Transaction() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    @JsonProperty("source_account_id")
    public String getSourceAccountId() { return sourceAccountId; }
    @JsonProperty("source_account_id")
    public void setSourceAccountId(String sourceAccountId) { this.sourceAccountId = sourceAccountId; }

    @JsonProperty("dest_account_id")
    public String getDestAccountId() { return destAccountId; }
    @JsonProperty("dest_account_id")
    public void setDestAccountId(String destAccountId) { this.destAccountId = destAccountId; }

    public String getAmount() { return amount; }
    public void setAmount(String amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    @JsonProperty("transaction_type")
    public String getTransactionType() { return transactionType; }
    @JsonProperty("transaction_type")
    public void setTransactionType(String transactionType) { this.transactionType = transactionType; }

    public String getReference() { return reference; }
    public void setReference(String reference) { this.reference = reference; }

    public String getDescription() { return description; }
    public void setDescription(String description) { this.description = description; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }

    @JsonProperty("previous_state_hash")
    public String getPreviousStateHash() { return previousStateHash; }
    @JsonProperty("previous_state_hash")
    public void setPreviousStateHash(String previousStateHash) { this.previousStateHash = previousStateHash; }

    @JsonProperty("created_at")
    public String getCreatedAt() { return createdAt; }
    @JsonProperty("created_at")
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    @JsonProperty("updated_at")
    public String getUpdatedAt() { return updatedAt; }
    @JsonProperty("updated_at")
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
