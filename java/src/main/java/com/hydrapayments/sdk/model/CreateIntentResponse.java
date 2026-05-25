package com.hydrapayments.sdk.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CreateIntentResponse {

    private String id;
    private String status;
    private int amount;
    private String currency;
    private String clientSecret;

    public CreateIntentResponse() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getStatus() { return status; }
    public void setStatus(String status) { this.status = status; }

    public int getAmount() { return amount; }
    public void setAmount(int amount) { this.amount = amount; }

    public String getCurrency() { return currency; }
    public void setCurrency(String currency) { this.currency = currency; }

    @JsonProperty("client_secret")
    public String getClientSecret() { return clientSecret; }
    @JsonProperty("client_secret")
    public void setClientSecret(String clientSecret) { this.clientSecret = clientSecret; }
}
