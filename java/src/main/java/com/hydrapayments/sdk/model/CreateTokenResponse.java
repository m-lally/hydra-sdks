package com.hydrapayments.sdk.model;

import com.fasterxml.jackson.annotation.JsonProperty;

public class CreateTokenResponse {

    private String id;
    private CardDetails card;
    private String createdAt;

    public CreateTokenResponse() {}

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public CardDetails getCard() { return card; }
    public void setCard(CardDetails card) { this.card = card; }

    @JsonProperty("created_at")
    public String getCreatedAt() { return createdAt; }
    @JsonProperty("created_at")
    public void setCreatedAt(String createdAt) { this.createdAt = createdAt; }
}
