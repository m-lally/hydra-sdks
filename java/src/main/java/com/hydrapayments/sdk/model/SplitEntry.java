package com.hydrapayments.sdk.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class SplitEntry {

    private String accountId;
    private double percentage;

    public SplitEntry() {}

    public SplitEntry(String accountId, double percentage) {
        this.accountId = accountId;
        this.percentage = percentage;
    }

    @JsonProperty("account_id")
    public String getAccountId() { return accountId; }
    @JsonProperty("account_id")
    public void setAccountId(String accountId) { this.accountId = accountId; }

    public double getPercentage() { return percentage; }
    public void setPercentage(double percentage) { this.percentage = percentage; }
}
