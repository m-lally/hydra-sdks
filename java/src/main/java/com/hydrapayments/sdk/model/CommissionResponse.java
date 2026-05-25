package com.hydrapayments.sdk.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CommissionResponse {

    private int totalCommission;

    public CommissionResponse() {}

    @JsonProperty("total_commission")
    public int getTotalCommission() { return totalCommission; }
    @JsonProperty("total_commission")
    public void setTotalCommission(int totalCommission) { this.totalCommission = totalCommission; }
}
