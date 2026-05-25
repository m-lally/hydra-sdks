package com.hydrapayments.sdk.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class Account {

    private String id;
    private String ownerId;
    private String accountType;
    private String currency;
    private String balance;
    private String metadata;
    private String createdAt;
    private String updatedAt;

    public Account() {}

    @JsonProperty("owner_id")
    public String getOwnerId() { return ownerId; }
    @JsonProperty("owner_id")
    public void setOwnerId(String ownerId) { this.ownerId = ownerId; }

    @JsonProperty("account_type")
    public String getAccountType() { return accountType; }
    @JsonProperty("account_type")
    public void setAccountType(String accountType) { this.accountType = accountType; }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    public String getBalance() { return balance; }
    public void setBalance(String balance) { this.balance = balance; }

    public String getMetadata() { return metadata; }
    public void setMetadata(String metadata) { this.metadata = metadata; }

    @JsonProperty("created_at")
    public String getCreatedAt() { return createdAt; }
    @JsonProperty("created_at")
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }

    @JsonProperty("updated_at")
    public String getUpdatedAt() { return updatedAt; }
    @JsonProperty("updated_at")
    public void setUpdatedAt(String updatedAt) { this.updatedAt = updatedAt; }
}
