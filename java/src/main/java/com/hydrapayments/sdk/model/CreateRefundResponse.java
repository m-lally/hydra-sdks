package com.hydrapayments.sdk.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CreateRefundResponse {

    private String id;
    private String status;
    private int amount;
    private String charge;

    public CreateRefundResponse() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getAmount() { return amount; }
    public void setAmount(int amount) { this.amount = amount; }

    public String getCharge() { return charge; }
    public void setCharge(String charge) { this.charge = charge; }
}
